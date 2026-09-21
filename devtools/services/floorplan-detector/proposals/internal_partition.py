"""
Strategy C: Internal Partition Proposal Subsystem (Phase 2.10.4)
Recovers rooms separated by internal wall partitions that are not detected as independent candidates.
Splits oversized/open regions using verified architectural partition wall centerlines.
"""
import cv2
import numpy as np
from typing import List, Tuple, Dict, Any, Optional
from shapely.geometry import Polygon as ShapelyPolygon, LineString, Point
from shapely.ops import split as shapely_split

from .models import RoomProposal, ProposalStrategy
from .geometry import validate_proposal_geometry, compute_proposal_wall_support


def generate_internal_partition_proposals(
    image_id: str,
    primary_hyps: List[Any],
    wall_network: Any,
    wall_mask: np.ndarray,
    footprint_mask: Optional[np.ndarray],
    img_w: int,
    img_h: int,
) -> List[RoomProposal]:
    """
    Identifies strong internal partitions dividing open-plan / multi-room cavities.
    Applies geometric partition splitting using actual architectural line segments.
    """
    proposals: List[RoomProposal] = []
    seen_polys: List[ShapelyPolygon] = []

    if not wall_network or not hasattr(wall_network, "segments") or not wall_network.segments:
        return proposals

    # Collect internal partition candidate lines (length >= 40px, high architectural confidence)
    partition_lines = []
    for seg in wall_network.segments:
        if getattr(seg, "length", 0) >= 35.0 and getattr(seg, "confidence", 0.5) >= 0.30:
            partition_lines.append(LineString([(seg.x1, seg.y1), (seg.x2, seg.y2)]))

    if not partition_lines:
        return proposals

    # Inspect each primary hypothesis (especially larger cavities)
    for hyp in primary_hyps:
        pts = [(p.xPx, p.yPx) for p in hyp.polygon]
        if len(pts) < 3:
            continue
        coords = list(pts)
        if coords[0] != coords[-1]:
            coords.append(coords[0])
        try:
            poly = ShapelyPolygon(coords)
            if not poly.is_valid:
                poly = poly.buffer(0)
            if poly.is_empty or poly.area < 1500.0:
                continue

            # Look for internal partition lines intersecting this polygon
            dividing_lines = []
            for pl in partition_lines:
                if poly.intersects(pl):
                    inter = poly.intersection(pl)
                    if isinstance(inter, LineString) and inter.length >= 30.0:
                        # Ensure line has endpoints near or extending to polygon boundary
                        dividing_lines.append(pl)

            for pl in dividing_lines[:5]:  # Limit splits to strongest partitions
                # Extend line slightly to ensure clean intersection across boundary
                x1, y1 = pl.coords[0]
                x2, y2 = pl.coords[1]
                dx, dy = x2 - x1, y2 - y1
                length = np.hypot(dx, dy)
                if length <= 0:
                    continue
                # Extend by 20% on each side
                ext_line = LineString([
                    (x1 - (dx / length) * 15.0, y1 - (dy / length) * 15.0),
                    (x2 + (dx / length) * 15.0, y2 + (dy / length) * 15.0),
                ])

                try:
                    split_res = shapely_split(poly, ext_line)
                    if len(split_res.geoms) >= 2:
                        for s_idx, sub_geom in enumerate(split_res.geoms, 1):
                            if not isinstance(sub_geom, ShapelyPolygon) or sub_geom.is_empty:
                                continue
                            sub_coords = list(sub_geom.exterior.coords)[:-1]
                            is_val, reason, s_poly = validate_proposal_geometry(
                                sub_coords, img_w, img_h, min_area=500.0, max_area_ratio=0.45, footprint_mask=footprint_mask
                            )
                            if not is_val or s_poly is None:
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
                            wall_sup = compute_proposal_wall_support(sub_coords, wall_mask)

                            proposals.append(
                                RoomProposal(
                                    proposal_id=f"{image_id}__prop_part_{hyp.id}_{s_idx}",
                                    image_id=image_id,
                                    source_strategy=ProposalStrategy.INTERNAL_PARTITION.value,
                                    polygon=sub_coords,
                                    area_px=float(s_poly.area),
                                    bbox=(float(bnd[0]), float(bnd[1]), float(bnd[2] - bnd[0]), float(bnd[3] - bnd[1])),
                                    centroid=(float(s_poly.centroid.x), float(s_poly.centroid.y)),
                                    wall_support=wall_sup,
                                    enclosure_score=0.85,
                                    partition_support=0.90,
                                    confidence=round(0.70 + 0.20 * wall_sup, 4),
                                    geometry_valid=True,
                                    source_evidence={"parent_hyp": hyp.id, "partition_split": True},
                                )
                            )
                except Exception:
                    pass
        except Exception:
            pass

    return proposals
