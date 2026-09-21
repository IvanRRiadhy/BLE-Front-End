import cv2
import numpy as np
from typing import List, Optional
from shapely.geometry import Polygon as ShapelyPolygon
from .models import DetectedArea, AreaPoint, DetectionConfig

def clean_collinear_points(points: List[AreaPoint], dist_thresh: float = 3.0) -> List[AreaPoint]:
    """
    Removes near-collinear redundant vertices and micro-edges along polygon segments.
    """
    if len(points) <= 3:
        return points

    cleaned: List[AreaPoint] = []
    n = len(points)

    for i in range(n):
        prev_pt = points[(i - 1) % n]
        curr_pt = points[i]
        next_pt = points[(i + 1) % n]

        # Calculate edge lengths
        dx1, dy1 = curr_pt.xPx - prev_pt.xPx, curr_pt.yPx - prev_pt.yPx
        dx2, dy2 = next_pt.xPx - curr_pt.xPx, next_pt.yPx - curr_pt.yPx
        
        len1 = np.hypot(dx1, dy1)
        len2 = np.hypot(dx2, dy2)

        # Skip zero/micro edges
        if len1 < dist_thresh:
            continue

        # Check cross product to test for collinearity
        cross = dx1 * dy2 - dy1 * dx2
        if len1 > 0 and len2 > 0:
            sin_angle = abs(cross) / (len1 * len2)
            # If nearly straight line (sin < 0.05 ~ 3 degrees), skip intermediate vertex
            if sin_angle < 0.05:
                continue

        cleaned.append(curr_pt)

    return cleaned if len(cleaned) >= 3 else points

def contour_to_polygon(
    contour: np.ndarray, config: DetectionConfig, area_id: str
) -> Optional[DetectedArea]:
    """
    Simplifies raw pixel contour into a clean, geometrically valid polygon.
    """
    perimeter = cv2.arcLength(contour, closed=True)
    if perimeter < 50:
        return None

    # Douglas-Peucker simplification
    epsilon = config.simplify_tolerance * perimeter
    approx = cv2.approxPolyDP(contour, epsilon=epsilon, closed=True)

    # Fallback to finer epsilon if over-simplified
    if len(approx) < config.min_vertices:
        epsilon_fine = max(1.5, config.simplify_tolerance * 0.4 * perimeter)
        approx = cv2.approxPolyDP(contour, epsilon=epsilon_fine, closed=True)

    if len(approx) < 3:
        return None

    # Convert to AreaPoint list in original image pixel space
    raw_points = [
        AreaPoint(xPx=float(pt[0][0]), yPx=float(pt[0][1]))
        for pt in approx
    ]

    cleaned_points = clean_collinear_points(raw_points)
    if len(cleaned_points) < 3:
        return None

    # Topological Validation using Shapely
    coords = [(p.xPx, p.yPx) for p in cleaned_points]
    # Ensure closed ring for Shapely
    if coords[0] != coords[-1]:
        coords.append(coords[0])

    try:
        poly = ShapelyPolygon(coords)
        if not poly.is_valid:
            poly = poly.buffer(0)
        if poly.is_empty or poly.geom_type != 'Polygon' or poly.area < config.min_room_area_px:
            return None
        ext_coords = list(poly.exterior.coords)[:-1]
        cleaned_points = [AreaPoint(xPx=c[0], yPx=c[1]) for c in ext_coords]
    except Exception:
        return None

    return DetectedArea(id=area_id, polygon=cleaned_points)

def extract_polygons_from_mask(
    room_masks: List[np.ndarray], config: DetectionConfig
) -> List[DetectedArea]:
    """
    Extracts, simplifies, and validates polygons from individual room masks.
    """
    detected_areas: List[DetectedArea] = []

    for idx, room_mask in enumerate(room_masks):
        contours, _ = cv2.findContours(room_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            continue

        # Get the largest contour representing the primary room boundary
        largest_contour = max(contours, key=cv2.contourArea)
        area_id = f"detected-{idx + 1:03d}"
        
        area = contour_to_polygon(largest_contour, config, area_id)
        if area is not None:
            detected_areas.append(area)

    return detected_areas
