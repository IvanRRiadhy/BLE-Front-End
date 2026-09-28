"""
Strategy D: Repetition & Architectural Pattern Recovery for Phase 2.10.10.
Detects repeated room patterns (e.g. parallel room grids, aligned bedroom pods,
identical bathroom pods) and projects corresponding candidate proposals.
"""
from typing import List, Dict, Any, Optional, Tuple
import numpy as np
from shapely.geometry import Polygon as ShapelyPolygon, box
from shapely.affinity import translate
from .models import MissingRoomProposal, RecoveryStrategy


class RepetitionRecoveryEngine:
    """
    Detects repeated spatial dimensions and projects repeating candidate modules.
    """

    def __init__(
        self,
        min_area_px: float = 1500.0,
        max_area_px: float = 45000.0,
        max_proposals_per_image: int = 15,
    ):
        self.min_area_px = min_area_px
        self.max_area_px = max_area_px
        self.max_proposals_per_image = max_proposals_per_image

    def generate_proposals(
        self,
        image_id: str,
        existing_rooms: List[ShapelyPolygon],
        wall_network: Optional[Any] = None,
        img_w: int = 1000,
        img_h: int = 1000,
    ) -> List[MissingRoomProposal]:
        """
        Projects modular translations of high-confidence rooms into adjacent empty spaces.
        """
        proposals: List[MissingRoomProposal] = []
        if not existing_rooms:
            return proposals

        wall_lines = getattr(wall_network, "wall_lines", []) if wall_network else []

        # Find typical rectangular modules
        modules: List[ShapelyPolygon] = []
        for poly in existing_rooms:
            if self.min_area_px <= poly.area <= self.max_area_px:
                modules.append(poly)

        if not modules:
            return proposals

        for m_idx, m_poly in enumerate(modules[:5]):
            minx, miny, maxx, maxy = m_poly.bounds
            w = maxx - minx
            h = maxy - miny

            # Test translations: offset by width (horizontal repeat) or height (vertical repeat)
            offsets = [
                (w, 0),
                (-w, 0),
                (0, h),
                (0, -h),
            ]

            for o_idx, (dx, dy) in enumerate(offsets):
                shifted = translate(m_poly, xoff=dx, yoff=dy)
                s_minx, s_miny, s_maxx, s_maxy = shifted.bounds

                if s_minx < 20.0 or s_miny < 20.0 or s_maxx > (img_w - 20.0) or s_maxy > (img_h - 20.0):
                    continue

                # Check if it overlaps heavily with an existing room
                overlaps_existing = any(shifted.intersection(ex).area / max(1.0, shifted.area) > 0.35 for ex in existing_rooms)
                if overlaps_existing:
                    continue

                # Measure wall alignment on shifted module
                b = shifted.boundary
                tot_len = max(1.0, b.length)
                supp_len = 0.0
                if wall_lines:
                    for line in wall_lines:
                        if hasattr(line, "distance") and line.distance(b) <= 10.0:
                            supp_len += min(line.length, tot_len * 0.35)
                    wall_supp = min(1.0, supp_len / tot_len)
                else:
                    wall_supp = 0.55

                if wall_supp >= 0.20:
                    prop_id = f"rec_rep_{m_idx:02d}_{o_idx}"
                    prop = MissingRoomProposal(
                        proposal_id=prop_id,
                        source_strategy=RecoveryStrategy.REPETITION_RECOVERY.value,
                        image_id=image_id,
                        polygon=shifted,
                        area_px=float(shifted.area),
                        wall_support=wall_supp,
                        enclosure_score=0.75,
                        repetition_support=0.85,
                        confidence=0.70,
                        provenance=f"modular_repetition_of_room_{m_idx}_offset_({int(dx)},{int(dy)})",
                    )
                    proposals.append(prop)
                    if len(proposals) >= self.max_proposals_per_image:
                        return proposals

        return proposals
