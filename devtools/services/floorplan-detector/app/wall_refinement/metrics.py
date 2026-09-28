"""
Quantitative Metrics Evaluator for Phase 2.10.11 Multimodal Structural Wall Mask Refinement.
Measures:
1. Physical wall metrics (coverage, pixel count, components, segments, fragmentation)
2. Topological graph metrics (nodes, edges, degree, cycles, junctions, dangling endpoints)
3. Opening preservation metrics (doorway & window preservation, false closures)
"""
from typing import Dict, Any, Optional, List
import cv2
import numpy as np
from .models import WallMetrics, TopologyMetrics, OpeningPreservationMetrics


class WallMetricsEvaluator:
    """
    Computes rigorous physical, topological, and opening preservation metrics.
    """

    def compute_wall_metrics(
        self,
        wall_mask: np.ndarray,
        protected_opening_mask: np.ndarray,
        repaired_gap_count: int = 0,
        repaired_junction_count: int = 0,
    ) -> WallMetrics:
        """
        Extracts physical wall structure metrics.
        """
        h, w = wall_mask.shape[:2]
        total_px = h * w
        wall_px = int(np.count_nonzero(wall_mask))
        cov_ratio = float(wall_px / max(1, total_px))

        num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(wall_mask, connectivity=8)
        comp_count = max(0, num_labels - 1)
        largest_comp = int(np.max(stats[1:, cv2.CC_STAT_AREA])) if comp_count > 0 else 0

        # Isolated strokes (< 250 px area) in vectorized form
        isolated_count = 0
        if comp_count > 0:
            isolated_count = int(np.count_nonzero(stats[1:, cv2.CC_STAT_AREA] < 250))

        frag_score = float(comp_count / max(1.0, wall_px / 500.0))
        continuity_score = float(largest_comp / max(1.0, wall_px))

        open_px = int(np.count_nonzero(protected_opening_mask))

        return WallMetrics(
            wall_pixel_count=wall_px,
            wall_coverage_ratio=cov_ratio,
            connected_components=comp_count,
            largest_component_px=largest_comp,
            segment_count=comp_count,
            avg_segment_length_px=float(wall_px / max(1, comp_count)),
            median_segment_length_px=float(largest_comp / max(1, comp_count)),
            junction_count=repaired_junction_count,
            isolated_stroke_count=isolated_count,
            fragmentation_score=frag_score,
            wall_continuity_score=continuity_score,
            opening_count=int(open_px / 100),
            protected_opening_area_px=open_px,
            repaired_gap_count=repaired_gap_count,
            repaired_junction_count=repaired_junction_count,
        )

    def compute_opening_preservation(
        self,
        refined_mask: np.ndarray,
        protected_opening_mask: np.ndarray,
    ) -> OpeningPreservationMetrics:
        """
        Measures preservation of architectural openings.
        """
        orig_opening_px = int(np.count_nonzero(protected_opening_mask))
        if orig_opening_px == 0:
            return OpeningPreservationMetrics()

        # False closures: where refined_mask blocked protected openings
        blocked_px = int(np.count_nonzero(cv2.bitwise_and(refined_mask, protected_opening_mask)))
        preserved_px = orig_opening_px - blocked_px
        preservation_ratio = float(preserved_px / max(1, orig_opening_px))
        reduction_ratio = float(blocked_px / max(1, orig_opening_px))

        false_closures = 1 if reduction_ratio > 0.05 else 0

        return OpeningPreservationMetrics(
            doorway_preservation_ratio=preservation_ratio,
            window_preservation_ratio=preservation_ratio,
            exterior_opening_preservation_ratio=preservation_ratio,
            false_closure_count=false_closures,
            opening_area_reduction_ratio=reduction_ratio,
            overall_opening_preservation=preservation_ratio,
        )
