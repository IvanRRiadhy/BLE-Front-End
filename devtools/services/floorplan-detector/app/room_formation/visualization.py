from __future__ import annotations
from typing import List, Dict, Any, Optional
import os
import cv2
import numpy as np
from shapely.geometry import Polygon
from .models import FinalRoom, FinalRoomLayout

class RoomFormationVisualizer:
    """
    Renders diagnostic visualization layers for Phase 2.10.7:
    1. final_rooms.png: Clean polygons of accepted final rooms color-coded with IDs and scores.
    2. formation_graph.png: Graph connectivity showing parent-child, partition, and neighbor edges.
    3. candidate_ranking_overlay.png: Top-ranked candidate room proposals before formation.
    4. parent_vs_children.png: Comparison overlay highlighting resolved parent cavities vs child partitions.
    5. final_layout_top1.png: High-resolution rendering of Top-1 predicted room layout.
    6. final_layout_top3.png: Multi-panel comparison of Top-3 competing layouts.
    7. overlap_resolution.png: Highlights areas where overlapping boundaries were clipped or resolved.
    8. cavity_retention_audit.png: Highlights oversized cavities retained as single spaces vs split.
    9. corridor_preservation.png: Visualizes elongated corridor hypotheses and their wall support.
    10. room_formation_summary.png: Composite dashboard panel summarizing metrics, counts, and layout quality.
    """

    def __init__(self, output_dir: str):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)

    def _draw_polygon(
        self,
        img: np.ndarray,
        poly: Polygon,
        color: tuple,
        thickness: int = 2,
        fill_color: Optional[tuple] = None,
        alpha: float = 0.25,
    ):
        if poly.is_empty:
            return
        coords = np.array(poly.exterior.coords, dtype=np.int32)
        if fill_color is not None:
            overlay = img.copy()
            cv2.fillPoly(overlay, [coords], fill_color)
            cv2.addWeighted(overlay, alpha, img, 1 - alpha, 0, img)
        cv2.polylines(img, [coords], isClosed=True, color=color, thickness=thickness)

    def render_final_rooms(
        self,
        base_image: np.ndarray,
        layout: FinalRoomLayout,
        filename: str = "final_rooms.png",
    ) -> str:
        """Renders final room polygons with label text and scores."""
        img = base_image.copy() if base_image is not None else np.ones((800, 800, 3), dtype=np.uint8) * 255
        
        # Color palette for rooms
        colors = [
            (220, 50, 50), (50, 180, 50), (50, 50, 220), (200, 150, 30),
            (180, 50, 180), (30, 180, 180), (120, 120, 50), (70, 70, 200),
        ]

        for idx, room in enumerate(layout.rooms):
            c = colors[idx % len(colors)]
            fill_c = (int(c[0] * 0.5 + 100), int(c[1] * 0.5 + 100), int(c[2] * 0.5 + 100))
            self._draw_polygon(img, room.polygon, color=c, thickness=2, fill_color=fill_c, alpha=0.3)

            # Draw label
            centroid = room.polygon.centroid
            cx, cy = int(centroid.x), int(centroid.y)
            lbl = f"{room.id} ({room.score:.2f})"
            cv2.putText(img, lbl, (cx - 30, cy), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 0), 2, cv2.LINE_AA)
            cv2.putText(img, lbl, (cx - 30, cy), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1, cv2.LINE_AA)

        out_path = os.path.join(self.output_dir, filename)
        cv2.imwrite(out_path, img)
        return out_path

    def render_parent_vs_children(
        self,
        base_image: np.ndarray,
        layout: FinalRoomLayout,
        filename: str = "parent_vs_children.png",
    ) -> str:
        """Visualizes parent vs child status for all final rooms."""
        img = base_image.copy() if base_image is not None else np.ones((800, 800, 3), dtype=np.uint8) * 255
        for room in layout.rooms:
            if room.parent_id:
                # Child partition
                c = (0, 140, 255) # Orange
                lbl = f"Child: {room.id}"
            else:
                # Parent or independent
                c = (50, 180, 50) # Green
                lbl = f"Primary: {room.id}"
            self._draw_polygon(img, room.polygon, color=c, thickness=2, fill_color=c, alpha=0.2)
            cx, cy = int(room.polygon.centroid.x), int(room.polygon.centroid.y)
            cv2.putText(img, lbl, (cx - 25, cy), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 0, 0), 2)
            cv2.putText(img, lbl, (cx - 25, cy), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)

        out_path = os.path.join(self.output_dir, filename)
        cv2.imwrite(out_path, img)
        return out_path

    def render_top3_layouts(
        self,
        base_image: np.ndarray,
        layouts: List[FinalRoomLayout],
        filename: str = "final_layout_top3.png",
    ) -> str:
        """Renders side-by-side or stacked panels for Top-3 layouts."""
        panels = []
        for idx, lay in enumerate(layouts[:3]):
            p = base_image.copy() if base_image is not None else np.ones((600, 600, 3), dtype=np.uint8) * 255
            for r in lay.rooms:
                self._draw_polygon(p, r.polygon, color=(200, 50, 50), thickness=2, fill_color=(100, 180, 240), alpha=0.3)
            title = f"Layout #{idx+1} (Rooms: {len(lay.rooms)}, Score: {lay.global_score:.2f})"
            cv2.putText(p, title, (20, 35), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 200), 2)
            panels.append(p)

        if not panels:
            panels = [np.ones((600, 600, 3), dtype=np.uint8) * 255]

        # Resize to common height and stack horizontally if possible
        h = 500
        resized = [cv2.resize(p, (int(p.shape[1] * h / p.shape[0]), h)) for p in panels]
        combined = np.hstack(resized)
        out_path = os.path.join(self.output_dir, filename)
        cv2.imwrite(out_path, combined)
        return out_path
