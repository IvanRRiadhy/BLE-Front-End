import pytest
import numpy as np
import cv2
from app.models import DetectionConfig
from app.wall_network import (
    WallSegment,
    extract_wall_segments,
    fuse_double_line_walls,
    build_wall_network,
    render_wall_network_mask,
)
from app.detector import FloorplanDetector

def test_1_single_line_wall():
    binary = np.zeros((200, 200), dtype=np.uint8)
    cv2.line(binary, (30, 100), (170, 100), 255, 6)

    config = DetectionConfig()
    segments = extract_wall_segments(binary, config)
    assert len(segments) >= 1
    assert segments[0].orientation == "H"

def test_2_double_line_wall_fusion():
    binary = np.zeros((300, 300), dtype=np.uint8)
    # Two parallel horizontal wall lines 20px apart
    cv2.line(binary, (50, 100), (250, 100), 255, 3)
    cv2.line(binary, (50, 120), (250, 120), 255, 3)

    config = DetectionConfig(enable_double_line_fusion=True, max_parallel_wall_dist_px=35)
    raw_segments = extract_wall_segments(binary, config)
    fused_segments, paired_tuples = fuse_double_line_walls(raw_segments, config)

    assert len(paired_tuples) >= 1
    # Centerline should exist between y=100 and y=120 -> y=110
    centerlines = [s for s in fused_segments if s.is_centerline]
    assert len(centerlines) >= 1
    assert abs(centerlines[0].y1 - 110.0) <= 5.0

def test_3_double_line_wall_with_doorway():
    binary = np.zeros((300, 300), dtype=np.uint8)
    # Parallel double-line wall with a 30px doorway gap in the middle
    cv2.line(binary, (30, 100), (120, 100), 255, 4)
    cv2.line(binary, (150, 100), (270, 100), 255, 4)
    cv2.line(binary, (30, 120), (120, 120), 255, 4)
    cv2.line(binary, (150, 120), (270, 120), 255, 4)

    config = DetectionConfig(enable_double_line_fusion=True)
    raw_segments = extract_wall_segments(binary, config)
    fused_segments, paired_tuples = fuse_double_line_walls(raw_segments, config)
    assert len(fused_segments) >= 1

def test_4_two_adjacent_rooms():
    img = np.full((300, 400, 3), 255, dtype=np.uint8)
    # Outer rectangle
    cv2.rectangle(img, (30, 30), (370, 270), (0, 0, 0), 8)
    # Middle partition wall
    cv2.line(img, (200, 30), (200, 270), (0, 0, 0), 8)

    detector = FloorplanDetector()
    res = detector.detect_image(img)
    assert len(res.areas) == 2

def test_5_three_adjacent_rooms():
    img = np.full((300, 600, 3), 255, dtype=np.uint8)
    cv2.rectangle(img, (30, 30), (570, 270), (0, 0, 0), 8)
    cv2.line(img, (200, 30), (200, 270), (0, 0, 0), 8)
    cv2.line(img, (400, 30), (400, 270), (0, 0, 0), 8)

    detector = FloorplanDetector()
    res = detector.detect_image(img)
    assert len(res.areas) == 3

def test_6_l_shaped_room_preservation():
    img = np.full((500, 500, 3), 255, dtype=np.uint8)
    # Outer L-shaped boundary centered with padding
    pts = np.array([[100, 100], [400, 100], [400, 250], [250, 250], [250, 400], [100, 400]], np.int32)
    cv2.polylines(img, [pts], isClosed=True, color=(0, 0, 0), thickness=8)

    detector = FloorplanDetector()
    res = detector.detect_image(img)
    assert len(res.areas) >= 1

def test_7_corridor_preservation():
    img = np.full((600, 400, 3), 255, dtype=np.uint8)
    # Long narrow corridor (100px x 400px)
    cv2.rectangle(img, (150, 100), (250, 500), (0, 0, 0), 8)

    config = DetectionConfig(min_room_area_px=2000)
    detector = FloorplanDetector(default_config=config)
    res = detector.detect_image(img)
    assert len(res.areas) == 1

def test_8_furniture_inside_room_suppression():
    img = np.full((400, 500, 3), 255, dtype=np.uint8)
    cv2.rectangle(img, (30, 30), (470, 370), (0, 0, 0), 8)
    # Isolated furniture box (50x50) inside room - min_room_area_px suppresses interior hollow box
    cv2.rectangle(img, (150, 100), (200, 150), (0, 0, 0), 2)

    config = DetectionConfig(min_room_area_px=5000)
    detector = FloorplanDetector(default_config=config)
    res = detector.detect_image(img)
    assert len(res.areas) == 1

def test_9_furniture_touching_wall():
    img = np.full((300, 400, 3), 255, dtype=np.uint8)
    cv2.rectangle(img, (30, 30), (370, 270), (0, 0, 0), 8)
    # Cabinet touching top wall
    cv2.rectangle(img, (100, 30), (180, 70), (0, 0, 0), 2)

    detector = FloorplanDetector()
    res = detector.detect_image(img)
    assert len(res.areas) == 1

def test_10_small_office_acceptance():
    img = np.full((300, 400, 3), 255, dtype=np.uint8)
    # Outer envelope
    cv2.rectangle(img, (30, 30), (370, 270), (0, 0, 0), 8)
    # Small enclosed office room (60x60px) in top-left
    cv2.rectangle(img, (30, 30), (120, 120), (0, 0, 0), 8)

    detector = FloorplanDetector()
    res = detector.detect_image(img)
    assert len(res.areas) >= 2

def test_11_large_hall_handling():
    img = np.full((600, 800, 3), 255, dtype=np.uint8)
    cv2.rectangle(img, (50, 50), (750, 550), (0, 0, 0), 10)

    detector = FloorplanDetector()
    res = detector.detect_image(img)
    assert len(res.areas) == 1

def test_12_noisy_architectural_drawing():
    img = np.full((300, 400, 3), 255, dtype=np.uint8)
    cv2.rectangle(img, (30, 30), (370, 270), (0, 0, 0), 8)
    # Noise/hatch specks and dimension arrow text
    cv2.putText(img, "DIM 12.5m", (150, 150), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 0, 0), 1)
    for _ in range(25):
        rx, ry = np.random.randint(40, 360), np.random.randint(40, 260)
        cv2.circle(img, (rx, ry), 1, (0, 0, 0), -1)

    detector = FloorplanDetector()
    res = detector.detect_image(img)
    assert len(res.areas) == 1
