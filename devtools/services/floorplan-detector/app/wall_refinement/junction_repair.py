"""
Junction Repair Module for Phase 2.10.11 Multimodal Structural Wall Mask Refinement.
Detects and reconnects fragmented T-junctions, L-corners, and +-crossings
where individual wall strokes are strong but the intersection vertex was broken.
"""
from typing import List, Tuple, Dict, Any, Optional
import cv2
import numpy as np
from .models import CandidateJunction


class JunctionRepairEngine:
    """
    Connects stroke endpoints to nearby orthogonal walls to form clean topological junctions.
    """

    def __init__(self, snap_distance_px: float = 18.0, repair_thickness_px: int = 4):
        self.snap_distance_px = snap_distance_px
        self.repair_thickness_px = repair_thickness_px

    def detect_and_repair_junctions(
        self,
        binary_mask: np.ndarray,
        wall_confidence: np.ndarray,
        protected_opening_mask: np.ndarray,
        linkage_evidence: Optional[np.ndarray] = None,
    ) -> Tuple[np.ndarray, List[CandidateJunction], int]:
        """
        Snaps dangling wall endpoints to nearby perpendicular wall strokes.
        Returns:
        - repaired_mask: uint8 binary wall mask
        - candidate_junctions: list of CandidateJunction records
        - repaired_count: count of successfully formed junctions
        """
        h, w = binary_mask.shape[:2]
        repaired_mask = binary_mask.copy()
        candidate_junctions: List[CandidateJunction] = []
        repaired_count = 0

        # OpenCV morphological skeletonization (scaled for large drawings)
        max_dim = max(h, w)
        max_skel_iter = 100
        if max_dim > 1600:
            scale = 1600.0 / float(max_dim)
            sh, sw = int(round(h * scale)), int(round(w * scale))
            small_bin = cv2.resize(binary_mask, (sw, sh), interpolation=cv2.INTER_NEAREST)
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
            skel = np.zeros(binary_mask.shape, dtype=np.uint8)
            element = cv2.getStructuringElement(cv2.MORPH_CROSS, (3, 3))
            temp = (binary_mask > 0).astype(np.uint8) * 255
            for _ in range(max_skel_iter):
                eroded = cv2.erode(temp, element)
                opened = cv2.morphologyEx(eroded, cv2.MORPH_OPEN, element)
                subset = cv2.subtract(eroded, opened)
                skel = cv2.bitwise_or(skel, subset)
                temp = eroded.copy()
                if cv2.countNonZero(temp) == 0:
                    break

        kernel = np.array([[1, 1, 1], [1, 10, 1], [1, 1, 1]], dtype=np.uint8)
        filtered = cv2.filter2D(skel // 255, -1, kernel)
        endpoint_mask = (filtered == 11).astype(np.uint8) * 255

        y_pts, x_pts = np.where(endpoint_mask > 0)
        endpoints = list(zip(x_pts, y_pts))

        if not endpoints:
            return repaired_mask, candidate_junctions, 0

        if len(endpoints) > 120:
            step = len(endpoints) // 120 + 1
            endpoints = endpoints[::step]

        num_mask_labels, mask_labels = cv2.connectedComponents(binary_mask, connectivity=8)

        junc_idx = 0
        for pt in endpoints:
            x, y = float(pt[0]), float(pt[1])
            ix, iy = int(round(x)), int(round(y))
            my_mask_id = mask_labels[iy, ix]

            # Search in small radius for nearby solid wall that is not this local stroke
            r = int(self.snap_distance_px)
            x_min, x_max = max(0, ix - r), min(w - 1, ix + r)
            y_min, y_max = max(0, iy - r), min(h - 1, iy + r)

            # Mask out local connected component of the endpoint itself
            roi = binary_mask[y_min:y_max + 1, x_min:x_max + 1].copy()
            roi_labels = mask_labels[y_min:y_max + 1, x_min:x_max + 1]
            if my_mask_id > 0:
                roi[roi_labels == my_mask_id] = 0

            # Find closest wall pixel in roi
            wall_y, wall_x = np.where(roi > 0)
            if len(wall_x) == 0:
                continue

            # Convert to absolute coords
            abs_x = wall_x + x_min
            abs_y = wall_y + y_min
            dists = np.hypot(abs_x - x, abs_y - y)
            min_idx = int(np.argmin(dists))
            target_x, target_y = int(abs_x[min_idx]), int(abs_y[min_idx])
            best_dist = float(dists[min_idx])

            if 2.0 <= best_dist <= self.snap_distance_px:
                # Check opening protection along extension line
                test_line = np.zeros((h, w), dtype=np.uint8)
                cv2.line(test_line, (ix, iy), (target_x, target_y), 255, thickness=self.repair_thickness_px)

                if cv2.countNonZero(cv2.bitwise_and(test_line, protected_opening_mask)) > 0:
                    continue  # Do not cross doors/windows

                # Check if near linkage point evidence from ML along test_line or target
                has_linkage = False
                if linkage_evidence is not None:
                    check_region = test_line.copy()
                    cv2.circle(check_region, (target_x, target_y), 4, 255, -1)
                    if np.max(linkage_evidence[check_region > 0]) >= 0.20:
                        has_linkage = True

                # Connect junction
                cv2.line(repaired_mask, (ix, iy), (target_x, target_y), 255, thickness=self.repair_thickness_px)
                repaired_count += 1

                candidate_junctions.append(
                    CandidateJunction(
                        junction_id=f"junc_{junc_idx:03d}",
                        point=(float(target_x), float(target_y)),
                        junction_type="T" if not has_linkage else "X",
                        is_repaired=True,
                        confidence=0.85 if has_linkage else 0.70,
                    )
                )
                junc_idx += 1

        return repaired_mask, candidate_junctions, repaired_count
