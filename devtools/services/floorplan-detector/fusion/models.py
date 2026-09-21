"""
Phase 2.9.0 Fusion Data Models
Defines dataclasses for fusion candidates, scoring parameters, strategy configurations,
displacement tracking, and evaluation outputs.
"""
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, Tuple


@dataclass
class FusionCandidate:
    """
    Unified representation of a recovery candidate combining classical and ML evidence.
    """
    candidate_id: str
    image_id: str
    source: str
    polygon: List[Tuple[float, float]]  # [(x, y), ...]
    
    # Classical evidence
    classical_confidence: float = 0.0
    wall_support_classical: float = 0.0
    enclosure_score: float = 0.0
    exterior_exposure: float = 0.0
    negative_evidence: float = 0.0
    classical_accepted_before_budget: bool = False
    classical_rejection_reason: str = "accepted"
    classical_budget_rank: int = -1
    
    # ML structural evidence (from RT-DETR-L)
    ml_wall_support: float = 0.0
    ml_door_evidence: float = 0.0
    ml_window_evidence: float = 0.0
    ml_linkage_evidence: float = 0.0
    ml_structural_score: float = 0.0
    ml_cavity_likelihood: float = 0.0
    
    # Ground truth matching
    matched_gt_id: Optional[str] = None
    iou: float = 0.0
    is_true_room: bool = False

    # Fusion evaluation state (updated by strategy)
    fusion_score: float = 0.0
    fusion_rank: int = -1
    fusion_accepted: bool = False
    fusion_rejection_reason: str = "accepted"
    fusion_second_chance_applied: bool = False
    rank_delta: int = 0  # classical_budget_rank - fusion_rank (positive = promoted)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "candidateId": self.candidate_id,
            "imageId": self.image_id,
            "source": self.source,
            "polygon": [[round(pt[0], 1), round(pt[1], 1)] for pt in self.polygon],
            "classicalConfidence": round(self.classical_confidence, 4),
            "wallSupportClassical": round(self.wall_support_classical, 4),
            "enclosureScore": round(self.enclosure_score, 4),
            "exteriorExposure": round(self.exterior_exposure, 4),
            "classicalAcceptedBeforeBudget": self.classical_accepted_before_budget,
            "classicalRejectionReason": self.classical_rejection_reason,
            "classicalBudgetRank": self.classical_budget_rank,
            "mlWallSupport": round(self.ml_wall_support, 4),
            "mlDoorEvidence": round(self.ml_door_evidence, 4),
            "mlWindowEvidence": round(self.ml_window_evidence, 4),
            "mlLinkageEvidence": round(self.ml_linkage_evidence, 4),
            "mlStructuralScore": round(self.ml_structural_score, 4),
            "mlCavityLikelihood": round(self.ml_cavity_likelihood, 4),
            "matchedGtId": self.matched_gt_id,
            "iou": round(self.iou, 4),
            "isTrueRoom": self.is_true_room,
            "fusionScore": round(self.fusion_score, 4),
            "fusionRank": self.fusion_rank,
            "fusionAccepted": self.fusion_accepted,
            "fusionRejectionReason": self.fusion_rejection_reason,
            "fusionSecondChanceApplied": self.fusion_second_chance_applied,
            "rankDelta": self.rank_delta,
        }


@dataclass
class FusionStrategyConfig:
    """
    Configuration for an experimental fusion strategy.
    """
    strategy_id: str
    strategy_name: str
    description: str = ""
    
    # Coefficients
    cavity_penalty_weight: float = 0.0       # lambda_cavity
    door_bonus_weight: float = 0.0           # lambda_door
    structural_score_weight: float = 0.0     # lambda_struct
    
    # Strategy F: ML Veto
    enable_ml_veto: bool = False
    veto_cavity_threshold: float = 0.90
    veto_door_threshold: float = 0.05
    
    # Strategy G: ML Second Chance
    enable_ml_second_chance: bool = False
    second_chance_door_threshold: float = 0.85
    second_chance_min_wall_support: float = 0.15
    second_chance_bonus: float = 0.10

    def to_dict(self) -> Dict[str, Any]:
        return {
            "strategyId": self.strategy_id,
            "strategyName": self.strategy_name,
            "description": self.description,
            "cavityPenaltyWeight": self.cavity_penalty_weight,
            "doorBonusWeight": self.door_bonus_weight,
            "structuralScoreWeight": self.structural_score_weight,
            "enableMlVeto": self.enable_ml_veto,
            "vetoCavityThreshold": self.veto_cavity_threshold,
            "vetoDoorThreshold": self.veto_door_threshold,
            "enableMlSecondChance": self.enable_ml_second_chance,
            "secondChanceDoorThreshold": self.second_chance_door_threshold,
            "secondChanceMinWallSupport": self.second_chance_min_wall_support,
            "secondChanceBonus": self.second_chance_bonus,
        }


@dataclass
class DisplacementRecord:
    """
    Tracks rank displacement between classical CV and ML fusion for a candidate.
    """
    candidate_id: str
    image_id: str
    is_true_room: bool
    matched_gt_id: Optional[str]
    iou: float
    classical_rank: int
    fusion_rank: int
    rank_delta: int  # classical - fusion (positive = improved/promoted)
    accepted_before_budget_classical: bool
    accepted_before_budget_fusion: bool
    accepted_after_budget_classical: bool
    accepted_after_budget_fusion: bool
    moved_into_budget: bool = False
    pushed_out_of_budget: bool = False

    def to_dict(self) -> Dict[str, Any]:
        return {
            "candidateId": self.candidate_id,
            "imageId": self.image_id,
            "isTrueRoom": self.is_true_room,
            "matchedGtId": self.matched_gt_id,
            "iou": round(self.iou, 4),
            "classicalRank": self.classical_rank,
            "fusionRank": self.fusion_rank,
            "rankDelta": self.rank_delta,
            "acceptedBeforeBudgetClassical": self.accepted_before_budget_classical,
            "acceptedBeforeBudgetFusion": self.accepted_before_budget_fusion,
            "acceptedAfterBudgetClassical": self.accepted_after_budget_classical,
            "acceptedAfterBudgetFusion": self.accepted_after_budget_fusion,
            "movedIntoBudget": self.moved_into_budget,
            "pushedOutOfBudget": self.pushed_out_of_budget,
        }


@dataclass
class BenchmarkSummary:
    """
    Quantitative benchmark summary for an evaluation run.
    """
    strategy_id: str
    strategy_name: str
    gt_count: int = 148
    pred_count: int = 0
    tp_count: int = 0
    fp_count: int = 0
    fn_count: int = 0
    precision: float = 0.0
    recall: float = 0.0
    micro_f1: float = 0.0
    macro_f1: float = 0.0
    mean_iou: float = 0.0
    median_iou: float = 0.0
    
    # Anchors status
    sample_floorplan_tp: int = 0
    lantai_1_tp: int = 0
    lantai_2_tp: int = 0
    house2_tp: int = 0
    anchors_preserved: bool = False
    
    # Timing
    inference_ms: float = 0.0
    fusion_ms: float = 0.0
    total_ms: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "strategyId": self.strategy_id,
            "strategyName": self.strategy_name,
            "gtCount": self.gt_count,
            "predCount": self.pred_count,
            "tpCount": self.tp_count,
            "fpCount": self.fp_count,
            "fnCount": self.fn_count,
            "precision": round(self.precision, 4),
            "recall": round(self.recall, 4),
            "microF1": round(self.micro_f1, 4),
            "macroF1": round(self.macro_f1, 4),
            "meanIoU": round(self.mean_iou, 4),
            "medianIoU": round(self.median_iou, 4),
            "anchors": {
                "sampleFloorplanTp": self.sample_floorplan_tp,
                "lantai1Tp": self.lantai_1_tp,
                "lantai2Tp": self.lantai_2_tp,
                "house2Tp": self.house2_tp,
                "anchorsPreserved": self.anchors_preserved,
            },
            "performance": {
                "inferenceMs": round(self.inference_ms, 2),
                "fusionMs": round(self.fusion_ms, 2),
                "totalMs": round(self.total_ms, 2),
            },
        }
