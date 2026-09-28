"""
Negative Evidence Extractor for Phase 2.10.8 Room Validity.
Extracts explicit negative indicators:
- exterior_likelihood
- background_likelihood
- furniture_likelihood
- text_likelihood
- hatch_dimension_likelihood
- sliver_likelihood
- artificial_cavity_likelihood
"""
from typing import List, Tuple, Dict, Any, Optional
import numpy as np
from shapely.geometry import Polygon as ShapelyPolygon, Point, box
from .models import RoomValidityHypothesis


class NegativeEvidenceExtractor:
    """
    Extracts explicit negative indicators penalizing non-room cavities.
    """

    def __init__(
        self,
        margin_boundary_threshold_px: float = 30.0,
        sliver_area_threshold_px: float = 1200.0,
        sliver_compactness_threshold: float = 0.08,
    ):
        self.margin_boundary_threshold_px = margin_boundary_threshold_px
        self.sliver_area_threshold_px = sliver_area_threshold_px
        self.sliver_compactness_threshold = sliver_compactness_threshold

    def extract_negative_evidence(
        self,
        hyp: RoomValidityHypothesis,
        img_w: int,
        img_h: int,
        footprint_mask: Optional[np.ndarray] = None,
        text_regions: Optional[List[Any]] = None,
        interior_strokes_mask: Optional[np.ndarray] = None,
    ) -> Dict[str, float]:
        """
        Extracts all negative features and penalties for a candidate room hypothesis.
        """
        poly = hyp.polygon
        minx, miny, maxx, maxy = poly.bounds
        area = hyp.area_px
        comp = hyp.compactness

        # 1. Exterior & Background Likelihood
        # Checks if polygon touches outer image margins or falls outside footprint
        touches_image_margin = (
            minx <= self.margin_boundary_threshold_px
            or miny <= self.margin_boundary_threshold_px
            or maxx >= (img_w - self.margin_boundary_threshold_px)
            or maxy >= (img_h - self.margin_boundary_threshold_px)
        )

        outside_footprint_ratio = 0.0
        if footprint_mask is not None:
            # Check overlap with footprint
            h_m, w_m = footprint_mask.shape[:2]
            c_x, c_y = int(round(hyp.centroid[0])), int(round(hyp.centroid[1]))
            if 0 <= c_x < w_m and 0 <= c_y < h_m:
                if footprint_mask[c_y, c_x] == 0:
                    outside_footprint_ratio = 0.85
            else:
                outside_footprint_ratio = 1.0

        if touches_image_margin:
            exterior_likelihood = max(0.60, outside_footprint_ratio)
            background_likelihood = 0.70
        else:
            exterior_likelihood = outside_footprint_ratio
            background_likelihood = 0.05

        # 2. Furniture Likelihood
        # Uses small repeated internal shapes or dense stroke clusters inside the polygon
        furniture_ev = 0.0
        if interior_strokes_mask is not None:
            # Measure interior stroke density
            h_m, w_m = interior_strokes_mask.shape[:2]
            y0, y1 = max(0, int(miny)), min(h_m, int(maxy))
            x0, x1 = max(0, int(minx)), min(w_m, int(maxx))
            if y1 > y0 and x1 > x0:
                crop = interior_strokes_mask[y0:y1, x0:x1]
                density = float(np.count_nonzero(crop)) / max(1.0, float(crop.size))
                if density > 0.40 and area < 8000.0:
                    furniture_ev = min(0.95, density * 1.5)
                elif density > 0.25:
                    furniture_ev = 0.40
        else:
            # Heuristic: very small compact rectangular boxes inside other rooms
            if 400.0 <= area <= 3000.0 and 0.40 <= comp <= 0.85 and hyp.wall_boundary_support < 0.35:
                furniture_ev = 0.65

        # 3. Text Likelihood
        # Checks if area is covered by text regions or labels
        text_ev = 0.0
        if text_regions:
            total_text_inter = 0.0
            for t in text_regions:
                t_poly = getattr(t, "polygon", None)
                if t_poly is None and hasattr(t, "bbox"):
                    tb = t.bbox
                    t_poly = box(tb[0], tb[1], tb[0] + tb[2], tb[1] + tb[3])
                if t_poly and poly.envelope.intersects(t_poly.envelope):
                    inter = poly.intersection(t_poly).area
                    total_text_inter += inter
            text_ratio = total_text_inter / max(1.0, area)
            if text_ratio > 0.30:
                text_ev = min(0.95, text_ratio * 2.0)
            elif text_ratio > 0.10:
                text_ev = 0.40

        # 4. Hatch & Dimension Likelihood
        # Characterized by low area, high perimeter, and low wall support
        hatch_dim_ev = 0.0
        if (comp < 0.15 or hyp.aspect_ratio >= 8.0) and area < 2500.0 and hyp.wall_boundary_support < 0.40:
            hatch_dim_ev = 0.70
        elif comp < 0.15 and area < 1500.0:
            hatch_dim_ev = 0.50

        # 5. Sliver Likelihood
        # Tiny narrow sliver formed between walls or during polygon subtraction
        sliver_ev = 0.0
        if area < self.sliver_area_threshold_px and comp < self.sliver_compactness_threshold:
            sliver_ev = 0.90
        elif area < 800.0:
            sliver_ev = 0.85
        elif comp < 0.04:
            sliver_ev = 0.80

        # 6. Artificial Cavity Likelihood
        # Formed by non-wall elements (furniture + text + unsupported boundaries)
        # Even if enclosed, lacks architectural wall centerlines
        artificial_cavity_ev = 0.0
        if hyp.unsupported_boundary_ratio >= 0.65:
            artificial_cavity_ev = max(0.50, hyp.unsupported_boundary_ratio)
        if furniture_ev >= 0.50 or text_ev >= 0.50 or hatch_dim_ev >= 0.50:
            artificial_cavity_ev = max(artificial_cavity_ev, 0.75)

        negative_evidence = {
            "exterior_likelihood": float(exterior_likelihood),
            "background_likelihood": float(background_likelihood),
            "furniture_likelihood": float(furniture_ev),
            "text_likelihood": float(text_ev),
            "hatch_dimension_likelihood": float(hatch_dim_ev),
            "sliver_likelihood": float(sliver_ev),
            "artificial_cavity_likelihood": float(artificial_cavity_ev),
        }

        # Update hypothesis in-place
        hyp.exterior_likelihood = negative_evidence["exterior_likelihood"]
        hyp.background_likelihood = negative_evidence["background_likelihood"]
        hyp.furniture_likelihood = negative_evidence["furniture_likelihood"]
        hyp.text_likelihood = negative_evidence["text_likelihood"]
        hyp.hatch_dimension_likelihood = negative_evidence["hatch_dimension_likelihood"]
        hyp.sliver_likelihood = negative_evidence["sliver_likelihood"]
        hyp.artificial_cavity_likelihood = negative_evidence["artificial_cavity_likelihood"]

        return negative_evidence
