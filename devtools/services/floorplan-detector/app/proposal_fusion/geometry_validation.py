"""
Stage A: Geometry Validation (Phase 2.10.6)
Validates proposals for geometric integrity, rejecting self-intersections, NaNs, and micro-slivers
while preserving architectural irregularities (concave rooms, corridors, L-shapes).
"""
import math
from typing import List, Tuple, Optional
import numpy as np
from shapely.geometry import Polygon as ShapelyPolygon

from .models import FusedProposal


def validate_proposal_geometry(
    prop: FusedProposal,
    img_w: int,
    img_h: int,
    min_area_px: float = 150.0,
    max_area_ratio: float = 0.85,
    max_aspect_ratio: float = 14.0,
    footprint_mask: Optional[np.ndarray] = None,
) -> Tuple[bool, Optional[str], Optional[ShapelyPolygon]]:
    """
    Validates polygon geometry without using Ground Truth.
    Returns: (is_valid, reject_reason, shapely_polygon)
    """
    coords = list(prop.polygon)
    if not coords or len(coords) < 3:
        return False, "insufficient_vertices", None

    # Check for NaN / Inf
    for pt in coords:
        if not math.isfinite(pt[0]) or not math.isfinite(pt[1]):
            return False, "nan_or_inf_coordinates", None

    # Close coords if needed
    closed_coords = list(coords)
    if closed_coords[0] != closed_coords[-1]:
        closed_coords.append(closed_coords[0])

    try:
        poly = ShapelyPolygon(closed_coords)
    except Exception as e:
        return False, f"shapely_initialization_error: {str(e)}", None

    if poly.is_empty:
        return False, "empty_polygon", None

    # Repair simple self-intersections conservatively
    if not poly.is_valid:
        try:
            poly = poly.buffer(0)
            if not poly.is_valid or poly.is_empty:
                return False, "invalid_self_intersecting_geometry", None
        except Exception:
            return False, "self_intersection_repair_failed", None

    # Check if multi-polygon was formed
    if poly.geom_type == "MultiPolygon":
        # Keep largest part if dominant
        parts = sorted(list(poly.geoms), key=lambda g: g.area, reverse=True)
        if len(parts) > 0 and (parts[0].area / max(1.0, poly.area)) >= 0.85:
            poly = parts[0]
        else:
            return False, "disconnected_multipolygon", None

    area = float(poly.area)
    if area < min_area_px:
        return False, f"area_below_minimum ({area:.1f} < {min_area_px})", None

    img_area = float(img_w * img_h)
    if area > (img_area * max_area_ratio):
        return False, f"area_exceeds_maximum_ratio ({area:.1f} > {img_area * max_area_ratio:.1f})", None

    bnd = poly.bounds  # minx, miny, maxx, maxy
    pw = bnd[2] - bnd[0]
    ph = bnd[3] - bnd[1]
    if pw <= 1.0 or ph <= 1.0:
        return False, "zero_width_or_height", None

    # Check bounds against image
    margin = 5.0
    if bnd[0] < -margin or bnd[1] < -margin or bnd[2] > (img_w + margin) or bnd[3] > (img_h + margin):
        return False, "polygon_exceeds_image_bounds", None

    # Aspect ratio check (allow long corridors up to 14.0, but reject extreme slivers)
    aspect_ratio = max(pw, ph) / max(1.0, min(pw, ph))
    if aspect_ratio > max_aspect_ratio:
        return False, f"extreme_aspect_ratio ({aspect_ratio:.1f} > {max_aspect_ratio})", None

    # Compactness (Polsby-Popper score): 4 * pi * Area / (Perimeter^2)
    perimeter = float(poly.length)
    if perimeter > 0:
        compactness = (4.0 * math.pi * area) / (perimeter * perimeter)
    else:
        compactness = 0.0

    # Extremely low compactness (< 0.015) indicates razor slivers
    if compactness < 0.015 and area < 400.0:
        return False, f"sliver_geometry (compactness={compactness:.4f}, area={area:.1f})", None

    # Footprint containment check if available
    if footprint_mask is not None and footprint_mask.any():
        cx = int(np.clip(poly.centroid.x, 0, img_w - 1))
        cy = int(np.clip(poly.centroid.y, 0, img_h - 1))
        if footprint_mask[cy, cx] == 0:
            # Check overlap fraction with building footprint
            # If centroid is outside and polygon mostly outside footprint, reject
            prop.exterior_likelihood = 0.85

    prop.area_px = area
    prop.bbox = (float(bnd[0]), float(bnd[1]), float(pw), float(ph))
    prop.centroid = (float(poly.centroid.x), float(poly.centroid.y))
    prop.compactness = float(np.clip(compactness, 0.0, 1.0))
    if compactness < 0.04:
        prop.sliver_likelihood = float(np.clip(1.0 - (compactness / 0.04), 0.0, 1.0))

    return True, None, poly


def filter_proposal_pool_geometry(
    proposals: List[FusedProposal],
    img_w: int,
    img_h: int,
    footprint_mask: Optional[np.ndarray] = None,
) -> Tuple[List[FusedProposal], List[FusedProposal]]:
    """
    Splits input proposals into valid proposals and rejected proposals.
    """
    valid_list: List[FusedProposal] = []
    rejected_list: List[FusedProposal] = []

    for prop in proposals:
        is_val, reason, _ = validate_proposal_geometry(
            prop=prop,
            img_w=img_w,
            img_h=img_h,
            footprint_mask=footprint_mask,
        )
        prop.is_valid_geometry = is_val
        prop.reject_reason = reason
        if is_val:
            valid_list.append(prop)
        else:
            rejected_list.append(prop)

    return valid_list, rejected_list
