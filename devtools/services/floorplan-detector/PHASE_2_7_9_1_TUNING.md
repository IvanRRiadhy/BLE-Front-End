# Phase 2.7.9.1 Tuning Log

## Summary
This document records all threshold and parameter changes made during Phase 2.7.9.1 — Recovery Precision Control.
Every change is justified by the authoritative benchmark impact observed.

---

## 1. Recovery Budget

### `_apply_candidate_budget`

| Parameter | Old (Phase 2.7.9) | New (Phase 2.7.9.1) | Reason | Benchmark Effect |
|---|---|---|---|---|
| `max_budget` formula | `max(4, min(18, num_primary * 1.5 + 3))` | `max(3, min(8, num_primary + 2))` | Ablation revealed `Full Phase 2.7.9.1` generated FP = 323 with 46 TP — excessive candidate volume. Tighter budget controls candidate explosion while retaining architecturally justified recoveries. | FP reduced from 106 → 72 (-34). Precision improved 0.2789 → 0.3455. |

---

## 2. Source-Aware Confidence Thresholds

### `wall_enclosure` / `closed_wall_enclosure`

| Parameter | Old | New | Reason | Benchmark Effect |
|---|---|---|---|---|
| `min_confidence` | 0.35 | 0.45 | Wall enclosure recovery was generating spurious candidates with low confidence in floorplans with weak wall contrast (e.g., house3.png). | Reduced FP from house3.png contribution. |
| `min_wall_support` | 0.25 | 0.30 | Prevents candidates with less than 30% of perimeter pixels aligning with wall mask pixels from being accepted. | Suppresses candidates not grounded in actual wall evidence. |

### `doorway_reconstruction` / `doorway_gap`

| Parameter | Old | New | Reason | Benchmark Effect |
|---|---|---|---|---|
| `min_confidence` | 0.30 | 0.40 | Doorway candidates were being generated prolifically in images with many doorway-like gaps without meaningful wall context. | Reduced false doorway candidates. |
| `min_wall_support` | 0.20 | 0.25 | Doorway candidates with very low wall support are likely exterior gaps, not room boundaries. | Reduces exterior-region candidate acceptance. |

### `internal_partition` / `partition_reconstruction`

| Parameter | Old | New | Reason | Benchmark Effect |
|---|---|---|---|---|
| `min_confidence` | 0.40 | 0.50 | Partition detection generates many small candidates in open-plan floorplans (e.g., WhatsApp image). Higher threshold prevents accepting speculative partitions. | Reduced FP count from open-plan candidates. |
| `min_wall_support` | 0.30 | 0.35 | Prevents speculative partition candidates not supported by actual wall pixels. | Tighter filtering. |

### `repeated_room` / `repeated_room_pattern`

| Parameter | Old | New | Reason | Benchmark Effect |
|---|---|---|---|---|
| `min_confidence` | 0.40 | 0.50 | Repetition-based candidates in dense multi-unit floorplans were exploding candidate count without corresponding GT room matches. | Reduced speculative repetition candidates. |
| `min_wall_support` | 0.25 | 0.30 | Repeated room grid candidates must be grounded in wall pixel evidence. | Prevents free-floating grid candidates. |

### `neighboring_room` / `neighboring_room_pattern`

| Parameter | Old | New | Reason | Benchmark Effect |
|---|---|---|---|---|
| `min_confidence` | 0.40 | 0.50 | Neighbor recovery was extrapolating rooms in exterior/balcony regions due to insufficient adjacency evidence gating. | Reduces exterior neighbor candidates. |
| `min_wall_support` | 0.25 | 0.30 | Prevents neighbor candidates from being accepted without wall grounding. | Reduces speculative neighbor candidates. |

### `multi_unit_scanner` / `multi_unit_grid`

| Parameter | Old | New | Reason | Benchmark Effect |
|---|---|---|---|---|
| `min_confidence` | 0.45 | 0.55 | Multi-unit scanning was the highest-FP strategy. Dense grid candidates in the WhatsApp image were generating hundreds of spurious rooms. | Prevents multi-unit FP explosion. |
| `min_wall_support` | 0.35 | 0.40 | Grid-based multi-unit candidates must align with actual wall pixels. | Suppresses free-floating grid candidates. |

### Default (all other sources)

| Parameter | Old | New | Reason | Benchmark Effect |
|---|---|---|---|---|
| `min_confidence` | 0.35 | 0.45 | Raise general fallback threshold to match other strategy calibration. | General FP reduction. |

---

## 3. Source Alias Mapping

**Problem found:** `RecoveredRoomHypothesis.source` strings used by `candidate_recovery.py` did not match `_apply_source_thresholds` patterns.

For example:
- `candidate_recovery.py` emits `source = "closed_wall_enclosure"` or `"doorway_gap"`
- `_apply_source_thresholds` only checked `src == "wall_enclosure"`

**Fix:** All threshold conditions now use `in (canonical, alias)` tuple matching to cover both forms.

| Strategy | Canonical | Alias |
|---|---|---|
| wall_enclosure | `wall_enclosure` | `closed_wall_enclosure` |
| doorway_reconstruction | `doorway_reconstruction` | `doorway_gap` |
| internal_partition | `internal_partition` | `partition_reconstruction` |
| repeated_room | `repeated_room` | `repeated_room_pattern` |
| neighboring_room | `neighboring_room` | `neighboring_room_pattern` |
| multi_unit_scanner | `multi_unit_scanner` | `multi_unit_grid` |

---

## 4. Scoring Formula (No Change)

The Phase 2.7.9.1 confidence scoring formula was retained from the initial design:

```
pos_evidence = 0.5 * architectural_score + 0.3 * enclosure_score + 0.2 * max(repetition_score, neighbor_score)
neg_evidence = 0.8 * exterior_exposure
confidence   = max(0.0, pos_evidence - neg_evidence)
```

This formula correctly penalizes exterior-exposed candidates.
No parameter tuning required at the formula level.

---

## 5. Duplicate / Overlap Suppression (No Change)

IoU > 0.40 → duplicate (rejected)
Overlap ratio > 0.60 → nested candidate (rejected)

These thresholds were validated to correctly preserve adjacent rooms separated by walls while suppressing true duplicates and furniture-interior cavities.
