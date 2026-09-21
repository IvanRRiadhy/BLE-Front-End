"""
Phase 2.10.0 Text Mask Generation Subsystem
Produces derived text masks (binary, confidence-weighted, and soft attenuation)
without altering original image pixels.
"""
from typing import List, Tuple, Optional
import cv2
import numpy as np

from .models import TextRegion


def generate_binary_text_mask(
    regions: List[TextRegion],
    image_shape: Tuple[int, int],
    confidence_threshold: float = 0.35,
    dilate_px: int = 1,
) -> np.ndarray:
    """
    Generates a deterministic 8-bit binary text mask (0 or 255) from detected text regions.
    """
    h, w = image_shape[:2]
    mask = np.zeros((h, w), dtype=np.uint8)

    for reg in regions:
        if reg.confidence < confidence_threshold:
            continue
        poly_pts = np.array(reg.polygon, dtype=np.int32)
        cv2.fillPoly(mask, [poly_pts], 255)

    if dilate_px > 0 and np.count_nonzero(mask) > 0:
        k_sz = dilate_px * 2 + 1
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (k_sz, k_sz))
        mask = cv2.dilate(mask, kernel)

    return mask


def generate_soft_attenuation_mask(
    safe_text_mask: np.ndarray,
    text_likelihood_map: np.ndarray,
    attenuation_factor: float = 0.5,
) -> np.ndarray:
    """
    Generates a soft continuous attenuation map (float32, 0.0 to 1.0).
    Instead of hard binary subtraction:
        attenuation = 1.0 - (safe_text_mask_factor * likelihood * (1.0 - attenuation_factor))
    
    Pixels with no text have attenuation = 1.0 (full strength).
    Pixels with safe text have their influence attenuated to attenuation_factor (e.g. 0.5).
    """
    if safe_text_mask is None or safe_text_mask.size == 0:
        return np.ones((1, 1), dtype=np.float32)

    h, w = safe_text_mask.shape[:2]
    safe_factor = (safe_text_mask > 0).astype(np.float32)
    
    if text_likelihood_map is not None and text_likelihood_map.shape[:2] == (h, w):
        like_factor = np.clip(text_likelihood_map, 0.0, 1.0)
    else:
        like_factor = safe_factor

    # Compute soft attenuation (1.0 = unchanged, <1.0 = attenuated)
    reduction = safe_factor * like_factor * (1.0 - float(attenuation_factor))
    attenuation_map = np.clip(1.0 - reduction, float(attenuation_factor), 1.0).astype(np.float32)

    return attenuation_map
