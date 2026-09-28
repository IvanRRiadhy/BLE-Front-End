"""
Visualization Diagnostics for Phase 2.10.10 Targeted Missing-Room Recovery.
Generates 10 diagnostic panels per floorplan:
01_original_image.png
02_existing_proposals.png
03_doorway_recovery.png
04_partition_recovery.png
05_neighbor_recovery.png
06_repetition_recovery.png
07_wall_reconstruction.png
08_combined_recovery.png
09_final_synthesis.png
10_recovered_vs_missing_gt.png
"""
from typing import List, Dict, Any, Optional
import os
import cv2
import numpy as np
from shapely.geometry import Polygon as ShapelyPolygon
from .models import MissingRoomProposal, RecoveryResult
from .metrics import compute_polygon_iou


class RecoveryVisualizer:
    """
    Renders diagnostic visualization overlays for Phase 2.10.10 missing-room recovery.
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

    def render_all_10_diagnostics(
        self,
        image_name: str,
        base_image: Optional[np.ndarray],
        existing_polys: List[ShapelyPolygon],
        recovery_result: RecoveryResult,
        final_synthesized_rooms: List[Any],
        gt_polygons: Optional[List[ShapelyPolygon]] = None,
    ) -> Dict[str, str]:
        """
        Renders all 10 diagnostic visualization layers for an image.
        """
        base = base_image.copy() if base_image is not None else np.ones((1000, 1000, 3), dtype=np.uint8) * 255
        stem = os.path.splitext(image_name)[0]
        created = {}

        p_by_strat = recovery_result.proposals_by_strategy

        # 01: Original Image
        p1 = os.path.join(self.output_dir, f"{stem}_01_original_image.png")
        cv2.imwrite(p1, base)
        created["01_original"] = p1

        # 02: Existing proposals
        img2 = base.copy()
        for p in existing_polys:
            self._draw_polygon(img2, p, color=(200, 200, 200), thickness=1, fill_color=(200, 200, 200), alpha=0.15)
        p2 = os.path.join(self.output_dir, f"{stem}_02_existing_proposals.png")
        cv2.imwrite(p2, img2)
        created["02_existing"] = p2

        # 03: Doorway recovery
        img3 = base.copy()
        for p in p_by_strat.get("doorway_recovery", []):
            self._draw_polygon(img3, p.polygon, color=(0, 220, 255), thickness=2, fill_color=(0, 220, 255), alpha=0.25)
        p3 = os.path.join(self.output_dir, f"{stem}_03_doorway_recovery.png")
        cv2.imwrite(p3, img3)
        created["03_doorway"] = p3

        # 04: Partition recovery
        img4 = base.copy()
        for p in p_by_strat.get("partition_recovery", []):
            self._draw_polygon(img4, p.polygon, color=(255, 150, 0), thickness=2, fill_color=(255, 150, 0), alpha=0.25)
        p4 = os.path.join(self.output_dir, f"{stem}_04_partition_recovery.png")
        cv2.imwrite(p4, img4)
        created["04_partition"] = p4

        # 05: Neighbor recovery
        img5 = base.copy()
        for p in p_by_strat.get("neighbor_recovery", []):
            self._draw_polygon(img5, p.polygon, color=(0, 255, 150), thickness=2, fill_color=(0, 255, 150), alpha=0.25)
        p5 = os.path.join(self.output_dir, f"{stem}_05_neighbor_recovery.png")
        cv2.imwrite(p5, img5)
        created["05_neighbor"] = p5

        # 06: Repetition recovery
        img6 = base.copy()
        for p in p_by_strat.get("repetition_recovery", []):
            self._draw_polygon(img6, p.polygon, color=(255, 0, 255), thickness=2, fill_color=(255, 0, 255), alpha=0.25)
        p6 = os.path.join(self.output_dir, f"{stem}_06_repetition_recovery.png")
        cv2.imwrite(p6, img6)
        created["06_repetition"] = p6

        # 07: Wall reconstruction
        img7 = base.copy()
        for p in p_by_strat.get("wall_reconstruction", []):
            self._draw_polygon(img7, p.polygon, color=(150, 0, 255), thickness=2, fill_color=(150, 0, 255), alpha=0.25)
        p7 = os.path.join(self.output_dir, f"{stem}_07_wall_reconstruction.png")
        cv2.imwrite(p7, img7)
        created["07_wall"] = p7

        # 08: Combined recovery (Fused)
        img8 = base.copy()
        for p in recovery_result.fused_proposals:
            self._draw_polygon(img8, p.polygon, color=(0, 180, 255), thickness=2, fill_color=(0, 180, 255), alpha=0.25)
        p8 = os.path.join(self.output_dir, f"{stem}_08_combined_recovery.png")
        cv2.imwrite(p8, img8)
        created["08_combined"] = p8

        # 09: Final synthesis
        img9 = base.copy()
        for r in final_synthesized_rooms:
            poly = getattr(r, "polygon", r)
            self._draw_polygon(img9, poly, color=(0, 200, 0), thickness=2, fill_color=(0, 255, 0), alpha=0.30)
        p9 = os.path.join(self.output_dir, f"{stem}_09_final_synthesis.png")
        cv2.imwrite(p9, img9)
        created["09_synthesis"] = p9

        # 10: Recovered vs Missing GT Audit
        img10 = base.copy()
        if gt_polygons:
            for gtp in gt_polygons:
                is_recovered = any(compute_polygon_iou(getattr(r, "polygon", r), gtp) >= 0.50 for r in final_synthesized_rooms)
                col = (0, 220, 0) if is_recovered else (0, 0, 220)
                self._draw_polygon(img10, gtp, color=col, thickness=2, fill_color=col, alpha=0.25)
        p10 = os.path.join(self.output_dir, f"{stem}_10_recovered_vs_missing_gt.png")
        cv2.imwrite(p10, img10)
        created["10_audit"] = p10

        return created
