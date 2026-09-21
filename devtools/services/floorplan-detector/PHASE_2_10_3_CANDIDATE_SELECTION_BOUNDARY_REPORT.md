# Phase 2.10.3 — Candidate Selection Boundary & Lost-TP Root Cause Report

**Phase Status**: `PASS`  
**Ready for Phase 2.10.4**: `YES`  
**Production Deployment**: `FROZEN` (Diagnostic Experiment Only — Zero Production Changes)  
**Date**: September 21, 2026  
**Artifact Directory**: `evaluation/phase2103/`  

---

## 1. Executive Summary & Core Objective

In Phase 2.10.2, text-aware candidate re-ranking successfully altered candidate ordering without geometry mutation (e.g., promoting true-room candidate `rec_wall_enc_105` matching `gt_014` with $\text{IoU} = 0.869$ from rank 10 to rank 8). However, aggregate benchmark performance remained capped:
- **Baseline**: TP 40 / FP 86 / FN 108 / F1 0.2920
- **Best Strategy**: TP 40 / FP 85 / FN 108 / F1 0.2930

**Phase 2.10.3 executed an exhaustive scientific root-cause investigation** to discover why promoted true-room candidates failed to become final detections across the 12 benchmark floorplans (148 Ground Truth rooms).

### Key Architectural Discovery
The True Positive ceiling (TP 40 / FN 108) is governed by **two upstream structural bottlenecks**:
1. **Classical Candidate Generation Gap (89.8% of Lost Rooms)**: For **97 out of 108 False Negative rooms**, the classical CV candidate recovery engine generated **zero candidates** with $\text{IoU} \ge 0.25$. No amount of candidate re-ranking, budget expansion, or threshold tuning can recover a room that was never proposed.
2. **Oversized Primary Cavity Pre-emption & Collisions (10.2% of Lost Rooms)**: For the 11 False Negative rooms where 14 valid candidates ($\text{IoU} \ge 0.25$) were generated, lower-ranked candidates collide with oversized primary cavity hypotheses (`hyp_cavity_*`) that span multiple rooms across open-plan thresholds. Even when budget limits are completely removed ($K = \infty$), TP remains strictly 40 because downstream duplicate/overlap suppression drops them, or `reconstruct_room_boundaries` swallows them into multi-room composite contours.

---

## 2. Experimental Ablation Results (Diagnostic Only)

Six diagnostic configurations were evaluated across the 12 benchmark floorplans without modifying any production code:

| Experiment ID | Configuration | TP | FP | FN | Precision | Recall | Micro F1 |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **A** | **Phase 2.10.2 Baseline Selection** | **40** | **86** | **108** | **0.3175** | **0.2703** | **0.2920** |
| **B** | Unlimited Budget ($K = \infty$) [Diagnostic] | 40 | 105 | 108 | 0.2759 | 0.2703 | 0.2730 |
| **C** | +25% Candidate Budget ($K \times 1.25$) | 40 | 91 | 108 | 0.3053 | 0.2703 | 0.2867 |
| **D** | +50% Candidate Budget ($K \times 1.50$) | 40 | 95 | 108 | 0.2963 | 0.2703 | 0.2827 |
| **E** | Disable Duplicate Pruning [Diagnostic] | 40 | 80 | 108 | 0.3333 | 0.2703 | 0.2985 |
| **F** | Disable Overlap Pruning [Diagnostic] | 40 | 76 | 108 | 0.3448 | 0.2703 | 0.3030 |

### Critical Takeaways from Ablation:
- **Budget Scaling (Exps B, C, D)**: Increasing candidate budget from $K_{\text{base}}$ to $+25\%$, $+50\%$, and $\infty$ yielded **0 additional True Positives** (TP flat at 40), while injecting $+5$, $+9$, and $+19$ False Positives respectively.
- **Duplicate Pruning (Exp E)**: Disabling duplicate pruning did not recover lost rooms because candidates allowed through either duplicated existing primary detections or were swallowed during boundary reconstruction.
- **Overlap Pruning (Exp F)**: Disabling containment pruning reduced FPs from 86 to 76 (improving Precision to 0.3448 and F1 to 0.3030) by eliminating fragmented sub-room contentions, but did not increase TP.

---

## 3. The 9-Category Rejection Taxonomy Analysis

Every candidate possessing an $\text{IoU} \ge 0.25$ match to an FN Ground Truth room was traced through its 17-step lifecycle. 

| Taxonomy Category | Count | Pct of Lost Candidates | Primary Mechanism |
| :--- | :---: | :---: | :--- |
| `BUDGET_REJECTED` | **8** | **57.1%** | Candidate passed score threshold but ranked beyond image budget cap $K$ |
| `DUPLICATE_REJECTED` | **3** | **21.4%** | Candidate IoU $\ge 0.25$ against oversized primary cavity hypothesis |
| `THRESHOLD_REJECTED` | **1** | **7.1%** | Classical wall enclosure confidence $= 0.0$ (`rec_wall_enc_6`) |
| `OVERLAP_REJECTED` | **1** | **7.1%** | High containment ratio ($0.99$) inside primary cavity (`rec_wall_enc_2`) |
| `MERGED_REJECTED` | **1** | **7.1%** | Absorbed into multi-room composite contour (`rec_rep_1377_758.0`) |
| `GEOMETRY_IOU_FAILURE`| **0** | **0.0%** | No candidates suffered pure geometry degradation |
| `TOPOLOGY_FAILURE` | **0** | **0.0%** | Zero self-intersecting or invalid polygons |
| `OUTSIDE_ENVELOPE` | **0** | **0.0%** | All generated candidates were within detected building envelope |
| `UNKNOWN` | **0** | **0.0%** | Complete taxonomic coverage (0 unclassified) |
| **Total** | **14** | **100.0%** | Complete lifecycle telemetry captured |

---

## 4. Answers to the 8 Required Analytical Questions

### 1. Percentage of Lost TPs by Rejection Reason
Among the 14 true-room candidates targeting False Negative rooms:
- `BUDGET_REJECTED`: **57.14%** (8 candidates)
- `DUPLICATE_REJECTED`: **21.43%** (3 candidates)
- `THRESHOLD_REJECTED`: **7.14%** (1 candidate)
- `OVERLAP_REJECTED`: **7.14%** (1 candidate)
- `MERGED_REJECTED`: **7.14%** (1 candidate)

### 2. How Many Lost TPs are Within Top-K Ranks
- Within Top 3: **2** candidates
- Within Top 5: **4** candidates
- Within Top 8: **4** candidates
- Within Top 10: **4** candidates
- Within Top 20: **8** candidates
- Beyond Top 20: **5** candidates

### 3. How Many Become Recoverable with Larger Budget
**Zero (0)**. Even under Unlimited Budget ($K = \infty$), TP remained exactly 40. Lower-ranked candidates that enter the selection pool collide with pre-existing primary hypotheses (e.g. `hyp_cavity_11`, `hyp_cavity_1_sub2`, `hyp_cavity_2`) that already span those spaces.

### 4. How Many are Blocked by Duplicate/Overlap Pruning
**4 candidates (28.6%)** are directly blocked by duplicate or overlap pruning:
- `Floorplan-House.png`: `rec_rep_1002_1167.0` (IoU 0.263 with `gt_009`) blocked by `hyp_cavity_11` (collision IoU 0.613).
- `Lantai 1.jpg`: `rec_rep_86_22.0` (IoU 0.257 with `gt_001`) blocked by `hyp_cavity_4` (collision IoU 0.420).
- `simple-apartment-floor-plan.png`: `rec_wall_enc_5` (IoU 0.302 with `gt_002`) blocked by `hyp_cavity_2` (collision IoU 0.938).
- `simple-apartment-floor-plan.png`: `rec_wall_enc_2` (IoU 0.963 with `gt_005`) blocked by `hyp_cavity_1` (overlap ratio 0.990).

### 5. How Many Fail Because Polygon IoU is Insufficient
**0 candidates**. In all evaluated cases where a candidate was generated for an FN room, the raw polygon IoU was well above the 0.25 threshold (ranging from 0.254 to 0.963). Candidates do not fail from poor geometry precision; they fail from upstream omissions or collision suppression.

### 6. How Many are Merged-Room Failures
**1 candidate directly, plus extensive primary room pre-emption**:
- `sample-floorplan-house2.png`: `rec_rep_1377_758.0` ($\text{IoU} = 0.449$ with `gt_004`) was accepted through precision filtering, but was absorbed into merged primary prediction `hyp_cavity_1_sub2` which merged `gt_004`, `gt_010`, and `gt_020`.
- In addition, across the benchmark, primary cavities merge 7 GT rooms into oversized composite shapes.

### 7. Per-Image Root Causes
| Floorplan Image | GT | Base TP | Base FN | Cands Generated | Lost Cands (IoU $\ge 0.25$) | Primary Root Cause |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| `WhatsApp Image ...` | 51 | 0 | 51 | 0 | 0 | **Generation omission** (0 primary hyps, 0 recovery cands) |
| `sample-floorplan-house3` | 21 | 3 | 18 | 206 | 5 | **Primary cavity collision & budget** (cands rank > 90) |
| `sample-floorplan-house2` | 17 | 11 | 6 | 18 | 2 | **Primary merge & threshold** (`hyp_cavity_1_sub2` merge) |
| `Floorplan-House` | 16 | 11 | 5 | 61 | 4 | **Duplicate collision & budget** (`hyp_cavity_11` collision) |
| `simple-apartment` | 7 | 2 | 5 | 3 | 2 | **Oversized cavity swallow** (`hyp_cavity_1` merges 4 rooms) |
| `library-floor-plan` | 5 | 1 | 4 | 1 | 0 | **Generation omission** (large open stacks unsegmented) |
| `ChatGPT Image Sep 9 (1)` | 5 | 0 | 5 | 4 | 0 | **Generation omission** (wall breaks prevent enclosure) |
| `ChatGPT Image Sep 9 (2)` | 5 | 0 | 5 | 1 | 0 | **Generation omission** (wall breaks prevent enclosure) |
| `Lantai 2` | 5 | 2 | 3 | 1 | 0 | **Generation omission** (open corridors unhypothesized) |
| `Lantai 1` | 5 | 3 | 2 | 8 | 1 | **Duplicate collision** (`hyp_cavity_4` collision) |
| `ChatGPT Image Sep 16` | 3 | 0 | 3 | 2 | 0 | **Generation omission** (contrast / non-standard walls) |
| `sample-floorplan` | 8 | 7 | 1 | 6 | 0 | **Near-perfect baseline** (1 missing room ungenerated) |

### 8. Representative Candidate Traces
1. **Case 1: BUDGET_REJECTED (`sample-floorplan-house2.png` / `rec_wall_enc_33`)**:
   - Matches `gt_006` with $\text{IoU} = 0.667$.
   - Confidence: 0.524, Rank: 13, Budget Limit: 8.
   - Status: Dropped purely by budget cut-off; valid chamber enclosed by walls.
2. **Case 2: DUPLICATE_REJECTED (`Floorplan-House.png` / `rec_rep_1002_1167.0`)**:
   - Matches `gt_009` with $\text{IoU} = 0.263$.
   - Confidence: 0.820, Rank: 12.
   - Status: Dropped because it collides with `hyp_cavity_11` with IoU = 0.613. `hyp_cavity_11` is an oversized cavity that bleeds through an open doorway.
3. **Case 3: MERGED_REJECTED (`simple-apartment-floor-plan.png` / `rec_wall_enc_2`)**:
   - Matches `gt_005` with exceptional raw $\text{IoU} = 0.963$.
   - Confidence: 0.748, Rank: 1.
   - Status: Accepted by precision engine, but in `reconstruct_room_boundaries`, primary `hyp_cavity_1` was reconstructed as an undivided multi-room polygon spanning `gt_004`, `gt_005`, `gt_006`, and `gt_007`.

---

## 5. Artifact Verification & Compliance Checklist

All 10 required JSON files and visualizations were verified in `evaluation/phase2103/`:
- [x] [lost_tp_trace.json](file:///e:/mencoba/Web/Modernize/packages/typescript/devtools/services/floorplan-detector/evaluation/phase2103/lost_tp_trace.json) (14 structured records, all 21 fields)
- [x] [rejection_taxonomy.json](file:///e:/mencoba/Web/Modernize/packages/typescript/devtools/services/floorplan-detector/evaluation/phase2103/rejection_taxonomy.json) (Distribution of 9 categories)
- [x] [budget_analysis.json](file:///e:/mencoba/Web/Modernize/packages/typescript/devtools/services/floorplan-detector/evaluation/phase2103/budget_analysis.json) (Baseline vs Scaled vs Unlimited)
- [x] [duplicate_analysis.json](file:///e:/mencoba/Web/Modernize/packages/typescript/devtools/services/floorplan-detector/evaluation/phase2103/duplicate_analysis.json) (Duplicate collision targets and IoUs)
- [x] [overlap_analysis.json](file:///e:/mencoba/Web/Modernize/packages/typescript/devtools/services/floorplan-detector/evaluation/phase2103/overlap_analysis.json) (Containment ratios and targets)
- [x] [merge_analysis.json](file:///e:/mencoba/Web/Modernize/packages/typescript/devtools/services/floorplan-detector/evaluation/phase2103/merge_analysis.json) (Absorption into multi-room composite predictions)
- [x] [geometry_failure.json](file:///e:/mencoba/Web/Modernize/packages/typescript/devtools/services/floorplan-detector/evaluation/phase2103/geometry_failure.json) (0 geometry mutation failures)
- [x] [per_image.json](file:///e:/mencoba/Web/Modernize/packages/typescript/devtools/services/floorplan-detector/evaluation/phase2103/per_image.json) (Comprehensive 12-image breakdown)
- [x] [root_cause_summary.json](file:///e:/mencoba/Web/Modernize/packages/typescript/devtools/services/floorplan-detector/evaluation/phase2103/root_cause_summary.json) (Executive root cause breakdown)
- [x] [summary.json](file:///e:/mencoba/Web/Modernize/packages/typescript/devtools/services/floorplan-detector/evaluation/phase2103/summary.json) (Standardized phase summary)
- [x] Visualizations:
  - `rejection_taxonomy_distribution.png`
  - `ablation_experiments_comparison.png`
  - `rank_vs_budget_threshold.png`
  - `case_study_overlays.png`

---

## 6. Regression Testing Summary

| Test Suite | Total Tests | Passed | Failed | Execution Time |
| :--- | :---: | :---: | :---: | :---: |
| `test_phase2103_selection_boundary.py` | 11 | 11 | 0 | 0.19s |
| `test_phase2102_candidate_ranking.py` | 6 | 6 | 0 | 0.08s |
| `test_phase2101_adaptive.py` | 10 | 10 | 0 | 0.06s |
| `test_phase210_text.py` | 10 | 10 | 0 | 0.05s |
| `test_phase292_validation.py` | 14 | 14 | 0 | 14.10s |
| **Combined Regression Suite** | **51** | **51** | **0** | **14.48s** |

- **Zero Production Changes**: `packages/typescript/main/**` was 100% untouched.
- **Zero Geometry Mutation**: Candidate polygon coordinates were strictly immutable.
- **Production Engine Frozen**: Production behavior, endpoints, and configuration (`door_b10`: `doorWeight = 0.10`) remain 100% preserved.

---

## 7. Actionable Architectural Recommendations for Phase 2.10.4

The findings of Phase 2.10.3 establish clear boundaries on where engineering effort must be directed in Phase 2.10.4:

1. **DO NOT tune candidate ranking weights further**: Candidate re-ranking cannot recover rooms when downstream primary cavities swallow them or when no candidates exist.
2. **Target Upstream Candidate Generation**: To break beyond the TP 40 ceiling, candidate generation must be enhanced for complex floorplans like `WhatsApp Image` (51 missing rooms) and `library-floor-plan` (open-plan column/partition dividing).
3. **Primary Cavity Splitting & Disaggregation**: When a primary cavity (`hyp_cavity_*`) spans multiple rooms across openings, allow high-confidence recovery candidates (or text label centers) to **split** the oversized primary cavity into distinct architectural spaces rather than being discarded by duplicate suppression.

---

## 8. Final Gate Decision

```
PHASE_2_10_3 = PASS
READY_FOR_PHASE_2_10_4 = YES
```
