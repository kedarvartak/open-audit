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


def phase1_detect_defect(image: Image.Image) -> Dict:
    """
    Phase 1: Use Groq Vision to detect defect location
    Returns: defect description and bounding box coordinates
    """
    # Convert image to base64
    img_base64 = image_to_base64(image).split(',')[1]
    
    # Ask Groq to identify defect
    prompt = """Analyze this infrastructure image for defects (rust, cracks, damage, corrosion).

If you see ANY defect:
1. Describe the defect briefly (one sentence)
2. Estimate its location as percentage from top-left corner
   Format: x,y,width,height (as percentages 0-100)
   Example: 45,30,15,20 means: 45% from left, 30% from top, 15% wide, 20% tall

If NO defect: Say "NO_DEFECT"

Response format:
DEFECT: [description]
LOCATION: x,y,width,height"""

    try:
        response = groq_client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[{
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{img_base64}"}}
                ]
            }],
            temperature=0.1,
            max_tokens=150
        )
        
        result_text = response.choices[0].message.content
        
        # Parse response
        if "NO_DEFECT" in result_text.upper():
            return {"has_defect": False, "description": "No defect found"}
        
        # Extract defect info
        description = ""
        bbox = None
        
        for line in result_text.split('\n'):
            if 'DEFECT:' in line:
                description = line.split('DEFECT:')[1].strip()
            elif 'LOCATION:' in line:
                coords = line.split('LOCATION:')[1].strip()
                # Parse x,y,w,h percentages
                parts = [float(x.strip()) for x in coords.split(',')]
                if len(parts) == 4:
                    bbox = parts
        
        return {
            "has_defect": True,
            "description": description or "Defect detected",
            "bbox_percent": bbox or [20, 20, 60, 60]  # Default if parsing fails
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
    before_image: UploadFile = File(...),
    after_image: UploadFile = File(...)
):
    """
    Two-phase defect detection:
    1. Groq Vision finds defect location
    2. Deep Learning checks if fixed
    """
    try:
        # Load images
        before_pil = Image.open(io.BytesIO(await before_image.read())).convert("RGB")
        after_pil = Image.open(io.BytesIO(await after_image.read())).convert("RGB")
        
        # Resize if needed for consistency
        if before_pil.size != after_pil.size:
            target_size = (min(before_pil.width, after_pil.width), 
                          min(before_pil.height, after_pil.height))
            before_pil = before_pil.resize(target_size)
            after_pil = after_pil.resize(target_size)
        
        width, height = before_pil.size
        
        # Convert to OpenCV
        before_cv = cv2.cvtColor(np.array(before_pil), cv2.COLOR_RGB2BGR)
        after_cv = cv2.cvtColor(np.array(after_pil), cv2.COLOR_RGB2BGR)
        
        # PHASE 1: Groq Vision detects defect
        print("Phase 1: Groq detecting defect...")
        phase1_result = phase1_detect_defect(before_pil)
        
        if not phase1_result.get("has_defect"):
            return {
                "status": "no_defect",
                "message": "No defect detected in the image",
                "phase1": phase1_result
            }
        
        # Convert bbox from percent to pixels
        bbox_pixels = convert_bbox_percent_to_pixels(
            phase1_result["bbox_percent"], width, height
        )
        x1, y1, x2, y2 = bbox_pixels
        
        # Extract defect regions
        before_region = before_cv[y1:y2, x1:x2]
        after_region = after_cv[y1:y2, x1:x2]
        
        if before_region.size == 0 or after_region.size == 0:
            return {
                "status": "error",
                "message": "Invalid defect region detected"
            }
        
        # PHASE 2: Deep Learning verifies if fixed
        print("Phase 2: Deep Learning verifying repair...")
        phase2_result = phase2_verify_repair(before_region, after_region)
        
        # Draw annotations
        annotated_before, annotated_after = draw_annotations(
            before_cv.copy(), after_cv.copy(),
            bbox_pixels,
            phase1_result["description"],
            phase2_result["verdict"],
            phase2_result["confidence"]
        )
        
        # Convert to PIL and base64
        before_final = Image.fromarray(cv2.cvtColor(annotated_before, cv2.COLOR_BGR2RGB))
        after_final = Image.fromarray(cv2.cvtColor(annotated_after, cv2.COLOR_BGR2RGB))
        
        return {
            "status": "success",
            "phase1_groq": {
                "defect_found": True,
                "description": phase1_result["description"],
                "location_percent": phase1_result["bbox_percent"],
                "location_pixels": bbox_pixels
            },
            "phase2_deep_learning": {
                "verdict": phase2_result["verdict"],
                "is_fixed": phase2_result["is_fixed"],
                "confidence": phase2_result["confidence"],
                "feature_distance": phase2_result["feature_distance"]
            },
            "before_image_annotated": image_to_base64(before_final),
            "after_image_annotated": image_to_base64(after_final),
            "summary": f"Defect: {phase1_result['description']} | Status: {phase2_result['verdict']}"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8003, reload=True)
