"""
Cavity Context Analyzer for Phase 2.10.9 Global Room Synthesis.
Implements the Cavity Inversion Rule:
Enclosed polygons without meaningful doorways or neighboring rooms
are penalized as potential artificial cavities.
"""
from typing import List, Dict, Any, Optional
import numpy as np
from .models import RoomHypothesis, CavityContext


class CavityContextAnalyzer:
    """
    Evaluates cavity enclosure in conjunction with doorway and topological context.
    """

    def __init__(
        self,
        enclosure_threshold: float = 0.85,
        wall_support_threshold: float = 0.85,
    ):
        self.enclosure_threshold = enclosure_threshold
        self.wall_support_threshold = wall_support_threshold

    def analyze_cavities(
        self,
        hypotheses: List[RoomHypothesis],
    ) -> List[CavityContext]:
        """
        Analyzes each hypothesis for artificial cavity likelihood.
        """
        contexts: List[CavityContext] = []

        for h in hypotheses:
            enclosure = h.enclosure_score
            wall_supp = h.wall_support
            door_count = h.doorway_count
            neighbor_count = len(h.neighbor_ids)

            # Check if fully walled without openings
            is_walled_no_openings = (
                wall_supp >= self.wall_support_threshold
                and enclosure >= self.enclosure_threshold
                and door_count == 0
                and neighbor_count == 0
            )

            # Cavity Inversion Rule:
            # High wall enclosure + zero doorway evidence + zero neighbors = high artificial cavity likelihood
            if is_walled_no_openings:
                art_cavity_ev = 0.85
            elif wall_supp >= 0.80 and door_count == 0 and neighbor_count <= 1:
                art_cavity_ev = 0.50
            elif h.unsupported_boundary_ratio >= 0.60:
                art_cavity_ev = 0.70
            else:
                art_cavity_ev = 0.05

            # Protect large spaces (e.g. auditoriums) and corridors
            if h.is_large_space or h.is_corridor:
                art_cavity_ev = min(0.15, art_cavity_ev)

            h.artificial_cavity_likelihood = art_cavity_ev
            h.cavity_likelihood = enclosure

            ctx = CavityContext(
                hypothesis_id=h.hypothesis_id,
                enclosure_score=enclosure,
                wall_support=wall_supp,
                doorway_count=door_count,
                meaningful_opening_count=door_count,
                neighbor_count=neighbor_count,
                exterior_connection=bool(h.exterior_likelihood > 0.40),
                cavity_area=h.area_px,
                artificial_cavity_likelihood=art_cavity_ev,
                is_fully_walled_without_openings=is_walled_no_openings,
            )
            contexts.append(ctx)

        return contexts
