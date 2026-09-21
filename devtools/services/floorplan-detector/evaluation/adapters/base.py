"""
Abstract Base Detector Adapter
"""
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Dict, Any, Optional
from ..models import PredictionResult

class BaseDetectorAdapter(ABC):
    """
    Standard black-box interface for evaluating any floorplan detector model.
    """
    def __init__(self, name: str, version: str = "1.0", config: Optional[Dict[str, Any]] = None):
        self.name = name
        self.version = version
        self.config = config or {}

    @abstractmethod
    def detect(self, image_path: Path) -> PredictionResult:
        """
        Executes detection on the given image and returns normalized PredictionResult.
        """
        pass
