# Phase 2.7.9.2 Report: Lost-TP Analysis, Authoritative Baseline, and Real Controlled Ablation

## 1. Executive Summary

Phase 2.7.9.2 was commissioned to resolve discrepancies between historical Phase 2.7.9 claims and Phase 2.7.9.1 precision filtering, conduct a candidate-level root-cause analysis of the 3 lost true-positive rooms, establish frozen authoritative baseline files, and execute a **100% real controlled ablation suite** across all 12 benchmark images.

### Key Milestones Achieved:
1. **Frozen Authoritative Baselines**: Established [baseline_phase2791.json](file:///e:/mencoba/Web/Modernize/packages/typescript/devtools/services/floorplan-detector/evaluation/baseline_phase2791.json) (`TP=38, FP=72, FN=110, GT=148, MicroF1=0.2946, MeanIoU=0.6532`) and preserved [baseline_phase279.json](file:///e:/mencoba/Web/Modernize/packages/typescript/devtools/services/floorplan-detector/evaluation/baseline_phase279.json) (`TP=41, FP=106, FN=107, GT=148`).
2. **Real Controlled Ablation Runner**: Implemented [run_ablation_2792.py](file:///e:/mencoba/Web/Modernize/packages/typescript/devtools/services/floorplan-detector/run_ablation_2792.py) executing 6 distinct, isolated experimental evaluations (A through F) with zero mock or synthetic metrics.
3. **Candidate-Level Ground Truth Tracing**: Directly tracked all recovery candidate hypotheses against Ground Truth polygons via polygon intersection-over-union.
4. **Definitive Root-Cause Discovery**: Disproved the hypothesis that lowering source thresholds recovers the lost rooms; confirmed that the lost rooms (`gt_014`, `gt_009` in `house2`) achieved high IoU (0.938 and 0.836) and passed source thresholds, but were displaced to ranks 18 and 20 by non-room cavity artifacts and pruned by budget ceilings.
5. **Unit Test Suite**: 127/127 tests pass (100%), validating mathematical invariants ($GT = TP + FN$, $Pred = TP + FP$), serialization schemas, and baseline provenance.

---

## 2. Baseline Provenance & Architecture

To eliminate historical inconsistencies where reports cited conflicting per-image true positive counts, two distinct baseline snapshots are permanently archived:

| Parameter | Authoritative Baseline (Phase 2.7.9.1) | Historical Baseline (Phase 2.7.9) |
|:---|:---:|:---:|
| **File Location** | `evaluation/baseline_phase2791.json` | `evaluation/baseline_phase279.json` |
| **Status** | **Authoritative & Frozen** | Historical Reference |
| **Ground Truth Rooms ($GT$)** | 148 | 148 |
| **Predicted Rooms ($Pred$)** | 110 | 147 |
| **True Positive Rooms ($TP$)** | **38** | **41** |
| **False Positive Rooms ($FP$)** | **72** | **106** |
| **Missed Rooms ($FN$)** | **110** | **107** |
| **Micro Precision** | **0.3455** | 0.2789 |
| **Micro Recall** | 0.2568 | **0.2770** |
| **Micro F1** | **0.2946** | 0.2780 |
| **Mean IoU** | **0.6532** | 0.6431 |

Both baseline files mathematically satisfy:
- $GT = TP + FN$ ($148 = 38 + 110$ and $148 = 41 + 107$)
- $Pred = TP + FP$ ($110 = 38 + 72$ and $147 = 41 + 106$)

---

## 3. Confirmed Regression Analysis

Comparison between Phase 2.7.9 and Phase 2.7.9.1 isolates the regression of -3 TP to exactly two floorplans:

| Image | GT | Phase 2.7.9 TP | Phase 2.7.9.1 TP | Lost TP | Phase 2.7.9 FP | Phase 2.7.9.1 FP | $\Delta$ FP |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `sample-floorplan-house2.png` | 17 | 12 | 10 | **-2** | 13 | 9 | -4 |
| `Floorplan-House.png` | 21 | 11 | 10 | **-1** | 20 | 19 | -1 |
| **Remaining 10 Benchmark Images** | 110 | 18 | 18 | **0** | 73 | 44 | -29 |
| **Aggregate Total** | **148** | **41** | **38** | **-3** | **106** | **72** | **-34** |

---

## 4. Real Measured Controlled Ablation Matrix

All six experiments (2792_A through 2792_F) were executed using [run_ablation_2792.py](file:///e:/mencoba/Web/Modernize/packages/typescript/devtools/services/floorplan-detector/run_ablation_2792.py) across all 12 benchmark floorplan images. Results are archived in `evaluation/results/ablation/2792_{A..F}/`:

| Experiment | Configuration Description | TP | FP | FN | Precision | Recall | Micro F1 | Macro F1 | Mean IoU |
|:---|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **2792_A** | **Exp A: Phase 2.7.9.1 Baseline**<br>Budget 3/8/+2, 2.7.9.1 thresholds, Second Chance OFF | **38** | **72** | **110** | **0.3455** | **0.2568** | **0.2946** | **0.3194** | **0.6532** |
| **2792_B** | **Exp B: Budget Only**<br>Budget 4/12/+3, 2.7.9.1 thresholds, Second Chance OFF | 38 | 76 | 110 | 0.3333 | 0.2568 | 0.2901 | 0.3173 | 0.6532 |
| **2792_C** | **Exp C: wall_enclosure Threshold Only**<br>Budget 3/8/+2, threshold 0.42, Second Chance OFF | 38 | 72 | 110 | 0.3455 | 0.2568 | 0.2946 | 0.3194 | 0.6532 |
| **2792_D** | **Exp D: Second-Chance Only**<br>Budget 3/8/+2, 2.7.9.1 thresholds, Second Chance ON (+0.05) | 38 | 72 | 110 | 0.3455 | 0.2568 | 0.2946 | 0.3194 | 0.6532 |
| **2792_E** | **Exp E: Budget + wall_enclosure Threshold**<br>Budget 4/12/+3, threshold 0.42, Second Chance OFF | 38 | 76 | 110 | 0.3333 | 0.2568 | 0.2901 | 0.3173 | 0.6532 |
| **2792_F** | **Exp F: Full Phase 2.7.9.2**<br>Budget 4/12/+3, relaxed thresholds, Second Chance ON | 38 | 76 | 110 | 0.3333 | 0.2568 | 0.2901 | 0.3173 | 0.6532 |

---

## 5. Candidate-Level Root-Cause Verification

Candidate-level tracing recorded in [candidate_traces.json](file:///e:/mencoba/Web/Modernize/packages/typescript/devtools/services/floorplan-detector/evaluation/results/ablation/2792_A/candidate_traces.json) provides empirical evidence for the lost TPs:

### In `sample-floorplan-house2.png`:
1. **Candidate `rec_wall_enc_43` (Matches `gt_014` with IoU = 0.938)**:
   - Confidence = 0.528, Wall Support = 0.738, Enclosure Score = 1.000.
   - Cleared source threshold (0.450), `acceptedBeforeBudget = True`.
   - Budget Rank = **18**.
   - Pruned because budget limit was 8 in Exp A, and 12 in Exp B/F.
2. **Candidate `rec_wall_enc_42` (Matches `gt_009` with IoU = 0.836)**:
   - Confidence = 0.522, Wall Support = 0.718, Enclosure Score = 1.000.
   - Cleared source threshold (0.450), `acceptedBeforeBudget = True`.
   - Budget Rank = **20**.
   - Pruned by budget limit.
3. **Candidate `rec_rep_1166_1163` (Matches `gt_015` with IoU = 0.445)**:
   - Confidence = 0.540. Budget Rank = **13**. Pruned by budget limit.

### Scientific Deduction:
- **Budget Cap vs Threshold**: Lowering the threshold (Exp C) does not help because all lost TP candidates already had confidence $\ge 0.52$.
- **Why Budget 12 Did Not Recover Them (Exp B & F)**: In `house2`, raising the budget from 8 to 12 accepted candidates ranked 9–12. Ranks 9–12 were non-room cavity artifacts (+4 FP in aggregate benchmark), while true room candidates remained trapped at ranks 13, 14, 18, and 20.
- **Ranking Displacement Root Cause**: Non-room cavity fragments achieved slightly higher heuristic confidence (0.55–0.68) than true rooms (0.52–0.54) due to wall thickness artifacts.

---

## 6. Anchor Floorplan Results Across Ablation Suite

The five protected anchor floorplans maintained strict stability across all experiments:

| Anchor Floorplan | Phase 2.7.9 TP | Phase 2.7.9.1 TP | Exp A TP | Exp F TP | Target Anchor Constraint | Status |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|
| `Lantai 2.jpg` | 2 | 2 | 2 | 2 | $TP \ge 2$ | **PASS** |
| `sample-floorplan.png` | 7 | 7 | 7 | 7 | $TP \ge 7$ | **PASS** |
| `sample-floorplan-house2.png` | 12 | 10 | 10 | 10 | Baseline = 10 | **STABLE** |
| `Floorplan-House.png` | 11 | 10 | 10 | 10 | Baseline = 10 | **STABLE** |
| `Lantai 1.jpg` | 3 | 3 | 3 | 3 | $TP \ge 3$ | **PASS** |

Zero regressions occurred on `Lantai 2`, `sample-floorplan`, or `Lantai 1`.

---

## 7. Source Threshold Statistics

Aggregated across the 12-image benchmark suite from [recovery_source_statistics.json](file:///e:/mencoba/Web/Modernize/packages/typescript/devtools/services/floorplan-detector/evaluation/recovery_source_statistics.json):

| Candidate Source | Candidates Generated | Accepted | Rejected | Budget-Rejected | Threshold-Rejected | Mean Confidence | Mean Wall Support |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `wall_enclosure` | 234 | 21 | 213 | 197 | 16 | 0.6711 | 0.6897 |
| `repeated_room` | 77 | 20 | 57 | 48 | 9 | 0.8283 | 0.6878 |
| **Total Recovery Pool** | **311** | **41** | **270** | **245** | **25** | — | — |

**Key Insight:** 90.7% of all candidate rejections ($245 / 270$) were caused by budget limits, while only 9.3% ($25 / 270$) were caused by confidence thresholds.

---

## 8. Diagnostic Artifacts

The system generates the following structured diagnostics in `raw_result.stats["diagnostics"]`:
- `source_threshold_statistics`: Per-source tracking of candidate counts, budget vs threshold rejections, and mean metrics.
- `recovery_candidate_traces`: Complete per-candidate decision trace with IoU, GT match, confidence before/after bonus, and rejection reason.
- `recovery_candidate_scores`: Individual confidence breakdown components.
- `second_chance_candidates`: Records where second chance evidence bonus was evaluated.
- `budget_ranking`: Sorted candidate ranks relative to computed budget limits.

---

## 9. Performance Breakthrough: Pre-Recovery Caching

Benchmarking large floorplans like `sample-floorplan-house3` (6500 $\times$ 5224, 34 Megapixels) previously took ~135 seconds per evaluation. By decoupling stages 1–6 (wall network graph, cycle extraction, planar faces) from stage 7 (recovery precision engine):
1. Stages 1–6 are executed **once** and cached to [cache_precomputed_bundles.pkl](file:///e:/mencoba/Web/Modernize/packages/typescript/devtools/services/floorplan-detector/evaluation/cache_precomputed_bundles.pkl) (78.9s total for all 12 images).
2. Controlled ablation experiments A–F execute against the identical candidate pool.
3. This guarantees mathematically identical pre-recovery state while eliminating run-to-run timing overhead.

---

## 10. Unit Test Suite

The test suite in [test_phase2792_cases.py](file:///e:/mencoba/Web/Modernize/packages/typescript/devtools/services/floorplan-detector/tests/test_phase2792_cases.py) contains 36 comprehensive tests covering:
- Authoritative baseline file loading and metadata verification (`test_31`).
- Historical baseline file loading (`test_32`).
- Mathematical invariant verification $GT = TP + FN$ and $Pred = TP + FP$ (`test_33`).
- Configuration schema, serialization, and camelCase compatibility (`test_34`).
- Recovery regression analysis integrity (`test_35`).
- Ablation summary matrix integrity (`test_36`).
- Budget formulas, ranking logic, second chance recovery, and source thresholds (`tests 1–30`).

**Result:** `127 passed, 0 failed, 0 skipped in 6.35s`.

---

## 11. Authoritative Benchmark Run (Latest Production)

Running the production benchmark runner:
```bash
python -u -m evaluation.run --dataset my_floorplan --no-vis
```
Outputs to [report.json](file:///e:/mencoba/Web/Modernize/packages/typescript/devtools/services/floorplan-detector/evaluation/results/latest/report.json):
- **Evaluated Images**: 12
- **Ground Truth Rooms ($GT$)**: 148
- **Predicted Rooms ($Pred$)**: 114
- **True Positive Rooms ($TP$)**: 38
- **False Positive Rooms ($FP$)**: 76
- **Missed Rooms ($FN$)**: 110
- **Micro Precision**: 0.3333
- **Micro Recall**: 0.2568
- **Micro F1**: 0.2901
- **Macro F1**: 0.3173
- **Mean IoU**: 0.6532

Invariants verified:
- $GT = TP + FN$: $148 = 38 + 110$
- $Pred = TP + FP$: $114 = 38 + 76$

---

## 12. Gating Decision for Phase 2.8

### Criteria Evaluation:
| Gating Criterion | Required Target | Measured Result (Exp F / Latest) | Status |
|:---|:---:|:---:|:---:|
| **True Positives ($TP$)** | $\ge 41$ | 38 | **NOT MET** (-3 TP) |
| **False Positives ($FP$)** | $< 106$ | 76 | **MET** (76 vs 106) |
| **Micro Recall** | $\ge 0.2770$ | 0.2568 | **NOT MET** |
| **Micro F1** | $> 0.2946$ | 0.2901 | **NOT MET** |
| **Mean IoU** | $\ge 0.6431$ | 0.6532 | **MET** |

### Official Gate Decision:
```text
READY_FOR_PHASE_2_8 = NO (CONDITIONAL BLOCKER)
```

### Exact Technical Blocker:
Scalar heuristic tuning (budget expansion and threshold relaxation) cannot safely recover the lost true positive rooms without causing false positive explosion. When budget ceiling was expanded from 8 to 12, FP increased from 72 to 76 while TP remained stagnant at 38, degrading Micro F1 from 0.2946 to 0.2901. True room candidates in complex floorplans (`rec_wall_enc_43`, `rec_wall_enc_42`) are trapped at ranks 18 and 20.

---

## 13. Architectural Blueprint for Phase 2.8

To recover the 3 lost true positives without increasing false positives beyond 72, Phase 2.8 must implement **Semantic Architectural Room Priors**:
1. **Aspect Ratio & Orthogonality Ranking Bonus**: Functional rooms exhibit aspect ratios between $1:1$ and $1:2.5$ and orthogonal corners. Irregular cavity slivers must receive a ranking penalty so that true rooms naturally rise above the budget cutoff.
2. **Doorway-Connected Room Prioritization**: Room candidates bounded by detected door swings or architectural openings must receive priority ranking over blind cavity closures.
3. **Hallway vs Chamber Semantic Differentiation**: Suppress corridor subdivisions from consuming budget slots in the candidate recovery queue.
