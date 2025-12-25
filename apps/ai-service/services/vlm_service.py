"""
Vision-Language Model Service using Groq
- Uses LLaMA-3.2-Vision models for intelligent defect analysis
- Reduces false positives by adding reasoning capability
- Fast inference with Groq
"""

import os
import base64
import io
import logging
from typing import Dict, Optional
from PIL import Image
import numpy as np
import cv2
from groq import Groq

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class VLMService:
    """
    Vision-Language Model service for intelligent defect verification.
    Uses Groq's LLaMA-3.2-Vision models.
    """
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize VLM service with Groq API key.
        
        Args:
            api_key: Groq API key (or set GROQ_API_KEY env variable)
        """
        self.api_key = api_key or os.getenv("GROQ_API_KEY")
        
        if not self.api_key:
            logger.warning("No Groq API key provided - VLM analysis disabled")
            self.client = None
            self.enabled = False
        else:
            self.client = Groq(api_key=self.api_key)
            self.enabled = True
            # Groq Llama 4 Scout vision model - fast and accurate
            self.model = "meta-llama/llama-4-scout-17b-16e-instruct"
            logger.info(f"VLM Service initialized with {self.model}")
    
    def image_to_base64(self, image: np.ndarray) -> str:
        """Convert OpenCV image to base64 string."""
        # Convert BGR to RGB
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        pil_image = Image.fromarray(image_rgb)
        
        # Resize if too large (to reduce tokens and speed up)
        max_size = 512
        if max(pil_image.size) > max_size:
            pil_image.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
        
        buffered = io.BytesIO()
        pil_image.save(buffered, format="JPEG", quality=85)
        img_str = base64.b64encode(buffered.getvalue()).decode()
        return f"data:image/jpeg;base64,{img_str}"
    
    def analyze_defect_region(
        self,
        before_region: np.ndarray,
        after_region: np.ndarray,
        region_stats: Dict
    ) -> Dict:
        """
        Analyze a defect region using VLM to determine if it's a valid repair.
        
        Args:
            before_region: The region from the before image
            after_region: The region from the after image  
            region_stats: Statistics from CV analysis
            
        Returns:
            Dictionary with VLM analysis results
        """
        if not self.enabled:
            logger.debug("VLM disabled - skipping analysis")
            return {
                'vlm_enabled': False,
                'is_repair': None,
                'confidence': 0.0,
                'reasoning': 'VLM not enabled'
            }
        
        try:
            # Convert regions to base64
            before_b64 = self.image_to_base64(before_region)
            after_b64 = self.image_to_base64(after_region)
            
            # Create the prompt
            prompt = self._create_analysis_prompt(region_stats)
            
            # Call Groq VLM
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": prompt
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": before_b64
                                }
                            },
                            {
                                "type": "text",
                                "text": "AFTER (repaired):"
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": after_b64
                                }
                            }
                        ]
                    }
                ],
                temperature=0.1,  # Low temperature for consistent analysis
                max_tokens=150,
                top_p=1
            )
            
            # Parse the response
            analysis_text = response.choices[0].message.content
            result = self._parse_vlm_response(analysis_text)
            
            logger.info(f"VLM Analysis: {result['verdict']} ({result['confidence']:.0%}) - {result['reasoning'][:50]}...")
            return result
            
        except Exception as e:
            logger.error(f"VLM analysis failed: {str(e)}")
            return {
                'vlm_enabled': True,
                'is_repair': None,
                'confidence': 0.0,
                'reasoning': f'VLM error: {str(e)}',
                'verdict': 'ERROR'
            }
    
    def _create_analysis_prompt(self, region_stats: Dict) -> str:
        """Create a focused, detailed prompt for defect analysis."""
        
        rust_reduction = region_stats.get('rust_reduction', 0)
        brightness_change = region_stats.get('brightness_increase', 0)
        uniformity = region_stats.get('uniformity_improvement', 0)
        
        prompt = f"""You are an expert infrastructure inspector analyzing before/after images for defect repairs.

TASK: Determine if the AFTER image shows a GENUINE REPAIR compared to the BEFORE image.

CONTEXT from Computer Vision Analysis:
- Rust-like color reduction: {rust_reduction:.1f}%
- Brightness change: {brightness_change:.1f}
- Surface uniformity improvement: {uniformity:.1f}

CRITICAL INSTRUCTIONS:
1. A REPAIR is ONLY when you see CLEAR visual evidence like:
   - Rust/corrosion removed (brown/orange → clean metal/paint)
   - Cracks or damage filled/fixed
   - New paint covering old damage
   - Surface now smooth vs previously rough/damaged

2. NOT A REPAIR if you see:
   - Just lighting differences (shadows, brightness)
   - Same defect still visible
   - Camera angle changes
   - Minor color variations without actual repair work
   - No visible improvement in damage

3. Respond in this EXACT format:
   - Start with "REPAIRED" or "NOT_REPAIRED"
   - Then briefly explain why (1 sentence)

BEFORE image (showing defect):"""

        return prompt

    
    def _parse_vlm_response(self, response_text: str) -> Dict:
        """
        Parse VLM response to extract structured decision with better accuracy.
        """
        response_lower = response_text.lower()
        
        # Look for STRONG repair indicators
        strong_repair = any(word in response_lower for word in [
            'repaired', 'fixed', 'repair visible', 'clearly repaired', 
            'successfully repaired', 'damage removed', 'improvement'
        ])
        
        # Look for repair indicators
        repair_keywords = any(word in response_lower for word in [
            'repair', 'fix', 'improved', 'better', 'restored'
        ])
        
        # Look for NON-repair indicators
        not_repaired = any(phrase in response_lower for phrase in [
            'not repaired', 'not fixed', 'no repair', 'no fix', 
            'still damaged', 'defect still', 'same defect',
            'still visible', 'remains', 'unchanged'
        ])
        
        # Look for false positive indicators (lighting, angle, etc.)
        false_positive = any(phrase in response_lower for phrase in [
            'lighting', 'shadow', 'angle', 'brightness only', 
            'camera', 'exposure', 'just lighter', 'only brighter'
        ])
        
        # Determine verdict with priority
        if strong_repair and not not_repaired and not false_positive:
            verdict = 'REPAIRED'
            confidence = 0.90
        elif repair_keywords and not not_repaired and not false_positive:
            verdict = 'REPAIRED'
            confidence = 0.75
        elif not_repaired or false_positive:
            verdict = 'NOT_REPAIRED'
            confidence = 0.85
        else:
            verdict = 'UNCERTAIN'
            confidence = 0.50
        
        # Adjust confidence based on language certainty
        if 'clearly' in response_lower or 'obvious' in response_lower:
            confidence = min(0.95, confidence + 0.1)
        elif 'possibly' in response_lower or 'maybe' in response_lower or 'uncertain' in response_lower:
            confidence = max(0.4, confidence - 0.2)
        
        return {
            'vlm_enabled': True,
            'is_repair': verdict == 'REPAIRED',
            'confidence': confidence,
            'reasoning': response_text,
            'verdict': verdict
        }
    
    def batch_analyze_regions(
        self,
        before_img: np.ndarray,
        after_img: np.ndarray,
        regions: list,
        region_stats: list
    ) -> list:
        """
        Analyze multiple regions efficiently.
        
        Args:
            before_img: Full before image
            after_img: Full after image
            regions: List of region bounding boxes
            region_stats: List of CV statistics for each region
            
        Returns:
            List of VLM analysis results
        """
        results = []
        
        for region, stats in zip(regions, region_stats):
            bbox = region['bbox']
            x1, y1, x2, y2 = bbox['x1'], bbox['y1'], bbox['x2'], bbox['y2']
            
            # Extract regions
            before_region = before_img[y1:y2, x1:x2]
            after_region = after_img[y1:y2, x1:x2]
            
            # Skip if regions are too small
            if before_region.size == 0 or after_region.size == 0:
                results.append({
                    'vlm_enabled': False,
                    'is_repair': None,
                    'confidence': 0.0,
                    'reasoning': 'Region too small'
                })
                continue
            
            # Analyze this region
            analysis = self.analyze_defect_region(before_region, after_region, stats)
            results.append(analysis)
        
        return results
