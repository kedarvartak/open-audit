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
from PIL import Image
import cv2
import numpy as np
from typing import Dict, List
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

# ResNet for deep comparison
resnet = models.resnet50(pretrained=True)
resnet.eval()
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
resnet = resnet.to(device)

transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

print(f"✓ Models loaded on {device}")


def image_to_base64(img: Image.Image) -> str:
    """Convert PIL image to base64"""
    buffered = io.BytesIO()
    img.save(buffered, format="JPEG", quality=90)
    return "data:image/jpeg;base64," + base64.b64encode(buffered.getvalue()).decode()


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
        "verdict": "FIXED" if is_fixed else "NOT_FIXED"
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
    Flexible defect detection - handles different numbers of before/after images.
    
    Algorithm:
    1. Detect ALL defects from ALL before images
    2. For each defect, find the best matching after image
    3. Verify if each defect is fixed
    4. Return per-defect results with overall verdict
    """
    
    if len(before_images) == 0:
        raise HTTPException(status_code=400, detail="At least one before image required")
    if len(after_images) == 0:
        raise HTTPException(status_code=400, detail="At least one after image required")
    
    print(f"[Analyze] Received {len(before_images)} before images, {len(after_images)} after images")
    
    # STEP 1: Load all images
    before_data = []
    for i, img in enumerate(before_images):
        content = await img.read()
        pil_img = Image.open(io.BytesIO(content)).convert("RGB")
        cv_img = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
        before_data.append({
            "index": i,
            "pil": pil_img,
            "cv": cv_img,
            "width": pil_img.width,
            "height": pil_img.height
        })
    
    after_data = []
    for i, img in enumerate(after_images):
        content = await img.read()
        pil_img = Image.open(io.BytesIO(content)).convert("RGB")
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
                
                # Verify repair
                result = phase2_verify_repair(before_region, after_region)
                
                # Track best result (highest confidence for FIXED, or least bad for NOT_FIXED)
                if result["is_fixed"]:
                    # For fixed results, prefer higher confidence
                    if result["confidence"] > best_confidence:
                        best_confidence = result["confidence"]
                        best_result = result
                        best_after_idx = after["index"]
                elif best_result is None or not best_result.get("is_fixed"):
                    # For not-fixed, track the one with highest feature distance (closest to maybe fixed)
                    if result["feature_distance"] > best_confidence:
                        best_confidence = result["feature_distance"]
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
                    "feature_distance": best_result["feature_distance"]
                },
                "before_image": image_to_base64(before["pil"]),
                "after_image": image_to_base64(after_data[best_after_idx]["pil"]) if best_after_idx is not None else None
            })
            print(f"  → {best_result['verdict']} (confidence: {best_result['confidence']:.2f})")
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
        # Include all raw images for frontend display
        "before_images": [image_to_base64(b["pil"]) for b in before_data],
        "after_images": [image_to_base64(a["pil"]) for a in after_data]
    }


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8003, reload=True)
