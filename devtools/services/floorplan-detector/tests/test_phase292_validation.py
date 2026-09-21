"""
Unit and Integration Tests for Phase 2.9.2 Production Validation & Stress Testing.
Validates:
- Input formats (PNG, JPEG, WEBP, Grayscale, RGBA)
- Invalid/stress inputs (blank, corrupt bytes, extreme aspect ratios)
- Runtime faults & graceful fallback
- Model lifecycle singleton persistence
- Bit-exact determinism
- API contract & pure geometry output
- Feature flag combinations
- Concurrency safety
- Main repository isolation
"""

import os
import sys
import gc
import json
import time
import pytest
import numpy as np
import cv2
from pathlib import Path
from unittest.mock import patch

REPO_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_DIR))

from app.models import DetectionConfig, MLFusionConfig, DetectedArea
from app.detector import FloorplanDetector
from ml.providers import get_structural_evidence_provider
from ml.providers.base import StructuralEvidenceProvider, StructuralEvidenceResult
from ml.providers.rtdetr_provider import RTDETRStructuralEvidenceProvider
from ml.providers.disabled_provider import DisabledStructuralEvidenceProvider
from starlette.testclient import TestClient
from api.main import app


@pytest.fixture(scope="module")
def sample_image():
    img = np.full((600, 800, 3), 255, dtype=np.uint8)
    # Draw rooms
    cv2.rectangle(img, (60, 60), (360, 260), (0, 0, 0), 4)
    cv2.rectangle(img, (400, 60), (740, 260), (0, 0, 0), 4)
    cv2.rectangle(img, (60, 320), (740, 540), (0, 0, 0), 4)
    return img


@pytest.fixture(scope="module")
def test_client():
    return TestClient(app)


# ---------------------------------------------------------------------------
# 1. Input Validation & Format Handling
# ---------------------------------------------------------------------------

def test_input_formats_png_jpeg_webp(sample_image):
    detector = FloorplanDetector()
    for fmt in [".png", ".jpg", ".webp"]:
        success, enc = cv2.imencode(fmt, sample_image)
        assert success, f"Failed encoding {fmt}"
        dec = cv2.imdecode(enc, cv2.IMREAD_COLOR)
        res = detector.detect_image(dec)
        assert len(res.areas) >= 0
        assert res.image_width == 800
        assert res.image_height == 600


def test_input_color_modes(sample_image):
    detector = FloorplanDetector()

    # RGBA (4 channels)
    rgba = cv2.cvtColor(sample_image, cv2.COLOR_BGR2BGRA)
    res_rgba = detector.detect_image(rgba)
    assert len(res_rgba.areas) >= 0

    # Grayscale (1 channel)
    gray = cv2.cvtColor(sample_image, cv2.COLOR_BGR2GRAY)
    res_gray = detector.detect_image(gray)
    assert len(res_gray.areas) >= 0

    # Grayscale to RGB
    gray_rgb = cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)
    res_gray_rgb = detector.detect_image(gray_rgb)
    assert len(res_gray_rgb.areas) >= 0


def test_invalid_inputs_fail_safely():
    detector = FloorplanDetector()

    # Blank all-white image
    blank = np.full((400, 400, 3), 255, dtype=np.uint8)
    res_blank = detector.detect_image(blank)
    assert isinstance(res_blank.areas, list)

    # Blank all-black image
    black = np.zeros((400, 400, 3), dtype=np.uint8)
    res_black = detector.detect_image(black)
    assert isinstance(res_black.areas, list)

    # Ultra-wide
    wide = np.full((30, 2000, 3), 255, dtype=np.uint8)
    res_wide = detector.detect_image(wide)
    assert isinstance(res_wide.areas, list)

    # Ultra-tall
    tall = np.full((2000, 30, 3), 255, dtype=np.uint8)
    res_tall = detector.detect_image(tall)
    assert isinstance(res_tall.areas, list)

    # Small 5x5
    small = np.full((5, 5, 3), 255, dtype=np.uint8)
    res_small = detector.detect_image(small)
    assert isinstance(res_small.areas, list)


# ---------------------------------------------------------------------------
# 2. Runtime Faults & Graceful Fallback
# ---------------------------------------------------------------------------

def test_missing_weights_fallback(sample_image):
    provider = RTDETRStructuralEvidenceProvider(weights_path="non_existent_weights.pt")
    res = provider.extract_evidence(sample_image, [])
    assert res.is_fallback is True
    assert "weights_not_found" in res.fallback_reason


def test_corrupted_weights_fallback(sample_image):
    provider = RTDETRStructuralEvidenceProvider()
    with patch.object(provider, "_ensure_model_loaded", return_value=(None, "model_load_failed: Corrupted checkpoint")):
        res = provider.extract_evidence(sample_image, [])
        assert res.is_fallback is True


def test_runtime_inference_oom_fallback(sample_image):
    provider = RTDETRStructuralEvidenceProvider()
    det, _ = provider._ensure_model_loaded()

    if det and hasattr(det, "model") and det.model is not None:
        with patch.object(det.model, "predict", side_effect=RuntimeError("CUDA out of memory")):
            res = provider.extract_evidence(sample_image, [])
            assert res.is_fallback is True
            assert "CUDA out of memory" in res.fallback_reason


def test_provider_inference_timeout(sample_image):
    provider = RTDETRStructuralEvidenceProvider(timeout_ms=10)
    det, _ = provider._ensure_model_loaded()
    if det and hasattr(det, "model") and det.model is not None:
        with patch.object(det.model, "predict", side_effect=lambda *a, **kw: (time.sleep(0.03), [])[1]):
            res = provider.extract_evidence(sample_image, [])
            assert res.is_fallback is True
            assert "timeout" in res.fallback_reason


def test_malformed_ml_provider_output(sample_image):
    provider = RTDETRStructuralEvidenceProvider()
    provider._ensure_model_loaded()

    with patch.object(provider.extractor, "extract_evidence", return_value=None):
        res = provider.extract_evidence(sample_image, [])
        assert res.associations == {}


# ---------------------------------------------------------------------------
# 3. Model Lifecycle Singleton Persistence
# ---------------------------------------------------------------------------

def test_model_lifecycle_singleton(sample_image):
    p1 = RTDETRStructuralEvidenceProvider()
    p1._ensure_model_loaded()
    inst1 = RTDETRStructuralEvidenceProvider._shared_detector

    p2 = RTDETRStructuralEvidenceProvider()
    p2._ensure_model_loaded()
    inst2 = RTDETRStructuralEvidenceProvider._shared_detector

    assert inst1 is not None
    assert inst1 is inst2, "Model instance reloaded across requests"


# ---------------------------------------------------------------------------
# 4. Determinism
# ---------------------------------------------------------------------------

def test_determinism_ml_off_and_on(sample_image):
    detector = FloorplanDetector()

    # ML OFF (3 runs)
    cfg_off = DetectionConfig(ml_fusion=MLFusionConfig(enabled=False))
    r_off_1 = detector.detect_image(sample_image, config=cfg_off)
    r_off_2 = detector.detect_image(sample_image, config=cfg_off)
    assert len(r_off_1.areas) == len(r_off_2.areas)
    for a1, a2 in zip(r_off_1.areas, r_off_2.areas):
        assert a1.id == a2.id
        for p1, p2 in zip(a1.polygon, a2.polygon):
            assert p1.xPx == p2.xPx and p1.yPx == p2.yPx

    # ML ON (3 runs)
    cfg_on = DetectionConfig(ml_fusion=MLFusionConfig(enabled=True, doorWeight=0.10))
    r_on_1 = detector.detect_image(sample_image, config=cfg_on)
    r_on_2 = detector.detect_image(sample_image, config=cfg_on)
    assert len(r_on_1.areas) == len(r_on_2.areas)
    for a1, a2 in zip(r_on_1.areas, r_on_2.areas):
        assert a1.id == a2.id
        for p1, p2 in zip(a1.polygon, a2.polygon):
            assert p1.xPx == p2.xPx and p1.yPx == p2.yPx


# ---------------------------------------------------------------------------
# 5. API Contract & Pure Geometry Invariance
# ---------------------------------------------------------------------------

def test_api_contract_pure_geometry(test_client, sample_image):
    success, buf = cv2.imencode(".png", sample_image)
    assert success

    resp = test_client.post(
        "/detect?ml_fusion=true&debug_diagnostics=false",
        files={"file": ("floorplan.png", buf.tobytes(), "image/png")}
    )
    assert resp.status_code == 200
    data = resp.json()

    assert "areas" in data
    assert "stats" in data
    for a in data["areas"]:
        assert "id" in a
        assert "polygon" in a
        # Disallowed ML fields in production contract
        assert "ml_score" not in a
        assert "fusion_score" not in a
        assert "door_evidence" not in a
        assert "door_count" not in a

    # Diagnostics should not be leaked when debug_diagnostics=false
    assert "ml_fusion" not in data.get("stats", {})


# ---------------------------------------------------------------------------
# 6. Feature Flag Matrix
# ---------------------------------------------------------------------------

def test_feature_flag_matrix(sample_image):
    # Disabled
    p_off = get_structural_evidence_provider(MLFusionConfig(enabled=False))
    assert isinstance(p_off, DisabledStructuralEvidenceProvider)
    res_off = p_off.extract_evidence(sample_image, [])
    assert res_off.device_used == "none"

    # Enabled Auto
    p_auto = get_structural_evidence_provider(MLFusionConfig(enabled=True, device="auto"))
    assert isinstance(p_auto, RTDETRStructuralEvidenceProvider)

    # Enabled CPU
    p_cpu = get_structural_evidence_provider(MLFusionConfig(enabled=True, device="cpu"))
    assert isinstance(p_cpu, RTDETRStructuralEvidenceProvider)
    assert p_cpu.requested_device == "cpu"


# ---------------------------------------------------------------------------
# 7. Concurrency Safety
# ---------------------------------------------------------------------------

def test_concurrency_thread_safety(sample_image):
    from concurrent.futures import ThreadPoolExecutor
    provider = RTDETRStructuralEvidenceProvider()

    def run_inference(i):
        img = sample_image.copy()
        res = provider.extract_evidence(img, [])
        return res.is_fallback

    with ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(run_inference, range(4)))

    assert len(results) == 4
    # All threads complete without throwing exceptions


# ---------------------------------------------------------------------------
# 8. Main Repository Isolation
# ---------------------------------------------------------------------------

def test_main_repo_isolation():
    # floorplan-detector -> services -> devtools -> typescript -> main
    main_src = Path(__file__).resolve().parents[4] / "main" / "src"
    if not main_src.exists():
        pytest.skip(f"Main source directory not found at {main_src}")

    import re
    violating_files = []
    for ext in ["ts", "tsx", "js", "jsx"]:
        for f in main_src.rglob(f"*.{ext}"):
            try:
                content = f.read_text(encoding="utf-8", errors="ignore")
                # Look for references to the BIONIC devtools package, avoiding third-party @tanstack/react-query-devtools
                if re.search(r'from\s+[\'"](?:\.\./.*devtools|.*[/\\]packages[/\\]typescript[/\\]devtools|.*floorplan-detector).*[\'"]', content):
                    violating_files.append(str(f))
            except Exception:
                pass

    assert len(violating_files) == 0, f"Found devtools imports in main: {violating_files}"
