import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  lighten,
  darken,
} from '@mui/material';
import CCTVSVG from 'src/assets/images/svgs/devices/7.svg';
import GatewaySVG from 'src/assets/images/svgs/devices/BLE FIX ABU.svg';
import UnknownDevice from 'src/assets/images/masters/Devices/UnknownDevice.png';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Stage, Layer, Circle, Image as KonvaImage, Line, FastLayer, Group, Text, Rect } from 'react-konva';
import { useSelector, useDispatch, RootState } from 'src/store/Store';
import {
  MaskedAreaType,
  RevertMaskedArea,
  SelectEditingMaskedArea,
  SelectMaskedArea,
  AddUnsavedMaskedArea,
  DrawingMaskedArea,
  EditMaskedAreaPosition,
  EditUnsavedMaskedArea,
  parseTextBox,
  stringifyTextBox,
  TextBoxType,
} from 'src/store/apps/crud/maskedArea';
import earcut from 'earcut';
import { uniqueId } from 'lodash';
import toast from 'react-hot-toast';
import { FloorplanDeviceType, addDeviceToDisable, removeDeviceToDisable } from 'src/store/apps/crud/floorplanDevice';

type CollisionResult =
  | { collided: false }
  | { collided: true; type: 'self'; areaName?: string }
  | { collided: true; type: 'area'; withAreaName: string };


type Nodes = {
  id: string;
  x: number;
  y: number;
  x_px: number;
  y_px: number;
};



interface Props {
  width: number; // container width (viewport)
  height: number; // container height (viewport)
  originalWidth: number; // image natural width (world)
  originalHeight: number; // image natural height (world)
  imageSrc?: string;
  scale: number; // meter per pixel
  maskedAreas: MaskedAreaType[];
  activeMaskedArea?: MaskedAreaType | null;
  devices: FloorplanDeviceType[];
  showDevices: boolean;
  setIsDragging: (isDragging: string) => void;
  // setCursor: (cursor: string) => void;
  onAreaHoverChange: (areaHover: boolean) => void;
  onAreaDragChange: (areaDrag: boolean) => void;
  onOnArea: (onArea: boolean) => void;
  preview?: boolean;
  // Stage transform props (from parent)
  stageScale: number;
  stageX: number;
  stageY: number;
  stageRef?: React.RefObject<any>;
  onWheel?: (e: any) => void;
}

const EditAreaRenderer: React.FC<Props> = ({
  width,
  height,
  originalWidth,
  originalHeight,
  imageSrc,
  scale,
  maskedAreas,
  activeMaskedArea,
  devices,  
  showDevices,
  setIsDragging,
  onAreaHoverChange,
  onAreaDragChange,
  onOnArea,
  preview = false,
  stageScale,
  stageX,
  stageY,
  stageRef,
  onWheel,
}) => {
  const dispatch = useDispatch();

  const editingMaskedArea = useSelector(
    (state: RootState) => state.maskedAreaReducer.editingMaskedArea,
  );
  const unsavedArea: MaskedAreaType[] = useSelector(
    (state: RootState) => state.maskedAreaReducer.unsavedMaskedAreas,
  );
  const selectedFloorplan = useSelector(
    (state: RootState) => state.floorplanReducer.selectedFloorplan,
  );
  const drawingMaskedArea = useSelector(
    (state: RootState) => state.maskedAreaReducer.drawingMaskedArea,
  );

  const deviceToDisable = useSelector(
    (state: RootState) => state.floorplanDeviceReducer.deviceToDisable,
  );

  const [activeArea, setActiveArea] = useState(activeMaskedArea?.name || '');
  const [editingArea, setEditingArea] = useState(editingMaskedArea?.name || '');
  const [areaDragging, setAreaDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ dx: 0, dy: 0 });
  const [isColliding, setIsColliding] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingAreaId, setPendingAreaId] = useState<string | null>(null);
  const [cursorWorld, setCursorWorld] = useState<{ x: number; y: number } | null>(null);
  const [drawingNodes, setDrawingNodes] = useState<Nodes[]>([]);
  const [cornerDragData, setCornerDragData] = useState<{
    areaName: string;
    cornerIndex: number;
    originalX: number;
    originalY: number;
  } | null>(null);

  const activeCornerDragRef = React.useRef<{
    areaName: string;
    cornerIndex: number;
    nodeRef: any;
  } | null>(null);

  // Track area drag state
  const [draggingAreaName, setDraggingAreaName] = useState<string | null>(null);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });

  // Ref and state for hold-Q magnetic snapping mode
  const isQHeldRef = React.useRef(false);
  const [isQHeld, setIsQHeld] = useState(false);

  // State for W key toggle & Tab/E mode switch (hv vs parallel_perpendicular)
  const [guideLineShown, setGuideLineShown] = useState(false);
  const [guideLineMode, setGuideLineMode] = useState<'hv' | 'parallel_perpendicular'>('hv');

  const guideLineShownRef = React.useRef(false);
  useEffect(() => {
    guideLineShownRef.current = guideLineShown;
  }, [guideLineShown]);

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

      if (e.key === 'w' || e.key === 'W') {
        if (!e.repeat) {
          setGuideLineShown((prev) => !prev);
        }
      }

      if (e.key === 'Tab' || e.key === 'e' || e.key === 'E') {
        if (e.key === 'Tab') {
          e.preventDefault();
        }
        if (guideLineShownRef.current) {
          console.log("Changing GuideLine mode");
          setGuideLineMode((prev) => (prev === 'hv' ? 'parallel_perpendicular' : 'hv'));
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

  const filteredUnsavedArea = useMemo(
    () => unsavedArea.filter((area) => area.floorplanId === selectedFloorplan?.id),
    [unsavedArea, selectedFloorplan],
  );
  const renderAreas = useMemo(() => {
  const map = new Map<string, MaskedAreaType>();

  // 1. masukkan semua unsaved area
  filteredUnsavedArea.forEach((area) => {
    map.set(area.id, area);
  });

  // 2. override dengan editing area kalau ada
  if (editingMaskedArea) {
    map.set(editingMaskedArea.id, editingMaskedArea);
  }

  return Array.from(map.values());
}, [filteredUnsavedArea, editingMaskedArea]);

  // Helper to generate parallel and perpendicular infinite lines passing through P(px, py) relative to A(ax, ay)
  const createParallelAndPerpendicularLines = (
    px: number,
    py: number,
    ax: number,
    ay: number,
    prefix: string,
    maxX: number,
    maxY: number,
  ) => {
    const dx = px - ax;
    const dy = py - ay;
    const len = Math.hypot(dx, dy);
    const length = Math.max(maxX, maxY, 10000);

    if (len === 0) {
      return [
        { id: `${prefix}-h`, points: [0, py, maxX, py] },
        { id: `${prefix}-v`, points: [px, 0, px, maxY] },
      ];
    }

    const ux = dx / len;
    const uy = dy / len;
    const nx = -uy;
    const ny = ux;

    return [
      {
        id: `${prefix}-parallel`,
        points: [px - length * ux, py - length * uy, px + length * ux, py + length * uy],
      },
      {
        id: `${prefix}-perpendicular`,
        points: [px - length * nx, py - length * ny, px + length * nx, py + length * ny],
      },
    ];
  };

  // Virtual guide lines when W is toggled
  const guideLines = useMemo(() => {
    if (!guideLineShown) return [];

    const maxX = originalWidth || width || 10000;
    const maxY = originalHeight || height || 10000;

    // 1. Drawing Mode
    if (drawingMaskedArea) {
      if (drawingNodes.length === 0) {
        // First node (before placement): guide lines follow the moving cursor
        if (!cursorWorld) return [];
        return [
          { id: 'cursor-h', points: [0, cursorWorld.y, maxX, cursorWorld.y] },
          { id: 'cursor-v', points: [cursorWorld.x, 0, cursorWorld.x, maxY] },
        ];
      } else if (drawingNodes.length === 1) {
        // First node placed: guide lines from drawingNodes[0]
        const firstNode = drawingNodes[0];
        return [
          { id: 'first-h', points: [0, firstNode.y_px, maxX, firstNode.y_px] },
          { id: 'first-v', points: [firstNode.x_px, 0, firstNode.x_px, maxY] },
        ];
      } else {
        // Subsequent nodes (>1 placed): guide lines from first and last nodes
        const firstNode = drawingNodes[0];
        const lastNode = drawingNodes[drawingNodes.length - 1];

        if (guideLineMode === 'parallel_perpendicular') {
          const secondNode = drawingNodes[1];
          const secondLastNode = drawingNodes[drawingNodes.length - 2];
          return [
            ...createParallelAndPerpendicularLines(firstNode.x_px, firstNode.y_px, secondNode.x_px, secondNode.y_px, 'first', maxX, maxY),
            ...createParallelAndPerpendicularLines(lastNode.x_px, lastNode.y_px, secondLastNode.x_px, secondLastNode.y_px, 'last', maxX, maxY),
          ];
        }

        return [
          // first node lines
          { id: 'first-h', points: [0, firstNode.y_px, maxX, firstNode.y_px] },
          { id: 'first-v', points: [firstNode.x_px, 0, firstNode.x_px, maxY] },
          // last node lines
          { id: 'last-h', points: [0, lastNode.y_px, maxX, lastNode.y_px] },
          { id: 'last-v', points: [lastNode.x_px, 0, lastNode.x_px, maxY] },
        ];
      }
    }

    // 2. Editing/Moving Existing Node Mode
    const activeName = cornerDragData?.areaName || activeCornerDragRef.current?.areaName;
    const cornerIndex = cornerDragData?.cornerIndex ?? activeCornerDragRef.current?.cornerIndex;

    if (!activeName || cornerIndex === undefined) return [];

    const area = renderAreas.find((a) => a.name === activeName);
    if (!area?.nodes || area.nodes.length < 3) return [];

    const N = area.nodes.length;
    const prevIdx = (cornerIndex - 1 + N) % N;
    const nextIdx = (cornerIndex + 1) % N;

    const prevNode = area.nodes[prevIdx];
    const nextNode = area.nodes[nextIdx];

    if (guideLineMode === 'parallel_perpendicular') {
      const anchorPrevIdx = (prevIdx - 1 + N) % N;
      const anchorNextIdx = (nextIdx + 1) % N;

      const anchorPrev = area.nodes[anchorPrevIdx];
      const anchorNext = area.nodes[anchorNextIdx];

      return [
        ...createParallelAndPerpendicularLines(prevNode.x_px, prevNode.y_px, anchorPrev.x_px, anchorPrev.y_px, 'prev', maxX, maxY),
        ...createParallelAndPerpendicularLines(nextNode.x_px, nextNode.y_px, anchorNext.x_px, anchorNext.y_px, 'next', maxX, maxY),
      ];
    }

    return [
      // prevNode (node[n-1]) lines
      { id: 'prev-h', points: [0, prevNode.y_px, maxX, prevNode.y_px] },
      { id: 'prev-v', points: [prevNode.x_px, 0, prevNode.x_px, maxY] },
      // nextNode (node[n+1]) lines
      { id: 'next-h', points: [0, nextNode.y_px, maxX, nextNode.y_px] },
      { id: 'next-v', points: [nextNode.x_px, 0, nextNode.x_px, maxY] },
    ];
  }, [
    guideLineShown,
    guideLineMode,
    drawingMaskedArea,
    drawingNodes,
    cursorWorld,
    cornerDragData,
    editingArea,
    activeArea,
    renderAreas,
    originalWidth,
    originalHeight,
    width,
    height,
  ]);

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

  // Helper: Snap position (px, py) to nearest virtual line or line-line intersection point (100px sensitivity)
  const snapToNearestLine = useCallback(
    (px: number, py: number, currentAreaName?: string, currentCornerIndex?: number) => {
      const sensitivityRadius = 100; // 100 pixel sensitivity threshold for single line snap
      const intersectionRadius = 15; // 15 pixel sensitivity threshold for line-line intersection snap
      type LineSegment = { x1: number; y1: number; x2: number; y2: number };
      const allLines: LineSegment[] = [];

      // 1. Collect area edge segments
      for (const area of renderAreas) {
        if (!area.nodes || area.nodes.length < 2) continue;

        const numNodes = area.nodes.length;
        for (let i = 0; i < numNodes; i++) {
          // If dragging a corner of current area, skip the 2 adjacent edges connected to this corner node
          if (area.name === currentAreaName && currentCornerIndex !== undefined) {
            const prevIndex = (currentCornerIndex - 1 + numNodes) % numNodes;
            if (i === currentCornerIndex || i === prevIndex) continue;
          }

          const n1 = area.nodes[i];
          const n2 = area.nodes[(i + 1) % numNodes];
          allLines.push({ x1: n1.x_px, y1: n1.y_px, x2: n2.x_px, y2: n2.y_px });
        }
      }

      // 2. Collect active guide lines
      if (guideLineShown && guideLines.length > 0) {
        for (const gLine of guideLines) {
          if (gLine.points.length >= 4) {
            allLines.push({
              x1: gLine.points[0],
              y1: gLine.points[1],
              x2: gLine.points[2],
              y2: gLine.points[3],
            });
          }
        }
      }

      // 3. Prioritize line-line intersection points within 15px release radius
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
            const dist = Math.hypot(px - intersection.x, py - intersection.y);
            if (dist <= minIntersectionDist) {
              minIntersectionDist = dist;
              bestIntersectionPos = intersection;
            }
          }
        }
      }

      if (bestIntersectionPos) {
        return bestIntersectionPos;
      }

      // 4. Fallback: Snap to nearest point on any single line segment
      let minLineDist = sensitivityRadius;
      let bestLinePos: { x: number; y: number } | null = null;

      for (const line of allLines) {
        const closest = getClosestPointOnSegment(px, py, line.x1, line.y1, line.x2, line.y2);
        const dist = Math.hypot(px - closest.x, py - closest.y);

        if (dist <= minLineDist) {
          minLineDist = dist;
          bestLinePos = closest;
        }
      }

      return bestLinePos;
    },
    [renderAreas, guideLineShown, guideLines],
  );


  // background images
  const [bgImage, setBgImage] = useState<HTMLImageElement | undefined>(undefined);
  const [previewImage, setPreviewImage] = useState<HTMLImageElement | undefined>(undefined);

  const pointToSegmentDistance = (
    px: number,
    py: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
  ): number => {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const len_sq = C * C + D * D;
    let param = -1;
    if (len_sq !== 0) param = dot / len_sq;

    let xx, yy;

    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const isPointOnEdge = useCallback((px: number, py: number, nodes: Nodes[], tolerance = 0.5): boolean => {
    for (let i = 0; i < nodes.length; i++) {
      const n1 = nodes[i];
      const n2 = nodes[(i + 1) % nodes.length];
      const dist = pointToSegmentDistance(px, py, n1.x_px, n1.y_px, n2.x_px, n2.y_px);
      if (dist <= tolerance) return true;
    }
    return false;
  }, []);

  // ----------- device-out-of-area detection -----------
  // Stable ray-casting helper (no closure dependencies — pure math)
  const pointInPolygon = useCallback((px: number, py: number, nodes: Nodes[]): boolean => {
    if (isPointOnEdge(px, py, nodes)) return false;
    let inside = false;
    for (let i = 0, j = nodes.length - 1; i < nodes.length; j = i++) {
      const xi = nodes[i].x_px, yi = nodes[i].y_px;
      const xj = nodes[j].x_px, yj = nodes[j].y_px;
      const intersect = (yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }, [isPointOnEdge]);

  // Build an area-id → nodes map once per renderAreas change for O(1) lookup.
  const areaNodesMap = useMemo(() => {
    const map = new Map<string, Nodes[]>();
    renderAreas.forEach((area) => {
      if (area.nodes && area.nodes.length >= 3) map.set(area.id, area.nodes);
    });
    return map;
  }, [renderAreas]);

  // Main check: runs whenever devices or areas change.
  useEffect(() => {
    devices.forEach((device) => {
      // Only check devices that are assigned to a masked area.
      if (!device.floorplanMaskedAreaId) return;

      const nodes = areaNodesMap.get(device.floorplanMaskedAreaId);
      const currentlyDisabled = deviceToDisable.includes(device.id);

      if (!nodes) {
        // Area not found in current render set — treat as outside.
        if (!currentlyDisabled) dispatch(addDeviceToDisable(device.id));
        return;
      }

      const inside = pointInPolygon(device.posPxX, device.posPxY, nodes);

      if (!inside && !currentlyDisabled) {
        dispatch(addDeviceToDisable(device.id));
      } else if (inside && currentlyDisabled) {
        dispatch(removeDeviceToDisable(device.id));
      }
    });
  }, [devices, areaNodesMap, pointInPolygon, deviceToDisable, dispatch]);

  // ----------- helpers: pointer -> world coords (image pixels) -----------
  const pointerToWorld = useCallback(
    (pointer: { x: number; y: number } | null) => {
      if (!pointer) return null;
      return { x: (pointer.x - stageX) / stageScale, y: (pointer.y - stageY) / stageScale };
    },
    [stageScale, stageX, stageY],
  );

  // ----------- load background images -----------
  useEffect(() => {
    if (!imageSrc) {
      setPreviewImage(undefined);
      setBgImage(undefined);
      return;
    }

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
      const f = new window.Image();
      f.crossOrigin = 'anonymous';
      f.src = imageSrc;
      f.onload = () => setBgImage(f);
    };
  }, [imageSrc]);

  // ----------- active/editing area state sync -----------
  useEffect(() => {
    setActiveArea(activeMaskedArea?.name || '');
  }, [activeMaskedArea]);

  useEffect(() => {
    setEditingArea(editingMaskedArea?.name || '');
  }, [editingMaskedArea]);

  // ----------- cursor style management -----------
  // useEffect(() => {
  //   if (drawingMaskedArea !== '') {
  //     setCursor('crosshair');
  //   } else {
  //     setCursor('default');
  //   }
  // }, [drawingMaskedArea, setCursor]);

  // ----------- collision detection helpers -----------
  type Point = { x: number; y: number };
  type Triangle = [Point, Point, Point];

  const triangulate = (vertices: number[]): Triangle[] => {
    const indices = earcut(vertices);
    const triangles: Triangle[] = [];
    for (let i = 0; i < indices.length; i += 3) {
      const triangle: Triangle = [
        { x: vertices[indices[i] * 2], y: vertices[indices[i] * 2 + 1] },
        { x: vertices[indices[i + 1] * 2], y: vertices[indices[i + 1] * 2 + 1] },
        { x: vertices[indices[i + 2] * 2], y: vertices[indices[i + 2] * 2 + 1] },
      ];
      triangles.push(triangle);
    }
    return triangles;
  };

  const checkTriangleCollision = (triA: Triangle, triB: Triangle): boolean => {
    const axes: Point[] = [];
    const epsilon = 0.0001;

    const project = (triangle: Triangle, axis: Point): { min: number; max: number } => {
      let min = Infinity;
      let max = -Infinity;
      for (const point of triangle) {
        const proj = point.x * axis.x + point.y * axis.y;
        min = Math.min(min, proj);
        max = Math.max(max, proj);
      }
      return { min, max };
    };

    for (let i = 0; i < 3; i++) {
      const p1 = triA[i];
      const p2 = triA[(i + 1) % 3];
      const edge = { x: p2.x - p1.x, y: p2.y - p1.y };
      const normal = { x: -edge.y, y: edge.x };
      const length = Math.sqrt(normal.x ** 2 + normal.y ** 2);
      if (length > epsilon) {
        axes.push({ x: normal.x / length, y: normal.y / length });
      }
    }

    for (let i = 0; i < 3; i++) {
      const p1 = triB[i];
      const p2 = triB[(i + 1) % 3];
      const edge = { x: p2.x - p1.x, y: p2.y - p1.y };
      const normal = { x: -edge.y, y: edge.x };
      const length = Math.sqrt(normal.x ** 2 + normal.y ** 2);
      if (length > epsilon) {
        axes.push({ x: normal.x / length, y: normal.y / length });
      }
    }

    for (const axis of axes) {
      const projA = project(triA, axis);
      const projB = project(triB, axis);

      // Separating axis exists if projections do not penetrate each other's interior.
      // Boundary touching (projA.max == projB.min) within epsilon tolerance is allowed.
      if (projA.max <= projB.min + epsilon || projB.max <= projA.min + epsilon) {
        return false;
      }
    }

    return true;
  };

  const nodesToVertices = (nodes: Nodes[]): number[] => {
    return nodes.flatMap((node) => [node.x_px, node.y_px]);
  };

  const checkPolygonCollision = (poly1: { nodes: Nodes[] }, poly2: { nodes: Nodes[] }): boolean => {
    const vertices1 = nodesToVertices(poly1.nodes);
    const vertices2 = nodesToVertices(poly2.nodes);

    const triangles1 = triangulate(vertices1);
    const triangles2 = triangulate(vertices2);

    for (const tri1 of triangles1) {
      for (const tri2 of triangles2) {
        if (checkTriangleCollision(tri1, tri2)) {
          return true;
        }
      }
    }

    if (checkSelfIntersections(poly1.nodes)) return true;
    if (checkSelfIntersections(poly2.nodes)) return true;

    return false;
  };
  const checkPolygonCollisionDetailed = (
  poly1: { nodes: Nodes[]; name: string },
  poly2: { nodes: Nodes[]; name: string },
): CollisionResult => {
  const vertices1 = nodesToVertices(poly1.nodes);
  const vertices2 = nodesToVertices(poly2.nodes);

  const triangles1 = triangulate(vertices1);
  const triangles2 = triangulate(vertices2);

  for (const tri1 of triangles1) {
    for (const tri2 of triangles2) {
      if (checkTriangleCollision(tri1, tri2)) {
        return {
          collided: true,
          type: 'area',
          withAreaName: poly2.name,
        };
      }
    }
  }

  // self-intersection poly1
  if (checkSelfIntersections(poly1.nodes)) {
    return {
      collided: true,
      type: 'self',
      areaName: poly1.name,
    };
  }

  return { collided: false };
};


  const checkSelfIntersections = (nodes: Nodes[]): boolean => {
    const n = nodes.length;
    for (let i = 0; i < n; i++) {
      const x1 = nodes[i].x_px;
      const y1 = nodes[i].y_px;
      const x2 = nodes[(i + 1) % n].x_px;
      const y2 = nodes[(i + 1) % n].y_px;

      for (let j = i + 2; j < n; j++) {
        if (j === i || (j + 1) % n === i) continue;

        const x3 = nodes[j].x_px;
        const y3 = nodes[j].y_px;
        const x4 = nodes[(j + 1) % n].x_px;
        const y4 = nodes[(j + 1) % n].y_px;

        if (doLineSegmentsIntersect(x1, y1, x2, y2, x3, y3, x4, y4)) {
          return true;
        }
      }
    }
    return false;
  };

  const doLineSegmentsIntersect = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number,
    x4: number,
    y4: number,
    allowEndpointTouch = true,
  ): boolean => {
    const orientation = (
      px1: number,
      py1: number,
      px2: number,
      py2: number,
      px3: number,
      py3: number,
    ) => {
      const val = (py2 - py1) * (px3 - px2) - (px2 - px1) * (py3 - py2);
      if (Math.abs(val) < 1e-5) return 0;
      return val > 0 ? 1 : 2;
    };

    const onSegment = (px: number, py: number, qx: number, qy: number, rx: number, ry: number) => {
      return (
        qx <= Math.max(px, rx) + 1e-5 &&
        qx >= Math.min(px, rx) - 1e-5 &&
        qy <= Math.max(py, ry) + 1e-5 &&
        qy >= Math.min(py, ry) - 1e-5
      );
    };

    const o1 = orientation(x1, y1, x2, y2, x3, y3);
    const o2 = orientation(x1, y1, x2, y2, x4, y4);
    const o3 = orientation(x3, y3, x4, y4, x1, y1);
    const o4 = orientation(x3, y3, x4, y4, x2, y2);

    // Strict interior crossing (neither segment endpoint lies on the other line)
    if (o1 !== 0 && o2 !== 0 && o3 !== 0 && o4 !== 0 && o1 !== o2 && o3 !== o4) {
      return true;
    }

    if (!allowEndpointTouch) {
      if (o1 === 0 && onSegment(x1, y1, x3, y3, x2, y2)) return true;
      if (o2 === 0 && onSegment(x1, y1, x4, y4, x2, y2)) return true;
      if (o3 === 0 && onSegment(x3, y3, x1, y1, x4, y4)) return true;
      if (o4 === 0 && onSegment(x3, y3, x2, y2, x4, y4)) return true;
    }

    return false;
  };

  // const checkCollisionWithOffset = (areaName: string, dx: number, dy: number): boolean => {
  //   const currentArea = filteredUnsavedArea.find((a) => a.name === areaName);
  //   if (!currentArea || !currentArea.nodes) return false;

  //   const proposedArea = {
  //     nodes: currentArea.nodes.map((node) => ({
  //       ...node,
  //       x: node.x + dx * scale,
  //       y: node.y + dy * scale,
  //       x_px: node.x_px + dx,
  //       y_px: node.y_px + dy,
  //     })),
  //   };

  //   return filteredUnsavedArea.some((otherArea) => {
  //     if (otherArea.name === areaName) return false;
  //     if (!otherArea.nodes) return false;
  //     return checkPolygonCollision(proposedArea, { nodes: otherArea.nodes });
  //   });
  // };

  const checkCollisionWithOffset = (
  areaName: string,
  dx: number,
  dy: number,
): boolean => {
  const currentArea = renderAreas.find((a) => a.name === areaName);
  if (!currentArea || !currentArea.nodes) return false;

  const proposedArea = {
    name: areaName,
    nodes: currentArea.nodes.map((node) => ({
      ...node,
      x: node.x + dx * scale,
      y: node.y + dy * scale,
      x_px: node.x_px + dx,
      y_px: node.y_px + dy,
    })),
  };

  for (const otherArea of renderAreas) {
    if (otherArea.name === areaName || !otherArea.nodes) continue;

    const result = checkPolygonCollisionDetailed(
      proposedArea,
      { nodes: otherArea.nodes, name: otherArea.name },
    );

    if (result.collided) {
      if (result.type === 'area') {
        console.log(
          `Collision detected: ${areaName} <-> ${result.withAreaName}`,
        );
      }
      return true;
    }
  }

  // self collision
  if (checkSelfIntersections(proposedArea.nodes)) {
    console.log(`Colliding with self, ${areaName}`);
    return true;
  }

  return false;
};


  const checkCornerDragCollision = useCallback(
    (
      areaName: string,
      cornerIndex: number,
      newX: number,
      newY: number,
    ): boolean => {
      const currentArea = renderAreas.find((a) => a.name === areaName);
      if (!currentArea || !currentArea.nodes) return false;

      const proposedNodes = currentArea.nodes.map((node, index) =>
        index === cornerIndex
          ? { ...node, x: newX * scale, y: newY * scale, x_px: newX, y_px: newY }
          : node,
      );

      if (checkSelfIntersections(proposedNodes)) {
        return true;
      }

      const proposedArea = { name: areaName, nodes: proposedNodes };
      for (const otherArea of renderAreas) {
        if (otherArea.name === areaName || !otherArea.nodes || otherArea.nodes.length < 3) continue;
        const result = checkPolygonCollisionDetailed(proposedArea, {
          name: otherArea.name,
          nodes: otherArea.nodes,
        });
        if (result.collided) return true;
      }

      return false;
    },
    [renderAreas, scale, checkSelfIntersections, checkPolygonCollisionDetailed],
  );



  const placeDrawingNode = useCallback(
    (x: number, y: number) => {
      if (!drawingMaskedArea) return;

      const newNode = {
        id: uniqueId(),
        x: x * scale,
        y: y * scale,
        x_px: x,
        y_px: y,
      };

      setDrawingNodes((prevNodes) => {
        const potentialNodes = [...prevNodes, newNode];

        // Self-intersection check when drawing (requires at least 4 nodes for a self-intersecting polygon)
        if (potentialNodes.length >= 4) {
          if (checkSelfIntersections(potentialNodes)) {
            toast.error('Cannot place node: Area intersects with itself!');
            return prevNodes;
          }
        }

        // Collision check with other existing areas for ANY node placement (1st, 2nd, 3rd, etc.)
        for (const otherArea of renderAreas) {
          if (otherArea.name === drawingMaskedArea || !otherArea.nodes || otherArea.nodes.length < 3) continue;

          // 1. Check if the newly clicked point itself is inside any existing area
          if (pointInPolygon(newNode.x_px, newNode.y_px, otherArea.nodes)) {
            toast.error(`Cannot place node: Point is inside area "${otherArea.name}"!`);
            return prevNodes;
          }

          // 2. If there's a previous node, check if the segment (prevNode -> newNode) intersects any edge of the existing area
          if (prevNodes.length > 0) {
            const lastNode = prevNodes[prevNodes.length - 1];
            const numOther = otherArea.nodes.length;
            for (let i = 0; i < numOther; i++) {
              const edgeStart = otherArea.nodes[i];
              const edgeEnd = otherArea.nodes[(i + 1) % numOther];
              if (
                doLineSegmentsIntersect(
                  lastNode.x_px,
                  lastNode.y_px,
                  newNode.x_px,
                  newNode.y_px,
                  edgeStart.x_px,
                  edgeStart.y_px,
                  edgeEnd.x_px,
                  edgeEnd.y_px,
                )
              ) {
                toast.error(`Cannot place node: Line passes through area "${otherArea.name}"!`);
                return prevNodes;
              }
            }
          }

          // 3. For 3+ nodes, also run full polygon-to-polygon collision check
          if (potentialNodes.length >= 3) {
            const proposedPoly = { name: drawingMaskedArea, nodes: potentialNodes };
            const res = checkPolygonCollisionDetailed(proposedPoly, {
              name: otherArea.name,
              nodes: otherArea.nodes,
            });
            if (res.collided) {
              const otherName = res.type === 'area' ? res.withAreaName : 'another area';
              toast.error(`Cannot place node: Area collides with ${otherName}!`);
              return prevNodes;
            }
          }
        }

        if (prevNodes.length >= 3) {
          const first = prevNodes[0];
          const dist = Math.hypot(first.x_px - newNode.x_px, first.y_px - newNode.y_px);
          if (dist < 15) {
            const newArea: MaskedAreaType = {
              id: drawingMaskedArea,
              name: drawingMaskedArea,
              colorArea: '#FF4D4F',
              areaShape: JSON.stringify(prevNodes),
              areaNameTextBox: '',
              occupancyNameTextBox: '',
              restrictedStatus: '',
              allowFloorChange: false,
              labels: [],
              isAssemblyPoint: false,
              nodes: prevNodes,
              floorId: selectedFloorplan?.floorId || '',
              floorplanId: selectedFloorplan?.id || '',
              createdBy: 'admin',
              createdAt: new Date().toISOString(),
              updatedBy: 'admin',
              updatedAt: new Date().toISOString(),
            };

            (async () => {
              // await dispatch(AddUnsavedMaskedArea(newArea));
              await dispatch(SelectEditingMaskedArea(newArea));
              dispatch(DrawingMaskedArea(''));
              dispatch(SelectMaskedArea(newArea.id));
              
              setActiveArea(newArea.name);
              setDrawingNodes([]);
            })();

            return [];
          }
        }

        return potentialNodes;
      });
    },
    [
      drawingMaskedArea,
      scale,
      selectedFloorplan,
      dispatch,
      renderAreas,
      checkSelfIntersections,
      checkPolygonCollisionDetailed,
      pointInPolygon,
      doLineSegmentsIntersect,
    ],
  );

  // ----------- event handlers -----------
  const handleCanvasClick = useCallback(
    (e: any) => {
      if (!drawingMaskedArea) return;
      const stage = e.target.getStage();
      const ptr = stage?.getPointerPosition();
      const world = (isQHeldRef.current && cursorWorld) ? cursorWorld : pointerToWorld(ptr || null);
      if (!world) return;

      placeDrawingNode(world.x, world.y);
    },
    [drawingMaskedArea, cursorWorld, pointerToWorld, placeDrawingNode],
  );

  const handleOnClick = useCallback(
    (id: string) => {
      if (drawingMaskedArea) return;
      const active = maskedAreas?.find((area) => area.id === id);
      if (activeArea === active?.name) return;
      if (editingArea) {
        setPendingAreaId(id);
        setConfirmDialogOpen(true);
        // setCursor('move');
        onAreaHoverChange(true);
        return;
      }
      dispatch(SelectMaskedArea(id));
    },
    [drawingMaskedArea, maskedAreas, activeArea, editingArea, dispatch],
  );

  // FIXED: handleDragStart - track the starting position
  const handleDragStart = useCallback(
    (areaName: string, e: any) => {
      if (drawingMaskedArea) return;
      setIsDragging(areaName);
      setDraggingAreaName(areaName);
      setDragOffset({ dx: 0, dy: 0 });
      setIsColliding(false);
      setAreaDragging(true);

      // Get the current pointer position in world coordinates
      const stage = e.target.getStage();
      const ptr = stage?.getPointerPosition();
      const world = pointerToWorld(ptr || null);
      if (world) {
        setDragStartPos({ x: world.x, y: world.y });
      }
    },
    [drawingMaskedArea, setIsDragging, pointerToWorld],
  );

  // FIXED: handleDragEnd - clear dragging state and apply movement
  const handleDragEnd = useCallback(
    async (areaName: string, e: any) => {
      if (draggingAreaName !== areaName) return;

      const stage = e.target.getStage();
      const ptr = stage?.getPointerPosition();
      const world = pointerToWorld(ptr || null);

      if (world && dragStartPos) {
        const dx = world.x - dragStartPos.x;
        const dy = world.y - dragStartPos.y;

        const collision = checkCollisionWithOffset(areaName, dx, dy);
        setIsColliding(collision);

        if (collision) {
          // alert('Areas cannot overlap! Position reverted.');
          toast.error('Areas cannot overlap! Position reverted.');
        } else if (dx !== 0 || dy !== 0) {
          await handleDragArea(areaName, dx, dy);
        }
      }

      // Clear the dragging state
      setIsDragging('');
      setDraggingAreaName(null);
      setAreaDragging(false);
      setDragOffset({ dx: 0, dy: 0 });
      setIsColliding(false);
      setDragStartPos({ x: 0, y: 0 });

      // Reset the Konva shape position to 0 (since we're moving the area by updating nodes)
      e.target.x(0);
      e.target.y(0);
    },
    [draggingAreaName, pointerToWorld, dragStartPos, setIsDragging],
  );

  const handleDragArea = useCallback(
    (areaName: string, dx: number, dy: number) => {
      const updatedAreas = renderAreas.map((area) =>
        area.name === areaName
          ? {
              ...area,
              nodes: area.nodes?.map((node) => ({
                ...node,
                x: node.x + dx * scale,
                y: node.y + dy * scale,
                x_px: node.x_px + dx,
                y_px: node.y_px + dy,
              })),
              areaShape: JSON.stringify(
                area.nodes?.map((node) => ({
                  ...node,
                  x: node.x + dx * scale,
                  y: node.y + dy * scale,
                  x_px: node.x_px + dx,
                  y_px: node.y_px + dy,
                })),
              ),
            }
          : area,
      );

      const updatedArea = updatedAreas.find((area) => area.name === areaName);
      if (updatedArea) {
        dispatch(EditMaskedAreaPosition(updatedArea));
      }
    },
    [renderAreas, scale, dispatch],
  );

  const handleCornerDragStart = useCallback(
    (areaName: string, cornerIndex: number, e: any) => {
      const area = renderAreas.find((a) => a.name === areaName);
      if (!area || !area.nodes) return;

      const corner = area.nodes[cornerIndex];
      if (!corner) return;

      activeCornerDragRef.current = {
        areaName,
        cornerIndex,
        nodeRef: e.target,
      };

      setCornerDragData({
        areaName,
        cornerIndex,
        originalX: corner.x_px,
        originalY: corner.y_px,
      });
      setIsDragging(areaName);
      setDraggingAreaName(areaName);
    },
    [renderAreas, setIsDragging],
  );

  const handleDragCorner = useCallback(
    (areaName: string, cornerIndex: number, x: number, y: number) => {
      const updatedAreas = renderAreas.map((area) => {
        if (area.name !== areaName || !area.nodes) return area;

        const newNodes = [...area.nodes];
        newNodes[cornerIndex] = {
          ...newNodes[cornerIndex],
          x: x * scale,
          y: y * scale,
          x_px: x,
          y_px: y,
        };

        return { ...area, nodes: newNodes, areaShape: JSON.stringify(newNodes) };
      });

      const updatedArea = updatedAreas.find((area) => area.name === areaName);
      if (updatedArea) {
        dispatch(EditMaskedAreaPosition(updatedArea));
      }
    },
    [renderAreas, scale, dispatch],
  );



  const handleCornerDragEnd = useCallback(
    (areaName: string, cornerIndex: number, x: number, y: number) => {
      activeCornerDragRef.current = null;
      const area = renderAreas.find((a) => a.name === areaName);
      if (!area || !area.nodes) return;

      const proposedNodes = [...area.nodes];
      proposedNodes[cornerIndex] = { ...proposedNodes[cornerIndex], x: x * scale, y: y * scale };

      const hasCollision = renderAreas.some((otherArea) => {
        if (otherArea.name === areaName || !otherArea.nodes) return false;
        return checkPolygonCollision({ nodes: proposedNodes }, { nodes: otherArea.nodes });
      });

      if (hasCollision && cornerDragData) {
        toast.error('Areas cannot overlap! Position reverted.');
        handleDragCorner(
          cornerDragData.areaName,
          cornerDragData.cornerIndex,
          cornerDragData.originalX,
          cornerDragData.originalY,
        );
      } else {
        handleDragCorner(areaName, cornerIndex, x, y);
      }

      setCornerDragData(null);
      setIsColliding(false);
      setIsDragging(''); // Clear dragging state
      setDraggingAreaName(null);
    },
    [cornerDragData, renderAreas, scale, handleDragCorner, setIsDragging],
  );

  const handleDeleteCorner = useCallback(
    (areaName: string, cornerIndex: number) => {
      const updatedAreas = renderAreas.map((area) => {
        if (area.name !== areaName || !area.nodes) return area;

        const newNodes = [...area.nodes];
        newNodes.splice(cornerIndex, 1);
        return { ...area, nodes: newNodes, areaShape: JSON.stringify(newNodes) };
      });

      const updatedArea = updatedAreas.find((area) => area.name === areaName);
      if (updatedArea) {
        dispatch(EditMaskedAreaPosition(updatedArea));
      }
    },
    [renderAreas, dispatch],
  );

  const handleInsertCorner = useCallback(
    (areaName: string, clickX: number, clickY: number) => {
      const area = renderAreas.find((a) => a.name === areaName);
      if (!area || !area.nodes) return;

      let insertIndex = -1;
      let minDistance = Infinity;

      for (let i = 0; i < area.nodes.length; i++) {
        const nextIndex = (i + 1) % area.nodes.length;
        const distance = pointToSegmentDistance(
          clickX,
          clickY,
          area.nodes[i].x_px,
          area.nodes[i].y_px,
          area.nodes[nextIndex].x_px,
          area.nodes[nextIndex].y_px,
        );

        if (distance < minDistance) {
          minDistance = distance;
          insertIndex = nextIndex;
        }
      }

      const newNodes = [...area.nodes];
      newNodes.splice(insertIndex, 0, {
        id: uniqueId(),
        x: clickX * scale,
        y: clickY * scale,
        x_px: clickX,
        y_px: clickY,
      });

      const updatedArea = { ...area, nodes: newNodes };
      dispatch(EditMaskedAreaPosition(updatedArea));
    },
    [renderAreas, scale, dispatch],
  );


  const handleRightClick = useCallback(
    (e: any) => {
      e.evt.preventDefault();
      if (!drawingMaskedArea) return;

      setDrawingNodes([]);
      dispatch(DrawingMaskedArea(''));
      dispatch(SelectMaskedArea(''));
      dispatch(SelectEditingMaskedArea(null));
      setActiveArea('');
    },
    [drawingMaskedArea, dispatch],
  );

  const handleStageMouseMove = useCallback(
    (e: any) => {
      const stage = e.target.getStage();
      if (!stage) return;

      const ptr = stage.getPointerPosition();
      const world = pointerToWorld(ptr || null);

      if (world) {
        if (isQHeldRef.current && drawingMaskedArea) {
          const snapped = snapToNearestLine(world.x, world.y, drawingMaskedArea);
          if (snapped) {
            const candidateNode = {
              id: 'candidate',
              x: snapped.x * scale,
              y: snapped.y * scale,
              x_px: snapped.x,
              y_px: snapped.y,
            };
            const potentialNodes = [...drawingNodes, candidateNode];
            let hasCollision = false;

            if (potentialNodes.length >= 4 && checkSelfIntersections(potentialNodes)) {
              hasCollision = true;
            }

            if (!hasCollision) {
              for (const otherArea of renderAreas) {
                if (otherArea.name === drawingMaskedArea || !otherArea.nodes || otherArea.nodes.length < 3) continue;

                if (pointInPolygon(snapped.x, snapped.y, otherArea.nodes)) {
                  hasCollision = true;
                  break;
                }

                if (drawingNodes.length > 0) {
                  const lastNode = drawingNodes[drawingNodes.length - 1];
                  const numOther = otherArea.nodes.length;
                  for (let i = 0; i < numOther; i++) {
                    const edgeStart = otherArea.nodes[i];
                    const edgeEnd = otherArea.nodes[(i + 1) % numOther];
                    if (
                      doLineSegmentsIntersect(
                        lastNode.x_px,
                        lastNode.y_px,
                        snapped.x,
                        snapped.y,
                        edgeStart.x_px,
                        edgeStart.y_px,
                        edgeEnd.x_px,
                        edgeEnd.y_px,
                      )
                    ) {
                      hasCollision = true;
                      break;
                    }
                  }
                }

                if (potentialNodes.length >= 3) {
                  const res = checkPolygonCollisionDetailed(
                    { name: drawingMaskedArea, nodes: potentialNodes },
                    { name: otherArea.name, nodes: otherArea.nodes },
                  );
                  if (res.collided) {
                    hasCollision = true;
                    break;
                  }
                }
              }
            }

            if (!hasCollision) {
              setCursorWorld({ x: snapped.x, y: snapped.y });
            } else {
              setCursorWorld(world);
            }
          } else {
            setCursorWorld(world);
          }
        } else if (isQHeldRef.current) {
          const currentAreaName = activeCornerDragRef.current?.areaName;
          const currentCornerIndex = activeCornerDragRef.current?.cornerIndex;
          const snapped = snapToNearestLine(world.x, world.y, currentAreaName, currentCornerIndex);
          if (snapped) {
            setCursorWorld({ x: snapped.x, y: snapped.y });
          } else {
            setCursorWorld(world);
          }
        } else {
          setCursorWorld(world);
        }
      } else {
        setCursorWorld(null);
      }

      // Also update cursor based on what's under the mouse
      if (stage) {
        const pointer = stage.getPointerPosition();
        if (pointer) {
          const shape = stage.getIntersection(pointer);

          // If there's no shape under the mouse, ensure we reset area-specific hover states
          if (!shape && !drawingMaskedArea) {
            onAreaHoverChange(false);
            onOnArea(false);
          }
        }
      }
    },
    [
      pointerToWorld,
      drawingMaskedArea,
      drawingNodes,
      renderAreas,
      scale,
      snapToNearestLine,
      checkSelfIntersections,
      pointInPolygon,
      doLineSegmentsIntersect,
      checkPolygonCollisionDetailed,
      onAreaHoverChange,
      onOnArea,
    ],
  );

  const isPointInPolygon = useCallback((point: { x: number; y: number }, vs?: Nodes[]): boolean => {
    if (!vs || vs.length < 3) return true;
    let x = point.x,
      y = point.y;
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
      let xi = vs[i].x_px,
        yi = vs[i].y_px;
      let xj = vs[j].x_px,
        yj = vs[j].y_px;

      let intersect =
        yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }, []);

  const isTextBoxInsideArea = useCallback(
    (
      centerX: number,
      centerY: number,
      width: number,
      height: number,
      nodes?: Nodes[],
    ): boolean => {
      if (!nodes || nodes.length < 3) return true;

      // Center point MUST be inside polygon
      if (!isPointInPolygon({ x: centerX, y: centerY }, nodes)) {
        return false;
      }

      // Check 4 inset corner points (70% offset) to ensure box stays within polygon boundaries
      const halfW = (width / 2) * 0.7;
      const halfH = (height / 2) * 0.7;

      const cornerPoints = [
        { x: centerX - halfW, y: centerY - halfH },
        { x: centerX + halfW, y: centerY - halfH },
        { x: centerX - halfW, y: centerY + halfH },
        { x: centerX + halfW, y: centerY + halfH },
      ];

      return cornerPoints.every((pt) => isPointInPolygon(pt, nodes));
    },
    [isPointInPolygon],
  );

  const getNodesCentroid = useCallback(
    (nodes?: Nodes[]): { x: number; y: number } => {
      if (!nodes || nodes.length === 0) return { x: 150, y: 150 };
      if (nodes.length < 3) return { x: nodes[0].x_px, y: nodes[0].y_px };

      // 1. Calculate standard arithmetic centroid
      let sumX = 0;
      let sumY = 0;
      nodes.forEach((n) => {
        sumX += n.x_px;
        sumY += n.y_px;
      });
      const avgPoint = { x: sumX / nodes.length, y: sumY / nodes.length };

      if (isPointInPolygon(avgPoint, nodes)) {
        return avgPoint;
      }

      // 2. Fallback for non-convex / L-shaped polygons: use earcut triangulation
      try {
        const flatCoords: number[] = [];
        nodes.forEach((n) => flatCoords.push(n.x_px, n.y_px));
        const triangles = earcut(flatCoords);

        let maxArea = -1;
        let bestPoint = avgPoint;

        for (let i = 0; i < triangles.length; i += 3) {
          const p1 = nodes[triangles[i]];
          const p2 = nodes[triangles[i + 1]];
          const p3 = nodes[triangles[i + 2]];
          if (!p1 || !p2 || !p3) continue;

          const cx = (p1.x_px + p2.x_px + p3.x_px) / 3;
          const cy = (p1.y_px + p2.y_px + p3.y_px) / 3;
          const area = Math.abs(
            p1.x_px * (p2.y_px - p3.y_px) +
              p2.x_px * (p3.y_px - p1.y_px) +
              p3.x_px * (p1.y_px - p2.y_px),
          );

          if (area > maxArea && isPointInPolygon({ x: cx, y: cy }, nodes)) {
            maxArea = area;
            bestPoint = { x: cx, y: cy };
          }
        }
        return bestPoint;
      } catch (e) {
        return { x: nodes[0].x_px, y: nodes[0].y_px };
      }
    },
    [isPointInPolygon],
  );

  const renderTextBox = useCallback(
    (area: MaskedAreaType, type: 'name' | 'occupancy') => {
      const isEditing = area.name === editingArea;
      const isName = type === 'name';
      const rawJson = isName ? area.areaNameTextBox : area.occupancyNameTextBox;

      const boxWidth = 100;
      const boxHeight = 50;

      const centroid = getNodesCentroid(area.nodes);
      let defaultPos = isName
        ? { x: centroid.x, y: centroid.y - 30 }
        : { x: centroid.x, y: centroid.y + 30 };

      if (!isTextBoxInsideArea(defaultPos.x, defaultPos.y, boxWidth, boxHeight, area.nodes)) {
        defaultPos = { x: centroid.x, y: centroid.y };
      }

      const defaultSize = isName ? 16 : 14;
      const defaultColor = '#ffffff';

      const tb = parseTextBox(rawJson, defaultPos, defaultSize, defaultColor);

      // Verify stored position is inside parent polygon shape; if not, clamp to centroid
      let currentCenterX = tb.posX;
      let currentCenterY = tb.posY;
      if (!isTextBoxInsideArea(currentCenterX, currentCenterY, boxWidth, boxHeight, area.nodes)) {
        currentCenterX = centroid.x;
        currentCenterY = centroid.y;
      }

      const displayText = isName
        ? area.name && area.name.trim() !== ''
          ? area.name
          : 'Name Text Box'
        : 'Occupancy Text Box';

      // Position stored is center of the text box
      const groupX = currentCenterX - boxWidth / 2;
      const groupY = currentCenterY - boxHeight / 2;

      return (
        <Group
          key={`tb-${type}-${area.id}`}
          x={groupX}
          y={groupY}
          draggable={!preview && isEditing && !drawingMaskedArea}
          dragBoundFunc={function (pos) {
            if (!area.nodes || area.nodes.length < 3) return pos;

            const candGroupX = (pos.x - stageX) / stageScale;
            const candGroupY = (pos.y - stageY) / stageScale;
            const candCenterX = candGroupX + boxWidth / 2;
            const candCenterY = candGroupY + boxHeight / 2;

            // 1. Candidate position is valid
            if (isTextBoxInsideArea(candCenterX, candCenterY, boxWidth, boxHeight, area.nodes)) {
              return pos;
            }

            // Get live current position of Konva Node frame-by-frame
            const nodePos = this.absolutePosition();
            const currGroupX = (nodePos.x - stageX) / stageScale;
            const currGroupY = (nodePos.y - stageY) / stageScale;
            const currCenterX = currGroupX + boxWidth / 2;
            const currCenterY = currGroupY + boxHeight / 2;

            // 2. Candidate X + Current Y valid
            const isXValid = isTextBoxInsideArea(candCenterX, currCenterY, boxWidth, boxHeight, area.nodes);
            // 3. Current X + Candidate Y valid
            const isYValid = isTextBoxInsideArea(currCenterX, candCenterY, boxWidth, boxHeight, area.nodes);

            if (isXValid && !isYValid) {
              return { x: pos.x, y: nodePos.y };
            }
            if (isYValid && !isXValid) {
              return { x: nodePos.x, y: pos.y };
            }

            return nodePos;
          }}
          onMouseEnter={(e) => {
            if (!preview && isEditing && !drawingMaskedArea) {
              const stage = e.target.getStage();
              if (stage) stage.container().style.cursor = 'move';
            }
          }}
          onMouseLeave={(e) => {
            if (!preview && isEditing && !drawingMaskedArea) {
              const stage = e.target.getStage();
              if (stage) stage.container().style.cursor = 'default';
            }
          }}
          onDragStart={(e) => {
            e.evt.stopPropagation();
          }}
          onDragEnd={(e) => {
            if (!isEditing) return;
            const newGroupX = e.target.x();
            const newGroupY = e.target.y();
            let newCenterX = Math.round(newGroupX + boxWidth / 2);
            let newCenterY = Math.round(newGroupY + boxHeight / 2);

            if (!isTextBoxInsideArea(newCenterX, newCenterY, boxWidth, boxHeight, area.nodes)) {
              const safePoint = getNodesCentroid(area.nodes);
              newCenterX = Math.round(safePoint.x);
              newCenterY = Math.round(safePoint.y);
            }

            const updatedTb: TextBoxType = {
              ...tb,
              posX: newCenterX,
              posY: newCenterY,
            };

            const jsonString = stringifyTextBox(updatedTb);
            const fieldToUpdate = isName ? 'areaNameTextBox' : 'occupancyNameTextBox';

            dispatch(
              EditUnsavedMaskedArea({
                ...area,
                [fieldToUpdate]: jsonString,
              }),
            );
          }}
        >
          <Rect
            width={boxWidth}
            height={boxHeight}
            fill="rgba(0, 0, 0, 0.45)"
            stroke={isEditing ? (isName ? '#1976d2' : '#ff9800') : '#444444'}
            strokeWidth={isEditing ? 2 : 1}
            dash={isEditing ? [6, 4] : undefined}
            cornerRadius={6}
          />
          <Text
            x={10}
            y={10}
            width={boxWidth - 20}
            height={boxHeight - 20}
            text={displayText}
            fontSize={tb.fontSize}
            fill={tb.fontColor}
            fontStyle="bold"
            align="center"
            verticalAlign="middle"
            wrap="word"
            listening={false}
          />
        </Group>
      );
    },
    [editingArea, preview, drawingMaskedArea, getNodesCentroid, dispatch],
  );

  const renderArea = useCallback(
    (area: MaskedAreaType) => {
      const points = area.nodes?.flatMap((node) => [node.x_px, node.y_px]) || [];
      const isActive = area.name === activeArea;
      const isEditing = area.name === editingArea;

      return (
        <Group key={area.id}>
          <Line
            points={points}
            stroke={darken(area.colorArea, 0.5)}
            strokeWidth={5}
            lineJoin="round"
            lineCap="round"
            closed
            fill={
              preview ? area.colorArea : isActive ? area.colorArea : lighten(area.colorArea, 0.7)
            }
            opacity={0.7}
            draggable={!preview && isEditing && !drawingMaskedArea}
            onMouseEnter={() => {
              if (isEditing) {
                if (preview) return;
                if (!drawingMaskedArea) {
                  // setCursor('move');
                  onAreaHoverChange(true);
                }
              } else {
                if (!drawingMaskedArea) {
                  // setCursor('pointer');
                  onOnArea(true);
                }
              }
            }}
            onMouseLeave={() => {
              if (!preview && !drawingMaskedArea) {
                // setCursor('grab');
                onAreaHoverChange(false);
                onOnArea(false);
              }
            }}
            onMouseDown={(e) => {
              // Ignore middle mouse click (button 1) so it passes through for global panning
              if (e.evt && e.evt.button === 1) {
                return;
              }

              // Only stop propagation if we're actually going to handle the drag
              // Don't stop propagation if we're just clicking (not in editing mode)
              if (isEditing && !drawingMaskedArea && e.evt) {
                e.evt.stopPropagation();
              }

              if (!drawingMaskedArea) {
                const isShiftPressed = e.evt.shiftKey;
                if (isShiftPressed) {
                  e.evt.preventDefault();
                  const world = pointerToWorld(e.target.getStage()?.getPointerPosition() || null);
                  if (world) handleInsertCorner(area.name, world.x, world.y);
                }
              }
            }}
            onDragStart={(e) => {
              // Stop propagation when starting to drag a polygon
              e.evt.stopPropagation();
              handleDragStart(area.name, e);
            }}
            onDblClick={(e) => {
              if (isEditing) {
                e.evt.preventDefault();
                e.evt.stopPropagation();  
                const world = pointerToWorld(e.target.getStage()?.getPointerPosition() || null);
                if (world) handleInsertCorner(area.name, world.x, world.y);
              }
            }}
            onDragMove={(e) => {
              // Don't stop propagation during drag move - let Konva handle it
            }}
            onDragEnd={(e) => {
              // Don't stop propagation on drag end
              handleDragEnd(area.name, e);
            }}
            onClick={(e) => {
              // Don't stop propagation on regular click
              handleOnClick(area.id);
            }}
          />
          {isEditing &&
            !areaDragging &&
            area.nodes?.map((node, index) => (
              <Circle
                key={node.id}
                x={node.x_px}
                y={node.y_px}
                radius={7}
                fill="red"
                draggable={!preview}
                strokeWidth={2}
                onMouseEnter={(e) => {
                  if (!drawingMaskedArea) {
                    const shape = e.target as any;
                    shape.radius(10);
                    shape.stroke('black');
                    shape.strokeWidth(3);
                    // setCursor('move');
                    onAreaHoverChange(true);
                    shape.getLayer()?.batchDraw();
                  }
                }}
                onMouseLeave={(e) => {
                  if (!drawingMaskedArea) {
                    const shape = e.target as any;
                    shape.radius(7);
                    shape.stroke('');
                    shape.strokeWidth(1);
                    // setCursor('grab');
                    onAreaHoverChange(false);
                    shape.getLayer()?.batchDraw();
                  }
                }}
                onDragStart={(e) => {
                  // Stop propagation when starting to drag a corner
                  e.evt.stopPropagation();
                  handleCornerDragStart(area.name, index, e);
                }}
                onDragMove={(e) => {
                  // Don't stop propagation during drag move
                  e.evt.stopPropagation();
                  const stage = e.target.getStage();
                  const ptr = stage?.getPointerPosition();
                  const world = pointerToWorld(ptr || null);
                  if (world) {
                    let targetX = world.x;
                    let targetY = world.y;
                    if (isQHeldRef.current) {
                      const snapped = snapToNearestLine(world.x, world.y, area.name, index);
                      if (snapped && !checkCornerDragCollision(area.name, index, snapped.x, snapped.y)) {
                        targetX = snapped.x;
                        targetY = snapped.y;
                        e.target.x(snapped.x);
                        e.target.y(snapped.y);
                      }
                    }
                    setCursorWorld({ x: targetX, y: targetY });
                    handleDragCorner(area.name, index, targetX, targetY);
                    checkCornerDragCollision(area.name, index, targetX, targetY);
                  }
                }}
                onDragEnd={(e) => {
                  // Don't stop propagation on drag end
                  const stage = e.target.getStage();
                  const ptr = stage?.getPointerPosition();
                  const world = pointerToWorld(ptr || null);
                  if (world) {
                    let targetX = world.x;
                    let targetY = world.y;
                    if (isQHeldRef.current) {
                      const snapped = snapToNearestLine(world.x, world.y, area.name, index);
                      if (snapped && !checkCornerDragCollision(area.name, index, snapped.x, snapped.y)) {
                        targetX = snapped.x;
                        targetY = snapped.y;
                      }
                    }
                    e.target.x(targetX);
                    e.target.y(targetY);
                    handleCornerDragEnd(area.name, index, targetX, targetY);
                  }
                }}
                onContextMenu={(e) => {
                  e.evt.preventDefault();
                  e.evt.stopPropagation();
                  handleDeleteCorner(area.name, index);
                }}
                onMouseDown={(e) => {
                  e.evt.stopPropagation();
                }}
              />
            ))}
          {renderTextBox(area, 'name')}
          {renderTextBox(area, 'occupancy')}
        </Group>
      );
    },
    [
      activeArea,
      editingArea,
      preview,
      drawingMaskedArea,
      pointerToWorld,
      handleDragStart,
      handleInsertCorner,
      handleDragEnd,
      handleOnClick,
      handleCornerDragStart,
      handleDragCorner,
      handleCornerDragEnd,
      handleDeleteCorner,
      areaDragging,
      renderTextBox,
    ],
  );

    const useDeviceIcon = (src: string) => {
      const [img, setImg] = useState<HTMLImageElement | undefined>(undefined);
      useEffect(() => {
        const image = new window.Image();
        image.src = src;
        image.onload = () => setImg(image);
      }, [src]);
      return img;
    };
    const iconCCTV = useDeviceIcon(CCTVSVG);
    const iconGateway = useDeviceIcon(GatewaySVG);
    const iconUnknown = useDeviceIcon(UnknownDevice);


    const renderDeviceShape = (device: FloorplanDeviceType) => {
      let deviceIcon = iconUnknown;
      switch (device.type) {
        case 'Cctv':
          deviceIcon = iconCCTV;
          break;
        case 'BleReader':
          deviceIcon = iconGateway;
          break;
      }
      // Use original coordinates directly (no scaling)
      const x = device.posPxX - 20;
      const y = device.posPxY - 20;

      const parentArea = renderAreas.find((a) => a.id === device.floorplanMaskedAreaId);
      const isInside = parentArea?.nodes ? isPointInPolygon({ x: device.posPxX, y: device.posPxY }, parentArea.nodes) : true;

      return (
        <Group
          key={`device-${device.id}`}
          name="device"
        >
          {!isInside && (
            <Line
              points={[x - 2, y - 2, x + 42, y - 2, x + 42, y + 42, x - 2, y + 42]}
              closed
              stroke="red"
              strokeWidth={2}
              dash={[4, 2]}
              listening={false}
            />
          )}
          <Text
            x={x - 40}
            y={y - 5}
            text={device.reader?.gmac || device.id}
            fontSize={9}
            fill="#1976d2"
            fontStyle="bold"
            width={120}
            align="center"
            listening={false}
          />
          <KonvaImage name="device" image={deviceIcon} x={x} y={y} width={40} height={40} />
        </Group>
      );
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
          onClick={handleCanvasClick}
          onContextMenu={handleRightClick}
          onWheel={onWheel}
        >
          {/* Background layer */}
          <FastLayer listening={false}>
            {imageToDraw && (
              <KonvaImage image={imageToDraw} width={originalWidth} height={originalHeight} />
            )}
          </FastLayer>

          {/* Areas */}
          <Layer>{renderAreas.map((area) => renderArea(area))}</Layer>

          {/* Drawing nodes */}
          <Layer listening={false}>
            {drawingNodes.length > 0 && (
              <>
                <Circle
                  key={drawingNodes[0].id}
                  x={drawingNodes[0].x_px}
                  y={drawingNodes[0].y_px}
                  radius={8}
                  fill="blue"
                  stroke="black"
                  strokeWidth={2}
                  onMouseEnter={(e) => {
                    const shape = e.target as any;
                    shape.radius(12);
                    shape.fill('green');
                    // setCursor('pointer');
                    onOnArea(true);
                    shape.getLayer()?.batchDraw();
                  }}
                  onMouseLeave={(e) => {
                    const shape = e.target as any;
                    shape.radius(8);
                    shape.fill('blue');
                    // setCursor('crosshair');
                    onOnArea(false);
                    shape.getLayer()?.batchDraw();
                  }}
                />

                {drawingNodes.slice(1).map((node) => (
                  <Circle
                    key={node.id}
                    x={node.x_px}
                    y={node.y_px}
                    radius={4}
                    fill="black"
                    opacity={0.8}
                    listening={false}
                  />
                ))}
              </>
            )}
            {showDevices && devices.map((d: FloorplanDeviceType) => renderDeviceShape(d))}
            {/* Drawing lines */}
            {drawingNodes.length > 0 && cursorWorld && (
              <>
                {drawingNodes.length > 1 &&
                  drawingNodes.map((node, index) => {
                    if (index === drawingNodes.length - 1) return null;
                    const nextNode = drawingNodes[index + 1];
                    return (
                      <Line
                        key={`line-to-next-${node.id}`}
                        points={[node.x_px, node.y_px, nextNode.x_px, nextNode.y_px]}
                        stroke="blue"
                        strokeWidth={2}
                        dash={[10, 5]}
                      />
                    );
                  })}

                <Line
                  points={[
                    drawingNodes[drawingNodes.length - 1].x_px,
                    drawingNodes[drawingNodes.length - 1].y_px,
                    cursorWorld.x,
                    cursorWorld.y,
                  ]}
                  stroke="blue"
                  strokeWidth={2}
                  dash={[10, 5]}
                />

                {drawingNodes.length > 2 && (
                  <Line
                    points={[
                      drawingNodes[0].x_px,
                      drawingNodes[0].y_px,
                      cursorWorld.x,
                      cursorWorld.y,
                    ]}
                    stroke="blue"
                    strokeWidth={1.5}
                    dash={[4, 6]}
                    opacity={0.5}
                  />
                )}
              </>
            )}
            {guideLineShown &&
              guideLines.map((line) => (
                <Line
                  key={line.id}
                  points={line.points}
                  stroke="#ff9800"
                  strokeWidth={1.5}
                  dash={[6, 4]}
                  opacity={0.85}
                  listening={false}
                />
              ))}
            {isQHeld && cursorWorld && (
              <Circle
                x={cursorWorld.x}
                y={cursorWorld.y}
                radius={6}
                fill="#00e676"
                stroke="#000"
                strokeWidth={1.5}
                listening={false}
              />
            )}
          </Layer>
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
            You are still in editing mode. Any editing progress will be cancelled if you wish to
            proceed. Do you want to continue?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)} color="primary" variant="contained">
            Cancel
          </Button>
          <Button
            color="error"
            onClick={() => {
              dispatch(RevertMaskedArea(editingMaskedArea?.id || ''));
              if (pendingAreaId) {
                dispatch(SelectMaskedArea(pendingAreaId));
                dispatch(SelectEditingMaskedArea(null));
              }
              setConfirmDialogOpen(false);
              setPendingAreaId(null);
            }}
          >
            Proceed
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default EditAreaRenderer;
