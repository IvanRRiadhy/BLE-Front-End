"""
Synthetic Dataset Adapter (Tier A - Synthetic Regression)
Adapts procedural synthetic samples 01 through 09 with exact mathematical ground truth.
"""
from pathlib import Path
from typing import List, Dict, Optional
import cv2

from .base import BaseDatasetAdapter
from ..models import GroundTruthSample, GroundTruthArea, Point2D

try:
    from samples.ground_truth import GROUND_TRUTH_DATA
except ImportError:
    from ...samples.ground_truth import GROUND_TRUTH_DATA

# Ground truth polygons for extended phase 2.6 cases (07, 08, 09)
EXTENDED_GT: Dict[str, List[List[Point2D]]] = {
    "07_2d_architectural_complex.png": [
        # Living Room
        [Point2D(155, 105), Point2D(595, 105), Point2D(595, 475), Point2D(155, 475)],
        # Kitchen
        [Point2D(605, 105), Point2D(1045, 105), Point2D(1045, 475), Point2D(605, 475)],
        # Bathroom
        [Point2D(155, 485), Point2D(595, 485), Point2D(595, 795), Point2D(155, 795)],
        # Bedroom
        [Point2D(605, 485), Point2D(1045, 485), Point2D(1045, 795), Point2D(605, 795)],
    ],
    "08_rendered_3d_floorplan.png": [
        # Room 1
        [Point2D(100, 100), Point2D(433, 100), Point2D(433, 500), Point2D(100, 500)],
        # Room 2
        [Point2D(433, 100), Point2D(766, 100), Point2D(766, 500), Point2D(433, 500)],
        # Room 3
        [Point2D(766, 100), Point2D(1100, 100), Point2D(1100, 500), Point2D(766, 500)],
    ],
    "09_site_architectural_plan.png": [
        # Office A (Upper Left)
        [Point2D(405, 325), Point2D(695, 325), Point2D(695, 515), Point2D(405, 515)],
        # Office B (Lower Left)
        [Point2D(405, 525), Point2D(695, 525), Point2D(695, 715), Point2D(405, 715)],
        # Conference Room (Right Wing)
        [Point2D(705, 325), Point2D(995, 325), Point2D(995, 715), Point2D(705, 715)],
    ],
}

class SyntheticDatasetAdapter(BaseDatasetAdapter):
    """
    Adapter for deterministic synthetic architectural floorplans.
    """
    def __init__(self, samples_dir: Optional[Path] = None):
        if samples_dir is None:
            samples_dir = Path(__file__).parent.parent.parent / "samples"
        super().__init__(samples_dir)
        self.samples_dir = Path(samples_dir)

    def discover_samples(self, limit: Optional[int] = None) -> List[str]:
        # Discovers all sample PNG files matching 01..09
        samples = sorted([p.name for p in self.samples_dir.glob("[0-9][0-9]_*.png")])
        if limit:
            samples = samples[:limit]
        return samples

    def get_image_path(self, sample_id: str) -> Path:
        return self.samples_dir / sample_id

    def load_ground_truth(self, sample_id: str) -> GroundTruthSample:
        img_path = self.get_image_path(sample_id)
        if not img_path.exists():
            raise FileNotFoundError(f"Synthetic sample image not found: {img_path}")

        img = cv2.imread(str(img_path))
        if img is None:
            raise ValueError(f"Failed to read image at: {img_path}")
        h, w = img.shape[:2]

        areas: List[GroundTruthArea] = []

        if sample_id in GROUND_TRUTH_DATA:
            for idx, pts in enumerate(GROUND_TRUTH_DATA[sample_id]):
                poly = [Point2D(p[0], p[1]) for p in pts]
                areas.append(
                    GroundTruthArea(
                        id=f"gt_{idx+1:03d}",
                        label=f"Room {idx+1}",
                        polygon=poly,
                        category="room",
                    )
                )
        elif sample_id in EXTENDED_GT:
            for idx, poly in enumerate(EXTENDED_GT[sample_id]):
                areas.append(
                    GroundTruthArea(
                        id=f"gt_{idx+1:03d}",
                        label=f"Room {idx+1}",
                        polygon=poly,
                        category="room",
                    )
                )
        else:
            raise KeyError(f"No ground truth registered for {sample_id}")

        return GroundTruthSample(
            imageId=sample_id,
            imagePath=str(img_path),
            imageWidth=w,
            imageHeight=h,
            areas=areas,
            sourceDataset="synthetic",
        )
