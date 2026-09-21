"""
Phase 2.8.0 Structural Evidence Extraction
Associates raw ML structural detections (walls, doors, windows, railings, linkage points)
with floorplan room candidate polygons to compute diagnostic mlStructuralEvidence.
"""
from typing import List, Dict, Any, Optional, Tuple
import numpy as np
import cv2
from shapely.geometry import Polygon as ShapelyPolygon, Point as ShapelyPoint, box as shapely_box

from .models import MLDetection, MLStructuralEvidence, CandidateMLComparison, BBox


class StructuralEvidenceExtractor:
    """
    Computes candidate-level structural evidence from ML detections without modifying candidate ranking.
    """
    def __init__(self, buffer_px: float = 12.0):
        self.buffer_px = buffer_px

    def extract_evidence(
        self,
        candidate_poly: Any,
        detections: List[MLDetection],
        image_shape: Optional[Tuple[int, int]] = None,
    ) -> MLStructuralEvidence:
        """
        Convenience wrapper accepting either a Shapely Polygon or coordinate list.
        """
        if hasattr(candidate_poly, "exterior"):
            coords = list(candidate_poly.exterior.coords)
            bounds = candidate_poly.bounds
            max_x = int(bounds[2]) + 100
            max_y = int(bounds[3]) + 100
        elif isinstance(candidate_poly, (list, tuple)) and len(candidate_poly) > 0:
            coords = list(candidate_poly)
            max_x = int(max(p[0] for p in coords)) + 100
            max_y = int(max(p[1] for p in coords)) + 100
        else:
            return MLStructuralEvidence()

        shape = image_shape or (max(600, max_y), max(800, max_x))
        return self.compute_candidate_evidence(coords, detections, shape)

    def compute_candidate_evidence(
        self,
        candidate_polygon: List[Tuple[float, float]],
        detections: List[MLDetection],
        image_shape: Tuple[int, int],  # (height, width)
    ) -> MLStructuralEvidence:
        """
        Computes ML structural evidence (wallSupport, doorConnection, windowConnection,
        linkageSupport, structuralConfidence) for a single candidate polygon.
        """
        h, w = image_shape
        if len(candidate_polygon) < 3:
            return MLStructuralEvidence()

        try:
            cand_poly = ShapelyPolygon(candidate_polygon)
            if not cand_poly.is_valid:
                cand_poly = cand_poly.buffer(0)
            if cand_poly.is_empty or cand_poly.length == 0:
                return MLStructuralEvidence()
        except Exception:
            return MLStructuralEvidence()

        cand_boundary = cand_poly.boundary
        cand_perimeter = cand_boundary.length

        # Separate detections by class
        walls = [d for d in detections if d.class_name == "wall"]
        doors = [d for d in detections if d.class_name == "door"]
        windows = [d for d in detections if d.class_name == "window"]
        railings = [d for d in detections if d.class_name == "railing"]
        linkages = [d for d in detections if d.class_name == "linkage_point"]

        # 1. Compute wallSupport via rasterized perimeter overlap
        # Create candidate boundary mask
        boundary_mask = np.zeros((h, w), dtype=np.uint8)
        pts_np = np.array(candidate_polygon, dtype=np.int32)
        cv2.polylines(boundary_mask, [pts_np], isClosed=True, color=255, thickness=int(self.buffer_px * 2))

        # Create ML wall mask
        wall_mask = np.zeros((h, w), dtype=np.uint8)
        for wd in walls:
            b = wd.bbox
            cv2.rectangle(
                wall_mask,
                (int(b.x1), int(b.y1)),
                (int(b.x2), int(b.y2)),
                255,
                thickness=-1,
            )

        total_boundary_px = np.count_nonzero(boundary_mask)
        overlap_wall_px = np.count_nonzero((boundary_mask > 0) & (wall_mask > 0))
        wall_support = float(overlap_wall_px / total_boundary_px) if total_boundary_px > 0 else 0.0
        wall_support = min(1.0, max(0.0, wall_support))

        # 2. Compute doorConnection
        # A true room candidate typically connects to at least one doorway along its boundary
        cand_boundary_buffered = cand_boundary.buffer(self.buffer_px)
        door_scores = []
        for dd in doors:
            b = dd.bbox
            s_box = shapely_box(b.x1, b.y1, b.x2, b.y2)
            if cand_boundary_buffered.intersects(s_box):
                door_scores.append(dd.confidence)

        door_connection = min(1.0, max(door_scores)) if door_scores else 0.0

        # 3. Compute windowConnection
        window_scores = []
        for wd in windows:
            b = wd.bbox
            s_box = shapely_box(b.x1, b.y1, b.x2, b.y2)
            if cand_boundary_buffered.intersects(s_box):
                window_scores.append(wd.confidence)

        window_connection = min(1.0, max(window_scores)) if window_scores else 0.0

        # 4. Compute linkageSupport (corner / wall junction coincidence)
        linkage_matches = 0
        cand_vertices = [ShapelyPoint(pt) for pt in candidate_polygon]
        for ld in linkages:
            cx, cy = ld.bbox.center
            l_pt = ShapelyPoint(cx, cy)
            for v_pt in cand_vertices:
                if l_pt.distance(v_pt) <= self.buffer_px * 2.0:
                    linkage_matches += 1
                    break

        linkage_support = min(1.0, float(linkage_matches / max(1, len(cand_vertices))))

        # 5. Composite Structural Confidence
        # True rooms have substantial wall support and at least one entry/opening connection
        structural_confidence = (
            0.50 * wall_support +
            0.30 * door_connection +
            0.10 * window_connection +
            0.10 * linkage_support
        )

        ev = MLStructuralEvidence(
            wall_support=wall_support,
            door_connection=door_connection,
            window_connection=window_connection,
            linkage_support=linkage_support,
            structural_confidence=min(1.0, max(0.0, structural_confidence)),
            door_count=len(door_scores),
            window_count=len(window_scores),
        )
        ev.cavity_likelihood = self.compute_cavity_likelihood(candidate_polygon, ev)
        return ev

    def compute_cavity_likelihood(
        self,
        candidate_polygon: List[Tuple[float, float]],
        ml_evidence: MLStructuralEvidence,
    ) -> float:
        """
        Estimates likelihood that candidate is a non-room cavity artifact rather than a true room.
        Cavity artifacts typically have:
        - zero door connections (isolated closed cavity)
        - zero window connections
        - high wall enclosure but lack of entry points
        """
        # Lack of doorway is strong signal of enclosed cavity artifact
        no_door_penalty = 1.0 - ml_evidence.door_connection
        no_window_penalty = 1.0 - ml_evidence.window_connection

        # Cavity likelihood increases when there is wall support but ZERO doorway connection
        cavity_score = 0.60 * no_door_penalty + 0.20 * no_window_penalty + 0.20 * (1.0 - ml_evidence.linkage_support)
        return min(1.0, max(0.0, cavity_score))
