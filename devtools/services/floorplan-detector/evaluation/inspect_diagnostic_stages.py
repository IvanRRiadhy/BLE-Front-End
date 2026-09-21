import cv2
import numpy as np
from pathlib import Path

vis_dir = Path("evaluation/results/latest/diagnostic_stages")
for d in sorted(vis_dir.iterdir()):
    if not d.is_dir():
        continue
    bin_img = cv2.imread(str(d / "01_binary.png"), cv2.IMREAD_GRAYSCALE)
    wall_img = cv2.imread(str(d / "02_wall_mask.png"), cv2.IMREAD_GRAYSCALE)
    thick_img = cv2.imread(str(d / "03_thick_walls.png"), cv2.IMREAD_GRAYSCALE)
    interior_img = cv2.imread(str(d / "04_interior_space.png"), cv2.IMREAD_GRAYSCALE)
    footprint_img = cv2.imread(str(d / "05_footprint.png"), cv2.IMREAD_GRAYSCALE)
    space_img = cv2.imread(str(d / "06_space_mask.png"), cv2.IMREAD_GRAYSCALE)

    total_px = bin_img.shape[0] * bin_img.shape[1]
    bin_nz = np.count_nonzero(bin_img)
    wall_nz = np.count_nonzero(wall_img)
    thick_nz = np.count_nonzero(thick_img)
    interior_nz = np.count_nonzero(interior_img)
    footprint_nz = np.count_nonzero(footprint_img)
    space_nz = np.count_nonzero(space_img)

    print(f"Directory: {d.name} ({bin_img.shape[1]}x{bin_img.shape[0]})")
    print(f"  Binary Wall px: {bin_nz} ({bin_nz/total_px*100:.2f}%)")
    print(f"  Thick Wall px:  {thick_nz} ({thick_nz/total_px*100:.2f}%)")
    print(f"  Closed Wall px: {wall_nz} ({wall_nz/total_px*100:.2f}%)")
    print(f"  Interior px:    {interior_nz} ({interior_nz/total_px*100:.2f}%)")
    print(f"  Footprint px:   {footprint_nz} ({footprint_nz/total_px*100:.2f}%)")
    print(f"  Accepted Space: {space_nz} ({space_nz/total_px*100:.2f}%)")
