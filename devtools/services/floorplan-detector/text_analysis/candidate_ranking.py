"""
Phase 2.10.2 Text-Aware Candidate Ranking & Recovery Engine
Implements evidence-based candidate scoring, ranking displacement tracking,
and geometry-preserving room candidate selection.
"""
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, Tuple
import numpy as np
from shapely.geometry import Polygon as ShapelyPolygon

from .candidate_features import CandidateTextMetrics


@dataclass
class TextAwareCandidate:
    """
    Unified candidate representation containing geometry, classical confidence,
    ML structural evidence, and Phase 2.10.2 candidate text metrics.
    Geometry is strictly read-only and never mutated.
    """
    candidate_id: str
    image_id: str
    source: str
    polygon: List[Tuple[float, float]]  # [(x, y), ...]
    area: float = 0.0

    # Classical evidence
    classical_confidence: float = 0.0
    wall_support: float = 0.0
    enclosure_score: float = 0.0
    exterior_exposure: float = 0.0
    source_threshold: float = 0.45

    # ML structural evidence (from Phase 2.8.0 / Phase 2.9.1)
    ml_door_evidence: float = 0.0
    ml_cavity_likelihood: float = 0.0
    ml_structural_score: float = 0.0

    # Text evidence (from Phase 2.10.2)
    text_metrics: CandidateTextMetrics = field(default_factory=lambda: CandidateTextMetrics(candidate_id=""))

    # Ground truth matching
    matched_gt_id: Optional[str] = None
    iou: float = 0.0
    is_true_room: bool = False

    # Dynamic ranking state
    baseline_score: float = 0.0
    baseline_rank: int = -1
    new_score: float = 0.0
    new_rank: int = -1
    accepted_before: bool = False
    accepted_after: bool = False
    rejection_reason: str = "accepted"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "candidateId": self.candidate_id,
            "imageId": self.image_id,
            "source": self.source,
            "polygon": [[round(pt[0], 1), round(pt[1], 1)] for pt in self.polygon],
            "area": round(self.area, 1),
            "classicalConfidence": round(self.classical_confidence, 4),
            "wallSupport": round(self.wall_support, 4),
            "enclosureScore": round(self.enclosure_score, 4),
            "exteriorExposure": round(self.exterior_exposure, 4),
            "mlDoorEvidence": round(self.ml_door_evidence, 4),
            "mlCavityLikelihood": round(self.ml_cavity_likelihood, 4),
            "mlStructuralScore": round(self.ml_structural_score, 4),
            "textMetrics": self.text_metrics.to_dict(),
            "matchedGtId": self.matched_gt_id,
            "iou": round(self.iou, 4),
            "isTrueRoom": self.is_true_room,
            "baselineScore": round(self.baseline_score, 4),
            "baselineRank": self.baseline_rank,
            "newScore": round(self.new_score, 4),
            "newRank": self.new_rank,
            "acceptedBefore": self.accepted_before,
            "acceptedAfter": self.accepted_after,
            "rejectionReason": self.rejection_reason,
        }


@dataclass
class TextAwareRankingStrategy:
    """
    Configuration defining how candidate evidence terms are fused into ranking scores.
    """
    strategy_id: str
    strategy_name: str
    door_weight: float = 0.10             # Authoritative production door bonus
    text_positive_weight: float = 0.0     # Boost for centered interior text
    text_negative_weight: float = 0.0     # Penalty for text artifact cavities
    cavity_penalty_weight: float = 0.0    # Penalty for ML cavity likelihood
    structural_score_weight: float = 0.0  # Bonus for ML structural score

    def to_dict(self) -> Dict[str, Any]:
        return {
            "strategyId": self.strategy_id,
            "strategyName": self.strategy_name,
            "doorWeight": self.door_weight,
            "textPositiveWeight": self.text_positive_weight,
            "textNegativeWeight": self.text_negative_weight,
            "cavityPenaltyWeight": self.cavity_penalty_weight,
            "structuralScoreWeight": self.structural_score_weight,
        }


@dataclass
class RankDisplacementRecord:
    """
    Detailed displacement telemetry for an individual candidate between baseline and new strategy.
    """
    candidate_id: str
    image_id: str
    old_rank: int
    new_rank: int
    old_score: float
    new_score: float
    GT_match: Optional[str]
    IoU: float
    textEvidence: float
    doorEvidence: float
    cavityEvidence: float
    accepted_before: bool
    accepted_after: bool
    is_true_room: bool = False
    promoted: bool = False
    demoted: bool = False
    rank_delta: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "candidate_id": self.candidate_id,
            "image_id": self.image_id,
            "old_rank": self.old_rank,
            "new_rank": self.new_rank,
            "old_score": round(self.old_score, 4),
            "new_score": round(self.new_score, 4),
            "GT_match": self.GT_match,
            "IoU": round(self.IoU, 4),
            "textEvidence": round(self.textEvidence, 4),
            "doorEvidence": round(self.doorEvidence, 4),
            "cavityEvidence": round(self.cavityEvidence, 4),
            "accepted_before": self.accepted_before,
            "accepted_after": self.accepted_after,
            "is_true_room": self.is_true_room,
            "promoted": self.promoted,
            "demoted": self.demoted,
            "rank_delta": self.rank_delta,
        }


def compute_candidate_score(cand: TextAwareCandidate, strat: TextAwareRankingStrategy) -> float:
    """
    Computes fusion score based on strategy weights:
    Score = classical_confidence + w_door * door_ev + w_text_pos * textRoomEvidence
            - w_text_neg * textArtifactEvidence - w_cavity * cavity_ev + w_struct * struct_ev
    Clamped to [0.0, 1.0].
    """
    score = cand.classical_confidence
    if strat.door_weight > 0:
        score += strat.door_weight * cand.ml_door_evidence
    if strat.text_positive_weight > 0:
        score += strat.text_positive_weight * cand.text_metrics.text_room_evidence
    if strat.text_negative_weight > 0:
        score += -strat.text_negative_weight * cand.text_metrics.text_artifact_evidence
    if strat.cavity_penalty_weight > 0:
        score += -strat.cavity_penalty_weight * cand.ml_cavity_likelihood
    if strat.structural_score_weight > 0:
        score += strat.structural_score_weight * cand.ml_structural_score

    return float(np.clip(score, 0.0, 1.0))


def rank_and_select_candidates(
    candidates: List[TextAwareCandidate],
    primary_polygons: List[ShapelyPolygon],
    strategy: TextAwareRankingStrategy,
    budget_limit: int,
    iou_overlap_thresh: float = 0.25,
) -> Tuple[List[TextAwareCandidate], List[TextAwareCandidate], List[RankDisplacementRecord]]:
    """
    Ranks candidates by strategy score, enforces budget cap, and performs duplicate suppression.
    Zero geometry mutation: candidate polygon vertices are strictly unchanged.
    """
    if not candidates:
        return [], [], []

    # 1. Compute scores
    for cand in candidates:
        cand.new_score = compute_candidate_score(cand, strategy)

    # 2. Sort by new score descending
    sorted_candidates = sorted(candidates, key=lambda c: c.new_score, reverse=True)
    for rank_idx, cand in enumerate(sorted_candidates, 1):
        cand.new_rank = rank_idx

    # 3. Budget allocation and duplicate suppression
    accepted_candidates: List[TextAwareCandidate] = []
    rejected_candidates: List[TextAwareCandidate] = []
    accepted_polys: List[ShapelyPolygon] = list(primary_polygons)

    for cand in sorted_candidates:
        # Check source threshold
        if cand.classical_confidence < cand.source_threshold:
            cand.accepted_after = False
            cand.rejection_reason = "below_threshold"
            rejected_candidates.append(cand)
            continue

        # Check budget limit
        if len(accepted_candidates) >= budget_limit:
            cand.accepted_after = False
            cand.rejection_reason = "budget_exceeded"
            rejected_candidates.append(cand)
            continue

        # Check overlap / duplicate vs primary and accepted recovery
        try:
            c_poly = ShapelyPolygon(cand.polygon)
            if not c_poly.is_valid:
                c_poly = c_poly.buffer(0)
            c_area = float(c_poly.area)

            is_duplicate = False
            for ap in accepted_polys:
                if ap.intersects(c_poly):
                    inter = float(ap.intersection(c_poly).area)
                    u = c_area + float(ap.area) - inter
                    iou = inter / u if u > 0 else 0.0
                    overlap_ratio = inter / c_area if c_area > 0 else 0.0
                    if iou >= iou_overlap_thresh or overlap_ratio >= 0.65:
                        is_duplicate = True
                        break

            if is_duplicate:
                cand.accepted_after = False
                cand.rejection_reason = "duplicate"
                rejected_candidates.append(cand)
            else:
                cand.accepted_after = True
                cand.rejection_reason = "accepted"
                accepted_candidates.append(cand)
                accepted_polys.append(c_poly)
        except Exception:
            cand.accepted_after = False
            cand.rejection_reason = "geometry_error"
            rejected_candidates.append(cand)

    # 4. Generate displacement records
    displacement_records: List[RankDisplacementRecord] = []
    for cand in candidates:
        rank_delta = cand.baseline_rank - cand.new_rank  # Positive = promoted
        promoted = cand.new_rank < cand.baseline_rank if cand.baseline_rank > 0 else False
        demoted = cand.new_rank > cand.baseline_rank if cand.baseline_rank > 0 else False

        rec = RankDisplacementRecord(
            candidate_id=cand.candidate_id,
            image_id=cand.image_id,
            old_rank=cand.baseline_rank,
            new_rank=cand.new_rank,
            old_score=cand.baseline_score,
            new_score=cand.new_score,
            GT_match=cand.matched_gt_id,
            IoU=cand.iou,
            textEvidence=cand.text_metrics.text_room_evidence,
            doorEvidence=cand.ml_door_evidence,
            cavityEvidence=cand.text_metrics.text_artifact_evidence,
            accepted_before=cand.accepted_before,
            accepted_after=cand.accepted_after,
            is_true_room=cand.is_true_room,
            promoted=promoted,
            demoted=demoted,
            rank_delta=rank_delta,
        )
        displacement_records.append(rec)

    return accepted_candidates, rejected_candidates, displacement_records
