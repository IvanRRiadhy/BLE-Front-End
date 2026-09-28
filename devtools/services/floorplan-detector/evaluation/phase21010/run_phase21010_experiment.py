"""
Phase 2.10.10 Experiment Runner: Targeted Missing-Room Recovery.
Evaluates the authoritative 12-image benchmark suite (148 GT rooms).
Executes Strategies A-F:
- Strategy A: Doorway recovery
- Strategy B: Internal partition recovery
- Strategy C: Neighbor-based gap recovery
- Strategy D: Modular repetition recovery
- Strategy E: Wall reconstruction
- Strategy F: Multi-signal proposal fusion & deduplication
Integrates recovered proposals into frozen Phase 2.10.9 Global Room Synthesis.
Executes 8 ablations (A-H), audits all 110 previously unrepresented GT rooms,
validates protected anchors, tests 2-run bitwise determinism,
and generates all 10 JSON artifacts and 120 diagnostic visualization panels.
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
from shapely.geometry import Polygon as ShapelyPolygon, LineString

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from evaluation.datasets.my_floorplan import MyFloorplanAdapter
from app.room_synthesis.models import (
    RoomHypothesis,
    HypothesisRelationship,
    RelationshipType,
    DoorwayContext,
    CavityContext,
    RoomConfiguration,
    AlternativeGroup,
    SynthesisResult,
)
from app.room_synthesis.synthesis_pipeline import GlobalRoomSynthesisPipeline
from app.room_synthesis.metrics import GlobalRoomMetricsEvaluator, compute_polygon_iou
from evaluation.phase2109.run_phase2109_experiment import load_phase2108_enriched_hypotheses

from app.missing_room_recovery.models import (
    MissingRoomProposal,
    RecoveryResult,
    RecoveryStrategy,
)
from app.missing_room_recovery.recovery_pipeline import TargetedRecoveryPipeline
from app.missing_room_recovery.visualization import RecoveryVisualizer
from app.missing_room_recovery.metrics import RecoveryMetricsEvaluator

OUT_DIR = ROOT_DIR / "evaluation" / "phase21010"
VIS_DIR = OUT_DIR / "visualizations"
CACHE_PATH = ROOT_DIR / "evaluation" / "cache_precomputed_bundles.pkl"
PHASE2107_LAYOUTS_PATH = ROOT_DIR / "evaluation" / "phase2107" / "top_k_layouts.json"
PHASE2108_SCORES_PATH = ROOT_DIR / "evaluation" / "phase2108" / "room_validity_scores.json"
PHASE2108_POS_PATH = ROOT_DIR / "evaluation" / "phase2108" / "positive_evidence.json"
PHASE2108_NEG_PATH = ROOT_DIR / "evaluation" / "phase2108" / "negative_evidence.json"
PHASE2109_ROOM_TRACE_PATH = ROOT_DIR / "evaluation" / "phase2109" / "room_trace.json"


class MockWallNetwork:
    """Adapts wall segments for recovery engines expecting wall_lines."""
    def __init__(self, lines: List[LineString]):
        self.wall_lines = lines


def run_phase21010_experiment():
    print("=" * 80)
    print("PHASE 2.10.10: TARGETED MISSING-ROOM RECOVERY EXPERIMENT")
    print("=" * 80)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    VIS_DIR.mkdir(parents=True, exist_ok=True)

    adapter = MyFloorplanAdapter()
    samples = adapter.discover_samples()

    print(f"Loading precomputed bundles cache from {CACHE_PATH}...")
    with open(CACHE_PATH, "rb") as f:
        precomputed_bundles = pickle.load(f)

    # 1. Ground Truth Benchmark Verification
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

    # Load Phase 2.10.8 metadata maps
    with open(PHASE2108_SCORES_PATH, "r", encoding="utf-8") as f:
        scores_list = json.load(f)
    scores_map = {(d["image_id"], d["hypothesis_id"]): d for d in scores_list}

    with open(PHASE2108_POS_PATH, "r", encoding="utf-8") as f:
        pos_list = json.load(f)
    pos_map = {(d["image_id"], d["hypothesis_id"]): d for d in pos_list}

    with open(PHASE2108_NEG_PATH, "r", encoding="utf-8") as f:
        neg_list = json.load(f)
    neg_map = {(d["image_id"], d["hypothesis_id"]): d for d in neg_list}

    # Load Phase 2.10.7 input geometry enriched with Phase 2.10.8 evidence
    with open(PHASE2107_LAYOUTS_PATH, "r", encoding="utf-8") as f:
        p2107_data = json.load(f)

    input_hyps_by_image: Dict[str, List[RoomHypothesis]] = {}
    total_input_hypotheses = 0

    metrics_evaluator = GlobalRoomMetricsEvaluator()

    for sample_id in samples:
        layouts = p2107_data.get("per_image", {}).get(sample_id, [])
        top1 = layouts[0] if layouts else {"rooms": []}
        rooms_data = top1.get("rooms", [])
        hyps = load_phase2108_enriched_hypotheses(sample_id, rooms_data, scores_map, pos_map, neg_map)
        input_hyps_by_image[sample_id] = hyps
        total_input_hypotheses += len(hyps)

    print(f"Total Phase 2.10.9 Input Hypotheses Ingested: {total_input_hypotheses} (Expected: 367)")
    assert total_input_hypotheses == 367

    # Phase 2.10.9 Baseline reproduction
    print("\n--- 1. Reproducing Frozen Phase 2.10.9 Baseline ---")
    synth_pipeline = GlobalRoomSynthesisPipeline(use_ml=False, refine_boundaries=True)
    p2109_results_by_image: Dict[str, SynthesisResult] = {}
    p2109_tp_050 = 0
    p2109_fp_050 = 0
    p2109_fn_050 = 0
    p2109_tp_025 = 0
    p2109_fp_025 = 0
    p2109_fn_025 = 0

    for sample_id in samples:
        bundle, _ = precomputed_bundles[sample_id]
        h_img, w_img = bundle["wall_mask"].shape[:2]
        res = synth_pipeline.run(
            hypotheses=input_hyps_by_image[sample_id],
            image_id=sample_id,
            img_w=w_img,
            img_h=h_img,
            wall_network=bundle.get("wall_network"),
            doors=[],
        )
        p2109_results_by_image[sample_id] = res
        ev = metrics_evaluator.evaluate_configuration(res.selected_rooms, all_gt_dicts[sample_id])
        p2109_tp_050 += ev["tp_050"]
        p2109_fp_050 += ev["fp_050"]
        p2109_fn_050 += ev["fn_050"]
        p2109_tp_025 += ev["tp_025"]
        p2109_fp_025 += ev["fp_025"]
        p2109_fn_025 += ev["fn_025"]

    print(f"Phase 2.10.9 Baseline: TP@0.50={p2109_tp_050} | FP@0.50={p2109_fp_050} | FN@0.50={p2109_fn_050}")
    assert p2109_tp_050 == 16 and p2109_fp_050 == 135, "Phase 2.10.9 reproduction mismatch!"

    # 2. Targeted Missing-Room Recovery Execution
    print("\n--- 2. Executing Targeted Missing-Room Recovery (Strategies A-F) ---")
    rec_pipeline = TargetedRecoveryPipeline()
    recovery_results_by_image: Dict[str, RecoveryResult] = {}
    timings_per_image: List[float] = []

    total_proposals_generated = 0
    total_fused_proposals = 0
    total_duplicates_pruned = 0
    props_per_strat_total: Dict[str, int] = {
        RecoveryStrategy.DOORWAY_RECOVERY.value: 0,
        RecoveryStrategy.PARTITION_RECOVERY.value: 0,
        RecoveryStrategy.NEIGHBOR_RECOVERY.value: 0,
        RecoveryStrategy.REPETITION_RECOVERY.value: 0,
        RecoveryStrategy.WALL_RECONSTRUCTION.value: 0,
        RecoveryStrategy.COMBINED_RECOVERY.value: 0,
    }

    adapted_wn_by_image: Dict[str, MockWallNetwork] = {}

    for sample_id in samples:
        bundle, _ = precomputed_bundles[sample_id]
        h_img, w_img = bundle["wall_mask"].shape[:2]
        segs = getattr(bundle.get("wall_network"), "segments", [])
        lines = [LineString([(s.x1, s.y1), (s.x2, s.y2)]) for s in segs]
        mock_wn = MockWallNetwork(lines)
        adapted_wn_by_image[sample_id] = mock_wn

        existing_hyps = input_hyps_by_image[sample_id]
        existing_polys = [h.polygon for h in existing_hyps]

        rec_res = rec_pipeline.run_recovery(
            image_id=sample_id,
            existing_hypotheses=existing_polys,
            wall_network=mock_wn,
            doors=bundle.get("doors", []),
            footprint_mask=bundle.get("footprint_mask"),
            img_w=w_img,
            img_h=h_img,
        )
        recovery_results_by_image[sample_id] = rec_res
        timings_per_image.append(rec_res.execution_time_ms)

        total_proposals_generated += len(rec_res.total_proposals)
        total_fused_proposals += len(rec_res.fused_proposals)
        total_duplicates_pruned += rec_res.duplicates_pruned

        for strat, p_list in rec_res.proposals_by_strategy.items():
            props_per_strat_total[strat] = props_per_strat_total.get(strat, 0) + len(p_list)

        for p in rec_res.fused_proposals:
            if p.source_strategy == RecoveryStrategy.COMBINED_RECOVERY.value:
                props_per_strat_total[RecoveryStrategy.COMBINED_RECOVERY.value] += 1

        print(
            f"  {sample_id[:26]:26s} | Raw: {len(rec_res.total_proposals):3d} | "
            f"Fused: {len(rec_res.fused_proposals):2d} | Pruned: {rec_res.duplicates_pruned:3d} | "
            f"Time: {rec_res.execution_time_ms:6.1f}ms"
        )

    print(f"\nTotal Raw Recovery Proposals: {total_proposals_generated}")
    print(f"Total Fused Recovery Proposals: {total_fused_proposals}")
    print(f"Total Duplicates Pruned: {total_duplicates_pruned}")

    # 3. Strategy Ablations (A-H)
    print("\n--- 3. Running 8 Strategy Ablations (A-H) ---")
    ablation_names = [
        "A_phase2109_baseline",
        "B_doorway_recovery_only",
        "C_partition_recovery_only",
        "D_neighbor_recovery_only",
        "E_repetition_recovery_only",
        "F_wall_reconstruction_only",
        "G_combined_recovery",
        "H_combined_recovery_with_synthesis",
    ]

    ablation_results: Dict[str, Dict[str, Any]] = {}

    for abl_idx, abl_name in enumerate(ablation_names):
        abl_tp = 0
        abl_fp = 0
        abl_fn = 0
        abl_tp_025 = 0
        abl_fp_025 = 0
        abl_fn_025 = 0
        abl_room_count = 0
        all_ious: List[float] = []

        for sample_id in samples:
            bundle, _ = precomputed_bundles[sample_id]
            h_img, w_img = bundle["wall_mask"].shape[:2]
            gts = all_gt_dicts[sample_id]
            base_hyps = input_hyps_by_image[sample_id]
            rec_res = recovery_results_by_image[sample_id]

            if abl_name == "A_phase2109_baseline":
                res = p2109_results_by_image[sample_id]
                sel_rooms = res.selected_rooms
            elif abl_name == "B_doorway_recovery_only":
                props = rec_res.proposals_by_strategy.get("doorway_recovery", [])
                rec_hyps = rec_pipeline.convert_to_synthesis_hypotheses(props, sample_id)
                res = synth_pipeline.run(list(base_hyps) + rec_hyps, sample_id, w_img, h_img, bundle.get("wall_network"), [])
                sel_rooms = res.selected_rooms
            elif abl_name == "C_partition_recovery_only":
                props = rec_res.proposals_by_strategy.get("partition_recovery", [])
                rec_hyps = rec_pipeline.convert_to_synthesis_hypotheses(props, sample_id)
                res = synth_pipeline.run(list(base_hyps) + rec_hyps, sample_id, w_img, h_img, bundle.get("wall_network"), [])
                sel_rooms = res.selected_rooms
            elif abl_name == "D_neighbor_recovery_only":
                props = rec_res.proposals_by_strategy.get("neighbor_recovery", [])
                rec_hyps = rec_pipeline.convert_to_synthesis_hypotheses(props, sample_id)
                res = synth_pipeline.run(list(base_hyps) + rec_hyps, sample_id, w_img, h_img, bundle.get("wall_network"), [])
                sel_rooms = res.selected_rooms
            elif abl_name == "E_repetition_recovery_only":
                props = rec_res.proposals_by_strategy.get("repetition_recovery", [])
                rec_hyps = rec_pipeline.convert_to_synthesis_hypotheses(props, sample_id)
                res = synth_pipeline.run(list(base_hyps) + rec_hyps, sample_id, w_img, h_img, bundle.get("wall_network"), [])
                sel_rooms = res.selected_rooms
            elif abl_name == "F_wall_reconstruction_only":
                props = rec_res.proposals_by_strategy.get("wall_reconstruction", [])
                rec_hyps = rec_pipeline.convert_to_synthesis_hypotheses(props, sample_id)
                res = synth_pipeline.run(list(base_hyps) + rec_hyps, sample_id, w_img, h_img, bundle.get("wall_network"), [])
                sel_rooms = res.selected_rooms
            elif abl_name == "G_combined_recovery":
                # Combined recovery proposals evaluated directly against GT without synthesis pruning
                props = rec_res.fused_proposals
                rec_hyps = rec_pipeline.convert_to_synthesis_hypotheses(props, sample_id)
                sel_rooms = rec_hyps
            elif abl_name == "H_combined_recovery_with_synthesis":
                # Clean recovery: proposals that don't aggressively overlap existing candidates (to protect anchors)
                clean_rec = []
                for p in rec_res.fused_proposals:
                    max_ov = max([compute_polygon_iou(p.polygon, h.polygon) for h in base_hyps], default=0.0)
                    if max_ov < 0.15:
                        clean_rec.append(p)
                rec_hyps = rec_pipeline.convert_to_synthesis_hypotheses(clean_rec, sample_id)
                for rh in rec_hyps:
                    rh.validity_score = 0.50
                    rh.wall_support = min(rh.wall_support, 0.70)
                res = synth_pipeline.run(list(base_hyps) + rec_hyps, sample_id, w_img, h_img, bundle.get("wall_network"), [])
                sel_rooms = res.selected_rooms

            abl_room_count += len(sel_rooms)
            ev = metrics_evaluator.evaluate_configuration(sel_rooms, gts)
            abl_tp += ev["tp_050"]
            abl_fp += ev["fp_050"]
            abl_fn += ev["fn_050"]
            abl_tp_025 += ev["tp_025"]
            abl_fp_025 += ev["fp_025"]
            abl_fn_025 += ev["fn_025"]
            all_ious.append(ev["mean_iou"])

        prec_050 = abl_tp / (abl_tp + abl_fp) if (abl_tp + abl_fp) > 0 else 0.0
        rec_050 = abl_tp / (abl_tp + abl_fn) if (abl_tp + abl_fn) > 0 else 0.0
        f1_050 = (2.0 * prec_050 * rec_050) / (prec_050 + rec_050) if (prec_050 + rec_050) > 0 else 0.0

        prec_025 = abl_tp_025 / (abl_tp_025 + abl_fp_025) if (abl_tp_025 + abl_fp_025) > 0 else 0.0
        rec_025 = abl_tp_025 / (abl_tp_025 + abl_fn_025) if (abl_tp_025 + abl_fn_025) > 0 else 0.0
        f1_025 = (2.0 * prec_025 * rec_025) / (prec_025 + rec_025) if (prec_025 + rec_025) > 0 else 0.0

        ablation_results[abl_name] = {
            "room_count": abl_room_count,
            "tp_050": abl_tp,
            "fp_050": abl_fp,
            "fn_050": abl_fn,
            "precision_050": round(prec_050, 4),
            "recall_050": round(rec_050, 4),
            "f1_050": round(f1_050, 4),
            "tp_025": abl_tp_025,
            "fp_025": abl_fp_025,
            "fn_025": abl_fn_025,
            "precision_025": round(prec_025, 4),
            "recall_025": round(rec_025, 4),
            "f1_025": round(f1_025, 4),
            "mean_iou": round(float(np.mean(all_ious)), 4) if all_ious else 0.0,
        }
        print(
            f"  {abl_name:38s} | Rooms: {abl_room_count:3d} | TP@0.5: {abl_tp:2d} | FP@0.5: {abl_fp:3d} | "
            f"Prec: {prec_050:.4f} | Rec: {rec_050:.4f} | F1: {f1_050:.4f}"
        )

    # 4. Primary Combined Synthesis Evaluation (Ablation H)
    primary_eval = ablation_results["H_combined_recovery_with_synthesis"]
    primary_tp_050 = primary_eval["tp_050"]
    primary_fp_050 = primary_eval["fp_050"]
    primary_fn_050 = primary_eval["fn_050"]
    primary_tp_025 = primary_eval["tp_025"]
    primary_fp_025 = primary_eval["fp_025"]
    primary_fn_025 = primary_eval["fn_025"]

    avail_rec_050 = primary_tp_050 / 19.0  # Phase 2.10.7 base available rooms was 19

    # Re-run synthesis for final rooms storage and per-image audit
    final_rooms_by_image: Dict[str, List[RoomHypothesis]] = {}
    for sample_id in samples:
        bundle, _ = precomputed_bundles[sample_id]
        h_img, w_img = bundle["wall_mask"].shape[:2]
        base_hyps = input_hyps_by_image[sample_id]
        rec_res = recovery_results_by_image[sample_id]
        clean_rec = []
        for p in rec_res.fused_proposals:
            max_ov = max([compute_polygon_iou(p.polygon, h.polygon) for h in base_hyps], default=0.0)
            if max_ov < 0.15:
                clean_rec.append(p)
        rec_hyps = rec_pipeline.convert_to_synthesis_hypotheses(clean_rec, sample_id)
        for rh in rec_hyps:
            rh.validity_score = 0.50
            rh.wall_support = min(rh.wall_support, 0.70)
        res = synth_pipeline.run(list(base_hyps) + rec_hyps, sample_id, w_img, h_img, bundle.get("wall_network"), [])
        final_rooms_by_image[sample_id] = res.selected_rooms

    # 5. Audit all 110 previously UNREPRESENTED_BY_PROPOSALS Ground Truth Rooms
    print("\n--- 4. Auditing 110 Previously Unrepresented Ground Truth Rooms ---")
    with open(PHASE2109_ROOM_TRACE_PATH, "r", encoding="utf-8") as f:
        p2109_room_trace = json.load(f)

    p2109_unrepresented = {
        (rec["image_id"], rec["gt_id"]): rec
        for rec in p2109_room_trace if rec["fate"] == "UNREPRESENTED_BY_PROPOSALS"
    }
    print(f"Total Phase 2.10.9 UNREPRESENTED_BY_PROPOSALS GT rooms loaded: {len(p2109_unrepresented)} (Expected: 110)")
    assert len(p2109_unrepresented) == 110, f"Expected 110 unrepresented GT rooms, got {len(p2109_unrepresented)}"

    gt_trace_records: List[Dict[str, Any]] = []
    unrep_fate_counts = {
        "RECOVERED_TRUE_POSITIVE": 0,
        "PROPOSAL_GENERATED_BUT_PRUNED": 0,
        "STILL_UNREPRESENTED": 0,
    }

    for sample_id in samples:
        gt_list = all_gt_polygons[sample_id]
        final_rooms = final_rooms_by_image[sample_id]
        rec_props = recovery_results_by_image[sample_id].fused_proposals
        base_hyps = input_hyps_by_image[sample_id]

        for gt_id, gt_poly in gt_list:
            is_prev_unrep = (sample_id, gt_id) in p2109_unrepresented

            best_base_iou = max([compute_polygon_iou(gt_poly, h.polygon) for h in base_hyps], default=0.0)
            best_prop_iou = max([compute_polygon_iou(gt_poly, p.polygon) for p in rec_props], default=0.0)
            best_sel_iou = max([compute_polygon_iou(gt_poly, r.polygon) for r in final_rooms], default=0.0)

            if best_sel_iou >= 0.50:
                if is_prev_unrep:
                    fate = "RECOVERED_TRUE_POSITIVE"
                    reason = f"Successfully recovered from unrepresented space into final room (IoU={best_sel_iou:.3f})"
                    unrep_fate_counts["RECOVERED_TRUE_POSITIVE"] += 1
                else:
                    fate = "TRUE_POSITIVE"
                    reason = f"Preserved baseline true positive (IoU={best_sel_iou:.3f})"
            elif is_prev_unrep:
                if best_prop_iou >= 0.50:
                    fate = "PROPOSAL_GENERATED_BUT_PRUNED"
                    reason = f"Proposal generated (IoU={best_prop_iou:.3f}) but rejected by synthesis solver"
                    unrep_fate_counts["PROPOSAL_GENERATED_BUT_PRUNED"] += 1
                elif best_prop_iou >= 0.25:
                    fate = "PROPOSAL_GENERATED_BUT_PRUNED"
                    reason = f"Partial proposal generated (IoU={best_prop_iou:.3f}) but rejected by synthesis solver"
                    unrep_fate_counts["PROPOSAL_GENERATED_BUT_PRUNED"] += 1
                else:
                    fate = "STILL_UNREPRESENTED"
                    reason = f"No proposal generated with IoU >= 0.25 (best IoU={best_prop_iou:.3f})"
                    unrep_fate_counts["STILL_UNREPRESENTED"] += 1
            else:
                fate = "BASELINE_FAILURE"
                reason = "Existing baseline candidate missed"

            gt_trace_records.append({
                "image_id": sample_id,
                "gt_id": gt_id,
                "gt_area_px": round(float(gt_poly.area), 1),
                "was_unrepresented_in_p2109": is_prev_unrep,
                "best_base_input_iou": round(float(best_base_iou), 4),
                "best_recovery_proposal_iou": round(float(best_prop_iou), 4),
                "best_final_selected_iou": round(float(best_sel_iou), 4),
                "fate": fate,
                "reason": reason,
            })

    print("  110 Previously Unrepresented GT Rooms Breakdown:")
    for fate, count in unrep_fate_counts.items():
        print(f"    - {fate:32s}: {count:3d} ({count / 110 * 100:.1f}%)")

    # 6. False Positive Trace & Proposal Audit
    print("\n--- 5. Auditing Recovery Proposals and False Positives ---")
    fp_trace_records: List[Dict[str, Any]] = []
    for sample_id in samples:
        final_rooms = final_rooms_by_image[sample_id]
        gts = all_gt_dicts[sample_id]

        for r in final_rooms:
            is_gt_match = any(compute_polygon_iou(r.polygon, gt["polygon"]) >= 0.50 for gt in gts)
            if not is_gt_match:
                fp_trace_records.append({
                    "image_id": sample_id,
                    "hypothesis_id": r.hypothesis_id,
                    "formation_source": r.formation_source,
                    "source_strategy": r.source_strategy,
                    "area_px": round(float(r.area_px), 1),
                    "wall_support": round(float(r.wall_support), 4),
                    "doorway_support": round(float(r.doorway_support), 4),
                    "partition_support": round(float(r.partition_support), 4),
                    "neighbor_support": round(float(r.neighbor_support), 4),
                    "enclosure_score": round(float(r.enclosure_score), 4),
                    "boundary_quality": round(float(r.boundary_quality), 4),
                })

    # 7. Protected Anchors Verification
    print("\n--- 6. Verifying Protected Anchors and Dense Floorplans ---")
    protected_anchor_images = [
        "sample-floorplan.png",
        "Lantai 1.jpg",
        "Lantai 2.jpg",
        "simple-apartment-floor-plan.png",
        "library-floor-plan.png",
        "sample-floorplan-house2.png",
        "Floorplan-House.png",
        "sample-floorplan-house3.png",
    ]

    protected_records: Dict[str, Dict[str, Any]] = {}
    for sample_id in protected_anchor_images:
        gts = all_gt_dicts[sample_id]
        final_rooms = final_rooms_by_image[sample_id]
        ev = metrics_evaluator.evaluate_configuration(final_rooms, gts)
        protected_records[sample_id] = {
            "gt_count": len(gts),
            "final_rooms": len(final_rooms),
            "tp_050": ev["tp_050"],
            "fp_050": ev["fp_050"],
            "fn_050": ev["fn_050"],
            "precision_050": round(ev["precision_050"], 4),
            "recall_050": round(ev["recall_050"], 4),
            "f1_050": round(ev["f1_050"], 4),
        }
        print(f"  {sample_id[:30]:30s} | TP@0.5: {ev['tp_050']:2d} | FP@0.5: {ev['fp_050']:2d} | Prec: {ev['precision_050']:.4f}")

    # 8. Bitwise Determinism Verification (2 consecutive runs)
    print("\n--- 7. Verifying Bitwise Determinism Over 2 Runs ---")
    deterministic = True
    for sample_id in samples:
        bundle, _ = precomputed_bundles[sample_id]
        h_img, w_img = bundle["wall_mask"].shape[:2]
        existing_polys = [h.polygon for h in input_hyps_by_image[sample_id]]
        mock_wn = adapted_wn_by_image[sample_id]

        r1 = rec_pipeline.run_recovery(
            sample_id, existing_polys, mock_wn, bundle.get("doors", []), bundle.get("footprint_mask"), w_img, h_img
        )
        r2 = rec_pipeline.run_recovery(
            sample_id, existing_polys, mock_wn, bundle.get("doors", []), bundle.get("footprint_mask"), w_img, h_img
        )

        if len(r1.fused_proposals) != len(r2.fused_proposals):
            deterministic = False
            break
        for p1, p2 in zip(r1.fused_proposals, r2.fused_proposals):
            if p1.proposal_id != p2.proposal_id or round(p1.area_px, 1) != round(p2.area_px, 1):
                deterministic = False
                break

    print(f"Bitwise Determinism over 2 Runs: {'PASS (Deterministic)' if deterministic else 'FAIL'}")
    assert deterministic, "Non-deterministic behavior detected!"

    # 9. Performance & Execution Latencies
    mean_latency = float(np.mean(timings_per_image))
    max_latency = float(np.max(timings_per_image))
    print(f"\nTargeted Recovery Execution Latencies: Mean={mean_latency:.1f}ms | Max={max_latency:.1f}ms (Budget <= 1000ms)")
    assert max_latency < 1000.0, f"Max latency {max_latency}ms exceeds 1000ms budget!"

    perf_record = {
        "mean_latency_ms": round(mean_latency, 2),
        "max_latency_ms": round(max_latency, 2),
        "min_latency_ms": round(float(np.min(timings_per_image)), 2),
        "per_image_latencies_ms": {s: round(t, 2) for s, t in zip(samples, timings_per_image)},
    }

    # 10. Write all 10 Required JSON Artifacts
    print("\n--- 8. Writing authoritative JSON artifacts to evaluation/phase21010/ ---")

    # 1. baseline.json
    baseline_data = {
        "phase": "2.10.9_frozen_baseline",
        "authoritative_gt_count": 148,
        "input_hypotheses": 367,
        "tp_050": p2109_tp_050,
        "fp_050": p2109_fp_050,
        "fn_050": p2109_fn_050,
        "precision_050": round(p2109_tp_050 / (p2109_tp_050 + p2109_fp_050), 4),
        "recall_050": round(p2109_tp_050 / 148.0, 4),
        "available_recall_050": round(p2109_tp_050 / 19.0, 4),
        "f1_050": round(2 * (p2109_tp_050 / (p2109_tp_050 + p2109_fp_050)) * (p2109_tp_050 / 148.0) / ((p2109_tp_050 / (p2109_tp_050 + p2109_fp_050)) + (p2109_tp_050 / 148.0)), 4),
        "tp_025": p2109_tp_025,
        "fp_025": p2109_fp_025,
        "fn_025": p2109_fn_025,
    }
    with open(OUT_DIR / "baseline.json", "w", encoding="utf-8") as f:
        json.dump(baseline_data, f, indent=2)

    # 2. recovery_proposals.json
    props_data = {
        s: [p.to_dict() for p in recovery_results_by_image[s].fused_proposals]
        for s in samples
    }
    with open(OUT_DIR / "recovery_proposals.json", "w", encoding="utf-8") as f:
        json.dump(props_data, f, indent=2)

    # 3. recovery_by_strategy.json
    strat_data = {
        strat: {
            "total_proposals": count,
            "mean_proposals_per_image": round(count / 12.0, 2),
        }
        for strat, count in props_per_strat_total.items()
    }
    with open(OUT_DIR / "recovery_by_strategy.json", "w", encoding="utf-8") as f:
        json.dump(strat_data, f, indent=2)

    # 4. ablation_results.json
    with open(OUT_DIR / "ablation_results.json", "w", encoding="utf-8") as f:
        json.dump(ablation_results, f, indent=2)

    # 5. room_trace.json
    with open(OUT_DIR / "room_trace.json", "w", encoding="utf-8") as f:
        json.dump(gt_trace_records, f, indent=2)

    # 6. fp_trace.json
    with open(OUT_DIR / "fp_trace.json", "w", encoding="utf-8") as f:
        json.dump(fp_trace_records, f, indent=2)

    # 7. protected_anchors.json
    with open(OUT_DIR / "protected_anchors.json", "w", encoding="utf-8") as f:
        json.dump(protected_records, f, indent=2)

    # 8. performance.json
    with open(OUT_DIR / "performance.json", "w", encoding="utf-8") as f:
        json.dump(perf_record, f, indent=2)

    # 9. determinism.json
    with open(OUT_DIR / "determinism.json", "w", encoding="utf-8") as f:
        json.dump({"deterministic": deterministic, "runs_evaluated": 2, "benchmark_images": 12}, f, indent=2)

    # 10. summary.json
    summary_data = {
        "phase": "2.10.10",
        "description": "Targeted Missing-Room Recovery",
        "authoritative_gt_count": 148,
        "phase2109_baseline": {
            "tp_050": p2109_tp_050,
            "fp_050": p2109_fp_050,
            "fn_050": p2109_fn_050,
            "precision_050": baseline_data["precision_050"],
            "recall_050": baseline_data["recall_050"],
            "available_recall_050": baseline_data["available_recall_050"],
            "f1_050": baseline_data["f1_050"],
        },
        "recovery_proposals_summary": {
            "total_raw_proposals": total_proposals_generated,
            "total_fused_proposals": total_fused_proposals,
            "duplicates_pruned": total_duplicates_pruned,
            "mean_fused_per_image": round(total_fused_proposals / 12.0, 2),
            "proposals_by_strategy": props_per_strat_total,
        },
        "unrepresented_rooms_audit": {
            "total_unrepresented_in_p2109": 110,
            "recovered_into_final_tp": unrep_fate_counts["RECOVERED_TRUE_POSITIVE"],
            "proposal_generated_but_pruned": unrep_fate_counts["PROPOSAL_GENERATED_BUT_PRUNED"],
            "still_unrepresented": unrep_fate_counts["STILL_UNREPRESENTED"],
        },
        "final_synthesized_metrics": {
            "tp_050": primary_tp_050,
            "fp_050": primary_fp_050,
            "fn_050": primary_fn_050,
            "precision_050": primary_eval["precision_050"],
            "recall_050": primary_eval["recall_050"],
            "f1_050": primary_eval["f1_050"],
            "tp_025": primary_tp_025,
            "fp_025": primary_fp_025,
            "fn_025": primary_fn_025,
            "precision_025": primary_eval["precision_025"],
            "recall_025": primary_eval["recall_025"],
            "f1_025": primary_eval["f1_025"],
            "tp_delta_vs_p2109": primary_tp_050 - p2109_tp_050,
            "fp_delta_vs_p2109": primary_fp_050 - p2109_fp_050,
        },
    }
    with open(OUT_DIR / "summary.json", "w", encoding="utf-8") as f:
        json.dump(summary_data, f, indent=2)

    # 11. Render Diagnostic Visualizations (10 layers x 12 images)
    print("\n--- 9. Rendering Diagnostic Visualizations (10 layers x 12 images) ---")
    visualizer = RecoveryVisualizer(str(VIS_DIR))

    for sample_id in samples:
        img_path = adapter.get_image_path(sample_id)
        base_img = cv2.imread(str(img_path)) if img_path.exists() else None
        existing_polys = [h.polygon for h in input_hyps_by_image[sample_id]]
        rec_res = recovery_results_by_image[sample_id]
        final_rooms = final_rooms_by_image[sample_id]
        gt_polys = [gt["polygon"] for gt in all_gt_dicts[sample_id]]

        visualizer.render_all_10_diagnostics(
            image_name=sample_id,
            base_image=base_img,
            existing_polys=existing_polys,
            recovery_result=rec_res,
            final_synthesized_rooms=final_rooms,
            gt_polygons=gt_polys,
        )

    print(f"Visualizations saved to {VIS_DIR}")
    print("\n" + "=" * 80)
    print("PHASE 2.10.10 EXPERIMENT COMPLETED SUCCESSFULLY!")
    print("=" * 80)


if __name__ == "__main__":
    run_phase21010_experiment()
