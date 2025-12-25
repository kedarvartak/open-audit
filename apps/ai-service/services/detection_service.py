from ultralytics import YOLO
from PIL import Image
import numpy as np
from typing import List, Dict
import torch


class DetectionService:
    """
    Object detection service using YOLOv8.
    Detects objects in images and returns bounding boxes with confidence scores.
    """
    
    def __init__(self, model_size: str = "n"):
        """
        Initialize YOLO model.
        
        Args:
            model_size: YOLO model size (n=nano, s=small, m=medium, l=large, x=xlarge)
                       nano is fastest, xlarge is most accurate
        """
        print(f"🤖 Loading YOLOv8{model_size} model...")
        
        # Use CPU if GPU not available
        self.device = 'cuda' if torch.cuda.is_available() else 'cpu'
        print(f"📱 Using device: {self.device}")
        
        # Load YOLOv8 model (will download on first run)
        self.model = YOLO(f'yolov8{model_size}.pt')
        self.model.to(self.device)
        
        print("✅ YOLOv8 model loaded successfully")
    
    def detect_objects(
        self,
        image: Image.Image,
        confidence_threshold: float = 0.25,
        iou_threshold: float = 0.45
    ) -> List[Dict]:
        """
        Detect objects in an image.
        
        Args:
            image: PIL Image
            confidence_threshold: Minimum confidence score for detections
            iou_threshold: IOU threshold for NMS (non-maximum suppression)
        
        Returns:
            List of detected objects with bounding boxes and metadata
        """
        # Convert PIL Image to numpy array
        img_array = np.array(image)
        
        # Run inference
        results = self.model(
            img_array,
            conf=confidence_threshold,
            iou=iou_threshold,
            verbose=False
        )[0]
        
        # Parse results
        detections = []
        for box in results.boxes:
            detection = {
                "class": results.names[int(box.cls[0])],
                "confidence": float(box.conf[0]),
                "bbox": {
                    "x1": float(box.xyxy[0][0]),
                    "y1": float(box.xyxy[0][1]),
                    "x2": float(box.xyxy[0][2]),
                    "y2": float(box.xyxy[0][3])
                },
                "area": float((box.xyxy[0][2] - box.xyxy[0][0]) * (box.xyxy[0][3] - box.xyxy[0][1]))
            }
            detections.append(detection)
        
        # Sort by confidence (highest first)
        detections.sort(key=lambda x: x["confidence"], reverse=True)
        
        return detections
    
    def detect_change(
        self,
        before_detections: List[Dict],
        after_detections: List[Dict]
    ) -> Dict:
        """
        Analyze changes between before and after detections.
        
        Returns:
            Dictionary with change analysis
        """
        before_classes = set([d["class"] for d in before_detections])
        after_classes = set([d["class"] for d in after_detections])
        
        # New objects (present in after but not in before)
        new_objects = after_classes - before_classes
        
        # Removed objects (present in before but not in after)
        removed_objects = before_classes - after_classes
        
        # Count changes
        before_count = {cls: len([d for d in before_detections if d["class"] == cls]) 
                       for cls in before_classes}
        after_count = {cls: len([d for d in after_detections if d["class"] == cls]) 
                      for cls in after_classes}
        
        return {
            "new_object_types": list(new_objects),
            "removed_object_types": list(removed_objects),
            "before_count": before_count,
            "after_count": after_count,
            "total_before": len(before_detections),
            "total_after": len(after_detections),
            "net_change": len(after_detections) - len(before_detections)
        }
