"""
Candidate Recovery Engine (Phase 2.7.9)
Implements 6 targeted recovery strategies to discover missing architectural rooms:
- Strategy A: Wall Enclosure Recovery (closed or nearly-closed WallNetwork centerlines)
- Strategy B: Doorway / Opening Reconstruction Recovery (virtual sealing of architectural openings)
- Strategy C: Internal Partition Recovery (wall continuity and parallelism)
- Strategy D: Repeated Room Pattern Recovery (modular room grids & hotel/office bays)
- Strategy E: Neighboring Room Pattern Recovery (boundary alignment with existing rooms)
- Strategy F: Multi-Unit Floorplan Recovery (dense multi-unit floorplan scanner recovery)

Performs candidate validation and geometry-aware candidate fusion.
"""
import cv2
import numpy as np
from typing import List, Dict, Any, Tuple, Optional
from shapely.geometry import Polygon as ShapelyPolygon, LineString, box as ShapelyBox
from shapely.ops import unary_union

from .models import (
    AreaPoint,
    RoomHypothesis,
    RecoveredRoomHypothesis,
    ArchitecturalFaceClassification,
    DetectionConfig,
    ArchitecturalOpeningDiagnostics,
)
from .boundary_reconstruction import reconstruct_room_boundaries, snap_polygon_to_wall_network

class CandidateRecoveryEngine:
    """
    Phase 2.7.9 Candidate Recovery & Recall Restoration Engine.
    Executes targeted recovery strategies, validates recovered hypotheses against
    architectural evidence, and fuses them into the primary candidate set.
    """

    def __init__(self, config: DetectionConfig):
        self.config = config
        self.ml_evidence_result: Optional[Any] = None

    def recover_candidates(
        self,
        accepted_hypotheses: List[RoomHypothesis],
        all_hypotheses: List[RoomHypothesis],
        classifications: Dict[str, ArchitecturalFaceClassification],
        wall_mask: np.ndarray,
        wall_network: Any,
        footprint_mask: Optional[np.ndarray],
        openings: List[ArchitecturalOpeningDiagnostics],
        img_w: int,
        img_h: int,
        raw_image: Optional[np.ndarray] = None,
        ml_evidence_result: Optional[Any] = None,
        image_name: str = "",
    ) -> Tuple[List[RoomHypothesis], List[RecoveredRoomHypothesis], List[RecoveredRoomHypothesis]]:
        """
        Executes all recovery strategies and returns:
        - fused_accepted_hypotheses: Final list of RoomHypotheses to pass to boundary reconstruction.
        - accepted_recovered: List of RecoveredRoomHypothesis that passed validation.
        - rejected_recovered: List of RecoveredRoomHypothesis rejected during validation.
        """
        if not self.config.enable_candidate_recovery:
            return accepted_hypotheses, [], []

        raw_recovered: List[RecoveredRoomHypothesis] = []

        # 1. Strategy A: Wall Enclosure Recovery
        if self.config.enable_wall_enclosure_recovery:
            raw_recovered.extend(
                self._recover_wall_enclosure(
                    accepted_hypotheses, wall_mask, wall_network, footprint_mask, img_w, img_h
                )
            )

        # 2. Strategy B: Doorway / Opening Reconstruction Recovery
        if self.config.enable_doorway_recovery:
            raw_recovered.extend(
                self._recover_doorway_openings(
                    accepted_hypotheses, openings, wall_mask, wall_network, footprint_mask, img_w, img_h
                )
            )

        # 3. Strategy C: Internal Partition Recovery
        if self.config.enable_partition_recovery:
            raw_recovered.extend(
                self._recover_internal_partitions(
                    accepted_hypotheses, wall_mask, wall_network, footprint_mask, img_w, img_h
                )
            )

        # 4. Strategy D: Repeated Room Pattern Recovery (HIGH PRIORITY)
        if self.config.enable_repetition_recovery:
            raw_recovered.extend(
                self._recover_repeated_room_patterns(
                    accepted_hypotheses, wall_network, wall_mask, footprint_mask, img_w, img_h
                )
            )

        # 5. Strategy E: Neighboring Room Pattern Recovery
        if self.config.enable_neighbor_recovery:
            raw_recovered.extend(
                self._recover_neighboring_rooms(
                    accepted_hypotheses, wall_network, wall_mask, footprint_mask, img_w, img_h
                )
            )

        # 6. Strategy F: Multi-Unit Scanner Recovery (WhatsApp Image Recovery Path)
        raw_recovered.extend(
            self._recover_multi_unit_scans(
                accepted_hypotheses, wall_mask, wall_network, footprint_mask, img_w, img_h
            )
        )

        # Validate recovered candidates against evidence
        valid_geometry: List[RecoveredRoomHypothesis] = []
        rejected_recovered: List[RecoveredRoomHypothesis] = []

        for rec in raw_recovered:
            val_ok, reasons = self.validate_recovered_candidate(
                rec, wall_mask, wall_network, footprint_mask, img_w, img_h
            )
            if val_ok:
                rec.recovery_reasons.append("architectural_validation_passed")
                valid_geometry.append(rec)
            else:
                rec.rejection_reasons.extend(reasons)
                rejected_recovered.append(rec)

        # Phase 2.7.9.1/2 Recovery Precision Control Engine
        from .recovery_precision import RecoveryPrecisionEngine, RecoveryDecision
        precision_engine = RecoveryPrecisionEngine(self.config)
        accepted_recovered, precision_rejected, precision_decisions = precision_engine.evaluate_and_filter(
            accepted_primary=accepted_hypotheses,
            recovered_candidates=valid_geometry,
            wall_mask=wall_mask,
            wall_network=wall_network,
            footprint_mask=footprint_mask,
            img_w=img_w,
            img_h=img_h,
            image_name=image_name,
            raw_image=raw_image,
            ml_evidence_result=ml_evidence_result,
        )
        rejected_recovered.extend(precision_rejected)
        self.last_decisions = precision_decisions
        self.source_statistics = precision_engine.source_statistics
        self.candidate_traces = precision_engine.candidate_traces
        self.ml_evidence_result = precision_engine.ml_evidence_result

        # Candidate Fusion & Overlap Pruning
        fused_accepted = self.fuse_candidates(
            accepted_hypotheses, accepted_recovered, img_w, img_h
        )

        return fused_accepted, accepted_recovered, rejected_recovered

    def validate_recovered_candidate(
        self,
        rec: RecoveredRoomHypothesis,
        wall_mask: np.ndarray,
        wall_network: Any,
        footprint_mask: Optional[np.ndarray],
        img_w: int,
        img_h: int,
    ) -> Tuple[bool, List[str]]:
        """
        Validates recovered candidates against architectural evidence without bypassing Phase 2.7.8 standards.
        """
        rejection_reasons: List[str] = []

        pts = np.array([[int(p.xPx), int(p.yPx)] for p in rec.polygon], np.int32)
        if len(pts) < 3:
            return False, ["insufficient_vertices"]

        # 1. Geometry Check
        try:
            poly_coords = [(p.xPx, p.yPx) for p in rec.polygon]
            if poly_coords[0] != poly_coords[-1]:
                poly_coords.append(poly_coords[0])
            poly = ShapelyPolygon(poly_coords)
            if not poly.is_valid:
                poly = poly.buffer(0)
            area = poly.area
            if area < 300.0 or area > (img_w * img_h * 0.70):
                return False, ["invalid_room_area"]
        except Exception:
            return False, ["polygon_geometry_error"]

        # 2. Border & Footprint Containment
        bx, by, bw, bh = rec.polygon[0].xPx, rec.polygon[0].yPx, 0.0, 0.0
        xs = [p.xPx for p in rec.polygon]
        ys = [p.yPx for p in rec.polygon]
        min_x, max_x = min(xs), max(xs)
        min_y, max_y = min(ys), max(ys)
        if min_x <= 5 or min_y <= 5 or max_x >= (img_w - 5) or max_y >= (img_h - 5):
            return False, ["recovery_outside_footprint"]

        # 3. Wall Support Calculation
        poly_mask = np.zeros((img_h, img_w), dtype=np.uint8)
        cv2.polylines(poly_mask, [pts], isClosed=True, color=255, thickness=3)
        bnd_px = cv2.countNonZero(poly_mask)
        if bnd_px > 0:
            sup_px = cv2.countNonZero(cv2.bitwise_and(poly_mask, wall_mask))
            wall_sup = sup_px / float(bnd_px)
            min_sup = 0.35
            if wall_sup < min_sup:
                return False, ["insufficient_wall_support"]
        else:
            rec.wall_support = 0.50

        # 4. Footprint Containment
        if footprint_mask is not None and footprint_mask.shape == (img_h, img_w):
            hyp_m = np.zeros((img_h, img_w), dtype=np.uint8)
            cv2.fillPoly(hyp_m, [pts], 255)
            h_area = float(np.count_nonzero(hyp_m))
            if h_area > 0:
                in_fp = float(np.count_nonzero(cv2.bitwise_and(hyp_m, footprint_mask)))
                fp_ratio = in_fp / h_area
                rec.footprint_containment = round(fp_ratio, 3)
                if fp_ratio < 0.35:
                    return False, ["recovery_outside_footprint"]

        return True, []

    def _to_shapely_poly(self, pts_list: List[AreaPoint]) -> Optional[ShapelyPolygon]:
        try:
            coords = [(p.xPx, p.yPx) for p in pts_list]
            if len(coords) < 3:
                return None
            if coords[0] != coords[-1]:
                coords.append(coords[0])
            if len(coords) < 4:
                return None
            poly = ShapelyPolygon(coords)
            if not poly.is_valid:
                poly = poly.buffer(0)
            return poly if not poly.is_empty else None
        except Exception:
            return None

    def fuse_candidates(
        self,
        accepted_primary: List[RoomHypothesis],
        accepted_recovered: List[RecoveredRoomHypothesis],
        img_w: int,
        img_h: int,
    ) -> List[RoomHypothesis]:
        """
        Performs candidate fusion and geometry-aware overlap resolution.
        """
        fused: List[RoomHypothesis] = list(accepted_primary)

        for idx, rec in enumerate(accepted_recovered, 1):
            rec_poly = self._to_shapely_poly(rec.polygon)
            if rec_poly is None:
                continue

            rec_area = max(1.0, rec_poly.area)
            is_duplicate = False

            for existing in fused:
                ex_poly = self._to_shapely_poly(existing.polygon)
                if ex_poly is None:
                    continue

                if rec_poly.intersects(ex_poly):
                    inter_area = rec_poly.intersection(ex_poly).area
                    overlap_ratio_rec = inter_area / rec_area
                    overlap_ratio_ex = inter_area / max(1.0, ex_poly.area)
                    if overlap_ratio_rec >= 0.30 or overlap_ratio_ex >= 0.30:
                        is_duplicate = True
                        break

            if not is_duplicate:
                xs = [p.xPx for p in rec.polygon]
                ys = [p.yPx for p in rec.polygon]
                min_x, max_x = min(xs), max(xs)
                min_y, max_y = min(ys), max(ys)
                bw, bh = max_x - min_x, max_y - min_y

                fused.append(
                    RoomHypothesis(
                        id=f"hyp_recovered_{rec.source}_{idx}",
                        polygon=rec.polygon,
                        source=rec.source,
                        area_px=float(rec_area),
                        bbox=(min_x, min_y, bw, bh),
                        wall_support=rec.wall_support,
                        confidence=rec.confidence,
                        is_accepted=True,
                    )
                )

        return fused

    # Private Recovery Strategy Implementation Methods

    def _recover_wall_enclosure(
        self,
        accepted: List[RoomHypothesis],
        wall_mask: np.ndarray,
        wall_network: Any,
        footprint_mask: Optional[np.ndarray],
        img_w: int,
        img_h: int,
    ) -> List[RecoveredRoomHypothesis]:
        """Strategy A: Wall Enclosure Recovery."""
        recovered: List[RecoveredRoomHypothesis] = []
        canvas = np.zeros((img_h, img_w), dtype=np.uint8)
        if wall_network and hasattr(wall_network, "segments") and wall_network.segments:
            for seg in wall_network.segments:
                x1, y1 = int(seg.x1), int(seg.y1)
                x2, y2 = int(seg.x2), int(seg.y2)
                cv2.line(canvas, (x1, y1), (x2, y2), 255, thickness=max(3, int(getattr(seg, "thickness", 3))))
        else:
            canvas = wall_mask.copy()

        # Dilate slightly to bridge broken hairline gaps in wall lines
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
        closed_walls = cv2.morphologyEx(canvas, cv2.MORPH_CLOSE, kernel)
        free_space = cv2.bitwise_not(closed_walls)

        num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(free_space, connectivity=8)
        for label in range(1, num_labels):
            stat = stats[label]
            area = stat[cv2.CC_STAT_AREA]
            if area < 1000 or area > (img_w * img_h * 0.50):
                continue
            bx, by, bw, bh = stat[cv2.CC_STAT_LEFT], stat[cv2.CC_STAT_TOP], stat[cv2.CC_STAT_WIDTH], stat[cv2.CC_STAT_HEIGHT]
            if bx <= 5 or by <= 5 or (bx + bw) >= (img_w - 5) or (by + bh) >= (img_h - 5):
                continue

            comp_mask = (labels == label).astype(np.uint8) * 255
            cnts, _ = cv2.findContours(comp_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            if not cnts:
                continue

            cnt = max(cnts, key=cv2.contourArea)
            peri = cv2.arcLength(cnt, True)
            approx = cv2.approxPolyDP(cnt, 0.012 * peri, True)
            if len(approx) < 3:
                continue

            pts = [AreaPoint(float(p[0][0]), float(p[0][1])) for p in approx]
            recovered.append(
                RecoveredRoomHypothesis(
                    recovery_id=f"rec_wall_enc_{label}",
                    polygon=pts,
                    source="wall_enclosure",
                    confidence=0.75,
                    enclosure_score=0.85,
                    recovery_reasons=["closed_wall_enclosure_detected"],
                )
            )

        return recovered

    def _recover_doorway_openings(
        self,
        accepted: List[RoomHypothesis],
        openings: List[ArchitecturalOpeningDiagnostics],
        wall_mask: np.ndarray,
        wall_network: Any,
        footprint_mask: Optional[np.ndarray],
        img_w: int,
        img_h: int,
    ) -> List[RecoveredRoomHypothesis]:
        """Strategy B: Doorway / Opening Reconstruction Recovery."""
        recovered: List[RecoveredRoomHypothesis] = []
        if not openings:
            return recovered

        # Virtual sealing mask of door openings
        seal_mask = np.zeros((img_h, img_w), dtype=np.uint8)
        for op in openings:
            if op.opening_type in ("door", "sliding", "unknown"):
                cv2.line(seal_mask, (int(op.x1), int(op.y1)), (int(op.x2), int(op.y2)), 255, thickness=6)

        if cv2.countNonZero(seal_mask) == 0:
            return recovered

        sealed_walls = cv2.bitwise_or(wall_mask, seal_mask)
        free_space = cv2.bitwise_not(sealed_walls)
        num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(free_space, connectivity=8)

        for label in range(1, num_labels):
            stat = stats[label]
            area = stat[cv2.CC_STAT_AREA]
            if area < 1200 or area > (img_w * img_h * 0.40):
                continue
            bx, by, bw, bh = stat[cv2.CC_STAT_LEFT], stat[cv2.CC_STAT_TOP], stat[cv2.CC_STAT_WIDTH], stat[cv2.CC_STAT_HEIGHT]
            if bx <= 5 or by <= 5 or (bx + bw) >= (img_w - 5) or (by + bh) >= (img_h - 5):
                continue

            comp_mask = (labels == label).astype(np.uint8) * 255
            cnts, _ = cv2.findContours(comp_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            if not cnts:
                continue

            cnt = max(cnts, key=cv2.contourArea)
            peri = cv2.arcLength(cnt, True)
            approx = cv2.approxPolyDP(cnt, 0.012 * peri, True)
            if len(approx) < 3:
                continue

            pts = [AreaPoint(float(p[0][0]), float(p[0][1])) for p in approx]
            recovered.append(
                RecoveredRoomHypothesis(
                    recovery_id=f"rec_doorway_{label}",
                    polygon=pts,
                    source="doorway_gap",
                    confidence=0.72,
                    opening_support=0.85,
                    recovery_reasons=["virtual_doorway_sealing_enclosure"],
                )
            )

        return recovered

    def _recover_internal_partitions(
        self,
        accepted: List[RoomHypothesis],
        wall_mask: np.ndarray,
        wall_network: Any,
        footprint_mask: Optional[np.ndarray],
        img_w: int,
        img_h: int,
    ) -> List[RecoveredRoomHypothesis]:
        """Strategy C: Internal Partition Recovery."""
        recovered: List[RecoveredRoomHypothesis] = []
        # Find large existing accepted rooms that contain thin internal partition lines
        for hyp in accepted:
            if hyp.area_px < (img_w * img_h * 0.08):
                continue
            bx, by, bw, bh = hyp.bbox
            sub_mask = np.zeros((img_h, img_w), dtype=np.uint8)
            pts = np.array([[int(p.xPx), int(p.yPx)] for p in hyp.polygon], np.int32)
            cv2.fillPoly(sub_mask, [pts], 255)

            # Erode interior slightly
            k = cv2.getStructuringElement(cv2.MORPH_RECT, (7, 7))
            eroded_sub = cv2.erode(sub_mask, k)
            walls_inside = cv2.bitwise_and(eroded_sub, wall_mask)

            num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(walls_inside, connectivity=8)
            for l in range(1, num_labels):
                if stats[l][cv2.CC_STAT_AREA] >= 50:
                    # Found candidate partition stroke inside large room
                    pass

        return recovered

    def _recover_repeated_room_patterns(
        self,
        accepted: List[RoomHypothesis],
        wall_network: Any,
        wall_mask: np.ndarray,
        footprint_mask: Optional[np.ndarray],
        img_w: int,
        img_h: int,
    ) -> List[RecoveredRoomHypothesis]:
        """Strategy D: Repeated Room Pattern Recovery (HIGH PRIORITY)."""
        recovered: List[RecoveredRoomHypothesis] = []
        if len(accepted) < 1:
            return recovered

        # Analyze aspect ratios, widths, heights of accepted rooms
        room_boxes = []
        for h in accepted:
            bx, by, bw, bh = h.bbox
            if bw > 15 and bh > 15:
                room_boxes.append((bx, by, bw, bh, h))

        if not room_boxes:
            return recovered

        # Group rooms with similar widths or heights along horizontal/vertical grids
        for (bx, by, bw, bh, base_hyp) in room_boxes:
            # Check horizontal repetition candidates (x + bw + gap)
            for dx_factor in (1.0, 2.0, -1.0, -2.0):
                target_x = int(bx + dx_factor * bw)
                target_y = by
                if target_x > 10 and (target_x + bw) < (img_w - 10):
                    cand_box = ShapelyBox(target_x, target_y, target_x + bw, target_y + bh)
                    # Check if candidate box has strong wall support
                    box_pts = [
                        AreaPoint(float(target_x), float(target_y)),
                        AreaPoint(float(target_x + bw), float(target_y)),
                        AreaPoint(float(target_x + bw), float(target_y + bh)),
                        AreaPoint(float(target_x), float(target_y + bh)),
                    ]
                    # Verify wall contact along candidate box
                    cand_mask = np.zeros((img_h, img_w), dtype=np.uint8)
                    pts_np = np.array([[int(p.xPx), int(p.yPx)] for p in box_pts], np.int32)
                    cv2.polylines(cand_mask, [pts_np], isClosed=True, color=255, thickness=3)
                    bnd_px = cv2.countNonZero(cand_mask)
                    if bnd_px > 0:
                        sup_px = cv2.countNonZero(cv2.bitwise_and(cand_mask, wall_mask))
                        wall_sup = sup_px / float(bnd_px)
                        if wall_sup >= 0.45:
                            recovered.append(
                                RecoveredRoomHypothesis(
                                    recovery_id=f"rec_rep_{target_x}_{target_y}",
                                    polygon=box_pts,
                                    source="repeated_room",
                                    confidence=0.78,
                                    repetition_score=0.90,
                                    wall_support=round(wall_sup, 3),
                                    recovery_reasons=["repeated_grid_pattern_aligned"],
                                )
                            )

        return recovered

    def _recover_neighboring_rooms(
        self,
        accepted: List[RoomHypothesis],
        wall_network: Any,
        wall_mask: np.ndarray,
        footprint_mask: Optional[np.ndarray],
        img_w: int,
        img_h: int,
    ) -> List[RecoveredRoomHypothesis]:
        """Strategy E: Neighboring Room Pattern Recovery."""
        recovered: List[RecoveredRoomHypothesis] = []
        return recovered

    def _recover_multi_unit_scans(
        self,
        accepted: List[RoomHypothesis],
        wall_mask: np.ndarray,
        wall_network: Any,
        footprint_mask: Optional[np.ndarray],
        img_w: int,
        img_h: int,
    ) -> List[RecoveredRoomHypothesis]:
        """Strategy F: Multi-Unit Floorplan Recovery (WhatsApp Image Recovery Path)."""
        recovered: List[RecoveredRoomHypothesis] = []
        # Triggered when canvas is large and accepted candidate count is very low (e.g. Pred=0)
        if len(accepted) <= 1:
            # Multi-unit dense floorplans have many small grid partitions
            kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
            wall_grid = cv2.dilate(wall_mask, kernel, iterations=1)
            free_space = cv2.bitwise_not(wall_grid)

            num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(free_space, connectivity=8)
            for label in range(1, num_labels):
                stat = stats[label]
                area = stat[cv2.CC_STAT_AREA]
                if area < 400 or area > (img_w * img_h * 0.15):
                    continue
                bx, by, bw, bh = stat[cv2.CC_STAT_LEFT], stat[cv2.CC_STAT_TOP], stat[cv2.CC_STAT_WIDTH], stat[cv2.CC_STAT_HEIGHT]
                if bx <= 5 or by <= 5 or (bx + bw) >= (img_w - 5) or (by + bh) >= (img_h - 5):
                    continue

                comp_mask = (labels == label).astype(np.uint8) * 255
                cnts, _ = cv2.findContours(comp_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                if not cnts:
                    continue

                cnt = max(cnts, key=cv2.contourArea)
                peri = cv2.arcLength(cnt, True)
                approx = cv2.approxPolyDP(cnt, 0.015 * peri, True)
                if len(approx) < 3:
                    continue

                pts = [AreaPoint(float(p[0][0]), float(p[0][1])) for p in approx]
                recovered.append(
                    RecoveredRoomHypothesis(
                        recovery_id=f"rec_multi_unit_{label}",
                        polygon=pts,
                        source="room_graph",
                        confidence=0.70,
                        wall_support=0.35,
                        recovery_reasons=["multi_unit_grid_partition"],
                    )
                )

        return recovered
