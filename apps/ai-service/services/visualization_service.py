from PIL import Image, ImageDraw, ImageFont
import numpy as np
import cv2
from typing import List, Dict
import random


class VisualizationService:
    """
    Service for drawing bounding boxes and annotations on images.
    """
    
    def __init__(self):
        self.colors = self._generate_colors(80)  # 80 COCO classes
        print("Visualization service initialized")
    
    def _generate_colors(self, n: int) -> List[tuple]:
        """Generate n distinct colors for bounding boxes"""
        colors = []
        for i in range(n):
            hue = int((i * 180 / n) % 180)  # OpenCV hue range is 0-179
            # Convert HSV to RGB
            c = cv2.cvtColor(np.uint8([[[hue, 255, 255]]]), cv2.COLOR_HSV2RGB)[0][0]
            colors.append(tuple(map(int, c)))
        return colors
    
    def draw_bounding_boxes(
        self,
        image: Image.Image,
        detections: List[Dict],
        title: str = ""
    ) -> Image.Image:
        """
        Draw bounding boxes on image with labels and confidence scores.
        
        Args:
            image: PIL Image
            detections: List of detected objects with bounding boxes
            title: Optional title to add to image
        
        Returns:
            Annotated PIL Image
        """
        # Create a copy
        img_copy = image.copy()
        draw = ImageDraw.Draw(img_copy)
        
        # Try to load a better font, fall back to default if not available
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 16)
            title_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 24)
        except:
            font = ImageFont.load_default()
            title_font = ImageFont.load_default()
        
        # Draw title if provided
        if title:
            draw.text((10, 10), title, fill=(255, 255, 255), font=title_font, stroke_width=2, stroke_fill=(0, 0, 0))
        
        # Draw each detection
        for idx, detection in enumerate(detections):
            bbox = detection["bbox"]
            class_name = detection["class"]
            confidence = detection["confidence"]
            
            # Get color for this class (use hash for consistency)
            color_idx = hash(class_name) % len(self.colors)
            color = self.colors[color_idx]
            
            # Draw bounding box
            box_coords = [
                (bbox["x1"], bbox["y1"]),
                (bbox["x2"], bbox["y2"])
            ]
            draw.rectangle(box_coords, outline=color, width=3)
            
            # Prepare label text
            label = f"{class_name} {confidence:.2f}"
            
            # Get text bounding box for background
            # For default font, estimate size
            text_width = len(label) * 7
            text_height = 16
            
            # Draw label background
            label_bg = [
                (bbox["x1"], bbox["y1"] - text_height - 4),
                (bbox["x1"] + text_width + 8, bbox["y1"])
            ]
            draw.rectangle(label_bg, fill=color)
            
            # Draw label text
            draw.text(
                (bbox["x1"] + 4, bbox["y1"] - text_height - 2),
                label,
                fill=(255, 255, 255),
                font=font
            )
        
        # Add detection count at bottom
        count_text = f"Detected: {len(detections)} object(s)"
        img_width, img_height = img_copy.size
        draw.text(
            (10, img_height - 30),
            count_text,
            fill=(255, 255, 0),
            font=font,
            stroke_width=2,
            stroke_fill=(0, 0, 0)
        )
        
        return img_copy
    
    def create_side_by_side(
        self,
        before_image: Image.Image,
        after_image: Image.Image,
        before_detections: List[Dict],
        after_detections: List[Dict]
    ) -> Image.Image:
        """
        Create a side-by-side comparison image.
        
        Returns:
            Combined PIL Image with both annotated images
        """
        # Annotate both images
        before_annotated = self.draw_bounding_boxes(before_image, before_detections, "BEFORE")
        after_annotated = self.draw_bounding_boxes(after_image, after_detections, "AFTER")
        
        # Resize to same height
        target_height = min(before_annotated.height, after_annotated.height)
        
        before_resized = before_annotated.resize(
            (int(before_annotated.width * target_height / before_annotated.height), target_height),
            Image.Resampling.LANCZOS
        )
        after_resized = after_annotated.resize(
            (int(after_annotated.width * target_height / after_annotated.height), target_height),
            Image.Resampling.LANCZOS
        )
        
        # Create combined image
        combined_width = before_resized.width + after_resized.width + 20  # 20px gap
        combined = Image.new('RGB', (combined_width, target_height), color=(50, 50, 50))
        
        # Paste images
        combined.paste(before_resized, (0, 0))
        combined.paste(after_resized, (before_resized.width + 20, 0))
        
        # Draw vertical line separator
        draw = ImageDraw.Draw(combined)
        line_x = before_resized.width + 10
        draw.line([(line_x, 0), (line_x, target_height)], fill=(255, 255, 255), width=2)
        
        return combined
    
    def add_comparison_overlay(
        self,
        image: Image.Image,
        status: str,
        confidence: float,
        recommendations: List[str]
    ) -> Image.Image:
        """
        Add verification status overlay to image.
        """
        img_copy = image.copy()
        draw = ImageDraw.Draw(img_copy)
        
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 20)
        except:
            font = ImageFont.load_default()
        
        # Status badge
        status_colors = {
            "PASS": (0, 200, 0),
            "FLAG": (255, 165, 0),
            "FAIL": (255, 0, 0)
        }
        status_color = status_colors.get(status, (128, 128, 128))
        
        # Draw status badge
        badge_text = f"{status} ({confidence:.1%})"
        badge_width = len(badge_text) * 10
        draw.rectangle([(10, 10), (badge_width + 20, 45)], fill=status_color)
        draw.text((15, 15), badge_text, fill=(255, 255, 255), font=font)
        
        return img_copy
