"""
Data models and taxonomy for Candidate Ranking & Final Room Formation (Phase 2.10.7).
"""
from dataclasses import dataclass, field
from enum import Enum
from typing import List, Tuple, Dict, Any, Optional, Union
import numpy as np
from shapely.geometry import Polygon as ShapelyPolygon, box


class GraphEdgeType(str, Enum):
    PARENT_OF = "parent_of"
    CHILD_OF = "child_of"
    PARTITION_OF = "partition_of"
    ALTERNATIVE_TO = "alternative_to"
    NEIGHBOR_OF = "neighbor_of"
    OVERLAPS = "overlaps"
    DISJOINT = "disjoint"


class RoomHypothesisState(str, Enum):
    ACTIVE = "active"
    CANDIDATE = "candidate"
    SUPPRESSED = "suppressed"
    SELECTED = "selected"
    REJECTED = "rejected"


@dataclass
class RoomHypothesis:
    """
    Graph node representing a candidate room polygon with architectural features,
    relational connections, and formation scores.
    """
    id: str = ""
    hypothesis_id: str = ""
    source_proposal_id: str = ""
    image_id: str = ""
    polygon: Any = None  # ShapelyPolygon or List[Tuple[float, float]]
    area_px: float = 0.0
    bbox: Tuple[float, float, float, float] = (0.0, 0.0, 0.0, 0.0)
    centroid: Tuple[float, float] = (0.0, 0.0)
    
    # Architectural evidence
    wall_support: float = 0.0
    enclosure_score: float = 0.0
    door_support: float = 0.0
    partition_support: float = 0.0
    repetition_support: float = 0.0
    topology_score: float = 0.0
    boundary_quality: float = 0.0
    compactness: float = 0.0
    corridor_likelihood: float = 0.0
    large_space_likelihood: float = 0.0
    is_corridor: bool = False

    # Negative evidence
    exterior_penalty: float = 0.0
    furniture_penalty: float = 0.0
    text_penalty: float = 0.0
    sliver_penalty: float = 0.0
    evidence: Dict[str, Any] = field(default_factory=dict)

    # Scores
    score: float = 0.0
    architectural_score: float = 0.0
    formation_score: float = 0.0
    final_score: float = 0.0
    confidence: float = 0.5
    state: RoomHypothesisState = RoomHypothesisState.CANDIDATE

    # Graph relationship links (IDs)
    parent_ids: List[str] = field(default_factory=list)
    child_ids: List[str] = field(default_factory=list)
    alternative_ids: List[str] = field(default_factory=list)
    partition_ids: List[str] = field(default_factory=list)
    neighbor_ids: List[str] = field(default_factory=list)

    # Provenance
    source_phase: str = "2.10.6"
    source_strategy: str = "unknown"
    parent_proposal_id: Optional[str] = None
    original_proposal_ids: List[str] = field(default_factory=list)

    def __post_init__(self):
        # Sync id and hypothesis_id
        if not self.id and self.hypothesis_id:
            self.id = self.hypothesis_id
        elif not self.hypothesis_id and self.id:
            self.hypothesis_id = self.id

        # Normalize polygon to ShapelyPolygon internally
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

        if hasattr(self.polygon, "area"):
            if self.area_px <= 0:
                self.area_px = float(self.polygon.area)
            if self.bbox == (0.0, 0.0, 0.0, 0.0):
                minx, miny, maxx, maxy = self.polygon.bounds
                self.bbox = (float(minx), float(miny), float(maxx - minx), float(maxy - miny))
            if self.centroid == (0.0, 0.0):
                c = self.polygon.centroid
                self.centroid = (float(c.x), float(c.y))

        # Sync score and formation_score
        if self.score > 0 and self.formation_score == 0:
            self.formation_score = self.score
            self.final_score = self.score
        elif self.formation_score > 0 and self.score == 0:
            self.score = self.formation_score
            self.final_score = self.formation_score

    @property
    def aspect_ratio(self) -> float:
        pw, ph = self.bbox[2], self.bbox[3]
        return float(max(pw, ph) / max(1.0, min(pw, ph)))

    def to_dict(self) -> Dict[str, Any]:
        poly_coords = []
        if hasattr(self.polygon, "exterior") and self.polygon.exterior is not None:
            poly_coords = [[round(x, 1), round(y, 1)] for x, y in self.polygon.exterior.coords]
        return {
            "hypothesisId": self.hypothesis_id,
            "sourceProposalId": self.source_proposal_id,
            "imageId": self.image_id,
            "polygon": poly_coords,
            "areaPx": round(self.area_px, 1),
            "bbox": [round(v, 1) for v in self.bbox],
            "centroid": [round(v, 1) for v in self.centroid],
            "wallSupport": round(self.wall_support, 4),
            "enclosureScore": round(self.enclosure_score, 4),
            "doorSupport": round(self.door_support, 4),
            "partitionSupport": round(self.partition_support, 4),
            "repetitionSupport": round(self.repetition_support, 4),
            "topologyScore": round(self.topology_score, 4),
            "boundaryQuality": round(self.boundary_quality, 4),
            "compactness": round(self.compactness, 4),
            "corridorLikelihood": round(self.corridor_likelihood, 4),
            "largeSpaceLikelihood": round(self.large_space_likelihood, 4),
            "architecturalScore": round(self.architectural_score, 4),
            "formationScore": round(self.formation_score, 4),
            "finalScore": round(self.final_score, 4),
            "confidence": round(self.confidence, 4),
            "state": self.state.value,
            "parentIds": self.parent_ids,
            "childIds": self.child_ids,
            "alternativeIds": self.alternative_ids,
            "partitionIds": self.partition_ids,
            "neighborIds": self.neighbor_ids,
            "sourcePhase": self.source_phase,
            "sourceStrategy": self.source_strategy,
        }


@dataclass
class HypothesisEdge:
    """
    Relational edge between two RoomHypotheses in the Room Formation Graph.
    """
    edge_type: GraphEdgeType
    source_id: str
    target_id: str
    iou: float = 0.0
    containment_source_in_target: float = 0.0
    containment_target_in_source: float = 0.0
    wall_agreement: float = 0.0
    topology_agreement: float = 0.0
    evidence: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "edgeType": self.edge_type.value,
            "sourceId": self.source_id,
            "targetId": self.target_id,
            "iou": round(self.iou, 4),
            "containmentSourceInTarget": round(self.containment_source_in_target, 4),
            "containmentTargetInSource": round(self.containment_target_in_source, 4),
            "wallAgreement": round(self.wall_agreement, 4),
            "topologyAgreement": round(self.topology_agreement, 4),
            "evidence": self.evidence,
        }


@dataclass
class RoomFormationGraph:
    """
    Represents the complete Room Formation Graph for an image.
    """
    image_id: str = ""
    hypotheses: Dict[str, RoomHypothesis] = field(default_factory=dict)
    edges: List[HypothesisEdge] = field(default_factory=list)

    def add_hypothesis(self, h: RoomHypothesis):
        self.hypotheses[h.id] = h

    def add_edge(self, edge: HypothesisEdge):
        self.edges.append(edge)


@dataclass
class FinalRoom:
    """
    A validated, disjoint architectural room in the final output layout.
    """
    id: str = ""
    room_id: str = ""
    hypothesis_id: str = ""
    image_id: str = ""
    polygon: Any = None
    score: float = 0.0
    confidence: float = 0.5
    architectural_score: float = 0.0
    formation_score: float = 0.0
    is_corridor: bool = False
    evidence: Dict[str, Any] = field(default_factory=dict)
    source_strategy: str = "unknown"
    parent_id: Optional[str] = None
    source_hypotheses: List[str] = field(default_factory=list)
    parent_hypothesis_id: Optional[str] = None
    partition_evidence: float = 0.0
    topology_evidence: float = 0.0
    boundary_quality: float = 0.0

    def __post_init__(self):
        if not self.id and self.room_id:
            self.id = self.room_id
        elif not self.room_id and self.id:
            self.room_id = self.id

        if not self.parent_id and self.parent_hypothesis_id:
            self.parent_id = self.parent_hypothesis_id
        elif not self.parent_hypothesis_id and self.parent_id:
            self.parent_hypothesis_id = self.parent_id

        if self.score > 0 and self.formation_score == 0:
            self.formation_score = self.score
        elif self.formation_score > 0 and self.score == 0:
            self.score = self.formation_score

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

    @property
    def area_px(self) -> float:
        return float(self.polygon.area) if hasattr(self.polygon, "area") else 0.0

    @property
    def centroid(self) -> Tuple[float, float]:
        if hasattr(self.polygon, "centroid"):
            return (float(self.polygon.centroid.x), float(self.polygon.centroid.y))
        return (0.0, 0.0)

    @property
    def bbox(self) -> Tuple[float, float, float, float]:
        if hasattr(self.polygon, "bounds"):
            minx, miny, maxx, maxy = self.polygon.bounds
            return (float(minx), float(miny), float(maxx - minx), float(maxy - miny))
        return (0.0, 0.0, 0.0, 0.0)

    def to_dict(self) -> Dict[str, Any]:
        poly_coords = []
        if hasattr(self.polygon, "exterior") and self.polygon.exterior is not None:
            poly_coords = [[round(x, 1), round(y, 1)] for x, y in self.polygon.exterior.coords]
        return {
            "roomId": self.room_id,
            "hypothesisId": self.hypothesis_id,
            "imageId": self.image_id,
            "polygon": poly_coords,
            "areaPx": round(self.area_px, 1),
            "centroid": [round(v, 1) for v in self.centroid],
            "bbox": [round(v, 1) for v in self.bbox],
            "confidence": round(self.confidence, 4),
            "architecturalScore": round(self.architectural_score, 4),
            "formationScore": round(self.formation_score, 4),
            "isCorridor": self.is_corridor,
            "sourceHypotheses": self.source_hypotheses,
            "parentHypothesisId": self.parent_hypothesis_id,
            "partitionEvidence": round(self.partition_evidence, 4),
            "topologyEvidence": round(self.topology_evidence, 4),
            "boundaryQuality": round(self.boundary_quality, 4),
        }


@dataclass
class FinalRoomLayout:
    """
    A coherent, non-overlapping global arrangement of rooms for an image.
    """
    layout_id: str = "layout_01"
    image_id: str = ""
    rooms: List[FinalRoom] = field(default_factory=list)
    layout_score: float = 0.0
    global_score: float = 0.0
    overlap_ratio: float = 0.0
    coverage_ratio: float = 0.0
    wall_coverage_ratio: float = 0.0
    partition_agreement_score: float = 0.0
    overlap_penalty: float = 0.0
    fragmentation_penalty: float = 0.0
    fragmentation_score: float = 0.0
    max_pairwise_iou: float = 0.0
    confidence: float = 0.5
    rank: int = 1
    provenance: Dict[str, Any] = field(default_factory=dict)

    def __post_init__(self):
        if self.layout_score > 0 and self.global_score == 0:
            self.global_score = self.layout_score
        elif self.global_score > 0 and self.layout_score == 0:
            self.layout_score = self.global_score

        if self.coverage_ratio > 0 and self.wall_coverage_ratio == 0:
            self.wall_coverage_ratio = self.coverage_ratio
        elif self.wall_coverage_ratio > 0 and self.coverage_ratio == 0:
            self.coverage_ratio = self.wall_coverage_ratio

        if self.fragmentation_score > 0 and self.fragmentation_penalty == 0:
            self.fragmentation_penalty = self.fragmentation_score
        elif self.fragmentation_penalty > 0 and self.fragmentation_score == 0:
            self.fragmentation_score = self.fragmentation_penalty

    def to_dict(self) -> Dict[str, Any]:
        return {
            "layoutId": self.layout_id,
            "imageId": self.image_id,
            "roomCount": len(self.rooms),
            "rooms": [r.to_dict() for r in self.rooms],
            "layoutScore": round(self.layout_score, 4),
            "overlapRatio": round(self.overlap_ratio, 4),
            "coverageRatio": round(self.coverage_ratio, 4),
            "fragmentationScore": round(self.fragmentation_score, 4),
            "confidence": round(self.confidence, 4),
            "rank": self.rank,
            "maxPairwiseIoU": round(self.max_pairwise_iou, 4),
            "provenance": self.provenance,
        }
