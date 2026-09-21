import unittest
from pathlib import Path
import sys

base_dir = Path(__file__).parent.parent.parent
if str(base_dir) not in sys.path:
    sys.path.insert(0, str(base_dir))

from evaluation.models import Point2D
from evaluation.validation import validate_polygon

class TestPolygonValidation(unittest.TestCase):
    def test_valid_rectangle(self):
        pts = [Point2D(10, 10), Point2D(100, 10), Point2D(100, 80), Point2D(10, 80)]
        val = validate_polygon("valid_box", pts, 500, 500)
        self.assertTrue(val.isValid)
        self.assertEqual(len(val.reasons), 0)
        self.assertAlmostEqual(val.areaPx, 90 * 70)
        self.assertFalse(val.isSelfIntersecting)

    def test_self_intersecting_bow_tie(self):
        # Bow-tie self-intersecting polygon
        pts = [Point2D(0, 0), Point2D(100, 100), Point2D(100, 0), Point2D(0, 100)]
        val = validate_polygon("bowtie", pts, 500, 500)
        self.assertFalse(val.isValid)
        self.assertTrue(val.isSelfIntersecting)
        self.assertTrue(any("self-intersecting" in r for r in val.reasons))

    def test_fewer_than_three_vertices(self):
        pts = [Point2D(10, 10), Point2D(50, 50)]
        val = validate_polygon("line_seg", pts, 500, 500)
        self.assertFalse(val.isValid)
        self.assertTrue(any("less than minimum" in r for r in val.reasons))

    def test_out_of_bounds_vertices(self):
        pts = [Point2D(-100, -50), Point2D(200, 10), Point2D(100, 80)]
        val = validate_polygon("out_bounds", pts, 500, 500)
        self.assertFalse(val.isValid)
        self.assertFalse(val.isWithinBounds)

    def test_zero_area_degenerate(self):
        pts = [Point2D(10, 10), Point2D(20, 20), Point2D(30, 30)]  # Collinear points
        val = validate_polygon("collinear", pts, 500, 500)
        self.assertFalse(val.isValid)
        self.assertAlmostEqual(val.areaPx, 0.0)

if __name__ == "__main__":
    unittest.main()
