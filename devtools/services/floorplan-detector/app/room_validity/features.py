"""
Feature Extraction Coordinator for Phase 2.10.8 Room Validity.
Coordinates positive architectural evidence, negative penalties, semantic safeguards,
and optional ML structural evidence.
"""
from typing import List, Tuple, Dict, Any, Optional
import numpy as np
from .models import RoomValidityHypothesis
from .architectural_evidence import ArchitecturalEvidenceExtractor
from .negative_evidence import NegativeEvidenceExtractor
from .room_classifier import SemanticRoomClassifier


class RoomValidityFeatureExtractor:
    """
    Coordinates extraction of all features for room hypotheses.
    """

    def __init__(
        self,
        arch_extractor: Optional[ArchitecturalEvidenceExtractor] = None,
        neg_extractor: Optional[NegativeEvidenceExtractor] = None,
        semantic_classifier: Optional[SemanticRoomClassifier] = None,
    ):
        self.arch_extractor = arch_extractor or ArchitecturalEvidenceExtractor()
        self.neg_extractor = neg_extractor or NegativeEvidenceExtractor()
        self.semantic_classifier = semantic_classifier or SemanticRoomClassifier()

    def extract_features_for_hypothesis(
        self,
        hyp: RoomValidityHypothesis,
        img_w: int,
        img_h: int,
        wall_network: Optional[Any] = None,
        wall_mask: Optional[np.ndarray] = None,
        footprint_mask: Optional[np.ndarray] = None,
        doors: Optional[List[Any]] = None,
        text_regions: Optional[List[Any]] = None,
        interior_strokes_mask: Optional[np.ndarray] = None,
        graph: Optional[Any] = None,
        ml_evidence: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Extracts positive, negative, semantic, and optional ML features.
        Stores them in hyp.features and updates hypothesis attributes.
        """
        # 1. Positive architectural evidence
        pos_ev = self.arch_extractor.extract_evidence(
            hyp=hyp,
            wall_network=wall_network,
            wall_mask=wall_mask,
            doors=doors,
            graph=graph,
        )

        # 2. Negative evidence
        neg_ev = self.neg_extractor.extract_negative_evidence(
            hyp=hyp,
            img_w=img_w,
            img_h=img_h,
            footprint_mask=footprint_mask,
            text_regions=text_regions,
            interior_strokes_mask=interior_strokes_mask,
        )

        # 3. Semantic classification (corridor & large space safeguards)
        self.semantic_classifier.classify_semantics(hyp)

        # 4. Optional ML Evidence (Phase 2.9 RT-DETR)
        if ml_evidence is not None and hyp.hypothesis_id in ml_evidence:
            ml_data = ml_evidence[hyp.hypothesis_id]
            hyp.ml_wall_support = float(ml_data.get("ml_wall_support", 0.0))
            hyp.ml_door_support = float(ml_data.get("ml_door_support", 0.0))
            hyp.ml_opening_support = float(ml_data.get("ml_opening_support", 0.0))
            hyp.ml_structural_confidence = float(ml_data.get("ml_structural_confidence", 0.0))
            hyp.ml_available = True
        else:
            hyp.ml_available = False

        # Aggregate raw features dictionary
        features = {
            # Geometry & Metadata
            "area_px": round(hyp.area_px, 1),
            "aspect_ratio": round(hyp.aspect_ratio, 2),
            "compactness": round(hyp.compactness, 4),
            "formation_score": round(hyp.formation_score, 4),
            # Positive
            "wall_boundary_support": round(hyp.wall_boundary_support, 4),
            "wall_junction_support": round(hyp.wall_junction_support, 4),
            "wall_continuity": round(hyp.wall_continuity, 4),
            "wall_thickness_consistency": round(hyp.wall_thickness_consistency, 4),
            "enclosure_score": round(hyp.enclosure_score, 4),
            "doorway_count": hyp.doorway_count,
            "doorway_evidence": round(hyp.doorway_evidence, 4),
            "doorway_confidence": round(hyp.doorway_confidence, 4),
            "partition_evidence": round(hyp.partition_evidence, 4),
            "topology_consistency": round(hyp.topology_consistency, 4),
            "neighbor_consistency": round(hyp.neighbor_consistency, 4),
            "room_regularity": round(hyp.room_regularity, 4),
            "unsupported_boundary_ratio": round(hyp.unsupported_boundary_ratio, 4),
            # Negative
            "exterior_likelihood": round(hyp.exterior_likelihood, 4),
            "background_likelihood": round(hyp.background_likelihood, 4),
            "furniture_likelihood": round(hyp.furniture_likelihood, 4),
            "text_likelihood": round(hyp.text_likelihood, 4),
            "hatch_dimension_likelihood": round(hyp.hatch_dimension_likelihood, 4),
            "sliver_likelihood": round(hyp.sliver_likelihood, 4),
            "artificial_cavity_likelihood": round(hyp.artificial_cavity_likelihood, 4),
            # Semantic
            "is_corridor": hyp.is_corridor,
            "corridor_likelihood": round(hyp.corridor_likelihood, 4),
            "is_large_space": hyp.is_large_space,
            "large_space_likelihood": round(hyp.large_space_likelihood, 4),
            "large_space_artifact_likelihood": round(hyp.large_space_artifact_likelihood, 4),
            # ML
            "ml_available": hyp.ml_available,
            "ml_wall_support": round(hyp.ml_wall_support, 4),
            "ml_door_support": round(hyp.ml_door_support, 4),
            "ml_structural_confidence": round(hyp.ml_structural_confidence, 4),
        }

        hyp.features = features
        return features

    def extract_features_for_all(
        self,
        hypotheses: List[RoomValidityHypothesis],
        img_w: int,
        img_h: int,
        wall_network: Optional[Any] = None,
        wall_mask: Optional[np.ndarray] = None,
        footprint_mask: Optional[np.ndarray] = None,
        doors: Optional[List[Any]] = None,
        text_regions: Optional[List[Any]] = None,
        interior_strokes_mask: Optional[np.ndarray] = None,
        graph: Optional[Any] = None,
        ml_evidence: Optional[Dict[str, Any]] = None,
    ) -> List[RoomValidityHypothesis]:
        for h in hypotheses:
            self.extract_features_for_hypothesis(
                hyp=h,
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
        return hypotheses
