from __future__ import annotations
from typing import List, Dict, Any, Optional
from shapely.geometry import Polygon
from shapely.ops import unary_union
from .models import FinalRoom, FinalRoomLayout, RoomHypothesis

class LayoutScorer:
    """
    Evaluates a candidate multi-room layout globally.
    Computes:
    - sum of individual room hypothesis scores
    - coverage bonus (how much valid floorplan area / wall network perimeter is covered)
    - partition agreement bonus (consistency between adjacent rooms)
    - mutual overlap penalty (strictly penalizes rooms intersecting > 0.05)
    - parent-child duplicate penalty (penalizes retaining both parent and its children)
    - fragmentation penalty (penalizes excessive tiny disjoint fragments)
    """

    def __init__(
        self,
        wall_coverage_weight: float = 0.20,
        partition_agreement_weight: float = 0.15,
        overlap_penalty_weight: float = 1.0,
        duplicate_penalty_weight: float = 0.8,
        fragmentation_penalty_weight: float = 0.1,
    ):
        self.wall_coverage_weight = wall_coverage_weight
        self.partition_agreement_weight = partition_agreement_weight
        self.overlap_penalty_weight = overlap_penalty_weight
        self.duplicate_penalty_weight = duplicate_penalty_weight
        self.fragmentation_penalty_weight = fragmentation_penalty_weight

    def score_layout(
        self,
        hypotheses: List[RoomHypothesis],
        wall_network: Optional[Any] = None,
        all_hypotheses_map: Optional[Dict[str, RoomHypothesis]] = None,
    ) -> FinalRoomLayout:
        """
        Calculates holistic score for a proposed combination of room hypotheses.
        """
        if not hypotheses:
            return FinalRoomLayout(rooms=[], global_score=0.0)

        # 1. Base individual scores
        base_score = sum(h.score for h in hypotheses)
        n_rooms = len(hypotheses)

        # 2. Pairwise overlap penalty & duplicate penalty
        overlap_penalty = 0.0
        duplicate_penalty = 0.0
        max_pairwise_iou = 0.0

        for i in range(n_rooms):
            h1 = hypotheses[i]
            for j in range(i + 1, n_rooms):
                h2 = hypotheses[j]
                
                # Check spatial overlap
                if not h1.polygon.envelope.intersects(h2.polygon.envelope):
                    continue

                inter_geom = h1.polygon.intersection(h2.polygon)
                inter_area = inter_geom.area
                if inter_area <= 1e-5:
                    continue

                min_area = min(h1.polygon.area, h2.polygon.area)
                union_area = h1.polygon.area + h2.polygon.area - inter_area
                iou = inter_area / union_area if union_area > 0 else 0.0
                containment = inter_area / min_area if min_area > 0 else 0.0

                if iou > max_pairwise_iou:
                    max_pairwise_iou = iou

                # Overlap penalty scales sharply with IoU / containment
                if iou > 0.05 or containment > 0.10:
                    overlap_penalty += (iou * 2.0 + containment * 1.0)

                # Check parent-child or alternative conflict
                if h1.id in h2.parent_ids or h2.id in h1.parent_ids:
                    duplicate_penalty += 1.5
                if h1.id in h2.alternative_ids or h2.id in h1.alternative_ids:
                    duplicate_penalty += 1.0

        # 3. Wall / Floor Coverage bonus
        coverage_bonus = 0.0
        if wall_network is not None and hasattr(wall_network, "wall_lines") and wall_network.wall_lines:
            # Approximate perimeter coverage along wall segments
            total_wall_len = sum(line.length for line in wall_network.wall_lines if hasattr(line, "length"))
            if total_wall_len > 0:
                covered_len = 0.0
                for h in hypotheses:
                    h_bounds = h.polygon.boundary
                    for line in wall_network.wall_lines:
                        if hasattr(line, "distance") and line.distance(h_bounds) < 5.0:
                            covered_len += min(line.length, h_bounds.length * 0.1)
                coverage_bonus = min(1.0, covered_len / (total_wall_len + 1e-5))
        else:
            # Union area compactness bonus
            union_poly = unary_union([h.polygon for h in hypotheses])
            sum_area = sum(h.polygon.area for h in hypotheses)
            if sum_area > 0:
                # If union area is close to sum_area, no wasted overlaps
                coverage_bonus = min(1.0, union_poly.area / sum_area)

        # 4. Partition agreement bonus
        # Rewards layouts where neighboring rooms share clean common boundaries without large gaps
        partition_bonus = 0.0
        shared_boundary_count = 0
        for i in range(n_rooms):
            h1 = hypotheses[i]
            for j in range(i + 1, n_rooms):
                h2 = hypotheses[j]
                if h1.polygon.envelope.distance(h2.polygon.envelope) < 10.0:
                    dist = h1.polygon.distance(h2.polygon)
                    if dist < 4.0: # touching or near touching
                        shared_boundary_count += 1
        if n_rooms > 1:
            partition_bonus = min(1.0, shared_boundary_count / (n_rooms * 1.5))

        # 5. Fragmentation penalty
        # Penalizes tiny rooms (< 1500 sq pixels or < 2% of median room area)
        fragmentation_penalty = 0.0
        areas = [h.polygon.area for h in hypotheses]
        median_area = sorted(areas)[len(areas) // 2] if areas else 1.0
        for a in areas:
            if a < 1500 or (median_area > 5000 and a < 0.05 * median_area):
                fragmentation_penalty += 0.3

        # Aggregate global layout score
        global_score = (
            base_score
            + (self.wall_coverage_weight * coverage_bonus * 2.0)
            + (self.partition_agreement_weight * partition_bonus * 2.0)
            - (self.overlap_penalty_weight * overlap_penalty)
            - (self.duplicate_penalty_weight * duplicate_penalty)
            - (self.fragmentation_penalty_weight * fragmentation_penalty)
        )

        final_rooms = [
            FinalRoom(
                id=f"room_{idx:03d}",
                hypothesis_id=h.id,
                polygon=h.polygon,
                score=h.score,
                evidence=h.evidence,
                source_strategy=h.source_strategy,
                parent_id=h.parent_ids[0] if h.parent_ids else None,
            )
            for idx, h in enumerate(hypotheses)
        ]

        return FinalRoomLayout(
            rooms=final_rooms,
            global_score=float(global_score),
            wall_coverage_ratio=float(coverage_bonus),
            partition_agreement_score=float(partition_bonus),
            overlap_penalty=float(overlap_penalty),
            fragmentation_penalty=float(fragmentation_penalty),
            max_pairwise_iou=float(max_pairwise_iou),
        )
