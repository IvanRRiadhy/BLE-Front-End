import unittest
from pathlib import Path
import sys

base_dir = Path(__file__).parent.parent.parent
if str(base_dir) not in sys.path:
    sys.path.insert(0, str(base_dir))

from evaluation.models import GroundTruthArea, PredictedArea, Point2D
from evaluation.matching import compute_pairwise_geometry, match_polygons

class TestPolygonMatching(unittest.TestCase):
    def test_identical_rectangles_perfect_iou(self):
        gt = [Point2D(0, 0), Point2D(100, 0), Point2D(100, 100), Point2D(0, 100)]
        pred = [Point2D(0, 0), Point2D(100, 0), Point2D(100, 100), Point2D(0, 100)]

        iou, inter, union, a_err, c_err, norm_c_err, bnd_err = compute_pairwise_geometry(gt, pred)
        self.assertAlmostEqual(iou, 1.0, places=4)
        self.assertAlmostEqual(a_err, 0.0, places=2)
        self.assertAlmostEqual(c_err, 0.0, places=2)
        self.assertAlmostEqual(bnd_err, 0.0, places=2)

    def test_shifted_rectangle_boundary_and_iou(self):
        gt = [Point2D(0, 0), Point2D(100, 0), Point2D(100, 100), Point2D(0, 100)]
        # Shifted right by 20px
        pred = [Point2D(20, 0), Point2D(120, 0), Point2D(120, 100), Point2D(20, 100)]

        iou, inter, union, a_err, c_err, norm_c_err, bnd_err = compute_pairwise_geometry(gt, pred)
        expected_inter = 80.0 * 100.0
        expected_union = 120.0 * 100.0
        self.assertAlmostEqual(iou, expected_inter / expected_union, places=4)
        self.assertAlmostEqual(c_err, 20.0, places=2)
        self.assertAlmostEqual(bnd_err, 20.0, places=2)

    def test_bipartite_hungarian_matching(self):
        gt_areas = [
            GroundTruthArea("gt1", "Room 1", [Point2D(0, 0), Point2D(50, 0), Point2D(50, 50), Point2D(0, 50)]),
            GroundTruthArea("gt2", "Room 2", [Point2D(100, 0), Point2D(150, 0), Point2D(150, 50), Point2D(100, 50)]),
        ]
        # Inverted prediction order
        pred_areas = [
            PredictedArea("p2", [Point2D(102, 0), Point2D(150, 0), Point2D(150, 50), Point2D(102, 50)]),
            PredictedArea("p1", [Point2D(0, 0), Point2D(48, 0), Point2D(48, 50), Point2D(0, 50)]),
        ]

        matches, unmatched_gt, unmatched_pred, _ = match_polygons(gt_areas, pred_areas, 200, 100, min_iou=0.25)
        self.assertEqual(len(matches), 2)
        self.assertEqual(len(unmatched_gt), 0)
        self.assertEqual(len(unmatched_pred), 0)

        # Check optimal matching pairing
        gt_pred_map = {m.gtId: m.predId for m in matches}
        self.assertEqual(gt_pred_map["gt1"], "p1")
        self.assertEqual(gt_pred_map["gt2"], "p2")

    def test_unmatched_false_positive_and_missed(self):
        gt_areas = [
            GroundTruthArea("gt1", "Room 1", [Point2D(0, 0), Point2D(50, 0), Point2D(50, 50), Point2D(0, 50)]),
            GroundTruthArea("gt_missed", "Room 2", [Point2D(200, 200), Point2D(250, 200), Point2D(250, 250), Point2D(200, 250)]),
        ]
        pred_areas = [
            PredictedArea("p1", [Point2D(0, 0), Point2D(50, 0), Point2D(50, 50), Point2D(0, 50)]),
            PredictedArea("p_fp", [Point2D(400, 400), Point2D(450, 400), Point2D(450, 450), Point2D(400, 450)]),
        ]

        matches, unmatched_gt, unmatched_pred, _ = match_polygons(gt_areas, pred_areas, 500, 500, min_iou=0.25)
        self.assertEqual(len(matches), 1)
        self.assertEqual(matches[0].gtId, "gt1")
        self.assertEqual(matches[0].predId, "p1")
        self.assertIn("gt_missed", unmatched_gt)
        self.assertIn("p_fp", unmatched_pred)

if __name__ == "__main__":
    unittest.main()
