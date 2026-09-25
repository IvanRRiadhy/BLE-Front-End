from __future__ import annotations
from typing import List, Dict, Any, Tuple, Optional
import numpy as np
from shapely.geometry import Polygon
from scipy.optimize import linear_sum_assignment
from .models import FinalRoom, FinalRoomLayout

def compute_polygon_iou(p1: Polygon, p2: Polygon) -> float:
    """Computes IoU between two Shapely polygons."""
    if not p1.is_valid:
        p1 = p1.buffer(0)
    if not p2.is_valid:
        p2 = p2.buffer(0)
    if not p1.envelope.intersects(p2.envelope):
        return 0.0
    inter = p1.intersection(p2).area
    if inter <= 0:
        return 0.0
    union = p1.area + p2.area - inter
    return float(inter / union) if union > 0 else 0.0

class FinalRoomMetricsEvaluator:
    """
    Evaluates True Final Room Detection Metrics for a predicted multi-room layout against Ground Truth.
    Uses bipartite matching at IoU >= 0.50 (primary) and IoU >= 0.25 (secondary).
    Calculates:
    - TP, FP, FN
    - Precision, Recall, F1
    - Merge Errors (multiple GT matched to single prediction)
    - Split Errors (single GT matched to multiple predictions)
    - Room Count Error (|len(pred) - len(GT)|)
    - Max Pairwise Overlap in predicted layout
    """

    def __init__(self, iou_threshold: float = 0.50, secondary_iou_threshold: float = 0.25):
        self.iou_threshold = iou_threshold
        self.secondary_iou_threshold = secondary_iou_threshold

    def evaluate_layout(
        self,
        predicted_rooms: List[FinalRoom],
        ground_truth_polygons: List[Dict[str, Any]],
        image_name: str = "",
    ) -> Dict[str, Any]:
        """
        ground_truth_polygons: list of dicts with 'id', 'polygon' (Shapely Polygon)
        """
        n_gt = len(ground_truth_polygons)
        n_pred = len(predicted_rooms)

        # Pairwise overlap inside predicted layout
        max_pred_overlap = 0.0
        for i in range(n_pred):
            for j in range(i + 1, n_pred):
                iou = compute_polygon_iou(predicted_rooms[i].polygon, predicted_rooms[j].polygon)
                if iou > max_pred_overlap:
                    max_pred_overlap = iou

        if n_gt == 0 and n_pred == 0:
            return {
                "tp_050": 0, "fp_050": 0, "fn_050": 0, "precision_050": 1.0, "recall_050": 1.0, "f1_050": 1.0,
                "tp_025": 0, "fp_025": 0, "fn_025": 0, "precision_025": 1.0, "recall_025": 1.0, "f1_025": 1.0,
                "merge_errors": 0, "split_errors": 0, "count_error": 0, "max_overlap_iou": 0.0,
                "gt_matches": {},
            }
        if n_gt == 0:
            return {
                "tp_050": 0, "fp_050": n_pred, "fn_050": 0, "precision_050": 0.0, "recall_050": 1.0, "f1_050": 0.0,
                "tp_025": 0, "fp_025": n_pred, "fn_025": 0, "precision_025": 0.0, "recall_025": 1.0, "f1_025": 0.0,
                "merge_errors": 0, "split_errors": 0, "count_error": n_pred, "max_overlap_iou": max_pred_overlap,
                "gt_matches": {},
            }
        if n_pred == 0:
            return {
                "tp_050": 0, "fp_050": 0, "fn_050": n_gt, "precision_050": 1.0, "recall_050": 0.0, "f1_050": 0.0,
                "tp_025": 0, "fp_025": 0, "fn_025": n_gt, "precision_025": 1.0, "recall_025": 0.0, "f1_025": 0.0,
                "merge_errors": 0, "split_errors": 0, "count_error": n_gt, "max_overlap_iou": 0.0,
                "gt_matches": {gt["id"]: {"matched": False, "iou": 0.0} for gt in ground_truth_polygons},
            }

        # Cost matrix for Hungarian matching
        cost_matrix = np.zeros((n_gt, n_pred), dtype=float)
        iou_matrix = np.zeros((n_gt, n_pred), dtype=float)

        for g_idx, gt in enumerate(ground_truth_polygons):
            gt_poly = gt["polygon"]
            for p_idx, pred in enumerate(predicted_rooms):
                iou = compute_polygon_iou(gt_poly, pred.polygon)
                iou_matrix[g_idx, p_idx] = iou
                cost_matrix[g_idx, p_idx] = 1.0 - iou

        row_ind, col_ind = linear_sum_assignment(cost_matrix)

        # Evaluate at IoU >= 0.50
        matched_gt_050 = set()
        matched_pred_050 = set()
        gt_matches = {}

        for r, c in zip(row_ind, col_ind):
            iou = iou_matrix[r, c]
            gt_id = ground_truth_polygons[r]["id"]
            if iou >= self.iou_threshold:
                matched_gt_050.add(r)
                matched_pred_050.add(c)
                gt_matches[gt_id] = {
                    "matched": True,
                    "pred_id": predicted_rooms[c].id,
                    "hypothesis_id": predicted_rooms[c].hypothesis_id,
                    "iou": float(iou),
                }
            else:
                gt_matches[gt_id] = {
                    "matched": False,
                    "best_pred_id": predicted_rooms[c].id if c < n_pred else None,
                    "best_iou": float(iou),
                }

        tp_050 = len(matched_gt_050)
        fp_050 = n_pred - len(matched_pred_050)
        fn_050 = n_gt - tp_050
        prec_050 = tp_050 / n_pred if n_pred > 0 else 0.0
        rec_050 = tp_050 / n_gt if n_gt > 0 else 0.0
        f1_050 = (2.0 * prec_050 * rec_050) / (prec_050 + rec_050) if (prec_050 + rec_050) > 0 else 0.0

        # Evaluate at secondary IoU >= 0.25
        matched_gt_025 = set()
        matched_pred_025 = set()
        for r, c in zip(row_ind, col_ind):
            iou = iou_matrix[r, c]
            if iou >= self.secondary_iou_threshold:
                matched_gt_025.add(r)
                matched_pred_025.add(c)

        tp_025 = len(matched_gt_025)
        fp_025 = n_pred - len(matched_pred_025)
        fn_025 = n_gt - tp_025
        prec_025 = tp_025 / n_pred if n_pred > 0 else 0.0
        rec_025 = tp_025 / n_gt if n_gt > 0 else 0.0
        f1_025 = (2.0 * prec_025 * rec_025) / (prec_025 + rec_025) if (prec_025 + rec_025) > 0 else 0.0

        # Analyze Merge Errors: single predicted room overlapping >= 2 GT rooms with >= 20% of GT area
        merge_errors = 0
        for p_idx, pred in enumerate(predicted_rooms):
            overlapped_gt_count = 0
            for g_idx, gt in enumerate(ground_truth_polygons):
                gt_poly = gt["polygon"]
                if pred.polygon.envelope.intersects(gt_poly.envelope):
                    inter = pred.polygon.intersection(gt_poly).area
                    if gt_poly.area > 0 and (inter / gt_poly.area) >= 0.25:
                        overlapped_gt_count += 1
            if overlapped_gt_count >= 2:
                merge_errors += 1

        # Analyze Split Errors: single GT room split across >= 2 predicted rooms with >= 20% of pred area
        split_errors = 0
        for g_idx, gt in enumerate(ground_truth_polygons):
            gt_poly = gt["polygon"]
            overlapped_preds = 0
            for p_idx, pred in enumerate(predicted_rooms):
                if gt_poly.envelope.intersects(pred.polygon.envelope):
                    inter = gt_poly.intersection(pred.polygon).area
                    if pred.polygon.area > 0 and (inter / pred.polygon.area) >= 0.25:
                        overlapped_preds += 1
            if overlapped_preds >= 2:
                split_errors += 1

        return {
            "tp_050": int(tp_050),
            "fp_050": int(fp_050),
            "fn_050": int(fn_050),
            "precision_050": float(prec_050),
            "recall_050": float(rec_050),
            "f1_050": float(f1_050),
            "tp_025": int(tp_025),
            "fp_025": int(fp_025),
            "fn_025": int(fn_025),
            "precision_025": float(prec_025),
            "recall_025": float(rec_025),
            "f1_025": float(f1_025),
            "merge_errors": int(merge_errors),
            "split_errors": int(split_errors),
            "count_error": abs(n_pred - n_gt),
            "max_overlap_iou": float(max_pred_overlap),
            "gt_matches": gt_matches,
        }
