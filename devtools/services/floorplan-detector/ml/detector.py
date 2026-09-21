"""
Phase 2.8.0 RT-DETR Model Management & Loader
Encapsulates loading, automatic checkpoint retrieval, and initialization of RT-DETR-L.
"""
import os
import sys
import time
import urllib.request
from pathlib import Path
from typing import Optional, Any, Tuple
import numpy as np
import torch

from .config import MLDetectorConfig, DEFAULT_WEIGHTS_PATH, WEIGHTS_DOWNLOAD_URL

class RTDETRFloorplanDetector:
    """
    Wrapper around Ultralytics RT-DETR for floorplan structural detection.
    """
    def __init__(self, config: Optional[MLDetectorConfig] = None):
        self.config = config or MLDetectorConfig()
        self.model: Optional[Any] = None
        self._is_loaded = False
        self.load_time_ms: float = 0.0

    @property
    def is_loaded(self) -> bool:
        return self._is_loaded and self.model is not None

    @property
    def weights_path(self) -> Path:
        return Path(self.config.weights_path)

    def load(self) -> None:
        """Alias for load_model."""
        if not self.is_loaded:
            self.load_model()

    def get_class_names(self) -> dict:
        if self.model and hasattr(self.model, "names"):
            return self.model.names
        from .config import ID_TO_CLASS
        return ID_TO_CLASS

    def load_image(self, image_input: Any) -> Tuple[np.ndarray, Tuple[int, int]]:
        """Loads an image (path, numpy, or PIL) and returns (numpy_array, (width, height))."""
        from PIL import Image
        import cv2
        if isinstance(image_input, (str, Path)):
            img = cv2.imread(str(image_input))
            h, w = img.shape[:2]
            return img, (w, h)
        elif isinstance(image_input, Image.Image):
            arr = np.array(image_input)
            h, w = arr.shape[:2]
            return arr, (w, h)
        elif isinstance(image_input, np.ndarray):
            h, w = image_input.shape[:2]
            return image_input, (w, h)
        raise TypeError(f"Unsupported image type: {type(image_input)}")

    def ensure_weights(self) -> Path:
        """
        Verifies weights exist at weights_path. Downloads from GitHub if missing.
        """
        weights_path = Path(self.config.weights_path)
        if weights_path.exists() and weights_path.stat().st_size > 10_000_000:
            return weights_path

        weights_path.parent.mkdir(parents=True, exist_ok=True)
        url = self.config.download_url or WEIGHTS_DOWNLOAD_URL
        print(f"[MLDetector] Checkpoint not found at {weights_path}. Downloading from {url}...")
        
        t0 = time.perf_counter()
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
        )
        with urllib.request.urlopen(req) as resp, open(weights_path, "wb") as out_file:
            content = resp.read()
            out_file.write(content)
        
        elapsed = time.perf_counter() - t0
        sz_mb = weights_path.stat().st_size / (1024 * 1024)
        print(f"[MLDetector] Downloaded {sz_mb:.1f} MB checkpoint in {elapsed:.2f}s to {weights_path}")
        return weights_path

    def load_model(self) -> None:
        """
        Loads the RT-DETR model checkpoint via Ultralytics.
        """
        from ultralytics import RTDETR

        t0 = time.perf_counter()
        weights_path = self.ensure_weights()

        print(f"[MLDetector] Loading RT-DETR model from {weights_path} onto device '{self.config.device}'...")
        self.model = RTDETR(str(weights_path))
        
        # Verify model classes
        model_names = getattr(self.model, "names", {})
        if model_names:
            print(f"[MLDetector] Loaded model classes: {model_names}")

        self.load_time_ms = (time.perf_counter() - t0) * 1000.0
        self._is_loaded = True
        print(f"[MLDetector] Model loaded successfully in {self.load_time_ms:.1f}ms")

    def get_metadata(self) -> dict:
        """Returns model metadata for feasibility reports."""
        return {
            "modelPath": str(self.config.weights_path),
            "modelVersion": "RT-DETR-L (CubiCasa5K 60ep)",
            "inputSize": self.config.input_size,
            "confidenceThreshold": self.config.confidence_threshold,
            "iouThreshold": self.config.iou_threshold,
            "device": self.config.device,
            "halfPrecision": self.config.half_precision,
            "loadTimeMs": round(self.load_time_ms, 2),
            "classes": self.config.classes,
        }
