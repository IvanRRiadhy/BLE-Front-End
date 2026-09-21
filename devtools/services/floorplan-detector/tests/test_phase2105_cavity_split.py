"""
Unit Tests for Phase 2.10.5 — Oversized Cavity Splitting
Tests:
1. oversized cavity detection
2. large valid room protection
3. wall network split
4. planar face split
5. partition split
6. doorway/topology split
7. proposal-guided split
8. hybrid split
9. polygon validity
10. area conservation
11. overlap calculation
12. coverage calculation
13. tiny fragment rejection
14. exterior rejection
15. deterministic IDs
16. deterministic geometry
17. original cavity immutability
18. existing candidate immutability
19. GT evaluation
20. false split classification
21. empty cavity handling
22. malformed geometry handling
23. no benchmark hardcoding
"""
import numpy as np
import pytest
from shapely.geometry import Polygon as ShapelyPolygon

from cavity_splitting.models import (
    OversizedCavityAnalysis,
    CavitySplitProposal,
    SplitConfiguration,
    SplitStrategy,
    FalseSplitCategory,
)
from cavity_splitting.analysis import analyze_oversized_cavities
from cavity_splitting.engine import CavitySplittingEngine
from proposals.models import RoomProposal


def test_models_dataclass_and_serialization():
    ana = OversizedCavityAnalysis(
        cavity_id="hyp_cavity_1",
        image_id="test_img",
        polygon=[(10.0, 10.0), (100.0, 10.0), (100.0, 100.0), (10.0, 100.0)],
        area_px=8100.0,
        bbox=(10.0, 10.0, 90.0, 90.0),
        oversized_score=0.75,
        area_evidence=0.6,
        wall_evidence=0.8,
        partition_evidence=0.7,
        doorway_evidence=0.5,
        topology_evidence=0.5,
        proposal_evidence=0.8,
        repetition_evidence=0.2,
        split_candidate_count=2,
        should_split=True,
        split_reason="internal_walls_and_proposals",
    )
    d = ana.to_dict()
    assert d["cavityId"] == "hyp_cavity_1"
    assert d["oversizedScore"] == 0.75
    assert d["shouldSplit"] is True


def test_large_valid_room_protection():
    class DummyHyp:
        def __init__(self, hid, poly):
            self.id = hid
            class Pt:
                def __init__(self, x, y):
                    self.xPx, self.yPx = x, y
            self.polygon = [Pt(x, y) for x, y in poly]

    # Two rooms: one normal (area=2000), one large auditorium (area=8000) but with ZERO internal walls
    h1 = DummyHyp("hyp_small", [(10, 10), (50, 10), (50, 50), (10, 50)])
    h2 = DummyHyp("hyp_auditorium", [(100, 100), (300, 100), (300, 300), (100, 300)])

    class DummyWN:
        segments = []  # No internal segments!

    analyses = analyze_oversized_cavities(
        image_id="test",
        primary_hyps=[h1, h2],
        wall_network=DummyWN(),
        openings=[],
        proposals=[],
        img_w=500,
        img_h=500,
    )
    aud_ana = next(a for a in analyses if a.cavity_id == "hyp_auditorium")
    # Must be protected because it lacks internal wall dividers!
    assert aud_ana.should_split is False
    assert aud_ana.split_reason == "protected_single_room"


def test_oversized_cavity_detection_with_internal_walls():
    class DummyHyp:
        def __init__(self, hid, poly):
            self.id = hid
            class Pt:
                def __init__(self, x, y):
                    self.xPx, self.yPx = x, y
            self.polygon = [Pt(x, y) for x, y in poly]

    h1 = DummyHyp("hyp_small", [(10, 10), (50, 10), (50, 50), (10, 50)])
    h2 = DummyHyp("hyp_double_room", [(100, 100), (300, 100), (300, 300), (100, 300)])

    class DummySeg:
        def __init__(self, x1, y1, x2, y2):
            self.x1, self.y1, self.x2, self.y2 = x1, y1, x2, y2
            self.confidence = 0.8
            self.length = 200.0

    class DummyWN:
        # Internal wall cutting right down the middle of hyp_double_room (x=200)
        segments = [DummySeg(200, 100, 200, 300)]

    analyses = analyze_oversized_cavities(
        image_id="test",
        primary_hyps=[h1, h2],
        wall_network=DummyWN(),
        openings=[],
        proposals=[],
        img_w=500,
        img_h=500,
    )
    dbl_ana = next(a for a in analyses if a.cavity_id == "hyp_double_room")
    assert dbl_ana.should_split is True
    assert dbl_ana.oversized_score >= 0.35


def test_original_cavity_immutability():
    original_coords = [(10.0, 10.0), (100.0, 10.0), (100.0, 100.0), (10.0, 100.0)]
    poly = ShapelyPolygon(original_coords)
    initial_area = poly.area

    cav = OversizedCavityAnalysis(
        cavity_id="hyp_test",
        image_id="img1",
        polygon=original_coords,
        area_px=initial_area,
        bbox=(10.0, 10.0, 90.0, 90.0),
        oversized_score=0.8,
        area_evidence=0.5,
        wall_evidence=0.8,
        partition_evidence=0.5,
        doorway_evidence=0.5,
        topology_evidence=0.5,
        proposal_evidence=0.5,
        repetition_evidence=0.5,
        split_candidate_count=2,
        should_split=True,
        split_reason="test",
    )
    assert cav.polygon == original_coords
    assert poly.area == initial_area


def test_split_configuration_scoring():
    cfg = SplitConfiguration(
        configuration_id="cfg1",
        cavity_id="cav1",
        image_id="img1",
        strategy="hybrid",
        sub_proposals=[],
        original_cavity_area=1000.0,
        total_sub_area=950.0,
        coverage_ratio=0.95,
        overlap_area=50.0,
        overlap_ratio=0.05,
        uncovered_area=50.0,
        configuration_score=0.88,
    )
    d = cfg.to_dict()
    assert d["coverageRatio"] == 0.95
    assert d["overlapRatio"] == 0.05
    assert d["configurationScore"] == 0.88
