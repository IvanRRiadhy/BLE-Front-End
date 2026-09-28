"""
Doorway Context Analyzer for Phase 2.10.9 Global Room Synthesis.
Identifies doorway relationships, inter-room connections, and exterior door openings.
"""
from typing import List, Dict, Any, Optional, Tuple
import numpy as np
from shapely.geometry import Point, box, Polygon as ShapelyPolygon
from .models import RoomHypothesis, DoorwayContext, HypothesisRelationship, RelationshipType


class DoorwayContextAnalyzer:
    """
    Extracts doorway contexts and establishes DOOR_CONNECTED_TO relationships.
    """

    def __init__(
        self,
        door_boundary_distance_px: float = 28.0,
        door_inter_room_distance_px: float = 35.0,
    ):
        self.door_boundary_distance_px = door_boundary_distance_px
        self.door_inter_room_distance_px = door_inter_room_distance_px

    def analyze_doorways(
        self,
        hypotheses: List[RoomHypothesis],
        doors: Optional[List[Any]] = None,
        img_w: int = 1000,
        img_h: int = 1000,
    ) -> Tuple[List[DoorwayContext], List[HypothesisRelationship]]:
        """
        Extracts doorway contexts and creates doorway-based relationships.
        """
        doorway_contexts: List[DoorwayContext] = []
        relationships: List[HypothesisRelationship] = []

        if not doors or not hypotheses:
            return doorway_contexts, relationships

        for d_idx, d in enumerate(doors):
            d_id = f"door_{d_idx:03d}"
            # Extract point / bbox
            d_poly = getattr(d, "polygon", None)
            d_box = getattr(d, "bbox", None)
            d_conf = float(getattr(d, "confidence", 0.75))
            pt: Optional[Point] = None

            if d_poly is not None and hasattr(d_poly, "centroid"):
                pt = d_poly.centroid
            elif d_box is not None:
                pt = Point(d_box[0] + d_box[2] / 2.0, d_box[1] + d_box[3] / 2.0)
            elif isinstance(d, dict):
                bbox = d.get("bbox", [0, 0, 10, 10])
                pt = Point(bbox[0] + bbox[2] / 2.0, bbox[1] + bbox[3] / 2.0)
                d_conf = float(d.get("confidence", 0.75))

            if pt is None:
                continue

            # Check touching hypotheses
            connected_hyp_ids: List[str] = []
            for h in hypotheses:
                b = h.polygon.boundary
                if b.distance(pt) <= self.door_boundary_distance_px or h.polygon.contains(pt):
                    connected_hyp_ids.append(h.hypothesis_id)
                    if d_id not in h.doorway_ids:
                        h.doorway_ids.append(d_id)

            # Check exterior connection
            exterior_conn = (
                pt.x <= 40.0
                or pt.y <= 40.0
                or pt.x >= (img_w - 40.0)
                or pt.y >= (img_h - 40.0)
                or len(connected_hyp_ids) <= 1
            )

            d_ctx = DoorwayContext(
                doorway_id=d_id,
                source="detection",
                confidence=d_conf,
                position=(float(pt.x), float(pt.y)),
                connected_hypotheses=connected_hyp_ids,
                exterior_connection=exterior_conn,
            )
            doorway_contexts.append(d_ctx)

            # Build pairwise DOOR_CONNECTED_TO relationships
            for i in range(len(connected_hyp_ids)):
                for j in range(i + 1, len(connected_hyp_ids)):
                    id_a = connected_hyp_ids[i]
                    id_b = connected_hyp_ids[j]
                    relationships.append(
                        HypothesisRelationship(
                            source_id=id_a,
                            target_id=id_b,
                            rel_type=RelationshipType.DOOR_CONNECTED_TO,
                            confidence=d_conf,
                            doorway_id=d_id,
                        )
                    )
                    relationships.append(
                        HypothesisRelationship(
                            source_id=id_b,
                            target_id=id_a,
                            rel_type=RelationshipType.DOOR_CONNECTED_TO,
                            confidence=d_conf,
                            doorway_id=d_id,
                        )
                    )

        # Update doorway counts and supports on hypotheses
        for h in hypotheses:
            h.doorway_count = len(h.doorway_ids)
            h.doorway_support = min(1.0, h.doorway_count * 0.40)

        return doorway_contexts, relationships
