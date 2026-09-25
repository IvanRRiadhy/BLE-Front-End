import pytest
import numpy as np
from shapely.geometry import Polygon, box, MultiPolygon
from app.room_formation.models import (
    RoomHypothesis,
    GraphEdgeType,
    HypothesisEdge,
    RoomFormationGraph,
    FinalRoom,
    FinalRoomLayout,
    RoomHypothesisState,
)
from app.room_formation.formation_graph import FormationGraphBuilder
from app.room_formation.candidate_scoring import CandidateScorer
from app.room_formation.relationship_resolver import RelationshipResolver
from app.room_formation.layout_generator import LayoutGenerator
from app.room_formation.layout_scoring import LayoutScorer
from app.room_formation.disjoint_solver import DisjointSolver
from app.room_formation.room_formation_pipeline import RoomFormationPipeline
from app.room_formation.metrics import FinalRoomMetricsEvaluator, compute_polygon_iou


def make_dummy_proposal(pid: str, x: float, y: float, w: float, h: float, score: float = 0.8, strategy: str = "seed"):
    return {
        "id": pid,
        "polygon": box(x, y, x + w, y + h),
        "score": score,
        "source_strategy": strategy,
        "is_cavity_split": False,
    }


def test_01_models_creation():
    poly = box(0, 0, 100, 100)
    hyp = RoomHypothesis(id="h1", polygon=poly, score=0.85, source_strategy="seed")
    assert hyp.id == "h1"
    assert hyp.polygon.area == 10000.0
    assert hyp.score == 0.85
    assert hyp.state == RoomHypothesisState.CANDIDATE


def test_02_graph_edge_types():
    assert GraphEdgeType.PARENT_OF.value == "parent_of"
    assert GraphEdgeType.CHILD_OF.value == "child_of"
    assert GraphEdgeType.PARTITION_OF.value == "partition_of"
    assert GraphEdgeType.ALTERNATIVE_TO.value == "alternative_to"
    assert GraphEdgeType.NEIGHBOR_OF.value == "neighbor_of"
    assert GraphEdgeType.OVERLAPS.value == "overlaps"


def test_03_graph_builder_parent_child():
    # Large parent cavity and two children inside
    p_parent = make_dummy_proposal("p_parent", 0, 0, 200, 200, 0.75, "cavity")
    p_child1 = make_dummy_proposal("p_child1", 0, 0, 100, 200, 0.85, "split")
    p_child2 = make_dummy_proposal("p_child2", 100, 0, 100, 200, 0.85, "split")

    builder = FormationGraphBuilder()
    graph = builder.build_graph([p_parent, p_child1, p_child2])

    assert "p_parent" in graph.hypotheses
    assert "p_child1" in graph.hypotheses
    assert "p_child2" in graph.hypotheses

    h_parent = graph.hypotheses["p_parent"]
    h_child1 = graph.hypotheses["p_child1"]
    h_child2 = graph.hypotheses["p_child2"]

    assert "p_child1" in h_parent.child_ids
    assert "p_child2" in h_parent.child_ids
    assert "p_parent" in h_child1.parent_ids
    assert "p_parent" in h_child2.parent_ids


def test_04_graph_builder_alternative_clones():
    # Two almost identical proposals (high IoU >= 0.85)
    p1 = make_dummy_proposal("p1", 0, 0, 100, 100, 0.80)
    p2 = make_dummy_proposal("p2", 2, 2, 98, 98, 0.82)

    builder = FormationGraphBuilder()
    graph = builder.build_graph([p1, p2])

    assert "p2" in graph.hypotheses["p1"].alternative_ids
    assert "p1" in graph.hypotheses["p2"].alternative_ids


def test_05_graph_builder_neighbors():
    # Two adjacent rooms touching on an edge
    p1 = make_dummy_proposal("p1", 0, 0, 100, 100)
    p2 = make_dummy_proposal("p2", 100, 0, 100, 100)

    builder = FormationGraphBuilder()
    graph = builder.build_graph([p1, p2])

    assert "p2" in graph.hypotheses["p1"].neighbor_ids
    assert "p1" in graph.hypotheses["p2"].neighbor_ids


def test_06_candidate_scoring_basic():
    scorer = CandidateScorer()
    h = RoomHypothesis(id="h1", polygon=box(0, 0, 100, 100), score=0.5)
    scored = scorer.score_hypotheses([h])
    assert len(scored) == 1
    assert scored[0].score >= 0.0
    assert "enclosure" in scored[0].evidence


def test_07_candidate_scoring_corridor():
    scorer = CandidateScorer()
    # High aspect ratio polygon (10:1)
    corridor_poly = box(0, 0, 500, 50)
    h = RoomHypothesis(id="h_corr", polygon=corridor_poly, score=0.5)
    scored = scorer.score_hypotheses([h])
    assert scored[0].is_corridor is True
    assert scored[0].aspect_ratio >= 8.0


def test_08_relationship_resolver_favors_children_when_supported():
    # Parent cavity and two children with partition line evidence
    p_parent = make_dummy_proposal("p_parent", 0, 0, 200, 100, 0.70)
    p_c1 = make_dummy_proposal("p_c1", 0, 0, 100, 100, 0.85)
    p_c2 = make_dummy_proposal("p_c2", 100, 0, 100, 100, 0.85)

    builder = FormationGraphBuilder()
    graph = builder.build_graph([p_parent, p_c1, p_c2])

    resolver = RelationshipResolver()
    resolver.resolve_relationships(graph)

    # When child sum score > parent score, parent is demoted / rejected
    assert graph.hypotheses["p_parent"].state == RoomHypothesisState.REJECTED
    assert graph.hypotheses["p_c1"].state == RoomHypothesisState.ACTIVE
    assert graph.hypotheses["p_c2"].state == RoomHypothesisState.ACTIVE


def test_09_relationship_resolver_preserves_auditorium():
    # Large parent cavity with single weak child
    p_parent = make_dummy_proposal("p_parent", 0, 0, 500, 500, 0.95)
    p_c1 = make_dummy_proposal("p_c1", 0, 0, 100, 100, 0.30)

    builder = FormationGraphBuilder()
    graph = builder.build_graph([p_parent, p_c1])

    resolver = RelationshipResolver()
    resolver.resolve_relationships(graph)

    assert graph.hypotheses["p_parent"].state == RoomHypothesisState.ACTIVE


def test_10_layout_generator_arenas():
    # Two spatially disjoint clusters of rooms
    proposals = [
        make_dummy_proposal("cluster1_a", 0, 0, 100, 100),
        make_dummy_proposal("cluster1_b", 50, 0, 100, 100),
        make_dummy_proposal("cluster2_a", 1000, 1000, 100, 100),
        make_dummy_proposal("cluster2_b", 1050, 1000, 100, 100),
    ]
    builder = FormationGraphBuilder()
    graph = builder.build_graph(proposals)

    lg = LayoutGenerator()
    arenas = lg.cluster_arenas(graph)
    assert len(arenas) == 2


def test_11_layout_generator_generates_options():
    proposals = [
        make_dummy_proposal("p1", 0, 0, 100, 100),
        make_dummy_proposal("p2", 200, 0, 100, 100),
    ]
    builder = FormationGraphBuilder()
    graph = builder.build_graph(proposals)

    lg = LayoutGenerator()
    layouts = lg.generate_layouts(graph)
    assert len(layouts) >= 1
    assert len(layouts[0]) == 2


def test_12_layout_scorer_base():
    scorer = LayoutScorer()
    h1 = RoomHypothesis(id="h1", polygon=box(0, 0, 100, 100), score=0.9)
    h2 = RoomHypothesis(id="h2", polygon=box(200, 0, 100, 100), score=0.8)

    layout = scorer.score_layout([h1, h2])
    assert layout.global_score >= 1.5
    assert len(layout.rooms) == 2
    assert layout.max_pairwise_iou == 0.0


def test_13_layout_scorer_penalizes_overlap():
    scorer = LayoutScorer()
    # High overlapping proposals
    h1 = RoomHypothesis(id="h1", polygon=box(0, 0, 100, 100), score=0.9)
    h2 = RoomHypothesis(id="h2", polygon=box(20, 20, 100, 100), score=0.8)

    layout = scorer.score_layout([h1, h2])
    assert layout.overlap_penalty > 0.0


def test_14_disjoint_solver_clips_minor_overlap():
    solver = DisjointSolver(minor_overlap_clip_ratio=0.10)
    # Rooms overlap by a tiny sliver (3 pixels along x: [97, 100])
    h1 = RoomHypothesis(id="h1", polygon=box(0, 0, 100, 100), score=0.9)
    h2 = RoomHypothesis(id="h2", polygon=box(97, 0, 197, 100), score=0.8)

    initial_layout = LayoutScorer().score_layout([h1, h2])
    clean_layout = solver.enforce_disjointness(initial_layout)

    assert len(clean_layout.rooms) == 2
    # Verify max pairwise IoU < 0.10
    assert clean_layout.max_pairwise_iou < 0.05


def test_15_disjoint_solver_drops_heavy_overlap():
    solver = DisjointSolver(max_allowed_overlap_iou=0.10)
    # Rooms overlap significantly (70%)
    h1 = RoomHypothesis(id="h1", polygon=box(0, 0, 100, 100), score=0.9)
    h2 = RoomHypothesis(id="h2", polygon=box(10, 10, 100, 100), score=0.7)

    initial_layout = LayoutScorer().score_layout([h1, h2])
    clean_layout = solver.enforce_disjointness(initial_layout)

    # The lower-scoring room h2 must be dropped
    assert len(clean_layout.rooms) == 1
    assert clean_layout.rooms[0].hypothesis_id == "h1"


def test_16_disjoint_solver_guarantees_max_iou_under_10_percent():
    solver = DisjointSolver()
    r1 = FinalRoom(id="r1", hypothesis_id="h1", polygon=box(0, 0, 100, 100), score=0.9)
    r2 = FinalRoom(id="r2", hypothesis_id="h2", polygon=box(50, 0, 100, 100), score=0.6)
    layout = FinalRoomLayout(rooms=[r1, r2], global_score=1.5)

    solved = solver.enforce_disjointness(layout)
    assert solved.max_pairwise_iou < 0.10


def test_17_pipeline_end_to_end():
    pipeline = RoomFormationPipeline()
    proposals = [
        make_dummy_proposal("p1", 0, 0, 100, 100, 0.8),
        make_dummy_proposal("p2", 150, 0, 100, 100, 0.8),
        make_dummy_proposal("p3", 300, 0, 100, 100, 0.8),
    ]

    layouts = pipeline.run(proposals, top_k=3)
    assert len(layouts) >= 1
    top1 = layouts[0]
    assert len(top1.rooms) == 3
    assert top1.max_pairwise_iou < 0.10


def test_18_metrics_perfect_match():
    evaluator = FinalRoomMetricsEvaluator()
    r1 = FinalRoom(id="r1", hypothesis_id="h1", polygon=box(0, 0, 100, 100), score=0.9)
    gt = [{"id": "gt1", "polygon": box(0, 0, 100, 100)}]

    res = evaluator.evaluate_layout([r1], gt)
    assert res["tp_050"] == 1
    assert res["fp_050"] == 0
    assert res["fn_050"] == 0
    assert res["f1_050"] == 1.0


def test_19_metrics_low_iou_fn():
    evaluator = FinalRoomMetricsEvaluator()
    # Predicted room only has 33% IoU with GT (inter 5000, union 15000)
    r1 = FinalRoom(id="r1", hypothesis_id="h1", polygon=box(50, 0, 150, 100), score=0.9)
    gt = [{"id": "gt1", "polygon": box(0, 0, 100, 100)}]

    res = evaluator.evaluate_layout([r1], gt)
    assert res["tp_050"] == 0
    assert res["fn_050"] == 1
    assert res["fp_050"] == 1
    # At secondary IoU 0.25 it passes
    assert res["tp_025"] == 1


def test_20_metrics_detects_merge_error():
    evaluator = FinalRoomMetricsEvaluator()
    # Single large room covering two GT rooms
    r_big = FinalRoom(id="r_big", hypothesis_id="h1", polygon=box(0, 0, 200, 100), score=0.9)
    gt = [
        {"id": "gt1", "polygon": box(0, 0, 100, 100)},
        {"id": "gt2", "polygon": box(100, 0, 200, 100)},
    ]

    res = evaluator.evaluate_layout([r_big], gt)
    assert res["merge_errors"] == 1


def test_21_metrics_detects_split_error():
    evaluator = FinalRoomMetricsEvaluator()
    # Single GT room split across two predicted rooms
    r1 = FinalRoom(id="r1", hypothesis_id="h1", polygon=box(0, 0, 100, 100), score=0.9)
    r2 = FinalRoom(id="r2", hypothesis_id="h2", polygon=box(100, 0, 200, 100), score=0.9)
    gt = [{"id": "gt_big", "polygon": box(0, 0, 200, 100)}]

    res = evaluator.evaluate_layout([r1, r2], gt)
    assert res["split_errors"] == 1


def test_22_empty_proposals_safe():
    pipeline = RoomFormationPipeline()
    layouts = pipeline.run([])
    assert len(layouts) == 1
    assert len(layouts[0].rooms) == 0


def test_23_degenerate_polygon_filtering():
    solver = DisjointSolver()
    # Line or 0-area box
    r_bad = FinalRoom(id="rbad", hypothesis_id="hbad", polygon=box(0, 0, 0, 100), score=0.5)
    r_good = FinalRoom(id="rgood", hypothesis_id="hgood", polygon=box(0, 0, 50, 50), score=0.8)
    layout = FinalRoomLayout(rooms=[r_bad, r_good], global_score=1.0)

    clean = solver.enforce_disjointness(layout)
    assert len(clean.rooms) == 1
    assert clean.rooms[0].hypothesis_id == "hgood"


def test_24_aspect_ratio_corridor_support():
    hyp = RoomHypothesis(id="h_c", polygon=box(0, 0, 400, 40), score=0.8)
    assert hyp.aspect_ratio >= 9.0


def test_25_top_k_ordering():
    pipeline = RoomFormationPipeline()
    p1 = make_dummy_proposal("p1", 0, 0, 100, 100, 0.9)
    p2 = make_dummy_proposal("p2", 150, 0, 100, 100, 0.8)
    p3 = make_dummy_proposal("p3", 300, 0, 100, 100, 0.7)

    layouts = pipeline.run([p1, p2, p3], top_k=3)
    if len(layouts) > 1:
        assert layouts[0].global_score >= layouts[1].global_score
