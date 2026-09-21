"""
Phase 2.7.4 Test Suite: Adaptive Architectural Stroke Classification & Small-Room Recovery
"""
import unittest
import numpy as np
from pathlib import Path
import sys

base_dir = Path(__file__).parent.parent
sys.path.insert(0, str(base_dir))

from app.models import DetectionConfig, WallSegmentDiagnostics
from app.wall_network import (
    WallSegment,
    compute_stroke_confidence,
    classify_segment,
)

class TestPhase274Cases(unittest.TestCase):
    def test_normalized_length_calculation(self):
        """
        Verifies that segment normalized length is resolution independent.
        """
        seg = WallSegment(id="seg1", x1=0, y1=0, x2=100, y2=0, orientation="H")
        image_shape = (1000, 1000)
        config = DetectionConfig()
        
        computed = compute_stroke_confidence([seg], image_shape, config)
        self.assertAlmostEqual(computed[0].normalized_length, 0.10, places=3)

    def test_architectural_confidence_classification(self):
        """
        Verifies classification levels based on confidence score.
        """
        self.assertEqual(classify_segment(0.85), "architectural")
        self.assertEqual(classify_segment(0.60), "probable_architectural")
        self.assertEqual(classify_segment(0.40), "uncertain")
        self.assertEqual(classify_segment(0.25), "probable_artifact")
        self.assertEqual(classify_segment(0.10), "artifact")

    def test_hatch_pattern_penalization(self):
        """
        Verifies that dense parallel short non-centerline segments receive hatch likelihood penalties.
        """
        config = DetectionConfig()
        image_shape = (1000, 1000)
        
        # 5 parallel short segments (hatch pattern)
        hatch_segs = [
            WallSegment(id=f"h_{i}", x1=10*i, y1=50, x2=10*i, y2=80, orientation="V")
            for i in range(5)
        ]
        
        computed = compute_stroke_confidence(hatch_segs, image_shape, config)
        for s in computed:
            self.assertGreater(s.hatch_likelihood, 0.0)

    def test_text_stroke_penalization(self):
        """
        Verifies that short isolated non-centerline segments with 0 intersections receive text likelihood penalties.
        """
        config = DetectionConfig()
        image_shape = (1000, 1000)
        
        text_seg = WallSegment(id="txt1", x1=100, y1=100, x2=115, y2=105, orientation="H", intersection_count=0)
        computed = compute_stroke_confidence([text_seg], image_shape, config)
        
        self.assertGreater(computed[0].text_likelihood, 0.0)
        self.assertLess(computed[0].architectural_confidence, 0.50)

if __name__ == "__main__":
    unittest.main()
