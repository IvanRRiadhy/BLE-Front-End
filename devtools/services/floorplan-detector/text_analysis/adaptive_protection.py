"""
Phase 2.10.1 Adaptive Protection & Multi-Strategy Suppression Subsystem
Implements continuous, non-binary text suppression maps across Strategies A through H
with strict architectural wall preservation clamping.
"""
from pathlib import Path
from typing import List, Tuple, Dict, Any, Optional
import cv2
import numpy as np

from .models import TextRegion
from .separation import (
    RELATION_INTERIOR,
    RELATION_NEAR_WALL,
    RELATION_WALL_OVERLAP,
    RELATION_AMBIGUOUS,
)


def rasterize_wall_network(
    wall_network: Any,
    shape: Tuple[int, int],
    thick_walls: Optional[np.ndarray] = None,
    struct_lines: Optional[np.ndarray] = None,
    buffer_px: int = 1,
) -> np.ndarray:
    """
    Renders the architectural wall network into a high-confidence architectural wall mask.
    Excludes non-architectural classifications (text, furniture, hatch).
    Dilates slightly to ensure complete boundary protection for thin walls and junctions.
    """
    h, w = shape[:2]
    arch_mask = np.zeros((h, w), dtype=np.uint8)
    if wall_network is not None and hasattr(wall_network, "segments"):
        for seg in wall_network.segments:
            # Only architectural segments
            if getattr(seg, "classification", "") in ("furniture", "text", "hatch"):
                continue
            th = int(round(max(2.0, getattr(seg, "thickness", 6.0))))
            pt1 = (int(round(seg.x1)), int(round(seg.y1)))
            pt2 = (int(round(seg.x2)), int(round(seg.y2)))
            cv2.line(arch_mask, pt1, pt2, 255, th)

    if thick_walls is not None and thick_walls.shape[:2] == (h, w):
        arch_mask = cv2.bitwise_or(arch_mask, (thick_walls > 0).astype(np.uint8) * 255)
    if struct_lines is not None and struct_lines.shape[:2] == (h, w):
        arch_mask = cv2.bitwise_or(arch_mask, (struct_lines > 0).astype(np.uint8) * 255)

    if buffer_px > 0:
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (buffer_px * 2 + 1, buffer_px * 2 + 1))
        arch_mask = cv2.dilate(arch_mask, kernel)

    return arch_mask


def build_adaptive_suppression_map(
    regions: List[TextRegion],
    wall_mask: np.ndarray,
    dist_map: np.ndarray,
    strategy: str = "G_adaptive_combined",
    wall_protection_mask: Optional[np.ndarray] = None,
) -> np.ndarray:
    """
    Constructs a 2D continuous suppression map (float32, [0.0, 1.0]).
    Values represent the text suppression factor at each pixel:
    - 0.0 = No suppression (architecture preserved, walls 100% intact)
    - 1.0 = Full text suppression (interior room labels eliminated)
    
    GUARANTEE: Wall pixels are strictly forced to 0.0 under all strategies.
    """
    if wall_mask is None or wall_mask.size == 0:
        return np.zeros((0, 0), dtype=np.float32)

    h, w = wall_mask.shape[:2]
    suppression_map = np.zeros((h, w), dtype=np.float32)

    # Strategy A: Baseline (Control: 0 suppression)
    if strategy in ("A_baseline", "H_candidate_penalty"):
        return suppression_map

    for reg in regions:
        if not reg.polygon or len(reg.polygon) < 3:
            continue

        # Rasterize region polygon
        reg_mask = np.zeros((h, w), dtype=np.uint8)
        poly_pts = np.array([[int(round(pt[0])), int(round(pt[1]))] for pt in reg.polygon], dtype=np.int32)
        cv2.fillPoly(reg_mask, [poly_pts], 255)

        # Base region factor
        like = float(reg.text_likelihood)
        thick = max(4.0, float(reg.wall_thickness_estimate))

        if strategy == "B_distance_only":
            # Strategy B: Pure distance-to-wall ramp
            dist_factor = np.clip((dist_map - 4.0) / 14.0, 0.0, 1.0)
            reg_val = dist_factor * like

        elif strategy == "C_wall_overlap_only":
            # Strategy C: Pure overlap ratio penalty
            overlap_factor = max(0.0, 1.0 - reg.wall_overlap_ratio * 2.5)
            reg_val = np.full((h, w), overlap_factor * like, dtype=np.float32)

        elif strategy == "D_distance_wall_support":
            # Strategy D: Distance ramp fused with local wall support
            dist_factor = np.clip((dist_map - 4.0) / 14.0, 0.0, 1.0)
            support_factor = max(0.0, 1.0 - reg.wall_support_around_text * 1.5)
            reg_val = dist_factor * support_factor * like

        elif strategy == "E_thickness_aware":
            # Strategy E: Margin dynamically scaled by local wall thickness
            margin = thick * 0.6
            dist_factor = np.clip((dist_map - margin) / max(1.0, thick * 1.2), 0.0, 1.0)
            reg_val = dist_factor * like

        elif strategy == "F_soft_text_mask":
            # Strategy F: Soft continuous attenuation (fixed 0.5 factor)
            reg_val = np.full((h, w), 0.5 * like, dtype=np.float32)

        else:
            # Strategy G: Adaptive combined (Optimal continuous fusion)
            rel_strength = float(reg.suppression_strength)
            margin = thick * 0.5
            dist_factor = np.clip((dist_map - margin) / max(1.0, thick), 0.0, 1.0)

            if reg.relation == RELATION_INTERIOR:
                reg_val = rel_strength * (0.8 + 0.2 * dist_factor) * like
            elif reg.relation == RELATION_NEAR_WALL:
                reg_val = rel_strength * dist_factor * like
            elif reg.relation == RELATION_WALL_OVERLAP:
                # Text overlapping wall: suppress only interior pixels away from wall
                reg_val = rel_strength * (dist_factor ** 2) * like
            else:  # AMBIGUOUS
                reg_val = rel_strength * dist_factor * 0.5

        # Blend into suppression map within the text region
        suppression_map[reg_mask > 0] = np.maximum(
            suppression_map[reg_mask > 0],
            reg_val[reg_mask > 0]
        )

    # HARD SAFETY INVARIANT: Strictly clamp all architectural wall pixels to 0.0
    suppression_map[wall_mask > 0] = 0.0
    if wall_protection_mask is not None and wall_protection_mask.shape[:2] == (h, w):
        suppression_map[wall_protection_mask > 0] = 0.0

    return np.clip(suppression_map, 0.0, 1.0).astype(np.float32)


def apply_adaptive_suppression_to_walls(
    wall_mask: np.ndarray,
    suppression_map: np.ndarray,
    suppression_threshold: float = 0.45,
) -> np.ndarray:
    """
    Applies continuous suppression map to wall mask.
    Pixels with suppression factor >= suppression_threshold are cleared from wall closing.
    """
    if suppression_map is None or suppression_map.size == 0 or np.count_nonzero(suppression_map) == 0:
        return wall_mask.copy()

    # Active suppression pixels
    active_suppression = (suppression_map >= suppression_threshold).astype(np.uint8) * 255

    # Safe subtraction: clear text strokes
    eff_wall = cv2.bitwise_and(wall_mask, cv2.bitwise_not(active_suppression))
    return eff_wall


def render_phase2101_visual_diagnostics(
    raw_image: np.ndarray,
    text_regions: List[TextRegion],
    wall_network: Optional[Any] = None,
    wall_mask: Optional[np.ndarray] = None,
    dist_map: Optional[np.ndarray] = None,
    suppression_map: Optional[np.ndarray] = None,
    final_areas: Optional[List[Dict[str, Any]]] = None,
    output_dir: Optional[Path] = None,
    wall_distance_map: Optional[np.ndarray] = None,
    final_wall_mask: Optional[np.ndarray] = None,
    room_candidates: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, str]:
    """
    Renders the 8 visual diagnostic overlays required by Phase 2.10.1:
    1. 01_original.png
    2. 02_text_regions.png
    3. 03_wall_network.png
    4. 04_distance_map.png
    5. 05_text_wall_relation.png
    6. 06_suppression_strength.png
    7. 07_final_mask.png
    8. 08_final_room_candidates.png
    """
    if output_dir is None:
        raise ValueError("output_dir must be provided")
    output_dir.mkdir(parents=True, exist_ok=True)

    dist_map = dist_map if dist_map is not None else wall_distance_map
    wall_mask = wall_mask if wall_mask is not None else final_wall_mask
    final_areas = final_areas if final_areas is not None else room_candidates
    if final_areas is None:
        final_areas = []

    h, w = raw_image.shape[:2]

    if len(raw_image.shape) == 2:
        base_bgr = cv2.cvtColor(raw_image, cv2.COLOR_GRAY2BGR)
    elif raw_image.shape[2] == 4:
        base_bgr = cv2.cvtColor(raw_image, cv2.COLOR_BGRA2BGR)
    else:
        base_bgr = raw_image.copy()

    saved: Dict[str, str] = {}

    # 1. 01_original.png
    p1 = output_dir / "01_original.png"
    cv2.imwrite(str(p1), base_bgr)
    saved["01_original"] = str(p1)

    # 2. 02_text_regions.png
    vis_regions = base_bgr.copy()
    for reg in text_regions:
        poly = np.array([[int(round(pt[0])), int(round(pt[1]))] for pt in reg.polygon], dtype=np.int32)
        cv2.polylines(vis_regions, [poly], isClosed=True, color=(0, 165, 255), thickness=2)
        bx, by, bw, bh = reg.bbox
        cv2.putText(vis_regions, f"{reg.id} ({reg.confidence:.2f})", (bx, max(12, by - 4)), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 140, 255), 1, cv2.LINE_AA)
    p2 = output_dir / "02_text_regions.png"
    cv2.imwrite(str(p2), vis_regions)
    saved["02_text_regions"] = str(p2)

    # 3. 03_wall_network.png
    vis_network = base_bgr.copy()
    if wall_network is not None and hasattr(wall_network, "segments"):
        for seg in wall_network.segments:
            pt1 = (int(round(seg.x1)), int(round(seg.y1)))
            pt2 = (int(round(seg.x2)), int(round(seg.y2)))
            color = (0, 200, 0) if getattr(seg, "is_centerline", False) else (255, 100, 0)
            cv2.line(vis_network, pt1, pt2, color, 2)
    p3 = output_dir / "03_wall_network.png"
    cv2.imwrite(str(p3), vis_network)
    saved["03_wall_network"] = str(p3)

    # 4. 04_distance_map.png
    if dist_map is not None and dist_map.size > 0:
        # Normalize distance map to 0..255 (clip at 50px for high contrast near walls)
        norm_dist = (np.clip(dist_map, 0.0, 50.0) / 50.0 * 255.0).astype(np.uint8)
        heatmap_dist = cv2.applyColorMap(norm_dist, cv2.COLORMAP_VIRIDIS)
        vis_dist = cv2.addWeighted(base_bgr, 0.4, heatmap_dist, 0.6, 0)
    else:
        vis_dist = base_bgr.copy()
    p4 = output_dir / "04_distance_map.png"
    cv2.imwrite(str(p4), vis_dist)
    saved["04_distance_map"] = str(p4)

    # 5. 05_text_wall_relation.png
    # Green = Interior, Yellow = Near Wall, Red = Wall Overlap, Blue = Ambiguous
    vis_rel = base_bgr.copy()
    relation_colors = {
        RELATION_INTERIOR: (0, 255, 0),       # Green
        RELATION_NEAR_WALL: (0, 255, 255),    # Yellow
        RELATION_WALL_OVERLAP: (0, 0, 255),   # Red
        RELATION_AMBIGUOUS: (255, 150, 0),    # Blue/Cyan
    }
    for reg in text_regions:
        poly = np.array([[int(round(pt[0])), int(round(pt[1]))] for pt in reg.polygon], dtype=np.int32)
        c = relation_colors.get(reg.relation, (200, 200, 200))
        cv2.polylines(vis_rel, [poly], isClosed=True, color=c, thickness=3)
        bx, by, bw, bh = reg.bbox
        cv2.putText(vis_rel, f"{reg.relation[:7]} ({reg.suppression_strength:.2f})", (bx, max(14, by - 4)), cv2.FONT_HERSHEY_SIMPLEX, 0.4, c, 1)
    p5 = output_dir / "05_text_wall_relation.png"
    cv2.imwrite(str(p5), vis_rel)
    saved["05_text_wall_relation"] = str(p5)

    # 6. 06_suppression_strength.png
    if suppression_map is not None and suppression_map.size > 0:
        norm_supp = (np.clip(suppression_map, 0.0, 1.0) * 255.0).astype(np.uint8)
        heatmap_supp = cv2.applyColorMap(norm_supp, cv2.COLORMAP_JET)
        vis_supp = cv2.addWeighted(base_bgr, 0.5, heatmap_supp, 0.5, 0)
    else:
        vis_supp = base_bgr.copy()
    p6 = output_dir / "06_suppression_strength.png"
    cv2.imwrite(str(p6), vis_supp)
    saved["06_suppression_strength"] = str(p6)

    # 7. 07_final_mask.png
    vis_mask = base_bgr.copy()
    if suppression_map is not None and suppression_map.size > 0:
        mask_active = (suppression_map >= 0.45).astype(np.uint8) * 255
        overlay = np.zeros_like(base_bgr)
        overlay[mask_active > 0] = (0, 255, 0)  # Green where text suppressed
        vis_mask = cv2.addWeighted(vis_mask, 0.65, overlay, 0.35, 0)
        cv2.putText(vis_mask, "Final Adaptive Text Suppression Mask", (20, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 200, 0), 2)
    p7 = output_dir / "07_final_mask.png"
    cv2.imwrite(str(p7), vis_mask)
    saved["07_final_mask"] = str(p7)

    # 8. 08_final_room_candidates.png
    vis_cands = base_bgr.copy()
    for a in final_areas:
        pts = a.get("polygon", [])
        if len(pts) >= 3:
            poly = np.array([[int(round(p[0])), int(round(p[1]))] if isinstance(p, (list, tuple)) else [int(round(p.xPx)), int(round(p.yPx))] for p in pts], dtype=np.int32)
            cv2.polylines(vis_cands, [poly], isClosed=True, color=(180, 0, 255), thickness=2)  # Magenta
    p8 = output_dir / "08_final_room_candidates.png"
    cv2.imwrite(str(p8), vis_cands)
    saved["08_final_room_candidates"] = str(p8)

    return saved
