"""
Geometric Polygon Matching Engine
Computes IoU cost matrix, Hausdorff boundary distance, and executes Hungarian maximum-weight bipartite matching.
"""
import numpy as np
from typing import List, Tuple, Dict, Optional, Set
from shapely.geometry import Polygon as ShapelyPolygon
from scipy.optimize import linear_sum_assignment

from .models import GroundTruthArea, PredictedArea, MatchedPair, Point2D

def compute_pairwise_geometry(
    gt_pts: List[Point2D],
    pred_pts: List[Point2D],
    img_diag: float = 1000.0,
) -> Tuple[float, float, float, float, float, float, float]:
    """
    Computes (iou, intersection_area, union_area, area_err_pct, centroid_err_px, norm_centroid_err, boundary_err_px)
    between a single GT polygon and a predicted polygon.
    """
    gt_coords = [p.to_tuple() for p in gt_pts]
    pred_coords = [p.to_tuple() for p in pred_pts]

    if len(gt_coords) < 3 or len(pred_coords) < 3:
        return 0.0, 0.0, 0.0, 100.0, float("inf"), 1.0, float("inf")

    poly_gt = ShapelyPolygon(gt_coords)
    poly_pred = ShapelyPolygon(pred_coords)

    # Topological healing for degenerate metric calculation
    if not poly_gt.is_valid:
        poly_gt = poly_gt.buffer(0)
    if not poly_pred.is_valid:
        poly_pred = poly_pred.buffer(0)

    if poly_gt.is_empty or poly_pred.is_empty:
        return 0.0, 0.0, 0.0, 100.0, float("inf"), 1.0, float("inf")

    # 1. Intersection & Union
    try:
        inter_area = float(poly_gt.intersection(poly_pred).area)
        union_area = float(poly_gt.union(poly_pred).area)
    except Exception:
        inter_area = 0.0
        union_area = float(poly_gt.area + poly_pred.area)

    iou = inter_area / union_area if union_area > 0 else 0.0

    # 2. Area Error %
    gt_area = float(poly_gt.area)
    pred_area = float(poly_pred.area)
    area_err_pct = abs(pred_area - gt_area) / gt_area * 100.0 if gt_area > 0 else 100.0

    # 3. Centroid Error
    gt_c = poly_gt.centroid
    pred_c = poly_pred.centroid
    cent_err_px = float(np.hypot(pred_c.x - gt_c.x, pred_c.y - gt_c.y))
    norm_cent_err = cent_err_px / img_diag if img_diag > 0 else 1.0

    # 4. Boundary Error (Bidirectional Hausdorff Distance in pixels)
    boundary_err_px = 0.0
    try:
        if hasattr(poly_gt, "exterior") and hasattr(poly_pred, "exterior"):
            boundary_err_px = float(poly_gt.exterior.hausdorff_distance(poly_pred.exterior))
        else:
            boundary_err_px = float(poly_gt.hausdorff_distance(poly_pred))
    except Exception:
        boundary_err_px = cent_err_px

    return iou, inter_area, union_area, area_err_pct, cent_err_px, norm_cent_err, boundary_err_px

def match_polygons(
    gt_areas: List[GroundTruthArea],
    pred_areas: List[PredictedArea],
    image_width: int,
    image_height: int,
    min_iou: float = 0.25,
) -> Tuple[List[MatchedPair], List[str], List[str], np.ndarray]:
    """
    Performs optimal one-to-one bipartite Hungarian matching between Ground Truth rooms and Predicted rooms.
    Returns:
    - matches: List[MatchedPair]
    - unmatched_gt_ids: List[str] (Missed rooms)
    - unmatched_pred_ids: List[str] (False positive rooms)
    - iou_matrix: np.ndarray of shape (len(gt_areas), len(pred_areas))
    """
    n_gt = len(gt_areas)
    n_pred = len(pred_areas)
    img_diag = float(np.hypot(image_width, image_height)) or 1000.0

    if n_gt == 0 and n_pred == 0:
        return [], [], [], np.zeros((0, 0))

    if n_gt == 0:
        return [], [], [p.id for p in pred_areas], np.zeros((0, n_pred))

    if n_pred == 0:
        return [], [g.id for g in gt_areas], [], np.zeros((n_gt, 0))

    iou_matrix = np.zeros((n_gt, n_pred), dtype=np.float64)
    geom_cache: Dict[Tuple[int, int], Tuple[float, float, float, float, float, float, float]] = {}

    for g_idx, gt in enumerate(gt_areas):
        for p_idx, pred in enumerate(pred_areas):
            geom = compute_pairwise_geometry(gt.polygon, pred.polygon, img_diag)
            iou_matrix[g_idx, p_idx] = geom[0]
            geom_cache[(g_idx, p_idx)] = geom

    # Hungarian Maximum-Weight Matching
    # SciPy linear_sum_assignment minimizes cost, so cost = 1.0 - IoU
    cost_matrix = 1.0 - iou_matrix
    row_ind, col_ind = linear_sum_assignment(cost_matrix)

    matches: List[MatchedPair] = []
    matched_gt_indices: Set[int] = set()
    matched_pred_indices: Set[int] = set()

    for r, c in zip(row_ind, col_ind):
        iou = iou_matrix[r, c]
        if iou >= min_iou:
            geom = geom_cache[(r, c)]
            matches.append(
                MatchedPair(
                    gtId=gt_areas[r].id,
                    predId=pred_areas[c].id,
                    iou=geom[0],
                    intersectionArea=geom[1],
                    unionArea=geom[2],
                    areaErrorPct=geom[3],
                    centroidErrorPx=geom[4],
                    normalizedCentroidError=geom[5],
                    boundaryErrorPx=geom[6],
                )
            )
            matched_gt_indices.add(r)
            matched_pred_indices.add(c)

    unmatched_gt_ids = [gt_areas[i].id for i in range(n_gt) if i not in matched_gt_indices]
    unmatched_pred_ids = [pred_areas[j].id for j in range(n_pred) if j not in matched_pred_indices]

    return matches, unmatched_gt_ids, unmatched_pred_ids, iou_matrix
