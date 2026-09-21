"""
Generates synthetic floorplan samples for Phase 2.6 Real-World Failure Cases:
- Case 1: 07_2d_architectural_complex.png (2D architectural plan with furniture, door swings, dimension lines, labels)
- Case 2: 08_rendered_3d_floorplan.png (Rendered 3D-style 3-room plan with shaded wall bevels, colored floor fills, soft shadows)
- Case 3: 09_site_architectural_plan.png (Complex site plan with building footprint inside an enclosed road/parking perimeter)
"""
import cv2
import numpy as np
from pathlib import Path

def generate_07_2d_architectural_complex(output_path: Path):
    """
    Case 1: 2D Architectural plan with 4 rooms, furniture, door swings, dimensions, labels.
    Expected rooms: 4 (Living, Kitchen, Bedroom, Bath)
    """
    w, h = 1200, 900
    img = np.ones((h, w, 3), dtype=np.uint8) * 255

    # Structural Walls (Thick black lines, thickness=10)
    # Outer building boundary
    cv2.rectangle(img, (150, 100), (1050, 800), (30, 30, 30), 10)

    # Interior dividing walls
    cv2.line(img, (150, 480), (1050, 480), (30, 30, 30), 10)  # Horizontal divider
    cv2.line(img, (600, 100), (600, 800), (30, 30, 30), 10)   # Vertical divider

    # Door openings (28px gaps)
    # Living Room (Top Left: 150,100 -> 600,480) to Kitchen (Top Right: 600,100 -> 1050,480)
    cv2.line(img, (600, 260), (600, 290), (255, 255, 255), 14)
    # Door swing arc (thin quarter circle)
    cv2.ellipse(img, (600, 260), (30, 30), 0, 0, 90, (140, 140, 140), 1, cv2.LINE_AA)

    # Kitchen to Bedroom (Bottom Right: 600,480 -> 1050,800)
    cv2.line(img, (800, 480), (830, 480), (255, 255, 255), 14)
    cv2.ellipse(img, (800, 480), (30, 30), 0, 90, 180, (140, 140, 140), 1, cv2.LINE_AA)

    # Living to Bath (Bottom Left: 150,480 -> 600,800)
    cv2.line(img, (350, 480), (380, 480), (255, 255, 255), 14)
    cv2.ellipse(img, (350, 480), (30, 30), 0, 90, 180, (140, 140, 140), 1, cv2.LINE_AA)

    # Exterior Entrance Door on south wall
    cv2.line(img, (360, 800), (400, 800), (255, 255, 255), 14)

    # Furniture / Interior clutter (thin lines, thickness=1-2)
    # Living room: L-shaped sofa and coffee table
    cv2.rectangle(img, (200, 150), (340, 230), (120, 120, 120), 2)
    cv2.rectangle(img, (200, 230), (260, 360), (120, 120, 120), 2)
    cv2.rectangle(img, (280, 260), (340, 320), (160, 160, 160), 1)

    # Kitchen: Counter island and dining table
    cv2.rectangle(img, (700, 140), (1000, 190), (100, 100, 100), 2)
    cv2.rectangle(img, (740, 260), (920, 370), (120, 120, 120), 2)
    for seat_x in [770, 830, 890]:
        cv2.circle(img, (seat_x, 240), 12, (150, 150, 150), 1)
        cv2.circle(img, (seat_x, 390), 12, (150, 150, 150), 1)

    # Bedroom: Bed and nightstands
    cv2.rectangle(img, (750, 560), (950, 740), (110, 110, 110), 2)
    cv2.rectangle(img, (700, 560), (740, 610), (140, 140, 140), 1)
    cv2.rectangle(img, (960, 560), (1000, 610), (140, 140, 140), 1)

    # Bath: Tub, sink, toilet
    cv2.rectangle(img, (180, 520), (320, 600), (130, 130, 130), 2)
    cv2.ellipse(img, (250, 560), (55, 30), 0, 0, 360, (160, 160, 160), 1)
    cv2.rectangle(img, (480, 520), (560, 580), (130, 130, 130), 1)

    # Room Labels (Text)
    font = cv2.FONT_HERSHEY_SIMPLEX
    cv2.putText(img, "LIVING ROOM", (310, 420), font, 0.6, (60, 60, 60), 1, cv2.LINE_AA)
    cv2.putText(img, "KITCHEN", (790, 420), font, 0.6, (60, 60, 60), 1, cv2.LINE_AA)
    cv2.putText(img, "BATHROOM", (310, 720), font, 0.6, (60, 60, 60), 1, cv2.LINE_AA)
    cv2.putText(img, "BEDROOM", (790, 760), font, 0.6, (60, 60, 60), 1, cv2.LINE_AA)

    # Dimension lines on outer margin
    cv2.line(img, (1100, 100), (1100, 800), (180, 180, 180), 1)
    cv2.line(img, (1085, 100), (1115, 100), (180, 180, 180), 1)
    cv2.line(img, (1085, 800), (1115, 800), (180, 180, 180), 1)
    cv2.putText(img, "14.0 m", (1110, 460), font, 0.5, (160, 160, 160), 1, cv2.LINE_AA)

    cv2.imwrite(str(output_path), img)


def generate_08_rendered_3d_floorplan(output_path: Path):
    """
    Case 2: 3D Rendered Floorplan with 3 rooms, colored floor fills, shaded walls, soft shadows.
    Layout: [ ROOM 1 | ROOM 2 | ROOM 3 ]
    Expected rooms: 3
    """
    w, h = 1200, 600
    # Light gray background canvas
    img = np.ones((h, w, 3), dtype=np.uint8) * 242

    # Room bounding boxes:
    # Outer: X: 100 -> 1100, Y: 100 -> 500
    # Room 1: 100 -> 433
    # Room 2: 433 -> 766
    # Room 3: 766 -> 1100

    # 1. Floor Fills with subtle colored tones / textures
    # Room 1: Warm wood / parquet tone (BGR: 190, 215, 230)
    img[100:500, 100:433] = (195, 218, 232)
    # Room 2: Cool light tile tone (BGR: 228, 228, 224)
    img[100:500, 433:766] = (226, 226, 222)
    # Room 3: Soft blue-gray carpet tone (BGR: 225, 220, 210)
    img[100:500, 766:1100] = (222, 218, 212)

    # 2. Add soft ambient drop shadows along interior wall perimeters
    shadow_w = 12
    for d in range(shadow_w):
        alpha = (shadow_w - d) / (shadow_w * 4.0)  # Subtle shadow
        # Top shadow
        cv2.line(img, (100, 100 + d), (1100, 100 + d), (80, 80, 80), 1)
        # Left shadow
        cv2.line(img, (100 + d, 100), (100 + d, 500), (80, 80, 80), 1)

    # 3. 3D Beveled Walls (Outer & Partitions)
    # Walls are medium-gray to dark-gray (NOT pure black), with highlighted edges
    wall_color = (65, 70, 75)
    bevel_highlight = (140, 145, 150)
    bevel_shadow = (35, 38, 42)

    # Outer wall boundary (16px thick)
    cv2.rectangle(img, (92, 92), (1108, 508), bevel_shadow, 16)
    cv2.rectangle(img, (96, 96), (1104, 504), wall_color, 12)
    cv2.rectangle(img, (102, 102), (1098, 498), bevel_highlight, 2)

    # Partition 1 at X = 433
    cv2.line(img, (433, 100), (433, 500), bevel_shadow, 16)
    cv2.line(img, (433, 100), (433, 500), wall_color, 12)
    cv2.line(img, (429, 100), (429, 500), bevel_highlight, 2)

    # Partition 2 at X = 766
    cv2.line(img, (766, 100), (766, 500), bevel_shadow, 16)
    cv2.line(img, (766, 100), (766, 500), wall_color, 12)
    cv2.line(img, (762, 100), (762, 500), bevel_highlight, 2)

    # Door openings (28px) with floor continuity
    # Partition 1 door
    img[270:305, 420:446] = (226, 226, 222)
    # Partition 2 door
    img[270:305, 754:778] = (222, 218, 212)
    # Exterior door
    img[495:515, 230:265] = (242, 242, 242)

    # Room Labels
    font = cv2.FONT_HERSHEY_SIMPLEX
    cv2.putText(img, "ROOM 1", (210, 310), font, 0.7, (50, 50, 50), 2, cv2.LINE_AA)
    cv2.putText(img, "ROOM 2", (545, 310), font, 0.7, (50, 50, 50), 2, cv2.LINE_AA)
    cv2.putText(img, "ROOM 3", (880, 310), font, 0.7, (50, 50, 50), 2, cv2.LINE_AA)

    cv2.imwrite(str(output_path), img)


def generate_09_site_architectural_plan(output_path: Path):
    """
    Case 3: Complex Architectural Site Plan with central building and enclosed exterior roads/site.
    Central building has 3 rooms (Office A, Office B, Conf).
    Site has an enclosed access driveway loop, parking bays, and perimeter fence.
    Expected rooms: 3 (ONLY interior rooms, NOT the exterior road/parking/site loop!).
    """
    w, h = 1400, 1000
    img = np.ones((h, w, 3), dtype=np.uint8) * 255

    # 1. Outer Site Property Fence (Thin boundary line, thickness=2)
    cv2.rectangle(img, (50, 50), (1350, 950), (160, 160, 160), 2)

    # 2. Enclosed Exterior Access Road / Driveway Loop (Encloses the building)
    # Outer curb of road
    cv2.rectangle(img, (120, 120), (1280, 880), (110, 110, 110), 3)
    # Road surface fill (light gray)
    cv2.rectangle(img, (123, 123), (1277, 877), (235, 235, 235), -1)

    # Road center dashed line
    for rx in range(150, 1250, 35):
        cv2.line(img, (rx, 155), (rx + 20, 155), (200, 200, 120), 2)
        cv2.line(img, (rx, 845), (rx + 20, 845), (200, 200, 120), 2)

    # Inner curb of road / landscaping boundary (Creates an enclosed exterior road ring!)
    cv2.rectangle(img, (220, 190), (1180, 810), (110, 110, 110), 3)
    # Courtyard / landscaping fill (white/very light green)
    cv2.rectangle(img, (223, 193), (1177, 807), (248, 252, 248), -1)

    # Parking Bay Striping (thin lines)
    for px in range(250, 550, 40):
        cv2.line(img, (px, 190), (px, 260), (150, 150, 150), 1)

    # 3. Central Architectural Building Footprint (Heavy structural walls, thickness=10)
    # Building spans X: 400 -> 1000, Y: 320 -> 720
    b_left, b_top, b_right, b_bottom = 400, 320, 1000, 720
    cv2.rectangle(img, (b_left, b_top), (b_right, b_bottom), (20, 20, 20), 10)

    # Interior Partitions (Office A, Office B, Conference Room)
    # Vertical divider at X = 700
    cv2.line(img, (700, b_top), (700, b_bottom), (20, 20, 20), 10)
    # Horizontal divider in Left wing at Y = 520
    cv2.line(img, (b_left, 520), (700, 520), (20, 20, 20), 10)

    # Door openings (28px gaps)
    # Exterior entrance on south wall
    cv2.line(img, (520, b_bottom), (555, b_bottom), (248, 252, 248), 14)
    # Interior door Office A -> Office B
    cv2.line(img, (520, 520), (555, 520), (255, 255, 255), 14)
    # Interior door Office B -> Conf
    cv2.line(img, (700, 580), (700, 615), (255, 255, 255), 14)

    # Room Labels
    font = cv2.FONT_HERSHEY_SIMPLEX
    cv2.putText(img, "OFFICE A", (470, 440), font, 0.6, (40, 40, 40), 1, cv2.LINE_AA)
    cv2.putText(img, "OFFICE B", (470, 640), font, 0.6, (40, 40, 40), 1, cv2.LINE_AA)
    cv2.putText(img, "CONF ROOM", (780, 540), font, 0.6, (40, 40, 40), 1, cv2.LINE_AA)

    # Site Labels
    cv2.putText(img, "PARKING AREA", (320, 240), font, 0.5, (130, 130, 130), 1, cv2.LINE_AA)
    cv2.putText(img, "ACCESS ROAD (ONE-WAY)", (550, 150), font, 0.5, (130, 130, 130), 1, cv2.LINE_AA)
    cv2.putText(img, "SITE PROPERTY LINE", (120, 80), font, 0.5, (160, 160, 160), 1, cv2.LINE_AA)

    cv2.imwrite(str(output_path), img)


def generate_all():
    samples_dir = Path(__file__).parent
    generate_07_2d_architectural_complex(samples_dir / "07_2d_architectural_complex.png")
    generate_08_rendered_3d_floorplan(samples_dir / "08_rendered_3d_floorplan.png")
    generate_09_site_architectural_plan(samples_dir / "09_site_architectural_plan.png")
    print("Generated 07_2d_architectural_complex.png, 08_rendered_3d_floorplan.png, and 09_site_architectural_plan.png successfully.")

if __name__ == "__main__":
    generate_all()
