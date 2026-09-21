"""
Cavity Splitting Engine (Phase 2.10.5)
Coordinates multi-strategy oversized cavity analysis, splitting, configuration building,
and diagnostic recording.
"""
from typing import Dict, List, Any, Optional, Tuple
import numpy as np

from .models import (
    OversizedCavityAnalysis,
    CavitySplitProposal,
    SplitConfiguration,
    SplitStrategy,
)
from .analysis import analyze_oversized_cavities
from .wall_network_split import split_cavity_by_wall_network
from .planar_face_split import split_cavity_by_planar_faces
from .partition_split import split_cavity_by_partition
from .doorway_topology_split import split_cavity_by_doorway_topology
from .proposal_guided_split import split_cavity_by_proposals
from .hybrid_split import generate_hybrid_splits
from proposals.models import RoomProposal


class CavitySplittingEngine:
    """
    Offline Engine for decomposing oversized cavity hypotheses into localized room proposals.
    """

    def __init__(self):
        pass

    def process_floorplan(
        self,
        image_id: str,
        primary_hyps: List[Any],
        wall_network: Any,
        wall_mask: np.ndarray,
        footprint_mask: Optional[np.ndarray],
        openings: List[Any],
        proposals: List[RoomProposal],
        img_w: int,
        img_h: int,
    ) -> Tuple[List[OversizedCavityAnalysis], Dict[str, List[CavitySplitProposal]], List[SplitConfiguration]]:
        """
        Runs complete oversized cavity analysis and executes all 6 splitting strategies.
        """
        # 1. Analyze cavities
        analyses = analyze_oversized_cavities(
            image_id=image_id,
            primary_hyps=primary_hyps,
            wall_network=wall_network,
            openings=openings,
            proposals=proposals,
            img_w=img_w,
            img_h=img_h,
        )

        splits_by_strategy: Dict[str, List[CavitySplitProposal]] = {
            SplitStrategy.WALL_NETWORK_SPLIT.value: [],
            SplitStrategy.PLANAR_FACE_SPLIT.value: [],
            SplitStrategy.PARTITION_SPLIT.value: [],
            SplitStrategy.DOORWAY_TOPOLOGY_SPLIT.value: [],
            SplitStrategy.PROPOSAL_GUIDED_SPLIT.value: [],
            SplitStrategy.HYBRID_SPLIT.value: [],
        }
        all_configurations: List[SplitConfiguration] = []

        # 2. For each cavity that should split, execute strategies
        for cavity in analyses:
            if not cavity.should_split:
                continue

            # Strategy A: Wall Network Split
            s_a = split_cavity_by_wall_network(
                image_id=image_id,
                cavity=cavity,
                wall_network=wall_network,
                wall_mask=wall_mask,
                footprint_mask=footprint_mask,
                img_w=img_w,
                img_h=img_h,
            )
            splits_by_strategy[SplitStrategy.WALL_NETWORK_SPLIT.value].extend(s_a)

            # Strategy B: Planar Face Split
            s_b = split_cavity_by_planar_faces(
                image_id=image_id,
                cavity=cavity,
                proposals=proposals,
                wall_mask=wall_mask,
                footprint_mask=footprint_mask,
                img_w=img_w,
                img_h=img_h,
            )
            splits_by_strategy[SplitStrategy.PLANAR_FACE_SPLIT.value].extend(s_b)

            # Strategy C: Partition Split
            s_c = split_cavity_by_partition(
                image_id=image_id,
                cavity=cavity,
                wall_network=wall_network,
                wall_mask=wall_mask,
                footprint_mask=footprint_mask,
                img_w=img_w,
                img_h=img_h,
            )
            splits_by_strategy[SplitStrategy.PARTITION_SPLIT.value].extend(s_c)

            # Strategy D: Doorway Topology Split
            s_d = split_cavity_by_doorway_topology(
                image_id=image_id,
                cavity=cavity,
                openings=openings,
                wall_mask=wall_mask,
                footprint_mask=footprint_mask,
                img_w=img_w,
                img_h=img_h,
            )
            splits_by_strategy[SplitStrategy.DOORWAY_TOPOLOGY_SPLIT.value].extend(s_d)

            # Strategy E: Proposal Guided Split
            s_e = split_cavity_by_proposals(
                image_id=image_id,
                cavity=cavity,
                proposals=proposals,
                wall_mask=wall_mask,
                footprint_mask=footprint_mask,
                img_w=img_w,
                img_h=img_h,
            )
            splits_by_strategy[SplitStrategy.PROPOSAL_GUIDED_SPLIT.value].extend(s_e)

            # Strategy F: Hybrid Split
            cav_splits = {
                SplitStrategy.WALL_NETWORK_SPLIT.value: s_a,
                SplitStrategy.PLANAR_FACE_SPLIT.value: s_b,
                SplitStrategy.PARTITION_SPLIT.value: s_c,
                SplitStrategy.DOORWAY_TOPOLOGY_SPLIT.value: s_d,
                SplitStrategy.PROPOSAL_GUIDED_SPLIT.value: s_e,
            }
            s_f, config = generate_hybrid_splits(image_id=image_id, cavity=cavity, splits_by_strategy=cav_splits)
            splits_by_strategy[SplitStrategy.HYBRID_SPLIT.value].extend(s_f)
            if config:
                all_configurations.append(config)

        return analyses, splits_by_strategy, all_configurations
