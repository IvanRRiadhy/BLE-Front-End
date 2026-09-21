"""
Current Classical CV Detector Adapter
Wraps FloorplanDetector as a black box without modifying its implementation.
"""
import time
from pathlib import Path
from typing import Dict, Any, Optional

from .base import BaseDetectorAdapter
from ..models import PredictionResult, PredictedArea, Point2D

try:
    from app.detector import FloorplanDetector
    from app.models import DetectionConfig
except ImportError:
    from ...app.detector import FloorplanDetector
    from ...app.models import DetectionConfig

class CurrentCVDetectorAdapter(BaseDetectorAdapter):
    """
    Adapter for the current OpenCV / Classical Computer Vision detector.
    """
    def __init__(self, config_dict: Optional[Dict[str, Any]] = None):
        super().__init__(name="current_cv", version="2.6.0", config=config_dict)
        self.detector = FloorplanDetector()
        
        cfg_kwargs = {}
        if config_dict:
            if "wall_close_kernel_size" in config_dict:
                cfg_kwargs["wall_close_kernel_size"] = config_dict["wall_close_kernel_size"]
            if "min_room_area_px" in config_dict:
                cfg_kwargs["min_room_area_px"] = config_dict["min_room_area_px"]
            if "auto_scale_kernel" in config_dict:
                cfg_kwargs["auto_scale_kernel"] = config_dict["auto_scale_kernel"]
            if "enable_multi_evidence" in config_dict:
                cfg_kwargs["enable_multi_evidence"] = config_dict["enable_multi_evidence"]
            if "recovery_precision" in config_dict:
                rp = config_dict["recovery_precision"]
                if isinstance(rp, dict):
                    from app.models import RecoveryPrecisionConfig
                    cfg_kwargs["recovery_precision"] = RecoveryPrecisionConfig.from_dict(rp)
                elif hasattr(rp, "budget_min"):
                    cfg_kwargs["recovery_precision"] = rp

        self.detection_config = DetectionConfig(**cfg_kwargs)

    def detect(self, image_path: Path) -> PredictionResult:
        if not image_path.exists():
            raise FileNotFoundError(f"Target image for detection not found: {image_path}")

        start_time = time.perf_counter()
        raw_result = self.detector.detect_file(image_path, self.detection_config)
        self.last_raw_result = raw_result
        elapsed_ms = (time.perf_counter() - start_time) * 1000.0

        predicted_areas = []
        for a in raw_result.areas:
            poly = [Point2D(p.xPx, p.yPx) for p in a.polygon]
            predicted_areas.append(
                PredictedArea(
                    id=a.id,
                    polygon=poly,
                    confidence=1.0,
                    metadata={"vertex_count": len(poly)},
                )
            )

        return PredictionResult(
            imageId=image_path.stem,
            imageWidth=raw_result.imageWidth,
            imageHeight=raw_result.imageHeight,
            areas=predicted_areas,
            executionTimeMs=elapsed_ms,
            detectorVersion=f"{self.name}_{self.version}",
            rawStats=raw_result.stats,
        )

    def detect_pre_recovery(self, image_path: Path):
        """Runs stages 1-6 and returns pre_bundle and active_cfg."""
        if not image_path.exists():
            raise FileNotFoundError(f"Target image for detection not found: {image_path}")
        return self.detector.detect_file_pre_recovery(image_path, self.detection_config)

    def detect_post_recovery(self, image_path: Path, pre_bundle: Dict[str, Any], active_cfg: DetectionConfig) -> PredictionResult:
        """Executes candidate recovery and boundary reconstruction on pre_bundle."""
        start_time = time.perf_counter()
        raw_result = self.detector.detect_post_recovery(pre_bundle, active_cfg)
        self.last_raw_result = raw_result
        elapsed_ms = (time.perf_counter() - start_time) * 1000.0

        predicted_areas = []
        for a in raw_result.areas:
            poly = [Point2D(p.xPx, p.yPx) for p in a.polygon]
            predicted_areas.append(
                PredictedArea(
                    id=a.id,
                    polygon=poly,
                    confidence=1.0,
                    metadata={"vertex_count": len(poly)},
                )
            )

        return PredictionResult(
            imageId=image_path.stem,
            imageWidth=raw_result.imageWidth,
            imageHeight=raw_result.imageHeight,
            areas=predicted_areas,
            executionTimeMs=elapsed_ms,
            detectorVersion=f"{self.name}_{self.version}",
            rawStats=raw_result.stats,
        )

