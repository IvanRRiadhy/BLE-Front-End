"""
Configuration Generator for Phase 2.10.9 Global Room Synthesis.
Generates structured competing multi-room configurations using spatial arenas
and alternative clustering to prevent combinatorial explosion.
"""
from typing import List, Dict, Any, Optional, Set, Tuple
import copy
import numpy as np
from .models import (
    RoomHypothesis,
    RoomConfiguration,
    AlternativeGroup,
    PartitionContext,
)
from .hypothesis_graph import RoomHypothesisGraph


class ConfigurationGenerator:
    """
    Constructs competing room configurations across spatial arenas.
    """

    def __init__(
        self,
        max_configurations: int = 15,
        beam_width: int = 8,
    ):
        self.max_configurations = max_configurations
        self.beam_width = beam_width

    def generate_configurations(
        self,
        graph: RoomHypothesisGraph,
        image_id: str = "",
    ) -> List[RoomConfiguration]:
        """
        Generates competing candidate configurations from the hypothesis graph.
        """
        all_hyps = list(graph.nodes.values())
        if not all_hyps:
            return []

        # 1. Base Configuration: All valid, non-artificial cavity hypotheses
        base_hyps = [
            h for h in all_hyps
            if h.artificial_cavity_likelihood < 0.65 and h.sliver_likelihood < 0.60
        ]

        configs: List[RoomConfiguration] = []

        # Config 0: Raw candidate pool (unfiltered baseline)
        c0 = RoomConfiguration(
            configuration_id="cfg_00_all_candidates",
            image_id=image_id,
            hypotheses=copy.deepcopy(all_hyps),
        )
        configs.append(c0)

        # Config 1: Cleaned baseline (no slivers, low cavity penalty)
        c1 = RoomConfiguration(
            configuration_id="cfg_01_cleaned_baseline",
            image_id=image_id,
            hypotheses=copy.deepcopy(base_hyps),
        )
        configs.append(c1)

        # Config 2: Parent-preferred interpretation (protect large spaces)
        parent_preferred = []
        child_ids_set = set()
        for h in base_hyps:
            if h.child_ids:
                parent_preferred.append(h)
                for cid in h.child_ids:
                    child_ids_set.add(cid)
            elif h.hypothesis_id not in child_ids_set:
                parent_preferred.append(h)

        c2 = RoomConfiguration(
            configuration_id="cfg_02_parent_preferred",
            image_id=image_id,
            hypotheses=copy.deepcopy(parent_preferred),
        )
        configs.append(c2)

        # Config 3: Child-preferred interpretation (divided rooms)
        child_preferred = []
        for h in base_hyps:
            if not h.child_ids:  # Only children and standalone rooms
                child_preferred.append(h)

        c3 = RoomConfiguration(
            configuration_id="cfg_03_child_preferred",
            image_id=image_id,
            hypotheses=copy.deepcopy(child_preferred),
        )
        configs.append(c3)

        # Config 4: Doorway-anchored configuration
        door_anchored = [
            h for h in base_hyps
            if h.doorway_count > 0 or h.topology_support >= 0.40 or h.is_corridor or h.is_large_space
        ]
        c4 = RoomConfiguration(
            configuration_id="cfg_04_doorway_anchored",
            image_id=image_id,
            hypotheses=copy.deepcopy(door_anchored),
        )
        configs.append(c4)

        # Config 5: High-confidence architectural configuration
        high_conf = [
            h for h in base_hyps
            if h.wall_support >= 0.60 and (h.doorway_count > 0 or len(h.neighbor_ids) >= 1)
        ]
        c5 = RoomConfiguration(
            configuration_id="cfg_05_high_architectural",
            image_id=image_id,
            hypotheses=copy.deepcopy(high_conf),
        )
        configs.append(c5)

        # Config 6: Alternative Group Branching (pick top-scored in each alternative group)
        alt_selected_ids = set()
        for grp in graph.alternative_groups:
            c_hyps = [graph.nodes[cid] for cid in grp.competing_hypothesis_ids if cid in graph.nodes]
            if c_hyps:
                # Rank by combination of doorway + wall support - cavity penalty
                c_hyps.sort(
                    key=lambda h: (h.doorway_support * 0.4 + h.wall_support * 0.4 - h.artificial_cavity_likelihood * 0.5),
                    reverse=True,
                )
                alt_selected_ids.add(c_hyps[0].hypothesis_id)

        alt_branch_hyps = [
            h for h in base_hyps
            if not h.alternative_group_id or h.hypothesis_id in alt_selected_ids
        ]
        c6 = RoomConfiguration(
            configuration_id="cfg_06_alternative_optimized",
            image_id=image_id,
            hypotheses=copy.deepcopy(alt_branch_hyps),
        )
        configs.append(c6)

        return configs
