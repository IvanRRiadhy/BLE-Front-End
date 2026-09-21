"""
Phase 2.10.0 Floorplan Text Detector
Lightweight, dependency-light classical CV text detector.
Uses connected components, character morphology, stroke width estimation,
and baseline line-grouping without heavyweight OCR dependencies.
"""
import time
import math
from typing import List, Tuple, Dict, Any, Optional
import cv2
import numpy as np
from shapely.geometry import Polygon as ShapelyPolygon, box as shapely_box

from .models import TextRegion, Phase210TextExperimentConfig, TextAnalysisResult


class TextDetector:
    """
    Floorplan-specific text region detector using classical computer vision.
    Operates at a bounded working resolution (max dimension <= 2048) and maps
    coordinates back to original image space with 100% boundary safety.
    """
    def __init__(self, config: Optional[Phase210TextExperimentConfig] = None):
        self.config = config or Phase210TextExperimentConfig()

    def detect(self, image: np.ndarray) -> TextAnalysisResult:
        """
        Executes text detection on input image array.
        GUARANTEE: The input image array is NEVER modified in-place.
        """
        t0 = time.perf_counter()
        if image is None or image.size == 0:
            return TextAnalysisResult(
                image_width=0,
                image_height=0,
                regions=[],
                text_mask=np.zeros((0, 0), dtype=np.uint8),
                text_likelihood_map=np.zeros((0, 0), dtype=np.float32),
                analysis_time_ms=0.0,
                scale_factor=1.0,
            )

        orig_h, orig_w = image.shape[:2]

        # 1. Working Resolution Scaling (max dim <= max_analysis_dimension)
        max_dim = max(orig_w, orig_h)
        if max_dim > self.config.max_analysis_dimension:
            scale = self.config.max_analysis_dimension / float(max_dim)
            work_w = max(1, int(round(orig_w * scale)))
            work_h = max(1, int(round(orig_h * scale)))
            work_img = cv2.resize(image, (work_w, work_h), interpolation=cv2.INTER_AREA)
        else:
            scale = 1.0
            work_w, work_h = orig_w, orig_h
            work_img = image.copy()

        inv_scale = 1.0 / scale

        # 2. Extract Grayscale plane
        if len(work_img.shape) == 2:
            gray = work_img.copy()
        elif work_img.shape[2] == 4:
            gray = cv2.cvtColor(work_img, cv2.COLOR_BGRA2GRAY)
        else:
            gray = cv2.cvtColor(work_img, cv2.COLOR_BGR2GRAY)

        # 3. Handle Polarity (Floorplans are typically dark strokes on light background)
        median_val = float(np.median(gray))
        is_light_bg = median_val > 127
        if not is_light_bg:
            gray_proc = 255 - gray
        else:
            gray_proc = gray

        # 4. Morphological Gradient / High-Frequency Stroke Contrast
        # Text characters exhibit strong local gradient in small kernels (3x3 to 5x5)
        k_grad = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        grad = cv2.morphologyEx(gray_proc, cv2.MORPH_GRADIENT, k_grad)

        # Adaptive thresholding to extract foreground stroke candidates
        adaptive_thresh = cv2.adaptiveThreshold(
            gray_proc,
            255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY_INV,
            15,
            5,
        )

        # Combine gradient highlights with adaptive threshold
        stroke_binary = cv2.bitwise_and(adaptive_thresh, cv2.threshold(grad, 20, 255, cv2.THRESH_BINARY)[1])

        # 5. Connected Components Analysis on character candidates
        num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(stroke_binary, connectivity=8)

        char_candidates: List[Dict[str, Any]] = []
        min_area = self.config.min_character_area
        max_area = self.config.max_character_area
        min_dim = self.config.min_character_dim
        max_dim_char = self.config.max_character_dim

        for lbl in range(1, num_labels):
            st = stats[lbl]
            x, y, w, h_comp, area = int(st[cv2.CC_STAT_LEFT]), int(st[cv2.CC_STAT_TOP]), int(st[cv2.CC_STAT_WIDTH]), int(st[cv2.CC_STAT_HEIGHT]), int(st[cv2.CC_STAT_AREA])

            # Filter non-character noise and long walls
            if area < min_area or area > max_area:
                continue
            if w < min_dim or h_comp < min_dim:
                continue
            if max(w, h_comp) > max_dim_char:
                continue

            aspect = float(w) / float(max(1, h_comp))
            # Individual characters rarely have aspect ratio > 4.5 or < 0.15
            if aspect > 4.5 or aspect < 0.15:
                continue

            # Fill ratio: text strokes have moderate fill ratio (0.15 to 0.75), not solid blocks
            bbox_area = max(1, w * h_comp)
            fill_ratio = float(area) / float(bbox_area)
            if fill_ratio > 0.85:
                continue

            cx, cy = float(centroids[lbl][0]), float(centroids[lbl][1])
            char_candidates.append({
                "label": lbl,
                "bbox": (x, y, w, h_comp),
                "area": area,
                "aspect": aspect,
                "centroid": (cx, cy),
                "fill_ratio": fill_ratio,
            })

        # 6. Proximity & Baseline Grouping into Text Lines / Words
        text_groups = self._group_characters_into_words(char_candidates, (work_h, work_w))

        # 7. Build TextRegion objects and scale back to original coordinate space
        detected_regions: List[TextRegion] = []
        reg_id = 0

        work_mask = np.zeros((work_h, work_w), dtype=np.uint8)
        work_likelihood = np.zeros((work_h, work_w), dtype=np.float32)

        for grp in text_groups:
            chars = grp["chars"]
            count = len(chars)

            # Combined bounding box in working space
            min_x = min(c["bbox"][0] for c in chars)
            min_y = min(c["bbox"][1] for c in chars)
            max_x = max(c["bbox"][0] + c["bbox"][2] for c in chars)
            max_y = max(c["bbox"][1] + c["bbox"][3] for c in chars)

            # Add tight padding (2-3px)
            pad_x = 3
            pad_y = 2
            min_x = max(0, min_x - pad_x)
            min_y = max(0, min_y - pad_y)
            max_x = min(work_w, max_x + pad_x)
            max_y = min(work_h, max_y + pad_y)

            grp_w = max_x - min_x
            grp_h = max_y - min_y
            if grp_w <= 0 or grp_h <= 0:
                continue

            # Scores
            alignment = grp["alignment_score"]
            repetition = grp["repetition_score"]
            confidence = grp["confidence"]
            likelihood = grp["likelihood"]

            if confidence < self.config.min_confidence:
                continue

            # Render to working mask and likelihood map
            cv2.rectangle(work_mask, (min_x, min_y), (max_x, max_y), 255, -1)
            cv2.rectangle(work_likelihood, (min_x, min_y), (max_x, max_y), float(likelihood), -1)

            # Map coordinates back to original pixel space
            orig_bbox_x = max(0, min(orig_w - 1, int(round(min_x * inv_scale))))
            orig_bbox_y = max(0, min(orig_h - 1, int(round(min_y * inv_scale))))
            orig_bbox_w = min(orig_w - orig_bbox_x, int(round(grp_w * inv_scale)))
            orig_bbox_h = min(orig_h - orig_bbox_y, int(round(grp_h * inv_scale)))

            # Original polygon box: [(x1,y1), (x2,y1), (x2,y2), (x1,y2)]
            poly = [
                (float(orig_bbox_x), float(orig_bbox_y)),
                (float(orig_bbox_x + orig_bbox_w), float(orig_bbox_y)),
                (float(orig_bbox_x + orig_bbox_w), float(orig_bbox_y + orig_bbox_h)),
                (float(orig_bbox_x), float(orig_bbox_y + orig_bbox_h)),
            ]

            reg_id += 1
            region = TextRegion(
                id=f"text_{reg_id:03d}",
                bbox=(orig_bbox_x, orig_bbox_y, orig_bbox_w, orig_bbox_h),
                polygon=poly,
                area=float(orig_bbox_w * orig_bbox_h),
                width=float(orig_bbox_w),
                height=float(orig_bbox_h),
                aspect_ratio=float(orig_bbox_w) / max(1.0, float(orig_bbox_h)),
                component_count=count,
                estimated_stroke_width=grp.get("avg_stroke_width", 1.5) * inv_scale,
                alignment_score=alignment,
                repetition_score=repetition,
                text_likelihood=likelihood,
                confidence=confidence,
                source_scale=scale,
            )
            detected_regions.append(region)

        # 8. Scale masks back to original image dimensions if working resolution was downscaled
        if scale != 1.0:
            final_mask = cv2.resize(work_mask, (orig_w, orig_h), interpolation=cv2.INTER_NEAREST)
            final_likelihood = cv2.resize(work_likelihood, (orig_w, orig_h), interpolation=cv2.INTER_LINEAR)
        else:
            final_mask = work_mask
            final_likelihood = work_likelihood

        elapsed_ms = (time.perf_counter() - t0) * 1000.0

        return TextAnalysisResult(
            image_width=orig_w,
            image_height=orig_h,
            regions=detected_regions,
            text_mask=final_mask,
            text_likelihood_map=final_likelihood,
            analysis_time_ms=elapsed_ms,
            scale_factor=scale,
        )

    def _group_characters_into_words(
        self, char_candidates: List[Dict[str, Any]], image_shape: Tuple[int, int]
    ) -> List[Dict[str, Any]]:
        """
        Clusters nearby character components along horizontal / vertical baselines.
        Returns grouped words with calculated confidence and alignment scores.
        """
        if not char_candidates:
            return []

        # Sort characters primarily by vertical y position (quantized into bands), then horizontal x
        n = len(char_candidates)
        visited = [False] * n
        groups = []

        # Precompute height and centroid arrays
        heights = np.array([c["bbox"][3] for c in char_candidates], dtype=np.float32)
        cxs = np.array([c["centroid"][0] for c in char_candidates], dtype=np.float32)
        cys = np.array([c["centroid"][1] for c in char_candidates], dtype=np.float32)

        for i in range(n):
            if visited[i]:
                continue

            current_group = [char_candidates[i]]
            visited[i] = True
            ref_h = heights[i]
            ref_cy = cys[i]

            # Find horizontally aligned neighbors (standard Western / architectural text)
            # Distance threshold is proportional to character height
            for j in range(i + 1, n):
                if visited[j]:
                    continue

                h_j = heights[j]
                cy_j = cys[j]
                cx_j = cxs[j]

                # 1. Height similarity check (within 55% of each other)
                h_ratio = min(ref_h, h_j) / max(ref_h, h_j)
                if h_ratio < 0.45:
                    continue

                # 2. Vertical alignment (centers within 0.75 * height)
                if abs(cy_j - ref_cy) > (0.75 * max(ref_h, h_j)):
                    continue

                # 3. Horizontal proximity (distance to nearest character in group < 2.5 * height)
                min_dx = min(abs(cx_j - c["centroid"][0]) for c in current_group)
                if min_dx <= (2.5 * max(ref_h, h_j)):
                    current_group.append(char_candidates[j])
                    visited[j] = True
                    # Update running reference baseline
                    ref_cy = np.mean([c["centroid"][1] for c in current_group])
                    ref_h = np.mean([c["bbox"][3] for c in current_group])

            # Calculate metrics for current group
            count = len(current_group)
            avg_h = float(np.mean([c["bbox"][3] for c in current_group]))

            # Alignment score: standard deviation of y-centers normalized by height
            if count > 1:
                cy_std = float(np.std([c["centroid"][1] for c in current_group]))
                alignment = max(0.0, 1.0 - (cy_std / max(1.0, avg_h)))

                # Repetition score: regularity of horizontal spacing
                sorted_by_x = sorted(current_group, key=lambda c: c["centroid"][0])
                spacings = [
                    sorted_by_x[k + 1]["centroid"][0] - sorted_by_x[k]["centroid"][0]
                    for k in range(len(sorted_by_x) - 1)
                ]
                if len(spacings) > 1:
                    space_std = float(np.std(spacings))
                    space_mean = float(np.mean(spacings))
                    repetition = max(0.0, 1.0 - (space_std / max(1.0, space_mean)))
                else:
                    repetition = 0.8
            else:
                alignment = 0.5
                repetition = 0.5

            # Multi-character words get higher likelihood & confidence
            if count >= 3:
                base_likelihood = 0.85
                base_conf = 0.80 + 0.15 * alignment
            elif count == 2:
                base_likelihood = 0.70
                base_conf = 0.65 + 0.15 * alignment
            else:
                # Single isolated character: lower confidence unless very character-like
                char = current_group[0]
                aspect = char["aspect"]
                if 0.4 <= aspect <= 1.5 and 8 <= char["bbox"][3] <= 35:
                    base_likelihood = 0.45
                    base_conf = 0.40
                else:
                    base_likelihood = 0.25
                    base_conf = 0.20

            groups.append({
                "chars": current_group,
                "alignment_score": round(alignment, 3),
                "repetition_score": round(repetition, 3),
                "confidence": round(min(1.0, base_conf), 3),
                "likelihood": round(min(1.0, base_likelihood), 3),
                "avg_stroke_width": max(1.0, avg_h * 0.15),
            })

        return groups
