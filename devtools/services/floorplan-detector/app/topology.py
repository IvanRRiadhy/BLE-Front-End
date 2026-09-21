"""
Phase 2.7.5 Architectural Topology & Room Graph Subsystem
Implements:
- ArchitecturalOpening model & classifier (doors, sliding, balconies, terraces)
- RoomGraph topology (room-to-room, room-to-exterior, corridor connections)
- Gap detection along structural wall endpoints
"""
import cv2
import numpy as np
from typing import List, Tuple, Dict, Any, Optional
from dataclasses import dataclass, field

from .models import DetectionConfig, ArchitecturalOpeningDiagnostics
from .wall_network import WallSegment

@dataclass
class ArchitecturalOpening:
    id: str
    x1: float
    y1: float
    x2: float
    y2: float
    width: float
    orientation: str  # "H", "V", "DIAG"
    opening_type: str = "door"  # "door", "sliding", "balcony", "terrace", "unknown"
    wall_support: float = 0.8
    exterior_contact: bool = False
    confidence: float = 0.8

    def to_diagnostics(self) -> ArchitecturalOpeningDiagnostics:
        return ArchitecturalOpeningDiagnostics(
            id=self.id,
            x1=self.x1,
            y1=self.y1,
            x2=self.x2,
            y2=self.y2,
            width=self.width,
            orientation=self.orientation,
            opening_type=self.opening_type,
            wall_support=self.wall_support,
            exterior_contact=self.exterior_contact,
            confidence=self.confidence,
        )

@dataclass
class RoomGraphNode:
    id: str
    area_id: str
    centroid: Tuple[float, float]
    area_px: float
    is_exterior: bool = False

@dataclass
class RoomGraphEdge:
    id: str
    source_node_id: str
    target_node_id: str
    opening_id: Optional[str] = None
    edge_type: str = "doorway"  # "doorway", "open_archway", "exterior_exposure"

@dataclass
class RoomGraph:
    nodes: List[RoomGraphNode] = field(default_factory=list)
    edges: List[RoomGraphEdge] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "nodes": [
                {
                    "id": n.id,
                    "areaId": n.area_id,
                    "centroid": [round(n.centroid[0], 1), round(n.centroid[1], 1)],
                    "areaPx": round(n.area_px, 1),
                    "isExterior": n.is_exterior,
                }
                for n in self.nodes
            ],
            "edges": [
                {
                    "id": e.id,
                    "source": e.source_node_id,
                    "target": e.target_node_id,
                    "openingId": e.opening_id,
                    "type": e.edge_type,
                }
                for e in self.edges
            ],
        }

def detect_architectural_openings(
    wall_mask: np.ndarray,
    segments: List[WallSegment],
    footprint_mask: Optional[np.ndarray],
    config: DetectionConfig,
) -> List[ArchitecturalOpening]:
    """
    Detects architectural openings (doors, sliding doors, terrace gaps) between collinear wall segments.
    """
    h, w = wall_mask.shape
    openings: List[ArchitecturalOpening] = []
    min_dim = float(min(h, w))

    if not segments:
        return openings

    h_segs = [s for s in segments if s.orientation == "H"]
    v_segs = [s for s in segments if s.orientation == "V"]

    open_idx = 1

    # 1. Detect gaps along horizontal collinear wall lines
    h_segs.sort(key=lambda s: (round((s.y1 + s.y2) / 2.0 / 10.0), min(s.x1, s.x2)))
    for i in range(len(h_segs) - 1):
        s1 = h_segs[i]
        s2 = h_segs[i + 1]
        y1_avg = (s1.y1 + s1.y2) / 2.0
        y2_avg = (s2.y1 + s2.y2) / 2.0

        if abs(y1_avg - y2_avg) < 12.0:
            x1_max = max(s1.x1, s1.x2)
            x2_min = min(s2.x1, s2.x2)
            gap_w = x2_min - x1_max

            # Standard architectural door width relative to image scale (approx 20px .. 180px)
            min_gap_px = max(10, int(min_dim * 0.012))
            max_gap_px = max(160, int(min_dim * 0.10))

            if min_gap_px <= gap_w <= max_gap_px:
                mid_x = (x1_max + x2_min) / 2.0
                mid_y = y1_avg

                # Check if near exterior footprint boundary
                is_ext = False
                if footprint_mask is not None:
                    iy, ix = int(clamp(mid_y, 0, h - 1)), int(clamp(mid_x, 0, w - 1))
                    is_ext = footprint_mask[iy, ix] == 0

                op_type = "door"
                if gap_w > max_gap_px * 0.7:
                    op_type = "terrace" if is_ext else "sliding"

                openings.append(
                    ArchitecturalOpening(
                        id=f"op_{open_idx:03d}",
                        x1=x1_max,
                        y1=mid_y,
                        x2=x2_min,
                        y2=mid_y,
                        width=gap_w,
                        orientation="H",
                        opening_type=op_type,
                        wall_support=0.85,
                        exterior_contact=is_ext,
                        confidence=0.85,
                    )
                )
                open_idx += 1

    # 2. Detect gaps along vertical collinear wall lines
    v_segs.sort(key=lambda s: (round((s.x1 + s.x2) / 2.0 / 10.0), min(s.y1, s.y2)))
    for i in range(len(v_segs) - 1):
        s1 = v_segs[i]
        s2 = v_segs[i + 1]
        x1_avg = (s1.x1 + s1.x2) / 2.0
        x2_avg = (s2.x1 + s2.x2) / 2.0

        if abs(x1_avg - x2_avg) < 12.0:
            y1_max = max(s1.y1, s1.y2)
            y2_min = min(s2.y1, s2.y2)
            gap_h = y2_min - y1_max

            min_gap_px = max(10, int(min_dim * 0.012))
            max_gap_px = max(160, int(min_dim * 0.10))

            if min_gap_px <= gap_h <= max_gap_px:
                mid_x = x1_avg
                mid_y = (y1_max + y2_min) / 2.0

                is_ext = False
                if footprint_mask is not None:
                    iy, ix = int(clamp(mid_y, 0, h - 1)), int(clamp(mid_x, 0, w - 1))
                    is_ext = footprint_mask[iy, ix] == 0

                op_type = "door"
                if gap_h > max_gap_px * 0.7:
                    op_type = "terrace" if is_ext else "sliding"

                openings.append(
                    ArchitecturalOpening(
                        id=f"op_{open_idx:03d}",
                        x1=mid_x,
                        y1=y1_max,
                        x2=mid_x,
                        y2=y2_min,
                        width=gap_h,
                        orientation="V",
                        opening_type=op_type,
                        wall_support=0.85,
                        exterior_contact=is_ext,
                        confidence=0.85,
                    )
                )
                open_idx += 1

    return openings

def seal_doorway_openings(wall_mask: np.ndarray, openings: List[ArchitecturalOpening]) -> np.ndarray:
    """
    Renders virtual doorway sealing lines onto the wall mask to prevent exterior flood fill
    from destroying rooms connected through open exterior doors.
    """
    sealed = wall_mask.copy()
    for op in openings:
        # Seal classified doors or terrace openings
        pt1 = (int(round(op.x1)), int(round(op.y1)))
        pt2 = (int(round(op.x2)), int(round(op.y2)))
        cv2.line(sealed, pt1, pt2, 255, thickness=4)
    return sealed

def clamp(val: float, min_val: float, max_val: float) -> float:
    return max(min_val, min(max_val, val))
