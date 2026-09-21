import unittest
from pathlib import Path
import sys

base_dir = Path(__file__).parent.parent.parent
if str(base_dir) not in sys.path:
    sys.path.insert(0, str(base_dir))

from evaluation.models import GroundTruthArea, PredictedArea, Point2D
from evaluation.topology import analyze_room_topology

class TestTopologyAnalysis(unittest.TestCase):
    def test_merged_room_detection(self):
        # GT: Two adjacent 50x50 rooms
        gt_areas = [
            GroundTruthArea("gt_room_a", "Room A", [Point2D(0, 0), Point2D(50, 0), Point2D(50, 50), Point2D(0, 50)]),
            GroundTruthArea("gt_room_b", "Room B", [Point2D(50, 0), Point2D(100, 0), Point2D(100, 50), Point2D(50, 50)]),
        ]
        # Prediction: Single merged 100x50 polygon covering both rooms
        pred_areas = [
            PredictedArea("p_merged", [Point2D(0, 0), Point2D(100, 0), Point2D(100, 50), Point2D(0, 50)]),
        ]

        merged, split = analyze_room_topology(gt_areas, pred_areas, min_overlap_ratio=0.30)
        self.assertEqual(len(merged), 1)
        self.assertEqual(merged[0].predictionId, "p_merged")
        self.assertIn("gt_room_a", merged[0].groundTruthIds)
        self.assertIn("gt_room_b", merged[0].groundTruthIds)
        self.assertEqual(len(split), 0)

    def test_split_room_detection(self):
        # GT: Single 100x50 room
        gt_areas = [
            GroundTruthArea("gt_large_room", "Large Room", [Point2D(0, 0), Point2D(100, 0), Point2D(100, 50), Point2D(0, 50)]),
        ]
        # Prediction: Split into two 50x50 fragments
        pred_areas = [
            PredictedArea("p_frag_1", [Point2D(0, 0), Point2D(50, 0), Point2D(50, 50), Point2D(0, 50)]),
            PredictedArea("p_frag_2", [Point2D(50, 0), Point2D(100, 0), Point2D(100, 50), Point2D(50, 50)]),
        ]

        merged, split = analyze_room_topology(gt_areas, pred_areas, min_overlap_ratio=0.30)
        self.assertEqual(len(merged), 0)
        self.assertEqual(len(split), 1)
        self.assertEqual(split[0].groundTruthId, "gt_large_room")
        self.assertIn("p_frag_1", split[0].predictionIds)
        self.assertIn("p_frag_2", split[0].predictionIds)

if __name__ == "__main__":
    unittest.main()
