import {
  Button,
  darken,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { Stage, Layer, Image as KonvaImage, Line, Circle, FastLayer, Group } from 'react-konva';
import { useSelector, useDispatch, RootState } from 'src/store/Store';
import {
  FloorplanDeviceType,
  SelectEditingFloorplanDevice,
  SelectFloorplanDevice,
  editDevicePosition,
  PathsType,
  PathNodeType,
  DrawingDevicePath,
  AddPathPairToUnsaved,
  StartEditingDevice,
  CancelDeviceEditing,
  isDeviceColliding,
  findValidDevicePosition,
} from 'src/store/apps/crud/floorplanDevice';
import borderFaceRecog from 'src/assets/images/svgs/devices/FACE READER ICON.png';
import CCTVSVG from 'src/assets/images/svgs/devices/7.svg';
import borderGateway from 'src/assets/images/svgs/devices/BLE GATEWAY ICON.png';
import UnknownDevice from 'src/assets/images/masters/Devices/UnknownDevice.png';
import { MaskedAreaType } from 'src/store/apps/crud/maskedArea';
import { uniqueId } from 'lodash';
import { v4 as uuidv4 } from 'uuid';

type Nodes = {
  id: string;
  x: number;
  y: number;
  x_px: number;
  y_px: number;
};

interface Props {
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  imageSrc?: string;
  scale: number;
  devices?: FloorplanDeviceType[];
  activeDevice?: FloorplanDeviceType | null;
  setIsDragging: (isDragging: boolean) => void;
  areas: MaskedAreaType[];
  showAreas: boolean;
  showEffectiveArea: boolean;
  stageScale: number;
  stageX: number;
  stageY: number;
  stageRef?: React.RefObject<any>;
  onWheel?: (e: any) => void;
  setCursor?: (cursor: string) => void;
}

const ICON_SIZE = 36;
const ICON_HALF = ICON_SIZE / 2;

const EditDeviceRenderer: React.FC<Props> = ({
  width,
  height,
  originalWidth,
  originalHeight,
  imageSrc,
  scale,
  devices = [],
  activeDevice,
  setIsDragging,
  areas,
  showAreas,
  showEffectiveArea,
  stageScale,
  stageX,
  stageY,
  stageRef,
  onWheel,
  setCursor,
}) => {
  const dispatch = useDispatch();
  const editingDevice = useSelector(
    (state: RootState) => state.floorplanDeviceReducer.editingFloorplanDevice,
  );
  const drawingPath = useSelector(
    (state: RootState) => state.floorplanDeviceReducer.drawingDevicePath,
  );
  const isDrawingPath = Boolean(drawingPath);
  const editingPaths = editingDevice?.devicePath ?? [];
  const selectedPathId = useSelector(
    (state: RootState) => state.floorplanDeviceReducer.selectDevicePath,
  );
  const [pathNodes, setPathNodes] = useState<PathNodeType[]>([]);
  const [cursorWorld, setCursorWorld] = useState<{ x: number; y: number } | null>(null);
  const [deviceDragging, setDeviceDragging] = useState(false);

  // Ref and state for hold-Q magnetic snapping mode
  const isQHeldRef = useRef(false);
  const [isQHeld, setIsQHeld] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      if (e.key === 'q' || e.key === 'Q') {
        if (!isQHeldRef.current) {
          isQHeldRef.current = true;
          setIsQHeld(true);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      if (e.key === 'q' || e.key === 'Q') {
        isQHeldRef.current = false;
        setIsQHeld(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Add a ref to track if heatmap is being generated
  const heatmapGenerationInProgress = useRef(false);

  // background images
  const [bgImage, setBgImage] = useState<HTMLImageElement | undefined>(undefined);
  const [previewImage, setPreviewImage] = useState<HTMLImageElement | undefined>(undefined);

  // device icons - use direct image loading instead of hooks
  const [iconCCTV, setIconCCTV] = useState<HTMLImageElement | null>(null);
  const [iconGateway, setIconGateway] = useState<HTMLImageElement | null>(null);
  const [iconFaceRecog, setIconFaceRecog] = useState<HTMLImageElement | null>(null);
  const [iconUnknown, setIconUnknown] = useState<HTMLImageElement | null>(null);

  // Load device icons
  useEffect(() => {
    const loadIcon = (
      src: string,
      setter: React.Dispatch<React.SetStateAction<HTMLImageElement | null>>,
    ) => {
      const img = new Image();
      img.src = src;
      img.onload = () => setter(img);
      img.onerror = () => console.warn(`Failed to load icon: ${src}`);
    };

    loadIcon(CCTVSVG, setIconCCTV);
    loadIcon(borderGateway, setIconGateway);
    loadIcon(borderFaceRecog, setIconFaceRecog);
    loadIcon(UnknownDevice, setIconUnknown);
  }, []);

  // heatmap image produced from offscreen canvas
  const [heatmapImage, setHeatmapImage] = useState<HTMLImageElement | undefined>(undefined);
  // Track last generated heatmap dimensions to avoid regeneration
  const lastHeatmapDeps = useRef<string>('');

  useEffect(() => {
    console.log('showEffectiveArea changed:', showEffectiveArea);
  }, [showEffectiveArea]);

  // load background images with optimization for large images
  useEffect(() => {
    if (!imageSrc) {
      setPreviewImage(undefined);
      setBgImage(undefined);
      return;
    }

    // For large images, use a lower resolution preview
    const isLargeImage = originalWidth > 3000 || originalHeight > 3000;

    if (isLargeImage && imageSrc.includes('/Uploads/')) {
      // For large images, try to load a smaller preview first
      const previewUrl = `${imageSrc}`;
      const p = new window.Image();
      // p.crossOrigin = 'anonymous';
      p.src = previewUrl;
      p.onload = () => {
        setPreviewImage(p);
        const full = new window.Image();
        // full.crossOrigin = 'anonymous';
        full.src = imageSrc;
        full.onload = () => setBgImage(full);
        full.onerror = () => {
          if (!bgImage) setBgImage(p);
        };
      };
      p.onerror = () => {
        // Fallback to original image
        const f = new Image();
        f.crossOrigin = 'anonymous';
        f.src = imageSrc;
        f.onload = () => {
          setBgImage(f);
          if (!previewImage) setPreviewImage(f);
        };
      };
    } else {
      // For normal size images, use original loading logic
      const p = new Image();
      // p.crossOrigin = 'anonymous';
      p.src = imageSrc;
      p.onload = () => {
        setPreviewImage(p);
        const full = new window.Image();
        // full.crossOrigin = 'anonymous';
        full.src = imageSrc;
        full.onload = () => setBgImage(full);
        full.onerror = () => {
          if (!bgImage) setBgImage(p);
        };
      };
      p.onerror = () => {
        const f = new window.Image();
        f.crossOrigin = 'anonymous';
        f.src = imageSrc;
        f.onload = () => setBgImage(f);
      };
    }
  }, [imageSrc, originalWidth, originalHeight]);

  // pointer -> world coords
  const pointerToWorld = useCallback(
    (pointer: { x: number; y: number } | null) => {
      if (!pointer) return null;
      return { x: (pointer.x - stageX) / stageScale, y: (pointer.y - stageY) / stageScale };
    },
    [stageScale, stageX, stageY],
  );

  // Helper: Find closest point on a line segment (x1,y1)-(x2,y2) to point (px,py)
  const getClosestPointOnSegment = (
    px: number,
    py: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
  ) => {
    const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
    if (l2 === 0) return { x: x1, y: y1 };

    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));

    return {
      x: x1 + t * (x2 - x1),
      y: y1 + t * (y2 - y1),
    };
  };

  const getInfiniteLineIntersection = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number,
    x4: number,
    y4: number,
  ): { x: number; y: number } | null => {
    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) < 1e-5) return null;

    const ix =
      ((x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4)) / denom;
    const iy =
      ((x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4)) / denom;

    return { x: ix, y: iy };
  };

  // Helper: Snap position (px, py) to nearest virtual line or line-line intersection point (100px sensitivity, 15px intersection)
  const snapToNearestLine = useCallback(
    (px: number, py: number, currentDeviceId?: string) => {
      const sensitivityRadius = 100;
      const intersectionRadius = 15;
      const boxSize = 75;
      const boxHalf = boxSize / 2; // 37.5px

      type LineSegment = { x1: number; y1: number; x2: number; y2: number };
      const allLines: LineSegment[] = [];

      // 1. Collect area edge segments
      for (const area of areas) {
        if (!area.nodes || area.nodes.length < 2) continue;

        const numNodes = area.nodes.length;
        for (let i = 0; i < numNodes; i++) {
          const n1 = area.nodes[i];
          const n2 = area.nodes[(i + 1) % numNodes];
          allLines.push({ x1: n1.x_px, y1: n1.y_px, x2: n2.x_px, y2: n2.y_px });
        }
      }

      // 2. Collect 75x75 box edges for all other devices (eligible for BOTH line-line intersection & single line snap)
      for (const d of devices) {
        if (!d || (currentDeviceId && d.id === currentDeviceId)) continue;
        const x = d.posPxX;
        const y = d.posPxY;
        allLines.push(
          { x1: x - boxHalf, y1: y - boxHalf, x2: x + boxHalf, y2: y - boxHalf }, // top
          { x1: x - boxHalf, y1: y + boxHalf, x2: x + boxHalf, y2: y + boxHalf }, // bottom
          { x1: x - boxHalf, y1: y - boxHalf, x2: x - boxHalf, y2: y + boxHalf }, // left
          { x1: x + boxHalf, y1: y - boxHalf, x2: x + boxHalf, y2: y + boxHalf }, // right
        );
      }

      // 3. Prioritize line-line intersection points among ALL lines (area lines + 75x75 device box lines, within 15px)
      let minIntersectionDist = intersectionRadius;
      let bestIntersectionPos: { x: number; y: number } | null = null;

      for (let i = 0; i < allLines.length; i++) {
        for (let j = i + 1; j < allLines.length; j++) {
          const l1 = allLines[i];
          const l2 = allLines[j];
          const intersection = getInfiniteLineIntersection(
            l1.x1,
            l1.y1,
            l1.x2,
            l1.y2,
            l2.x1,
            l2.y1,
            l2.x2,
            l2.y2,
          );
          if (intersection) {
            // Disable snapping inside any device's 75x75 interior
            if (!isDeviceColliding(intersection.x, intersection.y, devices, currentDeviceId, 75)) {
              const dist = Math.hypot(px - intersection.x, py - intersection.y);
              if (dist <= minIntersectionDist) {
                minIntersectionDist = dist;
                bestIntersectionPos = intersection;
              }
            }
          }
        }
      }

      if (bestIntersectionPos) {
        return bestIntersectionPos;
      }

      // 4. Fallback: Snap to nearest point on ANY single line segment (outside 75x75 interior)
      let minLineDist = sensitivityRadius;
      let bestLinePos: { x: number; y: number } | null = null;

      for (const line of allLines) {
        const closest = getClosestPointOnSegment(px, py, line.x1, line.y1, line.x2, line.y2);
        // Disable snapping inside any device's 75x75 interior
        if (!isDeviceColliding(closest.x, closest.y, devices, currentDeviceId, 75)) {
          const dist = Math.hypot(px - closest.x, py - closest.y);

          if (dist <= minLineDist) {
            minLineDist = dist;
            bestLinePos = closest;
          }
        }
      }

      return bestLinePos;
    },
    [areas, devices],
  );

  // OPTIMIZED: Heatmap generation with performance improvements
  const getRadius = useCallback(() => 5 / scale, [scale]);

  const jetColorMap = useCallback((v: number) => {
    const t = Math.max(0, Math.min(1, v));
    const fourValue = 4 * t;
    const r = Math.min(
      255,
      Math.max(0, Math.floor(255 * Math.min(fourValue - 1.5, -fourValue + 4.5))),
    );
    const g = Math.min(
      255,
      Math.max(0, Math.floor(255 * Math.min(fourValue - 0.5, -fourValue + 3.5))),
    );
    const b = Math.min(
      255,
      Math.max(0, Math.floor(255 * Math.min(fourValue + 0.5, -fourValue + 2.5))),
    );
    return { r, g, b };
  }, []);

  useEffect(() => {
    // Only generate heatmap if showEffectiveArea is true
    // if (!showEffectiveArea) {
    //   setHeatmapImage(undefined);
    //   return;
    // }

    // Check if we need to regenerate heatmap
    const currentDeps = JSON.stringify({
      devices: devices?.map((d) => ({
        id: d.id,
        posPxX: d.posPxX,
        posPxY: d.posPxY,
        type: d.type,
        areaId: d.floorplanMaskedAreaId,
      })),
      areas: areas.map((a) => ({ id: a.id, nodes: a.nodes })),
      scale,
      showEffectiveArea,
    });

    if (lastHeatmapDeps.current === currentDeps) {
      return; // Skip regeneration if dependencies haven't changed
    }

    // For large images, generate heatmap at reduced resolution
    const isLargeImage = originalWidth > 3000 || originalHeight > 3000;
    const heatmapScale = isLargeImage ? 0.5 : 1; // Reduce resolution for large images

    const scaledWidth = Math.floor(originalWidth * heatmapScale);
    const scaledHeight = Math.floor(originalHeight * heatmapScale);

    if (scaledWidth === 0 || scaledHeight === 0) return;

    // Prevent multiple simultaneous heatmap generations
    if (heatmapGenerationInProgress.current) return;
    heatmapGenerationInProgress.current = true;

    // Use requestAnimationFrame to avoid blocking UI
    requestAnimationFrame(() => {
      const canvas = document.createElement('canvas');
      canvas.width = scaledWidth;
      canvas.height = scaledHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        heatmapGenerationInProgress.current = false;
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Only draw if we have devices
      const bleDevices = devices?.filter((d) => d.type === 'BleReader');
      if (!bleDevices || bleDevices.length === 0) {
        const outImg = new Image();
        outImg.crossOrigin = 'anonymous';
        outImg.src = canvas.toDataURL('image/png');
        outImg.onload = () => {
          setHeatmapImage(outImg);
          lastHeatmapDeps.current = currentDeps;
          heatmapGenerationInProgress.current = false;
        };
        return;
      }

      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const radius = getRadius() * heatmapScale;

      const drawIntensityCircle = (cx: number, cy: number, r: number) => {
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        g.addColorStop(0, 'rgba(255,255,255,1.0)');
        g.addColorStop(1, 'rgba(255,255,255,0.0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      };

      ctx.globalCompositeOperation = 'lighter';

      // Draw intensities per area (clipped) with scaled coordinates
      areas.forEach((area) => {
        const nodes = area.nodes ?? [];
        if (!nodes.length) return;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(nodes[0].x_px * heatmapScale, nodes[0].y_px * heatmapScale);
        for (let i = 1; i < nodes.length; i++) {
          ctx.lineTo(nodes[i].x_px * heatmapScale, nodes[i].y_px * heatmapScale);
        }
        ctx.closePath();
        ctx.clip();

        devices
          ?.filter((d) => d.floorplanMaskedAreaId === area.id && d.type === 'BleReader')
          .forEach((d) => {
            drawIntensityCircle(d.posPxX * heatmapScale, d.posPxY * heatmapScale, radius);
          });

        ctx.restore();
      });

      // Convert to image data for color mapping
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Use a simpler color mapping for better performance
      for (let i = 0; i < data.length; i += 4) {
        const intensity = data[i];
        const v = intensity / 255;

        if (v <= 0.001) {
          data[i] = 0;
          data[i + 1] = 0;
          data[i + 2] = 0;
          data[i + 3] = 0;
        } else {
          // Simplified color mapping for better performance
          const { r, g, b } = jetColorMap(v);
          data[i] = r;
          data[i + 1] = g;
          data[i + 2] = b;
          data[i + 3] = Math.min(255, Math.floor(180 * v + 75)); // Reduced alpha for better visibility
        }
      }

      ctx.putImageData(imageData, 0, 0);

      const outImg = new Image();
      outImg.crossOrigin = 'anonymous';
      outImg.src = canvas.toDataURL('image/png');
      outImg.onload = () => {
        setHeatmapImage(outImg);
        lastHeatmapDeps.current = currentDeps;
        heatmapGenerationInProgress.current = false;
      };
    });
  }, [
    devices,
    areas,
    originalWidth,
    originalHeight,
    scale,
    getRadius,
    jetColorMap,
    showEffectiveArea,
  ]);

  // Path drawing state
  useEffect(() => {
    if (!drawingPath) {
      setPathNodes([]);
      return;
    }
    const startDev = devices?.find((d) => d.id === drawingPath);
    if (!startDev) return;

    setPathNodes([
      {
        id: uuidv4(),
        deviceId: startDev.id,
        posPxX: startDev.posPxX,
        posPxY: startDev.posPxY,
        posX: startDev.posX,
        posY: startDev.posY,
      } as PathNodeType,
    ]);
  }, [drawingPath, devices]);

  // Canvas click for path drawing
  const handleCanvasClickForPath = (e: any) => {
    if (!drawingPath) return;
    const stage = e.target.getStage();
    const ptr = stage?.getPointerPosition();
    const world = pointerToWorld(ptr || null);
    if (!world) return;

    const pxX = world.x;
    const pxY = world.y;

    // check if clicked on a device
    const clickedDev = devices?.find((d) => {
      const dx = pxX - d.posPxX;
      const dy = pxY - d.posPxY;
      return Math.sqrt(dx * dx + dy * dy) < 40;
    });

    if (clickedDev && clickedDev.id !== drawingPath) {
      const newNodes = [
        ...pathNodes,
        {
          id: uniqueId(),
          posX: clickedDev.posX,
          posY: clickedDev.posY,
          posPxX: clickedDev.posPxX,
          posPxY: clickedDev.posPxY,
          deviceId: clickedDev.id,
        } as PathNodeType,
      ];

      // finalize the path pair generation if needed
      // original code cleared and cancelled drawing state
      setPathNodes([]);
      dispatch(DrawingDevicePath(''));
      return;
    }

    setPathNodes((prev) => [
      ...prev,
      {
        id: uuidv4(),
        posX: pxX * scale,
        posY: pxY * scale,
        posPxX: pxX,
        posPxY: pxY,
      } as PathNodeType,
    ]);
  };

  // Confirm dialog
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingDeviceId, setPendingDeviceId] = useState<string | null>(null);

  // Device drag end
  const handleDeviceDragEnd = (e: any, device: FloorplanDeviceType) => {
    let newPosX = e.target.x() + ICON_HALF;
    let newPosY = e.target.y() + ICON_HALF;

    if (isQHeldRef.current) {
      const stage = e.target.getStage();
      const ptr = stage?.getPointerPosition();
      const world = pointerToWorld(ptr || null);
      if (world) {
        const snapped = snapToNearestLine(world.x, world.y, device.id);
        if (snapped) {
          newPosX = snapped.x;
          newPosY = snapped.y;
          e.target.x(snapped.x - ICON_HALF);
          e.target.y(snapped.y - ICON_HALF);
        }
      }
    }

    const intersectedArea = areas.find(
      (a) => a.nodes && isPointInPolygon({ x: newPosX, y: newPosY }, a.nodes),
    );

    const newDevice = {
      ...device,
      floorplanMaskedAreaId: intersectedArea ? intersectedArea.id : '',
      deviceStatus: intersectedArea ? 'Active' : 'NonActive',
      posPxX: newPosX,
      posPxY: newPosY,
      posX: newPosX * scale,
      posY: newPosY * scale,
    };
    console.log("New device position:", newDevice);
    setIsDragging(false);
    setDeviceDragging(false);
    dispatch(editDevicePosition(newDevice));
  };

  // isPointInPolygon
  function isPointInPolygon(point: { x: number; y: number }, polygon: Nodes[]): boolean {
    if (!polygon || polygon.length === 0) return false;
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x_px,
        yi = polygon[i].y_px;
      const xj = polygon[j].x_px,
        yj = polygon[j].y_px;
      const intersect =
        yi > point.y !== yj > point.y &&
        point.x < ((xj - xi) * (point.y - yi)) / (yj - yi || 0.00001) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  // render device icon
  const renderDeviceIcon = (device: FloorplanDeviceType) => {
    const isActive = activeDevice?.id === device.id;
    const isEditing = editingDevice?.id === device.id;
    const statusActive = device.deviceStatus.toLowerCase() === 'active';
    const strokeColor = device.deviceStatus.toLowerCase() === 'active' ? 'lightgreen' : 'red';
    // Get appropriate icon
    let icon: HTMLImageElement | null = iconUnknown;
    switch (device.type) {
      case 'Cctv':
        icon = iconCCTV;
        break;
      case 'BleReader':
        icon = iconGateway;
        break;
      case 'AccessDoor':
        icon = iconFaceRecog;
        break;
      default:
        icon = iconUnknown;
    }

    const x = device.posPxX;
    const y = device.posPxY;

    const handlePathClick = () => {
      if (!isDrawingPath) return;
      if (!drawingPath) return;
      if (device.id === drawingPath) return;

      // Create the final node for the clicked device
      const finalNode: PathNodeType = {
        id: uuidv4(),
        posPxX: device.posPxX,
        posPxY: device.posPxY,
        posX: device.posX,
        posY: device.posY,
        deviceId: device.id,
      };

      // Add the final node to the path
      const completePath = [...pathNodes, finalNode];

      // Ensure we have at least 2 nodes (start and end)
      if (completePath.length < 2) {
        console.error('Path needs at least 2 nodes');
        return;
      }

      // Create reversed path for target device
      const reversedPath = [...completePath].reverse().map((node, index) => {
        const newNode = { ...node };
        // First node in reversed path gets target device ID
        if (index === 0) {
          newNode.deviceId = device.id;
        }
        // Last node in reversed path gets source device ID
        else if (index === completePath.length - 1) {
          newNode.deviceId = drawingPath;
        }
        return newNode;
      });

      // Use the new action for adding path pair
      dispatch(
        AddPathPairToUnsaved({
          forward: {
            deviceId: drawingPath,
            paths: completePath,
          },
          backward: {
            deviceId: device.id,
            paths: reversedPath,
          },
        }),
      );

      setPathNodes([]);
      dispatch(DrawingDevicePath(''));
    };

    const handleNormalClick = () => {
      if (isDrawingPath) return;
      if (isActive) return;
      if (editingDevice) {
        setPendingDeviceId(device.id);
        setConfirmDialogOpen(true);
        return;
      }
      dispatch(SelectFloorplanDevice(device.id));
    };

    const handleDragStart = (e: any) => {
      e.evt.stopPropagation();
      setIsDragging(true);
      setDeviceDragging(true);
      if (setCursor) setCursor('move');
    };

    const handleDragEnd = (e: any) => {
      e.evt.stopPropagation();
      if (!isDrawingPath) {
        handleDeviceDragEnd(e, device);
      }
    };

    const handleDragMove = (e: any) => {
      e.evt.stopPropagation();
      if (isQHeldRef.current) {
        const stage = e.target.getStage();
        const ptr = stage?.getPointerPosition();
        const world = pointerToWorld(ptr || null);
        if (world) {
          const snapped = snapToNearestLine(world.x, world.y, device.id);
          if (snapped) {
            e.target.x(snapped.x - ICON_HALF);
            e.target.y(snapped.y - ICON_HALF);
            setCursorWorld(snapped);
          }
        }
      }
    };

    return (
      <Group key={device.id}>
        {icon && (
          <KonvaImage
            image={icon}
            x={x - ICON_HALF}
            y={y - ICON_HALF}
            width={ICON_SIZE}
            height={ICON_SIZE}
            onClick={isDrawingPath ? undefined : handleNormalClick}
            draggable={isEditing && !isDrawingPath}
            onMouseEnter={() => {
              if (isEditing && !isDrawingPath && setCursor) {
                setCursor('move');
              }
            }}
            onMouseLeave={() => {
              if (isEditing && !isDrawingPath && setCursor) {
                setCursor('grab');
              }
            }}
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
            onMouseDown={(e) => {
              e.evt.stopPropagation();
            }}
            stroke={!statusActive ? 'red' : isActive ? 'lightgreen' : 'transparent'}
            strokeWidth={!statusActive ? 3 : isActive ? 5 : 0} 
          />
        )}
        {isDrawingPath && device.id !== drawingPath && (
          <Circle
            x={x}
            y={y}
            radius={26}
            stroke="yellow"
            strokeWidth={4}
            opacity={0.75}
            onClick={handlePathClick}
            onMouseDown={(e) => {
              e.evt.stopPropagation();
            }}
          />
        )}
      </Group>
    );
  };

  // helper to convert node into world points for Line
  const nodesToPoints = (nodes: Nodes[] | undefined) => {
    if (!nodes || nodes.length === 0) return [];
    return nodes.flatMap((n) => [n.x_px, n.y_px]);
  };

  // get node screen pos for drawing lines
  const getNodeWorldPos = (node: PathNodeType): { x: number; y: number } => {
    if (node.deviceId) {
      const dev = devices?.find((d) => d.id === node.deviceId);
      if (dev) {
        return { x: dev.posPxX, y: dev.posPxY };
      }
    }
    return { x: node.posPxX ?? 0, y: node.posPxY ?? 0 };
  };

  // track pointer world position for dashed line
  const handleStageMouseMove = (e: any) => {
    const stage = e.target.getStage();
    if (!stage) return;

    const ptr = stage.getPointerPosition();
    const world = pointerToWorld(ptr || null);
    if (world) {
      if (isQHeldRef.current) {
        const snapped = snapToNearestLine(world.x, world.y);
        if (snapped) {
          setCursorWorld(snapped);
        } else {
          setCursorWorld(world);
        }
      } else {
        setCursorWorld(world);
      }
    } else setCursorWorld(null);

    // Update cursor based on what's under the mouse
    if (setCursor && ptr) {
      const shape = stage.getIntersection(ptr);

      // If we're in editing mode and not over a shape, cursor should be 'grab'
      if (editingDevice && !shape && !isDrawingPath && !deviceDragging) {
        setCursor('grab');
      }
      // If not in editing mode and not over a shape, cursor should also be 'grab'
      else if (!editingDevice && !shape && !isDrawingPath && !deviceDragging) {
        setCursor('grab');
      }
      // Note: When over a shape (device), the device's onMouseEnter sets cursor to 'move'
    }
  };

  const handleRightClick = (e: any) => {
    e.evt.preventDefault();
    if (drawingPath) {
      dispatch(DrawingDevicePath(''));
      setPathNodes([]);
    }
  };

  const handleStageMouseDown = (e: any) => {
    if (editingDevice) {
      e.evt.stopPropagation();
    }
  };

  const imageToDraw = bgImage || previewImage;

  return (
    <>
      <div style={{ width, height }}>
        <Stage
          pixelRatio={1}
          width={width}
          height={height}
          ref={stageRef as any}
          scaleX={stageScale}
          scaleY={stageScale}
          x={stageX}
          y={stageY}
          onMouseMove={handleStageMouseMove}
          onClick={handleCanvasClickForPath}
          onContextMenu={handleRightClick}
          onWheel={onWheel}
          // onMouseDown={handleStageMouseDown}
        >
          {/* Background layer */}
          <FastLayer listening={false}>
            {imageToDraw && (
              <KonvaImage
                image={imageToDraw}
                width={originalWidth}
                height={originalHeight}
                // OPTIMIZATION: Use caching for large images
                {...(originalWidth > 3000
                  ? { listening: false, imageSmoothingEnabled: false }
                  : {})}
              />
            )}
          </FastLayer>

          {/* OPTIMIZED: Heatmap - render at scaled resolution */}
          {heatmapImage && showEffectiveArea && (
            <FastLayer>
              <KonvaImage
                image={heatmapImage}
                x={0}
                y={0}
                width={originalWidth}
                height={originalHeight}
                opacity={0.7} // Reduced opacity for better visibility
                listening={false}
                imageSmoothingEnabled={false} // Disable smoothing for better performance
              />
            </FastLayer>
          )}

          {/* Areas (polygons) */}
          <Layer listening={false}>
            {showAreas &&
              areas.map((area) => (
                <Line
                  key={area.id}
                  points={nodesToPoints(area.nodes)}
                  stroke={darken(area.colorArea, 0.5)}
                  strokeWidth={3} // Reduced stroke width
                  closed
                  fill={area.colorArea}
                  opacity={0.4} // Reduced opacity
                />
              ))}
          </Layer>

          {/* Drawing path (live) */}
          <Layer listening={false}>
            {/* solid segments */}
            {pathNodes.length > 1 &&
              pathNodes.map((n, i) => {
                if (i === pathNodes.length - 1) return null;
                const next = pathNodes[i + 1];
                const p1 = getNodeWorldPos(n);
                const p2 = getNodeWorldPos(next);
                return (
                  <Line
                    key={`seg-${i}`}
                    points={[p1.x, p1.y, p2.x, p2.y]}
                    stroke="yellow"
                    strokeWidth={2} // Reduced stroke width
                  />
                );
              })}

            {/* dashed line to cursor */}
            {pathNodes.length > 0 && cursorWorld && (
              <Line
                points={[
                  getNodeWorldPos(pathNodes[pathNodes.length - 1]).x,
                  getNodeWorldPos(pathNodes[pathNodes.length - 1]).y,
                  cursorWorld.x,
                  cursorWorld.y,
                ]}
                stroke="yellow"
                strokeWidth={1.5} // Reduced stroke width
                dash={[10, 5]}
                opacity={0.6} // Reduced opacity
              />
            )}

            {/* nodes */}
            {pathNodes.map((n, idx) => {
              const p = getNodeWorldPos(n);
              return (
                <Circle
                  key={n.id}
                  x={p.x}
                  y={p.y}
                  radius={idx === 0 ? 6 : 4} // Reduced radius
                  fill={idx === 0 ? 'green' : 'black'}
                  stroke="white"
                  strokeWidth={1} // Reduced stroke width
                />
              );
            })}
          </Layer>

          {/* Saved editing paths - OPTIMIZED: Only render when editing */}
          {editingDevice && (
            <Layer listening={false}>
              {editingPaths.map((pathObj: PathsType) =>
                pathObj.paths.map((node, i) => {
                  if (i === pathObj.paths.length - 1) return null;
                  const next = pathObj.paths[i + 1];
                  const p1 = getNodeWorldPos(node);
                  const p2 = getNodeWorldPos(next);
                  return (
                    <Line
                      key={`saved-${pathObj.id}-${i}`}
                      points={[p1.x, p1.y, p2.x, p2.y]}
                      stroke={pathObj.id === selectedPathId ? '#ff5500' : '#00e5ff'}
                      strokeWidth={3} // Reduced stroke width
                    />
                  );
                }),
              )}

              {editingPaths.flatMap((pathObj) =>
                pathObj.paths.map((node, idx) => {
                  const p = getNodeWorldPos(node);
                  return (
                    <Circle
                      key={`saved-node-${pathObj.id}-${node.id}`}
                      x={p.x}
                      y={p.y}
                      radius={idx === 0 ? 6 : 4} // Reduced radius
                      fill={idx === 0 ? 'cyan' : 'white'}
                      stroke="black"
                      strokeWidth={1} // Reduced stroke width
                    />
                  );
                }),
              )}
            </Layer>
          )}

          {/* Devices (interactive) */}
          <Layer>{devices.map((d) => renderDeviceIcon(d))}</Layer>

          {/* Magnetic snapping indicator */}
          {isQHeld && cursorWorld && (
            <Layer listening={false}>
              <Circle
                x={cursorWorld.x}
                y={cursorWorld.y}
                radius={6}
                fill="#00e676"
                stroke="#000"
                strokeWidth={1.5}
                listening={false}
              />
            </Layer>
          )}
        </Stage>
      </div>

      {/* Confirm dialog */}
      <Dialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Confirm Action</DialogTitle>
        <DialogContent>
          <DialogContentText>
            You are still in editing mode. Any editing progress will be cancelled. Proceed?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
          <Button
            color="error"
            onClick={() => {
              if (editingDevice?.id) {
                // Start editing the new device first
                dispatch(StartEditingDevice(pendingDeviceId || ''));
              }
              if (pendingDeviceId) {
                dispatch(SelectFloorplanDevice(pendingDeviceId));
                dispatch(SelectEditingFloorplanDevice(null));
              }
              setConfirmDialogOpen(false);
              setPendingDeviceId(null);
            }}
          >
            Proceed
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default EditDeviceRenderer;
