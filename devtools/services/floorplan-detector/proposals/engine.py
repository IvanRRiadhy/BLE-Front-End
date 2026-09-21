"""
Proposal Engine (Phase 2.10.4)
Coordinates generation across Strategies A through F for an individual floorplan image.
"""
from typing import Dict, List, Any, Optional
import numpy as np

from .models import RoomProposal, ProposalStrategy
from .wall_network_face import generate_wall_network_face_proposals
from .doorway_connected import generate_doorway_connected_proposals
from .internal_partition import generate_internal_partition_proposals
from .repeated_room import generate_repeated_room_proposals
from .neighboring_room import generate_neighboring_room_proposals
from .combined import generate_combined_proposals


class ProposalEngine:
    """
    Offline Candidate Proposal Generation Engine.
    Executes proposal strategies A-F in isolation.
    """

    def __init__(self):
        pass

    def generate_all_proposals(
        self,
        image_id: str,
        primary_hyps: List[Any],
        wall_network: Any,
        wall_mask: np.ndarray,
        footprint_mask: Optional[np.ndarray],
        openings: List[Any],
        img_w: int,
        img_h: int,
    ) -> Dict[str, List[RoomProposal]]:
        """
        Executes all proposal strategies and returns a dictionary mapping strategy name to proposal list.
        """
        results: Dict[str, List[RoomProposal]] = {}

        # Strategy A: Wall Network Face
        results[ProposalStrategy.WALL_NETWORK_FACE.value] = generate_wall_network_face_proposals(
            image_id=image_id,
            wall_network=wall_network,
            wall_mask=wall_mask,
            footprint_mask=footprint_mask,
            img_w=img_w,
            img_h=img_h,
        )

        # Strategy B: Doorway-Connected
        results[ProposalStrategy.DOORWAY_CONNECTED.value] = generate_doorway_connected_proposals(
            image_id=image_id,
            openings=openings,
            wall_network=wall_network,
            wall_mask=wall_mask,
            footprint_mask=footprint_mask,
            img_w=img_w,
            img_h=img_h,
        )

        # Strategy C: Internal Partition
        results[ProposalStrategy.INTERNAL_PARTITION.value] = generate_internal_partition_proposals(
            image_id=image_id,
            primary_hyps=primary_hyps,
            wall_network=wall_network,
            wall_mask=wall_mask,
            footprint_mask=footprint_mask,
            img_w=img_w,
            img_h=img_h,
        )

        # Strategy D: Repeated Room
        results[ProposalStrategy.REPEATED_ROOM.value] = generate_repeated_room_proposals(
            image_id=image_id,
            primary_hyps=primary_hyps,
            wall_network=wall_network,
            wall_mask=wall_mask,
            footprint_mask=footprint_mask,
            img_w=img_w,
            img_h=img_h,
        )

        # Strategy E: Neighboring Room
        results[ProposalStrategy.NEIGHBORING_ROOM.value] = generate_neighboring_room_proposals(
            image_id=image_id,
            primary_hyps=primary_hyps,
            wall_network=wall_network,
            wall_mask=wall_mask,
            footprint_mask=footprint_mask,
            img_w=img_w,
            img_h=img_h,
        )

        # Strategy F: Combined
        results[ProposalStrategy.COMBINED.value] = generate_combined_proposals(
            image_id=image_id,
            proposals_by_strategy=results,
        )

        return results
