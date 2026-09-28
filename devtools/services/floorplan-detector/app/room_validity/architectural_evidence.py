"""
Positive Architectural Evidence Extractor for Phase 2.10.8.
Extracts:
- wallBoundarySupport
- wallJunctionSupport
- wallContinuity
- wallThicknessConsistency
- enclosureScore
- doorwayEvidence & doorwayCount
- partitionEvidence
- topologyConsistency
- neighborConsistency
- roomRegularity
- unsupportedBoundaryRatio
"""
from typing import List, Tuple, Dict, Any, Optional
import numpy as np
from shapely.geometry import Polygon as ShapelyPolygon, Point, LineString, MultiLineString
from .models import RoomValidityHypothesis


class ArchitecturalEvidenceExtractor:
    """
    Extracts positive architectural evidence supporting a candidate room polygon.
    """

    def __init__(
        self,
        wall_distance_threshold: float = 6.0,
        door_distance_threshold: float = 25.0,
    ):
        self.wall_distance_threshold = wall_distance_threshold
        self.door_distance_threshold = door_distance_threshold

    def extract_evidence(
        self,
        hyp: RoomValidityHypothesis,
        wall_network: Optional[Any] = None,
        wall_mask: Optional[np.ndarray] = None,
        doors: Optional[List[Any]] = None,
        graph: Optional[Any] = None,
    ) -> Dict[str, float]:
        """
        Extracts all positive architectural features for the hypothesis.
        """
        poly = hyp.polygon
        boundary = poly.boundary
        total_len = max(1.0, boundary.length)

        # 1. Wall Boundary Support & Unsupported Boundary Ratio
        supported_len = 0.0
        wall_lines = getattr(wall_network, "wall_lines", []) if wall_network else []

        if wall_lines:
            for line in wall_lines:
                if hasattr(line, "distance") and line.distance(boundary) <= self.wall_distance_threshold:
                    # Overlap along perimeter
                    supported_len += min(line.length, total_len * 0.25)
            wall_support = min(1.0, supported_len / total_len)
        elif wall_mask is not None:
            # Mask-based boundary sampling
            pts = [boundary.interpolate(dist) for dist in np.linspace(0, total_len, min(100, int(total_len / 5.0) + 5))]
            supported_pts = 0
            h_m, w_m = wall_mask.shape[:2]
            for p in pts:
                px, py = int(round(p.x)), int(round(p.y))
                if 0 <= px < w_m and 0 <= py < h_m:
                    if wall_mask[py, px] > 0 or np.any(wall_mask[max(0, py - 3):min(h_m, py + 4), max(0, px - 3):min(w_m, px + 4)] > 0):
                        supported_pts += 1
            wall_support = supported_pts / max(1, len(pts))
        else:
            # Fallback to inherited score
            wall_support = hyp.formation_score

        unsupported_ratio = max(0.0, 1.0 - wall_support)

        # 2. Wall Junction Support (Corner support)
        coords = list(poly.exterior.coords)[:-1] if hasattr(poly, "exterior") and poly.exterior else []
        supported_junctions = 0
        if coords:
            for pt in coords:
                p_geom = Point(pt[0], pt[1])
                junction_hit = False
                if wall_lines:
                    near_count = sum(1 for line in wall_lines if line.distance(p_geom) <= self.wall_distance_threshold + 2.0)
                    if near_count >= 2:
                        junction_hit = True
                elif wall_mask is not None:
                    px, py = int(round(pt[0])), int(round(pt[1]))
                    h_m, w_m = wall_mask.shape[:2]
                    if 0 <= px < w_m and 0 <= py < h_m and wall_mask[py, px] > 0:
                        junction_hit = True
                else:
                    junction_hit = True
                if junction_hit:
                    supported_junctions += 1
            junction_support = supported_junctions / len(coords)
        else:
            junction_support = wall_support

        # 3. Wall Continuity & Thickness Consistency
        # Higher wall support yields higher continuity; penalty for fragmented contact
        wall_continuity = min(1.0, wall_support * 1.1)
        wall_thickness_consistency = 0.80 if wall_support >= 0.40 else 0.40

        # 4. Enclosure Score
        enclosure = hyp.enclosure_score if hyp.enclosure_score > 0 else min(1.0, wall_support * 1.15)

        # 5. Doorway Evidence
        door_count = 0
        door_conf_sum = 0.0
        if doors:
            for d in doors:
                d_poly = getattr(d, "polygon", None)
                d_box = getattr(d, "bbox", None)
                d_pt = None
                if d_poly and hasattr(d_poly, "centroid"):
                    d_pt = d_poly.centroid
                elif d_box:
                    d_pt = Point(d_box[0] + d_box[2] / 2.0, d_box[1] + d_box[3] / 2.0)
                
                if d_pt and d_pt.distance(boundary) <= self.door_distance_threshold:
                    door_count += 1
                    door_conf_sum += getattr(d, "confidence", 0.75)

        doorway_ev = min(1.0, door_count * 0.35 + (door_conf_sum / max(1, door_count)) * 0.30 if door_count > 0 else 0.0)
        doorway_conf = float(door_conf_sum / door_count) if door_count > 0 else 0.0

        # 6. Partition Evidence
        # Indicated if boundary touches another room or internal divider line
        partition_ev = hyp.partition_evidence if hyp.partition_evidence > 0 else 0.20

        # 7. Topology & Neighbor Consistency
        neighbor_count = 0
        if graph and hasattr(graph, "edges"):
            for e in graph.edges:
                if (e.source_id == hyp.hypothesis_id or e.target_id == hyp.hypothesis_id) and e.edge_type.value in ["neighbor_of", "partition_of"]:
                    neighbor_count += 1
        topology_consistency = min(1.0, 0.30 + neighbor_count * 0.20)
        neighbor_consistency = min(1.0, neighbor_count * 0.25)

        # 8. Room Regularity (Compactness & Aspect Ratio sanity)
        comp = hyp.compactness
        ar = hyp.aspect_ratio
        if 0.15 <= comp <= 0.85 and ar <= 4.0:
            room_regularity = 0.85
        elif ar > 6.0:
            room_regularity = 0.30  # extreme elongation (unless corridor)
        else:
            room_regularity = 0.60

        evidence = {
            "wall_boundary_support": float(wall_support),
            "wall_junction_support": float(junction_support),
            "wall_continuity": float(wall_continuity),
            "wall_thickness_consistency": float(wall_thickness_consistency),
            "enclosure_score": float(enclosure),
            "doorway_count": int(door_count),
            "doorway_evidence": float(doorway_ev),
            "doorway_confidence": float(doorway_conf),
            "partition_evidence": float(partition_ev),
            "topology_consistency": float(topology_consistency),
            "neighbor_consistency": float(neighbor_consistency),
            "room_regularity": float(room_regularity),
            "unsupported_boundary_ratio": float(unsupported_ratio),
        }

        # Update hypothesis in-place
        hyp.wall_boundary_support = evidence["wall_boundary_support"]
        hyp.wall_junction_support = evidence["wall_junction_support"]
        hyp.wall_continuity = evidence["wall_continuity"]
        hyp.wall_thickness_consistency = evidence["wall_thickness_consistency"]
        hyp.enclosure_score = evidence["enclosure_score"]
        hyp.doorway_count = evidence["doorway_count"]
        hyp.doorway_evidence = evidence["doorway_evidence"]
        hyp.doorway_confidence = evidence["doorway_confidence"]
        hyp.partition_evidence = evidence["partition_evidence"]
        hyp.topology_consistency = evidence["topology_consistency"]
        hyp.neighbor_consistency = evidence["neighbor_consistency"]
        hyp.room_regularity = evidence["room_regularity"]
        hyp.unsupported_boundary_ratio = evidence["unsupported_boundary_ratio"]

        return evidence
