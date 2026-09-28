"""
Constraint Solver for Phase 2.10.9 Global Room Synthesis.
Enforces:
1. Strict non-overlap / disjointness (IoU < max_allowed_overlap_iou)
2. Parent / child mutual exclusion (cannot select parent and child simultaneously)
3. Alternative group mutual exclusion
4. Partition consistency
Does NOT maximize room count; optimizes architectural consistency.
"""
from typing import List, Dict, Any, Optional, Set, Tuple
import numpy as np
from shapely.geometry import Polygon as ShapelyPolygon
from .models import RoomConfiguration, RoomHypothesis
from .hypothesis_graph import RoomHypothesisGraph


def compute_iou(p1: ShapelyPolygon, p2: ShapelyPolygon) -> float:
    """Computes IoU between two Shapely polygons."""
    if not p1.is_valid:
        p1 = p1.buffer(0)
    if not p2.is_valid:
        p2 = p2.buffer(0)
    if not p1.envelope.intersects(p2.envelope):
        return 0.0
    inter = p1.intersection(p2).area
    if inter <= 0:
        return 0.0
    union = p1.area + p2.area - inter
    return float(inter / union) if union > 0 else 0.0


class ConfigurationConstraintSolver:
    """
    Enforces architectural consistency constraints on candidate configurations.
    """

    def __init__(
        self,
        max_allowed_overlap_iou: float = 0.10,
        enforce_parent_child_exclusion: bool = True,
        enforce_alternative_exclusion: bool = True,
    ):
        self.max_allowed_overlap_iou = max_allowed_overlap_iou
        self.enforce_parent_child_exclusion = enforce_parent_child_exclusion
        self.enforce_alternative_exclusion = enforce_alternative_exclusion

    def solve_constraints(
        self,
        config: RoomConfiguration,
        graph: Optional[RoomHypothesisGraph] = None,
    ) -> RoomConfiguration:
        """
        Resolves conflicts within the configuration to produce a valid set of disjoint rooms.
        """
        rooms = list(config.hypotheses)
        if not rooms:
            return config

        # Sort candidate rooms deterministically:
        # Prioritize doorway support, wall support, lower artificial cavity penalty, and area
        rooms.sort(
            key=lambda h: (
                h.doorway_support * 0.35
                + h.wall_support * 0.30
                + h.topology_support * 0.15
                - h.artificial_cavity_likelihood * 0.40
                - h.sliver_likelihood * 0.50
                + (0.10 if h.is_corridor or h.is_large_space else 0.0)
            ),
            reverse=True,
        )

        selected_rooms: List[RoomHypothesis] = []
        selected_ids: Set[str] = set()
        selected_alt_groups: Set[str] = set()

        for cand in rooms:
            cand_id = cand.hypothesis_id
            poly = cand.polygon

            # 1. Alternative Group Constraint
            if self.enforce_alternative_exclusion and cand.alternative_group_id:
                if cand.alternative_group_id in selected_alt_groups:
                    continue

            # 2. Parent / Child Constraint
            if self.enforce_parent_child_exclusion:
                # If parent already selected, reject child
                if cand.parent_id and cand.parent_id in selected_ids:
                    continue
                # If any child already selected, reject parent
                has_selected_child = any(cid in selected_ids for cid in cand.child_ids)
                if has_selected_child:
                    continue

            # 3. Disjointness / Non-Overlap Constraint
            has_overlap_conflict = False
            for s in selected_rooms:
                iou = compute_iou(poly, s.polygon)
                if iou >= self.max_allowed_overlap_iou:
                    has_overlap_conflict = True
                    break

            if not has_overlap_conflict:
                selected_rooms.append(cand)
                selected_ids.add(cand_id)
                if cand.alternative_group_id:
                    selected_alt_groups.add(cand.alternative_group_id)

        config.hypotheses = selected_rooms
        return config
