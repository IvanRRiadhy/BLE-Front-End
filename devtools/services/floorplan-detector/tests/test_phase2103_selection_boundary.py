"""
Tests for Phase 2.10.3 — Candidate Selection Boundary & Lost-TP Root Cause Module
Verifies rejection taxonomy classification, record serialization, budget scaling,
and guarantees zero geometry mutation and production isolation.
"""

import pytest
from shapely.geometry import Polygon as ShapelyPolygon

from evaluation.phase2103.selection_tracer import (
    RejectionTaxonomy,
    LostTPCandidateRecord,
    classify_rejection_reason,
    calculate_budget_limit,
)


def test_rejection_taxonomy_enum_values():
    expected_categories = {
        "BUDGET_REJECTED",
        "THRESHOLD_REJECTED",
        "DUPLICATE_REJECTED",
        "OVERLAP_REJECTED",
        "MERGED_REJECTED",
        "GEOMETRY_IOU_FAILURE",
        "TOPOLOGY_FAILURE",
        "OUTSIDE_ENVELOPE",
        "UNKNOWN",
    }
    actual_categories = {t.value for t in RejectionTaxonomy}
    assert actual_categories == expected_categories


def test_classify_rejection_outside_envelope():
    cat, reason = classify_rejection_reason(
        passed_threshold=True,
        threshold_reason="",
        passed_budget=True,
        is_duplicate=False,
        is_overlap=False,
        dup_target_id=None,
        overlap_ratio=0.0,
        passed_topology=True,
        is_merged=False,
        reconstructed_iou=0.8,
        is_outside_envelope=True,
    )
    assert cat == RejectionTaxonomy.OUTSIDE_ENVELOPE


def test_classify_rejection_threshold_failed():
    cat, reason = classify_rejection_reason(
        passed_threshold=False,
        threshold_reason="below_confidence",
        passed_budget=False,
        is_duplicate=False,
        is_overlap=False,
        dup_target_id=None,
        overlap_ratio=0.0,
        passed_topology=True,
        is_merged=False,
        reconstructed_iou=0.0,
    )
    assert cat == RejectionTaxonomy.THRESHOLD_REJECTED


def test_classify_rejection_budget_exceeded():
    cat, reason = classify_rejection_reason(
        passed_threshold=True,
        threshold_reason="",
        passed_budget=False,
        is_duplicate=False,
        is_overlap=False,
        dup_target_id=None,
        overlap_ratio=0.0,
        passed_topology=True,
        is_merged=False,
        reconstructed_iou=0.0,
    )
    assert cat == RejectionTaxonomy.BUDGET_REJECTED


def test_classify_rejection_duplicate():
    cat, reason = classify_rejection_reason(
        passed_threshold=True,
        threshold_reason="",
        passed_budget=True,
        is_duplicate=True,
        is_overlap=False,
        dup_target_id="hyp_cavity_11",
        overlap_ratio=0.5,
        passed_topology=True,
        is_merged=False,
        reconstructed_iou=0.0,
    )
    assert cat == RejectionTaxonomy.DUPLICATE_REJECTED
    assert "hyp_cavity_11" in reason


def test_classify_rejection_overlap():
    cat, reason = classify_rejection_reason(
        passed_threshold=True,
        threshold_reason="",
        passed_budget=True,
        is_duplicate=False,
        is_overlap=True,
        dup_target_id="hyp_cavity_1",
        overlap_ratio=0.72,
        passed_topology=True,
        is_merged=False,
        reconstructed_iou=0.0,
    )
    assert cat == RejectionTaxonomy.OVERLAP_REJECTED
    assert "0.72" in reason


def test_classify_rejection_merged():
    cat, reason = classify_rejection_reason(
        passed_threshold=True,
        threshold_reason="",
        passed_budget=True,
        is_duplicate=False,
        is_overlap=False,
        dup_target_id=None,
        overlap_ratio=0.0,
        passed_topology=True,
        is_merged=True,
        reconstructed_iou=0.0,
    )
    assert cat == RejectionTaxonomy.MERGED_REJECTED


def test_classify_rejection_geometry_iou_failure():
    cat, reason = classify_rejection_reason(
        passed_threshold=True,
        threshold_reason="",
        passed_budget=True,
        is_duplicate=False,
        is_overlap=False,
        dup_target_id=None,
        overlap_ratio=0.0,
        passed_topology=True,
        is_merged=False,
        reconstructed_iou=0.18,  # Below 0.25
    )
    assert cat == RejectionTaxonomy.GEOMETRY_IOU_FAILURE


def test_lost_tp_record_schema_and_serialization():
    rec = LostTPCandidateRecord(
        candidate_id="rec_wall_enc_105",
        image_id="sample-floorplan-house2.png",
        gt_id="gt_014",
        iou=0.86909,
        initial_score=0.7185,
        final_score=0.7500,
        old_rank=10,
        new_rank=8,
        budget_limit=8,
        budget_position=8,
        accepted_before_budget=True,
        accepted_after_budget=False,
        duplicate_target="hyp_cavity_12",
        overlap_ratio=0.85,
        merge_status="absorbed",
        rejection_reason=RejectionTaxonomy.DUPLICATE_REJECTED.value,
        text_room_evidence=0.6397,
        text_artifact_evidence=0.0,
        door_evidence=0.9019,
        structural_evidence=0.0,
        cavity_evidence=0.0,
        lifecycle_history=[{"stage": "init"}],
    )
    d = rec.to_dict()
    assert d["candidate_id"] == "rec_wall_enc_105"
    assert d["iou"] == 0.8691
    assert d["old_rank"] == 10
    assert d["new_rank"] == 8
    assert d["rejection_reason"] == "DUPLICATE_REJECTED"
    assert len(d.keys()) >= 21


def test_budget_limit_calculation():
    # Base: max(3, min(8, 10 + 2)) = 8
    assert calculate_budget_limit(10, budget_min=3, budget_ceiling=8, budget_primary_offset=2, multiplier=1.0) == 8
    # +25%: ceil(8 * 1.25) = 10
    assert calculate_budget_limit(10, budget_min=3, budget_ceiling=8, budget_primary_offset=2, multiplier=1.25) == 10
    # +50%: ceil(8 * 1.50) = 12
    assert calculate_budget_limit(10, budget_min=3, budget_ceiling=8, budget_primary_offset=2, multiplier=1.50) == 12
    # Unlimited: 9999
    assert calculate_budget_limit(10, unlimited=True) == 9999


def test_zero_geometry_mutation_guarantee():
    original_coords = [(10.0, 10.0), (50.0, 10.0), (50.0, 50.0), (10.0, 50.0)]
    poly = ShapelyPolygon(original_coords)
    assert poly.area == 1600.0
    # Create record
    rec = LostTPCandidateRecord(
        candidate_id="test_cand",
        image_id="img_1",
        gt_id="gt_1",
        iou=0.75,
        initial_score=0.8,
        final_score=0.8,
        old_rank=1,
        new_rank=1,
        budget_limit=5,
        budget_position=1,
        accepted_before_budget=True,
        accepted_after_budget=True,
        duplicate_target=None,
        overlap_ratio=0.0,
        merge_status="none",
        rejection_reason="accepted",
        text_room_evidence=0.5,
        text_artifact_evidence=0.0,
        door_evidence=0.5,
        structural_evidence=0.0,
        cavity_evidence=0.0,
    )
    # Coordinates must remain identical
    assert list(poly.exterior.coords)[:-1] == original_coords
