"""
Phase 2.9.1 Structural Evidence Providers Package
Provides modular provider abstraction and factory method for ML structural evidence generation.
"""
import os
from typing import Optional, Any
from .base import StructuralEvidenceProvider, StructuralEvidenceResult
from .disabled_provider import DisabledStructuralEvidenceProvider
from .rtdetr_provider import RTDETRStructuralEvidenceProvider


def get_structural_evidence_provider(
    config: Optional[Any] = None,
) -> StructuralEvidenceProvider:
    """
    Factory creating the configured structural evidence provider.
    Checks environment variable BIONIC_ML_FUSION_ENABLED and config settings.
    If disabled or invalid, returns DisabledStructuralEvidenceProvider.
    """
    # 1. Check feature flag from environment or config
    env_flag = os.environ.get("BIONIC_ML_FUSION_ENABLED", "").strip().lower()
    
    # Priority: explicit config > environment variable > default False
    if config is not None and hasattr(config, "enabled"):
        is_enabled = bool(config.enabled)
    elif env_flag in ("1", "true", "yes", "on"):
        is_enabled = True
    else:
        is_enabled = False

    if not is_enabled:
        return DisabledStructuralEvidenceProvider(reason="ml_fusion_disabled")

    # 2. Extract provider configuration parameters
    provider_type = getattr(config, "provider", "rtdetr").lower() if config else "rtdetr"
    
    if provider_type == "rtdetr":
        weights_path = getattr(config, "weights_path", None)
        device = getattr(config, "device", "auto")
        cpu_fallback = getattr(config, "cpu_fallback", False)
        timeout_ms = getattr(config, "inference_timeout_ms", 5000)
        confidence_threshold = getattr(config, "confidence_threshold", 0.30)
        
        return RTDETRStructuralEvidenceProvider(
            weights_path=weights_path,
            device=device,
            cpu_fallback=cpu_fallback,
            timeout_ms=timeout_ms,
            confidence_threshold=confidence_threshold,
        )

    return DisabledStructuralEvidenceProvider(reason=f"unknown_provider_{provider_type}")


__all__ = [
    "StructuralEvidenceProvider",
    "StructuralEvidenceResult",
    "DisabledStructuralEvidenceProvider",
    "RTDETRStructuralEvidenceProvider",
    "get_structural_evidence_provider",
]
