"""
Opening Protection Module for Phase 2.10.11 Multimodal Structural Wall Mask Refinement.
CRITICAL MODULE:
Prevents destructive false wall closure across doorways, windows, and exterior openings.
Generates protectedOpeningMask (uint8 0 or 255) using ML door/window detections,
linkage points, and classical opening topology.
"""
from typing import List, Dict, Any, Optional, Tuple
import cv2
import numpy as np
from ml.models import MLDetection


class OpeningProtectionEngine:
    """
    Constructs protected spatial zones around legitimate architectural apertures.
    """

    def __init__(
        self,
        door_dilation_px: int = 5,
        window_dilation_px: int = 4,
        min_door_confidence: float = 0.20,
    ):
        self.door_dilation_px = door_dilation_px
        self.window_dilation_px = window_dilation_px
        self.min_door_confidence = min_door_confidence

    def build_protected_mask(
        self,
        image_shape: Tuple[int, int],
        ml_detections: Optional[List[MLDetection]] = None,
        doors: Optional[List[Any]] = None,
        openings_diag: Optional[List[Any]] = None,
    ) -> Tuple[np.ndarray, np.ndarray, int]:
        """
        Returns:
        - protected_mask: binary uint8 mask (255 inside protected openings)
        - opening_confidence_map: float32 map (0..1) of opening likelihood
        - protected_count: total apertures protected
        """
        h, w = image_shape
        protected_mask = np.zeros((h, w), dtype=np.uint8)
        opening_confidence = np.zeros((h, w), dtype=np.float32)
        count = 0

        # 1. Protect ML Detections (doors, windows)
        if ml_detections:
            for d in ml_detections:
                cls_name = d.class_name.lower()
                conf = float(d.confidence)
                if conf < self.min_door_confidence:
                    continue

                if cls_name in ("door", "window", "railing"):
                    x1 = max(0, min(w - 1, int(round(d.bbox.x1))))
                    y1 = max(0, min(h - 1, int(round(d.bbox.y1))))
                    x2 = max(0, min(w, int(round(d.bbox.x2))))
                    y2 = max(0, min(h, int(round(d.bbox.y2))))

                    if x2 > x1 and y2 > y1:
                        cv2.rectangle(protected_mask, (x1, y1), (x2, y2), 255, -1)
                        opening_confidence[y1:y2, x1:x2] = np.maximum(opening_confidence[y1:y2, x1:x2], conf)
                        count += 1

        # 2. Protect existing doorway objects if provided
        if doors:
            for d in doors:
                bbox = getattr(d, "bbox", None)
                if isinstance(d, dict):
                    bbox = d.get("bbox")
                if bbox and len(bbox) >= 4:
                    x1 = max(0, min(w - 1, int(bbox[0])))
                    y1 = max(0, min(h - 1, int(bbox[1])))
                    x2 = max(0, min(w, int(bbox[0] + bbox[2])))
                    y2 = max(0, min(h, int(bbox[1] + bbox[3])))
                    if x2 > x1 and y2 > y1:
                        cv2.rectangle(protected_mask, (x1, y1), (x2, y2), 255, -1)
                        opening_confidence[y1:y2, x1:x2] = np.maximum(opening_confidence[y1:y2, x1:x2], 0.85)
                        count += 1

        # 3. Protect architectural openings from diagnostics
        if openings_diag:
            for op in openings_diag:
                x1 = int(getattr(op, "x1", 0))
                y1 = int(getattr(op, "y1", 0))
                x2 = int(getattr(op, "x2", 0))
                y2 = int(getattr(op, "y2", 0))
                cv2.line(protected_mask, (x1, y1), (x2, y2), 255, thickness=6)
                count += 1

        # Dilate slightly to form a protective safety buffer around opening jambs
        if self.door_dilation_px > 0 and np.count_nonzero(protected_mask) > 0:
            k = cv2.getStructuringElement(cv2.MORPH_RECT, (self.door_dilation_px, self.door_dilation_px))
            protected_mask = cv2.dilate(protected_mask, k)

        return protected_mask, opening_confidence, count
