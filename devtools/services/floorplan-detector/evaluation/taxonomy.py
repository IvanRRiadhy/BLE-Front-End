"""
Evaluation Error Taxonomy & Failure Gallery Engine (Phase 2.7.6)
Implements deterministic failure classification, metric reconciliation assertions,
room size distribution analysis, and visual failure gallery export.
"""
import json
from pathlib import Path
from typing import List, Dict, Any, Optional
import cv2
import numpy as np

from .models import ImageEvaluationResult, RoomMatchRecord, GroundTruthSample, PredictionResult

VALID_FAILURE_TYPES = [
    "missed",
    "false_positive",
    "merged",
    "split",
    "tiny_room",
    "doorway_leakage",
    "exterior_leakage",
    "faint_wall",
    "furniture_interference",
    "text_interference",
    "hatch_interference",
    "corridor",
    "boundary_error",
    "furniture_face",
    "text_face",
    "dimension_face",
    "hatch_face",
    "exterior_face",
    "balcony_face",
    "terrace_face",
    "structural_face",
    "duplicate_face",
    "weak_architectural_face",
    "missing_candidate",
    "broken_wall",
    "doorway_gap",
    "partition_gap",
    "repeated_room_missing",
    "neighbor_pattern_missing",
    "weak_enclosure",
    "insufficient_wall_support",
    "recovery_outside_footprint",
    "recovery_duplicate",
    "recovery_overlap",
    "recovery_negative_evidence",
    "recovery_low_confidence",
    "unknown",
]

def reconcile_metrics(eval_res: ImageEvaluationResult) -> bool:
    """
    Asserts mathematical consistency of evaluation metrics.
    Raises ValueError if GT rooms != TP + FN or Pred rooms != TP + FP.
    """
    gt_calc = eval_res.truePositiveCount + eval_res.falseNegativeCount
    pred_calc = eval_res.truePositiveCount + eval_res.falsePositiveCount

    if eval_res.gtRoomCount != gt_calc:
        raise ValueError(
            f"Benchmark Reconciliation Error for {eval_res.imageId}: "
            f"GT ({eval_res.gtRoomCount}) != TP ({eval_res.truePositiveCount}) + FN ({eval_res.falseNegativeCount})"
        )

    if eval_res.predRoomCount != pred_calc:
        raise ValueError(
            f"Benchmark Reconciliation Error for {eval_res.imageId}: "
            f"Pred ({eval_res.predRoomCount}) != TP ({eval_res.truePositiveCount}) + FP ({eval_res.falsePositiveCount})"
        )

    return True

def classify_failure_type(
    status: str,
    iou: float,
    area_error_pct: float,
    is_merged: bool = False,
    is_split: bool = False,
    is_tiny: bool = False,
) -> str:
    """
    Determines failure category for an unmatched room or low-IoU prediction.
    """
    if status == "matched":
        if iou < 0.60:
            return "boundary_error"
        return "none"

    if is_merged:
        return "merged"
    if is_split:
        return "split"
    if is_tiny:
        return "tiny_room"

    if status == "missed":
        return "missed"
    elif status == "false_positive":
        return "false_positive"

    return "unknown"

def generate_failure_summary(eval_results: List[ImageEvaluationResult]) -> Dict[str, Any]:
    """
    Generates failure_summary.json data structure grouped and sorted by failure category count.
    """
    counts: Dict[str, int] = {ft: 0 for ft in VALID_FAILURE_TYPES}
    affected_imgs: Dict[str, List[str]] = {ft: [] for ft in VALID_FAILURE_TYPES}
    affected_gt: Dict[str, List[str]] = {ft: [] for ft in VALID_FAILURE_TYPES}

    for res in eval_results:
        # Check missed GTs
        for gt_id in res.unmatchedGtIds:
            ft = "missed"
            counts[ft] += 1
            if res.imageId not in affected_imgs[ft]:
                affected_imgs[ft].append(res.imageId)
            affected_gt[ft].append(gt_id)

        # Check False Positives
        for pred_id in res.unmatchedPredIds:
            ft = "false_positive"
            counts[ft] += 1
            if res.imageId not in affected_imgs[ft]:
                affected_imgs[ft].append(res.imageId)

        # Check Merged & Split rooms
        for m in res.mergedRooms:
            ft = "merged"
            counts[ft] += 1
            if res.imageId not in affected_imgs[ft]:
                affected_imgs[ft].append(res.imageId)
            affected_gt[ft].extend(m.groundTruthIds)

        for s in res.splitRooms:
            ft = "split"
            counts[ft] += 1
            if res.imageId not in affected_imgs[ft]:
                affected_imgs[ft].append(res.imageId)
            affected_gt[ft].append(s.groundTruthId)

    summary_list = []
    for ft in VALID_FAILURE_TYPES:
        if counts[ft] > 0 or ft in ["missed", "false_positive", "merged", "split"]:
            summary_list.append(
                {
                    "failureType": ft,
                    "count": counts[ft],
                    "affectedImages": affected_imgs[ft],
                    "affectedGtRooms": affected_gt[ft],
                }
            )

    summary_list.sort(key=lambda x: x["count"], reverse=True)
    return {"failureSummary": summary_list}
