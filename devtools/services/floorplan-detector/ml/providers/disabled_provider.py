"""
Phase 2.9.1 Disabled Structural Evidence Provider
Default provider used when ML Fusion is disabled or deactivated.
Guarantees zero inference overhead, zero latency regression, and deterministic classical CV execution.
"""
from typing import List, Dict, Any, Optional, Tuple
import numpy as np

from .base import StructuralEvidenceProvider, StructuralEvidenceResult


class DisabledStructuralEvidenceProvider(StructuralEvidenceProvider):
    """
    Null-object structural evidence provider.
    Returns empty structural evidence with zero performance penalty.
    """
    def __init__(self, reason: Optional[str] = "ml_fusion_disabled"):
        self.reason = reason

    def is_available(self) -> bool:
        return False

    def extract_evidence(
        self,
        image: Optional[np.ndarray],
        candidates: List[Any],
        image_shape: Optional[Tuple[int, int]] = None,
    ) -> StructuralEvidenceResult:
        return StructuralEvidenceResult(
            provider_name="disabled",
            ml_enabled=False,
            ml_available=False,
            ml_fallback=False,
            ml_fallback_reason=self.reason,
            device_used="none",
        )

    def get_diagnostics(self) -> Dict[str, Any]:
        return {
            "provider": "disabled",
            "available": False,
            "status": self.reason,
        }
