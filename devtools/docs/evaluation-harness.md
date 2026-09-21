# BIONIC Floorplan Evaluation Harness Documentation

## 1. Overview & Purpose
The **BIONIC Floorplan Evaluation Harness** provides an objective, automated, dataset-independent benchmarking framework for architectural room segmentation models.

Prior testing relied on synthetic regression images where room counts matched expected numbers. However, real-world floorplans suffer from geometric shifts, merged rooms across wide doors, missed chambers, and boundary leakage into corridors or exterior courtyards. The evaluation harness treats detection models as strict black boxes, measuring true geometric precision, recall, IoU, boundary distance, and topological anomalies against ground-truth datasets.

---

## 2. Architecture & Design Principles

```
Dataset (CubiCasa5K / Synthetic)
   │
   ▼
BaseDatasetAdapter
   │ (Normalized GroundTruthSample)
   ├───► DetectorAdapter (Current CV Black Box)
   │        │
   │        ▼
   │     PredictionResult
   ▼        ▼
Geometric Validation (Non-mutating self-intersection & winding checks)
   │
   ▼
Hungarian Bipartite Matching (Max-weight IoU pairing)
   │
   ├───► Topology Analyzer (Merged & Split room detection)
   ├───► Metric Engine (IoU, Multi-Threshold Recall, Boundary Error, Area Error)
   ├───► Visual Debugger (01..05 multi-layer diagnostic overlays)
   └───► Reporter (report.json, report.csv, summary.html, failure galleries)
```

### Key Principles
1. **Strict Separation of Concerns**: The evaluation system contains zero detector heuristics and does not mutate predicted polygons to artificially inflate scores.
2. **Main Application Untouched**: Zero changes or dependencies introduced to `packages/typescript/main`.
3. **Reproducibility**: Deterministic seed-based subset sampling ensuring identical test conditions across candidate detector versions.
4. **No AI/ML in this Phase**: Lightweight stack relying solely on Python, OpenCV, NumPy, Shapely, and SciPy.

---

## 3. Dataset Setup & Acquisition

### Supported Suites
* **Tier A: Synthetic Regression Suite (`synthetic`)**: 9 procedural samples (`01` through `09`) with mathematical ground-truth polygons.
* **Tier B & C: CubiCasa5K (`cubicasa5k`)**: Representative architectural floorplan images paired with vector SVG (`model.svg`) annotations.

### Importing or Generating Samples
To generate the reproducible 50-sample development benchmark:
```bash
python -m evaluation.datasets.generate_benchmark_subset
```
To drop external CubiCasa5K samples:
Place folders containing `F1_scaled.png` and `model.svg` inside `datasets/cubicasa5k/`.

---

## 4. Running the Benchmark (CLI Guide)

### Running Default 50-Image Benchmark
```bash
python -m evaluation.run --config evaluation/configs/baseline.yaml
```

### Running on Synthetic Suite Only
```bash
python -m evaluation.run --dataset synthetic --limit 9
```

### Comparing Candidate Version Against Baseline
```bash
python -m evaluation.compare --baseline evaluation/baselines/v2.6 --candidate evaluation/results/latest
```

### Running Door Gap & Resolution Stress Matrices
```bash
python -m evaluation.stress
```

### Standalone Visualizer for a Single Sample
```bash
python -m evaluation.visualize --image path/to/image.png --ground-truth path/to/gt.json --prediction path/to/pred.json --output-dir evaluation/results/debug
```

---

## 5. Metrics & Interpretation

### Geometric Metrics
* **IoU (Intersection-over-Union)**: Standard area overlap between matched room pairs.
* **Multi-Threshold Room Recall**:
  - `IoU ≥ 0.25`: Loose room correspondence.
  - `IoU ≥ 0.50`: Standard detection threshold.
  - `IoU ≥ 0.75`: Tight architectural boundary alignment.
  - `IoU ≥ 0.90`: CAD-quality precision.
* **Boundary Error (px)**: Bidirectional Hausdorff distance between GT contour and predicted contour. Measures maximum contour deviation along walls and doors.
* **Area Error (%)**: Percentage discrepancy between predicted area and ground truth area.
* **Centroid Error (px)**: Spatial offset between room centers.

### Topological Metrics
* **Merged Rooms**: A single predicted polygon substantially subsuming multiple ground-truth rooms (e.g. wide door causing living room and kitchen to merge).
* **Split Rooms**: A single ground-truth room fragmented into multiple predictions (e.g. divided by furniture clutter or columns).
* **Missed Rooms (FN)**: Ground truth rooms unrecovered by any prediction above `min_iou`.
* **False Positives (FP)**: Predicted polygons with no corresponding ground-truth room.

---

## 6. Diagnostic Visualizations

Each evaluated image generates 5 visual artifacts in `visualizations/<image_id>/`:
1. `01_input.png`: Clean input floorplan.
2. `02_ground_truth.png`: Ground truth rooms in cool blue/cyan with IDs.
3. `03_prediction.png`: Raw predicted polygons in orange/purple.
4. `04_overlay.png`: Alpha-blended overlay highlighting boundary discrepancies.
5. `05_match_visualization.png`: Green = True Positive, Red = False Positive, Blue = Missed Room, connecting centroid vectors with IoU and boundary distance badges.

---

## 7. Failure Case Gallery

Images exhibiting failures are automatically filed into:
* `evaluation/failures/lowest_iou/`
* `evaluation/failures/missed_rooms/`
* `evaluation/failures/merged_rooms/`
* `evaluation/failures/split_rooms/`
* `evaluation/failures/false_positive/`
* `evaluation/failures/invalid_polygon/`
