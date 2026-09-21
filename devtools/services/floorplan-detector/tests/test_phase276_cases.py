"""
Phase 2.7.6 Benchmark Validation & Failure Taxonomy Unit Tests
Tests mathematical metric reconciliation, failure taxonomy classification,
reporting generation, and baseline evaluation consistency.
"""
import pytest
from pathlib import Path
from evaluation.models import ImageEvaluationResult, MatchedPair, TopologyMergedRoom, TopologySplitRoom, RoomMatchRecord
from evaluation.taxonomy import reconcile_metrics, classify_failure_type, generate_failure_summary
from evaluation.reporting import generate_reports

def test_reconcile_metrics_success():
    res = ImageEvaluationResult(
        imageId="test_valid",
        sourceDataset="my_floorplan",
        imageWidth=1000,
        imageHeight=1000,
        gtRoomCount=5,
        predRoomCount=4,
        truePositiveCount=3,
        falsePositiveCount=1,
        falseNegativeCount=2,
        precision=0.75,
        recall=0.60,
        f1=0.6667,
        meanIoU=0.75,
        medianIoU=0.75,
        minIoU=0.70,
        iouGte025Count=3,
        iouGte050Count=3,
        iouGte075Count=1,
        iouGte090Count=0,
        meanAreaErrorPct=5.0,
        medianAreaErrorPct=5.0,
        meanCentroidErrorPx=2.0,
        meanBoundaryErrorPx=10.0,
        gtCoveragePct=50.0,
        predictionCoveragePct=45.0,
        falsePositiveAreaPct=2.0,
    )
    # GT = 5, TP (3) + FN (2) = 5
    # Pred = 4, TP (3) + FP (1) = 4
    assert reconcile_metrics(res) is True

def test_reconcile_metrics_gt_mismatch_raises():
    res = ImageEvaluationResult(
        imageId="test_invalid_gt",
        sourceDataset="my_floorplan",
        imageWidth=1000,
        imageHeight=1000,
        gtRoomCount=5,
        predRoomCount=4,
        truePositiveCount=3,
        falsePositiveCount=1,
        falseNegativeCount=1,  # 3 + 1 = 4 != 5
        precision=0.75,
        recall=0.60,
        f1=0.6667,
        meanIoU=0.75,
        medianIoU=0.75,
        minIoU=0.70,
        iouGte025Count=3,
        iouGte050Count=3,
        iouGte075Count=1,
        iouGte090Count=0,
        meanAreaErrorPct=5.0,
        medianAreaErrorPct=5.0,
        meanCentroidErrorPx=2.0,
        meanBoundaryErrorPx=10.0,
        gtCoveragePct=50.0,
        predictionCoveragePct=45.0,
        falsePositiveAreaPct=2.0,
    )
    with pytest.raises(ValueError, match="GT \\(5\\) != TP \\(3\\) \\+ FN \\(1\\)"):
        reconcile_metrics(res)

def test_reconcile_metrics_pred_mismatch_raises():
    res = ImageEvaluationResult(
        imageId="test_invalid_pred",
        sourceDataset="my_floorplan",
        imageWidth=1000,
        imageHeight=1000,
        gtRoomCount=5,
        predRoomCount=4,
        truePositiveCount=3,
        falsePositiveCount=2,  # 3 + 2 = 5 != 4
        falseNegativeCount=2,
        precision=0.75,
        recall=0.60,
        f1=0.6667,
        meanIoU=0.75,
        medianIoU=0.75,
        minIoU=0.70,
        iouGte025Count=3,
        iouGte050Count=3,
        iouGte075Count=1,
        iouGte090Count=0,
        meanAreaErrorPct=5.0,
        medianAreaErrorPct=5.0,
        meanCentroidErrorPx=2.0,
        meanBoundaryErrorPx=10.0,
        gtCoveragePct=50.0,
        predictionCoveragePct=45.0,
        falsePositiveAreaPct=2.0,
    )
    with pytest.raises(ValueError, match="Pred \\(4\\) != TP \\(3\\) \\+ FP \\(2\\)"):
        reconcile_metrics(res)

def test_classify_failure_types():
    assert classify_failure_type("matched", iou=0.85, area_error_pct=5.0) == "none"
    assert classify_failure_type("matched", iou=0.45, area_error_pct=15.0) == "boundary_error"
    assert classify_failure_type("unmatched", iou=0.0, area_error_pct=0.0, is_merged=True) == "merged"
    assert classify_failure_type("unmatched", iou=0.0, area_error_pct=0.0, is_split=True) == "split"
    assert classify_failure_type("unmatched", iou=0.0, area_error_pct=0.0, is_tiny=True) == "tiny_room"
    assert classify_failure_type("missed", iou=0.0, area_error_pct=0.0) == "missed"
    assert classify_failure_type("false_positive", iou=0.0, area_error_pct=0.0) == "false_positive"

def test_generate_reports_outputs(tmp_path: Path):
    res = ImageEvaluationResult(
        imageId="test_sample",
        sourceDataset="my_floorplan",
        imageWidth=1000,
        imageHeight=1000,
        gtRoomCount=5,
        predRoomCount=4,
        truePositiveCount=3,
        falsePositiveCount=1,
        falseNegativeCount=2,
        precision=0.75,
        recall=0.60,
        f1=0.6667,
        meanIoU=0.75,
        medianIoU=0.75,
        minIoU=0.70,
        iouGte025Count=3,
        iouGte050Count=3,
        iouGte075Count=1,
        iouGte090Count=0,
        meanAreaErrorPct=5.0,
        medianAreaErrorPct=5.0,
        meanCentroidErrorPx=2.0,
        meanBoundaryErrorPx=10.0,
        gtCoveragePct=50.0,
        predictionCoveragePct=45.0,
        falsePositiveAreaPct=2.0,
    )
    report_paths = generate_reports(
        results=[res],
        output_dir=tmp_path,
        benchmark_name="test_bench",
        dataset_name="my_floorplan",
    )

    assert report_paths["report_json"].exists()
    assert report_paths["report_csv"].exists()
    assert report_paths["summary_html"].exists()
    assert (tmp_path / "report.md").exists()
    assert (tmp_path / "failure_summary.json").exists()
