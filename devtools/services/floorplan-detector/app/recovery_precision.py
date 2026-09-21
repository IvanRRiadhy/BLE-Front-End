"""
Recovery Precision Control Module (Phase 2.7.9.2)
Provides source-aware candidate ranking, evidence-based scoring, architecture-aware budgeting,
second-chance recovery for high-evidence candidates, candidate-level tracing, and duplicate/overlap suppression.

Phase 2.7.9.2 targeted tuning:
- Configuration-driven RecoveryPrecisionConfig
- Architecture-aware budget scaling: max(budget_min, min(budget_ceiling, num_primary + budget_primary_offset))
- Second-chance mechanism: high wall_support + enclosure => confidence bonus
- Fine-tuned source thresholds derived from benchmark evidence
- Candidate-level tracing for lost-TP root-cause analysis
- Source-aware statistics for diagnostics (maps 65-66)
"""

import cv2
import numpy as np
from dataclasses import dataclass, field
from typing import List, Dict, Any, Tuple, Optional
from shapely.geometry import Polygon as ShapelyPolygon, box as ShapelyBox

from .models import (
    RoomHypothesis,
    RecoveredRoomHypothesis,
    DetectionConfig,
    RecoveryPrecisionConfig,
)

# Re-export RecoveryPrecisionConfig for direct imports from recovery_precision
__all__ = ["RecoveryDecision", "RecoveryPrecisionEngine", "RecoveryPrecisionConfig"]

@dataclass
class RecoveryDecision:
    """
    Detailed decision record and telemetry for a single recovery candidate.
    Phase 2.7.9.2: added second_chance, budget_rank, and candidate tracing fields.
    """
    candidate_id: str
    source: str
    accepted: bool
    confidence: float
    architectural_score: float = 0.0
    enclosure_score: float = 0.0
    repetition_score: float = 0.0
    neighbor_score: float = 0.0
    wall_support: float = 0.0
    negative_evidence: float = 0.0
    overlap_penalty: float = 0.0
    redundancy_penalty: float = 0.0
    rejection_reasons: List[str] = field(default_factory=list)
    # Phase 2.7.9.2 additions
    second_chance_applied: bool = False
    second_chance_bonus: float = 0.0
    budget_rank: int = -1
    # Phase 2.7.9.2 candidate-level tracing fields (STEP 4)
    image: str = ""
    exterior_exposure: float = 0.0
    confidence_before_bonus: float = 0.0
    confidence_after_bonus: float = 0.0
    source_threshold: float = 0.0
    wall_support_threshold: float = 0.0
    accepted_before_budget: bool = False
    budget_limit: int = 0
    accepted_after_budget: bool = False
    rejection_reason: str = "accepted"
    matched_ground_truth_id: Optional[str] = None
    iou: float = 0.0
    # Phase 2.9.1 ML Fusion fields
    ml_door_connection: float = 0.0
    fusion_score: float = 0.0
    baseline_rank: int = -1
    fusion_rank: int = -1
    promoted: bool = False
    demoted: bool = False

    def to_dict(self) -> Dict[str, Any]:
        return {
            "candidateId": self.candidate_id,
            "source": self.source,
            "accepted": self.accepted,
            "confidence": round(self.confidence, 4),
            "architecturalScore": round(self.architectural_score, 4),
            "enclosureScore": round(self.enclosure_score, 4),
            "exteriorExposure": round(self.exterior_exposure, 4),
            "repetitionScore": round(self.repetition_score, 4),
            "neighborScore": round(self.neighbor_score, 4),
            "wallSupport": round(self.wall_support, 4),
            "negativeEvidence": round(self.negative_evidence, 4),
            "overlapPenalty": round(self.overlap_penalty, 4),
            "redundancyPenalty": round(self.redundancy_penalty, 4),
            "rejectionReasons": self.rejection_reasons,
            # Phase 2.7.9.2 fields
            "secondChanceApplied": self.second_chance_applied,
            "secondChanceBonus": round(self.second_chance_bonus, 4),
            "budgetRank": self.budget_rank,
            # Candidate tracing fields
            "image": self.image,
            "confidenceBeforeBonus": round(self.confidence_before_bonus, 4),
            "confidenceAfterBonus": round(self.confidence_after_bonus, 4),
            "sourceThreshold": round(self.source_threshold, 4),
            "wallSupportThreshold": round(self.wall_support_threshold, 4),
            "acceptedBeforeBudget": self.accepted_before_budget,
            "budgetLimit": self.budget_limit,
            "acceptedAfterBudget": self.accepted_after_budget,
            "rejectionReason": self.rejection_reason,
            "matchedGroundTruthId": self.matched_ground_truth_id,
            "iou": round(self.iou, 4),
            # Phase 2.9.1 fields
            "mlDoorConnection": round(self.ml_door_connection, 4),
            "fusionScore": round(self.fusion_score, 4),
            "baselineRank": self.baseline_rank,
            "fusionRank": self.fusion_rank,
            "promoted": self.promoted,
            "demoted": self.demoted,
        }

    def to_trace_record(self) -> Dict[str, Any]:
        """Conforms exactly to Phase 2.7.9.2 STEP 4 candidate trace schema."""
        return {
            "candidateId": self.candidate_id,
            "source": self.source,
            "image": self.image,
            "wallSupport": round(self.wall_support, 4),
            "enclosureScore": round(self.enclosure_score, 4),
            "exteriorExposure": round(self.exterior_exposure, 4),
            "architecturalScore": round(self.architectural_score, 4),
            "confidenceBeforeBonus": round(self.confidence_before_bonus, 4),
            "confidenceAfterBonus": round(self.confidence_after_bonus, 4),
            "sourceThreshold": round(self.source_threshold, 4),
            "wallSupportThreshold": round(self.wall_support_threshold, 4),
            "acceptedBeforeBudget": self.accepted_before_budget,
            "budgetRank": self.budget_rank,
            "budgetLimit": self.budget_limit,
            "acceptedAfterBudget": self.accepted_after_budget,
            "rejectionReason": self.rejection_reason,
            "matchedGroundTruthId": self.matched_ground_truth_id,
            "iou": round(self.iou, 4),
            "mlDoorConnection": round(self.ml_door_connection, 4),
            "fusionScore": round(self.fusion_score, 4),
            "baselineRank": self.baseline_rank,
            "fusionRank": self.fusion_rank,
            "promoted": self.promoted,
            "demoted": self.demoted,
        }


class RecoveryPrecisionEngine:
    """
    Precision-control layer for Phase 2.7.9.2 Candidate Recovery.
    Evaluates, ranks, budgets, and validates recovered room candidates against
    explainable positive & negative architectural evidence.

    Phase 2.7.9.2 changes:
    - Configuration-driven RecoveryPrecisionConfig
    - Architecture-aware budget: max(budget_min, min(budget_ceiling, num_primary + budget_primary_offset))
    - Second-chance for candidates with strong wall_support and enclosure
    - Candidate-level tracing for root cause validation
    - Source-specific statistics tracking for diagnostics
    """

    def __init__(
        self,
        config: Optional[DetectionConfig] = None,
        precision_config: Optional[RecoveryPrecisionConfig] = None,
    ):
        self.config = config or DetectionConfig()
        self.precision_config = (
            precision_config
            or getattr(self.config, "recovery_precision", None)
            or RecoveryPrecisionConfig()
        )
        # Phase 2.7.9.2: Source statistics for diagnostics
        self.source_statistics: Dict[str, Dict[str, Any]] = {}
        # Phase 2.7.9.2: Candidate traces for root cause validation
        self.candidate_traces: List[Dict[str, Any]] = []
        # Phase 2.9.1: ML evidence result for observability
        self.ml_evidence_result: Optional[Any] = None

    def evaluate_and_filter(
        self,
        accepted_primary: List[RoomHypothesis],
        recovered_candidates: List[RecoveredRoomHypothesis],
        wall_mask: np.ndarray,
        wall_network: Any,
        footprint_mask: Optional[np.ndarray],
        img_w: int,
        img_h: int,
        image_name: str = "",
        raw_image: Optional[np.ndarray] = None,
        ml_evidence_result: Optional[Any] = None,
    ) -> Tuple[List[RecoveredRoomHypothesis], List[RecoveredRoomHypothesis], List[RecoveryDecision]]:
        """
        Evaluates, ranks, budgets, and filters raw recovery candidates.
        Returns:
        - valid_accepted: List of accepted RecoveredRoomHypothesis
        - rejected_candidates: List of rejected RecoveredRoomHypothesis
        - decisions: List of RecoveryDecision for detailed diagnostic telemetry
        """
        if not recovered_candidates:
            return [], [], []

        # Phase 2.9.1: Resolve ML Evidence if enabled and not already provided
        ml_cfg = getattr(self.config, "ml_fusion", None)
        if ml_evidence_result is None and ml_cfg and ml_cfg.enabled:
            from ml.providers import get_structural_evidence_provider
            provider = get_structural_evidence_provider(ml_cfg)
            ml_evidence_result = provider.extract_evidence(
                raw_image, recovered_candidates, image_shape=(img_h, img_w)
            )
        self.ml_evidence_result = ml_evidence_result

        decisions: List[RecoveryDecision] = []
        scored_candidates: List[Tuple[RecoveredRoomHypothesis, RecoveryDecision]] = []

        # 1. Compute positive vs negative evidence for each candidate
        for rec in recovered_candidates:
            dec = self._score_candidate(rec, accepted_primary, wall_mask, wall_network, footprint_mask, img_w, img_h)
            dec.image = image_name
            dec.confidence_before_bonus = dec.confidence
            decisions.append(dec)
            scored_candidates.append((rec, dec))

        # 2. Source-aware thresholding + Phase 2.7.9.2 second-chance
        stage1_candidates: List[Tuple[RecoveredRoomHypothesis, RecoveryDecision]] = []
        for rec, dec in scored_candidates:
            # Apply second-chance boost BEFORE threshold check if enabled
            if self.precision_config.second_chance_enabled:
                self._apply_second_chance(dec)
            dec.confidence_after_bonus = dec.confidence

            pass_thresh, reason, src_thresh, wall_thresh = self._apply_source_thresholds_with_limits(dec)
            dec.source_threshold = src_thresh
            dec.wall_support_threshold = wall_thresh

            if pass_thresh:
                dec.accepted_before_budget = True
                stage1_candidates.append((rec, dec))
            else:
                dec.accepted = False
                dec.accepted_before_budget = False
                if reason:
                    dec.rejection_reasons.append(reason)
                    rec.rejection_reasons.append(reason)
                    if "wall" in reason.lower():
                        dec.rejection_reason = "below_wall_support"
                    else:
                        dec.rejection_reason = "below_confidence"

        # 3. Sort / Rank by confidence score descending
        # Record baseline ranks
        stage1_candidates.sort(key=lambda item: item[1].confidence, reverse=True)
        for b_rank, (rec, dec) in enumerate(stage1_candidates, 1):
            dec.baseline_rank = b_rank
            dec.fusion_score = dec.confidence
            dec.fusion_rank = b_rank

        # Phase 2.9.1: Controlled ML Structural Evidence Fusion (door_b10)
        if ml_cfg and ml_cfg.enabled and ml_evidence_result and not ml_evidence_result.ml_fallback:
            door_w = ml_cfg.door_weight
            for rec, dec in stage1_candidates:
                d_ev = ml_evidence_result.door_evidence.get(rec.id, 0.0)
                dec.ml_door_connection = d_ev
                # Formula: fusionScore = clamp(confidence + doorWeight * doorConnection, 0.0, 1.0)
                dec.fusion_score = max(0.0, min(1.0, dec.confidence + door_w * d_ev))

            # Re-rank by fusion score descending
            stage1_candidates.sort(key=lambda item: item[1].fusion_score, reverse=True)
            for f_rank, (rec, dec) in enumerate(stage1_candidates, 1):
                dec.fusion_rank = f_rank
                if dec.baseline_rank > 0:
                    dec.promoted = dec.fusion_rank < dec.baseline_rank
                    dec.demoted = dec.fusion_rank > dec.baseline_rank

        # 4. Architecture-aware Candidate Budgeting (Phase 2.7.9.2)
        budgeted_candidates, rejected_by_budget, max_budget = self._apply_candidate_budget(
            accepted_primary, stage1_candidates, img_w, img_h
        )

        for i, (rec, dec) in enumerate(budgeted_candidates):
            dec.budget_rank = i + 1
            dec.budget_limit = max_budget
            dec.accepted_after_budget = True

        for i, (rec, dec) in enumerate(rejected_by_budget):
            dec.budget_rank = len(budgeted_candidates) + i + 1
            dec.budget_limit = max_budget
            dec.accepted_after_budget = False
            dec.accepted = False
            dec.rejection_reasons.append("budget_exceeded")
            dec.rejection_reason = "budget_rejected"
            rec.rejection_reasons.append("budget_exceeded")

        # 5. Advanced Duplicate / Overlap Suppression vs Primary & higher-ranked candidates
        final_accepted_recs: List[RecoveredRoomHypothesis] = []
        final_rejected_recs: List[RecoveredRoomHypothesis] = [rec for rec, dec in scored_candidates if not dec.accepted]

        accepted_polys: List[ShapelyPolygon] = []
        for h in accepted_primary:
            try:
                coords = [(p.xPx, p.yPx) for p in h.polygon]
                if coords[0] != coords[-1]:
                    coords.append(coords[0])
                if len(coords) >= 4:
                    sp = ShapelyPolygon(coords)
                    if sp.is_valid and sp.area > 0:
                        accepted_polys.append(sp)
            except Exception:
                pass

        for rec, dec in budgeted_candidates:
            is_dup, dup_reason = self._check_overlap_or_duplicate(
                rec, accepted_polys, wall_mask, img_w, img_h
            )
            if is_dup:
                dec.accepted = False
                dec.rejection_reasons.append(dup_reason)
                rec.rejection_reasons.append(dup_reason)
                if "iou" in dup_reason.lower():
                    dec.rejection_reason = "duplicate"
                else:
                    dec.rejection_reason = "overlap_pruned"
                final_rejected_recs.append(rec)
            else:
                dec.accepted = True
                dec.rejection_reason = "accepted"
                final_accepted_recs.append(rec)
                # Add rec poly to accepted set for subsequent candidates
                try:
                    coords = [(p.xPx, p.yPx) for p in rec.polygon]
                    if coords[0] != coords[-1]:
                        coords.append(coords[0])
                    if len(coords) >= 4:
                        sp = ShapelyPolygon(coords)
                        if sp.is_valid and sp.area > 0:
                            accepted_polys.append(sp)
                except Exception:
                    pass

        # 6. Compute source statistics
        self._compute_source_statistics(scored_candidates)

        # 7. Record candidate traces
        for rec, dec in scored_candidates:
            self.candidate_traces.append(dec.to_trace_record())

        return final_accepted_recs, final_rejected_recs, decisions

    def _score_candidate(
        self,
        rec: RecoveredRoomHypothesis,
        accepted_primary: List[RoomHypothesis],
        wall_mask: np.ndarray,
        wall_network: Any,
        footprint_mask: Optional[np.ndarray],
        img_w: int,
        img_h: int,
    ) -> RecoveryDecision:
        pts = np.array([[int(p.xPx), int(p.yPx)] for p in rec.polygon], np.int32)

        # Bounding box crop for memory safety on high-resolution floorplans
        bx, by, bw, bh = cv2.boundingRect(pts)
        pad = 4
        x1 = max(0, bx - pad)
        y1 = max(0, by - pad)
        x2 = min(img_w, bx + bw + pad)
        y2 = min(img_h, by + bh + pad)
        local_pts = pts - np.array([x1, y1], dtype=np.int32)
        crop_h = y2 - y1
        crop_w = x2 - x1

        # 1. Compute Wall Support along boundary perimeter
        mask_poly = np.zeros((crop_h, crop_w), dtype=np.uint8)
        cv2.polylines(mask_poly, [local_pts], isClosed=True, color=255, thickness=3)
        local_wall = wall_mask[y1:y2, x1:x2]
        wall_hits = np.logical_and(mask_poly > 0, local_wall > 0)
        total_poly_px = np.count_nonzero(mask_poly > 0)
        wall_support = float(np.count_nonzero(wall_hits) / max(1, total_poly_px))

        # 2. Compute Enclosure Completeness
        fill_poly = np.zeros((crop_h, crop_w), dtype=np.uint8)
        cv2.fillPoly(fill_poly, [local_pts], color=255)
        area_px = float(np.count_nonzero(fill_poly > 0))

        # 3. Exterior exposure check
        exterior_exposure = 0.0
        if footprint_mask is not None:
            local_fp = footprint_mask[y1:y2, x1:x2]
            outside_fp = np.logical_and(fill_poly > 0, local_fp == 0)
            exterior_exposure = float(np.count_nonzero(outside_fp) / max(1, area_px))

        # 4. Strategy-specific positive evidence
        source = getattr(rec, "source", "wall_enclosure")
        architectural_score = wall_support
        enclosure_score = 1.0 - exterior_exposure
        repetition_score = 0.8 if source == "repeated_room" else 0.0
        neighbor_score = 0.8 if source == "neighboring_room" else 0.0

        # Positive & Negative evidence calculation
        pos_evidence = 0.5 * architectural_score + 0.3 * enclosure_score + 0.2 * max(repetition_score, neighbor_score)
        neg_evidence = 0.8 * exterior_exposure

        confidence = max(0.0, float(pos_evidence - neg_evidence))

        return RecoveryDecision(
            candidate_id=rec.id,
            source=source,
            accepted=True,
            confidence=confidence,
            architectural_score=architectural_score,
            enclosure_score=enclosure_score,
            exterior_exposure=exterior_exposure,
            repetition_score=repetition_score,
            neighbor_score=neighbor_score,
            wall_support=wall_support,
            negative_evidence=neg_evidence,
            overlap_penalty=0.0,
            redundancy_penalty=0.0,
        )

    def _apply_second_chance(self, dec: RecoveryDecision) -> None:
        """
        Phase 2.7.9.2: Apply a controlled second-chance confidence bonus for candidates
        with strong wall_support AND high enclosure_score, when strong negative evidence
        is absent.
        """
        if not self.precision_config.second_chance_enabled:
            return

        # Do not grant second chance to multi-unit (highest FP risk source)
        if dec.source in ("multi_unit_scanner", "multi_unit_grid"):
            return

        # Only grant if strong positive evidence on both axes
        if (
            dec.wall_support >= self.precision_config.second_chance_wall_support
            and dec.enclosure_score >= self.precision_config.second_chance_enclosure
        ):
            # Require low negative evidence (not exterior-exposed)
            if dec.negative_evidence < self.precision_config.second_chance_negative_evidence:
                dec.confidence = min(1.0, dec.confidence + self.precision_config.second_chance_bonus)
                dec.second_chance_applied = True
                dec.second_chance_bonus = self.precision_config.second_chance_bonus

    def _apply_source_thresholds(self, dec: RecoveryDecision) -> Tuple[bool, Optional[str]]:
        """Backwards-compatible wrapper returning (bool, Optional[str])."""
        ok, reason, _, _ = self._apply_source_thresholds_with_limits(dec)
        return ok, reason

    def _apply_source_thresholds_with_limits(
        self, dec: RecoveryDecision
    ) -> Tuple[bool, Optional[str], float, float]:
        """
        Phase 2.7.9.2: Source-specific thresholds fine-tuned from benchmark evidence,
        driven by self.precision_config.
        """
        src = dec.source
        conf = dec.confidence
        wall_sup = dec.wall_support
        cfg = self.precision_config

        if src in ("wall_enclosure", "closed_wall_enclosure"):
            src_thresh = cfg.wall_enclosure_confidence_threshold
            wall_thresh = 0.30
            if conf < src_thresh:
                return False, "insufficient_wall_enclosure_confidence", src_thresh, wall_thresh
            if wall_sup < wall_thresh:
                return False, "insufficient_wall_enclosure_wall_support", src_thresh, wall_thresh
        elif src in ("doorway_reconstruction", "doorway_gap"):
            src_thresh = cfg.doorway_confidence_threshold
            wall_thresh = 0.25
            if conf < src_thresh:
                return False, "insufficient_doorway_confidence", src_thresh, wall_thresh
            if wall_sup < wall_thresh:
                return False, "insufficient_doorway_wall_support", src_thresh, wall_thresh
        elif src in ("internal_partition", "partition_reconstruction"):
            src_thresh = cfg.partition_confidence_threshold
            wall_thresh = 0.35
            if conf < src_thresh:
                return False, "insufficient_partition_confidence", src_thresh, wall_thresh
            if wall_sup < wall_thresh:
                return False, "insufficient_partition_wall_support", src_thresh, wall_thresh
        elif src in ("repeated_room", "repeated_room_pattern"):
            src_thresh = cfg.repeated_room_confidence_threshold
            wall_thresh = 0.30
            if conf < src_thresh:
                return False, "insufficient_repetition_confidence", src_thresh, wall_thresh
            if wall_sup < wall_thresh:
                return False, "insufficient_repetition_wall_support", src_thresh, wall_thresh
        elif src in ("neighboring_room", "neighboring_room_pattern"):
            src_thresh = cfg.neighboring_room_confidence_threshold
            wall_thresh = 0.30
            if conf < src_thresh:
                return False, "insufficient_neighbor_confidence", src_thresh, wall_thresh
            if wall_sup < wall_thresh:
                return False, "insufficient_neighbor_wall_support", src_thresh, wall_thresh
        elif src in ("multi_unit_scanner", "multi_unit_grid"):
            src_thresh = cfg.multi_unit_confidence_threshold
            wall_thresh = 0.40
            if conf < src_thresh:
                return False, "insufficient_multi_unit_confidence", src_thresh, wall_thresh
            if wall_sup < wall_thresh:
                return False, "insufficient_multi_unit_wall_support", src_thresh, wall_thresh
        else:
            src_thresh = 0.43
            wall_thresh = 0.25
            if conf < src_thresh:
                return False, "insufficient_general_confidence", src_thresh, wall_thresh
            if wall_sup < wall_thresh:
                return False, "insufficient_general_wall_support", src_thresh, wall_thresh

        return True, None, src_thresh, wall_thresh

    def _apply_candidate_budget(
        self,
        accepted_primary: List[RoomHypothesis],
        candidates: List[Tuple[RecoveredRoomHypothesis, RecoveryDecision]],
        img_w: int,
        img_h: int,
    ) -> Tuple[
        List[Tuple[RecoveredRoomHypothesis, RecoveryDecision]],
        List[Tuple[RecoveredRoomHypothesis, RecoveryDecision]],
        int,
    ]:
        """
        Phase 2.7.9.2: Architecture-aware recovery candidate budget driven by precision_config.
        Formula: max(budget_min, min(budget_ceiling, num_primary + budget_primary_offset))
        """
        num_primary = len(accepted_primary)
        cfg = self.precision_config
        max_budget = max(
            cfg.budget_min,
            min(cfg.budget_ceiling, num_primary + cfg.budget_primary_offset),
        )

        budgeted = candidates[:max_budget]
        exceeded = candidates[max_budget:]
        return budgeted, exceeded, max_budget

    def _compute_source_statistics(
        self, scored_candidates: List[Tuple[Any, "RecoveryDecision"]]
    ) -> None:
        """
        Phase 2.7.9.2: Compute per-source statistics for diagnostic maps 65-66 and evaluation.
        Aggregates generated, accepted, rejected, confidence, and wall support per source.
        Supports both legacy keys for test compatibility and STEP 5 canonical keys.
        """
        stats: Dict[str, Dict[str, Any]] = {}
        for rec, dec in scored_candidates:
            src = dec.source
            if src not in stats:
                stats[src] = {
                    # Legacy keys for test_phase2792_cases.py test_30
                    "generated": 0,
                    "accepted": 0,
                    "rejected": 0,
                    # Canonical keys for STEP 5
                    "candidateCount": 0,
                    "acceptedCount": 0,
                    "rejectedCount": 0,
                    "budgetRejectedCount": 0,
                    "thresholdRejectedCount": 0,
                    "confidences": [],
                    "wall_supports": [],
                    "second_chance_count": 0,
                    "TP": 0,
                    "FP": 0,
                    "FN": 0,
                }
            s = stats[src]
            s["generated"] += 1
            s["candidateCount"] += 1
            s["confidences"].append(dec.confidence)
            s["wall_supports"].append(dec.wall_support)
            if dec.accepted:
                s["accepted"] += 1
                s["acceptedCount"] += 1
            else:
                s["rejected"] += 1
                s["rejectedCount"] += 1
                if dec.rejection_reason == "budget_rejected" or "budget" in "".join(dec.rejection_reasons):
                    s["budgetRejectedCount"] += 1
                else:
                    s["thresholdRejectedCount"] += 1
            if dec.second_chance_applied:
                s["second_chance_count"] += 1

        # Compute summary statistics
        for src, s in stats.items():
            confs = s["confidences"]
            walls = s["wall_supports"]
            mean_c = float(np.mean(confs)) if confs else 0.0
            med_c = float(np.median(confs)) if confs else 0.0
            mean_w = float(np.mean(walls)) if walls else 0.0

            s["mean_confidence"] = mean_c
            s["meanConfidence"] = round(mean_c, 4)
            s["medianConfidence"] = round(med_c, 4)
            s["mean_wall_support"] = mean_w
            s["meanWallSupport"] = round(mean_w, 4)
            s["min_confidence"] = float(min(confs)) if confs else 0.0
            s["max_confidence"] = float(max(confs)) if confs else 0.0
            del s["confidences"]
            del s["wall_supports"]

        self.source_statistics = stats

    def _check_overlap_or_duplicate(
        self,
        rec: RecoveredRoomHypothesis,
        existing_polys: List[ShapelyPolygon],
        wall_mask: np.ndarray,
        img_w: int,
        img_h: int,
    ) -> Tuple[bool, str]:
        """
        Differentiates adjacent valid rooms from duplicate or nested candidates.
        """
        try:
            poly_coords = [(p.xPx, p.yPx) for p in rec.polygon]
            if poly_coords[0] != poly_coords[-1]:
                poly_coords.append(poly_coords[0])
            if len(poly_coords) < 4:
                return True, "invalid_polygon_vertices"

            rec_poly = ShapelyPolygon(poly_coords)
            if not rec_poly.is_valid:
                rec_poly = rec_poly.buffer(0)

            rec_area = rec_poly.area
            if rec_area <= 0:
                return True, "zero_area_polygon"

            for ex_poly in existing_polys:
                if not ex_poly.is_valid or ex_poly.area <= 0:
                    continue

                inter_area = rec_poly.intersection(ex_poly).area
                if inter_area <= 0:
                    continue

                union_area = rec_poly.union(ex_poly).area
                iou = inter_area / max(1e-5, union_area)

                # 1. High IoU -> Duplicate
                if iou >= 0.40:
                    return True, f"high_overlap_iou_{iou:.2f}"

                # 2. High Containment -> Nested Candidate
                overlap_ratio_rec = inter_area / rec_area
                overlap_ratio_ex = inter_area / ex_poly.area

                if overlap_ratio_rec >= 0.60 or overlap_ratio_ex >= 0.60:
                    # Check if there is a strong dividing wall between them
                    diff_poly = rec_poly.difference(ex_poly)
                    if diff_poly.is_empty or diff_poly.area < 100:
                        return True, "nested_contained_candidate"

        except Exception:
            return False, ""

        return False, ""
