"""
Regression Test Suite: Phase 2.7.1 Robust Exterior Boundary Handling
Evaluates:
1. Closed perimeter (watertight baseline)
2. Single exterior doorway (35px gap)
3. Balcony opening (80px gap)
4. Terrace opening (120px gap)
5. Multiple exterior openings (front door, back door, patio slider)
"""
import unittest
import cv2
import numpy as np
from pathlib import Path
import sys

base_dir = Path(__file__).parent.parent
sys.path.insert(0, str(base_dir))

from app.models import DetectionConfig, DetectionResult
from app.detector import FloorplanDetector
from detect import run_detection

def create_base_floorplan() -> np.ndarray:
    """
    Creates a clean 4-room house layout (800x600 px) in the center of an image (margin = 50px).
    Outer walls: rectangle (100, 80) to (700, 520).
    Interior partitions divide it into 4 rooms:
    - Room 1 (Top-Left): (100, 80) to (400, 300)
    - Room 2 (Top-Right): (400, 80) to (700, 300)
    - Room 3 (Bottom-Left): (100, 300) to (400, 520)
    - Room 4 (Bottom-Right): (400, 300) to (700, 520)
    """
    img = np.ones((600, 800, 3), dtype=np.uint8) * 255
    wall_color = (20, 20, 20)
    thickness = 8

    # Outer perimeter
    cv2.rectangle(img, (100, 80), (700, 520), wall_color, thickness)

    # Interior partition walls (with internal doors bridged by standard kernel)
    # Vertical partition at X = 400
    cv2.line(img, (400, 80), (400, 520), wall_color, thickness)
    # Horizontal partition at Y = 300
    cv2.line(img, (100, 300), (700, 300), wall_color, thickness)

    # Add small 20px interior doorways on internal partitions
    cv2.line(img, (400, 180), (400, 200), (255, 255, 255), thickness + 4)
    cv2.line(img, (400, 400), (400, 420), (255, 255, 255), thickness + 4)
    cv2.line(img, (240, 300), (260, 300), (255, 255, 255), thickness + 4)
    cv2.line(img, (540, 300), (560, 300), (255, 255, 255), thickness + 4)

    return img

class TestExteriorBoundaryHandling(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.output_dir = base_dir / "output" / "exterior_boundary_tests"
        cls.output_dir.mkdir(parents=True, exist_ok=True)
        cls.detector = FloorplanDetector()

    def test_closed_perimeter(self):
        """
        Scenario 1: Watertight building with no exterior openings.
        Verifies baseline behavior is preserved and all 4 rooms are found.
        """
        img = create_base_floorplan()
        out_dir = self.output_dir / "01_closed_perimeter"
        temp_path = out_dir / "closed_input.png"
        out_dir.mkdir(parents=True, exist_ok=True)
        cv2.imwrite(str(temp_path), img)

        config = DetectionConfig(wall_close_kernel_size=35)
        result = run_detection(temp_path, out_dir, config, debug=True)

        self.assertEqual(len(result.areas), 4, f"Expected 4 rooms, got {len(result.areas)}")
        retention = result.stats.get("retention_ratio", 0.0)
        self.assertGreaterEqual(retention, 0.50, f"Interior retention {retention} should be >= 0.50")
        self.assertEqual(len(result.stats.get("detected_openings", [])), 0, "No openings expected on closed perimeter")

    def test_single_exterior_doorway(self):
        """
        Scenario 2: Single 35px exterior doorway on bottom wall at X = 250.
        Verifies opening is detected and flood-fill does NOT erase the interior.
        """
        img = create_base_floorplan()
        # Cut 35px doorway on bottom exterior wall (Y = 520, X = 235..270)
        cv2.line(img, (235, 520), (270, 520), (255, 255, 255), 14)

        out_dir = self.output_dir / "02_single_doorway"
        temp_path = out_dir / "doorway_input.png"
        out_dir.mkdir(parents=True, exist_ok=True)
        cv2.imwrite(str(temp_path), img)

        config = DetectionConfig(wall_close_kernel_size=35)
        result = run_detection(temp_path, out_dir, config, debug=True)

        # 1. Interior space must be retained (not flooded to 0)
        retention = result.stats.get("retention_ratio", 0.0)
        self.assertGreaterEqual(retention, 0.50, f"Interior retention {retention} should be >= 0.50")

        # 2. Opening must be detected
        openings = result.stats.get("detected_openings", [])
        self.assertGreaterEqual(len(openings), 1, "Expected at least 1 detected exterior opening")
        self.assertTrue(any(op["span_px"] >= 25 for op in openings), "Expected opening span >= 25px")

        # 3. Rooms must be segmented
        self.assertEqual(len(result.areas), 4, f"Expected 4 rooms, got {len(result.areas)}")

    def test_balcony_opening(self):
        """
        Scenario 3: 80px opening on top wall connecting to an open balcony.
        """
        img = create_base_floorplan()
        # Cut 80px opening on top exterior wall (Y = 80, X = 210..290)
        cv2.line(img, (210, 80), (290, 80), (255, 255, 255), 14)

        out_dir = self.output_dir / "03_balcony_opening"
        temp_path = out_dir / "balcony_input.png"
        out_dir.mkdir(parents=True, exist_ok=True)
        cv2.imwrite(str(temp_path), img)

        config = DetectionConfig(wall_close_kernel_size=35)
        result = run_detection(temp_path, out_dir, config, debug=True)

        retention = result.stats.get("retention_ratio", 0.0)
        self.assertGreaterEqual(retention, 0.50, f"Interior retention {retention} should be >= 0.50")

        openings = result.stats.get("detected_openings", [])
        self.assertGreaterEqual(len(openings), 1, "Expected at least 1 detected exterior opening")

        # All 4 rooms should be segmented
        self.assertEqual(len(result.areas), 4, f"Expected 4 rooms, got {len(result.areas)}")

    def test_terrace_opening(self):
        """
        Scenario 4: 120px opening on right wall connecting to a large terrace.
        """
        img = create_base_floorplan()
        # Cut 120px opening on right exterior wall (X = 700, Y = 130..250)
        cv2.line(img, (700, 130), (700, 250), (255, 255, 255), 14)

        out_dir = self.output_dir / "04_terrace_opening"
        temp_path = out_dir / "terrace_input.png"
        out_dir.mkdir(parents=True, exist_ok=True)
        cv2.imwrite(str(temp_path), img)

        config = DetectionConfig(wall_close_kernel_size=35)
        result = run_detection(temp_path, out_dir, config, debug=True)

        retention = result.stats.get("retention_ratio", 0.0)
        self.assertGreaterEqual(retention, 0.50, f"Interior retention {retention} should be >= 0.50")

        openings = result.stats.get("detected_openings", [])
        self.assertGreaterEqual(len(openings), 1, "Expected at least 1 detected exterior opening")

        self.assertEqual(len(result.areas), 4, f"Expected 4 rooms, got {len(result.areas)}")

    def test_multiple_exterior_openings(self):
        """
        Scenario 5: Building with 3 distinct exterior openings:
        - Front door (35px) on bottom wall
        - Back door (30px) on top wall
        - Patio slider (70px) on right wall
        """
        img = create_base_floorplan()
        # Front door on bottom (Y = 520, X = 235..270)
        cv2.line(img, (235, 520), (270, 520), (255, 255, 255), 14)
        # Back door on top (Y = 80, X = 535..565)
        cv2.line(img, (535, 80), (565, 80), (255, 255, 255), 14)
        # Patio slider on right (X = 700, Y = 370..440)
        cv2.line(img, (700, 370), (700, 440), (255, 255, 255), 14)

        out_dir = self.output_dir / "05_multiple_openings"
        temp_path = out_dir / "multi_openings_input.png"
        out_dir.mkdir(parents=True, exist_ok=True)
        cv2.imwrite(str(temp_path), img)

        config = DetectionConfig(wall_close_kernel_size=35)
        result = run_detection(temp_path, out_dir, config, debug=True)

        retention = result.stats.get("retention_ratio", 0.0)
        self.assertGreaterEqual(retention, 0.50, f"Interior retention {retention} should be >= 0.50")

        openings = result.stats.get("detected_openings", [])
        self.assertGreaterEqual(len(openings), 2, f"Expected >= 2 detected openings, got {len(openings)}")

        self.assertEqual(len(result.areas), 4, f"Expected 4 rooms, got {len(result.areas)}")

if __name__ == "__main__":
    unittest.main()
