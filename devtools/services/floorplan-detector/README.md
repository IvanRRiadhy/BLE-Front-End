# BIONIC Floorplan Detector — Classical Computer Vision Proof of Concept (Phase 2)

> [!IMPORTANT]
> **Proof-of-Concept Notice**:
> This is a **Classical Computer Vision (CV) Proof of Concept**. It evaluates the reliability of detecting logical rooms and enclosed architectural spaces using structural walls, partitions, contours, and geometry **without deep learning or AI models**.

---

## 1. Overview & Architecture

The detector answers the engineering question:
> *"Can we reliably extract logical room boundary polygons from architectural floorplans using classical computer vision?"*

The detector takes an architectural floorplan image and produces clean candidate `DetectedArea[]` polygons in **original image pixel coordinates**. The output is directly compatible with the existing downstream TypeScript geometry and BIONIC serialization engine.

```
Floorplan Image (PNG, JPG, WEBP)
            ↓
1. Preprocessing (Grayscale, Bilateral Edge Filtering, Adaptive/Otsu Threshold)
            ↓
2. Wall Detection (Structural Kernels & Door Gap Closure)
            ↓
3. Space Segmentation (Exterior Flood-Fill Boundary Elimination & Connected Components)
            ↓
4. Room Filtering (Area Bounds, Solidity, Aspect Ratio & Noise Rejection)
            ↓
5. Polygon Extraction (Douglas-Peucker Simplification & Shapely Validation)
            ↓
Output: detection.json (Original Pixel Coordinates) + 01..07 Debug Visualizations
            ↓
[TypeScript Engine / DevTools UI] (Downstream geometry, text boxes, & BIONIC JSON)
```

---

## 2. Installation & Requirements

### System Requirements
- Python 3.9+ (Verified with Python 3.11.9)
- Lightweight dependencies (zero heavy AI frameworks like PyTorch, TensorFlow, or ONNX).

### Installation
```bash
cd packages/typescript/devtools/services/floorplan-detector
pip install -r requirements.txt
```

### Dependencies
- `opencv-python>=4.8.0` — Image processing, morphological filtering, and contour operations.
- `numpy>=1.24.0` — Matrix and image array computations.
- `shapely>=2.0.0` — Topological validation and polygon self-intersection checks.

---

## 3. CLI Usage

The detector is executed directly from the terminal without requiring any web server or database:

```bash
python detect.py <path_to_floorplan_image> [options]
```

### Options
| Flag | Type | Default | Description |
|---|---|---|---|
| `<image>` | `str` | *(required)* | Path to floorplan image (PNG, JPG, WEBP). |
| `--output-dir`, `-o` | `str` | `output` | Directory where `detection.json` and debug images are saved. |
| `--debug`, `-d` | `flag` | `True` | Emits step-by-step debug visualization images (`01..07`). |
| `--wall-kernel` | `int` | `35` | Morphological kernel size used to bridge door openings and partition gaps. |
| `--min-area` | `int` | `1200` | Minimum room area in pixels to filter out wall cavities, closets, and text. |

### Example
```bash
python detect.py samples/06_realistic_architectural.png -o output/demo
```

---

## 4. Detection Pipeline Details

The pipeline is split into modular components inside `app/`:

### Stage 1: Preprocessing (`app/preprocessing.py`)
- **Grayscale Conversion**: Automatically converts RGB/BGR/BGRA floorplans.
- **Bilateral Filtering**: Smooths paper texture, scanning grain, and raster artifacts while strictly preserving sharp wall edges.
- **Binary Thresholding**: Supports both Otsu global thresholding and adaptive Gaussian thresholding. Automatically senses light-background blueprints vs. dark-background CAD drawings.
- **Morphological Cleanup**: Eliminates isolated salt-and-pepper noise specks.

### Stage 2: Wall Detection & Door Gap Closing (`app/wall_detection.py`)
- In architectural drawings, door openings and wall breaks (typically 15–50px) would cause room interiors to leak into adjacent rooms or the exterior.
- Applies structural morphological closing using horizontal and vertical kernels to seal doorways while maintaining hollow room chambers.

### Stage 3: Space Segmentation (`app/space_detection.py`)
- Inverts the wall mask so free space is white (255) and walls are black (0).
- **Exterior Elimination via Boundary Flood-Fill**: Adds a padded perimeter border and flood-fills the outside world starting from the image borders. All exterior background is discarded.
- **Connected Components Analysis**: Runs `cv2.connectedComponentsWithStats` on the remaining interior spaces to identify candidate room chambers.
- **Region Filtering**: Discards wall cavities, small gaps (`< min_room_area_px`), and outer building boundaries (`> max_room_area_ratio`).

### Stage 4: Polygon Extraction & Validation (`app/polygon.py`)
- Extracts external contours for each room chamber.
- **Douglas-Peucker Simplification**: Reduces thousands of raw pixel points into clean rectilinear or polygonal vertices using an adaptive epsilon.
- **Collinear Filtering**: Eliminates redundant vertices along straight wall segments.
- **Shapely Validation**: Validates that polygons are topologically valid, non-self-intersecting, and have $\ge 3$ vertices.
- **Coordinate Preservation**: Vertices are formatted as `{"xPx": x, "yPx": y}` in the **original image pixel coordinate space**.

---

## 5. Output Format

The output `detection.json` strictly adheres to the input contract of the existing TypeScript detection pipeline:

```json
{
  "imageWidth": 1200,
  "imageHeight": 900,
  "areas": [
    {
      "id": "detected-001",
      "polygon": [
        { "xPx": 493.0, "yPx": 91.0 },
        { "xPx": 91.0, "yPx": 91.0 },
        { "xPx": 91.0, "yPx": 443.0 },
        { "xPx": 493.0, "yPx": 443.0 }
      ]
    },
    {
      "id": "detected-002",
      "polygon": [
        { "xPx": 508.0, "yPx": 91.0 },
        { "xPx": 508.0, "yPx": 443.0 },
        { "xPx": 793.0, "yPx": 443.0 },
        { "xPx": 793.0, "yPx": 91.0 }
      ]
    }
  ],
  "stats": {
    "image_width": 1200,
    "image_height": 900,
    "candidate_spaces": 6,
    "accepted_rooms": 6,
    "rejected": { "too_small": 0, "too_large": 0, "touching_border": 0 },
    "final_valid_polygons": 6
  }
}
```

---

## 6. Debug Artifacts

When running with `--debug`, the CLI generates high-contrast visual stages:
1. `01_original.png`: Source floorplan image.
2. `02_grayscale.png`: Denoised single-channel representation.
3. `03_threshold.png`: Extracted binary structural lines.
4. `04_wall_mask.png`: Sealed watertight wall network with bridged doors.
5. `05_space_mask.png`: Extracted interior enclosed room chambers.
6. `06_detected_contours.png`: Boundary contours drawn over the original drawing.
7. `07_final_polygons.png`: Color-coded translucent polygon overlays with Area IDs, vertex markers, and vertex counts.

---

## 7. Benchmark Evaluation Results

Run the automated test suite:
```bash
python tests/test_detector.py
```

### Benchmark Summary Table
| Sample Image | Scenario Description | Expected Rooms | Detected Rooms | Status |
|---|---|:---:|:---:|:---:|
| `01_single_room.png` | Single rectangular room with doorway | 1 | 1 | **PASS** |
| `02_two_rooms.png` | 2 adjacent rooms sharing a partition wall | 2 | 2 | **PASS** |
| `03_three_rooms_connected.png` | BIONIC DevTools 3-room layout (Lobby, Meeting, Storage) | 3 | 3 | **PASS** |
| `04_l_shaped_room.png` | Concave L-shaped room + rectangular room | 2 | 2 | **PASS** |
| `05_corridor_and_rooms.png` | Central hallway connecting 4 peripheral rooms | 5 | 5 | **PASS** |
| `06_realistic_architectural.png` | Complex blueprint with door swing arcs, windows, and room text labels | 6 | 6 | **PASS** |

**Total Accuracy**: **6 / 6 (100% on benchmark suite)**.

---

## 8. Known Limitations of Classical CV

While classical CV performs exceptionally well on clean, structured floorplans with distinct continuous walls, the following scenarios represent known failure modes:

1. **Open-Plan Layouts**: Spaces with no physical wall or partition separating them (e.g. open kitchen / living room combinations) cannot be separated topologically without semantic understanding.
2. **Missing or Broken Walls**: If door openings or partition gaps exceed the morphological closure kernel (`wall_close_kernel_size > 50-60px`), rooms will merge together or leak outside.
3. **Heavy Furniture Clusters**: Complex CAD drawings with desk arrangements, tables, and cabinets touching walls can create artificial wall bridges or distort room perimeter contours.
4. **Curved or Non-Orthogonal Walls**: Douglas-Peucker simplification tolerance must be tuned carefully to avoid either over-segmenting curves into dozens of micro-vertices or cutting corners off curved walls.
5. **Very Faint or Low-Resolution Scans**: Scans where wall lines have lower contrast than text or dimensions may fail binary thresholding.

---

## 9. Future AI / FastAPI Transition Roadmap

When transitioning to Phase 3 (Production AI & API service):
1. **Detection Provider Interface**: The existing TypeScript DevTools UI already includes an `IFloorplanDetectionProvider` abstraction designed for HTTP API consumption.
2. **FastAPI Wrapper**: A lightweight FastAPI endpoint (`POST /detect`) can wrap `run_detection()` and return the JSON result.
3. **Hybrid AI Segmentation**: Replace or augment `extract_wall_mask` with a learned wall segmentation model (e.g. lightweight U-Net or SegFormer trained on CVC-FP / CubiCasa5K datasets), while reusing the existing topological space segmentation, polygon simplification, and TypeScript BIONIC serializer downstream.
