"""
Stage B: Deduplication (Phase 2.10.6)
Multi-level deduplication using STRtree spatial indexing to eliminate redundant and identical polygons
while maintaining sub-quadratic performance.
"""
from typing import List, Tuple, Dict, Set, Optional
import numpy as np
from shapely.geometry import Polygon as ShapelyPolygon, box
from shapely.strtree import STRtree

from .models import FusedProposal


def _polygon_from_coords(coords: List[Tuple[float, float]]) -> Optional[ShapelyPolygon]:
    if not coords or len(coords) < 3:
        return None
    c_list = list(coords)
    if c_list[0] != c_list[-1]:
        c_list.append(c_list[0])
    try:
        p = ShapelyPolygon(c_list)
        if not p.is_valid:
            p = p.buffer(0)
        return p if not p.is_empty else None
    except Exception:
        return None


def deduplicate_proposals(
    proposals: List[FusedProposal],
    iou_threshold: float = 0.85,
    containment_threshold: float = 0.95,
) -> Tuple[List[FusedProposal], List[FusedProposal]]:
    """
    Deduplicates proposals using STRtree spatial pre-filtering.
    Returns: (kept_proposals, duplicate_proposals)
    """
    if not proposals:
        return [], []

    # Sort deterministically by quality_score descending, area descending, and ID ascending
    sorted_props = sorted(
        proposals,
        key=lambda p: (-p.quality_score, -p.area_px, p.proposal_id)
    )

    shapely_polys: List[ShapelyPolygon] = []
    valid_props: List[FusedProposal] = []

    for prop in sorted_props:
        poly = _polygon_from_coords(prop.polygon)
        if poly is not None and not poly.is_empty:
            shapely_polys.append(poly)
            valid_props.append(prop)
        else:
            prop.is_duplicate = True
            prop.reject_reason = "invalid_geometry_for_dedup"

    if not valid_props:
        return [], proposals

    # Build STRtree
    tree = STRtree(shapely_polys)

    kept: List[FusedProposal] = []
    kept_polys: List[ShapelyPolygon] = []
    duplicates: List[FusedProposal] = []
    kept_tree_indices: Set[int] = set()

    for idx, (prop, poly) in enumerate(zip(valid_props, shapely_polys)):
        # Query STRtree for candidates that intersect the bounding box
        candidate_indices = tree.query(poly)

        is_dup = False
        dup_of_id = None

        # Check only against already accepted candidates in kept_tree_indices
        for c_idx in candidate_indices:
            if c_idx not in kept_tree_indices:
                continue
            
            c_poly = shapely_polys[c_idx]
            c_prop = valid_props[c_idx]

            # Fast bounding box intersection check
            if not poly.envelope.intersects(c_poly.envelope):
                continue

            try:
                inter_area = poly.intersection(c_poly).area
                if inter_area <= 0:
                    continue

                union_area = poly.area + c_poly.area - inter_area
                iou = inter_area / union_area if union_area > 0 else 0.0

                # Check IoU duplicate
                if iou >= iou_threshold:
                    is_dup = True
                    dup_of_id = c_prop.proposal_id
                    break

                # Check high containment with near-identical size (Level 3)
                cont_a = inter_area / max(1.0, poly.area)
                cont_b = inter_area / max(1.0, c_poly.area)
                if (cont_a >= containment_threshold and cont_b >= 0.80) or (cont_b >= containment_threshold and cont_a >= 0.80):
                    is_dup = True
                    dup_of_id = c_prop.proposal_id
                    break

            except Exception:
                continue

        if is_dup:
            prop.is_duplicate = True
            prop.duplicate_of_id = dup_of_id
            duplicates.append(prop)
        else:
            prop.is_duplicate = False
            prop.duplicate_of_id = None
            kept.append(prop)
            kept_tree_indices.add(idx)

    return kept, duplicates
