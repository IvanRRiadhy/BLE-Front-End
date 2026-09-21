"""
Phase 2.10.0 Text Analysis Data Models
Defines dataclasses for text regions, experimental configurations,
fragmentation diagnostics, and wall preservation metrics.
"""
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, Tuple
import numpy as np


@dataclass
class TextRegion:
    """
    Unified representation of a detected text region in original image pixel space.
    """
    id: str
    bbox: Tuple[int, int, int, int]  # (x, y, w, h)
    polygon: List[Tuple[float, float]]  # [(x, y), ...]
    area: float
    width: float
    height: float
    aspect_ratio: float
    component_count: int = 1
    estimated_stroke_width: float = 1.0
    alignment_score: float = 0.0  # Consistency along baseline
    repetition_score: float = 0.0  # Periodic spacing of characters
    text_likelihood: float = 0.5   # 0.0 to 1.0
    confidence: float = 0.5        # Overall region confidence
    source_scale: float = 1.0      # Working resolution scale factor

    # Phase 2.10.1 Adaptive Spatial Relationship Metrics
    distance_to_wall: float = 999.0          # Euclidean distance to nearest wall pixel (px)
    wall_overlap_ratio: float = 0.0          # Fraction of text region overlapping wall mask
    wall_intersection_ratio: float = 0.0     # Fraction of text perimeter touching wall
    wall_support_around_text: float = 0.0    # Local wall pixel density in neighborhood
    text_interior_ratio: float = 1.0         # Fraction situated in room free-space
    text_crossing_wall_ratio: float = 0.0    # Fraction of text component spanning across wall
    wall_thickness_estimate: float = 10.0    # Local wall thickness estimate
    relation: str = "INTERIOR_TEXT"          # INTERIOR_TEXT, NEAR_WALL_TEXT, WALL_OVERLAP_TEXT, AMBIGUOUS_TEXT
    suppression_strength: float = 0.0        # Continuous suppression strength in [0.0, 1.0]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "bbox": list(self.bbox),
            "polygon": [[round(pt[0], 1), round(pt[1], 1)] for pt in self.polygon],
            "area": round(self.area, 1),
            "width": round(self.width, 1),
            "height": round(self.height, 1),
            "aspectRatio": round(self.aspect_ratio, 2),
            "componentCount": self.component_count,
            "estimatedStrokeWidth": round(self.estimated_stroke_width, 2),
            "alignmentScore": round(self.alignment_score, 3),
            "repetitionScore": round(self.repetition_score, 3),
            "textLikelihood": round(self.text_likelihood, 3),
            "confidence": round(self.confidence, 3),
            "sourceScale": round(self.source_scale, 4),
            "distanceToWall": round(self.distance_to_wall, 2),
            "wallOverlapRatio": round(self.wall_overlap_ratio, 4),
            "wallIntersectionRatio": round(self.wall_intersection_ratio, 4),
            "wallSupportAroundText": round(self.wall_support_around_text, 4),
            "textInteriorRatio": round(self.text_interior_ratio, 4),
            "textCrossingWallRatio": round(self.text_crossing_wall_ratio, 4),
            "wallThicknessEstimate": round(self.wall_thickness_estimate, 2),
            "relation": self.relation,
            "suppressionStrength": round(self.suppression_strength, 4),
        }


@dataclass
class Phase210TextExperimentConfig:
    """
    Isolated configuration for Phase 2.10.0 Text & Annotation Suppression experiments.
    Strictly decoupled from production configuration.
    """
    enabled: bool = False
    strategy: str = "baseline"  # baseline, text_evidence, text_mask, protected_text_mask, etc.
    text_penalty: float = 0.0   # Experimental ranking penalty coefficient (0.0 to 0.20)
    max_analysis_dimension: int = 2048  # Working resolution cap for text analysis
    wall_protection_enabled: bool = True
    attenuation_factor: float = 0.5     # Used in soft text mask strategy
    min_confidence: float = 0.35        # Threshold to include text region
    min_character_area: int = 15        # Minimum pixel area for single character CC
    max_character_area: int = 1200      # Maximum pixel area for single character CC
    min_character_dim: int = 5          # Minimum dimension (width/height)
    max_character_dim: int = 70         # Maximum single character height

    def to_dict(self) -> Dict[str, Any]:
        return {
            "enabled": self.enabled,
            "strategy": self.strategy,
            "textPenalty": round(self.text_penalty, 3),
            "maxAnalysisDimension": self.max_analysis_dimension,
            "wallProtectionEnabled": self.wall_protection_enabled,
            "attenuationFactor": round(self.attenuation_factor, 2),
            "minConfidence": round(self.min_confidence, 2),
            "minCharacterArea": self.min_character_area,
            "maxCharacterArea": self.max_character_area,
            "minCharacterDim": self.min_character_dim,
            "maxCharacterDim": self.max_character_dim,
        }


@dataclass
class CandidateTextEvidence:
    """
    Text metrics computed for an individual room candidate polygon.
    """
    candidate_id: str
    text_coverage: float = 0.0             # Fraction of candidate area overlapping textMask
    wall_protected_text_coverage: float = 0.0 # Fraction overlapping protected text
    safe_text_coverage: float = 0.0        # Fraction overlapping safeTextMask
    text_likelihood: float = 0.0           # Mean text likelihood inside candidate
    text_region_count: int = 0             # Number of text regions intersecting candidate
    applied_penalty: float = 0.0           # Final score delta applied

    def to_dict(self) -> Dict[str, Any]:
        return {
            "candidateId": self.candidate_id,
            "textCoverage": round(self.text_coverage, 4),
            "wallProtectedTextCoverage": round(self.wall_protected_text_coverage, 4),
            "safeTextCoverage": round(self.safe_text_coverage, 4),
            "textLikelihood": round(self.text_likelihood, 4),
            "textRegionCount": self.text_region_count,
            "appliedPenalty": round(self.applied_penalty, 4),
        }


@dataclass
class WallPreservationMetrics:
    """
    Rigorous metrics tracking whether text suppression affects architectural walls.
    """
    wall_pixels_before: int = 0
    wall_pixels_after: int = 0
    wall_pixel_loss: int = 0
    wall_pixel_loss_ratio: float = 0.0
    wall_connectivity_before: int = 0  # Number of wall connected components before
    wall_connectivity_after: int = 0   # Number of wall connected components after
    is_safe: bool = True               # True if wall_pixel_loss_ratio < 0.01

    def to_dict(self) -> Dict[str, Any]:
        return {
            "wallPixelsBefore": self.wall_pixels_before,
            "wallPixelsAfter": self.wall_pixels_after,
            "wallPixelLoss": self.wall_pixel_loss,
            "wallPixelLossRatio": round(self.wall_pixel_loss_ratio, 5),
            "wallConnectivityBefore": self.wall_connectivity_before,
            "wallConnectivityAfter": self.wall_connectivity_after,
            "isSafe": self.is_safe,
        }


@dataclass
class FragmentationRecord:
    """
    Captures room fragmentation diagnostics for a Ground Truth room.
    """
    gt_room_id: str
    gt_area_px: float
    matched_candidates: List[str]
    fragment_count: int
    is_fragmented: bool
    text_regions_involved: List[str]
    split_boundary_text_overlap_ratio: float
    causality: str  # "text_likely_cause", "text_possible_cause", "text_unrelated"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "gtRoomId": self.gt_room_id,
            "gtAreaPx": round(self.gt_area_px, 1),
            "matchedCandidates": self.matched_candidates,
            "fragmentCount": self.fragment_count,
            "isFragmented": self.is_fragmented,
            "textRegionsInvolved": self.text_regions_involved,
            "splitBoundaryTextOverlapRatio": round(self.split_boundary_text_overlap_ratio, 4),
            "causality": self.causality,
        }


@dataclass
class TextAnalysisResult:
    """
    Complete output of the text analysis stage for a single floorplan image.
    """
    image_width: int
    image_height: int
    regions: List[TextRegion]
    text_mask: np.ndarray             # uint8 0..255
    text_likelihood_map: np.ndarray   # float32 0.0..1.0
    safe_text_mask: Optional[np.ndarray] = None      # uint8 0..255
    wall_protection_mask: Optional[np.ndarray] = None # uint8 0..255
    analysis_time_ms: float = 0.0
    scale_factor: float = 1.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "imageWidth": self.image_width,
            "imageHeight": self.image_height,
            "totalTextRegions": len(self.regions),
            "textCoverageRatio": round(float(np.count_nonzero(self.text_mask)) / max(1, self.image_width * self.image_height), 5),
            "analysisTimeMs": round(self.analysis_time_ms, 2),
            "scaleFactor": round(self.scale_factor, 4),
            "regions": [r.to_dict() for r in self.regions],
        }
