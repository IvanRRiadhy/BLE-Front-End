"""
Validation Pipeline for Phase 2.10.8 Room Validity & False Positive Suppression.
Coordinates feature extraction, validity scoring, decision policy, boundary refinement,
and generates ValidatedRoom outputs.
"""
from typing import List, Tuple, Dict, Any, Optional
import copy
import numpy as np
from shapely.geometry import Polygon as ShapelyPolygon
from .models import RoomValidityHypothesis, RoomValidityDecision, ValidatedRoom, ValidationResult
from .features import RoomValidityFeatureExtractor
from .validity_scoring import ValidityScorer
from .decision import RoomValidityDecisionPolicy
from .boundary_quality import BoundaryQualityRefiner


class RoomValidationPipeline:
    """
    End-to-end coordinator for Room Validity & False Positive Suppression.
    """

    def __init__(
        self,
        feature_extractor: Optional[RoomValidityFeatureExtractor] = None,
        scorer: Optional[ValidityScorer] = None,
        decision_policy: Optional[RoomValidityDecisionPolicy] = None,
        boundary_refiner: Optional[BoundaryQualityRefiner] = None,
        use_ml: bool = False,
        refine_boundaries: bool = True,
    ):
        self.feature_extractor = feature_extractor or RoomValidityFeatureExtractor()
        self.scorer = scorer or ValidityScorer()
        self.decision_policy = decision_policy or RoomValidityDecisionPolicy()
        self.boundary_refiner = boundary_refiner or BoundaryQualityRefiner()
        self.use_ml = use_ml
        self.refine_boundaries = refine_boundaries

    def process_hypotheses(
        self,
        hypotheses: List[RoomValidityHypothesis],
        img_w: int,
        img_h: int,
        wall_network: Optional[Any] = None,
        wall_mask: Optional[Any] = None,
        footprint_mask: Optional[Any] = None,
        doors: Optional[List[Any]] = None,
        text_regions: Optional[List[Any]] = None,
        interior_strokes_mask: Optional[Any] = None,
        graph: Optional[Any] = None,
        ml_evidence: Optional[Dict[str, Any]] = None,
    ) -> ValidationResult:
        """
        Processes a collection of candidate room hypotheses and produces a ValidationResult.
        """
        if not hypotheses:
            return ValidationResult(
                image_id="unknown",
                valid_rooms=[],
                ambiguous_rooms=[],
                rejected_rooms=[],
                statistics={"total_hypotheses": 0, "valid_count": 0, "ambiguous_count": 0, "rejected_count": 0},
            )

        image_id = hypotheses[0].image_id if hypotheses else "unknown"

        # 1. Feature Extraction
        self.feature_extractor.extract_features_for_all(
            hypotheses=hypotheses,
            img_w=img_w,
            img_h=img_h,
            wall_network=wall_network,
            wall_mask=wall_mask,
            footprint_mask=footprint_mask,
            doors=doors,
            text_regions=text_regions,
            interior_strokes_mask=interior_strokes_mask,
            graph=graph,
            ml_evidence=ml_evidence,
        )

        # 2. Validity Scoring
        self.scorer.score_all(hypotheses, use_ml=self.use_ml)

        # 3. Decision Policy
        self.decision_policy.evaluate_all(hypotheses)

        # 4. Group into Valid, Ambiguous, and Rejected
        valid_hyps = [h for h in hypotheses if h.decision in [RoomValidityDecision.VALID, RoomValidityDecision.PROBABLE_ROOM]]
        ambiguous_hyps = [h for h in hypotheses if h.decision == RoomValidityDecision.AMBIGUOUS]
        rejected_hyps = [h for h in hypotheses if h.decision in [RoomValidityDecision.NON_ROOM, RoomValidityDecision.PROBABLE_NON_ROOM]]

        # 5. Boundary Refinement on Valid Rooms
        valid_rooms: List[ValidatedRoom] = []
        for idx, h in enumerate(valid_hyps):
            poly = h.polygon
            boundary_q = h.boundary_quality
            if self.refine_boundaries:
                poly, boundary_q = self.boundary_refiner.refine_boundary(poly, wall_network=wall_network)

            v_room = ValidatedRoom(
                room_id=f"val_room_{idx:03d}",
                hypothesis_id=h.hypothesis_id,
                image_id=h.image_id,
                polygon=poly,
                confidence=h.confidence,
                room_validity_score=h.room_validity_score,
                architectural_score=h.architectural_score,
                boundary_quality=boundary_q,
                is_corridor=h.is_corridor,
                decision=h.decision.value,
                decision_reasons=[h.decision_reason],
                source_hypotheses=h.source_proposal_ids,
            )
            valid_rooms.append(v_room)

        statistics = {
            "total_hypotheses": len(hypotheses),
            "valid_count": len(valid_rooms),
            "ambiguous_count": len(ambiguous_hyps),
            "rejected_count": len(rejected_hyps),
            "mean_validity_score": float(np.mean([h.room_validity_score for h in hypotheses])),
            "mean_valid_score": float(np.mean([h.room_validity_score for h in valid_hyps])) if valid_hyps else 0.0,
            "mean_rejected_score": float(np.mean([h.room_validity_score for h in rejected_hyps])) if rejected_hyps else 0.0,
        }

        return ValidationResult(
            image_id=image_id,
            valid_rooms=valid_rooms,
            ambiguous_rooms=ambiguous_hyps,
            rejected_rooms=rejected_hyps,
            statistics=statistics,
        )
