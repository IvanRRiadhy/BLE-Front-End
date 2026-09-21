"""
Strategy E: Neighboring Room Proposal Subsystem (Phase 2.10.4)
Infers missing rooms adjacent to strong existing rooms along shared wall structures.
"""
import cv2
import numpy as np
from typing import List, Tuple, Dict, Any, Optional
from shapely.geometry import Polygon as ShapelyPolygon, box as ShapelyBox

from .models import RoomProposal, ProposalStrategy
from .geometry import validate_proposal_geometry, compute_proposal_wall_support


def generate_neighboring_room_proposals(
    image_id: str,
    primary_hyps: List[Any],
    wall_network: Any,
    wall_mask: np.ndarray,
    footprint_mask: Optional[np.ndarray],
    img_w: int,
    img_h: int,
) -> List[RoomProposal]:
    """
    Extends strong detected rooms into adjacent unhypothesized wall-enclosed bays.
    """
    proposals: List[RoomProposal] = []
    seen_polys: List[ShapelyPolygon] = []

    if not primary_hyps:
        return proposals

    prim_polys = []
    for hyp in primary_hyps:
        pts = [(p.xPx, p.yPx) for p in hyp.polygon]
        if len(pts) >= 3:
            coords = list(pts)
            if coords[0] != coords[-1]:
                coords.append(coords[0])
            try:
                poly = ShapelyPolygon(coords)
                if not poly.is_valid:
                    poly = poly.buffer(0)
                if not poly.is_empty and poly.area >= 600.0:
                    prim_polys.append((hyp.id, poly))
            except Exception:
                pass

    for hid, poly in prim_polys:
        minx, miny, maxx, maxy = poly.bounds
        w = maxx - minx
        h = maxy - miny

        # Search in 4 cardinal directions adjacent to existing room
        directions = [
            ("east", w, 0.0),
            ("west", -w, 0.0),
            ("south", 0.0, h),
            ("north", 0.0, -h),
        ]

        for direction_name, dx, dy in directions:
            # Check adjacent box
            cand_box = ShapelyBox(minx + dx, miny + dy, maxx + dx, maxy + dy)
            coords = list(cand_box.exterior.coords)[:-1]

            is_val, reason, s_poly = validate_proposal_geometry(
                coords, img_w, img_h, min_area=500.0, max_area_ratio=0.45, footprint_mask=footprint_mask
            )
            if not is_val or s_poly is None:
                continue

            wall_sup = compute_proposal_wall_support(coords, wall_mask)
            if wall_sup < 0.30:
                continue

            # Must not heavily overlap an existing room
            overlap_prim = False
            for _, ex_poly in prim_polys:
                if s_poly.intersects(ex_poly):
                    inter = s_poly.intersection(ex_poly).area
                    union = s_poly.union(ex_poly).area
                    if (inter / union if union > 0 else 0) >= 0.35:
                        overlap_prim = True
                        break
            if overlap_prim:
                continue

            dup = False
            for sp in seen_polys:
                inter = s_poly.intersection(sp).area
                union = s_poly.union(sp).area
                if (inter / union if union > 0 else 0) >= 0.80:
                    dup = True
                    break
            if dup:
                continue

            seen_polys.append(s_poly)
            bnd = s_poly.bounds

            proposals.append(
                RoomProposal(
                    proposal_id=f"{image_id}__prop_nbr_{hid}_{direction_name}",
                    image_id=image_id,
                    source_strategy=ProposalStrategy.NEIGHBORING_ROOM.value,
                    polygon=coords,
                    area_px=float(s_poly.area),
                    bbox=(float(bnd[0]), float(bnd[1]), float(bnd[2] - bnd[0]), float(bnd[3] - bnd[1])),
                    centroid=(float(s_poly.centroid.x), float(s_poly.centroid.y)),
                    wall_support=wall_sup,
                    enclosure_score=0.75,
                    confidence=round(0.62 + 0.25 * wall_sup, 4),
                    geometry_valid=True,
                    source_evidence={"neighbor_of": hid, "direction": direction_name},
                )
            )

    return proposals
