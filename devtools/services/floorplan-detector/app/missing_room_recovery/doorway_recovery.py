"""
Strategy A: Doorway-Anchored Recovery for Phase 2.10.10.
Detects structural situations where a doorway or opening indicates a room boundary
even though a closed polygon was not generated.
Projects rays from doorway anchors along wall orientations to complete logical boundaries.
"""
from typing import List, Dict, Any, Optional, Tuple
import numpy as np
from shapely.geometry import Polygon as ShapelyPolygon, Point, box, LineString
from .models import MissingRoomProposal, RecoveryStrategy


class DoorwayRecoveryEngine:
    """
    Reconstructs candidate room boundaries from doorway anchors and wall segments.
    """

    def __init__(
        self,
        max_ray_distance_px: float = 350.0,
        min_room_area_px: float = 1200.0,
        max_room_area_px: float = 85000.0,
    ):
        self.max_ray_distance_px = max_ray_distance_px
        self.min_room_area_px = min_room_area_px
        self.max_room_area_px = max_room_area_px

    def generate_proposals(
        self,
        image_id: str,
        doors: Optional[List[Any]],
        wall_network: Optional[Any],
        existing_polygons: Optional[List[ShapelyPolygon]] = None,
        img_w: int = 1000,
        img_h: int = 1000,
    ) -> List[MissingRoomProposal]:
        """
        Generates targeted proposals anchored around doorways with incomplete boundaries.
        """
        proposals: List[MissingRoomProposal] = []
        if not doors:
            return proposals

        wall_lines = getattr(wall_network, "wall_lines", []) if wall_network else []
        existing_union = None
        if existing_polygons:
            try:
                from shapely.ops import unary_union
                existing_union = unary_union(existing_polygons)
            except Exception:
                pass

        for d_idx, d in enumerate(doors):
            # Extract doorway centroid
            d_poly = getattr(d, "polygon", None)
            d_box = getattr(d, "bbox", None)
            pt: Optional[Point] = None

            if d_poly is not None and hasattr(d_poly, "centroid"):
                pt = d_poly.centroid
            elif d_box is not None:
                pt = Point(d_box[0] + d_box[2] / 2.0, d_box[1] + d_box[3] / 2.0)
            elif isinstance(d, dict):
                b = d.get("bbox", [0, 0, 10, 10])
                pt = Point(b[0] + b[2] / 2.0, b[1] + b[3] / 2.0)

            if pt is None:
                continue

            # Check if this doorway is already well-covered by existing proposals on both sides
            if existing_union is not None and existing_union.contains(pt.buffer(20.0)):
                # If fully enclosed in existing proposal, skip redundant generation
                continue

            # Project architectural bounding search box anchored at doorway
            # Test expanding in 4 principal directions (Left, Right, Up, Down)
            cx, cy = float(pt.x), float(pt.y)
            orientations = [
                (cx, cy, cx + 180, cy + 180),
                (cx - 180, cy, cx, cy + 180),
                (cx, cy - 180, cx + 180, cy),
                (cx - 180, cy - 180, cx, cy),
                (cx - 120, cy - 120, cx + 120, cy + 120),
            ]

            for o_idx, (x0, y0, x1, y1) in enumerate(orientations):
                x0 = max(20.0, min(img_w - 20.0, x0))
                y0 = max(20.0, min(img_h - 20.0, y0))
                x1 = max(20.0, min(img_w - 20.0, x1))
                y1 = max(20.0, min(img_h - 20.0, y1))
                if (x1 - x0) < 40.0 or (y1 - y0) < 40.0:
                    continue

                poly = box(x0, y0, x1, y1)
                area = float(poly.area)
                if not (self.min_room_area_px <= area <= self.max_room_area_px):
                    continue

                # Measure wall contact along perimeter
                b = poly.boundary
                tot_len = max(1.0, b.length)
                supported_len = 0.0
                if wall_lines:
                    for line in wall_lines:
                        if hasattr(line, "distance") and line.distance(b) <= 12.0:
                            supported_len += min(line.length, tot_len * 0.3)
                    wall_supp = min(1.0, supported_len / tot_len)
                else:
                    wall_supp = 0.65

                # Require minimal architectural wall evidence
                if wall_supp >= 0.25:
                    prop_id = f"rec_door_{d_idx:03d}_{o_idx}"
                    prop = MissingRoomProposal(
                        proposal_id=prop_id,
                        source_strategy=RecoveryStrategy.DOORWAY_RECOVERY.value,
                        image_id=image_id,
                        polygon=poly,
                        area_px=area,
                        wall_support=wall_supp,
                        enclosure_score=min(1.0, wall_supp * 1.2),
                        doorway_support=0.85,
                        confidence=0.75,
                        provenance=f"doorway_anchor_at_({int(cx)},{int(cy)})",
                    )
                    proposals.append(prop)

        return proposals
