"""
Relationship Resolver (Phase 2.10.7).
Resolves parent/child and partition conflicts by evaluating whether a parent cavity
has sufficient internal wall/partition support to justify dividing into children.
"""
from typing import List, Tuple, Dict, Set, Optional, Any
import numpy as np

from .models import RoomHypothesis, HypothesisEdge, GraphEdgeType, RoomFormationGraph, RoomHypothesisState


def resolve_parent_child_decisions(
    hypotheses: List[RoomHypothesis],
    edges: List[HypothesisEdge],
) -> Dict[str, str]:
    """
    Evaluates each parent cavity that has child hypotheses.
    Decides whether to prefer the parent [A] or children [B, C].
    Returns mapping: {parent_id: "PREFER_PARENT" | "PREFER_CHILDREN"}
    """
    hyp_map = {h.id: h for h in hypotheses}
    decisions: Dict[str, str] = {}

    for hyp in hypotheses:
        if not hyp.child_ids:
            continue

        parent = hyp
        children = [hyp_map[cid] for cid in parent.child_ids if cid in hyp_map]
        if not children:
            continue

        child_area_sum = sum(c.area_px for c in children)
        area_coverage = child_area_sum / max(1.0, parent.area_px)

        avg_child_partition = np.mean([c.partition_support for c in children])
        avg_child_wall = np.mean([c.wall_support for c in children])
        child_scores_sum = sum(c.score for c in children)
        avg_child_score = np.mean([c.score for c in children])

        is_legitimate_large_room = (
            parent.large_space_likelihood >= 0.70
            and parent.partition_support < 0.35
            and avg_child_partition < 0.40
            and len(children) < 2
        )

        if is_legitimate_large_room:
            decisions[parent.id] = "PREFER_PARENT"
        elif len(children) >= 2 and (child_scores_sum > parent.score or area_coverage >= 0.50):
            decisions[parent.id] = "PREFER_CHILDREN"
        elif avg_child_score > (parent.score + 0.10):
            decisions[parent.id] = "PREFER_CHILDREN"
        else:
            decisions[parent.id] = "PREFER_PARENT"

    return decisions


class RelationshipResolver:
    """
    Object-oriented relationship resolver operating on RoomFormationGraph.
    """

    def resolve_relationships(
        self,
        graph: RoomFormationGraph,
        wall_network: Optional[Any] = None,
    ) -> Dict[str, str]:
        hyp_list = list(graph.hypotheses.values())
        decisions = resolve_parent_child_decisions(hyp_list, graph.edges)

        for parent_id, dec in decisions.items():
            if parent_id in graph.hypotheses:
                parent = graph.hypotheses[parent_id]
                if dec == "PREFER_CHILDREN":
                    parent.state = RoomHypothesisState.REJECTED
                    for cid in parent.child_ids:
                        if cid in graph.hypotheses and graph.hypotheses[cid].state != RoomHypothesisState.REJECTED:
                            graph.hypotheses[cid].state = RoomHypothesisState.ACTIVE
                else:
                    parent.state = RoomHypothesisState.ACTIVE
                    for cid in parent.child_ids:
                        if cid in graph.hypotheses and graph.hypotheses[cid].score < 0.80:
                            graph.hypotheses[cid].state = RoomHypothesisState.SUPPRESSED

        return decisions
