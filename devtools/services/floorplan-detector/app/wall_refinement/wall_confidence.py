"""
Wall Confidence Map Synthesis for Phase 2.10.11 Multimodal Structural Wall Mask Refinement.
Combines classical evidence (adaptive, canny, sobel, morphology, thickness)
and ML structural evidence (RT-DETR walls, linkages) while suppressing openings and artifacts.
"""
from typing import Dict, Any, Optional
import numpy as np
from .models import StructuralEvidence


class WallConfidenceEstimator:
    """
    Computes a continuous fused confidence map [0..1] for every pixel.
    """

    def __init__(
        self,
        w_adaptive: float = 0.30,
        w_morphology: float = 0.25,
        w_canny: float = 0.15,
        w_sobel: float = 0.10,
        w_ml_wall: float = 0.35,
        w_opening_penalty: float = 0.50,
        w_text_penalty: float = 0.30,
        enable_ml: bool = True,
    ):
        self.w_adaptive = w_adaptive
        self.w_morphology = w_morphology
        self.w_canny = w_canny
        self.w_sobel = w_sobel
        self.w_ml_wall = w_ml_wall
        self.w_opening_penalty = w_opening_penalty
        self.w_text_penalty = w_text_penalty
        self.enable_ml = enable_ml

    def compute_confidence(
        self,
        evidence: StructuralEvidence,
        opening_confidence: Optional[np.ndarray] = None,
        use_ml: Optional[bool] = None,
    ) -> np.ndarray:
        """
        Fuses evidence channels into a continuous confidence map.
        """
        ml_flag = self.enable_ml if use_ml is None else use_ml

        # 1. Classical Evidence Combination (accumulate in-place to avoid intermediate array allocations)
        fused = np.array(evidence.adaptive_threshold_evidence, dtype=np.float32, copy=True)
        fused *= self.w_adaptive
        fused += self.w_morphology * evidence.morphology_evidence
        fused += self.w_canny * evidence.canny_evidence
        fused += self.w_sobel * evidence.sobel_total_evidence

        # 2. ML Evidence Integration
        if ml_flag and evidence.ml_wall_evidence is not None and evidence.ml_wall_evidence.shape == fused.shape:
            fused += self.w_ml_wall * evidence.ml_wall_evidence
            if evidence.ml_linkage_evidence is not None and evidence.ml_linkage_evidence.shape == fused.shape:
                fused += 0.15 * evidence.ml_linkage_evidence

        # 3. Penalties (Openings, Text, Hatch)
        if opening_confidence is not None and opening_confidence.shape == fused.shape:
            fused -= self.w_opening_penalty * opening_confidence
        elif evidence.ml_door_evidence is not None and evidence.ml_door_evidence.shape == fused.shape:
            pen = evidence.ml_door_evidence
            if evidence.ml_window_evidence is not None and evidence.ml_window_evidence.shape == fused.shape:
                pen = pen + evidence.ml_window_evidence * 0.7
            fused -= self.w_opening_penalty * pen

        if evidence.text_evidence is not None:
            fused -= self.w_text_penalty * evidence.text_evidence

        np.clip(fused, 0.0, 1.0, out=fused)
        return fused
