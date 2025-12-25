"""
Enhanced Hybrid Defect Detection Service with VLM
- Image alignment to handle camera movement
- SSIM-based difference detection for better accuracy
- Smart bounding box merging
- VLM (Vision-Language Model) for intelligent verification
- Advanced repair classification
- Optimized for speed (4-5 seconds response time)
"""

import cv2
import numpy as np
from PIL import Image
from typing import List, Dict, Tuple, Optional
from skimage.metrics import structural_similarity as ssim
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DefectDetectionService:
    """
    Enhanced hybrid approach with VLM for defect detection and repair verification.
    """
    
    def __init__(self, groq_api_key: Optional[str] = None):
        # Tunable parameters for difference detection - OPTIMIZED FOR PRECISION
        self.diff_threshold = 35  # SSIM difference threshold (increased for precision)
        self.min_contour_area = 1500  # Minimum area (larger to filter noise)
        self.blur_kernel = (9, 9)  # Gaussian blur kernel (larger for better noise reduction)
        self.max_features = 2000  # For ORB feature detection
        self.merge_distance = 80  # Distance to merge nearby bounding boxes (larger for cleaner regions)
        
        # Initialize VLM service for intelligent analysis
        try:
            from services.vlm_service import VLMService
            self.vlm_service = VLMService(api_key=groq_api_key)
            if self.vlm_service.enabled:
                logger.info("Enhanced Defect Detection with VLM initialized")
            else:
                logger.info("Enhanced Defect Detection initialized (VLM disabled)")
        except Exception as e:
            logger.warning(f"Could not initialize VLM service: {e}")
            self.vlm_service = None

    
    def align_images(self, img1: np.ndarray, img2: np.ndarray) -> np.ndarray:
        """
        Align img2 to img1 using ORB feature matching.
        This handles slight camera movements between shots.
        """
        # Convert to grayscale
        gray1 = cv2.cvtColor(img1, cv2.COLOR_BGR2GRAY)
        gray2 = cv2.cvtColor(img2, cv2.COLOR_BGR2GRAY)
        
        # Detect ORB features
        orb = cv2.ORB_create(self.max_features)
        keypoints1, descriptors1 = orb.detectAndCompute(gray1, None)
        keypoints2, descriptors2 = orb.detectAndCompute(gray2, None)
        
        # Match features
        if descriptors1 is not None and descriptors2 is not None:
            matcher = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
            matches = matcher.match(descriptors1, descriptors2)
            matches = sorted(matches, key=lambda x: x.distance)
            
            # Keep only good matches (top 50%)
            num_good_matches = int(len(matches) * 0.5)
            matches = matches[:num_good_matches]
            
            # Need at least 10 matches for homography
            if len(matches) >= 10:
                # Extract matched points
                points1 = np.float32([keypoints1[m.queryIdx].pt for m in matches])
                points2 = np.float32([keypoints2[m.trainIdx].pt for m in matches])
                
                # Find homography
                H, mask = cv2.findHomography(points2, points1, cv2.RANSAC, 5.0)
                
                # Warp img2 to align with img1
                height, width = img1.shape[:2]
                aligned_img2 = cv2.warpPerspective(img2, H, (width, height))
                
                logger.info(f"Images aligned using {np.sum(mask)} inliers")
                return aligned_img2
        
        logger.warning("Could not align images - using original")
        return img2
    
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
        
        # Align images to handle camera movement
        cv_img2_aligned = self.align_images(cv_img1, cv_img2)
        
        return cv_img1, cv_img2_aligned
    
    def merge_nearby_boxes(self, regions: List[Dict]) -> List[Dict]:
        """
        Merge bounding boxes that are close to each other.
        This creates cleaner, more accurate defect regions.
        """
        if not regions:
            return []
        
        merged = []
        used = set()
        
        for i, region1 in enumerate(regions):
            if i in used:
                continue
            
            bbox1 = region1['bbox']
            x1_min, y1_min = bbox1['x1'], bbox1['y1']
            x1_max, y1_max = bbox1['x2'], bbox1['y2']
            total_area = region1['area']
            
            # Check if any other box is nearby
            for j, region2 in enumerate(regions[i+1:], start=i+1):
                if j in used:
                    continue
                
                bbox2 = region2['bbox']
                x2_min, y2_min = bbox2['x1'], bbox2['y1']
                x2_max, y2_max = bbox2['x2'], bbox2['y2']
                
                # Calculate distance between boxes
                dx = max(0, max(x1_min, x2_min) - min(x1_max, x2_max))
                dy = max(0, max(y1_min, y2_min) - min(y1_max, y2_max))
                distance = np.sqrt(dx**2 + dy**2)
                
                # Merge if close enough
                if distance < self.merge_distance:
                    x1_min = min(x1_min, x2_min)
                    y1_min = min(y1_min, y2_min)
                    x1_max = max(x1_max, x2_max)
                    y1_max = max(y1_max, y2_max)
                    total_area += region2['area']
                    used.add(j)
            
            merged.append({
                'bbox': {'x1': int(x1_min), 'y1': int(y1_min), 
                        'x2': int(x1_max), 'y2': int(y1_max)},
                'area': float(total_area),
                'type': 'changed_region'
            })
            used.add(i)
        
        logger.info(f"Merged {len(regions)} boxes into {len(merged)} regions")
        return merged
    
    def find_differences(self, before_img: np.ndarray, after_img: np.ndarray) -> Tuple[List[Dict], np.ndarray]:
        """
        Find regions that changed between before and after images using SSIM.
        Returns bounding boxes and difference mask.
        """
        # Convert to grayscale
        gray_before = cv2.cvtColor(before_img, cv2.COLOR_BGR2GRAY)
        gray_after = cv2.cvtColor(after_img, cv2.COLOR_BGR2GRAY)
        
        # Apply Gaussian blur to reduce noise
        gray_before = cv2.GaussianBlur(gray_before, self.blur_kernel, 0)
        gray_after = cv2.GaussianBlur(gray_after, self.blur_kernel, 0)
        
        # Compute SSIM (Structural Similarity Index)
        # This is more robust than simple pixel difference
        score, diff = ssim(gray_before, gray_after, full=True)
        logger.info(f"SSIM Score: {score:.4f} (1.0 = identical)")
        
        # Convert SSIM difference to 0-255 range
        diff = (1 - diff) * 255
        diff = diff.astype(np.uint8)
        
        # Threshold the difference
        _, thresh = cv2.threshold(diff, self.diff_threshold, 255, cv2.THRESH_BINARY)
        
        # Morphological operations to clean up
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (7, 7))
        thresh = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel, iterations=3)
        thresh = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel, iterations=2)
        
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
        
        logger.info(f"Found {len(changed_regions)} changed regions before merging")
        
        # Merge nearby bounding boxes for cleaner results
        merged_regions = self.merge_nearby_boxes(changed_regions)
        
        # Sort by area (largest first)
        merged_regions.sort(key=lambda x: x['area'], reverse=True)
        
        logger.info(f"Final: {len(merged_regions)} significant changed regions")
        return merged_regions, thresh
    
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
        
        # Simple scoring (can be improved with ML model) - STRICTER THRESHOLDS
        repair_score = 0
        if repair_indicators['rust_reduction'] > 8:  # Rust reduced by >8% (stricter)
            repair_score += 35
        if repair_indicators['brightness_increase'] > 8:  # Brighter (stricter)
            repair_score += 30
        if repair_indicators['uniformity_improvement'] > 2:  # More uniform (stricter)
            repair_score += 20
        if repair_indicators['edge_reduction'] > 0.02:  # Less ragged edges (stricter)
            repair_score += 15
        
        is_repair = repair_score > 60  # Higher threshold for more confidence
        
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
        Main method: Detect defects and verify repairs using CV + VLM.
        """
        logger.info("Starting defect detection and repair verification...")
        
        # Preprocess images
        before_cv, after_cv = self.preprocess_images(before_image, after_image)
        height, width = before_cv.shape[:2]
        
        # Find changed regions
        changed_regions, diff_mask = self.find_differences(before_cv, after_cv)
        
        # Filter out regions that are too large or too small (likely false positives)
        max_area_percentage = 30  # Reject if >30% of image changed (stricter)
        min_area_percentage = 0.5  # Reject if <0.5% of image (too small to be meaningful)
        filtered_regions = []
        for region in changed_regions:
            area_pct = (region['area'] / (width * height)) * 100
            if min_area_percentage < area_pct < max_area_percentage:
                filtered_regions.append(region)
            elif area_pct >= max_area_percentage:
                logger.warning(f"Filtering out large region {area_pct:.1f}% - likely lighting/alignment issue")
            else:
                logger.debug(f"Filtering out tiny region {area_pct:.2f}% - too small")
        
        # Analyze each changed region
        defect_detections = []
        total_repair_score = 0
        
        for idx, region in enumerate(filtered_regions[:5]):  # Analyze top 5 regions
            bbox = region['bbox']
            x1, y1, x2, y2 = bbox['x1'], bbox['y1'], bbox['x2'], bbox['y2']
            
            # Extract regions
            before_region = before_cv[y1:y2, x1:x2]
            after_region = after_cv[y1:y2, x1:x2]
            
            # Skip if regions are too small
            if before_region.size == 0 or after_region.size == 0:
                continue
            
            # Step 1: CV-based repair analysis
            cv_analysis = self.analyze_repair_quality(before_region, after_region)
            
            # Step 2: VLM-based intelligent verification (if enabled)
            vlm_analysis = None
            final_is_repair = cv_analysis['is_repair']
            final_confidence = cv_analysis['confidence']
            
            if self.vlm_service and self.vlm_service.enabled:
                vlm_analysis = self.vlm_service.analyze_defect_region(
                    before_region,
                    after_region,
                    cv_analysis['indicators']
                )
                
                # VLM has STRONG influence on final decision
                if vlm_analysis['vlm_enabled']:
                    # VLM overrides CV if confident (>0.6)
                    if vlm_analysis['confidence'] > 0.6:
                        final_is_repair = vlm_analysis['is_repair']
                        final_confidence = vlm_analysis['confidence']
                        logger.info(f"Region #{idx+1}: VLM decision - {vlm_analysis['verdict']} ({vlm_analysis['confidence']:.0%})")
                    else:
                        # Even if VLM uncertain, blend the decisions
                        if not vlm_analysis['is_repair']:
                            # VLM says NOT repair - reduce CV confidence
                            final_confidence *= 0.5
                            logger.info(f"Region #{idx+1}: VLM doubts repair, reducing confidence")
            
            detection = {
                'region_id': idx + 1,
                'bbox': bbox,
                'area': region['area'],
                'area_percentage': (region['area'] / (width * height)) * 100,
                'is_repair': final_is_repair,
                'repair_confidence': final_confidence,
                'repair_score': cv_analysis['repair_score'],
                'indicators': cv_analysis['indicators'],
                'vlm_analysis': vlm_analysis
            }
            
            defect_detections.append(detection)
            if final_is_repair:
                total_repair_score += cv_analysis['repair_score']
        
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
            'summary': self._generate_summary(defect_detections, repaired_count, total_regions),
            'vlm_enabled': self.vlm_service and self.vlm_service.enabled
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
