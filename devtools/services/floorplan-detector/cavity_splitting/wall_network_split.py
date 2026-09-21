"""
Strategy A: Wall Network Split Subsystem (Phase 2.10.5)
Splits oversized cavities along verified architectural WallNetwork segment lines.
"""
from typing import List, Tuple, Dict, Any, Optional
import numpy as np
from shapely.geometry import Polygon as ShapelyPolygon, LineString
from shapely.ops import split as shapely_split

from .models import CavitySplitProposal, SplitStrategy, OversizedCavityAnalysis, FalseSplitCategory
from proposals.geometry import validate_proposal_geometry, compute_proposal_wall_support


def split_cavity_by_wall_network(
    image_id: str,
    cavity: OversizedCavityAnalysis,
    wall_network: Any,
    wall_mask: np.ndarray,
    footprint_mask: Optional[np.ndarray],
    img_w: int,
    img_h: int,
) -> List[CavitySplitProposal]:
    """
    Splits an oversized cavity polygon using internal architectural WallNetwork segments.
    """
    proposals: List[CavitySplitProposal] = []
    if not cavity.should_split:
        return proposals

    coords = list(cavity.polygon)
    if coords[0] != coords[-1]:
        coords.append(coords[0])
    try:
        poly = ShapelyPolygon(coords)
        if not poly.is_valid:
            poly = poly.buffer(0)
        if poly.is_empty:
            return proposals
    except Exception:
        return proposals

    if not wall_network or not hasattr(wall_network, "segments"):
        return proposals

    # Find internal wall segments
    internal_segs = []
    for seg in wall_network.segments:
        if getattr(seg, "confidence", 0.5) < 0.25:
            continue
        ls = LineString([(seg.x1, seg.y1), (seg.x2, seg.y2)])
        if poly.intersects(ls):
            inter = poly.intersection(ls)
            if isinstance(inter, LineString) and inter.length >= 35.0:
                internal_segs.append(ls)

    if not internal_segs:
        return proposals

    # Sort descending by length
    internal_segs.sort(key=lambda s: s.length, reverse=True)

    # Use strongest internal line to perform split
    for seg_idx, split_line in enumerate(internal_segs[:3], 1):
        x1, y1 = split_line.coords[0]
        x2, y2 = split_line.coords[1]
        dx, dy = x2 - x1, y2 - y1
        length = np.hypot(dx, dy)
        if length <= 0:
            continue
        # Extend line endpoints by 25px to ensure clean boundary intersection
        ext_line = LineString([
            (x1 - (dx / length) * 25.0, y1 - (dy / length) * 25.0),
            (x2 + (dx / length) * 25.0, y2 + (dy / length) * 25.0),
        ])

        try:
            res = shapely_split(poly, ext_line)
            if len(res.geoms) >= 2:
                valid_subs = []
                for s_idx, geom in enumerate(res.geoms, 1):
                    if not isinstance(geom, ShapelyPolygon) or geom.is_empty:
                        continue
                    g_coords = list(geom.exterior.coords)[:-1]
                    is_val, reason, sp = validate_proposal_geometry(
                        g_coords, img_w, img_h, min_area=350.0, max_area_ratio=0.55, footprint_mask=footprint_mask
                    )
                    if not is_val or sp is None:
                        continue
                    valid_subs.append((g_coords, sp))

                if len(valid_subs) >= 2:
                    for s_idx, (g_coords, sp) in enumerate(valid_subs, 1):
                        bnd = sp.bounds
                        wall_sup = compute_proposal_wall_support(g_coords, wall_mask)
                        area = float(sp.area)
                        proposals.append(
                            CavitySplitProposal(
                                proposal_id=f"{cavity.cavity_id}__split_wns_{seg_idx}_{s_idx}",
                                cavity_id=cavity.cavity_id,
                                image_id=image_id,
                                source_strategy=SplitStrategy.WALL_NETWORK_SPLIT.value,
                                polygon=g_coords,
                                area_px=area,
                                bbox=(float(bnd[0]), float(bnd[1]), float(bnd[2] - bnd[0]), float(bnd[3] - bnd[1])),
                                centroid=(float(sp.centroid.x), float(sp.centroid.y)),
                                wall_support=wall_sup,
                                enclosure_score=0.85,
                                oversized_ratio=round(area / max(1.0, cavity.area_px), 4),
                                sibling_count=len(valid_subs),
                                confidence=round(0.70 + 0.20 * wall_sup, 4),
                                geometry_valid=True,
                                classification=FalseSplitCategory.VALID_ROOM_SPLIT.value,
                                source_evidence={"split_segment_index": seg_idx, "sub_index": s_idx},
                            )
                        )
                    break  # Primary clean split found
        except Exception:
            pass

    return proposals
