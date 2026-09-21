"""
Strategy E: Proposal-Guided Split Subsystem (Phase 2.10.5)
Uses sharp, localized Phase 2.10.4 proposals inside an oversized cavity to guide decomposition.
"""
from typing import List, Tuple, Dict, Any, Optional
import numpy as np
from shapely.geometry import Polygon as ShapelyPolygon

from .models import CavitySplitProposal, SplitStrategy, OversizedCavityAnalysis, FalseSplitCategory
from proposals.models import RoomProposal
from proposals.geometry import validate_proposal_geometry, compute_proposal_wall_support


def split_cavity_by_proposals(
    image_id: str,
    cavity: OversizedCavityAnalysis,
    proposals: List[RoomProposal],
    wall_mask: np.ndarray,
    footprint_mask: Optional[np.ndarray],
    img_w: int,
    img_h: int,
) -> List[CavitySplitProposal]:
    """
    Takes high-confidence Phase 2.10.4 proposals located inside the cavity and uses their boundaries
    as sub-room proposals, while validating area and containment.
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

    # Find proposals strictly inside or mostly overlapping the cavity
    contained_props = []
    for p in proposals:
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
                    contained_props.append((sp, p))
        except Exception:
            pass

    # Group by mutual overlap to prevent duplicates
    clusters = []
    for sp, p in contained_props:
        matched = False
        for c in clusters:
            rep_sp, rep_p = c[0]
            inter = sp.intersection(rep_sp).area
            union = sp.union(rep_sp).area
            if (inter / union if union > 0 else 0) >= 0.65:
                c.append((sp, p))
                matched = True
                break
        if not matched:
            clusters.append([(sp, p)])

    if len(clusters) >= 2:
        for idx, c in enumerate(clusters, 1):
            # Pick highest confidence proposal in cluster
            best_sp, best_p = max(c, key=lambda item: item[1].confidence)
            g_coords = list(best_sp.exterior.coords)[:-1]
            bnd = best_sp.bounds
            wall_sup = compute_proposal_wall_support(g_coords, wall_mask)
            area = float(best_sp.area)

            split_proposals.append(
                CavitySplitProposal(
                    proposal_id=f"{cavity.cavity_id}__split_prop_{idx}",
                    cavity_id=cavity.cavity_id,
                    image_id=image_id,
                    source_strategy=SplitStrategy.PROPOSAL_GUIDED_SPLIT.value,
                    polygon=g_coords,
                    area_px=area,
                    bbox=(float(bnd[0]), float(bnd[1]), float(bnd[2] - bnd[0]), float(bnd[3] - bnd[1])),
                    centroid=(float(best_sp.centroid.x), float(best_sp.centroid.y)),
                    wall_support=wall_sup,
                    enclosure_score=0.85,
                    proposal_support=0.95,
                    oversized_ratio=round(area / max(1.0, cavity.area_px), 4),
                    sibling_count=len(clusters),
                    confidence=round(best_p.confidence, 4),
                    geometry_valid=True,
                    classification=FalseSplitCategory.VALID_ROOM_SPLIT.value,
                    source_evidence={"guided_by_proposal": best_p.proposal_id, "cluster_size": len(c)},
                )
            )

    return split_proposals
