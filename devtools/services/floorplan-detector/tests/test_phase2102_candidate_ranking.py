"""
Unit tests for Phase 2.10.2: Text-Aware Candidate Ranking & Recovery Engine.
Validates:
1. Deterministic ranking
2. Candidate/text association
3. Positive evidence computation
4. Negative evidence / artifact cavity detection
5. Cavity suppression via re-ranking
6. No geometry mutation invariant
"""
import copy
import numpy as np
import pytest
from shapely.geometry import Polygon as ShapelyPolygon

from text_analysis.models import TextRegion
from text_analysis.candidate_features import (
    CandidateTextMetrics,
    compute_candidate_text_metrics,
)
from text_analysis.candidate_ranking import (
    TextAwareCandidate,
    TextAwareRankingStrategy,
    compute_candidate_score,
    rank_and_select_candidates,
)


def _make_candidate(
    cand_id: str,
    poly_pts: list,
    confidence: float = 0.50,
    door_ev: float = 0.0,
    text_metrics: CandidateTextMetrics = None,
) -> TextAwareCandidate:
    poly_arr = [(float(p[0]), float(p[1])) for p in poly_pts]
    area = float(ShapelyPolygon(poly_arr).area)
    return TextAwareCandidate(
        candidate_id=cand_id,
        image_id="test_image.png",
        source="wall_enclosure",
        polygon=poly_arr,
        area=area,
        classical_confidence=confidence,
        wall_support=0.65,
        enclosure_score=1.0,
        ml_door_evidence=door_ev,
        text_metrics=text_metrics or CandidateTextMetrics(candidate_id=cand_id),
        source_threshold=0.45,
    )


def test_deterministic_ranking():
    """Verifies that ranking is 100% deterministic and bit-exact across multiple invocations."""
    c1 = _make_candidate("c1", [(0, 0), (100, 0), (100, 100), (0, 100)], confidence=0.52)
    c2 = _make_candidate("c2", [(120, 0), (220, 0), (220, 100), (120, 100)], confidence=0.55)
    c3 = _make_candidate("c3", [(0, 120), (100, 120), (100, 220), (0, 220)], confidence=0.49)

    strat = TextAwareRankingStrategy(strategy_id="B", strategy_name="test", door_weight=0.10, text_positive_weight=0.15)
    
    # Run 1
    cands_run1 = [copy.deepcopy(c1), copy.deepcopy(c2), copy.deepcopy(c3)]
    acc1, rej1, disp1 = rank_and_select_candidates(cands_run1, [], strat, budget_limit=2)

    # Run 2
    cands_run2 = [copy.deepcopy(c1), copy.deepcopy(c2), copy.deepcopy(c3)]
    acc2, rej2, disp2 = rank_and_select_candidates(cands_run2, [], strat, budget_limit=2)

    assert len(acc1) == len(acc2) == 2
    assert [c.candidate_id for c in acc1] == [c.candidate_id for c in acc2]
    assert [d.new_rank for d in disp1] == [d.new_rank for d in disp2]
    assert [d.new_score for d in disp1] == [d.new_score for d in disp2]


def test_candidate_text_association():
    """Verifies spatial association of text regions with candidate polygons."""
    cand_poly = [(50, 50), (200, 50), (200, 200), (50, 200)]
    mask = np.zeros((300, 300), dtype=np.uint8)

    # Text 1 inside candidate
    mask[100:120, 100:150] = 255
    reg1 = TextRegion(
        id="t1",
        bbox=(100, 100, 50, 20),
        polygon=[(100, 100), (150, 100), (150, 120), (100, 120)],
        area=1000.0,
        width=50.0,
        height=20.0,
        aspect_ratio=2.5,
        relation="INTERIOR_TEXT",
    )

    # Text 2 completely outside candidate
    mask[250:270, 250:280] = 255
    reg2 = TextRegion(
        id="t2",
        bbox=(250, 250, 30, 20),
        polygon=[(250, 250), (280, 250), (280, 270), (250, 270)],
        area=600.0,
        width=30.0,
        height=20.0,
        aspect_ratio=1.5,
        relation="INTERIOR_TEXT",
    )

    metrics = compute_candidate_text_metrics("test_c", cand_poly, mask, [reg1, reg2])
    assert metrics.text_count == 1
    assert metrics.intersecting_region_ids == ["t1"]
    assert metrics.text_interior_ratio == 1.0
    assert metrics.text_coverage > 0.0


def test_positive_evidence_computation():
    """Verifies that a well-centered interior text label generates high positive room evidence."""
    cand_poly = [(0, 0), (200, 0), (200, 200), (0, 200)]  # area = 40,000 px^2, centroid = (100, 100)
    mask = np.zeros((300, 300), dtype=np.uint8)
    mask[90:110, 80:120] = 255  # centered text label

    reg = TextRegion(
        id="room_label",
        bbox=(80, 90, 40, 20),
        polygon=[(80, 90), (120, 90), (120, 110), (80, 110)],
        area=800.0,
        width=40.0,
        height=20.0,
        aspect_ratio=2.0,
        relation="INTERIOR_TEXT",
    )

    metrics = compute_candidate_text_metrics("room_cand", cand_poly, mask, [reg])
    assert metrics.text_room_evidence > 0.40
    assert metrics.text_artifact_evidence < 0.20
    assert metrics.text_center_distance < 0.50

    cand = _make_candidate("room_cand", cand_poly, confidence=0.50, text_metrics=metrics)
    base_strat = TextAwareRankingStrategy("base", "base", door_weight=0.0, text_positive_weight=0.0)
    pos_strat = TextAwareRankingStrategy("pos", "pos", door_weight=0.0, text_positive_weight=0.15)

    base_score = compute_candidate_score(cand, base_strat)
    pos_score = compute_candidate_score(cand, pos_strat)
    assert pos_score > base_score


def test_negative_evidence_artifact_cavity():
    """Verifies that a tiny candidate dominated by text strokes gets high negative artifact evidence."""
    cand_poly = [(10, 10), (35, 10), (35, 30), (10, 30)]  # area = 500 px^2
    mask = np.zeros((100, 100), dtype=np.uint8)
    mask[12:28, 12:32] = 255  # almost completely fills the candidate

    reg = TextRegion(
        id="letter_loop",
        bbox=(12, 12, 20, 16),
        polygon=[(12, 12), (32, 12), (32, 28), (12, 28)],
        area=320.0,
        width=20.0,
        height=16.0,
        aspect_ratio=1.25,
        relation="AMBIGUOUS_TEXT",
    )

    metrics = compute_candidate_text_metrics("cavity_cand", cand_poly, mask, [reg])
    assert metrics.text_artifact_evidence > 0.65

    cand = _make_candidate("cavity_cand", cand_poly, confidence=0.55, text_metrics=metrics)
    base_strat = TextAwareRankingStrategy("base", "base", text_negative_weight=0.0)
    neg_strat = TextAwareRankingStrategy("neg", "neg", text_negative_weight=0.15)

    base_score = compute_candidate_score(cand, base_strat)
    neg_score = compute_candidate_score(cand, neg_strat)
    assert neg_score < base_score


def test_cavity_suppression_and_true_room_recovery():
    """
    Demonstrates the core objective: a true room ranked below a cavity artifact is promoted
    into the budget, while the cavity artifact is demoted out of the budget.
    """
    # True room: area 3600, confidence 0.50, contains room label ("BEDROOM")
    m_room = CandidateTextMetrics("c_room", text_count=1, text_room_evidence=0.80, text_artifact_evidence=0.0)
    c_room = _make_candidate("c_room", [(0, 0), (60, 0), (60, 60), (0, 60)], confidence=0.50, text_metrics=m_room)
    c_room.matched_gt_id = "gt_bedroom"
    c_room.iou = 0.85
    c_room.is_true_room = True

    # Cavity artifact: area 500, confidence 0.53 (higher initial confidence due to thick wall), high artifact evidence
    m_cav = CandidateTextMetrics("c_cavity", text_count=1, text_room_evidence=0.0, text_artifact_evidence=0.85)
    c_cav = _make_candidate("c_cavity", [(100, 100), (125, 100), (125, 120), (100, 120)], confidence=0.53, text_metrics=m_cav)
    c_cav.is_true_room = False

    # In baseline: c_cavity (0.53) ranks above c_room (0.50)
    base_strat = TextAwareRankingStrategy("baseline", "baseline", door_weight=0.0, text_positive_weight=0.0, text_negative_weight=0.0)
    acc_b, rej_b, disp_b = rank_and_select_candidates([c_room, c_cav], [], base_strat, budget_limit=1)
    assert len(acc_b) == 1
    assert acc_b[0].candidate_id == "c_cavity"  # Cavity unfairly took the single budget slot!

    # Record baseline state
    for d in disp_b:
        if d.candidate_id == "c_room":
            c_room.baseline_rank = d.new_rank
            c_room.baseline_score = d.new_score
            c_room.accepted_before = d.accepted_after
        elif d.candidate_id == "c_cavity":
            c_cav.baseline_rank = d.new_rank
            c_cav.baseline_score = d.new_score
            c_cav.accepted_before = d.accepted_after

    # Under Phase 2.10.2 ranking strategy:
    # c_room score = 0.50 + 0.10 * 0.80 = 0.58
    # c_cav score  = 0.53 - 0.10 * 0.85 = 0.445
    new_strat = TextAwareRankingStrategy("pos_neg", "pos_neg", door_weight=0.0, text_positive_weight=0.10, text_negative_weight=0.10)
    acc_n, rej_n, disp_n = rank_and_select_candidates([c_room, c_cav], [], new_strat, budget_limit=1)
    assert len(acc_n) == 1
    assert acc_n[0].candidate_id == "c_room"  # True room recovered into budget!
    assert acc_n[0].is_true_room is True

    # Verify displacement record
    room_disp = next(d for d in disp_n if d.candidate_id == "c_room")
    cav_disp = next(d for d in disp_n if d.candidate_id == "c_cavity")
    assert room_disp.promoted is True
    assert cav_disp.demoted is True


def test_no_geometry_mutation():
    """Verifies that ranking strictly alters scores and ranks without mutating any polygon vertices."""
    orig_poly = [(12.5, 34.2), (89.1, 34.2), (89.1, 105.7), (12.5, 105.7)]
    c = _make_candidate("c_geom", orig_poly, confidence=0.52)
    strat = TextAwareRankingStrategy("strat", "strat", text_positive_weight=0.10)

    acc, _, _ = rank_and_select_candidates([c], [], strat, budget_limit=5)
    assert len(acc) == 1
    assert acc[0].polygon == orig_poly  # Exactly bit-identical coordinates
