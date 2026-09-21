import sys
import unittest
from pathlib import Path
import numpy as np
from shapely.geometry import Polygon as ShapelyPolygon

base_dir = Path(__file__).parent.parent
sys.path.insert(0, str(base_dir))

from app.models import DetectionConfig
from detect import run_detection
from samples.ground_truth import get_ground_truth

def compute_polygon_metrics(detected_pts: list[tuple[float, float]], gt_pts: list[tuple[float, float]]):
    """
    Computes Intersection-over-Union (IoU), Area Error (%), and Centroid Error (px)
    between a detected polygon and a ground-truth polygon.
    """
    poly_det = ShapelyPolygon(detected_pts)
    poly_gt = ShapelyPolygon(gt_pts)

    if not poly_det.is_valid:
        poly_det = poly_det.buffer(0)
    if not poly_gt.is_valid:
        poly_gt = poly_gt.buffer(0)

    if not poly_det.is_valid or not poly_gt.is_valid:
        return 0.0, 100.0, float("inf")

    intersection_area = poly_det.intersection(poly_gt).area
    union_area = poly_det.union(poly_gt).area

    iou = intersection_area / union_area if union_area > 0 else 0.0

    gt_area = poly_gt.area
    det_area = poly_det.area
    area_error_pct = abs(det_area - gt_area) / gt_area * 100.0 if gt_area > 0 else 100.0

    gt_c = poly_gt.centroid
    det_c = poly_det.centroid
    centroid_error_px = np.hypot(det_c.x - gt_c.x, det_c.y - gt_c.y)

    return iou, area_error_pct, centroid_error_px

class TestPolygonAccuracy(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.samples_dir = base_dir / "samples"
        cls.output_dir = base_dir / "output" / "accuracy_test"
        cls.config = DetectionConfig(wall_close_kernel_size=40)
        cls.all_sample_results = []

    def _evaluate_sample(self, sample_name: str):
        img_path = self.samples_dir / sample_name
        self.assertTrue(img_path.exists())

        sample_out = self.output_dir / img_path.stem
        result = run_detection(img_path, sample_out, self.config, debug=False)

        gt_rooms = get_ground_truth(sample_name)
        detected_polys = [
            [(p.xPx, p.yPx) for p in a.polygon]
            for a in result.areas
        ]

        print(f"\n==================================================")
        print(f"Sample: {sample_name}")
        print(f"Expected rooms: {len(gt_rooms)} | Detected rooms: {len(detected_polys)}")
        print(f"--------------------------------------------------")

        matched_gt_indices = set()
        sample_ious = []
        sample_area_errors = []
        sample_centroid_errors = []

        # Match each detected polygon to the best ground truth room by IoU
        for d_idx, d_pts in enumerate(detected_polys):
            best_iou = -1.0
            best_gt_idx = -1
            best_area_err = 0.0
            best_cent_err = 0.0

            for g_idx, g_pts in enumerate(gt_rooms):
                iou, a_err, c_err = compute_polygon_metrics(d_pts, g_pts)
                if iou > best_iou:
                    best_iou = iou
                    best_gt_idx = g_idx
                    best_area_err = a_err
                    best_cent_err = c_err

            matched_gt_indices.add(best_gt_idx)
            sample_ious.append(best_iou)
            sample_area_errors.append(best_area_err)
            sample_centroid_errors.append(best_cent_err)

            print(f"Detected Area {d_idx + 1} (Matched to GT Room {best_gt_idx + 1}):")
            print(f"  IoU:            {best_iou:.4f} ({best_iou * 100:.2f}%)")
            print(f"  Area Error:     {best_area_err:.2f}%")
            print(f"  Centroid Error: {best_cent_err:.2f} px")

            # Assert individual room quality threshold
            self.assertGreaterEqual(
                best_iou,
                0.80,
                f"{sample_name} Area {d_idx + 1} IoU ({best_iou:.3f}) is below 0.80 threshold",
            )
            self.assertLessEqual(
                best_area_err,
                20.0,
                f"{sample_name} Area {d_idx + 1} Area Error ({best_area_err:.2f}%) exceeds 20%",
            )
            self.assertLessEqual(
                best_cent_err,
                15.0,
                f"{sample_name} Area {d_idx + 1} Centroid Error ({best_cent_err:.2f}px) exceeds 15px",
            )

        # Assert all ground truth rooms were uniquely matched
        self.assertEqual(
            len(matched_gt_indices),
            len(gt_rooms),
            f"{sample_name}: Not all ground truth rooms were matched!",
        )

        mean_iou = np.mean(sample_ious)
        mean_area_err = np.mean(sample_area_errors)
        mean_cent_err = np.mean(sample_centroid_errors)

        print(f"--------------------------------------------------")
        print(f"Mean IoU:            {mean_iou:.4f} ({mean_iou * 100:.2f}%)")
        print(f"Mean Area Error:     {mean_area_err:.2f}%")
        print(f"Mean Centroid Error: {mean_cent_err:.2f} px")

        self.all_sample_results.append({
            "sample": sample_name,
            "expected_rooms": len(gt_rooms),
            "detected_rooms": len(detected_polys),
            "mean_iou": mean_iou,
            "mean_area_err": mean_area_err,
            "mean_cent_err": mean_cent_err,
        })

    def test_01_single_room_accuracy(self):
        self._evaluate_sample("01_single_room.png")

    def test_02_two_rooms_accuracy(self):
        self._evaluate_sample("02_two_rooms.png")

    def test_03_three_rooms_connected_accuracy(self):
        self._evaluate_sample("03_three_rooms_connected.png")

    def test_04_l_shaped_room_accuracy(self):
        self._evaluate_sample("04_l_shaped_room.png")

    def test_05_corridor_and_rooms_accuracy(self):
        self._evaluate_sample("05_corridor_and_rooms.png")

    def test_06_realistic_architectural_accuracy(self):
        self._evaluate_sample("06_realistic_architectural.png")

    @classmethod
    def tearDownClass(cls):
        print("\n" + "#" * 65)
        print("SUMMARY TABLE: POLYGON ACCURACY AGAINST GROUND TRUTH")
        print("#" * 65)
        print(f"{'Sample':<30} | {'Exp':<4} | {'Det':<4} | {'Mean IoU':<10} | {'Area Err':<10} | {'Centroid Err'}")
        print("-" * 65)
        for r in cls.all_sample_results:
            print(
                f"{r['sample']:<30} | {r['expected_rooms']:<4} | {r['detected_rooms']:<4} | "
                f"{r['mean_iou'] * 100:>6.2f}%   | {r['mean_area_err']:>6.2f}%   | {r['mean_cent_err']:>6.2f} px"
            )
        print("#" * 65 + "\n")

if __name__ == "__main__":
    unittest.main(verbosity=2)
