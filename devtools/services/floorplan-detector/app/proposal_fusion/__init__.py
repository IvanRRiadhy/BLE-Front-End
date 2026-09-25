"""
Package exports for proposal_fusion module (Phase 2.10.6).
"""
from .models import (
    FusedProposal,
    ProposalCluster,
    ProposalRelationship,
    HypothesisRelation,
    StructuralCategory,
    BoundaryOptimizationResult,
)
from .geometry_validation import validate_proposal_geometry, filter_proposal_pool_geometry
from .deduplication import deduplicate_proposals
from .overlap_clustering import cluster_overlapping_proposals
from .hypothesis_grouping import analyze_hypothesis_relationships
from .boundary_optimizer import optimize_proposal_boundary
from .scoring import compute_proposal_quality_score, score_proposal_pool
from .selection import select_controlled_proposals
from .fusion_pipeline import ProposalFusionPipeline
from .metrics import evaluate_gt_proposal_recall, trace_lost_gt_rooms

__all__ = [
    "FusedProposal",
    "ProposalCluster",
    "ProposalRelationship",
    "HypothesisRelation",
    "StructuralCategory",
    "BoundaryOptimizationResult",
    "validate_proposal_geometry",
    "filter_proposal_pool_geometry",
    "deduplicate_proposals",
    "cluster_overlapping_proposals",
    "analyze_hypothesis_relationships",
    "optimize_proposal_boundary",
    "compute_proposal_quality_score",
    "score_proposal_pool",
    "select_controlled_proposals",
    "ProposalFusionPipeline",
    "evaluate_gt_proposal_recall",
    "trace_lost_gt_rooms",
]
