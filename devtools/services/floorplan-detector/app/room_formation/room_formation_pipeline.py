from __future__ import annotations
from typing import List, Dict, Any, Optional, Tuple
from .models import RoomHypothesis, RoomFormationGraph, FinalRoomLayout
from .formation_graph import FormationGraphBuilder
from .candidate_scoring import CandidateScorer
from .relationship_resolver import RelationshipResolver
from .layout_generator import LayoutGenerator
from .layout_scoring import LayoutScorer
from .disjoint_solver import DisjointSolver

class RoomFormationPipeline:
    """
    Coordinates the full Phase 2.10.7 room formation pipeline:
    1. Ingestion: Converts Phase 2.10.6 proposals into RoomHypothesis objects.
    2. Candidate Scoring: Evaluates architectural evidence for each hypothesis.
    3. Graph Construction: Builds the RoomFormationGraph with relational edges.
    4. Relationship Resolution: Evaluates parent cavities vs child partitions.
    5. Layout Generation: Proposes candidate multi-room layouts.
    6. Layout Scoring: Ranks layouts globally with wall coverage and consistency.
    7. Disjoint Solving: Enforces strict pairwise disjointness (max IoU < 0.10).
    """

    def __init__(
        self,
        scorer: Optional[CandidateScorer] = None,
        graph_builder: Optional[FormationGraphBuilder] = None,
        resolver: Optional[RelationshipResolver] = None,
        layout_generator: Optional[LayoutGenerator] = None,
        layout_scorer: Optional[LayoutScorer] = None,
        disjoint_solver: Optional[DisjointSolver] = None,
    ):
        self.scorer = scorer or CandidateScorer()
        self.graph_builder = graph_builder or FormationGraphBuilder()
        self.resolver = resolver or RelationshipResolver()
        self.layout_generator = layout_generator or LayoutGenerator()
        self.layout_scorer = layout_scorer or LayoutScorer()
        self.disjoint_solver = disjoint_solver or DisjointSolver()

    def run(
        self,
        proposals: List[Any],
        wall_network: Optional[Any] = None,
        text_regions: Optional[List[Any]] = None,
        doors: Optional[List[Any]] = None,
        image_shape: Optional[Tuple[int, int]] = None,
        top_k: int = 5,
        max_arena_hypotheses: int = 25,
    ) -> List[FinalRoomLayout]:
        """
        Executes the room formation pipeline and returns Top-K FinalRoomLayouts sorted by score descending.
        """
        if not proposals:
            return [FinalRoomLayout(rooms=[], global_score=0.0)]

        # 1. Build initial hypotheses and graph
        graph = self.graph_builder.build_graph(proposals)

        # 2. Score candidate hypotheses
        hypotheses_list = list(graph.hypotheses.values())
        self.scorer.score_hypotheses(
            hypotheses=hypotheses_list,
            wall_network=wall_network,
            doors=doors,
            text_regions=text_regions,
            image_shape=image_shape,
        )

        # 3. Resolve parent vs child cavity/partition relationships
        self.resolver.resolve_relationships(graph, wall_network=wall_network)

        # 4. Generate candidate multi-room layouts
        candidate_layouts = self.layout_generator.generate_layouts(
            graph,
            max_layouts=max(top_k * 4, 20),
            max_arena_hypotheses=max_arena_hypotheses,
        )

        # 5. Score candidate layouts globally
        scored_layouts: List[FinalRoomLayout] = []
        for l in candidate_layouts:
            sl = self.layout_scorer.score_layout(
                hypotheses=l,
                wall_network=wall_network,
                all_hypotheses_map=graph.hypotheses,
            )
            scored_layouts.append(sl)

        # Sort by global score descending
        scored_layouts.sort(key=lambda x: x.global_score, reverse=True)

        # 6. Apply disjoint solver to Top candidate layouts
        final_layouts: List[FinalRoomLayout] = []
        for l in scored_layouts[:top_k * 2]:
            disjoint_layout = self.disjoint_solver.enforce_disjointness(l)
            if disjoint_layout.rooms:
                final_layouts.append(disjoint_layout)

        # If no valid disjoint layout produced, create fallback from top scored hypotheses
        if not final_layouts and hypotheses_list:
            sorted_by_score = sorted(
                [h for h in hypotheses_list if h.state.value != "rejected"],
                key=lambda h: h.score,
                reverse=True,
            )
            fallback_layout = self.layout_scorer.score_layout(
                hypotheses=sorted_by_score[:15],
                wall_network=wall_network,
                all_hypotheses_map=graph.hypotheses,
            )
            final_layouts.append(self.disjoint_solver.enforce_disjointness(fallback_layout))

        # Sort final disjoint layouts by global score
        final_layouts.sort(key=lambda x: x.global_score, reverse=True)

        return final_layouts[:top_k] if final_layouts else [FinalRoomLayout(rooms=[], global_score=0.0)]
