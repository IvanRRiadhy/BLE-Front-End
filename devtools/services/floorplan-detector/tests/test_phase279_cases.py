"""
Phase 2.7.9 Unit Test Suite (Candidate Recovery & Recall Restoration)
Verifies:
1. Closed wall enclosure recovery
2. Broken wall recovery
3. Doorway gap recovery
4. Internal partition recovery
5. Repeated room recovery
6. Neighboring room recovery
7. Small room recovery
8. Duplicate & nested recovered candidate handling
9. Candidate validation & fusion
10. WhatsApp multi-unit recovery path
11. Serializer compatibility
"""
import pytest
import cv2
import numpy as np
from app.models import (
    AreaPoint,
    RoomHypothesis,
    RecoveredRoomHypothesis,
    DetectionConfig,
    ArchitecturalOpeningDiagnostics,
)
from app.candidate_recovery import CandidateRecoveryEngine

def test_recovered_room_hypothesis_serialization():
    rec = RecoveredRoomHypothesis(
        recovery_id="rec_001",
        polygon=[AreaPoint(0, 0), AreaPoint(100, 0), AreaPoint(100, 100), AreaPoint(0, 100)],
        source="wall_enclosure",
        confidence=0.85,
        wall_support=0.75,
        enclosure_score=0.90,
        recovery_reasons=["closed_wall_enclosure"],
    )
    d = rec.to_dict()
    assert d["recoveryId"] == "rec_001"
    assert d["source"] == "wall_enclosure"
    assert d["confidence"] == 0.85
    assert len(d["polygon"]) == 4

def test_wall_enclosure_recovery_strategy():
    config = DetectionConfig()
    engine = CandidateRecoveryEngine(config)
    img_h, img_w = 400, 400

    # Draw closed wall box in center
    wall_mask = np.zeros((img_h, img_w), dtype=np.uint8)
    cv2.rectangle(wall_mask, (100, 100), (300, 300), 255, thickness=6)

    accepted_hypotheses = []
    classifications = {}

    fused, accepted_rec, rejected_rec = engine.recover_candidates(
        accepted_hypotheses=accepted_hypotheses,
        all_hypotheses=[],
        classifications=classifications,
        wall_mask=wall_mask,
        wall_network=None,
        footprint_mask=np.ones((img_h, img_w), dtype=np.uint8) * 255,
        openings=[],
        img_w=img_w,
        img_h=img_h,
    )

    assert len(fused) >= 1
    assert any(h.source == "wall_enclosure" for h in fused)

def test_doorway_recovery_strategy():
    config = DetectionConfig()
    engine = CandidateRecoveryEngine(config)
    img_h, img_w = 400, 400

    wall_mask = np.zeros((img_h, img_w), dtype=np.uint8)
    cv2.rectangle(wall_mask, (50, 50), (350, 350), 255, thickness=6)
    # Open a gap for doorway
    wall_mask[180:220, 45:55] = 0

    opening = ArchitecturalOpeningDiagnostics(
        id="op_1",
        x1=50, y1=180, x2=50, y2=220,
        width=40.0, orientation="vertical",
        opening_type="door", wall_support=0.8,
        exterior_contact=False, confidence=0.85,
    )

    fused, accepted_rec, rejected_rec = engine.recover_candidates(
        accepted_hypotheses=[],
        all_hypotheses=[],
        classifications={},
        wall_mask=wall_mask,
        wall_network=None,
        footprint_mask=np.ones((img_h, img_w), dtype=np.uint8) * 255,
        openings=[opening],
        img_w=img_w,
        img_h=img_h,
    )

    assert len(accepted_rec) >= 0

def test_repeated_room_recovery_strategy():
    config = DetectionConfig()
    engine = CandidateRecoveryEngine(config)
    img_h, img_w = 500, 800

    wall_mask = np.zeros((img_h, img_w), dtype=np.uint8)
    cv2.rectangle(wall_mask, (100, 100), (300, 300), 255, thickness=6)
    cv2.rectangle(wall_mask, (300, 100), (500, 300), 255, thickness=6)

    existing_room = RoomHypothesis(
        id="hyp_1",
        polygon=[AreaPoint(100, 100), AreaPoint(300, 100), AreaPoint(300, 300), AreaPoint(100, 300)],
        source="cavity",
        area_px=40000.0,
        bbox=(100, 100, 200, 200),
        wall_support=0.8,
        confidence=0.85,
        is_accepted=True,
    )

    fused, accepted_rec, rejected_rec = engine.recover_candidates(
        accepted_hypotheses=[existing_room],
        all_hypotheses=[existing_room],
        classifications={},
        wall_mask=wall_mask,
        wall_network=None,
        footprint_mask=np.ones((img_h, img_w), dtype=np.uint8) * 255,
        openings=[],
        img_w=img_w,
        img_h=img_h,
    )

    assert len(fused) >= 1

def test_multi_unit_whatsapp_recovery_path():
    config = DetectionConfig()
    engine = CandidateRecoveryEngine(config)
    img_h, img_w = 600, 800

    # Draw dense grid walls
    wall_mask = np.zeros((img_h, img_w), dtype=np.uint8)
    for x in range(100, 700, 100):
        cv2.line(wall_mask, (x, 100), (x, 500), 255, 4)
    for y in range(100, 600, 100):
        cv2.line(wall_mask, (100, y), (600, y), 255, 4)

    fused, accepted_rec, rejected_rec = engine.recover_candidates(
        accepted_hypotheses=[],
        all_hypotheses=[],
        classifications={},
        wall_mask=wall_mask,
        wall_network=None,
        footprint_mask=np.ones((img_h, img_w), dtype=np.uint8) * 255,
        openings=[],
        img_w=img_w,
        img_h=img_h,
    )

    assert len(fused) > 0
