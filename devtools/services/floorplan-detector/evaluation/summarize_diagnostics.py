import json
from pathlib import Path

raw_path = Path("evaluation/results/latest/pipeline_diagnostics_raw.json")
with open(raw_path, "r", encoding="utf-8") as f:
    data = json.load(f)

for idx, d in enumerate(data, 1):
    print("=" * 60)
    print(f"[{idx}] {d['sample_id']}")
    print(f"  Dims: {d['width']}x{d['height']}, Scale: {d['scale']:.2f}, Kernel: {d['kernel_sz']}px, MinArea: {d['min_area']}px")
    print(f"  GT: {d['gt_count']} | Pred: {d['pred_count']} | TP: {d['tp_count']} | FP: {d['fp_count']} | FN: {d['fn_count']}")
    print(f"  Mean IoU: {d['mean_iou']:.4f} | F1: {d['f1']:.4f} | BndErr: {d['boundary_err']:.1f}px")
    print(f"  Binary Wall Density: {d['binary_density']*100:.2f}% | Thick Wall Density: {d['thick_density']*100:.2f}%")
    print(f"  Interior Retention: {d['interior_retention_ratio']*100:.2f}% | Footprint Cov: {d['footprint_coverage']*100:.2f}%")
    print(f"  Candidate Spaces: {d['candidate_spaces']} | Accepted: {d['accepted_rooms']}")
    print(f"  Rejections: {d['rejected']}")
