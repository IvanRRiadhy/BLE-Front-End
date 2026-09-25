"""
Stage F: Candidate Quality Scoring (Phase 2.10.6)
Calculates transparent normalized architectural evidence scores across wall, door, partition,
enclosure, boundary quality, topology, and negative features (slivers, exterior).
"""
import numpy as np
from typing import List, Optional

from .models import FusedProposal


def compute_proposal_quality_score(
    prop: FusedProposal,
    w_wall: float = 0.25,
    w_enclosure: float = 0.20,
    w_door: float = 0.10,
    w_partition: float = 0.10,
    w_repetition: float = 0.05,
    w_boundary: float = 0.15,
    w_topology: float = 0.10,
    w_compactness: float = 0.05,
    w_neg_exterior: float = 0.10,
    w_neg_furniture: float = 0.10,
    w_neg_text: float = 0.05,
    w_neg_sliver: float = 0.10,
) -> float:
    """
    Computes transparent composite quality score in [0.0, 1.0].
    """
    positive_score = (
        w_wall * prop.wall_support
        + w_enclosure * prop.enclosure_score
        + w_door * prop.door_support
        + w_partition * prop.partition_support
        + w_repetition * prop.repetition_support
        + w_boundary * prop.boundary_quality
        + w_topology * prop.topology_agreement
        + w_compactness * prop.compactness
    )

    negative_penalty = (
        w_neg_exterior * prop.exterior_likelihood
        + w_neg_furniture * prop.furniture_likelihood
        + w_neg_text * prop.text_likelihood
        + w_neg_sliver * prop.sliver_likelihood
    )

    raw_score = positive_score - negative_penalty
    final_score = float(np.clip(raw_score, 0.01, 0.99))
    prop.quality_score = round(final_score, 4)
    return prop.quality_score


def score_proposal_pool(
    proposals: List[FusedProposal],
) -> List[FusedProposal]:
    """
    Scores all proposals in-place.
    """
    for prop in proposals:
        compute_proposal_quality_score(prop)
    return proposals
