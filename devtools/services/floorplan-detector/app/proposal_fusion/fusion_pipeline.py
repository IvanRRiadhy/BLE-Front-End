"""
Proposal Fusion Pipeline (Phase 2.10.6)
Coordinates geometry validation, deduplication, clustering, hypothesis grouping,
boundary optimization, scoring, and controlled selection.
"""
import time
from typing import List, Dict, Any, Tuple, Optional
import numpy as np

from .models import (
    FusedProposal,
    ProposalCluster,
    ProposalRelationship,
    BoundaryOptimizationResult,
)
from .geometry_validation import filter_proposal_pool_geometry
from .deduplication import deduplicate_proposals
from .overlap_clustering import cluster_overlapping_proposals
from .hypothesis_grouping import analyze_hypothesis_relationships
from .boundary_optimizer import optimize_proposal_boundary
from .scoring import score_proposal_pool
from .selection import select_controlled_proposals


class ProposalFusionPipeline:
    """
    Offline Pipeline for hypothesis compression, deduplication, and selection.
    """

    def __init__(
        self,
        dedup_iou_threshold: float = 0.85,
        cluster_overlap_threshold: float = 0.40,
        enable_boundary_opt: bool = True,
        budget: int = 150,
    ):
        self.dedup_iou_threshold = dedup_iou_threshold
        self.cluster_overlap_threshold = cluster_overlap_threshold
        self.enable_boundary_opt = enable_boundary_opt
        self.budget = budget

    def process_proposals(
        self,
        raw_proposals: List[FusedProposal],
        img_w: int,
        img_h: int,
        wall_mask: Optional[np.ndarray] = None,
        footprint_mask: Optional[np.ndarray] = None,
    ) -> Dict[str, Any]:
        """
        Executes complete Proposal Fusion & Selection pipeline.
        Returns a dictionary with pipeline outputs, stage counts, and timing profiles.
        """
        timings: Dict[str, float] = {}
        t_total_start = time.perf_counter()

        # Initial Scoring of raw proposals
        score_proposal_pool(raw_proposals)

        # Stage A: Geometry Validation
        t0 = time.perf_counter()
        valid_props, invalid_props = filter_proposal_pool_geometry(
            proposals=raw_proposals,
            img_w=img_w,
            img_h=img_h,
            footprint_mask=footprint_mask,
        )
        timings["stage_a_geometry_validation_ms"] = round((time.perf_counter() - t0) * 1000.0, 2)

        # Stage B: Deduplication
        t0 = time.perf_counter()
        kept_props, duplicate_props = deduplicate_proposals(
            proposals=valid_props,
            iou_threshold=self.dedup_iou_threshold,
        )
        timings["stage_b_deduplication_ms"] = round((time.perf_counter() - t0) * 1000.0, 2)

        # Stage C: Overlap Clustering
        t0 = time.perf_counter()
        clusters, prop_to_cluster = cluster_overlapping_proposals(
            proposals=kept_props,
            overlap_threshold=self.cluster_overlap_threshold,
        )
        timings["stage_c_clustering_ms"] = round((time.perf_counter() - t0) * 1000.0, 2)

        # Stage D: Hypothesis Grouping
        t0 = time.perf_counter()
        relationships = analyze_hypothesis_relationships(
            proposals=kept_props,
        )
        timings["stage_d_hypothesis_grouping_ms"] = round((time.perf_counter() - t0) * 1000.0, 2)

        # Stage E: Boundary Optimization (optional)
        t0 = time.perf_counter()
        optimized_props: List[FusedProposal] = []
        opt_results: List[BoundaryOptimizationResult] = []

        if self.enable_boundary_opt:
            for p in kept_props:
                opt_p, res = optimize_proposal_boundary(
                    prop=p,
                    wall_mask=wall_mask,
                )
                optimized_props.append(opt_p)
                opt_results.append(res)
        else:
            optimized_props = kept_props

        # Re-score after boundary optimization
        score_proposal_pool(optimized_props)
        timings["stage_e_boundary_optimization_ms"] = round((time.perf_counter() - t0) * 1000.0, 2)

        # Stage G: Controlled Selection
        t0 = time.perf_counter()
        selected_props, unselected_props = select_controlled_proposals(
            proposals=optimized_props,
            clusters=clusters,
            relationships=relationships,
            budget=self.budget,
        )
        timings["stage_g_controlled_selection_ms"] = round((time.perf_counter() - t0) * 1000.0, 2)
        timings["total_pipeline_ms"] = round((time.perf_counter() - t_total_start) * 1000.0, 2)

        return {
            "raw_count": len(raw_proposals),
            "valid_count": len(valid_props),
            "invalid_count": len(invalid_props),
            "kept_after_dedup_count": len(kept_props),
            "duplicate_count": len(duplicate_props),
            "cluster_count": len(clusters),
            "relationship_count": len(relationships),
            "final_selected_count": len(selected_props),
            "unselected_count": len(unselected_props),
            "compression_ratio": round(1.0 - (len(selected_props) / len(raw_proposals)), 4) if raw_proposals else 0.0,
            "timings_ms": timings,
            "selected_proposals": selected_props,
            "unselected_proposals": unselected_props,
            "invalid_proposals": invalid_props,
            "duplicate_proposals": duplicate_props,
            "clusters": clusters,
            "relationships": relationships,
            "optimization_results": opt_results,
        }
