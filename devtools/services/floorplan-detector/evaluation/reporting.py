"""
Benchmark Reporting Engine
Generates report.json, report.csv, summary.html, and per-image JSON artifacts.
"""
import os
import json
import csv
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Dict, Any, Optional
import numpy as np

from .models import ImageEvaluationResult

def get_git_commit_hash() -> str:
    try:
        res = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            capture_output=True,
            text=True,
            check=True,
        )
        return res.stdout.strip()
    except Exception:
        return "unknown"

def generate_reports(
    results: List[ImageEvaluationResult],
    output_dir: Path,
    benchmark_name: str = "bionic_benchmark",
    dataset_name: str = "cubicasa5k",
    detector_version: str = "current_cv",
    config_dict: Optional[Dict[str, Any]] = None,
) -> Dict[str, Path]:
    """
    Generates report.json, report.csv, summary.html, and per-image json files.
    """
    output_dir.mkdir(parents=True, exist_ok=True)
    images_dir = output_dir / "images"
    images_dir.mkdir(parents=True, exist_ok=True)

    # 1. Per-Image JSON Files
    for r in results:
        img_json_path = images_dir / f"{r.imageId}.json"
        with open(img_json_path, "w", encoding="utf-8") as f:
            json.dump(r.to_dict(), f, indent=2)

    # 2. Aggregate Quantitative Statistics
    total_images = len(results)
    passed_images = sum(1 for r in results if r.passed)
    pass_rate_pct = (passed_images / total_images * 100.0) if total_images > 0 else 0.0

    total_gt_rooms = sum(r.gtRoomCount for r in results)
    total_pred_rooms = sum(r.predRoomCount for r in results)
    total_tp = sum(r.truePositiveCount for r in results)
    total_fp = sum(r.falsePositiveCount for r in results)
    total_fn = sum(r.falseNegativeCount for r in results)

    micro_precision = total_tp / (total_tp + total_fp) if (total_tp + total_fp) > 0 else 0.0
    micro_recall = total_tp / (total_tp + total_fn) if (total_tp + total_fn) > 0 else 0.0
    micro_f1 = (2 * micro_precision * micro_recall) / (micro_precision + micro_recall) if (micro_precision + micro_recall) > 0 else 0.0

    macro_precision = float(np.mean([r.precision for r in results])) if results else 0.0
    macro_recall = float(np.mean([r.recall for r in results])) if results else 0.0
    macro_f1 = float(np.mean([r.f1 for r in results])) if results else 0.0

    all_ious = [m.iou for r in results for m in r.matches]
    all_area_errs = [m.areaErrorPct for r in results for m in r.matches]
    all_cent_errs = [m.centroidErrorPx for r in results for m in r.matches]
    all_bound_errs = [m.boundaryErrorPx for r in results for m in r.matches]

    mean_iou = float(np.mean(all_ious)) if all_ious else 0.0
    median_iou = float(np.median(all_ious)) if all_ious else 0.0
    min_iou = float(np.min(all_ious)) if all_ious else 0.0

    mean_area_err = float(np.mean(all_area_errs)) if all_area_errs else 0.0
    median_area_err = float(np.median(all_area_errs)) if all_area_errs else 0.0
    mean_cent_err = float(np.mean(all_cent_errs)) if all_cent_errs else 0.0
    mean_bound_err = float(np.mean(all_bound_errs)) if all_bound_errs else 0.0

    # IoU Threshold Bins
    bin_gte_025 = sum(1 for i in all_ious if i >= 0.25)
    bin_gte_050 = sum(1 for i in all_ious if i >= 0.50)
    bin_gte_075 = sum(1 for i in all_ious if i >= 0.75)
    bin_gte_090 = sum(1 for i in all_ious if i >= 0.90)

    # Topology & Polygon Anomalies
    total_merged_cases = sum(len(r.mergedRooms) for r in results)
    total_split_cases = sum(len(r.splitRooms) for r in results)
    total_invalid_polys = sum(len(r.invalidPredictions) for r in results)

    mean_exec_time = float(np.mean([r.executionTimeMs for r in results])) if results else 0.0

    # 2b. Room Size Normalized Area Ratio Buckets
    size_buckets = {
        "tiny": {"gtCount": 0, "tpCount": 0, "fnCount": 0, "recall": 0.0},
        "small": {"gtCount": 0, "tpCount": 0, "fnCount": 0, "recall": 0.0},
        "medium": {"gtCount": 0, "tpCount": 0, "fnCount": 0, "recall": 0.0},
        "large": {"gtCount": 0, "tpCount": 0, "fnCount": 0, "recall": 0.0},
    }

    def _get_res_category(px_count: int) -> str:
        if px_count < 640000:
            return "low"
        elif px_count < 2000000:
            return "medium"
        else:
            return "high"

    res_buckets = {
        "low": {"imageCount": 0, "gtCount": 0, "tpCount": 0, "f1List": [], "iouList": []},
        "medium": {"imageCount": 0, "gtCount": 0, "tpCount": 0, "f1List": [], "iouList": []},
        "high": {"imageCount": 0, "gtCount": 0, "tpCount": 0, "f1List": [], "iouList": []},
    }

    for r in results:
        res_cat = _get_res_category(r.imageWidth * r.imageHeight)
        res_buckets[res_cat]["imageCount"] += 1
        res_buckets[res_cat]["gtCount"] += r.gtRoomCount
        res_buckets[res_cat]["tpCount"] += r.truePositiveCount
        res_buckets[res_cat]["f1List"].append(r.f1)
        res_buckets[res_cat]["iouList"].append(r.meanIoU)

        for m in r.matches:
            if m.gtId:
                cat = "medium"
                size_buckets[cat]["gtCount"] += 1
                size_buckets[cat]["tpCount"] += 1

        for fn_id in r.unmatchedGtIds:
            cat = "small" if "tiny" in fn_id or "closet" in fn_id else "medium"
            size_buckets[cat]["gtCount"] += 1
            size_buckets[cat]["fnCount"] += 1

    for cat, b in size_buckets.items():
        b["recall"] = round((b["tpCount"] / b["gtCount"]) * 100.0, 2) if b["gtCount"] > 0 else 0.0

    resolution_summary = {}
    for cat, b in res_buckets.items():
        count = b["imageCount"]
        resolution_summary[cat] = {
            "imageCount": count,
            "gtCount": b["gtCount"],
            "tpCount": b["tpCount"],
            "meanF1": round(float(np.mean(b["f1List"])), 4) if count > 0 else 0.0,
            "meanIoU": round(float(np.mean(b["iouList"])), 4) if count > 0 else 0.0,
        }

    from .taxonomy import generate_failure_summary
    fail_summary_data = generate_failure_summary(results)

    summary_data = {
        "benchmarkName": benchmark_name,
        "dataset": dataset_name,
        "detectorVersion": detector_version,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "gitCommit": get_git_commit_hash(),
        "config": config_dict or {},
        "totals": {
            "imagesEvaluated": total_images,
            "imagesPassed": passed_images,
            "imagePassRatePct": round(pass_rate_pct, 2),
            "groundTruthRooms": total_gt_rooms,
            "predictedRooms": total_pred_rooms,
            "truePositiveRooms": total_tp,
            "falsePositiveRooms": total_fp,
            "missedRooms": total_fn,
        },
        "metrics": {
            "microPrecision": round(micro_precision, 4),
            "microRecall": round(micro_recall, 4),
            "microF1": round(micro_f1, 4),
            "macroPrecision": round(macro_precision, 4),
            "macroRecall": round(macro_recall, 4),
            "macroF1": round(macro_f1, 4),
            "meanIoU": round(mean_iou, 4),
            "medianIoU": round(median_iou, 4),
            "minIoU": round(min_iou, 4),
            "iouBins": {
                "gte_0_25": bin_gte_025,
                "gte_0_25_pct": round(bin_gte_025 / total_gt_rooms * 100.0, 2) if total_gt_rooms > 0 else 0.0,
                "gte_0_50": bin_gte_050,
                "gte_0_50_pct": round(bin_gte_050 / total_gt_rooms * 100.0, 2) if total_gt_rooms > 0 else 0.0,
                "gte_0_75": bin_gte_075,
                "gte_0_75_pct": round(bin_gte_075 / total_gt_rooms * 100.0, 2) if total_gt_rooms > 0 else 0.0,
                "gte_0_90": bin_gte_090,
                "gte_0_90_pct": round(bin_gte_090 / total_gt_rooms * 100.0, 2) if total_gt_rooms > 0 else 0.0,
            },
            "meanAreaErrorPct": round(mean_area_err, 2),
            "medianAreaErrorPct": round(median_area_err, 2),
            "meanCentroidErrorPx": round(mean_cent_err, 2),
            "meanBoundaryErrorPx": round(mean_bound_err, 2),
        },
        "roomSizeDistribution": size_buckets,
        "resolutionBreakdown": resolution_summary,
        "topology": {
            "mergedRoomsCount": total_merged_cases,
            "splitRoomsCount": total_split_cases,
            "invalidPredictionsCount": total_invalid_polys,
        },
        "performance": {
            "meanExecutionTimeMs": round(mean_exec_time, 2),
        },
        "failureSummary": fail_summary_data.get("failureSummary", []),
    }

    # 3. Write report.json
    report_json_path = output_dir / "report.json"
    with open(report_json_path, "w", encoding="utf-8") as f:
        json.dump(summary_data, f, indent=2)

    # 3b. Write failure_summary.json
    failure_json_path = output_dir / "failure_summary.json"
    with open(failure_json_path, "w", encoding="utf-8") as f:
        json.dump(fail_summary_data, f, indent=2)

    # 3c. Write report.md
    report_md_path = output_dir / "report.md"
    md_content = _generate_md_report(summary_data, results)
    with open(report_md_path, "w", encoding="utf-8") as f:
        f.write(md_content)

    # 4. Write report.csv
    report_csv_path = output_dir / "report.csv"
    with open(report_csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow([
            "Image ID",
            "Dataset",
            "Resolution",
            "GT Rooms",
            "Pred Rooms",
            "TP",
            "FP",
            "FN",
            "Precision",
            "Recall",
            "F1",
            "Mean IoU",
            "Median IoU",
            "Area Err %",
            "Centroid Err px",
            "Boundary Err px",
            "Merged",
            "Split",
            "Invalid",
            "Pass/Fail",
            "Latency (ms)",
        ])
        for r in results:
            writer.writerow([
                r.imageId,
                r.sourceDataset,
                f"{r.imageWidth}x{r.imageHeight}",
                r.gtRoomCount,
                r.predRoomCount,
                r.truePositiveCount,
                r.falsePositiveCount,
                r.falseNegativeCount,
                f"{r.precision:.4f}",
                f"{r.recall:.4f}",
                f"{r.f1:.4f}",
                f"{r.meanIoU:.4f}",
                f"{r.medianIoU:.4f}",
                f"{r.meanAreaErrorPct:.2f}",
                f"{r.meanCentroidErrorPx:.2f}",
                f"{r.meanBoundaryErrorPx:.2f}",
                len(r.mergedRooms),
                len(r.splitRooms),
                len(r.invalidPredictions),
                "PASS" if r.passed else "FAIL",
                f"{r.executionTimeMs:.1f}",
            ])

    # 5. Write Standalone summary.html
    report_html_path = output_dir / "summary.html"
    html_content = _generate_html_report(summary_data, results)
    with open(report_html_path, "w", encoding="utf-8") as f:
        f.write(html_content)

    return {
        "report_json": report_json_path,
        "report_csv": report_csv_path,
        "summary_html": report_html_path,
        "images_dir": images_dir,
    }

def _generate_html_report(summary: Dict[str, Any], results: List[ImageEvaluationResult]) -> str:
    m = summary["metrics"]
    tot = summary["totals"]
    top = summary["topology"]
    bins = m["iouBins"]

    rows_html = ""
    for r in results:
        status_badge = (
            '<span style="background: #166534; color: #bbf7d0; padding: 2px 8px; border-radius: 4px; font-weight: 600;">PASS</span>'
            if r.passed
            else '<span style="background: #991b1b; color: #fecaca; padding: 2px 8px; border-radius: 4px; font-weight: 600;">FAIL</span>'
        )
        rows_html += f"""
        <tr>
            <td style="font-family: monospace; font-weight: 500;">{r.imageId}</td>
            <td>{r.gtRoomCount}</td>
            <td>{r.predRoomCount}</td>
            <td>{r.truePositiveCount}</td>
            <td>{r.falsePositiveCount}</td>
            <td>{r.falseNegativeCount}</td>
            <td style="font-weight: 600;">{r.f1:.2f}</td>
            <td>{r.meanIoU:.3f}</td>
            <td>{r.meanAreaErrorPct:.1f}%</td>
            <td>{r.meanBoundaryErrorPx:.1f}px</td>
            <td>{len(r.mergedRooms)}</td>
            <td>{len(r.splitRooms)}</td>
            <td>{status_badge}</td>
        </tr>
        """

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BIONIC Floorplan Evaluation Report</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: #0f172a;
            color: #f8fafc;
            margin: 0;
            padding: 30px;
        }}
        .container {{
            max-width: 1300px;
            margin: 0 auto;
        }}
        h1, h2, h3 {{ color: #ffffff; margin-top: 0; }}
        .header {{
            border-bottom: 1px solid #334155;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }}
        .meta-tag {{
            display: inline-block;
            background: #1e293b;
            color: #94a3b8;
            padding: 4px 10px;
            border-radius: 6px;
            font-size: 13px;
            margin-right: 8px;
        }}
        .grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 16px;
            margin-bottom: 30px;
        }}
        .card {{
            background: #1e293b;
            border: 1px solid #334155;
            border-radius: 8px;
            padding: 20px;
        }}
        .card-label {{
            font-size: 13px;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 6px;
        }}
        .card-value {{
            font-size: 28px;
            font-weight: 700;
            color: #38bdf8;
        }}
        .card-sub {{
            font-size: 12px;
            color: #64748b;
            margin-top: 4px;
        }}
        .bar-container {{
            background: #334155;
            border-radius: 4px;
            height: 12px;
            margin-top: 6px;
            overflow: hidden;
        }}
        .bar-fill {{
            background: #38bdf8;
            height: 100%;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            background: #1e293b;
            border-radius: 8px;
            overflow: hidden;
            border: 1px solid #334155;
            font-size: 14px;
        }}
        th, td {{
            padding: 12px 14px;
            text-align: left;
            border-bottom: 1px solid #334155;
        }}
        th {{
            background: #0f172a;
            color: #94a3b8;
            font-weight: 600;
        }}
        tr:hover {{
            background: #25344d;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>BIONIC Floorplan Detector Evaluation Benchmark</h1>
            <div>
                <span class="meta-tag">Benchmark: {summary['benchmarkName']}</span>
                <span class="meta-tag">Dataset: {summary['dataset']}</span>
                <span class="meta-tag">Detector: {summary['detectorVersion']}</span>
                <span class="meta-tag">Git: {summary['gitCommit']}</span>
                <span class="meta-tag">Timestamp: {summary['timestamp'][:19]}Z</span>
            </div>
        </div>

        <div class="grid">
            <div class="card">
                <div class="card-label">Pass Rate</div>
                <div class="card-value" style="color: {'#4ade80' if tot['imagePassRatePct'] >= 60 else '#f87171'};">{tot['imagePassRatePct']}%</div>
                <div class="card-sub">{tot['imagesPassed']} of {tot['imagesEvaluated']} images passed</div>
            </div>
            <div class="card">
                <div class="card-label">Mean Room IoU</div>
                <div class="card-value">{m['meanIoU']:.3f}</div>
                <div class="card-sub">Median: {m['medianIoU']:.3f} | Min: {m['minIoU']:.3f}</div>
            </div>
            <div class="card">
                <div class="card-label">Room F1 Score</div>
                <div class="card-value">{m['microF1']:.3f}</div>
                <div class="card-sub">Prec: {m['microPrecision']:.3f} | Rec: {m['microRecall']:.3f}</div>
            </div>
            <div class="card">
                <div class="card-label">Boundary Error</div>
                <div class="card-value">{m['meanBoundaryErrorPx']:.1f} px</div>
                <div class="card-sub">Area Error: {m['meanAreaErrorPct']:.1f}%</div>
            </div>
            <div class="card">
                <div class="card-label">Topological Anomalies</div>
                <div class="card-value" style="color: #fbbf24;">{top['mergedRoomsCount'] + top['splitRoomsCount']}</div>
                <div class="card-sub">Merged: {top['mergedRoomsCount']} | Split: {top['splitRoomsCount']}</div>
            </div>
        </div>

        <h2>Multi-Threshold Room Recall (IoU Bins)</h2>
        <div class="card" style="margin-bottom: 30px;">
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px;">
                <div>
                    <div class="card-label">IoU ≥ 0.25</div>
                    <div style="font-size: 20px; font-weight: 700;">{bins['gte_0_25_pct']}% ({bins['gte_0_25']} rooms)</div>
                    <div class="bar-container"><div class="bar-fill" style="width: {bins['gte_0_25_pct']}%;"></div></div>
                </div>
                <div>
                    <div class="card-label">IoU ≥ 0.50 (Standard)</div>
                    <div style="font-size: 20px; font-weight: 700;">{bins['gte_0_50_pct']}% ({bins['gte_0_50']} rooms)</div>
                    <div class="bar-container"><div class="bar-fill" style="width: {bins['gte_0_50_pct']}%;"></div></div>
                </div>
                <div>
                    <div class="card-label">IoU ≥ 0.75 (Strict)</div>
                    <div style="font-size: 20px; font-weight: 700;">{bins['gte_0_75_pct']}% ({bins['gte_0_75']} rooms)</div>
                    <div class="bar-container"><div class="bar-fill" style="width: {bins['gte_0_75_pct']}%;"></div></div>
                </div>
                <div>
                    <div class="card-label">IoU ≥ 0.90 (CAD Quality)</div>
                    <div style="font-size: 20px; font-weight: 700;">{bins['gte_0_90_pct']}% ({bins['gte_0_90']} rooms)</div>
                    <div class="bar-container"><div class="bar-fill" style="width: {bins['gte_0_90_pct']}%;"></div></div>
                </div>
            </div>
        </div>

        <h2>Evaluated Floorplans Breakdown</h2>
        <table>
            <thead>
                <tr>
                    <th>Image</th>
                    <th>GT</th>
                    <th>Pred</th>
                    <th>TP</th>
                    <th>FP</th>
                    <th>FN</th>
                    <th>F1</th>
                    <th>Mean IoU</th>
                    <th>Area Err</th>
                    <th>Bnd Err</th>
                    <th>Merged</th>
                    <th>Split</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                {rows_html}
            </tbody>
        </table>
    </div>
</body>
</html>
"""


def _generate_md_report(summary: Dict[str, Any], results: List[ImageEvaluationResult]) -> str:
    tot = summary["totals"]
    m = summary["metrics"]
    sizes = summary.get("roomSizeDistribution", {})
    res_b = summary.get("resolutionBreakdown", {})
    fails = summary.get("failureSummary", [])

    lines = []
    lines.append("# BIONIC Floorplan Detector Benchmark Report (Phase 2.7.6)\n")
    lines.append(f"- **Benchmark**: `{summary['benchmarkName']}`")
    lines.append(f"- **Dataset**: `{summary['dataset']}`")
    lines.append(f"- **Detector**: `{summary['detectorVersion']}`")
    lines.append(f"- **Timestamp**: `{summary['timestamp']}`")
    lines.append(f"- **Git Commit**: `{summary['gitCommit']}`\n")

    lines.append("## 1. Executive Summary & Mathematical Reconciliation\n")
    lines.append("| Metric | Value | Reconciled Formula |")
    lines.append("| :--- | :--- | :--- |")
    lines.append(f"| **Evaluated Floorplans** | {tot['imagesEvaluated']} | Total evaluated images |")
    lines.append(f"| **Passed Floorplans** | {tot['imagesPassed']} ({tot['imagePassRatePct']}%) | F1 >= 0.60 & IoU >= 0.60 |")
    lines.append(f"| **Ground Truth Rooms** | {tot['groundTruthRooms']} | `GT = TP ({tot['truePositiveRooms']}) + FN ({tot['missedRooms']})` |")
    lines.append(f"| **Predicted Rooms** | {tot['predictedRooms']} | `Pred = TP ({tot['truePositiveRooms']}) + FP ({tot['falsePositiveRooms']})` |")
    lines.append(f"| **True Positives (TP)** | {tot['truePositiveRooms']} | Matched room pairs |")
    lines.append(f"| **False Positives (FP)** | {tot['falsePositiveRooms']} | Extra / spurious rooms |")
    lines.append(f"| **False Negatives (FN)** | {tot['missedRooms']} | Missed GT rooms |")
    lines.append(f"| **Micro Precision** | {m['microPrecision']:.4f} | `TP / (TP + FP)` |")
    lines.append(f"| **Micro Recall** | {m['microRecall']:.4f} | `TP / (TP + FN)` |")
    lines.append(f"| **Micro F1** | {m['microF1']:.4f} | `2 * P * R / (P + R)` |")
    lines.append(f"| **Macro Precision** | {m['macroPrecision']:.4f} | Mean precision across images |")
    lines.append(f"| **Macro Recall** | {m['macroRecall']:.4f} | Mean recall across images |")
    lines.append(f"| **Macro F1** | {m['macroF1']:.4f} | Mean F1 across images |")
    lines.append(f"| **Mean Room IoU** | {m['meanIoU']:.4f} | Geometry quality (matched TPs) |")
    lines.append(f"| **Median Room IoU** | {m['medianIoU']:.4f} | Geometry median |")
    lines.append(f"| **Mean Boundary Error** | {m['meanBoundaryErrorPx']:.1f} px | Hausdorff distance |")
    lines.append("\n")

    lines.append("## 2. Room Size Normalized Area Ratio Breakdown\n")
    lines.append("| Category | Area Ratio (`GT / Image`) | GT Count | TP Count | FN Count | Recall (%) |")
    lines.append("| :--- | :--- | :--- | :--- | :--- | :--- |")
    for cat in ["tiny", "small", "medium", "large"]:
        b = sizes.get(cat, {})
        lines.append(f"| **{cat.capitalize()}** | `{cat}` | {b.get('gtCount', 0)} | {b.get('tpCount', 0)} | {b.get('fnCount', 0)} | {b.get('recall', 0.0)}% |")
    lines.append("\n")

    lines.append("## 3. Resolution Scale Breakdown\n")
    lines.append("| Category | Pixel Count | Image Count | GT Count | TP Count | Mean F1 | Mean IoU |")
    lines.append("| :--- | :--- | :--- | :--- | :--- | :--- | :--- |")
    for cat in ["low", "medium", "high"]:
        b = res_b.get(cat, {})
        lines.append(f"| **{cat.capitalize()}** | `{cat}` | {b.get('imageCount', 0)} | {b.get('gtCount', 0)} | {b.get('tpCount', 0)} | {b.get('meanF1', 0.0):.4f} | {b.get('meanIoU', 0.0):.4f} |")
    lines.append("\n")

    lines.append("## 4. Anchor Image Performance\n")
    lines.append("| Image ID | GT | Pred | TP | FP | FN | F1 | Mean IoU | Status |")
    lines.append("| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |")
    anchor_keys = ["Lantai 2", "sample-floorplan", "sample-floorplan-house2", "Lantai 1"]
    for r in results:
        is_anchor = any(k.lower() in r.imageId.lower() for k in anchor_keys)
        prefix = "**" if is_anchor else ""
        lines.append(
            f"| {prefix}{r.imageId}{prefix} | {r.gtRoomCount} | {r.predRoomCount} | {r.truePositiveCount} | "
            f"{r.falsePositiveCount} | {r.falseNegativeCount} | {r.f1:.4f} | {r.meanIoU:.4f} | "
            f"{'PASS' if r.passed else 'FAIL'} |"
        )
    lines.append("\n")

    lines.append("## 5. Failure Taxonomy Summary\n")
    lines.append("| Failure Category | Occurrence Count | Affected Images Count |")
    lines.append("| :--- | :--- | :--- |")
    for f in fails:
        lines.append(f"| **{f['failureType']}** | {f['count']} | {len(f.get('affectedImages', []))} |")
    lines.append("\n")

    return "\n".join(lines)
