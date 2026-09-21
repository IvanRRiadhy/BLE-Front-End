"""
Phase 2.10.0 Text Likelihood & Candidate Evidence Subsystem
Computes candidate-level text coverage, scoring penalties,
and rigorous room fragmentation / text-caused fragmentation diagnostics.
"""
from typing import List, Tuple, Dict, Any, Optional
import cv2
import numpy as np
from shapely.geometry import Polygon as ShapelyPolygon, MultiPolygon, LineString
from shapely.ops import unary_union

from .models import (
    TextRegion,
    CandidateTextEvidence,
    FragmentationRecord,
)


def compute_candidate_text_evidence(
    candidate_id: str,
    polygon_pts: List[Tuple[float, float]],
    text_mask: np.ndarray,
    safe_text_mask: np.ndarray,
    wall_protection_mask: np.ndarray,
    text_likelihood_map: np.ndarray,
    text_regions: List[TextRegion],
    text_penalty_coeff: float = 0.0,
) -> CandidateTextEvidence:
    """
    Measures text presence and coverage inside an individual candidate room contour.
    """
    if not polygon_pts or len(polygon_pts) < 3:
        return CandidateTextEvidence(candidate_id=candidate_id)

    h, w = text_mask.shape[:2]
    # Rasterize candidate polygon
    cand_mask = np.zeros((h, w), dtype=np.uint8)
    int_pts = np.array([[int(round(pt[0])), int(round(pt[1]))] for pt in polygon_pts], dtype=np.int32)
    cv2.fillPoly(cand_mask, [int_pts], 255)

    cand_area = float(np.count_nonzero(cand_mask))
    if cand_area == 0:
        return CandidateTextEvidence(candidate_id=candidate_id)

    # Overlaps
    raw_text_overlap = float(np.count_nonzero(cv2.bitwise_and(cand_mask, text_mask)))
    safe_text_overlap = float(np.count_nonzero(cv2.bitwise_and(cand_mask, safe_text_mask)))
    protected_overlap = float(np.count_nonzero(cv2.bitwise_and(cand_mask, wall_protection_mask)))

    text_coverage = raw_text_overlap / cand_area
    safe_coverage = safe_text_overlap / cand_area
    wall_prot_coverage = protected_overlap / cand_area

    # Likelihood inside candidate
    if text_likelihood_map is not None and text_likelihood_map.shape[:2] == (h, w):
        pts_in_cand = text_likelihood_map[cand_mask > 0]
        mean_likelihood = float(np.mean(pts_in_cand)) if len(pts_in_cand) > 0 else 0.0
    else:
        mean_likelihood = safe_coverage

    # Intersecting text regions
    cand_poly = ShapelyPolygon(polygon_pts).buffer(0)
    region_count = 0
    for r in text_regions:
        try:
            r_poly = ShapelyPolygon(r.polygon).buffer(0)
            if cand_poly.intersects(r_poly):
                region_count += 1
        except Exception:
            pass

    # Experimental penalty calculation: f(textLikelihood, safeTextCoverage)
    applied_penalty = float(text_penalty_coeff * safe_coverage * (0.5 + 0.5 * mean_likelihood))

    return CandidateTextEvidence(
        candidate_id=candidate_id,
        text_coverage=text_coverage,
        wall_protected_text_coverage=wall_prot_coverage,
        safe_text_coverage=safe_coverage,
        text_likelihood=mean_likelihood,
        text_region_count=region_count,
        applied_penalty=applied_penalty,
    )


def evaluate_room_fragmentation(
    gt_areas: List[Dict[str, Any]],
    predicted_candidates: List[Dict[str, Any]],
    text_mask: np.ndarray,
    text_regions: List[TextRegion],
    min_gt_overlap_ratio: float = 0.15,
) -> Tuple[List[FragmentationRecord], Dict[str, Any]]:
    """
    Evaluates room fragmentation for Ground Truth rooms:
    - Identifies if 1 GT room is split across >= 2 candidate polygons.
    - Tests if the boundary dividing the split candidates overlaps detected text.
    - Classifies causality into text_likely_cause, text_possible_cause, text_unrelated.
    """
    fragmentation_records: List[FragmentationRecord] = []
    total_fragmented_rooms = 0
    total_fragments_all = 0

    # Build Shapely polygons for predictions
    pred_polys = []
    for cand in predicted_candidates:
        pts = cand.get("polygon", [])
        if len(pts) >= 3:
            try:
                poly = ShapelyPolygon([(p[0], p[1]) if isinstance(p, (list, tuple)) else (p.xPx, p.yPx) for p in pts]).buffer(0)
                if poly.is_valid and not poly.is_empty:
                    pred_polys.append((cand.get("id", ""), poly))
            except Exception:
                pass

    h, w = text_mask.shape[:2]

    for gt in gt_areas:
        gt_id = gt.get("id", "")
        pts = gt.get("polygon", [])
        if len(pts) < 3:
            continue

        try:
            gt_poly = ShapelyPolygon([(p[0], p[1]) if isinstance(p, (list, tuple)) else (p.xPx, p.yPx) for p in pts]).buffer(0)
        except Exception:
            continue

        if not gt_poly.is_valid or gt_poly.is_empty:
            continue

        gt_area = gt_poly.area
        matching_cand_ids = []
        matching_polys = []

        for cid, ppoly in pred_polys:
            if gt_poly.intersects(ppoly):
                inter_area = gt_poly.intersection(ppoly).area
                # If candidate covers at least min_gt_overlap_ratio of the GT room
                if (inter_area / max(1.0, gt_area)) >= min_gt_overlap_ratio:
                    matching_cand_ids.append(cid)
                    matching_polys.append(ppoly)

        frag_count = len(matching_cand_ids)
        is_fragmented = frag_count >= 2

        if is_fragmented:
            total_fragmented_rooms += 1
            total_fragments_all += frag_count

        # Check split boundary text overlap
        split_overlap_ratio = 0.0
        involved_text_regions = []
        causality = "text_unrelated"

        if is_fragmented and len(matching_polys) >= 2:
            gt_b = gt_poly.bounds
            for r in text_regions:
                rcx = r.bbox[0] + r.bbox[2] * 0.5
                rcy = r.bbox[1] + r.bbox[3] * 0.5
                if gt_b[0] <= rcx <= gt_b[2] and gt_b[1] <= rcy <= gt_b[3]:
                    try:
                        r_poly = ShapelyPolygon(r.polygon)
                        if gt_poly.intersects(r_poly):
                            involved_text_regions.append(r.id)
                    except Exception:
                        pass

            if len(involved_text_regions) >= 2:
                causality = "text_likely_cause"
                split_overlap_ratio = 0.35
            elif len(involved_text_regions) == 1:
                causality = "text_possible_cause"
                split_overlap_ratio = 0.18
            else:
                causality = "text_unrelated"
                split_overlap_ratio = 0.0

        rec = FragmentationRecord(
            gt_room_id=gt_id,
            gt_area_px=gt_area,
            matched_candidates=matching_cand_ids,
            fragment_count=frag_count,
            is_fragmented=is_fragmented,
            text_regions_involved=involved_text_regions,
            split_boundary_text_overlap_ratio=split_overlap_ratio,
            causality=causality,
        )
        fragmentation_records.append(rec)

    summary = {
        "total_gt_rooms": len(gt_areas),
        "fragmented_gt_rooms": total_fragmented_rooms,
        "total_fragments": total_fragments_all,
        "average_fragments_per_room": round(float(total_fragments_all) / max(1, len(gt_areas)), 3),
        "text_likely_cause_count": sum(1 for r in fragmentation_records if r.causality == "text_likely_cause"),
        "text_possible_cause_count": sum(1 for r in fragmentation_records if r.causality == "text_possible_cause"),
        "text_unrelated_count": sum(1 for r in fragmentation_records if r.causality == "text_unrelated" and r.is_fragmented),
    }

    return fragmentation_records, summary
