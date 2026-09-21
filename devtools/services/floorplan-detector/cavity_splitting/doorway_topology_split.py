"""
Strategy D: Doorway / Topology Split Subsystem (Phase 2.10.5)
Infers room sub-regions from multiple doorway access points and choke points.
"""
from typing import List, Tuple, Dict, Any, Optional
import numpy as np
from shapely.geometry import Polygon as ShapelyPolygon, Point, LineString
from shapely.ops import split as shapely_split

from .models import CavitySplitProposal, SplitStrategy, OversizedCavityAnalysis, FalseSplitCategory
from proposals.geometry import validate_proposal_geometry, compute_proposal_wall_support


def split_cavity_by_doorway_topology(
    image_id: str,
    cavity: OversizedCavityAnalysis,
    openings: List[Any],
    wall_mask: np.ndarray,
    footprint_mask: Optional[np.ndarray],
    img_w: int,
    img_h: int,
) -> List[CavitySplitProposal]:
    """
    Splits an oversized cavity connecting multiple independent doorway access points.
    """
    proposals: List[CavitySplitProposal] = []
    if not cavity.should_split or not openings:
        return proposals

    coords = list(cavity.polygon)
    if coords[0] != coords[-1]:
        coords.append(coords[0])
    try:
        poly = ShapelyPolygon(coords)
        if not poly.is_valid:
            poly = poly.buffer(0)
    except Exception:
        return proposals

    # Find doorways touching this cavity
    touching_doors = []
    for op in openings:
        ox = (getattr(op, "x1", 0) + getattr(op, "x2", 0)) / 2.0
        oy = (getattr(op, "y1", 0) + getattr(op, "y2", 0)) / 2.0
        p = Point(ox, oy)
        if poly.distance(p) < 20.0:
            touching_doors.append((ox, oy))

    if len(touching_doors) < 2:
        return proposals

    # Calculate bisecting line perpendicular to doorway axis between the two furthest doors
    p1 = touching_doors[0]
    p2 = touching_doors[1]
    mid_x = (p1[0] + p2[0]) / 2.0
    mid_y = (p1[1] + p2[1]) / 2.0
    dx = p2[0] - p1[0]
    dy = p2[1] - p1[1]
    length = np.hypot(dx, dy)
    if length < 50.0:
        return proposals

    # Perpendicular vector
    perp_dx = -dy / length
    perp_dy = dx / length
    bnd = poly.bounds
    max_dim = max(bnd[2] - bnd[0], bnd[3] - bnd[1]) * 1.5

    cut_line = LineString([
        (mid_x - perp_dx * max_dim, mid_y - perp_dy * max_dim),
        (mid_x + perp_dx * max_dim, mid_y + perp_dy * max_dim),
    ])

    try:
        res = shapely_split(poly, cut_line)
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
                            proposal_id=f"{cavity.cavity_id}__split_door_{s_idx}",
                            cavity_id=cavity.cavity_id,
                            image_id=image_id,
                            source_strategy=SplitStrategy.DOORWAY_TOPOLOGY_SPLIT.value,
                            polygon=g_coords,
                            area_px=area,
                            bbox=(float(bnd[0]), float(bnd[1]), float(bnd[2] - bnd[0]), float(bnd[3] - bnd[1])),
                            centroid=(float(sp.centroid.x), float(sp.centroid.y)),
                            wall_support=wall_sup,
                            enclosure_score=0.75,
                            door_support=0.85,
                            oversized_ratio=round(area / max(1.0, cavity.area_px), 4),
                            sibling_count=len(valid_subs),
                            confidence=round(0.65 + 0.20 * wall_sup, 4),
                            geometry_valid=True,
                            classification=FalseSplitCategory.VALID_ROOM_SPLIT.value,
                            source_evidence={"door_split": True, "doors_touching": len(touching_doors)},
                        )
                    )
    except Exception:
        pass

    return proposals
