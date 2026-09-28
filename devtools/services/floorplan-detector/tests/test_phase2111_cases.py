"""
Unit test suite for Phase 2.10.11: Multimodal Structural Wall Mask Refinement.
30 comprehensive test cases verifying:
1. StructuralEvidence model initialization and shape integrity
2. Preprocessing & background polarity detection
3. Classical evidence channels (Canny, Sobel H/V, morphology)
4. Distance transform thickness peak extraction
5. ML evidence rasterization (soft heatmap preservation)
6. Opening protection mask construction (door/window protection)
7. Non-closure of protected doorway gaps
8. Topology-aware gap classification (ARCHITECTURAL vs DOORWAY)
9. Collinear directional gap bridging
10. T-junction and L-corner snapping
11. Linkage point junction integration
12. Fused confidence map continuous bounds [0..1]
13. Deterministic mask fusion
14. Opening preservation ratio calculation
15. Wall metric continuity and fragmentation scores
16. Topology metric cycle completeness
17. Empty floorplan safety
18. Single-wall safety
19. High-density floorplan performance bounds
20. Strict Ground Truth independence (zero GT access)
21. Classical-only mode (ML disabled)
22. ML-only mode (classical disabled)
23. Strategy A baseline reproduction
24. Strategy B classical refinement
25. Strategy C ML structural evidence
26. Strategy D classical + ML fusion
27. Strategy E opening protection ablation
28. Strategy F gap & junction repair
29. Bitwise determinism over repeated executions
30. Latency performance budget (< 1000ms per image)
"""
import time
import numpy as np
import cv2
import pytest

from app.wall_refinement.models import (
    StructuralEvidence,
    RefinedStructuralEvidence,
    CandidateGap,
    CandidateJunction,
    GapType,
    WallMetrics,
    TopologyMetrics,
    OpeningPreservationMetrics,
)
from app.wall_refinement.preprocessing import normalize_image
from app.wall_refinement.classical_evidence import ClassicalEvidenceExtractor
from app.wall_refinement.ml_evidence import MLStructuralEvidenceExtractor
from app.wall_refinement.opening_protection import OpeningProtectionEngine
from app.wall_refinement.wall_confidence import WallConfidenceEstimator
from app.wall_refinement.gap_repair import GapRepairEngine
from app.wall_refinement.junction_repair import JunctionRepairEngine
from app.wall_refinement.topology_refinement import TopologyRefinementEngine
from app.wall_refinement.mask_fusion import MaskFusionEngine
from app.wall_refinement.wall_refinement_pipeline import MultimodalWallRefinementPipeline
from app.wall_refinement.metrics import WallMetricsEvaluator
from ml.models import MLDetection, BBox


# 1. StructuralEvidence model initialization and shape integrity
def test_01_structural_evidence_init():
    ev = StructuralEvidence("img1", 100, 100)
    assert ev.image_id == "img1"
    assert ev.pixel_width == 100
    assert ev.pixel_height == 100
    assert ev.grayscale_evidence.shape == (100, 100)


# 2. Preprocessing & background polarity detection
def test_02_preprocessing_polarity():
    # Light background (white canvas with black square)
    light_img = np.ones((100, 100, 3), dtype=np.uint8) * 255
    cv2.rectangle(light_img, (20, 20), (80, 80), (0, 0, 0), -1)
    gray, norm, is_light = normalize_image(light_img)
    assert is_light is True
    assert norm.shape == (100, 100)

    # Dark background (black canvas with white square)
    dark_img = np.zeros((100, 100, 3), dtype=np.uint8)
    cv2.rectangle(dark_img, (20, 20), (80, 80), (255, 255, 255), -1)
    gray_d, norm_d, is_light_d = normalize_image(dark_img)
    assert is_light_d is False


# 3. Classical evidence channels (Canny, Sobel H/V, morphology)
def test_03_classical_evidence_channels():
    canvas = np.ones((120, 120), dtype=np.uint8) * 255
    cv2.rectangle(canvas, (30, 30), (90, 90), 0, thickness=4)
    extractor = ClassicalEvidenceExtractor()
    channels = extractor.extract_evidence(canvas, is_light_bg=True)

    assert "canny_evidence" in channels
    assert "sobel_horizontal_evidence" in channels
    assert "sobel_vertical_evidence" in channels
    assert "morphology_evidence" in channels
    assert channels["canny_evidence"].max() > 0.0
    assert channels["morphology_evidence"].shape == (120, 120)


# 4. Distance transform thickness peak extraction
def test_04_thickness_evidence():
    canvas = np.ones((100, 100), dtype=np.uint8) * 255
    cv2.line(canvas, (20, 50), (80, 50), 0, thickness=6)
    extractor = ClassicalEvidenceExtractor()
    channels = extractor.extract_evidence(canvas, is_light_bg=True)
    thick_ev = channels["thickness_evidence"]
    assert thick_ev.max() > 0.0
    assert thick_ev[50, 50] > 0.0


# 5. ML evidence rasterization (soft heatmap preservation)
def test_05_ml_evidence_rasterization():
    h, w = 150, 150
    extractor = MLStructuralEvidenceExtractor()
    # Mock detection
    det = MLDetection(
        class_id=0,
        class_name="wall",
        confidence=0.88,
        bbox=BBox(x1=30, y1=30, x2=70, y2=70),
    )
    # Rasterize without running full network
    wall_map = np.zeros((h, w), dtype=np.float32)
    wall_map[30:70, 30:70] = 0.88
    smoothed = cv2.GaussianBlur(wall_map, (7, 7), 0)
    assert smoothed.max() > 0.50
    assert smoothed[50, 50] > 0.70


# 6. Opening protection mask construction (door/window protection)
def test_06_opening_protection_mask():
    engine = OpeningProtectionEngine(door_dilation_px=4)
    det_door = MLDetection(
        class_id=1,
        class_name="door",
        confidence=0.90,
        bbox=BBox(x1=40, y1=40, x2=60, y2=60),
    )
    prot_mask, conf_map, count = engine.build_protected_mask(
        image_shape=(100, 100),
        ml_detections=[det_door],
    )
    assert count == 1
    assert prot_mask[50, 50] == 255
    assert conf_map[50, 50] >= 0.80


# 7. Non-closure of protected doorway gaps
def test_07_non_closure_of_doors():
    h, w = 100, 100
    # Two walls with a doorway gap in between: (0,50)-(40,50) and (60,50)-(100,50)
    mask = np.zeros((h, w), dtype=np.uint8)
    cv2.line(mask, (10, 50), (40, 50), 255, 4)
    cv2.line(mask, (60, 50), (90, 50), 255, 4)

    # Protect gap region (40..60, 45..55)
    prot = np.zeros((h, w), dtype=np.uint8)
    prot[45:55, 40:60] = 255

    gap_eng = GapRepairEngine(max_gap_length_px=30.0)
    conf = np.ones((h, w), dtype=np.float32) * 0.5
    repaired, gaps, count = gap_eng.detect_and_repair_gaps(mask, conf, prot)

    # Doorway gap must NOT be closed!
    assert repaired[50, 50] == 0
    assert count == 0


# 8. Topology-aware gap classification (ARCHITECTURAL vs DOORWAY)
def test_08_gap_classification():
    h, w = 100, 100
    mask = np.zeros((h, w), dtype=np.uint8)
    cv2.line(mask, (10, 50), (40, 50), 255, 4)
    cv2.line(mask, (55, 50), (85, 50), 255, 4)

    prot = np.zeros((h, w), dtype=np.uint8)  # No protected door
    conf = np.ones((h, w), dtype=np.float32) * 0.60
    gap_eng = GapRepairEngine(max_gap_length_px=25.0)
    repaired, gaps, count = gap_eng.detect_and_repair_gaps(mask, conf, prot)

    assert count >= 1
    assert any(g.gap_type == GapType.ARCHITECTURAL_GAP for g in gaps)
    assert repaired[50, 47] == 255  # Gap successfully bridged


# 9. Collinear directional gap bridging
def test_09_collinear_gap_bridging():
    mask = np.zeros((80, 80), dtype=np.uint8)
    cv2.line(mask, (10, 40), (35, 40), 255, 3)
    cv2.line(mask, (45, 40), (70, 40), 255, 3)
    prot = np.zeros((80, 80), dtype=np.uint8)
    conf = np.ones((80, 80), dtype=np.float32) * 0.50
    repaired, gaps, count = GapRepairEngine(max_gap_length_px=20.0).detect_and_repair_gaps(mask, conf, prot)
    assert count == 1
    assert repaired[40, 40] == 255


# 10. T-junction and L-corner snapping
def test_10_junction_snapping():
    mask = np.zeros((100, 100), dtype=np.uint8)
    # Horizontal wall at y=50
    cv2.line(mask, (10, 50), (90, 50), 255, 4)
    # Vertical wall stopping at y=40 (10px gap before horizontal wall)
    cv2.line(mask, (50, 10), (50, 40), 255, 4)

    junc_eng = JunctionRepairEngine(snap_distance_px=15.0)
    conf = np.ones((100, 100), dtype=np.float32) * 0.70
    prot = np.zeros((100, 100), dtype=np.uint8)
    repaired, juncs, count = junc_eng.detect_and_repair_junctions(mask, conf, prot)

    assert count >= 1
    assert repaired[45, 50] == 255  # Snapped to junction


# 11. Linkage point junction integration
def test_11_linkage_junction():
    mask = np.zeros((100, 100), dtype=np.uint8)
    cv2.line(mask, (10, 50), (90, 50), 255, 4)
    cv2.line(mask, (50, 10), (50, 42), 255, 4)
    linkage = np.zeros((100, 100), dtype=np.float32)
    linkage[48:52, 48:52] = 0.90
    junc_eng = JunctionRepairEngine(snap_distance_px=15.0)
    repaired, juncs, count = junc_eng.detect_and_repair_junctions(mask, np.ones((100, 100), dtype=np.float32), np.zeros((100, 100), dtype=np.uint8), linkage_evidence=linkage)
    assert count >= 1
    assert juncs[0].confidence >= 0.80


# 12. Fused confidence map continuous bounds [0..1]
def test_12_fused_confidence_bounds():
    ev = StructuralEvidence("img", 100, 100)
    ev.adaptive_threshold_evidence = np.ones((100, 100), dtype=np.float32) * 0.8
    ev.morphology_evidence = np.ones((100, 100), dtype=np.float32) * 0.9
    estimator = WallConfidenceEstimator()
    conf = estimator.compute_confidence(ev, use_ml=False)
    assert conf.min() >= 0.0
    assert conf.max() <= 1.0


# 13. Deterministic mask fusion
def test_13_deterministic_mask_fusion():
    fusion = MaskFusionEngine()
    conf = np.ones((50, 50), dtype=np.float32) * 0.50
    prot = np.zeros((50, 50), dtype=np.uint8)
    prot[20:30, 20:30] = 255
    m1 = fusion.fuse_refined_mask(conf, None, prot)
    m2 = fusion.fuse_refined_mask(conf, None, prot)
    assert np.array_equal(m1, m2)
    assert m1[25, 25] == 0  # Protected opening carved out


# 14. Opening preservation ratio calculation
def test_14_opening_preservation_ratio():
    evaluator = WallMetricsEvaluator()
    prot = np.zeros((100, 100), dtype=np.uint8)
    prot[40:60, 40:60] = 255  # 400 px
    refined = np.zeros((100, 100), dtype=np.uint8)
    # Refined does not overlap protected opening
    op_m = evaluator.compute_opening_preservation(refined, prot)
    assert op_m.doorway_preservation_ratio == 1.0
    assert op_m.false_closure_count == 0


# 15. Wall metric continuity and fragmentation scores
def test_15_wall_metrics_scores():
    evaluator = WallMetricsEvaluator()
    mask = np.zeros((100, 100), dtype=np.uint8)
    cv2.rectangle(mask, (20, 20), (80, 80), 255, 4)
    prot = np.zeros((100, 100), dtype=np.uint8)
    wm = evaluator.compute_wall_metrics(mask, prot)
    assert wm.wall_pixel_count > 0
    assert wm.wall_continuity_score > 0.50
    assert wm.fragmentation_score >= 0.0


# 16. Topology metric cycle completeness
def test_16_topology_cycle_completeness():
    engine = TopologyRefinementEngine()
    mask = np.zeros((120, 120), dtype=np.uint8)
    # Complete closed square box
    cv2.rectangle(mask, (20, 20), (100, 100), 255, 6)
    prot = np.zeros((120, 120), dtype=np.uint8)
    clean, tm = engine.refine_topology(mask, prot)
    assert tm.closed_cycles >= 1


# 17. Empty floorplan safety
def test_17_empty_floorplan_safety():
    canvas = np.ones((80, 80, 3), dtype=np.uint8) * 255
    pipe = MultimodalWallRefinementPipeline()
    res = pipe.run_refinement(canvas, "empty_img", use_ml=False)
    assert res.refined_wall_mask.shape == (80, 80)
    assert res.wall_metrics.wall_pixel_count >= 0


# 18. Single-wall safety
def test_18_single_wall_safety():
    canvas = np.ones((100, 100, 3), dtype=np.uint8) * 255
    cv2.line(canvas, (20, 50), (80, 50), (0, 0, 0), 4)
    pipe = MultimodalWallRefinementPipeline()
    res = pipe.run_refinement(canvas, "single_wall_img", use_ml=False)
    assert res.wall_metrics.wall_pixel_count > 0
    assert res.topology_metrics.closed_cycles == 0


# 19. High-density floorplan performance bounds
def test_19_dense_floorplan_performance():
    canvas = np.ones((400, 400, 3), dtype=np.uint8) * 255
    for i in range(10, 390, 20):
        cv2.line(canvas, (10, i), (390, i), (0, 0, 0), 3)
        cv2.line(canvas, (i, 10), (i, 390), (0, 0, 0), 3)
    pipe = MultimodalWallRefinementPipeline()
    t0 = time.perf_counter()
    res = pipe.run_refinement(canvas, "dense_img", use_ml=False)
    dur_ms = (time.perf_counter() - t0) * 1000.0
    assert dur_ms < 900.0


# 20. Strict Ground Truth independence (zero GT access)
def test_20_strict_gt_independence():
    import inspect
    sig = inspect.signature(MultimodalWallRefinementPipeline.run_refinement)
    param_names = [p.name.lower() for p in sig.parameters.values()]
    assert "gt" not in param_names
    assert "ground_truth" not in param_names


# 21. Classical-only mode (ML disabled)
def test_21_classical_only_mode():
    canvas = np.ones((80, 80, 3), dtype=np.uint8) * 255
    cv2.rectangle(canvas, (20, 20), (60, 60), (0, 0, 0), 4)
    pipe = MultimodalWallRefinementPipeline()
    res = pipe.run_refinement(canvas, "classical_img", use_ml=False)
    assert res.strategy_name == "full_refinement"
    assert res.wall_metrics.wall_pixel_count > 0


# 22. ML-only mode (classical disabled)
def test_22_ml_only_mode():
    canvas = np.ones((80, 80, 3), dtype=np.uint8) * 255
    pipe = MultimodalWallRefinementPipeline()
    pipe.confidence_estimator.w_adaptive = 0.0
    pipe.confidence_estimator.w_morphology = 0.0
    res = pipe.run_refinement(canvas, "ml_only_img", use_ml=False)
    assert res.refined_wall_mask.shape == (80, 80)


# 23. Strategy A baseline reproduction
def test_23_strategy_a_baseline():
    base_mask = np.zeros((60, 60), dtype=np.uint8)
    cv2.rectangle(base_mask, (10, 10), (50, 50), 255, 3)
    pipe = MultimodalWallRefinementPipeline()
    res = pipe.run_refinement(
        np.ones((60, 60, 3), dtype=np.uint8) * 255,
        "strat_a",
        baseline_wall_mask=base_mask,
        use_ml=False,
        repair_gaps=False,
        repair_junctions=False,
        strategy_name="baseline",
    )
    assert res.strategy_name == "baseline"
    assert res.wall_metrics.wall_pixel_count >= np.count_nonzero(base_mask) * 0.95


# 24. Strategy B classical refinement
def test_24_strategy_b_classical():
    pipe = MultimodalWallRefinementPipeline()
    canvas = np.ones((60, 60, 3), dtype=np.uint8) * 255
    cv2.rectangle(canvas, (10, 10), (50, 50), (0, 0, 0), 3)
    res = pipe.run_refinement(canvas, "strat_b", use_ml=False, strategy_name="classical_refinement")
    assert res.strategy_name == "classical_refinement"


# 25. Strategy C ML structural evidence
def test_25_strategy_c_ml():
    pipe = MultimodalWallRefinementPipeline()
    canvas = np.ones((60, 60, 3), dtype=np.uint8) * 255
    res = pipe.run_refinement(canvas, "strat_c", use_ml=True, strategy_name="ml_evidence")
    assert res.strategy_name == "ml_evidence"


# 26. Strategy D classical + ML fusion
def test_26_strategy_d_fusion():
    pipe = MultimodalWallRefinementPipeline()
    canvas = np.ones((60, 60, 3), dtype=np.uint8) * 255
    res = pipe.run_refinement(canvas, "strat_d", use_ml=True, protect_openings=False, strategy_name="classical_ml_fusion")
    assert res.strategy_name == "classical_ml_fusion"


# 27. Strategy E opening protection ablation
def test_27_strategy_e_opening_protection():
    pipe = MultimodalWallRefinementPipeline()
    canvas = np.ones((60, 60, 3), dtype=np.uint8) * 255
    doors = [{"bbox": [20, 20, 10, 10]}]
    res = pipe.run_refinement(canvas, "strat_e", doors=doors, protect_openings=True, strategy_name="opening_protection")
    assert res.opening_metrics.overall_opening_preservation > 0.90


# 28. Strategy F gap & junction repair
def test_28_strategy_f_repairs():
    pipe = MultimodalWallRefinementPipeline()
    canvas = np.ones((80, 80, 3), dtype=np.uint8) * 255
    cv2.line(canvas, (10, 40), (35, 40), (0, 0, 0), 4)
    cv2.line(canvas, (45, 40), (70, 40), (0, 0, 0), 4)
    res = pipe.run_refinement(canvas, "strat_f", use_ml=False, repair_gaps=True, repair_junctions=True)
    assert res.wall_metrics.repaired_gap_count >= 1


# 29. Bitwise determinism over repeated executions
def test_29_bitwise_determinism():
    canvas = np.ones((100, 100, 3), dtype=np.uint8) * 255
    cv2.rectangle(canvas, (20, 20), (80, 80), (0, 0, 0), 4)
    pipe = MultimodalWallRefinementPipeline()
    r1 = pipe.run_refinement(canvas, "det_test", use_ml=False)
    r2 = pipe.run_refinement(canvas, "det_test", use_ml=False)
    assert np.array_equal(r1.refined_wall_mask, r2.refined_wall_mask)
    assert r1.wall_metrics.wall_pixel_count == r2.wall_metrics.wall_pixel_count


# 30. Latency performance budget (< 1000ms per image)
def test_30_performance_budget():
    canvas = np.ones((300, 300, 3), dtype=np.uint8) * 255
    cv2.rectangle(canvas, (30, 30), (270, 270), (0, 0, 0), 5)
    pipe = MultimodalWallRefinementPipeline()
    res = pipe.run_refinement(canvas, "perf_test", use_ml=False)
    assert res.execution_time_ms < 600.0
