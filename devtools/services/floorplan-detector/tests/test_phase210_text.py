"""
Tests for Phase 2.10.0 Text & Annotation Suppression Subsystem
Validates deterministic text detection, multi-scale mapping,
wall protection invariants, image immutability, and edge cases.
"""
from pathlib import Path
import numpy as np
import cv2
import pytest

from text_analysis.models import (
    Phase210TextExperimentConfig,
    TextRegion,
)
from text_analysis.detector import TextDetector
from text_analysis.wall_protection import (
    compute_wall_protection_mask,
    compute_safe_text_mask,
    compute_wall_preservation_metrics,
)
from text_analysis.mask import (
    generate_binary_text_mask,
    generate_soft_attenuation_mask,
)
from text_analysis.likelihood import (
    compute_candidate_text_evidence,
    evaluate_room_fragmentation,
)


@pytest.fixture
def synthetic_text_floorplan():
    """
    Creates a synthetic floorplan with room walls and clear text labels.
    """
    img = np.full((600, 800, 3), 255, dtype=np.uint8)
    # Draw outer walls (thick black lines)
    cv2.rectangle(img, (50, 50), (750, 550), (0, 0, 0), 6)
    # Dividing wall between Room 1 and Room 2
    cv2.line(img, (400, 50), (400, 550), (0, 0, 0), 6)
    # Add Text "BEDROOM" in Room 1
    cv2.putText(img, "BEDROOM", (150, 250), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 0), 2)
    # Add Text "MEETING ROOM" in Room 2
    cv2.putText(img, "MEETING ROOM", (460, 250), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 0), 2)
    return img


def test_text_detector_determinism(synthetic_text_floorplan):
    detector = TextDetector()
    res1 = detector.detect(synthetic_text_floorplan)
    res2 = detector.detect(synthetic_text_floorplan)

    assert len(res1.regions) == len(res2.regions)
    assert np.array_equal(res1.text_mask, res2.text_mask)
    for r1, r2 in zip(res1.regions, res2.regions):
        assert r1.bbox == r2.bbox
        assert r1.confidence == r2.confidence


def test_original_image_immutability(synthetic_text_floorplan):
    original_copy = synthetic_text_floorplan.copy()
    detector = TextDetector()
    _ = detector.detect(synthetic_text_floorplan)

    # Invariant: input image must remain bit-exact identical
    assert np.array_equal(synthetic_text_floorplan, original_copy), "Detector modified original image in-place!"


def test_coordinate_bounds_and_no_nan(synthetic_text_floorplan):
    detector = TextDetector()
    res = detector.detect(synthetic_text_floorplan)

    h, w = synthetic_text_floorplan.shape[:2]
    for reg in res.regions:
        bx, by, bw, bh = reg.bbox
        assert 0 <= bx < w
        assert 0 <= by < h
        assert 0 < bw <= w
        assert 0 < bh <= h
        assert not np.isnan(reg.confidence)
        assert not np.isinf(reg.confidence)
        for pt in reg.polygon:
            assert 0 <= pt[0] <= w
            assert 0 <= pt[1] <= h
            assert not np.isnan(pt[0]) and not np.isnan(pt[1])


def test_multiscale_coordinate_mapping():
    # Test ultra-large image that forces downscaling
    large_img = np.full((3000, 3000, 3), 255, dtype=np.uint8)
    cv2.rectangle(large_img, (100, 100), (2900, 2900), (0, 0, 0), 10)
    cv2.putText(large_img, "LARGE SUITE", (1000, 1500), cv2.FONT_HERSHEY_SIMPLEX, 2.5, (0, 0, 0), 4)

    cfg = Phase210TextExperimentConfig(max_analysis_dimension=1500)
    detector = TextDetector(cfg)
    res = detector.detect(large_img)

    assert res.scale_factor < 1.0  # Downscaled
    assert res.text_mask.shape == (3000, 3000)  # Output mask scaled back to original
    assert len(res.regions) >= 1
    # Check bounds on original size
    for reg in res.regions:
        bx, by, bw, bh = reg.bbox
        assert 0 <= bx < 3000 and 0 <= by < 3000


def test_wall_protection_invariant():
    # Simulate wall mask (vertical wall)
    h, w = 400, 400
    wall_mask = np.zeros((h, w), dtype=np.uint8)
    cv2.line(wall_mask, (200, 50), (200, 350), 255, 6)

    # Simulate text mask that partially overlaps the wall (e.g. text label touching wall)
    text_mask = np.zeros((h, w), dtype=np.uint8)
    cv2.rectangle(text_mask, (180, 180), (280, 220), 255, -1)

    # Compute wall protection mask
    wall_prot = compute_wall_protection_mask(wall_mask, safety_buffer_px=3)
    safe_text = compute_safe_text_mask(text_mask, wall_prot)

    # INVARIANT: safe_text must NOT contain any pixels of the wall
    overlap_with_wall = cv2.bitwise_and(safe_text, wall_mask)
    assert np.count_nonzero(overlap_with_wall) == 0, "safeTextMask leaked onto architectural wall!"

    # Preservation metrics
    metrics = compute_wall_preservation_metrics(wall_mask, safe_text)
    assert metrics.wall_pixel_loss == 0
    assert metrics.wall_pixel_loss_ratio == 0.0
    assert metrics.is_safe is True


def test_soft_attenuation_mask():
    h, w = 200, 200
    safe_mask = np.zeros((h, w), dtype=np.uint8)
    safe_mask[50:150, 50:150] = 255

    like_map = np.zeros((h, w), dtype=np.float32)
    like_map[50:150, 50:150] = 0.9

    atten = generate_soft_attenuation_mask(safe_mask, like_map, attenuation_factor=0.4)

    assert atten.shape == (h, w)
    assert np.all(atten >= 0.4)
    assert np.all(atten <= 1.0)
    # Outside text zone, attenuation must be exactly 1.0
    assert np.all(atten[:40, :] == 1.0)
    # Inside text zone, attenuation should be < 1.0
    assert np.all(atten[60:140, 60:140] < 1.0)


def test_candidate_text_evidence():
    h, w = 500, 500
    text_mask = np.zeros((h, w), dtype=np.uint8)
    text_mask[100:150, 100:200] = 255

    safe_mask = text_mask.copy()
    wall_prot = np.zeros((h, w), dtype=np.uint8)
    like_map = np.zeros((h, w), dtype=np.float32)
    like_map[100:150, 100:200] = 0.85

    region = TextRegion(
        id="t1", bbox=(100, 100, 100, 50),
        polygon=[(100, 100), (200, 100), (200, 150), (100, 150)],
        area=5000, width=100, height=50, aspect_ratio=2.0
    )

    # Candidate room enclosing the text
    cand_poly = [(50, 50), (300, 50), (300, 300), (50, 300)]
    ev = compute_candidate_text_evidence(
        candidate_id="c_1",
        polygon_pts=cand_poly,
        text_mask=text_mask,
        safe_text_mask=safe_mask,
        wall_protection_mask=wall_prot,
        text_likelihood_map=like_map,
        text_regions=[region],
        text_penalty_coeff=0.10,
    )

    assert ev.text_region_count == 1
    assert ev.text_coverage > 0.0
    assert ev.safe_text_coverage > 0.0
    assert ev.applied_penalty > 0.0


def test_room_fragmentation_evaluation():
    h, w = 400, 400
    # GT Room 1: (50, 50) to (350, 350)
    gt_rooms = [{"id": "gt_01", "polygon": [(50, 50), (350, 50), (350, 350), (50, 350)]}]

    # Fragmented into two candidates: Part A and Part B split horizontally along y=200
    candidates = [
        {"id": "cand_a", "polygon": [(50, 50), (350, 50), (350, 195), (50, 195)]},
        {"id": "cand_b", "polygon": [(50, 205), (350, 205), (350, 350), (50, 350)]},
    ]

    # Simulated text located right in the gap between Part A and Part B
    text_mask = np.zeros((h, w), dtype=np.uint8)
    text_mask[190:210, 100:300] = 255
    text_reg = TextRegion(
        id="txt_split", bbox=(100, 190, 200, 20),
        polygon=[(100, 190), (300, 190), (300, 210), (100, 210)],
        area=4000, width=200, height=20, aspect_ratio=10.0
    )

    records, summary = evaluate_room_fragmentation(
        gt_areas=gt_rooms,
        predicted_candidates=candidates,
        text_mask=text_mask,
        text_regions=[text_reg],
    )

    assert len(records) == 1
    assert records[0].is_fragmented is True
    assert records[0].fragment_count == 2
    assert records[0].causality in ["text_likely_cause", "text_possible_cause"]
    assert summary["fragmented_gt_rooms"] == 1


def test_blank_and_empty_images():
    detector = TextDetector()
    blank_white = np.full((300, 300, 3), 255, dtype=np.uint8)
    res_w = detector.detect(blank_white)
    assert len(res_w.regions) == 0
    assert np.count_nonzero(res_w.text_mask) == 0

    blank_black = np.zeros((300, 300, 3), dtype=np.uint8)
    res_b = detector.detect(blank_black)
    assert len(res_b.regions) == 0
    assert np.count_nonzero(res_b.text_mask) == 0


def test_color_modes_and_unusual_aspects():
    detector = TextDetector()

    # Grayscale
    gray = np.full((200, 200), 255, dtype=np.uint8)
    cv2.putText(gray, "OFFICE", (30, 100), cv2.FONT_HERSHEY_SIMPLEX, 0.7, 0, 2)
    res_g = detector.detect(gray)
    assert res_g.image_width == 200

    # RGBA
    rgba = np.full((200, 200, 4), 255, dtype=np.uint8)
    cv2.putText(rgba, "BATH", (30, 100), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0, 255), 2)
    res_rgba = detector.detect(rgba)
    assert res_rgba.image_width == 200

    # Narrow aspect ratio
    narrow = np.full((20, 500, 3), 255, dtype=np.uint8)
    res_narrow = detector.detect(narrow)
    assert res_narrow.image_width == 500
