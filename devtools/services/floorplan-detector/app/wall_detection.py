"""
Multi-Channel Wall & Boundary Evidence Detection Subsystem (Phase 2.7.2)
Extracts multi-evidence structural boundaries combining:
- A. Grayscale dark-pixel evidence
- B. Adaptive threshold evidence
- C. Canny edge evidence
- D. Sobel horizontal gradient evidence
- E. Sobel vertical gradient evidence
- F. RGB/HSV/Lab color contrast evidence
- G. Morphological linear structural evidence

Also estimates architectural wall thickness before closing gaps, clamps adaptive morphology kernels,
and suppresses isolated furniture & text artifacts.
"""
import cv2
import numpy as np
from typing import Tuple, Dict, Any, Optional
from .models import DetectionConfig
from .preprocessing import extract_color_channels, detect_image_polarity

def estimate_wall_thickness(binary: np.ndarray, config: DetectionConfig) -> float:
    """
    Estimates dominant architectural wall thickness in pixels using distance transform
    on structural wall strokes.
    """
    h, w = binary.shape[:2]
    if np.count_nonzero(binary) == 0:
        return float(config.estimated_wall_thickness_min)

    # Thin/skeletonize to isolate wall centers
    dist = cv2.distanceTransform(binary, cv2.DIST_L2, 5)
    
    # Extract peaks (local maxima of distance transform corresponding to stroke half-thickness)
    dist_peaks = dist[dist > 1.0]
    if len(dist_peaks) == 0:
        return float(config.estimated_wall_thickness_min)

    # Dominant half-thickness is the median of non-zero distance transform values
    half_thickness = np.median(dist_peaks)
    thickness = float(half_thickness * 2.0)

    # Clamp thickness to plausible architectural limits
    clamped_thickness = max(
        float(config.estimated_wall_thickness_min),
        min(float(config.estimated_wall_thickness_max), thickness)
    )
    return clamped_thickness

def compute_sobel_directional(gray: np.ndarray) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Computes normalized Sobel horizontal, vertical, and overall gradient magnitudes (0..255).
    """
    sobelx = cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=3)
    sobely = cv2.Sobel(gray, cv2.CV_32F, 0, 1, ksize=3)
    
    mag_x = np.abs(sobelx)
    mag_y = np.abs(sobely)
    mag_tot = np.hypot(sobelx, sobely)

    max_tot = mag_tot.max()
    if max_tot > 0:
        mag_x = (mag_x / max_tot) * 255.0
        mag_y = (mag_y / max_tot) * 255.0
        mag_tot = (mag_tot / max_tot) * 255.0

    return mag_x.astype(np.uint8), mag_y.astype(np.uint8), mag_tot.astype(np.uint8)

def compute_canny_edges(gray: np.ndarray) -> np.ndarray:
    """
    Computes auto-thresholded Canny edges based on median pixel intensity.
    """
    med = np.median(gray)
    lower = int(max(0, 0.66 * med))
    upper = int(min(255, 1.33 * med))
    if lower == upper:
        lower = max(0, lower - 20)
        upper = min(255, upper + 20)
    return cv2.Canny(gray, lower, upper)

def compute_directional_structure(binary: np.ndarray, min_length: int = 25) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Extracts continuous horizontal and vertical architectural partitions using
    directional linear structuring elements.
    
    Returns:
    - h_lines: Horizontal structural wall lines
    - v_lines: Vertical structural wall lines
    - struct_lines: Orthogonal union of horizontal and vertical lines
    """
    h_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (min_length, 1))
    v_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, min_length))

    h_lines = cv2.morphologyEx(binary, cv2.MORPH_OPEN, h_kernel)
    v_lines = cv2.morphologyEx(binary, cv2.MORPH_OPEN, v_kernel)
    struct_lines = cv2.bitwise_or(h_lines, v_lines)
    return h_lines, v_lines, struct_lines

def compute_color_evidence(img: Optional[np.ndarray], gray: np.ndarray) -> np.ndarray:
    """
    Computes wall evidence from RGB color contrast and HSV saturation/value for colored/faint blueprint walls.
    """
    if img is None or len(img.shape) < 3 or img.shape[2] < 3:
        # Grayscale fallback
        return np.zeros_like(gray)

    channels = extract_color_channels(img)
    sat = channels["hsv_s"]
    rgb_diff = channels["rgb_diff"]

    # Normalize sat & rgb_diff
    ev_sat = (sat.astype(np.float32) / 255.0)
    ev_rgb = (rgb_diff.astype(np.float32) / 255.0)

    # High saturation or high channel variance indicates colored/drawn wall lines
    color_ev = np.maximum(ev_sat, ev_rgb)
    return (color_ev * 255.0).astype(np.uint8)

def suppress_furniture_and_text(binary: np.ndarray, struct_lines: np.ndarray) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Separates structural building walls from furniture outlines, text labels, and dimension markers.
    
    Returns:
    - thick_structural_walls: Retained primary structural wall mask
    - furniture_mask: Isolated furniture candidates
    - text_mask: Isolated annotation/text candidates
    """
    h, w = binary.shape[:2]
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(binary, connectivity=8)

    thick_structural_walls = np.zeros((h, w), dtype=np.uint8)
    furniture_mask = np.zeros((h, w), dtype=np.uint8)
    text_mask = np.zeros((h, w), dtype=np.uint8)

    for label in range(1, num_labels):
        stat = stats[label]
        bx, by, bw, bh, area = int(stat[cv2.CC_STAT_LEFT]), int(stat[cv2.CC_STAT_TOP]), int(stat[cv2.CC_STAT_WIDTH]), int(stat[cv2.CC_STAT_HEIGHT]), int(stat[cv2.CC_STAT_AREA])
        comp_mask = (labels == label)

        # Check overlap with long directional structural lines
        struct_overlap = np.count_nonzero(cv2.bitwise_and(comp_mask.astype(np.uint8) * 255, struct_lines))
        struct_ratio = float(struct_overlap) / float(max(1, area))

        aspect = max(bw / max(1, bh), bh / max(1, bw))
        bbox_area = max(1, bw * bh)
        fill_ratio = area / bbox_area

        # 1. Text Heuristics: small height/width, low total area, high stroke aspect or character-like box
        if area < 150 and max(bw, bh) < 30 and struct_ratio < 0.10:
            text_mask[comp_mask] = 255
            continue

        # 2. Furniture Heuristics: medium component with high interior density, isolated from main structural walls
        if area < 1800 and struct_ratio < 0.15 and aspect < 4.0:
            furniture_mask[comp_mask] = 255
            continue

        # 3. Retain as Structural Wall Candidate
        thick_structural_walls[comp_mask] = 255

    return thick_structural_walls, furniture_mask, text_mask

def extract_multichannel_wall_evidence(
    gray: np.ndarray,
    binary: np.ndarray,
    config: DetectionConfig,
    raw_img: Optional[np.ndarray] = None,
) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray, Dict[str, np.ndarray], float]:
    """
    Phase 2.7.2 Multi-Channel Wall Evidence Fusion Pipeline.
    
    Extracts 9 independent evidence channels:
    - Dark pixel evidence
    - Adaptive threshold evidence
    - Canny edge evidence
    - Sobel horizontal evidence
    - Sobel vertical evidence
    - Color contrast evidence
    - Directional morphological line evidence
    
    Combines them into a normalized evidence map, estimates wall thickness,
    and applies clamped morphological wall closing.
    
    Returns:
    - closed_wall_mask: Watertight wall barrier network
    - thick_walls: Filtered primary structural walls
    - gradient_img: Sobel total magnitude
    - edges_img: Canny edge map
    - struct_lines: Orthogonal structural lines
    - evidence_channels: Dict of evidence channel images (0..255)
    - est_wall_thickness: Estimated wall thickness in pixels
    """
    h, w = gray.shape[:2]
    is_light_bg = detect_image_polarity(gray)

    # 1. Grayscale Dark Pixel Evidence (float 0..1)
    if is_light_bg:
        dark_ev = (255.0 - gray.astype(np.float32)) / 255.0
    else:
        dark_ev = gray.astype(np.float32) / 255.0

    # 2. Adaptive Threshold Evidence (float 0..1)
    adaptive_binary = cv2.adaptiveThreshold(
        gray,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY_INV if is_light_bg else cv2.THRESH_BINARY,
        config.adaptive_block_size,
        config.adaptive_c,
    )
    adaptive_ev = adaptive_binary.astype(np.float32) / 255.0

    # 3. Canny Edge Evidence (float 0..1)
    edges_img = compute_canny_edges(gray)
    canny_ev = edges_img.astype(np.float32) / 255.0

    # 4. Sobel Horizontal, Vertical, Total Gradient (float 0..1)
    sobel_x, sobel_y, gradient_img = compute_sobel_directional(gray)
    sobel_h_ev = sobel_y.astype(np.float32) / 255.0
    sobel_v_ev = sobel_x.astype(np.float32) / 255.0
    sobel_tot_ev = gradient_img.astype(np.float32) / 255.0

    # 5. Color Contrast Evidence (float 0..1)
    color_img = compute_color_evidence(raw_img, gray)
    color_ev = color_img.astype(np.float32) / 255.0

    # 6. Directional Morphological Structural Evidence
    min_line_len = max(20, int(min(h, w) * 0.025))
    h_lines, v_lines, struct_lines = compute_directional_structure(binary, min_length=min_line_len)
    morph_ev = struct_lines.astype(np.float32) / 255.0

    # 7. Multi-Channel Evidence Fusion (Adaptive Integration)
    total_px = h * w
    struct_ksize = max(3, int(config.wall_close_kernel_size * 0.15))
    struct_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (struct_ksize, struct_ksize))
    thick_walls = cv2.morphologyEx(binary, cv2.MORPH_OPEN, struct_kernel)

    # Check wall density and genuine chromatic color presence (e.g. red/blue/cyan blueprint lines)
    wall_density = np.count_nonzero(thick_walls) / float(total_px)
    channels = extract_color_channels(raw_img) if raw_img is not None else {}
    sat_img = channels.get("hsv_s", np.zeros_like(gray))
    has_color_walls = np.count_nonzero(sat_img > 60) > (0.002 * total_px)

    if wall_density < 0.03 or has_color_walls:
        # Faint, blueprint, or rendered 3D floorplan (e.g. Lantai 1, Lantai 2, Rendered 3D)
        w_dark = config.dark_pixel_weight
        w_adapt = config.adaptive_thresh_weight
        w_canny = config.canny_edge_weight
        w_sobel = config.sobel_gradient_weight
        w_color = config.color_contrast_weight
        w_morph = config.morphology_line_weight

        total_weight = w_dark + w_adapt + w_canny + w_sobel + w_color + w_morph
        fusion_map = (
            w_dark * dark_ev +
            w_adapt * adaptive_ev +
            w_canny * canny_ev +
            w_sobel * sobel_tot_ev +
            w_color * color_ev +
            w_morph * morph_ev
        ) / max(0.01, total_weight)

        wall_evidence_u8 = (np.clip(fusion_map, 0.0, 1.0) * 255.0).astype(np.uint8)
        thresh_val = int(config.wall_evidence_threshold * 255.0)
        _, binary_evidence = cv2.threshold(wall_evidence_u8, thresh_val, 255, cv2.THRESH_BINARY)
        combined_binary = cv2.bitwise_or(binary, binary_evidence)
    else:
        # High-contrast standard architectural floorplan
        wall_evidence_u8 = binary
        combined_binary = binary

    # 8. Phase 2.7.3 Double-Line Wall Fusion & Wall Network Extraction
    from .wall_network import (
        extract_wall_segments,
        fuse_double_line_walls,
        build_wall_network,
        compute_stroke_confidence,
        render_wall_network_mask,
    )
    raw_segments = extract_wall_segments(combined_binary, config)
    fused_segments, paired_tuples = fuse_double_line_walls(raw_segments, config)
    fused_segments = compute_stroke_confidence(fused_segments, (h, w), config)
    wall_net = build_wall_network(fused_segments, config)

    # Render watertight canonical wall network mask
    rendered_net_mask = render_wall_network_mask(fused_segments, (h, w), config)

    # Coverage Sanity Guard: Non-destructive Phase 2.7.2 fallback if rendered_net_mask floods the image (> 45% coverage)
    net_coverage = np.count_nonzero(rendered_net_mask) / float(total_px)
    raw_coverage = np.count_nonzero(combined_binary) / float(total_px)

    if net_coverage > 0.45 and net_coverage > 3.0 * max(0.01, raw_coverage):
        # Fallback to clean Phase 2.7.2 wall evidence without destructive mask OR-ing
        fused_binary = combined_binary
    else:
        fused_binary = cv2.bitwise_or(combined_binary, rendered_net_mask)

    # 9. Estimate Architectural Wall Thickness
    est_wall_thickness = estimate_wall_thickness(fused_binary, config)

    # 10. Morphological Structural Wall Extraction & Furniture/Text Suppression
    struct_ksize = max(3, int(config.wall_close_kernel_size * 0.15))
    struct_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (struct_ksize, struct_ksize))
    thick_walls = cv2.morphologyEx(fused_binary, cv2.MORPH_OPEN, struct_kernel)

    # 11. Clamped Morphological Doorway & Wall Closure
    if config.auto_scale_kernel:
        scale = (w + h) / 2000.0
        base_k = int(config.wall_close_kernel_size * scale)
    else:
        base_k = config.wall_close_kernel_size

    # Clamp kernel size within explicit bounds (default 9..55) and relative to min image dimension
    max_allowed_k = max(35, int(min(h, w) * 0.06))
    ksize = max(
        config.wall_close_kernel_min,
        min(config.wall_close_kernel_max, min(max_allowed_k, base_k))
    )
    if ksize % 2 == 0:
        ksize += 1

    # Directional 1D closures for horizontal and vertical door openings
    h_close_k = cv2.getStructuringElement(cv2.MORPH_RECT, (int(ksize * 1.8), 1))
    v_close_k = cv2.getStructuringElement(cv2.MORPH_RECT, (1, int(ksize * 1.8)))

    h_closed = cv2.morphologyEx(fused_binary, cv2.MORPH_CLOSE, h_close_k)
    v_closed = cv2.morphologyEx(fused_binary, cv2.MORPH_CLOSE, v_close_k)
    closed_wall_mask = cv2.bitwise_or(h_closed, v_closed)

    # Corner junction consolidation (3x3)
    corner_k = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    closed_wall_mask = cv2.morphologyEx(closed_wall_mask, cv2.MORPH_CLOSE, corner_k)

    if config.wall_dilation_iterations > 0:
        dilate_k = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        closed_wall_mask = cv2.dilate(closed_wall_mask, dilate_k, iterations=config.wall_dilation_iterations)

    evidence_channels = {
        "03_dark_pixel": (dark_ev * 255.0).astype(np.uint8),
        "03b_adaptive": adaptive_binary,
        "03c_edges": edges_img,
        "03d_horizontal": h_lines,
        "03e_vertical": v_lines,
        "03f_combined_evidence": wall_evidence_u8,
        "rendered_net_mask": rendered_net_mask,
        "_wall_network": wall_net,
        "_raw_segments": raw_segments,
        "_paired_tuples": paired_tuples,
    }

    return closed_wall_mask, thick_walls, gradient_img, edges_img, struct_lines, evidence_channels, est_wall_thickness

def extract_wall_evidence(
    gray: np.ndarray, binary: np.ndarray, config: DetectionConfig
) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """
    Phase 2.6/2.7 Backwards-compatible signature wrapper.
    """
    closed_mask, thick_walls, gradient_img, edges_img, struct_lines, _, _ = extract_multichannel_wall_evidence(
        gray, binary, config
    )
    return closed_mask, thick_walls, gradient_img, edges_img, struct_lines

def extract_wall_mask(binary: np.ndarray, config: DetectionConfig) -> np.ndarray:
    """
    Backwards-compatible wrapper returning the watertight closed wall mask.
    """
    gray = binary
    closed_mask, _, _, _, _ = extract_wall_evidence(gray, binary, config)
    return closed_mask
