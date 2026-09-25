"""
Stage D: Room Hypothesis Grouping (Phase 2.10.6)
Identifies architectural relationships (Parent/Child, Partition, Neighbor, Alternative Boundary)
to distinguish single large rooms from multi-room cavities.
"""
from typing import List, Tuple, Dict, Set, Optional
from shapely.geometry import Polygon as ShapelyPolygon
from shapely.strtree import STRtree

from .models import FusedProposal, ProposalRelationship, HypothesisRelation


def _get_shapely_polygon(coords: List[Tuple[float, float]]) -> Optional[ShapelyPolygon]:
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


def analyze_hypothesis_relationships(
    proposals: List[FusedProposal],
) -> List[ProposalRelationship]:
    """
    Computes pairwise structural relationships between proposals without Ground Truth.
    """
    if len(proposals) < 2:
        return []

    # Map proposals by ID
    prop_map = {p.proposal_id: p for p in proposals}
    sorted_props = sorted(proposals, key=lambda p: p.proposal_id)
    polys = [_get_shapely_polygon(p.polygon) for p in sorted_props]
    valid_pairs = [(p, poly) for p, poly in zip(sorted_props, polys) if poly is not None]

    if len(valid_pairs) < 2:
        return []

    v_props, v_polys = zip(*valid_pairs)
    tree = STRtree(list(v_polys))
    relationships: List[ProposalRelationship] = []

    for i, poly_a in enumerate(v_polys):
        prop_a = v_props[i]
        candidates = tree.query(poly_a)

        for j in candidates:
            if i >= j:
                continue

            poly_b = v_polys[j]
            prop_b = v_props[j]

            if not poly_a.envelope.intersects(poly_b.envelope):
                continue

            try:
                inter = poly_a.intersection(poly_b).area
                if inter <= 0:
                    continue

                union = poly_a.area + poly_b.area - inter
                iou = inter / union if union > 0 else 0.0
                cont_a_in_b = inter / max(1.0, poly_a.area)
                cont_b_in_a = inter / max(1.0, poly_b.area)

                rel_type = HypothesisRelation.UNRELATED_OVERLAP
                wall_agreement = (prop_a.wall_support + prop_b.wall_support) / 2.0

                if iou >= 0.85:
                    rel_type = HypothesisRelation.DUPLICATE
                elif iou >= 0.60:
                    rel_type = HypothesisRelation.ALTERNATIVE_BOUNDARY
                elif cont_a_in_b >= 0.80 and (poly_a.area / max(1.0, poly_b.area)) <= 0.70:
                    # A is child of B
                    rel_type = HypothesisRelation.PARENT_CHILD
                elif cont_b_in_a >= 0.80 and (poly_b.area / max(1.0, poly_a.area)) <= 0.70:
                    # B is child of A
                    rel_type = HypothesisRelation.PARENT_CHILD
                elif cont_a_in_b < 0.25 and cont_b_in_a < 0.25 and iou > 0.0:
                    # Slight overlap on boundary -> Neighbors
                    rel_type = HypothesisRelation.NEIGHBORING_ROOM
                elif 0.25 <= cont_a_in_b < 0.80 and 0.25 <= cont_b_in_a < 0.80:
                    rel_type = HypothesisRelation.PARTITIONED_ROOM

                rel = ProposalRelationship(
                    prop_a_id=prop_a.proposal_id,
                    prop_b_id=prop_b.proposal_id,
                    relation=rel_type,
                    iou=iou,
                    containment_a_in_b=cont_a_in_b,
                    containment_b_in_a=cont_b_in_a,
                    wall_agreement=wall_agreement,
                    evidence={
                        "area_a": prop_a.area_px,
                        "area_b": prop_b.area_px,
                        "area_ratio": round(prop_a.area_px / max(1.0, prop_b.area_px), 4),
                    }
                )
                relationships.append(rel)
            except Exception:
                continue

    return relationships
