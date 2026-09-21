"""
Phase 2.8.0 ML Structural Detector Feasibility Study Runner
Runs RT-DETR inference on all 12 benchmark floorplans, measures performance (GPU vs CPU),
generates detections.json, overlay.png, metrics.json per image, computes candidate-level
structural evidence, and performs the Lost-TP & True-Room vs Cavity separation study.
"""
import sys
import json
import time
import copy
from pathlib import Path
from typing import Dict, Any, List, Tuple, Optional
import numpy as np
import torch

package_root = Path(__file__).resolve().parent
if str(package_root) not in sys.path:
    sys.path.insert(0, str(package_root))

from ml.config import MLDetectorConfig, STRUCTURAL_CLASSES, DEFAULT_WEIGHTS_PATH
from ml.detector import RTDETRFloorplanDetector
from ml.inference import MLInferenceEngine
from ml.structural_evidence import StructuralEvidenceExtractor
from ml.visualization import render_structural_overlay
from ml.models import MLDetection, MLInferenceResult, MLStructuralEvidence, CandidateMLComparison, BBox
from evaluation.datasets.my_floorplan import MyFloorplanAdapter


def calculate_auc(true_scores: List[float], false_scores: List[float]) -> float:
    """
    Computes exact Mann-Whitney U / ROC-AUC between true-room scores and false/cavity scores.
    AUC = 1.0 means perfect separation; AUC = 0.5 means random.
    """
    if not true_scores or not false_scores:
        return 0.5
    u = 0.0
    for ts in true_scores:
        for fs in false_scores:
            if ts > fs:
                u += 1.0
            elif ts == fs:
                u += 0.5
    return u / (len(true_scores) * len(false_scores))


def main():
    print("=" * 75)
    print("PHASE 2.8.0 — ML STRUCTURAL DETECTOR FEASIBILITY STUDY RUNNER")
    print("=" * 75)

    output_base_dir = package_root / "evaluation" / "ml_feasibility"
    output_base_dir.mkdir(parents=True, exist_ok=True)

    adapter = MyFloorplanAdapter()
    samples = adapter.discover_samples()
    print(f"Loaded {len(samples)} benchmark floorplan images:")
    for s in samples:
        print(f"  - {s}")
    print("-" * 75)

    # 1. Initialize GPU detector & CPU detector for performance benchmarking
    device_name = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Initializing RT-DETR-L on primary device: {device_name}...")
    gpu_config = MLDetectorConfig(device=device_name, confidence_threshold=0.15)
    gpu_detector = RTDETRFloorplanDetector(gpu_config)
    gpu_detector.load_model()
    gpu_engine = MLInferenceEngine(gpu_detector)

    # CPU engine for comparative benchmarking
    cpu_config = MLDetectorConfig(device="cpu", confidence_threshold=0.15, half_precision=False)
    cpu_detector = RTDETRFloorplanDetector(cpu_config)
    cpu_detector.load_model()
    cpu_engine = MLInferenceEngine(cpu_detector)

    evidence_extractor = StructuralEvidenceExtractor(buffer_px=15.0)

    # Load baseline candidate traces (Exp A baseline) to correlate candidates with GT
    trace_path = package_root / "evaluation" / "results" / "ablation" / "2792_A" / "candidate_traces.json"
    if not trace_path.exists():
        trace_path = package_root / "evaluation" / "recovery_regression_analysis.json"
    
    baseline_traces = []
    if trace_path.exists():
        with open(trace_path, "r", encoding="utf-8") as tf:
            data = json.load(tf)
            baseline_traces = data if isinstance(data, list) else data.get("candidateTraces", [])

    # Load cache_precomputed_bundles or baseline candidates if available
    cache_path = package_root / "evaluation" / "cache_precomputed_bundles.pkl"
    precomputed_bundles = {}
    if cache_path.exists():
        try:
            import pickle
            with open(cache_path, "rb") as cf:
                precomputed_bundles = pickle.load(cf)
            print(f"Loaded precomputed bundles for {len(precomputed_bundles)} images from cache.")
        except Exception:
            precomputed_bundles = {}

    image_results: Dict[str, Any] = {}
    all_candidate_comparisons: List[CandidateMLComparison] = []
    performance_summary: Dict[str, Dict[str, float]] = {}

    print("\nExecuting inference and evidence extraction across benchmark...")

    for idx, sample_id in enumerate(samples, 1):
        img_path = adapter.get_image_path(sample_id)
        img_stem = Path(sample_id).stem
        img_out_dir = output_base_dir / img_stem
        img_out_dir.mkdir(parents=True, exist_ok=True)

        gt_sample = adapter.load_ground_truth(sample_id)

        # Primary GPU Inference
        t0 = time.perf_counter()
        gpu_res = gpu_engine.predict_image(img_path, image_id=img_stem)
        gpu_elapsed = time.perf_counter() - t0

        # CPU Benchmark (single image benchmark timing)
        t_cpu0 = time.perf_counter()
        cpu_res = cpu_engine.predict_image(img_path, image_id=img_stem)
        cpu_elapsed = time.perf_counter() - t_cpu0

        performance_summary[img_stem] = {
            "gpuInferenceMs": gpu_res.inference_time_ms,
            "gpuTotalMs": gpu_res.total_time_ms,
            "gpuMemoryMb": gpu_res.memory_allocated_mb,
            "cpuInferenceMs": cpu_res.inference_time_ms,
            "cpuTotalMs": cpu_res.total_time_ms,
        }

        # Save detections.json
        det_file = img_out_dir / "detections.json"
        with open(det_file, "w", encoding="utf-8") as f:
            json.dump([d.to_dict() for d in gpu_res.detections], f, indent=2)

        # Save metrics.json
        met_file = img_out_dir / "metrics.json"
        with open(met_file, "w", encoding="utf-8") as f:
            json.dump(gpu_res.to_dict(), f, indent=2)

        # Render and save overlay.png if not already rendered
        overlay_file = img_out_dir / "overlay.png"
        if not overlay_file.exists():
            render_structural_overlay(img_path, gpu_res.detections, out_path=overlay_file)

        counts = gpu_res.class_counts()
        print(f"  [{idx}/{len(samples)}] {sample_id} ({gpu_res.image_width}x{gpu_res.image_height}) -> "
              f"Dets: {len(gpu_res.detections)} (W:{counts['wall']}, D:{counts['door']}, Win:{counts['window']}, L:{counts['linkage_point']}) | "
              f"GPU: {gpu_res.inference_time_ms:.1f}ms | CPU: {cpu_res.inference_time_ms:.1f}ms", flush=True)

        image_results[img_stem] = {
            "image": sample_id,
            "dimensions": [gpu_res.image_width, gpu_res.image_height],
            "detectionsCount": len(gpu_res.detections),
            "classCounts": counts,
            "gpuMs": round(gpu_res.inference_time_ms, 1),
            "cpuMs": round(cpu_res.inference_time_ms, 1),
        }

        # Extract candidate association from precomputed bundles or diagnostics
        # We run CandidateRecoveryEngine on precomputed bundle to get candidate polygons & traces
        if sample_id in precomputed_bundles:
            pre_bundle, active_cfg = precomputed_bundles[sample_id]
            from app.candidate_recovery import CandidateRecoveryEngine
            engine = CandidateRecoveryEngine(active_cfg)
            fused_hyps, accepted_rec, rejected_rec = engine.recover_candidates(
                accepted_hypotheses=pre_bundle["pruned_hyps"],
                all_hypotheses=pre_bundle["hypotheses"],
                classifications=pre_bundle["classifications"],
                wall_mask=pre_bundle["wall_mask"],
                wall_network=pre_bundle["wall_network"],
                footprint_mask=pre_bundle["footprint_mask"],
                openings=pre_bundle["openings_diag"],
                img_w=pre_bundle["w"],
                img_h=pre_bundle["h"],
            )

            all_recs = accepted_rec + rejected_rec
            traces = getattr(engine, "candidate_traces", [])
            h_img, w_img = pre_bundle["h"], pre_bundle["w"]

            from shapely.geometry import Polygon as ShapelyPolygon
            gt_polys = []
            for gta in gt_sample.areas:
                g_pts = [p.to_tuple() for p in gta.polygon]
                if len(g_pts) >= 3:
                    sp = ShapelyPolygon(g_pts)
                    if not sp.is_valid: sp = sp.buffer(0)
                    gt_polys.append((gta.id, sp))

            for trace in traces:
                cid = trace["candidateId"]
                rec = next((r for r in all_recs if r.recovery_id == cid or r.id == cid), None)
                if not rec or not rec.polygon:
                    continue

                poly_coords = [(p.xPx, p.yPx) for p in rec.polygon]
                
                # Compute ground-truth match and IoU
                best_gt = None
                best_iou = 0.0
                try:
                    c_poly = ShapelyPolygon(poly_coords)
                    if not c_poly.is_valid: c_poly = c_poly.buffer(0)
                    for gid, gsp in gt_polys:
                        inter = c_poly.intersection(gsp).area
                        union = c_poly.union(gsp).area
                        iou = inter / union if union > 0 else 0.0
                        if iou > best_iou:
                            best_iou = iou
                            best_gt = gid
                except Exception:
                    pass

                # Extract ML Structural Evidence
                ml_ev = evidence_extractor.compute_candidate_evidence(
                    candidate_polygon=poly_coords,
                    detections=gpu_res.detections,
                    image_shape=(h_img, w_img),
                )
                cavity_like = evidence_extractor.compute_cavity_likelihood(poly_coords, ml_ev)

                is_true = (best_iou >= 0.25)
                comp = CandidateMLComparison(
                    candidate_id=cid,
                    image_id=sample_id,
                    gt_match=best_gt if is_true else None,
                    iou=best_iou,
                    is_true_room=is_true,
                    classical_confidence=trace.get("confidenceAfterBonus", trace.get("confidence", 0.0)),
                    budget_rank=trace.get("budgetRank", -1),
                    rejection_reason=trace.get("rejectionReason", "unknown"),
                    ml_wall_evidence=ml_ev.wall_support,
                    ml_door_evidence=ml_ev.door_connection,
                    ml_window_evidence=ml_ev.window_connection,
                    ml_linkage_evidence=ml_ev.linkage_support,
                    ml_structural_score=ml_ev.structural_confidence,
                    cavity_likelihood=cavity_like,
                )
                all_candidate_comparisons.append(comp)

    # 4. Save all candidate comparisons
    cand_eval_path = output_base_dir / "candidate_evaluations.json"
    with open(cand_eval_path, "w", encoding="utf-8") as f:
        json.dump([c.to_dict() for c in all_candidate_comparisons], f, indent=2)
    print(f"\nSaved candidate evaluations ({len(all_candidate_comparisons)} candidates) to {cand_eval_path}")

    # 5. Lost-TP Analysis specifically on house2
    house2_candidates = [c for c in all_candidate_comparisons if "house2" in c.image_id]
    # Target lost true-positive candidates in house2 (candidates that match ground truth but were rejected)
    lost_records = [c for c in house2_candidates if c.is_true_room and c.rejection_reason != "accepted"]
    
    # Top-ranked cavity artifacts in house2 that outranked them (ranks 1..12 that are NOT true rooms)
    outranking_cavities = [c for c in house2_candidates if not c.is_true_room and 1 <= c.budget_rank <= 12]

    lost_tp_analysis = {
        "targetLostCandidates": [c.to_dict() for c in lost_records],
        "outrankingCavityArtifacts": [c.to_dict() for c in outranking_cavities],
        "summary": {
            "meanLostStructuralScore": float(np.mean([c.ml_structural_score for c in lost_records])) if lost_records else 0.0,
            "meanLostDoorEvidence": float(np.mean([c.ml_door_evidence for c in lost_records])) if lost_records else 0.0,
            "meanCavityStructuralScore": float(np.mean([c.ml_structural_score for c in outranking_cavities])) if outranking_cavities else 0.0,
            "meanCavityDoorEvidence": float(np.mean([c.ml_door_evidence for c in outranking_cavities])) if outranking_cavities else 0.0,
        }
    }
    lost_tp_path = output_base_dir / "lost_tp_ml_comparison.json"
    with open(lost_tp_path, "w", encoding="utf-8") as f:
        json.dump(lost_tp_analysis, f, indent=2)
    print(f"Saved Lost-TP ML analysis to {lost_tp_path}")

    # 6. Separation Analysis: True Rooms vs Non-Room Cavities
    true_rooms = [c for c in all_candidate_comparisons if c.is_true_room]
    non_rooms = [c for c in all_candidate_comparisons if not c.is_true_room]

    true_scores = [c.ml_structural_score for c in true_rooms]
    non_room_scores = [c.ml_structural_score for c in non_rooms]

    true_doors = [c.ml_door_evidence for c in true_rooms]
    non_room_doors = [c.ml_door_evidence for c in non_rooms]

    auc_structural = calculate_auc(true_scores, non_room_scores)
    auc_door = calculate_auc(true_doors, non_room_doors)

    print("\n" + "=" * 75)
    print("TRUE ROOM VS CAVITY ARTIFACT SEPARATION ANALYSIS")
    print("=" * 75)
    print(f"Total Candidates Evaluated: {len(all_candidate_comparisons)}")
    print(f"  True Room Candidates: {len(true_rooms)} | Non-Room Cavity Candidates: {len(non_rooms)}")
    print(f"Mean ML Structural Score:")
    print(f"  True Rooms: {np.mean(true_scores):.4f} (std {np.std(true_scores):.4f})")
    print(f"  Non-Rooms:  {np.mean(non_room_scores):.4f} (std {np.std(non_room_scores):.4f})")
    print(f"  Difference: +{np.mean(true_scores) - np.mean(non_room_scores):.4f}")
    print(f"Mean Door Evidence:")
    print(f"  True Rooms: {np.mean(true_doors):.4f}")
    print(f"  Non-Rooms:  {np.mean(non_room_doors):.4f}")
    print(f"  Difference: +{np.mean(true_doors) - np.mean(non_room_doors):.4f}")
    print(f"ROC-AUC Structural Score: {auc_structural:.4f}")
    print(f"ROC-AUC Door Evidence:     {auc_door:.4f}")
    print("=" * 75)

    # 7. Aggregate Feasibility Summary
    gpu_times = [p["gpuInferenceMs"] for p in performance_summary.values()]
    cpu_times = [p["cpuInferenceMs"] for p in performance_summary.values()]

    feasibility_summary = {
        "metadata": {
            "phase": "2.8.0",
            "studyName": "ML Structural Detector Feasibility Study",
            "model": "RT-DETR-L (CubiCasa5K pretrained, OldDeLorean/rtdetr-floorplan-detector)",
            "weightsPath": str(DEFAULT_WEIGHTS_PATH),
            "inputResolution": 1024,
            "confidenceThreshold": 0.15,
            "classes": STRUCTURAL_CLASSES,
        },
        "performance": {
            "meanGpuInferenceMs": round(float(np.mean(gpu_times)), 2),
            "medianGpuInferenceMs": round(float(np.median(gpu_times)), 2),
            "maxGpuInferenceMs": round(float(np.max(gpu_times)), 2),
            "meanCpuInferenceMs": round(float(np.mean(cpu_times)), 2),
            "medianCpuInferenceMs": round(float(np.median(cpu_times)), 2),
            "speedupGpuVsCpu": round(float(np.mean(cpu_times) / max(0.1, np.mean(gpu_times))), 2),
            "perImage": performance_summary,
        },
        "detectionsByImage": image_results,
        "separationMetrics": {
            "totalCandidates": len(all_candidate_comparisons),
            "trueRoomCount": len(true_rooms),
            "nonRoomCount": len(non_rooms),
            "trueRoomMeanScore": round(float(np.mean(true_scores)), 4),
            "nonRoomMeanScore": round(float(np.mean(non_room_scores)), 4),
            "scoreMargin": round(float(np.mean(true_scores) - np.mean(non_room_scores)), 4),
            "trueRoomMeanDoor": round(float(np.mean(true_doors)), 4),
            "nonRoomMeanDoor": round(float(np.mean(non_room_doors)), 4),
            "doorMargin": round(float(np.mean(true_doors) - np.mean(non_room_doors)), 4),
            "rocAucStructuralScore": round(auc_structural, 4),
            "rocAucDoorEvidence": round(auc_door, 4),
        },
        "lostTpComparison": lost_tp_analysis,
    }

    summary_file = output_base_dir / "ml_feasibility_summary.json"
    with open(summary_file, "w", encoding="utf-8") as f:
        json.dump(feasibility_summary, f, indent=2)
    print(f"\nExported feasibility summary to {summary_file}")

    return feasibility_summary


if __name__ == "__main__":
    main()
