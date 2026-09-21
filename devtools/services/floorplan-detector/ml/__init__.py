"""
Phase 2.8.0 ML Structural Detector Package
Provides RT-DETR-L structural floorplan inference and architectural evidence extraction.
"""
from .config import (
    MLDetectorConfig,
    STRUCTURAL_CLASSES,
    CLASS_TO_ID,
    ID_TO_CLASS,
    CLASS_COLORS,
    DEFAULT_WEIGHTS_PATH,
)
from .models import (
    BBox,
    MLDetection,
    MLInferenceResult,
    MLStructuralEvidence,
    CandidateMLComparison,
)
from .detector import RTDETRFloorplanDetector
from .inference import MLInferenceEngine
from .structural_evidence import StructuralEvidenceExtractor
from .visualization import render_structural_overlay

__all__ = [
    "MLDetectorConfig",
    "STRUCTURAL_CLASSES",
    "CLASS_TO_ID",
    "ID_TO_CLASS",
    "CLASS_COLORS",
    "DEFAULT_WEIGHTS_PATH",
    "BBox",
    "MLDetection",
    "MLInferenceResult",
    "MLStructuralEvidence",
    "CandidateMLComparison",
    "RTDETRFloorplanDetector",
    "MLInferenceEngine",
    "StructuralEvidenceExtractor",
    "render_structural_overlay",
]
