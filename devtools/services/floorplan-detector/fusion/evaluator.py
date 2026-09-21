"""
Phase 2.9.0 Fusion Evaluator
Executes real black-box fusion strategy evaluations across the 12-image benchmark suite.
Computes complete benchmark metrics, rank displacement, lost-TP case studies, and anchor validation.
"""
import copy
import json
import pickle
import time
from pathlib import Path
from typing import Dict, Any, List, Tuple, Optional
import numpy as np
from shapely.geometry import Polygon as ShapelyPolygon

from app.models import (
    DetectionConfig,
    RecoveryPrecisionConfig,
    AreaPoint,
    DetectedArea,
    RoomHypothesis,
    RecoveredRoomHypothesis,
)
from app.boundary_reconstruction import reconstruct_room_boundaries
from app.recovery_precision import RecoveryPrecisionEngine, RecoveryDecision
from evaluation.datasets.my_floorplan import MyFloorplanAdapter
from evaluation.models import PredictionResult, ImageEvaluationResult
from evaluation.metrics import evaluate_image
from evaluation.taxonomy import reconcile_metrics

from ml.config import DEFAULT_WEIGHTS_PATH
from ml.models import MLDetection
from ml.structural_evidence import StructuralEvidenceExtractor

from .models import (
    FusionCandidate,
    FusionStrategyConfig,
    DisplacementRecord,
    BenchmarkSummary,
)
from .scoring import compute_fusion_score, check_ml_veto, check_ml_second_chance


class FusionEvaluator:
    """
    Isolated evaluation runner for Phase 2.9.0 ML + Classical CV Fusion.
    Executes controlled experiments on precomputed bundles, preserving production integrity.
    """
    def __init__(
        self,
        package_root: Optional[Path] = None,
        cache_path: Optional[Path] = None,
    ):
        self.package_root = package_root or Path(__file__).resolve().parent.parent
        self.cache_path = cache_path or (self.package_root / "evaluation" / "cache_precomputed_bundles.pkl")
        self.adapter = MyFloorplanAdapter()
        self.samples = self.adapter.discover_samples()
        
        # Load precomputed bundles
        if not self.cache_path.exists():
            raise FileNotFoundError(f"Precomputed bundles cache not found at {self.cache_path}")
        with open(self.cache_path, "rb") as f:
            self.precomputed_bundles = pickle.load(f)
            
        # ML evidence extractor and precomputed detections cache
        self.extractor = StructuralEvidenceExtractor()
        self.ml_detections_by_image: Dict[str, List[MLDetection]] = {}
        self._load_ml_detections()
        
        # Precomputed candidate evaluations cache from Phase 2.8.0
        self.precomputed_candidate_data: Dict[Tuple[str, str], Dict[str, Any]] = {}
        self._load_precomputed_candidate_evaluations()
        
        # Per-image candidate generation cache
        self._image_cache: Dict[str, Any] = {}

    def _load_precomputed_candidate_evaluations(self) -> None:
        """Loads precomputed candidate evaluations from Phase 2.8.0 feasibility study."""
        cand_file = self.package_root / "evaluation" / "ml_feasibility" / "candidate_evaluations.json"
        if cand_file.exists():
            try:
                with open(cand_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                for entry in data:
                    img_id = entry.get("imageId", "")
                    cand_id = entry.get("candidateId", "")
                    self.precomputed_candidate_data[(img_id, cand_id)] = entry
                    self.precomputed_candidate_data[(Path(img_id).stem, cand_id)] = entry
                    self.precomputed_candidate_data[(img_id, cand_id.replace(".0", ""))] = entry
                    self.precomputed_candidate_data[(Path(img_id).stem, cand_id.replace(".0", ""))] = entry
            except Exception as e:
                print(f"[FusionEvaluator] Warning: could not load candidate evaluations: {e}")

    def _load_ml_detections(self) -> None:
        """Loads precomputed RT-DETR-L detections from evaluation/ml_feasibility/."""
        feasibility_dir = self.package_root / "evaluation" / "ml_feasibility"
        for sample_id in self.samples:
            stem = Path(sample_id).stem
            det_file = feasibility_dir / stem / "detections.json"
            if det_file.exists():
                try:
                    with open(det_file, "r", encoding="utf-8") as f:
                        data = json.load(f)
                    dets = [MLDetection.from_dict(d) for d in data]
                    self.ml_detections_by_image[sample_id] = dets
                except Exception as e:
                    print(f"[FusionEvaluator] Warning: could not load ML detections for {sample_id}: {e}")
                    self.ml_detections_by_image[sample_id] = []
            else:
                self.ml_detections_by_image[sample_id] = []

    def evaluate_strategy(
        self,
        strategy_cfg: FusionStrategyConfig,
        collect_traces: bool = True,
    ) -> Tuple[BenchmarkSummary, List[ImageEvaluationResult], List[FusionCandidate], List[DisplacementRecord]]:
        """
        Executes a real controlled fusion experiment across all 12 benchmark images.
        """
        t0 = time.perf_counter()
        image_eval_results: List[ImageEvaluationResult] = []
        all_candidates: List[FusionCandidate] = []
        all_displacements: List[DisplacementRecord] = []

        for idx, sample_id in enumerate(self.samples, 1):
            gt_sample = self.adapter.load_ground_truth(sample_id)
            pre_bundle, active_cfg = self.precomputed_bundles[sample_id]
            ml_dets = self.ml_detections_by_image.get(sample_id, [])

            # Run fusion pipeline for this image
            (
                pred_areas,
                img_candidates,
                img_displacements,
            ) = self._process_image_fusion(
                sample_id=sample_id,
                gt_sample=gt_sample,
                pre_bundle=pre_bundle,
                active_cfg=active_cfg,
                ml_dets=ml_dets,
                strategy_cfg=strategy_cfg,
            )

            # Build PredictionResult
            prediction = PredictionResult(
                imageId=sample_id,
                imageWidth=pre_bundle["w"],
                imageHeight=pre_bundle["h"],
                areas=pred_areas,
            )

            # Evaluate against GT using authoritative Hungarian matcher
            eval_res = evaluate_image(
                gt_sample=gt_sample,
                prediction=prediction,
                min_iou=0.25,
            )
            reconcile_metrics(eval_res)
            image_eval_results.append(eval_res)

            all_candidates.extend(img_candidates)
            all_displacements.extend(img_displacements)

        total_elapsed_ms = (time.perf_counter() - t0) * 1000.0

        # Compute aggregate benchmark metrics
        summary = self._compute_benchmark_summary(
            strategy_cfg=strategy_cfg,
            image_results=image_eval_results,
            elapsed_ms=total_elapsed_ms,
        )

        return summary, image_eval_results, all_candidates, all_displacements

    def _process_image_fusion(
        self,
        sample_id: str,
        gt_sample: Any,
        pre_bundle: Dict[str, Any],
        active_cfg: DetectionConfig,
        ml_dets: List[MLDetection],
        strategy_cfg: FusionStrategyConfig,
    ) -> Tuple[List[DetectedArea], List[FusionCandidate], List[DisplacementRecord]]:
        """
        Executes candidate scoring, ML evidence association, fusion re-ranking,
        budget allocation, and boundary reconstruction for a single image.
        """
        w = pre_bundle["w"]
        h = pre_bundle["h"]
        accepted_primary: List[RoomHypothesis] = copy.deepcopy(pre_bundle["pruned_hyps"])
        wall_mask = pre_bundle["wall_mask"]
        wall_network = pre_bundle["wall_network"]
        footprint_mask = pre_bundle["footprint_mask"]
        openings_diag = pre_bundle["openings_diag"]
        precision_engine = RecoveryPrecisionEngine(active_cfg)
        from app.candidate_recovery import CandidateRecoveryEngine
        recovery_engine = CandidateRecoveryEngine(active_cfg)

        if sample_id not in self._image_cache:
            # 1. Extract raw recovery candidates
            raw_recovered: List[RecoveredRoomHypothesis] = []
            
            if active_cfg.enable_wall_enclosure_recovery:
                raw_recovered.extend(recovery_engine._recover_wall_enclosure(accepted_primary, wall_mask, wall_network, footprint_mask, w, h))
            if active_cfg.enable_doorway_recovery:
                raw_recovered.extend(recovery_engine._recover_doorway_openings(accepted_primary, openings_diag, wall_mask, wall_network, footprint_mask, w, h))
            if active_cfg.enable_partition_recovery:
                raw_recovered.extend(recovery_engine._recover_internal_partitions(accepted_primary, wall_mask, wall_network, footprint_mask, w, h))
            if active_cfg.enable_repetition_recovery:
                raw_recovered.extend(recovery_engine._recover_repeated_room_patterns(accepted_primary, wall_network, wall_mask, footprint_mask, w, h))
            if active_cfg.enable_neighbor_recovery:
                raw_recovered.extend(recovery_engine._recover_neighboring_rooms(accepted_primary, wall_network, wall_mask, footprint_mask, w, h))
            if getattr(active_cfg, "enable_multi_unit_recovery", False) and hasattr(recovery_engine, "_recover_multi_unit_candidates"):
                raw_recovered.extend(recovery_engine._recover_multi_unit_candidates(accepted_primary, wall_mask, wall_network, footprint_mask, w, h))

            # Validate geometry
            valid_recs: List[RecoveredRoomHypothesis] = []
            for rec in raw_recovered:
                is_valid, _ = recovery_engine.validate_recovered_candidate(
                    rec, wall_mask, wall_network, footprint_mask, w, h
                )
                if is_valid:
                    valid_recs.append(rec)

            # 2. Build GT polygons for candidate matching
            gt_polys = []
            for gta in gt_sample.areas:
                try:
                    pts = [p.to_tuple() for p in gta.polygon]
                    if len(pts) >= 3:
                        sp = ShapelyPolygon(pts)
                        if not sp.is_valid:
                            sp = sp.buffer(0)
                        gt_polys.append((gta.id, sp))
                except Exception:
                    pass

            # 3. Score candidates with classical engine to get baseline decisions
            precision_engine = RecoveryPrecisionEngine(active_cfg)
            scored_classical: List[Tuple[RecoveredRoomHypothesis, RecoveryDecision]] = []
            for rec in valid_recs:
                dec = precision_engine._score_candidate(
                    rec=rec,
                    accepted_primary=accepted_primary,
                    wall_mask=wall_mask,
                    wall_network=wall_network,
                    footprint_mask=footprint_mask,
                    img_w=w,
                    img_h=h,
                )
                # Baseline second chance
                precision_engine._apply_second_chance(dec)
                dec.confidence_before_bonus = dec.confidence - dec.second_chance_bonus
                dec.confidence_after_bonus = dec.confidence
                
                # Baseline source threshold check
                ok, reason, src_th, wall_th = precision_engine._apply_source_thresholds_with_limits(dec)
                dec.source_threshold = src_th
                dec.wall_support_threshold = wall_th
                if ok:
                    dec.accepted_before_budget = True
                    dec.rejection_reason = "accepted"
                else:
                    dec.accepted_before_budget = False
                    dec.accepted = False
                    if reason:
                        dec.rejection_reasons.append(reason)
                        if "wall" in reason.lower():
                            dec.rejection_reason = "below_wall_support"
                        else:
                            dec.rejection_reason = "below_confidence"
                scored_classical.append((rec, dec))

            # Sort baseline candidates to compute classical budget ranks
            stage1_classical = [(rec, dec) for rec, dec in scored_classical if dec.accepted_before_budget]
            stage1_classical.sort(key=lambda item: item[1].confidence, reverse=True)
            for rank_idx, (_, dec) in enumerate(stage1_classical, 1):
                dec.budget_rank = rank_idx

            # 4. Associate ML Evidence & Build Prototype FusionCandidates
            proto_candidates: List[FusionCandidate] = []
            rec_map: Dict[str, RecoveredRoomHypothesis] = {rec.id: rec for rec, _ in scored_classical}
            for rec, dec in scored_classical:
                poly_coords = [(p.xPx, p.yPx) for p in rec.polygon]
                
                # Check precomputed candidate data first
                p_data = (
                    self.precomputed_candidate_data.get((sample_id, rec.id))
                    or self.precomputed_candidate_data.get((Path(sample_id).stem, rec.id))
                    or self.precomputed_candidate_data.get((sample_id, rec.id.replace(".0", "")))
                    or self.precomputed_candidate_data.get((Path(sample_id).stem, rec.id.replace(".0", "")))
                )
                if p_data:
                    best_gt_id = p_data.get("gtMatch")
                    best_iou = float(p_data.get("iou", 0.0))
                    ml_wall = float(p_data.get("mlWallEvidence", 0.0))
                    ml_door = float(p_data.get("mlDoorEvidence", 0.0))
                    ml_window = float(p_data.get("mlWindowEvidence", 0.0))
                    ml_linkage = float(p_data.get("mlLinkageEvidence", 0.0))
                    ml_struct = float(p_data.get("mlStructuralScore", 0.0))
                    ml_cavity = float(p_data.get("mlCavityLikelihood", 0.0))
                else:
                    best_gt_id = None
                    best_iou = 0.0
                    try:
                        if len(poly_coords) >= 3:
                            c_poly = ShapelyPolygon(poly_coords)
                            if not c_poly.is_valid:
                                c_poly = c_poly.buffer(0)
                            for g_id, g_sp in gt_polys:
                                inter = c_poly.intersection(g_sp).area
                                union = c_poly.union(g_sp).area
                                iou = inter / union if union > 0 else 0.0
                                if iou > best_iou:
                                    best_iou = iou
                                    best_gt_id = g_id
                    except Exception:
                        pass

                    ev = self.extractor.extract_evidence(poly_coords, ml_dets, image_shape=(h, w))
                    ml_wall = ev.wall_support
                    ml_door = ev.door_connection
                    ml_window = ev.window_connection
                    ml_linkage = ev.linkage_support
                    ml_struct = ev.structural_confidence
                    ml_cavity = ev.cavity_likelihood

                fc = FusionCandidate(
                    candidate_id=rec.id,
                    image_id=sample_id,
                    source=dec.source,
                    polygon=poly_coords,
                    classical_confidence=dec.confidence,
                    wall_support_classical=dec.wall_support,
                    enclosure_score=dec.enclosure_score,
                    exterior_exposure=dec.exterior_exposure,
                    negative_evidence=dec.negative_evidence,
                    classical_accepted_before_budget=dec.accepted_before_budget,
                    classical_rejection_reason=dec.rejection_reason,
                    classical_budget_rank=dec.budget_rank,
                    ml_wall_support=ml_wall,
                    ml_door_evidence=ml_door,
                    ml_window_evidence=ml_window,
                    ml_linkage_evidence=ml_linkage,
                    ml_structural_score=ml_struct,
                    ml_cavity_likelihood=ml_cavity,
                    matched_gt_id=best_gt_id if best_iou >= 0.25 else None,
                    iou=best_iou,
                    is_true_room=(best_iou >= 0.30),
                )
                proto_candidates.append(fc)

            self._image_cache[sample_id] = (proto_candidates, rec_map)

        proto_candidates, rec_map = self._image_cache[sample_id]
        fusion_candidates: List[FusionCandidate] = [copy.deepcopy(fc) for fc in proto_candidates]

        # 5. Apply Fusion Strategy Scoring and Filtering
        stage1_fusion: List[FusionCandidate] = []
        for fc in fusion_candidates:
            # Baseline Strategy: strictly maintain classical decisions
            if strategy_cfg.strategy_id == "baseline":
                fc.fusion_score = fc.classical_confidence
                if fc.classical_accepted_before_budget:
                    stage1_fusion.append(fc)
                continue

            # Strategy F: ML Veto
            is_vetoed, veto_reason = check_ml_veto(fc, strategy_cfg)
            if is_vetoed:
                fc.fusion_score = 0.0
                fc.fusion_accepted = False
                fc.fusion_rejection_reason = veto_reason
                continue

            # Strategy G: ML Second Chance
            granted, bonus, sc_reason = check_ml_second_chance(fc, strategy_cfg)
            if granted:
                fc.fusion_second_chance_applied = True
                # Override rejection to allow candidate into budget stage
                pass_stage1 = True
            else:
                pass_stage1 = fc.classical_accepted_before_budget

            # Compute fusion score
            f_score = compute_fusion_score(fc, strategy_cfg)
            if granted:
                f_score = min(1.0, f_score + bonus)
            fc.fusion_score = f_score

            if pass_stage1:
                stage1_fusion.append(fc)
            else:
                fc.fusion_rejection_reason = fc.classical_rejection_reason

        # 6. Re-Rank Candidates by Fusion Score Descending
        stage1_fusion.sort(key=lambda item: item.fusion_score, reverse=True)
        for r_idx, fc in enumerate(stage1_fusion, 1):
            fc.fusion_rank = r_idx

        # 7. Apply Architecture-Aware Budget
        cfg = active_cfg.recovery_precision
        num_primary = len(accepted_primary)
        max_budget = max(
            cfg.budget_min,
            min(cfg.budget_ceiling, num_primary + cfg.budget_primary_offset),
        )

        budgeted_fc = stage1_fusion[:max_budget]
        budget_exceeded_fc = stage1_fusion[max_budget:]
        for fc in budget_exceeded_fc:
            fc.fusion_accepted = False
            fc.fusion_rejection_reason = "budget_rejected"

        # 8. Duplicate / Overlap Suppression vs Primary & higher-ranked candidates
        accepted_polys: List[ShapelyPolygon] = []
        for hp in accepted_primary:
            try:
                coords = [(p.xPx, p.yPx) for p in hp.polygon]
                if coords[0] != coords[-1]:
                    coords.append(coords[0])
                if len(coords) >= 4:
                    sp = ShapelyPolygon(coords)
                    if sp.is_valid and sp.area > 0:
                        accepted_polys.append(sp)
            except Exception:
                pass

        final_accepted_recovered: List[RecoveredRoomHypothesis] = []
        for fc in budgeted_fc:
            rec = rec_map.get(fc.candidate_id)
            if not rec:
                continue

            is_dup, dup_reason = precision_engine._check_overlap_or_duplicate(
                rec, accepted_polys, wall_mask, w, h
            )
            if is_dup:
                fc.fusion_accepted = False
                fc.fusion_rejection_reason = "duplicate" if "iou" in dup_reason.lower() else "overlap_pruned"
            else:
                fc.fusion_accepted = True
                fc.fusion_rejection_reason = "accepted"
                final_accepted_recovered.append(rec)
                # Add polygon to accepted set
                try:
                    coords = [(p.xPx, p.yPx) for p in rec.polygon]
                    if coords[0] != coords[-1]:
                        coords.append(coords[0])
                    if len(coords) >= 4:
                        sp = ShapelyPolygon(coords)
                        if sp.is_valid and sp.area > 0:
                            accepted_polys.append(sp)
                except Exception:
                    pass

        # 9. Compute Displacement Records
        displacements: List[DisplacementRecord] = []
        for fc in fusion_candidates:
            c_rank = fc.classical_budget_rank
            f_rank = fc.fusion_rank
            delta = (c_rank - f_rank) if (c_rank > 0 and f_rank > 0) else 0
            fc.rank_delta = delta

            disp = DisplacementRecord(
                candidate_id=fc.candidate_id,
                image_id=fc.image_id,
                is_true_room=fc.is_true_room,
                matched_gt_id=fc.matched_gt_id,
                iou=fc.iou,
                classical_rank=c_rank,
                fusion_rank=f_rank,
                rank_delta=delta,
                accepted_before_budget_classical=fc.classical_accepted_before_budget,
                accepted_before_budget_fusion=(fc in stage1_fusion),
                accepted_after_budget_classical=(1 <= c_rank <= max_budget),
                accepted_after_budget_fusion=(fc in budgeted_fc),
                moved_into_budget=(c_rank > max_budget or c_rank == -1) and (1 <= f_rank <= max_budget),
                pushed_out_of_budget=(1 <= c_rank <= max_budget) and (f_rank > max_budget or f_rank == -1),
            )
            displacements.append(disp)

        # 10. Boundary Reconstruction & Final Areas
        fused_hyps = recovery_engine.fuse_candidates(
            accepted_primary, final_accepted_recovered, w, h
        )
        reconstructed = reconstruct_room_boundaries(
            fused_hyps, wall_network, openings_diag, wall_mask, active_cfg
        )
        from evaluation.models import PredictedArea, Point2D
        final_areas = [
            PredictedArea(
                id=h.id,
                polygon=[Point2D(p.xPx, p.yPx) for p in h.polygon],
                confidence=1.0,
                metadata={"vertex_count": len(h.polygon)},
            )
            for h in reconstructed
        ]

        return final_areas, fusion_candidates, displacements

    def _compute_benchmark_summary(
        self,
        strategy_cfg: FusionStrategyConfig,
        image_results: List[ImageEvaluationResult],
        elapsed_ms: float,
    ) -> BenchmarkSummary:
        """
        Aggregates quantitative benchmark metrics across all evaluated images.
        """
        total_gt = sum(r.gtRoomCount for r in image_results)
        total_pred = sum(r.predRoomCount for r in image_results)
        total_tp = sum(r.truePositiveCount for r in image_results)
        total_fp = sum(r.falsePositiveCount for r in image_results)
        total_fn = sum(r.falseNegativeCount for r in image_results)

        precision = float(total_tp / (total_tp + total_fp)) if (total_tp + total_fp) > 0 else 0.0
        recall = float(total_tp / (total_tp + total_fn)) if (total_tp + total_fn) > 0 else 0.0
        micro_f1 = float((2 * precision * recall) / (precision + recall)) if (precision + recall) > 0 else 0.0
        macro_f1 = float(np.mean([r.f1 for r in image_results])) if image_results else 0.0

        all_ious = [m.iou for r in image_results for m in r.matches]
        mean_iou = float(np.mean(all_ious)) if all_ious else 0.0
        median_iou = float(np.median(all_ious)) if all_ious else 0.0

        # Anchor tracking
        res_by_img = {Path(r.imageId).stem: r.truePositiveCount for r in image_results}
        res_by_img.update({r.imageId: r.truePositiveCount for r in image_results})

        sf_tp = res_by_img.get("sample-floorplan", 0)
        l1_tp = res_by_img.get("Lantai 1", 0)
        l2_tp = res_by_img.get("Lantai 2", 0)
        h2_tp = res_by_img.get("sample-floorplan-house2", 0)

        # Anchors preserved if sample-floorplan >= 7, Lantai 1 >= 3, Lantai 2 >= 3
        anchors_preserved = bool(sf_tp >= 7 and l1_tp >= 3 and l2_tp >= 3)

        return BenchmarkSummary(
            strategy_id=strategy_cfg.strategy_id,
            strategy_name=strategy_cfg.strategy_name,
            gt_count=total_gt,
            pred_count=total_pred,
            tp_count=total_tp,
            fp_count=total_fp,
            fn_count=total_fn,
            precision=precision,
            recall=recall,
            micro_f1=micro_f1,
            macro_f1=macro_f1,
            mean_iou=mean_iou,
            median_iou=median_iou,
            sample_floorplan_tp=sf_tp,
            lantai_1_tp=l1_tp,
            lantai_2_tp=l2_tp,
            house2_tp=h2_tp,
            anchors_preserved=anchors_preserved,
            inference_ms=198.58,  # Precomputed reference from Phase 2.8.0
            fusion_ms=elapsed_ms,
            total_ms=198.58 + elapsed_ms,
        )
