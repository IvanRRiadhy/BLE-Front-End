"""
Deterministic Mask Fusion for Phase 2.10.11 Multimodal Structural Wall Mask Refinement.
Combines:
- Baseline or fused wall confidence maps
- Gap repairs
- Junction repairs
- Opening protection carve-outs
Produces the final watertight refinedWallMask.
"""
from typing import Tuple, Optional
import cv2
import numpy as np


class MaskFusionEngine:
    """
    Fuses continuous wall confidence maps, repaired segments, and opening masks into binary output.
    """

    def __init__(self, confidence_threshold: float = 0.35, min_wall_thickness_px: int = 3):
        self.confidence_threshold = confidence_threshold
        self.min_wall_thickness_px = min_wall_thickness_px

    def fuse_refined_mask(
        self,
        wall_confidence: np.ndarray,
        baseline_mask: Optional[np.ndarray],
        protected_opening_mask: np.ndarray,
        repaired_gap_mask: Optional[np.ndarray] = None,
        repaired_junction_mask: Optional[np.ndarray] = None,
    ) -> np.ndarray:
        """
        Synthesizes the final refined wall mask.
        """
        # Threshold confidence map
        conf_binary = (wall_confidence >= self.confidence_threshold).astype(np.uint8) * 255

        # Incorporate baseline mask if provided
        if baseline_mask is not None:
            combined = cv2.bitwise_or(conf_binary, baseline_mask)
        else:
            combined = conf_binary

        # Incorporate gap and junction repairs
        if repaired_gap_mask is not None:
            combined = cv2.bitwise_or(combined, repaired_gap_mask)
        if repaired_junction_mask is not None:
            combined = cv2.bitwise_or(combined, repaired_junction_mask)

        # STRICTLY SUBTRACT PROTECTED OPENINGS
        # legimate doors, windows, and exterior openings must NOT be blocked
        refined_mask = cv2.bitwise_and(combined, cv2.bitwise_not(protected_opening_mask))

        # Thin morphological closing (3px) to remove single-pixel hairline holes without bridging doors
        k = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        refined_mask = cv2.morphologyEx(refined_mask, cv2.MORPH_CLOSE, k)

        # Re-apply opening protection carve-out after closing
        refined_mask = cv2.bitwise_and(refined_mask, cv2.bitwise_not(protected_opening_mask))

        return refined_mask
