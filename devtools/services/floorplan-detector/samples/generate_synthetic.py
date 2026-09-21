import cv2
import numpy as np
from pathlib import Path

def create_base_canvas(width: int = 1000, height: int = 700) -> np.ndarray:
    """
    Creates a clean architectural drafting canvas (white background).
    """
    return np.ones((height, width, 3), dtype=np.uint8) * 255

def draw_wall(
    img: np.ndarray,
    pt1: tuple[int, int],
    pt2: tuple[int, int],
    thickness: int = 8,
    color: tuple[int, int, int] = (20, 20, 20),
):
    """
    Draws a structural architectural wall.
    """
    cv2.line(img, pt1, pt2, color, thickness)

def draw_door_gap(
    img: np.ndarray,
    pt1: tuple[int, int],
    pt2: tuple[int, int],
    thickness: int = 12,
):
    """
    Simulates a doorway opening along a wall.
    """
    cv2.line(img, pt1, pt2, (255, 255, 255), thickness)

def generate_01_single_room(output_path: Path):
    """
    Synthetic Test 1: Single enclosed room with a door opening.
    Expected: 1 detected room.
    """
    img = create_base_canvas(800, 600)
    # Outer walls
    draw_wall(img, (100, 100), (700, 100))
    draw_wall(img, (700, 100), (700, 500))
    draw_wall(img, (700, 500), (100, 500))
    draw_wall(img, (100, 500), (100, 100))
    
    # Door opening on south wall (25px gap)
    draw_door_gap(img, (380, 500), (420, 500))

    cv2.imwrite(str(output_path), img)

def generate_02_two_rooms(output_path: Path):
    """
    Synthetic Test 2: Two adjacent rooms sharing a partition wall with doors.
    Expected: 2 detected rooms.
    """
    img = create_base_canvas(900, 600)
    # Outer perimeter
    draw_wall(img, (80, 80), (820, 80))
    draw_wall(img, (820, 80), (820, 520))
    draw_wall(img, (820, 520), (80, 520))
    draw_wall(img, (80, 520), (80, 80))
    
    # Shared vertical partition wall at X = 450
    draw_wall(img, (450, 80), (450, 520))

    # Exterior entry door and inter-room door
    draw_door_gap(img, (250, 520), (285, 520)) # Outer door to Room 1
    draw_door_gap(img, (450, 280), (450, 320)) # Inter-room door between Room 1 & 2

    cv2.imwrite(str(output_path), img)

def generate_03_three_rooms_connected(output_path: Path):
    """
    Synthetic Test 3: 3 connected rooms matching the BIONIC DevTools mock:
    - Upper Room A (Lobby): 50,50 -> 950,320
    - Lower Left Room B (Meeting): 50,320 -> 520,650
    - Lower Right Room C (Storage): 520,320 -> 950,650
    Expected: 3 detected rooms.
    """
    img = create_base_canvas(1000, 700)
    # Outer boundary
    draw_wall(img, (50, 50), (950, 50))
    draw_wall(img, (950, 50), (950, 650))
    draw_wall(img, (950, 650), (50, 650))
    draw_wall(img, (50, 650), (50, 50))

    # Horizontal shared partition at Y = 320
    draw_wall(img, (50, 320), (950, 320))

    # Vertical shared partition between Room B and C at X = 520
    draw_wall(img, (520, 320), (520, 650))

    # Doorways
    draw_door_gap(img, (460, 320), (495, 320)) # Room A to B
    draw_door_gap(img, (520, 460), (520, 495)) # Room B to C
    draw_door_gap(img, (480, 650), (520, 650)) # Exterior entrance

    cv2.imwrite(str(output_path), img)

def generate_04_l_shaped_room(output_path: Path):
    """
    Synthetic Test 4: Concave L-shaped room adjacent to a rectangular room.
    Expected: 2 detected rooms (one L-shaped, one rectangular).
    """
    img = create_base_canvas(900, 700)
    # Outer boundary of full footprint
    draw_wall(img, (80, 80), (820, 80))
    draw_wall(img, (820, 80), (820, 620))
    draw_wall(img, (820, 620), (80, 620))
    draw_wall(img, (80, 620), (80, 80))

    # L-shaped cut partition
    draw_wall(img, (480, 80), (480, 380))
    draw_wall(img, (480, 380), (820, 380))

    # Door gaps
    draw_door_gap(img, (480, 200), (480, 235))
    draw_door_gap(img, (260, 620), (300, 620))

    cv2.imwrite(str(output_path), img)

def generate_05_corridor_and_rooms(output_path: Path):
    """
    Synthetic Test 5: Central hallway corridor connecting 4 peripheral rooms.
    Expected: 5 detected spaces (1 corridor + 4 rooms).
    """
    img = create_base_canvas(1000, 800)
    # Outer perimeter
    draw_wall(img, (60, 60), (940, 60))
    draw_wall(img, (940, 60), (940, 740))
    draw_wall(img, (940, 740), (60, 740))
    draw_wall(img, (60, 740), (60, 60))

    # Corridor horizontal walls (Corridor: Y=350 to Y=450, height=100px)
    draw_wall(img, (60, 350), (940, 350))
    draw_wall(img, (60, 450), (940, 450))

    # Top room partition at X=500
    draw_wall(img, (500, 60), (500, 350))

    # Bottom room partition at X=500
    draw_wall(img, (500, 450), (500, 740))

    # Doorways connecting each room to the central corridor
    draw_door_gap(img, (250, 350), (285, 350)) # Top-Left room door
    draw_door_gap(img, (720, 350), (755, 350)) # Top-Right room door
    draw_door_gap(img, (250, 450), (285, 450)) # Bottom-Left room door
    draw_door_gap(img, (720, 450), (755, 450)) # Bottom-Right room door
    draw_door_gap(img, (60, 380), (60, 420))   # Corridor main entrance

    cv2.imwrite(str(output_path), img)

def generate_06_realistic_architectural(output_path: Path):
    """
    Synthetic Test 6: Complex realistic architectural blueprint.
    Features:
    - 6 distinct spaces: Living Room, Kitchen, Hallway, Master Bedroom, Bed 2, Bath.
    - Varying exterior (16px) vs interior (10px) wall thicknesses.
    - Door gaps with architectural 90-degree swing arcs.
    - Window symbols (double thin lines embedded in exterior walls).
    - Text annotations inside room cavities.
    """
    img = create_base_canvas(1200, 900)

    # 1. Outer Heavy Structural Perimeter (16px)
    draw_wall(img, (80, 80), (1120, 80), thickness=16)
    draw_wall(img, (1120, 80), (1120, 820), thickness=16)
    draw_wall(img, (1120, 820), (80, 820), thickness=16)
    draw_wall(img, (80, 820), (80, 80), thickness=16)

    # 2. Major Partitions (10px)
    # Horizontal dividing wall: Y = 450
    draw_wall(img, (80, 450), (1120, 450), thickness=10)
    # Vertical dividing walls: X = 500 (Upper), X = 800 (Upper)
    draw_wall(img, (500, 80), (500, 450), thickness=10)
    draw_wall(img, (800, 80), (800, 450), thickness=10)
    # Vertical dividing walls: X = 600 (Lower)
    draw_wall(img, (600, 450), (600, 820), thickness=10)

    # Lower Hallway corridor at Y = 620 from X = 80 to X = 600
    draw_wall(img, (80, 620), (600, 620), thickness=10)

    # 3. Door Openings and Door Swings
    doors = [
        # pt1, pt2, arc_center, start_angle, end_angle
        ((250, 450), (290, 450), (250, 450), 0, 90),
        ((620, 450), (660, 450), (620, 450), 0, 90),
        ((900, 450), (940, 450), (900, 450), 0, 90),
        ((500, 240), (500, 280), (500, 240), 90, 180),
        ((320, 620), (360, 620), (320, 620), 0, 90),
        ((80, 520), (80, 560), (80, 520), 270, 360), # Main Entrance
    ]

    for d_p1, d_p2, arc_c, s_ang, e_ang in doors:
        draw_door_gap(img, d_p1, d_p2, thickness=14)
        # Draw architectural door swing arc (thin 1px)
        cv2.ellipse(img, arc_c, (40, 40), 0, s_ang, e_ang, (100, 100, 100), 1)

    # 4. Windows (Thin double lines along exterior walls)
    windows = [
        ((300, 80), (420, 80)),
        ((620, 80), (740, 80)),
        ((920, 80), (1040, 80)),
        ((300, 820), (450, 820)),
        ((800, 820), (950, 820)),
    ]
    for w_p1, w_p2 in windows:
        # Clear wall slice and draw window symbol
        cv2.line(img, w_p1, w_p2, (255, 255, 255), 18)
        cv2.line(img, (w_p1[0], w_p1[1] - 4), (w_p2[0], w_p2[1] - 4), (20, 20, 20), 2)
        cv2.line(img, (w_p1[0], w_p1[1] + 4), (w_p2[0], w_p2[1] + 4), (20, 20, 20), 2)

    # 5. Architectural Text Annotations inside rooms
    labels = [
        ("LIVING ROOM", (220, 260)),
        ("KITCHEN", (610, 260)),
        ("DINING", (920, 260)),
        ("ENTRY HALL", (250, 540)),
        ("BEDROOM 1", (250, 720)),
        ("MASTER SUITE", (800, 640)),
    ]
    for text, pos in labels:
        cv2.putText(img, text, pos, cv2.FONT_HERSHEY_SIMPLEX, 0.55, (120, 120, 120), 1, cv2.LINE_AA)

    cv2.imwrite(str(output_path), img)

def main():
    samples_dir = Path(__file__).parent
    samples_dir.mkdir(parents=True, exist_ok=True)

    print("Generating synthetic benchmark floorplans in:", samples_dir)
    
    generate_01_single_room(samples_dir / "01_single_room.png")
    print("  [1/5] Generated 01_single_room.png")

    generate_02_two_rooms(samples_dir / "02_two_rooms.png")
    print("  [2/5] Generated 02_two_rooms.png")

    generate_03_three_rooms_connected(samples_dir / "03_three_rooms_connected.png")
    print("  [3/5] Generated 03_three_rooms_connected.png")

    generate_04_l_shaped_room(samples_dir / "04_l_shaped_room.png")
    print("  [4/5] Generated 04_l_shaped_room.png")

    generate_05_corridor_and_rooms(samples_dir / "05_corridor_and_rooms.png")
    print("  [5/5] Generated 05_corridor_and_rooms.png")

    generate_06_realistic_architectural(samples_dir / "06_realistic_architectural.png")
    print("  [6/6] Generated 06_realistic_architectural.png")

    print("\nDone! 6 benchmark floorplans created.")

if __name__ == "__main__":
    main()
