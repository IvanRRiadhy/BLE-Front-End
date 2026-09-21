"""
Phase 2.9.1 Structural Evidence Provider Interface
Abstract base class and data containers for ML structural providers.
Decouples floorplan detector candidate ranking from specific ML model backends.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, Tuple
import numpy as np

from ml.models import MLDetection, MLStructuralEvidence


@dataclass
class StructuralEvidenceResult:
    """
    Standardized result payload returned by any StructuralEvidenceProvider.
    Ensures graceful degradation and full diagnostic observability.
    """
    # Core evidence
    detections: List[MLDetection] = field(default_factory=list)
    candidate_evidence: Dict[str, MLStructuralEvidence] = field(default_factory=dict)
    door_evidence: Dict[str, float] = field(default_factory=dict)

    # Provider & Lifecycle state
    provider_name: str = "disabled"
    ml_enabled: bool = False
    ml_available: bool = False
    ml_fallback: bool = False
    ml_fallback_reason: Optional[str] = None
    device_used: str = "none"

    # Latency breakdown (ms)
    model_load_time_ms: float = 0.0
    inference_time_ms: float = 0.0
    association_time_ms: float = 0.0
    fusion_time_ms: float = 0.0
    total_ml_time_ms: float = 0.0

    @property
    def is_fallback(self) -> bool:
        return self.ml_fallback

    @property
    def fallback_reason(self) -> Optional[str]:
        return self.ml_fallback_reason

    @property
    def associations(self) -> Dict[str, Any]:
        return self.candidate_evidence

    def to_dict(self) -> Dict[str, Any]:
        return {
            "provider_name": self.provider_name,
            "ml_enabled": self.ml_enabled,
            "ml_available": self.ml_available,
            "ml_fallback": self.ml_fallback,
            "ml_fallback_reason": self.ml_fallback_reason,
            "device_used": self.device_used,
            "detections_count": len(self.detections),
            "candidates_associated_count": len(self.candidate_evidence),
            "timing_ms": {
                "model_load": round(self.model_load_time_ms, 2),
                "inference": round(self.inference_time_ms, 2),
                "association": round(self.association_time_ms, 2),
                "fusion": round(self.fusion_time_ms, 2),
                "total": round(self.total_ml_time_ms, 2),
            },
        }


class StructuralEvidenceProvider(ABC):
    """
    Abstract base provider for structural evidence generation.
    Any future segmentation or object detection model can implement this interface.
    """

    @abstractmethod
    def is_available(self) -> bool:
        """Returns True if the provider can execute inference."""
        pass

    @abstractmethod
    def extract_evidence(
        self,
        image: Optional[np.ndarray],
        candidates: List[Any],
        image_shape: Optional[Tuple[int, int]] = None,
    ) -> StructuralEvidenceResult:
        """
        Executes structural detection on the image (or uses preloaded evidence)
        and associates evidence with candidate polygons.
        Must never throw unhandled exceptions; return fallback result on failure.
        """
        pass

    @abstractmethod
    def get_diagnostics(self) -> Dict[str, Any]:
        """Returns provider health, lifecycle, and runtime statistics."""
        pass
