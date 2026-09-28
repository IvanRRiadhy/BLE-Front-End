"""
Room Hypothesis Graph container for Phase 2.10.9 Global Room Synthesis.
Indexes nodes, edges, spatial arenas, and alternative clusters.
"""
from typing import List, Dict, Any, Optional, Set
from .models import (
    RoomHypothesis,
    HypothesisRelationship,
    RelationshipType,
    AlternativeGroup,
    DoorwayContext,
    CavityContext,
    PartitionContext,
)


class RoomHypothesisGraph:
    """
    Graph structure maintaining hypotheses as nodes and relationships as edges.
    """

    def __init__(self, image_id: str = ""):
        self.image_id = image_id
        self.nodes: Dict[str, RoomHypothesis] = {}
        self.edges: List[HypothesisRelationship] = []
        self.alternative_groups: List[AlternativeGroup] = []
        self.doorway_contexts: List[DoorwayContext] = []
        self.cavity_contexts: List[CavityContext] = []
        self.partition_contexts: List[PartitionContext] = []

    def add_node(self, hypothesis: RoomHypothesis):
        self.nodes[hypothesis.hypothesis_id] = hypothesis

    def add_edge(self, edge: HypothesisRelationship):
        self.edges.append(edge)

    def get_neighbors(self, hypothesis_id: str) -> List[str]:
        neighbors = []
        for e in self.edges:
            if e.source_id == hypothesis_id and e.rel_type == RelationshipType.NEIGHBOR_OF:
                neighbors.append(e.target_id)
        return neighbors

    def get_door_connected(self, hypothesis_id: str) -> List[str]:
        connected = []
        for e in self.edges:
            if e.source_id == hypothesis_id and e.rel_type == RelationshipType.DOOR_CONNECTED_TO:
                connected.append(e.target_id)
        return connected

    def get_children(self, parent_id: str) -> List[str]:
        children = []
        for e in self.edges:
            if e.source_id == parent_id and e.rel_type == RelationshipType.PARENT_OF:
                children.append(e.target_id)
        return children

    def get_parent(self, child_id: str) -> Optional[str]:
        for e in self.edges:
            if e.source_id == child_id and e.rel_type == RelationshipType.CHILD_OF:
                return e.target_id
        return None

    def get_alternatives(self, hypothesis_id: str) -> List[str]:
        alts = []
        for e in self.edges:
            if e.source_id == hypothesis_id and e.rel_type == RelationshipType.ALTERNATIVE_TO:
                alts.append(e.target_id)
        return alts

    def to_dict(self) -> Dict[str, Any]:
        return {
            "imageId": self.image_id,
            "nodeCount": len(self.nodes),
            "edgeCount": len(self.edges),
            "alternativeGroupCount": len(self.alternative_groups),
            "doorwayCount": len(self.doorway_contexts),
            "cavityCount": len(self.cavity_contexts),
            "nodes": [h.to_dict() for h in self.nodes.values()],
            "edges": [e.to_dict() for e in self.edges],
            "alternativeGroups": [g.to_dict() for g in self.alternative_groups],
        }
