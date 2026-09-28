"""
Strategy C: Neighbor-Based Recovery for Phase 2.10.10.
Identifies unrepresented structural gaps between validated room hypotheses
and projects logical spaces bounded by neighbor walls and boundaries.
"""
from typing import List, Dict, Any, Optional, Tuple
import numpy as np
from shapely.geometry import Polygon as ShapelyPolygon, box, MultiPolygon
from shapely.ops import unary_union
from .models import MissingRoomProposal, RecoveryStrategy


class NeighborRecoveryEngine:
    """
    Recovers missing spaces located in gaps between existing validated neighbor rooms.
    """

    def __init__(
        self,
        min_gap_area_px: float = 1200.0,
        max_gap_area_px: float = 65000.0,
    ):
        self.min_gap_area_px = min_gap_area_px
        self.max_gap_area_px = max_gap_area_px

    def generate_proposals(
        self,
        image_id: str,
        validated_rooms: List[ShapelyPolygon],
        footprint_mask: Optional[np.ndarray] = None,
        img_w: int = 1000,
        img_h: int = 1000,
    ) -> List[MissingRoomProposal]:
        """
        Computes residual unrepresented regions inside the building footprint.
        """
        proposals: List[MissingRoomProposal] = []
        if not validated_rooms:
            return proposals

        try:
            rooms_union = unary_union(validated_rooms)
            if not rooms_union.is_valid:
                rooms_union = rooms_union.buffer(0)

            # Footprint bounding envelope
            minx, miny, maxx, maxy = rooms_union.bounds
            # Expand bounding box slightly to capture perimeter gaps
            margin = 30.0
            bbox_poly = box(
                max(20.0, minx - margin),
                max(20.0, miny - margin),
                min(img_w - 20.0, maxx + margin),
                min(img_h - 20.0, maxy + margin),
            )

            # Compute gap spaces (complement)
            gap_geom = bbox_poly.difference(rooms_union)

            geoms = []
            if isinstance(gap_geom, Polygon := ShapelyPolygon):
                geoms = [gap_geom]
            elif isinstance(gap_geom, MultiPolygon):
                geoms = list(gap_geom.geoms)

            for g_idx, g in enumerate(geoms):
                if not isinstance(g, ShapelyPolygon):
                    continue
                area = float(g.area)
                if self.min_gap_area_px <= area <= self.max_gap_area_px:
                    # Filter out thin long slivers
                    perim = max(1.0, float(g.boundary.length))
                    comp = (4.0 * np.pi * area) / (perim * perim)
                    if comp < 0.08:
                        continue

                    prop_id = f"rec_neigh_{g_idx:03d}"
                    prop = MissingRoomProposal(
                        proposal_id=prop_id,
                        source_strategy=RecoveryStrategy.NEIGHBOR_RECOVERY.value,
                        image_id=image_id,
                        polygon=g,
                        area_px=area,
                        wall_support=0.70,
                        enclosure_score=0.75,
                        neighbor_support=0.85,
                        confidence=0.75,
                        provenance=f"structural_gap_between_neighbor_rooms",
                    )
                    proposals.append(prop)

        except Exception:
            pass

        return proposals
