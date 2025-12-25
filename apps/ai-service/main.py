from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import uvicorn
import io
import base64
from PIL import Image
import numpy as np

from services.detection_service import DetectionService
from services.comparison_service import ComparisonService
from services.visualization_service import VisualizationService

app = FastAPI(
    title="AI Verification Service",
    description="Open-source vision-based verification for before/after image comparison",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
detection_service = DetectionService()
comparison_service = ComparisonService()
visualization_service = VisualizationService()


class VerificationRequest(BaseModel):
    proof_id: str
    milestone_id: str
    expected_objects: Optional[List[str]] = None  # e.g., ["solar panel", "water filter"]


class VerificationResponse(BaseModel):
    proof_id: str
    status: str  # "PASS", "FLAG", "FAIL"
    confidence: float
    detected_objects_before: List[dict]
    detected_objects_after: List[dict]
    comparison_analysis: dict
    annotated_before_image: str  # Base64 encoded
    annotated_after_image: str  # Base64 encoded
    recommendations: List[str]


@app.get("/")
async def root():
    return {
        "service": "AI Verification Service",
        "status": "running",
        "models": {
            "object_detection": "YOLOv8",
            "scene_comparison": "Custom CV algorithms",
            "visualization": "OpenCV"
        }
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


@app.post("/analyze", response_model=VerificationResponse)
async def analyze_proof(
    before_image: UploadFile = File(...),
    after_image: UploadFile = File(...),
    proof_id: str = "unknown",
    expected_objects: Optional[str] = None
):
    """
    Analyze before/after images for verification.
    
    Args:
        before_image: Image before work was done
        after_image: Image after work was completed
        proof_id: ID of the proof being analyzed
        expected_objects: Comma-separated list of expected objects (e.g., "solar panel,mounting")
    
    Returns:
        VerificationResponse with analysis results and annotated images
    """
    try:
        # Read images
        before_img = Image.open(io.BytesIO(await before_image.read())).convert("RGB")
        after_img = Image.open(io.BytesIO(await after_image.read())).convert("RGB")
        
        # Parse expected objects
        expected_obj_list = []
        if expected_objects:
            expected_obj_list = [obj.strip() for obj in expected_objects.split(",")]
        
        # Step 1: Detect objects in both images
        before_detections = detection_service.detect_objects(before_img)
        after_detections = detection_service.detect_objects(after_img)
        
        # Step 2: Compare images
        comparison_result = comparison_service.compare_images(
            before_img,
            after_img,
            before_detections,
            after_detections,
            expected_obj_list
        )
        
        # Step 3: Generate annotated images with bounding boxes
        annotated_before = visualization_service.draw_bounding_boxes(
            before_img,
            before_detections,
            title="Before"
        )
        annotated_after = visualization_service.draw_bounding_boxes(
            after_img,
            after_detections,
            title="After"
        )
        
        # Convert annotated images to base64
        before_base64 = image_to_base64(annotated_before)
        after_base64 = image_to_base64(annotated_after)
        
        # Determine verification status
        status, confidence = determine_verification_status(
            comparison_result,
            expected_obj_list,
            after_detections
        )
        
        return VerificationResponse(
            proof_id=proof_id,
            status=status,
            confidence=confidence,
            detected_objects_before=before_detections,
            detected_objects_after=after_detections,
            comparison_analysis=comparison_result,
            annotated_before_image=before_base64,
            annotated_after_image=after_base64,
            recommendations=generate_recommendations(comparison_result, status)
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


def image_to_base64(image: Image.Image) -> str:
    """Convert PIL Image to base64 string"""
    buffered = io.BytesIO()
    image.save(buffered, format="JPEG")
    img_str = base64.b64encode(buffered.getvalue()).decode()
    return f"data:image/jpeg;base64,{img_str}"


def determine_verification_status(
    comparison_result: dict,
    expected_objects: List[str],
    after_detections: List[dict]
) -> tuple:
    """
    Determine if verification passes based on comparison and expected objects.
    
    Returns:
        (status: str, confidence: float)
    """
    confidence = comparison_result.get("confidence", 0.0)
    
    # Check if expected objects are detected
    if expected_objects:
        detected_classes = [d["class"] for d in after_detections]
        expected_found = any(
            any(exp.lower() in cls.lower() or cls.lower() in exp.lower() 
                for exp in expected_objects)
            for cls in detected_classes
        )
        
        if not expected_found:
            return "FAIL", confidence * 0.5
    
    # Check scene similarity (should be same location)
    scene_similarity = comparison_result.get("scene_similarity", 0.0)
    if scene_similarity < 0.3:
        return "FLAG", confidence * 0.7
    
    # Check if new objects detected
    new_objects_count = comparison_result.get("new_objects_count", 0)
    
    if new_objects_count > 0 and confidence > 0.7:
        return "PASS", confidence
    elif new_objects_count > 0 and confidence > 0.5:
        return "FLAG", confidence
    else:
        return "FAIL", confidence


def generate_recommendations(comparison_result: dict, status: str) -> List[str]:
    """Generate recommendations based on analysis"""
    recommendations = []
    
    if status == "FAIL":
        recommendations.append("Manual review required - verification criteria not met")
        if comparison_result.get("scene_similarity", 1.0) < 0.3:
            recommendations.append("Images may not be from the same location")
    
    if status == "FLAG":
        recommendations.append("Requires human verification - confidence below threshold")
    
    if comparison_result.get("new_objects_count", 0) == 0:
        recommendations.append("No new objects detected between before and after images")
    
    return recommendations if recommendations else ["Verification successful"]


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
