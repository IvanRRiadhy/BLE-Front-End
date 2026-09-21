"""
Unit & Integration Tests for Phase 2.9.1 — Controlled Production Integration
Tests all 25 required specifications:
- Configuration (1-3)
- Providers (4-8)
- Fusion ranking & budgeting (9-12)
- Failure handling & graceful degradation (13-18)
- Model lifecycle & thread safety (19-20)
- Output schemas & diagnostics (21-23)
- Regression reproduction (24-25)
"""
import os
import pytest
import numpy as np
from pathlib import Path
from unittest.mock import patch, MagicMock

from app.models import DetectionConfig, MLFusionConfig, AreaPoint, RecoveredRoomHypothesis
from app.detector import FloorplanDetector
from ml.models import MLDetection, BBox
from ml.providers import (
    StructuralEvidenceProvider,
    StructuralEvidenceResult,
    DisabledStructuralEvidenceProvider,
    RTDETRStructuralEvidenceProvider,
    get_structural_evidence_provider,
)
from fusion.evaluator import FusionEvaluator
from fusion.strategies import get_strategies_for_group


# ---------------------------------------------------------------------------
# 1-3. Configuration Tests
# ---------------------------------------------------------------------------

def test_01_ml_disabled_by_default():
    """ML fusion must be disabled by default."""
    # Ensure env vars are unset
    with patch.dict(os.environ, {}, clear=True):
        cfg = DetectionConfig()
        assert cfg.ml_fusion is not None
        assert cfg.ml_fusion.enabled is False
        assert cfg.ml_fusion.provider == "rtdetr"


def test_02_door_weight_defaults_to_010():
    """Door weight defaults to 0.10 (Phase 2.9.0 door_b10 validated strategy)."""
    cfg = MLFusionConfig(enabled=True)
    assert cfg.door_weight == 0.10
    assert cfg.doorWeight == 0.10
    assert cfg.structural_weight == 0.0
    assert cfg.cavity_weight == 0.0
    assert cfg.fallback_mode == "classical"


def test_03_configuration_overrides():
    """Configuration overrides via environment variable and dictionary work."""
    with patch.dict(os.environ, {"BIONIC_ML_FUSION_ENABLED": "true"}):
        cfg = DetectionConfig()
        assert cfg.ml_fusion.enabled is True

    with patch.dict(os.environ, {"ML_FUSION_ENABLED": "1"}):
        cfg = DetectionConfig()
        assert cfg.ml_fusion.enabled is True

    custom = MLFusionConfig.from_dict({
        "enabled": True,
        "doorWeight": 0.15,
        "device": "cpu",
        "cpuFallback": True,
        "inferenceTimeoutMs": 8000,
    })
    assert custom.enabled is True
    assert custom.door_weight == 0.15
    assert custom.device == "cpu"
    assert custom.cpu_fallback is True
    assert custom.inference_timeout_ms == 8000


# ---------------------------------------------------------------------------
# 4-8. Provider Tests
# ---------------------------------------------------------------------------

def test_04_provider_interface():
    """Provider interface adheres to abstract contract."""
    class DummyProvider(StructuralEvidenceProvider):
        def is_available(self) -> bool:
            return True
        def extract_evidence(self, image, candidates, image_shape=None):
            return StructuralEvidenceResult(provider_name="dummy", ml_available=True)
        def get_diagnostics(self):
            return {"provider": "dummy"}

    p = DummyProvider()
    assert p.is_available() is True
    res = p.extract_evidence(np.zeros((100, 100), dtype=np.uint8), [])
    assert res.provider_name == "dummy"
    assert res.ml_available is True


def test_05_disabled_provider_works():
    """Disabled provider returns non-functional empty result with zero latency."""
    p = DisabledStructuralEvidenceProvider()
    assert p.is_available() is False
    res = p.extract_evidence(np.zeros((100, 100), dtype=np.uint8), [])
    assert res.ml_enabled is False
    assert res.ml_available is False
    assert len(res.detections) == 0


def test_06_rtdetr_provider_factory_and_loading():
    """RT-DETR provider initializes correctly through factory."""
    cfg = MLFusionConfig(enabled=True, provider="rtdetr")
    p = get_structural_evidence_provider(cfg)
    assert isinstance(p, RTDETRStructuralEvidenceProvider)
    assert p.requested_device == "auto"
    diag = p.get_diagnostics()
    assert diag["provider"] == "rtdetr"


def test_07_missing_model_gracefully_falls_back():
    """If weights file does not exist, provider degrades gracefully without crashing."""
    p = RTDETRStructuralEvidenceProvider(weights_path=Path("non_existent_weights.pt"))
    assert p.is_available() is False
    res = p.extract_evidence(np.zeros((100, 100, 3), dtype=np.uint8), [])
    assert res.ml_fallback is True
    assert "not_found" in res.ml_fallback_reason or "weights" in res.ml_fallback_reason


def test_08_invalid_ml_input_gracefully_falls_back():
    """Passing None or empty image to provider falls back gracefully."""
    p = RTDETRStructuralEvidenceProvider()
    res1 = p.extract_evidence(None, [])
    assert res1.ml_fallback is True
    assert res1.ml_fallback_reason == "empty_or_invalid_image"

    res2 = p.extract_evidence(np.array([]), [])
    assert res2.ml_fallback is True


# ---------------------------------------------------------------------------
# 9-12. Fusion Ranking & Budgeting Tests
# ---------------------------------------------------------------------------

@pytest.fixture
def test_candidates():
    c1 = RecoveredRoomHypothesis(
        recovery_id="cand_1",
        polygon=[AreaPoint(10, 10), AreaPoint(50, 10), AreaPoint(50, 50), AreaPoint(10, 50)],
        source="wall_enclosure",
        confidence=0.60,
        wall_support=0.50,
    )
    c2 = RecoveredRoomHypothesis(
        recovery_id="cand_2",
        polygon=[AreaPoint(100, 100), AreaPoint(200, 100), AreaPoint(200, 200), AreaPoint(100, 200)],
        source="wall_enclosure",
        confidence=0.58,
        wall_support=0.50,
    )
    return [c1, c2]


def test_09_ml_disabled_reproduces_classical_ranking(test_candidates):
    """When ML is disabled, ranking is purely based on classical confidence."""
    from app.recovery_precision import RecoveryPrecisionEngine, RecoveryDecision
    cfg = DetectionConfig(ml_fusion=MLFusionConfig(enabled=False))
    engine = RecoveryPrecisionEngine(cfg)

    def mock_score(rec, *args, **kwargs):
        conf = 0.60 if rec.id == "cand_1" else 0.58
        return RecoveryDecision(
            candidate_id=rec.id, source=rec.source, accepted=True, confidence=conf,
            wall_support=0.50, enclosure_score=0.90,
        )

    with patch.object(engine, "_score_candidate", side_effect=mock_score), \
         patch.object(engine, "_apply_source_thresholds_with_limits", return_value=(True, None, 0.40, 0.25)):
        accepted, rejected, decisions = engine.evaluate_and_filter(
            accepted_primary=[],
            recovered_candidates=test_candidates,
            wall_mask=np.zeros((300, 300), dtype=np.uint8),
            wall_network=None,
            footprint_mask=None,
            img_w=300,
            img_h=300,
        )
    # Both candidates keep baseline ordering
    d_map = {d.candidate_id: d for d in decisions}
    assert d_map["cand_1"].baseline_rank == 1
    assert d_map["cand_2"].baseline_rank == 2
    assert d_map["cand_1"].fusion_rank == 1
    assert d_map["cand_2"].fusion_rank == 2
    assert d_map["cand_1"].promoted is False
    assert d_map["cand_2"].promoted is False


def test_10_door_evidence_modifies_ranking_correctly(test_candidates):
    """Door evidence adds +0.10 * doorConnection to fusionScore."""
    from app.recovery_precision import RecoveryPrecisionEngine, RecoveryDecision
    cfg = DetectionConfig(ml_fusion=MLFusionConfig(enabled=True, door_weight=0.10))
    engine = RecoveryPrecisionEngine(cfg)

    # Injected evidence: cand_2 has strong door connection, cand_1 has zero
    mock_res = StructuralEvidenceResult(
        ml_enabled=True,
        ml_available=True,
        door_evidence={"cand_1": 0.0, "cand_2": 0.80},
    )

    def mock_score(rec, *args, **kwargs):
        conf = 0.60 if rec.id == "cand_1" else 0.58
        return RecoveryDecision(
            candidate_id=rec.id, source=rec.source, accepted=True, confidence=conf,
            wall_support=0.50, enclosure_score=0.90,
        )

    with patch.object(engine, "_score_candidate", side_effect=mock_score), \
         patch.object(engine, "_apply_source_thresholds_with_limits", return_value=(True, None, 0.40, 0.25)):
        _, _, decisions = engine.evaluate_and_filter(
            accepted_primary=[],
            recovered_candidates=test_candidates,
            wall_mask=np.zeros((300, 300), dtype=np.uint8),
            wall_network=None,
            footprint_mask=None,
            img_w=300,
            img_h=300,
            ml_evidence_result=mock_res,
        )

    d_map = {d.candidate_id: d for d in decisions}
    # cand_1: conf=0.60, door=0.0 -> fusionScore=0.60
    # cand_2: conf=0.58, door=0.80 -> fusionScore = 0.58 + 0.10*0.80 = 0.66
    assert pytest.approx(d_map["cand_1"].fusion_score, rel=1e-3) == 0.60
    assert pytest.approx(d_map["cand_2"].fusion_score, rel=1e-3) == 0.66


def test_11_candidate_with_door_evidence_promoted(test_candidates):
    """Candidate with door evidence is promoted upward past candidate without door evidence."""
    from app.recovery_precision import RecoveryPrecisionEngine, RecoveryDecision
    cfg = DetectionConfig(ml_fusion=MLFusionConfig(enabled=True, door_weight=0.10))
    engine = RecoveryPrecisionEngine(cfg)

    mock_res = StructuralEvidenceResult(
        ml_enabled=True,
        ml_available=True,
        door_evidence={"cand_1": 0.0, "cand_2": 0.80},
    )

    def mock_score(rec, *args, **kwargs):
        conf = 0.60 if rec.id == "cand_1" else 0.58
        return RecoveryDecision(
            candidate_id=rec.id, source=rec.source, accepted=True, confidence=conf,
            wall_support=0.50, enclosure_score=0.90,
        )

    with patch.object(engine, "_score_candidate", side_effect=mock_score), \
         patch.object(engine, "_apply_source_thresholds_with_limits", return_value=(True, None, 0.40, 0.25)):
        _, _, decisions = engine.evaluate_and_filter(
            accepted_primary=[],
            recovered_candidates=test_candidates,
            wall_mask=np.zeros((300, 300), dtype=np.uint8),
            wall_network=None,
            footprint_mask=None,
            img_w=300,
            img_h=300,
            ml_evidence_result=mock_res,
        )

    d_map = {d.candidate_id: d for d in decisions}
    # cand_2 moved from baseline_rank 2 to fusion_rank 1
    assert d_map["cand_2"].baseline_rank == 2
    assert d_map["cand_2"].fusion_rank == 1
    assert d_map["cand_2"].promoted is True

    # cand_1 moved from baseline_rank 1 to fusion_rank 2
    assert d_map["cand_1"].baseline_rank == 1
    assert d_map["cand_1"].fusion_rank == 2
    assert d_map["cand_1"].demoted is True


def test_12_candidate_without_door_evidence_not_promoted(test_candidates):
    """Candidate with zero door evidence is not artificially promoted."""
    from app.recovery_precision import RecoveryPrecisionEngine, RecoveryDecision
    cfg = DetectionConfig(ml_fusion=MLFusionConfig(enabled=True, door_weight=0.10))
    engine = RecoveryPrecisionEngine(cfg)

    mock_res = StructuralEvidenceResult(
        ml_enabled=True,
        ml_available=True,
        door_evidence={"cand_1": 0.0, "cand_2": 0.0},
    )

    def mock_score(rec, *args, **kwargs):
        conf = 0.60 if rec.id == "cand_1" else 0.58
        return RecoveryDecision(
            candidate_id=rec.id, source=rec.source, accepted=True, confidence=conf,
            wall_support=0.50, enclosure_score=0.90,
        )

    with patch.object(engine, "_score_candidate", side_effect=mock_score), \
         patch.object(engine, "_apply_source_thresholds_with_limits", return_value=(True, None, 0.40, 0.25)):
        _, _, decisions = engine.evaluate_and_filter(
            accepted_primary=[],
            recovered_candidates=test_candidates,
            wall_mask=np.zeros((300, 300), dtype=np.uint8),
            wall_network=None,
            footprint_mask=None,
            img_w=300,
            img_h=300,
            ml_evidence_result=mock_res,
        )

    d_map = {d.candidate_id: d for d in decisions}
    assert d_map["cand_1"].promoted is False
    assert d_map["cand_2"].promoted is False
    assert d_map["cand_1"].fusion_rank == d_map["cand_1"].baseline_rank
    assert d_map["cand_2"].fusion_rank == d_map["cand_2"].baseline_rank


# ---------------------------------------------------------------------------
# 13-18. Failure Handling & Graceful Degradation Tests
# ---------------------------------------------------------------------------

def test_13_cuda_unavailable_fallback():
    """When CUDA is requested but unavailable, provider falls back cleanly."""
    with patch("torch.cuda.is_available", return_value=False):
        p = RTDETRStructuralEvidenceProvider(device="cuda")
        res = p.extract_evidence(np.zeros((100, 100, 3), dtype=np.uint8), [])
        assert res.ml_fallback is True
        assert "cuda_requested_but_unavailable" in res.ml_fallback_reason


def test_14_cpu_fallback_disabled():
    """When auto device has no CUDA and cpu_fallback=False, falls back cleanly."""
    with patch("torch.cuda.is_available", return_value=False):
        p = RTDETRStructuralEvidenceProvider(device="auto", cpu_fallback=False)
        res = p.extract_evidence(np.zeros((100, 100, 3), dtype=np.uint8), [])
        assert res.ml_fallback is True
        assert "cpu_fallback_disabled" in res.ml_fallback_reason


def test_15_cpu_fallback_enabled():
    """When cpu_fallback=True, device resolves to CPU without falling back."""
    with patch("torch.cuda.is_available", return_value=False):
        p = RTDETRStructuralEvidenceProvider(device="auto", cpu_fallback=True)
        dev, err = p._resolve_device()
        assert dev == "cpu"
        assert err is None


def test_16_inference_timeout_handling():
    """Inference exceeding timeout records timeout fallback without crashing."""
    p = RTDETRStructuralEvidenceProvider(timeout_ms=0)  # 0ms timeout forces timeout
    # Mock Ultralytics predict
    mock_model = MagicMock()
    mock_model.predict.return_value = []
    with patch.object(p, "_ensure_model_loaded", return_value=(MagicMock(model=mock_model), None)):
        res = p.extract_evidence(np.zeros((100, 100, 3), dtype=np.uint8), [])
        assert res.ml_fallback is True
        assert "timeout" in res.ml_fallback_reason


def test_17_empty_detection_is_valid():
    """An image with zero ML detections is a valid result that does not fail."""
    p = RTDETRStructuralEvidenceProvider()
    res = p.extract_evidence(
        image=None,
        candidates=[RecoveredRoomHypothesis("c1", [AreaPoint(0, 0), AreaPoint(10, 0), AreaPoint(10, 10)], "wall_enc", 0.5)],
        detections=[],  # Empty detections passed
    )
    assert res.ml_available is True
    assert res.ml_fallback is False
    assert res.door_evidence["c1"] == 0.0


def test_18_exception_during_inference_falls_back():
    """Any unexpected exception in predict is caught and degrades to fallback."""
    p = RTDETRStructuralEvidenceProvider()
    mock_det = MagicMock()
    mock_det.model.predict.side_effect = RuntimeError("CUDA out of memory simulation")
    with patch.object(p, "_ensure_model_loaded", return_value=(mock_det, None)):
        res = p.extract_evidence(np.zeros((100, 100, 3), dtype=np.uint8), [])
        assert res.ml_fallback is True
        assert "inference_exception" in res.ml_fallback_reason


# ---------------------------------------------------------------------------
# 19-20. Model Lifecycle & Thread Safety Tests
# ---------------------------------------------------------------------------

def test_19_model_not_reloaded_per_image():
    """Model is cached in-process and not re-initialized for multiple requests."""
    p1 = RTDETRStructuralEvidenceProvider(device="cpu")
    p2 = RTDETRStructuralEvidenceProvider(device="cpu")
    # Shared detector class variable persists
    mock_det = MagicMock(is_loaded=True)
    with patch("ml.detector.RTDETRFloorplanDetector", return_value=mock_det):
        det1, _ = p1._ensure_model_loaded()
        det2, _ = p2._ensure_model_loaded()
        assert det1 is det2


def test_20_thread_safe_concurrency():
    """Inference lock prevents concurrent race conditions."""
    p = RTDETRStructuralEvidenceProvider()
    assert hasattr(p, "_instance_lock")
    # Verify lock can be acquired
    acquired = p._instance_lock.acquire(timeout=1.0)
    assert acquired is True
    p._instance_lock.release()


# ---------------------------------------------------------------------------
# 21-23. Output Schema & Diagnostics Tests
# ---------------------------------------------------------------------------

def test_21_production_json_schema_unchanged():
    """Final DetectedArea has strictly id and polygon; no ML fields in production area data."""
    det = FloorplanDetector()
    synthetic_img = np.full((400, 400, 3), 255, dtype=np.uint8)
    # Draw simple room
    synthetic_img[50:60, 50:350] = 0
    synthetic_img[340:350, 50:350] = 0
    synthetic_img[50:350, 50:60] = 0
    synthetic_img[50:350, 340:350] = 0

    res = det.detect_image(synthetic_img)
    res_dict = res.to_dict()

    assert "areas" in res_dict
    for area in res_dict["areas"]:
        assert "id" in area
        assert "polygon" in area
        # Forbidden in production area schema:
        assert "mlScore" not in area
        assert "doorConnection" not in area
        assert "fusionScore" not in area
        assert "structuralConfidence" not in area


def test_22_diagnostics_absent_by_default():
    """When diagnostics_enabled is False, detailed ml_fusion diagnostics are omitted."""
    from api.main import detect_floorplan
    import asyncio

    # Test that default detection does not expose ml_fusion in stats if not enabled
    cfg = DetectionConfig(ml_fusion=MLFusionConfig(enabled=False, diagnostics_enabled=False))
    det = FloorplanDetector(cfg)
    synthetic_img = np.full((200, 200, 3), 255, dtype=np.uint8)
    res = det.detect_image(synthetic_img)
    stats = res.stats
    assert stats.get("diagnostics", {}).get("ml_fusion") is None


def test_23_diagnostics_present_when_enabled():
    """When diagnostics_enabled is True, ml_fusion telemetry is included in stats."""
    cfg = DetectionConfig(ml_fusion=MLFusionConfig(enabled=True, diagnostics_enabled=True))
    det = FloorplanDetector(cfg)
    synthetic_img = np.full((200, 200, 3), 255, dtype=np.uint8)
    res = det.detect_image(synthetic_img)
    diag = res.stats.get("diagnostics", {})
    assert "ml_fusion" in diag
    assert diag["ml_fusion"]["ml_enabled"] is True


# ---------------------------------------------------------------------------
# 24-25. Benchmark Regression Tests
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def evaluator():
    return FusionEvaluator()


def test_24_phase_290_benchmark_reproduced(evaluator):
    """Verify Mode B (door_b10) reproduces Phase 2.9.0 benchmark results."""
    door_b10_cfg = [s for s in get_strategies_for_group("door") if s.strategy_id == "door_b10"][0]
    summary, _, _, _ = evaluator.evaluate_strategy(door_b10_cfg)

    # Authoritative Phase 2.9.0 targets:
    # TP=40, FP=65, FN=108, Prec=0.3810, Rec=0.2703, Micro F1=0.3162
    assert summary.tp_count == 40
    assert summary.fp_count == 65
    assert summary.fn_count == 108
    assert pytest.approx(summary.precision, rel=1e-2) == 0.3810
    assert pytest.approx(summary.recall, rel=1e-2) == 0.2703
    assert pytest.approx(summary.micro_f1, rel=1e-2) == 0.3162


def test_25_phase_2792_baseline_reproduced_with_ml_off(evaluator):
    """Verify Mode A (ML OFF) reproduces Phase 2.7.9.2 baseline results."""
    base_cfg = get_strategies_for_group("baseline")[0]
    summary, _, _, _ = evaluator.evaluate_strategy(base_cfg)

    # Authoritative Phase 2.7.9.2 targets:
    # TP=38, FP=76, FN=110, Prec=0.3333, Rec=0.2568, Micro F1=0.2901
    assert summary.tp_count == 38
    assert summary.fp_count == 76
    assert summary.fn_count == 110
    assert pytest.approx(summary.precision, rel=1e-2) == 0.3333
    assert pytest.approx(summary.recall, rel=1e-2) == 0.2568
    assert pytest.approx(summary.micro_f1, rel=1e-2) == 0.2901
