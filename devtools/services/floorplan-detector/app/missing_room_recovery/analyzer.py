"""
Unrepresented Region Analyzer for Phase 2.10.10 Targeted Missing-Room Recovery.
Inspects the building footprint and wall network to identify spatial areas lacking coverage.
"""
from typing import List, Dict, Any, Optional
import numpy as np
from shapely.geometry import Polygon as ShapelyPolygon, box
from shapely.ops import unary_union


class UnrepresentedSpaceAnalyzer:
    """
    Identifies spatial regions inside the building footprint that lack existing hypotheses.
    """

    def __init__(self, min_space_area_px: float = 1200.0):
        self.min_space_area_px = min_space_area_px

    def analyze_unrepresented_regions(
        self,
        existing_polygons: List[ShapelyPolygon],
        img_w: int = 1000,
        img_h: int = 1000,
    ) -> List[ShapelyPolygon]:
        """
        Extracts candidate empty spaces not covered by existing polygons.
        """
        if not existing_polygons:
            return [box(50, 50, img_w - 50, img_h - 50)]

        try:
            union_poly = unary_union(existing_polygons)
            minx, miny, maxx, maxy = union_poly.bounds
            envelope = box(max(20, minx - 20), max(20, miny - 20), min(img_w - 20, maxx + 20), min(img_h - 20, maxy + 20))
            diff = envelope.difference(union_poly)

            from shapely.geometry import MultiPolygon
            geoms = []
            if isinstance(diff, ShapelyPolygon):
                geoms = [diff]
            elif isinstance(diff, MultiPolygon):
                geoms = list(diff.geoms)

            valid_regions = [g for g in geoms if isinstance(g, ShapelyPolygon) and g.area >= self.min_space_area_px]
            return valid_regions
        except Exception:
            return []
