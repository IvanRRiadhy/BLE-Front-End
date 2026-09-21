"""
Phase 2.9.0 — ML + Classical CV Fusion Experiment Runner
Executes real black-box fusion strategy evaluations across the 12-image BIONIC benchmark.
Supports ablation groups: baseline, cavity, door, structural, hybrid, veto, second-chance, all.
"""
import sys
import json
import time
import argparse
from pathlib import Path
from typing import Dict, Any, List
import numpy as np

try:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

# Ensure package root is in sys.path
package_root = Path(__file__).resolve().parent
if str(package_root) not in sys.path:
    sys.path.insert(0, str(package_root))

from fusion import (
    FusionEvaluator,
    FusionStrategyConfig,
    BenchmarkSummary,
    get_strategies_for_group,
    render_candidate_comparison_overlay,
)


def main():
    parser = argparse.ArgumentParser(description="Phase 2.9.0 ML + Classical CV Fusion Experiment Runner")
    parser.add_argument(
        "--strategy",
        type=str,
        default="all",
        help="Strategy or group to run: baseline, cavity, door, structural, hybrid, veto, second-chance, all",
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default=str(package_root / "evaluation" / "fusion"),
        help="Output directory for results",
    )
    parser.add_argument(
        "--skip-overlays",
        action="store_true",
        help="Skip generating PNG visual diagnostic overlays",
    )
    args = parser.parse_args()

    out_dir = Path(args.output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    print("=" * 80)
    print("PHASE 2.9.0 — ML + CLASSICAL CV FUSION EXPERIMENT RUNNER")
    print("=" * 80)

    # 1. Initialize Evaluator
    evaluator = FusionEvaluator(package_root=package_root)
    print(f"Loaded {len(evaluator.samples)} benchmark floorplan samples and precomputed bundles.")
    print(f"Loaded ML structural detections for {len(evaluator.ml_detections_by_image)} floorplans.")

    # 2. Get Strategies to execute
    strategies = get_strategies_for_group(args.strategy)
    # Ensure baseline is always evaluated first as the control group
    if not any(s.strategy_id == "baseline" for s in strategies):
        baseline_cfg = get_strategies_for_group("baseline")[0]
        strategies = [baseline_cfg] + strategies

    print(f"\nExecuting {len(strategies)} strategy configurations...")

    all_summaries: List[BenchmarkSummary] = []
    results_by_strategy: Dict[str, Any] = {}
    per_image_results: Dict[str, Dict[str, Any]] = {}
    baseline_candidates: Dict[str, List[Any]] = {}
    best_fusion_candidates: Dict[str, List[Any]] = {}
    all_displacement_records: List[Dict[str, Any]] = []

    for idx, strat_cfg in enumerate(strategies, 1):
        print(f"\n[{idx}/{len(strategies)}] Running: {strat_cfg.strategy_name} ({strat_cfg.strategy_id})...", flush=True)
        
        summary, image_results, candidates, displacements = evaluator.evaluate_strategy(strat_cfg)
        all_summaries.append(summary)

        print(
            f"   -> TP={summary.tp_count:2d} | FP={summary.fp_count:2d} | FN={summary.fn_count:2d} | "
            f"F1={summary.micro_f1:.4f} | Recall={summary.recall:.4f} | IoU={summary.mean_iou:.4f} | "
            f"Anchors={'PASS' if summary.anchors_preserved else 'WARN'}"
        )

        results_by_strategy[strat_cfg.strategy_id] = {
            "summary": summary.to_dict(),
            "perImage": {
                r.imageId: {
                    "tp": r.truePositiveCount,
                    "fp": r.falsePositiveCount,
                    "fn": r.falseNegativeCount,
                    "precision": round(r.precision, 4),
                    "recall": round(r.recall, 4),
                    "f1": round(r.f1, 4),
                    "meanIoU": round(r.meanIoU, 4),
                }
                for r in image_results
            },
        }

        # Store candidate records
        if strat_cfg.strategy_id == "baseline":
            for c in candidates:
                if c.image_id not in baseline_candidates:
                    baseline_candidates[c.image_id] = []
                baseline_candidates[c.image_id].append(c)

        # Track displacements
        for d in displacements:
            d_dict = d.to_dict()
            d_dict["strategyId"] = strat_cfg.strategy_id
            all_displacement_records.append(d_dict)

        # Store for overlay rendering
        if strat_cfg.strategy_id in ("second_chance_d85_c20", "hybrid_d20_c20", "veto_c95_d05"):
            for c in candidates:
                if c.image_id not in best_fusion_candidates:
                    best_fusion_candidates[c.image_id] = []
                best_fusion_candidates[c.image_id].append(c)

    # 3. Analyze Lost TPs on sample-floorplan-house2
    h2_cands = [c for c in all_displacement_records if "house2" in c["imageId"] and c["strategyId"] == "baseline"]
    h2_target_lost_ids = ["rec_wall_enc_6", "rec_wall_enc_33", "rec_wall_enc_105"]
    h2_cavity_ids = ["rec_rep_1374_822.0", "rec_rep_1470_822.0", "rec_wall_enc_120", "rec_wall_enc_62", "rec_wall_enc_115", "rec_wall_enc_86"]

    lost_tp_analysis = {
        "benchmarkImage": "sample-floorplan-house2.png",
        "description": "Comparative tracing of lost true rooms vs crowding cavity artifacts across strategies",
        "trackedCandidates": {},
    }

    tracked_ids = h2_target_lost_ids + h2_cavity_ids
    for cid in tracked_ids:
        c_records = [d for d in all_displacement_records if d["candidateId"] == cid]
        if c_records:
            lost_tp_analysis["trackedCandidates"][cid] = {
                "isTrueRoom": c_records[0]["isTrueRoom"],
                "matchedGtId": c_records[0]["matchedGtId"],
                "iou": c_records[0]["iou"],
                "ranksByStrategy": {r["strategyId"]: r["fusionRank"] for r in c_records},
                "acceptanceByStrategy": {r["strategyId"]: r["acceptedAfterBudgetFusion"] for r in c_records},
            }

    # 4. Generate Visual Diagnostic Overlays
    if not args.skip_overlays:
        print("\nRendering comparative diagnostic overlays (baseline.png vs ml_fusion.png)...")
        overlay_images = [
            "sample-floorplan-house2.png",
            "Floorplan-House.png",
            "Lantai 2.jpg",
            "sample-floorplan.png",
        ]
        overlays_dir = out_dir / "overlays"
        for img_name in overlay_images:
            img_path = evaluator.adapter.get_image_path(img_name)
            img_stem = Path(img_name).stem
            img_out = overlays_dir / img_stem
            img_out.mkdir(parents=True, exist_ok=True)

            b_cands = baseline_candidates.get(img_name, [])
            f_cands = best_fusion_candidates.get(img_name, b_cands)

            try:
                render_candidate_comparison_overlay(
                    image_path=img_path,
                    candidates=b_cands,
                    out_path=img_out / "baseline.png",
                    is_fusion=False,
                )
                render_candidate_comparison_overlay(
                    image_path=img_path,
                    candidates=f_cands,
                    out_path=img_out / "ml_fusion.png",
                    is_fusion=True,
                )
                print(f"  Rendered overlays for: {img_name}")
            except Exception as e:
                print(f"  Warning: failed to render overlay for {img_name}: {e}")

    # 5. Export JSON Outputs
    results_path = out_dir / "results.json"
    with open(results_path, "w", encoding="utf-8") as f:
        json.dump(results_by_strategy, f, indent=2)

    ablation_path = out_dir / "ablation_results.json"
    ablation_data = [s.to_dict() for s in all_summaries]
    with open(ablation_path, "w", encoding="utf-8") as f:
        json.dump(ablation_data, f, indent=2)

    disp_path = out_dir / "ranking_displacement.json"
    with open(disp_path, "w", encoding="utf-8") as f:
        json.dump(all_displacement_records, f, indent=2)

    lost_path = out_dir / "lost_tp_analysis.json"
    with open(lost_path, "w", encoding="utf-8") as f:
        json.dump(lost_tp_analysis, f, indent=2)

    summary_path = out_dir / "summary.json"
    baseline_summary = next(s for s in all_summaries if s.strategy_id == "baseline")
    best_f1_summary = max(all_summaries, key=lambda s: s.micro_f1)
    best_tp_summary = max(all_summaries, key=lambda s: s.tp_count)

    summary_meta = {
        "phase": "2.9.0",
        "study": "ML + Classical CV Fusion Experiment",
        "baseline": baseline_summary.to_dict(),
        "bestF1Strategy": best_f1_summary.to_dict(),
        "bestTpStrategy": best_tp_summary.to_dict(),
        "totalStrategiesEvaluated": len(all_summaries),
    }
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(summary_meta, f, indent=2)

    print(f"\nAll fusion experiment artifacts exported to {out_dir}")

    # 6. Print Summary Ablation Table
    print("\n" + "=" * 115)
    print("PHASE 2.9.0 ABLATION EXPERIMENT RESULTS TABLE")
    print("=" * 115)
    header = f"{'Strategy ID':<22s} | {'TP':>3s} | {'FP':>3s} | {'FN':>3s} | {'Prec':>6s} | {'Recall':>6s} | {'Micro F1':>8s} | {'Mean IoU':>8s} | {'Anchors':>8s} | {'House2 TP':>9s}"
    print(header)
    print("-" * 115)
    for s in all_summaries:
        row = (
            f"{s.strategy_id:<22s} | {s.tp_count:3d} | {s.fp_count:3d} | {s.fn_count:3d} | "
            f"{s.precision:6.4f} | {s.recall:6.4f} | {s.micro_f1:8.4f} | {s.mean_iou:8.4f} | "
            f"{'PASS' if s.anchors_preserved else 'WARN':>8s} | {s.house2_tp:9d}"
        )
        print(row)
    print("=" * 115)


if __name__ == "__main__":
    main()
