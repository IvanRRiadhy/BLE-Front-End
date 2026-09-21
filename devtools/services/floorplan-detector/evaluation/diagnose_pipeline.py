"""
Pipeline Diagnostic Script for BIONIC 12-Floorplan Benchmark
Inspects every intermediate stage of FloorplanDetector to isolate exact failure points.
"""
import sys
import os
import json
from pathlib import Path
import cv2
import numpy as np

# Ensure root is in sys.path
package_root = Path(__file__).parent.parent
if str(package_root) not in sys.path:
    sys.path.insert(0, str(package_root))

from app.models import DetectionConfig
from app.preprocessing import preprocess_image
from app.wall_detection import extract_wall_evidence
from app.space_detection import (
    remove_exterior_background,
    estimate_building_footprint,
    segment_enclosed_spaces,
)
from app.polygon import extract_polygons_from_mask
from evaluation.datasets.my_floorplan import MyFloorplanAdapter
from evaluation.adapters.current_cv import CurrentCVDetectorAdapter
from evaluation.metrics import evaluate_image

def diagnose_dataset():
    adapter = MyFloorplanAdapter()
    samples = adapter.discover_samples()
    print(f"Loaded {len(samples)} annotated samples from my_floorplan.")

    detector_adapter = CurrentCVDetectorAdapter()
    default_cfg = DetectionConfig(auto_scale_kernel=True)

    diagnostic_results = []
    vis_output_dir = package_root / "evaluation" / "results" / "latest" / "diagnostic_stages"
    vis_output_dir.mkdir(parents=True, exist_ok=True)

    for idx, sample_id in enumerate(samples, 1):
        img_path = adapter.get_image_path(sample_id)
        gt_sample = adapter.load_ground_truth(sample_id)
        img = cv2.imread(str(img_path))
        h, w = img.shape[:2]
        total_px = h * w

        stem = Path(sample_id).stem
        sample_vis_dir = vis_output_dir / stem
        sample_vis_dir.mkdir(parents=True, exist_ok=True)

        # Scale kernel calculation
        scale = (w + h) / 1700.0
        kernel_sz = max(15, int(default_cfg.wall_close_kernel_size * scale))
        if kernel_sz % 2 == 0:
            kernel_sz += 1
        min_area = int(default_cfg.min_room_area_px * (scale ** 2))

        active_cfg = DetectionConfig(
            wall_close_kernel_size=kernel_sz,
            min_room_area_px=min_area,
            auto_scale_kernel=True,
            enable_multi_evidence=True,
        )

        print("=" * 70)
        print(f"[{idx}/{len(samples)}] {sample_id} ({w}x{h} px)")
        print(f"Calculated scale factor: {scale:.2f} | kernel: {kernel_sz}px | min_area: {min_area}px")

        # Stage 1: Preprocessing & Binarization
        gray, binary = preprocess_image(img, active_cfg)
        binary_px = np.count_nonzero(binary)
        binary_density = binary_px / total_px

        # Stage 2: Wall Evidence Extraction
        wall_mask, thick_walls, gradient_img, edges_img, struct_lines = extract_wall_evidence(
            gray, binary, active_cfg
        )
        thick_px = np.count_nonzero(thick_walls)
        struct_px = np.count_nonzero(struct_lines)
        wall_mask_px = np.count_nonzero(wall_mask)

        # Stage 3: Free Space & Exterior Background Removal
        free_space = cv2.bitwise_not(wall_mask)
        interior_space = remove_exterior_background(free_space)
        free_px = np.count_nonzero(free_space)
        interior_px = np.count_nonzero(interior_space)
        interior_retention_ratio = interior_px / max(1, free_px)

        # Stage 4: Footprint Estimation
        footprint_mask = estimate_building_footprint(thick_walls, (h, w))
        footprint_px = np.count_nonzero(footprint_mask)
        footprint_coverage = footprint_px / total_px

        # Stage 5: Space Segmentation & Candidates
        space_mask, room_masks, space_stats, _, _, candidate_features = segment_enclosed_spaces(
            wall_mask=wall_mask,
            config=active_cfg,
            thick_walls=thick_walls,
            gradient_img=gradient_img,
        )

        # Stage 6: Polygon extraction
        detected_areas = extract_polygons_from_mask(room_masks, active_cfg)

        # Evaluate against Ground Truth
        det_result = detector_adapter.detect(img_path)
        eval_result = evaluate_image(gt_sample, det_result)

        # Save stage visualizations
        cv2.imwrite(str(sample_vis_dir / "01_binary.png"), binary)
        cv2.imwrite(str(sample_vis_dir / "02_wall_mask.png"), wall_mask)
        cv2.imwrite(str(sample_vis_dir / "03_thick_walls.png"), thick_walls)
        cv2.imwrite(str(sample_vis_dir / "04_interior_space.png"), interior_space)
        cv2.imwrite(str(sample_vis_dir / "05_footprint.png"), footprint_mask)
        cv2.imwrite(str(sample_vis_dir / "06_space_mask.png"), space_mask)

        print(f"Binary Wall Density:        {binary_density*100:.2f}% ({binary_px} px)")
        print(f"Thick Walls Density:        {(thick_px/total_px)*100:.2f}% ({thick_px} px)")
        print(f"Structural Lines Density:   {(struct_px/total_px)*100:.2f}% ({struct_px} px)")
        print(f"Free Space:                 {free_px} px | Interior Space: {interior_px} px (Retention: {interior_retention_ratio*100:.1f}%)")
        print(f"Building Footprint:         {footprint_coverage*100:.2f}% coverage ({footprint_px} px)")
        print(f"Candidate Cavities:         {space_stats['candidate_spaces']}")
        print(f"Accepted Rooms:             {space_stats['accepted_rooms']}")
        print(f"Rejected Breakdown:         {space_stats['rejected']}")
        print(f"Final Polygons Extracted:   {len(detected_areas)}")
        print(f"Ground Truth Rooms:         {len(gt_sample.areas)}")
        print(f"True Positives:             {eval_result.truePositiveCount} | FP: {eval_result.falsePositiveCount} | FN: {eval_result.falseNegativeCount}")
        print(f"Mean IoU:                   {eval_result.meanIoU:.4f} | F1: {eval_result.f1:.4f}")

        diagnostic_results.append({
            "sample_id": sample_id,
            "stem": stem,
            "width": w,
            "height": h,
            "scale": scale,
            "kernel_sz": kernel_sz,
            "min_area": min_area,
            "gt_count": len(gt_sample.areas),
            "pred_count": len(det_result.areas),
            "tp_count": eval_result.truePositiveCount,
            "fp_count": eval_result.falsePositiveCount,
            "fn_count": eval_result.falseNegativeCount,
            "mean_iou": eval_result.meanIoU,
            "f1": eval_result.f1,
            "boundary_err": eval_result.meanBoundaryErrorPx,
            "binary_density": binary_density,
            "thick_density": thick_px / total_px,
            "interior_retention_ratio": interior_retention_ratio,
            "footprint_coverage": footprint_coverage,
            "candidate_spaces": space_stats['candidate_spaces'],
            "accepted_rooms": space_stats['accepted_rooms'],
            "rejected": space_stats['rejected'],
            "candidate_features": [f.to_dict() for f in candidate_features],
        })

    # Save summary JSON
    with open(package_root / "evaluation" / "results" / "latest" / "pipeline_diagnostics_raw.json", "w") as f:
        json.dump(diagnostic_results, f, indent=2)

    print("\nDiagnostic run complete! Raw diagnostics saved to pipeline_diagnostics_raw.json.")

if __name__ == "__main__":
    diagnose_dataset()
