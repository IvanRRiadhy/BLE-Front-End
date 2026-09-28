"""
Visualization Diagnostics for Phase 2.10.11 Multimodal Structural Wall Mask Refinement.
Renders 12 diagnostic layers per floorplan:
01_original_image.png
02_grayscale_edge_evidence.png
03_classical_wall_evidence.png
04_ml_wall_evidence.png
05_opening_evidence.png
06_fused_wall_confidence.png
07_baseline_wall_mask.png
08_refined_wall_mask.png
09_repaired_gaps.png
10_repaired_junctions.png
11_baseline_wall_network.png
12_refined_wall_network.png
Plus 4 detailed diagnostic panels for stress floorplans.
"""
import os
from typing import Dict, Any, List, Optional
import cv2
import numpy as np
from .models import RefinedStructuralEvidence


class WallRefinementVisualizer:
    """
    Renders 12 diagnostic visualization layers for wall refinement evaluation.
    """

    def __init__(self, output_dir: str):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)

    def _save_heatmap(self, heat: np.ndarray, path: str):
        """Converts float 0..1 map to colored heatmap (0=blue, 1=red)."""
        u8 = np.clip(heat * 255.0, 0, 255).astype(np.uint8)
        color = cv2.applyColorMap(u8, cv2.COLORMAP_JET)
        cv2.imwrite(path, color)

    def render_all_12_diagnostics(
        self,
        image_name: str,
        base_image: np.ndarray,
        baseline_wall_mask: Optional[np.ndarray],
        baseline_wall_network: Optional[Any],
        evidence_result: RefinedStructuralEvidence,
        refined_wall_network: Optional[Any] = None,
    ) -> Dict[str, str]:
        """
        Renders and saves all 12 diagnostic visualization layers.
        """
        stem = os.path.splitext(image_name)[0]
        created: Dict[str, str] = {}
        h, w = base_image.shape[:2]

        # 01. Original Image
        p1 = os.path.join(self.output_dir, f"{stem}_01_original_image.png")
        cv2.imwrite(p1, base_image)
        created["01_original"] = p1

        # 02. Grayscale / Edge Evidence
        gray = cv2.cvtColor(base_image, cv2.COLOR_BGR2GRAY) if len(base_image.shape) == 3 else base_image.copy()
        edges = cv2.Canny(gray, 50, 150)
        p2 = os.path.join(self.output_dir, f"{stem}_02_grayscale_edge_evidence.png")
        cv2.imwrite(p2, edges)
        created["02_edge"] = p2

        # 03. Classical Wall Evidence (morphology / line)
        p3 = os.path.join(self.output_dir, f"{stem}_03_classical_wall_evidence.png")
        self._save_heatmap(evidence_result.wall_centerline_evidence, p3)
        created["03_classical_wall"] = p3

        # 04. ML Wall Evidence
        p4 = os.path.join(self.output_dir, f"{stem}_04_ml_wall_evidence.png")
        # ML wall confidence or fallback
        self._save_heatmap(evidence_result.wall_confidence_map, p4)
        created["04_ml_wall"] = p4

        # 05. Opening Evidence / Protected Mask
        p5 = os.path.join(self.output_dir, f"{stem}_05_opening_evidence.png")
        prot_vis = base_image.copy()
        prot_vis[evidence_result.protected_opening_mask > 0] = [0, 220, 255]  # Cyan/yellow highlight
        cv2.imwrite(p5, prot_vis)
        created["05_opening"] = p5

        # 06. Fused Wall Confidence
        p6 = os.path.join(self.output_dir, f"{stem}_06_fused_wall_confidence.png")
        self._save_heatmap(evidence_result.wall_confidence_map, p6)
        created["06_fused_confidence"] = p6

        # 07. Baseline Wall Mask
        p7 = os.path.join(self.output_dir, f"{stem}_07_baseline_wall_mask.png")
        base_mask = baseline_wall_mask if baseline_wall_mask is not None else np.zeros((h, w), dtype=np.uint8)
        cv2.imwrite(p7, base_mask)
        created["07_baseline_mask"] = p7

        # 08. Refined Wall Mask
        p8 = os.path.join(self.output_dir, f"{stem}_08_refined_wall_mask.png")
        cv2.imwrite(p8, evidence_result.refined_wall_mask)
        created["08_refined_mask"] = p8

        # 09. Repaired Gaps Overlay
        p9 = os.path.join(self.output_dir, f"{stem}_09_repaired_gaps.png")
        gap_img = base_image.copy()
        for gap in evidence_result.repaired_gaps:
            color = (0, 255, 0) if gap.is_repaired else (0, 0, 255)
            p_a = (int(gap.p1[0]), int(gap.p1[1]))
            p_b = (int(gap.p2[0]), int(gap.p2[1]))
            cv2.line(gap_img, p_a, p_b, color, 3)
            cv2.circle(gap_img, p_a, 4, color, -1)
            cv2.circle(gap_img, p_b, 4, color, -1)
        cv2.imwrite(p9, gap_img)
        created["09_repaired_gaps"] = p9

        # 10. Repaired Junctions Overlay
        p10 = os.path.join(self.output_dir, f"{stem}_10_repaired_junctions.png")
        junc_img = base_image.copy()
        for j in evidence_result.repaired_junctions:
            pt = (int(j.point[0]), int(j.point[1]))
            cv2.circle(junc_img, pt, 6, (255, 0, 255), -1)
            cv2.circle(junc_img, pt, 8, (255, 255, 255), 2)
        cv2.imwrite(p10, junc_img)
        created["10_repaired_junctions"] = p10

        # 11. Baseline Wall Network
        p11 = os.path.join(self.output_dir, f"{stem}_11_baseline_wall_network.png")
        b_net_img = base_image.copy()
        if baseline_wall_network and hasattr(baseline_wall_network, "segments"):
            for seg in baseline_wall_network.segments:
                cv2.line(b_net_img, (int(seg.x1), int(seg.y1)), (int(seg.x2), int(seg.y2)), (0, 140, 255), 2)
        cv2.imwrite(p11, b_net_img)
        created["11_baseline_network"] = p11

        # 12. Refined Wall Network
        p12 = os.path.join(self.output_dir, f"{stem}_12_refined_wall_network.png")
        r_net_img = base_image.copy()
        if refined_wall_network and hasattr(refined_wall_network, "segments"):
            for seg in refined_wall_network.segments:
                cv2.line(r_net_img, (int(seg.x1), int(seg.y1)), (int(seg.x2), int(seg.y2)), (0, 255, 0), 2)
        cv2.imwrite(p12, r_net_img)
        created["12_refined_network"] = p12

        return created
