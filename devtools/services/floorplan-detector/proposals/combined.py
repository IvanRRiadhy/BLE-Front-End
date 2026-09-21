"""
Strategy F: Combined Proposal Subsystem (Phase 2.10.4)
Merges evidence from Strategies A-E, filters duplicates, groups equivalent proposals,
and produces a unified, high-quality proposal candidate set while preserving source provenance.
"""
from typing import List, Tuple, Dict, Any, Optional
from shapely.geometry import Polygon as ShapelyPolygon

from .models import RoomProposal, ProposalStrategy


def generate_combined_proposals(
    image_id: str,
    proposals_by_strategy: Dict[str, List[RoomProposal]],
    iou_dedup_thresh: float = 0.75,
) -> List[RoomProposal]:
    """
    Combines proposals from strategies A-E.
    Groups proposals representing the same room, preserves distinct geometric hypotheses,
    and assigns combined confidence and multi-strategy provenance.
    """
    all_props: List[RoomProposal] = []
    for strat_name, p_list in proposals_by_strategy.items():
        all_props.extend(p_list)

    # Sort descending by confidence
    sorted_props = sorted(all_props, key=lambda p: p.confidence, reverse=True)

    combined_props: List[RoomProposal] = []
    shapely_clusters: List[Tuple[ShapelyPolygon, RoomProposal, List[RoomProposal]]] = []

    for prop in sorted_props:
        coords = list(prop.polygon)
        if coords[0] != coords[-1]:
            coords.append(coords[0])
        try:
            poly = ShapelyPolygon(coords)
            if not poly.is_valid:
                poly = poly.buffer(0)
            if poly.is_empty:
                continue

            # Check overlap with existing clusters
            matched_cluster = None
            for idx, (rep_poly, rep_prop, members) in enumerate(shapely_clusters):
                if poly.intersects(rep_poly):
                    inter = poly.intersection(rep_poly).area
                    union = poly.union(rep_poly).area
                    iou = inter / union if union > 0 else 0.0
                    if iou >= iou_dedup_thresh:
                        matched_cluster = idx
                        break

            if matched_cluster is not None:
                # Add to existing cluster
                rep_poly, rep_prop, members = shapely_clusters[matched_cluster]
                members.append(prop)
            else:
                # New cluster
                shapely_clusters.append((poly, prop, [prop]))
        except Exception:
            pass

    # Create combined representative proposals
    for c_idx, (rep_poly, best_prop, members) in enumerate(shapely_clusters, 1):
        contributing_strats = list(set(m.source_strategy for m in members))
        multi_strat_boost = min(0.15, 0.05 * (len(contributing_strats) - 1))
        fused_conf = min(0.95, round(best_prop.confidence + multi_strat_boost, 4))

        combined_p = RoomProposal(
            proposal_id=f"{image_id}__prop_comb_{c_idx}",
            image_id=image_id,
            source_strategy=ProposalStrategy.COMBINED.value,
            polygon=best_prop.polygon,
            area_px=best_prop.area_px,
            bbox=best_prop.bbox,
            centroid=best_prop.centroid,
            wall_support=best_prop.wall_support,
            enclosure_score=best_prop.enclosure_score,
            door_support=best_prop.door_support,
            partition_support=best_prop.partition_support,
            repetition_support=best_prop.repetition_support,
            envelope_containment=best_prop.envelope_containment,
            confidence=fused_conf,
            geometry_valid=True,
            source_evidence={
                "cluster_size": len(members),
                "contributing_strategies": contributing_strats,
                "primary_seed_strategy": best_prop.source_strategy,
                "primary_seed_id": best_prop.proposal_id,
            },
        )
        combined_props.append(combined_p)

    return combined_props
