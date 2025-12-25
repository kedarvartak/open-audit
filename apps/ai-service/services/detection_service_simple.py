"""
Simplified detection service using OpenCV for quick testing.
This version doesn't require PyTorch/YOLO but provides basic functionality.
"""

import cv2
import numpy as np
from PIL import Image
from typing import List, Dict


class SimpleDetectionService:
    """
    Simplified detection using OpenCV contours and features.
    For production, replace with YOLOv8-based DetectionService.
    """
    
    def __init__(self):
        print("✅ Simple detection service initialized (OpenCV-based)")
        print("   Note: For full YOLO detection, install torch and ultralytics")
    
    def detect_objects(
        self,
        image: Image.Image,
        confidence_threshold: float = 0.25,
        iou_threshold: float = 0.45
    ) -> List[Dict]:
        """
        Detect objects using simple OpenCV methods.
        Returns mock detections with bounding boxes.
        """
        # Convert PIL to OpenCV
        img_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
        
        # Apply edge detection
        edges = cv2.Canny(gray, 50, 150)
        
        # Find contours
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        detections = []
        
        # Filter significant contours
        for i, contour in enumerate(contours):
            area = cv2.contourArea(contour)
            
            # Only keep significant objects (> 1000 pixels)
            if area > 1000:
                x, y, w, h = cv2.boundingRect(contour)
                
                detection = {
                    "class": f"object_{i % 5}",  # Simple numbering
                    "confidence": float(min(1.0, area / 10000)),  # Mock confidence
                    "bbox": {
                        "x1": float(x),
                        "y1": float(y),
                        "x2": float(x + w),
                        "y2": float(y + h)
                    },
                    "area": float(area)
                }
                detections.append(detection)
        
        # Sort by area (largest first)
        detections.sort(key=lambda x: x["area"], reverse=True)
        
        # Return top 10
        return detections[:10]


# Export compatible name
DetectionService = SimpleDetectionService
