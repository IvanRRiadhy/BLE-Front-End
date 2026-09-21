"""
Phase 2.8.0 ML Structural Detector Configuration
Defines model parameters, paths, confidence thresholds, and class definitions.
"""
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Dict, Tuple, Optional
import torch

PACKAGE_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_WEIGHTS_DIR = Path(__file__).resolve().parent / "weights"
DEFAULT_WEIGHTS_PATH = DEFAULT_WEIGHTS_DIR / "rtdetr_l_autoresearch_60ep.pt"
WEIGHTS_DOWNLOAD_URL = "https://raw.githubusercontent.com/OldDeLorean/rtdetr-floorplan-detector/main/weights/rtdetr_l_autoresearch_60ep.pt"

# The 5 structural classes from OldDeLorean/rtdetr-floorplan-detector (CubiCasa5K)
STRUCTURAL_CLASSES: List[str] = [
    "wall",
    "door",
    "window",
    "railing",
    "linkage_point",
]

CLASS_TO_ID: Dict[str, int] = {name: i for i, name in enumerate(STRUCTURAL_CLASSES)}
ID_TO_CLASS: Dict[int, str] = {i: name for i, name in enumerate(STRUCTURAL_CLASSES)}

# Visualization colors (RGB) and z-stack order
CLASS_COLORS: Dict[int, Tuple[int, int, int]] = {
    0: (42, 120, 214),   # wall: blue
    1: (0, 131, 0),      # door: green
    2: (213, 81, 129),   # window: pink/magenta
    3: (201, 133, 0),    # railing: amber/orange
    4: (74, 58, 167),    # linkage_point: purple
}

CLASS_Z_INDEX: Dict[int, int] = {
    0: 0,    # wall at bottom
    3: 50,   # railing
    4: 50,   # linkage
    1: 100,  # door on top
    2: 100,  # window on top
}

@dataclass
class MLDetectorConfig:
    """
    Configuration for RT-DETR structural detection.
    """
    weights_path: Path = DEFAULT_WEIGHTS_PATH
    input_size: int = 1024
    confidence_threshold: float = 0.15
    iou_threshold: float = 0.45
    device: str = "cuda" if torch.cuda.is_available() else "cpu"
    half_precision: bool = True if torch.cuda.is_available() else False
    classes: List[str] = field(default_factory=lambda: list(STRUCTURAL_CLASSES))
    auto_download: bool = True
    download_url: str = WEIGHTS_DOWNLOAD_URL

    def to_dict(self) -> Dict:
        return {
            "weightsPath": str(self.weights_path),
            "inputSize": self.input_size,
            "confidenceThreshold": self.confidence_threshold,
            "iouThreshold": self.iou_threshold,
            "device": self.device,
            "halfPrecision": self.half_precision,
            "classes": self.classes,
        }
