"""
Public API exports for app/wall_refinement package (Phase 2.10.11).
"""
from .models import (
    StructuralEvidence,
    RefinedStructuralEvidence,
    CandidateGap,
    CandidateJunction,
    GapType,
    WallMetrics,
    TopologyMetrics,
    OpeningPreservationMetrics,
)
from .preprocessing import normalize_image
from .classical_evidence import ClassicalEvidenceExtractor
from .ml_evidence import MLStructuralEvidenceExtractor
from .opening_protection import OpeningProtectionEngine
from .wall_confidence import WallConfidenceEstimator
from .gap_repair import GapRepairEngine
from .junction_repair import JunctionRepairEngine
from .topology_refinement import TopologyRefinementEngine
from .mask_fusion import MaskFusionEngine
from .wall_refinement_pipeline import MultimodalWallRefinementPipeline
from .metrics import WallMetricsEvaluator
from .visualization import WallRefinementVisualizer

__all__ = [
    "StructuralEvidence",
    "RefinedStructuralEvidence",
    "CandidateGap",
    "CandidateJunction",
    "GapType",
    "WallMetrics",
    "TopologyMetrics",
    "OpeningPreservationMetrics",
    "normalize_image",
    "ClassicalEvidenceExtractor",
    "MLStructuralEvidenceExtractor",
    "OpeningProtectionEngine",
    "WallConfidenceEstimator",
    "GapRepairEngine",
    "JunctionRepairEngine",
    "TopologyRefinementEngine",
    "MaskFusionEngine",
    "MultimodalWallRefinementPipeline",
    "WallMetricsEvaluator",
    "WallRefinementVisualizer",
]
