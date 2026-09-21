"""
Topology Analysis Engine: Merged and Split Room Detection
Identifies structural room segmentation topological anomalies.
"""
from typing import List, Dict, Tuple
from shapely.geometry import Polygon as ShapelyPolygon
from .models import (
    GroundTruthArea,
    PredictedArea,
    TopologyMergedRoom,
    TopologySplitRoom,
)

def analyze_room_topology(
    gt_areas: List[GroundTruthArea],
    pred_areas: List[PredictedArea],
    min_overlap_ratio: float = 0.25,
) -> Tuple[List[TopologyMergedRoom], List[TopologySplitRoom]]:
    """
    Detects topological errors:
    1. Merged Rooms: 1 Prediction substantially subsumes 2 or more GT rooms.
       (e.g., A single polygon enclosing both living room and kitchen)
    2. Split Rooms: 1 GT room is substantially fragmented into 2 or more Predictions.
       (e.g., A room broken into multiple polygons across a furniture boundary)
    """
    merged_rooms: List[TopologyMergedRoom] = []
    split_rooms: List[TopologySplitRoom] = []

    if not gt_areas or not pred_areas:
        return merged_rooms, split_rooms

    # Build valid Shapely polygons
    gt_polys: Dict[str, ShapelyPolygon] = {}
    for g in gt_areas:
        poly = ShapelyPolygon([p.to_tuple() for p in g.polygon])
        if not poly.is_valid:
            poly = poly.buffer(0)
        gt_polys[g.id] = poly

    pred_polys: Dict[str, ShapelyPolygon] = {}
    for p in pred_areas:
        poly = ShapelyPolygon([p.to_tuple() for p in p.polygon])
        if not poly.is_valid:
            poly = poly.buffer(0)
        pred_polys[p.id] = poly

    # 1. Detect MERGED rooms: Scan each prediction against all GTs
    for p_id, p_poly in pred_polys.items():
        if p_poly.is_empty or p_poly.area <= 0:
            continue

        overlapping_gts: Dict[str, float] = {}
        for g_id, g_poly in gt_polys.items():
            if g_poly.is_empty or g_poly.area <= 0:
                continue
            try:
                inter_area = float(p_poly.intersection(g_poly).area)
            except Exception:
                inter_area = 0.0

            # Overlap relative to the GT room's size
            gt_fraction = inter_area / g_poly.area if g_poly.area > 0 else 0.0
            if gt_fraction >= min_overlap_ratio:
                overlapping_gts[g_id] = round(gt_fraction, 3)

        # If prediction significantly covers 2 or more distinct ground truth rooms
        if len(overlapping_gts) >= 2:
            merged_rooms.append(
                TopologyMergedRoom(
                    predictionId=p_id,
                    groundTruthIds=sorted(list(overlapping_gts.keys())),
                    overlaps=overlapping_gts,
                )
            )

    # 2. Detect SPLIT rooms: Scan each GT against all predictions
    for g_id, g_poly in gt_polys.items():
        if g_poly.is_empty or g_poly.area <= 0:
            continue

        overlapping_preds: Dict[str, float] = {}
        for p_id, p_poly in pred_polys.items():
            if p_poly.is_empty or p_poly.area <= 0:
                continue
            try:
                inter_area = float(g_poly.intersection(p_poly).area)
            except Exception:
                inter_area = 0.0

            # Overlap relative to the prediction's size
            pred_fraction = inter_area / p_poly.area if p_poly.area > 0 else 0.0
            gt_fraction = inter_area / g_poly.area if g_poly.area > 0 else 0.0

            # Significant if either fraction exceeds threshold
            if pred_fraction >= min_overlap_ratio and gt_fraction >= 0.15:
                overlapping_preds[p_id] = round(gt_fraction, 3)

        # If ground truth room is covered by 2 or more distinct predictions
        if len(overlapping_preds) >= 2:
            split_rooms.append(
                TopologySplitRoom(
                    groundTruthId=g_id,
                    predictionIds=sorted(list(overlapping_preds.keys())),
                    overlaps=overlapping_preds,
                )
            )

    return merged_rooms, split_rooms
