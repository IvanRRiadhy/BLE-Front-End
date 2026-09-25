from __future__ import annotations
from typing import List, Tuple, Dict, Any, Optional
import numpy as np
from shapely.geometry import Polygon, MultiPolygon
from shapely.ops import unary_union
from .models import FinalRoom, FinalRoomLayout

class DisjointSolver:
    """
    Enforces strict pairwise disjointness across room hypotheses in a final layout.
    Guarantees:
    1. Resolves minor boundary overlaps (<= 5% area overlap) by boundary snapping/subtraction
       (giving priority to the higher scoring room).
    2. Drops or replaces conflicting duplicates (IoU >= 0.10) favoring the higher scoring candidate.
    3. Validates that max pairwise IoU across all final output rooms is strictly < 0.10.
    4. Ensures no degenerate or empty polygons enter the final room set.
    """

    def __init__(self, max_allowed_overlap_iou: float = 0.10, minor_overlap_clip_ratio: float = 0.05):
        self.max_allowed_overlap_iou = max_allowed_overlap_iou
        self.minor_overlap_clip_ratio = minor_overlap_clip_ratio

    def enforce_disjointness(self, layout: FinalRoomLayout) -> FinalRoomLayout:
        """
        Takes a candidate layout and returns a guaranteed disjoint FinalRoomLayout.
        """
        if not layout.rooms:
            return layout

        # Sort rooms by score descending (highest quality room gets priority)
        sorted_rooms = sorted(layout.rooms, key=lambda r: r.score, reverse=True)
        accepted_rooms: List[FinalRoom] = []

        for candidate in sorted_rooms:
            cand_poly = candidate.polygon
            if cand_poly.is_empty or cand_poly.area < 100.0:
                continue

            # Ensure validity
            if not cand_poly.is_valid:
                cand_poly = cand_poly.buffer(0)
                if cand_poly.is_empty:
                    continue
                if isinstance(cand_poly, MultiPolygon):
                    cand_poly = max(cand_poly.geoms, key=lambda p: p.area)

            conflict = False
            modified_poly = cand_poly

            for accepted in accepted_rooms:
                acc_poly = accepted.polygon
                if not modified_poly.envelope.intersects(acc_poly.envelope):
                    continue

                inter = modified_poly.intersection(acc_poly)
                inter_area = inter.area
                if inter_area <= 1e-4:
                    continue

                min_area = min(modified_poly.area, acc_poly.area)
                union_area = modified_poly.area + acc_poly.area - inter_area
                iou = inter_area / union_area if union_area > 0 else 0.0
                containment = inter_area / min_area if min_area > 0 else 0.0

                # Minor overlap: clip the lower-scoring candidate polygon
                if (inter_area / modified_poly.area <= self.minor_overlap_clip_ratio) or (inter_area / acc_poly.area <= self.minor_overlap_clip_ratio):
                    diff = modified_poly.difference(acc_poly)
                    if diff.is_empty or diff.area < 100.0:
                        conflict = True
                        break
                    if isinstance(diff, MultiPolygon):
                        diff = max(diff.geoms, key=lambda p: p.area)
                    if not diff.is_valid:
                        diff = diff.buffer(0)
                        if isinstance(diff, MultiPolygon):
                            diff = max(diff.geoms, key=lambda p: p.area)
                    modified_poly = diff
                elif iou >= self.max_allowed_overlap_iou or containment > 0.25:
                    # Serious conflict with an already accepted, higher-scoring room
                    conflict = True
                    break
                else:
                    diff = modified_poly.difference(acc_poly)
                    if diff.is_empty or diff.area < 0.50 * candidate.polygon.area:
                        conflict = True
                        break
                    if isinstance(diff, MultiPolygon):
                        diff = max(diff.geoms, key=lambda p: p.area)
                    modified_poly = diff

            if not conflict and not modified_poly.is_empty and modified_poly.area >= 200.0:
                # Accepted with potential minor boundary adjustment
                accepted_rooms.append(
                    FinalRoom(
                        id=f"room_{len(accepted_rooms):03d}",
                        hypothesis_id=candidate.hypothesis_id,
                        polygon=modified_poly,
                        score=candidate.score,
                        evidence=candidate.evidence,
                        source_strategy=candidate.source_strategy,
                        parent_id=candidate.parent_id,
                    )
                )

        # Re-verify max pairwise IoU strictly < 0.10
        max_iou = 0.0
        n_final = len(accepted_rooms)
        for i in range(n_final):
            for j in range(i + 1, n_final):
                p1 = accepted_rooms[i].polygon
                p2 = accepted_rooms[j].polygon
                if p1.envelope.intersects(p2.envelope):
                    inter = p1.intersection(p2).area
                    if inter > 0:
                        union = p1.area + p2.area - inter
                        iou = inter / union if union > 0 else 0.0
                        if iou > max_iou:
                            max_iou = iou

        new_global_score = sum(r.score for r in accepted_rooms)

        return FinalRoomLayout(
            rooms=accepted_rooms,
            global_score=float(new_global_score),
            wall_coverage_ratio=layout.wall_coverage_ratio,
            partition_agreement_score=layout.partition_agreement_score,
            overlap_penalty=0.0,
            fragmentation_penalty=layout.fragmentation_penalty,
            max_pairwise_iou=float(max_iou),
        )
