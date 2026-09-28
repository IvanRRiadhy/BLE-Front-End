"""
Data models and containers for Phase 2.10.11 Multimodal Structural Wall Mask Refinement.
Preserves continuous spatial confidence maps, junction/opening evidence,
wall & topology metrics, and provenance.
"""
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Set, Tuple
import numpy as np


class GapType(str, Enum):
    ARCHITECTURAL_GAP = "ARCHITECTURAL_GAP"
    DOORWAY_GAP = "DOORWAY_GAP"
    WINDOW_GAP = "WINDOW_GAP"
    UNKNOWN_GAP = "UNKNOWN_GAP"
    ARTIFACT_GAP = "ARTIFACT_GAP"


@dataclass
class StructuralEvidence:
    """
    Continuous float evidence representation combining classical CV features
    and pretrained RT-DETR structural detections before hard binarization.
    """
    image_id: str
    pixel_width: int
    pixel_height: int

    # Classical Continuous Evidence (0.0 .. 1.0)
    grayscale_evidence: np.ndarray = field(default_factory=lambda: np.zeros((10, 10), dtype=np.float32))
    adaptive_threshold_evidence: np.ndarray = field(default_factory=lambda: np.zeros((10, 10), dtype=np.float32))
    canny_evidence: np.ndarray = field(default_factory=lambda: np.zeros((10, 10), dtype=np.float32))
    sobel_horizontal_evidence: np.ndarray = field(default_factory=lambda: np.zeros((10, 10), dtype=np.float32))
    sobel_vertical_evidence: np.ndarray = field(default_factory=lambda: np.zeros((10, 10), dtype=np.float32))
    sobel_total_evidence: np.ndarray = field(default_factory=lambda: np.zeros((10, 10), dtype=np.float32))
    directional_line_evidence: np.ndarray = field(default_factory=lambda: np.zeros((10, 10), dtype=np.float32))
    morphology_evidence: np.ndarray = field(default_factory=lambda: np.zeros((10, 10), dtype=np.float32))
    thickness_evidence: np.ndarray = field(default_factory=lambda: np.zeros((10, 10), dtype=np.float32))
    color_contrast_evidence: np.ndarray = field(default_factory=lambda: np.zeros((10, 10), dtype=np.float32))

    # ML Continuous Evidence (0.0 .. 1.0)
    ml_wall_evidence: np.ndarray = field(default_factory=lambda: np.zeros((10, 10), dtype=np.float32))
    ml_door_evidence: np.ndarray = field(default_factory=lambda: np.zeros((10, 10), dtype=np.float32))
    ml_window_evidence: np.ndarray = field(default_factory=lambda: np.zeros((10, 10), dtype=np.float32))
    ml_railing_evidence: np.ndarray = field(default_factory=lambda: np.zeros((10, 10), dtype=np.float32))
    ml_linkage_evidence: np.ndarray = field(default_factory=lambda: np.zeros((10, 10), dtype=np.float32))

    # Suppression Evidence (0.0 .. 1.0, None if not present to conserve memory)
    text_evidence: Optional[np.ndarray] = None
    furniture_evidence: Optional[np.ndarray] = None
    hatch_evidence: Optional[np.ndarray] = None

    def __post_init__(self):
        target_shape = (self.pixel_height, self.pixel_width)
        for attr in [
            "grayscale_evidence", "adaptive_threshold_evidence", "canny_evidence",
            "sobel_horizontal_evidence", "sobel_vertical_evidence", "sobel_total_evidence",
            "directional_line_evidence", "morphology_evidence", "thickness_evidence",
            "color_contrast_evidence", "ml_wall_evidence", "ml_door_evidence",
            "ml_window_evidence", "ml_railing_evidence", "ml_linkage_evidence",
        ]:
            arr = getattr(self, attr, None)
            if arr is None or arr.shape != target_shape:
                # If target shape is very small (like default 10x10), allocate target shape
                if self.pixel_height * self.pixel_width <= 10000:
                    setattr(self, attr, np.zeros(target_shape, dtype=np.float32))
                else:
                    # For full images, only allocate a dummy 1x1 if omitted to avoid allocating 15x 130MB zero arrays
                    setattr(self, attr, np.zeros((1, 1), dtype=np.float32))


@dataclass
class CandidateGap:
    """
    Represents an interruption between two wall stroke endpoints.
    """
    gap_id: str
    p1: Tuple[float, float]
    p2: Tuple[float, float]
    length_px: float
    orientation_deg: float
    gap_type: GapType = GapType.UNKNOWN_GAP
    confidence: float = 0.5
    is_repaired: bool = False
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class CandidateJunction:
    """
    Represents an intersection / corner between wall segments.
    """
    junction_id: str
    point: Tuple[float, float]
    connected_stroke_ids: List[str] = field(default_factory=list)
    junction_type: str = "T"  # L, T, X
    is_repaired: bool = False
    confidence: float = 0.5


@dataclass
class WallMetrics:
    """
    Quantitative metrics measuring physical wall representation.
    """
    wall_pixel_count: int = 0
    wall_coverage_ratio: float = 0.0
    connected_components: int = 0
    largest_component_px: int = 0
    segment_count: int = 0
    avg_segment_length_px: float = 0.0
    median_segment_length_px: float = 0.0
    junction_count: int = 0
    isolated_stroke_count: int = 0
    fragmentation_score: float = 0.0
    wall_continuity_score: float = 0.0
    opening_count: int = 0
    protected_opening_area_px: int = 0
    repaired_gap_count: int = 0
    repaired_junction_count: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "wallPixelCount": self.wall_pixel_count,
            "wallCoverageRatio": round(self.wall_coverage_ratio, 4),
            "connectedComponents": self.connected_components,
            "largestComponentPx": self.largest_component_px,
            "segmentCount": self.segment_count,
            "avgSegmentLengthPx": round(self.avg_segment_length_px, 2),
            "medianSegmentLengthPx": round(self.median_segment_length_px, 2),
            "junctionCount": self.junction_count,
            "isolatedStrokeCount": self.isolated_stroke_count,
            "fragmentationScore": round(self.fragmentation_score, 4),
            "wallContinuityScore": round(self.wall_continuity_score, 4),
            "openingCount": self.opening_count,
            "protectedOpeningAreaPx": self.protected_opening_area_px,
            "repairedGapCount": self.repaired_gap_count,
            "repairedJunctionCount": self.repaired_junction_count,
        }


@dataclass
class TopologyMetrics:
    """
    Topological metrics measuring graph connectivity and cycle completeness.
    """
    graph_nodes: int = 0
    graph_edges: int = 0
    avg_node_degree: float = 0.0
    junction_count: int = 0
    dangling_endpoints: int = 0
    closed_cycles: int = 0
    near_closed_cycles: int = 0
    cycle_recovery_count: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "graphNodes": self.graph_nodes,
            "graphEdges": self.graph_edges,
            "avgNodeDegree": round(self.avg_node_degree, 3),
            "junctionCount": self.junction_count,
            "danglingEndpoints": self.dangling_endpoints,
            "closedCycles": self.closed_cycles,
            "nearClosedCycles": self.near_closed_cycles,
            "cycleRecoveryCount": self.cycle_recovery_count,
        }


@dataclass
class OpeningPreservationMetrics:
    """
    Metrics measuring non-destruction of genuine architectural openings.
    """
    doorway_preservation_ratio: float = 1.0
    window_preservation_ratio: float = 1.0
    exterior_opening_preservation_ratio: float = 1.0
    false_closure_count: int = 0
    opening_area_reduction_ratio: float = 0.0
    overall_opening_preservation: float = 1.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "doorwayPreservationRatio": round(self.doorway_preservation_ratio, 4),
            "windowPreservationRatio": round(self.window_preservation_ratio, 4),
            "exteriorOpeningPreservationRatio": round(self.exterior_opening_preservation_ratio, 4),
            "falseClosureCount": self.false_closure_count,
            "openingAreaReductionRatio": round(self.opening_area_reduction_ratio, 4),
            "overallOpeningPreservation": round(self.overall_opening_preservation, 4),
        }


@dataclass
class RefinedStructuralEvidence:
    """
    Complete output container of Phase 2.10.11 structural refinement.
    """
    image_id: str
    pixel_width: int
    pixel_height: int

    # Primary Refined Binary Wall Mask (uint8: 0 or 255)
    refined_wall_mask: np.ndarray

    # Continuous Confidence & Diagnostics
    wall_confidence_map: np.ndarray  # float32 0..1
    wall_centerline_evidence: np.ndarray  # float32 0..1
    junction_evidence: np.ndarray  # float32 0..1
    opening_evidence: np.ndarray  # float32 0..1
    protected_opening_mask: np.ndarray  # uint8 0 or 255

    # Reconstructed Elements
    repaired_gaps: List[CandidateGap] = field(default_factory=list)
    repaired_junctions: List[CandidateJunction] = field(default_factory=list)

    # Metrics
    wall_metrics: WallMetrics = field(default_factory=WallMetrics)
    topology_metrics: TopologyMetrics = field(default_factory=TopologyMetrics)
    opening_metrics: OpeningPreservationMetrics = field(default_factory=OpeningPreservationMetrics)

    # Provenance
    strategy_name: str = "full_refinement"
    execution_time_ms: float = 0.0
    diagnostics: Dict[str, Any] = field(default_factory=dict)
    structural_evidence: Optional[StructuralEvidence] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "imageId": self.image_id,
            "pixelWidth": self.pixel_width,
            "pixelHeight": self.pixel_height,
            "strategyName": self.strategy_name,
            "executionTimeMs": round(self.execution_time_ms, 2),
            "wallMetrics": self.wall_metrics.to_dict(),
            "topologyMetrics": self.topology_metrics.to_dict(),
            "openingMetrics": self.opening_metrics.to_dict(),
            "repairedGapsCount": len(self.repaired_gaps),
            "repairedJunctionsCount": len(self.repaired_junctions),
            "diagnostics": self.diagnostics,
        }
