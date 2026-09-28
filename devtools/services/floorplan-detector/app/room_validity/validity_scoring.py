"""
Validity Scoring Engine for Phase 2.10.8 Room Validity.
Calculates transparent normalized positive evidence, negative evidence,
and composite roomValidityScore in [0.0, 1.0].
"""
from typing import List, Dict, Any, Optional
import numpy as np
from .models import RoomValidityHypothesis


class ValidityScorer:
    """
    Computes positive score, negative score, and composite room validity score.
    """

    def __init__(
        self,
        # Positive weights
        w_wall: float = 0.35,
        w_enclosure: float = 0.20,
        w_door: float = 0.15,
        w_topology: float = 0.10,
        w_partition: float = 0.10,
        w_regularity: float = 0.10,
        # Negative weights
        w_exterior: float = 0.35,
        w_furniture: float = 0.20,
        w_text: float = 0.15,
        w_hatch: float = 0.15,
        w_sliver: float = 0.25,
        w_artificial_cavity: float = 0.30,
        # ML weights (when ML available)
        w_ml_wall: float = 0.10,
        w_ml_door: float = 0.10,
    ):
        self.w_wall = w_wall
        self.w_enclosure = w_enclosure
        self.w_door = w_door
        self.w_topology = w_topology
        self.w_partition = w_partition
        self.w_regularity = w_regularity

        self.w_exterior = w_exterior
        self.w_furniture = w_furniture
        self.w_text = w_text
        self.w_hatch = w_hatch
        self.w_sliver = w_sliver
        self.w_artificial_cavity = w_artificial_cavity

        self.w_ml_wall = w_ml_wall
        self.w_ml_door = w_ml_door

    def score_hypothesis(
        self,
        hyp: RoomValidityHypothesis,
        use_ml: bool = False,
    ) -> float:
        """
        Calculates room_validity_score, room_likelihood, and non_room_likelihood.
        """
        # 1. Base positive score
        pos = (
            self.w_wall * hyp.wall_boundary_support
            + self.w_enclosure * hyp.enclosure_score
            + self.w_door * hyp.doorway_evidence
            + self.w_topology * hyp.topology_consistency
            + self.w_partition * hyp.partition_evidence
            + self.w_regularity * hyp.room_regularity
        )

        # Optional ML boost
        if use_ml and hyp.ml_available:
            pos += (self.w_ml_wall * hyp.ml_wall_support + self.w_ml_door * hyp.ml_door_support)

        # Semantic Corridor bonus
        if hyp.is_corridor and hyp.corridor_likelihood >= 0.50:
            pos += 0.15 * hyp.corridor_likelihood

        # Semantic Large Space bonus
        if hyp.is_large_space and hyp.large_space_likelihood >= 0.50:
            pos += 0.20 * hyp.large_space_likelihood

        # 2. Base negative score
        neg = (
            self.w_exterior * hyp.exterior_likelihood
            + self.w_furniture * hyp.furniture_likelihood
            + self.w_text * hyp.text_likelihood
            + self.w_hatch * hyp.hatch_dimension_likelihood
            + self.w_sliver * hyp.sliver_likelihood
            + self.w_artificial_cavity * hyp.artificial_cavity_likelihood
        )

        # Unsupported boundary penalty
        if hyp.unsupported_boundary_ratio >= 0.50:
            neg += 0.25 * hyp.unsupported_boundary_ratio

        # Large space artifact penalty
        if hyp.is_large_space and hyp.large_space_artifact_likelihood >= 0.50:
            neg += 0.30 * hyp.large_space_artifact_likelihood

        # Normalize components
        pos_norm = float(np.clip(pos, 0.0, 1.5))
        neg_norm = float(np.clip(neg, 0.0, 1.5))

        # Composite validity score in [0.0, 1.0]
        # Base confidence from formation score provides anchoring
        base_anchor = 0.20 * hyp.formation_score
        raw_score = base_anchor + (pos_norm - neg_norm)
        validity_score = float(np.clip(raw_score, 0.01, 0.99))

        # Room Likelihood vs Non-Room Likelihood
        room_likelihood = float(np.clip(pos_norm / max(0.1, pos_norm + neg_norm), 0.0, 1.0))
        non_room_likelihood = float(np.clip(neg_norm / max(0.1, pos_norm + neg_norm), 0.0, 1.0))
        ambiguity_score = float(1.0 - abs(room_likelihood - non_room_likelihood))

        hyp.positive_score = round(pos_norm, 4)
        hyp.negative_score = round(neg_norm, 4)
        hyp.room_validity_score = round(validity_score, 4)
        hyp.room_likelihood = round(room_likelihood, 4)
        hyp.non_room_likelihood = round(non_room_likelihood, 4)
        hyp.ambiguity_score = round(ambiguity_score, 4)

        if hyp.features is not None:
            hyp.features["positive_score"] = hyp.positive_score
            hyp.features["negative_score"] = hyp.negative_score
            hyp.features["room_validity_score"] = hyp.room_validity_score
            hyp.features["room_likelihood"] = hyp.room_likelihood
            hyp.features["non_room_likelihood"] = hyp.non_room_likelihood
            hyp.features["ambiguity_score"] = hyp.ambiguity_score

        return hyp.room_validity_score

    def score_all(
        self,
        hypotheses: List[RoomValidityHypothesis],
        use_ml: bool = False,
    ) -> List[RoomValidityHypothesis]:
        for h in hypotheses:
            self.score_hypothesis(h, use_ml=use_ml)
        return hypotheses
