"""
Data models for Phase 2.10.8 Room Validity & False Positive Suppression.
"""
from dataclasses import dataclass, field
from enum import Enum
from typing import List, Tuple, Dict, Any, Optional, Union
from shapely.geometry import Polygon as ShapelyPolygon, box
from .false_positive_taxonomy import FalsePositiveReason


class RoomValidityDecision(str, Enum):
    VALID = "VALID"
    PROBABLE_ROOM = "PROBABLE_ROOM"
    AMBIGUOUS = "AMBIGUOUS"
    PROBABLE_NON_ROOM = "PROBABLE_NON_ROOM"
    NON_ROOM = "NON_ROOM"


@dataclass
class RoomValidityHypothesis:
    """
    Hypothesis container for evaluating whether a candidate room polygon
    is a genuine logical architectural room.
    """
    hypothesis_id: str
    image_id: str
    polygon: Any  # ShapelyPolygon or list of coordinates
    area_px: float = 0.0
    bbox: Tuple[float, float, float, float] = (0.0, 0.0, 0.0, 0.0)
    centroid: Tuple[float, float] = (0.0, 0.0)

    # Provenance from Phase 2.10.7
    source_proposal_ids: List[str] = field(default_factory=list)
    source_strategies: List[str] = field(default_factory=list)
    formation_score: float = 0.0
    architectural_score: float = 0.0
    topology_score: float = 0.0
    boundary_quality: float = 0.0
    confidence: float = 0.5

    # Positive Architectural Evidence
    wall_boundary_support: float = 0.0
    wall_junction_support: float = 0.0
    wall_continuity: float = 0.0
    wall_thickness_consistency: float = 0.0
    enclosure_score: float = 0.0
    doorway_count: int = 0
    doorway_evidence: float = 0.0
    doorway_confidence: float = 0.0
    partition_evidence: float = 0.0
    topology_consistency: float = 0.0
    neighbor_consistency: float = 0.0
    room_regularity: float = 0.0
    interior_consistency: float = 0.0
    unsupported_boundary_ratio: float = 0.0

    # Negative Evidence
    exterior_likelihood: float = 0.0
    background_likelihood: float = 0.0
    furniture_likelihood: float = 0.0
    text_likelihood: float = 0.0
    hatch_dimension_likelihood: float = 0.0
    sliver_likelihood: float = 0.0
    artificial_cavity_likelihood: float = 0.0

    # Semantic Classification
    is_corridor: bool = False
    corridor_likelihood: float = 0.0
    is_large_space: bool = False
    large_space_likelihood: float = 0.0
    large_space_artifact_likelihood: float = 0.0

    # Optional ML Evidence (Phase 2.9 RT-DETR)
    ml_wall_support: float = 0.0
    ml_door_support: float = 0.0
    ml_opening_support: float = 0.0
    ml_structural_confidence: float = 0.0
    ml_available: bool = False

    # Composite Validity Scores & Decision
    positive_score: float = 0.0
    negative_score: float = 0.0
    room_validity_score: float = 0.0
    room_likelihood: float = 0.0
    non_room_likelihood: float = 0.0
    ambiguity_score: float = 0.0
    decision: RoomValidityDecision = RoomValidityDecision.AMBIGUOUS
    decision_reason: str = ""
    rejection_reasons: List[FalsePositiveReason] = field(default_factory=list)

    # Raw features dictionary for analysis and auditing
    features: Dict[str, Any] = field(default_factory=dict)

    def __post_init__(self):
        # Normalize polygon to ShapelyPolygon
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
            if self.bbox == (0.0, 0.0, 0.0, 0.0):
                minx, miny, maxx, maxy = self.polygon.bounds
                self.bbox = (float(minx), float(miny), float(maxx - minx), float(maxy - miny))
            if self.centroid == (0.0, 0.0):
                c = self.polygon.centroid
                self.centroid = (float(c.x), float(c.y))

    @property
    def aspect_ratio(self) -> float:
        pw, ph = self.bbox[2], self.bbox[3]
        return float(max(pw, ph) / max(1.0, min(pw, ph)))

    @property
    def compactness(self) -> float:
        if not hasattr(self.polygon, "length") or self.polygon.length <= 0:
            return 0.0
        return float(4.0 * 3.1415926535 * self.area_px / (self.polygon.length ** 2))

    def to_dict(self) -> Dict[str, Any]:
        poly_coords = []
        if hasattr(self.polygon, "exterior") and self.polygon.exterior is not None:
            poly_coords = [[round(x, 1), round(y, 1)] for x, y in self.polygon.exterior.coords]
        return {
            "hypothesisId": self.hypothesis_id,
            "imageId": self.image_id,
            "polygon": poly_coords,
            "areaPx": round(self.area_px, 1),
            "bbox": [round(v, 1) for v in self.bbox],
            "centroid": [round(v, 1) for v in self.centroid],
            "formationScore": round(self.formation_score, 4),
            "roomValidityScore": round(self.room_validity_score, 4),
            "roomLikelihood": round(self.room_likelihood, 4),
            "nonRoomLikelihood": round(self.non_room_likelihood, 4),
            "ambiguityScore": round(self.ambiguity_score, 4),
            "decision": self.decision.value,
            "decisionReason": self.decision_reason,
            "rejectionReasons": [r.value for r in self.rejection_reasons],
            "features": self.features,
        }


@dataclass
class ValidatedRoom:
    """
    Representation of an accepted room passing the room validity gate.
    """
    room_id: str
    hypothesis_id: str
    image_id: str
    polygon: Any
    confidence: float
    room_validity_score: float
    architectural_score: float
    boundary_quality: float
    is_corridor: bool = False
    decision: str = "VALID"
    decision_reasons: List[str] = field(default_factory=list)
    source_hypotheses: List[str] = field(default_factory=list)

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
            "roomValidityScore": round(self.room_validity_score, 4),
            "architecturalScore": round(self.architectural_score, 4),
            "boundaryQuality": round(self.boundary_quality, 4),
            "isCorridor": self.is_corridor,
            "decision": self.decision,
            "decisionReasons": self.decision_reasons,
            "sourceHypotheses": self.source_hypotheses,
        }


@dataclass
class ValidationResult:
    """
    Complete validation result container for an image.
    """
    image_id: str
    valid_rooms: List[ValidatedRoom]
    ambiguous_rooms: List[RoomValidityHypothesis]
    rejected_rooms: List[RoomValidityHypothesis]
    statistics: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "imageId": self.image_id,
            "validRoomCount": len(self.valid_rooms),
            "ambiguousRoomCount": len(self.ambiguous_rooms),
            "rejectedRoomCount": len(self.rejected_rooms),
            "validRooms": [r.to_dict() for r in self.valid_rooms],
            "statistics": self.statistics,
        }
