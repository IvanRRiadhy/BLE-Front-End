"""
Semantic Room Classifier for Phase 2.10.8 Room Validity.
Provides safeguards for:
- Corridors (elongated, multi-room transit spaces)
- Large Spaces (auditoriums, halls, lobbies vs artifact cavities)
- Concave & L-shaped rooms
"""
from typing import List, Tuple, Dict, Any, Optional
import numpy as np
from shapely.geometry import Polygon as ShapelyPolygon
from .models import RoomValidityHypothesis


class SemanticRoomClassifier:
    """
    Evaluates semantic roles and protects legitimate architectural spaces
    (corridors, auditoriums, L-shaped rooms) from false suppression.
    """

    def classify_semantics(
        self,
        hyp: RoomValidityHypothesis,
        all_hypotheses: Optional[List[RoomValidityHypothesis]] = None,
    ) -> None:
        """
        Calculates corridor_likelihood, large_space_likelihood, and large_space_artifact_likelihood.
        """
        area = hyp.area_px
        ar = hyp.aspect_ratio
        comp = hyp.compactness
        wall_supp = hyp.wall_boundary_support
        door_cnt = hyp.doorway_count
        neighbor_cnt = int(hyp.neighbor_consistency / 0.25) if hyp.neighbor_consistency > 0 else 0

        # 1. Multi-feature Corridor Detection
        # A corridor is elongated (high aspect ratio), has wall support along its long sides,
        # connects to multiple rooms (high neighbor/doorway count), and has moderate area.
        is_elongated = (ar >= 3.0)
        has_transit_connectivity = (neighbor_cnt >= 2 or door_cnt >= 1)
        has_adequate_wall = (wall_supp >= 0.35)

        if is_elongated and has_transit_connectivity and has_adequate_wall:
            corridor_score = min(0.95, 0.40 + 0.10 * ar + 0.15 * neighbor_cnt + 0.15 * door_cnt)
            is_corr = True
        elif is_elongated and comp < 0.20:
            corridor_score = min(0.85, 0.30 + 0.10 * ar)
            is_corr = (corridor_score >= 0.60)
        else:
            corridor_score = 0.05
            is_corr = False

        hyp.is_corridor = is_corr
        hyp.corridor_likelihood = round(float(corridor_score), 4)

        # 2. Large Space Protection vs Artifact Cavity
        # A legitimate large room (auditorium, hall, open-plan office) has large area (>= 25,000 px),
        # high boundary enclosure, and low interior clutter.
        # An artifact cavity has large area but weak wall support or touches exterior margins.
        if area >= 20000.0:
            hyp.is_large_space = True
            if wall_supp >= 0.45 and hyp.exterior_likelihood < 0.30:
                hyp.large_space_likelihood = min(0.95, 0.50 + 0.40 * hyp.enclosure_score)
                hyp.large_space_artifact_likelihood = 0.10
            else:
                hyp.large_space_likelihood = 0.20
                hyp.large_space_artifact_likelihood = max(0.60, hyp.exterior_likelihood)
        else:
            hyp.is_large_space = False
            hyp.large_space_likelihood = 0.05
            hyp.large_space_artifact_likelihood = 0.05
