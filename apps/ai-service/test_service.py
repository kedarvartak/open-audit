#!/usr/bin/env python3
"""
Test script for AI verification service.
Tests the API with before/after images and saves the annotated results.
"""

import requests
import base64
import json
from pathlib import Path


def test_ai_service(before_image_path, after_image_path, output_dir="test_output"):
    """Test the AI service with before/after images"""
    
    # API endpoint
    url = "http://localhost:8000/analyze"
    
    # Prepare files
    files = {
        'before_image': ('before.png', open(before_image_path, 'rb'), 'image/png'),
        'after_image': ('after.png', open(after_image_path, 'rb'), 'image/png')
    }
    
    # Additional data
    data = {
        'proof_id': 'test-001',
        'expected_objects': 'person,car,bicycle'  # Adjust based on what you expect
    }
    
    print("🚀 Sending images to AI service...")
    print(f"   Before: {before_image_path}")
    print(f"   After: {after_image_path}")
    print()
    
    try:
        # Make request
        response = requests.post(url, files=files, data=data)
        response.raise_for_status()
        
        result = response.json()
        
        print("✅ Analysis Complete!")
        print("=" * 60)
        print(f"📊 Status: {result['status']}")
        print(f"🎯 Confidence: {result['confidence']:.2%}")
        print(f"🔍 Scene Similarity: {result['comparison_analysis']['scene_similarity']:.2%}")
        print()
        
        print("📦 Detected Objects (Before):")
        for obj in result['detected_objects_before'][:5]:  # Show first 5
            print(f"   - {obj['class']}: {obj['confidence']:.2%}")
        if len(result['detected_objects_before']) > 5:
            print(f"   ... and {len(result['detected_objects_before']) - 5} more")
        print()
        
        print("📦 Detected Objects (After):")
        for obj in result['detected_objects_after'][:5]:  # Show first 5
            print(f"   - {obj['class']}: {obj['confidence']:.2%}")
        if len(result['detected_objects_after']) > 5:
            print(f"   ... and {len(result['detected_objects_after']) - 5} more")
        print()
        
        print("💡 Analysis:")
        print(f"   {result['comparison_analysis']['analysis']}")
        print()
        
        print("📝 Recommendations:")
        for rec in result['recommendations']:
            print(f"   - {rec}")
        print()
        
        # Save annotated images
        output_path = Path(output_dir)
        output_path.mkdir(exist_ok=True)
        
        # Decode and save before image
        before_img_data = result['annotated_before_image'].split(',')[1]
        with open(output_path / 'annotated_before.jpg', 'wb') as f:
            f.write(base64.b64decode(before_img_data))
        
        # Decode and save after image
        after_img_data = result['annotated_after_image'].split(',')[1]
        with open(output_path / 'annotated_after.jpg', 'wb') as f:
            f.write(base64.b64decode(after_img_data))
        
        # Save full JSON response
        with open(output_path / 'analysis_result.json', 'w') as f:
            json.dump(result, f, indent=2)
        
        print(f"💾 Results saved to {output_dir}/")
        print(f"   - annotated_before.jpg")
        print(f"   - annotated_after.jpg")
        print(f"   - analysis_result.json")
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
    
    # Default paths
    before_path = "../../images/before.png"
    after_path = "../../images/after.png"
    
    # Allow custom paths from command line
    if len(sys.argv) >= 3:
        before_path = sys.argv[1]
        after_path = sys.argv[2]
    
    print("🔬 AI Verification Service - Test Script")
    print("=" * 60)
    print()
    
    result = test_ai_service(before_path, after_path)
    
    if result:
        print("✅ Test completed successfully!")
    else:
        print("❌ Test failed")
        sys.exit(1)
