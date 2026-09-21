"""
Visual Debugging and Failure Case Gallery Engine
Generates 5 comprehensive diagnostic visualizations per image and curates the failure gallery.
"""
import shutil
import cv2
import numpy as np
from pathlib import Path
from typing import List, Dict, Optional

from .models import (
    GroundTruthSample,
    PredictionResult,
    ImageEvaluationResult,
    Point2D,
)

def _ensure_bgr(img: np.ndarray) -> np.ndarray:
    if len(img.shape) == 2:
        return cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
    if img.shape[2] == 4:
        return cv2.cvtColor(img, cv2.COLOR_BGRA2BGR)
    return img.copy()

def _draw_badge(
    canvas: np.ndarray,
    text: str,
    pos: tuple[int, int],
    bg_color: tuple[int, int, int] = (20, 20, 30),
    text_color: tuple[int, int, int] = (255, 255, 255),
    scale: float = 0.45,
):
    (tw, th), bl = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, scale, 1)
    x, y = pos
    cv2.rectangle(canvas, (x - 3, y - th - 4), (x + tw + 3, y + bl + 2), bg_color, -1)
    cv2.putText(canvas, text, (x, y), cv2.FONT_HERSHEY_SIMPLEX, scale, text_color, 1, cv2.LINE_AA)

def generate_visual_artifacts(
    image_path: Path,
    gt_sample: GroundTruthSample,
    prediction: PredictionResult,
    eval_result: ImageEvaluationResult,
    output_dir: Path,
) -> Dict[str, Path]:
    """
    Generates 01_input, 02_ground_truth, 03_prediction, 04_overlay, and 05_match_visualization.
    """
    output_dir.mkdir(parents=True, exist_ok=True)
    orig_img = cv2.imread(str(image_path), cv2.IMREAD_UNCHANGED)
    if orig_img is None:
        raise ValueError(f"Could not load image: {image_path}")

    bgr = _ensure_bgr(orig_img)
    h, w = bgr.shape[:2]

    # 01 Input
    path_01 = output_dir / "01_input.png"
    cv2.imwrite(str(path_01), bgr)

    # 02 Ground Truth (Cool blues and teals)
    gt_vis = bgr.copy()
    gt_overlay = gt_vis.copy()
    gt_color = (235, 140, 30)  # Sky blue / cyan in BGR
    for area in gt_sample.areas:
        pts = np.array([[int(p.xPx), int(p.yPx)] for p in area.polygon], np.int32).reshape((-1, 1, 2))
        cv2.fillPoly(gt_overlay, [pts], color=gt_color)
    cv2.addWeighted(gt_overlay, 0.35, gt_vis, 0.65, 0, gt_vis)

    for area in gt_sample.areas:
        pts = np.array([[int(p.xPx), int(p.yPx)] for p in area.polygon], np.int32).reshape((-1, 1, 2))
        cv2.polylines(gt_vis, [pts], isClosed=True, color=(210, 100, 10), thickness=2)
        cx = int(np.mean([p.xPx for p in area.polygon]))
        cy = int(np.mean([p.yPx for p in area.polygon]))
        _draw_badge(gt_vis, f"GT: {area.id}", (cx - 25, cy), bg_color=(15, 23, 42))

    path_02 = output_dir / "02_ground_truth.png"
    cv2.imwrite(str(path_02), gt_vis)

    # 03 Prediction (Warm oranges and purples)
    pred_vis = bgr.copy()
    pred_overlay = pred_vis.copy()
    pred_color = (40, 120, 240)  # Coral orange in BGR
    for area in prediction.areas:
        pts = np.array([[int(p.xPx), int(p.yPx)] for p in area.polygon], np.int32).reshape((-1, 1, 2))
        cv2.fillPoly(pred_overlay, [pts], color=pred_color)
    cv2.addWeighted(pred_overlay, 0.35, pred_vis, 0.65, 0, pred_vis)

    for area in prediction.areas:
        pts = np.array([[int(p.xPx), int(p.yPx)] for p in area.polygon], np.int32).reshape((-1, 1, 2))
        cv2.polylines(pred_vis, [pts], isClosed=True, color=(10, 80, 220), thickness=2)
        cx = int(np.mean([p.xPx for p in area.polygon]))
        cy = int(np.mean([p.yPx for p in area.polygon]))
        _draw_badge(pred_vis, f"Pred: {area.id}", (cx - 25, cy), bg_color=(30, 20, 15))

    path_03 = output_dir / "03_prediction.png"
    cv2.imwrite(str(path_03), pred_vis)

    # 04 Direct Side-by-Side / Overlay Comparison
    overlay_vis = bgr.copy()
    alpha_layer = overlay_vis.copy()
    for area in gt_sample.areas:
        pts = np.array([[int(p.xPx), int(p.yPx)] for p in area.polygon], np.int32).reshape((-1, 1, 2))
        cv2.fillPoly(alpha_layer, [pts], color=(240, 160, 20))
    for area in prediction.areas:
        pts = np.array([[int(p.xPx), int(p.yPx)] for p in area.polygon], np.int32).reshape((-1, 1, 2))
        cv2.fillPoly(alpha_layer, [pts], color=(30, 90, 240))
    cv2.addWeighted(alpha_layer, 0.40, overlay_vis, 0.60, 0, overlay_vis)

    # Draw outlines
    for area in gt_sample.areas:
        pts = np.array([[int(p.xPx), int(p.yPx)] for p in area.polygon], np.int32).reshape((-1, 1, 2))
        cv2.polylines(overlay_vis, [pts], isClosed=True, color=(240, 120, 10), thickness=2)
    for area in prediction.areas:
        pts = np.array([[int(p.xPx), int(p.yPx)] for p in area.polygon], np.int32).reshape((-1, 1, 2))
        cv2.polylines(overlay_vis, [pts], isClosed=True, color=(10, 60, 230), thickness=2)

    path_04 = output_dir / "04_overlay.png"
    cv2.imwrite(str(path_04), overlay_vis)

    # 05 Diagnostic Match Visualization (Green = TP, Red = FP, Blue = Missed FN, Lines = Matches)
    match_vis = bgr.copy()
    heat_layer = match_vis.copy()

    gt_dict = {a.id: a for a in gt_sample.areas}
    pred_dict = {a.id: a for a in prediction.areas}

    # Draw matched pairs (Green fill for TP overlap)
    for m in eval_result.matches:
        if m.gtId in gt_dict:
            g_pts = np.array([[int(p.xPx), int(p.yPx)] for p in gt_dict[m.gtId].polygon], np.int32).reshape((-1, 1, 2))
            cv2.fillPoly(heat_layer, [g_pts], color=(40, 180, 40))  # Green
        if m.predId in pred_dict:
            p_pts = np.array([[int(p.xPx), int(p.yPx)] for p in pred_dict[m.predId].polygon], np.int32).reshape((-1, 1, 2))
            cv2.fillPoly(heat_layer, [p_pts], color=(40, 180, 40))

    # Draw Missed Rooms (Cyan/Blue)
    for fn_id in eval_result.unmatchedGtIds:
        if fn_id in gt_dict:
            g_pts = np.array([[int(p.xPx), int(p.yPx)] for p in gt_dict[fn_id].polygon], np.int32).reshape((-1, 1, 2))
            cv2.fillPoly(heat_layer, [g_pts], color=(220, 120, 20))

    # Draw False Positives (Red)
    for fp_id in eval_result.unmatchedPredIds:
        if fp_id in pred_dict:
            p_pts = np.array([[int(p.xPx), int(p.yPx)] for p in pred_dict[fp_id].polygon], np.int32).reshape((-1, 1, 2))
            cv2.fillPoly(heat_layer, [p_pts], color=(40, 40, 220))

    cv2.addWeighted(heat_layer, 0.35, match_vis, 0.65, 0, match_vis)

    # Draw Match Centroid Connectors & Badges
    for m in eval_result.matches:
        if m.gtId in gt_dict and m.predId in pred_dict:
            g_poly = gt_dict[m.gtId].polygon
            p_poly = pred_dict[m.predId].polygon
            gx, gy = int(np.mean([p.xPx for p in g_poly])), int(np.mean([p.yPx for p in g_poly]))
            px, py = int(np.mean([p.xPx for p in p_poly])), int(np.mean([p.yPx for p in p_poly]))

            # Connecting centroid line
            cv2.line(match_vis, (gx, gy), (px, py), (255, 255, 255), 2, cv2.LINE_AA)
            cv2.circle(match_vis, (gx, gy), 5, (240, 160, 20), -1)
            cv2.circle(match_vis, (px, py), 5, (20, 80, 240), -1)

            mid_x, mid_y = (gx + px) // 2, (gy + py) // 2
            badge_text = f"IoU: {m.iou:.2f} | BndErr: {m.boundaryErrorPx:.1f}px"
            _draw_badge(match_vis, badge_text, (mid_x - 30, mid_y), bg_color=(20, 80, 20))

    # Annotate Missed GT
    for fn_id in eval_result.unmatchedGtIds:
        if fn_id in gt_dict:
            pts = gt_dict[fn_id].polygon
            cx = int(np.mean([p.xPx for p in pts]))
            cy = int(np.mean([p.yPx for p in pts]))
            _draw_badge(match_vis, f"[MISSED GT] {fn_id}", (cx - 35, cy), bg_color=(120, 40, 10))

    # Annotate False Positives
    for fp_id in eval_result.unmatchedPredIds:
        if fp_id in pred_dict:
            pts = pred_dict[fp_id].polygon
            cx = int(np.mean([p.xPx for p in pts]))
            cy = int(np.mean([p.yPx for p in pts]))
            _draw_badge(match_vis, f"[FALSE POSITIVE] {fp_id}", (cx - 45, cy), bg_color=(20, 20, 140))

    # Annotate Merged Rooms
    for merged in eval_result.mergedRooms:
        if merged.predictionId in pred_dict:
            pts = pred_dict[merged.predictionId].polygon
            cx = int(np.mean([p.xPx for p in pts]))
            cy = int(np.mean([p.yPx for p in pts]))
            _draw_badge(
                match_vis,
                f"[MERGED: {','.join(merged.groundTruthIds)}]",
                (cx - 50, cy - 20),
                bg_color=(180, 20, 20),
            )

    # Annotate Split Rooms
    for split in eval_result.splitRooms:
        if split.groundTruthId in gt_dict:
            pts = gt_dict[split.groundTruthId].polygon
            cx = int(np.mean([p.xPx for p in pts]))
            cy = int(np.mean([p.yPx for p in pts]))
            _draw_badge(
                match_vis,
                f"[SPLIT: {len(split.predictionIds)} frags]",
                (cx - 50, cy + 20),
                bg_color=(160, 120, 10),
            )

    # Global summary watermark on image header
    header_text = (
        f"{eval_result.imageId} | F1: {eval_result.f1:.2f} | Mean IoU: {eval_result.meanIoU:.2f} | "
        f"GT: {eval_result.gtRoomCount} Pred: {eval_result.predRoomCount} | "
        f"{'PASS' if eval_result.passed else 'FAIL'}"
    )
    _draw_badge(match_vis, header_text, (20, 30), bg_color=(10, 10, 15), scale=0.55)

    path_05 = output_dir / "05_match_visualization.png"
    cv2.imwrite(str(path_05), match_vis)

    return {
        "01_input": path_01,
        "02_ground_truth": path_02,
        "03_prediction": path_03,
        "04_overlay": path_04,
        "05_match_visualization": path_05,
    }

def update_failure_gallery(
    eval_result: ImageEvaluationResult,
    artifacts: Dict[str, Path],
    failures_root: Path,
):
    """
    Saves visual artifacts into categorized failure folders:
    - lowest_iou
    - missed_rooms
    - merged_rooms
    - split_rooms
    - false_positive
    - invalid_polygon
    """
    failures_root.mkdir(parents=True, exist_ok=True)
    match_img = artifacts.get("05_match_visualization")
    if not match_img or not match_img.exists():
        return

    sample_name = f"{eval_result.imageId}.png"

    # 1. Lowest IoU
    if eval_result.meanIoU < 0.60 or eval_result.minIoU < 0.40:
        target_dir = failures_root / "lowest_iou"
        target_dir.mkdir(parents=True, exist_ok=True)
        shutil.copy2(match_img, target_dir / sample_name)

    # 2. Missed Rooms
    if eval_result.falseNegativeCount > 0:
        target_dir = failures_root / "missed_rooms"
        target_dir.mkdir(parents=True, exist_ok=True)
        shutil.copy2(match_img, target_dir / sample_name)

    # 3. Merged Rooms
    if len(eval_result.mergedRooms) > 0:
        target_dir = failures_root / "merged_rooms"
        target_dir.mkdir(parents=True, exist_ok=True)
        shutil.copy2(match_img, target_dir / sample_name)

    # 4. Split Rooms
    if len(eval_result.splitRooms) > 0:
        target_dir = failures_root / "split_rooms"
        target_dir.mkdir(parents=True, exist_ok=True)
        shutil.copy2(match_img, target_dir / sample_name)

    # 5. False Positive Leaks
    if eval_result.falsePositiveCount > 0 or eval_result.falsePositiveAreaPct > 15.0:
        target_dir = failures_root / "false_positive"
        target_dir.mkdir(parents=True, exist_ok=True)
        shutil.copy2(match_img, target_dir / sample_name)

    # 6. Invalid Polygons
    if len(eval_result.invalidPredictions) > 0:
        target_dir = failures_root / "invalid_polygon"
        target_dir.mkdir(parents=True, exist_ok=True)
        shutil.copy2(match_img, target_dir / sample_name)

def main():
    import argparse
    import json
    from .models import GroundTruthArea, PredictedArea

    parser = argparse.ArgumentParser(description="BIONIC Standalone Floorplan Visualizer")
    parser.add_argument("--image", "-i", type=str, required=True, help="Path to floorplan image")
    parser.add_argument("--ground-truth", "-gt", type=str, required=True, help="Path to GT JSON or SVG")
    parser.add_argument("--prediction", "-p", type=str, required=True, help="Path to prediction JSON")
    parser.add_argument("--output-dir", "-o", type=str, default="evaluation/results/standalone_vis", help="Output directory")

    args = parser.parse_args()
    img_path = Path(args.image)
    gt_path = Path(args.ground_truth)
    pred_path = Path(args.prediction)
    out_dir = Path(args.output_dir)

    with open(gt_path, "r", encoding="utf-8") as f:
        gt_data = json.load(f)
    with open(pred_path, "r", encoding="utf-8") as f:
        pred_data = json.load(f)

    gt_areas = [
        GroundTruthArea(
            id=a.get("id", f"gt_{idx+1}"),
            label=a.get("label", "room"),
            polygon=[Point2D(p["xPx"], p["yPx"]) for p in a["polygon"]],
        )
        for idx, a in enumerate(gt_data.get("areas", []))
    ]
    gt_sample = GroundTruthSample(
        imageId=img_path.stem,
        imagePath=str(img_path),
        imageWidth=gt_data.get("imageWidth", 1000),
        imageHeight=gt_data.get("imageHeight", 1000),
        areas=gt_areas,
    )

    pred_areas = [
        PredictedArea(
            id=a.get("id", f"pred_{idx+1}"),
            polygon=[Point2D(p["xPx"], p["yPx"]) for p in a["polygon"]],
        )
        for idx, a in enumerate(pred_data.get("areas", []))
    ]
    pred_result = PredictionResult(
        imageId=img_path.stem,
        imageWidth=pred_data.get("imageWidth", 1000),
        imageHeight=pred_data.get("imageHeight", 1000),
        areas=pred_areas,
    )

    from .metrics import evaluate_image
    eval_res = evaluate_image(gt_sample, pred_result)
    artifacts = generate_visual_artifacts(img_path, gt_sample, pred_result, eval_res, out_dir)
    print(f"Generated visual artifacts in: {out_dir}")
    for k, v in artifacts.items():
        print(f"  {k}: {v}")

if __name__ == "__main__":
    main()
