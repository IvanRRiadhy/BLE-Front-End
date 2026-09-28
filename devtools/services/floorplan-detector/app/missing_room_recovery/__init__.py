"""
Public API exports for Phase 2.10.10 Targeted Missing-Room Recovery.
"""
from .models import (
    MissingRoomProposal,
    RecoveryResult,
    RecoveryStrategy,
)
from .doorway_recovery import DoorwayRecoveryEngine
from .partition_recovery import PartitionRecoveryEngine
from .neighbor_recovery import NeighborRecoveryEngine
from .repetition_recovery import RepetitionRecoveryEngine
from .wall_reconstruction import WallReconstructionEngine
from .proposal_fusion import ProposalFusionEngine
from .analyzer import UnrepresentedSpaceAnalyzer
from .recovery_pipeline import TargetedRecoveryPipeline
from .metrics import RecoveryMetricsEvaluator, compute_polygon_iou
from .visualization import RecoveryVisualizer

__all__ = [
    "MissingRoomProposal",
    "RecoveryResult",
    "RecoveryStrategy",
    "DoorwayRecoveryEngine",
    "PartitionRecoveryEngine",
    "NeighborRecoveryEngine",
    "RepetitionRecoveryEngine",
    "WallReconstructionEngine",
    "ProposalFusionEngine",
    "UnrepresentedSpaceAnalyzer",
    "TargetedRecoveryPipeline",
    "RecoveryMetricsEvaluator",
    "compute_polygon_iou",
    "RecoveryVisualizer",
]
