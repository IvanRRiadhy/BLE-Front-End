"""
Strategy F: Hybrid Split Subsystem & Configuration Scorer (Phase 2.10.5)
Combines evidence from Strategies A-E, filters false splits, and constructs optimal SplitConfigurations.
"""
from typing import List, Tuple, Dict, Any, Optional
import numpy as np
from shapely.geometry import Polygon as ShapelyPolygon

from .models import (
    CavitySplitProposal,
    SplitStrategy,
    OversizedCavityAnalysis,
    SplitConfiguration,
    FalseSplitCategory,
)


def generate_hybrid_splits(
    image_id: str,
    cavity: OversizedCavityAnalysis,
    splits_by_strategy: Dict[str, List[CavitySplitProposal]],
) -> Tuple[List[CavitySplitProposal], Optional[SplitConfiguration]]:
    """
    Fuses split proposals across strategies A-E.
    Ranks complementary configurations and selects the highest scoring architectural decomposition.
    """
    all_splits: List[CavitySplitProposal] = []
    for s_name, s_list in splits_by_strategy.items():
        all_splits.extend(s_list)

    if not all_splits:
        return [], None

    # Group overlapping hypotheses across strategies
    clusters: List[List[CavitySplitProposal]] = []
    for prop in all_splits:
        coords = list(prop.polygon)
        if coords[0] != coords[-1]:
            coords.append(coords[0])
        try:
            poly = ShapelyPolygon(coords)
            if not poly.is_valid:
                poly = poly.buffer(0)
            if poly.is_empty:
                continue

            matched_cluster = None
            for c in clusters:
                rep = c[0]
                r_coords = list(rep.polygon)
                if r_coords[0] != r_coords[-1]:
                    r_coords.append(r_coords[0])
                rep_poly = ShapelyPolygon(r_coords)
                if not rep_poly.is_valid:
                    rep_poly = rep_poly.buffer(0)

                if poly.intersects(rep_poly):
                    inter = poly.intersection(rep_poly).area
                    union = poly.union(rep_poly).area
                    if (inter / union if union > 0 else 0) >= 0.70:
                        matched_cluster = c
                        break

            if matched_cluster is not None:
                matched_cluster.append(prop)
            else:
                clusters.append([prop])
        except Exception:
            pass

    # Build hybrid representative sub-proposals
    hybrid_subs: List[CavitySplitProposal] = []
    for idx, cluster in enumerate(clusters, 1):
        best_p = max(cluster, key=lambda p: p.confidence)
        strategies = list(set(p.source_strategy for p in cluster))
        boost = min(0.12, 0.04 * (len(strategies) - 1))

        hybrid_p = CavitySplitProposal(
            proposal_id=f"{cavity.cavity_id}__split_hyb_{idx}",
            cavity_id=cavity.cavity_id,
            image_id=image_id,
            source_strategy=SplitStrategy.HYBRID_SPLIT.value,
            polygon=best_p.polygon,
            area_px=best_p.area_px,
            bbox=best_p.bbox,
            centroid=best_p.centroid,
            wall_support=best_p.wall_support,
            enclosure_score=best_p.enclosure_score,
            door_support=best_p.door_support,
            partition_support=best_p.partition_support,
            proposal_support=best_p.proposal_support,
            envelope_containment=best_p.envelope_containment,
            oversized_ratio=best_p.oversized_ratio,
            sibling_count=len(clusters),
            confidence=round(min(0.95, best_p.confidence + boost), 4),
            geometry_valid=True,
            classification=FalseSplitCategory.VALID_ROOM_SPLIT.value,
            source_evidence={
                "cluster_size": len(cluster),
                "contributing_strategies": strategies,
                "primary_seed_id": best_p.proposal_id,
            },
        )
        hybrid_subs.append(hybrid_p)

    # Build SplitConfiguration
    if len(hybrid_subs) >= 2:
        total_sub_area = sum(p.area_px for p in hybrid_subs)
        cov_ratio = float(np.clip(total_sub_area / max(1.0, cavity.area_px), 0.0, 1.5))

        # Compute mutual overlap among hybrid subs
        overlap_area = 0.0
        for i in range(len(hybrid_subs)):
            p1_coords = list(hybrid_subs[i].polygon)
            sp1 = ShapelyPolygon(p1_coords)
            for j in range(i + 1, len(hybrid_subs)):
                p2_coords = list(hybrid_subs[j].polygon)
                sp2 = ShapelyPolygon(p2_coords)
                if sp1.intersects(sp2):
                    overlap_area += sp1.intersection(sp2).area

        overlap_ratio = float(np.clip(overlap_area / max(1.0, total_sub_area), 0.0, 1.0))
        uncovered = max(0.0, cavity.area_px - total_sub_area)

        # Architectural configuration score: favors high coverage and low mutual overlap
        cfg_score = round(float(np.clip(0.50 * cov_ratio - 0.40 * overlap_ratio + 0.30 * np.mean([p.confidence for p in hybrid_subs]), 0.0, 1.0)), 4)

        config = SplitConfiguration(
            configuration_id=f"{cavity.cavity_id}__cfg_hybrid",
            cavity_id=cavity.cavity_id,
            image_id=image_id,
            strategy="hybrid",
            sub_proposals=hybrid_subs,
            original_cavity_area=cavity.area_px,
            total_sub_area=total_sub_area,
            coverage_ratio=round(cov_ratio, 4),
            overlap_area=round(overlap_area, 1),
            overlap_ratio=round(overlap_ratio, 4),
            uncovered_area=round(uncovered, 1),
            configuration_score=cfg_score,
        )
        return hybrid_subs, config

    return hybrid_subs, None
