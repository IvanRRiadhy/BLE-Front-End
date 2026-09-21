"""
Phase 2.10.1 Distance Analysis Subsystem
Computes Euclidean distance transforms from architectural walls and measures
detailed spatial metrics for each detected text region.
"""
from typing import List, Tuple, Dict, Any, Optional
import cv2
import numpy as np
from shapely.geometry import Polygon as ShapelyPolygon

from .models import TextRegion


def compute_wall_distance_map(wall_mask: np.ndarray) -> np.ndarray:
    """
    Computes Euclidean distance transform (L2 metric) from wall boundaries.
    For each pixel (y, x), dist_map[y, x] represents the shortest distance in pixels
    to the nearest wall pixel (where wall_mask > 0).
    """
    if wall_mask is None or wall_mask.size == 0:
        return np.zeros((0, 0), dtype=np.float32)

    h, w = wall_mask.shape[:2]
    # Invert: distance is computed from non-zero wall pixels
    wall_binary = (wall_mask > 0).astype(np.uint8) * 255
    if np.count_nonzero(wall_binary) == 0:
        return np.full((h, w), 9999.0, dtype=np.float32)

    free_space = cv2.bitwise_not(wall_binary)
    dist_map = cv2.distanceTransform(free_space, cv2.DIST_L2, 5)
    return dist_map.astype(np.float32)


def extract_local_wall_thickness(
    wall_network: Optional[Any],
    region_bbox: Tuple[int, int, int, int],
    fallback_thickness: float = 10.0,
) -> float:
    """
    Extracts local architectural wall thickness around a text region
    from the existing WallNetwork graph segments.
    """
    if wall_network is None or not hasattr(wall_network, "segments") or not wall_network.segments:
        return float(fallback_thickness)

    rx, ry, rw, rh = region_bbox
    rcx, rcy = rx + rw / 2.0, ry + rh / 2.0
    search_radius = max(80.0, max(rw, rh) * 1.5)

    nearby_thicknesses: List[float] = []
    for seg in wall_network.segments:
        # Distance from segment midpoint to text center
        scx = (seg.x1 + seg.x2) / 2.0
        scy = (seg.y1 + seg.y2) / 2.0
        d = float(np.hypot(rcx - scx, rcy - scy))
        if d <= search_radius:
            t = getattr(seg, "thickness", fallback_thickness)
            if t > 0:
                nearby_thicknesses.append(float(t))

    if nearby_thicknesses:
        return float(np.median(nearby_thicknesses))
    return float(fallback_thickness)


def analyze_text_region_spatial_metrics(
    region: TextRegion,
    wall_mask: np.ndarray,
    dist_map: np.ndarray,
    local_wall_thickness: float = 10.0,
) -> TextRegion:
    """
    Calculates detailed spatial relationship metrics between a TextRegion and walls:
    - distance_to_wall
    - wall_overlap_ratio
    - wall_intersection_ratio
    - wall_support_around_text
    - text_interior_ratio
    - text_crossing_wall_ratio
    - wall_thickness_estimate
    """
    if wall_mask is None or wall_mask.size == 0 or not region.polygon or len(region.polygon) < 3:
        region.distance_to_wall = 999.0
        region.wall_thickness_estimate = local_wall_thickness
        return region

    h, w = wall_mask.shape[:2]
    bx, by, bw, bh = region.bbox
    bx = max(0, min(w - 1, int(bx)))
    by = max(0, min(h - 1, int(by)))
    bw = max(1, min(w - bx, int(bw)))
    bh = max(1, min(h - by, int(bh)))

    # Compute bounding crop with safety padding for neighborhood expansion
    expand_px = max(6, int(round(local_wall_thickness * 1.5)))
    pad = expand_px + 4
    x1 = max(0, bx - pad)
    y1 = max(0, by - pad)
    x2 = min(w, bx + bw + pad)
    y2 = min(h, by + bh + pad)
    crop_h = y2 - y1
    crop_w = x2 - x1

    # 1. Rasterize text region polygon in local crop
    local_reg_mask = np.zeros((crop_h, crop_w), dtype=np.uint8)
    local_poly_pts = np.array([[int(round(pt[0] - x1)), int(round(pt[1] - y1))] for pt in region.polygon], dtype=np.int32)
    cv2.fillPoly(local_reg_mask, [local_poly_pts], 255)

    reg_pixels = int(np.count_nonzero(local_reg_mask))
    if reg_pixels == 0:
        local_reg_mask[by - y1:by - y1 + bh, bx - x1:bx - x1 + bw] = 255
        reg_pixels = int(np.count_nonzero(local_reg_mask))

    local_wall_bin = (wall_mask[y1:y2, x1:x2] > 0).astype(np.uint8) * 255
    local_dist_map = dist_map[y1:y2, x1:x2]

    # 2. Overlap with wall mask
    local_overlap_mask = cv2.bitwise_and(local_reg_mask, local_wall_bin)
    overlap_pixels = int(np.count_nonzero(local_overlap_mask))
    wall_overlap_ratio = float(overlap_pixels) / max(1.0, float(reg_pixels))

    # 3. Distance to wall
    if overlap_pixels > 0:
        min_dist = 0.0
    else:
        # Minimum distance among text region pixels
        region_dist_vals = local_dist_map[local_reg_mask > 0]
        if len(region_dist_vals) > 0:
            min_dist = float(np.min(region_dist_vals))
        else:
            min_dist = 999.0

    # 4. Wall intersection ratio (perimeter overlap)
    local_perimeter_mask = np.zeros((crop_h, crop_w), dtype=np.uint8)
    cv2.polylines(local_perimeter_mask, [local_poly_pts], isClosed=True, color=255, thickness=1)
    perim_pixels = int(np.count_nonzero(local_perimeter_mask))
    perim_overlap = int(np.count_nonzero(cv2.bitwise_and(local_perimeter_mask, local_wall_bin)))
    wall_intersection_ratio = float(perim_overlap) / max(1.0, float(perim_pixels))

    # 5. Wall support in local neighborhood
    k_size = expand_px * 2 + 1
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (k_size, k_size))
    local_neighborhood_mask = cv2.dilate(local_reg_mask, kernel)
    neighborhood_area = int(np.count_nonzero(local_neighborhood_mask))
    wall_in_neighborhood = int(np.count_nonzero(cv2.bitwise_and(local_neighborhood_mask, local_wall_bin)))
    wall_support_around_text = float(wall_in_neighborhood) / max(1.0, float(neighborhood_area))

    # 6. Text interior ratio
    interior_threshold = max(3.0, local_wall_thickness * 0.5)
    interior_pixels = int(np.count_nonzero(local_reg_mask[local_dist_map >= interior_threshold]))
    text_interior_ratio = float(interior_pixels) / max(1.0, float(reg_pixels))

    # 7. Text crossing wall ratio
    if wall_overlap_ratio > 0.04:
        non_overlap_mask = cv2.bitwise_and(local_reg_mask, cv2.bitwise_not(local_wall_bin))
        num_cc, _, cc_stats, _ = cv2.connectedComponentsWithStats(non_overlap_mask, connectivity=8)
        sig_components = 0
        for cc_idx in range(1, num_cc):
            if cc_stats[cc_idx, cv2.CC_STAT_AREA] >= (reg_pixels * 0.15):
                sig_components += 1
        if sig_components >= 2:
            text_crossing_wall_ratio = float(overlap_pixels) / max(1.0, float(reg_pixels))
        else:
            text_crossing_wall_ratio = 0.0
    else:
        text_crossing_wall_ratio = 0.0

    # Assign metrics to region
    region.distance_to_wall = min_dist
    region.wall_overlap_ratio = wall_overlap_ratio
    region.wall_intersection_ratio = wall_intersection_ratio
    region.wall_support_around_text = wall_support_around_text
    region.text_interior_ratio = text_interior_ratio
    region.text_crossing_wall_ratio = text_crossing_wall_ratio
    region.wall_thickness_estimate = local_wall_thickness

    return region
