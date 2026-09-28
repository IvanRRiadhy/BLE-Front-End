"""
Classical Evidence Extraction for Phase 2.10.11 Multimodal Structural Wall Mask Refinement.
Extracts multi-channel continuous classical CV evidence:
- Dark pixel evidence
- Adaptive threshold evidence
- Canny edge evidence
- Sobel directional gradients (H, V, Total)
- Directional morphological linear strokes
- Distance transform wall thickness peaks
"""
from typing import Tuple, Dict, Any, Optional
import cv2
import numpy as np


class ClassicalEvidenceExtractor:
    """
    Extracts continuous spatial evidence maps from classical CV filters.
    """

    def __init__(
        self,
        adaptive_block_size: int = 21,
        adaptive_c: float = 7.0,
        canny_low: int = 50,
        canny_high: int = 150,
        morph_min_length_ratio: float = 0.02,
    ):
        self.adaptive_block_size = adaptive_block_size if adaptive_block_size % 2 == 1 else adaptive_block_size + 1
        self.adaptive_c = adaptive_c
        self.canny_low = canny_low
        self.canny_high = canny_high
        self.morph_min_length_ratio = morph_min_length_ratio

    def extract_evidence(
        self,
        gray: np.ndarray,
        raw_img: Optional[np.ndarray] = None,
        is_light_bg: bool = True,
    ) -> Dict[str, np.ndarray]:
        """
        Computes normalized (0.0 .. 1.0) continuous evidence maps.
        """
        h, w = gray.shape[:2]

        # 1. Grayscale dark pixel evidence
        if is_light_bg:
            dark_ev = (255.0 - gray.astype(np.float32)) / 255.0
        else:
            dark_ev = gray.astype(np.float32) / 255.0

        # 2. Adaptive threshold evidence
        adapt_bin = cv2.adaptiveThreshold(
            gray,
            255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY_INV if is_light_bg else cv2.THRESH_BINARY,
            self.adaptive_block_size,
            self.adaptive_c,
        )
        adaptive_ev = adapt_bin.astype(np.float32) / 255.0

        # 3. Canny edge evidence
        edges = cv2.Canny(gray, self.canny_low, self.canny_high)
        # Dilate edges slightly (1px) for spatial continuity
        k_edge = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        edges_dilated = cv2.dilate(edges, k_edge)
        canny_ev = edges_dilated.astype(np.float32) / 255.0

        # 4. Sobel directional gradients
        sobelx = cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=3)
        sobely = cv2.Sobel(gray, cv2.CV_32F, 0, 1, ksize=3)
        mag_x = np.abs(sobelx)
        mag_y = np.abs(sobely)
        mag_tot = np.hypot(sobelx, sobely)
        max_tot = max(1.0, float(mag_tot.max()))

        sobel_h_ev = (mag_y / max_tot).astype(np.float32)
        sobel_v_ev = (mag_x / max_tot).astype(np.float32)
        sobel_tot_ev = (mag_tot / max_tot).astype(np.float32)

        # 5. Directional morphological linear strokes
        min_line_len = max(15, int(min(h, w) * self.morph_min_length_ratio))
        h_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (min_line_len, 1))
        v_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, min_line_len))

        h_open = cv2.morphologyEx(adapt_bin, cv2.MORPH_OPEN, h_kernel)
        v_open = cv2.morphologyEx(adapt_bin, cv2.MORPH_OPEN, v_kernel)
        morph_lines = cv2.bitwise_or(h_open, v_open)
        directional_ev = morph_lines.astype(np.float32) / 255.0

        # Close strokes with small structural kernel
        close_k = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
        morph_closed = cv2.morphologyEx(morph_lines, cv2.MORPH_CLOSE, close_k)
        morph_ev = morph_closed.astype(np.float32) / 255.0

        # 6. Distance transform thickness peak evidence
        dist = cv2.distanceTransform(adapt_bin, cv2.DIST_L2, 5)
        max_d = max(1.0, float(dist.max()))
        thickness_ev = (dist / max_d).astype(np.float32)

        # 7. Color contrast evidence (if 3-channel RGB image provided)
        if raw_img is not None and len(raw_img.shape) == 3 and raw_img.shape[2] == 3:
            hsv = cv2.cvtColor(raw_img, cv2.COLOR_BGR2HSV)
            sat = hsv[:, :, 1].astype(np.float32) / 255.0
            color_ev = sat
        else:
            color_ev = np.zeros((h, w), dtype=np.float32)

        return {
            "grayscale_evidence": dark_ev,
            "adaptive_threshold_evidence": adaptive_ev,
            "canny_evidence": canny_ev,
            "sobel_horizontal_evidence": sobel_h_ev,
            "sobel_vertical_evidence": sobel_v_ev,
            "sobel_total_evidence": sobel_tot_ev,
            "directional_line_evidence": directional_ev,
            "morphology_evidence": morph_ev,
            "thickness_evidence": thickness_ev,
            "color_contrast_evidence": color_ev,
        }
