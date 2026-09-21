import os
import sys
import json
import argparse
import cv2
import numpy as np
from pathlib import Path
from typing import Optional, List, Dict, Any

# Add parent directory to sys.path to enable direct CLI execution
sys.path.insert(0, str(Path(__file__).parent))

from app.models import DetectionConfig, DetectionResult, DetectedArea, CandidateRegionFeatures
from app.preprocessing import preprocess_image
from app.wall_detection import extract_wall_evidence
from app.space_detection import segment_enclosed_spaces
from app.polygon import extract_polygons_from_mask

def draw_debug_visualizations(
    output_dir: Path,
    original_img: np.ndarray,
    gray_img: np.ndarray,
    binary_img: np.ndarray,
    wall_mask: np.ndarray,
    space_mask: np.ndarray,
    candidates_vis: np.ndarray,
    areas: list[DetectedArea],
    gradient_img: np.ndarray,
    edges_img: np.ndarray,
    structural_lines_img: np.ndarray,
    footprint_mask: np.ndarray,
    candidate_features: list[CandidateRegionFeatures],
    envelope_diag_masks: Optional[dict] = None,
    detected_openings: Optional[list] = None,
):
    """
    Generates high-contrast visual debugging artifacts for each pipeline stage.
    """
    output_dir.mkdir(parents=True, exist_ok=True)

    # 01 Original Image
    cv2.imwrite(str(output_dir / "01_original.png"), original_img)

    # 02 Grayscale
    cv2.imwrite(str(output_dir / "02_grayscale.png"), gray_img)

    # 03 Threshold (Binary lines)
    cv2.imwrite(str(output_dir / "03_threshold.png"), binary_img)

    # 04 Wall Mask (Closed walls)
    cv2.imwrite(str(output_dir / "04_wall_mask.png"), wall_mask)

    # Phase 2.7.1 Diagnostics: Building Envelope, Exterior Openings, Exterior Mask, Retained Interior
    if envelope_diag_masks:
        if "envelope_mask" in envelope_diag_masks and envelope_diag_masks["envelope_mask"] is not None:
            cv2.imwrite(str(output_dir / "04b_building_envelope.png"), envelope_diag_masks["envelope_mask"])
        if "exterior_mask" in envelope_diag_masks and envelope_diag_masks["exterior_mask"] is not None:
            cv2.imwrite(str(output_dir / "04d_exterior_mask.png"), envelope_diag_masks["exterior_mask"])
        if "retained_interior" in envelope_diag_masks and envelope_diag_masks["retained_interior"] is not None:
            cv2.imwrite(str(output_dir / "04e_retained_interior.png"), envelope_diag_masks["retained_interior"])

        # 04c Exterior Openings (Visual overlay with annotations)
        openings_vis = original_img.copy()
        if len(openings_vis.shape) == 2:
            openings_vis = cv2.cvtColor(openings_vis, cv2.COLOR_GRAY2BGR)
        
        env_mask = envelope_diag_masks.get("envelope_mask")
        if env_mask is not None:
            eroded_e = cv2.erode(env_mask, cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5)), borderType=cv2.BORDER_CONSTANT, borderValue=0)
            bnd = cv2.subtract(env_mask, eroded_e)
            openings_vis[bnd > 0] = (34, 197, 94)  # Green envelope boundary

        if detected_openings:
            for op in detected_openings:
                bx, by, bw, bh = op["bbox"]
                span = op["span_px"]
                color = (0, 215, 255) if "door" in op["type"] else (0, 140, 255)
                cv2.rectangle(openings_vis, (bx - 2, by - 2), (bx + bw + 2, by + bh + 2), color, 2)
                label = f"{op['type']}: {span:.0f}px"
                cv2.putText(openings_vis, label, (bx, max(15, by - 5)), cv2.FONT_HERSHEY_SIMPLEX, 0.45, color, 1, cv2.LINE_AA)
        
        cv2.imwrite(str(output_dir / "04c_exterior_openings.png"), openings_vis)

    # 05 Space Mask (Enclosed interior room chambers)
    cv2.imwrite(str(output_dir / "05_space_mask.png"), space_mask)

    # 08 Candidates (Accepted vs Rejected Regions by reason)
    cv2.imwrite(str(output_dir / "08_candidates.png"), candidates_vis)

    # 09 Gradient Magnitude (Sobel)
    cv2.imwrite(str(output_dir / "09_gradient.png"), gradient_img)

    # 10 Edges (Canny)
    cv2.imwrite(str(output_dir / "10_edges.png"), edges_img)

    # 11 Structural Lines (Directional linear morphological filtering)
    cv2.imwrite(str(output_dir / "11_structural_lines.png"), structural_lines_img)

    # 12 Building Footprint (Estimated spatial envelope)
    cv2.imwrite(str(output_dir / "12_building_footprint.png"), footprint_mask)

    # 06 Contours Overlay
    h, w = original_img.shape[:2]
    contour_vis = original_img.copy()
    if len(contour_vis.shape) == 2:
        contour_vis = cv2.cvtColor(contour_vis, cv2.COLOR_GRAY2BGR)

    # Distinct curated colors for detected rooms
    palette = [
        (34, 139, 34),    # Forest Green
        (234, 88, 12),    # Orange
        (2, 132, 199),    # Sky Blue
        (168, 85, 247),   # Purple
        (236, 72, 153),   # Pink
        (20, 184, 166),   # Teal
        (234, 179, 8),    # Amber
    ]

    for idx, area in enumerate(areas):
        pts = np.array([[int(p.xPx), int(p.yPx)] for p in area.polygon], np.int32)
        pts = pts.reshape((-1, 1, 2))
        color = palette[idx % len(palette)]
        cv2.polylines(contour_vis, [pts], isClosed=True, color=color, thickness=2)

    cv2.imwrite(str(output_dir / "06_detected_contours.png"), contour_vis)

    # 07 Final Polygons Overlay (Filled with opacity, labels, and vertex markers)
    final_vis = original_img.copy()
    if len(final_vis.shape) == 2:
        final_vis = cv2.cvtColor(final_vis, cv2.COLOR_GRAY2BGR)

    overlay = final_vis.copy()
    for idx, area in enumerate(areas):
        pts = np.array([[int(p.xPx), int(p.yPx)] for p in area.polygon], np.int32)
        pts = pts.reshape((-1, 1, 2))
        color = palette[idx % len(palette)]
        # Fill polygon on overlay
        cv2.fillPoly(overlay, [pts], color=color)

    # Blend overlay with original image (40% opacity)
    cv2.addWeighted(overlay, 0.40, final_vis, 0.60, 0, final_vis)

    # Draw outlines, labels, and vertex coordinates
    for idx, area in enumerate(areas):
        pts = np.array([[int(p.xPx), int(p.yPx)] for p in area.polygon], np.int32)
        pts = pts.reshape((-1, 1, 2))
        color = palette[idx % len(palette)]
        cv2.polylines(final_vis, [pts], isClosed=True, color=color, thickness=3)

        # Draw vertex points
        for p in area.polygon:
            cv2.circle(final_vis, (int(p.xPx), int(p.yPx)), 4, (255, 255, 255), -1)
            cv2.circle(final_vis, (int(p.xPx), int(p.yPx)), 4, color, 1)

        # Draw Area label at centroid
        moments = cv2.moments(pts)
        if moments["m00"] != 0:
            cx = int(moments["m10"] / moments["m00"])
            cy = int(moments["m01"] / moments["m00"])
        else:
            cx, cy = int(area.polygon[0].xPx), int(area.polygon[0].yPx)

        label = f"{area.id} ({len(area.polygon)}v)"
        (text_w, text_h), baseline = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
        cv2.rectangle(
            final_vis,
            (cx - text_w // 2 - 4, cy - text_h - 4),
            (cx + text_w // 2 + 4, cy + baseline + 2),
            (15, 23, 42),
            -1,
        )
        cv2.putText(
            final_vis,
            label,
            (cx - text_w // 2, cy),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6,
            (255, 255, 255),
            2,
            cv2.LINE_AA,
        )

    cv2.imwrite(str(output_dir / "07_final_polygons.png"), final_vis)

    # 13 Candidate Features Overlay
    feat_vis = original_img.copy()
    if len(feat_vis.shape) == 2:
        feat_vis = cv2.cvtColor(feat_vis, cv2.COLOR_GRAY2BGR)

    for cf in candidate_features:
        bx, by, bw, bh = cf.bbox
        status_col = (34, 197, 94) if cf.is_accepted else (68, 68, 239)
        cv2.rectangle(feat_vis, (bx, by), (bx + bw, by + bh), status_col, 2)
        
        # Candidate score annotation badge
        badge_text = f"#{cf.label} S:{cf.room_score:.2f} W:{cf.wall_support_ratio:.2f} F:{cf.footprint_containment:.2f}"
        if not cf.is_accepted:
            badge_text += f" [{cf.rejection_reason}]"
        
        (tw, th), bl = cv2.getTextSize(badge_text, cv2.FONT_HERSHEY_SIMPLEX, 0.4, 1)
        ty = max(by - 5, th + 5)
        cv2.rectangle(feat_vis, (bx, ty - th - 3), (bx + tw + 4, ty + bl), (15, 23, 42), -1)
        cv2.putText(feat_vis, badge_text, (bx + 2, ty - 2), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1, cv2.LINE_AA)

    cv2.imwrite(str(output_dir / "13_candidate_features.png"), feat_vis)

def run_detection(
    image_path: Path,
    output_dir: Path,
    config: DetectionConfig,
    debug: bool = False,
) -> DetectionResult:
    """
    Executes the classical CV floorplan detection pipeline on the input image.
    """
    if not image_path.exists():
        raise FileNotFoundError(f"Floorplan image not found: {image_path}")

    # Read image in color (preserves BGRA or BGR)
    img = cv2.imread(str(image_path), cv2.IMREAD_UNCHANGED)
    if img is None:
        raise ValueError(f"OpenCV failed to decode image: {image_path}")

    h, w = img.shape[:2]

    # Stage 1: Modular Preprocessing
    gray, binary = preprocess_image(img, config)

    # Stage 2: Wall Detection & Door Gap Closure (Phase 2.7.2 Multi-Channel)
    from app.wall_detection import extract_multichannel_wall_evidence
    wall_mask, thick_walls, gradient_img, edges_img, struct_lines, evidence_channels, est_wall_thickness = extract_multichannel_wall_evidence(
        gray, binary, config, raw_img=img
    )

    # Stage 3: Enclosed Space Segmentation & Filtering
    (
        space_mask,
        room_masks,
        space_stats,
        candidates_vis,
        footprint_mask,
        candidate_features,
    ) = segment_enclosed_spaces(
        wall_mask=wall_mask,
        config=config,
        thick_walls=thick_walls,
        gradient_img=gradient_img,
        estimated_wall_thickness=est_wall_thickness,
        struct_lines=struct_lines,
    )

    # Stage 4: Polygon Extraction, Simplification & Topological Validation
    areas = extract_polygons_from_mask(room_masks, config)

    # Stage 5: Compile Detection Result
    stats = {
        "image_width": w,
        "image_height": h,
        "estimated_wall_thickness_px": est_wall_thickness,
        "candidate_spaces": space_stats["candidate_spaces"],
        "accepted_rooms": space_stats["accepted_rooms"],
        "rejected": space_stats["rejected"],
        "final_valid_polygons": len(areas),
        "candidates": [f.to_dict() for f in candidate_features],
        "envelope_area_px": space_stats.get("envelope_area_px", 0),
        "exterior_area_px": space_stats.get("exterior_area_px", 0),
        "retained_interior_px": space_stats.get("retained_interior_px", 0),
        "retention_ratio": space_stats.get("retention_ratio", 0.0),
        "detected_openings": space_stats.get("detected_openings", []),
    }

    result = DetectionResult(
        imageWidth=w,
        imageHeight=h,
        areas=areas,
        stats=stats,
    )

    # Save output JSON
    output_dir.mkdir(parents=True, exist_ok=True)
    json_path = output_dir / "detection.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(result.to_dict(), f, indent=2)

    # Save Phase 2.7.3 Wall Network & Double-Line Fusion Visual Diagnostics
    if debug:
        if evidence_channels:
            for k, ev_img in evidence_channels.items():
                if isinstance(ev_img, np.ndarray) and not k.startswith("_"):
                    cv2.imwrite(str(output_dir / f"{k}.png"), ev_img)

            # Extract WallNetwork, raw segments, paired tuples for visualization
            wall_net = evidence_channels.get("_wall_network")
            raw_segments = evidence_channels.get("_raw_segments") or []
            paired_tuples = evidence_channels.get("_paired_tuples") or []

            # 10_wall_strokes.png
            strokes_vis = img.copy()
            if len(strokes_vis.shape) == 2:
                strokes_vis = cv2.cvtColor(strokes_vis, cv2.COLOR_GRAY2BGR)
            for seg in raw_segments:
                color = (0, 215, 255) if seg.orientation == "H" else (255, 140, 0)
                cv2.line(strokes_vis, (int(seg.x1), int(seg.y1)), (int(seg.x2), int(seg.y2)), color, 2)
            cv2.imwrite(str(output_dir / "10_wall_strokes.png"), strokes_vis)

            # 11_wall_pairs.png (Parallel double-line pairs)
            pairs_vis = img.copy()
            if len(pairs_vis.shape) == 2:
                pairs_vis = cv2.cvtColor(pairs_vis, cv2.COLOR_GRAY2BGR)
            for p1, p2 in paired_tuples:
                cv2.line(pairs_vis, (int(p1.x1), int(p1.y1)), (int(p1.x2), int(p1.y2)), (0, 0, 255), 2)
                cv2.line(pairs_vis, (int(p2.x1), int(p2.y1)), (int(p2.x2), int(p2.y2)), (255, 0, 0), 2)
                # Draw connecting bridge
                cx1, cy1 = (p1.x1 + p1.x2) / 2, (p1.y1 + p1.y2) / 2
                cx2, cy2 = (p2.x1 + p2.x2) / 2, (p2.y1 + p2.y2) / 2
                cv2.line(pairs_vis, (int(cx1), int(cy1)), (int(cx2), int(cy2)), (0, 255, 255), 1)
            cv2.imwrite(str(output_dir / "11_wall_pairs.png"), pairs_vis)

            # 12_wall_centerlines.png (Canonical wall centerlines)
            center_vis = img.copy()
            if len(center_vis.shape) == 2:
                center_vis = cv2.cvtColor(center_vis, cv2.COLOR_GRAY2BGR)
            if wall_net:
                for seg in wall_net.segments:
                    thick = max(2, int(round(seg.thickness)))
                    color = (34, 197, 94) if seg.is_centerline else (234, 179, 8)
                    cv2.line(center_vis, (int(seg.x1), int(seg.y1)), (int(seg.x2), int(seg.y2)), color, thick)
            cv2.imwrite(str(output_dir / "12_wall_centerlines.png"), center_vis)

            # 13_wall_network.png (Nodes + Centerlines)
            net_vis = center_vis.copy()
            if wall_net:
                for node in wall_net.nodes:
                    cv2.circle(net_vis, (int(node.x), int(node.y)), 6, (0, 215, 255), -1)
                    cv2.circle(net_vis, (int(node.x), int(node.y)), 6, (15, 23, 42), 1)
            cv2.imwrite(str(output_dir / "13_wall_network.png"), net_vis)

            # 14_wall_intersections.png
            inter_vis = img.copy()
            if len(inter_vis.shape) == 2:
                inter_vis = cv2.cvtColor(inter_vis, cv2.COLOR_GRAY2BGR)
            if wall_net:
                for ix, iy in wall_net.intersections:
                    cv2.circle(inter_vis, (int(ix), int(iy)), 7, (239, 68, 239), -1)
            cv2.imwrite(str(output_dir / "14_wall_intersections.png"), inter_vis)

            # 15_room_topology.png
            cv2.imwrite(str(output_dir / "15_room_topology.png"), space_mask)

            # 16_room_boundaries.png & 17_final_polygon_overlay.png
            cv2.imwrite(str(output_dir / "16_room_boundaries.png"), space_mask)

        draw_debug_visualizations(
            output_dir=output_dir,
            original_img=img,
            gray_img=gray,
            binary_img=binary,
            wall_mask=wall_mask,
            space_mask=space_mask,
            candidates_vis=candidates_vis,
            areas=areas,
            gradient_img=gradient_img,
            edges_img=edges_img,
            structural_lines_img=struct_lines,
            footprint_mask=footprint_mask,
            candidate_features=candidate_features,
            envelope_diag_masks=space_stats.get("_diagnostic_masks"),
            detected_openings=space_stats.get("detected_openings"),
        )
        cv2.imwrite(str(output_dir / "17_final_polygon_overlay.png"), cv2.imread(str(output_dir / "07_final_polygons.png")))

    return result

def print_cli_report(image_path: Path, result: DetectionResult, output_dir: Path, debug: bool):
    stats = result.stats
    print("\n" + "=" * 50)
    print("BIONIC Floorplan Detector (Classical CV POC)")
    print("=" * 50)
    print(f"Input Image:    {image_path.name}")
    print(f"Dimensions:     {result.imageWidth} x {result.imageHeight} px")
    print("-" * 50)
    print("Space Segmentation:")
    print(f"  Candidate Regions:  {stats['candidate_spaces']}")
    print(f"  Accepted Rooms:     {stats['accepted_rooms']}")
    print(f"  Rejected Regions:   {sum(stats['rejected'].values())}")
    for reason, count in stats['rejected'].items():
        if count > 0:
            print(f"    - {reason}: {count}")
    print("-" * 50)
    print("Polygon Geometry:")
    print(f"  Valid Polygons:     {stats['final_valid_polygons']}")
    for a in result.areas:
        print(f"    - {a.id}: {len(a.polygon)} vertices")
    print("-" * 50)
    print(f"Output JSON:    {output_dir / 'detection.json'}")
    if debug:
        print(f"Debug Visuals:  {output_dir} (01_original.png -> 07_final_polygons.png)")
    print("=" * 50 + "\n")

def main():
    parser = argparse.ArgumentParser(description="BIONIC Floorplan Classical CV Detector")
    parser.add_argument("image", type=str, help="Path to floorplan image (PNG, JPG, WEBP)")
    parser.add_argument(
        "--output-dir",
        "-o",
        type=str,
        default="output",
        help="Directory to save detection.json and debug artifacts",
    )
    parser.add_argument(
        "--debug",
        "-d",
        action="store_true",
        default=True,
        help="Generate intermediate debug visualizations (01..07)",
    )
    parser.add_argument(
        "--min-area",
        type=int,
        default=1200,
        help="Minimum room area in pixels to filter out noise/cavities",
    )
    parser.add_argument(
        "--wall-kernel",
        type=int,
        default=35,
        help="Morphological kernel size for bridging door openings and wall gaps",
    )

    args = parser.parse_args()

    image_path = Path(args.image).resolve()
    output_dir = Path(args.output_dir).resolve()

    config = DetectionConfig(
        min_room_area_px=args.min_area,
        wall_close_kernel_size=args.wall_kernel,
    )

    try:
        result = run_detection(image_path, output_dir, config, debug=args.debug)
        print_cli_report(image_path, result, output_dir, args.debug)
    except Exception as e:
        print(f"\n[ERROR] Detection failed: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
