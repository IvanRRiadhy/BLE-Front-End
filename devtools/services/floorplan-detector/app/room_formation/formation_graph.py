"""
Formation Graph construction (Phase 2.10.7).
Constructs nodes (RoomHypothesis) and relational edges (PARENT_OF, CHILD_OF, PARTITION_OF,
ALTERNATIVE_TO, NEIGHBOR_OF, OVERLAPS) using STRtree spatial indexing.
"""
from typing import List, Tuple, Dict, Set, Optional, Any, Union
import numpy as np
from shapely.geometry import Polygon as ShapelyPolygon, box
from shapely.strtree import STRtree

from .models import RoomHypothesis, HypothesisEdge, GraphEdgeType, RoomFormationGraph
from app.proposal_fusion.models import FusedProposal


def _get_shapely_polygon(poly: Any) -> Optional[ShapelyPolygon]:
    if poly is None:
        return None
    if isinstance(poly, ShapelyPolygon):
        if not poly.is_valid:
            poly = poly.buffer(0)
        return poly if not poly.is_empty else None
    if isinstance(poly, list):
        if len(poly) < 3:
            return None
        c_list = list(poly)
        if c_list[0] != c_list[-1]:
            c_list.append(c_list[0])
        try:
            p = ShapelyPolygon(c_list)
            if not p.is_valid:
                p = p.buffer(0)
            return p if not p.is_empty else None
        except Exception:
            return None
    return None


def convert_proposals_to_hypotheses(
    proposals: List[Any],
) -> List[RoomHypothesis]:
    """
    Converts fused proposals or proposal dicts into initial RoomHypothesis nodes.
    """
    hypotheses: List[RoomHypothesis] = []
    for idx, p in enumerate(proposals, 1):
        if isinstance(p, dict):
            pid = p.get("id", p.get("proposal_id", f"prop_{idx:04d}"))
            image_id = p.get("image_id", "image_01")
            poly = p.get("polygon")
            score = p.get("score", 0.7)
            strat = p.get("source_strategy", "unknown")
            h = RoomHypothesis(
                id=pid,
                hypothesis_id=pid,
                source_proposal_id=pid,
                image_id=image_id,
                polygon=poly,
                score=score,
                formation_score=score,
                source_strategy=strat,
            )
            hypotheses.append(h)
        else:
            # FusedProposal or similar object
            pw, ph = getattr(p, "bbox", (0, 0, 100, 100))[2], getattr(p, "bbox", (0, 0, 100, 100))[3]
            aspect_ratio = max(pw, ph) / max(1.0, min(pw, ph))
            compactness = getattr(p, "compactness", 0.5)
            is_corridor_candidate = (aspect_ratio >= 3.5 and compactness < 0.25)
            area_px = getattr(p, "area_px", 1000.0)
            is_large_space = (area_px >= 25000.0)

            h = RoomHypothesis(
                id=getattr(p, "proposal_id", f"prop_{idx:04d}"),
                hypothesis_id=getattr(p, "proposal_id", f"prop_{idx:04d}"),
                source_proposal_id=getattr(p, "proposal_id", f"prop_{idx:04d}"),
                image_id=getattr(p, "image_id", "image_01"),
                polygon=getattr(p, "polygon", None),
                area_px=area_px,
                bbox=getattr(p, "bbox", (0, 0, 0, 0)),
                centroid=getattr(p, "centroid", (0, 0)),
                wall_support=getattr(p, "wall_support", 0.0),
                enclosure_score=getattr(p, "enclosure_score", 0.0),
                door_support=getattr(p, "door_support", 0.0),
                partition_support=getattr(p, "partition_support", 0.0),
                repetition_support=getattr(p, "repetition_support", 0.0),
                topology_score=getattr(p, "topology_agreement", 0.0),
                boundary_quality=getattr(p, "boundary_quality", 0.0),
                compactness=compactness,
                corridor_likelihood=0.75 if is_corridor_candidate else 0.10,
                large_space_likelihood=0.80 if is_large_space else 0.10,
                exterior_penalty=getattr(p, "exterior_likelihood", 0.0),
                sliver_penalty=getattr(p, "sliver_likelihood", 0.0),
                source_phase=getattr(p, "source_phase", "2.10.6"),
                source_strategy=getattr(p, "source_strategy", "unknown"),
                parent_proposal_id=getattr(p, "parent_proposal_id", None),
                score=getattr(p, "score", 0.7),
            )
            hypotheses.append(h)

    return hypotheses


def build_formation_graph(
    hypotheses: List[RoomHypothesis],
) -> Tuple[List[RoomHypothesis], List[HypothesisEdge]]:
    """
    Builds the complete Room Formation Graph using spatial indexing.
    Connects nodes with directed edges and populates adjacency lists.
    """
    if len(hypotheses) < 2:
        return hypotheses, []

    # Sort deterministically
    sorted_hyps = sorted(hypotheses, key=lambda h: (-h.area_px, h.id))
    polys = [_get_shapely_polygon(h.polygon) for h in sorted_hyps]
    valid_pairs = [(h, poly) for h, poly in zip(sorted_hyps, polys) if poly is not None]

    if len(valid_pairs) < 2:
        return hypotheses, []

    v_hyps, v_polys = zip(*valid_pairs)
    hyp_map = {h.id: h for h in v_hyps}
    tree = STRtree(list(v_polys))
    edges: List[HypothesisEdge] = []

    for i, poly_a in enumerate(v_polys):
        hyp_a = v_hyps[i]
        candidate_indices = tree.query(poly_a)

        for j in candidate_indices:
            if i >= j:
                continue

            poly_b = v_polys[j]
            hyp_b = v_hyps[j]

            if not poly_a.envelope.intersects(poly_b.envelope):
                continue

            try:
                wall_agr = (hyp_a.wall_support + hyp_b.wall_support) / 2.0
                top_agr = (hyp_a.topology_score + hyp_b.topology_score) / 2.0

                inter = poly_a.intersection(poly_b).area
                if inter <= 0:
                    if poly_a.distance(poly_b) <= 2.0:
                        edge = HypothesisEdge(
                            edge_type=GraphEdgeType.NEIGHBOR_OF,
                            source_id=hyp_a.id,
                            target_id=hyp_b.id,
                            iou=0.0,
                            containment_source_in_target=0.0,
                            containment_target_in_source=0.0,
                            wall_agreement=wall_agr,
                            topology_agreement=top_agr,
                        )
                        edges.append(edge)
                        if hyp_b.id not in hyp_a.neighbor_ids:
                            hyp_a.neighbor_ids.append(hyp_b.id)
                        if hyp_a.id not in hyp_b.neighbor_ids:
                            hyp_b.neighbor_ids.append(hyp_a.id)
                    continue

                union = poly_a.area + poly_b.area - inter
                iou = inter / union if union > 0 else 0.0
                cont_a_in_b = inter / max(1.0, poly_a.area)
                cont_b_in_a = inter / max(1.0, poly_b.area)

                # 1. Alternative boundaries (same room with slight variation)
                if iou >= 0.70:
                    edge = HypothesisEdge(
                        edge_type=GraphEdgeType.ALTERNATIVE_TO,
                        source_id=hyp_a.id,
                        target_id=hyp_b.id,
                        iou=iou,
                        containment_source_in_target=cont_a_in_b,
                        containment_target_in_source=cont_b_in_a,
                        wall_agreement=wall_agr,
                        topology_agreement=top_agr,
                    )
                    edges.append(edge)
                    if hyp_b.id not in hyp_a.alternative_ids:
                        hyp_a.alternative_ids.append(hyp_b.id)
                    if hyp_a.id not in hyp_b.alternative_ids:
                        hyp_b.alternative_ids.append(hyp_a.id)

                # 2. Parent-Child relationship
                elif cont_b_in_a >= 0.70 and (poly_b.area / max(1.0, poly_a.area)) <= 0.85:
                    edge1 = HypothesisEdge(
                        edge_type=GraphEdgeType.PARENT_OF,
                        source_id=hyp_a.id,
                        target_id=hyp_b.id,
                        iou=iou,
                        containment_source_in_target=cont_a_in_b,
                        containment_target_in_source=cont_b_in_a,
                        wall_agreement=wall_agr,
                        topology_agreement=top_agr,
                    )
                    edge2 = HypothesisEdge(
                        edge_type=GraphEdgeType.CHILD_OF,
                        source_id=hyp_b.id,
                        target_id=hyp_a.id,
                        iou=iou,
                        containment_source_in_target=cont_b_in_a,
                        containment_target_in_source=cont_a_in_b,
                        wall_agreement=wall_agr,
                        topology_agreement=top_agr,
                    )
                    edges.extend([edge1, edge2])
                    if hyp_b.id not in hyp_a.child_ids:
                        hyp_a.child_ids.append(hyp_b.id)
                    if hyp_a.id not in hyp_b.parent_ids:
                        hyp_b.parent_ids.append(hyp_a.id)

                # 3. Partition relationship
                elif 0.15 <= iou < 0.70 and (0.20 <= cont_a_in_b < 0.75 or 0.20 <= cont_b_in_a < 0.75):
                    edge = HypothesisEdge(
                        edge_type=GraphEdgeType.PARTITION_OF,
                        source_id=hyp_a.id,
                        target_id=hyp_b.id,
                        iou=iou,
                        containment_source_in_target=cont_a_in_b,
                        containment_target_in_source=cont_b_in_a,
                        wall_agreement=wall_agr,
                        topology_agreement=top_agr,
                    )
                    edges.append(edge)
                    if hyp_b.id not in hyp_a.partition_ids:
                        hyp_a.partition_ids.append(hyp_b.id)
                    if hyp_a.id not in hyp_b.partition_ids:
                        hyp_b.partition_ids.append(hyp_a.id)

                # 4. Neighbors (touching boundary with tiny overlap)
                elif iou < 0.15 and (cont_a_in_b < 0.15 and cont_b_in_a < 0.15):
                    edge = HypothesisEdge(
                        edge_type=GraphEdgeType.NEIGHBOR_OF,
                        source_id=hyp_a.id,
                        target_id=hyp_b.id,
                        iou=iou,
                        containment_source_in_target=cont_a_in_b,
                        containment_target_in_source=cont_b_in_a,
                        wall_agreement=wall_agr,
                        topology_agreement=top_agr,
                    )
                    edges.append(edge)
                    if hyp_b.id not in hyp_a.neighbor_ids:
                        hyp_a.neighbor_ids.append(hyp_b.id)
                    if hyp_a.id not in hyp_b.neighbor_ids:
                        hyp_b.neighbor_ids.append(hyp_a.id)

                else:
                    edge = HypothesisEdge(
                        edge_type=GraphEdgeType.OVERLAPS,
                        source_id=hyp_a.id,
                        target_id=hyp_b.id,
                        iou=iou,
                        containment_source_in_target=cont_a_in_b,
                        containment_target_in_source=cont_b_in_a,
                    )
                    edges.append(edge)

            except Exception:
                continue

    return sorted_hyps, edges


class FormationGraphBuilder:
    """
    Object-oriented builder for RoomFormationGraph.
    """

    def build_graph(self, proposals: List[Any], image_id: str = "image_01") -> RoomFormationGraph:
        if not proposals:
            return RoomFormationGraph(image_id=image_id, hypotheses={}, edges=[])

        # Check if already RoomHypothesis objects
        if proposals and isinstance(proposals[0], RoomHypothesis):
            hyps = proposals
        else:
            hyps = convert_proposals_to_hypotheses(proposals)

        sorted_hyps, edges = build_formation_graph(hyps)
        graph = RoomFormationGraph(
            image_id=image_id,
            hypotheses={h.id: h for h in sorted_hyps},
            edges=edges,
        )
        return graph
