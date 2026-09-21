"""
BIONIC Ground Truth and Evaluation Data Models
Provides dataset-independent and detector-independent internal representations.
"""
from dataclasses import dataclass, field, asdict
from typing import List, Dict, Any, Optional, Tuple

@dataclass
class Point2D:
    xPx: float
    yPx: float

    def to_tuple(self) -> Tuple[float, float]:
        return (float(self.xPx), float(self.yPx))

    def to_dict(self) -> Dict[str, float]:
        return {"xPx": round(self.xPx, 2), "yPx": round(self.yPx, 2)}

@dataclass
class GroundTruthArea:
    id: str
    label: str
    polygon: List[Point2D]
    category: str = "room"
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "label": self.label,
            "category": self.category,
            "polygon": [p.to_dict() for p in self.polygon],
            "metadata": self.metadata,
        }

@dataclass
class GroundTruthSample:
    imageId: str
    imagePath: str
    imageWidth: int
    imageHeight: int
    areas: List[GroundTruthArea]
    sourceDataset: str = "custom"
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "imageId": self.imageId,
            "imagePath": self.imagePath,
            "imageWidth": self.imageWidth,
            "imageHeight": self.imageHeight,
            "areas": [a.to_dict() for a in self.areas],
            "sourceDataset": self.sourceDataset,
            "metadata": self.metadata,
        }

@dataclass
class PredictedArea:
    id: str
    polygon: List[Point2D]
    confidence: Optional[float] = 1.0
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "polygon": [p.to_dict() for p in self.polygon],
            "confidence": self.confidence,
            "metadata": self.metadata,
        }

@dataclass
class PredictionResult:
    imageId: str
    imageWidth: int
    imageHeight: int
    areas: List[PredictedArea]
    executionTimeMs: float = 0.0
    detectorVersion: str = "current_cv"
    rawStats: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "imageId": self.imageId,
            "imageWidth": self.imageWidth,
            "imageHeight": self.imageHeight,
            "areas": [a.to_dict() for a in self.areas],
            "executionTimeMs": round(self.executionTimeMs, 2),
            "detectorVersion": self.detectorVersion,
            "rawStats": self.rawStats,
        }

@dataclass
class PolygonValidationResult:
    polygonId: str
    isValid: bool
    reasons: List[str]
    vertexCount: int
    areaPx: float
    isSelfIntersecting: bool
    isFinite: bool
    isWithinBounds: bool

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

@dataclass
class MatchedPair:
    gtId: str
    predId: str
    iou: float
    intersectionArea: float
    unionArea: float
    areaErrorPct: float
    centroidErrorPx: float
    normalizedCentroidError: float
    boundaryErrorPx: float  # Bidirectional Hausdorff distance in pixels

    def to_dict(self) -> Dict[str, Any]:
        return {
            "gtId": self.gtId,
            "predId": self.predId,
            "iou": round(self.iou, 4),
            "intersectionArea": round(self.intersectionArea, 1),
            "unionArea": round(self.unionArea, 1),
            "areaErrorPct": round(self.areaErrorPct, 2),
            "centroidErrorPx": round(self.centroidErrorPx, 2),
            "normalizedCentroidError": round(self.normalizedCentroidError, 4),
            "boundaryErrorPx": round(self.boundaryErrorPx, 2),
        }

@dataclass
class RoomMatchRecord:
    gtId: Optional[str]
    matchedPredictionId: Optional[str]
    status: str  # "matched", "missed", "false_positive"
    failureType: str  # "none", "missed", "false_positive", "merged", "split", "tiny_room", etc.
    iou: float = 0.0
    areaErrorPct: float = 0.0
    centroidErrorPx: float = 0.0
    boundaryErrorPx: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "gtId": self.gtId,
            "matchedPredictionId": self.matchedPredictionId,
            "status": self.status,
            "failureType": self.failureType,
            "iou": round(self.iou, 4),
            "areaErrorPct": round(self.areaErrorPct, 2),
            "centroidErrorPx": round(self.centroidErrorPx, 2),
            "boundaryErrorPx": round(self.boundaryErrorPx, 2),
        }

@dataclass
class TopologyMergedRoom:
    predictionId: str
    groundTruthIds: List[str]
    overlaps: Dict[str, float]  # gtId -> overlap fraction with prediction

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

@dataclass
class TopologySplitRoom:
    groundTruthId: str
    predictionIds: List[str]
    overlaps: Dict[str, float]  # predId -> overlap fraction with gt

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

@dataclass
class ImageEvaluationResult:
    imageId: str
    sourceDataset: str
    imageWidth: int
    imageHeight: int
    gtRoomCount: int
    predRoomCount: int
    truePositiveCount: int
    falsePositiveCount: int
    falseNegativeCount: int
    precision: float
    recall: float
    f1: float
    meanIoU: float
    medianIoU: float
    minIoU: float
    iouGte025Count: int
    iouGte050Count: int
    iouGte075Count: int
    iouGte090Count: int
    meanAreaErrorPct: float
    medianAreaErrorPct: float
    meanCentroidErrorPx: float
    meanBoundaryErrorPx: float
    gtCoveragePct: float
    predictionCoveragePct: float
    falsePositiveAreaPct: float
    mergedRooms: List[TopologyMergedRoom] = field(default_factory=list)
    splitRooms: List[TopologySplitRoom] = field(default_factory=list)
    invalidPredictions: List[PolygonValidationResult] = field(default_factory=list)
    matches: List[MatchedPair] = field(default_factory=list)
    unmatchedGtIds: List[str] = field(default_factory=list)
    unmatchedPredIds: List[str] = field(default_factory=list)
    passed: bool = False
    executionTimeMs: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "imageId": self.imageId,
            "sourceDataset": self.sourceDataset,
            "imageWidth": self.imageWidth,
            "imageHeight": self.imageHeight,
            "gtRoomCount": self.gtRoomCount,
            "predRoomCount": self.predRoomCount,
            "truePositiveCount": self.truePositiveCount,
            "falsePositiveCount": self.falsePositiveCount,
            "falseNegativeCount": self.falseNegativeCount,
            "precision": round(self.precision, 4),
            "recall": round(self.recall, 4),
            "f1": round(self.f1, 4),
            "meanIoU": round(self.meanIoU, 4),
            "medianIoU": round(self.medianIoU, 4),
            "minIoU": round(self.minIoU, 4),
            "iouBins": {
                "gte_0_25": self.iouGte025Count,
                "gte_0_50": self.iouGte050Count,
                "gte_0_75": self.iouGte075Count,
                "gte_0_90": self.iouGte090Count,
            },
            "meanAreaErrorPct": round(self.meanAreaErrorPct, 2),
            "medianAreaErrorPct": round(self.medianAreaErrorPct, 2),
            "meanCentroidErrorPx": round(self.meanCentroidErrorPx, 2),
            "meanBoundaryErrorPx": round(self.meanBoundaryErrorPx, 2),
            "gtCoveragePct": round(self.gtCoveragePct, 2),
            "predictionCoveragePct": round(self.predictionCoveragePct, 2),
            "falsePositiveAreaPct": round(self.falsePositiveAreaPct, 2),
            "mergedRooms": [m.to_dict() for m in self.mergedRooms],
            "splitRooms": [s.to_dict() for s in self.splitRooms],
            "invalidPredictions": [v.to_dict() for v in self.invalidPredictions],
            "matches": [m.to_dict() for m in self.matches],
            "unmatchedGtIds": self.unmatchedGtIds,
            "unmatchedPredIds": self.unmatchedPredIds,
            "passed": self.passed,
            "executionTimeMs": round(self.executionTimeMs, 2),
        }
