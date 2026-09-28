"""
End-to-End Wall Refinement Pipeline Coordinator for Phase 2.10.11.
Integrates:
- Preprocessing & Polarity Normalization
- Classical Multi-Channel Evidence Extraction
- Pretrained RT-DETR Structural Evidence Extraction
- Opening Protection Engine
- Continuous Wall Confidence Estimation
- Topology-Aware Gap Repair (Selective Architectural Bridging)
- Junction Repair (T/L/+-intersection snapping)
- Mask Fusion & Topology Refinement
Supports 8 Strategy Ablations (A through H).
"""
import time
from typing import Dict, Any, List, Optional, Tuple
import cv2
import numpy as np

from .models import (
    StructuralEvidence,
    RefinedStructuralEvidence,
    CandidateGap,
    CandidateJunction,
    WallMetrics,
    TopologyMetrics,
    OpeningPreservationMetrics,
)
from .preprocessing import normalize_image
from .classical_evidence import ClassicalEvidenceExtractor
from .ml_evidence import MLStructuralEvidenceExtractor
from .opening_protection import OpeningProtectionEngine
from .wall_confidence import WallConfidenceEstimator
from .gap_repair import GapRepairEngine
from .junction_repair import JunctionRepairEngine
from .topology_refinement import TopologyRefinementEngine
from .mask_fusion import MaskFusionEngine
from .metrics import WallMetricsEvaluator


class MultimodalWallRefinementPipeline:
    """
    Coordinates multimodal structural evidence extraction, gap/junction repair,
    opening protection, and refined wall mask generation.
    """

    def __init__(
        self,
        classical_extractor: Optional[ClassicalEvidenceExtractor] = None,
        ml_extractor: Optional[MLStructuralEvidenceExtractor] = None,
        opening_engine: Optional[OpeningProtectionEngine] = None,
        confidence_estimator: Optional[WallConfidenceEstimator] = None,
        gap_engine: Optional[GapRepairEngine] = None,
        junction_engine: Optional[JunctionRepairEngine] = None,
        topology_engine: Optional[TopologyRefinementEngine] = None,
        fusion_engine: Optional[MaskFusionEngine] = None,
        metrics_evaluator: Optional[WallMetricsEvaluator] = None,
    ):
        self.classical_extractor = classical_extractor or ClassicalEvidenceExtractor()
        self.ml_extractor = ml_extractor or MLStructuralEvidenceExtractor()
        self.opening_engine = opening_engine or OpeningProtectionEngine()
        self.confidence_estimator = confidence_estimator or WallConfidenceEstimator()
        self.gap_engine = gap_engine or GapRepairEngine()
        self.junction_engine = junction_engine or JunctionRepairEngine()
        self.topology_engine = topology_engine or TopologyRefinementEngine()
        self.fusion_engine = fusion_engine or MaskFusionEngine()
        self.metrics_evaluator = metrics_evaluator or WallMetricsEvaluator()

    def run_refinement(
        self,
        image_or_path: Any,
        image_id: str,
        baseline_wall_mask: Optional[np.ndarray] = None,
        wall_network: Optional[Any] = None,
        doors: Optional[List[Any]] = None,
        openings_diag: Optional[List[Any]] = None,
        use_ml: bool = True,
        protect_openings: bool = True,
        repair_gaps: bool = True,
        repair_junctions: bool = True,
        strategy_name: str = "full_refinement",
        precomputed_evidence: Optional[StructuralEvidence] = None,
    ) -> RefinedStructuralEvidence:
        """
        Executes structural wall refinement pipeline.
        """
        t0 = time.perf_counter()

        # 1. Load image & preprocess
        if isinstance(image_or_path, str):
            raw_img = cv2.imread(image_or_path)
        else:
            raw_img = image_or_path

        if raw_img is None or raw_img.size == 0:
            raise ValueError(f"Failed to load image for: {image_id}")

        h, w = raw_img.shape[:2]
        if precomputed_evidence is not None:
            evidence = precomputed_evidence
            ml_detections = getattr(precomputed_evidence, "_ml_detections", [])
            is_light_bg = getattr(precomputed_evidence, "_is_light_bg", True)
        else:
            gray, contrast_norm, is_light_bg = normalize_image(raw_img)
            classical_ev = self.classical_extractor.extract_evidence(gray, raw_img, is_light_bg)

            ml_ev: Dict[str, np.ndarray] = {}
            ml_detections = []
            if use_ml:
                try:
                    ml_ev, ml_detections = self.ml_extractor.extract_evidence(raw_img, image_id, (h, w))
                except Exception as e:
                    # Graceful fallback if ML inference encounters an issue
                    pass

            evidence = StructuralEvidence(
                image_id=image_id,
                pixel_width=w,
                pixel_height=h,
                grayscale_evidence=classical_ev["grayscale_evidence"],
                adaptive_threshold_evidence=classical_ev["adaptive_threshold_evidence"],
                canny_evidence=classical_ev["canny_evidence"],
                sobel_horizontal_evidence=classical_ev["sobel_horizontal_evidence"],
                sobel_vertical_evidence=classical_ev["sobel_vertical_evidence"],
                sobel_total_evidence=classical_ev["sobel_total_evidence"],
                directional_line_evidence=classical_ev["directional_line_evidence"],
                morphology_evidence=classical_ev["morphology_evidence"],
                thickness_evidence=classical_ev["thickness_evidence"],
                color_contrast_evidence=classical_ev["color_contrast_evidence"],
                ml_wall_evidence=ml_ev.get("ml_wall_evidence", np.zeros((1, 1), dtype=np.float32)),
                ml_door_evidence=ml_ev.get("ml_door_evidence", np.zeros((1, 1), dtype=np.float32)),
                ml_window_evidence=ml_ev.get("ml_window_evidence", np.zeros((1, 1), dtype=np.float32)),
                ml_railing_evidence=ml_ev.get("ml_railing_evidence", np.zeros((1, 1), dtype=np.float32)),
                ml_linkage_evidence=ml_ev.get("ml_linkage_evidence", np.zeros((1, 1), dtype=np.float32)),
            )
            setattr(evidence, "_ml_detections", ml_detections)
            setattr(evidence, "_is_light_bg", is_light_bg)

        # 4. Opening Protection Mask
        if protect_openings:
            prot_mask, opening_conf, prot_count = self.opening_engine.build_protected_mask(
                image_shape=(h, w),
                ml_detections=ml_detections,
                doors=doors,
                openings_diag=openings_diag,
            )
        else:
            prot_mask = np.zeros((h, w), dtype=np.uint8)
            opening_conf = np.zeros((h, w), dtype=np.float32)

        # 5. Wall Confidence Map Computation
        wall_conf = self.confidence_estimator.compute_confidence(
            evidence=evidence,
            opening_confidence=opening_conf,
            use_ml=use_ml,
        )

        # Initial binary mask from confidence + baseline
        conf_thresh = 0.35 if use_ml else 0.40
        initial_bin = (wall_conf >= conf_thresh).astype(np.uint8) * 255
        if baseline_wall_mask is not None:
            initial_bin = cv2.bitwise_or(initial_bin, baseline_wall_mask)

        # Carve out openings before gap repair so gaps across doors are classified as DOORWAY_GAP
        initial_bin = cv2.bitwise_and(initial_bin, cv2.bitwise_not(prot_mask))

        # 6. Topology-Aware Gap Repair
        repaired_gaps: List[CandidateGap] = []
        repaired_gap_count = 0
        repaired_mask = initial_bin.copy()
        if repair_gaps:
            repaired_mask, repaired_gaps, repaired_gap_count = self.gap_engine.detect_and_repair_gaps(
                binary_mask=initial_bin,
                wall_confidence=wall_conf,
                protected_opening_mask=prot_mask,
                wall_network=wall_network,
            )

        # 7. Junction Repair
        repaired_junctions: List[CandidateJunction] = []
        repaired_junc_count = 0
        if repair_junctions:
            repaired_mask, repaired_junctions, repaired_junc_count = self.junction_engine.detect_and_repair_junctions(
                binary_mask=repaired_mask,
                wall_confidence=wall_conf,
                protected_opening_mask=prot_mask,
                linkage_evidence=evidence.ml_linkage_evidence,
            )

        # 8. Mask Fusion & Strict Opening Carve-out
        final_mask = self.fusion_engine.fuse_refined_mask(
            wall_confidence=wall_conf,
            baseline_mask=repaired_mask,
            protected_opening_mask=prot_mask,
        )

        # 9. Topology Refinement & Metrics Extraction
        clean_final_mask, top_metrics = self.topology_engine.refine_topology(
            wall_mask=final_mask,
            protected_opening_mask=prot_mask,
        )

        wall_metrics = self.metrics_evaluator.compute_wall_metrics(
            wall_mask=clean_final_mask,
            protected_opening_mask=prot_mask,
            repaired_gap_count=repaired_gap_count,
            repaired_junction_count=repaired_junc_count,
        )

        opening_metrics = self.metrics_evaluator.compute_opening_preservation(
            refined_mask=clean_final_mask,
            protected_opening_mask=prot_mask,
        )

        elapsed_ms = (time.perf_counter() - t0) * 1000.0

        return RefinedStructuralEvidence(
            image_id=image_id,
            pixel_width=w,
            pixel_height=h,
            refined_wall_mask=clean_final_mask,
            wall_confidence_map=wall_conf,
            wall_centerline_evidence=evidence.morphology_evidence,
            junction_evidence=evidence.ml_linkage_evidence,
            opening_evidence=opening_conf,
            protected_opening_mask=prot_mask,
            repaired_gaps=repaired_gaps,
            repaired_junctions=repaired_junctions,
            wall_metrics=wall_metrics,
            topology_metrics=top_metrics,
            opening_metrics=opening_metrics,
            strategy_name=strategy_name,
            execution_time_ms=elapsed_ms,
            diagnostics={
                "is_light_bg": is_light_bg,
                "use_ml": use_ml,
                "repaired_gaps_count": repaired_gap_count,
                "repaired_junctions_count": repaired_junc_count,
            },
            structural_evidence=evidence,
        )
