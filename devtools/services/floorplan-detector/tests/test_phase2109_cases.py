"""
Unit & Diagnostic Test Suite for Phase 2.10.9 Global Room Synthesis.
Covers 30 required architectural, relational, topological, and constraint cases.
"""
import pytest
import numpy as np
from shapely.geometry import Polygon as ShapelyPolygon, box

from app.room_synthesis.models import (
    RoomHypothesis,
    HypothesisRelationship,
    RelationshipType,
    DoorwayContext,
    CavityContext,
    RoomConfiguration,
    AlternativeGroup,
    SynthesisResult,
)
from app.room_synthesis.doorway_context import DoorwayContextAnalyzer
from app.room_synthesis.cavity_context import CavityContextAnalyzer
from app.room_synthesis.relationship_builder import SpatialRelationshipBuilder
from app.room_synthesis.hypothesis_graph import RoomHypothesisGraph
from app.room_synthesis.configuration_generator import ConfigurationGenerator
from app.room_synthesis.global_scoring import GlobalRoomScorer
from app.room_synthesis.constraint_solver import ConfigurationConstraintSolver
from app.room_synthesis.boundary_refinement import BoundaryRefiner
from app.room_synthesis.synthesis_pipeline import GlobalRoomSynthesisPipeline
from app.room_synthesis.metrics import GlobalRoomMetricsEvaluator, compute_polygon_iou


def create_sample_hyp(hyp_id: str, x: float, y: float, w: float, h: float, wall: float = 0.8, door: float = 0.0) -> RoomHypothesis:
    poly = box(x, y, x + w, y + h)
    return RoomHypothesis(
        hypothesis_id=hyp_id,
        image_id="test_img",
        polygon=poly,
        area_px=float(poly.area),
        wall_support=wall,
        doorway_support=door,
    )


# 1. Relationship graph construction
def test_01_relationship_graph_construction():
    h1 = create_sample_hyp("h1", 0, 0, 100, 100)
    h2 = create_sample_hyp("h2", 102, 0, 100, 100)
    builder = SpatialRelationshipBuilder(neighbor_distance_px=10.0)
    rels, alt_groups, part_ctxs = builder.build_relationships([h1, h2])
    assert any(r.rel_type == RelationshipType.NEIGHBOR_OF for r in rels)


# 2. Parent/child relation
def test_02_parent_child_relation():
    parent = create_sample_hyp("parent", 0, 0, 200, 200)
    child = create_sample_hyp("child", 10, 10, 80, 80)
    builder = SpatialRelationshipBuilder()
    rels, _, _ = builder.build_relationships([parent, child])
    assert any(r.rel_type == RelationshipType.PARENT_OF and r.source_id == "parent" and r.target_id == "child" for r in rels)
    assert any(r.rel_type == RelationshipType.CHILD_OF and r.source_id == "child" and r.target_id == "parent" for r in rels)


# 3. Alternative relation
def test_03_alternative_relation():
    h1 = create_sample_hyp("h1", 0, 0, 100, 100)
    h2 = create_sample_hyp("h2", 10, 10, 100, 100)
    builder = SpatialRelationshipBuilder(alternative_iou_threshold=0.30)
    rels, alt_groups, _ = builder.build_relationships([h1, h2])
    assert any(r.rel_type == RelationshipType.ALTERNATIVE_TO for r in rels)
    assert len(alt_groups) == 1
    assert "h1" in alt_groups[0].competing_hypothesis_ids
    assert "h2" in alt_groups[0].competing_hypothesis_ids


# 4. Partition relation
def test_04_partition_relation():
    parent = create_sample_hyp("parent", 0, 0, 200, 100)
    c1 = create_sample_hyp("c1", 5, 5, 90, 90)
    c2 = create_sample_hyp("c2", 105, 5, 90, 90)
    builder = SpatialRelationshipBuilder()
    rels, _, part_ctxs = builder.build_relationships([parent, c1, c2])
    assert len(part_ctxs) == 1
    assert part_ctxs[0].parent_id == "parent"
    assert "c1" in part_ctxs[0].child_ids and "c2" in part_ctxs[0].child_ids


# 5. Doorway relation
def test_05_doorway_relation():
    h1 = create_sample_hyp("h1", 0, 0, 100, 100)
    h2 = create_sample_hyp("h2", 100, 0, 100, 100)
    door_obj = {"bbox": [95, 40, 10, 20], "confidence": 0.85}
    analyzer = DoorwayContextAnalyzer()
    ctxs, rels = analyzer.analyze_doorways([h1, h2], doors=[door_obj])
    assert len(ctxs) == 1
    assert any(r.rel_type == RelationshipType.DOOR_CONNECTED_TO for r in rels)


# 6. Neighbor relation
def test_06_neighbor_relation():
    h1 = create_sample_hyp("h1", 0, 0, 100, 100)
    h2 = create_sample_hyp("h2", 105, 0, 100, 100)
    builder = SpatialRelationshipBuilder(neighbor_distance_px=15.0)
    rels, _, _ = builder.build_relationships([h1, h2])
    assert any(r.rel_type == RelationshipType.NEIGHBOR_OF for r in rels)


# 7. Cavity context
def test_07_cavity_context():
    h = create_sample_hyp("cav", 0, 0, 100, 100, wall=0.95)
    h.enclosure_score = 0.95
    h.doorway_count = 0
    analyzer = CavityContextAnalyzer()
    ctxs = analyzer.analyze_cavities([h])
    assert len(ctxs) == 1
    assert ctxs[0].is_fully_walled_without_openings is True
    assert ctxs[0].artificial_cavity_likelihood >= 0.70


# 8. Cavity-vs-room reasoning (Cavity Inversion Rule)
def test_08_cavity_inversion_reasoning():
    # Candidate A: 95% walled, 0 doors, 0 neighbors
    cand_a = create_sample_hyp("A", 0, 0, 100, 100, wall=0.95, door=0.0)
    cand_a.enclosure_score = 1.00

    # Candidate B: 80% walled, door present, 2 neighbors
    cand_b = create_sample_hyp("B", 200, 0, 100, 100, wall=0.80, door=0.8)
    cand_b.enclosure_score = 0.85
    cand_b.doorway_count = 1
    cand_b.neighbor_ids = ["n1", "n2"]

    analyzer = CavityContextAnalyzer()
    analyzer.analyze_cavities([cand_a, cand_b])

    scorer = GlobalRoomScorer()
    cfg_a = RoomConfiguration("cfg_a", "img", [cand_a])
    cfg_b = RoomConfiguration("cfg_b", "img", [cand_b])

    scorer.score_configuration(cfg_a)
    scorer.score_configuration(cfg_b)

    # Architectural requirement: Room B should score higher than artificial cavity A
    assert cfg_b.global_score > cfg_a.global_score


# 9. Configuration generation
def test_09_configuration_generation():
    h1 = create_sample_hyp("h1", 0, 0, 100, 100)
    h2 = create_sample_hyp("h2", 150, 0, 100, 100)
    graph = RoomHypothesisGraph("img")
    graph.add_node(h1)
    graph.add_node(h2)
    gen = ConfigurationGenerator()
    configs = gen.generate_configurations(graph)
    assert len(configs) >= 3


# 10. Configuration conflict detection
def test_10_configuration_conflict():
    h1 = create_sample_hyp("h1", 0, 0, 100, 100)
    h2 = create_sample_hyp("h2", 20, 20, 100, 100)  # Heavy overlap
    cfg = RoomConfiguration("cfg", "img", [h1, h2])
    scorer = GlobalRoomScorer()
    scorer.score_configuration(cfg)
    assert cfg.overlap_penalty > 0.0


# 11. Overlap constraint enforcement
def test_11_overlap_constraint():
    h1 = create_sample_hyp("h1", 0, 0, 100, 100, door=0.8)
    h2 = create_sample_hyp("h2", 10, 10, 100, 100, door=0.2)
    cfg = RoomConfiguration("cfg", "img", [h1, h2])
    solver = ConfigurationConstraintSolver(max_allowed_overlap_iou=0.10)
    solved = solver.solve_constraints(cfg)
    assert len(solved.hypotheses) == 1
    assert solved.hypotheses[0].hypothesis_id == "h1"


# 12. Parent/child conflict resolution
def test_12_parent_child_conflict():
    parent = create_sample_hyp("parent", 0, 0, 200, 100, door=0.9)
    child = create_sample_hyp("child", 5, 5, 80, 80, door=0.2)
    parent.child_ids = ["child"]
    child.parent_id = "parent"
    cfg = RoomConfiguration("cfg", "img", [parent, child])
    solver = ConfigurationConstraintSolver()
    solved = solver.solve_constraints(cfg)
    # Both cannot be selected simultaneously
    assert len(solved.hypotheses) == 1
    assert solved.hypotheses[0].hypothesis_id == "parent"


# 13. Alternative conflict resolution
def test_13_alternative_conflict():
    h1 = create_sample_hyp("h1", 0, 0, 100, 100, door=0.8)
    h2 = create_sample_hyp("h2", 50, 0, 100, 100, door=0.1)
    h1.alternative_group_id = "alt_1"
    h2.alternative_group_id = "alt_1"
    cfg = RoomConfiguration("cfg", "img", [h1, h2])
    solver = ConfigurationConstraintSolver()
    solved = solver.solve_constraints(cfg)
    assert len(solved.hypotheses) == 1
    assert solved.hypotheses[0].hypothesis_id == "h1"


# 14. Configuration complexity penalty
def test_14_complexity_penalty():
    rooms = [create_sample_hyp(f"h_{i}", i * 150, 0, 100, 100) for i in range(25)]
    cfg = RoomConfiguration("cfg", "img", rooms)
    scorer = GlobalRoomScorer(nominal_room_budget=10)
    scorer.score_configuration(cfg)
    assert cfg.complexity_penalty > 0.0


# 15. Global scoring transparency
def test_15_global_scoring_transparency():
    h = create_sample_hyp("h1", 0, 0, 100, 100, wall=0.8, door=0.7)
    cfg = RoomConfiguration("cfg", "img", [h])
    scorer = GlobalRoomScorer()
    score = scorer.score_configuration(cfg)
    assert 0.01 <= score <= 0.99
    assert cfg.architectural_score > 0.0
    assert cfg.doorway_score > 0.0


# 16. Deterministic solver execution
def test_16_deterministic_solver():
    rooms = [create_sample_hyp(f"h_{i}", i * 50, 0, 100, 100) for i in range(5)]
    cfg1 = RoomConfiguration("cfg1", "img", list(rooms))
    cfg2 = RoomConfiguration("cfg2", "img", list(rooms))
    solver = ConfigurationConstraintSolver()
    s1 = solver.solve_constraints(cfg1)
    s2 = solver.solve_constraints(cfg2)
    assert [r.hypothesis_id for r in s1.hypotheses] == [r.hypothesis_id for r in s2.hypotheses]


# 17. ML OFF fallback
def test_17_ml_off_fallback():
    h = create_sample_hyp("h", 0, 0, 100, 100)
    h.ml_available = False
    pipeline = GlobalRoomSynthesisPipeline(use_ml=False)
    res = pipeline.run([h], "img")
    assert len(res.selected_rooms) == 1


# 18. ML ON structural assistance
def test_18_ml_on_assistance():
    h = create_sample_hyp("h", 0, 0, 100, 100)
    h.ml_available = True
    h.ml_wall_support = 0.90
    h.ml_door_support = 0.85
    pipeline = GlobalRoomSynthesisPipeline(use_ml=True)
    res = pipeline.run([h], "img")
    assert len(res.selected_rooms) == 1


# 19. Empty graph handling
def test_19_empty_graph():
    pipeline = GlobalRoomSynthesisPipeline()
    res = pipeline.run([], "img")
    assert len(res.selected_rooms) == 0
    assert res.execution_time_ms >= 0.0


# 20. Single hypothesis handling
def test_20_single_hypothesis():
    h = create_sample_hyp("h", 0, 0, 100, 100)
    pipeline = GlobalRoomSynthesisPipeline()
    res = pipeline.run([h], "img")
    assert len(res.selected_rooms) == 1


# 21. Dense graph performance
def test_21_dense_graph():
    hyps = [create_sample_hyp(f"h_{i}", (i % 6) * 110, (i // 6) * 110, 100, 100) for i in range(36)]
    pipeline = GlobalRoomSynthesisPipeline()
    res = pipeline.run(hyps, "img")
    assert len(res.selected_rooms) >= 1
    assert res.execution_time_ms < 500.0


# 22. Large room protection
def test_22_large_room_protection():
    large_h = create_sample_hyp("hall", 0, 0, 400, 400, wall=0.85)
    large_h.is_large_space = True
    analyzer = CavityContextAnalyzer()
    ctxs = analyzer.analyze_cavities([large_h])
    assert ctxs[0].artificial_cavity_likelihood <= 0.15


# 23. Corridor preservation
def test_23_corridor_preservation():
    corr = create_sample_hyp("corridor", 0, 0, 400, 50, wall=0.85)
    corr.is_corridor = True
    analyzer = CavityContextAnalyzer()
    ctxs = analyzer.analyze_cavities([corr])
    assert ctxs[0].artificial_cavity_likelihood <= 0.15


# 24. Concave room preservation
def test_24_concave_room_preservation():
    l_shape = ShapelyPolygon([[0, 0], [100, 0], [100, 50], [50, 50], [50, 100], [0, 100], [0, 0]])
    h = RoomHypothesis("l_room", "img", l_shape, wall_support=0.85, doorway_support=0.6)
    pipeline = GlobalRoomSynthesisPipeline()
    res = pipeline.run([h], "img")
    assert len(res.selected_rooms) == 1


# 25. Doorway-less room handling
def test_25_doorway_less_room():
    # If it has strong walls and neighbors, it can be a valid storage/room without a detected door
    h = create_sample_hyp("store", 0, 0, 100, 100, wall=0.85)
    h.neighbor_ids = ["n1"]
    h.neighbor_support = 0.50
    pipeline = GlobalRoomSynthesisPipeline()
    res = pipeline.run([h], "img")
    assert len(res.selected_rooms) == 1


# 26. Multi-room partition resolution
def test_26_multi_room_partition():
    parent = create_sample_hyp("hall", 0, 0, 200, 100, wall=0.6, door=0.2)
    child1 = create_sample_hyp("c1", 0, 0, 95, 100, wall=0.85, door=0.8)
    child2 = create_sample_hyp("c2", 105, 0, 95, 100, wall=0.85, door=0.8)
    pipeline = GlobalRoomSynthesisPipeline()
    res = pipeline.run([parent, child1, child2], "img")
    # Children have superior doorway and wall support
    assert any(r.hypothesis_id in ["c1", "c2"] for r in res.selected_rooms)


# 27. Post-selection boundary refinement
def test_27_boundary_refinement():
    refiner = BoundaryRefiner(snap_distance_px=5.0)
    p = box(0, 0, 100, 100)
    snapped, b_qual = refiner.refine_boundary(p)
    assert b_qual >= 0.80


# 28. GT-independent inference verification
def test_28_gt_independent_inference():
    h = create_sample_hyp("h", 0, 0, 100, 100)
    pipeline = GlobalRoomSynthesisPipeline()
    res = pipeline.run([h], "img")
    assert not hasattr(res, "gt_polygons")
    assert len(res.selected_rooms) == 1


# 29. Provenance preservation
def test_29_provenance_preservation():
    h = create_sample_hyp("h", 0, 0, 100, 100)
    h.source_proposal_ids = ["prop_1", "prop_2"]
    h.validity_decision = "VALID"
    pipeline = GlobalRoomSynthesisPipeline()
    res = pipeline.run([h], "img")
    assert res.selected_rooms[0].source_proposal_ids == ["prop_1", "prop_2"]
    assert res.selected_rooms[0].validity_decision == "VALID"


# 30. Performance sanity
def test_30_performance_sanity():
    hyps = [create_sample_hyp(f"h_{i}", i * 60, 0, 50, 50) for i in range(20)]
    pipeline = GlobalRoomSynthesisPipeline()
    res = pipeline.run(hyps, "img")
    assert res.execution_time_ms < 200.0
