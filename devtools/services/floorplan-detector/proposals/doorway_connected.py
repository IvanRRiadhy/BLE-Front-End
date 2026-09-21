"""
Strategy B: Doorway-Connected Proposal Subsystem (Phase 2.10.4)
Recovers missing room boundaries by bridging architectural doorway openings.
"""
import cv2
import numpy as np
from typing import List, Tuple, Dict, Any, Optional
from shapely.geometry import Polygon as ShapelyPolygon

from .models import RoomProposal, ProposalStrategy
from .geometry import validate_proposal_geometry, compute_proposal_wall_support


def generate_doorway_connected_proposals(
    image_id: str,
    openings: List[Any],
    wall_network: Any,
    wall_mask: np.ndarray,
    footprint_mask: Optional[np.ndarray],
    img_w: int,
    img_h: int,
) -> List[RoomProposal]:
    """
    Uses detected architectural openings/doorways to infer room boundaries.
    Virtually seals the opening gap on the wall mask to restore unbroken flood-fill chambers.
    """
    proposals: List[RoomProposal] = []
    seen_polys: List[ShapelyPolygon] = []

    if not openings:
        return proposals

    # Create a canvas with doorways closed/bridged
    sealed_canvas = wall_mask.copy()
    for op in openings:
        x1 = int(getattr(op, "x1", 0))
        y1 = int(getattr(op, "y1", 0))
        x2 = int(getattr(op, "x2", 0))
        y2 = int(getattr(op, "y2", 0))
        # Draw a virtual bridge across the doorway opening
        cv2.line(sealed_canvas, (x1, y1), (x2, y2), 255, thickness=6)

    # Perform morphological closing to seal connected loops
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (7, 7))
    closed_walls = cv2.morphologyEx(sealed_canvas, cv2.MORPH_CLOSE, kernel)
    free_space = cv2.bitwise_not(closed_walls)

    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(free_space, connectivity=8)
    for lbl in range(1, num_labels):
        stat = stats[lbl]
        area = stat[cv2.CC_STAT_AREA]
        if area < 600 or area > (img_w * img_h * 0.45):
            continue

        comp = (labels == lbl).astype(np.uint8) * 255
        cnts, _ = cv2.findContours(comp, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not cnts:
            continue
        cnt = max(cnts, key=cv2.contourArea)
        peri = cv2.arcLength(cnt, True)
        approx = cv2.approxPolyDP(cnt, 0.015 * peri, True)
        if len(approx) < 3:
            continue

        pts = [(float(p[0][0]), float(p[0][1])) for p in approx]
        is_val, reason, s_poly = validate_proposal_geometry(
            pts, img_w, img_h, min_area=600.0, max_area_ratio=0.45, footprint_mask=footprint_mask
        )
        if not is_val or s_poly is None:
            continue

        # Check contact with at least one doorway opening
        door_touch = False
        for op in openings:
            ox = (getattr(op, "x1", 0) + getattr(op, "x2", 0)) / 2.0
            oy = (getattr(op, "y1", 0) + getattr(op, "y2", 0)) / 2.0
            from shapely.geometry import Point
            if s_poly.distance(Point(ox, oy)) < 15.0:
                door_touch = True
                break

        if not door_touch:
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
        wall_sup = compute_proposal_wall_support(pts, wall_mask)

        proposals.append(
            RoomProposal(
                proposal_id=f"{image_id}__prop_doorway_{lbl}",
                image_id=image_id,
                source_strategy=ProposalStrategy.DOORWAY_CONNECTED.value,
                polygon=pts,
                area_px=float(s_poly.area),
                bbox=(float(bnd[0]), float(bnd[1]), float(bnd[2] - bnd[0]), float(bnd[3] - bnd[1])),
                centroid=(float(s_poly.centroid.x), float(s_poly.centroid.y)),
                wall_support=wall_sup,
                enclosure_score=0.80,
                door_support=0.85,
                confidence=round(0.68 + 0.20 * wall_sup, 4),
                geometry_valid=True,
                source_evidence={"door_touch": True, "label": lbl},
            )
        )

    return proposals
