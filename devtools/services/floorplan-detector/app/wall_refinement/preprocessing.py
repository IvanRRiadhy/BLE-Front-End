"""
Preprocessing module for Phase 2.10.11 Multimodal Structural Wall Mask Refinement.
Provides normalized grayscale, background polarity detection, bilateral noise reduction,
and local contrast normalization.
"""
from typing import Tuple
import cv2
import numpy as np


def normalize_image(img: np.ndarray) -> Tuple[np.ndarray, np.ndarray, bool]:
    """
    Takes an input BGR or grayscale image and returns:
    - gray: uint8 grayscale (0..255)
    - contrast_norm: float32 contrast-normalized image (0..1)
    - is_light_bg: True if background is white/light, False if dark/blueprint
    """
    if img is None or img.size == 0:
        raise ValueError("Image array is empty or None")

    if len(img.shape) == 3 and img.shape[2] == 3:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    elif len(img.shape) == 2:
        gray = img.copy()
    else:
        raise ValueError(f"Unsupported image shape: {img.shape}")

    # Polarity detection: evaluate perimeter pixels
    h, w = gray.shape[:2]
    border_px = np.concatenate([
        gray[0, :],
        gray[h - 1, :],
        gray[:, 0],
        gray[:, w - 1]
    ])
    median_border = float(np.median(border_px))
    is_light_bg = median_border > 127.0

    # Bilateral smoothing preserving edges
    denoised = cv2.bilateralFilter(gray, d=7, sigmaColor=50, sigmaSpace=50)

    # Local adaptive CLAHE contrast enhancement
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(denoised)

    contrast_norm = enhanced.astype(np.float32) / 255.0
    return gray, contrast_norm, is_light_bg
