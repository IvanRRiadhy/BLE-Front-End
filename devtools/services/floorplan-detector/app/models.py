from dataclasses import dataclass, field, asdict
from typing import List, Dict, Any, Optional, Tuple

@dataclass
class AreaPoint:
    xPx: float
    yPx: float

    def to_tuple(self) -> Tuple[float, float]:
        return (float(self.xPx), float(self.yPx))

    def to_dict(self) -> Dict[str, float]:
        return {
            "xPx": round(self.xPx, 1),
            "yPx": round(self.yPx, 1),
        }

@dataclass
class DetectedArea:
    id: str
    polygon: List[AreaPoint]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "polygon": [p.to_dict() for p in self.polygon],
        }

@dataclass
class CandidateRegionFeatures:
    """
    Deterministic geometric and architectural features extracted for each enclosed cavity.
    Enables explainable heuristic scoring to separate logical rooms from exterior site/road enclosures.
    """
    label: int
    area_px: float
    bbox: tuple  # (x, y, w, h)
    aspect_ratio: float
    rectangularity: float
    convexity: float
    compactness: float
    border_distance: float
    footprint_containment: float
    wall_support_ratio: float
    interior_edge_density: float
    furniture_likelihood: float = 0.0
    text_penalty: float = 0.0
    enclosure_score: float = 0.0
    estimated_wall_thickness_px: float = 0.0
    room_score: float = 0.0
    is_accepted: bool = False
    rejection_reason: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "label": self.label,
            "area_px": round(self.area_px, 1),
            "bbox": list(self.bbox),
            "aspect_ratio": round(self.aspect_ratio, 2),
            "rectangularity": round(self.rectangularity, 2),
            "convexity": round(self.convexity, 2),
            "compactness": round(self.compactness, 2),
            "border_distance": round(self.border_distance, 1),
            "footprint_containment": round(self.footprint_containment, 2),
            "wall_support_ratio": round(self.wall_support_ratio, 2),
            "interior_edge_density": round(self.interior_edge_density, 3),
            "furniture_likelihood": round(self.furniture_likelihood, 2),
            "text_penalty": round(self.text_penalty, 2),
            "enclosure_score": round(self.enclosure_score, 2),
            "estimated_wall_thickness_px": round(self.estimated_wall_thickness_px, 1),
            "room_score": round(self.room_score, 3),
            "is_accepted": self.is_accepted,
            "rejection_reason": self.rejection_reason,
        }

@dataclass
class WallSegmentDiagnostics:
    """
    Structured explainable diagnostics for an individual architectural wall segment.
    """
    id: str
    x1: float
    y1: float
    x2: float
    y2: float
    orientation: str
    thickness: float
    confidence: float
    length: float
    is_centerline: bool = False
    paired_wall_id: Optional[str] = None
    intersection_count: int = 0
    normalized_length: float = 0.0
    thickness_deviation: float = 0.0
    continuity_score: float = 0.0
    intersection_score: float = 0.0
    hatch_likelihood: float = 0.0
    text_likelihood: float = 0.0
    furniture_likelihood: float = 0.0
    architectural_confidence: float = 0.5
    classification: str = "probable_architectural"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "bbox": [round(min(self.x1, self.x2), 1), round(min(self.y1, self.y2), 1),
                      round(abs(self.x2 - self.x1), 1), round(abs(self.y2 - self.y1), 1)],
            "orientation": self.orientation,
            "thickness": round(self.thickness, 1),
            "confidence": round(self.confidence, 3),
            "length": round(self.length, 1),
            "normalizedLength": round(self.normalized_length, 4),
            "thicknessDeviation": round(self.thickness_deviation, 2),
            "continuityScore": round(self.continuity_score, 3),
            "intersectionScore": round(self.intersection_score, 3),
            "hatchLikelihood": round(self.hatch_likelihood, 3),
            "textLikelihood": round(self.text_likelihood, 3),
            "furnitureLikelihood": round(self.furniture_likelihood, 3),
            "architecturalConfidence": round(self.architectural_confidence, 3),
            "classification": self.classification,
            "is_centerline": self.is_centerline,
            "paired_wall_id": self.paired_wall_id,
            "intersection_count": self.intersection_count,
            "enclosure_contribution": round(self.enclosure_contribution, 2),
        }

@dataclass
class ArchitecturalOpeningDiagnostics:
    """
    Structured explainable diagnostics for an architectural opening (door, sliding, balcony, terrace).
    """
    id: str
    x1: float
    y1: float
    x2: float
    y2: float
    width: float
    orientation: str
    opening_type: str  # "door", "sliding", "balcony", "terrace", "unknown"
    wall_support: float
    exterior_contact: bool
    confidence: float

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "endpoints": [[round(self.x1, 1), round(self.y1, 1)], [round(self.x2, 1), round(self.y2, 1)]],
            "width": round(self.width, 1),
            "orientation": self.orientation,
            "type": self.opening_type,
            "wallSupport": round(self.wall_support, 3),
            "exteriorContact": self.exterior_contact,
            "confidence": round(self.confidence, 3),
        }

@dataclass
class RecoveryPrecisionConfig:
    """
    Phase 2.7.9.2 Configuration-driven recovery precision and candidate control.
    Supports both snake_case and camelCase parameters for ablation experiments.
    """
    budget_min: int = 4
    budget_ceiling: int = 12
    budget_primary_offset: int = 3
    wall_enclosure_confidence_threshold: float = 0.42
    doorway_confidence_threshold: float = 0.38
    repeated_room_confidence_threshold: float = 0.47
    neighboring_room_confidence_threshold: float = 0.47
    multi_unit_confidence_threshold: float = 0.55
    partition_confidence_threshold: float = 0.50
    second_chance_enabled: bool = True
    second_chance_wall_support: float = 0.55
    second_chance_enclosure: float = 0.90
    second_chance_negative_evidence: float = 0.08
    second_chance_bonus: float = 0.05

    # camelCase property aliases
    @property
    def budgetMin(self) -> int:
        return self.budget_min
    @budgetMin.setter
    def budgetMin(self, val: int):
        self.budget_min = val

    @property
    def budgetCeiling(self) -> int:
        return self.budget_ceiling
    @budgetCeiling.setter
    def budgetCeiling(self, val: int):
        self.budget_ceiling = val

    @property
    def budgetPrimaryOffset(self) -> int:
        return self.budget_primary_offset
    @budgetPrimaryOffset.setter
    def budgetPrimaryOffset(self, val: int):
        self.budget_primary_offset = val

    @property
    def wallEnclosureConfidenceThreshold(self) -> float:
        return self.wall_enclosure_confidence_threshold
    @wallEnclosureConfidenceThreshold.setter
    def wallEnclosureConfidenceThreshold(self, val: float):
        self.wall_enclosure_confidence_threshold = val

    @property
    def doorwayConfidenceThreshold(self) -> float:
        return self.doorway_confidence_threshold
    @doorwayConfidenceThreshold.setter
    def doorwayConfidenceThreshold(self, val: float):
        self.doorway_confidence_threshold = val

    @property
    def repeatedRoomConfidenceThreshold(self) -> float:
        return self.repeated_room_confidence_threshold
    @repeatedRoomConfidenceThreshold.setter
    def repeatedRoomConfidenceThreshold(self, val: float):
        self.repeated_room_confidence_threshold = val

    @property
    def neighboringRoomConfidenceThreshold(self) -> float:
        return self.neighboring_room_confidence_threshold
    @neighboringRoomConfidenceThreshold.setter
    def neighboringRoomConfidenceThreshold(self, val: float):
        self.neighboring_room_confidence_threshold = val

    @property
    def multiUnitConfidenceThreshold(self) -> float:
        return self.multi_unit_confidence_threshold
    @multiUnitConfidenceThreshold.setter
    def multiUnitConfidenceThreshold(self, val: float):
        self.multi_unit_confidence_threshold = val

    @property
    def secondChanceEnabled(self) -> bool:
        return self.second_chance_enabled
    @secondChanceEnabled.setter
    def secondChanceEnabled(self, val: bool):
        self.second_chance_enabled = val

    @property
    def secondChanceWallSupport(self) -> float:
        return self.second_chance_wall_support
    @secondChanceWallSupport.setter
    def secondChanceWallSupport(self, val: float):
        self.second_chance_wall_support = val

    @property
    def secondChanceEnclosure(self) -> float:
        return self.second_chance_enclosure
    @secondChanceEnclosure.setter
    def secondChanceEnclosure(self, val: float):
        self.second_chance_enclosure = val

    @property
    def secondChanceNegativeEvidence(self) -> float:
        return self.second_chance_negative_evidence
    @secondChanceNegativeEvidence.setter
    def secondChanceNegativeEvidence(self, val: float):
        self.second_chance_negative_evidence = val

    @property
    def secondChanceBonus(self) -> float:
        return self.second_chance_bonus
    @secondChanceBonus.setter
    def secondChanceBonus(self, val: float):
        self.second_chance_bonus = val

    def to_dict(self) -> Dict[str, Any]:
        return {
            "budgetMin": self.budget_min,
            "budgetCeiling": self.budget_ceiling,
            "budgetPrimaryOffset": self.budget_primary_offset,
            "wallEnclosureConfidenceThreshold": self.wall_enclosure_confidence_threshold,
            "doorwayConfidenceThreshold": self.doorway_confidence_threshold,
            "repeatedRoomConfidenceThreshold": self.repeated_room_confidence_threshold,
            "neighboringRoomConfidenceThreshold": self.neighboring_room_confidence_threshold,
            "multiUnitConfidenceThreshold": self.multi_unit_confidence_threshold,
            "partitionConfidenceThreshold": self.partition_confidence_threshold,
            "secondChanceEnabled": self.second_chance_enabled,
            "secondChanceWallSupport": self.second_chance_wall_support,
            "secondChanceEnclosure": self.second_chance_enclosure,
            "secondChanceNegativeEvidence": self.second_chance_negative_evidence,
            "secondChanceBonus": self.second_chance_bonus,
        }

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> 'RecoveryPrecisionConfig':
        kwargs = {}
        mapping = {
            "budgetMin": "budget_min", "budget_min": "budget_min",
            "budgetCeiling": "budget_ceiling", "budget_ceiling": "budget_ceiling",
            "budgetPrimaryOffset": "budget_primary_offset", "budget_primary_offset": "budget_primary_offset",
            "wallEnclosureConfidenceThreshold": "wall_enclosure_confidence_threshold",
            "wall_enclosure_confidence_threshold": "wall_enclosure_confidence_threshold",
            "doorwayConfidenceThreshold": "doorway_confidence_threshold",
            "doorway_confidence_threshold": "doorway_confidence_threshold",
            "repeatedRoomConfidenceThreshold": "repeated_room_confidence_threshold",
            "repeated_room_confidence_threshold": "repeated_room_confidence_threshold",
            "neighboringRoomConfidenceThreshold": "neighboring_room_confidence_threshold",
            "neighboring_room_confidence_threshold": "neighboring_room_confidence_threshold",
            "multiUnitConfidenceThreshold": "multi_unit_confidence_threshold",
            "multi_unit_confidence_threshold": "multi_unit_confidence_threshold",
            "partitionConfidenceThreshold": "partition_confidence_threshold",
            "partition_confidence_threshold": "partition_confidence_threshold",
            "secondChanceEnabled": "second_chance_enabled", "second_chance_enabled": "second_chance_enabled",
            "secondChanceWallSupport": "second_chance_wall_support", "second_chance_wall_support": "second_chance_wall_support",
            "secondChanceEnclosure": "second_chance_enclosure", "second_chance_enclosure": "second_chance_enclosure",
            "secondChanceNegativeEvidence": "second_chance_negative_evidence", "second_chance_negative_evidence": "second_chance_negative_evidence",
            "secondChanceBonus": "second_chance_bonus", "second_chance_bonus": "second_chance_bonus",
        }
        for k, v in d.items():
            if k in mapping:
                kwargs[mapping[k]] = v
        return cls(**kwargs)

@dataclass
class MLFusionConfig:
    """
    Phase 2.9.1 ML Structural Evidence Fusion Configuration.
    Controls whether and how ML structural evidence (specifically doorway connections)
    modulates classical CV candidate ranking.
    """
    enabled: bool = False
    provider: str = "rtdetr"
    door_weight: float = 0.10
    structural_weight: float = 0.0
    cavity_weight: float = 0.0
    fallback_mode: str = "classical"
    diagnostics_enabled: bool = False
    device: str = "auto"
    cpu_fallback: bool = False
    inference_timeout_ms: int = 5000
    weights_path: Optional[str] = None
    confidence_threshold: float = 0.30

    def __init__(
        self,
        enabled: bool = False,
        provider: str = "rtdetr",
        door_weight: float = 0.10,
        doorWeight: Optional[float] = None,
        structural_weight: float = 0.0,
        structuralWeight: Optional[float] = None,
        cavity_weight: float = 0.0,
        cavityWeight: Optional[float] = None,
        fallback_mode: str = "classical",
        fallbackMode: Optional[str] = None,
        diagnostics_enabled: bool = False,
        diagnosticsEnabled: Optional[bool] = None,
        device: str = "auto",
        cpu_fallback: bool = False,
        inference_timeout_ms: int = 5000,
        weights_path: Optional[str] = None,
        confidence_threshold: float = 0.30,
        **kwargs,
    ):
        self.enabled = enabled
        self.provider = provider
        self.door_weight = doorWeight if doorWeight is not None else door_weight
        self.structural_weight = structuralWeight if structuralWeight is not None else structural_weight
        self.cavity_weight = cavityWeight if cavityWeight is not None else cavity_weight
        self.fallback_mode = fallbackMode if fallbackMode is not None else fallback_mode
        self.diagnostics_enabled = diagnosticsEnabled if diagnosticsEnabled is not None else diagnostics_enabled
        self.device = device
        self.cpu_fallback = cpu_fallback
        self.inference_timeout_ms = inference_timeout_ms
        self.weights_path = weights_path
        self.confidence_threshold = confidence_threshold

    @property
    def doorWeight(self) -> float:
        return self.door_weight
    @doorWeight.setter
    def doorWeight(self, val: float):
        self.door_weight = val

    @property
    def structuralWeight(self) -> float:
        return self.structural_weight
    @structuralWeight.setter
    def structuralWeight(self, val: float):
        self.structural_weight = val

    @property
    def cavityWeight(self) -> float:
        return self.cavity_weight
    @cavityWeight.setter
    def cavityWeight(self, val: float):
        self.cavity_weight = val

    @property
    def fallbackMode(self) -> str:
        return self.fallback_mode
    @fallbackMode.setter
    def fallbackMode(self, val: str):
        self.fallback_mode = val

    @property
    def diagnosticsEnabled(self) -> bool:
        return self.diagnostics_enabled
    @diagnosticsEnabled.setter
    def diagnosticsEnabled(self, val: bool):
        self.diagnostics_enabled = val

    @property
    def cpuFallback(self) -> bool:
        return self.cpu_fallback
    @cpuFallback.setter
    def cpuFallback(self, val: bool):
        self.cpu_fallback = val

    @property
    def inferenceTimeoutMs(self) -> int:
        return self.inference_timeout_ms
    @inferenceTimeoutMs.setter
    def inferenceTimeoutMs(self, val: int):
        self.inference_timeout_ms = val

    def to_dict(self) -> Dict[str, Any]:
        return {
            "enabled": self.enabled,
            "provider": self.provider,
            "doorWeight": self.door_weight,
            "structuralWeight": self.structural_weight,
            "cavityWeight": self.cavity_weight,
            "fallbackMode": self.fallback_mode,
            "diagnosticsEnabled": self.diagnostics_enabled,
            "device": self.device,
            "cpuFallback": self.cpu_fallback,
            "inferenceTimeoutMs": self.inference_timeout_ms,
            "weightsPath": self.weights_path,
            "confidenceThreshold": self.confidence_threshold,
        }

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> 'MLFusionConfig':
        mapping = {
            "enabled": "enabled",
            "provider": "provider",
            "doorWeight": "door_weight", "door_weight": "door_weight",
            "structuralWeight": "structural_weight", "structural_weight": "structural_weight",
            "cavityWeight": "cavity_weight", "cavity_weight": "cavity_weight",
            "fallbackMode": "fallback_mode", "fallback_mode": "fallback_mode",
            "diagnosticsEnabled": "diagnostics_enabled", "diagnostics_enabled": "diagnostics_enabled",
            "device": "device",
            "cpuFallback": "cpu_fallback", "cpu_fallback": "cpu_fallback",
            "inferenceTimeoutMs": "inference_timeout_ms", "inference_timeout_ms": "inference_timeout_ms",
            "weightsPath": "weights_path", "weights_path": "weights_path",
            "confidenceThreshold": "confidence_threshold", "confidence_threshold": "confidence_threshold",
        }
        kwargs = {}
        for k, v in d.items():
            if k in mapping:
                kwargs[mapping[k]] = v
        return cls(**kwargs)

@dataclass
class DetectionConfig:
    """
    Centralized configuration for classical CV floorplan detection.
    Controls preprocessing, morphological wall closure, wall network graph, and room filtering.
    """
    # Phase 2.7.9.2 Recovery Precision Configuration
    recovery_precision: Optional[RecoveryPrecisionConfig] = None
    # Phase 2.9.1 ML Structural Evidence Fusion Configuration
    ml_fusion: Optional[MLFusionConfig] = None

    def __post_init__(self):
        if self.recovery_precision is None:
            self.recovery_precision = RecoveryPrecisionConfig()
        if self.ml_fusion is None:
            import os
            env_val = (
                os.environ.get("BIONIC_ML_FUSION_ENABLED")
                or os.environ.get("ML_FUSION_ENABLED")
                or ""
            ).strip().lower()
            is_env_enabled = env_val in ("1", "true", "yes", "on")
            self.ml_fusion = MLFusionConfig(enabled=is_env_enabled)

    # Preprocessing & Multi-Channel Wall Evidence
    threshold_method: str = "otsu"  # "otsu" or "adaptive"
    adaptive_block_size: int = 15
    adaptive_c: int = 4
    bilateral_d: int = 7
    bilateral_sigma: float = 50.0

    # Phase 2.7.2 Multi-Channel Wall Evidence Thresholds
    wall_evidence_threshold: float = 0.35  # Normalized evidence threshold [0..1] for wall mask binarization
    dark_pixel_weight: float = 0.25        # Weight for grayscale dark pixel channel
    adaptive_thresh_weight: float = 0.25   # Weight for local adaptive threshold channel
    canny_edge_weight: float = 0.15        # Weight for multi-scale Canny edges
    sobel_gradient_weight: float = 0.15    # Weight for Sobel magnitude
    color_contrast_weight: float = 0.10    # Weight for RGB max-min & HSV saturation contrast
    morphology_line_weight: float = 0.10   # Weight for directional structural lines

    # Phase 2.7.3 Architectural Wall Topology & Double-Line Fusion
    enable_double_line_fusion: bool = True  # Merge parallel wall lines into canonical centerlines
    max_parallel_wall_dist_px: int = 45     # Maximum separation distance for double-line wall pairing
    min_parallel_wall_overlap_ratio: float = 0.35  # Minimum parallel overlap ratio
    snap_intersection_radius_px: int = 18   # Maximum corner snapping radius in pixels
    min_wall_segment_length_px: int = 25    # Minimum length for structural wall segment

    # Wall Thickness Estimation & Clamped Morphological Closures
    estimated_wall_thickness_min: int = 3   # Minimum plausible wall thickness in pixels
    estimated_wall_thickness_max: int = 85  # Maximum plausible wall thickness in pixels
    wall_close_kernel_min: int = 9          # Lower bound on gap closing kernel
    wall_close_kernel_max: int = 55         # Upper bound on gap closing kernel to prevent room merging
    doorway_gap_min: int = 12               # Minimum doorway gap in pixels
    doorway_gap_max: int = 90               # Maximum doorway gap in pixels
    wall_close_kernel_size: int = 35        # Default fallback kernel size
    wall_dilation_iterations: int = 1

    # Furniture & Text Suppression Penalties
    furniture_penalty: float = 0.40         # Score reduction for isolated small objects inside rooms
    text_penalty: float = 0.30              # Score reduction for character-like component clusters
    suppress_interior_furniture: bool = True

    # Adaptive Space & Room Filtering
    min_room_area_px: int = 2000            # Baseline minimum room area in pixels
    min_room_area_ratio: float = 0.0003     # Relative minimum room area as fraction of image area (0.03%)
    max_room_area_ratio: float = 0.85       # Maximum room area as fraction of image area
    min_solidity: float = 0.35              # Minimum solidity
    merge_split_threshold: float = 0.65     # Wall network partition score threshold to trigger room split

    # Resolution Normalization / Adaptation
    auto_scale_kernel: bool = False          # Bounded adaptive scaling when requested

    # Polygon Extraction & Boundary Reconstruction
    simplify_tolerance: float = 0.012       # Douglas-Peucker tolerance relative to perimeter
    min_vertices: int = 3
    max_vertices: int = 40

    # Phase 2.6 Multi-Evidence & Candidate Scoring Heuristics
    enable_multi_evidence: bool = True
    min_wall_support_ratio: float = 0.25
    min_footprint_containment: float = 0.35
    min_room_score: float = 0.45

    # Phase 2.7.1 Robust Exterior Boundary Handling
    enable_envelope_boundary: bool = True
    envelope_close_kernel_size: int = 65
    max_exterior_opening_px: int = 160
    min_exterior_opening_px: int = 5
    envelope_min_area_ratio: float = 0.03

    # Phase 2.7.8 Architectural Face Classification & False-Positive Pruning Ablation Flags
    enable_face_classification: bool = True
    enable_negative_evidence: bool = True
    enable_furniture_suppression: bool = True
    enable_text_suppression: bool = True
    enable_exterior_suppression: bool = True
    enable_overlap_pruning: bool = True

    # Phase 2.7.9 Candidate Recovery & Recall Restoration Ablation Flags
    enable_candidate_recovery: bool = True
    enable_wall_enclosure_recovery: bool = True
    enable_doorway_recovery: bool = True
    enable_partition_recovery: bool = True
    enable_repetition_recovery: bool = True
    enable_neighbor_recovery: bool = True

@dataclass
class RecoveredRoomHypothesis:
    """
    Phase 2.7.9 Recovered candidate hypothesis generated from targeted architectural evidence
    (wall enclosure, doorway gaps, partitions, repeated room patterns, neighbor patterns, multi-unit recovery).
    """
    recovery_id: str
    polygon: List[AreaPoint]
    source: str  # "wall_enclosure", "broken_wall", "doorway_gap", "partition_reconstruction", "repeated_room", "neighboring_room_pattern", "room_graph", "boundary_reconstruction", "hybrid"
    confidence: float
    wall_support: float = 0.0
    enclosure_score: float = 0.0
    topology_score: float = 0.0
    repetition_score: float = 0.0
    neighbor_support: float = 0.0
    opening_support: float = 0.0
    footprint_containment: float = 0.0
    exterior_exposure: float = 0.0
    overlap_with_existing: float = 0.0
    recovery_reasons: List[str] = field(default_factory=list)
    rejection_reasons: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "recoveryId": self.recovery_id,
            "polygon": [p.to_dict() for p in self.polygon],
            "source": self.source,
            "confidence": round(self.confidence, 3),
            "wallSupport": round(self.wall_support, 3),
            "enclosureScore": round(self.enclosure_score, 3),
            "topologyScore": round(self.topology_score, 3),
            "repetitionScore": round(self.repetition_score, 3),
            "neighborSupport": round(self.neighbor_support, 3),
            "openingSupport": round(self.opening_support, 3),
            "footprintContainment": round(self.footprint_containment, 3),
            "exteriorExposure": round(self.exterior_exposure, 3),
            "overlapWithExisting": round(self.overlap_with_existing, 3),
            "recoveryReasons": self.recovery_reasons,
            "rejectionReasons": self.rejection_reasons,
        }

    @property
    def id(self) -> str:
        return self.recovery_id

@dataclass
class PlanarFace:
    """
    Bounded face extracted from the WallNetwork planar graph.
    """
    id: str
    polygon: List[AreaPoint]
    area_px: float
    bbox: tuple  # (x, y, w, h)
    perimeter_px: float
    is_exterior: bool = False
    wall_support_ratio: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "polygon": [p.to_dict() for p in self.polygon],
            "area_px": round(self.area_px, 1),
            "bbox": list(self.bbox),
            "perimeter_px": round(self.perimeter_px, 1),
            "is_exterior": self.is_exterior,
            "wall_support_ratio": round(self.wall_support_ratio, 3),
        }

@dataclass
class RoomHypothesis:
    """
    Multi-source room hypothesis with architectural scoring metrics.
    """
    id: str
    polygon: List[AreaPoint]
    source: str  # "cavity", "wall_network_face", "partition", "repetition", "hybrid"
    area_px: float
    bbox: tuple  # (x, y, w, h)
    wall_support: float = 0.0
    enclosure_score: float = 0.0
    topology_score: float = 0.0
    boundary_score: float = 0.0
    repetition_score: float = 0.0
    exterior_exposure: float = 0.0
    furniture_likelihood: float = 0.0
    text_likelihood: float = 0.0
    hatch_likelihood: float = 0.0
    confidence: float = 0.0
    is_accepted: bool = False
    rejection_reason: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "polygon": [p.to_dict() for p in self.polygon],
            "source": self.source,
            "area_px": round(self.area_px, 1),
            "bbox": list(self.bbox),
            "wallSupport": round(self.wall_support, 3),
            "enclosureScore": round(self.enclosure_score, 3),
            "topologyScore": round(self.topology_score, 3),
            "boundaryScore": round(self.boundary_score, 3),
            "repetitionScore": round(self.repetition_score, 3),
            "exteriorExposure": round(self.exterior_exposure, 3),
            "furnitureLikelihood": round(self.furniture_likelihood, 3),
            "textLikelihood": round(self.text_likelihood, 3),
            "hatchLikelihood": round(self.hatch_likelihood, 3),
            "confidence": round(self.confidence, 3),
            "isAccepted": self.is_accepted,
            "rejectionReason": self.rejection_reason,
        }

@dataclass
class SplitHypothesis:
    """
    Candidate hypothesis for splitting a large space via internal partitions.
    """
    parent_id: str
    sub_hypotheses: List[RoomHypothesis]
    partition_wall_ids: List[str]
    confidence_gain: float

    def to_dict(self) -> Dict[str, Any]:
        return {
            "parentId": self.parent_id,
            "subHypotheses": [h.to_dict() for h in self.sub_hypotheses],
            "partitionWallIds": self.partition_wall_ids,
            "confidenceGain": round(self.confidence_gain, 3),
        }

@dataclass
class MergeHypothesis:
    """
    Candidate hypothesis for merging room candidates separated only by non-wall artifacts.
    """
    child_ids: List[str]
    merged_hypothesis: RoomHypothesis
    separator_type: str  # "furniture", "text", "hatch", "weak_stroke"
    confidence_gain: float

    def to_dict(self) -> Dict[str, Any]:
        return {
            "childIds": self.child_ids,
            "mergedHypothesis": self.merged_hypothesis.to_dict(),
            "separatorType": self.separator_type,
            "confidenceGain": round(self.confidence_gain, 3),
        }

@dataclass
class ArchitecturalFaceClassification:
    """
    Phase 2.7.8 Structured Three-Way Classification ("room", "non_room", "ambiguous")
    with multi-channel positive and negative evidence feature scoring.
    """
    face_id: str
    classification: str  # "room", "non_room", "ambiguous"
    confidence: float
    positive_evidence: Dict[str, float] = field(default_factory=dict)
    negative_evidence: Dict[str, float] = field(default_factory=dict)
    rejection_reasons: List[str] = field(default_factory=list)
    source_hypothesis_id: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "faceId": self.face_id,
            "classification": self.classification,
            "confidence": round(self.confidence, 3),
            "positiveEvidence": {k: round(v, 3) for k, v in self.positive_evidence.items()},
            "negativeEvidence": {k: round(v, 3) for k, v in self.negative_evidence.items()},
            "rejectionReasons": self.rejection_reasons,
            "sourceHypothesisId": self.source_hypothesis_id,
        }

@dataclass
class DetectionResult:
    imageWidth: int
    imageHeight: int
    areas: List[DetectedArea]
    stats: Dict[str, Any] = field(default_factory=dict)

    @property
    def raw_stats(self) -> Dict[str, Any]:
        return self.stats

    @property
    def image_width(self) -> int:
        return self.imageWidth

    @property
    def image_height(self) -> int:
        return self.imageHeight

    @property
    def execution_time_ms(self) -> float:
        return float(self.stats.get("total_time_ms", self.stats.get("execution_time_ms", 0.0)))

    def to_dict(self) -> Dict[str, Any]:
        return {
            "imageWidth": self.imageWidth,
            "imageHeight": self.imageHeight,
            "areas": [a.to_dict() for a in self.areas],
            "stats": self.stats,
        }

