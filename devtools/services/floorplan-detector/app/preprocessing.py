import cv2
import numpy as np
from typing import Tuple, Dict
from .models import DetectionConfig

def to_grayscale(img: np.ndarray) -> np.ndarray:
    """
    Converts input image (BGR or BGRA) to 8-bit single channel grayscale.
    Composites 4-channel BGRA images with alpha transparency onto a solid white background.
    """
    if len(img.shape) == 2:
        return img
    if img.shape[2] == 4:
        bgr = img[:, :, :3].astype(np.float32)
        alpha = (img[:, :, 3].astype(np.float32) / 255.0)[:, :, np.newaxis]
        white_bg = np.full_like(bgr, 255.0)
        composited = (bgr * alpha + white_bg * (1.0 - alpha)).astype(np.uint8)
        return cv2.cvtColor(composited, cv2.COLOR_BGR2GRAY)
    return cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

def detect_image_polarity(gray: np.ndarray) -> bool:
    """
    Determines whether an image is light-background (paper blueprint) or dark-background (CAD mode).
    Inspects border pixels and overall intensity distribution.
    
    Returns:
        True if light background (walls are dark, empty room space is light).
        False if dark background (walls are bright, empty room space is dark).
    """
    h, w = gray.shape[:2]
    # Sample outer border ring (top, bottom, left, right edges)
    top_edge = gray[0:max(1, int(h * 0.02)), :]
    bot_edge = gray[min(h - 1, int(h * 0.98)):h, :]
    left_edge = gray[:, 0:max(1, int(w * 0.02))]
    right_edge = gray[:, min(w - 1, int(w * 0.98)):w]

    border_mean = np.mean([
        np.mean(top_edge),
        np.mean(bot_edge),
        np.mean(left_edge),
        np.mean(right_edge),
    ])
    
    overall_median = np.median(gray)
    # If border or overall median is light (> 110), it's a light-background drawing
    return float(border_mean) > 110.0 or float(overall_median) > 110.0

def extract_color_channels(img: np.ndarray) -> Dict[str, np.ndarray]:
    """
    Extracts color channels (HSV, Lab, BGR max-min difference) for colored/faint blueprint wall detection.
    """
    channels = {}
    if len(img.shape) == 2 or img.shape[2] == 1:
        gray = img if len(img.shape) == 2 else img[:, :, 0]
        channels["hsv_s"] = np.zeros_like(gray)
        channels["hsv_v"] = gray
        channels["lab_l"] = gray
        channels["rgb_diff"] = np.zeros_like(gray)
        return channels

    bgr = img[:, :, :3]
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
    lab = cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB)

    channels["hsv_s"] = hsv[:, :, 1]  # Saturation channel
    channels["hsv_v"] = hsv[:, :, 2]  # Value / Brightness channel
    channels["lab_l"] = lab[:, :, 0]  # Lightness channel

    # Channel contrast (Max - Min among B, G, R)
    b, g, r = cv2.split(bgr)
    c_max = np.maximum(b, np.maximum(g, r))
    c_min = np.minimum(b, np.minimum(g, r))
    channels["rgb_diff"] = cv2.subtract(c_max, c_min)

    return channels

def reduce_noise(gray: np.ndarray, config: DetectionConfig) -> np.ndarray:
    """
    Applies edge-preserving bilateral filtering to reduce paper scan grain
    and raster artifacts while preserving crisp structural wall boundaries.
    """
    return cv2.bilateralFilter(
        gray,
        d=config.bilateral_d,
        sigmaColor=config.bilateral_sigma,
        sigmaSpace=config.bilateral_sigma,
    )

def threshold_image(gray: np.ndarray, config: DetectionConfig) -> np.ndarray:
    """
    Converts grayscale floorplan into a standardized binary image where:
    - 255 (White): Structural lines, walls, and boundaries
    - 0 (Black): Empty space / room interiors / background
    
    Automatically handles both light-background (paper blueprints)
    and dark-background (CAD/GIS dark mode) floorplans.
    """
    is_light_background = detect_image_polarity(gray)

    if config.threshold_method == "adaptive":
        thresh_type = cv2.THRESH_BINARY_INV if is_light_background else cv2.THRESH_BINARY
        binary = cv2.adaptiveThreshold(
            gray,
            255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            thresh_type,
            config.adaptive_block_size,
            config.adaptive_c,
        )
    else:  # Otsu thresholding
        thresh_type = (cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU) if is_light_background else (cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        _, binary = cv2.threshold(gray, 0, 255, thresh_type)

    return binary

def morphological_cleanup(binary: np.ndarray, kernel_size: int = 3) -> np.ndarray:
    """
    Removes isolated single-pixel noise and subtle hatch marks.
    """
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (kernel_size, kernel_size))
    # Open: erosion followed by dilation to remove tiny isolated white specks
    cleaned = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel)
    return cleaned

def preprocess_image(img: np.ndarray, config: DetectionConfig) -> Tuple[np.ndarray, np.ndarray]:
    """
    Full modular preprocessing pipeline:
    Input Image -> Grayscale -> Bilateral Noise Reduction -> Binary Threshold -> Morphological Cleanup.
    """
    gray = to_grayscale(img)
    denoised = reduce_noise(gray, config)
    binary = threshold_image(denoised, config)
    cleaned = morphological_cleanup(binary)
    return gray, cleaned
