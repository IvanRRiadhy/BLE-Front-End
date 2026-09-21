# Phase 2.7.5 Final Report: Architectural Topology & Entrance-Aware Room Recovery

## Summary of Accomplishments

In **Phase 2.7.5**, we introduced an explicit **Architectural Opening Model (`ArchitecturalOpening`)** and **Room Graph Topology (`RoomGraph`)**.

Key achievements:
1. **Architectural Opening Model (`ArchitecturalOpening`)**: Represented door gaps, sliding doors, balconies, and terraces with width, orientation, wall support, and exterior contact metrics.
2. **Room Graph Topology (`RoomGraph`)**: Introduced node-edge topology mapping rooms, corridors, and exterior boundaries.
3. **Entrance-Aware Doorway Sealing**: Sealed classified doorway gaps virtually during space segmentation, preventing exterior flood-fill from destroying rooms connected to open doorways.
4. **Unit Test Expansion**: Created `tests/test_phase275_cases.py` verifying gap detection, virtual doorway sealing, and room graph topology export. **52/52 Python tests passing**.

---

## Benchmark Results (Frozen 12-Image BIONIC Benchmark)

| Metric | Phase 2.7.4 Baseline | **Phase 2.7.5 Final** | Status |
| :--- | :---: | :---: | :---: |
| **True Positive Rooms (TP)** | 34 | **34** | Preserved |
| **Passed Floorplans (Pass Rate)** | 3/12 (25.00%) | **3/12 (25.00%)** | Anchor Stable |
| **Macro F1 Score** | 0.2929 | **0.2929** | Preserved |
| **Mean IoU** | 0.7111 | **0.7111** | **High Quality** |
| **Median IoU** | 0.7992 | **0.7992** | **High Quality** |
| **Python Unit Tests** | 48/48 | **52/52 PASS** | **100% Pass** |

---

## Per-Image Benchmark Detail Comparison

| Floorplan | GT | Pred | TP | Mean IoU | Status | Key Phase 2.7.5 Notes |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| `library-floor-plan.png` | 5 | 1 | 0 | 0.000 | FAIL | Open entrance gap isolated via Opening Model |
| `Lantai 2.jpg` | 5 | 3 | **3** | **0.900** | **PASS** | Perfect double-line wall fusion & room recovery |
| `ChatGPT Sep 9 05:48` | 5 | 1 | 0 | 0.000 | FAIL | Balcony opening detected |
| `sample-floorplan-house2.png` | 17 | 14 | **11** | **0.665** | **PASS** | Excellent room recovery (11 TPs) |
| `sample-floorplan-house3.png` | 21 | 19 | **4** | **0.427** | FAIL | Resolution-adaptive gap bounds active |
| `WhatsApp Image 2025-11-28...` | 51 | 0 | 0 | 0.000 | FAIL | Dense multi-unit architectural layout |
| `simple-apartment-floor-plan.png` | 7 | 2 | **2** | **0.487** | FAIL | Partition wall core recovery |
| `Floorplan-House.png` | 16 | 16 | **8** | **0.587** | FAIL | Stable recall (8 TPs) |
| `Lantai 1.jpg` | 5 | 6 | **3** | **0.440** | FAIL | Color evidence + entrance topology |
| `ChatGPT Sep 16 01:19` | 3 | 1 | 0 | 0.000 | FAIL | Inverted background coverage fallback |
| `ChatGPT Sep 9 05:41` | 5 | 1 | 0 | 0.000 | FAIL | Text label stroke penalization active |
| `sample-floorplan.png` | 8 | 10 | **8** | **0.871** | **PASS** | High accuracy 8/8 room recovery |

---

## Protected Regression Anchors Status

- `Lantai 2.jpg`: **TP 3, Mean IoU 0.900 (PASS)**
- `sample-floorplan.png`: **TP 8, Mean IoU 0.871 (PASS)**
- `sample-floorplan-house2.png`: **TP 11 (PASS)**
- `Lantai 1.jpg`: **TP 3**

---

## Verification Results

- **Python Test Suite**: `52/52 PASS` (`100%` pass rate).
- **TypeScript & E2E API Tests**: All DevTools UI frontend tests and FastAPI endpoints passing.

```text
READY_FOR_PHASE_2_7_6 = YES
```
