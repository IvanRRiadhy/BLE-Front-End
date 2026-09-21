"""
Phase 2.9.0 ML + Classical CV Fusion Module
Exports core models, strategies, scoring functions, and evaluator.
"""
from .models import (
    FusionCandidate,
    FusionStrategyConfig,
    DisplacementRecord,
    BenchmarkSummary,
)
from .scoring import compute_fusion_score, check_ml_veto, check_ml_second_chance
from .strategies import get_ablation_strategies, get_strategies_for_group
from .evaluator import FusionEvaluator
from .visualization import render_candidate_comparison_overlay

__all__ = [
    "FusionCandidate",
    "FusionStrategyConfig",
    "DisplacementRecord",
    "BenchmarkSummary",
    "compute_fusion_score",
    "check_ml_veto",
    "check_ml_second_chance",
    "get_ablation_strategies",
    "get_strategies_for_group",
    "FusionEvaluator",
    "render_candidate_comparison_overlay",
]
