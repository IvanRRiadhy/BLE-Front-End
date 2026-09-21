"""
Phase 2.8.0 ML Structural Inference Runner
Executes RT-DETR inference on floorplan images with coordinate mapping and performance profiling.
"""
import time
from pathlib import Path
from typing import Union, Optional, List
import numpy as np
import cv2
import torch

from .config import MLDetectorConfig, STRUCTURAL_CLASSES, ID_TO_CLASS
from .models import BBox, MLDetection, MLInferenceResult
from .detector import RTDETRFloorplanDetector

class MLInferenceEngine:
    """
    Inference pipeline for RT-DETR structural detection.
    Preserves original pixel coordinates and records timing metrics.
    """
    def __init__(self, detector: Optional[RTDETRFloorplanDetector] = None, config: Optional[MLDetectorConfig] = None):
        self.config = config or (detector.config if detector else MLDetectorConfig())
        self.detector = detector or RTDETRFloorplanDetector(self.config)
        if not self.detector.is_loaded:
            self.detector.load_model()

    def predict(
        self,
        image_or_path: Union[str, Path, np.ndarray],
        image_id: Optional[str] = None,
        conf_threshold: Optional[float] = None,
        confidence_threshold: Optional[float] = None,
    ) -> MLInferenceResult:
        """Alias for predict_image."""
        conf = conf_threshold if conf_threshold is not None else confidence_threshold
        return self.predict_image(image_or_path, image_id=image_id, confidence_threshold=conf)

    def predict_image(
        self,
        image_or_path: Union[str, Path, np.ndarray],
        image_id: Optional[str] = None,
        confidence_threshold: Optional[float] = None,
    ) -> MLInferenceResult:
        """
        Executes structural detection on an image.
        Maps detections back to original pixel coordinates.
        """
        conf = confidence_threshold if confidence_threshold is not None else self.config.confidence_threshold

        # Load image if path provided
        if isinstance(image_or_path, (str, Path)):
            path = Path(image_or_path)
            if not path.exists():
                raise FileNotFoundError(f"Image not found: {path}")
            img_id = image_id or path.stem
            img_bgr = cv2.imread(str(path), cv2.IMREAD_COLOR)
            if img_bgr is None:
                raise ValueError(f"Failed to read image at: {path}")
        elif isinstance(image_or_path, np.ndarray):
            img_id = image_id or "numpy_image"
            img_bgr = image_or_path
        else:
            raise TypeError(f"Unsupported image input type: {type(image_or_path)}")

        orig_h, orig_w = img_bgr.shape[:2]

        # Memory tracking
        if torch.cuda.is_available() and "cuda" in self.config.device:
            torch.cuda.reset_peak_memory_stats()
            mem_start = torch.cuda.memory_allocated() / (1024 * 1024)
        else:
            mem_start = 0.0

        t_start = time.perf_counter()

        # Run Ultralytics RT-DETR prediction
        # Ultralytics letterboxes to imgsz (1024), runs inference, and un-letterboxes boxes back to (orig_w, orig_h)
        results = self.detector.model.predict(
            source=img_bgr,
            imgsz=self.config.input_size,
            conf=conf,
            iou=self.config.iou_threshold,
            device=self.config.device,
            half=self.config.half_precision,
            verbose=False,
        )

        total_elapsed_ms = (time.perf_counter() - t_start) * 1000.0

        if torch.cuda.is_available() and "cuda" in self.config.device:
            mem_peak = torch.cuda.max_memory_allocated() / (1024 * 1024)
        else:
            mem_peak = 0.0

        # Extract timing breakdown from result.speed if available
        first_res = results[0] if results else None
        if first_res and hasattr(first_res, "speed"):
            speed = first_res.speed
            preprocess_ms = speed.get("preprocess", 0.0)
            inference_ms = speed.get("inference", 0.0)
            postprocess_ms = speed.get("postprocess", 0.0)
        else:
            preprocess_ms = 0.1 * total_elapsed_ms
            inference_ms = 0.8 * total_elapsed_ms
            postprocess_ms = 0.1 * total_elapsed_ms

        detections: List[MLDetection] = []
        if first_res and first_res.boxes is not None and len(first_res.boxes) > 0:
            b = first_res.boxes
            xyxy = b.xyxy.cpu().numpy()
            confs = b.conf.cpu().numpy()
            cls_ids = b.cls.cpu().numpy().astype(int)

            for i in range(len(b)):
                c_id = int(cls_ids[i])
                score = float(confs[i])
                x1, y1, x2, y2 = xyxy[i]

                # Clamp to original image bounds
                x1 = max(0.0, min(float(x1), float(orig_w)))
                y1 = max(0.0, min(float(y1), float(orig_h)))
                x2 = max(0.0, min(float(x2), float(orig_w)))
                y2 = max(0.0, min(float(y2), float(orig_h)))

                class_name = ID_TO_CLASS.get(c_id, f"class_{c_id}")

                detections.append(
                    MLDetection(
                        class_name=class_name,
                        confidence=score,
                        bbox=BBox(x1=x1, y1=y1, x2=x2, y2=y2),
                        class_id=c_id,
                    )
                )

        return MLInferenceResult(
            image_id=img_id,
            image_width=orig_w,
            image_height=orig_h,
            detections=detections,
            preprocess_time_ms=preprocess_ms,
            inference_time_ms=inference_ms,
            postprocess_time_ms=postprocess_ms,
            device=self.config.device,
            memory_allocated_mb=mem_peak,
        )
