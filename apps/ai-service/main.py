"""
Simple AI Defect Detection Service
Clean and minimal implementation
"""

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import io
import base64
from PIL import Image
import cv2
import numpy as np
from typing import Dict
from skimage.metrics import structural_similarity as ssim
import torch
from ultralytics import YOLO

app = FastAPI(title="AI Defect Detection Service")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load models once at startup
print("Loading models...")
yolo = YOLO('yolov8n.pt')
print("✓ Models loaded")


def image_to_base64(img: Image.Image) -> str:
    """Convert PIL image to base64 string"""
    buffered = io.BytesIO()
    img.save(buffered, format="JPEG", quality=85)
    return "data:image/jpeg;base64," + base64.b64encode(buffered.getvalue()).decode()


def detect_changes(before: np.ndarray, after: np.ndarray) -> Dict:
    """
    Compare two images and find changes
    Returns: dict with change info and annotated images
    """
    # Resize to same size if needed
    if before.shape != after.shape:
        h, w = min(before.shape[0], after.shape[0]), min(before.shape[1], after.shape[1])
        before = cv2.resize(before, (w, h))
        after = cv2.resize(after, (w, h))
    
    # Convert to grayscale
    gray_before = cv2.cvtColor(before, cv2.COLOR_BGR2GRAY)
    gray_after = cv2.cvtColor(after, cv2.COLOR_BGR2GRAY)
    
    # Calculate structural similarity
    score, diff = ssim(gray_before, gray_after, full=True)
    diff = (1 - diff) * 255
    diff = diff.astype(np.uint8)
    
    # Find changed regions
    _, thresh = cv2.threshold(diff, 30, 255, cv2.THRESH_BINARY)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    thresh = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
    
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    # Filter significant regions
    height, width = before.shape[:2]
    total_area = height * width
    regions = []
    
    for contour in contours:
        area = cv2.contourArea(contour)
        if area > 1000:  # Minimum area
            x, y, w, h = cv2.boundingRect(contour)
            area_pct = (area / total_area) * 100
            
            if area_pct < 30:  # Not too large (likely lighting change)
                regions.append({
                    'bbox': [int(x), int(y), int(x+w), int(y+h)],
                    'area_pct': round(area_pct, 2)
                })
    
    # Draw boxes on images
    annotated_before = before.copy()
    annotated_after = after.copy()
    
    for i, region in enumerate(regions):
        x1, y1, x2, y2 = region['bbox']
        
        # Orange box on before image
        cv2.rectangle(annotated_before, (x1, y1), (x2, y2), (0, 165, 255), 2)
        cv2.putText(annotated_before, f"Region {i+1}", (x1, y1-10),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 165, 255), 2)
        
        # Green box on after image (assuming repaired)
        cv2.rectangle(annotated_after, (x1, y1), (x2, y2), (0, 255, 0), 2)
        cv2.putText(annotated_after, f"Changed", (x1, y1-10),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
    
    return {
        'similarity_score': round(float(score), 3),
        'num_changes': len(regions),
        'regions': regions,
        'annotated_before': annotated_before,
        'annotated_after': annotated_after
    }


@app.get("/")
def root():
    return {
        "service": "AI Defect Detection",
        "status": "running",
        "endpoints": ["/analyze"]
    }


@app.post("/analyze")
async def analyze_images(
    before_image: UploadFile = File(...),
    after_image: UploadFile = File(...)
):
    """
    Compare before and after images to detect changes
    """
    try:
        # Load images
        before_img = Image.open(io.BytesIO(await before_image.read())).convert("RGB")
        after_img = Image.open(io.BytesIO(await after_image.read())).convert("RGB")
        
        # Convert to OpenCV format
        before_cv = cv2.cvtColor(np.array(before_img), cv2.COLOR_RGB2BGR)
        after_cv = cv2.cvtColor(np.array(after_img), cv2.COLOR_RGB2BGR)
        
        # Detect changes
        result = detect_changes(before_cv, after_cv)
        
        # Convert annotated images back to PIL
        before_pil = Image.fromarray(cv2.cvtColor(result['annotated_before'], cv2.COLOR_BGR2RGB))
        after_pil = Image.fromarray(cv2.cvtColor(result['annotated_after'], cv2.COLOR_BGR2RGB))
        
        # Return results
        return {
            "status": "success",
            "similarity_score": result['similarity_score'],
            "num_changes_detected": result['num_changes'],
            "regions": result['regions'],
            "before_image_annotated": image_to_base64(before_pil),
            "after_image_annotated": image_to_base64(after_pil),
            "message": f"Found {result['num_changes']} changed region(s)"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8003, reload=True)
