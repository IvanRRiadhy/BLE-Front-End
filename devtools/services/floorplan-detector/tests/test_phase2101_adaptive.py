"""
Unit Tests for Phase 2.10.1 Adaptive Text/Wall Separation Subsystem
Validates distance analysis, spatial relations, continuous suppression strengths,
wall preservation invariants, thickness adaptability, and image immutability.
"""
import numpy as np
import cv2
import pytest

from text_analysis.models import TextRegion
from text_analysis.distance_analysis import (
    compute_wall_distance_map,
    extract_local_wall_thickness,
    analyze_text_region_spatial_metrics,
)
from text_analysis.separation import (
    classify_text_wall_relation,
    process_all_text_regions_separation,
    RELATION_INTERIOR,
    RELATION_NEAR_WALL,
    RELATION_WALL_OVERLAP,
    RELATION_AMBIGUOUS,
)
from text_analysis.adaptive_protection import (
    build_adaptive_suppression_map,
    apply_adaptive_suppression_to_walls,
)


@pytest.fixture
def base_test_canvas():
    """Returns a 500x500 canvas with a vertical structural wall of width 10px."""
    h, w = 500, 500
    wall_mask = np.zeros((h, w), dtype=np.uint8)
    # Wall from x=245 to 255 (thickness = 10px), y from 50 to 450
    cv2.line(wall_mask, (250, 50), (250, 450), 255, 10)
    dist_map = compute_wall_distance_map(wall_mask)
    return wall_mask, dist_map


def test_interior_text_relation(base_test_canvas):
    wall_mask, dist_map = base_test_canvas
    # Text region placed at (100, 200) to (180, 230) -> distance to wall at x=245 is ~65px >> 5px
    region = TextRegion(
        id="t_interior",
        bbox=(100, 200, 80, 30),
        polygon=[(100, 200), (180, 200), (180, 230), (100, 230)],
        area=2400.0,
        width=80.0,
        height=30.0,
        aspect_ratio=80.0 / 30.0,
        confidence=0.85,
        text_likelihood=0.90,
    )

    analyze_text_region_spatial_metrics(region, wall_mask, dist_map, local_wall_thickness=10.0)
    rel, strength = classify_text_wall_relation(region, local_wall_thickness=10.0)

    assert rel == RELATION_INTERIOR
    assert region.distance_to_wall > 50.0
    assert region.wall_overlap_ratio == 0.0
    assert strength >= 0.85
    assert strength <= 1.0


def test_near_wall_text_relation(base_test_canvas):
    wall_mask, dist_map = base_test_canvas
    # Wall boundary is at x=245. Place text from x=241 to x=244 (distance = 1 to 3px < 5px safe margin)
    region = TextRegion(
        id="t_near",
        bbox=(210, 200, 33, 25),
        polygon=[(210, 200), (243, 200), (243, 225), (210, 225)],
        area=825.0,
        width=33.0,
        height=25.0,
        aspect_ratio=33.0 / 25.0,
        confidence=0.80,
        text_likelihood=0.85,
    )

    analyze_text_region_spatial_metrics(region, wall_mask, dist_map, local_wall_thickness=10.0)
    rel, strength = classify_text_wall_relation(region, local_wall_thickness=10.0)

    assert rel == RELATION_NEAR_WALL
    assert 0.0 < region.distance_to_wall < 5.0
    assert region.wall_overlap_ratio == 0.0
    assert 0.25 <= strength <= 0.80


def test_text_overlapping_wall(base_test_canvas):
    wall_mask, dist_map = base_test_canvas
    # Place text region overlapping wall at x=235 to x=270
    region = TextRegion(
        id="t_overlap",
        bbox=(235, 200, 35, 25),
        polygon=[(235, 200), (270, 200), (270, 225), (235, 225)],
        area=875.0,
        width=35.0,
        height=25.0,
        aspect_ratio=35.0 / 25.0,
        confidence=0.80,
        text_likelihood=0.85,
    )

    analyze_text_region_spatial_metrics(region, wall_mask, dist_map, local_wall_thickness=10.0)
    rel, strength = classify_text_wall_relation(region, local_wall_thickness=10.0)

    assert rel == RELATION_WALL_OVERLAP
    assert region.distance_to_wall == 0.0
    assert region.wall_overlap_ratio > 0.10
    assert strength <= 0.35

    # Build suppression map: wall pixels must be strictly 0.0
    supp_map = build_adaptive_suppression_map([region], wall_mask, dist_map, strategy="G_adaptive_combined")
    assert np.all(supp_map[wall_mask > 0] == 0.0), "Wall pixels were suppressed!"


def test_text_crossing_wall(base_test_canvas):
    wall_mask, dist_map = base_test_canvas
    # Wide text region spanning from x=200 to x=300 (crossing the wall at x=245..255)
    region = TextRegion(
        id="t_crossing",
        bbox=(200, 200, 100, 25),
        polygon=[(200, 200), (300, 200), (300, 225), (200, 225)],
        area=2500.0,
        width=100.0,
        height=25.0,
        aspect_ratio=4.0,
        confidence=0.75,
        text_likelihood=0.80,
    )

    analyze_text_region_spatial_metrics(region, wall_mask, dist_map, local_wall_thickness=10.0)
    rel, strength = classify_text_wall_relation(region, local_wall_thickness=10.0)

    assert rel == RELATION_WALL_OVERLAP
    assert region.text_crossing_wall_ratio > 0.05
    assert strength <= 0.35


def test_no_wall_case():
    h, w = 300, 300
    empty_wall = np.zeros((h, w), dtype=np.uint8)
    dist_map = compute_wall_distance_map(empty_wall)

    region = TextRegion(
        id="t_nowall",
        bbox=(50, 50, 60, 20),
        polygon=[(50, 50), (110, 50), (110, 70), (50, 70)],
        area=1200.0,
        width=60.0,
        height=20.0,
        aspect_ratio=3.0,
    )

    analyze_text_region_spatial_metrics(region, empty_wall, dist_map, local_wall_thickness=10.0)
    rel, strength = classify_text_wall_relation(region, local_wall_thickness=10.0)

    assert rel == RELATION_INTERIOR
    assert strength >= 0.85


def test_very_thick_wall():
    h, w = 400, 400
    thick_wall = np.zeros((h, w), dtype=np.uint8)
    # 30px thick shear wall from x=185 to 215
    cv2.line(thick_wall, (200, 50), (200, 350), 255, 30)
    dist_map = compute_wall_distance_map(thick_wall)

    # Text placed at x=175 (10px from wall edge at x=185)
    region = TextRegion(
        id="t_thick",
        bbox=(140, 150, 35, 20),
        polygon=[(140, 150), (175, 150), (175, 170), (140, 170)],
        area=700.0,
        width=35.0,
        height=20.0,
        aspect_ratio=1.75,
    )

    # With thick wall (30px), safe margin is 15px. 10px < 15px -> NEAR_WALL
    analyze_text_region_spatial_metrics(region, thick_wall, dist_map, local_wall_thickness=30.0)
    rel, strength = classify_text_wall_relation(region, local_wall_thickness=30.0)

    assert rel == RELATION_NEAR_WALL


def test_very_thin_wall():
    h, w = 400, 400
    thin_wall = np.zeros((h, w), dtype=np.uint8)
    # 2px thin partition wall at x=200
    cv2.line(thin_wall, (200, 50), (200, 350), 255, 2)
    dist_map = compute_wall_distance_map(thin_wall)

    # Text placed at x=185 (14px from wall edge at x=199)
    region = TextRegion(
        id="t_thin",
        bbox=(150, 150, 35, 20),
        polygon=[(150, 150), (185, 150), (185, 170), (150, 170)],
        area=700.0,
        width=35.0,
        height=20.0,
        aspect_ratio=1.75,
    )

    analyze_text_region_spatial_metrics(region, thin_wall, dist_map, local_wall_thickness=2.0)
    rel, strength = classify_text_wall_relation(region, local_wall_thickness=2.0)

    # For 2px wall, 14px is safely in INTERIOR
    assert rel == RELATION_INTERIOR


def test_multiple_text_regions_and_determinism(base_test_canvas):
    wall_mask, dist_map = base_test_canvas
    r1 = TextRegion(
        id="r1", bbox=(50, 100, 60, 20),
        polygon=[(50, 100), (110, 100), (110, 120), (50, 120)],
        area=1200.0, width=60.0, height=20.0, aspect_ratio=3.0,
    )
    r2 = TextRegion(
        id="r2", bbox=(235, 100, 30, 20),
        polygon=[(235, 100), (265, 100), (265, 120), (235, 120)],
        area=600.0, width=30.0, height=20.0, aspect_ratio=1.5,
    )

    regs1 = process_all_text_regions_separation([r1, r2], wall_mask, dist_map, fallback_thickness=10.0)
    map1 = build_adaptive_suppression_map(regs1, wall_mask, dist_map, strategy="G_adaptive_combined")

    regs2 = process_all_text_regions_separation([r1, r2], wall_mask, dist_map, fallback_thickness=10.0)
    map2 = build_adaptive_suppression_map(regs2, wall_mask, dist_map, strategy="G_adaptive_combined")

    # Invariant: Output must be 100% bit-exact deterministic
    assert np.array_equal(map1, map2)
    assert regs1[0].relation == RELATION_INTERIOR
    assert regs1[1].relation == RELATION_WALL_OVERLAP


def test_original_image_immutability(base_test_canvas):
    wall_mask, dist_map = base_test_canvas
    wall_mask_copy = wall_mask.copy()
    dist_map_copy = dist_map.copy()

    r = TextRegion(
        id="r_immut", bbox=(50, 100, 60, 20),
        polygon=[(50, 100), (110, 100), (110, 120), (50, 120)],
        area=1200.0, width=60.0, height=20.0, aspect_ratio=3.0,
    )

    _ = process_all_text_regions_separation([r], wall_mask, dist_map, fallback_thickness=10.0)
    _ = build_adaptive_suppression_map([r], wall_mask, dist_map, strategy="G_adaptive_combined")

    # Invariant: Original arrays must never be modified in-place
    assert np.array_equal(wall_mask, wall_mask_copy)
    assert np.array_equal(dist_map, dist_map_copy)


def test_ambiguous_text_handling(base_test_canvas):
    wall_mask, dist_map = base_test_canvas
    # Region with low confidence (< 0.38)
    region = TextRegion(
        id="t_ambig",
        bbox=(50, 100, 60, 20),
        polygon=[(50, 100), (110, 100), (110, 120), (50, 120)],
        area=1200.0,
        width=60.0,
        height=20.0,
        aspect_ratio=3.0,
        confidence=0.25,  # Low confidence
    )

    analyze_text_region_spatial_metrics(region, wall_mask, dist_map, local_wall_thickness=10.0)
    rel, strength = classify_text_wall_relation(region, local_wall_thickness=10.0)

    # Invariant: Low confidence text is classified as AMBIGUOUS_TEXT and suppressed conservatively (<= 0.15)
    assert rel == RELATION_AMBIGUOUS
    assert strength <= 0.15

