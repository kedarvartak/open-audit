# AI Defect Detection - Two Phase Approach

Clean and simple defect detection service.

## How It Works

**Phase 1**: Groq Vision Model
- Analyzes the "before" image
- Detects defect location
- Returns coordinates and description

**Phase 2**: Deep Learning (ResNet50)
- Compares defect region in before vs after
- Determines if defect is fixed
- Returns verdict with confidence

## Setup

```bash
pip install -r requirements.txt
export GROQ_API_KEY="your-key-here"
python3 main.py
```

## Usage

```bash
curl -X POST http://localhost:8003/analyze \
  -F "before_image=@before.jpg" \
  -F "after_image=@after.jpg"
```

## Response

```json
{
  "status": "success",
  "phase1_groq": {
    "description": "Rust on metal surface",
    "location_pixels": [120, 80, 340, 260]
  },
  "phase2_deep_learning": {
    "verdict": "FIXED",
    "confidence": 0.85,
    "feature_distance": 8.5
  }
}
```

Clean. Simple. Effective.
