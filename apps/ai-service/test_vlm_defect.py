"""
Quick Test Script for Enhanced VLM-based Defect Detection
Run this to test the improved accuracy with Groq LLM integration
"""

import requests
import sys
from pathlib import Path

# Configuration
API_URL = "http://localhost:8000"
TEST_IMAGES_DIR = Path("/home/shashank/Desktop/side pros/gdg/images")

def test_defect_detection(before_image_path: str, after_image_path: str):
    """
    Test the defect detection endpoint with VLM
    """
    print("\n" + "="*60)
    print("Testing VLM-Enhanced Defect Detection")
    print("="*60)
    
    # Check if files exist
    before_path = Path(before_image_path)
    after_path = Path(after_image_path)
    
    if not before_path.exists():
        print(f"[ERROR] Before image not found: {before_path}")
        return
    
    if not after_path.exists():
        print(f"[ERROR] After image not found: {after_path}")
        return
    
    print(f"\nBefore: {before_path.name}")
    print(f"After:  {after_path.name}")
    
    # Prepare files
    with open(before_path, 'rb') as before_file, open(after_path, 'rb') as after_file:
        files = {
            'before_image': (before_path.name, before_file, 'image/jpeg'),
            'after_image': (after_path.name, after_file, 'image/jpeg')
        }
        
        print(f"\nSending request to {API_URL}/analyze-defect...")
        
        try:
            response = requests.post(
                f"{API_URL}/analyze-defect",
                files=files,
                data={'proof_id': 'test_proof_001'}
            )
            
            if response.status_code == 200:
                result = response.json()
                print("\n[SUCCESS] Analysis Complete!")
                print_results(result)
            else:
                print(f"\n[ERROR] Request failed with status {response.status_code}")
                print(f"Error: {response.text}")
                
        except requests.exceptions.ConnectionError:
            print(f"\n[ERROR] Could not connect to {API_URL}")
            print("Make sure the service is running: python3 main.py")
        except Exception as e:
            print(f"\n[ERROR] {str(e)}")

def print_results(result: dict):
    """Pretty print the analysis results"""
    
    print("\n" + "="*60)
    print("RESULTS")
    print("="*60)
    
    # Overall status
    status_label = "[PASS]" if result['status'] == 'PASS' else "[FAIL]"
    print(f"\nStatus: {status_label} {result['status']}")
    print(f"Confidence: {result['confidence']*100:.1f}%")
    print(f"Summary: {result['summary']}")
    
    # VLM enabled check
    vlm_enabled = result.get('vlm_enabled', False)
    vlm_status = "ENABLED" if vlm_enabled else "DISABLED"
    print(f"\nVLM (Groq): {vlm_status}")
    
    # Detection details
    print(f"\nDetection Details:")
    print(f"   Total changed regions: {result['detected_changes']}")
    print(f"   Verified repairs: {result['verified_repairs']}")
    
    # Individual defect detections
    if result.get('defect_detections'):
        print(f"\nIndividual Regions:")
        for detection in result['defect_detections']:
            region_id = detection['region_id']
            is_repair = detection['is_repair']
            confidence = detection['repair_confidence']
            area_pct = detection['area_percentage']
            
            repair_status = "[REPAIRED]" if is_repair else "[NOT REPAIRED]"
            print(f"\n   Region #{region_id}: {repair_status}")
            print(f"      Confidence: {confidence*100:.1f}%")
            print(f"      Area: {area_pct:.2f}% of image")
            print(f"      CV Score: {detection['repair_score']}/100")
            
            # Show CV indicators
            indicators = detection['indicators']
            print(f"      CV Analysis:")
            print(f"         - Rust reduction: {indicators['rust_reduction']:.1f}%")
            print(f"         - Brightness: {indicators['brightness_increase']:+.1f}")
            print(f"         - Uniformity: {indicators['uniformity_improvement']:+.1f}")
            
            # Show VLM analysis if available
            vlm = detection.get('vlm_analysis')
            if vlm and vlm.get('vlm_enabled'):
                print(f"      VLM Analysis:")
                print(f"         - Verdict: {vlm['verdict']}")
                print(f"         - Confidence: {vlm['confidence']*100:.1f}%")
                reasoning = vlm['reasoning'][:80]
                print(f"         - Reasoning: {reasoning}...")
    
    print("\n" + "="*60)
    print("Annotated images available in response (base64)")
    print("="*60)

def check_health():
    """Check if service is running"""
    try:
        response = requests.get(f"{API_URL}/health")
        if response.status_code == 200:
            print("[OK] Service is healthy")
            return True
    except:
        pass
    print(f"[ERROR] Service not reachable at {API_URL}")
    return False

if __name__ == "__main__":
    # Check service health
    if not check_health():
        print("\nStart the service with: python3 main.py")
        sys.exit(1)
    
    # Check for command line arguments
    if len(sys.argv) >= 3:
        before_img = sys.argv[1]
        after_img = sys.argv[2]
        test_defect_detection(before_img, after_img)
    else:
        # Example usage
        print("\n" + "="*60)
        print("USAGE")
        print("="*60)
        print("\nTest with your own images:")
        print("  python3 test_vlm_defect.py <before_image> <after_image>")
        print("\nExample:")
        print("  python3 test_vlm_defect.py before_rust.jpg after_repair.jpg")
        print("\n" + "="*60)
        
        # Check if test images directory exists
        if TEST_IMAGES_DIR.exists():
            images = sorted(list(TEST_IMAGES_DIR.glob("*.jpg")) + list(TEST_IMAGES_DIR.glob("*.png")))
            if images:
                print(f"\nAvailable images in {TEST_IMAGES_DIR}:")
                for i, img in enumerate(images, 1):
                    print(f"  {i}. {img.name}")
                
                # Look for before/after pairs
                before_images = [img for img in images if 'before' in img.name.lower()]
                after_images = [img for img in images if 'after' in img.name.lower() or 'fixed' in img.name.lower()]
                
                if before_images and after_images:
                    print(f"\nRunning test with first before/after pair...")
                    test_defect_detection(str(before_images[0]), str(after_images[0]))
                else:
                    print("\nNo before/after image pairs found.")
                    print("Please provide image paths as arguments.")
        else:
            print(f"\n[ERROR] Images directory not found: {TEST_IMAGES_DIR}")
