from PIL import Image
import numpy as np
import cv2
from typing import List, Dict
from skimage.metrics import structural_similarity as ssim


class ComparisonService:
    """
    Service for comparing before/after images to detect changes and verify installations.
    """
    
    def __init__(self):
        print("✅ Comparison service initialized")
    
    def compare_images(
        self,
        before_image: Image.Image,
        after_image: Image.Image,
        before_detections: List[Dict],
        after_detections: List[Dict],
        expected_objects: List[str] = None
    ) -> Dict:
        """
        Comprehensive comparison of before/after images.
        
        Returns:
            Dictionary with comparison metrics and analysis
        """
        # Convert PIL to numpy
        before_np = np.array(before_image)
        after_np = np.array(after_image)
        
        # Resize images to same size for comparison
        target_size = (640, 480)
        before_resized = cv2.resize(before_np, target_size)
        after_resized = cv2.resize(after_np, target_size)
        
        # 1. Structural Similarity (checks if same location)
        scene_similarity = self._calculate_scene_similarity(before_resized, after_resized)
        
        # 2. Object-level comparison
        object_analysis = self._analyze_object_changes(before_detections, after_detections)
        
        # 3. Visual difference analysis
        visual_diff = self._calculate_visual_difference(before_resized, after_resized)
        
        # 4. Expected objects validation
        expected_validation = self._validate_expected_objects(
            after_detections,
            expected_objects
        )
        
        # Calculate overall confidence
        confidence = self._calculate_confidence(
            scene_similarity,
            object_analysis,
            expected_validation
        )
        
        return {
            "scene_similarity": float(scene_similarity),
            "object_changes": object_analysis,
            "visual_difference_percentage": float(visual_diff),
            "expected_objects_found": expected_validation,
            "new_objects_count": object_analysis["net_change"],
            "confidence": float(confidence),
            "analysis": self._generate_analysis_text(
                scene_similarity,
                object_analysis,
                expected_validation
            )
        }
    
    def _calculate_scene_similarity(self, img1: np.ndarray, img2: np.ndarray) -> float:
        """
        Calculate structural similarity to verify images are from same location.
        Uses SSIM (Structural Similarity Index).
        """
        # Convert to grayscale
        gray1 = cv2.cvtColor(img1, cv2.COLOR_RGB2GRAY)
        gray2 = cv2.cvtColor(img2, cv2.COLOR_RGB2GRAY)
        
        # Calculate SSIM
        similarity_score, _ = ssim(gray1, gray2, full=True)
        
        return similarity_score
    
    def _analyze_object_changes(
        self,
        before_detections: List[Dict],
        after_detections: List[Dict]
    ) -> Dict:
        """Analyze what objects changed between images"""
        before_classes = set([d["class"] for d in before_detections])
        after_classes = set([d["class"] for d in after_detections])
        
        # New objects
        new_objects = list(after_classes - before_classes)
        
        # Removed objects
        removed_objects = list(before_classes - after_classes)
        
        # Count changes per class
        before_counts = {}
        for d in before_detections:
            before_counts[d["class"]] = before_counts.get(d["class"], 0) + 1
        
        after_counts = {}
        for d in after_detections:
            after_counts[d["class"]] = after_counts.get(d["class"], 0) + 1
        
        # Calculate net change
        net_change = len(after_detections) - len(before_detections)
        
        return {
            "new_objects": new_objects,
            "removed_objects": removed_objects,
            "before_object_counts": before_counts,
            "after_object_counts": after_counts,
            "total_before": len(before_detections),
            "total_after": len(after_detections),
            "net_change": net_change
        }
    
    def _calculate_visual_difference(self, img1: np.ndarray, img2: np.ndarray) -> float:
        """
        Calculate percentage of pixels that changed between images.
        """
        # Convert to grayscale
        gray1 = cv2.cvtColor(img1, cv2.COLOR_RGB2GRAY)
        gray2 = cv2.cvtColor(img2, cv2.COLOR_RGB2GRAY)
        
        # Calculate absolute difference
        diff = cv2.absdiff(gray1, gray2)
        
        # Threshold to find significant changes
        _, thresh = cv2.threshold(diff, 30, 255, cv2.THRESH_BINARY)
        
        # Calculate percentage of changed pixels
        changed_pixels = np.sum(thresh > 0)
        total_pixels = thresh.size
        change_percentage = (changed_pixels / total_pixels) * 100
        
        return change_percentage
    
    def _validate_expected_objects(
        self,
        detections: List[Dict],
        expected_objects: List[str]
    ) -> Dict:
        """
        Check if expected objects are present in detections.
        """
        if not expected_objects:
            return {"expected": [], "found": [], "missing": [], "all_found": True}
        
        detected_classes = [d["class"].lower() for d in detections]
        
        found = []
        missing = []
        
        for expected in expected_objects:
            expected_lower = expected.lower()
            # Check if expected object or similar is detected
            is_found = any(
                expected_lower in cls or cls in expected_lower
                for cls in detected_classes
            )
            
            if is_found:
                found.append(expected)
            else:
                missing.append(expected)
        
        return {
            "expected": expected_objects,
            "found": found,
            "missing": missing,
            "all_found": len(missing) == 0
        }
    
    def _calculate_confidence(
        self,
        scene_similarity: float,
        object_analysis: Dict,
        expected_validation: Dict
    ) -> float:
        """
        Calculate overall confidence score for the verification.
        """
        # Start with base confidence
        confidence = 0.5
        
        # Scene similarity contributes (same location check)
        if scene_similarity > 0.5:
            confidence += 0.2
        
        # New objects detected
        if object_analysis["net_change"] > 0:
            confidence += 0.2
        
        # Expected objects found
        if expected_validation.get("all_found", False):
            confidence += 0.3
        elif len(expected_validation.get("found", [])) > 0:
            ratio = len(expected_validation["found"]) / len(expected_validation["expected"])
            confidence += 0.3 * ratio
        
        return min(1.0, max(0.0, confidence))
    
    def _generate_analysis_text(
        self,
        scene_similarity: float,
        object_analysis: Dict,
        expected_validation: Dict
    ) -> str:
        """Generate human-readable analysis"""
        parts = []
        
        if scene_similarity > 0.7:
            parts.append("Images appear to be from the same location.")
        elif scene_similarity > 0.4:
            parts.append("Images might be from the same location (moderate similarity).")
        else:
            parts.append("WARNING: Images may not be from the same location.")
        
        if object_analysis["net_change"] > 0:
            parts.append(f"Detected {object_analysis['net_change']} new object(s).")
        elif object_analysis["net_change"] < 0:
            parts.append(f"Detected {abs(object_analysis['net_change'])} fewer object(s).")
        else:
            parts.append("No net change in object count detected.")
        
        if expected_validation.get("all_found"):
            parts.append("All expected objects were found.")
        elif len(expected_validation.get("found", [])) > 0:
            parts.append(f"Found {len(expected_validation['found'])} of {len(expected_validation['expected'])} expected objects.")
        
        return " ".join(parts)
