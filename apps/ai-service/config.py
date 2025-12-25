"""
Configuration for AI Verification Service
Centralized settings for easy tuning of detection accuracy
"""

import os

# ============================================
# VLM (Vision Language Model) Configuration
# ============================================
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "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")
VLM_MODEL = "llama-3.2-11b-vision-preview"  # Fast, accurate vision model
VLM_ENABLED = True  # Set to False to disable VLM and rely only on CV

# ============================================
# Detection Parameters (Tuning for Precision)
# ============================================

# SSIM Difference Threshold (20-50)
# - Higher = Less sensitive (fewer false positives, may miss small defects)
# - Lower = More sensitive (catches more, but more false positives)
# RECOMMENDED: 35 for balanced precision
DIFF_THRESHOLD = 35

# Minimum Contour Area in pixels (500-3000)
# - Higher = Only large defects detected (cleaner results)
# - Lower = Small defects detected too (noisier results)
# RECOMMENDED: 1500 for infrastructure repairs
MIN_CONTOUR_AREA = 1500

# Gaussian Blur Kernel Size (5x5 to 11x11, must be odd)
# - Larger = More noise reduction (smoother, may blur small details)
# - Smaller = Less noise reduction (more details, more noise)
# RECOMMENDED: (9, 9) for real-world images
BLUR_KERNEL = (9, 9)

# Bounding Box Merge Distance in pixels (30-150)
# - Higher = More boxes merged into larger regions (cleaner)
# - Lower = Keeps separate boxes (more granular, messier)
# RECOMMENDED: 80 for cleaner visualizations
MERGE_DISTANCE = 80

# Maximum features for ORB alignment (1000-5000)
# - More = Better alignment but slower
# - Less = Faster but may fail alignment
# RECOMMENDED: 2000 for speed/quality balance
MAX_FEATURES = 2000

# ============================================
# Area Filtering (Reduce False Positives)
# ============================================

# Maximum area as % of image (10-50)
# Regions larger than this are likely lighting/alignment issues
MAX_AREA_PERCENTAGE = 30

# Minimum area as % of image (0.1-2.0)
# Regions smaller than this are likely noise
MIN_AREA_PERCENTAGE = 0.5

# ============================================
# Repair Classification Thresholds
# ============================================

# Rust reduction threshold (3-15%)
# Change >X% in rust-like colors to count as repair indicator
RUST_REDUCTION_THRESHOLD = 8

# Brightness increase threshold (2-15)
# LAB L-channel increase >X to count as repair indicator
BRIGHTNESS_THRESHOLD = 8

# Uniformity improvement threshold (0-5)
# Std deviation reduction >X to count as repair indicator
UNIFORMITY_THRESHOLD = 2

# Edge reduction threshold (0.01-0.05)
# Edge density reduction >X to count as repair indicator
EDGE_REDUCTION_THRESHOLD = 0.02

# Overall repair score threshold (40-80)
# Score must be >X to classify as repair
REPAIR_SCORE_THRESHOLD = 60

# ============================================
# VLM Decision Weights
# ============================================

# Confidence threshold for VLM override (0.5-0.9)
# VLM must be >X confident to override CV decision
VLM_OVERRIDE_CONFIDENCE = 0.6

# VLM uncertainty penalty (0.3-0.7)
# If VLM doubts repair, multiply CV confidence by this
VLM_DOUBT_PENALTY = 0.5

# ============================================
# Performance Settings
# ============================================

# Maximum regions to analyze with VLM (3-10)
# More = better accuracy but slower, costs more API credits
MAX_VLM_REGIONS = 5

# VLM image resize max dimension (256-1024)
# Smaller = faster, cheaper, but less detail for model
VLM_MAX_IMAGE_SIZE = 512

# ============================================
# Quick Presets
# ============================================

PRESETS = {
    "high_precision": {
        # Minimize false positives, only catch obvious repairs
        "DIFF_THRESHOLD": 40,
        "MIN_CONTOUR_AREA": 2000,
        "REPAIR_SCORE_THRESHOLD": 70,
        "VLM_OVERRIDE_CONFIDENCE": 0.7,
    },
    "balanced": {
        # Current recommended settings
        "DIFF_THRESHOLD": 35,
        "MIN_CONTOUR_AREA": 1500,
        "REPAIR_SCORE_THRESHOLD": 60,
        "VLM_OVERRIDE_CONFIDENCE": 0.6,
    },
    "high_sensitivity": {
        # Catch more defects, tolerate more false positives
        "DIFF_THRESHOLD": 25,
        "MIN_CONTOUR_AREA": 800,
        "REPAIR_SCORE_THRESHOLD": 50,
        "VLM_OVERRIDE_CONFIDENCE": 0.5,
    }
}

# Active preset (change this to switch configurations)
ACTIVE_PRESET = "balanced"
