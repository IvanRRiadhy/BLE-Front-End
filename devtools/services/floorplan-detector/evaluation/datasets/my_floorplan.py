"""
My Floorplan Dataset Adapter
Discovers and loads user-curated real-world floorplans and their human-validated .gt.json annotations.
"""
import json
from pathlib import Path
from typing import List, Optional
import cv2

from .base import BaseDatasetAdapter
from ..models import GroundTruthSample, GroundTruthArea, Point2D

class MyFloorplanAdapter(BaseDatasetAdapter):
    """
    Adapter for user real-world floorplans in my_floorplan/.
    """
    def __init__(self, dataset_root: Optional[Path] = None):
        if dataset_root is None:
            # Check datasets/my_floorplan first, then fallback to my_floorplan
            p1 = Path(__file__).parent.parent.parent / "datasets" / "my_floorplan"
            p2 = Path(__file__).parent.parent.parent / "my_floorplan"
            dataset_root = p1 if p1.exists() else p2
        super().__init__(dataset_root)
        self.dataset_root = Path(dataset_root)

    def discover_samples(self, limit: Optional[int] = None) -> List[str]:
        """
        Discovers all floorplans that have a corresponding .gt.json annotation.
        """
        if not self.dataset_root.exists():
            return []

        valid_exts = {".png", ".jpg", ".jpeg", ".webp"}
        samples = []

        for f in self.dataset_root.iterdir():
            if f.is_file() and f.suffix.lower() in valid_exts and not f.name.endswith(".gt.json"):
                gt_path = self.dataset_root / f"{f.stem}.gt.json"
                if gt_path.exists():
                    samples.append(f.name)

        samples = sorted(samples)
        if limit:
            samples = samples[:limit]
        return samples

    def discover_all_images(self) -> List[str]:
        """
        Returns all floorplan image filenames in directory regardless of annotation state.
        """
        if not self.dataset_root.exists():
            return []
        valid_exts = {".png", ".jpg", ".jpeg", ".webp"}
        images = [
            f.name for f in self.dataset_root.iterdir()
            if f.is_file() and f.suffix.lower() in valid_exts and not f.name.endswith(".gt.json")
        ]
        return sorted(images)

    def get_image_path(self, sample_id: str) -> Path:
        return self.dataset_root / sample_id

    def load_ground_truth(self, sample_id: str) -> GroundTruthSample:
        img_path = self.get_image_path(sample_id)
        if not img_path.exists():
            raise FileNotFoundError(f"Floorplan image not found: {img_path}")

        img = cv2.imread(str(img_path))
        if img is None:
            raise ValueError(f"Failed to read image at: {img_path}")
        h, w = img.shape[:2]

        gt_path = self.dataset_root / f"{Path(sample_id).stem}.gt.json"
        if not gt_path.exists():
            raise FileNotFoundError(f"Ground truth JSON not found for {sample_id} at {gt_path}")

        with open(gt_path, "r", encoding="utf-8") as gf:
            gt_data = json.load(gf)

        areas: List[GroundTruthArea] = []
        for idx, a in enumerate(gt_data.get("areas", [])):
            pts = [Point2D(p["xPx"], p["yPx"]) for p in a.get("polygon", [])]
            if len(pts) >= 3:
                areas.append(
                    GroundTruthArea(
                        id=a.get("id", f"gt_{idx+1:03d}"),
                        label=a.get("label", "room"),
                        polygon=pts,
                        category="room",
                    )
                )

        return GroundTruthSample(
            imageId=Path(sample_id).stem,
            imagePath=str(img_path),
            imageWidth=gt_data.get("imageWidth", w),
            imageHeight=gt_data.get("imageHeight", h),
            areas=areas,
            sourceDataset="my_floorplan",
        )
