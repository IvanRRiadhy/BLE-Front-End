"""
Evaluation metrics & diagnostic analysis for Phase 2.10.8 Room Validity.
Calculates:
- Final Room Detection Metrics (TP, FP, FN, Precision, Recall, F1) at IoU >= 0.50 & 0.25
- Merge & Split Errors
- Available-Room Recall vs Total Recall
- Precision-Recall Sweep across thresholds [0.10, 0.90]
- TP vs FP feature distribution separation
"""
from typing import List, Dict, Any, Tuple, Optional
import numpy as np
from shapely.geometry import Polygon as ShapelyPolygon
from scipy.optimize import linear_sum_assignment
from .models import ValidatedRoom, RoomValidityHypothesis


def compute_polygon_iou(p1: ShapelyPolygon, p2: ShapelyPolygon) -> float:
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


class RoomValidityMetricsEvaluator:
    """
    Evaluator for room validity performance against Ground Truth.
    """

    def __init__(self, iou_threshold: float = 0.50, secondary_iou_threshold: float = 0.25):
        self.iou_threshold = iou_threshold
        self.secondary_iou_threshold = secondary_iou_threshold

    def evaluate_detection(
        self,
        predicted_rooms: List[ValidatedRoom],
        ground_truth_polygons: List[Dict[str, Any]],
        image_name: str = "",
    ) -> Dict[str, Any]:
        """
        Computes bipartite matching detection metrics.
        """
        n_gt = len(ground_truth_polygons)
        n_pred = len(predicted_rooms)

        if n_gt == 0 and n_pred == 0:
            return {
                "tp_050": 0, "fp_050": 0, "fn_050": 0, "precision_050": 1.0, "recall_050": 1.0, "f1_050": 1.0,
                "tp_025": 0, "fp_025": 0, "fn_025": 0, "precision_025": 1.0, "recall_025": 1.0, "f1_025": 1.0,
                "merge_errors": 0, "split_errors": 0,
            }
        if n_gt == 0:
            return {
                "tp_050": 0, "fp_050": n_pred, "fn_050": 0, "precision_050": 0.0, "recall_050": 1.0, "f1_050": 0.0,
                "tp_025": 0, "fp_025": n_pred, "fn_025": 0, "precision_025": 0.0, "recall_025": 1.0, "f1_025": 0.0,
                "merge_errors": 0, "split_errors": 0,
            }
        if n_pred == 0:
            return {
                "tp_050": 0, "fp_050": 0, "fn_050": n_gt, "precision_050": 1.0, "recall_050": 0.0, "f1_050": 0.0,
                "tp_025": 0, "fp_025": 0, "fn_025": n_gt, "precision_025": 1.0, "recall_025": 0.0, "f1_025": 0.0,
                "merge_errors": 0, "split_errors": 0,
            }

        cost_matrix = np.zeros((n_gt, n_pred), dtype=float)
        iou_matrix = np.zeros((n_gt, n_pred), dtype=float)

        for g_idx, gt in enumerate(ground_truth_polygons):
            gt_poly = gt["polygon"]
            for p_idx, pred in enumerate(predicted_rooms):
                iou = compute_polygon_iou(gt_poly, pred.polygon)
                iou_matrix[g_idx, p_idx] = iou
                cost_matrix[g_idx, p_idx] = 1.0 - iou

        row_ind, col_ind = linear_sum_assignment(cost_matrix)

        # IoU >= 0.50
        matched_gt_050 = set()
        matched_pred_050 = set()
        for r, c in zip(row_ind, col_ind):
            if iou_matrix[r, c] >= self.iou_threshold:
                matched_gt_050.add(r)
                matched_pred_050.add(c)

        tp_050 = len(matched_gt_050)
        fp_050 = n_pred - len(matched_pred_050)
        fn_050 = n_gt - tp_050
        prec_050 = tp_050 / n_pred if n_pred > 0 else 0.0
        rec_050 = tp_050 / n_gt if n_gt > 0 else 0.0
        f1_050 = (2.0 * prec_050 * rec_050) / (prec_050 + rec_050) if (prec_050 + rec_050) > 0 else 0.0

        # IoU >= 0.25
        matched_gt_025 = set()
        matched_pred_025 = set()
        for r, c in zip(row_ind, col_ind):
            if iou_matrix[r, c] >= self.secondary_iou_threshold:
                matched_gt_025.add(r)
                matched_pred_025.add(c)

        tp_025 = len(matched_gt_025)
        fp_025 = n_pred - len(matched_pred_025)
        fn_025 = n_gt - tp_025
        prec_025 = tp_025 / n_pred if n_pred > 0 else 0.0
        rec_025 = tp_025 / n_gt if n_gt > 0 else 0.0
        f1_025 = (2.0 * prec_025 * rec_025) / (prec_025 + rec_025) if (prec_025 + rec_025) > 0 else 0.0

        # Merge Errors (predicted room covering >= 2 GT rooms with >= 25% of GT area)
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

        # Split Errors (single GT room split across >= 2 predicted rooms with >= 25% of pred area)
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
        }

    def compute_feature_distributions(
        self,
        hypotheses: List[RoomValidityHypothesis],
        ground_truth_polygons_by_image: Dict[str, List[Dict[str, Any]]],
    ) -> Dict[str, Any]:
        """
        Compares feature distributions between True Positive candidates and False Positive candidates.
        """
        tp_hyps: List[RoomValidityHypothesis] = []
        fp_hyps: List[RoomValidityHypothesis] = []

        for h in hypotheses:
            gt_list = ground_truth_polygons_by_image.get(h.image_id, [])
            best_iou = max([compute_polygon_iou(h.polygon, gt["polygon"]) for gt in gt_list], default=0.0)
            if best_iou >= 0.50:
                tp_hyps.append(h)
            else:
                fp_hyps.append(h)

        feature_keys = [
            "wall_boundary_support",
            "enclosure_score",
            "doorway_evidence",
            "topology_consistency",
            "exterior_likelihood",
            "furniture_likelihood",
            "text_likelihood",
            "sliver_likelihood",
            "artificial_cavity_likelihood",
            "room_validity_score",
        ]

        distributions = {}
        for k in feature_keys:
            tp_vals = [getattr(h, k, 0.0) for h in tp_hyps]
            fp_vals = [getattr(h, k, 0.0) for h in fp_hyps]
            distributions[k] = {
                "tp_mean": round(float(np.mean(tp_vals)), 4) if tp_vals else 0.0,
                "tp_median": round(float(np.median(tp_vals)), 4) if tp_vals else 0.0,
                "fp_mean": round(float(np.mean(fp_vals)), 4) if fp_vals else 0.0,
                "fp_median": round(float(np.median(fp_vals)), 4) if fp_vals else 0.0,
                "separation": round(float(np.mean(tp_vals) - np.mean(fp_vals)), 4) if tp_vals and fp_vals else 0.0,
            }

        return {
            "total_evaluated": len(hypotheses),
            "tp_count": len(tp_hyps),
            "fp_count": len(fp_hyps),
            "distributions": distributions,
        }
