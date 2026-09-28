"""
Spatial Relationship Builder for Phase 2.10.9 Global Room Synthesis.
Builds directional relationships:
- PARENT_OF / CHILD_OF
- PARTITION_OF
- ALTERNATIVE_TO
- NEIGHBOR_OF
- OVERLAPS / CONTAINS / DISJOINT
using O(N log N) spatial indexing (STRtree).
"""
from typing import List, Dict, Any, Optional, Tuple, Set
import numpy as np
from shapely.geometry import Polygon as ShapelyPolygon
from shapely.strtree import STRtree
from .models import (
    RoomHypothesis,
    HypothesisRelationship,
    RelationshipType,
    AlternativeGroup,
    NeighborContext,
    PartitionContext,
)


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


class SpatialRelationshipBuilder:
    """
    Builds the complete relational graph across room hypotheses.
    """

    def __init__(
        self,
        neighbor_distance_px: float = 18.0,
        parent_containment_threshold: float = 0.85,
        alternative_iou_threshold: float = 0.35,
        overlap_iou_threshold: float = 0.05,
    ):
        self.neighbor_distance_px = neighbor_distance_px
        self.parent_containment_threshold = parent_containment_threshold
        self.alternative_iou_threshold = alternative_iou_threshold
        self.overlap_iou_threshold = overlap_iou_threshold

    def build_relationships(
        self,
        hypotheses: List[RoomHypothesis],
        image_id: str = "",
    ) -> Tuple[List[HypothesisRelationship], List[AlternativeGroup], List[PartitionContext]]:
        """
        Constructs all spatial and architectural relationships between hypotheses.
        """
        relationships: List[HypothesisRelationship] = []
        alternative_groups: List[AlternativeGroup] = []
        partition_contexts: List[PartitionContext] = []

        if not hypotheses:
            return relationships, alternative_groups, partition_contexts

        polys = [h.polygon for h in hypotheses]
        tree = STRtree(polys)
        n = len(hypotheses)

        # Track alternative clusters
        alt_clusters: List[Set[int]] = []

        for i, h_i in enumerate(hypotheses):
            poly_i = h_i.polygon
            query_geom = poly_i.buffer(self.neighbor_distance_px)
            candidate_indices = tree.query(query_geom)

            for j in candidate_indices:
                if i == j:
                    continue
                h_j = hypotheses[j]
                poly_j = h_j.polygon

                # 1. Overlap & Containment Analysis
                iou = compute_iou(poly_i, poly_j)
                inter_area = poly_i.intersection(poly_j).area if poly_i.envelope.intersects(poly_j.envelope) else 0.0

                containment_i_in_j = inter_area / max(1.0, h_i.area_px)
                containment_j_in_i = inter_area / max(1.0, h_j.area_px)

                # Parent / Child containment
                if containment_j_in_i >= self.parent_containment_threshold and h_i.area_px > (h_j.area_px * 1.3):
                    # h_i is PARENT of h_j
                    relationships.append(
                        HypothesisRelationship(
                            source_id=h_i.hypothesis_id,
                            target_id=h_j.hypothesis_id,
                            rel_type=RelationshipType.PARENT_OF,
                            overlap_iou=iou,
                        )
                    )
                    relationships.append(
                        HypothesisRelationship(
                            source_id=h_j.hypothesis_id,
                            target_id=h_i.hypothesis_id,
                            rel_type=RelationshipType.CHILD_OF,
                            overlap_iou=iou,
                        )
                    )
                    if h_j.hypothesis_id not in h_i.child_ids:
                        h_i.child_ids.append(h_j.hypothesis_id)
                    h_j.parent_id = h_i.hypothesis_id

                # Alternatives (competing interpretations of same space)
                if iou >= self.alternative_iou_threshold:
                    relationships.append(
                        HypothesisRelationship(
                            source_id=h_i.hypothesis_id,
                            target_id=h_j.hypothesis_id,
                            rel_type=RelationshipType.ALTERNATIVE_TO,
                            overlap_iou=iou,
                        )
                    )
                    if h_j.hypothesis_id not in h_i.alternative_ids:
                        h_i.alternative_ids.append(h_j.hypothesis_id)

                    # Cluster alternatives
                    matched_cluster = None
                    for c in alt_clusters:
                        if i in c or j in c:
                            matched_cluster = c
                            break
                    if matched_cluster is not None:
                        matched_cluster.add(i)
                        matched_cluster.add(j)
                    else:
                        alt_clusters.append({i, j})

                # Overlap
                elif iou > self.overlap_iou_threshold:
                    relationships.append(
                        HypothesisRelationship(
                            source_id=h_i.hypothesis_id,
                            target_id=h_j.hypothesis_id,
                            rel_type=RelationshipType.OVERLAPS,
                            overlap_iou=iou,
                        )
                    )

                # 2. Neighbor / Adjacency Analysis
                elif iou <= self.overlap_iou_threshold:
                    dist = poly_i.distance(poly_j)
                    if dist <= self.neighbor_distance_px:
                        shared_len = min(poly_i.boundary.length, poly_j.boundary.length) * 0.15
                        relationships.append(
                            HypothesisRelationship(
                                source_id=h_i.hypothesis_id,
                                target_id=h_j.hypothesis_id,
                                rel_type=RelationshipType.NEIGHBOR_OF,
                                shared_length=shared_len,
                            )
                        )
                        if h_j.hypothesis_id not in h_i.neighbor_ids:
                            h_i.neighbor_ids.append(h_j.hypothesis_id)

        # Build AlternativeGroup objects
        for g_idx, cluster in enumerate(alt_clusters):
            grp_id = f"alt_grp_{g_idx:03d}"
            c_ids = [hypotheses[idx].hypothesis_id for idx in sorted(cluster)]
            for idx in cluster:
                hypotheses[idx].alternative_group_id = grp_id
            alternative_groups.append(
                AlternativeGroup(
                    group_id=grp_id,
                    image_id=image_id,
                    competing_hypothesis_ids=c_ids,
                    description="Competing multi-candidate interpretations",
                )
            )

        # Build PartitionContexts for parent-child groups
        for h in hypotheses:
            if len(h.child_ids) >= 2:
                p_ctx = PartitionContext(
                    partition_id=f"part_{h.hypothesis_id}",
                    parent_id=h.hypothesis_id,
                    child_ids=h.child_ids,
                    resulting_child_count=len(h.child_ids),
                )
                partition_contexts.append(p_ctx)
                for c_id in h.child_ids:
                    relationships.append(
                        HypothesisRelationship(
                            source_id=c_id,
                            target_id=h.hypothesis_id,
                            rel_type=RelationshipType.PARTITION_OF,
                        )
                    )

        # Update neighbor support on hypotheses
        for h in hypotheses:
            h.neighbor_support = min(1.0, len(h.neighbor_ids) * 0.25)
            h.topology_support = min(1.0, (len(h.neighbor_ids) + len(h.doorway_ids)) * 0.20)

        return relationships, alternative_groups, partition_contexts
