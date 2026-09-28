"""
Light Boundary Refinement for Phase 2.10.9 Global Room Synthesis.
Snaps selected room vertices to centerline wall segments (within 4 px)
without altering semantic validity or room existence.
"""
from typing import List, Tuple, Any, Optional
import numpy as np
from shapely.geometry import Polygon as ShapelyPolygon, Point, LineString


class BoundaryRefiner:
    """
    Applies gentle vertex snapping to wall lines post-selection.
    """

    def __init__(self, snap_distance_px: float = 4.0):
        self.snap_distance_px = snap_distance_px

    def refine_boundary(
        self,
        polygon: ShapelyPolygon,
        wall_network: Optional[Any] = None,
    ) -> Tuple[ShapelyPolygon, float]:
        """
        Gently aligns polygon vertices to wall network segments.
        """
        if not hasattr(polygon, "exterior") or polygon.is_empty:
            return polygon, 0.80

        coords = list(polygon.exterior.coords)[:-1]
        if len(coords) < 3:
            return polygon, 0.80

        wall_lines = getattr(wall_network, "wall_lines", []) if wall_network else []
        if not wall_lines:
            return polygon, 0.85

        snapped_coords = []
        for pt in coords:
            p_geom = Point(pt[0], pt[1])
            best_snap = pt
            min_dist = self.snap_distance_px + 1.0

            for line in wall_lines:
                if hasattr(line, "distance"):
                    dist = line.distance(p_geom)
                    if dist <= self.snap_distance_px and dist < min_dist:
                        proj = line.interpolate(line.project(p_geom))
                        best_snap = (float(proj.x), float(proj.y))
                        min_dist = dist

            snapped_coords.append(best_snap)

        snapped_coords.append(snapped_coords[0])
        try:
            refined_poly = ShapelyPolygon(snapped_coords)
            if not refined_poly.is_valid:
                refined_poly = refined_poly.buffer(0)
            if refined_poly.is_empty or refined_poly.area < 100.0:
                return polygon, 0.80
            return refined_poly, 0.90
        except Exception:
            return polygon, 0.80
