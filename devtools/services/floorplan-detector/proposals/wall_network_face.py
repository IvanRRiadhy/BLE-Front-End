"""
Strategy A: Wall Network Face Proposal Subsystem (Phase 2.10.4)
Extracts planar polygon faces directly from the architectural WallNetwork graph.
"""
import cv2
import numpy as np
from typing import List, Tuple, Dict, Any, Optional
from shapely.geometry import LineString, MultiLineString, Polygon as ShapelyPolygon
from shapely.ops import polygonize, unary_union

from .models import RoomProposal, ProposalStrategy
from .geometry import validate_proposal_geometry, compute_proposal_wall_support


def generate_wall_network_face_proposals(
    image_id: str,
    wall_network: Any,
    wall_mask: np.ndarray,
    footprint_mask: Optional[np.ndarray],
    img_w: int,
    img_h: int,
) -> List[RoomProposal]:
    """
    Extracts closed faces formed by architectural WallNetwork segments.
    Uses polygonize on snapped segments, plus morphological free-space contour extraction.
    """
    proposals: List[RoomProposal] = []
    seen_polys: List[ShapelyPolygon] = []

    lines = []
    if wall_network and hasattr(wall_network, "segments") and wall_network.segments:
        for seg in wall_network.segments:
            if getattr(seg, "confidence", 0.5) >= 0.25:
                lines.append(LineString([(seg.x1, seg.y1), (seg.x2, seg.y2)]))

    # 1. Topological polygonization
    if lines:
        try:
            merged_lines = unary_union(lines)
            faces = list(polygonize(merged_lines))
            for f_idx, face in enumerate(faces, 1):
                if not face.is_valid or face.is_empty:
                    continue
                coords = list(face.exterior.coords)[:-1]
                is_val, reason, s_poly = validate_proposal_geometry(
                    coords, img_w, img_h, min_area=500.0, max_area_ratio=0.50, footprint_mask=footprint_mask
                )
                if not is_val or s_poly is None:
                    continue

                # Deduplicate
                dup = False
                for sp in seen_polys:
                    inter = s_poly.intersection(sp).area
                    union = s_poly.union(sp).area
                    if (inter / union if union > 0 else 0) >= 0.85:
                        dup = True
                        break
                if dup:
                    continue

                seen_polys.append(s_poly)
                area = float(s_poly.area)
                bnd = s_poly.bounds
                centroid = (float(s_poly.centroid.x), float(s_poly.centroid.y))
                wall_sup = compute_proposal_wall_support(coords, wall_mask)

                proposals.append(
                    RoomProposal(
                        proposal_id=f"{image_id}__prop_wnf_topo_{f_idx}",
                        image_id=image_id,
                        source_strategy=ProposalStrategy.WALL_NETWORK_FACE.value,
                        polygon=coords,
                        area_px=area,
                        bbox=(float(bnd[0]), float(bnd[1]), float(bnd[2] - bnd[0]), float(bnd[3] - bnd[1])),
                        centroid=centroid,
                        wall_support=wall_sup,
                        enclosure_score=0.90,
                        confidence=round(0.70 + 0.20 * wall_sup, 4),
                        geometry_valid=True,
                        source_evidence={"method": "topological_polygonize", "face_index": f_idx},
                    )
                )
        except Exception:
            pass

    # 2. Free-space morphological chamber extraction from rasterized wall network
    canvas = np.zeros((img_h, img_w), dtype=np.uint8)
    if lines:
        for seg in wall_network.segments:
            x1, y1, x2, y2 = int(seg.x1), int(seg.y1), int(seg.x2), int(seg.y2)
            cv2.line(canvas, (x1, y1), (x2, y2), 255, thickness=max(3, int(getattr(seg, "thickness", 4))))
    else:
        canvas = wall_mask.copy()

    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    closed = cv2.morphologyEx(canvas, cv2.MORPH_CLOSE, kernel)
    free_space = cv2.bitwise_not(closed)

    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(free_space, connectivity=8)
    for lbl in range(1, num_labels):
        stat = stats[lbl]
        area = stat[cv2.CC_STAT_AREA]
        if area < 500 or area > (img_w * img_h * 0.50):
            continue

        comp = (labels == lbl).astype(np.uint8) * 255
        cnts, _ = cv2.findContours(comp, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not cnts:
            continue
        cnt = max(cnts, key=cv2.contourArea)
        peri = cv2.arcLength(cnt, True)
        approx = cv2.approxPolyDP(cnt, 0.012 * peri, True)
        if len(approx) < 3:
            continue

        pts = [(float(p[0][0]), float(p[0][1])) for p in approx]
        is_val, reason, s_poly = validate_proposal_geometry(
            pts, img_w, img_h, min_area=500.0, max_area_ratio=0.50, footprint_mask=footprint_mask
        )
        if not is_val or s_poly is None:
            continue

        dup = False
        for sp in seen_polys:
            inter = s_poly.intersection(sp).area
            union = s_poly.union(sp).area
            if (inter / union if union > 0 else 0) >= 0.85:
                dup = True
                break
        if dup:
            continue

        seen_polys.append(s_poly)
        bnd = s_poly.bounds
        wall_sup = compute_proposal_wall_support(pts, wall_mask)

        proposals.append(
            RoomProposal(
                proposal_id=f"{image_id}__prop_wnf_morph_{lbl}",
                image_id=image_id,
                source_strategy=ProposalStrategy.WALL_NETWORK_FACE.value,
                polygon=pts,
                area_px=float(s_poly.area),
                bbox=(float(bnd[0]), float(bnd[1]), float(bnd[2] - bnd[0]), float(bnd[3] - bnd[1])),
                centroid=(float(s_poly.centroid.x), float(s_poly.centroid.y)),
                wall_support=wall_sup,
                enclosure_score=0.85,
                confidence=round(0.65 + 0.25 * wall_sup, 4),
                geometry_valid=True,
                source_evidence={"method": "morphological_face", "label": lbl},
            )
        )

    return proposals
