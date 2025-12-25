"""
Hybrid Defect Detection Service
- Uses image difference analysis to find changed regions
- Classifies changes as repairs or not
- Optimized for speed (4-5 seconds response time)
"""

import cv2
import numpy as np
from PIL import Image
from typing import List, Dict, Tuple
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DefectDetectionService:
    """
    Hybrid approach for defect detection and repair verification.
    """
    
    def __init__(self):
        # Tunable parameters for difference detection
        self.diff_threshold = 25  # Pixel difference threshold
        self.min_contour_area = 500  # Minimum area to consider
        self.blur_kernel = (5, 5)  # Gaussian blur kernel
        logger.info("✅ Defect Detection Service initialized")
    
    def preprocess_images(self, img1: Image.Image, img2: Image.Image) -> Tuple[np.ndarray, np.ndarray]:
        """
        Preprocess images to ensure they're comparable.
        """
        # Resize to same dimensions if needed
        if img1.size != img2.size:
            target_size = (min(img1.width, img2.width), min(img1.height, img2.height))
            img1 = img1.resize(target_size, Image.Resampling.LANCZOS)
            img2 = img2.resize(target_size, Image.Resampling.LANCZOS)
        
        # Convert to OpenCV format
        cv_img1 = cv2.cvtColor(np.array(img1), cv2.COLOR_RGB2BGR)
        cv_img2 = cv2.cvtColor(np.array(img2), cv2.COLOR_RGB2BGR)
        
        return cv_img1, cv_img2
    
    def find_differences(self, before_img: np.ndarray, after_img: np.ndarray) -> Tuple[List[Dict], np.ndarray]:
        """
        Find regions that changed between before and after images.
        Returns bounding boxes and difference mask.
        """
        # Convert to grayscale
        gray_before = cv2.cvtColor(before_img, cv2.COLOR_BGR2GRAY)
        gray_after = cv2.cvtColor(after_img, cv2.COLOR_BGR2GRAY)
        
        # Apply Gaussian blur to reduce noise
        gray_before = cv2.GaussianBlur(gray_before, self.blur_kernel, 0)
        gray_after = cv2.GaussianBlur(gray_after, self.blur_kernel, 0)
        
        # Compute absolute difference
        diff = cv2.absdiff(gray_before, gray_after)
        
        # Threshold the difference
        _, thresh = cv2.threshold(diff, self.diff_threshold, 255, cv2.THRESH_BINARY)
        
        # Morphological operations to clean up
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
        thresh = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel, iterations=2)
        thresh = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel, iterations=1)
        
        # Find contours
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        # Extract bounding boxes for significant changes
        changed_regions = []
        for contour in contours:
            area = cv2.contourArea(contour)
            if area > self.min_contour_area:
                x, y, w, h = cv2.boundingRect(contour)
                changed_regions.append({
                    'bbox': {'x1': int(x), 'y1': int(y), 'x2': int(x + w), 'y2': int(y + h)},
                    'area': float(area),
                    'type': 'changed_region'
                })
        
        # Sort by area (largest first)
        changed_regions.sort(key=lambda x: x['area'], reverse=True)
        
        logger.info(f"Found {len(changed_regions)} significant changed regions")
        return changed_regions, thresh
    
    def analyze_repair_quality(self, before_region: np.ndarray, after_region: np.ndarray) -> Dict:
        """
        Analyze if the change represents a repair (improvement).
        Uses simple heuristics for speed.
        """
        # Convert to LAB color space for better color analysis
        before_lab = cv2.cvtColor(before_region, cv2.COLOR_BGR2LAB)
        after_lab = cv2.cvtColor(after_region, cv2.COLOR_BGR2LAB)
        
        # Calculate mean and std deviation
        before_mean = np.mean(before_lab, axis=(0, 1))
        after_mean = np.mean(after_lab, axis=(0, 1))
        before_std = np.std(before_lab, axis=(0, 1))
        after_std = np.std(after_lab, axis=(0, 1))
        
        # Detect rust-like colors in before image (reddish-brown)
        before_hsv = cv2.cvtColor(before_region, cv2.COLOR_BGR2HSV)
        # Rust typically: low saturation, brownish hue
        rust_mask = cv2.inRange(before_hsv, np.array([0, 20, 20]), np.array([30, 255, 200]))
        rust_percentage_before = (np.sum(rust_mask > 0) / rust_mask.size) * 100
        
        after_hsv = cv2.cvtColor(after_region, cv2.COLOR_BGR2HSV)
        rust_mask_after = cv2.inRange(after_hsv, np.array([0, 20, 20]), np.array([30, 255, 200]))
        rust_percentage_after = (np.sum(rust_mask_after > 0) / rust_mask_after.size) * 100
        
        # Calculate texture uniformity (repairs tend to be more uniform)
        before_edges = cv2.Canny(cv2.cvtColor(before_region, cv2.COLOR_BGR2GRAY), 50, 150)
        after_edges = cv2.Canny(cv2.cvtColor(after_region, cv2.COLOR_BGR2GRAY), 50, 150)
        
        before_edge_density = np.sum(before_edges > 0) / before_edges.size
        after_edge_density = np.sum(after_edges > 0) / after_edges.size
        
        # Analyze brightness change
        brightness_change = float(after_mean[0] - before_mean[0])  # L channel
        
        # Uniformity change (lower std = more uniform = better repair)
        uniformity_improvement = float(before_std[0] - after_std[0])
        
        # Repair score calculation
        repair_indicators = {
            'rust_reduction': rust_percentage_before - rust_percentage_after,
            'brightness_increase': brightness_change,
            'uniformity_improvement': uniformity_improvement,
            'edge_reduction': before_edge_density - after_edge_density
        }
        
        # Simple scoring (can be improved with ML model)
        repair_score = 0
        if repair_indicators['rust_reduction'] > 5:  # Rust reduced by >5%
            repair_score += 30
        if repair_indicators['brightness_increase'] > 5:  # Brighter
            repair_score += 25
        if repair_indicators['uniformity_improvement'] > 0:  # More uniform
            repair_score += 25
        if repair_indicators['edge_reduction'] > 0:  # Less ragged edges
            repair_score += 20
        
        is_repair = repair_score > 50
        
        return {
            'is_repair': is_repair,
            'confidence': min(repair_score, 100) / 100.0,
            'indicators': repair_indicators,
            'repair_score': repair_score
        }
    
    def detect_and_verify(
        self,
        before_image: Image.Image,
        after_image: Image.Image
    ) -> Dict:
        """
        Main method: Detect defects and verify repairs.
        """
        logger.info("Starting defect detection and repair verification...")
        
        # Preprocess images
        before_cv, after_cv = self.preprocess_images(before_image, after_image)
        height, width = before_cv.shape[:2]
        
        # Find changed regions
        changed_regions, diff_mask = self.find_differences(before_cv, after_cv)
        
        # Analyze each changed region
        defect_detections = []
        total_repair_score = 0
        
        for idx, region in enumerate(changed_regions[:5]):  # Analyze top 5 regions
            bbox = region['bbox']
            x1, y1, x2, y2 = bbox['x1'], bbox['y1'], bbox['x2'], bbox['y2']
            
            # Extract regions
            before_region = before_cv[y1:y2, x1:x2]
            after_region = after_cv[y1:y2, x1:x2]
            
            # Skip if regions are too small
            if before_region.size == 0 or after_region.size == 0:
                continue
            
            # Analyze repair quality
            repair_analysis = self.analyze_repair_quality(before_region, after_region)
            
            detection = {
                'region_id': idx + 1,
                'bbox': bbox,
                'area': region['area'],
                'area_percentage': (region['area'] / (width * height)) * 100,
                'is_repair': repair_analysis['is_repair'],
                'repair_confidence': repair_analysis['confidence'],
                'repair_score': repair_analysis['repair_score'],
                'indicators': repair_analysis['indicators']
            }
            
            defect_detections.append(detection)
            if repair_analysis['is_repair']:
                total_repair_score += repair_analysis['repair_score']
        
        # Overall assessment
        repaired_count = sum(1 for d in defect_detections if d['is_repair'])
        total_regions = len(defect_detections)
        
        overall_status = "PASS" if repaired_count > 0 else "FAIL"
        overall_confidence = (total_repair_score / (total_regions * 100)) if total_regions > 0 else 0
        
        result = {
            'status': overall_status,
            'confidence': min(overall_confidence, 1.0),
            'detected_changes': total_regions,
            'verified_repairs': repaired_count,
            'defect_detections': defect_detections,
            'summary': self._generate_summary(defect_detections, repaired_count, total_regions)
        }
        
        logger.info(f"Analysis complete: {overall_status} with {repaired_count}/{total_regions} repairs verified")
        return result
    
    def _generate_summary(self, detections: List[Dict], repaired: int, total: int) -> str:
        """Generate human-readable summary."""
        if total == 0:
            return "No significant changes detected between images."
        
        if repaired == 0:
            return f"Detected {total} changed region(s), but no repairs verified."
        
        if repaired == total:
            return f"All {repaired} detected defect(s) have been successfully repaired."
        
        return f"Found {repaired} verified repair(s) out of {total} changed region(s)."
