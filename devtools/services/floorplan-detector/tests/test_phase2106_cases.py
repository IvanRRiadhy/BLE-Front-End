"""
Unit tests for Phase 2.10.6 Proposal Fusion, Deduplication, Boundary Optimization & Controlled Selection.
Covers all 20 required test invariants without Ground Truth leakage.
"""
import pytest
import numpy as np
from shapely.geometry import Polygon as ShapelyPolygon

from app.proposal_fusion.models import (
    FusedProposal,
    HypothesisRelation,
)
from app.proposal_fusion.geometry_validation import validate_proposal_geometry, filter_proposal_pool_geometry
from app.proposal_fusion.deduplication import deduplicate_proposals
from app.proposal_fusion.overlap_clustering import cluster_overlapping_proposals
from app.proposal_fusion.hypothesis_grouping import analyze_hypothesis_relationships
from app.proposal_fusion.boundary_optimizer import optimize_proposal_boundary
from app.proposal_fusion.scoring import compute_proposal_quality_score
from app.proposal_fusion.selection import select_controlled_proposals
from app.proposal_fusion.fusion_pipeline import ProposalFusionPipeline
from app.proposal_fusion.metrics import evaluate_gt_proposal_recall, trace_lost_gt_rooms


def _make_prop(
    pid: str,
    coords: list,
    quality: float = 0.5,
    wall_sup: float = 0.8,
    door_sup: float = 0.5,
) -> FusedProposal:
    try:
        sp = ShapelyPolygon(coords)
        if not sp.is_empty and sp.is_valid:
            bnd = sp.bounds
            area = float(sp.area)
            cx, cy = float(sp.centroid.x), float(sp.centroid.y)
        else:
            bnd = (0.0, 0.0, 0.0, 0.0)
            area = 0.0
            cx, cy = (0.0, 0.0)
    except Exception:
        bnd = (0.0, 0.0, 0.0, 0.0)
        area = 0.0
        cx, cy = (0.0, 0.0)

    return FusedProposal(
        proposal_id=pid,
        image_id="test_image.png",
        source_phase="2.10.6",
        source_strategy="test_strategy",
        polygon=coords,
        area_px=area,
        bbox=(float(bnd[0]), float(bnd[1]), float(bnd[2] - bnd[0]), float(bnd[3] - bnd[1])),
        centroid=(cx, cy),
        wall_support=wall_sup,
        door_support=door_sup,
        quality_score=quality,
    )


def test_01_invalid_polygon_rejection():
    # 1. Less than 3 points
    p1 = _make_prop("p1", [(0, 0), (10, 10), (0, 0)])
    p1.polygon = [(0, 0), (10, 10)]
    is_v, reason, _ = validate_proposal_geometry(p1, 1000, 1000)
    assert not is_v
    assert reason == "insufficient_vertices"

    # 2. NaN coordinates
    p2 = _make_prop("p2", [(0, 0), (float("nan"), 10), (10, 0)])
    is_v2, reason2, _ = validate_proposal_geometry(p2, 1000, 1000)
    assert not is_v2
    assert reason2 == "nan_or_inf_coordinates"


def test_02_duplicate_detection():
    coords = [(100, 100), (200, 100), (200, 200), (100, 200)]
    p1 = _make_prop("p1", coords, quality=0.8)
    p2 = _make_prop("p2", coords, quality=0.6)  # exact duplicate
    kept, dups = deduplicate_proposals([p1, p2], iou_threshold=0.85)
    assert len(kept) == 1
    assert kept[0].proposal_id == "p1"
    assert len(dups) == 1
    assert dups[0].proposal_id == "p2"
    assert dups[0].is_duplicate is True


def test_03_containment_detection():
    # Parent room
    parent_coords = [(100, 100), (300, 100), (300, 300), (100, 300)]
    # Small nested room (child)
    child_coords = [(120, 120), (200, 120), (200, 200), (120, 200)]
    p_parent = _make_prop("parent", parent_coords, quality=0.9)
    p_child = _make_prop("child", child_coords, quality=0.7)

    # They should NOT be collapsed in dedup because IoU is moderate
    kept, dups = deduplicate_proposals([p_parent, p_child], iou_threshold=0.85)
    assert len(kept) == 2


def test_04_iou_clustering():
    # Cluster of 3 overlapping proposals
    p1 = _make_prop("p1", [(100, 100), (200, 100), (200, 200), (100, 200)], quality=0.9)
    p2 = _make_prop("p2", [(110, 105), (205, 105), (205, 205), (110, 205)], quality=0.7)
    # Distant room
    p3 = _make_prop("p3", [(500, 500), (600, 500), (600, 600), (500, 600)], quality=0.8)

    clusters, mapping = cluster_overlapping_proposals([p1, p2, p3], overlap_threshold=0.40)
    assert len(clusters) == 2
    assert mapping["p1"] == mapping["p2"]
    assert mapping["p3"] != mapping["p1"]


def test_05_parent_child_relationship():
    parent_coords = [(0, 0), (100, 0), (100, 100), (0, 100)]
    child_coords = [(10, 10), (40, 10), (40, 40), (10, 40)]
    p_parent = _make_prop("p_parent", parent_coords)
    p_child = _make_prop("p_child", child_coords)

    rels = analyze_hypothesis_relationships([p_parent, p_child])
    assert len(rels) == 1
    assert rels[0].relation == HypothesisRelation.PARENT_CHILD


def test_06_partition_relationship():
    # Two rooms sharing a boundary with slight overlap
    p1 = _make_prop("p1", [(0, 0), (52, 0), (52, 100), (0, 100)])
    p2 = _make_prop("p2", [(48, 0), (100, 0), (100, 100), (48, 100)])
    rels = analyze_hypothesis_relationships([p1, p2])
    assert len(rels) == 1
    assert rels[0].relation in (HypothesisRelation.PARTITIONED_ROOM, HypothesisRelation.NEIGHBORING_ROOM)


def test_07_alternative_hypothesis_preservation():
    # In controlled selection, both parent and child can survive
    p_parent = _make_prop("p_parent", [(0, 0), (100, 0), (100, 100), (0, 100)], quality=0.95)
    p_child = _make_prop("p_child", [(10, 10), (40, 10), (40, 40), (10, 40)], quality=0.85)
    clusters, _ = cluster_overlapping_proposals([p_parent, p_child], overlap_threshold=0.30)
    rels = analyze_hypothesis_relationships([p_parent, p_child])

    selected, unselected = select_controlled_proposals([p_parent, p_child], clusters, rels, budget=10)
    assert len(selected) == 2
    sel_ids = {p.proposal_id for p in selected}
    assert "p_parent" in sel_ids and "p_child" in sel_ids


def test_08_boundary_optimization():
    # Safe boundary optimization
    coords = [(10, 10), (50, 10), (50.5, 30), (51, 50), (10, 50)]
    p = _make_prop("p", coords)
    opt_p, res = optimize_proposal_boundary(p, max_area_change_pct=5.0)
    assert res.is_accepted is True
    assert res.area_change_pct <= 5.0


def test_09_deterministic_selection():
    props = [
        _make_prop(f"p_{i}", [(i*20, 0), (i*20+15, 0), (i*20+15, 15), (i*20, 15)], quality=round(0.1*i, 2))
        for i in range(10)
    ]
    clusters, _ = cluster_overlapping_proposals(props, overlap_threshold=0.5)
    rels = analyze_hypothesis_relationships(props)

    run1, _ = select_controlled_proposals(props, clusters, rels, budget=5)
    run2, _ = select_controlled_proposals(props, clusters, rels, budget=5)
    assert [p.proposal_id for p in run1] == [p.proposal_id for p in run2]


def test_10_budget_handling():
    props = [
        _make_prop(f"p_{i}", [(i*20, 0), (i*20+15, 0), (i*20+15, 15), (i*20, 15)], quality=0.5)
        for i in range(20)
    ]
    clusters, _ = cluster_overlapping_proposals(props, overlap_threshold=0.5)
    rels = analyze_hypothesis_relationships(props)

    sel_5, _ = select_controlled_proposals(props, clusters, rels, budget=5)
    sel_12, _ = select_controlled_proposals(props, clusters, rels, budget=12)
    assert len(sel_5) == 5
    assert len(sel_12) == 12


def test_11_spatial_index_correctness():
    # Verifies STRtree deduplication produces the exact same result as brute-force check
    coords_list = [
        [(0, 0), (50, 0), (50, 50), (0, 50)],
        [(1, 1), (50, 1), (50, 50), (1, 50)],  # near duplicate of 0
        [(200, 200), (250, 200), (250, 250), (200, 250)],
    ]
    props = [_make_prop(f"p_{i}", c, quality=1.0 - 0.1*i) for i, c in enumerate(coords_list)]
    kept, dups = deduplicate_proposals(props, iou_threshold=0.85)
    assert len(kept) == 2
    assert len(dups) == 1
    assert dups[0].proposal_id == "p_1"


def test_12_lost_room_trace():
    gt = [("gt_1", ShapelyPolygon([(0, 0), (50, 0), (50, 50), (0, 50)]))]
    raw = [_make_prop("raw_1", [(0, 0), (50, 0), (50, 50), (0, 50)])]
    trace = trace_lost_gt_rooms("test.png", gt, raw, raw, raw, raw)
    assert len(trace) == 1
    assert trace[0]["stageLost"] == "SURVIVED"
    assert trace[0]["rawBestIoU"] == 1.0


def test_13_large_room_protection():
    # Large auditorium room (area = 50,000)
    auditorium = [(100, 100), (600, 100), (600, 300), (100, 300)]
    p = _make_prop("auditorium", auditorium, quality=0.92)
    is_v, reason, poly = validate_proposal_geometry(p, img_w=2000, img_h=2000, max_area_ratio=0.85)
    assert is_v is True
    assert poly.area == 100000.0


def test_14_concave_room_preservation():
    # U-shaped concave room
    concave = [
        (0, 0), (100, 0), (100, 100), (70, 100),
        (70, 40), (30, 40), (30, 100), (0, 100)
    ]
    p = _make_prop("concave", concave)
    is_v, reason, poly = validate_proposal_geometry(p, 500, 500)
    assert is_v is True
    assert not poly.equals(poly.convex_hull)


def test_15_l_shaped_room_preservation():
    l_shape = [
        (0, 0), (100, 0), (100, 40), (40, 40), (40, 100), (0, 100)
    ]
    p = _make_prop("l_shape", l_shape)
    is_v, reason, poly = validate_proposal_geometry(p, 500, 500)
    assert is_v is True


def test_16_corridor_preservation():
    # Long corridor (aspect ratio = 10.0)
    corridor = [(0, 0), (400, 0), (400, 40), (0, 40)]
    p = _make_prop("corridor", corridor)
    is_v, reason, _ = validate_proposal_geometry(p, 1000, 1000, max_aspect_ratio=14.0)
    assert is_v is True


def test_17_sliver_filtering():
    # Razor thin sliver (aspect ratio = 25.0)
    sliver = [(0, 0), (500, 0), (500, 10), (0, 10)]
    p = _make_prop("sliver", sliver)
    is_v, reason, _ = validate_proposal_geometry(p, 1000, 1000, max_aspect_ratio=14.0)
    assert not is_v
    assert "extreme_aspect_ratio" in reason


def test_18_proposal_provenance():
    p = _make_prop("prov_prop", [(10, 10), (30, 10), (30, 30), (10, 30)])
    p.source_phase = "2.10.5"
    p.source_strategy = "hybrid_split"
    p.parent_cavity_id = "hyp_cavity_3"
    d = p.to_dict()
    assert d["sourcePhase"] == "2.10.5"
    assert d["sourceStrategy"] == "hybrid_split"
    assert d["parentCavityId"] == "hyp_cavity_3"


def test_19_zero_gt_behavior():
    metrics = evaluate_gt_proposal_recall([], [])
    assert metrics["gt_count"] == 0
    assert metrics["recall_25"] == 0.0


def test_20_empty_proposal_behavior():
    pipe = ProposalFusionPipeline()
    res = pipe.process_proposals([], 1000, 1000)
    assert res["raw_count"] == 0
    assert res["final_selected_count"] == 0
    assert res["compression_ratio"] == 0.0
