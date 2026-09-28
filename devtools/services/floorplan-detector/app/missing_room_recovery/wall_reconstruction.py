"""
Strategy E: Wall-Based Boundary Reconstruction for Phase 2.10.10.
Performs targeted minimal boundary closing for spaces where structural walls exist
but closed polygon cycles were missed due to small door gaps or broken corners.
Avoids generic planar face flooding.
"""
from typing import List, Dict, Any, Optional, Tuple
import numpy as np
from shapely.geometry import Polygon as ShapelyPolygon, box, LineString, MultiLineString
from shapely.ops import polygonize, unary_union
from .models import MissingRoomProposal, RecoveryStrategy


class WallReconstructionEngine:
    """
    Targeted wall polygonization with gap-closing tolerance.
    """

    def __init__(
        self,
        min_room_area_px: float = 1200.0,
        max_room_area_px: float = 85000.0,
        gap_closing_buffer_px: float = 8.0,
        max_proposals: int = 50,
    ):
        self.min_room_area_px = min_room_area_px
        self.max_room_area_px = max_room_area_px
        self.gap_closing_buffer_px = gap_closing_buffer_px
        self.max_proposals = max_proposals

    def generate_proposals(
        self,
        image_id: str,
        wall_network: Optional[Any],
        existing_polygons: Optional[List[ShapelyPolygon]] = None,
    ) -> List[MissingRoomProposal]:
        """
        Reconstructs minimal closed wall cycles using buffered wall segments.
        """
        proposals: List[MissingRoomProposal] = []
        wall_lines = getattr(wall_network, "wall_lines", []) if wall_network else []
        if not wall_lines:
            return proposals

        # For dense plans, prioritize significant structural wall strokes by length
        if len(wall_lines) > 450:
            wall_lines = sorted(wall_lines, key=lambda l: getattr(l, "length", 0.0), reverse=True)[:450]

        # Dilate lines slightly to bridge small doorway gaps and broken junctions
        try:
            buffered_lines = []
            for line in wall_lines:
                if hasattr(line, "coords") and len(line.coords) >= 2:
                    p0 = line.coords[0]
                    p1 = line.coords[-1]
                    dx = p1[0] - p0[0]
                    dy = p1[1] - p0[1]
                    L = max(1.0, np.sqrt(dx * dx + dy * dy))
                    ext = self.gap_closing_buffer_px
                    ext_line = LineString([
                        (p0[0] - (dx / L) * ext, p0[1] - (dy / L) * ext),
                        (p1[0] + (dx / L) * ext, p1[1] + (dy / L) * ext),
                    ])
                    buffered_lines.append(ext_line)

            # Polygonize extended lines after noding with unary_union
            noded = unary_union(buffered_lines)
            polys = list(polygonize(noded))
            for p_idx, p in enumerate(polys):
                if not isinstance(p, ShapelyPolygon):
                    continue
                area = float(p.area)
                if self.min_room_area_px <= area <= self.max_room_area_px:
                    # Check if already covered by an existing hypothesis
                    is_redundant = False
                    if existing_polygons:
                        for ex in existing_polygons:
                            if not p.envelope.intersects(ex.envelope):
                                continue
                            inter = p.intersection(ex).area
                            if (inter / max(1.0, area)) > 0.80:
                                is_redundant = True
                                break
                    if is_redundant:
                        continue

                    prop_id = f"rec_wall_{p_idx:03d}"
                    prop = MissingRoomProposal(
                        proposal_id=prop_id,
                        source_strategy=RecoveryStrategy.WALL_RECONSTRUCTION.value,
                        image_id=image_id,
                        polygon=p,
                        area_px=area,
                        wall_support=0.85,
                        enclosure_score=0.90,
                        boundary_quality=0.85,
                        confidence=0.80,
                        provenance="extended_wall_junction_closure",
                    )
                    proposals.append(prop)
                    if len(proposals) >= self.max_proposals:
                        break

        except Exception:
            pass

        return proposals
