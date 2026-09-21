"""
FastAPI HTTP Service for BIONIC Floorplan Detector
Acts as a clean, lightweight HTTP adapter around FloorplanDetector.
"""
import sys
from pathlib import Path
from typing import Optional

# Ensure service root is in sys.path
service_root = Path(__file__).parent.parent
if str(service_root) not in sys.path:
    sys.path.insert(0, str(service_root))

from fastapi import FastAPI, File, UploadFile, HTTPException, Query, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
import cv2
import json

from app.detector import FloorplanDetector
from app.models import DetectionConfig

app = FastAPI(
    title="BIONIC Floorplan Detection API",
    description="Classical Computer Vision Service for Architectural Room Segmentation",
    version="1.0.0",
)

# Universal CORS Configuration
# Ensures DevTools UI can connect across any local port, host, or IP without browser CORS rejection
@app.middleware("http")
async def add_universal_cors_headers(request, call_next):
    origin = request.headers.get("origin")
    if not origin:
        referer = request.headers.get("referer")
        if referer:
            from urllib.parse import urlparse
            p = urlparse(referer)
            origin = f"{p.scheme}://{p.netloc}"
        else:
            origin = "*"

    if request.method == "OPTIONS":
        from fastapi import Response
        return Response(
            status_code=200,
            headers={
                "Access-Control-Allow-Origin": origin,
                "Access-Control-Allow-Credentials": "true",
                "Access-Control-Allow-Methods": "*",
                "Access-Control-Allow-Headers": "*",
            },
        )

    response = await call_next(request)
    response.headers["Access-Control-Allow-Origin"] = origin
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Allow-Methods"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "*"
    return response

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize core detector instance (thread-safe, stateless)
detector = FloorplanDetector()

ALLOWED_MIME_TYPES = {
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "application/octet-stream", # Some browsers send this for binary uploads
}

@app.get("/health", tags=["System"])
async def health_check():
    """
    Health check endpoint for DevTools UI and monitoring.
    """
    return {"status": "ok"}

@app.post(
    "/detect",
    tags=["Detection"],
    summary="Detect enclosed room polygons from floorplan image",
    response_description="Detected areas with original pixel coordinates and geometry stats",
)
async def detect_floorplan(
    file: UploadFile = File(..., description="Floorplan image file (PNG, JPG, WEBP)"),
    wall_kernel: Optional[int] = Query(35, description="Morphological kernel size for bridging door gaps"),
    min_area: Optional[int] = Query(1200, description="Minimum room area in pixels to filter cavities"),
    auto_scale: Optional[bool] = Query(False, description="Automatically scale kernel to image resolution"),
    ml_fusion: Optional[bool] = Query(None, description="Explicitly toggle ML structural fusion (defaults to server config)"),
    debug_diagnostics: Optional[bool] = Query(None, description="Include detailed diagnostics in response stats"),
):
    """
    Receives an architectural floorplan image via multipart form upload,
    runs the classical computer vision segmentation pipeline, and returns
    validated candidate room polygons in original image pixel space.
    """
    # 1. Validate MIME type
    content_type = file.content_type or ""
    if content_type and content_type.lower() not in ALLOWED_MIME_TYPES:
        filename = file.filename or ""
        valid_ext = filename.lower().endswith((".png", ".jpg", ".jpeg", ".webp"))
        if not valid_ext:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail=f"Unsupported file format '{content_type}'. Please upload PNG, JPG, or WEBP.",
            )

    # 2. Read image bytes
    try:
        image_bytes = await file.read()
        if len(image_bytes) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is empty (0 bytes).",
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read upload payload: {str(e)}",
        )

    # 3. Configure and execute detector
    config = DetectionConfig(
        wall_close_kernel_size=wall_kernel or 35,
        min_room_area_px=min_area or 1200,
        auto_scale_kernel=auto_scale if auto_scale is not None else False,
    )
    if ml_fusion is not None and config.ml_fusion:
        config.ml_fusion.enabled = ml_fusion
    if debug_diagnostics is not None and config.ml_fusion:
        config.ml_fusion.diagnostics_enabled = debug_diagnostics

    try:
        result = detector.detect_bytes(image_bytes, config)
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Image decoding failed: {str(val_err)}",
        )
    except Exception as proc_err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Floorplan detection algorithm encountered an internal error. Please try adjusting wall_kernel.",
        )

    res_dict = result.to_dict()
    # Filter detailed ML diagnostics if not explicitly requested
    if config.ml_fusion and not config.ml_fusion.diagnostics_enabled:
        if "stats" in res_dict and "diagnostics" in res_dict["stats"]:
            res_dict["stats"]["diagnostics"].pop("ml_fusion", None)

    return res_dict


# ---------------------------------------------------------------------------
# Dataset Annotation Management Endpoints (for my_floorplan)
# ---------------------------------------------------------------------------

def _get_my_floorplan_paths():
    dirs = [
        service_root / "datasets" / "my_floorplan",
        service_root / "my_floorplan",
    ]
    primary_dir = dirs[0]
    primary_dir.mkdir(parents=True, exist_ok=True)
    return dirs, primary_dir

@app.get("/datasets/my_floorplan", tags=["Dataset Annotation"])
async def list_my_floorplan_dataset():
    """
    Discovers all floorplans in my_floorplan and returns their annotation status.
    """
    dirs, _ = _get_my_floorplan_paths()
    valid_exts = {".png", ".jpg", ".jpeg", ".webp"}

    found_files = {}
    for d in dirs:
        if d.exists():
            for f in d.iterdir():
                if f.is_file() and f.suffix.lower() in valid_exts and not f.name.endswith(".gt.json"):
                    if f.name not in found_files:
                        found_files[f.name] = f

    floorplans = []
    for name, path in sorted(found_files.items()):
        # Check if corresponding .gt.json exists in any of the candidate dirs
        gt_file = None
        for d in dirs:
            cand = d / f"{path.stem}.gt.json"
            if cand.exists():
                gt_file = cand
                break

        has_gt = False
        room_count = 0
        status_val = "Not Annotated"

        if gt_file and gt_file.exists():
            try:
                with open(gt_file, "r", encoding="utf-8") as gf:
                    gt_data = json.load(gf)
                areas = gt_data.get("areas", [])
                room_count = len(areas)
                if room_count > 0:
                    has_gt = True
                    status_val = "Annotated"
                else:
                    status_val = "In Progress"
            except Exception:
                status_val = "In Progress"

        # Read dimensions safely
        img = cv2.imread(str(path))
        h, w = (img.shape[0], img.shape[1]) if img is not None else (0, 0)

        floorplans.append({
            "filename": name,
            "imageWidth": w,
            "imageHeight": h,
            "hasGt": has_gt,
            "status": status_val,
            "roomCount": room_count,
            "gtFilename": f"{path.stem}.gt.json" if has_gt else None,
        })

    return {"floorplans": floorplans, "total": len(floorplans)}

@app.get("/datasets/my_floorplan/image/{filename}", tags=["Dataset Annotation"])
async def get_my_floorplan_image(filename: str):
    """
    Streams a floorplan image from my_floorplan.
    """
    dirs, _ = _get_my_floorplan_paths()
    for d in dirs:
        img_path = d / filename
        if img_path.exists() and img_path.is_file():
            media_type = "image/png"
            ext = img_path.suffix.lower()
            if ext in [".jpg", ".jpeg"]:
                media_type = "image/jpeg"
            elif ext == ".webp":
                media_type = "image/webp"
            return FileResponse(str(img_path), media_type=media_type)
    raise HTTPException(status_code=404, detail=f"Image '{filename}' not found in my_floorplan")

@app.get("/datasets/my_floorplan/gt/{filename}", tags=["Dataset Annotation"])
async def get_my_floorplan_ground_truth(filename: str):
    """
    Retrieves the existing ground truth JSON for a floorplan if available.
    """
    dirs, _ = _get_my_floorplan_paths()
    base_stem = Path(filename).stem
    if base_stem.endswith(".gt"):
        base_stem = base_stem[:-3]

    for d in dirs:
        gt_path = d / f"{base_stem}.gt.json"
        if gt_path.exists() and gt_path.is_file():
            with open(gt_path, "r", encoding="utf-8") as f:
                return json.load(f)

    raise HTTPException(status_code=404, detail=f"No ground truth found for '{filename}'")

@app.post("/datasets/my_floorplan/gt/{filename}", tags=["Dataset Annotation"])
async def save_my_floorplan_ground_truth(filename: str, request: Request):
    """
    Validates and writes normalized ground truth JSON directly to my_floorplan.
    """
    dirs, primary_dir = _get_my_floorplan_paths()
    base_stem = Path(filename).stem
    if base_stem.endswith(".gt"):
        base_stem = base_stem[:-3]

    payload = await request.json()

    # Basic schema validation
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="Invalid payload: JSON object expected")

    areas = payload.get("areas", [])
    for idx, a in enumerate(areas):
        poly = a.get("polygon", [])
        if len(poly) < 3:
            raise HTTPException(status_code=400, detail=f"Area {a.get('id', idx)} has fewer than 3 vertices")

    # Save to all matching directories so they remain in sync
    saved_paths = []
    for d in dirs:
        if d.exists():
            target_file = d / f"{base_stem}.gt.json"
            with open(target_file, "w", encoding="utf-8") as f:
                json.dump(payload, f, indent=2)
            saved_paths.append(str(target_file))

    return {
        "status": "success",
        "savedFiles": saved_paths,
        "roomCount": len(areas),
    }
