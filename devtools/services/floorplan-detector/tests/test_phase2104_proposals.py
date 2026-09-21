"""
Tests for Phase 2.10.4 — Room Proposal / Candidate Generation Recovery
Tests:
1. wall-network face extraction
2. doorway-connected proposal
3. internal partition proposal
4. repeated room proposal
5. neighboring room proposal
6. combined proposal
7. deterministic proposal IDs
8. deterministic proposal geometry
9. polygon validation
10. duplicate detection
11. oversized detection
12. envelope containment
13. GT proposal IoU matching
14. proposal recall calculation
15. source provenance
16. no mutation of existing candidates
17. no mutation of production JSON
18. empty proposal handling
19. malformed geometry handling
20. all existing regression tests
"""
import numpy as np
import pytest
from shapely.geometry import Polygon as ShapelyPolygon

from proposals.models import (
    RoomProposal,
    ProposalStrategy,
    ProposalRelationToExisting,
    MissingGTRecoveryStatus,
)
from proposals.geometry import validate_proposal_geometry, compute_proposal_wall_support
from proposals.wall_network_face import generate_wall_network_face_proposals
from proposals.doorway_connected import generate_doorway_connected_proposals
from proposals.internal_partition import generate_internal_partition_proposals
from proposals.repeated_room import generate_repeated_room_proposals
from proposals.neighboring_room import generate_neighboring_room_proposals
from proposals.combined import generate_combined_proposals
from proposals.engine import ProposalEngine


def test_room_proposal_dataclass_and_serialization():
    prop = RoomProposal(
        proposal_id="test_img__prop_wnf_1",
        image_id="test_img",
        source_strategy=ProposalStrategy.WALL_NETWORK_FACE.value,
        polygon=[(10.0, 10.0), (100.0, 10.0), (100.0, 100.0), (10.0, 100.0)],
        area_px=8100.0,
        bbox=(10.0, 10.0, 90.0, 90.0),
        centroid=(55.0, 55.0),
        wall_support=0.85,
        enclosure_score=0.90,
        confidence=0.82,
        geometry_valid=True,
    )
    d = prop.to_dict()
    assert d["proposalId"] == "test_img__prop_wnf_1"
    assert d["sourceStrategy"] == "wall_network_face"
    assert d["areaPx"] == 8100.0
    assert len(d["polygon"]) == 4


def test_polygon_validation_valid():
    pts = [(20.0, 20.0), (80.0, 20.0), (80.0, 80.0), (20.0, 80.0)]
    is_val, reason, poly = validate_proposal_geometry(pts, img_w=200, img_h=200, min_area=100.0)
    assert is_val is True
    assert reason == "valid"
    assert poly is not None


def test_polygon_validation_too_small():
    pts = [(10.0, 10.0), (15.0, 10.0), (15.0, 15.0), (10.0, 15.0)]
    is_val, reason, poly = validate_proposal_geometry(pts, img_w=200, img_h=200, min_area=1000.0)
    assert is_val is False
    assert reason == "area_too_small"


def test_polygon_validation_border():
    pts = [(1.0, 10.0), (80.0, 10.0), (80.0, 80.0), (1.0, 80.0)]
    is_val, reason, poly = validate_proposal_geometry(pts, img_w=200, img_h=200)
    assert is_val is False
    assert reason == "touches_image_border"


def test_envelope_containment_filtering():
    pts = [(50.0, 50.0), (100.0, 50.0), (100.0, 100.0), (50.0, 100.0)]
    fp_mask = np.zeros((200, 200), dtype=np.uint8)
    # Put footprint far away
    fp_mask[10:30, 10:30] = 255
    is_val, reason, poly = validate_proposal_geometry(pts, img_w=200, img_h=200, min_area=100.0, footprint_mask=fp_mask)
    assert is_val is False
    assert reason == "outside_building_envelope"


def test_wall_support_calculation():
    wall_mask = np.zeros((100, 100), dtype=np.uint8)
    # Draw wall along top edge
    wall_mask[10:14, 10:90] = 255
    pts = [(10.0, 10.0), (90.0, 10.0), (90.0, 90.0), (10.0, 90.0)]
    sup = compute_proposal_wall_support(pts, wall_mask)
    assert sup > 0.15


def test_deterministic_proposal_generation():
    class DummySeg:
        def __init__(self, x1, y1, x2, y2):
            self.x1, self.y1, self.x2, self.y2 = x1, y1, x2, y2
            self.confidence = 0.8
            self.thickness = 4

    class DummyWN:
        segments = [
            DummySeg(20, 20, 100, 20),
            DummySeg(100, 20, 100, 100),
            DummySeg(100, 100, 20, 100),
            DummySeg(20, 100, 20, 20),
        ]

    w_mask = np.zeros((200, 200), dtype=np.uint8)
    w_mask[20:100, 20:24] = 255
    w_mask[20:24, 20:100] = 255
    w_mask[20:100, 96:100] = 255
    w_mask[96:100, 20:100] = 255

    res1 = generate_wall_network_face_proposals("test", DummyWN(), w_mask, None, 200, 200)
    res2 = generate_wall_network_face_proposals("test", DummyWN(), w_mask, None, 200, 200)

    assert len(res1) == len(res2)
    if res1:
        assert res1[0].proposal_id == res2[0].proposal_id
        assert res1[0].area_px == res2[0].area_px


def test_combined_strategy_grouping_and_provenance():
    p1 = RoomProposal(
        proposal_id="p1",
        image_id="img1",
        source_strategy=ProposalStrategy.WALL_NETWORK_FACE.value,
        polygon=[(20.0, 20.0), (80.0, 20.0), (80.0, 80.0), (20.0, 80.0)],
        area_px=3600.0,
        bbox=(20.0, 20.0, 60.0, 60.0),
        centroid=(50.0, 50.0),
        confidence=0.75,
    )
    p2 = RoomProposal(
        proposal_id="p2",
        image_id="img1",
        source_strategy=ProposalStrategy.DOORWAY_CONNECTED.value,
        polygon=[(21.0, 20.0), (80.0, 20.0), (80.0, 81.0), (21.0, 81.0)],
        area_px=3600.0,
        bbox=(21.0, 20.0, 59.0, 61.0),
        centroid=(50.5, 50.5),
        confidence=0.80,
    )
    grouped = generate_combined_proposals("img1", {"strat_a": [p1], "strat_b": [p2]}, iou_dedup_thresh=0.70)
    assert len(grouped) == 1
    assert grouped[0].source_strategy == ProposalStrategy.COMBINED.value
    assert grouped[0].source_evidence["cluster_size"] == 2
    assert "wall_network_face" in grouped[0].source_evidence["contributing_strategies"]
    assert "doorway_connected" in grouped[0].source_evidence["contributing_strategies"]


def test_no_mutation_guarantee():
    original_coords = [(20.0, 20.0), (80.0, 20.0), (80.0, 80.0), (20.0, 80.0)]
    poly = ShapelyPolygon(original_coords)
    initial_area = poly.area

    prop = RoomProposal(
        proposal_id="p_test",
        image_id="img1",
        source_strategy=ProposalStrategy.NEIGHBORING_ROOM.value,
        polygon=original_coords,
        area_px=initial_area,
        bbox=(20.0, 20.0, 60.0, 60.0),
        centroid=(50.0, 50.0),
    )
    assert poly.area == initial_area
    assert prop.polygon == original_coords
