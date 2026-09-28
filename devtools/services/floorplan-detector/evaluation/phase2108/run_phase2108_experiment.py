"""
Phase 2.10.8 Experiment Runner: Room Validity & False Positive Suppression.
Evaluates the authoritative 12-image benchmark suite (148 GT rooms).
Ingests 367 Phase 2.10.7 final rooms as input hypotheses.
Executes positive evidence extraction, negative evidence extraction, semantic safeguards,
validity scoring, decision policy, and gentle boundary refinement.
Performs threshold sweeps, 12 ablation configurations (A-L), ML ON vs ML OFF comparison,
audits TP vs FP feature separation, failure diagnosis for all 148 GT rooms,
generates all 14 required JSON artifacts and 10 diagnostic visualization layers per image.
"""
import copy
import json
import os
import pickle
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

import cv2
import numpy as np
from shapely.geometry import Polygon as ShapelyPolygon

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from evaluation.datasets.my_floorplan import MyFloorplanAdapter
from app.room_validity.models import (
    RoomValidityDecision,
    RoomValidityHypothesis,
    ValidatedRoom,
    ValidationResult,
)
from app.room_validity.false_positive_taxonomy import FalsePositiveReason, describe_reason
from app.room_validity.architectural_evidence import ArchitecturalEvidenceExtractor
from app.room_validity.negative_evidence import NegativeEvidenceExtractor
from app.room_validity.room_classifier import SemanticRoomClassifier
from app.room_validity.features import RoomValidityFeatureExtractor
from app.room_validity.validity_scoring import ValidityScorer
from app.room_validity.decision import RoomValidityDecisionPolicy
from app.room_validity.boundary_quality import BoundaryQualityRefiner
from app.room_validity.validation_pipeline import RoomValidationPipeline
from app.room_validity.metrics import RoomValidityMetricsEvaluator, compute_polygon_iou
from app.room_validity.visualization import RoomValidityVisualizer

OUT_DIR = ROOT_DIR / "evaluation" / "phase2108"
VIS_DIR = OUT_DIR / "visualizations"
CACHE_PATH = ROOT_DIR / "evaluation" / "cache_precomputed_bundles.pkl"
PHASE2107_LAYOUTS_PATH = ROOT_DIR / "evaluation" / "phase2107" / "top_k_layouts.json"


def load_phase2107_hypotheses(sample_id: str, raw_rooms_data: List[Dict[str, Any]]) -> List[RoomValidityHypothesis]:
    """Converts Phase 2.10.7 final room JSON dicts into RoomValidityHypothesis instances."""
    hyps: List[RoomValidityHypothesis] = []
    for r in raw_rooms_data:
        poly_coords = r.get("polygon", [])
        if len(poly_coords) < 3:
            continue
        poly = ShapelyPolygon(poly_coords)
        if not poly.is_valid:
            poly = poly.buffer(0)
        
        hyp = RoomValidityHypothesis(
            hypothesis_id=r.get("hypothesisId") or r.get("roomId", "hyp_0"),
            image_id=sample_id,
            polygon=poly,
            area_px=float(r.get("areaPx", poly.area)),
            bbox=tuple(r.get("bbox", poly.bounds)),
            centroid=tuple(r.get("centroid", (poly.centroid.x, poly.centroid.y))),
            source_proposal_ids=r.get("sourceHypotheses", []),
            formation_score=float(r.get("formationScore", 0.5)),
            architectural_score=float(r.get("architecturalScore", 0.0)),
            topology_score=float(r.get("topologyEvidence", 0.0)),
            boundary_quality=float(r.get("boundaryQuality", 0.0)),
            confidence=float(r.get("confidence", 0.5)),
            is_corridor=bool(r.get("isCorridor", False)),
        )
        hyps.append(hyp)
    return hyps


def run_phase2108_experiment():
    print("=" * 80)
    print("PHASE 2.10.8: ROOM VALIDITY & FALSE POSITIVE SUPPRESSION EXPERIMENT")
    print("=" * 80)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    VIS_DIR.mkdir(parents=True, exist_ok=True)

    adapter = MyFloorplanAdapter()
    samples = adapter.discover_samples()

    print(f"Loading precomputed bundles cache from {CACHE_PATH}...")
    with open(CACHE_PATH, "rb") as f:
        precomputed_bundles = pickle.load(f)

    # Step 1: Benchmark Integrity Check
    total_gt_count = 0
    all_gt_polygons: Dict[str, List[Tuple[str, ShapelyPolygon]]] = {}
    all_gt_dicts: Dict[str, List[Dict[str, Any]]] = {}

    for sample_id in samples:
        gt_sample = adapter.load_ground_truth(sample_id)
        total_gt_count += len(gt_sample.areas)
        all_gt_polygons[sample_id] = [
            (gta.id, ShapelyPolygon([p.to_tuple() for p in gta.polygon]))
            for gta in gt_sample.areas if len(gta.polygon) >= 3
        ]
        all_gt_dicts[sample_id] = [
            {"id": gta.id, "polygon": ShapelyPolygon([p.to_tuple() for p in gta.polygon])}
            for gta in gt_sample.areas if len(gta.polygon) >= 3
        ]

    print(f"Verified GT Count across 12 floorplans: {total_gt_count} (Authoritative Benchmark: 148)")
    assert total_gt_count == 148, f"Benchmark mismatch! Found {total_gt_count}, expected 148."

    # Step 2: Ingest Phase 2.10.7 Top-1 Final Rooms
    print("\n--- 1. Ingesting Phase 2.10.7 Final Rooms ---")
    if not PHASE2107_LAYOUTS_PATH.exists():
        raise FileNotFoundError(f"Missing Phase 2.10.7 top_k_layouts.json at {PHASE2107_LAYOUTS_PATH}")

    with open(PHASE2107_LAYOUTS_PATH, "r", encoding="utf-8") as f:
        phase2107_data = json.load(f)

    per_image_layouts = phase2107_data.get("per_image", {})
    input_hyps_by_image: Dict[str, List[RoomValidityHypothesis]] = {}
    total_input_rooms = 0

    metrics_evaluator = RoomValidityMetricsEvaluator()

    # Baseline Phase 2.10.7 verification
    baseline_tp_050 = 0
    baseline_fp_050 = 0
    baseline_fn_050 = 0
    baseline_tp_025 = 0
    baseline_fp_025 = 0
    baseline_fn_025 = 0

    for sample_id in samples:
        layouts = per_image_layouts.get(sample_id, [])
        top1 = layouts[0] if layouts else {"rooms": []}
        rooms_data = top1.get("rooms", [])
        hyps = load_phase2107_hypotheses(sample_id, rooms_data)
        input_hyps_by_image[sample_id] = hyps
        total_input_rooms += len(hyps)

        # Baseline evaluation
        baseline_preds = [
            ValidatedRoom(
                room_id=f"base_{i}",
                hypothesis_id=h.hypothesis_id,
                image_id=sample_id,
                polygon=h.polygon,
                confidence=h.confidence,
                room_validity_score=h.formation_score,
                architectural_score=h.architectural_score,
                boundary_quality=h.boundary_quality,
                is_corridor=h.is_corridor,
                decision="VALID",
                decision_reasons=["phase2107_baseline"],
            )
            for i, h in enumerate(hyps)
        ]
        ev_base = metrics_evaluator.evaluate_detection(baseline_preds, all_gt_dicts[sample_id], image_name=sample_id)
        baseline_tp_050 += ev_base["tp_050"]
        baseline_fp_050 += ev_base["fp_050"]
        baseline_fn_050 += ev_base["fn_050"]
        baseline_tp_025 += ev_base["tp_025"]
        baseline_fp_025 += ev_base["fp_025"]
        baseline_fn_025 += ev_base["fn_025"]

    print(f"Total Phase 2.10.7 Input Rooms Ingested: {total_input_rooms} (Expected: 367)")
    print(f"Verified Phase 2.10.7 Baseline: TP@0.50={baseline_tp_050}, FP@0.50={baseline_fp_050}, FN@0.50={baseline_fn_050}")
    assert total_input_rooms == 367, f"Input rooms mismatch! Got {total_input_rooms}, expected 367."
    assert baseline_tp_050 == 19, f"Baseline TP mismatch! Got {baseline_tp_050}, expected 19."
    assert baseline_fp_050 == 348, f"Baseline FP mismatch! Got {baseline_fp_050}, expected 348."

    # Available room recall baseline
    available_gt_count = baseline_tp_050  # exactly 19 GT rooms had matching predictions in Phase 2.10.7 input
    print(f"Available GT Rooms in Input Pool: {available_gt_count} / 148 (129 FN were lost in earlier phases or unrepresented)")

    # Step 3: Run Primary Phase 2.10.8 Room Validation Pipeline
    print("\n--- 2. Executing Room Validation Pipeline (Primary Configuration) ---")
    pipeline = RoomValidationPipeline(use_ml=False, refine_boundaries=True)
    visualizer = RoomValidityVisualizer(str(VIS_DIR))

    timings_per_image = []
    validation_results_by_image: Dict[str, ValidationResult] = {}
    detection_eval_by_image: Dict[str, Dict[str, Any]] = {}

    all_processed_hyps: List[RoomValidityHypothesis] = []
    all_valid_rooms: List[ValidatedRoom] = []

    primary_tp_050 = 0
    primary_fp_050 = 0
    primary_fn_050 = 0
    primary_tp_025 = 0
    primary_fp_025 = 0
    primary_fn_025 = 0
    primary_merge_errors = 0
    primary_split_errors = 0

    for sample_id in samples:
        bundle, _ = precomputed_bundles[sample_id]
        h_img, w_img = bundle["wall_mask"].shape[:2]
        hyps = copy.deepcopy(input_hyps_by_image[sample_id])

        t0 = time.perf_counter()
        v_res = pipeline.process_hypotheses(
            hypotheses=hyps,
            img_w=w_img,
            img_h=h_img,
            wall_network=bundle.get("wall_network"),
            wall_mask=bundle.get("wall_mask"),
            footprint_mask=bundle.get("footprint_mask"),
            doors=bundle.get("doors", []),
            text_regions=bundle.get("text_regions", []),
        )
        elapsed_ms = (time.perf_counter() - t0) * 1000.0
        timings_per_image.append(elapsed_ms)

        validation_results_by_image[sample_id] = v_res
        all_processed_hyps.extend(hyps)
        all_valid_rooms.extend(v_res.valid_rooms)

        # Evaluate against GT
        d_ev = metrics_evaluator.evaluate_detection(v_res.valid_rooms, all_gt_dicts[sample_id], image_name=sample_id)
        detection_eval_by_image[sample_id] = d_ev

        primary_tp_050 += d_ev["tp_050"]
        primary_fp_050 += d_ev["fp_050"]
        primary_fn_050 += d_ev["fn_050"]
        primary_tp_025 += d_ev["tp_025"]
        primary_fp_025 += d_ev["fp_025"]
        primary_fn_025 += d_ev["fn_025"]
        primary_merge_errors += d_ev["merge_errors"]
        primary_split_errors += d_ev["split_errors"]

        print(
            f"  [{sample_id}] In: {len(hyps):2d} -> Valid: {len(v_res.valid_rooms):2d}, Amb: {len(v_res.ambiguous_rooms):2d}, Rej: {len(v_res.rejected_rooms):2d} "
            f"| TP@.50: {d_ev['tp_050']:2d} | FP: {d_ev['fp_050']:2d} | FN: {d_ev['fn_050']:2d} | Prec: {d_ev['precision_050']:.3f} | Time: {elapsed_ms:.1f}ms"
        )

    # Primary Aggregate Metrics
    p_prec_050 = primary_tp_050 / (primary_tp_050 + primary_fp_050) if (primary_tp_050 + primary_fp_050) > 0 else 0.0
    p_rec_050 = primary_tp_050 / (primary_tp_050 + primary_fn_050) if (primary_tp_050 + primary_fn_050) > 0 else 0.0
    p_f1_050 = (2.0 * p_prec_050 * p_rec_050) / (p_prec_050 + p_rec_050) if (p_prec_050 + p_rec_050) > 0 else 0.0

    p_prec_025 = primary_tp_025 / (primary_tp_025 + primary_fp_025) if (primary_tp_025 + primary_fp_025) > 0 else 0.0
    p_rec_025 = primary_tp_025 / (primary_tp_025 + primary_fn_025) if (primary_tp_025 + primary_fn_025) > 0 else 0.0
    p_f1_025 = (2.0 * p_prec_025 * p_rec_025) / (p_prec_025 + p_rec_025) if (p_prec_025 + p_rec_025) > 0 else 0.0

    avail_rec_050 = primary_tp_050 / available_gt_count if available_gt_count > 0 else 0.0

    print("\n" + "=" * 80)
    print("PHASE 2.10.8 PRIMARY DETECTION METRICS")
    print("=" * 80)
    print(f"Total Input Candidates: {total_input_rooms} -> Valid Detections: {len(all_valid_rooms)}")
    print(f"IoU >= 0.50: TP={primary_tp_050} | FP={primary_fp_050} | FN={primary_fn_050} | Prec={p_prec_050:.4f} | Total Rec={p_rec_050:.4f} | Available Rec={avail_rec_050:.4f} | F1={p_f1_050:.4f}")
    print(f"IoU >= 0.25: TP={primary_tp_025} | FP={primary_fp_025} | FN={primary_fn_025} | Prec={p_prec_025:.4f} | Rec={p_rec_025:.4f} | F1={p_f1_025:.4f}")
    print(f"Merge Errors: {primary_merge_errors} | Split Errors: {primary_split_errors}")

    # Step 4: True Positive & False Positive Audits
    print("\n--- 3. Auditing True Positives and False Positives ---")
    tp_audit_records = []
    fp_audit_records = []

    for s in samples:
        gt_list = all_gt_dicts[s]
        v_res = validation_results_by_image[s]
        valid_rooms = v_res.valid_rooms
        all_img_hyps = input_hyps_by_image[s]

        # Audit Valid Rooms
        for vr in valid_rooms:
            # find matching GT
            best_iou = 0.0
            best_gt_id = None
            for gt in gt_list:
                iou = compute_polygon_iou(vr.polygon, gt["polygon"])
                if iou > best_iou:
                    best_iou = iou
                    best_gt_id = gt["id"]
            
            rec = {
                "image_id": s,
                "room_id": vr.room_id,
                "hypothesis_id": vr.hypothesis_id,
                "room_validity_score": vr.room_validity_score,
                "architectural_score": vr.architectural_score,
                "boundary_quality": vr.boundary_quality,
                "matched_gt_id": best_gt_id if best_iou >= 0.50 else None,
                "gt_iou": round(float(best_iou), 4),
                "is_true_positive": bool(best_iou >= 0.50),
            }
            if best_iou >= 0.50:
                tp_audit_records.append(rec)
            else:
                fp_audit_records.append(rec)

    # Step 5: Feature Distribution Separation Analysis
    print("\n--- 4. Computing Feature Distribution Separation ---")
    feature_dist_summary = metrics_evaluator.compute_feature_distributions(all_processed_hyps, all_gt_dicts)
    for feat, stats in feature_dist_summary["distributions"].items():
        print(f"  {feat:30s} | TP Mean: {stats['tp_mean']:.3f} | FP Mean: {stats['fp_mean']:.3f} | Separation: {stats['separation']:+.3f}")

    # Step 6: Threshold Sweep [0.10, 0.90]
    print("\n--- 5. Threshold Sensitivity Sweep ---")
    threshold_sweep_records = []
    pr_records = []

    thresholds = [0.10, 0.15, 0.20, 0.25, 0.30, 0.35, 0.40, 0.45, 0.50, 0.55, 0.60, 0.65, 0.70, 0.75, 0.80, 0.85, 0.90]
    for th in thresholds:
        th_tp_050 = 0
        th_fp_050 = 0
        th_fn_050 = 0
        th_valid_count = 0

        for s in samples:
            gt_list = all_gt_dicts[s]
            img_hyps = [h for h in all_processed_hyps if h.image_id == s]
            # accept if score >= th
            passed_hyps = [h for h in img_hyps if h.room_validity_score >= th]
            th_valid_count += len(passed_hyps)
            passed_rooms = [
                ValidatedRoom(
                    room_id=f"sw_{i}",
                    hypothesis_id=h.hypothesis_id,
                    image_id=s,
                    polygon=h.polygon,
                    confidence=h.confidence,
                    room_validity_score=h.room_validity_score,
                    architectural_score=h.architectural_score,
                    boundary_quality=h.boundary_quality,
                    decision="VALID",
                )
                for i, h in enumerate(passed_hyps)
            ]
            ev = metrics_evaluator.evaluate_detection(passed_rooms, gt_list)
            th_tp_050 += ev["tp_050"]
            th_fp_050 += ev["fp_050"]
            th_fn_050 += ev["fn_050"]

        t_prec = th_tp_050 / (th_tp_050 + th_fp_050) if (th_tp_050 + th_fp_050) > 0 else 0.0
        t_rec = th_tp_050 / (th_tp_050 + th_fn_050) if (th_tp_050 + th_fn_050) > 0 else 0.0
        t_f1 = (2.0 * t_prec * t_rec) / (t_prec + t_rec) if (t_prec + t_rec) > 0 else 0.0

        rec_entry = {
            "threshold": th,
            "valid_rooms_count": th_valid_count,
            "tp_050": th_tp_050,
            "fp_050": th_fp_050,
            "fn_050": th_fn_050,
            "precision_050": round(float(t_prec), 4),
            "recall_050": round(float(t_rec), 4),
            "f1_050": round(float(t_f1), 4),
        }
        threshold_sweep_records.append(rec_entry)
        pr_records.append({"threshold": th, "precision": round(float(t_prec), 4), "recall": round(float(t_rec), 4)})
        if th in [0.20, 0.35, 0.45, 0.60, 0.75]:
            print(f"  Th={th:.2f} -> Valid: {th_valid_count:3d} | TP: {th_tp_050:2d} | FP: {th_fp_050:3d} | Prec: {t_prec:.4f} | Rec: {t_rec:.4f} | F1: {t_f1:.4f}")

    # Step 7: 12 Ablation Configurations (A-L)
    print("\n--- 6. Running 12 Ablation Configurations (A-L) ---")
    ablation_definitions = {
        "A_full_pipeline": {"w_wall": 0.35, "w_ext": 0.35, "w_furn": 0.20, "w_text": 0.15, "w_cav": 0.30, "refine": True, "corridor": True, "high_th": 0.45},
        "B_no_exterior_suppression": {"w_wall": 0.35, "w_ext": 0.00, "w_furn": 0.20, "w_text": 0.15, "w_cav": 0.30, "refine": True, "corridor": True, "high_th": 0.45},
        "C_no_furniture_suppression": {"w_wall": 0.35, "w_ext": 0.35, "w_furn": 0.00, "w_text": 0.15, "w_cav": 0.30, "refine": True, "corridor": True, "high_th": 0.45},
        "D_no_text_suppression": {"w_wall": 0.35, "w_ext": 0.35, "w_furn": 0.20, "w_text": 0.00, "w_cav": 0.30, "refine": True, "corridor": True, "high_th": 0.45},
        "E_no_artificial_cavity_penalty": {"w_wall": 0.35, "w_ext": 0.35, "w_furn": 0.20, "w_text": 0.15, "w_cav": 0.00, "refine": True, "corridor": True, "high_th": 0.45},
        "F_no_boundary_refinement": {"w_wall": 0.35, "w_ext": 0.35, "w_furn": 0.20, "w_text": 0.15, "w_cav": 0.30, "refine": False, "corridor": True, "high_th": 0.45},
        "G_no_corridor_safeguard": {"w_wall": 0.35, "w_ext": 0.35, "w_furn": 0.20, "w_text": 0.15, "w_cav": 0.30, "refine": True, "corridor": False, "high_th": 0.45},
        "H_high_precision_policy": {"w_wall": 0.35, "w_ext": 0.35, "w_furn": 0.20, "w_text": 0.15, "w_cav": 0.30, "refine": True, "corridor": True, "high_th": 0.60},
        "I_high_recall_policy": {"w_wall": 0.35, "w_ext": 0.35, "w_furn": 0.20, "w_text": 0.15, "w_cav": 0.30, "refine": True, "corridor": True, "high_th": 0.30},
        "J_wall_support_only": {"w_wall": 1.00, "w_ext": 0.00, "w_furn": 0.00, "w_text": 0.00, "w_cav": 0.00, "refine": False, "corridor": False, "high_th": 0.45},
        "K_negative_penalties_only": {"w_wall": 0.00, "w_ext": 0.40, "w_furn": 0.30, "w_text": 0.30, "w_cav": 0.40, "refine": False, "corridor": False, "high_th": 0.45},
        "L_ml_assisted_fusion": {"w_wall": 0.30, "w_ext": 0.35, "w_furn": 0.20, "w_text": 0.15, "w_cav": 0.30, "refine": True, "corridor": True, "high_th": 0.45, "use_ml": True},
    }

    ablation_results = {}
    for name, cfg in ablation_definitions.items():
        abl_tp = 0
        abl_fp = 0
        abl_fn = 0
        abl_valid_count = 0

        abl_scorer = ValidityScorer(
            w_wall=cfg.get("w_wall", 0.35),
            w_exterior=cfg.get("w_ext", 0.35),
            w_furniture=cfg.get("w_furn", 0.20),
            w_text=cfg.get("w_text", 0.15),
            w_artificial_cavity=cfg.get("w_cav", 0.30),
        )
        abl_policy = RoomValidityDecisionPolicy(high_threshold=cfg.get("high_th", 0.45))
        abl_pipeline = RoomValidationPipeline(
            scorer=abl_scorer,
            decision_policy=abl_policy,
            refine_boundaries=cfg.get("refine", True),
            use_ml=cfg.get("use_ml", False),
        )

        for s in samples:
            bundle, _ = precomputed_bundles[s]
            h_img, w_img = bundle["wall_mask"].shape[:2]
            hyps = copy.deepcopy(input_hyps_by_image[s])
            if not cfg.get("corridor", True):
                for h in hyps:
                    h.is_corridor = False

            v_res = abl_pipeline.process_hypotheses(
                hypotheses=hyps,
                img_w=w_img,
                img_h=h_img,
                wall_network=bundle.get("wall_network"),
                wall_mask=bundle.get("wall_mask"),
                footprint_mask=bundle.get("footprint_mask"),
                doors=bundle.get("doors", []),
                text_regions=bundle.get("text_regions", []),
            )
            abl_valid_count += len(v_res.valid_rooms)
            ev = metrics_evaluator.evaluate_detection(v_res.valid_rooms, all_gt_dicts[s])
            abl_tp += ev["tp_050"]
            abl_fp += ev["fp_050"]
            abl_fn += ev["fn_050"]

        a_prec = abl_tp / (abl_tp + abl_fp) if (abl_tp + abl_fp) > 0 else 0.0
        a_rec = abl_tp / (abl_tp + abl_fn) if (abl_tp + abl_fn) > 0 else 0.0
        a_f1 = (2.0 * a_prec * a_rec) / (a_prec + a_rec) if (a_prec + a_rec) > 0 else 0.0

        ablation_results[name] = {
            "valid_rooms": abl_valid_count,
            "tp_050": abl_tp,
            "fp_050": abl_fp,
            "fn_050": abl_fn,
            "precision_050": round(float(a_prec), 4),
            "recall_050": round(float(a_rec), 4),
            "f1_050": round(float(a_f1), 4),
        }
        print(f"  {name:32s} | Valid: {abl_valid_count:3d} | TP: {abl_tp:2d} | FP: {abl_fp:3d} | Prec: {a_prec:.4f} | Rec: {a_rec:.4f} | F1: {a_f1:.4f}")

    # Step 8: ML ON vs ML OFF Comparison
    print("\n--- 7. ML ON vs ML OFF Diagnostic Comparison ---")
    ml_comp = {
        "ml_off": ablation_results["A_full_pipeline"],
        "ml_on": ablation_results["L_ml_assisted_fusion"],
        "delta": {
            "tp_delta": ablation_results["L_ml_assisted_fusion"]["tp_050"] - ablation_results["A_full_pipeline"]["tp_050"],
            "fp_delta": ablation_results["L_ml_assisted_fusion"]["fp_050"] - ablation_results["A_full_pipeline"]["fp_050"],
            "precision_delta": round(ablation_results["L_ml_assisted_fusion"]["precision_050"] - ablation_results["A_full_pipeline"]["precision_050"], 4),
            "f1_delta": round(ablation_results["L_ml_assisted_fusion"]["f1_050"] - ablation_results["A_full_pipeline"]["f1_050"], 4),
        },
    }

    # Step 9: 148 Ground Truth Rooms Failure Trace
    print("\n--- 8. Tracing Failure Taxonomy for all 148 Ground Truth Rooms ---")
    gt_trace_records = []
    trace_counts = {
        "UNREPRESENTED_BY_PROPOSALS": 0,
        "LOST_IN_PHASE_2_10_7_FORMATION": 0,
        "SUPPRESSED_BY_VALIDITY_POLICY": 0,
        "TRUE_POSITIVE": 0,
    }

    # Map Phase 2.10.7 fate
    with open(ROOT_DIR / "evaluation" / "phase2107" / "final_room_trace.json", "r") as f:
        p2107_trace = json.load(f)
    p2107_trace_map = {(rec["image_id"], rec["gt_id"]): rec for rec in p2107_trace}

    for s in samples:
        gt_list = all_gt_polygons[s]
        v_res = validation_results_by_image[s]
        valid_rooms = v_res.valid_rooms
        input_hyps = input_hyps_by_image[s]

        for gt_id, gt_poly in gt_list:
            p2107_rec = p2107_trace_map.get((s, gt_id), {})
            p2107_fate = p2107_rec.get("fate", "")

            # Check IoU in Phase 2.10.7 input
            best_input_iou = max([compute_polygon_iou(gt_poly, h.polygon) for h in input_hyps], default=0.0)

            # Check IoU in Phase 2.10.8 valid output
            best_valid_iou = max([compute_polygon_iou(gt_poly, r.polygon) for r in valid_rooms], default=0.0)

            if best_valid_iou >= 0.50:
                fate = "TRUE_POSITIVE"
                reason = f"Preserved as valid architectural room (IoU={best_valid_iou:.3f})"
            elif best_input_iou >= 0.50 and best_valid_iou < 0.50:
                fate = "SUPPRESSED_BY_VALIDITY_POLICY"
                reason = f"Candidate existed in input (IoU={best_input_iou:.3f}) but was suppressed by validity threshold or false positive penalty"
            elif p2107_fate == "UNREPRESENTED_BY_PROPOSALS":
                fate = "UNREPRESENTED_BY_PROPOSALS"
                reason = "No candidate in Phase 2.10.6 proposal pool (IoU < 0.25)"
            else:
                fate = "LOST_IN_PHASE_2_10_7_FORMATION"
                reason = f"Lost during Phase 2.10.7 graph formation/layout selection ({p2107_fate})"

            trace_counts[fate] += 1
            gt_trace_records.append({
                "image_id": s,
                "gt_id": gt_id,
                "gt_area_px": round(float(gt_poly.area), 1),
                "best_input_iou": round(float(best_input_iou), 4),
                "best_valid_iou": round(float(best_valid_iou), 4),
                "fate": fate,
                "reason": reason,
            })

    print("  148 GT Room Breakdown:")
    for fate, count in trace_counts.items():
        print(f"    - {fate:32s}: {count:3d} ({count / 148 * 100:.1f}%)")

    # Step 10: Performance & Latency Profile
    print("\n--- 9. Measuring Latency and Performance Profile ---")
    p50_lat = float(np.percentile(timings_per_image, 50))
    p95_lat = float(np.percentile(timings_per_image, 95))
    mean_lat = float(np.mean(timings_per_image))
    print(f"Latency per floorplan: Mean={mean_lat:.2f}ms | P50={p50_lat:.2f}ms | P95={p95_lat:.2f}ms")

    perf_record = {
        "total_floorplans": len(samples),
        "total_input_hypotheses": total_input_rooms,
        "mean_latency_ms": round(mean_lat, 2),
        "p50_latency_ms": round(p50_lat, 2),
        "p95_latency_ms": round(p95_lat, 2),
        "hypotheses_per_second": round(total_input_rooms / (sum(timings_per_image) / 1000.0), 1),
    }

    # Step 11: Export All 14 Required JSON Artifacts
    print("\n--- 10. Writing All 14 JSON Artifacts to evaluation/phase2108/ ---")
    # 1. summary.json
    summary_data = {
        "phase": "2.10.8",
        "description": "Room Validity & False Positive Suppression",
        "authoritative_gt_count": 148,
        "available_gt_count": available_gt_count,
        "total_input_hypotheses": total_input_rooms,
        "total_valid_rooms": len(all_valid_rooms),
        "tp_050": primary_tp_050,
        "fp_050": primary_fp_050,
        "fn_050": primary_fn_050,
        "precision_050": round(p_prec_050, 4),
        "recall_050": round(p_rec_050, 4),
        "available_recall_050": round(avail_rec_050, 4),
        "f1_050": round(p_f1_050, 4),
        "tp_025": primary_tp_025,
        "fp_025": primary_fp_025,
        "fn_025": primary_fn_025,
        "precision_025": round(p_prec_025, 4),
        "recall_025": round(p_rec_025, 4),
        "f1_025": round(p_f1_025, 4),
        "merge_errors": primary_merge_errors,
        "split_errors": primary_split_errors,
        "fp_reduction_ratio": round((baseline_fp_050 - primary_fp_050) / baseline_fp_050, 4),
    }
    with open(OUT_DIR / "summary.json", "w", encoding="utf-8") as f:
        json.dump(summary_data, f, indent=2)

    # 2. room_validity_scores.json
    scores_data = [
        {
            "image_id": h.image_id,
            "hypothesis_id": h.hypothesis_id,
            "area_px": h.area_px,
            "room_validity_score": round(float(h.room_validity_score), 4),
            "positive_score": round(float(h.positive_score), 4),
            "negative_score": round(float(h.negative_score), 4),
            "ambiguity_score": round(float(h.ambiguity_score), 4),
            "decision": h.decision.value,
        }
        for h in all_processed_hyps
    ]
    with open(OUT_DIR / "room_validity_scores.json", "w", encoding="utf-8") as f:
        json.dump(scores_data, f, indent=2)

    # 3. positive_evidence.json
    pos_data = [
        {
            "image_id": h.image_id,
            "hypothesis_id": h.hypothesis_id,
            "wall_boundary_support": round(float(h.wall_boundary_support), 4),
            "wall_junction_support": round(float(h.wall_junction_support), 4),
            "wall_continuity": round(float(h.wall_continuity), 4),
            "enclosure_score": round(float(h.enclosure_score), 4),
            "doorway_evidence": round(float(h.doorway_evidence), 4),
            "doorway_count": h.doorway_count,
            "partition_evidence": round(float(h.partition_evidence), 4),
            "topology_consistency": round(float(h.topology_consistency), 4),
            "room_regularity": round(float(h.room_regularity), 4),
            "unsupported_boundary_ratio": round(float(h.unsupported_boundary_ratio), 4),
        }
        for h in all_processed_hyps
    ]
    with open(OUT_DIR / "positive_evidence.json", "w", encoding="utf-8") as f:
        json.dump(pos_data, f, indent=2)

    # 4. negative_evidence.json
    neg_data = [
        {
            "image_id": h.image_id,
            "hypothesis_id": h.hypothesis_id,
            "exterior_likelihood": round(float(h.exterior_likelihood), 4),
            "background_likelihood": round(float(h.background_likelihood), 4),
            "furniture_likelihood": round(float(h.furniture_likelihood), 4),
            "text_likelihood": round(float(h.text_likelihood), 4),
            "hatch_dimension_likelihood": round(float(h.hatch_dimension_likelihood), 4),
            "sliver_likelihood": round(float(h.sliver_likelihood), 4),
            "artificial_cavity_likelihood": round(float(h.artificial_cavity_likelihood), 4),
        }
        for h in all_processed_hyps
    ]
    with open(OUT_DIR / "negative_evidence.json", "w", encoding="utf-8") as f:
        json.dump(neg_data, f, indent=2)

    # 5. classification_results.json
    cls_data = {
        "total": len(all_processed_hyps),
        "valid": sum(1 for h in all_processed_hyps if h.decision == RoomValidityDecision.VALID),
        "probable_room": sum(1 for h in all_processed_hyps if h.decision == RoomValidityDecision.PROBABLE_ROOM),
        "ambiguous": sum(1 for h in all_processed_hyps if h.decision == RoomValidityDecision.AMBIGUOUS),
        "probable_non_room": sum(1 for h in all_processed_hyps if h.decision == RoomValidityDecision.PROBABLE_NON_ROOM),
        "non_room": sum(1 for h in all_processed_hyps if h.decision == RoomValidityDecision.NON_ROOM),
    }
    with open(OUT_DIR / "classification_results.json", "w", encoding="utf-8") as f:
        json.dump(cls_data, f, indent=2)

    # 6. tp_audit.json
    with open(OUT_DIR / "tp_audit.json", "w", encoding="utf-8") as f:
        json.dump(tp_audit_records, f, indent=2)

    # 7. fp_audit.json
    with open(OUT_DIR / "fp_audit.json", "w", encoding="utf-8") as f:
        json.dump(fp_audit_records, f, indent=2)

    # 8. feature_distributions.json
    with open(OUT_DIR / "feature_distributions.json", "w", encoding="utf-8") as f:
        json.dump(feature_dist_summary, f, indent=2)

    # 9. threshold_sweep.json
    with open(OUT_DIR / "threshold_sweep.json", "w", encoding="utf-8") as f:
        json.dump(threshold_sweep_records, f, indent=2)

    # 10. precision_recall.json
    with open(OUT_DIR / "precision_recall.json", "w", encoding="utf-8") as f:
        json.dump(pr_records, f, indent=2)

    # 11. ablation_results.json
    with open(OUT_DIR / "ablation_results.json", "w", encoding="utf-8") as f:
        json.dump(ablation_results, f, indent=2)

    # 12. ml_comparison.json
    with open(OUT_DIR / "ml_comparison.json", "w", encoding="utf-8") as f:
        json.dump(ml_comp, f, indent=2)

    # 13. room_trace.json
    with open(OUT_DIR / "room_trace.json", "w", encoding="utf-8") as f:
        json.dump(gt_trace_records, f, indent=2)

    # 14. performance.json
    with open(OUT_DIR / "performance.json", "w", encoding="utf-8") as f:
        json.dump(perf_record, f, indent=2)

    # Step 12: Render Diagnostic Visualizations (10 layers per image)
    print("\n--- 11. Rendering Diagnostic Visualizations (10 layers x 12 images) ---")
    for sample_id in samples:
        v_res = validation_results_by_image[sample_id]
        img_hyps = [h for h in all_processed_hyps if h.image_id == sample_id]
        gt_polys = [gt["polygon"] for gt in all_gt_dicts[sample_id]]
        
        # Load base image
        img_path = adapter.get_image_path(sample_id)
        base_img = cv2.imread(str(img_path)) if img_path.exists() else None

        visualizer.render_all_10_diagnostics(
            image_name=sample_id,
            base_image=base_img,
            hypotheses=img_hyps,
            valid_rooms=v_res.valid_rooms,
            ambiguous_hyps=v_res.ambiguous_rooms,
            rejected_hyps=v_res.rejected_rooms,
            gt_polygons=gt_polys,
        )
    print(f"Visualizations saved to {VIS_DIR}")

    print("\n" + "=" * 80)
    print("PHASE 2.10.8 EXPERIMENT COMPLETED SUCCESSFULLY!")
    print("=" * 80)


if __name__ == "__main__":
    run_phase2108_experiment()
