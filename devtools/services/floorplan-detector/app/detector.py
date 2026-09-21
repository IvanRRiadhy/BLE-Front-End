"""
FloorplanDetector Core Service Class
Encapsulates the classical computer vision detection pipeline.
Completely framework-independent (zero FastAPI / HTTP dependencies).
"""
import cv2
import numpy as np
from typing import Optional, Union, Tuple, Dict, Any
from pathlib import Path

from .models import DetectionConfig, DetectionResult
from .preprocessing import preprocess_image
from .wall_detection import extract_wall_mask, extract_wall_evidence, extract_multichannel_wall_evidence
from .space_detection import segment_enclosed_spaces
from .polygon import extract_polygons_from_mask

class FloorplanDetector:
    """
    Classical Computer Vision Floorplan Detector.
    Converts floorplan images into validated polygon chambers in original pixel space.
    """
    def __init__(self, default_config: Optional[DetectionConfig] = None):
        self.default_config = default_config or DetectionConfig()

    def detect_pre_recovery(
        self, img: np.ndarray, config: Optional[DetectionConfig] = None
    ) -> Tuple[Dict[str, Any], DetectionConfig]:
        """
        Executes preprocessing, multi-channel wall evidence, wall network graph,
        and room hypothesis generation up to stage 6 (pre-recovery).
        """
        if img is None or img.size == 0:
            raise ValueError("Input image array is empty or None")

        cfg = config or self.default_config
        h, w = img.shape[:2]

        # Resolution adaptation if configured
        if cfg.auto_scale_kernel:
            scale = (w + h) / 1700.0
            kernel_sz = max(15, int(cfg.wall_close_kernel_size * scale))
            if kernel_sz % 2 == 0:
                kernel_sz += 1
            min_area = int(cfg.min_room_area_px * (scale ** 2))
            
            active_cfg = DetectionConfig(
                threshold_method=cfg.threshold_method,
                adaptive_block_size=cfg.adaptive_block_size,
                adaptive_c=cfg.adaptive_c,
                bilateral_d=cfg.bilateral_d,
                bilateral_sigma=cfg.bilateral_sigma,
                wall_close_kernel_size=kernel_sz,
                wall_dilation_iterations=cfg.wall_dilation_iterations,
                min_room_area_px=min_area,
                max_room_area_ratio=cfg.max_room_area_ratio,
                min_solidity=cfg.min_solidity,
                simplify_tolerance=cfg.simplify_tolerance,
                min_vertices=cfg.min_vertices,
                max_vertices=cfg.max_vertices,
                enable_multi_evidence=cfg.enable_multi_evidence,
                min_wall_support_ratio=cfg.min_wall_support_ratio,
                min_footprint_containment=cfg.min_footprint_containment,
                min_room_score=cfg.min_room_score,
                suppress_interior_furniture=cfg.suppress_interior_furniture,
                enable_envelope_boundary=cfg.enable_envelope_boundary,
                envelope_close_kernel_size=max(35, int(cfg.envelope_close_kernel_size * min(scale, 2.5))),
                max_exterior_opening_px=max(80, int(cfg.max_exterior_opening_px * min(scale, 2.5))),
                min_exterior_opening_px=cfg.min_exterior_opening_px,
                envelope_min_area_ratio=cfg.envelope_min_area_ratio,
                recovery_precision=cfg.recovery_precision,
                ml_fusion=cfg.ml_fusion,
            )
        else:
            active_cfg = cfg

        # 1. Preprocessing
        gray, binary = preprocess_image(img, active_cfg)

        # 2. Multi-Evidence Boundary Extraction (Phase 2.7.2 Multi-Channel)
        wall_mask, thick_walls, gradient_img, edges_img, struct_lines, evidence_channels, est_wall_thickness = extract_multichannel_wall_evidence(
            gray, binary, active_cfg, raw_img=img
        )

        # Build WallNetwork graph
        from .wall_network import extract_wall_segments, build_wall_network, compute_stroke_confidence
        raw_segs = extract_wall_segments(wall_mask, active_cfg)
        segs = compute_stroke_confidence(raw_segs, (h, w), active_cfg)
        wall_network = build_wall_network(segs, active_cfg)

        # 3. Space Segmentation & Candidate Analysis up to stage 6
        from .space_detection import construct_pre_recovery_bundle
        pre_bundle = construct_pre_recovery_bundle(
            wall_mask=wall_mask,
            config=active_cfg,
            wall_network=wall_network,
            thick_walls=thick_walls,
            gradient_img=gradient_img,
            estimated_wall_thickness=est_wall_thickness,
        )
        pre_bundle["raw_img"] = img

        return pre_bundle, active_cfg

    def detect_post_recovery(
        self,
        pre_bundle: Dict[str, Any],
        config: DetectionConfig,
        render_diagnostic_images: Optional[bool] = None,
        raw_image: Optional[np.ndarray] = None,
        ml_evidence_result: Optional[Any] = None,
        image_name: str = "",
    ) -> DetectionResult:
        """
        Executes candidate recovery and boundary reconstruction given a pre-recovery bundle.
        """
        from .space_detection import apply_candidate_recovery_and_reconstruction
        img_input = raw_image if raw_image is not None else pre_bundle.get("raw_img")
        areas, diag_json, diag_images = apply_candidate_recovery_and_reconstruction(
            pre_bundle=pre_bundle,
            config=config,
            render_diagnostic_images=render_diagnostic_images,
            raw_image=img_input,
            ml_evidence_result=ml_evidence_result,
            image_name=image_name,
        )
        w = pre_bundle["w"]
        h = pre_bundle["h"]
        stats = {
            "image_width": w,
            "image_height": h,
            "final_valid_polygons": len(areas),
            "diagnostics": diag_json,
        }
        return DetectionResult(
            imageWidth=w,
            imageHeight=h,
            areas=areas,
            stats=stats,
        )

    def detect_image(
        self, img: np.ndarray, config: Optional[DetectionConfig] = None
    ) -> DetectionResult:
        """
        Executes the full end-to-end detection pipeline on an image array.
        """
        pre_bundle, active_cfg = self.detect_pre_recovery(img, config)
        return self.detect_post_recovery(pre_bundle, active_cfg, raw_image=img)


    def detect_bytes(
        self, image_bytes: bytes, config: Optional[DetectionConfig] = None
    ) -> DetectionResult:
        """
        Decodes raw byte stream (e.g. from HTTP upload) and runs detection.
        """
        if not image_bytes:
            raise ValueError("Image bytes payload is empty")

        np_arr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_UNCHANGED)
        
        if img is None:
            raise ValueError("Failed to decode image from bytes. Unsupported or corrupt format.")

        return self.detect_image(img, config)

    def detect_file(
        self, file_path: Union[str, Path], config: Optional[DetectionConfig] = None
    ) -> DetectionResult:
        """
        Reads image from disk path and runs detection.
        """
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"Image file not found: {path}")

        img = cv2.imread(str(path), cv2.IMREAD_UNCHANGED)
        if img is None:
            raise ValueError(f"Failed to read image at: {path}")

        return self.detect_image(img, config)

    def detect_file_pre_recovery(
        self, file_path: Union[str, Path], config: Optional[DetectionConfig] = None
    ) -> Tuple[Dict[str, Any], DetectionConfig]:
        """
        Reads image from disk path and executes stages 1-6 up to candidate recovery.
        """
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"Image file not found: {path}")

        img = cv2.imread(str(path), cv2.IMREAD_UNCHANGED)
        if img is None:
            raise ValueError(f"Failed to read image at: {path}")

        return self.detect_pre_recovery(img, config)
