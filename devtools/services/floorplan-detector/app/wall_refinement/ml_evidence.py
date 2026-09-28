"""
ML Structural Evidence Extraction for Phase 2.10.11 Multimodal Structural Wall Mask Refinement.
Re-uses the pretrained RT-DETR model to extract structural detections:
- wall
- door
- window
- railing
- linkage_point
Rasterizes detections into continuous 2D spatial confidence maps without hard binarization.
"""
from typing import Dict, Any, List, Optional, Tuple
import cv2
import numpy as np

from ml.inference import MLInferenceEngine
from ml.models import MLDetection, MLInferenceResult


class MLStructuralEvidenceExtractor:
    """
    Wraps RT-DETR inference engine to produce 2D continuous spatial evidence maps.
    """

    def __init__(self, inference_engine: Optional[MLInferenceEngine] = None, confidence_threshold: float = 0.15):
        self.engine = inference_engine or MLInferenceEngine()
        self.confidence_threshold = confidence_threshold

    def extract_evidence(
        self,
        image_or_path: Any,
        image_id: str,
        image_shape: Tuple[int, int],  # (height, width)
    ) -> Tuple[Dict[str, np.ndarray], List[MLDetection]]:
        """
        Executes RT-DETR inference and rasterizes detections into float32 [0..1] continuous heatmaps.
        """
        h, w = image_shape
        ml_res: MLInferenceResult = self.engine.predict_image(
            image_or_path, image_id=image_id, confidence_threshold=self.confidence_threshold
        )

        wall_map = np.zeros((h, w), dtype=np.float32)
        door_map = np.zeros((h, w), dtype=np.float32)
        window_map = np.zeros((h, w), dtype=np.float32)
        railing_map = np.zeros((h, w), dtype=np.float32)
        linkage_map = np.zeros((h, w), dtype=np.float32)

        for d in ml_res.detections:
            x1 = max(0, min(w - 1, int(round(d.bbox.x1))))
            y1 = max(0, min(h - 1, int(round(d.bbox.y1))))
            x2 = max(0, min(w, int(round(d.bbox.x2))))
            y2 = max(0, min(h, int(round(d.bbox.y2))))

            if x2 <= x1 or y2 <= y1:
                continue

            conf = float(d.confidence)
            cls_name = d.class_name.lower()

            if cls_name == "wall":
                wall_map[y1:y2, x1:x2] = np.maximum(wall_map[y1:y2, x1:x2], conf)
            elif cls_name == "door":
                door_map[y1:y2, x1:x2] = np.maximum(door_map[y1:y2, x1:x2], conf)
            elif cls_name == "window":
                window_map[y1:y2, x1:x2] = np.maximum(window_map[y1:y2, x1:x2], conf)
            elif cls_name == "railing":
                railing_map[y1:y2, x1:x2] = np.maximum(railing_map[y1:y2, x1:x2], conf)
            elif cls_name == "linkage_point":
                # Linkage points represent junctions: expand with small Gaussian kernel
                linkage_map[y1:y2, x1:x2] = np.maximum(linkage_map[y1:y2, x1:x2], conf)

        # Smooth heatmaps slightly with Gaussian filter to produce continuous confidence
        k_sz = (7, 7)
        wall_map = cv2.GaussianBlur(wall_map, k_sz, 0)
        door_map = cv2.GaussianBlur(door_map, k_sz, 0)
        window_map = cv2.GaussianBlur(window_map, k_sz, 0)
        linkage_map = cv2.GaussianBlur(linkage_map, (5, 5), 0)

        evidence_dict = {
            "ml_wall_evidence": wall_map.astype(np.float32),
            "ml_door_evidence": door_map.astype(np.float32),
            "ml_window_evidence": window_map.astype(np.float32),
            "ml_railing_evidence": railing_map.astype(np.float32),
            "ml_linkage_evidence": linkage_map.astype(np.float32),
        }

        return evidence_dict, ml_res.detections
