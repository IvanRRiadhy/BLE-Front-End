"""
End-to-End Recovery Pipeline Coordinator for Phase 2.10.10.
Executes:
1. Strategy A: Doorway-anchored recovery
2. Strategy B: Internal partition recovery
3. Strategy C: Neighbor-based recovery
4. Strategy D: Repetition pattern recovery
5. Strategy E: Wall reconstruction
6. Strategy F: Multi-signal proposal fusion
And converts recovered proposals into RoomHypothesis format for Phase 2.10.9 Global Synthesis.
"""
from typing import List, Dict, Any, Optional, Tuple
import copy
import time
import numpy as np
from shapely.geometry import Polygon as ShapelyPolygon
from .models import MissingRoomProposal, RecoveryResult, RecoveryStrategy
from .doorway_recovery import DoorwayRecoveryEngine
from .partition_recovery import PartitionRecoveryEngine
from .neighbor_recovery import NeighborRecoveryEngine
from .repetition_recovery import RepetitionRecoveryEngine
from .wall_reconstruction import WallReconstructionEngine
from .proposal_fusion import ProposalFusionEngine
from app.room_synthesis.models import RoomHypothesis


class TargetedRecoveryPipeline:
    """
    Coordinates targeted recovery of missing architectural rooms across a floorplan.
    """

    def __init__(
        self,
        doorway_engine: Optional[DoorwayRecoveryEngine] = None,
        partition_engine: Optional[PartitionRecoveryEngine] = None,
        neighbor_engine: Optional[NeighborRecoveryEngine] = None,
        repetition_engine: Optional[RepetitionRecoveryEngine] = None,
        wall_engine: Optional[WallReconstructionEngine] = None,
        fusion_engine: Optional[ProposalFusionEngine] = None,
    ):
        self.doorway_engine = doorway_engine or DoorwayRecoveryEngine()
        self.partition_engine = partition_engine or PartitionRecoveryEngine()
        self.neighbor_engine = neighbor_engine or NeighborRecoveryEngine()
        self.repetition_engine = repetition_engine or RepetitionRecoveryEngine()
        self.wall_engine = wall_engine or WallReconstructionEngine()
        self.fusion_engine = fusion_engine or ProposalFusionEngine()

    def run_recovery(
        self,
        image_id: str,
        existing_hypotheses: List[Any],
        wall_network: Optional[Any] = None,
        doors: Optional[List[Any]] = None,
        footprint_mask: Optional[np.ndarray] = None,
        img_w: int = 1000,
        img_h: int = 1000,
    ) -> RecoveryResult:
        """
        Executes all recovery strategies and returns fused proposals.
        """
        t0 = time.perf_counter()
        existing_polys = [getattr(h, "polygon", h) for h in existing_hypotheses if hasattr(h, "polygon") or isinstance(h, ShapelyPolygon)]

        proposals_by_strategy: Dict[str, List[MissingRoomProposal]] = {}

        # 1. Strategy A: Doorway recovery
        props_door = self.doorway_engine.generate_proposals(
            image_id=image_id,
            doors=doors,
            wall_network=wall_network,
            existing_polygons=existing_polys,
            img_w=img_w,
            img_h=img_h,
        )
        proposals_by_strategy[RecoveryStrategy.DOORWAY_RECOVERY.value] = props_door

        # 2. Strategy B: Partition recovery
        props_part = self.partition_engine.generate_proposals(
            image_id=image_id,
            wall_network=wall_network,
            candidate_polygons=existing_polys,
        )
        proposals_by_strategy[RecoveryStrategy.PARTITION_RECOVERY.value] = props_part

        # 3. Strategy C: Neighbor recovery
        props_neigh = self.neighbor_engine.generate_proposals(
            image_id=image_id,
            validated_rooms=existing_polys,
            footprint_mask=footprint_mask,
            img_w=img_w,
            img_h=img_h,
        )
        proposals_by_strategy[RecoveryStrategy.NEIGHBOR_RECOVERY.value] = props_neigh

        # 4. Strategy D: Repetition recovery
        props_rep = self.repetition_engine.generate_proposals(
            image_id=image_id,
            existing_rooms=existing_polys,
            wall_network=wall_network,
            img_w=img_w,
            img_h=img_h,
        )
        proposals_by_strategy[RecoveryStrategy.REPETITION_RECOVERY.value] = props_rep

        # 5. Strategy E: Wall reconstruction
        props_wall = self.wall_engine.generate_proposals(
            image_id=image_id,
            wall_network=wall_network,
            existing_polygons=existing_polys,
        )
        proposals_by_strategy[RecoveryStrategy.WALL_RECONSTRUCTION.value] = props_wall

        # 6. Strategy F: Multi-signal proposal fusion & deduplication
        fused_props, dup_count = self.fusion_engine.fuse_proposals(
            proposals_by_strategy=proposals_by_strategy,
            image_id=image_id,
        )

        all_raw: List[MissingRoomProposal] = []
        for p_list in proposals_by_strategy.values():
            all_raw.extend(p_list)

        elapsed_ms = (time.perf_counter() - t0) * 1000.0

        return RecoveryResult(
            image_id=image_id,
            total_proposals=all_raw,
            proposals_by_strategy=proposals_by_strategy,
            fused_proposals=fused_props,
            duplicates_pruned=dup_count,
            execution_time_ms=elapsed_ms,
        )

    def convert_to_synthesis_hypotheses(
        self,
        recovery_proposals: List[MissingRoomProposal],
        sample_id: str,
    ) -> List[RoomHypothesis]:
        """
        Converts MissingRoomProposal objects into RoomHypothesis format for Phase 2.10.9 Global Synthesis.
        """
        hyps: List[RoomHypothesis] = []
        for p in recovery_proposals:
            h = RoomHypothesis(
                hypothesis_id=p.proposal_id,
                image_id=sample_id,
                polygon=p.polygon,
                area_px=p.area_px,
                bbox=p.bbox,
                centroid=p.centroid,
                source_proposal_ids=[p.proposal_id],
                source_strategy=p.source_strategy,
                formation_source="phase21010_recovery",
                validity_decision="VALID",
                validity_score=0.75,
                confidence=p.confidence,
                wall_support=p.wall_support,
                enclosure_score=p.enclosure_score,
                doorway_support=p.doorway_support,
                partition_support=p.partition_support,
                neighbor_support=p.neighbor_support,
                boundary_quality=p.boundary_quality,
            )
            hyps.append(h)
        return hyps
