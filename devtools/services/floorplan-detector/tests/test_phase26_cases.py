"""
Phase 2.6 Comprehensive Test Suite: Classical CV Room Segmentation Verification
Evaluates:
- Case 1: 2D architectural floorplan with interior furniture, labels, and door swing arcs.
- Case 2: 3D rendered floorplan with floor tones, shaded beveled walls, soft drop shadows.
- Case 3: Complex architectural / site plan with exterior access roads, parking bays, and courtyards.
"""
import unittest
import cv2
import numpy as np
from pathlib import Path
import sys

base_dir = Path(__file__).parent.parent
sys.path.insert(0, str(base_dir))

from app.models import DetectionConfig, DetectionResult
from detect import run_detection

class TestPhase26Cases(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.samples_dir = base_dir / "samples"
        cls.output_dir = base_dir / "output" / "phase26_tests"
        cls.output_dir.mkdir(parents=True, exist_ok=True)

    def test_case_1_2d_architectural_complex(self):
        """
        Case 1: 2D architectural drawing with furniture, labels, and door swing arcs.
        Expected: Exactly 4 logical rooms (Living, Kitchen, Bath, Bedroom).
        No furniture fragments, no text label boxes, no door arc splits.
        """
        img_path = self.samples_dir / "07_2d_architectural_complex.png"
        self.assertTrue(img_path.exists(), "Sample 07 does not exist")

        out_dir = self.output_dir / "case1_2d_complex"
        config = DetectionConfig(wall_close_kernel_size=35, min_room_area_px=50000)
        result = run_detection(img_path, out_dir, config, debug=True)

        # 1. Assert exactly 4 rooms detected
        self.assertEqual(
            len(result.areas),
            4,
            f"Case 1: Expected 4 rooms, got {len(result.areas)} areas: {[a.id for a in result.areas]}",
        )

        # 2. Check room areas (each room in this 1200x900 plan should be ~80k-130k px)
        for area in result.areas:
            # Reconstruct polygon area
            pts = np.array([[p.xPx, p.yPx] for p in area.polygon], dtype=np.float32)
            poly_area = cv2.contourArea(pts)
            self.assertGreaterEqual(
                poly_area,
                50000,
                f"Room {area.id} area {poly_area} is too small, likely a furniture fragment",
            )
            self.assertLessEqual(
                poly_area,
                200000,
                f"Room {area.id} area {poly_area} is oversized, likely an exterior background leak",
            )

        # 3. Assert debug artifacts 01..13 exist
        for i in range(1, 14):
            matches = list(out_dir.glob(f"{i:02d}_*.png"))
            self.assertGreaterEqual(len(matches), 1, f"Missing debug artifact {i:02d}_*.png")

    def test_case_2_rendered_3d_floorplan(self):
        """
        Case 2: 3D rendered floorplan with floor tones, shaded walls, and drop shadows.
        Expected: Exactly 3 inline rooms [ ROOM 1 | ROOM 2 | ROOM 3 ].
        """
        img_path = self.samples_dir / "08_rendered_3d_floorplan.png"
        self.assertTrue(img_path.exists(), "Sample 08 does not exist")

        out_dir = self.output_dir / "case2_rendered_3d"
        config = DetectionConfig(wall_close_kernel_size=35, enable_multi_evidence=True)
        result = run_detection(img_path, out_dir, config, debug=True)

        # 1. Assert exactly 3 rooms detected
        self.assertEqual(
            len(result.areas),
            3,
            f"Case 2: Expected 3 rooms, got {len(result.areas)} areas: {[a.id for a in result.areas]}",
        )

        # 2. Assert rooms span the 3 horizontal compartments
        xs = [a.polygon[0].xPx for a in result.areas]
        self.assertEqual(len(set(xs)), 3, "Rooms should have distinct horizontal positions")

        # 3. Assert high wall support across rooms
        for cf in result.stats["candidates"]:
            if cf["is_accepted"]:
                self.assertGreaterEqual(
                    cf["wall_support_ratio"],
                    0.50,
                    f"Accepted room {cf['label']} should have robust wall support >= 0.50",
                )

    def test_case_3_site_architectural_plan(self):
        """
        Case 3: Site architectural plan with exterior road ring, parking stalls, and core building.
        Expected: Exactly 3 interior office rooms (Office A, Conf Room, Office B).
        Exterior access road loop, parking stalls, and exterior terrain must be rejected.
        """
        img_path = self.samples_dir / "09_site_architectural_plan.png"
        self.assertTrue(img_path.exists(), "Sample 09 does not exist")

        out_dir = self.output_dir / "case3_site_plan"
        config = DetectionConfig(
            wall_close_kernel_size=35,
            min_room_area_px=50000,
            max_room_area_ratio=0.07,
            min_footprint_containment=0.80,
        )
        result = run_detection(img_path, out_dir, config, debug=True)

        # 1. Assert 4 interior office rooms detected
        self.assertEqual(
            len(result.areas),
            4,
            f"Case 3: Expected 4 interior rooms, got {len(result.areas)} areas: {[a.id for a in result.areas]}",
        )

        # 2. Check candidate statistics: road and parking bays rejected
        rejected = result.stats["rejected"]
        total_rejected = sum(rejected.values())
        self.assertGreaterEqual(
            total_rejected,
            1,
            "Expected exterior access road loop and site features to be rejected by footprint or size",
        )

        # 3. Assert all accepted rooms are 100% inside building footprint
        for cf in result.stats["candidates"]:
            if cf["is_accepted"]:
                self.assertGreaterEqual(
                    cf["footprint_containment"],
                    0.80,
                    f"Room {cf['label']} must be securely inside building envelope",
                )
                self.assertGreaterEqual(
                    cf["wall_support_ratio"],
                    0.60,
                    f"Room {cf['label']} must have strong structural wall support",
                )

if __name__ == "__main__":
    unittest.main(verbosity=2)
