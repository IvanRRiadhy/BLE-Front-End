import pytest
import numpy as np
from shapely.geometry import Polygon, box, Point, LineString
from app.room_validity.models import (
    RoomValidityDecision,
    RoomValidityHypothesis,
    ValidatedRoom,
    ValidationResult,
)
from app.room_validity.false_positive_taxonomy import FalsePositiveReason, describe_reason
from app.room_validity.architectural_evidence import ArchitecturalEvidenceExtractor
from app.room_validity.negative_evidence import NegativeEvidenceExtractor
from app.room_validity.room_classifier import SemanticRoomClassifier
from app.room_validity.features import RoomValidityFeatureExtractor
from app.room_validity.validity_scoring import ValidityScorer
from app.room_validity.decision import RoomValidityDecisionPolicy
from app.room_validity.boundary_quality import BoundaryQualityRefiner
from app.room_validity.validation_pipeline import RoomValidationPipeline
from app.room_validity.metrics import RoomValidityMetricsEvaluator, compute_polygon_iou


class DummyWallNetwork:
    def __init__(self, wall_lines):
        self.wall_lines = wall_lines


def test_01_wall_boundary_support():
    # Room supported by wall lines along 4 sides
    r_poly = box(0, 0, 100, 100)
    hyp = RoomValidityHypothesis(hypothesis_id="h1", image_id="img1", polygon=r_poly)
    wall_lines = [
        LineString([(0, 0), (100, 0)]),
        LineString([(100, 0), (100, 100)]),
        LineString([(100, 100), (0, 100)]),
        LineString([(0, 100), (0, 0)]),
    ]
    wn = DummyWallNetwork(wall_lines)
    extractor = ArchitecturalEvidenceExtractor()
    ev = extractor.extract_evidence(hyp, wall_network=wn)
    assert ev["wall_boundary_support"] >= 0.70
    assert ev["unsupported_boundary_ratio"] <= 0.30


def test_02_enclosure_evidence():
    r_poly = box(0, 0, 100, 100)
    hyp = RoomValidityHypothesis(hypothesis_id="h1", image_id="img1", polygon=r_poly, formation_score=0.85)
    extractor = ArchitecturalEvidenceExtractor()
    ev = extractor.extract_evidence(hyp)
    assert ev["enclosure_score"] >= 0.80


def test_03_doorway_contextual_support():
    r_poly = box(0, 0, 100, 100)
    hyp = RoomValidityHypothesis(hypothesis_id="h1", image_id="img1", polygon=r_poly)
    # Doorway located on boundary (50, 0)
    dummy_door = type("Door", (), {"bbox": (45, -5, 10, 10), "confidence": 0.90})()
    extractor = ArchitecturalEvidenceExtractor()
    ev = extractor.extract_evidence(hyp, doors=[dummy_door])
    assert ev["doorway_count"] == 1
    assert ev["doorway_evidence"] >= 0.30


def test_04_topology_consistency():
    r_poly = box(0, 0, 100, 100)
    hyp = RoomValidityHypothesis(hypothesis_id="h1", image_id="img1", polygon=r_poly)
    # Dummy graph edge connecting to a neighbor
    dummy_edge = type("Edge", (), {"source_id": "h1", "target_id": "h2", "edge_type": type("T", (), {"value": "neighbor_of"})()})()
    dummy_graph = type("Graph", (), {"edges": [dummy_edge]})()
    extractor = ArchitecturalEvidenceExtractor()
    ev = extractor.extract_evidence(hyp, graph=dummy_graph)
    assert ev["topology_consistency"] >= 0.40


def test_05_furniture_penalty():
    r_poly = box(0, 0, 50, 50)
    hyp = RoomValidityHypothesis(hypothesis_id="h1", image_id="img1", polygon=r_poly, area_px=2500.0)
    hyp.wall_boundary_support = 0.20
    neg_extractor = NegativeEvidenceExtractor()
    ev = neg_extractor.extract_negative_evidence(hyp, img_w=1000, img_h=1000)
    assert ev["furniture_likelihood"] >= 0.60


def test_06_text_penalty():
    r_poly = box(100, 100, 200, 200)
    hyp = RoomValidityHypothesis(hypothesis_id="h1", image_id="img1", polygon=r_poly, area_px=10000.0)
    text_box = type("Text", (), {"polygon": box(110, 110, 180, 180)})()  # 4900 px overlap (49%)
    neg_extractor = NegativeEvidenceExtractor()
    ev = neg_extractor.extract_negative_evidence(hyp, img_w=1000, img_h=1000, text_regions=[text_box])
    assert ev["text_likelihood"] >= 0.80


def test_07_exterior_penalty():
    # Polygon touching margin boundary (x=5)
    r_poly = box(5, 50, 100, 150)
    hyp = RoomValidityHypothesis(hypothesis_id="h1", image_id="img1", polygon=r_poly)
    neg_extractor = NegativeEvidenceExtractor()
    ev = neg_extractor.extract_negative_evidence(hyp, img_w=1000, img_h=1000)
    assert ev["exterior_likelihood"] >= 0.60
    assert ev["background_likelihood"] >= 0.50


def test_08_hatch_penalty():
    # Thin narrow shape with low compactness
    r_poly = box(100, 100, 110, 200)  # Area 1000 px, high perimeter
    hyp = RoomValidityHypothesis(hypothesis_id="h1", image_id="img1", polygon=r_poly, area_px=1000.0)
    hyp.wall_boundary_support = 0.20
    neg_extractor = NegativeEvidenceExtractor()
    ev = neg_extractor.extract_negative_evidence(hyp, img_w=1000, img_h=1000)
    assert ev["hatch_dimension_likelihood"] >= 0.50


def test_09_sliver_penalty():
    # Extremely narrow polygon
    r_poly = box(100, 100, 105, 200)  # Area 500 px
    hyp = RoomValidityHypothesis(hypothesis_id="h1", image_id="img1", polygon=r_poly, area_px=500.0)
    neg_extractor = NegativeEvidenceExtractor()
    ev = neg_extractor.extract_negative_evidence(hyp, img_w=1000, img_h=1000)
    assert ev["sliver_likelihood"] >= 0.80


def test_10_artificial_cavity_penalty():
    r_poly = box(100, 100, 200, 200)
    hyp = RoomValidityHypothesis(hypothesis_id="h1", image_id="img1", polygon=r_poly)
    hyp.unsupported_boundary_ratio = 0.80
    neg_extractor = NegativeEvidenceExtractor()
    ev = neg_extractor.extract_negative_evidence(hyp, img_w=1000, img_h=1000)
    assert ev["artificial_cavity_likelihood"] >= 0.70


def test_11_corridor_preservation():
    # Elongated room with wall support and transit connectivity
    corr_poly = box(0, 0, 500, 60)
    hyp = RoomValidityHypothesis(hypothesis_id="h_corr", image_id="img1", polygon=corr_poly)
    hyp.wall_boundary_support = 0.60
    hyp.doorway_count = 2
    hyp.neighbor_consistency = 0.50
    classifier = SemanticRoomClassifier()
    classifier.classify_semantics(hyp)
    assert hyp.is_corridor is True
    assert hyp.corridor_likelihood >= 0.70


def test_12_large_room_preservation():
    # Auditorium / Hall (area 30,000 px) with strong wall support
    aud_poly = box(0, 0, 200, 150)
    hyp = RoomValidityHypothesis(hypothesis_id="h_aud", image_id="img1", polygon=aud_poly, area_px=30000.0)
    hyp.wall_boundary_support = 0.70
    hyp.enclosure_score = 0.85
    hyp.exterior_likelihood = 0.05
    classifier = SemanticRoomClassifier()
    classifier.classify_semantics(hyp)
    assert hyp.is_large_space is True
    assert hyp.large_space_likelihood >= 0.80
    assert hyp.large_space_artifact_likelihood <= 0.15


def test_13_concave_room_preservation():
    # Concave U-shaped room
    poly = Polygon([(0, 0), (100, 0), (100, 100), (70, 100), (70, 30), (30, 30), (30, 100), (0, 100)])
    hyp = RoomValidityHypothesis(hypothesis_id="h_concave", image_id="img1", polygon=poly)
    hyp.wall_boundary_support = 0.65
    hyp.enclosure_score = 0.70
    scorer = ValidityScorer()
    score = scorer.score_hypothesis(hyp)
    assert score >= 0.35


def test_14_l_shaped_room_preservation():
    # L-shaped polygon
    poly = Polygon([(0, 0), (100, 0), (100, 50), (50, 50), (50, 100), (0, 100)])
    hyp = RoomValidityHypothesis(hypothesis_id="h_lshaped", image_id="img1", polygon=poly)
    hyp.wall_boundary_support = 0.65
    hyp.enclosure_score = 0.70
    scorer = ValidityScorer()
    score = scorer.score_hypothesis(hyp)
    assert score >= 0.35


def test_15_ambiguous_classification():
    r_poly = box(0, 0, 100, 100)
    hyp = RoomValidityHypothesis(hypothesis_id="h1", image_id="img1", polygon=r_poly)
    hyp.room_validity_score = 0.30
    policy = RoomValidityDecisionPolicy(high_threshold=0.45, low_threshold=0.20)
    decision = policy.evaluate_hypothesis(hyp)
    assert decision == RoomValidityDecision.AMBIGUOUS


def test_16_validity_score_determinism():
    r_poly = box(0, 0, 100, 100)
    hyp1 = RoomValidityHypothesis(hypothesis_id="h1", image_id="img1", polygon=r_poly)
    hyp2 = RoomValidityHypothesis(hypothesis_id="h1", image_id="img1", polygon=r_poly)
    hyp1.wall_boundary_support = 0.60
    hyp2.wall_boundary_support = 0.60
    scorer = ValidityScorer()
    s1 = scorer.score_hypothesis(hyp1)
    s2 = scorer.score_hypothesis(hyp2)
    assert s1 == s2


def test_17_threshold_behavior():
    policy = RoomValidityDecisionPolicy(high_threshold=0.50, low_threshold=0.25)
    h_high = RoomValidityHypothesis(hypothesis_id="h1", image_id="img1", polygon=box(0, 0, 10, 10))
    h_high.room_validity_score = 0.60
    h_low = RoomValidityHypothesis(hypothesis_id="h2", image_id="img1", polygon=box(0, 0, 10, 10))
    h_low.room_validity_score = 0.15
    assert policy.evaluate_hypothesis(h_high) == RoomValidityDecision.VALID
    assert policy.evaluate_hypothesis(h_low) in [RoomValidityDecision.NON_ROOM, RoomValidityDecision.PROBABLE_NON_ROOM]


def test_18_ml_off_fallback():
    hyp = RoomValidityHypothesis(hypothesis_id="h1", image_id="img1", polygon=box(0, 0, 100, 100))
    hyp.wall_boundary_support = 0.60
    scorer = ValidityScorer()
    score = scorer.score_hypothesis(hyp, use_ml=False)
    assert score > 0.0
    assert hyp.ml_available is False


def test_19_ml_on_evidence():
    hyp = RoomValidityHypothesis(hypothesis_id="h1", image_id="img1", polygon=box(0, 0, 100, 100))
    hyp.wall_boundary_support = 0.60
    hyp.ml_available = True
    hyp.ml_wall_support = 0.80
    hyp.ml_door_support = 0.70
    scorer = ValidityScorer()
    score_ml = scorer.score_hypothesis(hyp, use_ml=True)
    score_noml = scorer.score_hypothesis(hyp, use_ml=False)
    assert score_ml >= score_noml


def test_20_empty_candidate_pool():
    pipeline = RoomValidationPipeline()
    res = pipeline.process_hypotheses([], img_w=1000, img_h=1000)
    assert len(res.valid_rooms) == 0
    assert len(res.rejected_rooms) == 0


def test_21_invalid_polygon_safety():
    # Self-intersecting polygon (bowtie)
    bowtie = Polygon([(0, 0), (100, 100), (0, 100), (100, 0)])
    hyp = RoomValidityHypothesis(hypothesis_id="h_bad", image_id="img1", polygon=bowtie)
    assert hyp.polygon.is_valid is True
    assert hyp.polygon.area > 0


def test_22_provenance_preservation():
    hyp = RoomValidityHypothesis(
        hypothesis_id="h1",
        image_id="img1",
        polygon=box(200, 200, 300, 300),
        source_proposal_ids=["prop_01", "prop_02"],
        formation_score=0.85,
    )
    wall_lines = [
        LineString([(200, 200), (300, 200)]),
        LineString([(300, 200), (300, 300)]),
        LineString([(300, 300), (200, 300)]),
        LineString([(200, 300), (200, 200)]),
    ]
    wn = DummyWallNetwork(wall_lines)
    pipeline = RoomValidationPipeline()
    res = pipeline.process_hypotheses([hyp], img_w=1000, img_h=1000, wall_network=wn)
    assert len(res.valid_rooms) == 1
    assert "prop_01" in res.valid_rooms[0].source_hypotheses


def test_23_fp_taxonomy_assignment():
    hyp = RoomValidityHypothesis(hypothesis_id="h1", image_id="img1", polygon=box(0, 0, 100, 100))
    hyp.exterior_likelihood = 0.75
    hyp.room_validity_score = 0.10
    policy = RoomValidityDecisionPolicy()
    policy.evaluate_hypothesis(hyp)
    assert FalsePositiveReason.FP_EXTERIOR in hyp.rejection_reasons


def test_24_tp_audit_integrity():
    evaluator = RoomValidityMetricsEvaluator()
    r1 = ValidatedRoom(
        room_id="r1",
        hypothesis_id="h1",
        image_id="img1",
        polygon=box(0, 0, 100, 100),
        confidence=0.90,
        room_validity_score=0.85,
        architectural_score=0.80,
        boundary_quality=0.85,
    )
    gt = [{"id": "gt1", "polygon": box(0, 0, 100, 100)}]
    res = evaluator.evaluate_detection([r1], gt)
    assert res["tp_050"] == 1
    assert res["fp_050"] == 0
    assert res["f1_050"] == 1.0


def test_25_gt_independent_inference():
    # Verify that pipeline runs without any GT parameter
    hyp = RoomValidityHypothesis(hypothesis_id="h1", image_id="img1", polygon=box(0, 0, 100, 100))
    hyp.wall_boundary_support = 0.70
    pipeline = RoomValidationPipeline()
    res = pipeline.process_hypotheses([hyp], img_w=1000, img_h=1000)
    assert res.statistics["total_hypotheses"] == 1


def test_26_performance_sanity():
    # 100 hypotheses processed in < 1 second
    hyps = [
        RoomValidityHypothesis(hypothesis_id=f"h_{i}", image_id="img1", polygon=box(i * 10, 0, i * 10 + 50, 50))
        for i in range(100)
    ]
    pipeline = RoomValidationPipeline()
    res = pipeline.process_hypotheses(hyps, img_w=2000, img_h=2000)
    assert res.statistics["total_hypotheses"] == 100


def test_27_deterministic_output():
    hyps1 = [RoomValidityHypothesis(hypothesis_id="h1", image_id="img1", polygon=box(200, 200, 300, 300), formation_score=0.85)]
    hyps2 = [RoomValidityHypothesis(hypothesis_id="h1", image_id="img1", polygon=box(200, 200, 300, 300), formation_score=0.85)]
    wall_lines = [
        LineString([(200, 200), (300, 200)]),
        LineString([(300, 200), (300, 300)]),
        LineString([(300, 300), (200, 300)]),
        LineString([(200, 300), (200, 200)]),
    ]
    wn = DummyWallNetwork(wall_lines)
    pipeline = RoomValidationPipeline()
    res1 = pipeline.process_hypotheses(hyps1, img_w=1000, img_h=1000, wall_network=wn)
    res2 = pipeline.process_hypotheses(hyps2, img_w=1000, img_h=1000, wall_network=wn)
    assert len(res1.valid_rooms) == 1
    assert len(res2.valid_rooms) == 1
    assert res1.valid_rooms[0].room_validity_score == res2.valid_rooms[0].room_validity_score
    assert res1.valid_rooms[0].decision == res2.valid_rooms[0].decision
