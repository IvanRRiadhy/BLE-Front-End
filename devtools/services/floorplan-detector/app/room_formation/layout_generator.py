"""
Room Layout Generator (Phase 2.10.7).
Generates competing global room layouts by decomposing the formation graph into independent
spatial arenas, generating valid local combinations, and assembling candidate global layouts.
"""
from typing import List, Tuple, Dict, Set, Optional, Any
import copy
from shapely.geometry import Polygon as ShapelyPolygon, box
from shapely.strtree import STRtree

from .models import RoomHypothesis, HypothesisEdge, GraphEdgeType, RoomFormationGraph, RoomHypothesisState
from .relationship_resolver import resolve_parent_child_decisions


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


def generate_candidate_layouts(
    hypotheses: List[RoomHypothesis],
    edges: List[HypothesisEdge],
    max_layouts: int = 5,
    max_arena_hypotheses: int = 25,
) -> List[List[RoomHypothesis]]:
    """
    Generates competing sets of non-conflicting RoomHypotheses (layouts).
    """
    if not hypotheses:
        return []

    hyp_map = {h.id: h for h in hypotheses}

    # Step 1: Parent/Child resolutions
    pc_decisions = resolve_parent_child_decisions(hypotheses, edges)

    # Step 2: Build spatial arenas (connected components of overlapping/conflicting candidates)
    sorted_hyps = sorted(hypotheses, key=lambda h: (-h.score, -h.area_px, h.id))
    polys = [_get_shapely_polygon(h.polygon) for h in sorted_hyps]
    valid_pairs = [(h, p) for h, p in zip(sorted_hyps, polys) if p is not None]

    if not valid_pairs:
        return []

    v_hyps, v_polys = zip(*valid_pairs)
    tree = STRtree(list(v_polys))
    n = len(v_hyps)

    adj: Dict[int, Set[int]] = {i: set() for i in range(n)}
    for i, poly_a in enumerate(v_polys):
        candidates = tree.query(poly_a)
        for j in candidates:
            if i >= j:
                continue
            poly_b = v_polys[j]
            if not poly_a.envelope.intersects(poly_b.envelope):
                continue
            try:
                inter = poly_a.intersection(poly_b).area
                if inter > 0:
                    union = poly_a.area + poly_b.area - inter
                    iou = inter / union if union > 0 else 0.0
                    cont_a = inter / max(1.0, poly_a.area)
                    cont_b = inter / max(1.0, poly_b.area)
                    # Significant overlap or containment constitutes a conflict edge
                    if iou >= 0.15 or cont_a >= 0.40 or cont_b >= 0.40:
                        adj[i].add(j)
                        adj[j].add(i)
            except Exception:
                continue

    # Connected components -> Spatial Arenas
    visited: Set[int] = set()
    arenas: List[List[RoomHypothesis]] = []

    for i in range(n):
        if i in visited:
            continue
        comp: List[int] = []
        queue = [i]
        visited.add(i)
        while queue:
            curr = queue.pop(0)
            comp.append(curr)
            for neighbor in adj[curr]:
                if neighbor not in visited:
                    visited.add(neighbor)
                    queue.append(neighbor)
        arena_hyps = [v_hyps[idx] for idx in comp]
        arena_hyps.sort(key=lambda h: (-h.score, -h.area_px, h.id))
        arenas.append(arena_hyps[:max_arena_hypotheses])

    # Step 3: For each arena, generate local alternative configurations:
    arena_options: List[List[List[RoomHypothesis]]] = []

    for arena in arenas:
        options: List[List[RoomHypothesis]] = []

        # Option A: Parent-child resolution choice
        parents = [h for h in arena if h.child_ids]
        if parents:
            best_parent = max(parents, key=lambda h: h.score)
            dec = pc_decisions.get(best_parent.id, "PREFER_PARENT")
            if dec == "PREFER_CHILDREN":
                children = [hyp_map[cid] for cid in best_parent.child_ids if cid in hyp_map]
                if children:
                    options.append(children)
            else:
                options.append([best_parent])

        # Option B: Greedy non-overlapping pack of highest-scoring candidates in this arena
        greedy_pack: List[RoomHypothesis] = []
        greedy_polys: List[ShapelyPolygon] = []
        for h in arena:
            if h.state == RoomHypothesisState.REJECTED:
                continue
            hp = _get_shapely_polygon(h.polygon)
            if hp is None:
                continue
            conflicts = False
            for gp in greedy_polys:
                if hp.intersects(gp):
                    inter = hp.intersection(gp).area
                    union = hp.area + gp.area - inter
                    iou = inter / union if union > 0 else 0.0
                    cont_h = inter / max(1.0, hp.area)
                    if iou >= 0.10 or cont_h >= 0.25:
                        conflicts = True
                        break
            if not conflicts:
                greedy_pack.append(h)
                greedy_polys.append(hp)
        if greedy_pack and greedy_pack not in options:
            options.append(greedy_pack)

        # Option C: Single best representative
        if [arena[0]] not in options and arena[0].state != RoomHypothesisState.REJECTED:
            options.append([arena[0]])

        arena_options.append(options if options else [[arena[0]]])

    # Step 4: Assemble candidate global layouts
    candidate_layouts: List[List[RoomHypothesis]] = []

    # Primary layout
    layout_1: List[RoomHypothesis] = []
    for opts in arena_options:
        if opts:
            layout_1.extend(opts[0])
    candidate_layouts.append(layout_1)

    # Alternative layout (flip choices in multi-option arenas)
    if any(len(opts) > 1 for opts in arena_options):
        layout_2: List[RoomHypothesis] = []
        for opts in arena_options:
            if len(opts) > 1:
                layout_2.extend(opts[1])
            elif opts:
                layout_2.extend(opts[0])
        candidate_layouts.append(layout_2)

    # Greedy maximal layout
    layout_3: List[RoomHypothesis] = []
    for opts in arena_options:
        best_opts = max(opts, key=lambda o: len(o)) if opts else []
        layout_3.extend(best_opts)
    if layout_3 not in candidate_layouts:
        candidate_layouts.append(layout_3)

    return candidate_layouts[:max_layouts]


class LayoutGenerator:
    """
    Object-oriented layout generator operating on RoomFormationGraph.
    """

    def cluster_arenas(self, graph: RoomFormationGraph) -> List[List[RoomHypothesis]]:
        hypotheses = list(graph.hypotheses.values())
        if not hypotheses:
            return []

        sorted_hyps = sorted(hypotheses, key=lambda h: (-h.score, -h.area_px, h.id))
        polys = [_get_shapely_polygon(h.polygon) for h in sorted_hyps]
        valid_pairs = [(h, p) for h, p in zip(sorted_hyps, polys) if p is not None]

        if not valid_pairs:
            return []

        v_hyps, v_polys = zip(*valid_pairs)
        tree = STRtree(list(v_polys))
        n = len(v_hyps)

        adj: Dict[int, Set[int]] = {i: set() for i in range(n)}
        for i, poly_a in enumerate(v_polys):
            candidates = tree.query(poly_a)
            for j in candidates:
                if i >= j:
                    continue
                poly_b = v_polys[j]
                if not poly_a.envelope.intersects(poly_b.envelope):
                    continue
                try:
                    inter = poly_a.intersection(poly_b).area
                    if inter > 0:
                        union = poly_a.area + poly_b.area - inter
                        iou = inter / union if union > 0 else 0.0
                        cont_a = inter / max(1.0, poly_a.area)
                        cont_b = inter / max(1.0, poly_b.area)
                        if iou >= 0.15 or cont_a >= 0.40 or cont_b >= 0.40:
                            adj[i].add(j)
                            adj[j].add(i)
                except Exception:
                    continue

        visited: Set[int] = set()
        arenas: List[List[RoomHypothesis]] = []
        for i in range(n):
            if i in visited:
                continue
            comp: List[int] = []
            queue = [i]
            visited.add(i)
            while queue:
                curr = queue.pop(0)
                comp.append(curr)
                for neighbor in adj[curr]:
                    if neighbor not in visited:
                        visited.add(neighbor)
                        queue.append(neighbor)
            arena_hyps = [v_hyps[idx] for idx in comp]
            arena_hyps.sort(key=lambda h: (-h.score, -h.area_px, h.id))
            arenas.append(arena_hyps)

        return arenas

    def generate_layouts(
        self,
        graph: RoomFormationGraph,
        max_layouts: int = 5,
        max_arena_hypotheses: int = 25,
    ) -> List[List[RoomHypothesis]]:
        return generate_candidate_layouts(
            hypotheses=list(graph.hypotheses.values()),
            edges=graph.edges,
            max_layouts=max_layouts,
            max_arena_hypotheses=max_arena_hypotheses,
        )
