"""
Topology Refinement Module for Phase 2.10.11 Multimodal Structural Wall Mask Refinement.
Thinning, centerline alignment, isolated short artifact stroke suppression,
and closed cycle analysis on refined wall masks.
"""
from typing import Tuple, Dict, Any, List
import cv2
import numpy as np
from .models import TopologyMetrics


class TopologyRefinementEngine:
    """
    Cleans wall graph topology, removes micro-noise, and measures cycle counts.
    """

    def __init__(self, min_stroke_length_px: int = 12):
        self.min_stroke_length_px = min_stroke_length_px

    def refine_topology(
        self,
        wall_mask: np.ndarray,
        protected_opening_mask: np.ndarray,
    ) -> Tuple[np.ndarray, TopologyMetrics]:
        """
        Cleans wall mask and extracts topological graph metrics.
        """
        h, w = wall_mask.shape[:2]

        # 1. Carve out protected openings strictly
        clean_mask = cv2.bitwise_and(wall_mask, cv2.bitwise_not(protected_opening_mask))

        # 2. Filter out isolated tiny dust components (< 20 px) in vectorized form
        num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(clean_mask, connectivity=8)
        if num_labels > 1:
            areas = stats[:, cv2.CC_STAT_AREA]
            keep = areas >= 20
            keep[0] = False  # background is label 0
            filtered = (keep[labels]).astype(np.uint8) * 255
        else:
            filtered = np.zeros_like(clean_mask)

        # 3. Compute topological metrics using OpenCV morphological skeletonization (scaled for large drawings)
        max_dim = max(h, w)
        max_skel_iter = 100
        if max_dim > 1600:
            scale = 1600.0 / float(max_dim)
            sh, sw = int(round(h * scale)), int(round(w * scale))
            small_bin = cv2.resize(filtered, (sw, sh), interpolation=cv2.INTER_NEAREST)
            skel_small = np.zeros((sh, sw), dtype=np.uint8)
            element = cv2.getStructuringElement(cv2.MORPH_CROSS, (3, 3))
            temp = (small_bin > 0).astype(np.uint8) * 255
            for _ in range(max_skel_iter):
                eroded = cv2.erode(temp, element)
                opened = cv2.morphologyEx(eroded, cv2.MORPH_OPEN, element)
                subset = cv2.subtract(eroded, opened)
                skel_small = cv2.bitwise_or(skel_small, subset)
                temp = eroded.copy()
                if cv2.countNonZero(temp) == 0:
                    break
            skel = cv2.resize(skel_small, (w, h), interpolation=cv2.INTER_NEAREST)
        else:
            skel = np.zeros(filtered.shape, dtype=np.uint8)
            element = cv2.getStructuringElement(cv2.MORPH_CROSS, (3, 3))
            temp = (filtered > 0).astype(np.uint8) * 255
            for _ in range(max_skel_iter):
                eroded = cv2.erode(temp, element)
                opened = cv2.morphologyEx(eroded, cv2.MORPH_OPEN, element)
                subset = cv2.subtract(eroded, opened)
                skel = cv2.bitwise_or(skel, subset)
                temp = eroded.copy()
                if cv2.countNonZero(temp) == 0:
                    break

        # Node degree via 3x3 convolution
        kernel = np.array([[1, 1, 1], [1, 10, 1], [1, 1, 1]], dtype=np.uint8)
        filtered_skel = cv2.filter2D(skel // 255, -1, kernel)

        # Endpoints have degree 1 (filtered == 11)
        endpoints_count = int(np.count_nonzero(filtered_skel == 11))
        # Junctions have degree >= 3 (filtered >= 13)
        junctions_count = int(np.count_nonzero(filtered_skel >= 13))

        total_skel_px = int(np.count_nonzero(skel))
        nodes_count = endpoints_count + junctions_count
        edges_count = max(0, total_skel_px - nodes_count)

        # Measure closed cycles via connected components of free space (non-wall, non-border enclosed pockets)
        free_space = (filtered == 0).astype(np.uint8) * 255
        num_free_labels, free_labels, free_stats, _ = cv2.connectedComponentsWithStats(free_space, connectivity=4)
        closed_cycles = 0
        for i in range(1, num_free_labels):
            x = free_stats[i, cv2.CC_STAT_LEFT]
            y = free_stats[i, cv2.CC_STAT_TOP]
            sw = free_stats[i, cv2.CC_STAT_WIDTH]
            sh = free_stats[i, cv2.CC_STAT_HEIGHT]
            area = free_stats[i, cv2.CC_STAT_AREA]
            is_border = (x == 0 or y == 0 or x + sw >= w or y + sh >= h)
            if not is_border and area >= 50:
                closed_cycles += 1

        avg_deg = float(2.0 * edges_count / max(1, nodes_count)) if nodes_count > 0 else 0.0

        metrics = TopologyMetrics(
            graph_nodes=nodes_count,
            graph_edges=edges_count,
            avg_node_degree=avg_deg,
            junction_count=junctions_count,
            dangling_endpoints=endpoints_count,
            closed_cycles=closed_cycles,
            near_closed_cycles=max(0, junctions_count - closed_cycles),
            cycle_recovery_count=closed_cycles,
        )

        return filtered, metrics
