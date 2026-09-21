"""
Door Opening Stress Test for BIONIC Classical CV Floorplan Detector.
Evaluates door opening widths from 5px to 120px across two architectural scenarios:
A. Two adjacent rooms separated by a partition with an internal door.
B. Room connected to an access corridor through an open doorway.
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

DOOR_WIDTHS = [5, 10, 20, 30, 40, 60, 80, 100, 120]

def create_adjacent_rooms_with_door(door_width_px: int) -> np.ndarray:
    """
    Scenario A: Two adjacent rooms (each 400x500 px) with a shared partition
    and a doorway of specified width in the center of the partition.
    """
    img = np.ones((600, 900, 3), dtype=np.uint8) * 255
    # Outer boundary
    cv2.rectangle(img, (50, 50), (850, 550), (20, 20, 20), 8)
    
    # Shared partition at X = 450
    cv2.line(img, (450, 50), (450, 550), (20, 20, 20), 8)

    # Doorway centered at Y = 300
    half_door = door_width_px // 2
    cv2.line(img, (450, 300 - half_door), (450, 300 + half_door), (255, 255, 255), 14)

    return img

def create_corridor_with_door(door_width_px: int) -> np.ndarray:
    """
    Scenario B: A room (400x300) connected to a corridor (800x120) through a doorway.
    """
    img = np.ones((600, 900, 3), dtype=np.uint8) * 255
    # Outer boundary
    cv2.rectangle(img, (50, 50), (850, 550), (20, 20, 20), 8)

    # Horizontal wall separating room from corridor at Y = 350
    cv2.line(img, (50, 350), (850, 350), (20, 20, 20), 8)
    # Vertical partition dividing upper space into Room (X: 50..500) and Void/Storage (X: 500..850)
    cv2.line(img, (500, 50), (500, 350), (20, 20, 20), 8)

    # Door from Room to Corridor at Y = 350, centered at X = 275
    half_door = door_width_px // 2
    cv2.line(img, (275 - half_door, 350), (275 + half_door, 350), (255, 255, 255), 14)

    return img

def run_door_stress_tests():
    stress_dir = base_dir / "output" / "door_stress_tests"
    stress_dir.mkdir(parents=True, exist_ok=True)

    config = DetectionConfig(wall_close_kernel_size=35)

    print("\n" + "=" * 75)
    print("DOOR OPENING STRESS TEST: CLASSICAL CV OPERATIONAL ENVELOPE")
    print(f"Algorithm Configuration: wall_close_kernel_size = {config.wall_close_kernel_size} px")
    print("=" * 75)

    scenarios = [
        ("Scenario A (Two Adjacent Rooms)", create_adjacent_rooms_with_door, 2),
        ("Scenario B (Room + Corridor)", create_corridor_with_door, 3),
    ]

    all_results = []

    for scen_name, generator_fn, expected_rooms in scenarios:
        print(f"\n--- {scen_name} (Expected Rooms: {expected_rooms}) ---")
        print(f"{'Door Width':<12} | {'Exp':<5} | {'Det':<5} | {'Status':<15} | {'Behavior Note'}")
        print("-" * 75)

        for w in DOOR_WIDTHS:
            img = generator_fn(w)
            temp_path = stress_dir / f"temp_{scen_name[:10]}_{w}px.png"
            cv2.imwrite(str(temp_path), img)

            out_dir = stress_dir / f"{scen_name[:10]}_{w}px"
            try:
                result = run_detection(temp_path, out_dir, config, debug=False)
                det_count = len(result.areas)
            except Exception as e:
                det_count = 0

            # Analyze failure mode
            if det_count == expected_rooms:
                status = "PASS"
                note = f"Watertight closure maintained ({w}px bridged)"
            elif det_count < expected_rooms:
                status = "FAIL (MERGED)"
                note = f"Rooms merged into 1 (door {w}px > kernel {config.wall_close_kernel_size}px)"
            else:
                status = "FAIL (OVER-SPLIT)"
                note = f"Spurious fragments detected"

            print(f"{w} px{'':<8} | {expected_rooms:<5} | {det_count:<5} | {status:<15} | {note}")

            all_results.append({
                "scenario": scen_name,
                "door_width_px": w,
                "expected": expected_rooms,
                "detected": det_count,
                "status": status,
                "note": note,
            })

    print("=" * 75 + "\n")
    return all_results

if __name__ == "__main__":
    run_door_stress_tests()
