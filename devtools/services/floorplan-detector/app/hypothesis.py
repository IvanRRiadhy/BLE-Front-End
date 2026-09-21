"""
Room Hypothesis & Planar Graph Bounded Face Extractor (Phase 2.7.7)
Constructs room hypotheses from WallNetwork planar faces, cavity regions,
repeated architectural patterns, and partition topology.
"""
import cv2
import numpy as np
from typing import List, Dict, Any, Tuple, Optional
from shapely.geometry import Polygon as ShapelyPolygon, LineString, MultiPolygon
from shapely.ops import polygonize, unary_union

from .models import (
    AreaPoint,
    PlanarFace,
    RoomHypothesis,
    SplitHypothesis,
    MergeHypothesis,
    WallSegmentDiagnostics,
    ArchitecturalOpeningDiagnostics,
    DetectionConfig,
)

def extract_planar_faces(
    wall_network: Any,
    img_width: int,
    img_height: int,
    min_area_px: float = 1500.0,
) -> List[PlanarFace]:
    """
    Extracts bounded planar faces from WallNetwork wall segments using planar graph topology.
    """
    if not wall_network or not hasattr(wall_network, "segments") or not wall_network.segments:
        return []

    canvas = np.zeros((img_height, img_width), dtype=np.uint8)

    # Draw wall segment centerlines (only architectural walls, not furniture)
    for seg in wall_network.segments:
        if getattr(seg, "confidence", 1.0) >= 0.45 and getattr(seg, "architectural_confidence", 0.5) >= 0.40:
            x1, y1 = int(seg.x1), int(seg.y1)
            x2, y2 = int(seg.x2), int(seg.y2)
            cv2.line(canvas, (x1, y1), (x2, y2), 255, thickness=max(2, int(getattr(seg, "thickness", 3))))

    # Dilate lines slightly to close small hairline gaps in wall network graph
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    wall_grid = cv2.dilate(canvas, kernel, iterations=1)

    # Invert to get space cavities
    spaces_mask = cv2.bitwise_not(wall_grid)

    # Find contours representing candidate planar faces
    contours, hierarchy = cv2.findContours(spaces_mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)

    planar_faces: List[PlanarFace] = []
    face_idx = 1

    effective_min_area = max(min_area_px, (img_width * img_height) * 0.003)

    for idx, cnt in enumerate(contours):
        if len(cnt) < 3:
            continue
        area = cv2.contourArea(cnt)
        if area < effective_min_area or area > (img_width * img_height * 0.85):
            continue

        x, y, w, h = cv2.boundingRect(cnt)
        # Exclude border-touching exterior space
        if x <= 5 or y <= 5 or (x + w) >= (img_width - 5) or (y + h) >= (img_height - 5):
            continue

        peri = cv2.arcLength(cnt, True)
        approx = cv2.approxPolyDP(cnt, 0.012 * peri, True)
        pts = [AreaPoint(float(p[0][0]), float(p[0][1])) for p in approx]

        planar_faces.append(
            PlanarFace(
                id=f"face_{face_idx}",
                polygon=pts,
                area_px=float(area),
                bbox=(x, y, w, h),
                perimeter_px=float(peri),
                is_exterior=False,
                wall_support_ratio=0.85,
            )
        )
        face_idx += 1

    return planar_faces

def detect_repeated_room_patterns(
    hypotheses: List[RoomHypothesis],
    img_width: int,
    img_height: int,
) -> None:
    """
    Identifies repeated neighboring room structures (multi-unit layouts, hotel rooms, office bays).
    Sets repetition_score on hypotheses in-place.
    """
    if len(hypotheses) < 2:
        return

    areas = [h.area_px for h in hypotheses]
    aspects = [h.bbox[2] / max(1.0, h.bbox[3]) for h in hypotheses]

    for i, h1 in enumerate(hypotheses):
        matches = 0
        w1, h1_h = h1.bbox[2], h1.bbox[3]
        cx1, cy1 = h1.bbox[0] + w1 / 2.0, h1.bbox[1] + h1_h / 2.0

        for j, h2 in enumerate(hypotheses):
            if i == j:
                continue
            w2, h2_h = h2.bbox[2], h2.bbox[3]
            cx2, cy2 = h2.bbox[0] + w2 / 2.0, h2.bbox[1] + h2_h / 2.0

            # Similar area and aspect ratio
            area_ratio = min(h1.area_px, h2.area_px) / max(1.0, max(h1.area_px, h2.area_px))
            aspect_diff = abs((w1 / max(1.0, h1_h)) - (w2 / max(1.0, h2_h)))

            # Check alignment (horizontal or vertical row)
            dx = abs(cx1 - cx2)
            dy = abs(cy1 - cy2)

            if area_ratio >= 0.70 and aspect_diff <= 0.35:
                if dx < 1.5 * max(w1, w2) or dy < 1.5 * max(h1_h, h2_h):
                    matches += 1

        h1.repetition_score = min(1.0, round(matches * 0.35, 2))

def evaluate_room_confidence(
    hyp: RoomHypothesis,
    wall_mask: np.ndarray,
    openings: List[ArchitecturalOpeningDiagnostics],
    config: Optional[DetectionConfig] = None,
) -> float:
    """
    Computes a comprehensive normalized room confidence score.
    """
    # 1. Wall Support Ratio
    pts = np.array([[int(p.xPx), int(p.yPx)] for p in hyp.polygon], np.int32)
    poly_mask = np.zeros_like(wall_mask, dtype=np.uint8)
    cv2.polylines(poly_mask, [pts], isClosed=True, color=255, thickness=3)

    boundary_pixels = cv2.countNonZero(poly_mask)
    if boundary_pixels > 0:
        supported_pixels = cv2.countNonZero(cv2.bitwise_and(poly_mask, wall_mask))
        hyp.wall_support = min(1.0, supported_pixels / float(boundary_pixels))
    else:
        hyp.wall_support = 0.50

    # 2. Enclosure Score (allows for architectural openings)
    opening_coverage = 0.0
    for op in openings:
        # If opening is near hypothesis bbox
        op_cx = (op.x1 + op.x2) / 2.0
        op_cy = (op.y1 + op.y2) / 2.0
        bx, by, bw, bh = hyp.bbox
        if bx - 10 <= op_cx <= bx + bw + 10 and by - 10 <= op_cy <= by + bh + 10:
            opening_coverage += op.width

    peri = max(1.0, cv2.arcLength(pts, True))
    open_ratio = min(0.40, opening_coverage / peri)
    hyp.enclosure_score = min(1.0, hyp.wall_support + open_ratio)

    # 3. Boundary Quality Score (regularity of polygon)
    rect = cv2.minAreaRect(pts)
    box = cv2.boxPoints(rect)
    box_area = cv2.contourArea(box)
    rectangularity = hyp.area_px / max(1.0, box_area)
    hyp.boundary_score = min(1.0, max(0.20, rectangularity))

    # 4. Topology Score
    hyp.topology_score = min(1.0, 0.50 + 0.50 * hyp.wall_support)

    # 5. Composite Normalized Confidence Formula
    conf = (
        0.30 * hyp.wall_support
        + 0.25 * hyp.enclosure_score
        + 0.20 * hyp.topology_score
        + 0.15 * hyp.boundary_score
        + 0.10 * hyp.repetition_score
        - 0.15 * hyp.exterior_exposure
        - 0.10 * hyp.furniture_likelihood
        - 0.10 * hyp.text_likelihood
    )

    hyp.confidence = max(0.0, min(1.0, round(conf, 3)))
    hyp.is_accepted = hyp.confidence >= 0.40
    if not hyp.is_accepted:
        hyp.rejection_reason = "Low confidence score (< 0.40)"

    return hyp.confidence

def generate_split_hypotheses(
    hypotheses: List[RoomHypothesis],
    wall_network: Any,
    min_area_px: float = 2000.0,
) -> List[SplitHypothesis]:
    """
    Generates split hypotheses for large candidate regions containing internal wall partitions.
    Only splits if actual interior partition wall segments exist.
    """
    splits: List[SplitHypothesis] = []
    if not wall_network or not hasattr(wall_network, "segments") or not wall_network.segments:
        return splits

    for hyp in hypotheses:
        # Only split if hypothesis is unusually large (> 300,000 px)
        if hyp.area_px < 300000.0:
            continue

        bx, by, bw, bh = hyp.bbox
        poly_pts = np.array([[p.xPx, p.yPx] for p in hyp.polygon])
        try:
            poly = ShapelyPolygon(poly_pts)
            if not poly.is_valid or poly.area <= 0:
                continue
        except Exception:
            continue

        # Look for interior partition wall segments (not bounding walls or furniture boxes)
        intersecting_walls = []
        for seg in wall_network.segments:
            sx1, sy1, sx2, sy2 = seg.x1, seg.y1, seg.x2, seg.y2
            seg_len = seg.length if (hasattr(seg, "length") and seg.length > 0) else np.hypot(sx2 - sx1, sy2 - sy1)
            # Segment must be strictly inside the bounding box and long structural wall
            if seg_len >= 80.0 and getattr(seg, "confidence", 1.0) >= 0.60:
                if (bx + 30 <= min(sx1, sx2) and max(sx1, sx2) <= bx + bw - 30) or \
                   (by + 30 <= min(sy1, sy2) and max(sy1, sy2) <= by + bh - 30):
                    line = LineString([(sx1, sy1), (sx2, sy2)])
                    if poly.intersects(line):
                        intersecting_walls.append(seg)

        if len(intersecting_walls) >= 1:
            mid_x = bx + bw / 2.0
            p1 = [AreaPoint(bx, by), AreaPoint(mid_x, by), AreaPoint(mid_x, by + bh), AreaPoint(bx, by + bh)]
            p2 = [AreaPoint(mid_x, by), AreaPoint(bx + bw, by), AreaPoint(bx + bw, by + bh), AreaPoint(mid_x, by + bh)]

            sub1 = RoomHypothesis(
                id=f"{hyp.id}_sub1",
                polygon=p1,
                source="partition",
                area_px=hyp.area_px / 2.0,
                bbox=(bx, by, bw / 2.0, bh),
                wall_support=hyp.wall_support,
                confidence=hyp.confidence + 0.10,
                is_accepted=True,
            )
            sub2 = RoomHypothesis(
                id=f"{hyp.id}_sub2",
                polygon=p2,
                source="partition",
                area_px=hyp.area_px / 2.0,
                bbox=(mid_x, by, bw / 2.0, bh),
                wall_support=hyp.wall_support,
                confidence=hyp.confidence + 0.10,
                is_accepted=True,
            )

            splits.append(
                SplitHypothesis(
                    parent_id=hyp.id,
                    sub_hypotheses=[sub1, sub2],
                    partition_wall_ids=[getattr(w, "id", f"wall_{idx}") for idx, w in enumerate(intersecting_walls)],
                    confidence_gain=0.10,
                )
            )

    return splits

def generate_merge_hypotheses(
    hypotheses: List[RoomHypothesis],
    wall_mask: np.ndarray,
) -> List[MergeHypothesis]:
    """
    Generates merge hypotheses for adjacent room candidates separated only by non-wall artifacts.
    Only merges weak sub-fragments, not primary cavity rooms.
    """
    merges: List[MergeHypothesis] = []
    if len(hypotheses) < 2:
        return merges

    for i in range(len(hypotheses)):
        for j in range(i + 1, len(hypotheses)):
            h1 = hypotheses[i]
            h2 = hypotheses[j]

            # Do not merge if both are accepted cavity rooms
            if h1.source == "cavity" and h2.source == "cavity" and h1.is_accepted and h2.is_accepted:
                continue

            # Only merge if one is weak partition fragment
            if h1.confidence < 0.40 or h2.confidence < 0.40:
                b1 = h1.bbox
                b2 = h2.bbox

                dx = max(0, max(b1[0], b2[0]) - min(b1[0] + b1[2], b2[0] + b2[2]))
                dy = max(0, max(b1[1], b2[1]) - min(b1[1] + b1[3], b2[1] + b2[3]))

                if dx <= 5 and dy <= 5:
                    min_x = min(b1[0], b2[0])
                    min_y = min(b1[1], b2[1])
                    max_x = max(b1[0] + b1[2], b2[0] + b2[2])
                    max_y = max(b1[1] + b1[3], b2[1] + b2[3])

                    merged_poly = [
                        AreaPoint(min_x, min_y),
                        AreaPoint(max_x, min_y),
                        AreaPoint(max_x, max_y),
                        AreaPoint(min_x, max_y),
                    ]

                    merged_hyp = RoomHypothesis(
                        id=f"merged_{h1.id}_{h2.id}",
                        polygon=merged_poly,
                        source="hybrid",
                        area_px=h1.area_px + h2.area_px,
                        bbox=(min_x, min_y, max_x - min_x, max_y - min_y),
                        wall_support=max(h1.wall_support, h2.wall_support),
                        confidence=max(h1.confidence, h2.confidence),
                        is_accepted=True,
                    )

                    merges.append(
                        MergeHypothesis(
                            child_ids=[h1.id, h2.id],
                            merged_hypothesis=merged_hyp,
                            separator_type="weak_stroke",
                            confidence_gain=0.05,
                        )
                    )

    return merges
