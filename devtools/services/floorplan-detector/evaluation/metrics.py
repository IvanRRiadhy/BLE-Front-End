"""
Evaluation Metrics Calculation Engine
Computes room-level, geometric, topological, and image-level quantitative benchmark metrics.
"""
import numpy as np
from typing import List, Dict, Any, Optional
from shapely.geometry import Polygon as ShapelyPolygon
from shapely.ops import unary_union

from .models import (
    GroundTruthSample,
    PredictionResult,
    ImageEvaluationResult,
    MatchedPair,
    TopologyMergedRoom,
    TopologySplitRoom,
    PolygonValidationResult,
)
from .validation import validate_polygon
from .matching import match_polygons
from .topology import analyze_room_topology

def evaluate_image(
    gt_sample: GroundTruthSample,
    prediction: PredictionResult,
    min_iou: float = 0.25,
    min_pass_iou: float = 0.60,
    min_pass_f1: float = 0.60,
) -> ImageEvaluationResult:
    """
    Evaluates a single image prediction against ground truth.
    """
    w, h = gt_sample.imageWidth, gt_sample.imageHeight

    # 1. Geometric Validation of Predictions
    invalid_predictions: List[PolygonValidationResult] = []
    for pred in prediction.areas:
        val = validate_polygon(pred.id, pred.polygon, w, h)
        if not val.isValid:
            invalid_predictions.append(val)

    # 2. Hungarian Matching
    matches, unmatched_gt, unmatched_pred, _ = match_polygons(
        gt_areas=gt_sample.areas,
        pred_areas=prediction.areas,
        image_width=w,
        image_height=h,
        min_iou=min_iou,
    )

    # 3. Topology Analysis (Merged / Split)
    merged_rooms, split_rooms = analyze_room_topology(
        gt_areas=gt_sample.areas,
        pred_areas=prediction.areas,
    )

    # 4. Room-Level Classification
    tp = len(matches)
    fp = len(unmatched_pred)
    fn = len(unmatched_gt)

    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = (2 * precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0

    # 5. Geometric Distribution Metrics
    ious = [m.iou for m in matches]
    area_errs = [m.areaErrorPct for m in matches]
    cent_errs = [m.centroidErrorPx for m in matches]
    bound_errs = [m.boundaryErrorPx for m in matches]

    mean_iou = float(np.mean(ious)) if ious else 0.0
    median_iou = float(np.median(ious)) if ious else 0.0
    min_iou_val = float(np.min(ious)) if ious else 0.0

    mean_area_err = float(np.mean(area_errs)) if area_errs else 0.0
    median_area_err = float(np.median(area_errs)) if area_errs else 0.0
    mean_cent_err = float(np.mean(cent_errs)) if cent_errs else 0.0
    mean_bound_err = float(np.mean(bound_errs)) if bound_errs else 0.0

    # Multi-Threshold Cutoffs
    iou_gte_025 = sum(1 for i in ious if i >= 0.25)
    iou_gte_050 = sum(1 for i in ious if i >= 0.50)
    iou_gte_075 = sum(1 for i in ious if i >= 0.75)
    iou_gte_090 = sum(1 for i in ious if i >= 0.90)

    # 6. Area Coverage Analysis via Shapely Unary Union
    gt_polys = [ShapelyPolygon([p.to_tuple() for p in a.polygon]).buffer(0) for a in gt_sample.areas]
    pred_polys = [ShapelyPolygon([p.to_tuple() for p in a.polygon]).buffer(0) for a in prediction.areas]

    gt_union = unary_union(gt_polys) if gt_polys else None
    pred_union = unary_union(pred_polys) if pred_polys else None

    gt_total_area = float(gt_union.area) if gt_union and not gt_union.is_empty else 0.0
    pred_total_area = float(pred_union.area) if pred_union and not pred_union.is_empty else 0.0

    image_canvas_area = float(w * h) if (w * h) > 0 else 1.0

    gt_coverage_pct = (gt_total_area / image_canvas_area) * 100.0
    pred_coverage_pct = (pred_total_area / image_canvas_area) * 100.0

    # False positive area: area of predictions outside any GT room
    fp_area_pct = 0.0
    if pred_union and not pred_union.is_empty:
        if gt_union and not gt_union.is_empty:
            fp_diff = pred_union.difference(gt_union)
            fp_area = float(fp_diff.area)
        else:
            fp_area = pred_total_area
        fp_area_pct = (fp_area / pred_total_area) * 100.0 if pred_total_area > 0 else 0.0

    # 7. Overall Pass / Fail Criterion
    # Image passes if f1 >= min_pass_f1 and mean_iou >= min_pass_iou and no invalid polygons
    passed = (f1 >= min_pass_f1) and (mean_iou >= min_pass_iou) and (len(invalid_predictions) == 0)

    return ImageEvaluationResult(
        imageId=gt_sample.imageId,
        sourceDataset=gt_sample.sourceDataset,
        imageWidth=w,
        imageHeight=h,
        gtRoomCount=len(gt_sample.areas),
        predRoomCount=len(prediction.areas),
        truePositiveCount=tp,
        falsePositiveCount=fp,
        falseNegativeCount=fn,
        precision=precision,
        recall=recall,
        f1=f1,
        meanIoU=mean_iou,
        medianIoU=median_iou,
        minIoU=min_iou_val,
        iouGte025Count=iou_gte_025,
        iouGte050Count=iou_gte_050,
        iouGte075Count=iou_gte_075,
        iouGte090Count=iou_gte_090,
        meanAreaErrorPct=mean_area_err,
        medianAreaErrorPct=median_area_err,
        meanCentroidErrorPx=mean_cent_err,
        meanBoundaryErrorPx=mean_bound_err,
        gtCoveragePct=gt_coverage_pct,
        predictionCoveragePct=pred_coverage_pct,
        falsePositiveAreaPct=fp_area_pct,
        mergedRooms=merged_rooms,
        splitRooms=split_rooms,
        invalidPredictions=invalid_predictions,
        matches=matches,
        unmatchedGtIds=unmatched_gt,
        unmatchedPredIds=unmatched_pred,
        passed=passed,
        executionTimeMs=prediction.executionTimeMs,
    )
