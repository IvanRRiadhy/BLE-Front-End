import sys
from pathlib import Path
ROOT_DIR = Path(r"e:\mencoba\Web\Modernize\packages\typescript\devtools\services\floorplan-detector").resolve()
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

import pickle
import json
import cv2
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from evaluation.datasets.my_floorplan import MyFloorplanAdapter

OUT_DIR = ROOT_DIR / "evaluation" / "phase2103" / "visualizations"
OUT_DIR.mkdir(parents=True, exist_ok=True)
CACHE_PATH = ROOT_DIR / "evaluation" / "cache_precomputed_bundles.pkl"

with open(CACHE_PATH, "rb") as f:
    precomputed = pickle.load(f)

adapter = MyFloorplanAdapter()

with open(ROOT_DIR / "evaluation" / "phase2103" / "lost_tp_trace.json", "r") as f:
    traces = json.load(f)

# Pick 3 representative cases:
# 1. Budget rejected: sample-floorplan-house2.png rec_wall_enc_33 (gt_006)
# 2. Duplicate rejected: Floorplan-House.png rec_rep_1002_1167.0 (gt_009)
# 3. Merged / absorbed: simple-apartment-floor-plan.png rec_wall_enc_2 (gt_005)

cases = [
    {
        "title": "Case 1: BUDGET_REJECTED (Rank 13 > 8)\nHouse2 | rec_wall_enc_33 | IoU=0.667",
        "sample": "sample-floorplan-house2.png",
        "cand_id": "rec_wall_enc_33",
        "gt_id": "gt_006",
    },
    {
        "title": "Case 2: DUPLICATE_REJECTED (IoU=0.61 with Primary Cavity)\nHouse | rec_rep_1002_1167.0 | IoU=0.263",
        "sample": "Floorplan-House.png",
        "cand_id": "rec_rep_1002_1167.0",
        "gt_id": "gt_009",
    },
    {
        "title": "Case 3: MERGED_REJECTED (Swallowed by Oversized Cavity)\nApartment | rec_wall_enc_2 | IoU=0.963",
        "sample": "simple-apartment-floor-plan.png",
        "cand_id": "rec_wall_enc_2",
        "gt_id": "gt_005",
    },
]

fig, axes = plt.subplots(1, 3, figsize=(18, 6))

for ax, case in zip(axes, cases):
    img_path = adapter.get_image_path(case["sample"])
    img = cv2.imread(str(img_path))
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    h, w = img.shape[:2]

    gt = adapter.load_ground_truth(case["sample"])
    gt_area = next((a for a in gt.areas if a.id == case["gt_id"]), None)

    # Find candidate polygon from traces
    cand_trace = next((t for t in traces if t["candidate_id"] == case["cand_id"] and t["image_id"] == case["sample"]), None)

    ax.imshow(img_rgb)

    # Plot GT in green
    if gt_area:
        gt_pts = np.array([p.to_tuple() for p in gt_area.polygon])
        poly_patch = plt.Polygon(gt_pts, fill=True, facecolor="green", alpha=0.3, edgecolor="green", linewidth=2, label=f"GT ({case['gt_id']})")
        ax.add_patch(poly_patch)

    # Plot primary cavity if duplicate target
    if cand_trace and cand_trace.get("duplicate_target"):
        target_id = cand_trace["duplicate_target"]
        bundle = precomputed[case["sample"]][0]
        t_hyp = next((hp for hp in bundle["pruned_hyps"] if hp.id == target_id), None)
        if t_hyp:
            t_pts = np.array([[p.xPx, p.yPx] for p in t_hyp.polygon])
            t_patch = plt.Polygon(t_pts, fill=True, facecolor="blue", alpha=0.2, edgecolor="blue", linewidth=2, linestyle="--", label=f"Primary ({target_id})")
            ax.add_patch(t_patch)

    ax.set_title(case["title"], fontsize=11, pad=10)
    ax.legend(loc="upper right", fontsize=9)
    ax.axis("off")

plt.tight_layout()
plt.savefig(str(OUT_DIR / "case_study_overlays.png"), dpi=200)
plt.close()
print("Saved case_study_overlays.png")
