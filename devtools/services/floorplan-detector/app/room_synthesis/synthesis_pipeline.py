"""
End-to-End Synthesis Pipeline Coordinator for Phase 2.10.9 Global Room Synthesis.
Coordinates:
1. Spatial Relationship Graph Construction
2. Doorway Context & DOOR_CONNECTED_TO Analysis
3. Cavity Context & Inversion Rule
4. Competing Configuration Generation
5. Global Room Scoring
6. Constraint Solving (disjointness, parent/child, alternatives)
7. Light Boundary Snapping
"""
from typing import List, Dict, Any, Optional, Tuple
import copy
import time
import numpy as np
from shapely.geometry import Polygon as ShapelyPolygon
from .models import (
    RoomHypothesis,
    RoomConfiguration,
    SynthesisResult,
)
from .hypothesis_graph import RoomHypothesisGraph
from .doorway_context import DoorwayContextAnalyzer
from .cavity_context import CavityContextAnalyzer
from .relationship_builder import SpatialRelationshipBuilder
from .configuration_generator import ConfigurationGenerator
from .global_scoring import GlobalRoomScorer
from .constraint_solver import ConfigurationConstraintSolver
from .boundary_refinement import BoundaryRefiner


class GlobalRoomSynthesisPipeline:
    """
    Coordinates global architectural reasoning and room synthesis across a floorplan.
    """

    def __init__(
        self,
        relationship_builder: Optional[SpatialRelationshipBuilder] = None,
        doorway_analyzer: Optional[DoorwayContextAnalyzer] = None,
        cavity_analyzer: Optional[CavityContextAnalyzer] = None,
        config_generator: Optional[ConfigurationGenerator] = None,
        scorer: Optional[GlobalRoomScorer] = None,
        solver: Optional[ConfigurationConstraintSolver] = None,
        boundary_refiner: Optional[BoundaryRefiner] = None,
        use_ml: bool = False,
        refine_boundaries: bool = True,
    ):
        self.relationship_builder = relationship_builder or SpatialRelationshipBuilder()
        self.doorway_analyzer = doorway_analyzer or DoorwayContextAnalyzer()
        self.cavity_analyzer = cavity_analyzer or CavityContextAnalyzer()
        self.config_generator = config_generator or ConfigurationGenerator()
        self.scorer = scorer or GlobalRoomScorer()
        self.solver = solver or ConfigurationConstraintSolver()
        self.boundary_refiner = boundary_refiner or BoundaryRefiner()
        self.use_ml = use_ml
        self.refine_boundaries = refine_boundaries

    def run(
        self,
        hypotheses: List[RoomHypothesis],
        image_id: str = "",
        img_w: int = 1000,
        img_h: int = 1000,
        wall_network: Optional[Any] = None,
        doors: Optional[List[Any]] = None,
    ) -> SynthesisResult:
        """
        Executes global room synthesis for a collection of room hypotheses.
        """
        t0 = time.perf_counter()
        hyps = copy.deepcopy(hypotheses)

        if not hyps:
            return SynthesisResult(image_id=image_id, execution_time_ms=0.0)

        # 1. Doorway Context Analysis
        door_ctxs, door_rels = self.doorway_analyzer.analyze_doorways(
            hypotheses=hyps,
            doors=doors,
            img_w=img_w,
            img_h=img_h,
        )

        # 2. Spatial Relationship & Alternative Group Analysis
        spatial_rels, alt_groups, part_ctxs = self.relationship_builder.build_relationships(
            hypotheses=hyps,
            image_id=image_id,
        )

        all_rels = spatial_rels + door_rels

        # 3. Cavity Context Analysis (Cavity Inversion Rule)
        cav_ctxs = self.cavity_analyzer.analyze_cavities(hypotheses=hyps)

        # 4. Construct Hypothesis Graph
        graph = RoomHypothesisGraph(image_id=image_id)
        for h in hyps:
            graph.add_node(h)
        for r in all_rels:
            graph.add_edge(r)
        graph.alternative_groups = alt_groups
        graph.doorway_contexts = door_ctxs
        graph.cavity_contexts = cav_ctxs
        graph.partition_contexts = part_ctxs

        # 5. Generate Competing Configurations
        raw_configs = self.config_generator.generate_configurations(graph=graph, image_id=image_id)

        # 6. Score and Solve Each Configuration
        valid_configs: List[RoomConfiguration] = []
        for cfg in raw_configs:
            # Enforce constraints (disjointness, parent/child, alternatives)
            solved_cfg = self.solver.solve_constraints(cfg, graph=graph)
            # Score configuration globally
            self.scorer.score_configuration(solved_cfg, wall_network=wall_network, use_ml=self.use_ml)
            valid_configs.append(solved_cfg)

        # Rank configurations globally
        valid_configs.sort(key=lambda c: c.global_score, reverse=True)
        best_config = valid_configs[0] if valid_configs else RoomConfiguration("empty", image_id)

        # 7. Post-Selection Light Boundary Snapping
        final_rooms: List[RoomHypothesis] = []
        for r in best_config.hypotheses:
            if self.refine_boundaries and wall_network is not None:
                snapped_poly, b_qual = self.boundary_refiner.refine_boundary(r.polygon, wall_network=wall_network)
                r.polygon = snapped_poly
                r.boundary_quality = b_qual
            final_rooms.append(r)

        best_config.hypotheses = final_rooms
        elapsed_ms = (time.perf_counter() - t0) * 1000.0

        return SynthesisResult(
            image_id=image_id,
            selected_rooms=final_rooms,
            selected_configuration=best_config,
            all_configurations=valid_configs,
            alternative_groups=alt_groups,
            relationships=all_rels,
            doorway_contexts=door_ctxs,
            cavity_contexts=cav_ctxs,
            execution_time_ms=elapsed_ms,
        )
