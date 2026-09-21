# BIONIC Floorplan Evaluation Harness — Architecture Audit

**Date**: September 2026  
**Status**: Audit Complete  
**Scope**: `packages/typescript/devtools` and `services/floorplan-detector`

---

## 1. Project Topology & Boundaries

The repository consists of three distinct subsystems:

1. `packages/typescript/main`: Production People Tracking Frontend application. **MUST REMAIN COMPLETELY UNTOUCHED.**
2. `packages/typescript/devtools`:
   - `src/`: Headless TypeScript geometric coordinate normalization, visual center placement, polygon validation, and BIONIC Area JSON serializer.
   - `devtools-ui/`: Standalone React + Vite developer dashboard (`http://localhost:5173/_devtools/`).
   - `services/floorplan-detector/`: Classical Computer Vision (OpenCV + Shapely) room segmentation service.

---

## 2. Current Detector Architecture

### 2.1 Entry Points
* **CLI Entry Point**: `services/floorplan-detector/detect.py`
  - Function: `run_detection(image_path: Path, output_dir: Path, config: DetectionConfig, debug: bool = False) -> DetectionResult`
* **Core Service Class**: `services/floorplan-detector/app/detector.py`
  - Class: `FloorplanDetector`
  - Methods:
    - `detect_image(img: np.ndarray, config: Optional[DetectionConfig] = None) -> DetectionResult`
    - `detect_file(file_path: Union[str, Path], config: Optional[DetectionConfig] = None) -> DetectionResult`
    - `detect_bytes(image_bytes: bytes, config: Optional[DetectionConfig] = None) -> DetectionResult`
* **HTTP API Adapter**: `services/floorplan-detector/api/main.py`
  - Endpoints:
    - `GET /health` -> `{"status": "ok"}`
    - `POST /detect` -> Multipart image upload returning `DetectionResult.to_dict()`

### 2.2 Input Format
* **Images**: Raster architectural floorplans (PNG, JPG, JPEG, WEBP) in BGR/BGRA pixel format.
* **Configuration** (`DetectionConfig` in `app/models.py`):
  - `wall_close_kernel_size`: Morphological kernel size for bridging doors (default: 35)
  - `min_room_area_px`: Minimum room contour area in pixels (default: 1200)
  - `auto_scale_kernel`: Dynamic kernel scaling based on `(w + h) / 1700.0`
  - `enable_multi_evidence`: Gradient and edge structural line weighting
  - `min_wall_support_ratio`: Minimum fraction of perimeter supported by detected walls
  - `min_footprint_containment`: Rejection threshold for exterior areas outside building envelope

### 2.3 Output Format
The detector outputs `DetectionResult` (`app/models.py`), serialized as JSON:
```json
{
  "imageWidth": 1200,
  "imageHeight": 900,
  "areas": [
    {
      "id": "Area_001",
      "polygon": [
        { "xPx": 120.0, "yPx": 150.0 },
        { "xPx": 450.0, "yPx": 150.0 },
        { "xPx": 450.0, "yPx": 400.0 },
        { "xPx": 120.0, "yPx": 400.0 }
      ]
    }
  ],
  "stats": {
    "image_width": 1200,
    "image_height": 900,
    "candidate_spaces": 6,
    "accepted_rooms": 4,
    "rejected": {
      "too_small": 1,
      "low_wall_support": 1,
      "outside_building_footprint": 0
    },
    "final_valid_polygons": 4,
    "candidates": [...]
  }
}
```

---

## 3. Existing Test Structure & Synthetic Datasets

### 3.1 Existing Test Files
* `tests/test_detector.py`: Pipeline unit tests verifying preprocessor, wall mask, and space segmentation.
* `tests/test_api.py`: FastAPI HTTP endpoint tests using `starlette.testclient.TestClient`.
* `tests/test_accuracy.py`: Ground-truth polygon accuracy verification across synthetic samples 01–06.
* `tests/test_door_stress.py`: Door gap parametric stress test (5px to 120px).
* `tests/test_resolution_stress.py`: Multi-resolution scaling tests (800x600 to 4000x3000).
* `tests/test_phase26_cases.py`: Integration checks on complex 2D (07), 3D rendered (08), and site plan (09).

### 3.2 Existing Synthetic Samples
Located in `services/floorplan-detector/samples/`:
- `01_single_room.png` (1 room)
- `02_two_rooms.png` (2 rooms)
- `03_three_rooms_connected.png` (3 rooms)
- `04_l_shaped_room.png` (2 rooms, concave geometry)
- `05_corridor_and_rooms.png` (5 rooms, hallway + chambers)
- `06_realistic_architectural.png` (6 rooms, residential layout)
- `07_2d_architectural_complex.png` (4 rooms, furniture & door swings)
- `08_rendered_3d_floorplan.png` (3 rooms, shaded walls & floor textures)
- `09_site_architectural_plan.png` (3 rooms, exterior road loop & parking)
- `ground_truth.py`: Exact mathematical polygon coordinates for samples 01–06.

---

## 4. Reusable Utilities & Potential Integration Points

1. **`FloorplanDetector.detect_file()`**: Pure, thread-safe, decoupled detector method suitable for adapter wrapping.
2. **`compute_polygon_metrics()` in `test_accuracy.py`**: Initial prototype for Shapely IoU, Area Error %, and Centroid Error.
3. **`generate_synthetic.py` & `generate_phase26_samples.py`**: Procedural generators for deterministic Tier A stress and edge-case testing.
4. **`packages/typescript/devtools/src/`**: TypeScript BIONIC serializer and polygon transformer (to remain untouched, but verified through existing integration tests).

---

## 5. Files That MUST NOT Be Changed

* `packages/typescript/main/**`: Production frontend code. Zero edits allowed.
* `services/floorplan-detector/app/**`: Core OpenCV detection algorithms (`detector.py`, `preprocessing.py`, `wall_detection.py`, `space_detection.py`, `polygon.py`, `models.py`). Must be treated as a pure black box during evaluation.
* `services/floorplan-detector/detect.py`: Existing CLI tool.
* `services/floorplan-detector/api/**`: Existing FastAPI endpoints.
* `packages/typescript/devtools/src/**`: Existing headless TypeScript engine.
