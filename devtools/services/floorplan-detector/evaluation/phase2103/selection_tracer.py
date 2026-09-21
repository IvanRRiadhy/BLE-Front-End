"""
Phase 2.10.3 — Candidate Selection Boundary & Lost-TP Root Cause Engine
Instruments the candidate lifecycle and classifies rejection mechanisms
according to an authoritative 9-category taxonomy.
"""

from enum import Enum
from dataclasses import dataclass, field, asdict
from typing import Dict, Any, List, Optional, Tuple, Set
import numpy as np
from shapely.geometry import Polygon as ShapelyPolygon


class RejectionTaxonomy(str, Enum):
    BUDGET_REJECTED = "BUDGET_REJECTED"
    THRESHOLD_REJECTED = "THRESHOLD_REJECTED"
    DUPLICATE_REJECTED = "DUPLICATE_REJECTED"
    OVERLAP_REJECTED = "OVERLAP_REJECTED"
    MERGED_REJECTED = "MERGED_REJECTED"
    GEOMETRY_IOU_FAILURE = "GEOMETRY_IOU_FAILURE"
    TOPOLOGY_FAILURE = "TOPOLOGY_FAILURE"
    OUTSIDE_ENVELOPE = "OUTSIDE_ENVELOPE"
    UNKNOWN = "UNKNOWN"


@dataclass
class LostTPCandidateRecord:
    """
    Complete structured record for a known true-room candidate
    (IoU >= 0.25 against a ground-truth room classified as False Negative).
    Contains all 21 required fields specified by the Phase 2.10.3 contract.
    """
    candidate_id: str
    image_id: str
    gt_id: str
    iou: float
    initial_score: float
    final_score: float
    old_rank: int
    new_rank: int
    budget_limit: int
    budget_position: int
    accepted_before_budget: bool
    accepted_after_budget: bool
    duplicate_target: Optional[str]
    overlap_ratio: float
    merge_status: str
    rejection_reason: str
    text_room_evidence: float
    text_artifact_evidence: float
    door_evidence: float
    structural_evidence: float
    cavity_evidence: float
    lifecycle_history: List[Dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "candidate_id": self.candidate_id,
            "image_id": self.image_id,
            "gt_id": self.gt_id,
            "iou": round(float(self.iou), 4),
            "initial_score": round(float(self.initial_score), 4),
            "final_score": round(float(self.final_score), 4),
            "old_rank": int(self.old_rank),
            "new_rank": int(self.new_rank),
            "budget_limit": int(self.budget_limit),
            "budget_position": int(self.budget_position),
            "accepted_before_budget": bool(self.accepted_before_budget),
            "accepted_after_budget": bool(self.accepted_after_budget),
            "duplicate_target": self.duplicate_target,
            "overlap_ratio": round(float(self.overlap_ratio), 4),
            "merge_status": self.merge_status,
            "rejection_reason": self.rejection_reason,
            "text_room_evidence": round(float(self.text_room_evidence), 4),
            "text_artifact_evidence": round(float(self.text_artifact_evidence), 4),
            "door_evidence": round(float(self.door_evidence), 4),
            "structural_evidence": round(float(self.structural_evidence), 4),
            "cavity_evidence": round(float(self.cavity_evidence), 4),
            "lifecycle_history": self.lifecycle_history,
        }


def classify_rejection_reason(
    passed_threshold: bool,
    threshold_reason: str,
    passed_budget: bool,
    is_duplicate: bool,
    is_overlap: bool,
    dup_target_id: Optional[str],
    overlap_ratio: float,
    passed_topology: bool,
    is_merged: bool,
    reconstructed_iou: float,
    is_outside_envelope: bool = False,
) -> Tuple[RejectionTaxonomy, str]:
    """
    Applies authoritative taxonomy logic to classify why a true-room candidate
    failed to become a final true positive detection.
    """
    if is_outside_envelope:
        return RejectionTaxonomy.OUTSIDE_ENVELOPE, "Candidate is outside the detected building envelope"

    if not passed_threshold:
        if "wall" in threshold_reason.lower() or "support" in threshold_reason.lower():
            return RejectionTaxonomy.THRESHOLD_REJECTED, f"Rejected by wall support threshold: {threshold_reason}"
        return RejectionTaxonomy.THRESHOLD_REJECTED, f"Rejected by source confidence threshold: {threshold_reason}"

    if not passed_budget:
        return RejectionTaxonomy.BUDGET_REJECTED, "Candidate score ranked outside image candidate budget cap"

    if is_duplicate:
        return RejectionTaxonomy.DUPLICATE_REJECTED, f"Rejected by duplicate suppression against {dup_target_id} (IoU >= threshold)"

    if is_overlap:
        return RejectionTaxonomy.OVERLAP_REJECTED, f"Rejected by overlap/containment suppression against {dup_target_id} (overlap ratio = {overlap_ratio:.2f})"

    if not passed_topology:
        return RejectionTaxonomy.TOPOLOGY_FAILURE, "Candidate polygon failed topology or vertex validity during reconstruction"

    if is_merged:
        return RejectionTaxonomy.MERGED_REJECTED, "Candidate polygon was absorbed into an adjacent merged room hypothesis"

    if reconstructed_iou < 0.25:
        return RejectionTaxonomy.GEOMETRY_IOU_FAILURE, f"Post-reconstruction polygon IoU dropped below evaluation threshold ({reconstructed_iou:.3f} < 0.25)"

    return RejectionTaxonomy.UNKNOWN, "Candidate unclassified failure"


def calculate_budget_limit(
    num_primary: int,
    budget_min: int = 3,
    budget_ceiling: int = 8,
    budget_primary_offset: int = 2,
    multiplier: float = 1.0,
    unlimited: bool = False,
) -> int:
    """
    Computes candidate budget limit under standard, scaled, or unlimited diagnostic rules.
    """
    if unlimited:
        return 9999
    base = max(budget_min, min(budget_ceiling, num_primary + budget_primary_offset))
    return int(np.ceil(base * multiplier))
