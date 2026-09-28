"""
Data models and containers for Phase 2.10.9 Global Room Synthesis.
Preserves hypothesis provenance, directional graph relationships, doorway context,
cavity context, neighbor context, partition context, alternative groups,
and multi-hypothesis room configurations.
"""
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Set, Tuple
import numpy as np
from shapely.geometry import Polygon as ShapelyPolygon, box


class RelationshipType(str, Enum):
    PARENT_OF = "PARENT_OF"
    CHILD_OF = "CHILD_OF"
    PARTITION_OF = "PARTITION_OF"
    ALTERNATIVE_TO = "ALTERNATIVE_TO"
    NEIGHBOR_OF = "NEIGHBOR_OF"
    DOOR_CONNECTED_TO = "DOOR_CONNECTED_TO"
    OVERLAPS = "OVERLAPS"
    CONTAINS = "CONTAINS"
    CONTAINED_BY = "CONTAINED_BY"
    TOUCHES = "TOUCHES"
    EXTERIOR_CONNECTED = "EXTERIOR_CONNECTED"
    CAVITY_OF = "CAVITY_OF"
    DISJOINT = "DISJOINT"


@dataclass
class RoomHypothesis:
    """
    Rich hypothesis container for Global Room Synthesis.
    Preserves source provenance, Phase 2.10.8 validity evidence,
    and relational graph connections.
    """
    hypothesis_id: str
    image_id: str
    polygon: Any  # ShapelyPolygon or list of coordinates
    area_px: float = 0.0
    centroid: Tuple[float, float] = (0.0, 0.0)
    bbox: Tuple[float, float, float, float] = (0.0, 0.0, 0.0, 0.0)

    # Source provenance
    source_proposal_ids: List[str] = field(default_factory=list)
    source_strategy: str = ""
    formation_source: str = ""
    validity_decision: str = "VALID"
    validity_score: float = 0.5
    confidence: float = 0.5

    # Architectural evidence
    wall_support: float = 0.0
    enclosure_score: float = 0.0
    doorway_support: float = 0.0
    doorway_count: int = 0
    partition_support: float = 0.0
    topology_support: float = 0.0
    neighbor_support: float = 0.0
    exterior_support: float = 0.0
    boundary_quality: float = 0.8
    room_regularity: float = 0.7
    compactness: float = 0.5
    aspect_ratio: float = 1.0

    # Negative evidence & penalties
    cavity_likelihood: float = 0.0
    artificial_cavity_likelihood: float = 0.0
    exterior_likelihood: float = 0.0
    sliver_likelihood: float = 0.0
    unsupported_boundary_ratio: float = 0.0

    # Semantic flags
    is_corridor: bool = False
    is_large_space: bool = False

    # Relational pointers
    hypothesis_group_id: str = ""
    alternative_group_id: str = ""
    parent_id: Optional[str] = None
    child_ids: List[str] = field(default_factory=list)
    neighbor_ids: List[str] = field(default_factory=list)
    doorway_ids: List[str] = field(default_factory=list)
    partition_ids: List[str] = field(default_factory=list)
    alternative_ids: List[str] = field(default_factory=list)

    # ML structural support (optional Phase 2.9)
    ml_wall_support: float = 0.0
    ml_door_support: float = 0.0
    ml_available: bool = False

    # Diagnostic metadata
    metadata: Dict[str, Any] = field(default_factory=dict)

    def __post_init__(self):
        if isinstance(self.polygon, list):
            if len(self.polygon) >= 3:
                clist = list(self.polygon)
                if clist[0] != clist[-1]:
                    clist.append(clist[0])
                try:
                    self.polygon = ShapelyPolygon(clist)
                except Exception:
                    self.polygon = box(0, 0, 10, 10)
            else:
                self.polygon = box(0, 0, 10, 10)
        elif self.polygon is None:
            self.polygon = box(0, 0, 10, 10)

        if hasattr(self.polygon, "is_valid") and not self.polygon.is_valid:
            try:
                self.polygon = self.polygon.buffer(0)
            except Exception:
                pass

        if hasattr(self.polygon, "area"):
            if self.area_px <= 0:
                self.area_px = float(self.polygon.area)
            if self.centroid == (0.0, 0.0) and not self.polygon.is_empty:
                c = self.polygon.centroid
                self.centroid = (float(c.x), float(c.y))
            if self.bbox == (0.0, 0.0, 0.0, 0.0) and not self.polygon.is_empty:
                minx, miny, maxx, maxy = self.polygon.bounds
                self.bbox = (float(minx), float(miny), float(maxx - minx), float(maxy - miny))
            
            perim = max(1.0, float(self.polygon.boundary.length))
            self.compactness = float((4.0 * np.pi * self.area_px) / (perim * perim))
            w = max(1.0, self.bbox[2])
            h = max(1.0, self.bbox[3])
            self.aspect_ratio = float(max(w, h) / min(w, h))

    def to_dict(self) -> Dict[str, Any]:
        coords = []
        if hasattr(self.polygon, "exterior") and self.polygon.exterior:
            coords = [[round(float(c[0]), 2), round(float(c[1]), 2)] for c in self.polygon.exterior.coords]
        return {
            "hypothesisId": self.hypothesis_id,
            "imageId": self.image_id,
            "polygon": coords,
            "areaPx": round(self.area_px, 1),
            "centroid": [round(self.centroid[0], 2), round(self.centroid[1], 2)],
            "bbox": [round(b, 2) for b in self.bbox],
            "validityScore": round(self.validity_score, 4),
            "validityDecision": self.validity_decision,
            "wallSupport": round(self.wall_support, 4),
            "doorwaySupport": round(self.doorway_support, 4),
            "doorwayCount": self.doorway_count,
            "cavityLikelihood": round(self.cavity_likelihood, 4),
            "artificialCavityLikelihood": round(self.artificial_cavity_likelihood, 4),
            "isCorridor": self.is_corridor,
            "parentHypothesisId": self.parent_id,
            "childIds": self.child_ids,
            "neighborIds": self.neighbor_ids,
            "alternativeIds": self.alternative_ids,
        }


@dataclass
class HypothesisRelationship:
    """
    Directional relational edge between two room hypotheses.
    """
    source_id: str
    target_id: str
    rel_type: RelationshipType
    confidence: float = 1.0
    shared_length: float = 0.0
    overlap_iou: float = 0.0
    doorway_id: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "sourceId": self.source_id,
            "targetId": self.target_id,
            "relType": self.rel_type.value,
            "confidence": round(self.confidence, 4),
            "sharedLength": round(self.shared_length, 2),
            "overlapIou": round(self.overlap_iou, 4),
            "doorwayId": self.doorway_id,
        }


@dataclass
class DoorwayContext:
    """
    Doorway contextual relationship connecting rooms or exterior.
    """
    doorway_id: str
    source: str = "detection"
    confidence: float = 0.8
    position: Tuple[float, float] = (0.0, 0.0)
    width: float = 30.0
    orientation: float = 0.0
    connected_hypotheses: List[str] = field(default_factory=list)
    exterior_connection: bool = False
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "doorwayId": self.doorway_id,
            "confidence": round(self.confidence, 4),
            "position": [round(self.position[0], 2), round(self.position[1], 2)],
            "connectedHypotheses": self.connected_hypotheses,
            "exteriorConnection": self.exterior_connection,
        }


@dataclass
class CavityContext:
    """
    Detailed cavity context for an enclosed candidate.
    """
    hypothesis_id: str
    enclosure_score: float = 0.0
    wall_support: float = 0.0
    doorway_count: int = 0
    meaningful_opening_count: int = 0
    neighbor_count: int = 0
    exterior_connection: bool = False
    internal_wall_count: int = 0
    cavity_depth: float = 0.0
    cavity_area: float = 0.0
    artificial_cavity_likelihood: float = 0.0
    is_fully_walled_without_openings: bool = False

    def to_dict(self) -> Dict[str, Any]:
        return {
            "hypothesisId": self.hypothesis_id,
            "enclosureScore": round(self.enclosure_score, 4),
            "wallSupport": round(self.wall_support, 4),
            "doorwayCount": self.doorway_count,
            "neighborCount": self.neighbor_count,
            "exteriorConnection": self.exterior_connection,
            "artificialCavityLikelihood": round(self.artificial_cavity_likelihood, 4),
            "isFullyWalledWithoutOpenings": self.is_fully_walled_without_openings,
        }


@dataclass
class NeighborContext:
    """
    Adjacency and topology details between neighboring candidates.
    """
    hypothesis_a_id: str
    hypothesis_b_id: str
    shared_wall_length: float = 0.0
    shared_boundary_ratio: float = 0.0
    has_connecting_doorway: bool = False
    doorway_id: Optional[str] = None
    distance_px: float = 0.0
    neighbor_validity: float = 0.5


@dataclass
class PartitionContext:
    """
    Partition details dividing parent cavities into child hypotheses.
    """
    partition_id: str
    parent_id: str
    child_ids: List[str] = field(default_factory=list)
    partition_confidence: float = 0.7
    wall_support: float = 0.5
    has_doorway: bool = False
    resulting_child_count: int = 0


@dataclass
class AlternativeGroup:
    """
    Group of mutually exclusive competing interpretations.
    """
    group_id: str
    image_id: str
    competing_hypothesis_ids: List[str] = field(default_factory=list)
    spatial_arena_id: str = ""
    description: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "groupId": self.group_id,
            "spatialArenaId": self.spatial_arena_id,
            "competingHypothesisIds": self.competing_hypothesis_ids,
            "description": self.description,
        }


@dataclass
class RoomConfiguration:
    """
    A candidate configuration representing one possible complete floorplan interpretation.
    """
    configuration_id: str
    image_id: str
    hypotheses: List[RoomHypothesis] = field(default_factory=list)

    # Component scores (transparent)
    architectural_score: float = 0.0
    doorway_score: float = 0.0
    topology_score: float = 0.0
    neighbor_score: float = 0.0
    partition_score: float = 0.0
    coverage_score: float = 0.0

    # Negative penalties
    cavity_penalty: float = 0.0
    overlap_penalty: float = 0.0
    contradiction_penalty: float = 0.0
    complexity_penalty: float = 0.0

    # Composite global score
    global_score: float = 0.0
    is_valid_layout: bool = True
    rejection_reasons: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "configurationId": self.configuration_id,
            "imageId": self.image_id,
            "roomCount": len(self.hypotheses),
            "globalScore": round(self.global_score, 4),
            "architecturalScore": round(self.architectural_score, 4),
            "doorwayScore": round(self.doorway_score, 4),
            "topologyScore": round(self.topology_score, 4),
            "neighborScore": round(self.neighbor_score, 4),
            "coverageScore": round(self.coverage_score, 4),
            "cavityPenalty": round(self.cavity_penalty, 4),
            "overlapPenalty": round(self.overlap_penalty, 4),
            "complexityPenalty": round(self.complexity_penalty, 4),
            "isValidLayout": self.is_valid_layout,
            "rooms": [h.to_dict() for h in self.hypotheses],
        }


@dataclass
class SynthesisResult:
    """
    End-to-end result of global room synthesis.
    """
    image_id: str
    selected_rooms: List[RoomHypothesis] = field(default_factory=list)
    selected_configuration: Optional[RoomConfiguration] = None
    all_configurations: List[RoomConfiguration] = field(default_factory=list)
    alternative_groups: List[AlternativeGroup] = field(default_factory=list)
    relationships: List[HypothesisRelationship] = field(default_factory=list)
    doorway_contexts: List[DoorwayContext] = field(default_factory=list)
    cavity_contexts: List[CavityContext] = field(default_factory=list)
    execution_time_ms: float = 0.0
