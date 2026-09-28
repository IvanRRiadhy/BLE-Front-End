"""
Data models and containers for Phase 2.10.10 Targeted Missing-Room Recovery.
Preserves recovery proposal provenance, architectural evidence scores,
and linkage to existing hypotheses and neighboring rooms.
"""
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Set, Tuple
import numpy as np
from shapely.geometry import Polygon as ShapelyPolygon, box


class RecoveryStrategy(str, Enum):
    DOORWAY_RECOVERY = "doorway_recovery"
    PARTITION_RECOVERY = "partition_recovery"
    NEIGHBOR_RECOVERY = "neighbor_recovery"
    REPETITION_RECOVERY = "repetition_recovery"
    WALL_RECONSTRUCTION = "wall_reconstruction"
    COMBINED_RECOVERY = "combined_recovery"


@dataclass
class MissingRoomProposal:
    """
    Candidate proposal reconstructed to recover a previously missing room.
    Does not assume final room validity; remains a hypothesis until selected.
    """
    proposal_id: str
    source_strategy: str
    image_id: str
    polygon: Any  # ShapelyPolygon or list of coordinates
    area_px: float = 0.0
    bbox: Tuple[float, float, float, float] = (0.0, 0.0, 0.0, 0.0)
    centroid: Tuple[float, float] = (0.0, 0.0)

    # Architectural evidence
    wall_support: float = 0.0
    enclosure_score: float = 0.0
    doorway_support: float = 0.0
    neighbor_support: float = 0.0
    partition_support: float = 0.0
    repetition_support: float = 0.0
    boundary_quality: float = 0.8
    envelope_containment: float = 0.0
    confidence: float = 0.7

    # Provenance and linkages
    provenance: str = ""
    parent_hypothesis_ids: List[str] = field(default_factory=list)
    related_room_ids: List[str] = field(default_factory=list)
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

    def to_dict(self) -> Dict[str, Any]:
        coords = []
        if hasattr(self.polygon, "exterior") and self.polygon.exterior:
            coords = [[round(float(c[0]), 2), round(float(c[1]), 2)] for c in self.polygon.exterior.coords]
        return {
            "proposalId": self.proposal_id,
            "sourceStrategy": self.source_strategy,
            "imageId": self.image_id,
            "polygon": coords,
            "areaPx": round(self.area_px, 1),
            "bbox": [round(b, 2) for b in self.bbox],
            "centroid": [round(self.centroid[0], 2), round(self.centroid[1], 2)],
            "wallSupport": round(self.wall_support, 4),
            "enclosureScore": round(self.enclosure_score, 4),
            "doorwaySupport": round(self.doorway_support, 4),
            "neighborSupport": round(self.neighbor_support, 4),
            "partitionSupport": round(self.partition_support, 4),
            "repetitionSupport": round(self.repetition_support, 4),
            "boundaryQuality": round(self.boundary_quality, 4),
            "confidence": round(self.confidence, 4),
            "provenance": self.provenance,
            "parentHypothesisIds": self.parent_hypothesis_ids,
            "relatedRoomIds": self.related_room_ids,
        }


@dataclass
class RecoveryResult:
    """
    Container summarizing the output of targeted missing-room recovery for a floorplan.
    """
    image_id: str
    total_proposals: List[MissingRoomProposal] = field(default_factory=list)
    proposals_by_strategy: Dict[str, List[MissingRoomProposal]] = field(default_factory=dict)
    fused_proposals: List[MissingRoomProposal] = field(default_factory=list)
    duplicates_pruned: int = 0
    execution_time_ms: float = 0.0
