# BIONIC Floorplan Detector Decision Report (Phase 28 Decision Gate)

**Evaluation Date**: September 2026  
**Evaluator**: BIONIC Standalone Floorplan Evaluation Harness  
**Baseline Dataset**: 50 Stratified Architectural Floorplans (399 Ground-Truth Rooms)  
**Evaluated Detector**: Classical Computer Vision / OpenCV Pipeline (`current_cv` v2.6.0)

---

## 1. How Well Does Classical CV Perform on the Representative Dataset?

Classical CV exhibits strong execution speed (**111.9 ms / image**) and high precision (**98.64%**), producing almost zero false-positive rooms outside the building footprint (only 4 false-positive chambers across 50 floorplans).

However, **room recall is limited to 72.93%**, with **108 out of 399 rooms missed or merged**. Topological correctness is a critical bottleneck: 57 room-merging events occurred across the 50 images. While the image pass rate appears high (90.0% passing basic F1 ≥ 0.60 criteria), only 59.65% of rooms achieve CAD-level alignment (IoU ≥ 0.75).

---

## 2. Multi-Threshold Quantitative Breakdown

| Metric | Target | Actual Classical CV | Status |
| :--- | :--- | :--- | :--- |
| **Rooms with IoU ≥ 0.25** | Loose match | **72.93%** (291 / 399) | Baseline Established |
| **Rooms with IoU ≥ 0.50** | Standard benchmark | **65.91%** (263 / 399) | 34.09% Below Standard |
| **Rooms with IoU ≥ 0.75** | Architectural quality | **59.65%** (238 / 399) | 40.35% Missed / Degraded |
| **Rooms with IoU ≥ 0.90** | CAD precision | **59.65%** (238 / 399) | 40.35% Missed / Degraded |
| **Mean Boundary Hausdorff Error** | < 25.0 px | **64.65 px** | Fails tight boundary test |
| **Mean Area Error** | < 10.0% | **24.89%** | Fails area accuracy test |

---

## 3. What Are the Most Common Failure Patterns?

1. **Doorway Leakage & Chamber Merging (57 cases)**: Structural walls separated by door gaps wider than 35px fail to bridge, causing adjacent rooms (e.g. living room + dining room, bedroom + closet) to merge into a single polygon.
2. **Boundary Recession from Wall Dilation (Mean 64.65px error)**: Morphological closing dilates walls before floodfilling, which artificially pushes the extracted polygon boundary inward away from the true architectural wall face.
3. **Open-Concept Living / Kitchen Leaks**: Absence of a physical wall divider causes two distinct logical zones to fuse into one geometry.
4. **Corridor Collapses**: Hallways connecting multiple rooms are absorbed into the largest adjacent room chamber.

---

## 4. Root Cause Classification of Failures

| Failure Source | Severity | Impact on Classical CV Pipeline |
| :--- | :--- | :--- |
| **Door Handling** | **CRITICAL** | Primary source of merged chambers (>60% of all room misses). |
| **Room Segmentation** | **HIGH** | Watershed/floodfill lacks semantic understanding of room function. |
| **Wall Detection** | **MODERATE** | Adequate for thick lines; sensitive to gaps and shaded bevels. |
| **Exterior Rejection** | **LOW** | Footprint containment filter successfully rejects outdoor zones. |
| **Furniture Interference** | **MODERATE** | Causes jagged vertices on room perimeters abutting walls. |
| **Rendered / 3D Appearance** | **MODERATE** | Shaded drop shadows require bilateral filtering to prevent false walls. |
| **Irregular Geometry** | **LOW** | Shapely polygons handle concave L-shapes accurately once closed. |

---

## 5. Which Failures Appear Solvable with Classical CV?

1. **Adaptive Door Bridging**: Directional morphological kernels (horizontal and vertical line closing) rather than square structuring elements, combined with Hough line segment bridging between wall endpoints, can close gaps up to 60–80px without over-thickening walls.
2. **Boundary Snapping & Wall Centerline Projection**: Post-processing the segmented room masks by snapping polygon edges back to the detected skeleton/centerline of the wall mask can reduce the 64.65px boundary error down to < 10px.
3. **Corner Simplification & Orthogonalization**: Douglas-Peucker simplification with Manhattan orthogonality constraints can eliminate furniture-induced vertex jitter.

---

## 6. Which Failures Are Fundamentally Semantic?

1. **Open-Plan Room Demarcation**: Living room, kitchen, and dining area dividing lines in modern floorplans have no physical wall between them. A classical CV floodfill cannot segment these chambers without semantic functional understanding or text label recognition.
2. **Door Swing Arc Interpretation**: Classical thresholding sees door swing arcs as curved thin walls; interpreting them as doorways requires semantic entity recognition.

---

## 7. Is There Enough Evidence to Justify an ML Segmentation Approach?

### Quantitative Assessment
* **For Enclosed Closed-Room Architecture**: Classical CV achieves **98.64% precision** and **59.65% CAD-quality IoU ≥ 0.75**. With classical algorithmic enhancements (directional closing + boundary snapping), this can reach ~75–80%.
* **For Complex Open-Plan Floorplans**: Pure classical edge detection will perpetually struggle with open-concept room divisions.

### Recommendation
1. **Short Term (Phase 2)**: **Do NOT immediately jump to large deep learning models.** First implement classical algorithmic enhancements (directional door gap bridging, wall skeleton snapping, and vertex orthogonalization). Measure them against this baseline using `python -m evaluation.compare`.
2. **Medium Term (Phase 3)**: If open-concept room segmentation is required by product specifications, introduce a **lightweight hybrid approach**: a compact semantic wall segmentation model (such as a quantized U-Net or MobileNet SegFormer trained on CubiCasa5K) plugged cleanly into the existing pipeline via `extract_wall_evidence`, preserving the fast downstream polygon extraction and TypeScript BIONIC serialization.
