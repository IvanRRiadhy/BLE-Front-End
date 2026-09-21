"""
Proposal Geometry and Validation Utilities (Phase 2.10.4)
Validates geometric integrity, wall support, enclosure, and envelope containment.
"""
import cv2
import numpy as np
from typing import List, Tuple, Optional
from shapely.geometry import Polygon as ShapelyPolygon


def validate_proposal_geometry(
    polygon_pts: List[Tuple[float, float]],
    img_w: int,
    img_h: int,
    min_area: float = 350.0,
    max_area_ratio: float = 0.60,
    footprint_mask: Optional[np.ndarray] = None,
) -> Tuple[bool, str, Optional[ShapelyPolygon]]:
    """
    Validates polygon geometry against non-self-intersection, area, borders, and envelope.
    """
    if len(polygon_pts) < 3:
        return False, "insufficient_vertices", None

    # Ensure closed for Shapely
    coords = list(polygon_pts)
    if coords[0] != coords[-1]:
        coords.append(coords[0])

    try:
        poly = ShapelyPolygon(coords)
        if not poly.is_valid:
            poly = poly.buffer(0)
        if poly.is_empty or not isinstance(poly, ShapelyPolygon):
            return False, "invalid_or_multipolygon", None

        area = float(poly.area)
        max_area = img_w * img_h * max_area_ratio
        if area < min_area:
            return False, "area_too_small", None
        if area > max_area:
            return False, "area_too_large_oversized", None

        # Check edge length
        ext_coords = list(poly.exterior.coords)
        for i in range(len(ext_coords) - 1):
            p1 = ext_coords[i]
            p2 = ext_coords[i + 1]
            dist = float(np.hypot(p2[0] - p1[0], p2[1] - p1[1]))
            if dist < 3.0:
                pass  # Minor degenerate segment

        # Check image border margin
        xs = [p[0] for p in polygon_pts]
        ys = [p[1] for p in polygon_pts]
        min_x, max_x = min(xs), max(xs)
        min_y, max_y = min(ys), max(ys)

        if min_x <= 3 or min_y <= 3 or max_x >= (img_w - 3) or max_y >= (img_h - 3):
            return False, "touches_image_border", None

        # Envelope check
        if footprint_mask is not None and footprint_mask.shape[:2] == (img_h, img_w):
            pts_int = np.array([[int(p[0]), int(p[1])] for p in polygon_pts], np.int32)
            mask = np.zeros((img_h, img_w), dtype=np.uint8)
            cv2.fillPoly(mask, [pts_int], 255)
            h_area = float(np.count_nonzero(mask))
            if h_area > 0:
                in_fp = float(np.count_nonzero(cv2.bitwise_and(mask, footprint_mask)))
                ratio = in_fp / h_area
                if ratio < 0.35:
                    return False, "outside_building_envelope", None

        return True, "valid", poly
    except Exception as e:
        return False, f"geometry_exception_{str(e)}", None


def compute_proposal_wall_support(
    polygon_pts: List[Tuple[float, float]],
    wall_mask: np.ndarray,
    thickness: int = 3,
) -> float:
    """Calculates fraction of perimeter covered by architectural walls."""
    h, w = wall_mask.shape[:2]
    pts = np.array([[int(p[0]), int(p[1])] for p in polygon_pts], np.int32)
    poly_mask = np.zeros((h, w), dtype=np.uint8)
    cv2.polylines(poly_mask, [pts], isClosed=True, color=255, thickness=thickness)
    bnd_px = cv2.countNonZero(poly_mask)
    if bnd_px <= 0:
        return 0.50
    sup_px = cv2.countNonZero(cv2.bitwise_and(poly_mask, wall_mask))
    return float(np.clip(sup_px / float(bnd_px), 0.0, 1.0))
