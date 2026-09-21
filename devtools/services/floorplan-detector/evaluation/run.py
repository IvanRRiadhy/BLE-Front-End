"""
BIONIC Evaluation Benchmark CLI Runner
Executes black-box detector evaluation against ground-truth datasets.
"""
import sys
import argparse
import random
import yaml
from pathlib import Path
from typing import List, Optional

# Ensure package root is in sys.path
package_root = Path(__file__).parent.parent
if str(package_root) not in sys.path:
    sys.path.insert(0, str(package_root))

from evaluation.models import ImageEvaluationResult
from evaluation.datasets.synthetic import SyntheticDatasetAdapter
from evaluation.datasets.cubicasa import CubiCasaAdapter
from evaluation.datasets.my_floorplan import MyFloorplanAdapter
from evaluation.adapters.current_cv import CurrentCVDetectorAdapter
from evaluation.metrics import evaluate_image
from evaluation.visualize import generate_visual_artifacts, update_failure_gallery
from evaluation.reporting import generate_reports

def load_config(config_path: Optional[Path]) -> dict:
    if config_path and config_path.exists():
        with open(config_path, "r", encoding="utf-8") as f:
            return yaml.safe_load(f) or {}
    return {}

def run_benchmark(
    dataset_name: str = "synthetic",
    config_path: Optional[Path] = None,
    limit: Optional[int] = None,
    seed: int = 42,
    output_dir: Optional[Path] = None,
    enable_vis: bool = True,
) -> dict:
    cfg = load_config(config_path)

    # CLI overrides config
    ds_name = dataset_name or cfg.get("dataset", {}).get("name", "synthetic")
    sub_cfg = cfg.get("subset_selection", {})
    eff_seed = seed if seed != 42 or "seed" not in sub_cfg else sub_cfg.get("seed", 42)
    random.seed(eff_seed)

    eff_limit = limit or sub_cfg.get("target_samples", None)
    out_dir = Path(output_dir or cfg.get("output", {}).get("results_dir", "evaluation/results/latest"))
    fail_dir = Path(cfg.get("output", {}).get("failures_dir", "evaluation/failures"))
    vis_dir = out_dir / "visualizations"

    print("=" * 65)
    print("BIONIC Floorplan Evaluation Benchmark")
    print("=" * 65)
    print(f"Dataset:        {ds_name}")
    print(f"Seed:           {eff_seed}")
    print(f"Sample Limit:   {eff_limit or 'All discoverable'}")
    print(f"Output Dir:     {out_dir}")
    print(f"Visual Debug:   {'Enabled' if enable_vis else 'Disabled'}")
    print("-" * 65)

    # Initialize Adapter
    if ds_name == "my_floorplan":
        adapter = MyFloorplanAdapter()
        samples = adapter.discover_samples()
        if not samples:
            print("[INFO] No annotated .gt.json samples discovered yet in my_floorplan. Scanning all images...")
            all_imgs = adapter.discover_all_images()
            print(f"[INFO] Found {len(all_imgs)} unannotated image(s): {all_imgs[:4]}...")
    elif ds_name == "cubicasa5k":
        ds_path = package_root / cfg.get("dataset", {}).get("path", "datasets/cubicasa5k")
        adapter = CubiCasaAdapter(dataset_root=ds_path)
        samples = adapter.discover_samples()
        if not samples:
            print(f"[WARN] No CubiCasa5K samples discovered in {ds_path}. Falling back to synthetic suite.")
            adapter = SyntheticDatasetAdapter()
            ds_name = "synthetic"
            samples = adapter.discover_samples()
    else:
        adapter = SyntheticDatasetAdapter()
        samples = adapter.discover_samples()

    # Deterministic Shuffle & Slice
    random.shuffle(samples)
    if eff_limit and len(samples) > eff_limit:
        samples = samples[:eff_limit]

    total_samples = len(samples)
    print(f"Evaluating {total_samples} floorplan image(s)...\n")

    # Initialize Detector Adapter (Black-box wrapper)
    detector_cfg = cfg.get("detector", {}).get("config", {})
    detector = CurrentCVDetectorAdapter(config_dict=detector_cfg)

    results: List[ImageEvaluationResult] = []

    for idx, sample_id in enumerate(samples, 1):
        try:
            gt_sample = adapter.load_ground_truth(sample_id)
            img_path = adapter.get_image_path(sample_id)

            prediction = detector.detect(img_path)
            eval_res = evaluate_image(
                gt_sample=gt_sample,
                prediction=prediction,
                min_iou=cfg.get("matching", {}).get("min_iou", 0.25),
            )

            # Reconcile metrics (asserts GT == TP + FN and Pred == TP + FP)
            from evaluation.taxonomy import reconcile_metrics
            reconcile_metrics(eval_res)

            results.append(eval_res)

            status_str = "PASS" if eval_res.passed else "FAIL"
            print(f"[{idx}/{total_samples}] {sample_id}")
            print(f"    GT rooms: {eval_res.gtRoomCount} | Pred: {eval_res.predRoomCount} | TP: {eval_res.truePositiveCount}")
            print(f"    Mean IoU: {eval_res.meanIoU:.3f} | F1: {eval_res.f1:.3f} | BndErr: {eval_res.meanBoundaryErrorPx:.1f}px")
            print(f"    Status: {status_str}")

            if enable_vis:
                sample_vis_dir = vis_dir / Path(sample_id).stem
                artifacts = generate_visual_artifacts(
                    image_path=img_path,
                    gt_sample=gt_sample,
                    prediction=prediction,
                    eval_result=eval_res,
                    output_dir=sample_vis_dir,
                )
                update_failure_gallery(eval_res, artifacts, fail_dir)

                # Save overlay to evaluation/overlays/<image>.png
                overlays_dir = package_root / "evaluation" / "overlays"
                overlays_dir.mkdir(parents=True, exist_ok=True)
                if "04_overlay" in artifacts and artifacts["04_overlay"].exists():
                    import shutil
                    shutil.copy2(artifacts["04_overlay"], overlays_dir / f"{Path(sample_id).stem}.png")

        except Exception as e:
            print(f"[{idx}/{total_samples}] ERROR evaluating {sample_id}: {str(e)}", file=sys.stderr)

    print("\n" + "-" * 65)
    print("Generating benchmark reports...")
    report_paths = generate_reports(
        results=results,
        output_dir=out_dir,
        benchmark_name=cfg.get("benchmark_name", "bionic_v2.6_baseline"),
        dataset_name=ds_name,
        detector_version=detector.version,
        config_dict=cfg,
    )

    print(f"Report JSON:  {report_paths['report_json']}")
    print(f"Report CSV:   {report_paths['report_csv']}")
    print(f"Summary HTML: {report_paths['summary_html']}")
    print("=" * 65 + "\n")

    return report_paths

def main():
    parser = argparse.ArgumentParser(description="BIONIC Floorplan Evaluation Benchmark CLI")
    parser.add_argument("--config", "-c", type=str, default="evaluation/configs/baseline.yaml", help="Path to config YAML")
    parser.add_argument("--dataset", "-d", type=str, default=None, help="Dataset name ('synthetic' or 'cubicasa5k')")
    parser.add_argument("--limit", "-n", type=int, default=None, help="Max number of images to evaluate")
    parser.add_argument("--seed", "-s", type=int, default=42, help="Fixed random seed for reproducible sampling")
    parser.add_argument("--output-dir", "-o", type=str, default=None, help="Output directory for reports and artifacts")
    parser.add_argument("--no-vis", action="store_true", help="Disable visual debugging image generation")

    args = parser.parse_args()
    config_path = (package_root / args.config) if args.config else None
    out_dir = (package_root / args.output_dir) if args.output_dir else None

    run_benchmark(
        dataset_name=args.dataset,
        config_path=config_path,
        limit=args.limit,
        seed=args.seed,
        output_dir=out_dir,
        enable_vis=not args.no_vis,
    )

if __name__ == "__main__":
    main()
