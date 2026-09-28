"""
Lightweight Boundary Quality & Refinement for Phase 2.10.8 Room Validity.
Performs gentle vertex snapping of accepted valid rooms to nearby architectural wall lines.
Does NOT alter semantic validity.
"""
from typing import List, Tuple, Dict, Any, Optional
import numpy as np
from shapely.geometry import Polygon as ShapelyPolygon, Point
from .models import RoomValidityHypothesis, ValidatedRoom


class BoundaryQualityRefiner:
    """
    Measures boundary quality and performs light vertex snapping to wall centerlines.
    """

    def __init__(self, snap_distance_threshold: float = 4.0):
        self.snap_distance_threshold = snap_distance_threshold

    def refine_boundary(
        self,
        poly: ShapelyPolygon,
        wall_network: Optional[Any] = None,
    ) -> Tuple[ShapelyPolygon, float]:
        """
        Gently snaps vertices to wall lines if within snap_distance_threshold.
        Returns refined polygon and measured boundary quality.
        """
        if not hasattr(poly, "exterior") or poly.exterior is None:
            return poly, 0.50

        wall_lines = getattr(wall_network, "wall_lines", []) if wall_network else []
        coords = list(poly.exterior.coords)
        if len(coords) < 4:
            return poly, 0.50

        if not wall_lines:
            # No wall network to snap against, return original
            return poly, 0.80

        snapped_coords = []
        snapped_count = 0

        for pt in coords[:-1]:
            p_geom = Point(pt[0], pt[1])
            best_dist = 999.0
            best_pt = pt

            for line in wall_lines:
                dist = line.distance(p_geom)
                if dist < best_dist and dist <= self.snap_distance_threshold:
                    proj = line.interpolate(line.project(p_geom))
                    best_dist = dist
                    best_pt = (float(proj.x), float(proj.y))

            if best_dist <= self.snap_distance_threshold:
                snapped_coords.append(best_pt)
                snapped_count += 1
            else:
                snapped_coords.append(pt)

        snapped_coords.append(snapped_coords[0])

        try:
            refined_poly = ShapelyPolygon(snapped_coords)
            if not refined_poly.is_valid:
                refined_poly = refined_poly.buffer(0)
            if refined_poly.is_empty or refined_poly.area < 0.50 * poly.area:
                return poly, 0.60
            quality = float(snapped_count / max(1, len(coords) - 1))
            return refined_poly, min(1.0, 0.70 + 0.30 * quality)
        except Exception:
            return poly, 0.60
