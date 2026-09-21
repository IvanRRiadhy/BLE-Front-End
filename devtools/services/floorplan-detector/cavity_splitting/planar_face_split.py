"""
Strategy B: Planar Face Split Subsystem (Phase 2.10.5)
Uses enclosed planar faces from the WallNetwork inside an oversized cavity.
"""
from typing import List, Tuple, Dict, Any, Optional
import numpy as np
from shapely.geometry import Polygon as ShapelyPolygon

from .models import CavitySplitProposal, SplitStrategy, OversizedCavityAnalysis, FalseSplitCategory
from proposals.models import RoomProposal
from proposals.geometry import validate_proposal_geometry, compute_proposal_wall_support


def split_cavity_by_planar_faces(
    image_id: str,
    cavity: OversizedCavityAnalysis,
    proposals: List[RoomProposal],
    wall_mask: np.ndarray,
    footprint_mask: Optional[np.ndarray],
    img_w: int,
    img_h: int,
) -> List[CavitySplitProposal]:
    """
    Identifies multiple distinct WallNetwork faces lying inside an oversized cavity.
    """
    split_proposals: List[CavitySplitProposal] = []
    if not cavity.should_split:
        return split_proposals

    coords = list(cavity.polygon)
    if coords[0] != coords[-1]:
        coords.append(coords[0])
    try:
        cav_poly = ShapelyPolygon(coords)
        if not cav_poly.is_valid:
            cav_poly = cav_poly.buffer(0)
    except Exception:
        return split_proposals

    # Filter Strategy A (wall_network_face) proposals that are mostly inside cavity
    matching_faces = []
    for p in proposals:
        if p.source_strategy != "wall_network_face":
            continue
        p_coords = list(p.polygon)
        if len(p_coords) < 3:
            continue
        try:
            sp = ShapelyPolygon(p_coords)
            if not sp.is_valid:
                sp = sp.buffer(0)
            if cav_poly.contains(sp.centroid):
                inter = cav_poly.intersection(sp).area
                ratio = inter / max(1.0, sp.area)
                if ratio >= 0.70 and sp.area < (cavity.area_px * 0.85):
                    matching_faces.append((sp, p))
        except Exception:
            pass

    if len(matching_faces) >= 2:
        for idx, (sp, p) in enumerate(matching_faces, 1):
            g_coords = list(sp.exterior.coords)[:-1]
            bnd = sp.bounds
            wall_sup = compute_proposal_wall_support(g_coords, wall_mask)
            area = float(sp.area)

            split_proposals.append(
                CavitySplitProposal(
                    proposal_id=f"{cavity.cavity_id}__split_face_{idx}",
                    cavity_id=cavity.cavity_id,
                    image_id=image_id,
                    source_strategy=SplitStrategy.PLANAR_FACE_SPLIT.value,
                    polygon=g_coords,
                    area_px=area,
                    bbox=(float(bnd[0]), float(bnd[1]), float(bnd[2] - bnd[0]), float(bnd[3] - bnd[1])),
                    centroid=(float(sp.centroid.x), float(sp.centroid.y)),
                    wall_support=wall_sup,
                    enclosure_score=0.88,
                    oversized_ratio=round(area / max(1.0, cavity.area_px), 4),
                    sibling_count=len(matching_faces),
                    confidence=round(0.72 + 0.20 * wall_sup, 4),
                    geometry_valid=True,
                    classification=FalseSplitCategory.VALID_ROOM_SPLIT.value,
                    source_evidence={"matched_face_id": p.proposal_id},
                )
            )

    return split_proposals
