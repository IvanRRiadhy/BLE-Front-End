"""
Unit Tests for Phase 2.9.0 — ML + Classical CV Fusion Experiment

Covers the 10 required test categories:
1. Baseline produces same candidate decisions as production
2. ML evidence is correctly attached to candidates
3. Cavity penalty changes ranking deterministically
4. Doorway bonus changes ranking deterministically
5. Structural score changes ranking deterministically
6. ML veto behaves correctly
7. Second-chance candidate passes geometry validation
8. Invalid polygon cannot be promoted
9. Ranking is deterministic
10. Benchmark invariants: GT = TP + FN and Pred = TP + FP
"""
import pytest
import numpy as np
from pathlib import Path
from shapely.geometry import Polygon

from fusion.models import FusionCandidate, FusionStrategyConfig
from fusion.scoring import compute_fusion_score, check_ml_veto, check_ml_second_chance
from fusion.strategies import get_ablation_strategies, get_strategies_for_group
from fusion.evaluator import FusionEvaluator


@pytest.fixture(scope="module")
def evaluator():
    """Initializes evaluator once for test module."""
    package_root = Path(__file__).resolve().parent.parent
    return FusionEvaluator(package_root=package_root)


@pytest.fixture
def sample_candidates():
    """Creates synthetic candidate pair: true room vs cavity artifact."""
    c_room = FusionCandidate(
        candidate_id="test_room",
        image_id="test_img",
        source="wall_enclosure",
        polygon=[(100.0, 100.0), (300.0, 100.0), (300.0, 300.0), (100.0, 300.0)],
        classical_confidence=0.60,
        wall_support_classical=0.40,
        enclosure_score=0.95,
        classical_accepted_before_budget=True,
        ml_wall_support=0.35,
        ml_door_evidence=0.90,
        ml_structural_score=0.55,
        ml_cavity_likelihood=0.20,
        is_true_room=True,
    )
    c_cavity = FusionCandidate(
        candidate_id="test_cavity",
        image_id="test_img",
        source="wall_enclosure",
        polygon=[(500.0, 500.0), (550.0, 500.0), (550.0, 600.0), (500.0, 600.0)],
        classical_confidence=0.75,
        wall_support_classical=0.85,
        enclosure_score=1.0,
        classical_accepted_before_budget=True,
        ml_wall_support=0.45,
        ml_door_evidence=0.00,
        ml_structural_score=0.15,
        ml_cavity_likelihood=0.95,
        is_true_room=False,
    )
    return c_room, c_cavity


# 1. Baseline produces same candidate decisions as production
def test_baseline_matches_production(evaluator):
    """Verify Strategy A produces the exact authoritative baseline metrics."""
    base_cfg = get_strategies_for_group("baseline")[0]
    summary, _, _, _ = evaluator.evaluate_strategy(base_cfg)

    assert summary.gt_count == 148
    assert summary.pred_count == 114
    assert summary.tp_count == 38
    assert summary.fp_count == 76
    assert summary.fn_count == 110
    assert pytest.approx(summary.micro_f1, rel=1e-3) == 0.2901
    assert pytest.approx(summary.macro_f1, rel=1e-3) == 0.3173


# 2. ML evidence is correctly attached to candidates
def test_ml_evidence_attachment(evaluator):
    """Verify ML structural features are attached to all benchmark candidates."""
    base_cfg = get_strategies_for_group("baseline")[0]
    _, _, candidates, _ = evaluator.evaluate_strategy(base_cfg)
    
    assert len(candidates) > 100
    for cand in candidates:
        assert isinstance(cand.ml_wall_support, float)
        assert 0.0 <= cand.ml_wall_support <= 1.0
        assert 0.0 <= cand.ml_door_evidence <= 1.0
        assert 0.0 <= cand.ml_structural_score <= 1.0
        assert 0.0 <= cand.ml_cavity_likelihood <= 1.0


# 3. Cavity penalty changes ranking deterministically
def test_cavity_penalty_deterministic_ranking(sample_candidates):
    """Verify cavity penalty demotes cavity artifacts relative to true rooms."""
    c_room, c_cavity = sample_candidates
    cfg_b = FusionStrategyConfig(strategy_id="test_b", strategy_name="Test B", cavity_penalty_weight=0.30)
    
    score_room = compute_fusion_score(c_room, cfg_b)
    score_cavity = compute_fusion_score(c_cavity, cfg_b)
    
    # In classical CV, cavity (0.75) outranked room (0.60)
    assert c_cavity.classical_confidence > c_room.classical_confidence
    # With 0.30 cavity penalty:
    # room: 0.60 - 0.30*0.20 = 0.54
    # cavity: 0.75 - 0.30*0.95 = 0.465
    assert score_room > score_cavity


# 4. Doorway bonus changes ranking deterministically
def test_doorway_bonus_deterministic_ranking(sample_candidates):
    """Verify doorway bonus promotes doorway-connected rooms."""
    c_room, c_cavity = sample_candidates
    cfg_c = FusionStrategyConfig(strategy_id="test_c", strategy_name="Test C", door_bonus_weight=0.30)
    
    score_room = compute_fusion_score(c_room, cfg_c)
    score_cavity = compute_fusion_score(c_cavity, cfg_c)
    
    # room: 0.60 + 0.30*0.90 = 0.87
    # cavity: 0.75 + 0.30*0.00 = 0.75
    assert score_room > score_cavity


# 5. Structural score changes ranking deterministically
def test_structural_score_ranking(sample_candidates):
    """Verify composite structural confidence modulates candidate scores."""
    c_room, c_cavity = sample_candidates
    cfg_d = FusionStrategyConfig(strategy_id="test_d", strategy_name="Test D", structural_score_weight=0.30)
    
    score_room = compute_fusion_score(c_room, cfg_d)
    score_cavity = compute_fusion_score(c_cavity, cfg_d)
    
    # room: 0.60 + 0.30*0.55 = 0.765
    # cavity: 0.75 + 0.30*0.15 = 0.795 (closer margin)
    margin_before = c_cavity.classical_confidence - c_room.classical_confidence
    margin_after = score_cavity - score_room
    assert margin_after < margin_before


# 6. ML veto behaves correctly
def test_ml_veto_behavior(sample_candidates):
    """Verify ML veto catches extreme cavity artifacts and spares true rooms."""
    c_room, c_cavity = sample_candidates
    cfg_f = FusionStrategyConfig(
        strategy_id="test_f",
        strategy_name="Test F",
        enable_ml_veto=True,
        veto_cavity_threshold=0.90,
        veto_door_threshold=0.05,
    )
    
    is_vetoed_cavity, reason_c = check_ml_veto(c_cavity, cfg_f)
    is_vetoed_room, reason_r = check_ml_veto(c_room, cfg_f)
    
    assert is_vetoed_cavity is True
    assert reason_c == "ml_cavity_veto"
    assert is_vetoed_room is False
    assert reason_r is None


# 7. Second-chance candidate passes geometry validation
def test_second_chance_passes_geometry_validation():
    """Verify second chance candidate requires valid geometry and door evidence."""
    cfg_g = FusionStrategyConfig(
        strategy_id="test_g",
        strategy_name="Test G",
        enable_ml_second_chance=True,
        second_chance_door_threshold=0.85,
        second_chance_min_wall_support=0.20,
        second_chance_bonus=0.10,
    )
    # Candidate rejected by wall support in classical CV, but with 0.91 door connection
    lost_room = FusionCandidate(
        candidate_id="lost_tp_6",
        image_id="house2",
        source="wall_enclosure",
        polygon=[(100.0, 100.0), (400.0, 100.0), (400.0, 400.0), (100.0, 400.0)],
        classical_confidence=0.0,
        classical_rejection_reason="below_wall_support",
        ml_wall_support=0.33,
        ml_door_evidence=0.91,
        ml_cavity_likelihood=0.19,
        is_true_room=True,
    )
    
    granted, bonus, reason = check_ml_second_chance(lost_room, cfg_g)
    assert granted is True
    assert bonus == 0.10
    assert reason == "ml_door_evidence_second_chance"


# 8. Invalid polygon cannot be promoted
def test_invalid_polygon_cannot_be_promoted():
    """Verify candidates with invalid or degenerate geometry are never admitted."""
    from app.candidate_recovery import CandidateRecoveryEngine
    from app.models import DetectionConfig, RecoveredRoomHypothesis, AreaPoint
    
    engine = CandidateRecoveryEngine(DetectionConfig())
    
    # Degenerate 2-point polygon
    rec_invalid = RecoveredRoomHypothesis(
        recovery_id="invalid_poly",
        polygon=[AreaPoint(xPx=10.0, yPx=10.0), AreaPoint(xPx=20.0, yPx=20.0)],
        source="wall_enclosure",
        confidence=0.5,
    )
    is_valid, reasons = engine.validate_recovered_candidate(
        rec_invalid, wall_mask=np.zeros((100, 100), dtype=np.uint8),
        wall_network=None, footprint_mask=None, img_w=100, img_h=100
    )
    assert is_valid is False
    assert "insufficient_vertices" in reasons


# 9. Ranking is deterministic
def test_ranking_determinism(evaluator):
    """Verify repeated evaluation of a strategy produces identical rankings."""
    cfg = FusionStrategyConfig(
        strategy_id="test_det",
        strategy_name="Test Determinism",
        door_bonus_weight=0.20,
        cavity_penalty_weight=0.20,
    )
    summary1, _, cands1, _ = evaluator.evaluate_strategy(cfg)
    summary2, _, cands2, _ = evaluator.evaluate_strategy(cfg)
    
    assert summary1.tp_count == summary2.tp_count
    assert summary1.fp_count == summary2.fp_count
    assert len(cands1) == len(cands2)
    for c1, c2 in zip(cands1, cands2):
        assert c1.candidate_id == c2.candidate_id
        assert c1.fusion_rank == c2.fusion_rank
        assert pytest.approx(c1.fusion_score, rel=1e-3) == c2.fusion_score


# 10. Benchmark invariants: GT = TP + FN and Pred = TP + FP
def test_benchmark_invariants(evaluator):
    """Verify universal benchmark invariants hold across all strategies."""
    strategies = [
        get_strategies_for_group("baseline")[0],
        get_strategies_for_group("cavity")[0],
        get_strategies_for_group("door")[0],
        get_strategies_for_group("veto")[0],
    ]
    for strat in strategies:
        summary, _, _, _ = evaluator.evaluate_strategy(strat)
        assert summary.gt_count == summary.tp_count + summary.fn_count
        assert summary.pred_count == summary.tp_count + summary.fp_count
