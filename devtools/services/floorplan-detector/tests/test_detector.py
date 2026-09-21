import sys
import unittest
from pathlib import Path
import cv2

# Set path for importing detector package
base_dir = Path(__file__).parent.parent
sys.path.insert(0, str(base_dir))

from app.models import DetectionConfig
from app.preprocessing import preprocess_image
from app.wall_detection import extract_wall_mask
from app.space_detection import segment_enclosed_spaces
from app.polygon import extract_polygons_from_mask
from detect import run_detection

class TestFloorplanDetector(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.samples_dir = base_dir / "samples"
        cls.output_dir = base_dir / "output" / "test_run"
        cls.config = DetectionConfig(wall_close_kernel_size=40)

    def _test_sample(self, filename: str, expected_rooms: int):
        img_path = self.samples_dir / filename
        self.assertTrue(img_path.exists(), f"Sample image {filename} does not exist.")

        sample_out_dir = self.output_dir / img_path.stem
        result = run_detection(img_path, sample_out_dir, self.config, debug=True)

        # 1. Check dimensions
        img = cv2.imread(str(img_path))
        h, w = img.shape[:2]
        self.assertEqual(result.imageWidth, w)
        self.assertEqual(result.imageHeight, h)

        # 2. Check room count
        self.assertEqual(
            len(result.areas),
            expected_rooms,
            f"{filename}: Expected {expected_rooms} rooms, got {len(result.areas)}",
        )

        # 3. Check polygon validity
        for area in result.areas:
            self.assertGreaterEqual(len(area.polygon), 3, f"Polygon in {area.id} has < 3 vertices")
            for pt in area.polygon:
                self.assertGreaterEqual(pt.xPx, 0, "xPx must be non-negative")
                self.assertLessEqual(pt.xPx, w, f"xPx {pt.xPx} exceeds image width {w}")
                self.assertGreaterEqual(pt.yPx, 0, "yPx must be non-negative")
                self.assertLessEqual(pt.yPx, h, f"yPx {pt.yPx} exceeds image height {h}")

        # 4. Check debug files generated
        for i in range(1, 8):
            debug_files = list(sample_out_dir.glob(f"{i:02d}_*.png"))
            self.assertGreaterEqual(len(debug_files), 1, f"Missing debug file {i:02d}_*.png")

        json_path = sample_out_dir / "detection.json"
        self.assertTrue(json_path.exists(), "Missing detection.json")

    def test_01_single_room(self):
        self._test_sample("01_single_room.png", expected_rooms=1)

    def test_02_two_rooms(self):
        self._test_sample("02_two_rooms.png", expected_rooms=2)

    def test_03_three_rooms_connected(self):
        self._test_sample("03_three_rooms_connected.png", expected_rooms=3)

    def test_04_l_shaped_room(self):
        self._test_sample("04_l_shaped_room.png", expected_rooms=2)

    def test_05_corridor_and_rooms(self):
        self._test_sample("05_corridor_and_rooms.png", expected_rooms=5)

    def test_06_realistic_architectural(self):
        self._test_sample("06_realistic_architectural.png", expected_rooms=6)

if __name__ == "__main__":
    unittest.main(verbosity=2)
