"""
Stage C: Overlap Clustering (Phase 2.10.6)
Groups spatially overlapping proposals into competitive arenas while preserving multi-scale alternatives.
"""
from typing import List, Tuple, Dict, Set, Optional
import numpy as np
from shapely.geometry import Polygon as ShapelyPolygon
from shapely.strtree import STRtree

from .models import FusedProposal, ProposalCluster


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


def cluster_overlapping_proposals(
    proposals: List[FusedProposal],
    overlap_threshold: float = 0.40,
) -> Tuple[List[ProposalCluster], Dict[str, str]]:
    """
    Clusters proposals based on mutual overlap graph connected components.
    Returns: (clusters, proposal_to_cluster_map)
    """
    if not proposals:
        return [], {}

    # Sort deterministically
    sorted_props = sorted(
        proposals,
        key=lambda p: (-p.quality_score, -p.area_px, p.proposal_id)
    )
    polys = [_get_shapely_polygon(p.polygon) for p in sorted_props]
    valid_pairs = [(p, poly) for p, poly in zip(sorted_props, polys) if poly is not None]

    if not valid_pairs:
        return [], {}

    n = len(valid_pairs)
    v_props, v_polys = zip(*valid_pairs)

    # Build STRtree
    tree = STRtree(list(v_polys))

    # Graph adjacency list
    adj: Dict[int, Set[int]] = {i: set() for i in range(n)}

    for i, poly in enumerate(v_polys):
        candidates = tree.query(poly)
        for j in candidates:
            if i >= j:
                continue
            c_poly = v_polys[j]
            if not poly.envelope.intersects(c_poly.envelope):
                continue
            try:
                inter = poly.intersection(c_poly).area
                if inter <= 0:
                    continue
                union = poly.area + c_poly.area - inter
                iou = inter / union if union > 0 else 0.0

                # Either substantial IoU or one mostly contained in the other
                cont_i = inter / max(1.0, poly.area)
                cont_j = inter / max(1.0, c_poly.area)

                if iou >= overlap_threshold or cont_i >= 0.65 or cont_j >= 0.65:
                    adj[i].add(j)
                    adj[j].add(i)
            except Exception:
                continue

    # Find connected components
    visited: Set[int] = set()
    clusters: List[ProposalCluster] = []
    prop_to_cluster: Dict[str, str] = {}

    cluster_counter = 1
    image_id = v_props[0].image_id

    for i in range(n):
        if i in visited:
            continue

        component: List[int] = []
        queue = [i]
        visited.add(i)

        while queue:
            curr = queue.pop(0)
            component.append(curr)
            for neighbor in adj[curr]:
                if neighbor not in visited:
                    visited.add(neighbor)
                    queue.append(neighbor)

        # Sort component indices deterministically
        c_props = [v_props[idx] for idx in component]
        c_props.sort(key=lambda p: (-p.quality_score, -p.area_px, p.proposal_id))
        
        rep_prop = c_props[0]
        cid = f"cluster_{image_id[:12]}_{cluster_counter:04d}"
        cluster_counter += 1

        p_ids = [p.proposal_id for p in c_props]
        for p in c_props:
            p.cluster_id = cid
            prop_to_cluster[p.proposal_id] = cid

        areas = [p.area_px for p in c_props]
        min_area = float(min(areas))
        max_area = float(max(areas))

        # Combined bounding box
        minx = min(p.bbox[0] for p in c_props)
        miny = min(p.bbox[1] for p in c_props)
        maxx = max(p.bbox[0] + p.bbox[2] for p in c_props)
        maxy = max(p.bbox[1] + p.bbox[3] for p in c_props)
        c_bbox = (float(minx), float(miny), float(maxx - minx), float(maxy - miny))

        # Centroid of representative
        c_centroid = rep_prop.centroid

        strats = sorted(list(set(p.source_strategy for p in c_props)))

        cluster = ProposalCluster(
            cluster_id=cid,
            image_id=image_id,
            proposal_ids=p_ids,
            representative_proposal_id=rep_prop.proposal_id,
            area_range=(min_area, max_area),
            bbox=c_bbox,
            centroid=c_centroid,
            source_strategies=strats,
            candidate_count=len(c_props),
            best_quality_score=rep_prop.quality_score,
        )
        clusters.append(cluster)

    return clusters, prop_to_cluster
