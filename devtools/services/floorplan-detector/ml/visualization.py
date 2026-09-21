"""
Phase 2.8.0 Diagnostic ML Visualization
Renders structural detection overlays with hatched bounding boxes, z-ordering, and class legends.
"""
from pathlib import Path
from typing import List, Union, Optional
import numpy as np
from PIL import Image, ImageDraw, ImageFont

from .config import CLASS_COLORS, CLASS_Z_INDEX, STRUCTURAL_CLASSES
from .models import MLDetection

OUTLINE_WIDTH = 4
HATCH_STEP = 12
HATCH_ALPHA = 80
FILL_ALPHA = 30


def _load_font(size: int):
    try:
        return ImageFont.truetype("arial.ttf", size)
    except OSError:
        try:
            return ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", size)
        except OSError:
            return ImageFont.load_default()


def _draw_hatched_box(
    overlay: Image.Image,
    x1: float,
    y1: float,
    x2: float,
    y2: float,
    rgb: tuple,
    angle_up: bool = True,
):
    w, h = max(int(x2 - x1), 2), max(int(y2 - y1), 2)
    tile = Image.new("RGBA", (w, h), rgb + (FILL_ALPHA,))
    td = ImageDraw.Draw(tile)
    for off in range(-h, w + h, HATCH_STEP):
        if angle_up:
            td.line([(off, h), (off + h, 0)], fill=rgb + (HATCH_ALPHA,), width=2)
        else:
            td.line([(off, 0), (off + h, h)], fill=rgb + (HATCH_ALPHA,), width=2)
    overlay.alpha_composite(tile, (int(x1), int(y1)))
    ImageDraw.Draw(overlay).rectangle(
        [x1, y1, x2, y2],
        outline=rgb + (255,),
        width=OUTLINE_WIDTH,
    )


def render_structural_overlay(
    image_or_path: Union[str, Path, Image.Image, np.ndarray],
    detections: List[MLDetection],
    out_path: Optional[Path] = None,
    draw_legend: bool = True,
) -> Image.Image:
    """
    Renders an annotated floorplan image with hatched detection boxes ordered by z-index.
    """
    if isinstance(image_or_path, (str, Path)):
        im = Image.open(str(image_or_path)).convert("RGBA")
    elif isinstance(image_or_path, np.ndarray):
        # Convert BGR/RGB numpy to PIL RGBA
        if len(image_or_path.shape) == 2:
            im = Image.fromarray(image_or_path).convert("RGBA")
        elif image_or_path.shape[2] == 3:
            im = Image.fromarray(image_or_path[:, :, ::-1]).convert("RGBA")
        else:
            im = Image.fromarray(image_or_path).convert("RGBA")
    elif isinstance(image_or_path, Image.Image):
        im = image_or_path.convert("RGBA")
    else:
        raise TypeError(f"Unsupported image type: {type(image_or_path)}")

    # Sort detections: walls at bottom (z=0), linkage/railing (z=50), doors/windows top (z=100)
    sorted_dets = sorted(
        detections,
        key=lambda d: (CLASS_Z_INDEX.get(d.class_id, 0), d.confidence)
    )

    overlay = Image.new("RGBA", im.size, (0, 0, 0, 0))

    for det in sorted_dets:
        cid = det.class_id
        rgb = CLASS_COLORS.get(cid, (128, 128, 128))
        b = det.bbox
        angle_up = (cid % 2 == 0)
        _draw_hatched_box(overlay, b.x1, b.y1, b.x2, b.y2, rgb, angle_up=angle_up)

    combined = Image.alpha_composite(im, overlay).convert("RGB")
    draw = ImageDraw.Draw(combined)
    font = _load_font(16)
    font_bold = _load_font(18)

    # Optional top-left diagnostic legend
    if draw_legend:
        counts = {}
        for d in detections:
            counts[d.class_name] = counts.get(d.class_name, 0) + 1

        legend_lines = [f"RT-DETR-L Structural Detections ({len(detections)} total):"]
        for cid, cname in enumerate(STRUCTURAL_CLASSES):
            c_cnt = counts.get(cname, 0)
            legend_lines.append(f"  • {cname.upper()}: {c_cnt}")

        # Draw semi-transparent legend background box
        box_w = 320
        box_h = 30 + len(legend_lines) * 22
        legend_bg = Image.new("RGBA", (box_w, box_h), (20, 24, 33, 210))
        combined.paste(legend_bg, (15, 15), legend_bg)

        draw_bg = ImageDraw.Draw(combined)
        draw_bg.text((25, 20), legend_lines[0], fill=(255, 255, 255), font=font_bold)
        y_pos = 48
        for cid, cname in enumerate(STRUCTURAL_CLASSES):
            rgb = CLASS_COLORS.get(cid, (200, 200, 200))
            c_cnt = counts.get(cname, 0)
            # Draw color indicator box
            draw_bg.rectangle([25, y_pos + 4, 37, y_pos + 16], fill=rgb, outline=(255, 255, 255))
            draw_bg.text((45, y_pos), f"{cname.capitalize()}: {c_cnt}", fill=(240, 240, 240), font=font)
            y_pos += 22

    if out_path:
        out_path = Path(out_path)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        combined.save(str(out_path), "PNG")

    return combined
