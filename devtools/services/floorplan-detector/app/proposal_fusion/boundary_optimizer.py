"""
Stage E: Boundary Quality Optimization (Phase 2.10.6)
Snaps near-collinear edges, removes micro-spikes, and aligns vertices with strong wall network lines
while enforcing strict area and topology invariants.
"""
from typing import List, Tuple, Dict, Any, Optional
import numpy as np
from shapely.geometry import Polygon as ShapelyPolygon, LineString, Point

from .models import FusedProposal, BoundaryOptimizationResult


def optimize_proposal_boundary(
    prop: FusedProposal,
    wall_mask: Optional[np.ndarray] = None,
    snap_tolerance_px: float = 3.0,
    simplify_tolerance_px: float = 2.0,
    max_area_change_pct: float = 6.0,
) -> Tuple[FusedProposal, BoundaryOptimizationResult]:
    """
    Optimizes proposal polygon boundary safely.
    Rejects optimization if area delta > max_area_change_pct or geometry becomes invalid.
    """
    coords = list(prop.polygon)
    if len(coords) < 3:
        res = BoundaryOptimizationResult(
            proposal_id=prop.proposal_id,
            original_area=prop.area_px,
            optimized_area=prop.area_px,
            area_change_pct=0.0,
            boundary_shift_px=0.0,
            operations_applied=[],
            is_accepted=False,
            rejection_reason="insufficient_vertices",
        )
        return prop, res

    orig_c = list(coords)
    if orig_c[0] != orig_c[-1]:
        orig_c.append(orig_c[0])
    try:
        orig_poly = ShapelyPolygon(orig_c)
        if not orig_poly.is_valid:
            orig_poly = orig_poly.buffer(0)
    except Exception as e:
        res = BoundaryOptimizationResult(
            proposal_id=prop.proposal_id,
            original_area=prop.area_px,
            optimized_area=prop.area_px,
            area_change_pct=0.0,
            boundary_shift_px=0.0,
            operations_applied=[],
            is_accepted=False,
            rejection_reason=f"invalid_original_polygon: {str(e)}",
        )
        return prop, res

    orig_area = float(orig_poly.area)
    ops: List[str] = []

    # Step 1: Gentle Douglas-Peucker simplification to remove collinear/near-collinear vertices
    try:
        opt_poly = orig_poly.simplify(simplify_tolerance_px, preserve_topology=True)
        if opt_poly.is_valid and not opt_poly.is_empty and opt_poly.geom_type == "Polygon":
            ops.append("collinear_vertex_simplification")
        else:
            opt_poly = orig_poly
    except Exception:
        opt_poly = orig_poly

    # Step 2: Snap vertices slightly to strong wall pixels if wall_mask provided
    opt_coords = list(opt_poly.exterior.coords)[:-1]
    if wall_mask is not None and wall_mask.any() and snap_tolerance_px > 0:
        h, w = wall_mask.shape[:2]
        snapped_coords = []
        snap_count = 0
        search_r = int(snap_tolerance_px)

        for x, y in opt_coords:
            ix, iy = int(round(x)), int(round(y))
            if 0 <= ix < w and 0 <= iy < h and wall_mask[iy, ix] > 0:
                # Already on wall
                snapped_coords.append((x, y))
            else:
                # Search neighborhood for wall pixel
                x_min = max(0, ix - search_r)
                x_max = min(w - 1, ix + search_r)
                y_min = max(0, iy - search_r)
                y_max = min(h - 1, iy + search_r)
                patch = wall_mask[y_min:y_max+1, x_min:x_max+1]
                wall_pts = np.argwhere(patch > 0)
                if len(wall_pts) > 0:
                    # Find closest
                    dists = np.hypot(wall_pts[:, 1] + x_min - x, wall_pts[:, 0] + y_min - y)
                    min_idx = np.argmin(dists)
                    if dists[min_idx] <= snap_tolerance_px:
                        snapped_coords.append((float(wall_pts[min_idx, 1] + x_min), float(wall_pts[min_idx, 0] + y_min)))
                        snap_count += 1
                    else:
                        snapped_coords.append((x, y))
                else:
                    snapped_coords.append((x, y))

        if snap_count > 0:
            c_check = list(snapped_coords)
            if c_check[0] != c_check[-1]:
                c_check.append(c_check[0])
            try:
                test_poly = ShapelyPolygon(c_check)
                if test_poly.is_valid and not test_poly.is_empty and test_poly.geom_type == "Polygon":
                    opt_poly = test_poly
                    opt_coords = snapped_coords
                    ops.append(f"wall_vertex_snapping_{snap_count}_pts")
            except Exception:
                pass

    opt_area = float(opt_poly.area)
    area_change_pct = abs(opt_area - orig_area) / max(1.0, orig_area) * 100.0

    # Calculate boundary shift distance (Hausdorff distance)
    try:
        boundary_shift = float(orig_poly.hausdorff_distance(opt_poly))
    except Exception:
        boundary_shift = 0.0

    if area_change_pct > max_area_change_pct:
        res = BoundaryOptimizationResult(
            proposal_id=prop.proposal_id,
            original_area=orig_area,
            optimized_area=opt_area,
            area_change_pct=round(area_change_pct, 2),
            boundary_shift_px=round(boundary_shift, 2),
            operations_applied=ops,
            is_accepted=False,
            rejection_reason=f"area_change_exceeded_threshold ({area_change_pct:.1f}% > {max_area_change_pct:.1f}%)",
        )
        return prop, res

    # Accept optimization
    bnd = opt_poly.bounds
    prop.polygon = opt_coords
    prop.area_px = opt_area
    prop.bbox = (float(bnd[0]), float(bnd[1]), float(bnd[2] - bnd[0]), float(bnd[3] - bnd[1]))
    prop.centroid = (float(opt_poly.centroid.x), float(opt_poly.centroid.y))
    prop.optimization_applied.extend(ops)

    res = BoundaryOptimizationResult(
        proposal_id=prop.proposal_id,
        original_area=orig_area,
        optimized_area=opt_area,
        area_change_pct=round(area_change_pct, 2),
        boundary_shift_px=round(boundary_shift, 2),
        operations_applied=ops,
        is_accepted=True,
    )
    return prop, res
