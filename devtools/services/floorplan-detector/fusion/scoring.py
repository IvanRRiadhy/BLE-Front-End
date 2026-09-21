"""
Phase 2.9.0 Fusion Scoring Functions
Computes candidate-level fusion scores combining classical CV confidence and ML structural signals.
"""
from typing import Tuple, Optional
from .models import FusionCandidate, FusionStrategyConfig


def compute_fusion_score(cand: FusionCandidate, cfg: FusionStrategyConfig) -> float:
    """
    Computes candidate-level fusion score combining classical confidence with ML evidence.
    Score = classical_confidence
          - lambda_cavity * cavity_likelihood
          + lambda_door * door_evidence
          + lambda_struct * structural_score
    Clamped to [0.0, 1.0].
    """
    score = cand.classical_confidence
    
    if cfg.cavity_penalty_weight > 0.0:
        score -= cfg.cavity_penalty_weight * cand.ml_cavity_likelihood
        
    if cfg.door_bonus_weight > 0.0:
        score += cfg.door_bonus_weight * cand.ml_door_evidence
        
    if cfg.structural_score_weight > 0.0:
        score += cfg.structural_score_weight * cand.ml_structural_score
        
    return max(0.0, min(1.0, score))


def check_ml_veto(cand: FusionCandidate, cfg: FusionStrategyConfig) -> Tuple[bool, Optional[str]]:
    """
    Checks if a candidate should be vetoed based on ML structural evidence.
    A candidate is vetoed if cavity_likelihood >= threshold AND door_evidence <= threshold.
    """
    if not cfg.enable_ml_veto:
        return False, None
        
    if (
        cand.ml_cavity_likelihood >= cfg.veto_cavity_threshold
        and cand.ml_door_evidence <= cfg.veto_door_threshold
    ):
        return True, "ml_cavity_veto"
        
    return False, None


def check_ml_second_chance(
    cand: FusionCandidate, cfg: FusionStrategyConfig
) -> Tuple[bool, float, Optional[str]]:
    """
    Checks if a candidate rejected by classical thresholds qualifies for an ML second chance.
    Requires:
    - strong ML door evidence (>= second_chance_door_threshold)
    - acceptable ML wall support (>= second_chance_min_wall_support)
    - valid room geometry
    Returns: (is_granted, bonus_amount, reason)
    """
    if not cfg.enable_ml_second_chance:
        return False, 0.0, None
        
    # Only consider candidates that failed classical thresholds (not duplicate/budget)
    if cand.classical_rejection_reason not in ("below_wall_support", "below_confidence"):
        return False, 0.0, None
        
    if (
        cand.ml_door_evidence >= cfg.second_chance_door_threshold
        and cand.ml_wall_support >= cfg.second_chance_min_wall_support
    ):
        return True, cfg.second_chance_bonus, "ml_door_evidence_second_chance"
        
    return False, 0.0, None
