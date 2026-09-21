import unittest
import json
import tempfile
import shutil
from pathlib import Path
import sys

base_dir = Path(__file__).parent.parent.parent
if str(base_dir) not in sys.path:
    sys.path.insert(0, str(base_dir))

from evaluation.datasets.my_floorplan import MyFloorplanAdapter
from evaluation.models import GroundTruthSample, GroundTruthArea, Point2D
from evaluation.adapters.current_cv import CurrentCVDetectorAdapter
from evaluation.metrics import evaluate_image

class TestMyFloorplanEvaluation(unittest.TestCase):
    def setUp(self):
        self.adapter = MyFloorplanAdapter()

    def test_discover_all_images(self):
        images = self.adapter.discover_all_images()
        self.assertGreaterEqual(len(images), 10)
        self.assertTrue(any("sample-floorplan" in img for img in images))

    def test_load_ground_truth_from_gt_json(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp_path = Path(tmp_dir)

            # Copy a sample image into temporary directory
            real_img = self.adapter.dataset_root / "sample-floorplan.png"
            self.assertTrue(real_img.exists())
            shutil.copy(real_img, tmp_path / "sample-floorplan.png")

            # Create normalized .gt.json
            gt_data = {
                "imageId": "sample-floorplan",
                "imagePath": "sample-floorplan.png",
                "imageWidth": 623,
                "imageHeight": 431,
                "areas": [
                    {
                        "id": "gt_001",
                        "label": "room",
                        "polygon": [
                            {"xPx": 50, "yPx": 50},
                            {"xPx": 250, "yPx": 50},
                            {"xPx": 250, "yPx": 200},
                            {"xPx": 50, "yPx": 200},
                        ],
                    }
                ],
            }
            gt_file = tmp_path / "sample-floorplan.gt.json"
            with open(gt_file, "w", encoding="utf-8") as f:
                json.dump(gt_data, f, indent=2)

            # Initialize adapter pointing to tmp_path
            custom_adapter = MyFloorplanAdapter(dataset_root=tmp_path)
            samples = custom_adapter.discover_samples()
            self.assertEqual(len(samples), 1)
            self.assertEqual(samples[0], "sample-floorplan.png")

            loaded = custom_adapter.load_ground_truth("sample-floorplan.png")
            self.assertEqual(loaded.imageId, "sample-floorplan")
            self.assertEqual(loaded.imageWidth, 623)
            self.assertEqual(loaded.imageHeight, 431)
            self.assertEqual(len(loaded.areas), 1)
            self.assertEqual(loaded.areas[0].id, "gt_001")
            self.assertEqual(len(loaded.areas[0].polygon), 4)
            self.assertEqual(loaded.areas[0].polygon[0].xPx, 50)
            self.assertEqual(loaded.areas[0].polygon[0].yPx, 50)

    def test_evaluate_image_with_my_floorplan_ground_truth(self):
        # Create a mock GT sample and evaluated against detector result
        gt_area = GroundTruthArea(
            id="gt_001",
            label="room",
            polygon=[
                Point2D(100.0, 100.0),
                Point2D(300.0, 100.0),
                Point2D(300.0, 300.0),
                Point2D(100.0, 300.0),
            ],
            category="room",
        )
        gt_sample = GroundTruthSample(
            imageId="test_eval",
            imagePath="test_eval.png",
            imageWidth=500,
            imageHeight=500,
            areas=[gt_area],
            sourceDataset="my_floorplan",
        )

        from evaluation.models import PredictionResult, PredictedArea
        det_area = PredictedArea(
            id="det_001",
            polygon=[
                Point2D(100.0, 100.0),
                Point2D(300.0, 100.0),
                Point2D(300.0, 300.0),
                Point2D(100.0, 300.0),
            ],
            confidence=1.0,
        )
        det_res = PredictionResult(
            imageId="test_eval",
            imageWidth=500,
            imageHeight=500,
            areas=[det_area],
            executionTimeMs=12.5,
        )

        res = evaluate_image(gt_sample, det_res)
        self.assertAlmostEqual(res.meanIoU, 1.0, places=2)
        self.assertEqual(res.truePositiveCount, 1)
        self.assertEqual(res.falsePositiveCount, 0)
        self.assertEqual(res.falseNegativeCount, 0)
        self.assertAlmostEqual(res.f1, 1.0, places=2)

if __name__ == "__main__":
    unittest.main()
