"""
Visualization and diagnostic rendering for Phase 2.10.6 Proposal Fusion & Selection.
"""
from pathlib import Path
from typing import List, Dict, Any, Tuple
import cv2
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from shapely.geometry import Polygon as ShapelyPolygon

from app.proposal_fusion.models import FusedProposal, ProposalCluster


def render_phase2106_diagnostic(
    image_path: Path,
    out_path: Path,
    raw_proposals: List[FusedProposal],
    valid_proposals: List[FusedProposal],
    dedup_proposals: List[FusedProposal],
    selected_proposals: List[FusedProposal],
    clusters: List[ProposalCluster],
    gt_areas: List[Any],
):
    """
    Renders a 6-panel diagnostic visualization comparing stages:
    1. Ground Truth
    2. Raw Proposals (Density)
    3. Validated Proposals
    4. Deduplicated Proposals
    5. Spatial Clusters
    6. Final Selected Proposals vs GT
    """
    img = cv2.imread(str(image_path))
    if img is None:
        return
    h, w = img.shape[:2]

    fig, axes = plt.subplots(2, 3, figsize=(18, 12))
    axes = axes.flatten()

    titles = [
        f"1. Ground Truth ({len(gt_areas)} rooms)",
        f"2. Raw Proposals ({len(raw_proposals)})",
        f"3. Validated Proposals ({len(valid_proposals)})",
        f"4. Deduplicated ({len(dedup_proposals)})",
        f"5. Spatial Clusters ({len(clusters)})",
        f"6. Selected ({len(selected_proposals)}) vs GT",
    ]

    for ax, title in zip(axes, titles):
        ax.imshow(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
        ax.set_title(title, fontsize=12, fontweight="bold")
        ax.axis("off")

    # Panel 0: Ground Truth
    for gta in gt_areas:
        pts = np.array([p.to_tuple() if hasattr(p, "to_tuple") else (p.x, p.y) for p in gta.polygon], np.int32)
        if len(pts) >= 3:
            axes[0].fill(pts[:, 0], pts[:, 1], color="lime", alpha=0.35)
            axes[0].plot(np.append(pts[:, 0], pts[0, 0]), np.append(pts[:, 1], pts[0, 1]), color="green", lw=1.5)

    # Panel 1: Raw Proposals
    for p in raw_proposals[:1000]:  # Cap for rendering speed
        pts = np.array(p.polygon, np.int32)
        if len(pts) >= 3:
            axes[1].plot(np.append(pts[:, 0], pts[0, 0]), np.append(pts[:, 1], pts[0, 1]), color="orange", alpha=0.25, lw=1.0)

    # Panel 2: Validated Proposals
    for p in valid_proposals[:1000]:
        pts = np.array(p.polygon, np.int32)
        if len(pts) >= 3:
            axes[2].plot(np.append(pts[:, 0], pts[0, 0]), np.append(pts[:, 1], pts[0, 1]), color="cyan", alpha=0.3, lw=1.0)

    # Panel 3: Deduplicated Proposals
    for p in dedup_proposals:
        pts = np.array(p.polygon, np.int32)
        if len(pts) >= 3:
            axes[3].plot(np.append(pts[:, 0], pts[0, 0]), np.append(pts[:, 1], pts[0, 1]), color="blue", alpha=0.4, lw=1.2)

    # Panel 4: Spatial Clusters
    colors = plt.cm.tab20(np.linspace(0, 1, max(1, len(clusters))))
    for idx, c in enumerate(clusters):
        bx, by, bw, bh = c.bbox
        rect = plt.Rectangle((bx, by), bw, bh, fill=False, edgecolor=colors[idx % len(colors)], lw=1.8, linestyle="--")
        axes[4].add_patch(rect)
        axes[4].plot(c.centroid[0], c.centroid[1], "o", color=colors[idx % len(colors)], markersize=5)

    # Panel 5: Selected Proposals vs GT
    for gta in gt_areas:
        pts = np.array([p.to_tuple() if hasattr(p, "to_tuple") else (p.x, p.y) for p in gta.polygon], np.int32)
        if len(pts) >= 3:
            axes[5].plot(np.append(pts[:, 0], pts[0, 0]), np.append(pts[:, 1], pts[0, 1]), color="green", lw=1.8, linestyle=":")
    for p in selected_proposals:
        pts = np.array(p.polygon, np.int32)
        if len(pts) >= 3:
            axes[5].fill(pts[:, 0], pts[:, 1], color="red", alpha=0.28)
            axes[5].plot(np.append(pts[:, 0], pts[0, 0]), np.append(pts[:, 1], pts[0, 1]), color="red", lw=1.5)

    plt.tight_layout()
    plt.savefig(out_path, dpi=120)
    plt.close()
