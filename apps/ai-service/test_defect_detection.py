#!/usr/bin/env python3
"""
Test script for defect detection service.
Tests the hybrid approach with pole before/after images.
"""

import requests
import base64
import json
from pathlib import Path
import time


def test_defect_detection(before_image_path, after_image_path, output_dir="test_output"):
    """Test the defect detection service"""
    
    # API endpoint
    url = "http://localhost:8000/analyze-defect"
    
    # Prepare files
    files = {
        'before_image': ('before.png', open(before_image_path, 'rb'), 'image/png'),
        'after_image': ('after.png', open(after_image_path, 'rb'), 'image/png')
    }
    
    # Additional data
    data = {
        'proof_id': 'defect-test-001'
    }
    
    print("🔬 AI Defect Detection - Hybrid Approach Test")
    print("=" * 60)
    print(f"   Before: {before_image_path}")
    print(f"   After: {after_image_path}")
    print()
    
    try:
        # Make request and time it
        start_time = time.time()
        response = requests.post(url, files=files, data=data)
        elapsed_time = time.time() - start_time
        
        response.raise_for_status()
        result = response.json()
        
        print(f"⚡ Processing Time: {elapsed_time:.2f} seconds")
        print()
        print("✅ Analysis Complete!")
        print("=" * 60)
        print(f"📊 Status: {result['status']}")
        print(f"🎯 Confidence: {result['confidence']:.2%}")
        print()
        
        print(f"📝 Summary:")
        print(f"   {result['summary']}")
        print()
        
        print(f"🔍 Detected Changes: {result['detected_changes']}")
        print(f"✓  Verified Repairs: {result['verified_repairs']}")
        print()
        
        if result['defect_detections']:
            print("📦 Defect Detections:")
            for detection in result['defect_detections']:
                region_id = detection['region_id']
                is_repair = detection['is_repair']
                confidence = detection['repair_confidence']
                score = detection['repair_score']
                
                status_icon = "✓" if is_repair else "✗"
                status_text = "REPAIRED" if is_repair else "NOT FIXED"
                
                print(f"\n   {status_icon} Region #{region_id}: {status_text}")
                print(f"      - Repair Confidence: {confidence:.2%}")
                print(f"      - Repair Score: {score:.0f}/100")
                print(f"      - Area: {detection['area']:.0f} px² ({detection['area_percentage']:.2f}% of image)")
                
                indicators = detection['indicators']
                print(f"      - Indicators:")
                print(f"        • Rust Reduction: {indicators['rust_reduction']:.1f}%")
                print(f"        • Brightness Change: {indicators['brightness_increase']:.1f}")
                print(f"        • Uniformity Improvement: {indicators['uniformity_improvement']:.1f}")
                print(f"        • Edge Reduction: {indicators['edge_reduction']:.4f}")
        print()
        
        # Save annotated images
        output_path = Path(output_dir)
        output_path.mkdir(exist_ok=True)
        
        # Decode and save before image
        if 'annotated_before_image' in result:
            before_img_data = result['annotated_before_image'].split(',')[1]
            with open(output_path / 'defect_before.jpg', 'wb') as f:
                f.write(base64.b64decode(before_img_data))
        
        # Decode and save after image
        if 'annotated_after_image' in result:
            after_img_data = result['annotated_after_image'].split(',')[1]
            with open(output_path / 'defect_after.jpg', 'wb') as f:
                f.write(base64.b64decode(after_img_data))
        
        # Save full JSON response
        with open(output_path / 'defect_analysis.json', 'w') as f:
            json.dump(result, f, indent=2)
        
        print(f"💾 Results saved to {output_dir}/")
        print(f"   - defect_before.jpg (with defect markers)")
        print(f"   - defect_after.jpg (with repair verification)")
        print(f"   - defect_analysis.json")
        print()
        
        return result
        
    except requests.exceptions.ConnectionError:
        print("❌ Error: Could not connect to AI service")
        print("   Make sure the service is running: python main.py")
        return None
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        if hasattr(e, 'response'):
            print(f"   Response: {e.response.text}")
        return None


if __name__ == "__main__":
    import sys
    
    # Default paths - pole images
    before_path = "../../images/pole_before.png"
    after_path = "../../images/pole_after.png"
    
    # Allow custom paths from command line
    if len(sys.argv) >= 3:
        before_path = sys.argv[1]
        after_path = sys.argv[2]
    
    result = test_defect_detection(before_path, after_path)
    
    if result:
        print("✅ Test completed successfully!")
        print()
        print("🎉 Hybrid defect detection is working!")
        if result['status'] == 'PASS':
            print("   Repairs were successfully detected and verified.")
        else:
            print("   No repairs were detected. Review the output for details.")
    else:
        print("❌ Test failed")
        sys.exit(1)
