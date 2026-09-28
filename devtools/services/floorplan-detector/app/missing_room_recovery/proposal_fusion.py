"""
Proposal Fusion & Multi-Signal Synthesis for Phase 2.10.10.
Deduplicates proposals (IoU >= 0.85) and synthesizes multi-signal proposals
combining doorway, partition, wall, and neighbor evidence into Strategy F.
"""
from typing import List, Dict, Any, Optional, Set, Tuple
import numpy as np
from shapely.geometry import Polygon as ShapelyPolygon
from .models import MissingRoomProposal, RecoveryStrategy


def compute_iou(p1: ShapelyPolygon, p2: ShapelyPolygon) -> float:
    """Computes IoU between two Shapely polygons."""
    if not p1.is_valid:
        p1 = p1.buffer(0)
    if not p2.is_valid:
        p2 = p2.buffer(0)
    if not p1.envelope.intersects(p2.envelope):
        return 0.0
    inter = p1.intersection(p2).area
    if inter <= 0:
        return 0.0
    union = p1.area + p2.area - inter
    return float(inter / union) if union > 0 else 0.0


class ProposalFusionEngine:
    """
    Deduplicates and synthesizes targeted recovery proposals.
    """

    def __init__(
        self,
        deduplication_iou_threshold: float = 0.85,
        max_fused_budget: int = 40,
    ):
        self.deduplication_iou_threshold = deduplication_iou_threshold
        self.max_fused_budget = max_fused_budget

    def fuse_proposals(
        self,
        proposals_by_strategy: Dict[str, List[MissingRoomProposal]],
        image_id: str,
    ) -> Tuple[List[MissingRoomProposal], int]:
        """
        Deduplicates candidate proposals and creates Strategy F combined proposals.
        """
        all_props: List[MissingRoomProposal] = []
        for strat, p_list in proposals_by_strategy.items():
            all_props.extend(p_list)

        if not all_props:
            return [], 0

        # Sort proposals deterministically by composite confidence
        all_props.sort(
            key=lambda p: (
                p.doorway_support * 0.35
                + p.wall_support * 0.30
                + p.partition_support * 0.20
                + p.neighbor_support * 0.15
            ),
            reverse=True,
        )

        fused: List[MissingRoomProposal] = []
        duplicates_count = 0

        for cand in all_props:
            poly = cand.polygon
            is_dup = False
            for existing in fused:
                iou = compute_iou(poly, existing.polygon)
                if iou >= self.deduplication_iou_threshold:
                    is_dup = True
                    # If candidate has distinct evidence, synthesize combined provenance
                    if cand.source_strategy != existing.source_strategy:
                        existing.source_strategy = RecoveryStrategy.COMBINED_RECOVERY.value
                        existing.doorway_support = max(existing.doorway_support, cand.doorway_support)
                        existing.wall_support = max(existing.wall_support, cand.wall_support)
                        existing.partition_support = max(existing.partition_support, cand.partition_support)
                        existing.neighbor_support = max(existing.neighbor_support, cand.neighbor_support)
                        existing.provenance = f"{existing.provenance}+{cand.provenance}"
                        existing.confidence = min(0.95, existing.confidence + 0.10)
                    break

            if is_dup:
                duplicates_count += 1
            else:
                fused.append(cand)
                if len(fused) >= self.max_fused_budget:
                    break

        return fused, duplicates_count
