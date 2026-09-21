"""
Strategy D: Repeated Room Proposal Subsystem (Phase 2.10.4)
Detects spatial periodicity and modular bays (modular hotel bays, bedroom grids, repeated office suites).
"""
import cv2
import numpy as np
from typing import List, Tuple, Dict, Any, Optional
from shapely.geometry import Polygon as ShapelyPolygon, box as ShapelyBox

from .models import RoomProposal, ProposalStrategy
from .geometry import validate_proposal_geometry, compute_proposal_wall_support


def generate_repeated_room_proposals(
    image_id: str,
    primary_hyps: List[Any],
    wall_network: Any,
    wall_mask: np.ndarray,
    footprint_mask: Optional[np.ndarray],
    img_w: int,
    img_h: int,
) -> List[RoomProposal]:
    """
    Identifies modular room patterns and replicates candidate bounding shapes
    across repeated wall spacing grids.
    """
    proposals: List[RoomProposal] = []
    seen_polys: List[ShapelyPolygon] = []

    if not primary_hyps:
        return proposals

    # Collect valid primary shapes
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

    if not prim_polys:
        return proposals

    # Analyze regular offsets between existing primary rooms
    centroids = [np.array([poly.centroid.x, poly.centroid.y]) for _, poly in prim_polys]
    offsets = []
    for i in range(len(centroids)):
        for j in range(i + 1, len(centroids)):
            d = centroids[j] - centroids[i]
            dist = np.linalg.norm(d)
            if 60.0 <= dist <= 500.0:
                offsets.append(d)

    if not offsets:
        return proposals

    # Test candidate shifts along dominant grid directions
    for idx, (hid, poly) in enumerate(prim_polys[:10], 1):
        for off in offsets[:8]:
            for sign in [1.0, -1.0]:
                shift_vec = off * sign
                shifted_coords = [(p[0] + shift_vec[0], p[1] + shift_vec[1]) for p in poly.exterior.coords[:-1]]
                is_val, reason, s_poly = validate_proposal_geometry(
                    shifted_coords, img_w, img_h, min_area=500.0, max_area_ratio=0.45, footprint_mask=footprint_mask
                )
                if not is_val or s_poly is None:
                    continue

                # Must have reasonable wall support in the new shifted location
                wall_sup = compute_proposal_wall_support(shifted_coords, wall_mask)
                if wall_sup < 0.28:
                    continue

                # Ensure it doesn't heavily overlap an existing primary
                overlap_prim = False
                for _, ex_poly in prim_polys:
                    if s_poly.intersects(ex_poly):
                        inter = s_poly.intersection(ex_poly).area
                        union = s_poly.union(ex_poly).area
                        if (inter / union if union > 0 else 0) >= 0.50:
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
                        proposal_id=f"{image_id}__prop_rep_{hid}_{len(proposals)+1}",
                        image_id=image_id,
                        source_strategy=ProposalStrategy.REPEATED_ROOM.value,
                        polygon=shifted_coords,
                        area_px=float(s_poly.area),
                        bbox=(float(bnd[0]), float(bnd[1]), float(bnd[2] - bnd[0]), float(bnd[3] - bnd[1])),
                        centroid=(float(s_poly.centroid.x), float(s_poly.centroid.y)),
                        wall_support=wall_sup,
                        enclosure_score=0.75,
                        repetition_support=0.85,
                        confidence=round(0.60 + 0.25 * wall_sup, 4),
                        geometry_valid=True,
                        source_evidence={"seed_hyp": hid, "shift": [float(shift_vec[0]), float(shift_vec[1])]},
                    )
                )

    return proposals
