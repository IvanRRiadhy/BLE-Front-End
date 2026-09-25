"""
Candidate Scoring & Semantic Classification (Phase 2.10.7).
Computes individual architectural scores and formation scores, distinguishing
corridors, standard rooms, and large spaces without Ground Truth.
"""
import math
from typing import List, Dict, Any, Optional, Tuple
import numpy as np

from .models import RoomHypothesis


def compute_architectural_score(
    hyp: RoomHypothesis,
    w_wall: float = 0.25,
    w_enclosure: float = 0.20,
    w_door: float = 0.15,
    w_partition: float = 0.10,
    w_topology: float = 0.10,
    w_boundary: float = 0.15,
    w_compactness: float = 0.05,
    w_neg_exterior: float = 0.15,
    w_neg_sliver: float = 0.15,
) -> float:
    """
    Computes transparent normalized architectural evidence score in [0.0, 1.0].
    """
    pos = (
        w_wall * hyp.wall_support
        + w_enclosure * hyp.enclosure_score
        + w_door * hyp.door_support
        + w_partition * hyp.partition_support
        + w_topology * hyp.topology_score
        + w_boundary * hyp.boundary_quality
        + w_compactness * hyp.compactness
    )
    neg = (
        w_neg_exterior * hyp.exterior_penalty
        + w_neg_sliver * hyp.sliver_penalty
    )

    score = float(np.clip(pos - neg, 0.05, 0.98))
    hyp.architectural_score = round(score, 4)
    hyp.evidence["enclosure"] = hyp.enclosure_score
    hyp.evidence["wall_support"] = hyp.wall_support
    return hyp.architectural_score


def evaluate_room_semantics(
    hyp: RoomHypothesis,
    all_hypotheses: Optional[List[RoomHypothesis]] = None,
) -> None:
    """
    Evaluates semantic roles: corridor vs standard room vs large space.
    """
    pw, ph = hyp.bbox[2], hyp.bbox[3]
    aspect_ratio = max(pw, ph) / max(1.0, min(pw, ph))

    # Corridor features: elongated, connected to multiple rooms, lower enclosure
    neighbor_count = len(hyp.neighbor_ids)
    if aspect_ratio >= 3.0:
        hyp.is_corridor = True
        hyp.corridor_likelihood = round(min(0.95, 0.40 + 0.10 * aspect_ratio + 0.10 * neighbor_count), 4)
    else:
        hyp.corridor_likelihood = 0.10

    # Large space features: area > 20000 px, high enclosure, few internal partitions
    if hyp.area_px >= 20000.0:
        hyp.large_space_likelihood = round(min(0.95, 0.50 + 0.40 * hyp.enclosure_score), 4)
    else:
        hyp.large_space_likelihood = 0.05


def score_hypotheses(
    hypotheses: List[RoomHypothesis],
    wall_network: Optional[Any] = None,
    doors: Optional[List[Any]] = None,
    text_regions: Optional[List[Any]] = None,
    image_shape: Optional[Tuple[int, int]] = None,
) -> List[RoomHypothesis]:
    """
    Scores and updates all hypotheses in-place.
    """
    for hyp in hypotheses:
        compute_architectural_score(hyp)
        evaluate_room_semantics(hyp, hypotheses)
        hyp.formation_score = round(0.70 * hyp.architectural_score + 0.30 * hyp.confidence, 4)
        if hyp.score <= 0:
            hyp.score = hyp.formation_score
        hyp.final_score = hyp.score

    return hypotheses


class CandidateScorer:
    """
    Object-oriented scorer for RoomHypothesis candidate evaluation.
    """

    def score_hypotheses(
        self,
        hypotheses: List[RoomHypothesis],
        wall_network: Optional[Any] = None,
        doors: Optional[List[Any]] = None,
        text_regions: Optional[List[Any]] = None,
        image_shape: Optional[Tuple[int, int]] = None,
    ) -> List[RoomHypothesis]:
        return score_hypotheses(
            hypotheses=hypotheses,
            wall_network=wall_network,
            doors=doors,
            text_regions=text_regions,
            image_shape=image_shape,
        )
