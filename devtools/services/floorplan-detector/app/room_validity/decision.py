"""
Decision Policy & False Positive Assignment for Phase 2.10.8 Room Validity.
Assigns multi-tier decisions (VALID, PROBABLE_ROOM, AMBIGUOUS, PROBABLE_NON_ROOM, NON_ROOM)
and populates explainable False Positive taxonomy reason codes.
"""
from typing import List, Dict, Any, Optional
from .models import RoomValidityHypothesis, RoomValidityDecision
from .false_positive_taxonomy import FalsePositiveReason, describe_reason


class RoomValidityDecisionPolicy:
    """
    Applies multi-layer decision thresholds and assigns false positive taxonomy codes.
    """

    def __init__(
        self,
        high_threshold: float = 0.45,
        low_threshold: float = 0.20,
    ):
        self.high_threshold = high_threshold
        self.low_threshold = low_threshold

    def evaluate_hypothesis(
        self,
        hyp: RoomValidityHypothesis,
    ) -> RoomValidityDecision:
        """
        Determines the validity decision and assigns specific failure reasons.
        """
        score = hyp.room_validity_score
        reasons: List[FalsePositiveReason] = []

        # Check negative evidence for specific reason codes
        if hyp.exterior_likelihood >= 0.50:
            reasons.append(FalsePositiveReason.FP_EXTERIOR)
        if hyp.background_likelihood >= 0.50:
            reasons.append(FalsePositiveReason.FP_BACKGROUND)
        if hyp.furniture_likelihood >= 0.45:
            reasons.append(FalsePositiveReason.FP_FURNITURE)
        if hyp.text_likelihood >= 0.35:
            reasons.append(FalsePositiveReason.FP_TEXT)
        if hyp.hatch_dimension_likelihood >= 0.45:
            reasons.append(FalsePositiveReason.FP_HATCH)
        if hyp.sliver_likelihood >= 0.60:
            reasons.append(FalsePositiveReason.FP_SLIVER)
        if hyp.artificial_cavity_likelihood >= 0.60:
            reasons.append(FalsePositiveReason.FP_ARTIFICIAL_CAVITY)
        if hyp.unsupported_boundary_ratio >= 0.65:
            reasons.append(FalsePositiveReason.FP_UNSUPPORTED_BOUNDARY)
        if hyp.wall_boundary_support < 0.20 and hyp.doorway_count == 0:
            reasons.append(FalsePositiveReason.FP_LOW_ARCHITECTURAL_SUPPORT)

        # Multi-layer threshold classification
        if score >= self.high_threshold:
            decision = RoomValidityDecision.VALID
            reason_str = "Strong architectural support and low negative penalty"
            reasons = []  # Clear rejection reasons if fully valid
        elif score >= (self.high_threshold - 0.10):
            decision = RoomValidityDecision.PROBABLE_ROOM
            reason_str = "Moderate architectural support above threshold"
            reasons = []
        elif score >= self.low_threshold:
            decision = RoomValidityDecision.AMBIGUOUS
            reason_str = "Ambiguous evidence; within intermediate band"
            if not reasons:
                reasons.append(FalsePositiveReason.FP_LOW_ARCHITECTURAL_SUPPORT)
        elif score >= (self.low_threshold - 0.10):
            decision = RoomValidityDecision.PROBABLE_NON_ROOM
            reason_str = "High negative penalty or low wall support"
            if not reasons:
                reasons.append(FalsePositiveReason.FP_LOW_ARCHITECTURAL_SUPPORT)
        else:
            decision = RoomValidityDecision.NON_ROOM
            reason_str = "Severe negative evidence or non-architectural cavity"
            if not reasons:
                reasons.append(FalsePositiveReason.FP_ARTIFICIAL_CAVITY)

        hyp.decision = decision
        hyp.decision_reason = reason_str
        hyp.rejection_reasons = reasons

        if hyp.features is not None:
            hyp.features["decision"] = decision.value
            hyp.features["rejection_reasons"] = [r.value for r in reasons]

        return decision

    def evaluate_all(
        self,
        hypotheses: List[RoomValidityHypothesis],
    ) -> List[RoomValidityHypothesis]:
        for h in hypotheses:
            self.evaluate_hypothesis(h)
        return hypotheses
