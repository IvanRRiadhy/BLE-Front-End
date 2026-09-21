"""
Resolution Stress Test for BIONIC Classical CV Floorplan Detector.
Tests the 3-room layout across multiple resolutions (800x600 up to 4000x3000)
and evaluates resolution-normalized processing vs raw pixel processing.
"""
import sys
from pathlib import Path
import cv2
import numpy as np
from shapely.geometry import Polygon as ShapelyPolygon

base_dir = Path(__file__).parent.parent
sys.path.insert(0, str(base_dir))

from app.models import DetectionConfig
from detect import run_detection

RESOLUTIONS = [
    (800, 600),
    (1200, 900),
    (1600, 1200),
    (2400, 1800),
    (4000, 3000),
]

def generate_scaled_3rooms(width: int, height: int) -> np.ndarray:
    """
    Generates the benchmark 3-room layout proportionally scaled to (width, height).
    """
    img = np.ones((height, width, 3), dtype=np.uint8) * 255
    
    # Scale factors relative to 1000x700 baseline
    sx = width / 1000.0
    sy = height / 700.0

    wall_th = max(6, int(8 * ((sx + sy) / 2)))

    # Outer perimeter
    p_x1, p_y1 = int(50 * sx), int(50 * sy)
    p_x2, p_y2 = int(950 * sx), int(650 * sy)
    cv2.rectangle(img, (p_x1, p_y1), (p_x2, p_y2), (20, 20, 20), wall_th)

    # Horizontal partition
    part_y = int(320 * sy)
    cv2.line(img, (p_x1, part_y), (p_x2, part_y), (20, 20, 20), wall_th)

    # Vertical partition
    part_x = int(520 * sx)
    cv2.line(img, (part_x, part_y), (part_x, p_y2), (20, 20, 20), wall_th)

    # Doorways (proportional width, e.g., 35px scaled)
    door_w_x = int(35 * sx)
    door_w_y = int(35 * sy)

    # Room A to B door
    d1_x = int(475 * sx)
    cv2.line(img, (d1_x - door_w_x // 2, part_y), (d1_x + door_w_x // 2, part_y), (255, 255, 255), wall_th + 4)

    # Room B to C door
    d2_y = int(480 * sy)
    cv2.line(img, (part_x, d2_y - door_w_y // 2), (part_x, d2_y + door_w_y // 2), (255, 255, 255), wall_th + 4)

    return img

def run_resolution_stress_tests():
    output_base = base_dir / "output" / "resolution_stress_tests"
    output_base.mkdir(parents=True, exist_ok=True)

    print("\n" + "=" * 80)
    print("RESOLUTION STRESS TEST: FIXED-KERNEL VS RESOLUTION-ADAPTIVE PROCESSING")
    print("Testing 3-Room Layout across 800x600 -> 4000x3000 px")
    print("=" * 80)

    print(f"{'Resolution':<14} | {'Megapixels':<11} | {'Fixed K=35':<12} | {'Adaptive Scale':<15} | {'Notes'}")
    print("-" * 80)

    for w, h in RESOLUTIONS:
        img = generate_scaled_3rooms(w, h)
        res_tag = f"{w}x{h}"
        img_path = output_base / f"sample_{res_tag}.png"
        cv2.imwrite(str(img_path), img)

        mp = (w * h) / 1_000_000.0

        # 1. Run with Fixed Kernel (35px)
        cfg_fixed = DetectionConfig(wall_close_kernel_size=35, min_room_area_px=1200)
        res_fixed = run_detection(img_path, output_base / f"fixed_{res_tag}", cfg_fixed, debug=False)
        det_fixed = len(res_fixed.areas)

        # 2. Run with Resolution-Adaptive Kernel (calibrated to baseline 1000px)
        scale_factor = (w + h) / 1700.0
        adaptive_kernel = max(15, int(35 * scale_factor))
        if adaptive_kernel % 2 == 0:
            adaptive_kernel += 1
        adaptive_min_area = int(1200 * (scale_factor ** 2))

        cfg_adaptive = DetectionConfig(
            wall_close_kernel_size=adaptive_kernel,
            min_room_area_px=adaptive_min_area,
        )
        res_adaptive = run_detection(img_path, output_base / f"adaptive_{res_tag}", cfg_adaptive, debug=False)
        det_adaptive = len(res_adaptive.areas)

        fixed_status = f"{det_fixed}/3 rooms"
        adaptive_status = f"{det_adaptive}/3 rooms (K={adaptive_kernel})"
        
        note = "Scale-invariant with adaptive kernel" if det_adaptive == 3 else "Degraded"
        if det_fixed != 3:
            note += " | Fixed kernel failed"

        print(f"{res_tag:<14} | {mp:>6.2f} MP    | {fixed_status:<12} | {adaptive_status:<15} | {note}")

    print("=" * 80 + "\n")

if __name__ == "__main__":
    run_resolution_stress_tests()
