# AI Defect Detection Service

Simple service to compare before/after images and detect changes.

## Setup

```bash
pip install -r requirements.txt
```

## Run

```bash
python3 main.py
```

Service starts on http://localhost:8000

## Usage

**Endpoint**: `POST /analyze`

**Files**:
- `before_image`: Image showing defect
- `after_image`: Image after repair

**Returns**:
- Similarity score
- Number of changes detected
- Annotated images with bounding boxes

## Example

```bash
curl -X POST http://localhost:8000/analyze \
  -F "before_image=@before.jpg" \
  -F "after_image=@after.jpg"
```

## What it does

1. Compares the two images using SSIM (Structural Similarity)
2. Finds regions that changed
3. Draws bounding boxes around changes
4. Returns annotated images

Simple and clean!
