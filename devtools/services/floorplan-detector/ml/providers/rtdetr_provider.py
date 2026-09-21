"""
Phase 2.9.1 RT-DETR Structural Evidence Provider
Thread-safe, failure-safe provider integrating Ultralytics RT-DETR-L structural detections
into BIONIC candidate ranking with lazy loading, device control, and graceful degradation.
"""
import time
import logging
import threading
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple, Union
import numpy as np

from ml.config import MLDetectorConfig, DEFAULT_WEIGHTS_PATH
from ml.detector import RTDETRFloorplanDetector
from ml.structural_evidence import StructuralEvidenceExtractor
from ml.models import MLDetection, MLStructuralEvidence

from .base import StructuralEvidenceProvider, StructuralEvidenceResult

logger = logging.getLogger("bionic.detector.ml_provider")


class RTDETRStructuralEvidenceProvider(StructuralEvidenceProvider):
    """
    Production-safe provider wrapping RT-DETR-L for architectural evidence extraction.
    Thread-safe and guaranteed not to raise exceptions to caller.
    """
    _instance_lock = threading.Lock()
    _shared_detector: Optional[RTDETRFloorplanDetector] = None
    _shared_detector_config: Optional[MLDetectorConfig] = None
    _model_load_time_ms: float = 0.0

    def __init__(
        self,
        weights_path: Optional[Union[str, Path]] = None,
        device: str = "auto",
        cpu_fallback: bool = False,
        timeout_ms: int = 5000,
        confidence_threshold: float = 0.30,
        buffer_px: float = 12.0,
    ):
        self.weights_path = Path(weights_path) if weights_path else DEFAULT_WEIGHTS_PATH
        self.requested_device = device.lower()
        self.cpu_fallback = cpu_fallback
        self.timeout_ms = timeout_ms
        self.confidence_threshold = confidence_threshold
        self.buffer_px = buffer_px

        self.extractor = StructuralEvidenceExtractor(buffer_px=self.buffer_px)
        self.active_device = "none"
        self._init_error: Optional[str] = None

    def _resolve_device(self) -> Tuple[Optional[str], Optional[str]]:
        """
        Determines target device based on hardware and configuration.
        Returns (device_str, fallback_reason).
        """
        import torch

        cuda_available = torch.cuda.is_available()

        if self.requested_device == "cuda":
            if cuda_available:
                return "cuda", None
            return None, "cuda_requested_but_unavailable"

        elif self.requested_device == "cpu":
            return "cpu", None

        elif self.requested_device == "auto":
            if cuda_available:
                return "cuda", None
            elif self.cpu_fallback:
                return "cpu", None
            else:
                return None, "cuda_unavailable_and_cpu_fallback_disabled"

        return None, f"invalid_device_requested_{self.requested_device}"

    def is_available(self) -> bool:
        """Checks whether the model weights exist and a valid device can be targeted."""
        if not self.weights_path.exists():
            return False
        dev, err = self._resolve_device()
        return dev is not None and err is None

    def _ensure_model_loaded(self) -> Tuple[Optional[RTDETRFloorplanDetector], Optional[str]]:
        """
        Lazily loads and caches the RT-DETR model in process with thread locking.
        """
        target_device, dev_err = self._resolve_device()
        if dev_err:
            return None, dev_err

        if not self.weights_path.exists():
            return None, f"weights_not_found_{self.weights_path}"

        with self._instance_lock:
            # Check if shared detector is already loaded with matching configuration
            if (
                RTDETRStructuralEvidenceProvider._shared_detector is not None
                and RTDETRStructuralEvidenceProvider._shared_detector.is_loaded
                and RTDETRStructuralEvidenceProvider._shared_detector_config is not None
                and RTDETRStructuralEvidenceProvider._shared_detector_config.device == target_device
                and RTDETRStructuralEvidenceProvider._shared_detector_config.weights_path == self.weights_path
            ):
                self.active_device = target_device
                return RTDETRStructuralEvidenceProvider._shared_detector, None

            # Load model
            t0 = time.perf_counter()
            try:
                detector_config = MLDetectorConfig(
                    weights_path=self.weights_path,
                    device=target_device,
                    confidence_threshold=self.confidence_threshold,
                    input_size=1024,
                )
                detector = RTDETRFloorplanDetector(detector_config)
                detector.load_model()

                load_ms = (time.perf_counter() - t0) * 1000.0
                RTDETRStructuralEvidenceProvider._shared_detector = detector
                RTDETRStructuralEvidenceProvider._shared_detector_config = detector_config
                RTDETRStructuralEvidenceProvider._model_load_time_ms = load_ms
                self.active_device = target_device

                logger.info(
                    f"RT-DETR-L model loaded successfully on {target_device} in {load_ms:.1f}ms "
                    f"from {self.weights_path}"
                )
                return detector, None

            except Exception as e:
                err_msg = f"model_load_failed: {str(e)}"
                logger.warning(f"[RTDETRProvider] {err_msg}", exc_info=True)
                return None, err_msg

    def extract_evidence(
        self,
        image: Optional[np.ndarray],
        candidates: List[Any],
        image_shape: Optional[Tuple[int, int]] = None,
        detections: Optional[List[MLDetection]] = None,
    ) -> StructuralEvidenceResult:
        """
        Executes RT-DETR inference on the image (or uses provided detections) and associates
        structural detections (specifically doorway connections) with all candidate polygons.
        Guaranteed not to raise exceptions.
        """
        t_total_start = time.perf_counter()

        res = StructuralEvidenceResult(
            provider_name="rtdetr",
            ml_enabled=True,
            ml_available=False,
            device_used="none",
        )

        # If detections are explicitly provided (e.g. from benchmark cache or test injection)
        if detections is not None:
            res.ml_available = True
            res.detections = detections
            orig_h = image_shape[0] if image_shape else (image.shape[0] if image is not None else 1000)
            orig_w = image_shape[1] if image_shape else (image.shape[1] if image is not None else 1000)
            img_shape = (orig_h, orig_w)
        else:
            # 1. Check image input
            if image is None or not isinstance(image, np.ndarray) or image.size == 0:
                res.ml_fallback = True
                res.ml_fallback_reason = "empty_or_invalid_image"
                res.total_ml_time_ms = (time.perf_counter() - t_total_start) * 1000.0
                return res

            orig_h, orig_w = image.shape[:2]
            img_shape = image_shape or (orig_h, orig_w)

            # 2. Ensure model is loaded lazily
            detector, load_err = self._ensure_model_loaded()
            if detector is None:
                res.ml_fallback = True
                res.ml_fallback_reason = load_err
                res.model_load_time_ms = RTDETRStructuralEvidenceProvider._model_load_time_ms
                res.total_ml_time_ms = (time.perf_counter() - t_total_start) * 1000.0
                return res

            res.ml_available = True
            res.device_used = self.active_device
            res.model_load_time_ms = RTDETRStructuralEvidenceProvider._model_load_time_ms

            # 3. Thread-safe inference execution
            t_infer_start = time.perf_counter()
            dets: List[MLDetection] = []

            try:
                with self._instance_lock:
                    # Ensure 3 channels for Ultralytics
                    if len(image.shape) == 2:
                        import cv2
                        img_rgb = cv2.cvtColor(image, cv2.COLOR_GRAY2BGR)
                    else:
                        img_rgb = image

                    results = detector.model.predict(
                        source=img_rgb,
                        imgsz=detector.config.input_size,
                        conf=self.confidence_threshold,
                        iou=detector.config.iou_threshold,
                        device=self.active_device,
                        half=detector.config.half_precision if "cuda" in self.active_device else False,
                        verbose=False,
                    )

                    if results and len(results) > 0:
                        r = results[0]
                        from ml.config import ID_TO_CLASS
                        from ml.models import BBox
                        if hasattr(r, "boxes") and r.boxes is not None:
                            boxes = r.boxes.xyxy.cpu().numpy()
                            confs = r.boxes.conf.cpu().numpy()
                            classes = r.boxes.cls.cpu().numpy().astype(int)
                            for box, conf, cls_id in zip(boxes, confs, classes):
                                class_name = ID_TO_CLASS.get(int(cls_id), f"class_{cls_id}")
                                dets.append(
                                    MLDetection(
                                        class_name=class_name,
                                        class_id=int(cls_id),
                                        confidence=float(conf),
                                        bbox=BBox(
                                            x1=float(box[0]),
                                            y1=float(box[1]),
                                            x2=float(box[2]),
                                            y2=float(box[3]),
                                        ),
                                    )
                                )

                infer_ms = (time.perf_counter() - t_infer_start) * 1000.0
                res.inference_time_ms = infer_ms

                # Timeout check (post-inference check)
                if infer_ms > self.timeout_ms:
                    logger.warning(
                        f"[RTDETRProvider] Inference time {infer_ms:.1f}ms exceeded timeout {self.timeout_ms}ms"
                    )
                    res.ml_fallback = True
                    res.ml_fallback_reason = f"inference_timeout_{infer_ms:.0f}ms"
                    res.total_ml_time_ms = (time.perf_counter() - t_total_start) * 1000.0
                    return res

            except Exception as infer_err:
                logger.warning(f"[RTDETRProvider] Inference error: {infer_err}", exc_info=True)
                res.ml_fallback = True
                res.ml_fallback_reason = f"inference_exception: {str(infer_err)}"
                res.total_ml_time_ms = (time.perf_counter() - t_total_start) * 1000.0
                return res

            res.detections = dets

        # 4. Associate Evidence with Candidates
        t_assoc_start = time.perf_counter()
        candidate_evidence: Dict[str, MLStructuralEvidence] = {}
        door_evidence: Dict[str, float] = {}

        try:
            for cand in candidates:
                cand_id = getattr(cand, "id", None) or getattr(cand, "recovery_id", None) or str(id(cand))
                # Extract coordinates
                if hasattr(cand, "polygon"):
                    poly_raw = cand.polygon
                    if poly_raw and hasattr(poly_raw[0], "xPx"):
                        coords = [(p.xPx, p.yPx) for p in poly_raw]
                    elif poly_raw and isinstance(poly_raw[0], (list, tuple)):
                        coords = [tuple(p) for p in poly_raw]
                    else:
                        coords = []
                elif isinstance(cand, (list, tuple)):
                    coords = list(cand)
                else:
                    coords = []

                if len(coords) >= 3:
                    ev = self.extractor.extract_evidence(coords, res.detections, image_shape=img_shape)
                    if ev is not None:
                        candidate_evidence[cand_id] = ev
                        door_evidence[cand_id] = ev.door_connection
                    else:
                        candidate_evidence[cand_id] = MLStructuralEvidence()
                        door_evidence[cand_id] = 0.0
                else:
                    candidate_evidence[cand_id] = MLStructuralEvidence()
                    door_evidence[cand_id] = 0.0

            res.candidate_evidence = candidate_evidence
            res.door_evidence = door_evidence
            res.association_time_ms = (time.perf_counter() - t_assoc_start) * 1000.0

        except Exception as assoc_err:
            logger.warning(f"[RTDETRProvider] Association error: {assoc_err}", exc_info=True)
            res.ml_fallback = True
            res.ml_fallback_reason = f"association_exception: {str(assoc_err)}"

        res.total_ml_time_ms = (time.perf_counter() - t_total_start) * 1000.0
        return res

    def get_diagnostics(self) -> Dict[str, Any]:
        return {
            "provider": "rtdetr",
            "weights_path": str(self.weights_path),
            "weights_exist": self.weights_path.exists(),
            "requested_device": self.requested_device,
            "active_device": self.active_device,
            "cpu_fallback": self.cpu_fallback,
            "timeout_ms": self.timeout_ms,
            "is_loaded": (
                RTDETRStructuralEvidenceProvider._shared_detector is not None
                and RTDETRStructuralEvidenceProvider._shared_detector.is_loaded
            ),
            "model_load_time_ms": RTDETRStructuralEvidenceProvider._model_load_time_ms,
        }
