# BIONIC Floorplan Detector Baseline Snapshot v2.6

This directory contains the immutable, reproducible baseline evaluation metrics for the classical OpenCV detector (version 2.6.0).

---

## Benchmark Configuration

* **Detector Version**: `current_cv` (v2.6.0)
* **Dataset**: `cubicasa5k` representative benchmark suite
* **Benchmark Size**: 50 images (399 ground-truth rooms)
* **Seed**: 42
* **Timestamp**: 2026-09-17
* **Git Commit**: 63c7502

---

## Baseline Key Performance Indicators (KPIs)

| Metric | Baseline Value | Description |
| :--- | :--- | :--- |
| **Image Pass Rate** | **90.0%** | 45 / 50 images passed minimum F1 / IoU criteria |
| **Room Precision** | **98.64%** | TP / (TP + FP) across all rooms |
| **Room Recall** | **72.93%** | TP / (TP + FN) across all ground-truth rooms |
| **Room F1 Score** | **0.8386** | Harmonic mean of Precision and Recall |
| **Mean IoU** | **0.8868** | Average IoU for matched rooms |
| **Median IoU** | **0.9840** | Median IoU for matched rooms |
| **Minimum IoU** | **0.2802** | Lowest IoU recorded among matched rooms |
| **IoU ≥ 0.25 Recall** | **72.93%** | 291 / 399 ground-truth rooms |
| **IoU ≥ 0.50 Recall** | **65.91%** | 263 / 399 ground-truth rooms |
| **IoU ≥ 0.75 Recall** | **59.65%** | 238 / 399 ground-truth rooms |
| **IoU ≥ 0.90 Recall** | **59.65%** | 238 / 399 ground-truth rooms (CAD-level match) |
| **Mean Area Error** | **24.89%** | Average percentage error in chamber area |
| **Mean Centroid Error** | **31.39 px** | Average Euclidean distance between centroids |
| **Mean Boundary Error** | **64.65 px** | Bidirectional Hausdorff contour distance |
| **Merged Room Cases** | **57** | Prediction subsuming multiple ground-truth rooms |
| **Split Room Cases** | **0** | Ground-truth room fragmented into multiple polygons |
| **False Positive Rooms**| **4** | Predictions not corresponding to any room |
| **Missed Rooms (FN)** | **108** | Ground-truth rooms unrecovered (mostly merged) |
| **Mean Latency** | **111.92 ms** | Per-image detection execution time |

---

## Reproduction Command

```bash
python -m evaluation.run --config evaluation/configs/baseline.yaml
python -m evaluation.compare --baseline evaluation/baselines/v2.6 --candidate evaluation/results/latest
```
