# BIONIC Evaluation Datasets

This directory documents the floorplan datasets supported by the BIONIC Evaluation Harness, detailing data acquisition, licensing, annotation schema, supported categories, and conversion rules.

---

## 1. Supported Datasets

### A. Tier A: Deterministic Synthetic Suite (`synthetic`)
* **Source**: Procedurally drafted architectural vector and raster samples located in `samples/` (`01` through `09`).
* **Ground Truth**: Exact mathematical polygon vertices derived directly from architectural generation coordinates (`samples/ground_truth.py`).
* **Purpose**: Algorithmic regression testing, corner case validation (concave/L-shaped rooms, corridors, door swings, drop shadows, site loops), and deterministic stress matrices.

### B. Tier B & Tier C: CubiCasa5K (`cubicasa5k`)
* **Source**: [CubiCasa5K Dataset (Zenodo)](https://zenodo.org/record/2613548) / [CubiCasa GitHub](https://github.com/CubiCasa/CubiCasa5K)
* **License**: **Creative Commons Attribution 4.0 International (CC BY 4.0)**.
* **Redistribution Policy**: Per project guidelines, large raw dataset archives are **NOT** committed directly to Git. Instead, users download the archive or import local subsets into `datasets/cubicasa5k/`.

---

## 2. Expected Directory Structure

```
services/floorplan-detector/
└── datasets/
    └── cubicasa5k/
        ├── README.md
        ├── sample_0001/
        │   ├── F1_scaled.png       ← Raster floorplan image
        │   └── model.svg           ← Vector ground-truth annotation
        ├── sample_0002/
        │   ├── F1_scaled.png
        │   └── model.svg
        └── ...
```

---

## 3. Annotation Schema & Conversion Rules

### 3.1 Supported Categories (Extracted as Logical Rooms)
The CubiCasa adapter whitelist extracts interior architectural chambers:
- `Living room`
- `Kitchen`
- `Bedroom`
- `Bathroom` / `Toilet`
- `Hall` / `Corridor` / `Entry`
- `Dining`
- `Office` / `Study`
- `Closet` / `Storage` / `Utility`

### 3.2 Unsupported Categories (Safely Excluded — Zero Fabrication)
To maintain pure ground-truth integrity without inventing labels:
- `Outdoor`, `Balcony`, `Terrace`: Excluded because the current detector scope is interior room enclosed chambers.
- `Wall`, `Door`, `Window`, `Railing`: Structural barriers, not interior area chambers.
- `FixedFurniture`, `Furniture`: Interior furnishings; filtered out to prevent comparing furniture outlines against room boundaries.
- `Shaft`, `Chimney`, `Stairs`: Non-functional utility cavities.

### 3.3 Geometric Normalization & Coordinate Alignment
1. **Dimension Normalization**: SVG viewBox dimensions are matched to raster pixel dimensions (`imageWidth`, `imageHeight`), scaling vertices proportionally via `scale_x = img_w / svg_w`.
2. **Invalid Polygons**: Any source polygon with `< 3` vertices or degenerate geometry is excluded and logged as unsupported.
3. **Internal Schema**: Exported into the dataset-independent `GroundTruthSample` structure defined in `evaluation/models.py`.
