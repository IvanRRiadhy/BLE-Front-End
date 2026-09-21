import unittest
from pathlib import Path
import sys

base_dir = Path(__file__).parent.parent.parent
if str(base_dir) not in sys.path:
    sys.path.insert(0, str(base_dir))

from evaluation.models import GroundTruthSample, GroundTruthArea, PredictionResult, PredictedArea, Point2D
from evaluation.metrics import evaluate_image

class TestEvaluationMetrics(unittest.TestCase):
    def test_evaluate_image_perfect_match(self):
        gt = GroundTruthSample(
            imageId="test_sample",
            imagePath="test.png",
            imageWidth=1000,
            imageHeight=1000,
            areas=[
                GroundTruthArea("gt1", "Room 1", [Point2D(100, 100), Point2D(300, 100), Point2D(300, 300), Point2D(100, 300)]),
                GroundTruthArea("gt2", "Room 2", [Point2D(400, 100), Point2D(600, 100), Point2D(600, 300), Point2D(400, 300)]),
            ],
            sourceDataset="test",
        )

        pred = PredictionResult(
            imageId="test_sample",
            imageWidth=1000,
            imageHeight=1000,
            areas=[
                PredictedArea("p1", [Point2D(100, 100), Point2D(300, 100), Point2D(300, 300), Point2D(100, 300)]),
                PredictedArea("p2", [Point2D(400, 100), Point2D(600, 100), Point2D(600, 300), Point2D(400, 300)]),
            ],
        )

        res = evaluate_image(gt, pred, min_iou=0.25)

        self.assertEqual(res.truePositiveCount, 2)
        self.assertEqual(res.falsePositiveCount, 0)
        self.assertEqual(res.falseNegativeCount, 0)
        self.assertAlmostEqual(res.precision, 1.0)
        self.assertAlmostEqual(res.recall, 1.0)
        self.assertAlmostEqual(res.f1, 1.0)
        self.assertAlmostEqual(res.meanIoU, 1.0)
        self.assertEqual(res.iouGte025Count, 2)
        self.assertEqual(res.iouGte050Count, 2)
        self.assertEqual(res.iouGte075Count, 2)
        self.assertEqual(res.iouGte090Count, 2)
        self.assertAlmostEqual(res.meanAreaErrorPct, 0.0)
        self.assertAlmostEqual(res.meanBoundaryErrorPx, 0.0)
        self.assertTrue(res.passed)

    def test_evaluate_image_with_false_positive_and_miss(self):
        gt = GroundTruthSample(
            imageId="test_sample",
            imagePath="test.png",
            imageWidth=1000,
            imageHeight=1000,
            areas=[
                GroundTruthArea("gt1", "Room 1", [Point2D(100, 100), Point2D(300, 100), Point2D(300, 300), Point2D(100, 300)]),
                GroundTruthArea("gt_missed", "Room 2", [Point2D(400, 100), Point2D(600, 100), Point2D(600, 300), Point2D(400, 300)]),
            ],
            sourceDataset="test",
        )

        # Only p1 matches gt1, p_extra is a false positive
        pred = PredictionResult(
            imageId="test_sample",
            imageWidth=1000,
            imageHeight=1000,
            areas=[
                PredictedArea("p1", [Point2D(100, 100), Point2D(300, 100), Point2D(300, 300), Point2D(100, 300)]),
                PredictedArea("p_extra", [Point2D(700, 700), Point2D(900, 700), Point2D(900, 900), Point2D(700, 900)]),
            ],
        )

        res = evaluate_image(gt, pred, min_iou=0.25)
        self.assertEqual(res.truePositiveCount, 1)
        self.assertEqual(res.falsePositiveCount, 1)
        self.assertEqual(res.falseNegativeCount, 1)
        self.assertAlmostEqual(res.precision, 0.5)
        self.assertAlmostEqual(res.recall, 0.5)
        self.assertAlmostEqual(res.f1, 0.5)

if __name__ == "__main__":
    unittest.main()
