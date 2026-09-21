# Empirical Detector Findings & Failure Pattern Analysis

**Detector Version**: Current Classical Computer Vision (`current_cv` v2.6.0)  
**Evaluated Benchmark**: 50 Stratified Architectural Floorplans (399 Ground-Truth Rooms)  
**Execution Date**: September 2026

---

## Executive Summary of Findings

The evaluation harness ran across 50 representative architectural floorplans. The current OpenCV classical pipeline achieved high room precision (**98.64%**) and fast latency (**111.9 ms/image**), but demonstrated significant topological and geometric vulnerabilities when door openings, hallway partitions, and furniture clutter are introduced.

Across 399 ground-truth rooms, **108 rooms (27.07%) were missed or merged**, and **57 merged-room topological anomalies** occurred.

---

## Top Failure Patterns Identified

### Finding 1: Room Merging Across Door Openings Exceeding Kernel Size
* **Observation**: When doorway openings exceed the morphological closure kernel (`wall_close_kernel_size = 35px`), the morphological dilation/closing stage fails to bridge the door opening. As a result, the watershed/floodfill space segmentation treats the adjacent rooms as a single continuous chamber.
* **Evidence**:
  - Present in **35 out of 50 benchmark images** (e.g. `sample_0001`, `sample_0002`, `sample_0005`, `sample_0020`, `sample_0038`).
  - Total of **57 merged room cases** logged in `report.json`.
  - In parametric stress testing (`evaluation.stress`), room separation failed consistently once doorway width exceeded 40px with the default 35px kernel.

### Finding 2: High Boundary Error from Inset Partition Offsets
* **Observation**: Polygons detected from binary wall masks have boundaries shifted inward by 20–60px relative to ground-truth architectural room boundaries, due to wall dilation thickness.
* **Evidence**:
  - Mean boundary Hausdorff error across all matched rooms was **64.65 px**.
  - In `07_2d_architectural_complex.png`, boundary error reached **111.4 px** despite all 4 rooms being counted.
  - This confirms that counting rooms alone is completely insufficient to guarantee CAD-quality geometry.

### Finding 3: Hallway and Corridor Fragmentation
* **Observation**: Narrow corridors and elongated T-shaped hallways suffer severe segmentation leakage into adjoining open-plan rooms. Corridors with multiple open doors often collapse into living areas.
* **Evidence**:
  - In `sample_0026` and `sample_0032`, the corridor chamber merged into the main living room, leading to F1 scores dropping below 0.40.

### Finding 4: Resolution Sensitivity with Fixed Kernels
* **Observation**: With a fixed kernel (`K=35`), high-resolution floorplans (≥1600x1200) cause door openings in pixel space to expand from 25px to 60–100px, causing the fixed kernel to fail completely.
* **Evidence**:
  - Parametric resolution testing proved that a 1600x1200 floorplan drops from 3 rooms to 1 room under a fixed 35px kernel, whereas resolution-adaptive scaling successfully maintains watertight closure (K=57).

### Finding 5: Interior Furniture Interference with Boundary Rectification
* **Observation**: While the multi-evidence preprocessor filters small furniture items (<1200px), larger fixed installations (kitchen counters, dining table clusters) abutting interior partition walls distort contour tracing, adding spurious concave vertices to room outlines.
* **Evidence**:
  - Room polygons in furniture-dense samples showed vertex counts between 18 and 42 vertices instead of canonical 4-vertex or 6-vertex architectural polygons.
