"""
Test two-phase detection with multiple images
"""
import requests
import traceback
import base64
from pathlib import Path

url = "http://localhost:8003/analyze"
# Using the same images for testing multiple inputs
before_path1 = "/home/shashank/Desktop/side pros/gdg/images/wall_before.png"
after_path1 = "/home/shashank/Desktop/side pros/gdg/images/wall_after.png"

before_path2 = "/home/shashank/Desktop/side pros/gdg/images/wall_before1.png"
after_path2 = "/home/shashank/Desktop/side pros/gdg/images/wall_after2.png"

print("Testing Two-Phase AI Defect Detection (Batch Mode)")
print("=" * 60)
print("\nPhase 1: Groq Vision detects defect")
print("Phase 2: Deep Learning verifies repair")
print("\nSending request with 2 pairs of images...")

try:
    # Prepare multiple files
    # We need to keep file handles open until request is sent
    f1a = open(before_path1, 'rb')
    f2a = open(after_path1, 'rb')
    
    f1b = open(before_path2, 'rb')
    f2b = open(after_path2, 'rb')

    # Note: 'before_images' and 'after_images' match the FastAPI endpoint parameters
    files = [
        ('before_images', ('before1.png', f1a, 'image/png')),
        ('before_images', ('before2.png', f1b, 'image/png')),
        ('after_images', ('after1.png', f2a, 'image/png')),
        ('after_images', ('after2.png', f2b, 'image/png'))
    ]

    response = requests.post(url, files=files, timeout=120) # Increased timeout for batch
    
    # Close files
    f1a.close()
    f1b.close()
    f2a.close()
    f2b.close()
    
    print(f"\nStatus: {response.status_code}")
    
    if response.status_code == 200:
        results = response.json()
        print(f"\n✓ SUCCESS! Received {len(results)} results.\n")
        
        results_dir = Path("/home/shashank/Desktop/side pros/gdg/images/results")
        results_dir.mkdir(exist_ok=True)

        for i, result in enumerate(results):
            print(f"--- Result {i+1} ---")
            
            if result.get('status') == 'success':
                # Phase 1 results
                print("PHASE 1 - Groq Vision:")
                p1 = result.get('phase1_groq', {})
                print(f"  Defect Found: {p1.get('defect_found')}")
                print(f"  Description: {p1.get('description')}")
                print(f"  Location: {p1.get('location_pixels')}")
                
                # Phase 2 results
                print("\nPHASE 2 - Deep Learning:")
                p2 = result.get('phase2_deep_learning', {})
                print(f"  Verdict: {p2.get('verdict')}")
                print(f"  Is Fixed: {p2.get('is_fixed')}")
                print(f"  Confidence: {p2.get('confidence')}")
                
                print(f"\nSummary: {result.get('summary')}")
                
                # Save images
                for img_type in ['before', 'after']:
                    key = f"{img_type}_image_annotated"
                    if key in result:
                        b64_data = result[key].split(',')[1]
                        img_data = base64.b64decode(b64_data)
                        
                        output_file = results_dir / f"batch_test_{i}_{img_type}.jpg"
                        with open(output_file, 'wb') as f:
                            f.write(img_data)
                        print(f"✓ Saved: {output_file}")
            else:
                print(f"Status: {result.get('status')}")
                print(f"Message: {result.get('message')}")
            
            print("-" * 40 + "\n")

    else:
        print(f"\n✗ Error: {response.status_code}")
        print(f"Response: {response.text}")
        
except Exception as e:
    print(f"\n✗ Exception: {e}")
    traceback.print_exc()