"""
Visualization Diagnostics for Phase 2.10.9 Global Room Synthesis.
Generates 10 diagnostic panels per floorplan:
01_phase2107_baseline.png
02_phase2108_validity.png
03_room_hypothesis_graph.png
04_doorway_relationships.png
05_neighbor_relationships.png
06_cavity_context.png
07_alternative_groups.png
08_selected_configuration.png
09_rejected_configuration.png
10_final_comparison.png
"""
from typing import List, Dict, Any, Optional
import os
import cv2
import numpy as np
from shapely.geometry import Polygon as ShapelyPolygon, Point
from .models import (
    RoomHypothesis,
    RoomConfiguration,
    SynthesisResult,
    RelationshipType,
)
from .hypothesis_graph import RoomHypothesisGraph
from .metrics import compute_polygon_iou


class RoomSynthesisVisualizer:
    """
    Renders diagnostic visualization panels for Phase 2.10.9 Global Room Synthesis.
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
        input_hypotheses: List[RoomHypothesis],
        result: SynthesisResult,
        gt_polygons: Optional[List[ShapelyPolygon]] = None,
    ) -> Dict[str, str]:
        """
        Renders all 10 diagnostic visualization layers for an image.
        """
        base = base_image.copy() if base_image is not None else np.ones((1000, 1000, 3), dtype=np.uint8) * 255
        stem = os.path.splitext(image_name)[0]
        created = {}

        selected_rooms = result.selected_rooms
        best_cfg = result.selected_configuration
        rejected_cfgs = result.all_configurations[1:] if len(result.all_configurations) > 1 else []

        # 01: Phase 2.10.7 baseline
        img1 = base.copy()
        for h in input_hypotheses:
            self._draw_polygon(img1, h.polygon, color=(255, 120, 0), thickness=2, fill_color=(255, 200, 150), alpha=0.15)
        p1 = os.path.join(self.output_dir, f"{stem}_01_phase2107_baseline.png")
        cv2.imwrite(p1, img1)
        created["01_baseline"] = p1

        # 02: Phase 2.10.8 validity overlay
        img2 = base.copy()
        for h in input_hypotheses:
            col = (0, 200, 0) if h.validity_decision == "VALID" else (0, 0, 200)
            self._draw_polygon(img2, h.polygon, color=col, thickness=2, fill_color=col, alpha=0.20)
        p2 = os.path.join(self.output_dir, f"{stem}_02_phase2108_validity.png")
        cv2.imwrite(p2, img2)
        created["02_validity"] = p2

        # 03: Room hypothesis graph (nodes and adjacency)
        img3 = base.copy()
        for h in input_hypotheses:
            self._draw_polygon(img3, h.polygon, color=(180, 180, 180), thickness=1, fill_color=(220, 220, 220), alpha=0.15)
        for r in result.relationships:
            if r.rel_type in [RelationshipType.NEIGHBOR_OF, RelationshipType.PARTITION_OF]:
                h_src = next((h for h in input_hypotheses if h.hypothesis_id == r.source_id), None)
                h_dst = next((h for h in input_hypotheses if h.hypothesis_id == r.target_id), None)
                if h_src and h_dst:
                    pt1 = (int(h_src.centroid[0]), int(h_src.centroid[1]))
                    pt2 = (int(h_dst.centroid[0]), int(h_dst.centroid[1]))
                    cv2.line(img3, pt1, pt2, (200, 100, 0), 2)
        p3 = os.path.join(self.output_dir, f"{stem}_03_room_hypothesis_graph.png")
        cv2.imwrite(p3, img3)
        created["03_graph"] = p3

        # 04: Doorway relationships
        img4 = base.copy()
        for h in input_hypotheses:
            self._draw_polygon(img4, h.polygon, color=(200, 200, 200), thickness=1)
        for d in result.doorway_contexts:
            pt = (int(d.position[0]), int(d.position[1]))
            cv2.circle(img4, pt, 6, (0, 220, 255), -1)
            cv2.circle(img4, pt, 8, (0, 150, 200), 2)
        p4 = os.path.join(self.output_dir, f"{stem}_04_doorway_relationships.png")
        cv2.imwrite(p4, img4)
        created["04_doorways"] = p4

        # 05: Neighbor relationships
        img5 = base.copy()
        for r in result.relationships:
            if r.rel_type == RelationshipType.NEIGHBOR_OF:
                h_src = next((h for h in input_hypotheses if h.hypothesis_id == r.source_id), None)
                h_dst = next((h for h in input_hypotheses if h.hypothesis_id == r.target_id), None)
                if h_src and h_dst:
                    self._draw_polygon(img5, h_src.polygon, color=(0, 150, 255), thickness=1, fill_color=(0, 150, 255), alpha=0.15)
                    self._draw_polygon(img5, h_dst.polygon, color=(0, 150, 255), thickness=1, fill_color=(0, 150, 255), alpha=0.15)
        p5 = os.path.join(self.output_dir, f"{stem}_05_neighbor_relationships.png")
        cv2.imwrite(p5, img5)
        created["05_neighbors"] = p5

        # 06: Cavity context
        img6 = base.copy()
        for c in result.cavity_contexts:
            h = next((hyp for hyp in input_hypotheses if hyp.hypothesis_id == c.hypothesis_id), None)
            if h:
                col = (0, 0, 220) if c.artificial_cavity_likelihood >= 0.50 else (0, 200, 0)
                self._draw_polygon(img6, h.polygon, color=col, thickness=2, fill_color=col, alpha=0.20)
        p6 = os.path.join(self.output_dir, f"{stem}_06_cavity_context.png")
        cv2.imwrite(p6, img6)
        created["06_cavities"] = p6

        # 07: Alternative groups
        img7 = base.copy()
        colors = [(255, 0, 0), (0, 255, 0), (0, 0, 255), (255, 255, 0), (255, 0, 255), (0, 255, 255)]
        for g_idx, grp in enumerate(result.alternative_groups):
            col = colors[g_idx % len(colors)]
            for cid in grp.competing_hypothesis_ids:
                h = next((hyp for hyp in input_hypotheses if hyp.hypothesis_id == cid), None)
                if h:
                    self._draw_polygon(img7, h.polygon, color=col, thickness=2, fill_color=col, alpha=0.20)
        p7 = os.path.join(self.output_dir, f"{stem}_07_alternative_groups.png")
        cv2.imwrite(p7, img7)
        created["07_alternatives"] = p7

        # 08: Selected configuration
        img8 = base.copy()
        for idx, r in enumerate(selected_rooms):
            self._draw_polygon(img8, r.polygon, color=(0, 200, 0), thickness=2, fill_color=(0, 255, 0), alpha=0.30)
            c = r.polygon.centroid
            cv2.putText(img8, f"R_{idx:02d}", (int(c.x) - 15, int(c.y)), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 100, 0), 2)
        p8 = os.path.join(self.output_dir, f"{stem}_08_selected_configuration.png")
        cv2.imwrite(p8, img8)
        created["08_selected_config"] = p8

        # 09: Rejected configuration
        img9 = base.copy()
        if rejected_cfgs:
            rej_rooms = rejected_cfgs[0].hypotheses
            for r in rej_rooms:
                self._draw_polygon(img9, r.polygon, color=(0, 0, 220), thickness=2, fill_color=(0, 0, 220), alpha=0.20)
        p9 = os.path.join(self.output_dir, f"{stem}_09_rejected_configuration.png")
        cv2.imwrite(p9, img9)
        created["09_rejected_config"] = p9

        # 10: Final comparison (Predictions vs Ground Truth)
        img10 = base.copy()
        if gt_polygons:
            for gtp in gt_polygons:
                self._draw_polygon(img10, gtp, color=(255, 255, 255), thickness=1, fill_color=(200, 200, 200), alpha=0.15)
        for r in selected_rooms:
            is_tp = any(compute_polygon_iou(r.polygon, gtp) >= 0.50 for gtp in (gt_polygons or []))
            col = (0, 220, 0) if is_tp else (0, 0, 220)
            self._draw_polygon(img10, r.polygon, color=col, thickness=2, fill_color=col, alpha=0.30)
        p10 = os.path.join(self.output_dir, f"{stem}_10_final_comparison.png")
        cv2.imwrite(p10, img10)
        created["10_final_comparison"] = p10

        return created
