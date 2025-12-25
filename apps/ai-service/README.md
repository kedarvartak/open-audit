# AI Verification Service

Free and open-source AI-powered verification service for before/after image comparison.

## Features

- **Object Detection**: YOLOv8-based detection of objects in images
- **Scene Comparison**: Structural similarity analysis to verify same location
- **Bounding Box Visualization**: Annotated images with detected objects
- **Change Analysis**: Automatic detection of new/removed objects
- **Confidence Scoring**: AI-generated confidence scores for verification

## Models Used

- **YOLOv8 Nano**: Fast, efficient object detection (free, open-source)
- **OpenCV**: Image processing and visualization
- **SSIM**: Structural similarity for scene matching

## Installation

```bash
cd apps/ai-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## Running the Service

```bash
python main.py
```

The service will start on `http://localhost:8000`

## API Endpoints

### POST /analyze
Analyze before/after images for verification.

**Request:**
- `before_image`: Image file (before work)
- `after_image`: Image file (after work)
- `proof_id`: ID of proof (optional)
- `expected_objects`: Comma-separated list of expected objects (optional)

**Response:**
```json
{
  "proof_id": "string",
  "status": "PASS|FLAG|FAIL",
  "confidence": 0.85,
  "detected_objects_before": [...],
  "detected_objects_after": [...],
  "comparison_analysis": {...},
  "annotated_before_image": "base64-encoded-image",
  "annotated_after_image": "base64-encoded-image",
  "recommendations": [...]
}
```

### GET /health
Health check endpoint.

### GET /
Service information and status.

## Integration with Backend

The NestJS backend can call this service via HTTP:

```typescript
const response = await axios.post('http://localhost:8000/analyze', formData);
```

## Performance

- **Speed**: ~1-3 seconds per image pair (CPU)
- **Accuracy**: 70-90% depending on image quality
- **Models**: All models run locally, no API calls needed

## Future Enhancements

- GPU acceleration for faster processing
- Custom model training for specific object types
- Video analysis support
- Batch processing
