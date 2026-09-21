"""
Phase 2.10.1 Adaptive Text/Wall Separation Subsystem
Classifies spatial relationships into four distinct architectural relations
and calculates continuous, non-binary suppression strength in [0.0, 1.0].
"""
from typing import List, Tuple, Dict, Any, Optional
import numpy as np

from .models import TextRegion
from .distance_analysis import (
    extract_local_wall_thickness,
    analyze_text_region_spatial_metrics,
)

# Spatial Relationship Constants
RELATION_INTERIOR = "INTERIOR_TEXT"
RELATION_NEAR_WALL = "NEAR_WALL_TEXT"
RELATION_WALL_OVERLAP = "WALL_OVERLAP_TEXT"
RELATION_AMBIGUOUS = "AMBIGUOUS_TEXT"


def classify_text_wall_relation(
    region: TextRegion,
    local_wall_thickness: float = 10.0,
) -> Tuple[str, float]:
    """
    Classifies the architectural spatial relationship of a text region relative to walls
    and assigns a continuous suppression strength in [0.0, 1.0].
    
    Returns:
    - relation: str enum (INTERIOR_TEXT, NEAR_WALL_TEXT, WALL_OVERLAP_TEXT, AMBIGUOUS_TEXT)
    - suppression_strength: float in [0.0, 1.0]
    """
    dist = region.distance_to_wall
    overlap = region.wall_overlap_ratio
    crossing = region.text_crossing_wall_ratio
    conf = region.confidence
    support = region.wall_support_around_text
    interior_ratio = region.text_interior_ratio

    safe_margin = max(4.0, local_wall_thickness * 0.5)

    # 1. Ambiguous Check: low confidence or text smothered by heavy wall hatching
    if conf < 0.38 or (support > 0.65 and interior_ratio < 0.15):
        relation = RELATION_AMBIGUOUS
        # Conservative suppression to avoid false suppression of architectural hatching
        strength = float(np.clip(conf * 0.3, 0.0, 0.15))
        return relation, strength

    # 2. Wall Overlap Check: text touches or crosses wall line
    if overlap >= 0.03 or crossing >= 0.05:
        relation = RELATION_WALL_OVERLAP
        # Low/selective suppression for non-wall interior tails, wall pixels will be clamped to 0
        strength = float(np.clip((1.0 - overlap * 2.0) * 0.35, 0.0, 0.35))
        return relation, strength

    # 3. Near Wall Check: text is close to a wall, but does not physically overlap
    if 0.0 < dist < safe_margin:
        relation = RELATION_NEAR_WALL
        # Smooth distance-weighted ramp from 0.30 to 0.75
        dist_factor = dist / safe_margin
        strength = float(np.clip(0.30 + 0.45 * dist_factor, 0.25, 0.75))
        return relation, strength

    # 4. Interior Text Check: text is cleanly positioned in room free-space
    relation = RELATION_INTERIOR
    # High suppression strength: text in room interior can be safely removed to prevent splitting rooms
    dist_bonus = min(1.0, (dist - safe_margin) / max(1.0, local_wall_thickness * 1.5))
    strength = float(np.clip(0.85 + 0.15 * dist_bonus, 0.85, 1.0))
    return relation, strength


def process_all_text_regions_separation(
    regions: List[TextRegion],
    wall_mask: np.ndarray,
    dist_map: np.ndarray,
    wall_network: Optional[Any] = None,
    fallback_thickness: float = 10.0,
) -> List[TextRegion]:
    """
    Processes all detected text regions:
    - Extracts local architectural wall thickness from WallNetwork
    - Analyzes spatial relationship metrics (distance, overlap, crossing, support)
    - Classifies relation into the 4 architectural categories
    - Assigns continuous suppression strength in [0.0, 1.0]
    """
    for reg in regions:
        # 1. Local wall thickness from WallNetwork
        local_thick = extract_local_wall_thickness(
            wall_network=wall_network,
            region_bbox=reg.bbox,
            fallback_thickness=fallback_thickness,
        )

        # 2. Spatial metrics analysis
        analyze_text_region_spatial_metrics(
            region=reg,
            wall_mask=wall_mask,
            dist_map=dist_map,
            local_wall_thickness=local_thick,
        )

        # 3. Categorical relation classification and continuous strength
        rel, strength = classify_text_wall_relation(
            region=reg,
            local_wall_thickness=local_thick,
        )
        reg.relation = rel
        reg.suppression_strength = strength

    return regions
