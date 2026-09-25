"""
Data models and taxonomy for Proposal Fusion, Deduplication, Boundary Optimization
and Controlled Selection (Phase 2.10.6).
"""
from dataclasses import dataclass, field
from enum import Enum
from typing import List, Tuple, Dict, Any, Optional


class HypothesisRelation(str, Enum):
    DUPLICATE = "duplicate"
    ALTERNATIVE_BOUNDARY = "alternative_boundary"
    PARENT_CHILD = "parent_child"
    PARTITIONED_ROOM = "partitioned_room"
    NEIGHBORING_ROOM = "neighboring_room"
    UNRELATED_OVERLAP = "unrelated_overlap"


class StructuralCategory(str, Enum):
    VALID_ROOM = "valid_room"
    PARTIAL = "partial"
    OVERLAPPING = "overlapping"
    DUPLICATE = "duplicate"
    SLIVER_FRAGMENT = "sliver_fragment"
    REDUNDANT = "redundant"


@dataclass
class FusedProposal:
    """
    Standard proposal structure during Phase 2.10.6 pipeline stages.
    Carries geometry, full provenance, evidence scores, and optimization history.
    """
    proposal_id: str
    image_id: str
    source_phase: str  # "2.10.4" or "2.10.5"
    source_strategy: str
    polygon: List[Tuple[float, float]]
    area_px: float
    bbox: Tuple[float, float, float, float]  # minx, miny, width, height
    centroid: Tuple[float, float]
    
    # Provenance
    parent_proposal_id: Optional[str] = None
    parent_cavity_id: Optional[str] = None
    source_evidence: Dict[str, Any] = field(default_factory=dict)
    
    # Evidence & Quality metrics
    wall_support: float = 0.0
    enclosure_score: float = 0.0
    door_support: float = 0.0
    partition_support: float = 0.0
    repetition_support: float = 0.0
    boundary_quality: float = 0.0
    topology_agreement: float = 0.0
    compactness: float = 0.0
    
    # Negative evidence
    exterior_likelihood: float = 0.0
    furniture_likelihood: float = 0.0
    text_likelihood: float = 0.0
    sliver_likelihood: float = 0.0
    
    # Computed composite quality score
    quality_score: float = 0.0
    
    # Lifecycle & validation state
    is_valid_geometry: bool = True
    reject_reason: Optional[str] = None
    is_duplicate: bool = False
    duplicate_of_id: Optional[str] = None
    cluster_id: Optional[str] = None
    optimization_applied: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "proposalId": self.proposal_id,
            "imageId": self.image_id,
            "sourcePhase": self.source_phase,
            "sourceStrategy": self.source_strategy,
            "parentProposalId": self.parent_proposal_id,
            "parentCavityId": self.parent_cavity_id,
            "polygon": [[round(x, 1), round(y, 1)] for x, y in self.polygon],
            "areaPx": round(self.area_px, 1),
            "bbox": [round(v, 1) for v in self.bbox],
            "centroid": [round(v, 1) for v in self.centroid],
            "wallSupport": round(self.wall_support, 4),
            "enclosureScore": round(self.enclosure_score, 4),
            "doorSupport": round(self.door_support, 4),
            "partitionSupport": round(self.partition_support, 4),
            "repetitionSupport": round(self.repetition_support, 4),
            "boundaryQuality": round(self.boundary_quality, 4),
            "topologyAgreement": round(self.topology_agreement, 4),
            "compactness": round(self.compactness, 4),
            "exteriorLikelihood": round(self.exterior_likelihood, 4),
            "sliverLikelihood": round(self.sliver_likelihood, 4),
            "qualityScore": round(self.quality_score, 4),
            "isValidGeometry": self.is_valid_geometry,
            "rejectReason": self.reject_reason,
            "isDuplicate": self.is_duplicate,
            "duplicateOfId": self.duplicate_of_id,
            "clusterId": self.cluster_id,
            "optimizationApplied": self.optimization_applied,
        }


@dataclass
class ProposalCluster:
    """
    Spatial grouping of competing and complementary proposals.
    """
    cluster_id: str
    image_id: str
    proposal_ids: List[str]
    representative_proposal_id: str
    area_range: Tuple[float, float]
    bbox: Tuple[float, float, float, float]
    centroid: Tuple[float, float]
    source_strategies: List[str]
    candidate_count: int
    best_quality_score: float

    def to_dict(self) -> Dict[str, Any]:
        return {
            "clusterId": self.cluster_id,
            "imageId": self.image_id,
            "proposalIds": self.proposal_ids,
            "representativeProposalId": self.representative_proposal_id,
            "areaRange": [round(self.area_range[0], 1), round(self.area_range[1], 1)],
            "bbox": [round(v, 1) for v in self.bbox],
            "centroid": [round(v, 1) for v in self.centroid],
            "sourceStrategies": self.source_strategies,
            "candidateCount": self.candidate_count,
            "bestQualityScore": round(self.best_quality_score, 4),
        }


@dataclass
class ProposalRelationship:
    """
    Relational edge between two proposals.
    """
    prop_a_id: str
    prop_b_id: str
    relation: HypothesisRelation
    iou: float
    containment_a_in_b: float
    containment_b_in_a: float
    wall_agreement: float
    evidence: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "propAId": self.prop_a_id,
            "propBId": self.prop_b_id,
            "relation": self.relation.value,
            "iou": round(self.iou, 4),
            "containmentAInB": round(self.containment_a_in_b, 4),
            "containmentBInA": round(self.containment_b_in_a, 4),
            "wallAgreement": round(self.wall_agreement, 4),
            "evidence": self.evidence,
        }


@dataclass
class BoundaryOptimizationResult:
    proposal_id: str
    original_area: float
    optimized_area: float
    area_change_pct: float
    boundary_shift_px: float
    operations_applied: List[str]
    is_accepted: bool
    rejection_reason: Optional[str] = None
