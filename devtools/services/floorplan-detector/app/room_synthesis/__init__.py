"""
Public API exports for Phase 2.10.9 Global Room Synthesis.
"""
from .models import (
    RoomHypothesis,
    HypothesisRelationship,
    RelationshipType,
    DoorwayContext,
    CavityContext,
    NeighborContext,
    PartitionContext,
    AlternativeGroup,
    RoomConfiguration,
    SynthesisResult,
)
from .doorway_context import DoorwayContextAnalyzer
from .cavity_context import CavityContextAnalyzer
from .relationship_builder import SpatialRelationshipBuilder
from .hypothesis_graph import RoomHypothesisGraph
from .configuration_generator import ConfigurationGenerator
from .global_scoring import GlobalRoomScorer
from .constraint_solver import ConfigurationConstraintSolver
from .boundary_refinement import BoundaryRefiner
from .synthesis_pipeline import GlobalRoomSynthesisPipeline
from .metrics import GlobalRoomMetricsEvaluator, compute_polygon_iou
from .visualization import RoomSynthesisVisualizer

__all__ = [
    "RoomHypothesis",
    "HypothesisRelationship",
    "RelationshipType",
    "DoorwayContext",
    "CavityContext",
    "NeighborContext",
    "PartitionContext",
    "AlternativeGroup",
    "RoomConfiguration",
    "SynthesisResult",
    "DoorwayContextAnalyzer",
    "CavityContextAnalyzer",
    "SpatialRelationshipBuilder",
    "RoomHypothesisGraph",
    "ConfigurationGenerator",
    "GlobalRoomScorer",
    "ConfigurationConstraintSolver",
    "BoundaryRefiner",
    "GlobalRoomSynthesisPipeline",
    "GlobalRoomMetricsEvaluator",
    "compute_polygon_iou",
    "RoomSynthesisVisualizer",
]
