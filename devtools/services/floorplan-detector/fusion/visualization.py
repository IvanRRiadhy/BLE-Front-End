"""
Phase 2.9.0 Fusion Visualization Diagnostics
Renders visual candidate comparison overlays showing baseline vs ML fusion candidate states:
- Accepted True Room: Green
- Accepted Cavity Artifact: Red
- Lost True Room: Yellow / Amber
- Promoted Candidate: Cyan
- Demoted / Vetoed Candidate: Purple
"""
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple, Union
import numpy as np
import cv2
from PIL import Image, ImageDraw, ImageFont

from .models import FusionCandidate


STATUS_COLORS = {
    "accepted_true_room": (34, 197, 94),     # Green
    "accepted_cavity_fp": (239, 68, 68),     # Red
    "lost_true_room": (245, 158, 11),        # Amber / Yellow
    "suppressed_cavity": (100, 116, 139),    # Slate / Gray
    "promoted": (6, 182, 212),               # Cyan
    "demoted": (168, 85, 247),               # Purple
}


def render_candidate_comparison_overlay(
    image_path: Union[str, Path],
    candidates: List[FusionCandidate],
    out_path: Optional[Union[str, Path]] = None,
    is_fusion: bool = False,
    draw_labels: bool = True,
) -> Image.Image:
    """
    Renders diagnostic floorplan image with color-coded candidate polygons.
    """
    img_bgr = cv2.imread(str(image_path))
    if img_bgr is None:
        raise FileNotFoundError(f"Could not read floorplan at {image_path}")
    h, w = img_bgr.shape[:2]

    # Convert to PIL RGBA
    base_img = Image.fromarray(cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGBA))
    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    # Sort so accepted rooms are drawn clearly
    for cand in candidates:
        if len(cand.polygon) < 3:
            continue
            
        pts = [(int(pt[0]), int(pt[1])) for pt in cand.polygon]

        # Determine visual category
        accepted = cand.fusion_accepted if is_fusion else (cand.classical_budget_rank > 0 and cand.classical_rejection_reason == "accepted")
        is_true = cand.is_true_room

        if is_fusion and cand.rank_delta > 0 and accepted:
            cat = "promoted"
        elif is_fusion and cand.rank_delta < -2 and not accepted:
            cat = "demoted"
        elif accepted and is_true:
            cat = "accepted_true_room"
        elif accepted and not is_true:
            cat = "accepted_cavity_fp"
        elif not accepted and is_true:
            cat = "lost_true_room"
        else:
            cat = "suppressed_cavity"

        rgb = STATUS_COLORS[cat]
        fill_rgba = rgb + (65 if accepted else 35,)
        outline_rgba = rgb + (240 if accepted else 160,)

        # Draw filled polygon and boundary
        draw.polygon(pts, fill=fill_rgba, outline=outline_rgba)
        
        # Thicker outline for accepted and true rooms
        if accepted or is_true:
            for i in range(len(pts)):
                p1 = pts[i]
                p2 = pts[(i + 1) % len(pts)]
                draw.line([p1, p2], fill=outline_rgba, width=3)

        # Draw centroid label
        if draw_labels and (accepted or is_true or cat in ("promoted", "demoted")):
            cx = int(np.mean([p[0] for p in pts]))
            cy = int(np.mean([p[1] for p in pts]))
            rank_str = f"R:{cand.fusion_rank}" if is_fusion else f"R:{cand.classical_budget_rank}"
            score_str = f"S:{cand.fusion_score:.2f}" if is_fusion else f"C:{cand.classical_confidence:.2f}"
            lbl = f"{cand.candidate_id}\n{rank_str} {score_str}"
            
            # Text background box
            draw.text((cx - 20, cy - 10), lbl, fill=(255, 255, 255, 255))

    # Composite onto base image
    final_img = Image.alpha_composite(base_img, overlay).convert("RGB")
    
    # Render Legend in bottom-right corner
    leg_w, leg_h = 280, 150
    leg_x = w - leg_w - 20
    leg_y = h - leg_h - 20
    
    if leg_x > 0 and leg_y > 0:
        leg_overlay = Image.new("RGBA", (leg_w, leg_h), (20, 24, 39, 220))
        ldraw = ImageDraw.Draw(leg_overlay)
        items = [
            ("Accepted True Room (TP)", STATUS_COLORS["accepted_true_room"]),
            ("Accepted Cavity (FP)", STATUS_COLORS["accepted_cavity_fp"]),
            ("Lost True Room (FN)", STATUS_COLORS["lost_true_room"]),
            ("Suppressed Cavity (TN)", STATUS_COLORS["suppressed_cavity"]),
            ("Promoted by ML Fusion", STATUS_COLORS["promoted"]),
        ]
        title = "ML Fusion Diagnostics" if is_fusion else "Baseline CV Diagnostics"
        ldraw.text((10, 8), title, fill=(255, 255, 255))
        for i, (name, col) in enumerate(items):
            iy = 32 + i * 22
            ldraw.rectangle([10, iy + 3, 22, iy + 15], fill=col + (255,), outline=(255, 255, 255))
            ldraw.text((28, iy), name, fill=(220, 220, 220))
        
        final_img.paste(leg_overlay.convert("RGB"), (leg_x, leg_y), leg_overlay)

    if out_path:
        out = Path(out_path)
        out.parent.mkdir(parents=True, exist_ok=True)
        final_img.save(str(out))

    return final_img
