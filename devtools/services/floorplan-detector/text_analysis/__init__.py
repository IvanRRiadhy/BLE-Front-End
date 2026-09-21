"""
Phase 2.10.0 & Phase 2.10.1 Text Analysis Subsystem
Exports models, text detector, wall protection, likelihood, masking,
spatial distance analysis, adaptive separation, and visual diagnostics.
"""
from .models import (
    TextRegion,
    Phase210TextExperimentConfig,
    CandidateTextEvidence,
    WallPreservationMetrics,
    FragmentationRecord,
    TextAnalysisResult,
)
from .detector import TextDetector
from .wall_protection import (
    compute_wall_protection_mask,
    compute_safe_text_mask,
    compute_wall_preservation_metrics,
)
from .mask import (
    generate_binary_text_mask,
    generate_soft_attenuation_mask,
)
from .likelihood import (
    compute_candidate_text_evidence,
    evaluate_room_fragmentation,
)
from .visualization import (
    render_all_debug_overlays,
)
from .distance_analysis import (
    compute_wall_distance_map,
    extract_local_wall_thickness,
    analyze_text_region_spatial_metrics,
)
from .separation import (
    classify_text_wall_relation,
    process_all_text_regions_separation,
    RELATION_INTERIOR,
    RELATION_NEAR_WALL,
    RELATION_WALL_OVERLAP,
    RELATION_AMBIGUOUS,
)
from .adaptive_protection import (
    rasterize_wall_network,
    build_adaptive_suppression_map,
    apply_adaptive_suppression_to_walls,
    render_phase2101_visual_diagnostics,
)
from .candidate_features import (
    CandidateTextMetrics,
    compute_candidate_text_metrics,
)
from .candidate_ranking import (
    TextAwareCandidate,
    TextAwareRankingStrategy,
    RankDisplacementRecord,
    compute_candidate_score,
    rank_and_select_candidates,
)

__all__ = [
    "TextRegion",
    "Phase210TextExperimentConfig",
    "CandidateTextEvidence",
    "WallPreservationMetrics",
    "FragmentationRecord",
    "TextAnalysisResult",
    "TextDetector",
    "compute_wall_protection_mask",
    "compute_safe_text_mask",
    "compute_wall_preservation_metrics",
    "generate_binary_text_mask",
    "generate_soft_attenuation_mask",
    "compute_candidate_text_evidence",
    "evaluate_room_fragmentation",
    "render_all_debug_overlays",
    "compute_wall_distance_map",
    "extract_local_wall_thickness",
    "analyze_text_region_spatial_metrics",
    "classify_text_wall_relation",
    "process_all_text_regions_separation",
    "RELATION_INTERIOR",
    "RELATION_NEAR_WALL",
    "RELATION_WALL_OVERLAP",
    "RELATION_AMBIGUOUS",
    "rasterize_wall_network",
    "build_adaptive_suppression_map",
    "apply_adaptive_suppression_to_walls",
    "render_phase2101_visual_diagnostics",
    "CandidateTextMetrics",
    "compute_candidate_text_metrics",
    "TextAwareCandidate",
    "TextAwareRankingStrategy",
    "RankDisplacementRecord",
    "compute_candidate_score",
    "rank_and_select_candidates",
]
