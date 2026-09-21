# BIONIC Floorplan Detector Benchmark Report (Phase 2.7.6)

- **Benchmark**: `bionic_v2.6_baseline`
- **Dataset**: `my_floorplan`
- **Detector**: `2.6.0`
- **Timestamp**: `2026-09-17T10:10:06.558685+00:00`
- **Git Commit**: `63c7502`

## 1. Executive Summary & Mathematical Reconciliation

| Metric | Value | Reconciled Formula |
| :--- | :--- | :--- |
| **Evaluated Floorplans** | 12 | Total evaluated images |
| **Passed Floorplans** | 1 (8.33%) | F1 >= 0.60 & IoU >= 0.60 |
| **Ground Truth Rooms** | 148 | `GT = TP (38) + FN (110)` |
| **Predicted Rooms** | 110 | `Pred = TP (38) + FP (72)` |
| **True Positives (TP)** | 38 | Matched room pairs |
| **False Positives (FP)** | 72 | Extra / spurious rooms |
| **False Negatives (FN)** | 110 | Missed GT rooms |
| **Micro Precision** | 0.3455 | `TP / (TP + FP)` |
| **Micro Recall** | 0.2568 | `TP / (TP + FN)` |
| **Micro F1** | 0.2946 | `2 * P * R / (P + R)` |
| **Macro Precision** | 0.3730 | Mean precision across images |
| **Macro Recall** | 0.3097 | Mean recall across images |
| **Macro F1** | 0.3194 | Mean F1 across images |
| **Mean Room IoU** | 0.6532 | Geometry quality (matched TPs) |
| **Median Room IoU** | 0.5920 | Geometry median |
| **Mean Boundary Error** | 247.4 px | Hausdorff distance |


## 2. Room Size Normalized Area Ratio Breakdown

| Category | Area Ratio (`GT / Image`) | GT Count | TP Count | FN Count | Recall (%) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Tiny** | `tiny` | 0 | 0 | 0 | 0.0% |
| **Small** | `small` | 0 | 0 | 0 | 0.0% |
| **Medium** | `medium` | 148 | 38 | 110 | 25.68% |
| **Large** | `large` | 0 | 0 | 0 | 0.0% |


## 3. Resolution Scale Breakdown

| Category | Pixel Count | Image Count | GT Count | TP Count | Mean F1 | Mean IoU |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Low** | `low` | 4 | 23 | 13 | 0.5741 | 0.6106 |
| **Medium** | `medium` | 5 | 71 | 2 | 0.0800 | 0.0954 |
| **High** | `high` | 3 | 54 | 23 | 0.3788 | 0.5982 |


## 4. Anchor Image Performance

| Image ID | GT | Pred | TP | FP | FN | F1 | Mean IoU | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| library-floor-plan | 5 | 3 | 1 | 2 | 4 | 0.2500 | 0.4424 | FAIL |
| **Lantai 2** | 5 | 2 | 2 | 0 | 3 | 0.5714 | 0.6778 | FAIL |
| ChatGPT Image Sep 9, 2026, 05_48_42 PM | 5 | 10 | 0 | 10 | 5 | 0.0000 | 0.0000 | FAIL |
| **sample-floorplan-house2** | 17 | 19 | 10 | 9 | 7 | 0.5556 | 0.6988 | FAIL |
| **sample-floorplan-house3** | 21 | 23 | 3 | 20 | 18 | 0.1364 | 0.4807 | FAIL |
| WhatsApp Image 2025-11-28 at 14.52.53_d902a408 | 51 | 0 | 0 | 0 | 51 | 0.0000 | 0.0000 | FAIL |
| simple-apartment-floor-plan | 7 | 3 | 2 | 1 | 5 | 0.4000 | 0.4768 | FAIL |
| Floorplan-House | 16 | 29 | 10 | 19 | 6 | 0.4444 | 0.6151 | FAIL |
| **Lantai 1** | 5 | 5 | 3 | 2 | 2 | 0.6000 | 0.4418 | FAIL |
| ChatGPT Image Sep 16, 2026, 01_19_00 PM | 3 | 3 | 0 | 3 | 3 | 0.0000 | 0.0000 | FAIL |
| ChatGPT Image Sep 9, 2026, 05_41_12 PM | 5 | 5 | 0 | 5 | 5 | 0.0000 | 0.0000 | FAIL |
| **sample-floorplan** | 8 | 8 | 7 | 1 | 1 | 0.8750 | 0.8804 | PASS |


## 5. Failure Taxonomy Summary

| Failure Category | Occurrence Count | Affected Images Count |
| :--- | :--- | :--- |
| **missed** | 110 | 12 |
| **false_positive** | 72 | 10 |
| **merged** | 26 | 7 |
| **split** | 15 | 7 |

