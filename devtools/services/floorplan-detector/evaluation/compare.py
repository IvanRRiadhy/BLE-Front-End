"""
BIONIC Evaluation Benchmark Regression Comparator
Compares candidate detector evaluation results against an established baseline.
"""
import sys
import json
import argparse
from pathlib import Path
from typing import Dict, Any, Tuple

# Ensure package root is in sys.path
package_root = Path(__file__).parent.parent
if str(package_root) not in sys.path:
    sys.path.insert(0, str(package_root))

def load_report_metrics(report_path: Path) -> Dict[str, Any]:
    if report_path.is_dir():
        report_path = report_path / "report.json"
    if not report_path.exists():
        raise FileNotFoundError(f"Report JSON not found at: {report_path}")

    with open(report_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    totals = data.get("totals", {})
    metrics = data.get("metrics", {})
    topology = data.get("topology", {})
    bins = metrics.get("iouBins", {})

    return {
        "pass_rate_pct": totals.get("imagePassRatePct", 0.0),
        "micro_precision": metrics.get("microPrecision", 0.0),
        "micro_recall": metrics.get("microRecall", 0.0),
        "micro_f1": metrics.get("microF1", 0.0),
        "mean_iou": metrics.get("meanIoU", 0.0),
        "median_iou": metrics.get("medianIoU", 0.0),
        "min_iou": metrics.get("minIoU", 0.0),
        "iou_gte_0_50_pct": bins.get("gte_0_50_pct", 0.0),
        "iou_gte_0_75_pct": bins.get("gte_0_75_pct", 0.0),
        "mean_area_err_pct": metrics.get("meanAreaErrorPct", 0.0),
        "mean_centroid_err_px": metrics.get("meanCentroidErrorPx", 0.0),
        "mean_boundary_err_px": metrics.get("meanBoundaryErrorPx", 0.0),
        "merged_rooms": topology.get("mergedRoomsCount", 0),
        "split_rooms": topology.get("splitRoomsCount", 0),
        "false_positive_rooms": totals.get("falsePositiveRooms", 0),
        "missed_rooms": totals.get("missedRooms", 0),
    }

def compare_metrics(
    baseline_path: Path,
    candidate_path: Path,
) -> Tuple[str, bool]:
    b = load_report_metrics(baseline_path)
    c = load_report_metrics(candidate_path)

    # Metric definitions: (Key, Display Name, Higher Is Better?)
    metric_defs = [
        ("pass_rate_pct", "Image Pass Rate (%)", True),
        ("micro_f1", "Room F1 Score", True),
        ("micro_precision", "Room Precision", True),
        ("micro_recall", "Room Recall", True),
        ("mean_iou", "Mean Room IoU", True),
        ("median_iou", "Median Room IoU", True),
        ("iou_gte_0_50_pct", "Rooms with IoU >= 0.50 (%)", True),
        ("iou_gte_0_75_pct", "Rooms with IoU >= 0.75 (%)", True),
        ("mean_area_err_pct", "Mean Area Error (%)", False),
        ("mean_centroid_err_px", "Mean Centroid Error (px)", False),
        ("mean_boundary_err_px", "Mean Boundary Error (px)", False),
        ("merged_rooms", "Merged Rooms Anomaly Count", False),
        ("split_rooms", "Split Rooms Anomaly Count", False),
        ("false_positive_rooms", "False Positive Rooms", False),
        ("missed_rooms", "Missed Rooms (FN)", False),
    ]

    lines = []
    lines.append("=" * 80)
    lines.append("BIONIC REGRESSION BENCHMARK COMPARISON REPORT")
    lines.append("=" * 80)
    lines.append(f"Baseline:  {baseline_path}")
    lines.append(f"Candidate: {candidate_path}")
    lines.append("-" * 80)
    lines.append(f"{'Metric':<32} | {'Baseline':<12} | {'Candidate':<12} | {'Delta':<10} | {'Status'}")
    lines.append("-" * 80)

    regressions = []
    improvements = []

    for key, name, higher_is_better in metric_defs:
        b_val = b.get(key, 0.0)
        c_val = c.get(key, 0.0)
        delta = c_val - b_val

        status = "NEUTRAL"
        if abs(delta) > 1e-4:
            if higher_is_better:
                if delta > 0:
                    status = "IMPROVED"
                    improvements.append(f"{name}: +{delta:.3f}")
                else:
                    status = "REGRESSION"
                    regressions.append(f"{name}: {delta:.3f}")
            else:
                if delta < 0:
                    status = "IMPROVED"
                    improvements.append(f"{name}: {delta:.3f}")
                else:
                    status = "REGRESSION"
                    regressions.append(f"{name}: +{delta:.3f}")

        if isinstance(b_val, float):
            b_str = f"{b_val:.3f}"
            c_str = f"{c_val:.3f}"
            d_str = f"{delta:+.3f}"
        else:
            b_str = f"{b_val}"
            c_str = f"{c_val}"
            d_str = f"{delta:+d}"

        lines.append(f"{name:<32} | {b_str:<12} | {c_str:<12} | {d_str:<10} | {status}")

    lines.append("=" * 80)
    lines.append("\nSUMMARY ANALYSIS:")
    if improvements:
        lines.append(f"  [+] Improvements ({len(improvements)}):")
        for imp in improvements:
            lines.append(f"      - {imp}")
    else:
        lines.append("  [+] Improvements: None")

    has_regressions = len(regressions) > 0
    if regressions:
        lines.append(f"  [-] REGRESSIONS DETECTED ({len(regressions)}):")
        for reg in regressions:
            lines.append(f"      - {reg}")
        lines.append("\n  WARNING: Candidate version contains performance regressions!")
    else:
        lines.append("  [-] Regressions: None detected")

    lines.append("=" * 80 + "\n")
    report_text = "\n".join(lines)
    return report_text, has_regressions

def main():
    parser = argparse.ArgumentParser(description="BIONIC Benchmark Regression Comparator")
    parser.add_argument("--baseline", "-b", type=str, required=True, help="Path to baseline directory or report.json")
    parser.add_argument("--candidate", "-c", type=str, required=True, help="Path to candidate directory or report.json")

    args = parser.parse_args()
    b_path = (package_root / args.baseline).resolve()
    c_path = (package_root / args.candidate).resolve()

    report_text, has_reg = compare_metrics(b_path, c_path)
    print(report_text)

    if has_reg:
        sys.exit(2)
    sys.exit(0)

if __name__ == "__main__":
    main()
