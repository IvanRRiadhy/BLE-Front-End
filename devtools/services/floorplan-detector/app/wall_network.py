"""
Architectural Wall Topology & Double-Line Wall Fusion Subsystem (Phase 2.7.3)
Extracts structural wall strokes, merges parallel double-line walls into canonical centerlines,
snaps corner junctions, and builds a topological wall network graph.
"""
import cv2
import numpy as np
from typing import List, Tuple, Dict, Any, Optional
from dataclasses import dataclass, field
from .models import DetectionConfig, WallSegmentDiagnostics

@dataclass
class WallSegment:
    id: str
    x1: float
    y1: float
    x2: float
    y2: float
    orientation: str  # "H", "V", "DIAG"
    thickness: float = 6.0
    confidence: float = 0.5
    length: float = 0.0
    is_centerline: bool = False
    paired_wall_id: Optional[str] = None
    intersection_count: int = 0
    enclosure_contribution: float = 0.0
    normalized_length: float = 0.0
    thickness_deviation: float = 0.0
    continuity_score: float = 0.0
    intersection_score: float = 0.0
    hatch_likelihood: float = 0.0
    text_likelihood: float = 0.0
    furniture_likelihood: float = 0.0
    architectural_confidence: float = 0.5
    classification: str = "probable_architectural"

    def __post_init__(self):
        if self.length == 0.0:
            self.length = float(np.hypot(self.x2 - self.x1, self.y2 - self.y1))

    def to_diagnostics(self) -> WallSegmentDiagnostics:
        return WallSegmentDiagnostics(
            id=self.id,
            x1=self.x1,
            y1=self.y1,
            x2=self.x2,
            y2=self.y2,
            orientation=self.orientation,
            thickness=self.thickness,
            confidence=self.confidence,
            length=self.length,
            normalized_length=self.normalized_length,
            thickness_deviation=self.thickness_deviation,
            continuity_score=self.continuity_score,
            intersection_score=self.intersection_score,
            hatch_likelihood=self.hatch_likelihood,
            text_likelihood=self.text_likelihood,
            furniture_likelihood=self.furniture_likelihood,
            architectural_confidence=self.architectural_confidence,
            classification=self.classification,
            is_centerline=self.is_centerline,
            paired_wall_id=self.paired_wall_id,
            intersection_count=self.intersection_count,
            enclosure_contribution=self.enclosure_contribution,
        )

@dataclass
class WallNode:
    id: str
    x: float
    y: float
    connected_segment_ids: List[str] = field(default_factory=list)

@dataclass
class WallNetwork:
    segments: List[WallSegment] = field(default_factory=list)
    nodes: List[WallNode] = field(default_factory=list)
    intersections: List[Tuple[float, float]] = field(default_factory=list)
    paired_segments: List[Tuple[WallSegment, WallSegment]] = field(default_factory=list)

def extract_wall_segments(binary: np.ndarray, config: DetectionConfig) -> List[WallSegment]:
    """
    Extracts continuous horizontal, vertical, and diagonal wall line segments
    from the binary wall mask using probabilistic Hough transform and contour fitting.
    """
    h, w = binary.shape[:2]
    # Scale min line length with image dimension to suppress micro-noise on high-res drawings (0.018 factor)
    adaptive_min_len = int(min(h, w) * 0.018)
    min_len = max(config.min_wall_segment_length_px, adaptive_min_len)
    max_gap = max(10, int(config.wall_close_kernel_size * 0.4))

    # Hough line segment detection
    lines = cv2.HoughLinesP(
        binary,
        rho=1,
        theta=np.pi / 180,
        threshold=45,
        minLineLength=min_len,
        maxLineGap=max_gap,
    )

    raw_segments: List[WallSegment] = []
    if lines is None:
        return raw_segments

    seg_idx = 1
    for line in lines:
        x1, y1, x2, y2 = [float(val) for val in line[0]]
        dx = abs(x2 - x1)
        dy = abs(y2 - y1)
        length = np.hypot(dx, dy)

        if length < min_len:
            continue

        # Classify orientation
        if dx >= 3.0 * dy:
            orient = "H"
        elif dy >= 3.0 * dx:
            orient = "V"
        else:
            orient = "DIAG"

        thick = 6.0
        conf = min(1.0, length / (min_len * 2.0))

        raw_segments.append(
            WallSegment(
                id=f"seg_{seg_idx:03d}",
                x1=x1,
                y1=y1,
                x2=x2,
                y2=y2,
                orientation=orient,
                thickness=thick,
                confidence=conf,
                length=length,
            )
        )
        seg_idx += 1

    # Merge co-linear segments with small gaps
    merged = merge_collinear_segments(raw_segments, gap_thresh=30.0)

    # Filter out short un-paired isolated segments that do not form structural walls
    filtered_segments: List[WallSegment] = []
    for seg in merged:
        # Retain long segments or segments with high confidence
        if seg.length >= min_len * 1.5 or seg.confidence >= 0.7:
            filtered_segments.append(seg)

    return filtered_segments if filtered_segments else merged

def merge_collinear_segments(segments: List[WallSegment], gap_thresh: float = 30.0) -> List[WallSegment]:
    """
    Merges co-linear wall segments with similar orientation separated by small gaps.
    """
    if not segments:
        return segments

    merged: List[WallSegment] = []
    h_segs = [s for s in segments if s.orientation == "H"]
    v_segs = [s for s in segments if s.orientation == "V"]
    other_segs = [s for s in segments if s.orientation == "DIAG"]

    # Merge Horizontal Segments
    h_segs.sort(key=lambda s: (round((s.y1 + s.y2) / 2.0 / 12.0), min(s.x1, s.x2)))
    used_h = set()
    for i, s1 in enumerate(h_segs):
        if i in used_h:
            continue
        y1_avg = (s1.y1 + s1.y2) / 2.0
        x1_min, x1_max = min(s1.x1, s1.x2), max(s1.x1, s1.x2)
        cur_x1, cur_x2 = x1_min, x1_max
        cur_y = y1_avg

        for j in range(i + 1, len(h_segs)):
            if j in used_h:
                continue
            s2 = h_segs[j]
            y2_avg = (s2.y1 + s2.y2) / 2.0
            x2_min, x2_max = min(s2.x1, s2.x2), max(s2.x1, s2.x2)

            if abs(y1_avg - y2_avg) <= 8.0:
                # Check overlap or small gap
                if x2_min <= cur_x2 + gap_thresh:
                    cur_x2 = max(cur_x2, x2_max)
                    cur_x1 = min(cur_x1, x2_min)
                    used_h.add(j)

        used_h.add(i)
        merged.append(
            WallSegment(
                id=f"h_fused_{len(merged)+1:03d}",
                x1=cur_x1,
                y1=cur_y,
                x2=cur_x2,
                y2=cur_y,
                orientation="H",
                thickness=s1.thickness,
                confidence=min(1.0, s1.confidence + 0.2),
            )
        )

    # Merge Vertical Segments
    v_segs.sort(key=lambda s: (round((s.x1 + s.x2) / 2.0 / 12.0), min(s.y1, s.y2)))
    used_v = set()
    for i, s1 in enumerate(v_segs):
        if i in used_v:
            continue
        x1_avg = (s1.x1 + s1.x2) / 2.0
        y1_min, y1_max = min(s1.y1, s1.y2), max(s1.y1, s1.y2)
        cur_y1, cur_y2 = y1_min, y1_max
        cur_x = x1_avg

        for j in range(i + 1, len(v_segs)):
            if j in used_v:
                continue
            s2 = v_segs[j]
            x2_avg = (s2.x1 + s2.x2) / 2.0
            y2_min, y2_max = min(s2.y1, s2.y2), max(s2.y1, s2.y2)

            if abs(x1_avg - x2_avg) <= 8.0:
                if y2_min <= cur_y2 + gap_thresh:
                    cur_y2 = max(cur_y2, y2_max)
                    cur_y1 = min(cur_y1, y2_min)
                    used_v.add(j)

        used_v.add(i)
        merged.append(
            WallSegment(
                id=f"v_fused_{len(merged)+1:03d}",
                x1=cur_x,
                y1=cur_y1,
                x2=cur_x,
                y2=cur_y2,
                orientation="V",
                thickness=s1.thickness,
                confidence=min(1.0, s1.confidence + 0.2),
            )
        )

    return merged + other_segs

def fuse_double_line_walls(
    segments: List[WallSegment], config: DetectionConfig
) -> Tuple[List[WallSegment], List[Tuple[WallSegment, WallSegment]]]:
    """
    Phase 2.7.3 Double-Line Wall Fusion.
    Detects parallel wall line pairs within max_parallel_wall_dist_px (6..45px)
    and merges them into a single canonical centerline wall entity.
    """
    if not config.enable_double_line_fusion or not segments:
        return segments, []

    max_dist = float(config.max_parallel_wall_dist_px)
    min_dist = 5.0
    min_overlap = config.min_parallel_wall_overlap_ratio

    fused_segments: List[WallSegment] = []
    paired_tuples: List[Tuple[WallSegment, WallSegment]] = []
    fused_ids = set()

    h_segs = [s for s in segments if s.orientation == "H"]
    v_segs = [s for s in segments if s.orientation == "V"]
    other_segs = [s for s in segments if s.orientation not in ("H", "V")]

    # Fuse Horizontal Pairs
    for i, s1 in enumerate(h_segs):
        if s1.id in fused_ids:
            continue
        y1 = (s1.y1 + s1.y2) / 2.0
        x1_min, x1_max = min(s1.x1, s1.x2), max(s1.x1, s1.x2)
        len1 = x1_max - x1_min

        best_pair = None
        best_dist = max_dist + 1.0

        for j, s2 in enumerate(h_segs):
            if i == j or s2.id in fused_ids:
                continue
            y2 = (s2.y1 + s2.y2) / 2.0
            dist = abs(y1 - y2)

            if min_dist <= dist <= max_dist:
                x2_min, x2_max = min(s2.x1, s2.x2), max(s2.x1, s2.x2)
                overlap = max(0.0, min(x1_max, x2_max) - max(x1_min, x2_min))
                min_len = max(1.0, min(len1, x2_max - x2_min))

                if (overlap / min_len) >= min_overlap:
                    if dist < best_dist:
                        best_dist = dist
                        best_pair = s2

        if best_pair is not None:
            # Create canonical centerline
            s2 = best_pair
            y_center = (y1 + (s2.y1 + s2.y2) / 2.0) / 2.0
            x_min = min(x1_min, min(s2.x1, s2.x2))
            x_max = max(x1_max, max(s2.x1, s2.x2))
            estimated_thick = best_dist + ((s1.thickness + s2.thickness) / 2.0)

            centerline = WallSegment(
                id=f"h_centerline_{len(fused_segments)+1:03d}",
                x1=x_min,
                y1=y_center,
                x2=x_max,
                y2=y_center,
                orientation="H",
                thickness=estimated_thick,
                confidence=min(1.0, max(s1.confidence, s2.confidence) + 0.35),
                is_centerline=True,
                paired_wall_id=s2.id,
            )
            s1.paired_wall_id = s2.id
            s2.paired_wall_id = s1.id
            fused_ids.add(s1.id)
            fused_ids.add(s2.id)

            fused_segments.append(centerline)
            paired_tuples.append((s1, s2))
        else:
            fused_segments.append(s1)

    # Fuse Vertical Pairs
    for i, s1 in enumerate(v_segs):
        if s1.id in fused_ids:
            continue
        x1 = (s1.x1 + s1.x2) / 2.0
        y1_min, y1_max = min(s1.y1, s1.y2), max(s1.y1, s1.y2)
        len1 = y1_max - y1_min

        best_pair = None
        best_dist = max_dist + 1.0

        for j, s2 in enumerate(v_segs):
            if i == j or s2.id in fused_ids:
                continue
            x2 = (s2.x1 + s2.x2) / 2.0
            dist = abs(x1 - x2)

            if min_dist <= dist <= max_dist:
                y2_min, y2_max = min(s2.y1, s2.y2), max(s2.y1, s2.y2)
                overlap = max(0.0, min(y1_max, y2_max) - max(y1_min, y2_min))
                min_len = max(1.0, min(len1, y2_max - y2_min))

                if (overlap / min_len) >= min_overlap:
                    if dist < best_dist:
                        best_dist = dist
                        best_pair = s2

        if best_pair is not None:
            # Create canonical centerline
            s2 = best_pair
            x_center = (x1 + (s2.x1 + s2.x2) / 2.0) / 2.0
            y_min = min(y1_min, min(s2.y1, s2.y2))
            y_max = max(y1_max, max(s2.y1, s2.y2))
            estimated_thick = best_dist + ((s1.thickness + s2.thickness) / 2.0)

            centerline = WallSegment(
                id=f"v_centerline_{len(fused_segments)+1:03d}",
                x1=x_center,
                y1=y_min,
                x2=x_center,
                y2=y_max,
                orientation="V",
                thickness=estimated_thick,
                confidence=min(1.0, max(s1.confidence, s2.confidence) + 0.35),
                is_centerline=True,
                paired_wall_id=s2.id,
            )
            s1.paired_wall_id = s2.id
            s2.paired_wall_id = s1.id
            fused_ids.add(s1.id)
            fused_ids.add(s2.id)

            fused_segments.append(centerline)
            paired_tuples.append((s1, s2))
        else:
            fused_segments.append(s1)

    return fused_segments + other_segs, paired_tuples

def find_segment_intersections(segments: List[WallSegment], snap_radius: float = 18.0) -> List[Tuple[float, float]]:
    """
    Finds horizontal and vertical wall segment intersection points and snaps corner junctions.
    """
    intersections: List[Tuple[float, float]] = []
    h_segs = [s for s in segments if s.orientation == "H"]
    v_segs = [s for s in segments if s.orientation == "V"]

    for hs in h_segs:
        hx_min, hx_max = min(hs.x1, hs.x2), max(hs.x1, hs.x2)
        hy = (hs.y1 + hs.y2) / 2.0

        for vs in v_segs:
            vy_min, vy_max = min(vs.y1, vs.y2), max(vs.y1, vs.y2)
            vx = (vs.x1 + vs.x2) / 2.0

            # Check bounding box overlap with snap radius
            if (hx_min - snap_radius) <= vx <= (hx_max + snap_radius) and (vy_min - snap_radius) <= hy <= (vy_max + snap_radius):
                intersections.append((vx, hy))
                hs.intersection_count += 1
                vs.intersection_count += 1

    return intersections

def build_wall_network(segments: List[WallSegment], config: DetectionConfig) -> WallNetwork:
    """
    Constructs the WallNetwork graph with nodes, segments, and corner intersections.
    """
    intersections = find_segment_intersections(segments, float(config.snap_intersection_radius_px))

    nodes: List[WallNode] = []
    node_idx = 1
    for ix, iy in intersections:
        nodes.append(WallNode(id=f"node_{node_idx:03d}", x=ix, y=iy))
        node_idx += 1

    return WallNetwork(
        segments=segments,
        nodes=nodes,
        intersections=intersections,
    )

def classify_segment(confidence: float) -> str:
    if confidence >= 0.70:
        return "architectural"
    elif confidence >= 0.50:
        return "probable_architectural"
    elif confidence >= 0.35:
        return "uncertain"
    elif confidence >= 0.20:
        return "probable_artifact"
    else:
        return "artifact"

def compute_stroke_confidence(
    segments: List[WallSegment],
    image_shape: Tuple[int, int],
    config: DetectionConfig,
) -> List[WallSegment]:
    """
    Computes normalized resolution-independent stroke confidence and likelihood scores for every segment.
    Evaluates normalized length, thickness consistency, continuity, intersections, hatch patterns, and text.
    """
    if not segments:
        return segments

    h, w = image_shape
    min_dim = float(min(h, w))
    
    # 1. Median thickness across segments
    thicknesses = [s.thickness for s in segments if s.thickness > 0]
    median_thick = float(np.median(thicknesses)) if thicknesses else 6.0

    # 2. Group segments by orientation for hatch and continuity analysis
    h_segs = [s for s in segments if s.orientation == "H"]
    v_segs = [s for s in segments if s.orientation == "V"]

    for seg in segments:
        # A. Normalized length (resolution-independent)
        seg.normalized_length = seg.length / min_dim
        norm_len_score = min(1.0, seg.normalized_length / 0.08)  # Saturation at 8% of min dimension

        # B. Thickness consistency
        thick_dev = abs(seg.thickness - median_thick)
        seg.thickness_deviation = float(thick_dev)
        thick_score = max(0.0, 1.0 - (thick_dev / max(1.0, median_thick)))

        # C. Continuity score
        if seg.orientation == "H":
            same_orient = [s for s in h_segs if s.id != seg.id and abs(((s.y1+s.y2)/2) - ((seg.y1+seg.y2)/2)) < 15.0]
        elif seg.orientation == "V":
            same_orient = [s for s in v_segs if s.id != seg.id and abs(((s.x1+s.x2)/2) - ((seg.x1+seg.x2)/2)) < 15.0]
        else:
            same_orient = []
        
        continuity_score = min(1.0, len(same_orient) * 0.35)
        seg.continuity_score = float(continuity_score)

        # D. Intersection score
        intersection_score = min(1.0, seg.intersection_count * 0.40)
        seg.intersection_score = float(intersection_score)

        # E. Hatch Pattern Likelihood: Dense parallel short segments without pairing or centerline status
        if seg.orientation == "H":
            nearby_parallel = [s for s in h_segs if s.id != seg.id and abs(((s.y1+s.y2)/2) - ((seg.y1+seg.y2)/2)) < 50.0]
        elif seg.orientation == "V":
            nearby_parallel = [s for s in v_segs if s.id != seg.id and abs(((s.x1+s.x2)/2) - ((seg.x1+seg.x2)/2)) < 50.0]
        else:
            nearby_parallel = []

        if not seg.is_centerline and seg.paired_wall_id is None and len(nearby_parallel) >= 3 and seg.normalized_length < 0.05:
            seg.hatch_likelihood = min(1.0, (len(nearby_parallel) - 2) * 0.25)
        else:
            seg.hatch_likelihood = 0.0

        # F. Text Likelihood: Short isolated non-centerline stroke with zero intersections
        if not seg.is_centerline and seg.paired_wall_id is None and seg.intersection_count == 0 and seg.normalized_length < 0.025:
            seg.text_likelihood = min(1.0, (0.025 - seg.normalized_length) / 0.025)
        else:
            seg.text_likelihood = 0.0

        # G. Composite Architectural Confidence Calculation
        raw_conf = (
            0.25 * norm_len_score +
            0.20 * thick_score +
            0.20 * continuity_score +
            0.20 * intersection_score +
            0.15 * min(1.0, seg.enclosure_contribution + (1.0 if seg.is_centerline else 0.0))
        )

        final_conf = max(0.0, min(1.0, raw_conf - (0.35 * seg.text_likelihood) - (0.40 * seg.hatch_likelihood) - (0.30 * seg.furniture_likelihood)))
        seg.architectural_confidence = float(final_conf)
        seg.confidence = float(final_conf)
        seg.classification = classify_segment(final_conf)

    return segments

def render_wall_network_mask(
    segments: List[WallSegment],
    image_shape: Tuple[int, int],
    config: DetectionConfig,
) -> np.ndarray:
    """
    Renders the canonical fused wall network onto a watertight binary wall mask.
    Enforces thickness clamping and filters out isolated internal noise strokes based on architectural confidence.
    """
    h, w = image_shape
    mask = np.zeros((h, w), dtype=np.uint8)

    for seg in segments:
        # Filter out artifact segments or un-paired short noise strokes with architecturalConfidence < 0.20
        if not seg.is_centerline and seg.paired_wall_id is None:
            if seg.architectural_confidence < 0.20 or (seg.intersection_count == 0 and seg.confidence < 0.35 and seg.normalized_length < 0.015):
                continue

        # Clamp rendering thickness: centerlines get 3..14px, raw segments get 2..10px
        if seg.is_centerline:
            thickness = int(max(3, min(14, round(seg.thickness * 0.35))))
        else:
            thickness = int(max(2, min(10, round(seg.thickness * 0.5))))

        pt1 = (int(round(seg.x1)), int(round(seg.y1)))
        pt2 = (int(round(seg.x2)), int(round(seg.y2)))
        cv2.line(mask, pt1, pt2, 255, thickness=thickness)

    # Consolidate intersections with a small square kernel
    consolidate_k = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, consolidate_k)

    return mask
