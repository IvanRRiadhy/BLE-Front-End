"""
Abstract Base Dataset Adapter for Floorplan Benchmarks
"""
from abc import ABC, abstractmethod
from pathlib import Path
from typing import List, Optional
from ..models import GroundTruthSample

class BaseDatasetAdapter(ABC):
    """
    Abstract interface for acquiring, discovering, and loading ground truth samples.
    """
    def __init__(self, dataset_root: Optional[Path] = None):
        self.dataset_root = Path(dataset_root) if dataset_root else None

    @abstractmethod
    def discover_samples(self, limit: Optional[int] = None) -> List[str]:
        """
        Returns list of discoverable sample IDs.
        """
        pass

    @abstractmethod
    def load_ground_truth(self, sample_id: str) -> GroundTruthSample:
        """
        Loads and returns normalized GroundTruthSample for sample_id.
        """
        pass

    @abstractmethod
    def get_image_path(self, sample_id: str) -> Path:
        """
        Returns file path to the raster image for sample_id.
        """
        pass
