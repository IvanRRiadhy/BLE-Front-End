"""
Metrics and Lost-Room Tracer for Phase 2.10.6 Evaluation.
Evaluates GT Proposal Recall @0.25, @0.50, @0.75, IoU percentiles,
and tracks each of the 148 GT rooms across pipeline stages.
"""
from typing import List, Dict, Any, Tuple, Set, Optional
import numpy as np
from shapely.geometry import Polygon as ShapelyPolygon

from .models import FusedProposal


def evaluate_gt_proposal_recall(
    gt_polygons: List[Tuple[str, ShapelyPolygon]],
    proposals: List[FusedProposal],
) -> Dict[str, Any]:
    """
    Evaluates Ground Truth room proposal recall without GT leakage into detector.
    """
    if not gt_polygons:
        return {
            "gt_count": 0,
            "recall_10": 0.0,
            "recall_25": 0.0,
            "recall_50": 0.0,
            "recall_75": 0.0,
            "mean_best_iou": 0.0,
            "median_best_iou": 0.0,
            "p10_best_iou": 0.0,
            "p90_best_iou": 0.0,
        }

    prop_polys = []
    for p in proposals:
        coords = list(p.polygon)
        if len(coords) >= 3:
            if coords[0] != coords[-1]:
                coords.append(coords[0])
            try:
                sp = ShapelyPolygon(coords)
                if not sp.is_valid:
                    sp = sp.buffer(0)
                if not sp.is_empty:
                    prop_polys.append((p.proposal_id, sp))
            except Exception:
                pass

    best_ious = []
    rec_10 = 0
    rec_25 = 0
    rec_50 = 0
    rec_75 = 0

    for gid, g_poly in gt_polygons:
        best_iou = 0.0
        for pid, p_poly in prop_polys:
            if p_poly.intersects(g_poly):
                inter = p_poly.intersection(g_poly).area
                union = p_poly.area + g_poly.area - inter
                iou = inter / union if union > 0 else 0.0
                if iou > best_iou:
                    best_iou = iou

        best_ious.append(best_iou)
        if best_iou >= 0.10:
            rec_10 += 1
        if best_iou >= 0.25:
            rec_25 += 1
        if best_iou >= 0.50:
            rec_50 += 1
        if best_iou >= 0.75:
            rec_75 += 1

    n_gt = len(gt_polygons)
    return {
        "gt_count": n_gt,
        "proposal_count": len(proposals),
        "recall_10": round(rec_10 / max(1, n_gt), 4),
        "recall_25": round(rec_25 / max(1, n_gt), 4),
        "recall_50": round(rec_50 / max(1, n_gt), 4),
        "recall_75": round(rec_75 / max(1, n_gt), 4),
        "mean_best_iou": round(float(np.mean(best_ious)), 4) if best_ious else 0.0,
        "median_best_iou": round(float(np.median(best_ious)), 4) if best_ious else 0.0,
        "p10_best_iou": round(float(np.percentile(best_ious, 10)), 4) if best_ious else 0.0,
        "p90_best_iou": round(float(np.percentile(best_ious, 90)), 4) if best_ious else 0.0,
    }


def trace_lost_gt_rooms(
    image_id: str,
    gt_polygons: List[Tuple[str, ShapelyPolygon]],
    raw_proposals: List[FusedProposal],
    valid_proposals: List[FusedProposal],
    dedup_proposals: List[FusedProposal],
    selected_proposals: List[FusedProposal],
    threshold: float = 0.25,
) -> List[Dict[str, Any]]:
    """
    Traces every GT room across pipeline stages to diagnose where proposals were eliminated.
    """
    def _find_best_match(props: List[FusedProposal], g_poly: ShapelyPolygon) -> Tuple[float, Optional[str]]:
        best_iou = 0.0
        best_id = None
        for p in props:
            coords = list(p.polygon)
            if len(coords) >= 3:
                if coords[0] != coords[-1]:
                    coords.append(coords[0])
                try:
                    sp = ShapelyPolygon(coords)
                    if not sp.is_valid:
                        sp = sp.buffer(0)
                    if sp.intersects(g_poly):
                        inter = sp.intersection(g_poly).area
                        union = sp.area + g_poly.area - inter
                        iou = inter / union if union > 0 else 0.0
                        if iou > best_iou:
                            best_iou = iou
                            best_id = p.proposal_id
                except Exception:
                    pass
        return best_iou, best_id

    records: List[Dict[str, Any]] = []

    for gid, g_poly in gt_polygons:
        raw_iou, raw_id = _find_best_match(raw_proposals, g_poly)
        val_iou, val_id = _find_best_match(valid_proposals, g_poly)
        dedup_iou, dedup_id = _find_best_match(dedup_proposals, g_poly)
        sel_iou, sel_id = _find_best_match(selected_proposals, g_poly)

        stage_lost = "SURVIVED"
        reason = "retained_in_final_selection"

        if raw_iou < threshold:
            stage_lost = "NEVER_GENERATED"
            reason = "no_valid_proposal_generated_in_phase_2104_or_2105"
        elif val_iou < threshold:
            stage_lost = "GEOMETRY_VALIDATION"
            reason = "rejected_during_geometry_validation"
        elif dedup_iou < threshold:
            stage_lost = "DEDUPLICATION"
            reason = "pruned_during_deduplication"
        elif sel_iou < threshold:
            stage_lost = "SELECTION"
            reason = "excluded_under_budget_constraint"

        records.append({
            "imageId": image_id,
            "gtId": gid,
            "proposalExists": raw_iou >= threshold,
            "rawBestProposalId": raw_id,
            "rawBestIoU": round(raw_iou, 4),
            "validBestIoU": round(val_iou, 4),
            "dedupBestIoU": round(dedup_iou, 4),
            "finalSelectedIoU": round(sel_iou, 4),
            "bestProposalId": sel_id if sel_id else raw_id,
            "bestIoU": round(max(raw_iou, sel_iou), 4),
            "stageLost": stage_lost,
            "reason": reason,
        })

    return records
