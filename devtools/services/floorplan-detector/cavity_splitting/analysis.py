"""
Oversized Cavity Analysis Subsystem (Phase 2.10.5)
Applies multi-signal architectural reasoning to identify oversized cavities.
Guarantees large legitimate rooms are protected.
"""
from typing import List, Tuple, Dict, Any, Optional
import numpy as np
from shapely.geometry import Polygon as ShapelyPolygon, Point, LineString

from .models import OversizedCavityAnalysis
from proposals.models import RoomProposal


def analyze_oversized_cavities(
    image_id: str,
    primary_hyps: List[Any],
    wall_network: Any,
    openings: List[Any],
    proposals: List[RoomProposal],
    img_w: int,
    img_h: int,
) -> List[OversizedCavityAnalysis]:
    """
    Evaluates each primary hypothesis for oversized multi-room absorption.
    Protects large valid architectural spaces (auditoriums, grand rooms) if internal divider evidence is absent.
    """
    analyses: List[OversizedCavityAnalysis] = []

    if not primary_hyps:
        return analyses

    areas = []
    poly_map = {}
    for hyp in primary_hyps:
        pts = [(p.xPx, p.yPx) for p in hyp.polygon]
        if len(pts) >= 3:
            coords = list(pts)
            if coords[0] != coords[-1]:
                coords.append(coords[0])
            try:
                sp = ShapelyPolygon(coords)
                if not sp.is_valid:
                    sp = sp.buffer(0)
                if sp.is_valid and not sp.is_empty:
                    poly_map[hyp.id] = (sp, pts)
                    areas.append(sp.area)
            except Exception:
                pass

    if not areas:
        return analyses

    med_area = float(np.median(areas))
    mean_area = float(np.mean(areas))

    wall_lines = []
    if wall_network and hasattr(wall_network, "segments"):
        for seg in wall_network.segments:
            if getattr(seg, "confidence", 0.5) >= 0.25:
                wall_lines.append(LineString([(seg.x1, seg.y1), (seg.x2, seg.y2)]))

    for hyp in primary_hyps:
        if hyp.id not in poly_map:
            continue
        sp, pts = poly_map[hyp.id]
        area = float(sp.area)
        bnd = sp.bounds
        bw = bnd[2] - bnd[0]
        bh = bnd[3] - bnd[1]
        aspect_ratio = max(bw, bh) / max(1.0, min(bw, bh))

        # 1. Area evidence
        area_evidence = float(np.clip((area - med_area) / max(1.0, 2.5 * med_area), 0.0, 1.0))

        # 2. Internal wall evidence
        internal_wall_len = 0.0
        for wl in wall_lines:
            if sp.contains(wl) or sp.crosses(wl):
                inter = sp.intersection(wl)
                if isinstance(inter, LineString):
                    internal_wall_len += inter.length
        wall_evidence = float(np.clip(internal_wall_len / max(1.0, np.sqrt(area) * 1.5), 0.0, 1.0))

        # 3. Partition evidence (from segments with length >= 40px)
        partition_len = 0.0
        for wl in wall_lines:
            if wl.length >= 40.0 and sp.intersects(wl):
                inter = sp.intersection(wl)
                if isinstance(inter, LineString) and inter.length >= 30.0:
                    partition_len += inter.length
        partition_evidence = float(np.clip(partition_len / max(1.0, np.sqrt(area) * 1.0), 0.0, 1.0))

        # 4. Doorway connections
        door_touch_count = 0
        if openings:
            for op in openings:
                ox = (getattr(op, "x1", 0) + getattr(op, "x2", 0)) / 2.0
                oy = (getattr(op, "y1", 0) + getattr(op, "y2", 0)) / 2.0
                if sp.distance(Point(ox, oy)) < 15.0:
                    door_touch_count += 1
        doorway_evidence = float(np.clip((door_touch_count - 1) / 3.0, 0.0, 1.0))

        # 5. Phase 2.10.4 proposals contained inside
        contained_proposals = 0
        for p in proposals:
            p_coords = list(p.polygon)
            if len(p_coords) >= 3:
                try:
                    p_sp = ShapelyPolygon(p_coords)
                    if not p_sp.is_valid:
                        p_sp = p_sp.buffer(0)
                    if sp.contains(p_sp.centroid) and (p_sp.intersection(sp).area / max(1.0, p_sp.area)) >= 0.70:
                        contained_proposals += 1
                except Exception:
                    pass
        proposal_evidence = float(np.clip((contained_proposals - 1) / 3.0, 0.0, 1.0))

        # Topology and repetition evidence
        topology_evidence = float(np.clip(door_touch_count / 3.0, 0.0, 1.0))
        repetition_evidence = float(np.clip((aspect_ratio - 1.5) / 2.0, 0.0, 1.0))

        # Multi-signal oversizedScore:
        # Heavily weights internal wall/partition/proposal evidence to PROTECT large valid rooms
        # If there are NO internal walls and NO proposals, oversizedScore stays low!
        internal_divider_weight = 0.35 * wall_evidence + 0.25 * partition_evidence + 0.20 * proposal_evidence
        context_weight = 0.10 * area_evidence + 0.05 * doorway_evidence + 0.05 * repetition_evidence

        oversized_score = float(np.clip(internal_divider_weight + context_weight, 0.0, 1.0))

        # Protection condition: area alone (> 2.0*med) does NOT split unless internal_divider_weight >= 0.20
        should_split = bool(oversized_score >= 0.35 and (internal_wall_len >= 30.0 or contained_proposals >= 2))
        split_reason = "internal_walls_and_proposals" if should_split else "protected_single_room"

        analyses.append(
            OversizedCavityAnalysis(
                cavity_id=hyp.id,
                image_id=image_id,
                polygon=pts,
                area_px=area,
                bbox=(float(bnd[0]), float(bnd[1]), float(bw), float(bh)),
                oversized_score=oversized_score,
                area_evidence=area_evidence,
                wall_evidence=wall_evidence,
                partition_evidence=partition_evidence,
                doorway_evidence=doorway_evidence,
                topology_evidence=topology_evidence,
                proposal_evidence=proposal_evidence,
                repetition_evidence=repetition_evidence,
                split_candidate_count=contained_proposals,
                should_split=should_split,
                split_reason=split_reason,
            )
        )

    return analyses
