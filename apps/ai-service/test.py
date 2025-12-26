"""
Simple test for AI defect detection
"""
import requests
from pathlib import Path

# Test with pole images
before = "/home/shashank/Desktop/side pros/gdg/images/pole_before.png"
after = "/home/shashank/Desktop/side pros/gdg/images/pole_after.png"

print("Testing AI Defect Detection Service")
print("=" * 60)

with open(before, 'rb') as f1, open(after, 'rb') as f2:
    response = requests.post(
        "http://localhost:8003/analyze",
        files={
            'before_image': f1,
            'after_image': f2
        }
    )

if response.status_code == 200:
    result = response.json()
    print("\n✓ SUCCESS!")
    print(f"\nSimilarity Score: {result['similarity_score']}")
    print(f"Changes Detected: {result['num_changes_detected']}")
    print(f"Message: {result['message']}")
    
    if result['regions']:
        print("\nRegions:")
        for r in result['regions']:
            print(f"  - Area: {r['area_pct']}%")
    
    # Save images
    import base64
    results_dir = Path("/home/shashank/Desktop/side pros/gdg/images/results")
    results_dir.mkdir(exist_ok=True)
    
    for img_type in ['before', 'after']:
        key = f"{img_type}_image_annotated"
        if key in result:
            b64_data = result[key].split(',')[1]
            img_data = base64.b64decode(b64_data)
            
            output_file = results_dir / f"pole_{img_type}_annotated.jpg"
            with open(output_file, 'wb') as f:
                f.write(img_data)
            print(f"\n✓ Saved: {output_file}")
    
else:
    print(f"\n✗ Error: {response.status_code}")
    print(response.text)
