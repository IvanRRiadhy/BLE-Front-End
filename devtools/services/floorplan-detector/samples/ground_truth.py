"""
Mathematical ground-truth polygon definitions for synthetic benchmark floorplans.
Derived directly from the architectural drafting parameters in generate_synthetic.py.
"""
from typing import Dict, List, Tuple

# Each room is represented by a list of (x, y) vertices in pixel space
GroundTruthRoom = List[Tuple[float, float]]

GROUND_TRUTH_DATA: Dict[str, List[GroundTruthRoom]] = {
    "01_single_room.png": [
        [
            (104.0, 104.0),
            (696.0, 104.0),
            (696.0, 496.0),
            (104.0, 496.0),
        ]
    ],
    "02_two_rooms.png": [
        # Room 1 (West)
        [
            (84.0, 84.0),
            (446.0, 84.0),
            (446.0, 516.0),
            (84.0, 516.0),
        ],
        # Room 2 (East)
        [
            (454.0, 84.0),
            (816.0, 84.0),
            (816.0, 516.0),
            (454.0, 516.0),
        ],
    ],
    "03_three_rooms_connected.png": [
        # Room A (Upper Lobby)
        [
            (54.0, 54.0),
            (946.0, 54.0),
            (946.0, 316.0),
            (54.0, 316.0),
        ],
        # Room B (Lower-Left Meeting Room)
        [
            (54.0, 324.0),
            (516.0, 324.0),
            (516.0, 646.0),
            (54.0, 646.0),
        ],
        # Room C (Lower-Right Storage Room)
        [
            (524.0, 324.0),
            (946.0, 324.0),
            (946.0, 646.0),
            (524.0, 646.0),
        ],
    ],
    "04_l_shaped_room.png": [
        # Room 1 (L-shaped concave room)
        [
            (84.0, 84.0),
            (476.0, 84.0),
            (476.0, 376.0),
            (816.0, 376.0),
            (816.0, 616.0),
            (84.0, 616.0),
        ],
        # Room 2 (Upper-East rectangular room)
        [
            (484.0, 84.0),
            (816.0, 84.0),
            (816.0, 376.0),
            (484.0, 376.0),
        ],
    ],
    "05_corridor_and_rooms.png": [
        # Central Corridor
        [
            (64.0, 354.0),
            (936.0, 354.0),
            (936.0, 446.0),
            (64.0, 446.0),
        ],
        # Room Top-Left
        [
            (64.0, 64.0),
            (496.0, 64.0),
            (496.0, 346.0),
            (64.0, 346.0),
        ],
        # Room Top-Right
        [
            (504.0, 64.0),
            (936.0, 64.0),
            (936.0, 346.0),
            (504.0, 346.0),
        ],
        # Room Bottom-Left
        [
            (64.0, 454.0),
            (496.0, 454.0),
            (496.0, 736.0),
            (64.0, 736.0),
        ],
        # Room Bottom-Right
        [
            (504.0, 454.0),
            (936.0, 454.0),
            (936.0, 736.0),
            (504.0, 736.0),
        ],
    ],
    "06_realistic_architectural.png": [
        # Living Room
        [
            (88.0, 88.0),
            (495.0, 88.0),
            (495.0, 445.0),
            (88.0, 445.0),
        ],
        # Kitchen
        [
            (505.0, 88.0),
            (795.0, 88.0),
            (795.0, 445.0),
            (505.0, 445.0),
        ],
        # Dining
        [
            (805.0, 88.0),
            (1112.0, 88.0),
            (1112.0, 445.0),
            (805.0, 445.0),
        ],
        # Entry Hall
        [
            (88.0, 455.0),
            (595.0, 455.0),
            (595.0, 615.0),
            (88.0, 615.0),
        ],
        # Bedroom 1
        [
            (88.0, 625.0),
            (595.0, 625.0),
            (595.0, 812.0),
            (88.0, 812.0),
        ],
        # Master Suite
        [
            (605.0, 455.0),
            (1112.0, 455.0),
            (1112.0, 812.0),
            (605.0, 812.0),
        ],
    ],
}

def get_ground_truth(sample_filename: str) -> List[GroundTruthRoom]:
    """
    Returns the list of ground truth room polygons for a given sample image.
    """
    if sample_filename not in GROUND_TRUTH_DATA:
        raise KeyError(f"No ground truth data registered for '{sample_filename}'")
    return GROUND_TRUTH_DATA[sample_filename]
