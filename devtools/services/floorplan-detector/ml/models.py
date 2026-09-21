"""
Phase 2.8.0 ML Data Models and Schemas
Strictly typed dataclasses for detections, inference results, structural evidence, and candidate associations.
"""
from dataclasses import dataclass, field, asdict
from typing import List, Dict, Any, Optional, Tuple


@dataclass
class BBox:
    """Bounding box in original image pixel coordinates."""
    x1: float
    y1: float
    x2: float
    y2: float

    @property
    def width(self) -> float:
        return max(0.0, self.x2 - self.x1)

    @property
    def height(self) -> float:
        return max(0.0, self.y2 - self.y1)

    @property
    def area(self) -> float:
        return self.width * self.height

    @property
    def center(self) -> Tuple[float, float]:
        return ((self.x1 + self.x2) / 2.0, (self.y1 + self.y2) / 2.0)

    def to_dict(self) -> Dict[str, float]:
        return {
            "x1": round(self.x1, 1),
            "y1": round(self.y1, 1),
            "x2": round(self.x2, 1),
            "y2": round(self.y2, 1),
        }

    @classmethod
    def from_dict(cls, d: Dict[str, float]) -> "BBox":
        return cls(
            x1=float(d["x1"]),
            y1=float(d["y1"]),
            x2=float(d["x2"]),
            y2=float(d["y2"]),
        )


@dataclass
class MLDetection:
    """Single structural detection output matching the required specification."""
    class_name: str = ""
    confidence: float = 0.0
    bbox: BBox = field(default_factory=lambda: BBox(0, 0, 0, 0))
    class_id: int = 0
    polygon: Optional[List[Tuple[float, float]]] = None
    cls: Optional[str] = None

    def __post_init__(self):
        if self.cls and not self.class_name:
            self.class_name = self.cls
        elif self.class_name and not self.cls:
            self.cls = self.class_name

    def to_dict(self) -> Dict[str, Any]:
        res = {
            "class": self.class_name,
            "confidence": round(self.confidence, 4),
            "bbox": self.bbox.to_dict(),
        }
        if self.polygon:
            res["polygon"] = [[round(pt[0], 1), round(pt[1], 1)] for pt in self.polygon]
        return res

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "MLDetection":
        from .config import CLASS_TO_ID
        cname = d["class"]
        cid = CLASS_TO_ID.get(cname, 0)
        bbox = BBox.from_dict(d["bbox"])
        poly = [tuple(p) for p in d["polygon"]] if "polygon" in d and d["polygon"] else None
        return cls(
            class_name=cname,
            confidence=float(d["confidence"]),
            bbox=bbox,
            class_id=cid,
            polygon=poly,
        )


@dataclass
class MLInferenceResult:
    """Inference output for a single image with timings and performance metrics."""
    image_id: str
    image_width: int
    image_height: int
    detections: List[MLDetection] = field(default_factory=list)
    preprocess_time_ms: float = 0.0
    inference_time_ms: float = 0.0
    postprocess_time_ms: float = 0.0
    device: str = "cpu"
    memory_allocated_mb: float = 0.0

    @property
    def total_time_ms(self) -> float:
        return self.preprocess_time_ms + self.inference_time_ms + self.postprocess_time_ms

    @property
    def orig_width(self) -> int:
        return self.image_width

    @property
    def orig_height(self) -> int:
        return self.image_height

    def class_counts(self) -> Dict[str, int]:
        from .config import STRUCTURAL_CLASSES
        counts = {c: 0 for c in STRUCTURAL_CLASSES}
        for d in self.detections:
            counts[d.class_name] = counts.get(d.class_name, 0) + 1
        return counts

    def to_dict(self) -> Dict[str, Any]:
        return {
            "imageId": self.image_id,
            "imageWidth": self.image_width,
            "imageHeight": self.image_height,
            "totalDetections": len(self.detections),
            "classCounts": self.class_counts(),
            "performance": {
                "preprocessTimeMs": round(self.preprocess_time_ms, 2),
                "inferenceTimeMs": round(self.inference_time_ms, 2),
                "postprocessTimeMs": round(self.postprocess_time_ms, 2),
                "totalTimeMs": round(self.total_time_ms, 2),
                "device": self.device,
                "memoryAllocatedMb": round(self.memory_allocated_mb, 2),
            },
            "detections": [d.to_dict() for d in self.detections],
        }


@dataclass
class MLStructuralEvidence:
    """Structural evidence extracted for a single recovery candidate."""
    wall_support: float = 0.0
    door_connection: float = 0.0
    window_connection: float = 0.0
    linkage_support: float = 0.0
    structural_confidence: float = 0.0
    door_count: int = 0
    window_count: int = 0
    cavity_likelihood: float = 0.0

    @property
    def has_door(self) -> bool:
        return self.door_count > 0 or self.door_connection > 0.0

    @property
    def has_window(self) -> bool:
        return self.window_count > 0 or self.window_connection > 0.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "wallSupport": round(self.wall_support, 4),
            "doorConnection": round(self.door_connection, 4),
            "windowConnection": round(self.window_connection, 4),
            "linkageSupport": round(self.linkage_support, 4),
            "structuralConfidence": round(self.structural_confidence, 4),
            "doorCount": self.door_count,
            "windowCount": self.window_count,
            "cavityLikelihood": round(self.cavity_likelihood, 4),
            "hasDoor": self.has_door,
            "hasWindow": self.has_window,
        }


@dataclass
class CandidateMLComparison:
    """Combined candidate comparison entry for evaluation."""
    candidate_id: str
    image_id: str
    gt_match: Optional[str]
    iou: float
    is_true_room: bool
    classical_confidence: float
    budget_rank: int
    rejection_reason: str
    ml_wall_evidence: float
    ml_door_evidence: float
    ml_window_evidence: float
    ml_linkage_evidence: float
    ml_structural_score: float
    cavity_likelihood: float

    def to_dict(self) -> Dict[str, Any]:
        return {
            "candidateId": self.candidate_id,
            "imageId": self.image_id,
            "gtMatch": self.gt_match,
            "iou": round(self.iou, 4),
            "isTrueRoom": self.is_true_room,
            "classicalConfidence": round(self.classical_confidence, 4),
            "budgetRank": self.budget_rank,
            "rejectionReason": self.rejection_reason,
            "mlWallEvidence": round(self.ml_wall_evidence, 4),
            "mlDoorEvidence": round(self.ml_door_evidence, 4),
            "mlWindowEvidence": round(self.ml_window_evidence, 4),
            "mlLinkageEvidence": round(self.ml_linkage_evidence, 4),
            "mlStructuralScore": round(self.ml_structural_score, 4),
            "cavityLikelihood": round(self.cavity_likelihood, 4),
        }
