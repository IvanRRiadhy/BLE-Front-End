"""
Phase 2.10.0 Architectural Wall Protection Subsystem
Protects structural building walls from accidental text suppression.
Computes protected wall masks, safe text masks, and rigorous wall preservation metrics.
"""
from typing import Tuple, Dict, Any, Optional
import cv2
import numpy as np

from .models import WallPreservationMetrics


def compute_wall_protection_mask(
    wall_evidence: np.ndarray,
    safety_buffer_px: int = 2,
    thick_walls: Optional[np.ndarray] = None,
    struct_lines: Optional[np.ndarray] = None,
) -> np.ndarray:
    """
    Constructs an architectural wall protection zone.
    Combines primary wall evidence, structural lines, and thick walls,
    dilating by a safety buffer to shield boundary pixels.
    """
    if wall_evidence is None or wall_evidence.size == 0:
        return np.zeros((0, 0), dtype=np.uint8)

    h, w = wall_evidence.shape[:2]
    # Ensure binary 0..255
    if wall_evidence.dtype != np.uint8:
        base_walls = (wall_evidence > 0.3).astype(np.uint8) * 255
    else:
        base_walls = (wall_evidence > 0).astype(np.uint8) * 255

    # Fuse with additional structural channels if supplied
    fused_walls = base_walls.copy()
    if thick_walls is not None and thick_walls.shape[:2] == (h, w):
        fused_walls = cv2.bitwise_or(fused_walls, (thick_walls > 0).astype(np.uint8) * 255)
    if struct_lines is not None and struct_lines.shape[:2] == (h, w):
        fused_walls = cv2.bitwise_or(fused_walls, (struct_lines > 0).astype(np.uint8) * 255)

    # Dilate by safety buffer to protect wall antialiasing, edges, and junctions
    if safety_buffer_px > 0:
        k_size = safety_buffer_px * 2 + 1
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (k_size, k_size))
        protected_mask = cv2.dilate(fused_walls, kernel)
    else:
        protected_mask = fused_walls

    return protected_mask


def compute_safe_text_mask(
    text_mask: np.ndarray,
    wall_protection_mask: np.ndarray,
) -> np.ndarray:
    """
    Computes safeTextMask by subtracting protected wall pixels from textMask:
        safeTextMask = textMask MINUS wallProtectionMask
    
    CORE SAFETY INVARIANT:
    High wall evidence completely protects pixels from text suppression.
    Any pixel with wall protection active will have value 0 in safeTextMask.
    """
    if text_mask is None or text_mask.size == 0:
        return np.zeros((0, 0), dtype=np.uint8)
    if wall_protection_mask is None or wall_protection_mask.size == 0:
        return text_mask.copy()

    # Binary subtraction: retain text pixels only where wall protection is ZERO
    safe_mask = cv2.bitwise_and(text_mask, cv2.bitwise_not(wall_protection_mask))
    return safe_mask


def compute_wall_preservation_metrics(
    wall_mask_before: np.ndarray,
    applied_suppression_mask: np.ndarray,
    safe_loss_threshold: float = 0.005,  # Alert if wall loss exceeds 0.5%
) -> WallPreservationMetrics:
    """
    Calculates quantitative architectural wall preservation metrics:
    - Pixel loss count and ratio
    - Topological connectivity before and after suppression
    """
    if wall_mask_before is None or wall_mask_before.size == 0:
        return WallPreservationMetrics(is_safe=True)

    # Ensure binary 0..255
    bin_before = (wall_mask_before > 0).astype(np.uint8) * 255
    suppression_bin = (applied_suppression_mask > 0).astype(np.uint8) * 255

    # Walls after applying suppression
    walls_after = cv2.bitwise_and(bin_before, cv2.bitwise_not(suppression_bin))

    total_pixels_before = int(np.count_nonzero(bin_before))
    total_pixels_after = int(np.count_nonzero(walls_after))
    pixel_loss = max(0, total_pixels_before - total_pixels_after)
    loss_ratio = float(pixel_loss) / max(1.0, float(total_pixels_before))

    # Connectivity / topological integrity via Connected Components
    _, labels_before = cv2.connectedComponents(bin_before, connectivity=8)
    _, labels_after = cv2.connectedComponents(walls_after, connectivity=8)
    
    num_cc_before = int(np.max(labels_before)) if labels_before.size > 0 else 0
    num_cc_after = int(np.max(labels_after)) if labels_after.size > 0 else 0

    is_safe = bool(loss_ratio <= safe_loss_threshold)

    return WallPreservationMetrics(
        wall_pixels_before=total_pixels_before,
        wall_pixels_after=total_pixels_after,
        wall_pixel_loss=pixel_loss,
        wall_pixel_loss_ratio=loss_ratio,
        wall_connectivity_before=num_cc_before,
        wall_connectivity_after=num_cc_after,
        is_safe=is_safe,
    )
