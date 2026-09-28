"""
Global Room Scorer for Phase 2.10.9 Global Room Synthesis.
Evaluates complete room configurations transparently by combining
positive architectural/topological evidence and negative cavity/complexity penalties.
"""
from typing import List, Dict, Any, Optional
import numpy as np
from .models import RoomConfiguration, RoomHypothesis


class GlobalRoomScorer:
    """
    Computes transparent multi-criteria scores for candidate room configurations.
    """

    def __init__(
        self,
        # Positive weights
        w_architectural: float = 0.30,
        w_doorway: float = 0.25,
        w_topology: float = 0.20,
        w_neighbor: float = 0.15,
        w_coverage: float = 0.10,
        # Negative penalty weights
        w_cavity_penalty: float = 0.30,
        w_overlap_penalty: float = 0.40,
        w_contradiction_penalty: float = 0.25,
        w_complexity_penalty: float = 0.10,
        # Complexity prior
        nominal_room_budget: int = 15,
    ):
        self.w_architectural = w_architectural
        self.w_doorway = w_doorway
        self.w_topology = w_topology
        self.w_neighbor = w_neighbor
        self.w_coverage = w_coverage

        self.w_cavity_penalty = w_cavity_penalty
        self.w_overlap_penalty = w_overlap_penalty
        self.w_contradiction_penalty = w_contradiction_penalty
        self.w_complexity_penalty = w_complexity_penalty
        self.nominal_room_budget = nominal_room_budget

    def score_configuration(
        self,
        config: RoomConfiguration,
        wall_network: Optional[Any] = None,
        use_ml: bool = False,
    ) -> float:
        """
        Evaluates a candidate configuration and sets component scores and global_score.
        """
        rooms = config.hypotheses
        if not rooms:
            config.global_score = 0.0
            return 0.0

        n_rooms = len(rooms)

        # 1. Positive Evidence Components
        arch_scores = [r.wall_support * 0.6 + r.boundary_quality * 0.4 for r in rooms]
        arch_mean = float(np.mean(arch_scores)) if arch_scores else 0.0

        door_scores = [r.doorway_support for r in rooms]
        door_mean = float(np.mean(door_scores)) if door_scores else 0.0

        top_scores = [r.topology_support for r in rooms]
        top_mean = float(np.mean(top_scores)) if top_scores else 0.0

        neigh_scores = [r.neighbor_support for r in rooms]
        neigh_mean = float(np.mean(neigh_scores)) if neigh_scores else 0.0

        # Optional ML assistance
        if use_ml:
            ml_scores = [r.ml_wall_support * 0.5 + r.ml_door_support * 0.5 for r in rooms if r.ml_available]
            if ml_scores:
                arch_mean = arch_mean * 0.8 + float(np.mean(ml_scores)) * 0.2

        # Floorplan coverage ratio (normalized across rooms)
        total_room_area = sum(r.area_px for r in rooms)
        coverage_score = min(1.0, total_room_area / max(1.0, 500000.0))

        # 2. Negative Penalties
        # Artificial Cavity Penalty
        cav_penalties = [r.artificial_cavity_likelihood for r in rooms]
        cavity_penalty = float(np.mean(cav_penalties)) if cav_penalties else 0.0

        # Pairwise Overlap Penalty
        total_overlap_iou = 0.0
        overlap_pairs = 0
        for i in range(n_rooms):
            for j in range(i + 1, n_rooms):
                p1, p2 = rooms[i].polygon, rooms[j].polygon
                if p1.envelope.intersects(p2.envelope):
                    inter = p1.intersection(p2).area
                    if inter > 0:
                        union = p1.area + p2.area - inter
                        iou = inter / union if union > 0 else 0.0
                        if iou > 0.05:
                            total_overlap_iou += iou
                            overlap_pairs += 1
        overlap_penalty = min(1.0, total_overlap_iou * 1.5)

        # Contradiction Penalty (simultaneous parent and child)
        room_ids = {r.hypothesis_id for r in rooms}
        contradictions = 0
        for r in rooms:
            if r.parent_id and r.parent_id in room_ids:
                contradictions += 1
            for c_id in r.child_ids:
                if c_id in room_ids:
                    contradictions += 1
        contradiction_penalty = min(1.0, (contradictions / max(1, n_rooms)) * 2.0)

        # Complexity Penalty (prevents selecting hundreds of tiny fragmented polygons)
        if n_rooms > self.nominal_room_budget:
            complexity_penalty = min(1.0, (n_rooms - self.nominal_room_budget) / 50.0)
        else:
            complexity_penalty = 0.0

        # Store individual components
        config.architectural_score = arch_mean
        config.doorway_score = door_mean
        config.topology_score = top_mean
        config.neighbor_score = neigh_mean
        config.coverage_score = coverage_score
        config.cavity_penalty = cavity_penalty
        config.overlap_penalty = overlap_penalty
        config.contradiction_penalty = contradiction_penalty
        config.complexity_penalty = complexity_penalty

        # Compute Composite Global Score
        pos = (
            self.w_architectural * arch_mean
            + self.w_doorway * door_mean
            + self.w_topology * top_mean
            + self.w_neighbor * neigh_mean
            + self.w_coverage * coverage_score
        )

        neg = (
            self.w_cavity_penalty * cavity_penalty
            + self.w_overlap_penalty * overlap_penalty
            + self.w_contradiction_penalty * contradiction_penalty
            + self.w_complexity_penalty * complexity_penalty
        )

        global_score = max(0.01, min(0.99, pos - neg))
        config.global_score = float(global_score)
        return float(global_score)

    def score_all(
        self,
        configurations: List[RoomConfiguration],
        wall_network: Optional[Any] = None,
        use_ml: bool = False,
    ) -> List[RoomConfiguration]:
        for c in configurations:
            self.score_configuration(c, wall_network=wall_network, use_ml=use_ml)
        configurations.sort(key=lambda c: c.global_score, reverse=True)
        return configurations
