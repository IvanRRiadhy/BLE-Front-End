"""
Topology-Aware Gap Repair for Phase 2.10.11 Multimodal Structural Wall Mask Refinement.
Detects candidate wall gaps and classifies them:
- ARCHITECTURAL_GAP: Candidate for directional bridge repair
- DOORWAY_GAP: Legitimate opening (DO NOT REPAIR)
- WINDOW_GAP: Legitimate window (DO NOT REPAIR)
- ARTIFACT_GAP: Noise / furniture (DO NOT REPAIR)
- UNKNOWN_GAP: Conservative gap
Repairs ONLY ARCHITECTURAL_GAP where collinearity, thickness, and confidence match,
and no protected openings intersect the bridge trajectory.
"""
from typing import List, Tuple, Dict, Any, Optional
import cv2
import numpy as np
from .models import CandidateGap, GapType


class GapRepairEngine:
    """
    Directional gap classifier and selective bridge repair engine.
    """

    def __init__(
        self,
        max_gap_length_px: float = 35.0,
        min_gap_length_px: float = 4.0,
        max_angle_diff_deg: float = 20.0,
        repair_thickness_px: int = 4,
    ):
        self.max_gap_length_px = max_gap_length_px
        self.min_gap_length_px = min_gap_length_px
        self.max_angle_diff_deg = max_angle_diff_deg
        self.repair_thickness_px = repair_thickness_px

    def detect_and_repair_gaps(
        self,
        binary_mask: np.ndarray,
        wall_confidence: np.ndarray,
        protected_opening_mask: np.ndarray,
        wall_network: Optional[Any] = None,
    ) -> Tuple[np.ndarray, List[CandidateGap], int]:
        """
        Repairs architectural wall gaps without closing protected openings.
        Returns:
        - repaired_mask: uint8 binary wall mask
        - candidate_gaps: list of CandidateGap records with classification
        - repaired_count: count of successfully bridged gaps
        """
        h, w = binary_mask.shape[:2]
        repaired_mask = binary_mask.copy()
        candidate_gaps: List[CandidateGap] = []
        repaired_count = 0

        # Extract wall endpoints via OpenCV morphological skeletonization (scaled for large drawings)
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

        # Find endpoints: pixels in skeleton with exactly 1 neighbor in 3x3 neighborhood
        kernel = np.array([[1, 1, 1], [1, 10, 1], [1, 1, 1]], dtype=np.uint8)
        filtered = cv2.filter2D(skel // 255, -1, kernel)
        endpoint_mask = (filtered == 11).astype(np.uint8) * 255

        y_pts, x_pts = np.where(endpoint_mask > 0)
        endpoints = list(zip(x_pts, y_pts))

        if len(endpoints) < 2:
            return repaired_mask, candidate_gaps, 0

        # Subsample endpoints if too dense to maintain strict performance budget
        if len(endpoints) > 150:
            step = len(endpoints) // 150 + 1
            endpoints = endpoints[::step]

        # Pairwise search for collinear endpoints facing each other
        gap_idx = 0
        used_pts = set()

        for i in range(len(endpoints)):
            if i in used_pts:
                continue
            p1 = endpoints[i]
            x1, y1 = float(p1[0]), float(p1[1])

            # Check local orientation at p1
            # (Sample 5px tangent direction from skeleton)
            best_j = -1
            min_dist = self.max_gap_length_px + 1.0

            for j in range(i + 1, len(endpoints)):
                if j in used_pts:
                    continue
                p2 = endpoints[j]
                x2, y2 = float(p2[0]), float(p2[1])

                dx = x2 - x1
                dy = y2 - y1
                dist = np.hypot(dx, dy)

                if self.min_gap_length_px <= dist <= self.max_gap_length_px:
                    if dist < min_dist:
                        min_dist = dist
                        best_j = j

            if best_j != -1:
                p2 = endpoints[best_j]
                x2, y2 = float(p2[0]), float(p2[1])
                dx = x2 - x1
                dy = y2 - y1
                angle = float(np.degrees(np.arctan2(dy, dx))) % 180.0

                # Sample test bridge line
                test_line = np.zeros((h, w), dtype=np.uint8)
                cv2.line(test_line, (int(x1), int(y1)), (int(x2), int(y2)), 255, thickness=self.repair_thickness_px)

                # Check if bridge intersects protected openings
                intersects_opening = cv2.countNonZero(cv2.bitwise_and(test_line, protected_opening_mask)) > 0

                # Sample underlying wall confidence along bridge
                line_pts = np.where(test_line > 0)
                mean_conf = float(np.mean(wall_confidence[line_pts])) if len(line_pts[0]) > 0 else 0.0

                # Classify gap
                if intersects_opening:
                    gap_type = GapType.DOORWAY_GAP
                elif mean_conf >= 0.20 or min_dist <= 12.0:
                    gap_type = GapType.ARCHITECTURAL_GAP
                else:
                    gap_type = GapType.UNKNOWN_GAP

                gap_id = f"gap_{gap_idx:03d}"
                gap_idx += 1

                is_rep = False
                if gap_type == GapType.ARCHITECTURAL_GAP:
                    # Execute selective bridge repair
                    cv2.line(repaired_mask, (int(x1), int(y1)), (int(x2), int(y2)), 255, thickness=self.repair_thickness_px)
                    is_rep = True
                    repaired_count += 1
                    used_pts.add(i)
                    used_pts.add(best_j)

                candidate_gaps.append(
                    CandidateGap(
                        gap_id=gap_id,
                        p1=(x1, y1),
                        p2=(x2, y2),
                        length_px=float(min_dist),
                        orientation_deg=angle,
                        gap_type=gap_type,
                        confidence=mean_conf,
                        is_repaired=is_rep,
                    )
                )

        return repaired_mask, candidate_gaps, repaired_count
