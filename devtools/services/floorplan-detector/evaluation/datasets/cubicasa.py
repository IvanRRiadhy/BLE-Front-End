"""
CubiCasa5K Dataset Adapter (Tier B & Tier C Benchmark)
Parses CubiCasa5K SVG vector annotations (model.svg) and pairs them with raster images.
Converts space polygons to the normalized BIONIC GroundTruthSample schema.
"""
import os
import re
import json
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
import cv2

from .base import BaseDatasetAdapter
from ..models import GroundTruthSample, GroundTruthArea, Point2D

# Explicit room category whitelist
SUPPORTED_ROOM_CATEGORIES = {
    "living room",
    "kitchen",
    "bedroom",
    "bathroom",
    "toilet",
    "hall",
    "hallway",
    "corridor",
    "entry",
    "dining",
    "office",
    "study",
    "closet",
    "walk-in closet",
    "storage",
    "laundry",
    "sauna",
    "utility",
    "room",
    "space",
}

# Explicit non-room entities to ignore (per requirement: do not invent GT)
UNSUPPORTED_ENTITIES = {
    "wall",
    "door",
    "window",
    "railing",
    "fixedfurniture",
    "furniture",
    "outdoor",
    "balcony_exterior",
    "terrace",
    "shaft",
    "chimney",
    "stairs",
    "column",
    "pillar",
}

class CubiCasaAdapter(BaseDatasetAdapter):
    """
    Adapter for the public CubiCasa5K floorplan dataset.
    """
    def __init__(self, dataset_root: Optional[Path] = None):
        if dataset_root is None:
            dataset_root = Path(__file__).parent.parent.parent / "datasets" / "cubicasa5k"
        super().__init__(dataset_root)
        self.dataset_root = Path(dataset_root)

    def discover_samples(self, limit: Optional[int] = None) -> List[str]:
        """
        Discovers all valid sample directories containing an image and annotation.
        """
        if not self.dataset_root.exists():
            return []

        samples = []
        # Support both flat directory structures and CubiCasa nested folders (high_quality_architectural/...)
        for path in self.dataset_root.rglob("*"):
            if path.is_dir():
                # Check if directory has model.svg or annotation.json and an image
                has_svg = (path / "model.svg").exists()
                has_json = (path / "annotation.json").exists()
                has_img = any(
                    (path / name).exists()
                    for name in ["F1_scaled.png", "F1_original.png", "floorplan.png", "image.png"]
                )
                if (has_svg or has_json) and has_img:
                    # Use relative path from dataset_root as sample ID
                    rel_id = path.relative_to(self.dataset_root).as_posix()
                    samples.append(rel_id)

        samples = sorted(samples)
        if limit:
            samples = samples[:limit]
        return samples

    def get_sample_dir(self, sample_id: str) -> Path:
        return self.dataset_root / sample_id

    def get_image_path(self, sample_id: str) -> Path:
        s_dir = self.get_sample_dir(sample_id)
        for name in ["F1_scaled.png", "F1_original.png", "floorplan.png", "image.png"]:
            candidate = s_dir / name
            if candidate.exists():
                return candidate
        # Fallback: first png or jpg in directory
        for f in s_dir.glob("*.png"):
            return f
        for f in s_dir.glob("*.jpg"):
            return f
        raise FileNotFoundError(f"No raster image found for CubiCasa sample: {sample_id}")

    def load_ground_truth(self, sample_id: str) -> GroundTruthSample:
        s_dir = self.get_sample_dir(sample_id)
        img_path = self.get_image_path(sample_id)

        img = cv2.imread(str(img_path))
        if img is None:
            raise ValueError(f"Failed to read image at: {img_path}")
        img_h, img_w = img.shape[:2]

        json_path = s_dir / "annotation.json"
        svg_path = s_dir / "model.svg"

        if json_path.exists():
            areas = self._parse_json_annotation(json_path, img_w, img_h)
        elif svg_path.exists():
            areas = self._parse_svg_annotation(svg_path, img_w, img_h)
        else:
            raise FileNotFoundError(f"No annotation file (model.svg or annotation.json) in {s_dir}")

        return GroundTruthSample(
            imageId=sample_id,
            imagePath=str(img_path),
            imageWidth=img_w,
            imageHeight=img_h,
            areas=areas,
            sourceDataset="cubicasa5k",
            metadata={"sampleDir": str(s_dir)},
        )

    def _parse_svg_points(self, points_str: str) -> List[Point2D]:
        pts = []
        raw_pairs = points_str.strip().replace(",", " ").split()
        for i in range(0, len(raw_pairs), 2):
            if i + 1 < len(raw_pairs):
                try:
                    x = float(raw_pairs[i])
                    y = float(raw_pairs[i + 1])
                    pts.append(Point2D(x, y))
                except ValueError:
                    continue
        return pts

    def _parse_svg_annotation(
        self, svg_path: Path, target_w: int, target_h: int
    ) -> List[GroundTruthArea]:
        tree = ET.parse(svg_path)
        root = tree.getroot()

        # Extract SVG viewBox / dimensions for coordinate scaling
        view_box = root.get("viewBox")
        svg_w = float(root.get("width", target_w))
        svg_h = float(root.get("height", target_h))

        if view_box:
            vb_parts = [float(v) for v in view_box.split()]
            if len(vb_parts) == 4:
                svg_w = vb_parts[2]
                svg_h = vb_parts[3]

        scale_x = target_w / svg_w if svg_w > 0 else 1.0
        scale_y = target_h / svg_h if svg_h > 0 else 1.0

        areas: List[GroundTruthArea] = []
        area_idx = 1

        # Strip namespace if present
        for elem in root.iter():
            tag = elem.tag.split("}")[-1]
            elem_class = (elem.get("class") or "").lower()
            elem_id = (elem.get("id") or "").lower()

            # Filter non-room entities
            if any(unsupported in elem_class or unsupported in elem_id for unsupported in UNSUPPORTED_ENTITIES):
                continue

            points_raw = ""
            if tag == "polygon":
                points_raw = elem.get("points", "")
            elif tag == "polyline":
                points_raw = elem.get("points", "")
            elif tag == "path":
                # Extract simple M...L/Z path data if present
                d = elem.get("d", "")
                points_raw = self._extract_points_from_svg_path(d)

            if not points_raw:
                continue

            raw_pts = self._parse_svg_points(points_raw)
            if len(raw_pts) < 3:
                continue

            # Scale to match raster image pixel space
            scaled_poly = [
                Point2D(p.xPx * scale_x, p.yPx * scale_y) for p in raw_pts
            ]

            label = elem.get("class") or elem.get("id") or f"Room_{area_idx}"
            areas.append(
                GroundTruthArea(
                    id=f"gt_{area_idx:03d}",
                    label=label,
                    polygon=scaled_poly,
                    category="room",
                    metadata={"svgClass": elem.get("class"), "svgId": elem.get("id")},
                )
            )
            area_idx += 1

        return areas

    def _extract_points_from_svg_path(self, d_str: str) -> str:
        # Regex extraction of coordinate pairs following M, L, or bare numbers
        matches = re.findall(r"[-+]?[0-9]*\.?[0-9]+", d_str)
        return " ".join(matches)

    def _parse_json_annotation(
        self, json_path: Path, target_w: int, target_h: int
    ) -> List[GroundTruthArea]:
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        orig_w = data.get("imageWidth", target_w)
        orig_h = data.get("imageHeight", target_h)
        scale_x = target_w / orig_w if orig_w > 0 else 1.0
        scale_y = target_h / orig_h if orig_h > 0 else 1.0

        areas: List[GroundTruthArea] = []
        for idx, item in enumerate(data.get("areas", [])):
            poly = [
                Point2D(p["xPx"] * scale_x, p["yPx"] * scale_y)
                for p in item.get("polygon", [])
            ]
            if len(poly) >= 3:
                areas.append(
                    GroundTruthArea(
                        id=item.get("id", f"gt_{idx+1:03d}"),
                        label=item.get("label", f"Room_{idx+1}"),
                        polygon=poly,
                        category=item.get("category", "room"),
                    )
                )
        return areas
