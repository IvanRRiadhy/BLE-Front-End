import unittest
from pathlib import Path
import sys

base_dir = Path(__file__).parent.parent.parent
if str(base_dir) not in sys.path:
    sys.path.insert(0, str(base_dir))

from evaluation.datasets.synthetic import SyntheticDatasetAdapter
from evaluation.datasets.cubicasa import CubiCasaAdapter
from evaluation.adapters.current_cv import CurrentCVDetectorAdapter

class TestAdapters(unittest.TestCase):
    def test_synthetic_adapter_discovery_and_loading(self):
        adapter = SyntheticDatasetAdapter()
        samples = adapter.discover_samples()
        self.assertGreaterEqual(len(samples), 6)
        self.assertIn("01_single_room.png", samples)

        sample = adapter.load_ground_truth("01_single_room.png")
        self.assertEqual(sample.imageId, "01_single_room.png")
        self.assertEqual(len(sample.areas), 1)
        self.assertGreater(len(sample.areas[0].polygon), 3)

    def test_cubicasa_svg_parsing(self):
        adapter = CubiCasaAdapter()
        # Test SVG points parsing
        points = adapter._parse_svg_points("10,20 30,40 50,60")
        self.assertEqual(len(points), 3)
        self.assertEqual(points[0].xPx, 10.0)
        self.assertEqual(points[0].yPx, 20.0)

    def test_current_cv_detector_adapter(self):
        adapter = CurrentCVDetectorAdapter()
        sample_path = base_dir / "samples" / "01_single_room.png"
        self.assertTrue(sample_path.exists())

        res = adapter.detect(sample_path)
        self.assertEqual(res.imageId, "01_single_room")
        self.assertGreaterEqual(len(res.areas), 1)
        self.assertGreater(res.executionTimeMs, 0.0)

if __name__ == "__main__":
    unittest.main()
