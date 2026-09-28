"""
Evaluation Metrics & Proposal Efficiency Calculator for Phase 2.10.10.
Measures:
- GT Proposal Recall (@0.25 and @0.50)
- Proposal Efficiency (volume, new proposals, compression ratio, proposals per recovered GT)
- Final Room Detection Metrics when synthesized through Phase 2.10.9 Global Synthesis
- Missing-room failure tracing
"""
from typing import List, Dict, Any, Tuple, Optional
import numpy as np
from shapely.geometry import Polygon as ShapelyPolygon
from scipy.optimize import linear_sum_assignment
from .models import MissingRoomProposal


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


class RecoveryMetricsEvaluator:
    """
    Evaluator for targeted missing-room recovery proposals.
    """

    def __init__(self, iou_threshold: float = 0.50, secondary_iou_threshold: float = 0.25):
        self.iou_threshold = iou_threshold
        self.secondary_iou_threshold = secondary_iou_threshold

    def evaluate_proposal_coverage(
        self,
        proposals: List[MissingRoomProposal],
        ground_truth_polygons: List[Dict[str, Any]],
        baseline_hyps: Optional[List[Any]] = None,
    ) -> Dict[str, Any]:
        """
        Measures GT room coverage by recovery proposals.
        """
        n_gt = len(ground_truth_polygons)
        if n_gt == 0 or len(proposals) == 0:
            return {
                "covered_050": 0, "covered_025": 0, "recall_050": 0.0, "recall_025": 0.0,
                "mean_best_iou": 0.0, "median_best_iou": 0.0,
            }

        best_ious = []
        covered_050 = 0
        covered_025 = 0

        for gt in ground_truth_polygons:
            gt_poly = gt["polygon"]
            best_iou = max([compute_polygon_iou(gt_poly, p.polygon) for p in proposals], default=0.0)
            best_ious.append(best_iou)
            if best_iou >= self.iou_threshold:
                covered_050 += 1
            if best_iou >= self.secondary_iou_threshold:
                covered_025 += 1

        rec_050 = covered_050 / n_gt if n_gt > 0 else 0.0
        rec_025 = covered_025 / n_gt if n_gt > 0 else 0.0

        return {
            "gt_count": n_gt,
            "proposal_count": len(proposals),
            "covered_050": int(covered_050),
            "covered_025": int(covered_025),
            "recall_050": round(float(rec_050), 4),
            "recall_025": round(float(rec_025), 4),
            "mean_best_iou": round(float(np.mean(best_ious)), 4) if best_ious else 0.0,
            "median_best_iou": round(float(np.median(best_ious)), 4) if best_ious else 0.0,
        }

    def evaluate_synthesis_detection(
        self,
        predicted_rooms: List[Any],
        ground_truth_polygons: List[Dict[str, Any]],
        image_name: str = "",
    ) -> Dict[str, Any]:
        """
        Computes bipartite matching detection metrics for final synthesis output.
        """
        n_gt = len(ground_truth_polygons)
        n_pred = len(predicted_rooms)

        if n_gt == 0 and n_pred == 0:
            return {"tp_050": 0, "fp_050": 0, "fn_050": 0, "precision_050": 1.0, "recall_050": 1.0, "f1_050": 1.0}
        if n_gt == 0:
            return {"tp_050": 0, "fp_050": n_pred, "fn_050": 0, "precision_050": 0.0, "recall_050": 1.0, "f1_050": 0.0}
        if n_pred == 0:
            return {"tp_050": 0, "fp_050": 0, "fn_050": n_gt, "precision_050": 1.0, "recall_050": 0.0, "f1_050": 0.0}

        cost_matrix = np.zeros((n_gt, n_pred), dtype=float)
        iou_matrix = np.zeros((n_gt, n_pred), dtype=float)

        for g_idx, gt in enumerate(ground_truth_polygons):
            gt_poly = gt["polygon"]
            for p_idx, pred in enumerate(predicted_rooms):
                poly = getattr(pred, "polygon", pred)
                iou = compute_polygon_iou(gt_poly, poly)
                iou_matrix[g_idx, p_idx] = iou
                cost_matrix[g_idx, p_idx] = 1.0 - iou

        row_ind, col_ind = linear_sum_assignment(cost_matrix)

        matched_gt_050 = set()
        matched_pred_050 = set()
        matched_gt_025 = set()
        matched_pred_025 = set()

        for r, c in zip(row_ind, col_ind):
            if iou_matrix[r, c] >= self.iou_threshold:
                matched_gt_050.add(r)
                matched_pred_050.add(c)
            if iou_matrix[r, c] >= self.secondary_iou_threshold:
                matched_gt_025.add(r)
                matched_pred_025.add(c)

        tp_050 = len(matched_gt_050)
        fp_050 = n_pred - len(matched_pred_050)
        fn_050 = n_gt - tp_050
        prec_050 = tp_050 / n_pred if n_pred > 0 else 0.0
        rec_050 = tp_050 / n_gt if n_gt > 0 else 0.0
        f1_050 = (2.0 * prec_050 * rec_050) / (prec_050 + rec_050) if (prec_050 + rec_050) > 0 else 0.0

        tp_025 = len(matched_gt_025)
        fp_025 = n_pred - len(matched_pred_025)
        fn_025 = n_gt - tp_025
        prec_025 = tp_025 / n_pred if n_pred > 0 else 0.0
        rec_025 = tp_025 / n_gt if n_gt > 0 else 0.0
        f1_025 = (2.0 * prec_025 * rec_025) / (prec_025 + rec_025) if (prec_025 + rec_025) > 0 else 0.0

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
        }
