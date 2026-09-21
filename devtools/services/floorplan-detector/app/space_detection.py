"""
Space and Candidate Room Detection Subsystem (Phase 2.6)
Implements architectural interior region filtering:
- Building footprint estimation (separating building interior from exterior site/roads)
- Candidate region feature extraction (wall support, footprint containment, shape metrics)
- Deterministic heuristic room scoring
- Enriched visual diagnostics (08_candidates.png)
"""
import cv2
import numpy as np
from typing import List, Tuple, Dict, Any, Optional
from .models import DetectionConfig, CandidateRegionFeatures, AreaPoint

def remove_exterior_background(free_space: np.ndarray) -> np.ndarray:
    """
    Eliminates the exterior outside-building background using flood-fill from boundaries.
    Any free space connected to the image border represents the outside world.
    (Preserved for backward-compatibility with direct callers).
    """
    h, w = free_space.shape
    padded = cv2.copyMakeBorder(free_space, 2, 2, 2, 2, cv2.BORDER_CONSTANT, value=255)
    ph, pw = padded.shape
    mask_for_flood = np.zeros((ph + 2, pw + 2), dtype=np.uint8)

    cv2.floodFill(padded, mask_for_flood, (0, 0), 0)
    cv2.floodFill(padded, mask_for_flood, (pw - 1, 0), 0)
    cv2.floodFill(padded, mask_for_flood, (0, ph - 1), 0)
    cv2.floodFill(padded, mask_for_flood, (pw - 1, ph - 1), 0)

    return padded[2:h + 2, 2:w + 2]

def estimate_building_envelope(
    structural_walls: np.ndarray,
    total_shape: Tuple[int, int],
    config: DetectionConfig,
) -> np.ndarray:
    """
    Estimates the dominant architectural building envelope.
    Tolerates openings in the exterior perimeter (doors, balconies, terraces)
    without dilating interior walls or altering room geometry.
    """
    h, w = total_shape
    envelope_mask = np.zeros((h, w), dtype=np.uint8)

    if np.count_nonzero(structural_walls) == 0:
        envelope_mask[2:h-2, 2:w-2] = 255
        return envelope_mask

    # 1. Filter out thin site lines (roads, fences), keep solid structural walls
    open_k = cv2.getStructuringElement(cv2.MORPH_RECT, (7, 7))
    isolated = cv2.morphologyEx(structural_walls, cv2.MORPH_OPEN, open_k)

    # 2. Cluster structural walls into the architectural partition network
    close_radius = max(40, int(min(h, w) * 0.12))
    close_k = cv2.getStructuringElement(cv2.MORPH_RECT, (close_radius, close_radius))
    aggregated = cv2.morphologyEx(isolated, cv2.MORPH_CLOSE, close_k)

    # 3. Find outer contours of building clusters
    contours, _ = cv2.findContours(aggregated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        envelope_mask[2:h-2, 2:w-2] = 255
        return envelope_mask

    min_cluster_area = (h * w) * config.envelope_min_area_ratio
    found = False
    for c in contours:
        if cv2.contourArea(c) >= min_cluster_area:
            hull = cv2.convexHull(c)
            cv2.drawContours(envelope_mask, [hull], -1, 255, -1)
            found = True

    if not found and contours:
        largest = max(contours, key=cv2.contourArea)
        cv2.drawContours(envelope_mask, [cv2.convexHull(largest)], -1, 255, -1)

    # 4. For floorplans cropped tightly to building walls (where walls touch canvas borders),
    # anchor the outer perimeter along those touching borders
    touch_thresh = max(3, int(min(h, w) * 0.01))
    if np.count_nonzero(structural_walls[0, :]) > touch_thresh:
        envelope_mask[0:3, :] = 255
    if np.count_nonzero(structural_walls[h-1, :]) > touch_thresh:
        envelope_mask[h-3:h, :] = 255
    if np.count_nonzero(structural_walls[:, 0]) > touch_thresh:
        envelope_mask[:, 0:3] = 255
    if np.count_nonzero(structural_walls[:, w-1]) > touch_thresh:
        envelope_mask[:, w-3:w] = 255

    # 5. Fill any enclosed internal holes in the envelope
    hole_cnts, _ = cv2.findContours(envelope_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if hole_cnts:
        cv2.drawContours(envelope_mask, hole_cnts, -1, 255, -1)

    return envelope_mask

def detect_exterior_openings(
    envelope_mask: np.ndarray,
    structural_walls: np.ndarray,
    config: DetectionConfig,
) -> Tuple[np.ndarray, List[Dict[str, Any]]]:
    """
    Identifies exterior openings (doorways, balconies, terraces) along the building envelope.
    An exterior opening is a segment of the envelope perimeter where structural walls are absent.
    
    Returns:
    - openings_mask: Binary mask of detected opening segments on the perimeter.
    - openings_meta: List of opening metadata dicts.
    """
    h, w = envelope_mask.shape
    openings_mask = np.zeros((h, w), dtype=np.uint8)
    openings_meta: List[Dict[str, Any]] = []

    if np.count_nonzero(envelope_mask) == 0:
        return openings_mask, openings_meta

    # 1. Extract boundary band of the building envelope using BORDER_CONSTANT
    kernel_band = cv2.getStructuringElement(cv2.MORPH_RECT, (7, 7))
    eroded_env = cv2.erode(envelope_mask, kernel_band, borderType=cv2.BORDER_CONSTANT, borderValue=0)
    boundary_band = cv2.subtract(envelope_mask, eroded_env)

    # 2. Candidate opening pixels: boundary band pixels where structural walls are absent
    dilated_walls = cv2.dilate(structural_walls, cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5)))
    raw_openings = cv2.bitwise_and(boundary_band, cv2.bitwise_not(dilated_walls))

    # 3. Group contiguous opening pixels into individual architectural openings
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(raw_openings, connectivity=8)

    max_span = config.max_exterior_opening_px
    min_span = config.min_exterior_opening_px

    for label in range(1, num_labels):
        stat = stats[label]
        bx, by, bw, bh, area = int(stat[cv2.CC_STAT_LEFT]), int(stat[cv2.CC_STAT_TOP]), int(stat[cv2.CC_STAT_WIDTH]), int(stat[cv2.CC_STAT_HEIGHT]), int(stat[cv2.CC_STAT_AREA])
        
        # Span approximation: diagonal / max dimension of the bounding box
        span = float(max(bw, bh))

        # Filter out tiny sub-pixel noise and excessively large non-architectural openings
        if span < min_span or span > max_span * 2.0:
            continue

        # Classify opening
        if span <= 45:
            op_type = "single_doorway"
        elif span <= 80:
            op_type = "double_doorway"
        elif span <= 130:
            op_type = "balcony_opening"
        else:
            op_type = "terrace_opening"

        cx, cy = float(centroids[label][0]), float(centroids[label][1])
        op_mask = (labels == label)
        openings_mask[op_mask] = 255

        openings_meta.append({
            "id": f"ext_opening_{len(openings_meta) + 1}",
            "type": op_type,
            "bbox": [bx, by, bw, bh],
            "span_px": round(span, 1),
            "area_px": area,
            "center": [round(cx, 1), round(cy, 1)],
        })

    # Dilate openings slightly along the boundary to ensure watertight bridge across the gap
    bridge_k = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    openings_mask = cv2.dilate(openings_mask, bridge_k)
    # Ensure bridge stays on or immediately adjacent to envelope boundary
    openings_mask = cv2.bitwise_and(openings_mask, envelope_mask)

    return openings_mask, openings_meta

def envelope_aware_exterior_removal(
    free_space: np.ndarray,
    wall_mask: np.ndarray,
    structural_walls: np.ndarray,
    config: DetectionConfig,
) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, List[Dict[str, Any]], Dict[str, Any]]:
    """
    Performs envelope-aware exterior background removal.
    
    Returns:
    - interior_space: Retained interior free space.
    - envelope_mask: Estimated building envelope.
    - openings_mask: Detected exterior openings.
    - exterior_mask: Isolated exterior site/background mask.
    - openings_meta: List of opening metadata dicts.
    - stats: Diagnostic statistics dict.
    """
    h, w = free_space.shape
    total_area = h * w

    if not config.enable_envelope_boundary:
        # Fallback to classical unconstrained flood-fill
        interior_space = remove_exterior_background(free_space)
        envelope_mask = estimate_building_footprint(structural_walls, (h, w))
        openings_mask = np.zeros((h, w), dtype=np.uint8)
        exterior_mask = cv2.subtract(free_space, interior_space)
        stats = {
            "envelope_area_px": int(np.count_nonzero(envelope_mask)),
            "exterior_area_px": int(np.count_nonzero(exterior_mask)),
            "retained_interior_px": int(np.count_nonzero(interior_space)),
            "retention_ratio": round(float(np.count_nonzero(interior_space)) / max(1, np.count_nonzero(free_space)), 4),
            "detected_openings_count": 0,
        }
        return interior_space, envelope_mask, openings_mask, exterior_mask, [], stats

    # 1. Estimate Building Envelope
    envelope_mask = estimate_building_envelope(structural_walls, (h, w), config)

    # 2. Detect Exterior Openings along Envelope Boundary
    openings_mask, openings_meta = detect_exterior_openings(envelope_mask, structural_walls, config)

    # 3. Create Sealed Wall Mask (ONLY seals exterior openings on the perimeter; interior is untouched)
    sealed_walls = cv2.bitwise_or(wall_mask, openings_mask)

    # 4. Flood-fill out exterior background from borders
    free_sealed = cv2.bitwise_not(sealed_walls)
    padded = cv2.copyMakeBorder(free_sealed, 2, 2, 2, 2, cv2.BORDER_CONSTANT, value=255)
    ph, pw = padded.shape
    mask_for_flood = np.zeros((ph + 2, pw + 2), dtype=np.uint8)

    # Flood fill corners
    cv2.floodFill(padded, mask_for_flood, (0, 0), 0)
    cv2.floodFill(padded, mask_for_flood, (pw - 1, 0), 0)
    cv2.floodFill(padded, mask_for_flood, (0, ph - 1), 0)
    cv2.floodFill(padded, mask_for_flood, (pw - 1, ph - 1), 0)

    # Any area outside envelope touching image edges is flooded
    unpadded_flooded = padded[2:h + 2, 2:w + 2]
    exterior_mask = (unpadded_flooded == 0).astype(np.uint8) * 255

    # 5. Retained Interior Space
    # Free space with exterior background removed (flood-filled outside sealed perimeter)
    interior_space = cv2.bitwise_and(free_space, cv2.bitwise_not(exterior_mask))

    tot_free = int(np.count_nonzero(free_space))
    int_px = int(np.count_nonzero(interior_space))
    ext_px = int(np.count_nonzero(exterior_mask))
    env_px = int(np.count_nonzero(envelope_mask))
    retention_ratio = round(float(int_px) / max(1, tot_free), 4)

    stats = {
        "envelope_area_px": env_px,
        "exterior_area_px": ext_px,
        "retained_interior_px": int_px,
        "retention_ratio": retention_ratio,
        "detected_openings_count": len(openings_meta),
    }

    return interior_space, envelope_mask, openings_mask, exterior_mask, openings_meta, stats

def estimate_building_footprint(thick_walls: np.ndarray, total_shape: Tuple[int, int]) -> np.ndarray:
    """
    Estimates the dominant architectural building envelope.
    In complex architectural and site plans, structural walls form a dense cluster
    defining the building, while access roads, fences, and parking are peripheral.
    """
    h, w = total_shape
    footprint_mask = np.zeros((h, w), dtype=np.uint8)

    # 1. Filter out thin site lines; keep heavy structural partitions
    open_k = cv2.getStructuringElement(cv2.MORPH_RECT, (7, 7))
    isolated_structural = cv2.morphologyEx(thick_walls, cv2.MORPH_OPEN, open_k)

    # 2. Morphological aggregation of partition network
    close_radius = max(40, int(min(h, w) * 0.12))
    close_k = cv2.getStructuringElement(cv2.MORPH_RECT, (close_radius, close_radius))
    aggregated = cv2.morphologyEx(isolated_structural, cv2.MORPH_CLOSE, close_k)

    # 3. Find outer contours of structural clusters
    contours, _ = cv2.findContours(aggregated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        # Fallback: assume whole non-border canvas is footprint
        footprint_mask[10:h-10, 10:w-10] = 255
        return footprint_mask

    # Retain significant building clusters (area > 3% of canvas)
    min_cluster_area = (h * w) * 0.03
    found_clusters = False
    for c in contours:
        if cv2.contourArea(c) >= min_cluster_area:
            hull = cv2.convexHull(c)
            cv2.drawContours(footprint_mask, [hull], -1, 255, -1)
            found_clusters = True

    if not found_clusters:
        # If no single large cluster, use largest available contour
        largest = max(contours, key=cv2.contourArea)
        cv2.drawContours(footprint_mask, [cv2.convexHull(largest)], -1, 255, -1)

    return footprint_mask

def compute_wall_support(candidate_mask: np.ndarray, wall_contact_zone: np.ndarray) -> float:
    """
    Calculates what fraction of the candidate's outer perimeter directly abuts
    solid structural walls. Real rooms are bounded by walls on >= 30-80% of their perimeter.
    Phantom enclosures or open outdoor site areas typically have < 25% wall support.
    """
    if candidate_mask is None or candidate_mask.size == 0 or np.count_nonzero(candidate_mask) == 0:
        return 0.0

    # Crop to candidate bounding box for memory safety on ultra-high-resolution floorplans
    pts = cv2.findNonZero(candidate_mask)
    if pts is None:
        return 0.0
    bx, by, bw, bh = cv2.boundingRect(pts)
    pad = 2
    h, w = candidate_mask.shape[:2]
    x1 = max(0, bx - pad)
    y1 = max(0, by - pad)
    x2 = min(w, bx + bw + pad)
    y2 = min(h, by + bh + pad)

    local_cand = candidate_mask[y1:y2, x1:x2]
    local_wcz = wall_contact_zone[y1:y2, x1:x2]

    # Extract 1-pixel perimeter of candidate cavity
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    eroded = cv2.erode(local_cand, kernel, iterations=1)
    perimeter_mask = cv2.subtract(local_cand, eroded)

    total_perimeter_px = np.count_nonzero(perimeter_mask)
    if total_perimeter_px == 0:
        return 0.0

    contact_px = np.count_nonzero(cv2.bitwise_and(perimeter_mask, local_wcz))
    return min(1.0, float(contact_px) / float(total_perimeter_px))

def extract_candidate_features(
    label: int,
    region_mask: np.ndarray,
    stat: np.ndarray,
    wall_contact_zone: np.ndarray,
    footprint_mask: np.ndarray,
    gradient_img: Optional[np.ndarray],
    total_area: int,
    image_shape: Tuple[int, int],
    estimated_wall_thickness: float = 10.0,
) -> CandidateRegionFeatures:
    """
    Extracts deterministic geometric and architectural features for a candidate cavity.
    """
    h, w = image_shape
    x = int(stat[cv2.CC_STAT_LEFT])
    y = int(stat[cv2.CC_STAT_TOP])
    width = int(stat[cv2.CC_STAT_WIDTH])
    height = int(stat[cv2.CC_STAT_HEIGHT])
    area_px = float(stat[cv2.CC_STAT_AREA])

    # Aspect ratio & rectangularity
    aspect_ratio = max(width / max(1, height), height / max(1, width))
    bbox_area = max(1, width * height)
    rectangularity = area_px / bbox_area

    # Convexity (Solidity) & Compactness
    mask_u8 = region_mask.astype(np.uint8) * 255
    contours, _ = cv2.findContours(mask_u8, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if contours:
        cnt = contours[0]
        hull = cv2.convexHull(cnt)
        hull_area = cv2.contourArea(hull)
        convexity = (area_px / hull_area) if hull_area > 0 else 0.0
        peri = cv2.arcLength(cnt, closed=True)
        compactness = (4.0 * np.pi * area_px / (peri ** 2)) if peri > 0 else 0.0
    else:
        convexity = rectangularity
        compactness = rectangularity

    # Distance to canvas border
    border_distance = float(min(x, y, w - (x + width), h - (y + height)))

    # Footprint containment ratio
    if footprint_mask.shape != mask_u8.shape:
        fp_mask = cv2.resize(footprint_mask, (w, h), interpolation=cv2.INTER_NEAREST)
    else:
        fp_mask = footprint_mask
    inside_footprint_px = np.count_nonzero(cv2.bitwise_and(mask_u8, fp_mask))
    footprint_containment = float(inside_footprint_px) / area_px if area_px > 0 else 0.0

    # Wall support ratio & enclosure score
    if wall_contact_zone.shape != mask_u8.shape:
        wcz = cv2.resize(wall_contact_zone, (w, h), interpolation=cv2.INTER_NEAREST)
    else:
        wcz = wall_contact_zone
    wall_support_ratio = compute_wall_support(mask_u8, wcz)
    enclosure_score = min(1.0, wall_support_ratio * 1.3)

    # Interior edge density
    if gradient_img is not None and area_px > 0:
        interior_grad = cv2.mean(gradient_img, mask=mask_u8)[0]
        interior_edge_density = float(interior_grad) / 255.0
    else:
        interior_edge_density = 0.0

    # Furniture likelihood: high interior edge density + moderate area + low wall support
    furniture_likelihood = 0.0
    if area_px < 4000 and interior_edge_density > 0.10 and wall_support_ratio < 0.50:
        furniture_likelihood = min(1.0, (interior_edge_density * 3.5) + (0.50 - wall_support_ratio) * 2.0)

    # Text penalty: small bounding box with high aspect ratio or tiny stroke area
    text_penalty = 0.0
    if area_px < 600 and (width < 35 or height < 25) and aspect_ratio > 3.0:
        text_penalty = 0.8

    return CandidateRegionFeatures(
        label=label,
        area_px=area_px,
        bbox=(x, y, width, height),
        aspect_ratio=aspect_ratio,
        rectangularity=rectangularity,
        convexity=convexity,
        compactness=compactness,
        border_distance=border_distance,
        footprint_containment=footprint_containment,
        wall_support_ratio=wall_support_ratio,
        interior_edge_density=interior_edge_density,
        furniture_likelihood=furniture_likelihood,
        text_penalty=text_penalty,
        enclosure_score=enclosure_score,
        estimated_wall_thickness_px=estimated_wall_thickness,
        room_score=0.0,
        is_accepted=False,
    )

def score_candidate_region(
    features: CandidateRegionFeatures,
    config: DetectionConfig,
    total_area: int,
) -> Tuple[float, bool, Optional[str]]:
    """
    Computes deterministic heuristic room score and determines acceptance/rejection.
    
    Returns:
    - room_score: [0.0, 1.0]
    - is_accepted: bool
    - rejection_reason: str or None
    """
    # 1. Hard Rejections
    if features.border_distance <= 1 and features.footprint_containment < 0.70:
        return 0.0, False, "touching_border"

    # Relative minimum room area calculation:
    # Phase 2.7.4 Context-Aware Small Room Recovery:
    # Cavities below min_room_area_px are accepted if they have strong wall support (>=0.60)
    # and footprint containment (>=0.75) with low furniture/text likelihood.
    if features.area_px < config.min_room_area_px:
        if features.wall_support_ratio < 0.60 or features.footprint_containment < 0.75 or features.furniture_likelihood > 0.20 or features.text_penalty > 0.20:
            return 0.0, False, "too_small"

    if features.area_px > total_area * config.max_room_area_ratio:
        return 0.0, False, "too_large"

    if features.aspect_ratio > 18.0:
        return 0.1, False, "extreme_aspect_ratio"

    if features.footprint_containment < config.min_footprint_containment:
        return 0.15, False, "outside_building_footprint"

    if features.furniture_likelihood > 0.70:
        return 0.15, False, "furniture_artifact"

    if features.text_penalty > 0.70:
        return 0.10, False, "text_annotation"

    if features.wall_support_ratio < config.min_wall_support_ratio:
        return 0.2, False, "poor_wall_support"

    # 2. Heuristic Scoring
    # S_wall: Rewards perimeter surrounded by structural walls
    s_wall = min(1.0, features.wall_support_ratio / 0.65)

    # S_footprint: Full score if fully inside building envelope
    s_footprint = min(1.0, features.footprint_containment)

    # S_shape: Rewards rectangular & L-shaped convexity (L-shaped convexity ~0.70-0.85)
    if features.convexity >= 0.65 and features.aspect_ratio <= 4.0:
        s_shape = 1.0
    elif features.convexity >= 0.45 and features.aspect_ratio <= 6.0:
        s_shape = 0.8
    else:
        s_shape = max(0.2, features.convexity)

    # S_size: Normal room size relative to canvas
    effective_min_area = float(config.min_room_area_px)
    s_size = 1.0 if (features.area_px >= effective_min_area * 1.5) else 0.7

    # S_interior: Cleaner interior (less road/terrain gradient)
    s_interior = max(0.3, 1.0 - features.interior_edge_density * 2.0)

    # Composite Heuristic Formula
    raw_score = (
        0.35 * s_wall +
        0.25 * s_footprint +
        0.20 * s_shape +
        0.10 * s_size +
        0.10 * s_interior
    )

    # Apply furniture and text penalties
    room_score = max(0.0, raw_score - (features.furniture_likelihood * config.furniture_penalty) - (features.text_penalty * config.text_penalty))

    is_accepted = room_score >= config.min_room_score
    reason = None if is_accepted else "low_heuristic_score"

    return room_score, is_accepted, reason

def segment_enclosed_spaces(
    wall_mask: np.ndarray,
    config: DetectionConfig,
    thick_walls: Optional[np.ndarray] = None,
    gradient_img: Optional[np.ndarray] = None,
    estimated_wall_thickness: float = 10.0,
    struct_lines: Optional[np.ndarray] = None,
) -> Tuple[np.ndarray, List[np.ndarray], Dict[str, Any], np.ndarray, np.ndarray, List[CandidateRegionFeatures]]:
    """
    Isolates, analyzes, and classifies candidate enclosed room spaces.
    
    Returns:
    - space_mask: Consolidated binary mask of accepted rooms.
    - room_masks: Individual room binary masks.
    - stats: Diagnostic statistics dictionary.
    - candidates_vis: Rich color-coded candidate diagnostic image.
    - footprint_mask: Estimated building footprint mask.
    - candidate_features_list: List of CandidateRegionFeatures.
    """
    h, w = wall_mask.shape
    total_area = h * w
    structural_walls = thick_walls if thick_walls is not None else wall_mask

    # 1. Invert wall mask to get all non-wall space
    free_space = cv2.bitwise_not(wall_mask)

    # 2. Envelope-Aware Exterior Background Removal (Phase 2.7.1)
    interior_space, footprint_mask, openings_mask, exterior_mask, openings_meta, ext_stats = (
        envelope_aware_exterior_removal(
            free_space=free_space,
            wall_mask=wall_mask,
            structural_walls=structural_walls,
            config=config,
        )
    )

    # Precompute wall contact zone with search buffer
    search_ksize = max(11, int(config.wall_close_kernel_size * 0.35))
    search_k = cv2.getStructuringElement(cv2.MORPH_RECT, (search_ksize, search_ksize))
    wall_contact_zone = cv2.dilate(structural_walls, search_k)

    # 4. Connected Components Analysis on candidate cavities
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(
        interior_space, connectivity=8
    )

    space_mask = np.zeros((h, w), dtype=np.uint8)
    candidates_vis = np.zeros((h, w, 3), dtype=np.uint8)
    room_masks: List[np.ndarray] = []
    candidate_features_list: List[CandidateRegionFeatures] = []

    candidates_count = num_labels - 1
    rejected_reasons: Dict[str, int] = {
        "too_small": 0,
        "too_large": 0,
        "touching_border": 0,
        "outside_building_footprint": 0,
        "poor_wall_support": 0,
        "extreme_aspect_ratio": 0,
        "furniture_artifact": 0,
        "text_annotation": 0,
        "low_heuristic_score": 0,
    }

    # Color definitions for candidates visualization
    COLOR_ACCEPTED = (34, 197, 94)          # Green
    COLOR_TOO_SMALL = (22, 115, 249)        # Orange (Cavity)
    COLOR_BORDER = (239, 68, 239)           # Magenta (Border touch)
    COLOR_OUTSIDE_FOOTPRINT = (68, 68, 239) # Red (Exterior site/road)
    COLOR_POOR_WALL = (234, 179, 8)         # Cyan/Yellow (Poor wall support)

    for label in range(1, num_labels):
        region_mask = (labels == label)
        stat = stats[label]

        # Extract features
        features = extract_candidate_features(
            label=label,
            region_mask=region_mask,
            stat=stat,
            wall_contact_zone=wall_contact_zone,
            footprint_mask=footprint_mask,
            gradient_img=gradient_img,
            total_area=total_area,
            image_shape=(h, w),
            estimated_wall_thickness=estimated_wall_thickness,
        )

        # Score candidate
        room_score, is_accepted, reason = score_candidate_region(features, config, total_area)
        features.room_score = room_score
        features.is_accepted = is_accepted
        features.rejection_reason = reason
        candidate_features_list.append(features)

        if not is_accepted:
            if reason in rejected_reasons:
                rejected_reasons[reason] += 1
            else:
                rejected_reasons["low_heuristic_score"] += 1

            # Diagnostic color mapping
            if reason == "too_small":
                candidates_vis[region_mask] = COLOR_TOO_SMALL
            elif reason == "touching_border":
                candidates_vis[region_mask] = COLOR_BORDER
            elif reason == "outside_building_footprint" or reason == "too_large":
                candidates_vis[region_mask] = COLOR_OUTSIDE_FOOTPRINT
            else:
                candidates_vis[region_mask] = COLOR_POOR_WALL
            continue

        # Accepted Room
        candidates_vis[region_mask] = COLOR_ACCEPTED
        single_room_mask = region_mask.astype(np.uint8) * 255

        # Slight morphological cleanup for smooth contours
        smooth_k = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        smoothed_room = cv2.morphologyEx(single_room_mask, cv2.MORPH_OPEN, smooth_k)

        # Fill internal holes (e.g. furniture islands) inside the accepted room
        cnts, _ = cv2.findContours(smoothed_room, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if cnts:
            cv2.drawContours(smoothed_room, cnts, -1, 255, -1)

        room_masks.append(smoothed_room)
        space_mask = cv2.bitwise_or(space_mask, smoothed_room)

    # Draw Legend on top-left
    legend_y = 25
    legend_items = [
        ("Accepted Room", COLOR_ACCEPTED),
        ("Rejected: Small Cavity", COLOR_TOO_SMALL),
        ("Rejected: Exterior Site / Road", COLOR_OUTSIDE_FOOTPRINT),
        ("Rejected: Poor Wall Support", COLOR_POOR_WALL),
        ("Rejected: Border Touch", COLOR_BORDER),
    ]
    for text, col in legend_items:
        cv2.rectangle(candidates_vis, (15, legend_y - 12), (30, legend_y + 3), col, -1)
        cv2.putText(candidates_vis, text, (38, legend_y), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (220, 220, 220), 1, cv2.LINE_AA)
        legend_y += 22

    detection_stats = {
        "candidate_spaces": candidates_count,
        "accepted_rooms": len(room_masks),
        "rejected": rejected_reasons,
        "envelope_area_px": ext_stats["envelope_area_px"],
        "exterior_area_px": ext_stats["exterior_area_px"],
        "retained_interior_px": ext_stats["retained_interior_px"],
        "retention_ratio": ext_stats["retention_ratio"],
        "detected_openings": openings_meta,
        "_diagnostic_masks": {
            "envelope_mask": footprint_mask,
            "openings_mask": openings_mask,
            "exterior_mask": exterior_mask,
            "retained_interior": interior_space,
        },
    }

    return space_mask, room_masks, detection_stats, candidates_vis, footprint_mask, candidate_features_list


def _render_diagnostic_images(
    h, w, planar_faces, hypotheses, candidate_room_hyps, split_hyps, merge_hyps,
    reconstructed_hyps, final_classifications, accepted_recovered, rejected_recovered, recovery_engine
) -> Dict[str, np.ndarray]:
    img_33 = np.zeros((h, w, 3), dtype=np.uint8)
    img_34 = np.zeros((h, w, 3), dtype=np.uint8)
    img_35 = np.zeros((h, w, 3), dtype=np.uint8)
    img_36 = np.zeros((h, w, 3), dtype=np.uint8)
    img_37 = np.zeros((h, w, 3), dtype=np.uint8)
    img_38 = np.zeros((h, w, 3), dtype=np.uint8)
    img_39 = np.zeros((h, w, 3), dtype=np.uint8)

    # Phase 2.7.8 Visual Diagnostic Maps (40..47)
    img_40 = np.zeros((h, w, 3), dtype=np.uint8)  # 40 Face Classification
    img_41 = np.zeros((h, w, 3), dtype=np.uint8)  # 41 False Positive Pruning
    img_42 = np.zeros((h, w, 3), dtype=np.uint8)  # 42 Furniture Evidence
    img_43 = np.zeros((h, w, 3), dtype=np.uint8)  # 43 Text & Dimension Evidence
    img_44 = np.zeros((h, w, 3), dtype=np.uint8)  # 44 Hatch Evidence
    img_45 = np.zeros((h, w, 3), dtype=np.uint8)  # 45 Exterior Face Evidence
    img_46 = np.zeros((h, w, 3), dtype=np.uint8)  # 46 Room Adjacency
    img_47 = np.zeros((h, w, 3), dtype=np.uint8)  # 47 Final Classified Faces

    # Phase 2.7.9 Candidate Recovery Diagnostic Maps (48..56)
    img_48 = np.zeros((h, w, 3), dtype=np.uint8)  # 48 Recovery Candidates
    img_49 = np.zeros((h, w, 3), dtype=np.uint8)  # 49 Wall Enclosure Recovery
    img_50 = np.zeros((h, w, 3), dtype=np.uint8)  # 50 Doorway Recovery
    img_51 = np.zeros((h, w, 3), dtype=np.uint8)  # 51 Partition Recovery
    img_52 = np.zeros((h, w, 3), dtype=np.uint8)  # 52 Repetition Recovery
    img_53 = np.zeros((h, w, 3), dtype=np.uint8)  # 53 Neighbor Recovery
    img_54 = np.zeros((h, w, 3), dtype=np.uint8)  # 54 Recovery Rejections
    img_55 = np.zeros((h, w, 3), dtype=np.uint8)  # 55 Candidate Fusion
    img_56 = np.zeros((h, w, 3), dtype=np.uint8)  # 56 Final Recovered Rooms

    # Render 33..39
    for face in planar_faces:
        pts = np.array([[int(p.xPx), int(p.yPx)] for p in face.polygon], np.int32)
        cv2.polylines(img_33, [pts], isClosed=True, color=(240, 160, 20), thickness=2)

    for hyp in hypotheses:
        pts = np.array([[int(p.xPx), int(p.yPx)] for p in hyp.polygon], np.int32)
        cv2.polylines(img_34, [pts], isClosed=True, color=(30, 200, 240), thickness=2)

    for hyp in candidate_room_hyps:
        pts = np.array([[int(p.xPx), int(p.yPx)] for p in hyp.polygon], np.int32)
        cv2.fillPoly(img_35, [pts], color=(34, 197, 94))
        cv2.polylines(img_35, [pts], isClosed=True, color=(255, 255, 255), thickness=2)

    for split in split_hyps:
        for sub in split.sub_hypotheses:
            pts = np.array([[int(p.xPx), int(p.yPx)] for p in sub.polygon], np.int32)
            cv2.polylines(img_36, [pts], isClosed=True, color=(220, 40, 220), thickness=2)

    for merge in merge_hyps:
        pts = np.array([[int(p.xPx), int(p.yPx)] for p in merge.merged_hypothesis.polygon], np.int32)
        cv2.polylines(img_37, [pts], isClosed=True, color=(40, 120, 240), thickness=2)

    for hyp in reconstructed_hyps:
        pts = np.array([[int(p.xPx), int(p.yPx)] for p in hyp.polygon], np.int32)
        cv2.polylines(img_38, [pts], isClosed=True, color=(255, 255, 255), thickness=2)

    for hyp in reconstructed_hyps:
        pts = np.array([[int(p.xPx), int(p.yPx)] for p in hyp.polygon], np.int32)
        cv2.fillPoly(img_39, [pts], color=(34, 197, 94))
        cv2.polylines(img_39, [pts], isClosed=True, color=(255, 255, 255), thickness=2)

    # Render 40..47
    for clf in final_classifications:
        hyp = next((h for h in hypotheses if h.id == clf.face_id), None)
        if hyp and len(hyp.polygon) >= 3:
            pts = np.array([[int(p.xPx), int(p.yPx)] for p in hyp.polygon], np.int32)
            if clf.classification == "room":
                cv2.polylines(img_40, [pts], isClosed=True, color=(0, 255, 0), thickness=2)
            elif clf.classification == "non_room":
                cv2.polylines(img_40, [pts], isClosed=True, color=(0, 0, 255), thickness=2)
                cv2.polylines(img_41, [pts], isClosed=True, color=(0, 0, 255), thickness=2)
            else:
                cv2.polylines(img_40, [pts], isClosed=True, color=(0, 255, 255), thickness=2)

            if clf.negative_evidence.get("furnitureLikelihood", 0) > 0.40:
                cv2.polylines(img_42, [pts], isClosed=True, color=(255, 128, 0), thickness=2)
            if clf.negative_evidence.get("textLikelihood", 0) > 0.40:
                cv2.polylines(img_43, [pts], isClosed=True, color=(255, 0, 255), thickness=2)
            if clf.negative_evidence.get("hatchLikelihood", 0) > 0.40:
                cv2.polylines(img_44, [pts], isClosed=True, color=(128, 128, 128), thickness=2)
            if clf.negative_evidence.get("exteriorExposure", 0) > 0.60:
                cv2.polylines(img_45, [pts], isClosed=True, color=(0, 0, 255), thickness=2)

    for hyp in reconstructed_hyps:
        if len(hyp.polygon) >= 3:
            pts = np.array([[int(p.xPx), int(p.yPx)] for p in hyp.polygon], np.int32)
            cv2.fillPoly(img_47, [pts], color=(34, 197, 94))
            cv2.polylines(img_47, [pts], isClosed=True, color=(255, 255, 255), thickness=2)

    # Render 48..56 (Phase 2.7.9)
    for rec in accepted_recovered:
        if len(rec.polygon) >= 3:
            pts = np.array([[int(p.xPx), int(p.yPx)] for p in rec.polygon], np.int32)
            cv2.polylines(img_48, [pts], isClosed=True, color=(255, 200, 0), thickness=2)
            if rec.source == "wall_enclosure":
                cv2.polylines(img_49, [pts], isClosed=True, color=(0, 255, 128), thickness=2)
            elif rec.source == "doorway_gap":
                cv2.polylines(img_50, [pts], isClosed=True, color=(255, 0, 128), thickness=2)
            elif rec.source == "partition_reconstruction":
                cv2.polylines(img_51, [pts], isClosed=True, color=(255, 255, 0), thickness=2)
            elif rec.source == "repeated_room":
                cv2.polylines(img_52, [pts], isClosed=True, color=(0, 200, 255), thickness=2)
            elif rec.source == "neighboring_room_pattern":
                cv2.polylines(img_53, [pts], isClosed=True, color=(200, 100, 255), thickness=2)

    for rej in rejected_recovered:
        if len(rej.polygon) >= 3:
            pts = np.array([[int(p.xPx), int(p.yPx)] for p in rej.polygon], np.int32)
            cv2.polylines(img_54, [pts], isClosed=True, color=(0, 0, 255), thickness=2)

    fused_hyps = reconstructed_hyps
    for hyp in fused_hyps:
        if len(hyp.polygon) >= 3:
            pts = np.array([[int(p.xPx), int(p.yPx)] for p in hyp.polygon], np.int32)
            cv2.polylines(img_55, [pts], isClosed=True, color=(0, 255, 0), thickness=2)
            cv2.fillPoly(img_56, [pts], color=(34, 197, 94))
            cv2.polylines(img_56, [pts], isClosed=True, color=(255, 255, 255), thickness=2)

    # Phase 2.7.9.1 Recovery Precision Diagnostic Maps (57..62)
    img_57 = np.zeros((h, w, 3), dtype=np.uint8)  # 57 Recovery Source Map
    img_58 = np.zeros((h, w, 3), dtype=np.uint8)  # 58 Recovery Confidence
    img_59 = np.zeros((h, w, 3), dtype=np.uint8)  # 59 Recovery Rejections
    img_60 = np.zeros((h, w, 3), dtype=np.uint8)  # 60 Recovery Overlap
    img_61 = np.zeros((h, w, 3), dtype=np.uint8)  # 61 Recovery Budget
    img_62 = np.zeros((h, w, 3), dtype=np.uint8)  # 62 Recovery Final Candidates
    # Phase 2.7.9.2 Diagnostic Maps (63..68)
    img_63 = np.zeros((h, w, 3), dtype=np.uint8)  # 63 Second-chance candidates
    img_64 = np.zeros((h, w, 3), dtype=np.uint8)  # 64 Budget ranked candidates
    img_65 = np.zeros((h, w, 3), dtype=np.uint8)  # 65 Source threshold heatmap
    img_66 = np.zeros((h, w, 3), dtype=np.uint8)  # 66 Budget rank by confidence
    img_67 = np.zeros((h, w, 3), dtype=np.uint8)  # 67 Anchor regression check
    img_68 = np.zeros((h, w, 3), dtype=np.uint8)  # 68 Final precision-recall

    # Render 57..68
    decisions = getattr(recovery_engine, "last_decisions", [])
    source_color_map = {
        "wall_enclosure": (0, 255, 128), "closed_wall_enclosure": (0, 255, 128),
        "doorway_reconstruction": (255, 0, 128), "doorway_gap": (255, 0, 128),
        "internal_partition": (255, 255, 0), "partition_reconstruction": (255, 255, 0),
        "repeated_room": (0, 200, 255), "repeated_room_pattern": (0, 200, 255),
        "neighboring_room": (200, 100, 255), "neighboring_room_pattern": (200, 100, 255),
        "multi_unit_scanner": (255, 128, 0), "multi_unit_grid": (255, 128, 0),
    }
    for dec in decisions:
        rec = next((r for r in accepted_recovered + rejected_recovered if r.id == dec.candidate_id), None)
        if rec and len(rec.polygon) >= 3:
            pts = np.array([[int(p.xPx), int(p.yPx)] for p in rec.polygon], np.int32)
            src_color = source_color_map.get(dec.source, (255, 255, 255))
            if dec.accepted:
                cv2.polylines(img_57, [pts], isClosed=True, color=src_color, thickness=2)
                cv2.polylines(img_58, [pts], isClosed=True, color=(0, int(255 * dec.confidence), 255), thickness=2)
                cv2.polylines(img_61, [pts], isClosed=True, color=(0, 255, 0), thickness=2)
                cv2.polylines(img_62, [pts], isClosed=True, color=(255, 200, 0), thickness=2)
                # Map 63: Second-chance candidates (yellow = second chance applied)
                if hasattr(dec, 'second_chance_applied') and dec.second_chance_applied:
                    cv2.fillPoly(img_63, [pts], color=(0, 200, 255))
                    cv2.polylines(img_63, [pts], isClosed=True, color=(255, 255, 255), thickness=2)
                else:
                    cv2.polylines(img_63, [pts], isClosed=True, color=(0, 255, 128), thickness=1)
                # Map 64 / 66: Budget ranked (green=high rank, yellow=low rank)
                rank = getattr(dec, 'budget_rank', -1)
                if rank > 0:
                    rank_color = (0, max(0, 255 - rank * 20), min(255, rank * 20))
                    cv2.polylines(img_64, [pts], isClosed=True, color=rank_color, thickness=2)
                    cv2.polylines(img_66, [pts], isClosed=True, color=(0, int(min(255, dec.confidence * 255)), 128), thickness=2)
                # Map 65: Source threshold heatmap (color by source)
                cv2.polylines(img_65, [pts], isClosed=True, color=src_color, thickness=2)
            else:
                cv2.polylines(img_59, [pts], isClosed=True, color=(0, 0, 255), thickness=2)
                if "overlap" in "".join(dec.rejection_reasons):
                    cv2.polylines(img_60, [pts], isClosed=True, color=(255, 0, 255), thickness=2)
                if "budget" in "".join(dec.rejection_reasons):
                    cv2.polylines(img_61, [pts], isClosed=True, color=(128, 128, 128), thickness=2)

    # Map 67: Anchor regression - draw all final accepted rooms (for protected anchor analysis)
    for hyp in reconstructed_hyps:
        if len(hyp.polygon) >= 3:
            pts = np.array([[int(p.xPx), int(p.yPx)] for p in hyp.polygon], np.int32)
            cv2.polylines(img_67, [pts], isClosed=True, color=(0, 255, 0), thickness=2)
    for rec in accepted_recovered:
        if len(rec.polygon) >= 3:
            pts = np.array([[int(p.xPx), int(p.yPx)] for p in rec.polygon], np.int32)
            cv2.polylines(img_67, [pts], isClosed=True, color=(255, 200, 0), thickness=3)

    # Map 68: Precision-recall overview - green accepted, red rejected
    for hyp in reconstructed_hyps:
        if len(hyp.polygon) >= 3:
            pts = np.array([[int(p.xPx), int(p.yPx)] for p in hyp.polygon], np.int32)
            cv2.fillPoly(img_68, [pts], color=(0, 60, 0))
            cv2.polylines(img_68, [pts], isClosed=True, color=(0, 255, 0), thickness=2)
    for rec in accepted_recovered:
        if len(rec.polygon) >= 3:
            pts = np.array([[int(p.xPx), int(p.yPx)] for p in rec.polygon], np.int32)
            cv2.fillPoly(img_68, [pts], color=(0, 50, 80))
            cv2.polylines(img_68, [pts], isClosed=True, color=(255, 200, 0), thickness=2)

    return {
        "33_wall_faces": img_33,
        "34_topology_candidates": img_34,
        "35_room_hypotheses": img_35,
        "36_split_hypotheses": img_36,
        "37_merge_hypotheses": img_37,
        "38_snapped_boundaries": img_38,
        "39_final_rooms": img_39,
        "40_face_classification": img_40,
        "41_false_positive_pruning": img_41,
        "42_furniture_evidence": img_42,
        "43_text_dimension_evidence": img_43,
        "44_hatch_evidence": img_44,
        "45_exterior_face_evidence": img_45,
        "46_room_adjacency": img_46,
        "47_final_classified_faces": img_47,
        "48_recovery_candidates": img_48,
        "49_wall_enclosure_recovery": img_49,
        "50_doorway_recovery": img_50,
        "51_partition_recovery": img_51,
        "52_repetition_recovery": img_52,
        "53_neighbor_recovery": img_53,
        "54_recovery_rejections": img_54,
        "55_candidate_fusion": img_55,
        "56_final_recovered_rooms": img_56,
        "57_recovery_source_map": img_57,
        "58_recovery_confidence": img_58,
        "59_recovery_rejections": img_59,
        "60_recovery_overlap": img_60,
        "61_recovery_budget": img_61,
        "62_recovery_final_candidates": img_62,
        # Phase 2.7.9.2
        "63_second_chance_candidates": img_63,
        "64_budget_ranked_candidates": img_64,
        "65_source_thresholds": img_65,
        "66_recovery_budget_rank": img_66,
        "67_anchor_regression": img_67,
        "68_final_precision_recall": img_68,
    }


def construct_pre_recovery_bundle(
    wall_mask: np.ndarray,
    config: DetectionConfig,
    wall_network: Optional[Any] = None,
    thick_walls: Optional[np.ndarray] = None,
    gradient_img: Optional[np.ndarray] = None,
    estimated_wall_thickness: float = 10.0,
) -> Dict[str, Any]:
    """
    Executes stages 1-6 of room hypothesis pipeline (cavities, planar faces, pattern detection,
    face classification, split/merge, and overlap pruning) up to candidate recovery.
    """
    from .hypothesis import (
        extract_planar_faces,
        detect_repeated_room_patterns,
        evaluate_room_confidence,
        generate_split_hypotheses,
        generate_merge_hypotheses,
    )
    from .models import RoomHypothesis

    h, w = wall_mask.shape

    # 1. Base Cavity Segmentation
    space_mask, room_masks, detection_stats, candidates_vis, footprint_mask, candidate_features = (
        segment_enclosed_spaces(
            wall_mask=wall_mask,
            config=config,
            thick_walls=thick_walls,
            gradient_img=gradient_img,
            estimated_wall_thickness=estimated_wall_thickness,
        )
    )

    from .polygon import extract_polygons_from_mask
    cavity_areas = extract_polygons_from_mask(room_masks, config)

    # Convert cavity candidates to RoomHypotheses with exact polygons
    hypotheses: List[RoomHypothesis] = []
    for idx, area in enumerate(cavity_areas, 1):
        pts = area.polygon
        x_coords = [p.xPx for p in pts]
        y_coords = [p.yPx for p in pts]
        min_x, max_x = min(x_coords), max(x_coords)
        min_y, max_y = min(y_coords), max(y_coords)
        bw, bh = max_x - min_x, max_y - min_y
        poly_area = float(abs(bw * bh * 0.85))

        hypotheses.append(
            RoomHypothesis(
                id=f"hyp_cavity_{idx}",
                polygon=pts,
                source="cavity",
                area_px=poly_area,
                bbox=(min_x, min_y, bw, bh),
                wall_support=0.85,
                enclosure_score=0.90,
                confidence=0.85,
                is_accepted=True,
            )
        )

    # 2. Extract Planar Faces from WallNetwork (only add if non-overlapping)
    planar_faces = extract_planar_faces(wall_network, w, h)
    for face in planar_faces:
        overlap = False
        fbx, fby, fbw, fbh = face.bbox
        for hyp in hypotheses:
            hbx, hby, hbw, hbh = hyp.bbox
            dx = max(0, min(fbx + fbw, hbx + hbw) - max(fbx, hbx))
            dy = max(0, min(fby + fbh, hby + hbh) - max(fby, hby))
            if (dx * dy) > 0.40 * face.area_px:
                overlap = True
                break

        if not overlap:
            hypotheses.append(
                RoomHypothesis(
                    id=f"hyp_face_{face.id}",
                    polygon=face.polygon,
                    source="wall_network_face",
                    area_px=face.area_px,
                    bbox=face.bbox,
                    wall_support=face.wall_support_ratio,
                    confidence=0.60,
                    is_accepted=True,
                )
            )

    # 3. Repeated Room Pattern Detector
    detect_repeated_room_patterns(hypotheses, w, h)

    # 4. Evaluate Room Confidence & Three-Way Face Classification (Phase 2.7.8)
    from .face_classifier import extract_face_features, classify_candidate_face, prune_overlapping_and_contained_faces

    classifications: Dict[str, Any] = {}
    features_map: Dict[str, Any] = {}
    openings_diag = []

    for hyp in hypotheses:
        pos_ev, neg_ev = extract_face_features(hyp, wall_mask, wall_network, openings_diag, footprint_mask, w, h)
        clf = classify_candidate_face(hyp, pos_ev, neg_ev, config)
        # Protect base cavity candidates accepted during spatial cavity segmentation
        if hyp.source == "cavity" and clf.classification == "ambiguous":
            clf.classification = "room"
        classifications[hyp.id] = clf
        features_map[hyp.id] = {"positive": pos_ev, "negative": neg_ev}
        hyp.confidence = clf.confidence
        hyp.is_accepted = (clf.classification == "room")

    # 5. Split & Merge Hypotheses Evaluation
    split_hyps = generate_split_hypotheses(hypotheses, wall_network)
    merge_hyps = generate_merge_hypotheses(hypotheses, wall_mask)

    for split in split_hyps:
        for sub in split.sub_hypotheses:
            pos_ev, neg_ev = extract_face_features(sub, wall_mask, wall_network, openings_diag, footprint_mask, w, h)
            clf = classify_candidate_face(sub, pos_ev, neg_ev, config)
            classifications[sub.id] = clf
            features_map[sub.id] = {"positive": pos_ev, "negative": neg_ev}
            sub.confidence = clf.confidence
            sub.is_accepted = (clf.classification == "room")
            hypotheses.append(sub)

    for merge in merge_hyps:
        merged = merge.merged_hypothesis
        pos_ev, neg_ev = extract_face_features(merged, wall_mask, wall_network, openings_diag, footprint_mask, w, h)
        clf = classify_candidate_face(merged, pos_ev, neg_ev, config)
        classifications[merged.id] = clf
        features_map[merged.id] = {"positive": pos_ev, "negative": neg_ev}
        merged.confidence = clf.confidence
        merged.is_accepted = (clf.classification == "room")
        hypotheses.append(merged)

    # Filter accepted hypotheses (room or high confidence)
    candidate_room_hyps = [h for h in hypotheses if classifications.get(h.id) and classifications[h.id].classification == "room"]

    # 6. Containment & Polygon Overlap Pruning (Phase 2.7.8)
    pruned_hyps, final_classifications = prune_overlapping_and_contained_faces(classifications, candidate_room_hyps, config)

    pre_bundle = {
        "pruned_hyps": pruned_hyps,
        "hypotheses": hypotheses,
        "classifications": classifications,
        "wall_mask": wall_mask,
        "wall_network": wall_network,
        "footprint_mask": footprint_mask,
        "openings_diag": openings_diag,
        "w": w,
        "h": h,
        "planar_faces": planar_faces,
        "split_hyps": split_hyps,
        "merge_hyps": merge_hyps,
        "candidate_room_hyps": candidate_room_hyps,
        "final_classifications": final_classifications,
    }
    return pre_bundle


def construct_topology_room_hypotheses(
    wall_mask: np.ndarray,
    config: DetectionConfig,
    wall_network: Optional[Any] = None,
    thick_walls: Optional[np.ndarray] = None,
    gradient_img: Optional[np.ndarray] = None,
    estimated_wall_thickness: float = 10.0,
    render_diagnostic_images: Optional[bool] = None,
) -> Tuple[List[Any], Dict[str, Any], Dict[str, np.ndarray]]:
    """
    Phase 2.7.7 Main Multi-Source Topology Room Hypothesis Pipeline.
    Combines cavity candidates with WallNetwork planar faces, detects repeated patterns,
    evaluates split/merge hypotheses, snaps boundaries to walls, and generates 7 visual
    diagnostic images (33..39) and 5 diagnostic JSON artifacts.
    """
    pre_bundle = construct_pre_recovery_bundle(
        wall_mask=wall_mask,
        config=config,
        wall_network=wall_network,
        thick_walls=thick_walls,
        gradient_img=gradient_img,
        estimated_wall_thickness=estimated_wall_thickness,
    )
    return apply_candidate_recovery_and_reconstruction(pre_bundle, config, render_diagnostic_images)



def apply_candidate_recovery_and_reconstruction(
    pre_bundle: Dict[str, Any],
    config: DetectionConfig,
    render_diagnostic_images: Optional[bool] = None,
    raw_image: Optional[np.ndarray] = None,
    ml_evidence_result: Optional[Any] = None,
    image_name: str = "",
) -> Tuple[List[Any], Dict[str, Any], Dict[str, np.ndarray]]:
    """
    Applies candidate recovery (Phase 2.7.9/2.7.9.2), boundary reconstruction,
    and diagnostics compilation to a pre-recovery topology hypothesis bundle.
    """
    import copy
    from .candidate_recovery import CandidateRecoveryEngine
    from .boundary_reconstruction import reconstruct_room_boundaries
    from .models import DetectedArea

    # Deep copy mutable hypothesis lists and classification dictionaries
    pruned_hyps = copy.deepcopy(pre_bundle["pruned_hyps"])
    hypotheses = copy.deepcopy(pre_bundle["hypotheses"])
    classifications = copy.deepcopy(pre_bundle["classifications"])
    wall_mask = pre_bundle["wall_mask"]
    wall_network = pre_bundle["wall_network"]
    footprint_mask = pre_bundle["footprint_mask"]
    openings_diag = pre_bundle["openings_diag"]
    w = pre_bundle["w"]
    h = pre_bundle["h"]
    planar_faces = pre_bundle["planar_faces"]
    split_hyps = pre_bundle["split_hyps"]
    merge_hyps = pre_bundle["merge_hyps"]
    candidate_room_hyps = copy.deepcopy(pre_bundle["candidate_room_hyps"])
    final_classifications = copy.deepcopy(pre_bundle["final_classifications"])

    img_input = raw_image if raw_image is not None else pre_bundle.get("raw_img")

    # 7. Candidate Recovery & Recall Restoration Engine (Phase 2.7.9 / Phase 2.9.1 ML Fusion)
    recovery_engine = CandidateRecoveryEngine(config)
    fused_hyps, accepted_recovered, rejected_recovered = recovery_engine.recover_candidates(
        accepted_hypotheses=pruned_hyps,
        all_hypotheses=hypotheses,
        classifications=classifications,
        wall_mask=wall_mask,
        wall_network=wall_network,
        footprint_mask=footprint_mask,
        openings=openings_diag,
        img_w=w,
        img_h=h,
        raw_image=img_input,
        ml_evidence_result=ml_evidence_result,
        image_name=image_name,
    )

    # Snap-to-Wall Boundary Reconstruction
    reconstructed_hyps = reconstruct_room_boundaries(fused_hyps, wall_network, openings_diag, wall_mask, config)

    # Convert to DetectedArea list
    final_areas = [
        DetectedArea(id=h.id, polygon=h.polygon)
        for h in reconstructed_hyps
    ]

    # 8. Generate Diagnostic PNG Images conditionally
    should_render_images = (
        render_diagnostic_images
        if render_diagnostic_images is not None
        else getattr(config, "render_diagnostic_images", False)
    )
    if should_render_images:
        diag_images = _render_diagnostic_images(
            h, w, planar_faces, hypotheses, candidate_room_hyps, split_hyps, merge_hyps,
            reconstructed_hyps, final_classifications, accepted_recovered, rejected_recovered, recovery_engine
        )
    else:
        diag_images = {}

    decisions = getattr(recovery_engine, "last_decisions", [])
    ml_ev = getattr(recovery_engine, "ml_evidence_result", None)

    diag_json = {
        "wall_faces": [f.to_dict() for f in planar_faces],
        "room_hypotheses": [h.to_dict() for h in hypotheses],
        "split_hypotheses": [s.to_dict() for s in split_hyps],
        "merge_hypotheses": [m.to_dict() for m in merge_hyps],
        "face_classification": [c.to_dict() for c in final_classifications],
        "false_positive_rejections": [c.to_dict() for c in final_classifications if c.classification == "non_room"],
        "recovery_candidates": [r.to_dict() for r in accepted_recovered],
        "recovery_rejections": [r.to_dict() for r in rejected_recovered],
        # Phase 2.7.9.1 precision decisions
        "recovery_candidate_scores": [d.to_dict() for d in decisions],
        # Phase 2.7.9.2 source statistics & candidate traces
        "source_threshold_statistics": getattr(recovery_engine, "source_statistics", {}),
        "recovery_candidate_traces": getattr(recovery_engine, "candidate_traces", []),
        "second_chance_candidates": [
            d.to_dict() for d in decisions
            if hasattr(d, 'second_chance_applied') and d.second_chance_applied
        ],
        "budget_ranking": [
            {"candidate_id": d.candidate_id, "source": d.source,
             "confidence": round(d.confidence, 4),
             "fusion_score": round(getattr(d, 'fusion_score', d.confidence), 4),
             "rank": getattr(d, 'budget_rank', -1),
             "baseline_rank": getattr(d, 'baseline_rank', -1),
             "promoted": getattr(d, 'promoted', False),
             "demoted": getattr(d, 'demoted', False)}
            for d in decisions if getattr(d, 'budget_rank', -1) > 0
        ],
        "ml_fusion": ml_ev.to_dict() if ml_ev is not None else (
            {
                "provider_name": config.ml_fusion.provider,
                "ml_enabled": True,
                "ml_available": True,
                "ml_fallback": False,
                "ml_fallback_reason": None,
                "device_used": getattr(config.ml_fusion, "device", "auto"),
                "detections_count": 0,
                "candidates_associated_count": 0,
                "timing_ms": {
                    "model_load": 0.0,
                    "inference": 0.0,
                    "association": 0.0,
                    "fusion": 0.0,
                    "total": 0.0,
                },
            } if getattr(config, "ml_fusion", None) and config.ml_fusion.enabled else None
        ),
        "topology_graph": {
            "planarFaceCount": len(planar_faces),
            "hypothesisCount": len(hypotheses),
            "acceptedCount": len(reconstructed_hyps),
            "prunedNonRoomCount": sum(1 for c in final_classifications if c.classification == "non_room"),
            "ambiguousCount": sum(1 for c in final_classifications if c.classification == "ambiguous"),
            "recoveredCount": len(accepted_recovered),
            "rejectedRecoveryCount": len(rejected_recovered),
        },
    }

    return final_areas, diag_json, diag_images

