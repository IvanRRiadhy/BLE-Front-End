import pytest
import numpy as np
import cv2
from app.models import DetectionConfig
from app.wall_network import extract_wall_segments, render_wall_network_mask, WallSegment
from app.wall_detection import extract_multichannel_wall_evidence

def test_1_segment_confidence_and_adaptive_min_length():
    # 500x500 image -> adaptive_min_len = 500 * 0.035 = 17px
    binary = np.zeros((500, 500), dtype=np.uint8)
    # Draw one long line (200px) and one tiny micro line (10px)
    cv2.line(binary, (50, 100), (250, 100), 255, 4)
    cv2.line(binary, (300, 300), (310, 300), 255, 4)

    config = DetectionConfig()
    segments = extract_wall_segments(binary, config)
    # Tiny micro line (10px) should be suppressed
    for seg in segments:
        assert seg.length >= 17.0

def test_2_render_thickness_clamping():
    config = DetectionConfig()
    # High thickness centerline (40px)
    seg = WallSegment(
        id="centerline_001",
        x1=50.0,
        y1=100.0,
        x2=250.0,
        y2=100.0,
        orientation="H",
        thickness=40.0,
        is_centerline=True,
    )
    mask = render_wall_network_mask([seg], (300, 300), config)
    # Non-zero pixels should be bounded (thickness max 14px -> line area ~ 200 * 14 = 2800px)
    nonzero = np.count_nonzero(mask)
    assert nonzero <= 3500

def test_3_nondestructive_coverage_fallback():
    gray = np.full((400, 400), 255, dtype=np.uint8)
    binary = np.zeros((400, 400), dtype=np.uint8)
    # Add simple outer wall
    cv2.rectangle(binary, (30, 30), (370, 370), 255, 6)

    config = DetectionConfig()
    closed_mask, thick_walls, _, _, _, channels, _ = extract_multichannel_wall_evidence(
        gray, binary, config
    )
    # Closed mask should not cover more than 40% of the entire image
    coverage = np.count_nonzero(closed_mask) / (400.0 * 400.0)
    assert coverage <= 0.40
