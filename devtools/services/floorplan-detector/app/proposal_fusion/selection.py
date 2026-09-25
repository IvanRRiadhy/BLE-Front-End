"""
Stage G: Controlled Diversity-Aware Selection (Phase 2.10.6)
Selects a compact, high-quality candidate subset under a budget constraint
while preserving competing hypotheses (parent vs child partitions) and spatial diversity.
"""
from typing import List, Tuple, Dict, Set, Optional
import numpy as np
from shapely.geometry import Polygon as ShapelyPolygon
from shapely.strtree import STRtree

from .models import FusedProposal, ProposalCluster, ProposalRelationship, HypothesisRelation


def _get_shapely_polygon(coords: List[Tuple[float, float]]) -> Optional[ShapelyPolygon]:
    if not coords or len(coords) < 3:
        return None
    c_list = list(coords)
    if c_list[0] != c_list[-1]:
        c_list.append(c_list[0])
    try:
        p = ShapelyPolygon(c_list)
        if not p.is_valid:
            p = p.buffer(0)
        return p if not p.is_empty else None
    except Exception:
        return None


def select_controlled_proposals(
    proposals: List[FusedProposal],
    clusters: List[ProposalCluster],
    relationships: List[ProposalRelationship],
    budget: int = 150,
    max_per_cluster: int = 3,
) -> Tuple[List[FusedProposal], List[FusedProposal]]:
    """
    Selects up to `budget` proposals using quality, spatial diversity, and relationship preservation.
    Returns: (selected_proposals, unselected_proposals)
    """
    if not proposals:
        return [], []

    if len(proposals) <= budget:
        sorted_all = sorted(proposals, key=lambda p: (-p.quality_score, -p.area_px, p.proposal_id))
        return sorted_all, []

    # Map proposals
    prop_map: Dict[str, FusedProposal] = {p.proposal_id: p for p in proposals}
    cluster_map: Dict[str, ProposalCluster] = {c.cluster_id: c for c in clusters}

    # Relationship lookups
    parent_child_pairs: Set[Tuple[str, str]] = set()
    for rel in relationships:
        if rel.relation == HypothesisRelation.PARENT_CHILD:
            parent_child_pairs.add((rel.prop_a_id, rel.prop_b_id))
            parent_child_pairs.add((rel.prop_b_id, rel.prop_a_id))

    # Pass 1: Cluster representatives (guarantees spatial coverage of every cluster)
    selected_ids: Set[str] = set()
    cluster_counts: Dict[str, int] = {c.cluster_id: 0 for c in clusters}

    # Sort clusters by best_quality_score descending
    sorted_clusters = sorted(clusters, key=lambda c: (-c.best_quality_score, -c.area_range[1], c.cluster_id))

    for c in sorted_clusters:
        if len(selected_ids) >= budget:
            break
        rep_id = c.representative_proposal_id
        if rep_id in prop_map and rep_id not in selected_ids:
            selected_ids.add(rep_id)
            cluster_counts[c.cluster_id] += 1

    # Pass 2: Retain high-scoring parent-child partition alternatives
    # If a selected proposal is a parent or child, allow its complement into the pool
    for p_id in list(selected_ids):
        if len(selected_ids) >= budget:
            break
        for rel in relationships:
            if rel.relation == HypothesisRelation.PARENT_CHILD:
                other_id = rel.prop_b_id if rel.prop_a_id == p_id else (rel.prop_a_id if rel.prop_b_id == p_id else None)
                if other_id and other_id in prop_map and other_id not in selected_ids:
                    other_prop = prop_map[other_id]
                    c_id = other_prop.cluster_id or "unclustered"
                    if cluster_counts.get(c_id, 0) < max_per_cluster:
                        selected_ids.add(other_id)
                        cluster_counts[c_id] = cluster_counts.get(c_id, 0) + 1
                        if len(selected_ids) >= budget:
                            break

    # Pass 3: Fill remaining budget with highest quality remaining proposals subject to cluster cap
    remaining_candidates = [
        p for p in proposals
        if p.proposal_id not in selected_ids and not p.is_duplicate and p.is_valid_geometry
    ]
    remaining_candidates.sort(key=lambda p: (-p.quality_score, -p.area_px, p.proposal_id))

    for p in remaining_candidates:
        if len(selected_ids) >= budget:
            break
        c_id = p.cluster_id or "unclustered"
        if cluster_counts.get(c_id, 0) < max_per_cluster:
            selected_ids.add(p.proposal_id)
            cluster_counts[c_id] = cluster_counts.get(c_id, 0) + 1

    # Pass 4: Final fallback if budget still not reached
    if len(selected_ids) < budget:
        for p in remaining_candidates:
            if p.proposal_id not in selected_ids:
                selected_ids.add(p.proposal_id)
                if len(selected_ids) >= budget:
                    break

    selected_list = [prop_map[pid] for pid in selected_ids]
    unselected_list = [p for p in proposals if p.proposal_id not in selected_ids]

    # Final deterministic sort
    selected_list.sort(key=lambda p: (-p.quality_score, -p.area_px, p.proposal_id))
    unselected_list.sort(key=lambda p: (-p.quality_score, -p.area_px, p.proposal_id))

    return selected_list, unselected_list
