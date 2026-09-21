"""
Geometric Polygon Validation Engine
Validates geometric integrity of predicted and ground-truth polygons without silently mutating them.
"""
import math
from typing import List, Tuple
from shapely.geometry import Polygon as ShapelyPolygon
from .models import Point2D, PolygonValidationResult

def validate_polygon(
    polygon_id: str,
    points: List[Point2D],
    image_width: int,
    image_height: int,
    min_vertices: int = 3,
    max_vertices: int = 300,
    min_area_px: float = 10.0,
) -> PolygonValidationResult:
    """
    Checks geometric constraints on a polygon:
    - vertex count in [min_vertices, max_vertices]
    - finite numeric coordinates
    - inside image bounds [0, w] x [0, h]
    - non-zero and non-degenerate area
    - no self-intersections (is_simple)
    - valid topology (is_valid)
    """
    reasons: List[str] = []
    coords: List[Tuple[float, float]] = []

    # 1. Finite Coordinates & Boundary Checks
    is_finite = True
    is_within_bounds = True

    for idx, pt in enumerate(points):
        x, y = pt.xPx, pt.yPx
        if math.isnan(x) or math.isnan(y) or math.isinf(x) or math.isinf(y):
            is_finite = False
            reasons.append(f"Vertex {idx} has non-finite coordinates ({x}, {y})")
            continue

        if x < -5.0 or x > image_width + 5.0 or y < -5.0 or y > image_height + 5.0:
            is_within_bounds = False
            reasons.append(f"Vertex {idx} ({x:.1f}, {y:.1f}) exceeds image bounds ({image_width}x{image_height})")

        coords.append((x, y))

    # 2. Vertex Count Check
    vertex_count = len(coords)
    if vertex_count < min_vertices:
        reasons.append(f"Vertex count {vertex_count} is less than minimum {min_vertices}")
    elif vertex_count > max_vertices:
        reasons.append(f"Vertex count {vertex_count} exceeds maximum {max_vertices}")

    # Remove consecutive duplicate points for topology check
    dedup_coords: List[Tuple[float, float]] = []
    for c in coords:
        if not dedup_coords or (abs(c[0] - dedup_coords[-1][0]) > 1e-4 or abs(c[1] - dedup_coords[-1][1]) > 1e-4):
            dedup_coords.append(c)

    # 3. Area and Self-Intersection Analysis via Shapely
    area_px = 0.0
    is_self_intersecting = False

    if len(dedup_coords) >= 3:
        try:
            poly = ShapelyPolygon(dedup_coords)
            area_px = float(poly.area)

            if not poly.is_simple:
                is_self_intersecting = True
                reasons.append("Polygon boundary is self-intersecting (complex polygon)")

            if not poly.is_valid:
                reasons.append("Polygon is topologically invalid in 2D Euclidean space")

            if area_px < min_area_px:
                reasons.append(f"Polygon area {area_px:.1f} px is below minimum {min_area_px} px")

        except Exception as err:
            reasons.append(f"Shapely geometry creation failed: {str(err)}")
    else:
        reasons.append("Insufficient non-duplicate vertices to form a 2D planar polygon")

    is_valid = len(reasons) == 0

    return PolygonValidationResult(
        polygonId=polygon_id,
        isValid=is_valid,
        reasons=reasons,
        vertexCount=vertex_count,
        areaPx=area_px,
        isSelfIntersecting=is_self_intersecting,
        isFinite=is_finite,
        isWithinBounds=is_within_bounds,
    )
