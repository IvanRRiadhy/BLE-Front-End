"""
Phase 2.10.8 — Room Validity & False Positive Suppression Module.
"""
from .models import (
    RoomValidityDecision,
    RoomValidityHypothesis,
    ValidatedRoom,
    ValidationResult,
)
from .false_positive_taxonomy import FalsePositiveReason, describe_reason
from .architectural_evidence import ArchitecturalEvidenceExtractor
from .negative_evidence import NegativeEvidenceExtractor
from .room_classifier import SemanticRoomClassifier
from .features import RoomValidityFeatureExtractor
from .validity_scoring import ValidityScorer
from .decision import RoomValidityDecisionPolicy
from .boundary_quality import BoundaryQualityRefiner
from .validation_pipeline import RoomValidationPipeline
from .metrics import RoomValidityMetricsEvaluator, compute_polygon_iou
from .visualization import RoomValidityVisualizer

__all__ = [
    "RoomValidityDecision",
    "RoomValidityHypothesis",
    "ValidatedRoom",
    "ValidationResult",
    "FalsePositiveReason",
    "describe_reason",
    "ArchitecturalEvidenceExtractor",
    "NegativeEvidenceExtractor",
    "SemanticRoomClassifier",
    "RoomValidityFeatureExtractor",
    "ValidityScorer",
    "RoomValidityDecisionPolicy",
    "BoundaryQualityRefiner",
    "RoomValidationPipeline",
    "RoomValidityMetricsEvaluator",
    "compute_polygon_iou",
    "RoomValidityVisualizer",
]
