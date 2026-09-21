"""Tests for Phase 2.8.0 - ML Structural Detector Feasibility Study.

Covers:
1. Model loading (RTDETRFloorplanDetector.is_loaded)
2. Image preprocessing & normalization
3. Coordinate restoration to original pixel dimensions
4. Detection schema validation (class, confidence, bbox.x1..y2)
5. Empty detection handling
6. Structural evidence calculation (wallSupport, doorConnection, etc.)
7. Candidate association
8. Large image handling
9. Deterministic inference configuration
"""

import os
import pytest
import numpy as np
from PIL import Image
from shapely.geometry import Polygon, box

from ml.config import MLDetectorConfig, STRUCTURAL_CLASSES
from ml.models import BBox, MLDetection, MLInferenceResult, MLStructuralEvidence
from ml.detector import RTDETRFloorplanDetector
from ml.inference import MLInferenceEngine
from ml.structural_evidence import StructuralEvidenceExtractor
from ml.visualization import render_structural_overlay


@pytest.fixture(scope="module")
def detector():
    """Load detector once for test module."""
    det = RTDETRFloorplanDetector()
    if not det.weights_path.exists():
        det.ensure_weights()
    det.load()
    return det


@pytest.fixture
def sample_test_image():
    """Create a synthetic floorplan test image."""
    img = np.ones((600, 800, 3), dtype=np.uint8) * 255
    # Draw dark boundary (walls)
    img[50:60, 50:750] = 0
    img[540:550, 50:750] = 0
    img[50:550, 50:60] = 0
    img[50:550, 740:750] = 0
    return img


# 1. Model loading
def test_model_loading(detector):
    """Verify model loads correctly and classes match."""
    assert detector.is_loaded is True
    assert detector.model is not None
    classes = detector.get_class_names()
    assert isinstance(classes, dict)
    expected_classes = {0: "wall", 1: "door", 2: "window", 3: "railing", 4: "linkage_point"}
    for idx, name in expected_classes.items():
        assert classes.get(idx) == name


# 2. Image preprocessing & normalization
def test_image_preprocessing(detector, sample_test_image):
    """Verify image loading and preprocessing formats."""
    # Test numpy array loading
    img_np, (orig_w, orig_h) = detector.load_image(sample_test_image)
    assert img_np.shape == (600, 800, 3)
    assert orig_w == 800 and orig_h == 600

    # Test PIL Image loading
    pil_img = Image.fromarray(sample_test_image)
    img_pil, (orig_w2, orig_h2) = detector.load_image(pil_img)
    assert orig_w2 == 800 and orig_h2 == 600


# 3. Coordinate restoration to original pixel dimensions
def test_coordinate_restoration(detector, sample_test_image):
    """Verify detected bounding boxes are mapped to original image dimensions."""
    engine = MLInferenceEngine(detector=detector)
    result = engine.predict(sample_test_image, conf_threshold=0.1)
    
    assert result.orig_width == 800
    assert result.orig_height == 600
    for det in result.detections:
        assert 0.0 <= det.bbox.x1 <= 800.0
        assert 0.0 <= det.bbox.x2 <= 800.0
        assert 0.0 <= det.bbox.y1 <= 600.0
        assert 0.0 <= det.bbox.y2 <= 600.0
        assert det.bbox.x2 >= det.bbox.x1
        assert det.bbox.y2 >= det.bbox.y1


# 4. Detection schema validation
def test_detection_schema_validation(detector, sample_test_image):
    """Verify detection objects follow the strict schema."""
    engine = MLInferenceEngine(detector=detector)
    result = engine.predict(sample_test_image, conf_threshold=0.1)
    
    assert isinstance(result.detections, list)
    for det in result.detections:
        assert det.cls in STRUCTURAL_CLASSES
        assert 0.0 <= det.confidence <= 1.0
        assert isinstance(det.bbox, BBox)
        assert isinstance(det.bbox.area, float)
        assert det.bbox.area >= 0.0


# 5. Empty detection handling
def test_empty_detection_handling():
    """Verify extractor and visualizer handle empty detections gracefully."""
    extractor = StructuralEvidenceExtractor()
    poly = Polygon([(100, 100), (300, 100), (300, 300), (100, 300)])
    
    evidence = extractor.extract_evidence(candidate_poly=poly, detections=[])
    assert evidence.wall_support == 0.0
    assert evidence.door_connection == 0.0
    assert evidence.window_connection == 0.0
    assert evidence.structural_confidence == 0.0
    assert evidence.has_door is False
    assert evidence.door_count == 0
    assert evidence.cavity_likelihood > 0.4  # lack of wall/door pushes cavity higher

    # Empty detections overlay should not raise
    canvas = np.ones((400, 400, 3), dtype=np.uint8) * 255
    overlay = render_structural_overlay(canvas, detections=[])
    assert overlay.size == (400, 400)


# 6. Structural evidence calculation
def test_structural_evidence_calculation():
    """Verify structural evidence calculation with synthetic geometry."""
    extractor = StructuralEvidenceExtractor()
    poly = Polygon([(100, 100), (300, 100), (300, 300), (100, 300)])
    
    # Add a wall along the top edge (y: 95..105, x: 90..310)
    wall_det = MLDetection(cls="wall", confidence=0.85, bbox=BBox(90, 95, 310, 105))
    # Add a door on the right edge (y: 180..220, x: 295..305)
    door_det = MLDetection(cls="door", confidence=0.90, bbox=BBox(295, 180, 305, 220))
    # Add a window on the bottom edge (y: 295..305, x: 180..220)
    win_det = MLDetection(cls="window", confidence=0.75, bbox=BBox(180, 295, 220, 305))

    evidence = extractor.extract_evidence(candidate_poly=poly, detections=[wall_det, door_det, win_det])
    
    assert evidence.has_door is True
    assert evidence.door_count == 1
    assert evidence.has_window is True
    assert evidence.window_count == 1
    assert evidence.wall_support > 0.1
    assert evidence.door_connection > 0.0
    assert evidence.window_connection > 0.0
    assert evidence.structural_confidence > 0.35
    assert evidence.cavity_likelihood < 0.35


# 7. Candidate association
def test_candidate_association():
    """Verify association between candidates and structural evidence."""
    extractor = StructuralEvidenceExtractor()
    # Candidate 1: Real room candidate with surrounding walls and a door
    room_poly = Polygon([(100, 100), (400, 100), (400, 400), (100, 400)])
    room_dets = [
        MLDetection(cls="wall", confidence=0.9, bbox=BBox(95, 95, 405, 105)),
        MLDetection(cls="wall", confidence=0.9, bbox=BBox(95, 395, 405, 405)),
        MLDetection(cls="wall", confidence=0.9, bbox=BBox(95, 95, 105, 405)),
        MLDetection(cls="wall", confidence=0.9, bbox=BBox(395, 95, 405, 405)),
        MLDetection(cls="door", confidence=0.85, bbox=BBox(395, 220, 405, 280))
    ]
    room_ev = extractor.extract_evidence(room_poly, room_dets)

    # Candidate 2: Wall cavity / interstitial artifact inside a thick wall, no door
    cavity_poly = Polygon([(1000, 1000), (1020, 1000), (1020, 1100), (1000, 1100)])
    cavity_dets = [
        MLDetection(cls="wall", confidence=0.5, bbox=BBox(990, 990, 1030, 1110))
    ]
    cavity_ev = extractor.extract_evidence(cavity_poly, cavity_dets)

    # Room should have higher structural confidence and lower cavity likelihood
    assert room_ev.structural_confidence > cavity_ev.structural_confidence
    assert room_ev.has_door is True
    assert cavity_ev.has_door is False
    assert cavity_ev.cavity_likelihood > room_ev.cavity_likelihood


# 8. Large image handling
def test_large_image_handling(detector):
    """Verify detector handles large images without OOM or shape errors."""
    engine = MLInferenceEngine(detector=detector)
    # Create large synthetic image (3200x2400)
    large_img = np.ones((2400, 3200, 3), dtype=np.uint8) * 255
    large_img[100:110, 100:3100] = 0
    large_img[2290:2300, 100:3100] = 0
    
    result = engine.predict(large_img, conf_threshold=0.2)
    assert result.orig_width == 3200
    assert result.orig_height == 2400
    assert result.inference_time_ms > 0.0


# 9. Deterministic inference configuration
def test_deterministic_inference(detector, sample_test_image):
    """Verify repeated inference on identical input yields deterministic detections."""
    engine = MLInferenceEngine(detector=detector)
    res1 = engine.predict(sample_test_image, conf_threshold=0.2)
    res2 = engine.predict(sample_test_image, conf_threshold=0.2)

    assert len(res1.detections) == len(res2.detections)
    for d1, d2 in zip(res1.detections, res2.detections):
        assert d1.cls == d2.cls
        assert pytest.approx(d1.confidence, rel=1e-3) == d2.confidence
        assert pytest.approx(d1.bbox.x1, rel=1e-2) == d2.bbox.x1
        assert pytest.approx(d1.bbox.y1, rel=1e-2) == d2.bbox.y1
        assert pytest.approx(d1.bbox.x2, rel=1e-2) == d2.bbox.x2
        assert pytest.approx(d1.bbox.y2, rel=1e-2) == d2.bbox.y2
