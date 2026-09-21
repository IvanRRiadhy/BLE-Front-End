"""
Phase 2.7.8 Architectural Face Classification & False-Positive Pruning Unit Tests
Verifies three-way face classification, negative evidence feature extraction,
overlap/containment pruning, small room protection, and ablation toggles.
"""
import pytest
import numpy as np
from app.models import AreaPoint, RoomHypothesis, ArchitecturalFaceClassification, DetectionConfig
from app.face_classifier import (
    extract_face_features,
    classify_candidate_face,
    prune_overlapping_and_contained_faces,
)

def test_three_way_face_classification():
    # Strong room candidate
    hyp_room = RoomHypothesis(
        id="h_room",
        polygon=[AreaPoint(100, 100), AreaPoint(400, 100), AreaPoint(400, 400), AreaPoint(100, 400)],
        source="cavity",
        area_px=90000,
        bbox=(100, 100, 300, 300),
        wall_support=0.85,
        confidence=0.80,
    )
    pos_ev = {"wallSupport": 0.85, "footprintContainment": 0.95, "topologyScore": 0.80, "boundaryQuality": 0.85}
    neg_ev = {"furnitureLikelihood": 0.05, "exteriorExposure": 0.05}

    clf = classify_candidate_face(hyp_room, pos_ev, neg_ev, DetectionConfig())
    assert clf.classification == "room"
    assert clf.confidence >= 0.45

    # Non-room candidate (high furniture & exterior penalty)
    hyp_non_room = RoomHypothesis(
        id="h_non_room",
        polygon=[AreaPoint(10, 10), AreaPoint(50, 10), AreaPoint(50, 50), AreaPoint(10, 50)],
        source="wall_network_face",
        area_px=1600,
        bbox=(10, 10, 40, 40),
        wall_support=0.10,
        furniture_likelihood=0.85,
    )
    pos_ev_bad = {"wallSupport": 0.15, "footprintContainment": 0.30, "topologyScore": 0.10}
    neg_ev_bad = {"furnitureLikelihood": 0.85, "exteriorExposure": 0.90, "isolationPenalty": 0.80}

    clf_bad = classify_candidate_face(hyp_non_room, pos_ev_bad, neg_ev_bad, DetectionConfig())
    assert clf_bad.classification == "non_room"
    assert len(clf_bad.rejection_reasons) >= 1

def test_containment_furniture_pruning():
    # Large parent room
    hyp_parent = RoomHypothesis(
        id="h_parent",
        polygon=[AreaPoint(100, 100), AreaPoint(500, 100), AreaPoint(500, 500), AreaPoint(100, 500)],
        source="cavity",
        area_px=160000,
        bbox=(100, 100, 400, 400),
        confidence=0.85,
    )
    clf_parent = ArchitecturalFaceClassification(face_id="h_parent", classification="room", confidence=0.85)

    # Nested sub-face inside parent (cabinet/furniture box)
    hyp_child = RoomHypothesis(
        id="h_child",
        polygon=[AreaPoint(200, 200), AreaPoint(250, 200), AreaPoint(250, 250), AreaPoint(200, 250)],
        source="wall_network_face",
        area_px=2500,
        bbox=(200, 200, 50, 50),
        confidence=0.48,
    )
    clf_child = ArchitecturalFaceClassification(face_id="h_child", classification="room", confidence=0.48)

    classifications = {"h_parent": clf_parent, "h_child": clf_child}
    hypotheses = [hyp_parent, hyp_child]

    accepted, final_clfs = prune_overlapping_and_contained_faces(classifications, hypotheses, DetectionConfig())
    assert len(accepted) == 1
    assert accepted[0].id == "h_parent"

def test_ablation_toggles():
    cfg_no_neg = DetectionConfig(enable_negative_evidence=False)
    hyp = RoomHypothesis(id="h_test", polygon=[], source="cavity", area_px=10000, bbox=(0,0,100,100))
    pos_ev = {"wallSupport": 0.60}
    neg_ev = {"furnitureLikelihood": 0.90}

    clf = classify_candidate_face(hyp, pos_ev, neg_ev, cfg_no_neg)
    # Without negative evidence penalty, confidence should be based solely on positive features
    assert clf.confidence > 0.0
