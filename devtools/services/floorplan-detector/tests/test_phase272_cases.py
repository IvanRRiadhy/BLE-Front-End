import pytest
import numpy as np
import cv2
from app.models import DetectionConfig
from app.preprocessing import detect_image_polarity, extract_color_channels
from app.wall_detection import (
    extract_multichannel_wall_evidence,
    estimate_wall_thickness,
    suppress_furniture_and_text,
)
from app.space_detection import (
    extract_candidate_features,
    score_candidate_region,
)

def test_image_polarity_detection():
    # Light background (paper blueprint)
    light_img = np.full((100, 100), 240, dtype=np.uint8)
    light_img[20:80, 20:25] = 20  # dark wall
    assert detect_image_polarity(light_img) is True

    # Dark background (CAD dark mode)
    dark_img = np.full((100, 100), 15, dtype=np.uint8)
    dark_img[20:80, 20:25] = 240  # bright wall
    assert detect_image_polarity(dark_img) is False

def test_extract_color_channels():
    # Colored BGR image (red lines)
    img = np.full((100, 100, 3), 255, dtype=np.uint8)
    img[20:80, 20:30] = (0, 0, 255)  # Pure red line

    channels = extract_color_channels(img)
    assert "hsv_s" in channels
    assert "hsv_v" in channels
    assert "lab_l" in channels
    assert "rgb_diff" in channels
    assert np.max(channels["hsv_s"][20:80, 20:30]) > 200

def test_wall_thickness_estimation():
    # Synthetic binary image with a 10px thick wall line
    binary = np.zeros((200, 200), dtype=np.uint8)
    binary[50:150, 95:105] = 255  # 10px thick wall

    config = DetectionConfig()
    thickness = estimate_wall_thickness(binary, config)
    assert 3.0 <= thickness <= 12.0

def test_multichannel_wall_evidence():
    gray = np.full((200, 200), 240, dtype=np.uint8)
    cv2.rectangle(gray, (30, 30), (170, 170), 20, 8)  # 8px dark rectangle wall
    binary = (gray < 100).astype(np.uint8) * 255

    config = DetectionConfig()
    closed_mask, thick_walls, gradient_img, edges_img, struct_lines, channels, thickness = extract_multichannel_wall_evidence(
        gray, binary, config
    )

    assert closed_mask.shape == (200, 200)
    assert "03_dark_pixel" in channels
    assert "03b_adaptive" in channels
    assert "03c_edges" in channels
    assert "03f_combined_evidence" in channels
    assert thickness >= 3.0

def test_furniture_and_text_suppression():
    binary = np.zeros((300, 300), dtype=np.uint8)
    # Long structural wall
    cv2.line(binary, (20, 50), (280, 50), 255, 10)
    # Small isolated furniture object (table)
    cv2.rectangle(binary, (100, 150), (130, 180), 255, -1)
    # Small text stroke
    cv2.putText(binary, "BED", (200, 200), cv2.FONT_HERSHEY_SIMPLEX, 0.4, 255, 1)

    struct_lines = cv2.morphologyEx(binary, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (40, 1)))

    thick_walls, furniture_mask, text_mask = suppress_furniture_and_text(binary, struct_lines)
    assert np.count_nonzero(thick_walls[45:55, 20:280]) > 0
    assert np.count_nonzero(furniture_mask[150:180, 100:130]) > 0

def test_relative_room_area_and_candidate_scoring():
    config = DetectionConfig(min_room_area_px=1000, min_room_area_ratio=0.0003)
    total_area = 1000 * 1000  # 1MP image

    # Small office cavity (500px) with strong wall support (0.60)
    features_small = extract_candidate_features(
        label=1,
        region_mask=np.ones((100, 100), dtype=bool),
        stat=np.array([10, 10, 20, 25, 500]),
        wall_contact_zone=np.ones((100, 100), dtype=np.uint8) * 255,
        footprint_mask=np.ones((100, 100), dtype=np.uint8) * 255,
        gradient_img=None,
        total_area=total_area,
        image_shape=(100, 100),
    )
    features_small.wall_support_ratio = 0.75
    score, accepted, reason = score_candidate_region(features_small, config, total_area)
    assert accepted is True

    # High furniture likelihood candidate (2000px) should be rejected
    features_furn = extract_candidate_features(
        label=2,
        region_mask=np.ones((100, 100), dtype=bool),
        stat=np.array([10, 10, 40, 50, 2000]),
        wall_contact_zone=np.ones((100, 100), dtype=np.uint8) * 255,
        footprint_mask=np.ones((100, 100), dtype=np.uint8) * 255,
        gradient_img=None,
        total_area=total_area,
        image_shape=(100, 100),
    )
    features_furn.furniture_likelihood = 0.85
    score_f, accepted_f, reason_f = score_candidate_region(features_furn, config, total_area)
    assert accepted_f is False
    assert reason_f == "furniture_artifact"
