"""
Architectural Face Classification & False-Positive Pruning Engine (Phase 2.7.8)
Extracts multi-channel positive and negative evidence features, classifies candidate faces into
"room", "non_room", and "ambiguous", and performs overlap and containment pruning.
"""
import cv2
import numpy as np
from typing import List, Dict, Any, Tuple, Optional
from shapely.geometry import Polygon as ShapelyPolygon

from .models import (
    AreaPoint,
    RoomHypothesis,
    ArchitecturalFaceClassification,
    DetectionConfig,
    ArchitecturalOpeningDiagnostics,
)

def extract_face_features(
    hyp: RoomHypothesis,
    wall_mask: np.ndarray,
    wall_network: Any,
    openings: List[ArchitecturalOpeningDiagnostics],
    footprint_mask: Optional[np.ndarray],
    img_w: int,
    img_h: int,
) -> Tuple[Dict[str, float], Dict[str, float]]:
    """
    Extracts normalized positive and negative evidence feature dictionaries for a candidate face.
    """
    canvas_area = float(img_w * img_h)
    norm_area = hyp.area_px / canvas_area
    pts = np.array([[int(p.xPx), int(p.yPx)] for p in hyp.polygon], np.int32)

    # 1. Positive Evidence Extraction
    pos_evidence: Dict[str, float] = {}

    # A. Wall Support Ratio
    poly_mask = np.zeros((img_h, img_w), dtype=np.uint8)
    cv2.polylines(poly_mask, [pts], isClosed=True, color=255, thickness=3)
    bnd_px = cv2.countNonZero(poly_mask)
    if bnd_px > 0:
        sup_px = cv2.countNonZero(cv2.bitwise_and(poly_mask, wall_mask))
        pos_evidence["wallSupport"] = min(1.0, sup_px / float(bnd_px))
    else:
        pos_evidence["wallSupport"] = 0.50

    # B. Boundary Quality (Rectangularity & Convexity)
    rect = cv2.minAreaRect(pts)
    box = cv2.boxPoints(rect)
    box_area = cv2.contourArea(box)
    rectangularity = hyp.area_px / max(1.0, box_area)
    pos_evidence["boundaryQuality"] = min(1.0, max(0.20, rectangularity))

    # C. Footprint Containment Ratio
    if footprint_mask is not None and footprint_mask.shape == (img_h, img_w):
        hyp_mask = np.zeros((img_h, img_w), dtype=np.uint8)
        cv2.fillPoly(hyp_mask, [pts], 255)
        hyp_area = float(np.count_nonzero(hyp_mask))
        if hyp_area > 0:
            in_fp = float(np.count_nonzero(cv2.bitwise_and(hyp_mask, footprint_mask)))
            pos_evidence["footprintContainment"] = min(1.0, in_fp / hyp_area)
        else:
            pos_evidence["footprintContainment"] = 0.80
    else:
        pos_evidence["footprintContainment"] = 0.85

    # D. Topology & Repetition Scores
    pos_evidence["topologyScore"] = min(1.0, hyp.topology_score)
    pos_evidence["repetitionScore"] = min(1.0, hyp.repetition_score)
    pos_evidence["architecturalWallRatio"] = min(1.0, 0.50 + 0.50 * pos_evidence["wallSupport"])

    # 2. Negative Evidence Extraction
    neg_evidence: Dict[str, float] = {}

    # A. Furniture Likelihood (small area + low wall support + high stroke density)
    neg_evidence["furnitureLikelihood"] = min(1.0, hyp.furniture_likelihood)

    # B. Text & Dimension Line Likelihood
    neg_evidence["textLikelihood"] = min(1.0, hyp.text_likelihood)

    # C. Hatch Pattern Likelihood
    neg_evidence["hatchLikelihood"] = min(1.0, hyp.hatch_likelihood)

    # D. Exterior Exposure
    bx, by, bw, bh = hyp.bbox
    if bx <= 5 or by <= 5 or (bx + bw) >= (img_w - 5) or (by + bh) >= (img_h - 5):
        neg_evidence["exteriorExposure"] = 0.90
    else:
        neg_evidence["exteriorExposure"] = min(1.0, 1.0 - pos_evidence["footprintContainment"])

    # E. Isolation Penalty
    if pos_evidence["wallSupport"] < 0.25 and pos_evidence["repetitionScore"] < 0.10:
        neg_evidence["isolationPenalty"] = 0.75
    else:
        neg_evidence["isolationPenalty"] = 0.0

    return pos_evidence, neg_evidence

def classify_candidate_face(
    hyp: RoomHypothesis,
    pos_evidence: Dict[str, float],
    neg_evidence: Dict[str, float],
    config: DetectionConfig,
) -> ArchitecturalFaceClassification:
    """
    Performs Phase 2.7.8 Three-Way Classification ("room", "non_room", "ambiguous").
    """
    rejection_reasons: List[str] = []

    # Calculate weighted positive evidence score
    pos_score = (
        0.30 * pos_evidence.get("wallSupport", 0.5)
        + 0.25 * pos_evidence.get("footprintContainment", 0.8)
        + 0.20 * pos_evidence.get("topologyScore", 0.5)
        + 0.15 * pos_evidence.get("boundaryQuality", 0.5)
        + 0.10 * pos_evidence.get("repetitionScore", 0.0)
    )

    # Calculate weighted negative evidence penalty
    neg_score = 0.0
    if config.enable_negative_evidence:
        if config.enable_furniture_suppression and neg_evidence.get("furnitureLikelihood", 0) > 0.40:
            neg_score += 0.30 * neg_evidence["furnitureLikelihood"]
            rejection_reasons.append("high_furniture_likelihood")

        if config.enable_text_suppression and neg_evidence.get("textLikelihood", 0) > 0.40:
            neg_score += 0.25 * neg_evidence["textLikelihood"]
            rejection_reasons.append("high_text_likelihood")

        if neg_evidence.get("hatchLikelihood", 0) > 0.40:
            neg_score += 0.20 * neg_evidence["hatchLikelihood"]
            rejection_reasons.append("hatch_pattern_detected")

        if config.enable_exterior_suppression and neg_evidence.get("exteriorExposure", 0) > 0.60:
            neg_score += 0.35 * neg_evidence["exteriorExposure"]
            rejection_reasons.append("exterior_exposure")

        if neg_evidence.get("isolationPenalty", 0) > 0.50:
            neg_score += 0.30 * neg_evidence["isolationPenalty"]
            rejection_reasons.append("weak_architectural_wall_support")

    net_confidence = max(0.0, min(1.0, round(pos_score - neg_score, 3)))

    # Three-Way Decision Mapping
    # High-confidence cavity candidates generated from enclosed walls are accepted if net_confidence >= 0.35
    threshold = 0.35 if hyp.source == "cavity" else 0.45
    if net_confidence >= threshold:
        classification = "room"
    elif net_confidence < 0.28:
        classification = "non_room"
    else:
        classification = "ambiguous"
        rejection_reasons.append("ambiguous_confidence_score")

    return ArchitecturalFaceClassification(
        face_id=hyp.id,
        classification=classification,
        confidence=net_confidence,
        positive_evidence=pos_evidence,
        negative_evidence=neg_evidence,
        rejection_reasons=rejection_reasons,
        source_hypothesis_id=hyp.id,
    )

def prune_overlapping_and_contained_faces(
    classifications: Dict[str, ArchitecturalFaceClassification],
    hypotheses: List[RoomHypothesis],
    config: DetectionConfig,
) -> Tuple[List[RoomHypothesis], List[ArchitecturalFaceClassification]]:
    """
    Performs containment & polygon overlap pruning:
    - Prunes nested sub-faces formed by internal furniture/cabinets inside larger room hypotheses.
    - Resolves overlapping candidate pairs by retaining the higher confidence / stronger topology hypothesis.
    """
    if not config.enable_overlap_pruning or not hypotheses:
        return hypotheses, list(classifications.values())

    accepted: List[RoomHypothesis] = []
    pruned_classifications: List[ArchitecturalFaceClassification] = []

    # Sort candidates by confidence descending
    sorted_hyps = sorted(hypotheses, key=lambda h: classifications[h.id].confidence if h.id in classifications else h.confidence, reverse=True)

    for cand in sorted_hyps:
        clf = classifications.get(cand.id)
        if clf and clf.classification == "non_room":
            pruned_classifications.append(clf)
            continue

        try:
            c_pts = [(p.xPx, p.yPx) for p in cand.polygon]
            poly_c = ShapelyPolygon(c_pts)
            if not poly_c.is_valid:
                poly_c = poly_c.buffer(0)
            c_area = max(1.0, poly_c.area)

            is_duplicate_or_nested = False
            for existing in accepted:
                e_pts = [(p.xPx, p.yPx) for p in existing.polygon]
                poly_e = ShapelyPolygon(e_pts)
                if not poly_e.is_valid:
                    poly_e = poly_e.buffer(0)

                if poly_c.intersects(poly_e):
                    inter_area = poly_c.intersection(poly_e).area
                    # Check if candidate is contained inside existing room
                    containment = inter_area / c_area
                    if containment >= 0.70:
                        is_duplicate_or_nested = True
                        if clf:
                            clf.classification = "non_room"
                            clf.rejection_reasons.append("containment_furniture")
                            pruned_classifications.append(clf)
                        break

            if not is_duplicate_or_nested:
                accepted.append(cand)
                if clf:
                    pruned_classifications.append(clf)

        except Exception:
            accepted.append(cand)
            if clf:
                pruned_classifications.append(clf)

    return accepted, pruned_classifications
