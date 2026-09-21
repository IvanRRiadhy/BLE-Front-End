"""
Phase 2.10.0 Visual Debug Overlays Subsystem
Renders the 9 multi-layer diagnostic visualizations for each benchmark floorplan.
Never modifies original input arrays in-place.
"""
from pathlib import Path
from typing import List, Dict, Any, Optional
import cv2
import numpy as np

from .models import TextRegion, FragmentationRecord


def render_all_debug_overlays(
    raw_image: np.ndarray,
    text_regions: List[TextRegion],
    text_likelihood_map: np.ndarray,
    wall_protection_mask: np.ndarray,
    safe_text_mask: np.ndarray,
    baseline_areas: List[Dict[str, Any]],
    experimental_areas: List[Dict[str, Any]],
    fragmentation_records: List[FragmentationRecord],
    output_dir: Path,
) -> Dict[str, str]:
    """
    Renders and saves all 9 visual debug overlays to output_dir.
    Returns dictionary mapping overlay name to saved filepath.
    """
    output_dir.mkdir(parents=True, exist_ok=True)
    h, w = raw_image.shape[:2]

    # Ensure 3-channel BGR base image
    if len(raw_image.shape) == 2:
        base_bgr = cv2.cvtColor(raw_image, cv2.COLOR_GRAY2BGR)
    elif raw_image.shape[2] == 4:
        base_bgr = cv2.cvtColor(raw_image, cv2.COLOR_BGRA2BGR)
    else:
        base_bgr = raw_image.copy()

    saved_paths: Dict[str, str] = {}

    # 1. 01_original.png
    p1 = output_dir / "01_original.png"
    cv2.imwrite(str(p1), base_bgr)
    saved_paths["01_original"] = str(p1)

    # 2. 02_text_regions.png
    vis_regions = base_bgr.copy()
    for reg in text_regions:
        poly = np.array([[int(round(pt[0])), int(round(pt[1]))] for pt in reg.polygon], dtype=np.int32)
        cv2.polylines(vis_regions, [poly], isClosed=True, color=(0, 165, 255), thickness=2)  # Orange
        bx, by, bw, bh = reg.bbox
        label_txt = f"{reg.id} ({reg.confidence:.2f})"
        cv2.putText(vis_regions, label_txt, (bx, max(12, by - 4)), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 140, 255), 1, cv2.LINE_AA)
    p2 = output_dir / "02_text_regions.png"
    cv2.imwrite(str(p2), vis_regions)
    saved_paths["02_text_regions"] = str(p2)

    # 3. 03_text_likelihood.png
    if text_likelihood_map is not None and text_likelihood_map.size > 0:
        norm_like = (np.clip(text_likelihood_map, 0.0, 1.0) * 255.0).astype(np.uint8)
        heatmap = cv2.applyColorMap(norm_like, cv2.COLORMAP_JET)
        vis_like = cv2.addWeighted(base_bgr, 0.5, heatmap, 0.5, 0)
    else:
        vis_like = base_bgr.copy()
    p3 = output_dir / "03_text_likelihood.png"
    cv2.imwrite(str(p3), vis_like)
    saved_paths["03_text_likelihood"] = str(p3)

    # 4. 04_wall_protection.png
    vis_wall_prot = base_bgr.copy()
    if wall_protection_mask is not None and wall_protection_mask.size > 0:
        blue_overlay = np.zeros_like(base_bgr)
        blue_overlay[wall_protection_mask > 0] = (255, 120, 0)  # Blue/Cyan
        vis_wall_prot = cv2.addWeighted(vis_wall_prot, 0.7, blue_overlay, 0.3, 0)
        cv2.putText(vis_wall_prot, "Protected Wall Envelope (Blue)", (20, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 120, 0), 2)
    p4 = output_dir / "04_wall_protection.png"
    cv2.imwrite(str(p4), vis_wall_prot)
    saved_paths["04_wall_protection"] = str(p4)

    # 5. 05_safe_text_mask.png
    vis_safe = base_bgr.copy()
    if safe_text_mask is not None and safe_text_mask.size > 0:
        green_overlay = np.zeros_like(base_bgr)
        green_overlay[safe_text_mask > 0] = (0, 255, 0)  # Bright Green
        vis_safe = cv2.addWeighted(vis_safe, 0.65, green_overlay, 0.35, 0)
        cv2.putText(vis_safe, "Safe Text Mask (Wall-Subtracted)", (20, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 200, 0), 2)
    p5 = output_dir / "05_safe_text_mask.png"
    cv2.imwrite(str(p5), vis_safe)
    saved_paths["05_safe_text_mask"] = str(p5)

    # 6. 06_baseline_candidates.png
    vis_base = base_bgr.copy()
    for a in baseline_areas:
        pts = a.get("polygon", [])
        if len(pts) >= 3:
            poly = np.array([[int(round(p[0])), int(round(p[1]))] if isinstance(p, (list, tuple)) else [int(round(p.xPx)), int(round(p.yPx))] for p in pts], dtype=np.int32)
            cv2.polylines(vis_base, [poly], isClosed=True, color=(255, 200, 0), thickness=2)  # Cyan
    p6 = output_dir / "06_baseline_candidates.png"
    cv2.imwrite(str(p6), vis_base)
    saved_paths["06_baseline_candidates"] = str(p6)

    # 7. 07_text_aware_candidates.png
    vis_exp = base_bgr.copy()
    for a in experimental_areas:
        pts = a.get("polygon", [])
        if len(pts) >= 3:
            poly = np.array([[int(round(p[0])), int(round(p[1]))] if isinstance(p, (list, tuple)) else [int(round(p.xPx)), int(round(p.yPx))] for p in pts], dtype=np.int32)
            cv2.polylines(vis_exp, [poly], isClosed=True, color=(180, 0, 255), thickness=2)  # Magenta
    p7 = output_dir / "07_text_aware_candidates.png"
    cv2.imwrite(str(p7), vis_exp)
    saved_paths["07_text_aware_candidates"] = str(p7)

    # 8. 08_comparison.png
    vis_comp = base_bgr.copy()
    # Baseline in cyan
    for a in baseline_areas:
        pts = a.get("polygon", [])
        if len(pts) >= 3:
            poly = np.array([[int(round(p[0])), int(round(p[1]))] if isinstance(p, (list, tuple)) else [int(round(p.xPx)), int(round(p.yPx))] for p in pts], dtype=np.int32)
            cv2.polylines(vis_comp, [poly], isClosed=True, color=(255, 200, 0), thickness=2)
    # Experimental in magenta dashed / offset
    for a in experimental_areas:
        pts = a.get("polygon", [])
        if len(pts) >= 3:
            poly = np.array([[int(round(p[0])), int(round(p[1]))] if isinstance(p, (list, tuple)) else [int(round(p.xPx)), int(round(p.yPx))] for p in pts], dtype=np.int32)
            cv2.polylines(vis_comp, [poly], isClosed=True, color=(180, 0, 255), thickness=2)
    # Detected text in yellow boxes
    for reg in text_regions:
        bx, by, bw, bh = reg.bbox
        cv2.rectangle(vis_comp, (bx, by), (bx + bw, by + bh), (0, 255, 255), 1)
    cv2.putText(vis_comp, "Cyan: Baseline | Magenta: Text-Aware | Yellow: Text", (20, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (0, 0, 0), 2)
    p8 = output_dir / "08_comparison.png"
    cv2.imwrite(str(p8), vis_comp)
    saved_paths["08_comparison"] = str(p8)

    # 9. 09_fragmentation_analysis.png
    vis_frag = base_bgr.copy()
    for rec in fragmentation_records:
        if rec.is_fragmented:
            color = (0, 0, 255) if rec.causality == "text_likely_cause" else ((0, 165, 255) if rec.causality == "text_possible_cause" else (128, 128, 128))
            label = f"{rec.gt_room_id}: {rec.fragment_count} frags ({rec.causality})"
            # Draw involved text regions
            for r in text_regions:
                if r.id in rec.text_regions_involved:
                    bx, by, bw, bh = r.bbox
                    cv2.rectangle(vis_frag, (bx, by), (bx + bw, by + bh), color, 3)
                    cv2.putText(vis_frag, f"Split Text: {r.id}", (bx, max(14, by - 5)), cv2.FONT_HERSHEY_SIMPLEX, 0.45, color, 1)
    p9 = output_dir / "09_fragmentation_analysis.png"
    cv2.imwrite(str(p9), vis_frag)
    saved_paths["09_fragmentation_analysis"] = str(p9)

    return saved_paths
