"""
Test two-phase detection
"""
import requests
import traceback

url = "http://localhost:8003/analyze"
before = "/home/shashank/Desktop/side pros/gdg/images/wall_before.png"
after = "/home/shashank/Desktop/side pros/gdg/images/pole_after2.png"

print("Testing Two-Phase AI Defect Detection")
print("=" * 60)
print("\nPhase 1: Groq Vision detects defect")
print("Phase 2: Deep Learning verifies repair")
print("\nSending request...")

try:
    with open(before, 'rb') as f1, open(after, 'rb') as f2:
        response = requests.post(
            url,
            files={'before_image': f1, 'after_image': f2},
            timeout=60
        )
    
    print(f"\nStatus: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print("\n✓ SUCCESS!\n")
        
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
        print(f"  Feature Distance: {p2.get('feature_distance')}")
        
        print(f"\nSummary: {result.get('summary')}")
        
        # Save images
        import base64
        from pathlib import Path
        
        results_dir = Path("/home/shashank/Desktop/side pros/gdg/images/results")
        results_dir.mkdir(exist_ok=True)
        
        for img_type in ['before', 'after']:
            key = f"{img_type}_image_annotated"
            if key in result:
                b64_data = result[key].split(',')[1]
                img_data = base64.b64decode(b64_data)
                
                output_file = results_dir / f"pole_{img_type}_phase2.jpg"
                with open(output_file, 'wb') as f:
                    f.write(img_data)
                print(f"\n✓ Saved: {output_file}")
    else:
        print(f"\n✗ Error: {response.status_code}")
        print(f"Response: {response.text}")
        
except Exception as e:
    print(f"\n✗ Exception: {e}")
    traceback.print_exc()