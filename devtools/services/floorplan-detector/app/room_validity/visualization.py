"""
Visualization diagnostics for Phase 2.10.8 Room Validity & False Positive Suppression.
Generates 10 diagnostic visualization layers:
01_phase2107_baseline.png
02_positive_evidence.png
03_negative_evidence.png
04_room_validity_score.png
05_valid_rooms.png
06_ambiguous_rooms.png
07_rejected_rooms.png
08_fp_taxonomy.png
09_tp_vs_fp.png
10_final_comparison.png
"""
from typing import List, Dict, Any, Optional
import os
import cv2
import numpy as np
from shapely.geometry import Polygon as ShapelyPolygon
from .models import RoomValidityHypothesis, ValidatedRoom
from .metrics import compute_polygon_iou


class RoomValidityVisualizer:
    """
    Renders diagnostic visualization panels for room validity analysis.
    """

    def __init__(self, output_dir: str):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)

    def _draw_polygon(
        self,
        img: np.ndarray,
        poly: ShapelyPolygon,
        color: tuple,
        thickness: int = 2,
        fill_color: Optional[tuple] = None,
        alpha: float = 0.25,
    ):
        if not hasattr(poly, "exterior") or poly.is_empty:
            return
        coords = np.array(poly.exterior.coords, dtype=np.int32)
        if fill_color is not None:
            overlay = img.copy()
            cv2.fillPoly(overlay, [coords], fill_color)
            cv2.addWeighted(overlay, alpha, img, 1 - alpha, 0, img)
        cv2.polylines(img, [coords], isClosed=True, color=color, thickness=thickness)

    def render_valid_vs_rejected(
        self,
        base_image: Optional[np.ndarray],
        valid_rooms: List[ValidatedRoom],
        ambiguous_hyps: List[RoomValidityHypothesis],
        rejected_hyps: List[RoomValidityHypothesis],
        filename: str = "valid_vs_rejected.png",
    ) -> str:
        """
        Renders a composite overlay of Valid (Green), Ambiguous (Yellow), and Rejected (Red) rooms.
        """
        img = base_image.copy() if base_image is not None else np.ones((800, 800, 3), dtype=np.uint8) * 255

        # 1. Rejected (Red)
        for h in rejected_hyps:
            reason = h.rejection_reasons[0].value if h.rejection_reasons else "REJECTED"
            self._draw_polygon(img, h.polygon, color=(0, 0, 200), thickness=1, fill_color=(0, 0, 220), alpha=0.15)
            c = h.polygon.centroid
            cv2.putText(img, reason, (int(c.x) - 20, int(c.y)), cv2.FONT_HERSHEY_SIMPLEX, 0.35, (0, 0, 180), 1)

        # 2. Ambiguous (Yellow)
        for h in ambiguous_hyps:
            self._draw_polygon(img, h.polygon, color=(0, 200, 220), thickness=2, fill_color=(0, 200, 220), alpha=0.20)
            c = h.polygon.centroid
            cv2.putText(img, f"AMB ({h.room_validity_score:.2f})", (int(c.x) - 20, int(c.y)), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (0, 150, 180), 1)

        # 3. Valid (Green)
        for r in valid_rooms:
            self._draw_polygon(img, r.polygon, color=(0, 180, 0), thickness=2, fill_color=(0, 220, 0), alpha=0.30)
            c = r.polygon.centroid
            lbl = f"{r.room_id} ({r.room_validity_score:.2f})"
            cv2.putText(img, lbl, (int(c.x) - 25, int(c.y)), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 100, 0), 2)

        out_path = os.path.join(self.output_dir, filename)
        cv2.imwrite(out_path, img)
        return out_path

    def render_fp_taxonomy_breakdown(
        self,
        base_image: Optional[np.ndarray],
        rejected_hyps: List[RoomValidityHypothesis],
        filename: str = "fp_taxonomy.png",
    ) -> str:
        """
        Renders rejected hypotheses color-coded by their primary False Positive reason code.
        """
        img = base_image.copy() if base_image is not None else np.ones((800, 800, 3), dtype=np.uint8) * 255

        color_map = {
            "FP_EXTERIOR": (255, 0, 0),
            "FP_FURNITURE": (0, 165, 255),
            "FP_TEXT": (255, 255, 0),
            "FP_ARTIFICIAL_CAVITY": (128, 0, 128),
            "FP_SLIVER": (200, 200, 200),
            "FP_UNSUPPORTED_BOUNDARY": (0, 0, 255),
            "FP_LOW_ARCHITECTURAL_SUPPORT": (100, 100, 100),
        }

        for h in rejected_hyps:
            r_code = h.rejection_reasons[0].value if h.rejection_reasons else "FP_UNKNOWN"
            color = color_map.get(r_code, (0, 0, 150))
            self._draw_polygon(img, h.polygon, color=color, thickness=2, fill_color=color, alpha=0.25)
            c = h.polygon.centroid
            cv2.putText(img, r_code, (int(c.x) - 25, int(c.y)), cv2.FONT_HERSHEY_SIMPLEX, 0.35, color, 1)

        out_path = os.path.join(self.output_dir, filename)
        cv2.imwrite(out_path, img)
        return out_path

    def render_all_10_diagnostics(
        self,
        image_name: str,
        base_image: Optional[np.ndarray],
        hypotheses: List[RoomValidityHypothesis],
        valid_rooms: List[ValidatedRoom],
        ambiguous_hyps: List[RoomValidityHypothesis],
        rejected_hyps: List[RoomValidityHypothesis],
        gt_polygons: Optional[List[ShapelyPolygon]] = None,
    ) -> Dict[str, str]:
        """
        Renders all 10 diagnostic panels for a single floorplan image.
        """
        base = base_image.copy() if base_image is not None else np.ones((1000, 1000, 3), dtype=np.uint8) * 255
        stem = os.path.splitext(image_name)[0]
        created = {}

        # 01: Baseline input rooms
        img1 = base.copy()
        for idx, h in enumerate(hypotheses):
            self._draw_polygon(img1, h.polygon, color=(255, 120, 0), thickness=2, fill_color=(255, 200, 150), alpha=0.15)
        p1 = os.path.join(self.output_dir, f"{stem}_01_phase2107_baseline.png")
        cv2.imwrite(p1, img1)
        created["01_baseline"] = p1

        # 02: Positive evidence heatmap
        img2 = base.copy()
        for h in hypotheses:
            supp = h.wall_boundary_support
            g = int(255 * supp)
            r = int(255 * (1.0 - supp))
            self._draw_polygon(img2, h.polygon, color=(0, g, r), thickness=2, fill_color=(0, g, r), alpha=0.25)
        p2 = os.path.join(self.output_dir, f"{stem}_02_positive_evidence.png")
        cv2.imwrite(p2, img2)
        created["02_positive"] = p2

        # 03: Negative evidence heatmap
        img3 = base.copy()
        for h in hypotheses:
            neg = h.negative_score
            r = int(min(255, 255 * neg * 1.5))
            self._draw_polygon(img3, h.polygon, color=(0, 0, r), thickness=2, fill_color=(0, 0, r), alpha=0.25)
        p3 = os.path.join(self.output_dir, f"{stem}_03_negative_evidence.png")
        cv2.imwrite(p3, img3)
        created["03_negative"] = p3

        # 04: Validity Score heatmap
        img4 = base.copy()
        for h in hypotheses:
            score = h.room_validity_score
            val_col = (int(255 * (1 - score)), int(255 * score), 0)
            self._draw_polygon(img4, h.polygon, color=val_col, thickness=2, fill_color=val_col, alpha=0.25)
            c = h.polygon.centroid
            cv2.putText(img4, f"{score:.2f}", (int(c.x)-15, int(c.y)), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 0, 0), 1)
        p4 = os.path.join(self.output_dir, f"{stem}_04_room_validity_score.png")
        cv2.imwrite(p4, img4)
        created["04_validity_score"] = p4

        # 05: Valid rooms
        img5 = base.copy()
        for r in valid_rooms:
            self._draw_polygon(img5, r.polygon, color=(0, 200, 0), thickness=2, fill_color=(0, 255, 0), alpha=0.30)
        p5 = os.path.join(self.output_dir, f"{stem}_05_valid_rooms.png")
        cv2.imwrite(p5, img5)
        created["05_valid_rooms"] = p5

        # 06: Ambiguous rooms
        img6 = base.copy()
        for h in ambiguous_hyps:
            self._draw_polygon(img6, h.polygon, color=(0, 215, 255), thickness=2, fill_color=(0, 215, 255), alpha=0.25)
        p6 = os.path.join(self.output_dir, f"{stem}_06_ambiguous_rooms.png")
        cv2.imwrite(p6, img6)
        created["06_ambiguous_rooms"] = p6

        # 07: Rejected rooms
        img7 = base.copy()
        for h in rejected_hyps:
            self._draw_polygon(img7, h.polygon, color=(0, 0, 255), thickness=2, fill_color=(0, 0, 255), alpha=0.20)
        p7 = os.path.join(self.output_dir, f"{stem}_07_rejected_rooms.png")
        cv2.imwrite(p7, img7)
        created["07_rejected_rooms"] = p7

        # 08: FP taxonomy
        p8 = os.path.join(self.output_dir, f"{stem}_08_fp_taxonomy.png")
        self.render_fp_taxonomy_breakdown(base, rejected_hyps, filename=f"{stem}_08_fp_taxonomy.png")
        created["08_fp_taxonomy"] = p8

        # 09: TP vs FP comparison
        img9 = base.copy()
        if gt_polygons:
            for gtp in gt_polygons:
                self._draw_polygon(img9, gtp, color=(255, 255, 255), thickness=1, fill_color=(200, 200, 200), alpha=0.15)
        for r in valid_rooms:
            is_tp = any(compute_polygon_iou(r.polygon, gtp) >= 0.50 for gtp in (gt_polygons or []))
            col = (0, 220, 0) if is_tp else (0, 0, 220)
            self._draw_polygon(img9, r.polygon, color=col, thickness=2, fill_color=col, alpha=0.30)
        p9 = os.path.join(self.output_dir, f"{stem}_09_tp_vs_fp.png")
        cv2.imwrite(p9, img9)
        created["09_tp_vs_fp"] = p9

        # 10: Final comparison
        p10 = os.path.join(self.output_dir, f"{stem}_10_final_comparison.png")
        self.render_valid_vs_rejected(base, valid_rooms, ambiguous_hyps, rejected_hyps, filename=f"{stem}_10_final_comparison.png")
        created["10_final_comparison"] = p10

        return created
