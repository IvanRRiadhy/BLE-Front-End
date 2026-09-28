"""
Unit & Diagnostic Test Suite for Phase 2.10.10 Targeted Missing-Room Recovery.
Covers 30 required architectural, relational, topological, and constraint cases.
"""
import pytest
import numpy as np
from shapely.geometry import Polygon as ShapelyPolygon, box, LineString

from app.missing_room_recovery.models import (
    MissingRoomProposal,
    RecoveryResult,
    RecoveryStrategy,
)
from app.missing_room_recovery.doorway_recovery import DoorwayRecoveryEngine
from app.missing_room_recovery.partition_recovery import PartitionRecoveryEngine
from app.missing_room_recovery.neighbor_recovery import NeighborRecoveryEngine
from app.missing_room_recovery.repetition_recovery import RepetitionRecoveryEngine
from app.missing_room_recovery.wall_reconstruction import WallReconstructionEngine
from app.missing_room_recovery.proposal_fusion import ProposalFusionEngine
from app.missing_room_recovery.analyzer import UnrepresentedSpaceAnalyzer
from app.missing_room_recovery.recovery_pipeline import TargetedRecoveryPipeline
from app.missing_room_recovery.metrics import RecoveryMetricsEvaluator, compute_polygon_iou
from app.room_synthesis.synthesis_pipeline import GlobalRoomSynthesisPipeline
from app.room_synthesis.models import RoomHypothesis


class MockWallNetwork:
    def __init__(self, lines):
        self.wall_lines = lines


# 1. MissingRoomProposal instantiation & provenance
def test_01_proposal_instantiation():
    p = box(0, 0, 100, 100)
    prop = MissingRoomProposal(
        proposal_id="prop_01",
        source_strategy=RecoveryStrategy.DOORWAY_RECOVERY.value,
        image_id="test_img",
        polygon=p,
        provenance="doorway_anchor_(50,50)",
    )
    assert prop.area_px == 10000.0
    assert prop.centroid == (50.0, 50.0)
    assert prop.source_strategy == "doorway_recovery"


# 2. Doorway-anchored recovery
def test_02_doorway_anchored_recovery():
    doors = [{"bbox": [100, 50, 10, 20], "confidence": 0.85}]
    lines = [LineString([(100, 0), (100, 50)]), LineString([(100, 70), (100, 200)])]
    wn = MockWallNetwork(lines)
    engine = DoorwayRecoveryEngine()
    props = engine.generate_proposals("img", doors, wn, img_w=500, img_h=500)
    assert len(props) >= 1
    assert props[0].doorway_support >= 0.80


# 3. Partition recovery along internal dividing lines
def test_03_partition_recovery():
    big_space = box(0, 0, 200, 100)
    dividing_wall = LineString([(100, 0), (100, 100)])
    wn = MockWallNetwork([dividing_wall])
    engine = PartitionRecoveryEngine()
    props = engine.generate_proposals("img", wn, [big_space])
    assert len(props) == 2
    assert props[0].source_strategy == "partition_recovery"


# 4. Neighbor gap recovery
def test_04_neighbor_gap_recovery():
    r1 = box(0, 0, 100, 100)
    r2 = box(200, 0, 300, 100)
    engine = NeighborRecoveryEngine(min_gap_area_px=500.0)
    props = engine.generate_proposals("img", [r1, r2], img_w=400, img_h=200)
    assert len(props) >= 1
    assert props[0].neighbor_support >= 0.80


# 5. Repetition recovery on aligned modules
def test_05_repetition_recovery():
    r1 = box(50, 50, 150, 150)
    engine = RepetitionRecoveryEngine(min_area_px=1000.0)
    props = engine.generate_proposals("img", [r1], img_w=600, img_h=600)
    assert len(props) >= 1
    assert props[0].source_strategy == "repetition_recovery"


# 6. Wall reconstruction on broken loops
def test_06_wall_reconstruction():
    lines = [
        LineString([(0, 0), (100, 0)]),
        LineString([(100, 0), (100, 100)]),
        LineString([(100, 100), (0, 100)]),
        LineString([(0, 100), (0, 10)]),  # 10px door gap
    ]
    wn = MockWallNetwork(lines)
    engine = WallReconstructionEngine(gap_closing_buffer_px=12.0)
    props = engine.generate_proposals("img", wn)
    assert len(props) >= 1


# 7. Multi-signal proposal fusion
def test_07_multi_signal_fusion():
    p1 = box(0, 0, 100, 100)
    p2 = box(2, 2, 102, 102)  # 96% overlap
    prop1 = MissingRoomProposal("p1", "doorway_recovery", "img", p1, doorway_support=0.8)
    prop2 = MissingRoomProposal("p2", "partition_recovery", "img", p2, partition_support=0.9)
    fusion = ProposalFusionEngine(deduplication_iou_threshold=0.85)
    fused, dup_count = fusion.fuse_proposals({"door": [prop1], "part": [prop2]}, "img")
    assert len(fused) == 1
    assert dup_count == 1
    assert fused[0].source_strategy == "combined_recovery"


# 8. Proposal deduplication & budget
def test_08_proposal_deduplication_budget():
    props = [MissingRoomProposal(f"p_{i}", "doorway_recovery", "img", box(0, 0, 100, 100)) for i in range(10)]
    fusion = ProposalFusionEngine(deduplication_iou_threshold=0.85)
    fused, dups = fusion.fuse_proposals({"door": props}, "img")
    assert len(fused) == 1
    assert dups == 9


# 9. Proposal efficiency bounds
def test_09_proposal_efficiency_bounds():
    pipeline = TargetedRecoveryPipeline()
    res = pipeline.run_recovery("img", [], wall_network=None, doors=[])
    assert len(res.fused_proposals) <= 40


# 10. Strict GT independence
def test_10_strict_gt_independence():
    pipeline = TargetedRecoveryPipeline()
    # Ensure run_recovery does NOT take or accept ground truth arguments
    import inspect
    sig = inspect.signature(pipeline.run_recovery)
    assert "gt" not in sig.parameters
    assert "ground_truth" not in sig.parameters


# 11. Conversion to RoomHypothesis
def test_11_conversion_to_room_hypothesis():
    prop = MissingRoomProposal("rec_1", "doorway_recovery", "img", box(0, 0, 100, 100), doorway_support=0.85)
    pipeline = TargetedRecoveryPipeline()
    hyps = pipeline.convert_to_synthesis_hypotheses([prop], "img")
    assert len(hyps) == 1
    assert isinstance(hyps[0], RoomHypothesis)
    assert hyps[0].doorway_support == 0.85
    assert hyps[0].formation_source == "phase21010_recovery"


# 12. Compatibility with frozen Phase 2.10.9 synthesis
def test_12_compatibility_with_phase2109():
    prop = MissingRoomProposal("rec_1", "doorway_recovery", "img", box(0, 0, 100, 100), doorway_support=0.85, wall_support=0.8)
    pipeline = TargetedRecoveryPipeline()
    hyps = pipeline.convert_to_synthesis_hypotheses([prop], "img")
    synth_pipeline = GlobalRoomSynthesisPipeline(refine_boundaries=False)
    synth_res = synth_pipeline.run(hyps, "img")
    assert len(synth_res.selected_rooms) == 1


# 13. Overlap resolution with existing hypotheses
def test_13_overlap_resolution_with_existing():
    existing_h = RoomHypothesis("ex_1", "img", box(0, 0, 100, 100), wall_support=0.9, doorway_support=0.8)
    rec_h = RoomHypothesis("rec_1", "img", box(10, 10, 100, 100), wall_support=0.5, doorway_support=0.2)
    synth_pipeline = GlobalRoomSynthesisPipeline(refine_boundaries=False)
    synth_res = synth_pipeline.run([existing_h, rec_h], "img")
    assert len(synth_res.selected_rooms) == 1
    assert synth_res.selected_rooms[0].hypothesis_id == "ex_1"


# 14. Empty floorplan safety
def test_14_empty_floorplan_safety():
    pipeline = TargetedRecoveryPipeline()
    res = pipeline.run_recovery("img", [], None, None)
    assert len(res.fused_proposals) == 0


# 15. Single wall safety
def test_15_single_wall_safety():
    wn = MockWallNetwork([LineString([(0, 0), (100, 0)])])
    pipeline = TargetedRecoveryPipeline()
    res = pipeline.run_recovery("img", [], wn, None)
    assert res.execution_time_ms >= 0.0


# 16. Dense floorplan scalability
def test_16_dense_floorplan_scalability():
    lines = [LineString([(i * 20, 0), (i * 20, 200)]) for i in range(25)]
    wn = MockWallNetwork(lines)
    pipeline = TargetedRecoveryPipeline()
    res = pipeline.run_recovery("img", [box(0, 0, 50, 50)], wn, None)
    assert res.execution_time_ms < 600.0


# 17. Large hall / auditorium handling
def test_17_large_hall_handling():
    auditorium = box(0, 0, 450, 450)
    engine = PartitionRecoveryEngine(max_child_area_px=100000.0)
    props = engine.generate_proposals("img", None, [auditorium])
    assert len(props) == 0  # No partitions -> preserved intact


# 18. Narrow corridor recovery
def test_18_narrow_corridor_recovery():
    r1 = box(0, 0, 100, 200)
    r2 = box(150, 0, 250, 200)
    engine = NeighborRecoveryEngine(min_gap_area_px=1000.0)
    props = engine.generate_proposals("img", [r1, r2], img_w=300, img_h=250)
    assert len(props) >= 1


# 19. Concave room recovery
def test_19_concave_room_recovery():
    l_poly = ShapelyPolygon([[0, 0], [100, 0], [100, 50], [50, 50], [50, 100], [0, 100], [0, 0]])
    prop = MissingRoomProposal("l_prop", "wall_reconstruction", "img", l_poly)
    pipeline = TargetedRecoveryPipeline()
    hyps = pipeline.convert_to_synthesis_hypotheses([prop], "img")
    assert len(hyps) == 1
    assert hyps[0].polygon.equals(l_poly)


# 20. Doorway-less space recovery
def test_20_doorway_less_space_recovery():
    lines = [
        LineString([(0, 0), (100, 0)]),
        LineString([(100, 0), (100, 100)]),
        LineString([(100, 100), (0, 100)]),
        LineString([(0, 100), (0, 0)]),
    ]
    wn = MockWallNetwork(lines)
    engine = WallReconstructionEngine()
    props = engine.generate_proposals("img", wn)
    assert len(props) >= 1
    assert props[0].doorway_support == 0.0


# 21. Multi-doorway room recovery
def test_21_multi_doorway_recovery():
    doors = [{"bbox": [50, 0, 10, 10]}, {"bbox": [50, 100, 10, 10]}]
    engine = DoorwayRecoveryEngine()
    props = engine.generate_proposals("img", doors, None)
    assert len(props) >= 2


# 22. Boundary snapping on recovered proposals
def test_22_boundary_snapping_on_recovery():
    from app.room_synthesis.boundary_refinement import BoundaryRefiner
    p = box(0.5, 0.5, 99.5, 99.5)
    wall = LineString([(0, 0), (100, 0)])
    refiner = BoundaryRefiner(snap_distance_px=3.0)
    snapped, b_qual = refiner.refine_boundary(p, MockWallNetwork([wall]))
    assert b_qual >= 0.80


# 23. Strategy ablation integrity
def test_23_strategy_ablation_integrity():
    pipeline = TargetedRecoveryPipeline()
    res = pipeline.run_recovery("img", [], None, None)
    assert "doorway_recovery" in res.proposals_by_strategy
    assert "partition_recovery" in res.proposals_by_strategy
    assert "neighbor_recovery" in res.proposals_by_strategy


# 24. Deterministic proposal generation
def test_24_deterministic_generation():
    doors = [{"bbox": [100, 50, 10, 20]}]
    engine = DoorwayRecoveryEngine()
    p1 = engine.generate_proposals("img", doors, None)
    p2 = engine.generate_proposals("img", doors, None)
    assert len(p1) == len(p2)
    assert [p.proposal_id for p in p1] == [p.proposal_id for p in p2]


# 25. Available-room recall calculation
def test_25_available_room_recall():
    evaluator = RecoveryMetricsEvaluator()
    gts = [{"polygon": box(0, 0, 100, 100)}]
    preds = [box(0, 0, 100, 100)]
    ev = evaluator.evaluate_synthesis_detection(preds, gts)
    assert ev["tp_050"] == 1
    assert ev["recall_050"] == 1.0


# 26. Total recall calculation
def test_26_total_recall():
    evaluator = RecoveryMetricsEvaluator()
    gts = [{"polygon": box(0, 0, 100, 100)}, {"polygon": box(200, 0, 300, 100)}]
    preds = [box(0, 0, 100, 100)]
    ev = evaluator.evaluate_synthesis_detection(preds, gts)
    assert ev["tp_050"] == 1
    assert ev["recall_050"] == 0.50


# 27. True positive recovery audit
def test_27_tp_recovery_audit():
    gt = box(0, 0, 100, 100)
    rec = MissingRoomProposal("r1", "doorway_recovery", "img", box(0, 0, 100, 100))
    iou = compute_polygon_iou(gt, rec.polygon)
    assert iou >= 0.99


# 28. False positive proposal suppression
def test_28_fp_proposal_suppression():
    # Tiny 10x10 artifact
    p = box(0, 0, 10, 10)
    engine = DoorwayRecoveryEngine(min_room_area_px=1000.0)
    doors = [{"bbox": [0, 0, 5, 5]}]
    props = engine.generate_proposals("img", doors, None)
    assert all(prop.area_px >= 1000.0 for prop in props)


# 29. Provenance tracking per proposal
def test_29_provenance_tracking():
    prop = MissingRoomProposal("p", "doorway_recovery", "img", box(0, 0, 100, 100), provenance="door_anchor_at_(50,50)")
    assert "door_anchor" in prop.provenance


# 30. Performance / latency sanity
def test_30_performance_sanity():
    doors = [{"bbox": [i * 30, 50, 10, 20]} for i in range(10)]
    engine = DoorwayRecoveryEngine()
    import time
    t0 = time.perf_counter()
    props = engine.generate_proposals("img", doors, None)
    elapsed = (time.perf_counter() - t0) * 1000.0
    assert elapsed < 100.0
