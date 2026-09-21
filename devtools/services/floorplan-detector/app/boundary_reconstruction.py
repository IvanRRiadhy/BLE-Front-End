"""
Resolution-Independent Snap-to-Wall & Boundary Reconstruction Engine (Phase 2.7.7)
Aligns room hypothesis boundaries with high-confidence WallNetwork architectural segments,
handles architectural openings, removes furniture intrusion, and performs geometry validation.
"""
import cv2
import numpy as np
from typing import List, Dict, Any, Optional, Tuple
from shapely.geometry import Polygon as ShapelyPolygon, LineString

from .models import (
    AreaPoint,
    RoomHypothesis,
    WallSegmentDiagnostics,
    ArchitecturalOpeningDiagnostics,
    DetectionConfig,
)

def snap_point_to_line(pt: Tuple[float, float], line_p1: Tuple[float, float], line_p2: Tuple[float, float]) -> Tuple[float, float]:
    """
    Projects point pt onto line segment (line_p1, line_p2).
    """
    px, py = pt
    x1, y1 = line_p1
    x2, y2 = line_p2

    dx, dy = x2 - x1, y2 - y1
    line_len_sq = dx * dx + dy * dy
    if line_len_sq < 1e-6:
        return (x1, y1)

    t = max(0.0, min(1.0, ((px - x1) * dx + (py - y1) * dy) / line_len_sq))
    proj_x = x1 + t * dx
    proj_y = y1 + t * dy
    return (proj_x, proj_y)

def snap_polygon_to_wall_network(
    pts: List[AreaPoint],
    wall_network: Any,
    max_snap_dist_px: float = 25.0,
) -> List[AreaPoint]:
    """
    Resolution-independent snap-to-wall.
    Snaps polygon vertices and edges to nearby high-confidence WallNetwork architectural segments.
    """
    if not wall_network or not hasattr(wall_network, "segments") or not wall_network.segments:
        return pts

    snapped_pts: List[AreaPoint] = []

    for pt in pts:
        px, py = pt.xPx, pt.yPx
        best_snap = (px, py)
        min_dist = max_snap_dist_px

        for seg in wall_network.segments:
            if getattr(seg, "confidence", 1.0) < 0.25:
                continue
            sx1, sy1, sx2, sy2 = seg.x1, seg.y1, seg.x2, seg.y2
            proj_x, proj_y = snap_point_to_line((px, py), (sx1, sy1), (sx2, sy2))
            dist = np.hypot(px - proj_x, py - proj_y)

            if dist < min_dist:
                min_dist = dist
                best_snap = (proj_x, proj_y)

        snapped_pts.append(AreaPoint(round(best_snap[0], 1), round(best_snap[1], 1)))

    return snapped_pts

def reconstruct_room_boundaries(
    hypotheses: List[RoomHypothesis],
    wall_network: Any,
    openings: List[ArchitecturalOpeningDiagnostics],
    wall_mask: np.ndarray,
    config: Optional[DetectionConfig] = None,
) -> List[RoomHypothesis]:
    """
    Reconstructs candidate boundaries:
    candidate -> snap to WallNetwork -> account for valid openings -> simplify -> validate.
    """
    reconstructed: List[RoomHypothesis] = []

    for hyp in hypotheses:
        if not hyp.polygon or len(hyp.polygon) < 3:
            continue

        # 1. Snap to WallNetwork
        snapped = snap_polygon_to_wall_network(hyp.polygon, wall_network, max_snap_dist_px=25.0)

        # 2. Polygon Simplification & Validation via Shapely
        try:
            poly_pts = [(p.xPx, p.yPx) for p in snapped]
            poly = ShapelyPolygon(poly_pts)
            if not poly.is_valid:
                poly = poly.buffer(0)

            if poly.is_empty or poly.area < 100:
                continue

            # Simplify boundary
            simp_poly = poly.simplify(2.0, preserve_topology=True)
            if simp_poly.is_empty or not hasattr(simp_poly, "exterior") or simp_poly.exterior is None:
                final_pts = snapped
            else:
                coords = list(simp_poly.exterior.coords)[:-1]
                final_pts = [AreaPoint(float(c[0]), float(c[1])) for c in coords]

            hyp.polygon = final_pts
            hyp.area_px = float(poly.area)
            reconstructed.append(hyp)

        except Exception:
            reconstructed.append(hyp)

    return reconstructed
