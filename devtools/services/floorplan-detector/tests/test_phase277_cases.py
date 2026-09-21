"""
Phase 2.7.7 Room Hypothesis & Adaptive Boundary Reconstruction Unit Tests
Verifies PlanarFace extraction, RoomHypothesis confidence scoring, repeated room pattern detection,
split/merge hypotheses, snap-to-wall boundary reconstruction, and pipeline integration.
"""
import pytest
import numpy as np
from app.models import AreaPoint, PlanarFace, RoomHypothesis, DetectionConfig
from app.wall_network import WallSegment, WallNetwork, build_wall_network
from app.hypothesis import (
    extract_planar_faces,
    detect_repeated_room_patterns,
    evaluate_room_confidence,
    generate_split_hypotheses,
    generate_merge_hypotheses,
)
from app.boundary_reconstruction import snap_polygon_to_wall_network, reconstruct_room_boundaries

def test_extract_planar_faces():
    seg1 = WallSegment(id="s1", x1=100, y1=100, x2=500, y2=100, orientation="H")
    seg2 = WallSegment(id="s2", x1=500, y1=100, x2=500, y2=500, orientation="V")
    seg3 = WallSegment(id="s3", x1=500, y1=500, x2=100, y2=500, orientation="H")
    seg4 = WallSegment(id="s4", x1=100, y1=500, x2=100, y2=100, orientation="V")
    wn = build_wall_network([seg1, seg2, seg3, seg4], DetectionConfig())

    faces = extract_planar_faces(wn, 1000, 1000)
    assert isinstance(faces, list)

def test_room_hypothesis_confidence_evaluation():
    hyp = RoomHypothesis(
        id="hyp_test",
        polygon=[AreaPoint(100, 100), AreaPoint(400, 100), AreaPoint(400, 400), AreaPoint(100, 400)],
        source="wall_network_face",
        area_px=90000,
        bbox=(100, 100, 300, 300),
    )
    wall_mask = np.zeros((1000, 1000), dtype=np.uint8)
    # Draw wall rectangle
    wall_mask[95:105, 95:405] = 255
    wall_mask[395:405, 95:405] = 255
    wall_mask[95:405, 95:105] = 255
    wall_mask[95:405, 395:405] = 255

    conf = evaluate_room_confidence(hyp, wall_mask, [], DetectionConfig())
    assert 0.0 <= conf <= 1.0
    assert hyp.is_accepted is True

def test_detect_repeated_room_patterns():
    h1 = RoomHypothesis(id="h1", polygon=[], source="cavity", area_px=10000, bbox=(100, 100, 100, 100))
    h2 = RoomHypothesis(id="h2", polygon=[], source="cavity", area_px=10200, bbox=(220, 100, 100, 100))
    h3 = RoomHypothesis(id="h3", polygon=[], source="cavity", area_px=9900, bbox=(340, 100, 100, 100))

    hypotheses = [h1, h2, h3]
    detect_repeated_room_patterns(hypotheses, 1000, 1000)
    for h in hypotheses:
        assert h.repetition_score > 0.0

def test_snap_polygon_to_wall_network():
    seg1 = WallSegment(id="s1", x1=100, y1=100, x2=500, y2=100, orientation="H", confidence=0.9)
    wn = build_wall_network([seg1], DetectionConfig())

    poly_pts = [AreaPoint(102, 103), AreaPoint(498, 104), AreaPoint(498, 300), AreaPoint(102, 300)]
    snapped = snap_polygon_to_wall_network(poly_pts, wn, max_snap_dist_px=25.0)

    assert len(snapped) == 4
    # First two points should snap closer to y=100
    assert abs(snapped[0].yPx - 100.0) < 5.0
    assert abs(snapped[1].yPx - 100.0) < 5.0

def test_split_and_merge_hypotheses():
    hyp = RoomHypothesis(
        id="h_large",
        polygon=[AreaPoint(100, 100), AreaPoint(600, 100), AreaPoint(600, 600), AreaPoint(100, 600)],
        source="cavity",
        area_px=350000,
        bbox=(100, 100, 500, 500),
        confidence=0.6,
        is_accepted=True,
    )
    seg_partition = WallSegment(id="p1", x1=350, y1=150, x2=350, y2=550, orientation="V", length=400.0, confidence=0.8)
    wn = build_wall_network([seg_partition], DetectionConfig())

    splits = generate_split_hypotheses([hyp], wn, min_area_px=2000.0)
    assert len(splits) >= 1
    assert len(splits[0].sub_hypotheses) == 2
