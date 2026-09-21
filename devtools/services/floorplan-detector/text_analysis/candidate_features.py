"""
Phase 2.10.2 Candidate Text Evidence Extraction
Extracts 11 spatial and semantic candidate-level text metrics for room hypotheses
without modifying original image pixels or wall geometry.
"""
from dataclasses import dataclass, field
from typing import List, Tuple, Dict, Any, Optional
import cv2
import numpy as np
from shapely.geometry import Polygon as ShapelyPolygon, Point as ShapelyPoint

from .models import TextRegion


@dataclass
class CandidateTextMetrics:
    """
    11 candidate-level text features for evidence-based ranking and recovery.
    """
    candidate_id: str
    text_count: int = 0
    text_coverage: float = 0.0
    text_area_ratio: float = 0.0
    text_interior_ratio: float = 0.0
    text_near_wall_ratio: float = 0.0
    text_overlap_wall_ratio: float = 0.0
    text_crossing_wall_ratio: float = 0.0
    text_center_distance: float = 1.0
    text_fragmentation_risk: float = 0.0
    text_artifact_evidence: float = 0.0
    text_room_evidence: float = 0.0
    intersecting_region_ids: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "candidateId": self.candidate_id,
            "textCount": self.text_count,
            "textCoverage": round(self.text_coverage, 4),
            "textAreaRatio": round(self.text_area_ratio, 4),
            "textInteriorRatio": round(self.text_interior_ratio, 4),
            "textNearWallRatio": round(self.text_near_wall_ratio, 4),
            "textOverlapWallRatio": round(self.text_overlap_wall_ratio, 4),
            "textCrossingWallRatio": round(self.text_crossing_wall_ratio, 4),
            "textCenterDistance": round(self.text_center_distance, 4),
            "textFragmentationRisk": round(self.text_fragmentation_risk, 4),
            "textArtifactEvidence": round(self.text_artifact_evidence, 4),
            "textRoomEvidence": round(self.text_room_evidence, 4),
            "intersectingRegionIds": self.intersecting_region_ids,
        }


def compute_candidate_text_metrics(
    candidate_id: str,
    polygon_pts: List[Tuple[float, float]],
    text_mask: np.ndarray,
    text_regions: List[TextRegion],
    wall_mask: Optional[np.ndarray] = None,
    dist_map: Optional[np.ndarray] = None,
) -> CandidateTextMetrics:
    """
    Computes the 11 candidate-level text features for an individual room polygon.
    Strictly read-only; zero mutation of geometry, masks, or input arrays.
    """
    if not polygon_pts or len(polygon_pts) < 3:
        return CandidateTextMetrics(candidate_id=candidate_id)

    try:
        cand_poly = ShapelyPolygon(polygon_pts)
        if not cand_poly.is_valid:
            cand_poly = cand_poly.buffer(0)
    except Exception:
        return CandidateTextMetrics(candidate_id=candidate_id)

    cand_area = float(cand_poly.area)
    if cand_area <= 0:
        return CandidateTextMetrics(candidate_id=candidate_id)

    min_x, min_y, max_x, max_y = cand_poly.bounds
    cand_centroid = (cand_poly.centroid.x, cand_poly.centroid.y)
    r_eff = np.sqrt(cand_area / np.pi)

    # Fast bounding-box pre-filtering of text regions
    intersecting_regions: List[TextRegion] = []
    for r in text_regions:
        bx, by, bw, bh = r.bbox
        if bx + bw < min_x or bx > max_x or by + bh < min_y or by > max_y:
            continue
        try:
            r_poly = ShapelyPolygon(r.polygon)
            if not r_poly.is_valid:
                r_poly = r_poly.buffer(0)
            if cand_poly.intersects(r_poly):
                intersecting_regions.append(r)
        except Exception:
            pass

    text_count = len(intersecting_regions)
    if text_count == 0:
        return CandidateTextMetrics(
            candidate_id=candidate_id,
            text_count=0,
            text_coverage=0.0,
            text_area_ratio=0.0,
            text_interior_ratio=0.0,
            text_near_wall_ratio=0.0,
            text_overlap_wall_ratio=0.0,
            text_crossing_wall_ratio=0.0,
            text_center_distance=1.0,
            text_fragmentation_risk=0.0,
            text_artifact_evidence=0.0,
            text_room_evidence=0.0,
            intersecting_region_ids=[],
        )

    # 1. Total text region area & area ratio
    total_region_area = sum(r.area for r in intersecting_regions)
    text_area_ratio = float(total_region_area / max(1.0, cand_area))

    # 2. Bounding-box cropped mask text coverage
    h, w = text_mask.shape[:2]
    ix1 = max(0, int(np.floor(min_x)) - 2)
    iy1 = max(0, int(np.floor(min_y)) - 2)
    ix2 = min(w, int(np.ceil(max_x)) + 3)
    iy2 = min(h, int(np.ceil(max_y)) + 3)

    if ix2 > ix1 and iy2 > iy1:
        roi_mask = np.zeros((iy2 - iy1, ix2 - ix1), dtype=np.uint8)
        shifted_pts = np.array(
            [[int(round(pt[0] - ix1)), int(round(pt[1] - iy1))] for pt in polygon_pts],
            dtype=np.int32,
        )
        cv2.fillPoly(roi_mask, [shifted_pts], 255)
        text_sub = text_mask[iy1:iy2, ix1:ix2]
        overlap_px = float(np.count_nonzero((roi_mask > 0) & (text_sub > 0)))
        text_coverage = float(overlap_px / max(1.0, cand_area))
    else:
        text_coverage = 0.0

    # 3. Spatial relations breakdown
    interior_cnt = sum(1 for r in intersecting_regions if r.relation == "INTERIOR_TEXT")
    near_wall_cnt = sum(1 for r in intersecting_regions if r.relation == "NEAR_WALL_TEXT")
    overlap_cnt = sum(1 for r in intersecting_regions if r.relation == "WALL_OVERLAP_TEXT")
    crossing_cnt = sum(1 for r in intersecting_regions if r.text_crossing_wall_ratio > 0.15)

    text_interior_ratio = float(interior_cnt / text_count)
    text_near_wall_ratio = float(near_wall_cnt / text_count)
    text_overlap_wall_ratio = float(overlap_cnt / text_count)
    text_crossing_wall_ratio = float(crossing_cnt / text_count)

    # 4. Text center distance
    t_cx = float(np.mean([0.5 * (r.bbox[0] + r.bbox[0] + r.bbox[2]) for r in intersecting_regions]))
    t_cy = float(np.mean([0.5 * (r.bbox[1] + r.bbox[1] + r.bbox[3]) for r in intersecting_regions]))
    dist_to_center = float(np.hypot(t_cx - cand_centroid[0], t_cy - cand_centroid[1]))
    text_center_distance = float(np.clip(dist_to_center / max(15.0, r_eff), 0.0, 2.5))

    # 5. Text fragmentation risk
    text_fragmentation_risk = float(
        np.clip(0.6 * text_crossing_wall_ratio + 0.4 * text_overlap_wall_ratio, 0.0, 1.0)
    )

    # 6. Negative evidence: text artifact cavity evidence
    # High when candidate is tiny (<1500 px^2) and text coverage is dense, or candidate area is dominated by text
    area_penalty_factor = max(0.0, 1.0 - (cand_area / 2000.0))
    cov_factor = max(0.0, (text_coverage - 0.15) / 0.40)
    ratio_factor = max(0.0, (text_area_ratio - 0.25) / 0.50)
    raw_artifact = float(max(cov_factor, ratio_factor) * area_penalty_factor)

    if cand_area < 700:
        raw_artifact = max(raw_artifact, 0.85)
    elif cand_area < 1200 and (text_coverage > 0.30 or text_area_ratio > 0.45):
        raw_artifact = max(raw_artifact, 0.70)
    text_artifact_evidence = float(np.clip(raw_artifact, 0.0, 1.0))

    # 7. Positive evidence: text room evidence
    # High when genuine room label is well inside the chamber, centered, and not an artifact
    area_valid_factor = float(np.clip(cand_area / 1800.0, 0.2, 1.0))
    center_factor = float(np.exp(-1.2 * text_center_distance))
    interior_factor = 0.5 + 0.5 * text_interior_ratio
    cleanliness_factor = max(0.0, 1.0 - text_artifact_evidence)

    # If label is well-centered and interior, give strong signal
    raw_room = float(interior_factor * center_factor * cleanliness_factor * area_valid_factor)
    text_room_evidence = float(np.clip(raw_room, 0.0, 1.0))

    return CandidateTextMetrics(
        candidate_id=candidate_id,
        text_count=text_count,
        text_coverage=text_coverage,
        text_area_ratio=text_area_ratio,
        text_interior_ratio=text_interior_ratio,
        text_near_wall_ratio=text_near_wall_ratio,
        text_overlap_wall_ratio=text_overlap_wall_ratio,
        text_crossing_wall_ratio=text_crossing_wall_ratio,
        text_center_distance=text_center_distance,
        text_fragmentation_risk=text_fragmentation_risk,
        text_artifact_evidence=text_artifact_evidence,
        text_room_evidence=text_room_evidence,
        intersecting_region_ids=[r.id for r in intersecting_regions],
    )
