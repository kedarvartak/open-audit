"""
Clean AI Defect Detection Service
Phase 1: Groq Vision detects defect location
Phase 2: Deep Learning verifies if fixed
"""

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import io
import base64
import os
import tempfile
from PIL import Image
import cv2
import numpy as np
from typing import Dict, List, Optional, Tuple
import torch
import torchvision.transforms as transforms
import torchvision.models as models
from groq import Groq

app = FastAPI(title="AI Defect Detection")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize models
print("Loading models...")
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY", "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"))

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

# ResNet for image-to-image comparison (Phase 2 - Image Mode)
resnet = models.resnet50(pretrained=True)
resnet.eval()
resnet = resnet.to(device)

transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

print(f"✓ ResNet loaded on {device}")

# CLIP for video-to-image comparison (Phase 2 - Video Mode)
# CLIP is more robust to compression artifacts and quality differences
try:
    import clip
    clip_model, clip_preprocess = clip.load("ViT-B/32", device=device)
    clip_model.eval()
    CLIP_AVAILABLE = True
    print(f"✓ CLIP loaded on {device}")
except ImportError:
    print("⚠ CLIP not installed. Run: pip install git+https://github.com/openai/CLIP.git")
    CLIP_AVAILABLE = False
except Exception as e:
    print(f"⚠ CLIP failed to load: {e}")
    CLIP_AVAILABLE = False

print(f"✓ All models loaded")


def image_to_base64(img: Image.Image) -> str:
    """Convert PIL image to base64"""
    buffered = io.BytesIO()
    img.save(buffered, format="JPEG", quality=90)
    return "data:image/jpeg;base64," + base64.b64encode(buffered.getvalue()).decode()


# Video file extensions
VIDEO_EXTENSIONS = {'.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v'}
IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'}


def is_video_file(filename: str) -> bool:
    """Check if file is a video based on extension"""
    if not filename:
        return False
    ext = os.path.splitext(filename.lower())[1]
    return ext in VIDEO_EXTENSIONS


def is_image_file(filename: str) -> bool:
    """Check if file is an image based on extension"""
    if not filename:
        return False
    ext = os.path.splitext(filename.lower())[1]
    return ext in IMAGE_EXTENSIONS


def extract_frames_from_video(video_content: bytes, fps: float = 1.0, max_frames: int = 10) -> List[Image.Image]:
    """
    Extract frames from video at specified FPS.
    
    Args:
        video_content: Raw video bytes
        fps: Frames per second to extract (default 1.0 = 1 frame per second)
        max_frames: Maximum number of frames to extract
        
    Returns:
        List of PIL Images
    """
    frames = []
    
    # Write video to temp file (OpenCV needs file path)
    with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as tmp_file:
        tmp_file.write(video_content)
        tmp_path = tmp_file.name
    
    try:
        cap = cv2.VideoCapture(tmp_path)
        
        if not cap.isOpened():
            print(f"[Video] Failed to open video file")
            return frames
        
        video_fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = total_frames / video_fps if video_fps > 0 else 0
        
        print(f"[Video] Duration: {duration:.1f}s, FPS: {video_fps:.1f}, Total frames: {total_frames}")
        
        # Calculate frame interval
        frame_interval = int(video_fps / fps) if video_fps > 0 else 30
        
        frame_count = 0
        extracted_count = 0
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            # Extract frame at interval
            if frame_count % frame_interval == 0:
                # Convert BGR to RGB
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                pil_image = Image.fromarray(rgb_frame)
                frames.append(pil_image)
                extracted_count += 1
                print(f"[Video] Extracted frame {extracted_count} at {frame_count/video_fps:.1f}s")
                
                if extracted_count >= max_frames:
                    print(f"[Video] Reached max frames limit ({max_frames})")
                    break
            
            frame_count += 1
        
        cap.release()
        print(f"[Video] Extracted {len(frames)} frames total")
        
    finally:
        # Clean up temp file
        try:
            os.unlink(tmp_path)
        except:
            pass
    
    return frames


async def process_upload(upload: UploadFile) -> Tuple[List[Image.Image], str]:
    """
    Process an upload file - handles both images and videos.
    
    Returns:
        Tuple of (list of PIL images, media type: 'image' or 'video')
    """
    content = await upload.read()
    filename = upload.filename or ""
    content_type = upload.content_type or ""
    
    print(f"[Upload] Received: filename={filename}, content_type={content_type}, size={len(content)} bytes")
    
    # Detect video by filename OR content-type
    is_video = is_video_file(filename) or content_type.startswith('video/')
    
    if is_video:
        print(f"[Upload] Processing as VIDEO: {filename}")
        frames = extract_frames_from_video(content, fps=1.0, max_frames=10)
        if not frames:
            raise HTTPException(status_code=400, detail=f"Could not extract frames from video: {filename}")
        return frames, "video"
    else:
        # Treat as image
        print(f"[Upload] Processing as IMAGE: {filename}")
        try:
            pil_img = Image.open(io.BytesIO(content)).convert("RGB")
            return [pil_img], "image"
        except Exception as e:
            # Maybe it's a video that wasn't detected correctly
            print(f"[Upload] Failed to open as image, trying as video: {e}")
            frames = extract_frames_from_video(content, fps=1.0, max_frames=10)
            if frames:
                return frames, "video"
            raise HTTPException(status_code=400, detail=f"Could not process file: {filename}. Error: {str(e)}")


def compute_image_similarity(img1: Image.Image, img2: Image.Image) -> float:
    """
    Compute similarity between two images using ResNet features.
    Returns a value between 0 and 1 (1 = identical, 0 = completely different).
    """
    # Resize both images to same size
    img1_resized = img1.resize((224, 224))
    img2_resized = img2.resize((224, 224))
    
    # Convert to tensors
    tensor1 = transform(img1_resized).unsqueeze(0).to(device)
    tensor2 = transform(img2_resized).unsqueeze(0).to(device)
    
    # Extract features
    with torch.no_grad():
        # Get features before final FC layer
        features1 = torch.nn.Sequential(*list(resnet.children())[:-1])(tensor1).flatten()
        features2 = torch.nn.Sequential(*list(resnet.children())[:-1])(tensor2).flatten()
    
    # Compute cosine similarity
    similarity = torch.nn.functional.cosine_similarity(features1.unsqueeze(0), features2.unsqueeze(0)).item()
    
    # Normalize to 0-1 range (cosine similarity is -1 to 1)
    similarity = (similarity + 1) / 2
    
    return similarity


def filter_matching_frames(reference_img: Image.Image, frames: List[Image.Image], threshold: float = 0.5) -> List[Image.Image]:
    """
    Filter video frames to only include those that are similar to the reference image.
    This handles panning videos where only some frames show the relevant area.
    
    Args:
        reference_img: The reference image (before image)
        frames: List of video frames
        threshold: Minimum similarity (0-1) to include a frame
        
    Returns:
        List of matching frames
    """
    matching_frames = []
    
    for i, frame in enumerate(frames):
        similarity = compute_image_similarity(reference_img, frame)
        print(f"[FrameMatch] Frame {i}: similarity = {similarity:.3f} (threshold={threshold})")
        
        if similarity >= threshold:
            matching_frames.append(frame)
            print(f"  → MATCHED")
        else:
            print(f"  → REJECTED (too different)")
    
    print(f"[FrameMatch] {len(matching_frames)}/{len(frames)} frames matched reference")
    return matching_frames


def phase1_detect_defect(before_img: Image.Image, after_img: Image.Image) -> Dict:
    """
    Phase 1: Use Groq Vision to detect defect by comparing before and after
    Returns: defect description and bounding box coordinates
    """
    # Convert both images to base64
    before_b64 = image_to_base64(before_img).split(',')[1]
    after_b64 = image_to_base64(after_img).split(',')[1]
    
    # Compare both images to find defects
    prompt = """You are an expert inspector. Compare these TWO images:
- Image 1: BEFORE (showing the defect/damage)
- Image 2: AFTER (potentially repaired)

YOUR TASK:
Look at the BEFORE image and identify ANY defect, damage, or abnormality:
- Broken parts (chair legs, pipes, structures)
- Cracks, fractures, breaks
- Rust, corrosion, discoloration
- Missing pieces, holes
- Worn surfaces, damage
- Bent, deformed items
- ANY visible problem

By comparing with the AFTER image, you can see what changed.

INSTRUCTIONS:
1. Identify the MAIN defect visible in the BEFORE image
2. Describe it clearly in ONE sentence
3. Estimate its location in the BEFORE image as percentages from top-left
   Format: x,y,width,height (each 0-100)
   Example: "20,50,30,40" means 20% from left, 50% from top, 30% wide, 40% tall

RESPONSE FORMAT:
```
DEFECT: [describe what's broken/damaged in BEFORE image]
LOCATION: x,y,width,height
```

If truly NO defect visible, respond: "NO_DEFECT"

Now compare the images:"""

    try:
        response = groq_client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[{
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "text", "text": "BEFORE image:"},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{before_b64}"}},
                    {"type": "text", "text": "AFTER image:"},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{after_b64}"}}
                ]
            }],
            temperature=0.2,
            max_tokens=250
        )
        
        result_text = response.choices[0].message.content
        print(f"Groq response: {result_text[:300]}")
        
        # Parse response
        if "NO_DEFECT" in result_text.upper():
            return {"has_defect": False, "description": "No defect found"}
        
        # Extract defect info
        description = None
        bbox = None
        
        lines = result_text.strip().split('\n')
        for line in lines:
            line = line.strip()
            
            if 'DEFECT:' in line.upper():
                description = line.split(':', 1)[1].strip()
            elif 'LOCATION:' in line.upper():
                coords_str = line.split(':', 1)[1].strip()
                coords_str = coords_str.replace('```', '').strip()
                try:
                    # Handle both "x,y,w,h" and "x y w h" formats
                    parts = [float(x.strip()) for x in coords_str.replace(',', ' ').split()]
                    if len(parts) >= 4:
                        bbox = parts[:4]
                except Exception as e:
                    print(f"Failed to parse coords '{coords_str}': {e}")
        
        if description:
            return {
                "has_defect": True,
                "description": description,
                "bbox_percent": bbox or [25, 25, 50, 50]  # Default center region
            }
        else:
            return {
                "has_defect": False,
                "description": "Could not identify defect",
                "raw_response": result_text
            }
        
    except Exception as e:
        print(f"Groq error: {e}")
        return {"has_defect": False, "error": str(e)}


def phase2_verify_repair(before_region: np.ndarray, after_region: np.ndarray) -> Dict:
    """
    Phase 2: Deep Learning verifies if defect was fixed
    Compares before and after regions using ResNet features
    """
    # Convert to PIL
    before_pil = Image.fromarray(cv2.cvtColor(before_region, cv2.COLOR_BGR2RGB))
    after_pil = Image.fromarray(cv2.cvtColor(after_region, cv2.COLOR_BGR2RGB))
    
    # Extract deep features
    with torch.no_grad():
        before_tensor = transform(before_pil).unsqueeze(0).to(device)
        after_tensor = transform(after_pil).unsqueeze(0).to(device)
        
        before_features = resnet(before_tensor).cpu().numpy().flatten()
        after_features = resnet(after_tensor).cpu().numpy().flatten()
    
    # Calculate similarity
    distance = float(np.linalg.norm(before_features - after_features))
    
    # Decision thresholds
    FIXED_THRESHOLD = 5.0  # If distance > 5, significant change = likely fixed
    
    is_fixed = bool(distance > FIXED_THRESHOLD)
    confidence = float(min(distance / 10.0, 1.0))  # Normalize to 0-1
    
    return {
        "is_fixed": is_fixed,
        "confidence": round(confidence, 2),
        "feature_distance": round(distance, 2),
        "verdict": "FIXED" if is_fixed else "NOT_FIXED",
        "method": "resnet"
    }


def phase2_verify_repair_video(before_region: np.ndarray, after_region: np.ndarray) -> Dict:
    """
    Phase 2 VIDEO MODE: Use CLIP for semantic comparison
    CLIP is more robust to video compression artifacts and quality differences
    
    Logic:
    - High cosine similarity (>0.85) = same content = NOT_FIXED (defect still there)
    - Low cosine similarity (<0.85) = different content = FIXED (defect repaired)
    """
    if not CLIP_AVAILABLE:
        print("[Video Mode] CLIP not available, falling back to ResNet")
        return phase2_verify_repair(before_region, after_region)
    
    # Convert to PIL
    before_pil = Image.fromarray(cv2.cvtColor(before_region, cv2.COLOR_BGR2RGB))
    after_pil = Image.fromarray(cv2.cvtColor(after_region, cv2.COLOR_BGR2RGB))
    
    # Preprocess for CLIP
    before_tensor = clip_preprocess(before_pil).unsqueeze(0).to(device)
    after_tensor = clip_preprocess(after_pil).unsqueeze(0).to(device)
    
    # Extract CLIP features
    with torch.no_grad():
        before_features = clip_model.encode_image(before_tensor)
        after_features = clip_model.encode_image(after_tensor)
        
        # Normalize features
        before_features = before_features / before_features.norm(dim=-1, keepdim=True)
        after_features = after_features / after_features.norm(dim=-1, keepdim=True)
        
        # Cosine similarity (1.0 = identical, 0.0 = completely different)
        similarity = (before_features @ after_features.T).item()
    
    print(f"[CLIP] Cosine similarity: {similarity:.4f}")
    
    # Decision thresholds for video mode
    # High similarity = same content = defect still there = NOT_FIXED
    # Low similarity = content changed = defect repaired = FIXED
    SAME_THRESHOLD = 0.85  # If similarity > 0.85, content is same
    
    is_fixed = bool(similarity < SAME_THRESHOLD)
    
    # Confidence: how sure are we?
    # If similarity is very high (0.95+) or very low (0.5-), we're confident
    # If similarity is near threshold (0.80-0.90), less confident
    if is_fixed:
        # Lower similarity = more confident it's fixed
        confidence = float(1.0 - similarity)
    else:
        # Higher similarity = more confident it's not fixed
        confidence = float(similarity)
    
    return {
        "is_fixed": is_fixed,
        "confidence": round(confidence, 2),
        "similarity": round(similarity, 4),
        "verdict": "FIXED" if is_fixed else "NOT_FIXED",
        "method": "clip"
    }


def convert_bbox_percent_to_pixels(bbox_percent: List[float], img_width: int, img_height: int) -> List[int]:
    """Convert percentage bbox to pixel coordinates"""
    x_pct, y_pct, w_pct, h_pct = bbox_percent
    
    x1 = int((x_pct / 100) * img_width)
    y1 = int((y_pct / 100) * img_height)
    x2 = int(((x_pct + w_pct) / 100) * img_width)
    y2 = int(((y_pct + h_pct) / 100) * img_height)
    
    # Ensure within bounds
    x1 = max(0, min(x1, img_width))
    y1 = max(0, min(y1, img_height))
    x2 = max(0, min(x2, img_width))
    y2 = max(0, min(y2, img_height))
    
    return [x1, y1, x2, y2]


def draw_annotations(before_img: np.ndarray, after_img: np.ndarray, 
                     bbox: List[int], description: str, verdict: str, confidence: float):
    """Draw bounding boxes and labels on images"""
    x1, y1, x2, y2 = bbox
    
    # Before image: Orange box with defect description
    cv2.rectangle(before_img, (x1, y1), (x2, y2), (0, 165, 255), 3)
    cv2.putText(before_img, "DEFECT", (x1, max(y1-10, 20)),
               cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 165, 255), 2)
    cv2.putText(before_img, description[:40], (x1, max(y1-40, 50)),
               cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 165, 255), 2)
    
    # After image: Green if fixed, Red if not
    color = (0, 255, 0) if verdict == "FIXED" else (0, 0, 255)
    cv2.rectangle(after_img, (x1, y1), (x2, y2), color, 3)
    cv2.putText(after_img, f"{verdict} ({confidence:.0%})", (x1, max(y1-10, 20)),
               cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
    
    return before_img, after_img


@app.get("/")
def root():
    return {
        "service": "AI Defect Detection",
        "status": "running",
        "phases": [
            "1. Groq Vision detects defect",
            "2. Deep Learning verifies repair"
        ]
    }


@app.post("/analyze")
async def analyze(
    before_images: List[UploadFile] = File(...),
    after_images: List[UploadFile] = File(...)
):
    """
    Flexible defect detection - handles different numbers of before/after images AND videos.
    
    Supports:
    - Multiple images
    - Videos (automatically extracts frames at 1 FPS)
    - Mix of images and videos
    
    Algorithm:
    1. Process uploads (extract frames from videos)
    2. Detect ALL defects from ALL before frames
    3. For each defect, find the best matching after frame
    4. Verify if each defect is fixed
    5. Return per-defect results with overall verdict
    """
    
    if len(before_images) == 0:
        raise HTTPException(status_code=400, detail="At least one before image/video required")
    if len(after_images) == 0:
        raise HTTPException(status_code=400, detail="At least one after image/video required")
    
    print(f"[Analyze] Received {len(before_images)} before uploads, {len(after_images)} after uploads")
    
    # STEP 1: Process all uploads (handles both images and videos)
    all_before_frames = []
    before_media_types = []
    
    for i, upload in enumerate(before_images):
        frames, media_type = await process_upload(upload)
        before_media_types.append(media_type)
        print(f"[Analyze] Before upload {i}: {media_type}, {len(frames)} frame(s)")
        for frame in frames:
            all_before_frames.append(frame)
    
    all_after_frames = []
    after_media_types = []
    after_had_video = False
    
    for i, upload in enumerate(after_images):
        frames, media_type = await process_upload(upload)
        after_media_types.append(media_type)
        if media_type == "video":
            after_had_video = True
        print(f"[Analyze] After upload {i}: {media_type}, {len(frames)} frame(s)")
        for frame in frames:
            all_after_frames.append(frame)
    
    print(f"[Analyze] Total: {len(all_before_frames)} before frames, {len(all_after_frames)} after frames")
    
    # STEP 1.5: If we have video frames, filter to only frames that match the before images
    # This handles panning videos where only some frames show the relevant area
    if after_had_video and len(all_before_frames) > 0:
        print("[Analyze] Filtering video frames to match before images...")
        
        filtered_after_frames = []
        for before_frame in all_before_frames:
            # Find after frames similar to this before frame
            matching = filter_matching_frames(before_frame, all_after_frames, threshold=0.4)
            for frame in matching:
                if frame not in filtered_after_frames:
                    filtered_after_frames.append(frame)
        
        if filtered_after_frames:
            print(f"[Analyze] Using {len(filtered_after_frames)} filtered frames (from {len(all_after_frames)} total)")
            all_after_frames = filtered_after_frames
        else:
            print(f"[Analyze] WARNING: No frames matched! Using all {len(all_after_frames)} frames")
            # Fall back to using all frames if none match (threshold might be too strict)
    
    # Build frame data structures
    before_data = []
    for i, pil_img in enumerate(all_before_frames):
        cv_img = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
        before_data.append({
            "index": i,
            "pil": pil_img,
            "cv": cv_img,
            "width": pil_img.width,
            "height": pil_img.height
        })
    
    after_data = []
    for i, pil_img in enumerate(all_after_frames):
        cv_img = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
        after_data.append({
            "index": i,
            "pil": pil_img,
            "cv": cv_img,
            "width": pil_img.width,
            "height": pil_img.height
        })
    
    # STEP 2: Detect defects from ALL before images
    detected_defects = []
    for before in before_data:
        print(f"[Analyze] Detecting defects in before image {before['index']}...")
        
        # Use first after image as reference for comparison (to identify what changed)
        # This helps Groq understand what was the "defect" state
        detection = phase1_detect_defect(before["pil"], after_data[0]["pil"])
        
        if detection.get("has_defect"):
            detected_defects.append({
                "defect_id": f"defect_{len(detected_defects)}",
                "before_image_idx": before["index"],
                "description": detection["description"],
                "bbox_percent": detection["bbox_percent"],
                "before_data": before
            })
            print(f"  → Found defect: {detection['description']}")
        else:
            print(f"  → No defect detected")
    
    # If no defects found in any before image
    if not detected_defects:
        return {
            "verdict": "NO_DEFECT",
            "summary": "No defects detected in before images",
            "fixed_count": 0,
            "total_defects": 0,
            "defects": [],
            "before_images": [image_to_base64(b["pil"]) for b in before_data],
            "after_images": [image_to_base64(a["pil"]) for a in after_data]
        }
    
    # STEP 3: For each defect, find best matching after image and verify repair
    defect_results = []
    
    for defect in detected_defects:
        print(f"[Analyze] Processing {defect['defect_id']}: {defect['description']}")
        
        before = defect["before_data"]
        bbox_percent = defect["bbox_percent"]
        
        # Try each after image and find the best match
        best_result = None
        best_confidence = -1
        best_after_idx = None
        
        for after in after_data:
            try:
                # Resize after image to match before image dimensions for comparison
                after_resized = after["pil"].resize((before["width"], before["height"]))
                after_cv_resized = cv2.cvtColor(np.array(after_resized), cv2.COLOR_RGB2BGR)
                
                # Convert bbox to pixels
                bbox_pixels = convert_bbox_percent_to_pixels(
                    bbox_percent, before["width"], before["height"]
                )
                x1, y1, x2, y2 = bbox_pixels
                
                # Extract regions
                before_region = before["cv"][y1:y2, x1:x2]
                after_region = after_cv_resized[y1:y2, x1:x2]
                
                if before_region.size == 0 or after_region.size == 0:
                    continue
                
                # Verify repair - use CLIP for video mode, ResNet for image mode
                if after_had_video:
                    result = phase2_verify_repair_video(before_region, after_region)
                else:
                    result = phase2_verify_repair(before_region, after_region)
                
                # Track best result (highest confidence for FIXED, or least bad for NOT_FIXED)
                if result["is_fixed"]:
                    # For fixed results, prefer higher confidence
                    if result["confidence"] > best_confidence:
                        best_confidence = result["confidence"]
                        best_result = result
                        best_after_idx = after["index"]
                elif best_result is None or not best_result.get("is_fixed"):
                    # For not-fixed, track the one with highest score (closest to maybe fixed)
                    score = result.get("feature_distance", result.get("similarity", 0))
                    if score > best_confidence:
                        best_confidence = score
                        best_result = result
                        best_after_idx = after["index"]
                        
            except Exception as e:
                print(f"  Error comparing with after image {after['index']}: {e}")
                continue
        
        # Build result for this defect
        if best_result:
            defect_results.append({
                "defect_id": defect["defect_id"],
                "status": "success",
                "description": defect["description"],
                "before_image_idx": defect["before_image_idx"],
                "best_after_image_idx": best_after_idx,
                "bbox": {
                    "x": bbox_percent[0],
                    "y": bbox_percent[1],
                    "width": bbox_percent[2],
                    "height": bbox_percent[3]
                },
                "phase2_deep_learning": {
                    "verdict": best_result["verdict"],
                    "is_fixed": best_result["is_fixed"],
                    "confidence": best_result["confidence"],
                    "feature_distance": best_result.get("feature_distance", 0),
                    "similarity": best_result.get("similarity", 0),
                    "method": best_result.get("method", "unknown")
                },
                "before_image": image_to_base64(before["pil"]),
                "after_image": image_to_base64(after_data[best_after_idx]["pil"]) if best_after_idx is not None else None
            })
            print(f"  → {best_result['verdict']} (confidence: {best_result['confidence']:.2f}, method: {best_result.get('method', 'unknown')})")
        else:
            defect_results.append({
                "defect_id": defect["defect_id"],
                "status": "error",
                "description": defect["description"],
                "before_image_idx": defect["before_image_idx"],
                "message": "Could not verify repair for this defect"
            })
    
    # STEP 4: Calculate overall verdict
    fixed_count = sum(1 for d in defect_results if d.get("phase2_deep_learning", {}).get("is_fixed", False))
    total_defects = len(defect_results)
    
    if fixed_count == total_defects:
        overall_verdict = "FIXED"
    elif fixed_count > 0:
        overall_verdict = "PARTIAL"
    else:
        overall_verdict = "NOT_FIXED"
    
    print(f"[Analyze] Final verdict: {overall_verdict} ({fixed_count}/{total_defects} defects fixed)")
    
    return {
        "verdict": overall_verdict,
        "summary": f"{fixed_count}/{total_defects} defects fixed",
        "fixed_count": fixed_count,
        "total_defects": total_defects,
        "defects": defect_results,
        # Include all raw images/frames for frontend display
        "before_images": [image_to_base64(b["pil"]) for b in before_data],
        "after_images": [image_to_base64(a["pil"]) for a in after_data],
        # Media info
        "media_info": {
            "before_frame_count": len(before_data),
            "after_frame_count": len(after_data),
            "before_had_video": "video" in before_media_types,
            "after_had_video": "video" in after_media_types
        }
    }


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8003, reload=True)
