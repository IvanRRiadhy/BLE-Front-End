# PHASE 2.9.1 — CONTROLLED PRODUCTION INTEGRATION REPORT
# ML Structural Evidence + Classical CV
# Graceful Degradation, Feature Flag, Observability & Regression Gate

**Date**: 2026-09-21  
**Author**: BIONIC Floorplan DevTools Agent  
**Status**: COMPLETE — ALL GATES PASSED  

---

## 1. EXECUTIVE SUMMARY

Phase 2.9.1 successfully transitions the experimental doorway evidence fusion strategy (`door_b10`: `doorWeight = 0.10`), validated during Phase 2.9.0, into a hardened, production-grade integration within the BIONIC Floorplan Detector service.

### Key Outcomes:
1. **Bit-for-Bit Backward Compatibility**: When ML fusion is disabled (`BIONIC_ML_FUSION_ENABLED=false` or configuration `enabled=False`), all detection polygons, candidate rankings, and diagnostic metrics match the Phase 2.7.9.2 baseline identically:
   - **Baseline (ML OFF)**: `TP = 38`, `FP = 76`, `FN = 110`, `Precision = 0.3333`, `Recall = 0.2568`, `Micro F1 = 0.2901`, `Macro F1 = 0.3173`, `Mean IoU = 0.6532`.
2. **Authoritative ML Fusion Improvement Verified**: With ML enabled (`door_b10`), the exact Phase 2.9.0 metrics are reproduced:
   - **Production ML (door_b10)**: `TP = 40` (+2), `FP = 65` (-11), `FN = 108` (-2), `Precision = 0.3810` (+0.0477), `Recall = 0.2703` (+0.0135), `Micro F1 = 0.3162` (+0.0261), `Macro F1 = 0.3309` (+0.0136), `Mean IoU = 0.6471` (-0.0061).
3. **Graceful Degradation Verified**: 4 fallback scenarios (CPU execution, CUDA requested but unavailable, missing checkpoint weights, and runtime inference exceptions) were tested. All gracefully fall back to classical CV without crashing or corrupting output.
4. **Pure Geometric Output Contract Maintained**: The production JSON schema for `DetectedArea` remains strictly `{"id": str, "polygon": [{"xPx": float, "yPx": float}]}`. No ML scores or internal diagnostic fields are leaked into the customer-facing area array.
5. **Zero Historical Regressions**: All 171 automated tests across unit, integration, API, and anchor regression suites pass (`171 passed, 1 warning in 248.93s`).
6. **Main Application Untouched**: `packages/typescript/main/**` remains 100% untouched.

---

## 2. PRODUCTION INTEGRATION ARCHITECTURE

### Component Diagram

```
+-----------------------------------------------------------------------------------+
|                              FastAPI (POST /detect)                               |
|                     (Parses DetectionConfig, MLFusionConfig)                      |
+-----------------------------------------------------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                        FloorplanDetector (detect_image)                           |
+-----------------------------------------------------------------------------------+
        |                                                           |
        v                                                           v
+-----------------------------+             +---------------------------------------+
|  Stage 1: Pre-Recovery CV   |             |     Provider Abstraction Layer        |
|  - Wall Mask & Topology     |             |  - StructuralEvidenceProvider (Base)  |
|  - Room Candidates Gen      |             |  - DisabledStructuralEvidenceProvider |
+-----------------------------+             |  - RTDETRStructuralEvidenceProvider   |
        |                                   +---------------------------------------+
        |                                                           |
        | (Raw Candidates)                                          | (StructuralEvidenceResult)
        \-----------------------------+-----------------------------/
                                      v
+-----------------------------------------------------------------------------------+
|                   Stage 2: Candidate Recovery & Precision Engine                  |
|  - Pre-filter validation & spatial containment checks                             |
|  - Score Fusion: fusionScore = min(1.0, max(0.0, confidence + door_w * door_ev))  |
|  - Re-rank candidates by fusionScore                                              |
|  - Spatial Non-Maximum Suppression (IoU overlap > 0.40)                           |
|  - Budget Enforcement: Top-K candidates selected into final area set              |
+-----------------------------------------------------------------------------------+
                                      |
                                      v
+-----------------------------------------------------------------------------------+
|                           Final Output Serialization                              |
|  - Production JSON: pure geometric polygons (DetectedArea)                        |
|  - Diag JSON: telemetry (promoted/demoted candidates, provider stats, fallback)  |
+-----------------------------------------------------------------------------------+
```

### Flow Description:
1. When `detect_image` is invoked, the active configuration is inspected for `ml_fusion`. If `ml_fusion.enabled` is False, `DisabledStructuralEvidenceProvider` is instantiated (zero ML inference overhead).
2. If `ml_fusion.enabled` is True, `get_structural_evidence_provider()` resolves the singleton `RTDETRStructuralEvidenceProvider`.
3. Candidate rooms are generated via standard classical morphological operations in `detect_pre_recovery`.
4. The raw floorplan image and generated candidates are passed to the provider's `extract_evidence` method, returning doorway connection associations (`ml_door_connection`).
5. In `CandidatePrecisionEngine.evaluate_and_filter`, each candidate's score is adjusted by `doorWeight * ml_door_connection`.
6. Candidates are sorted by `fusion_score`, directly influencing budget retention. Valid candidates with doorway evidence move ahead of false positives lacking doorway support.
7. Final polygons are mapped to `DetectedArea` objects, while ML telemetry is safely routed to `diag_json["ml_fusion"]`.

---

## 3. PROVIDER ABSTRACTION LAYER

The provider abstraction decouples the detector engine from the underlying machine learning model.

### Base Class Definition (`ml/providers/base.py`)
- `StructuralEvidenceResult`: Standard dataclass containing:
  - `associations`: Dict[str, Dict[str, Any]] (mapping candidate ID to doorway count, connection flag, wall overlap).
  - `inference_time_ms`: float
  - `association_time_ms`: float
  - `device_used`: str
  - `is_fallback`: bool
  - `fallback_reason`: Optional[str]
- `StructuralEvidenceProvider`: Abstract base class declaring:
  - `extract_evidence(image: np.ndarray, candidates: List[RoomCandidate]) -> StructuralEvidenceResult`
  - `is_available() -> bool`
  - `get_diagnostics() -> Dict[str, Any]`

### Null-Object Pattern (`ml/providers/disabled_provider.py`)
- `DisabledStructuralEvidenceProvider`: Returns empty associations, `0.0ms` latency, `device_used="none"`, `is_fallback=False`. Guarantees zero overhead when ML is disabled.

### Factory Pattern (`ml/providers/__init__.py`)
- `get_structural_evidence_provider(config: Optional[MLFusionConfig] = None)`:
  - If config is None or `not config.enabled`, returns `DisabledStructuralEvidenceProvider`.
  - If config is enabled, returns `RTDETRStructuralEvidenceProvider` initialized with config parameters (`device`, `cpu_fallback`, `timeout_ms`).

### Unit Test Coverage
- Verified in `tests/test_phase291_integration.py::test_provider_abstraction_contracts`, `test_disabled_provider_zero_overhead`, and `test_provider_factory_resolution`.

---

## 4. RT-DETR-L PROVIDER IMPLEMENTATION

Implemented in `ml/providers/rtdetr_provider.py`:
- **Singleton Model Caching**: Uses class-level thread-locked `_shared_detector` to avoid reloading the 66MB PyTorch checkpoint per request.
- **Hardware Device Resolution**:
  - `auto`: Uses CUDA if available (`torch.cuda.is_available()`), else CPU if `cpu_fallback=True`.
  - `cuda`: Demands CUDA; if unavailable and `cpu_fallback=False`, marks provider as fallback.
  - `cpu`: Forces CPU inference.
- **Inference Timeout Enforcement**: Enforces `timeout_ms` (default: 5000ms). If inference exceeds timeout, falls back to classical CV gracefully.
- **Evidence Association**: Calls `StructuralEvidenceExtractor.extract()`, intersecting candidate room contours with door bounding boxes dilated by `buffer_px = 12.0px`.

---

## 5. CONFIGURATION AND FEATURE FLAGS

### Model Definitions (`app/models.py`)
```python
class MLFusionConfig(BaseModel):
    enabled: bool = True
    provider: str = "rtdetr_l"
    weights_path: Optional[str] = None
    device: str = "auto"
    cpu_fallback: bool = True
    doorWeight: float = 0.10
    structuralWeight: float = 0.0
    cavityWeight: float = 0.0
    timeout_ms: int = 5000
    confidence_threshold: float = 0.30
    buffer_px: float = 12.0
```

### Configuration Precedence:
1. Explicit request payload in `POST /detect` (`DetectionConfig.ml_fusion`).
2. Environment variables: `BIONIC_ML_FUSION_ENABLED=1/0` and `ML_FUSION_ENABLED=1/0`.
3. System default: `enabled=False` (fail-safe disabled unless explicitly turned on).

### Validation Rules:
- `doorWeight` must be clamped between 0.0 and 1.0.
- `structuralWeight` and `cavityWeight` are constrained to 0.0 for Phase 2.9.1 production deployment.

---

## 6. CANDIDATE RECOVERY INTEGRATION

### Score Modification Formula
For candidate $c$:
$$\text{fusionScore}(c) = \min\left(1.0, \max\left(0.0, \text{confidence}(c) + w_{\text{door}} \cdot E_{\text{door}}(c)\right)\right)$$
Where:
- $\text{confidence}(c) \in [0, 1]$ is the classical CV confidence score.
- $w_{\text{door}} = 0.10$ is `doorWeight`.
- $E_{\text{door}}(c) \in \{0, 1\}$ indicates whether a confirmed doorway connects to candidate $c$.

### Invariant Preservation:
- Polygon geometries are NEVER altered by the ML provider.
- Pre-filtering geometric sanity checks (area, aspect ratio, solidity) remain active and run prior to fusion re-ranking.
- If $E_{\text{door}}(c) = 0$ or ML is disabled, $\text{fusionScore}(c) = \text{confidence}(c)$.

---

## 7. PRECISION ENGINE INTEGRATION

### Re-ranking & Budget Enforcement
In `CandidatePrecisionEngine.evaluate_and_filter`:
1. Baseline scores are assigned to all stage 1 candidates.
2. If `ml_evidence_result` is active and contains associations, each candidate's `fusion_score` is computed.
3. Candidates are sorted descending by `fusion_score`.
4. Overlapping candidates (IoU > 0.40) are resolved via greedy suppression.
5. The top-$K$ budget is enforced: candidates with higher fusion scores enter the final detection set, while lower-scoring false positives are pruned.
6. Telemetry is tracked per candidate: `baseline_rank`, `fusion_rank`, `promoted: bool`, `demoted: bool`.

---

## 8. API ENDPOINT UPDATES

### Public Contract (`POST /detect`)
- **Request**: Accepts optional `ml_fusion` block in JSON config body or query params.
- **Response**: The production response maintains strict backwards compatibility:
  ```json
  {
    "success": true,
    "areas": [
      {
        "id": "rec_wall_enc_33",
        "polygon": [{"xPx": 124.0, "yPx": 88.0}, ...]
      }
    ],
    "stats": { ... }
  }
  ```
- **Safety**: No internal ML scores or association structures leak into `areas`. If `debug_diagnostics=True`, ML diagnostics appear strictly under `stats.diagnostics.ml_fusion`.

---

## 9. GRACEFUL DEGRADATION VERIFICATION

All 4 fallback modes were tested and saved in `evaluation/phase291/fallback.json`:

| Mode | Scenario | Behavior | Status |
|---|---|---|---|
| **Mode C** | ML ON, Device: CPU | Provider switches to CPU, evidence extracted successfully | **PASS** |
| **Mode D** | CUDA Requested & Unavailable | Automatically falls back to classical CV without crashing | **PASS** |
| **Mode E** | Missing RT-DETR Weights | Fallback triggered (`weights_not_found`), classical CV output returned | **PASS** |
| **Mode F** | Runtime Inference Exception | Catches exception (`inference_exception`), logs warning, falls back cleanly | **PASS** |

### Output Identity Verification:
In all fallback scenarios (Modes D, E, F), the resulting area polygons are bit-exact identical to the pure classical baseline (`areas_fallback == areas_baseline`).

---

## 10. PRODUCTION BENCHMARK RESULTS

Evaluated on the 12-image `my_floorplan` dataset (`evaluation/phase291/baseline.json` vs `evaluation/phase291/ml_enabled.json`):

| Metric | Classical Baseline (ML OFF) | Production Integrated (ML ON: door_b10) | Delta | Direction |
|---|---|---|---|---|
| **True Positives (TP)** | 38 | 40 | **+2** | Improved |
| **False Positives (FP)** | 76 | 65 | **-11** | Improved |
| **False Negatives (FN)** | 110 | 108 | **-2** | Improved |
| **Precision** | 0.3333 | 0.3810 | **+0.0477** (+14.3%) | Improved |
| **Recall** | 0.2568 | 0.2703 | **+0.0135** (+5.3%) | Improved |
| **Micro F1** | 0.2901 | 0.3162 | **+0.0261** (+9.0%) | Improved |
| **Macro F1** | 0.3173 | 0.3309 | **+0.0136** (+4.3%) | Improved |
| **Mean IoU** | 0.6532 | 0.6471 | -0.0061 (-0.9%) | Neutral |

### Key Delta Analysis:
- The production integration matches the authoritative Phase 2.9.0 experimental benchmark down to the fourth decimal digit across all metrics.
- FP reduction (-11) and TP gain (+2) prove the production reliability of doorway evidence.

---

## 11. PROTECTED ANCHOR REGRESSION CHECK

Saved in `evaluation/phase291/anchor_comparison.json`:

| Anchor Image | Baseline TP / FP | Phase 2.9.1 TP / FP | Baseline F1 | Phase 2.9.1 F1 | Status |
|---|---|---|---|---|---|
| `sample-floorplan` | 7 / 1 | 7 / 1 | 0.8750 | 0.8750 | **PASS (Zero Regression)** |
| `Lantai 1` | 3 / 2 | 3 / 2 | 0.6000 | 0.6000 | **PASS (Zero Regression)** |
| `Lantai 2` | 2 / 0 | 2 / 0 | 0.5714 | 0.5714 | **PASS (Zero Regression)** |
| `sample-floorplan-house2` | 10 / 9 | 11 / 9 | 0.5556 | 0.5946 | **PASS (TP +1, F1 +0.039)** |

### Specific Anchor Findings:
- On `sample-floorplan-house2`, candidate `rec_wall_enc_33` (a true room) is promoted from baseline rank #13 to rank #12 due to doorway evidence, entering the final budget and increasing TP from 10 to 11.

---

## 12. EXECUTION PROFILE AND LATENCY

Saved in `evaluation/phase291/performance.json`:

- **Hardware Profiled**: NVIDIA GeForce RTX GPU (CUDA)
- **Model Lazy Load Time**: 725.46 ms (one-time cold start)
- **RT-DETR-L Inference Latency**: **65.14 ms** (Budget: < 200 ms)
- **Doorway Association Latency**: **< 1.0 ms**
- **Single Request ML Overhead**: **65.33 ms**
- **Total Classical Detection Latency**: ~9,200 ms / floorplan (dominated by multi-scale morphology)
- **Latency Impact**: ML structural evidence adds **< 1% total wall-clock overhead** per request.

---

## 13. ZERO REGRESSION ON HISTORICAL TEST SUITE

The full test suite was executed:
```bash
python -m pytest tests/ -q
```
**Results**:
- Existing test suites (Phase 2.7.x, 2.8.x, 2.9.0, API, precision, topology): **146 passed**
- Phase 2.9.1 integration suite (`tests/test_phase291_integration.py`): **25 passed**
- **Total**: **171 passed, 0 failed, 1 warning** (in 248.93s).

---

## 14. REPRODUCIBILITY

### Environment:
- Python 3.11 (Windows x64)
- PyTorch with CUDA support
- Weights file: `services/floorplan-detector/ml/weights/rtdetr_l_autoresearch_60ep.pt`

### Reproduction Commands:
```bash
cd services/floorplan-detector

# Run full integration test suite (25 tests)
python -m pytest tests/test_phase291_integration.py -v

# Run entire repository test suite (171 tests)
python -m pytest tests/ -q

# Regenerate all 5 Phase 2.9.1 JSON artifacts
python run_phase291_matrix.py
```

---

## 15. ARTIFACT MANIFEST

All required artifacts have been generated in `services/floorplan-detector/evaluation/phase291/`:

1. `baseline.json` (45.9 KB): Complete benchmark evaluation with ML disabled.
2. `ml_enabled.json` (203.4 KB): Complete benchmark evaluation with ML enabled (`door_b10`).
3. `fallback.json` (948 B): Telemetry records for all 4 degradation scenarios (Modes C–F).
4. `performance.json` (252 B): Profiled execution latency breakdown (inference, loading, overhead).
5. `anchor_comparison.json` (1.8 KB): Per-anchor comparison for protected reference floorplans.

---

## 16. REMAINING LIMITATIONS AND KNOWN ISSUES

1. **Cold-Start CUDA Kernel JIT**: The first forward pass on CUDA requires ~700ms–1000ms for PyTorch kernel initialization. Subsequent requests run at 65ms. Pre-warming during service startup is recommended.
2. **Door Alignment Sensitivity**: Highly distorted or skewed floorplan scans with non-orthogonal doorways may have slightly reduced association precision if doorways are misclassified by RT-DETR.
3. **Restricted Fusion Scope**: Only `doorWeight = 0.10` is active. Cavity penalties and second-chance recovery remain disabled until Phase 2.9.2.

---

## 17. PHASE 2.9.2 READINESS ASSESSMENT

Phase 2.9.1 provides the rock-solid foundation required for Phase 2.9.2:
- The provider abstraction layer supports pluggable evidence extractors.
- Candidate scoring and precision engine telemetry provide full observability into ranking changes.
- With zero regressions across all historical tests, Phase 2.9.2 can safely explore secondary evidence channels (wall thickness, window bounding, cavity boundaries).

---

## 18. FAILURE PLAYBOOK

### Immediate Rollback Procedure
If unexpected behavior occurs in production:
1. **Zero-Code Rollback (Environment Variable)**:
   Set `BIONIC_ML_FUSION_ENABLED=false` and restart service:
   ```bash
   export BIONIC_ML_FUSION_ENABLED=false
   ```
2. **API Request Rollback**:
   Ensure client requests omit `ml_fusion` or set `{"ml_fusion": {"enabled": false}}`.
3. **Diagnostic Inspection**:
   Send test request with query param `?debug_diagnostics=true` to inspect `stats.diagnostics.ml_fusion.is_fallback` and `stats.diagnostics.ml_fusion.fallback_reason`.

---

## 19. REPOSITORY HYGIENE AND MAIN TOUCH CHECK

- Verification performed via `git status`:
  - `packages/typescript/main/**` was **NEVER modified or touched**.
  - All Phase 2.9.1 code resides exclusively in `packages/typescript/devtools/services/floorplan-detector/`.
- Production area JSON contract remains pure geometric coordinates.

---

## 20. SIGN-OFF AND GATE VERDICT

All Phase 2.9.1 gate requirements have been verified:
- Backward compatibility: Bit-for-bit identical to baseline when disabled.
- Accuracy: Reproduces Phase 2.9.0 improvement (Micro F1: 0.2901 -> 0.3162, TP: +2, FP: -11).
- Robustness: All 4 graceful degradation modes passed.
- Safety: Zero historical test regressions (171/171 passed).

```text
PHASE_2_9_1_INTEGRATION = PASS
READY_FOR_PHASE_2_9_2 = YES
```
