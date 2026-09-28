"""
Strategy B: Internal Partition Recovery for Phase 2.10.10.
Detects internal partition walls dividing incomplete or oversized structural cavities
and generates non-rectangular, geometrically supported split proposals.
"""
from typing import List, Dict, Any, Optional, Tuple
import numpy as np
from shapely.geometry import Polygon as ShapelyPolygon, box, LineString
from shapely.ops import split
from .models import MissingRoomProposal, RecoveryStrategy


class PartitionRecoveryEngine:
    """
    Splits structural spaces along verified internal partition centerlines.
    """

    def __init__(
        self,
        min_partition_length_px: float = 40.0,
        min_child_area_px: float = 1200.0,
        max_child_area_px: float = 75000.0,
    ):
        self.min_partition_length_px = min_partition_length_px
        self.min_child_area_px = min_child_area_px
        self.max_child_area_px = max_child_area_px

    def generate_proposals(
        self,
        image_id: str,
        wall_network: Optional[Any],
        candidate_polygons: List[ShapelyPolygon],
    ) -> List[MissingRoomProposal]:
        """
        Detects partition lines crossing candidate spaces and generates split proposals.
        """
        proposals: List[MissingRoomProposal] = []
        if not candidate_polygons:
            return proposals

        wall_lines = getattr(wall_network, "wall_lines", []) if wall_network else []
        if not wall_lines:
            return proposals

        for p_idx, poly in enumerate(candidate_polygons):
            if poly.area < (self.min_child_area_px * 2.2):
                continue

            for w_idx, line in enumerate(wall_lines):
                if not hasattr(line, "length") or line.length < self.min_partition_length_px:
                    continue

                if not poly.envelope.intersects(line.envelope):
                    continue

                # Check if partition line passes through internal interior of polygon
                if poly.contains(line) or (poly.intersects(line) and line.intersection(poly).length > self.min_partition_length_px):
                    # Extend line slightly to cleanly divide the polygon
                    p0 = line.coords[0]
                    p1 = line.coords[-1]
                    dx = p1[0] - p0[0]
                    dy = p1[1] - p0[1]
                    ext_line = LineString([(p0[0] - dx * 0.2, p0[1] - dy * 0.2), (p1[0] + dx * 0.2, p1[1] + dy * 0.2)])

                    try:
                        split_res = split(poly, ext_line)
                        if hasattr(split_res, "geoms") and len(split_res.geoms) >= 2:
                            for c_idx, sub_poly in enumerate(split_res.geoms):
                                if isinstance(sub_poly, ShapelyPolygon) and self.min_child_area_px <= sub_poly.area <= self.max_child_area_px:
                                    prop_id = f"rec_part_{p_idx:03d}_{w_idx}_{c_idx}"
                                    prop = MissingRoomProposal(
                                        proposal_id=prop_id,
                                        source_strategy=RecoveryStrategy.PARTITION_RECOVERY.value,
                                        image_id=image_id,
                                        polygon=sub_poly,
                                        area_px=float(sub_poly.area),
                                        wall_support=0.75,
                                        enclosure_score=0.80,
                                        partition_support=0.90,
                                        confidence=0.80,
                                        provenance=f"internal_partition_split_from_cand_{p_idx}",
                                    )
                                    proposals.append(prop)
                    except Exception:
                        continue

        return proposals
