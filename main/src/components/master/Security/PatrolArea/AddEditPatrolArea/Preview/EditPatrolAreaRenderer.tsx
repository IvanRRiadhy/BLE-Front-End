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
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Stage, Layer, Circle, Image as KonvaImage, Line, FastLayer, Group } from 'react-konva';
import { useSelector, useDispatch, RootState } from 'src/store/Store';
import {
  PatrolAreaType,
  RevertPatrolArea,
  SelectEditingPatrolArea,
  SelectPatrolArea,
  AddUnsavedPatrolArea,
  DrawingPatrolArea,
  EditPatrolAreaPosition,
} from 'src/store/apps/crud/patrolArea';
import earcut from 'earcut';
import { uniqueId } from 'lodash';
import polylabel from 'polylabel';
import toast from 'react-hot-toast';

type NodeType = 'corner' | 'center';

type Nodes = {
  id: string;
  type: string;
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
  patrolAreas: PatrolAreaType[];
  activePatrolArea?: PatrolAreaType | null;
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
const closeRing = (ring: number[][]) => {
  if (!ring.length) return ring;
  const [fx, fy] = ring[0];
  const [lx, ly] = ring[ring.length - 1];
  if (fx !== lx || fy !== ly) return [...ring, [fx, fy]];
  return ring;
};
function areaToPolygonRingsFromNodes(nodes: Nodes[]): number[][][] {
  const cornerNodes = nodes.filter((n) => n.type === 'corner');
  if (cornerNodes.length < 3) return [];

  const outer: number[][] = cornerNodes.map((n) => [n.x_px, n.y_px]);
  return [closeRing(outer)];
}

function areaToPolygonRings(area: PatrolAreaType): number[][][] {
  const outer: number[][] = (area.nodes ?? []).map((n: Nodes) => [n.x_px, n.y_px]);
  const holesRaw: Nodes[][] = (area as any).holes ?? [];
  const holes: number[][][] = holesRaw.map((nodes) => nodes.map((n) => [n.x_px, n.y_px]));
  return [closeRing(outer), ...holes.map(closeRing)];
}

const EditPatrolAreaRenderer: React.FC<Props> = ({
  width,
  height,
  originalWidth,
  originalHeight,
  imageSrc,
  scale,
  patrolAreas,
  activePatrolArea,
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

  const editingPatrolArea = useSelector(
    (state: RootState) => state.PatrolAreaReducer.editingPatrolArea,
  );
  const unsavedArea: PatrolAreaType[] = useSelector(
    (state: RootState) => state.PatrolAreaReducer.unsavedPatrolAreas,
  );
  const selectedFloorplan = useSelector(
    (state: RootState) => state.floorplanReducer.selectedFloorplan,
  );
  const drawingPatrolArea = useSelector(
    (state: RootState) => state.PatrolAreaReducer.drawingPatrolArea,
  );

  const [activeArea, setActiveArea] = useState(activePatrolArea?.name || '');
  const [editingArea, setEditingArea] = useState(editingPatrolArea?.name || '');
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

  // background images
  const [bgImage, setBgImage] = useState<HTMLImageElement | undefined>(undefined);
  const [previewImage, setPreviewImage] = useState<HTMLImageElement | undefined>(undefined);

  const filteredUnsavedArea = useMemo(
    () => unsavedArea.filter((area) => area.floorplanId === selectedFloorplan?.id),
    [unsavedArea, selectedFloorplan],
  );

  const renderAreas = useMemo(() => {
    const map = new Map<string, PatrolAreaType>();
    filteredUnsavedArea.forEach((area) => {
      map.set(area.id, area);
    });
    if (editingPatrolArea) {
      map.set(editingPatrolArea.id, editingPatrolArea);
    }
    return Array.from(map.values());
  }, [filteredUnsavedArea, editingPatrolArea]);

  const getCornerNodes = (nodes?: Nodes[]) => (nodes ?? []).filter((n) => n.type === 'corner');

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
    if (drawingPatrolArea) {
      if (drawingNodes.length === 0) {
        if (!cursorWorld) return [];
        return [
          { id: 'cursor-h', points: [0, cursorWorld.y, maxX, cursorWorld.y] },
          { id: 'cursor-v', points: [cursorWorld.x, 0, cursorWorld.x, maxY] },
        ];
      } else if (drawingNodes.length === 1) {
        const firstNode = drawingNodes[0];
        return [
          { id: 'first-h', points: [0, firstNode.y_px, maxX, firstNode.y_px] },
          { id: 'first-v', points: [firstNode.x_px, 0, firstNode.x_px, maxY] },
        ];
      } else {
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
          { id: 'first-h', points: [0, firstNode.y_px, maxX, firstNode.y_px] },
          { id: 'first-v', points: [firstNode.x_px, 0, firstNode.x_px, maxY] },
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
    const cornerNodes = getCornerNodes(area?.nodes);
    if (!cornerNodes || cornerNodes.length < 3) return [];

    const N = cornerNodes.length;
    const prevIdx = (cornerIndex - 1 + N) % N;
    const nextIdx = (cornerIndex + 1) % N;

    const prevNode = cornerNodes[prevIdx];
    const nextNode = cornerNodes[nextIdx];

    if (guideLineMode === 'parallel_perpendicular') {
      const anchorPrevIdx = (prevIdx - 1 + N) % N;
      const anchorNextIdx = (nextIdx + 1) % N;

      const anchorPrev = cornerNodes[anchorPrevIdx];
      const anchorNext = cornerNodes[anchorNextIdx];

      return [
        ...createParallelAndPerpendicularLines(prevNode.x_px, prevNode.y_px, anchorPrev.x_px, anchorPrev.y_px, 'prev', maxX, maxY),
        ...createParallelAndPerpendicularLines(nextNode.x_px, nextNode.y_px, anchorNext.x_px, anchorNext.y_px, 'next', maxX, maxY),
      ];
    }

    return [
      { id: 'prev-h', points: [0, prevNode.y_px, maxX, prevNode.y_px] },
      { id: 'prev-v', points: [prevNode.x_px, 0, prevNode.x_px, maxY] },
      { id: 'next-h', points: [0, nextNode.y_px, maxX, nextNode.y_px] },
      { id: 'next-v', points: [nextNode.x_px, 0, nextNode.x_px, maxY] },
    ];
  }, [
    guideLineShown,
    guideLineMode,
    drawingPatrolArea,
    drawingNodes,
    cursorWorld,
    cornerDragData,
    renderAreas,
    originalWidth,
    originalHeight,
    width,
    height,
  ]);

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

  const snapToNearestLine = useCallback(
    (px: number, py: number, currentAreaName?: string, currentCornerIndex?: number) => {
      const sensitivityRadius = 100;
      const intersectionRadius = 15;
      type LineSegment = { x1: number; y1: number; x2: number; y2: number };
      const allLines: LineSegment[] = [];

      // 1. Collect area edge segments
      for (const area of renderAreas) {
        const cornerNodes = getCornerNodes(area.nodes);
        if (!cornerNodes || cornerNodes.length < 2) continue;

        const numNodes = cornerNodes.length;
        for (let i = 0; i < numNodes; i++) {
          if (area.name === currentAreaName && currentCornerIndex !== undefined) {
            const prevIndex = (currentCornerIndex - 1 + numNodes) % numNodes;
            if (i === currentCornerIndex || i === prevIndex) continue;
          }

          const n1 = cornerNodes[i];
          const n2 = cornerNodes[(i + 1) % numNodes];
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
    setActiveArea(activePatrolArea?.name || '');
  }, [activePatrolArea]);

  useEffect(() => {
    setEditingArea(editingPatrolArea?.name || '');
  }, [editingPatrolArea]);

  // ----------- helpers: pointer -> world coords (image pixels) -----------
  const pointerToWorld = useCallback(
    (pointer: { x: number; y: number } | null) => {
      if (!pointer) return null;
      return { x: (pointer.x - stageX) / stageScale, y: (pointer.y - stageY) / stageScale };
    },
    [stageScale, stageX, stageY],
  );

  //----------- Center Node Helper -----------
  function withRecomputedCenter(nodes: Nodes[], scale: number): Nodes[] {
    const cornerNodes = nodes.filter((n) => n.type === 'corner');

    if (cornerNodes.length < 3) {
      return cornerNodes; // no center possible
    }

    const rings = areaToPolygonRingsFromNodes(cornerNodes);
    if (!rings.length) return cornerNodes;

    const [cx, cy] = polylabel(rings, 1.0);

    const centerNode: Nodes = {
      id: 'center', // stable id (important)
      type: 'center',
      x_px: cx,
      y_px: cy,
      x: cx * scale,
      y: cy * scale,
    };

    return [...cornerNodes, centerNode];
  }

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

      if (projA.max + epsilon < projB.min || projB.max + epsilon < projA.min) {
        return false;
      }
    }

    return true;
  };

  const nodesToVertices = (nodes: Nodes[]): number[] => {
    return getCornerNodes(nodes).flatMap((n) => [n.x_px, n.y_px]);
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
      if (val === 0) return 0;
      return val > 0 ? 1 : 2;
    };

    const onSegment = (px: number, py: number, qx: number, qy: number, rx: number, ry: number) => {
      return (
        qx <= Math.max(px, rx) &&
        qx >= Math.min(px, rx) &&
        qy <= Math.max(py, ry) &&
        qy >= Math.min(py, ry)
      );
    };

    const o1 = orientation(x1, y1, x2, y2, x3, y3);
    const o2 = orientation(x1, y1, x2, y2, x4, y4);
    const o3 = orientation(x3, y3, x4, y4, x1, y1);
    const o4 = orientation(x3, y3, x4, y4, x2, y2);

    if (o1 !== o2 && o3 !== o4) return true;

    if (o1 === 0 && onSegment(x1, y1, x3, y3, x2, y2)) return true;
    if (o2 === 0 && onSegment(x1, y1, x4, y4, x2, y2)) return true;
    if (o3 === 0 && onSegment(x3, y3, x1, y1, x4, y4)) return true;
    if (o4 === 0 && onSegment(x3, y3, x2, y2, x4, y4)) return true;

    return false;
  };

  const checkCollisionWithOffset = (areaName: string, dx: number, dy: number): boolean => {
    const currentArea = renderAreas.find((a) => a.name === areaName);
    if (!currentArea || !currentArea.nodes) return false;

    const proposedArea = {
      nodes: currentArea.nodes.map((node) => ({
        ...node,
        x: node.x + dx * scale,
        y: node.y + dy * scale,
        x_px: node.x_px + dx,
        y_px: node.y_px + dy,
      })),
    };

    return renderAreas.some((otherArea) => {
      if (otherArea.name === areaName) return false;
      if (!otherArea.nodes) return false;
      return checkPolygonCollision(proposedArea, { nodes: otherArea.nodes });
    });
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

      const cornerNodes = getCornerNodes(currentArea.nodes);
      const targetNode = cornerNodes[cornerIndex];
      if (!targetNode) return false;

      const proposedNodes = currentArea.nodes.map((node) =>
        node.id === targetNode.id
          ? { ...node, x: newX * scale, y: newY * scale, x_px: newX, y_px: newY }
          : node,
      );

      const proposedCornerNodes = getCornerNodes(proposedNodes);
      if (checkSelfIntersections(proposedCornerNodes)) {
        return true;
      }

      const proposedArea = { name: areaName, nodes: proposedNodes };
      for (const otherArea of renderAreas) {
        if (otherArea.name === areaName || !otherArea.nodes || getCornerNodes(otherArea.nodes).length < 3) continue;
        if (checkPolygonCollision(proposedArea, { nodes: otherArea.nodes })) return true;
      }

      return false;
    },
    [renderAreas, scale, checkPolygonCollision],
  );

  // ----------- event handlers -----------
  const handleCanvasClick = useCallback(
    (e: any) => {
      if (!drawingPatrolArea) return;
      const stage = e.target.getStage();
      const ptr = stage?.getPointerPosition();
      const world = (isQHeldRef.current && cursorWorld) ? cursorWorld : pointerToWorld(ptr || null);
      if (!world) return;

      const { x, y } = world;

      const newNode = {
        id: uniqueId(),
        type: 'corner',
        x: x * scale,
        y: y * scale,
        x_px: x,
        y_px: y,
      };

      setDrawingNodes((prevNodes) => {
        const finalNodes = withRecomputedCenter(prevNodes, scale);
        if (prevNodes.length >= 3) {
          const first = prevNodes[0];
          const dist = Math.hypot(first.x_px - newNode.x_px, first.y_px - newNode.y_px);
          if (dist < 15) {
            const newArea: PatrolAreaType = {
              id: drawingPatrolArea,
              name: drawingPatrolArea,
              remarks: '',
              color: '#363636',
              areaShape: JSON.stringify(finalNodes),
              nodes: finalNodes,
              floorId: selectedFloorplan?.floorId || '',
              floorplanId: selectedFloorplan?.id || '',
              isActive: true,
              status: 1,
              applicationId: '',
            };

            (async () => {
              await dispatch(AddUnsavedPatrolArea(newArea));
              dispatch(DrawingPatrolArea(''));
              dispatch(SelectPatrolArea(newArea.id));
              dispatch(SelectEditingPatrolArea(newArea.id));
              setActiveArea(newArea.name);
              setDrawingNodes([]);
            })();

            return [];
          }
        }

        return [...prevNodes, newNode];
      });
    },
    [drawingPatrolArea, cursorWorld, pointerToWorld, scale, selectedFloorplan, dispatch],
  );

  const handleOnClick = useCallback(
    (id: string) => {
      if (drawingPatrolArea) return;
      const active = patrolAreas?.find((area) => area.id === id);
      if (activeArea === active?.name) return;
      if (editingArea) {
        setPendingAreaId(id);
        setConfirmDialogOpen(true);
        return;
      }
      dispatch(SelectPatrolArea(id));
    },
    [drawingPatrolArea, patrolAreas, activeArea, editingArea, dispatch],
  );

  // FIXED: handleDragStart - track the starting position
  const handleDragStart = useCallback(
    (areaName: string, e: any) => {
      if (drawingPatrolArea) return;
      setIsDragging(areaName);
      setDraggingAreaName(areaName);
      setDragOffset({ dx: 0, dy: 0 });
      setIsColliding(false);
      setAreaDragging(true);

      const stage = e.target.getStage();
      const ptr = stage?.getPointerPosition();
      const world = pointerToWorld(ptr || null);
      if (world) {
        setDragStartPos({ x: world.x, y: world.y });
      }
    },
    [drawingPatrolArea, setIsDragging, pointerToWorld],
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
        dispatch(EditPatrolAreaPosition(updatedArea));
      }
    },
    [renderAreas, scale, dispatch],
  );

  // FIXED: handleDragEnd - clear dragging state and apply movement
  const handleDragEnd = useCallback(
    async (areaName: string, e: any) => {
      if (draggingAreaName !== areaName) return;

      const stage = e.target.getStage();
      const ptr = stage?.getPointerPosition();
      const world = pointerToWorld(ptr || null);

      if (world && dragStartPos) {
        let dx = world.x - dragStartPos.x;
        let dy = world.y - dragStartPos.y;

        if (isQHeldRef.current) {
          const area = renderAreas.find((a) => a.name === areaName);
          const cornerNodes = getCornerNodes(area?.nodes);
          if (cornerNodes.length > 0) {
            let bestCorner = cornerNodes[0];
            let bestDist = Infinity;
            for (const cn of cornerNodes) {
              const d = Math.hypot(dragStartPos.x - cn.x_px, dragStartPos.y - cn.y_px);
              if (d < bestDist) {
                bestDist = d;
                bestCorner = cn;
              }
            }
            const movedCornerX = bestCorner.x_px + dx;
            const movedCornerY = bestCorner.y_px + dy;
            const snapped = snapToNearestLine(movedCornerX, movedCornerY, areaName);
            if (snapped) {
              dx = snapped.x - bestCorner.x_px;
              dy = snapped.y - bestCorner.y_px;
            }
          }
        }

        const collision = checkCollisionWithOffset(areaName, dx, dy);
        setIsColliding(collision);

        if (collision) {
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

      // Reset the Konva shape position to 0
      e.target.x(0);
      e.target.y(0);
    },
    [draggingAreaName, pointerToWorld, dragStartPos, setIsDragging, renderAreas, snapToNearestLine, handleDragArea],
  );

  const handleCornerDragStart = useCallback(
    (areaName: string, cornerIndex: number, e: any) => {
      const area = renderAreas.find((a) => a.name === areaName);
      if (!area || !area.nodes) return;

      const corner = getCornerNodes(area.nodes)[cornerIndex];
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

        const cornerNodes = getCornerNodes(area.nodes);
        const targetNode = cornerNodes[cornerIndex];
        if (!targetNode) return area;

        const newNodes = area.nodes.map((node) =>
          node.id === targetNode.id
            ? {
                ...node,
                x: x * scale,
                y: y * scale,
                x_px: x,
                y_px: y,
              }
            : node,
        );
        const finalNodes = withRecomputedCenter(newNodes, scale);
        return { ...area, nodes: finalNodes, areaShape: JSON.stringify(finalNodes) };
      });

      const updatedArea = updatedAreas.find((area) => area.name === areaName);
      if (updatedArea) {
        dispatch(EditPatrolAreaPosition(updatedArea));
      }
    },
    [renderAreas, scale, dispatch],
  );

  const handleCornerDragEnd = useCallback(
    (areaName: string, cornerIndex: number, x: number, y: number) => {
      activeCornerDragRef.current = null;
      const area = renderAreas.find((a) => a.name === areaName);
      if (!area || !area.nodes) return;

      const cornerNodes = getCornerNodes(area.nodes);
      const targetNode = cornerNodes[cornerIndex];
      if (!targetNode) return;

      const proposedNodes = area.nodes.map((node) =>
        node.id === targetNode.id ? { ...node, x: x * scale, y: y * scale, x_px: x, y_px: y } : node,
      );

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
      setIsDragging('');
      setDraggingAreaName(null);
    },
    [cornerDragData, renderAreas, scale, handleDragCorner, setIsDragging, checkPolygonCollision],
  );

  const handleDeleteCorner = useCallback(
    (areaName: string, cornerIndex: number) => {
      const updatedAreas = renderAreas.map((area) => {
        if (area.name !== areaName || !area.nodes) return area;

        const cornerNodes = getCornerNodes(area.nodes);
        const targetNode = cornerNodes[cornerIndex];
        if (!targetNode) return area;

        const newNodes = area.nodes.filter((node) => node.id !== targetNode.id);
        const finalNodes = withRecomputedCenter(newNodes, scale);
        return { ...area, nodes: finalNodes, areaShape: JSON.stringify(finalNodes) };
      });

      const updatedArea = updatedAreas.find((area) => area.name === areaName);
      if (updatedArea) {
        dispatch(EditPatrolAreaPosition(updatedArea));
      }
    },
    [renderAreas, dispatch, scale],
  );

  const handleInsertCorner = useCallback(
    (areaName: string, clickX: number, clickY: number) => {
      const area = renderAreas.find((a) => a.name === areaName);
      if (!area || !area.nodes) return;

      const cornerNodes = getCornerNodes(area.nodes);
      if (cornerNodes.length < 2) return;

      let insertIndex = -1;
      let minDistance = Infinity;

      for (let i = 0; i < cornerNodes.length; i++) {
        const nextIndex = (i + 1) % cornerNodes.length;
        const distance = pointToSegmentDistance(
          clickX,
          clickY,
          cornerNodes[i].x_px,
          cornerNodes[i].y_px,
          cornerNodes[nextIndex].x_px,
          cornerNodes[nextIndex].y_px,
        );

        if (distance < minDistance) {
          minDistance = distance;
          insertIndex = nextIndex;
        }
      }

      const newNode: Nodes = {
        id: uniqueId(),
        type: 'corner',
        x: clickX * scale,
        y: clickY * scale,
        x_px: clickX,
        y_px: clickY,
      };

      const newCornerNodes = [...cornerNodes];
      newCornerNodes.splice(insertIndex, 0, newNode);
      const finalNodes = withRecomputedCenter(newCornerNodes, scale);

      const updatedArea = { ...area, nodes: finalNodes, areaShape: JSON.stringify(finalNodes) };

      dispatch(EditPatrolAreaPosition(updatedArea));
    },
    [renderAreas, scale, dispatch],
  );

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

  const handleRightClick = useCallback(
    (e: any) => {
      e.evt.preventDefault();
      if (!drawingPatrolArea) return;

      setDrawingNodes([]);
      dispatch(DrawingPatrolArea(''));
      dispatch(SelectPatrolArea(''));
      dispatch(SelectEditingPatrolArea(''));
      setActiveArea('');
    },
    [drawingPatrolArea, dispatch],
  );

  const handleStageMouseMove = useCallback(
    (e: any) => {
      const stage = e.target.getStage();
      if (!stage) return;

      const ptr = stage.getPointerPosition();
      const world = pointerToWorld(ptr || null);

      if (world) {
        if (isQHeldRef.current && drawingPatrolArea) {
          const snapped = snapToNearestLine(world.x, world.y, drawingPatrolArea);
          if (snapped) {
            setCursorWorld({ x: snapped.x, y: snapped.y });
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

      if (stage) {
        const pointer = stage.getPointerPosition();
        if (pointer) {
          const shape = stage.getIntersection(pointer);
          if (!shape && !drawingPatrolArea) {
            onAreaHoverChange(false);
            onOnArea(false);
          }
        }
      }
    },
    [pointerToWorld, drawingPatrolArea, snapToNearestLine, onAreaHoverChange, onOnArea],
  );

  const renderArea = useCallback(
    (area: PatrolAreaType) => {
      const cornerNodes = getCornerNodes(area.nodes);
      const points = cornerNodes.flatMap((node) => [node.x_px, node.y_px]);
      const isActive = area.name === activeArea;
      const isEditing = area.name === editingArea;

      return (
        <Group key={area.id}>
          <Line
            points={points}
            stroke={darken(area.color, 0.5)}
            strokeWidth={5}
            lineJoin="round"
            lineCap="round"
            closed
            fill={preview ? area.color : isActive ? area.color : lighten(area.color, 0.7)}
            opacity={0.7}
            draggable={!preview && isEditing && !drawingPatrolArea}
            onMouseEnter={() => {
              if (isEditing) {
                if (preview) return;
                if (!drawingPatrolArea) {
                  onAreaHoverChange(true);
                }
              } else {
                if (!drawingPatrolArea) {
                  onOnArea(true);
                }
              }
            }}
            onMouseLeave={() => {
              if (!preview && !drawingPatrolArea) {
                onAreaHoverChange(false);
                onOnArea(false);
              }
            }}
            onMouseDown={(e) => {
              if (isEditing && !drawingPatrolArea) {
                e.evt.stopPropagation();
              }

              if (!drawingPatrolArea) {
                const isShiftPressed = e.evt.shiftKey;
                if (isShiftPressed) {
                  e.evt.preventDefault();
                  const world = pointerToWorld(e.target.getStage()?.getPointerPosition() || null);
                  if (world) handleInsertCorner(area.name, world.x, world.y);
                }
              }
            }}
            onDragStart={(e) => {
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
              if (isQHeldRef.current && dragStartPos) {
                const stage = e.target.getStage();
                const ptr = stage?.getPointerPosition();
                const world = pointerToWorld(ptr || null);
                if (world) {
                  let dx = world.x - dragStartPos.x;
                  let dy = world.y - dragStartPos.y;
                  const currentArea = renderAreas.find((a) => a.name === area.name);
                  const cNodes = getCornerNodes(currentArea?.nodes);
                  if (cNodes.length > 0) {
                    let bestCorner = cNodes[0];
                    let bestDist = Infinity;
                    for (const cn of cNodes) {
                      const d = Math.hypot(dragStartPos.x - cn.x_px, dragStartPos.y - cn.y_px);
                      if (d < bestDist) {
                        bestDist = d;
                        bestCorner = cn;
                      }
                    }
                    const movedCornerX = bestCorner.x_px + dx;
                    const movedCornerY = bestCorner.y_px + dy;
                    const snapped = snapToNearestLine(movedCornerX, movedCornerY, area.name);
                    if (snapped) {
                      dx = snapped.x - bestCorner.x_px;
                      dy = snapped.y - bestCorner.y_px;
                      e.target.x(dx);
                      e.target.y(dy);
                      setCursorWorld({ x: snapped.x, y: snapped.y });
                      return;
                    }
                  }
                  setCursorWorld(world);
                }
              }
            }}
            onDragEnd={(e) => {
              handleDragEnd(area.name, e);
            }}
            onClick={(e) => {
              handleOnClick(area.id);
            }}
          />
          {isEditing &&
            !areaDragging &&
            cornerNodes.map((node, index) => (
              <Circle
                key={node.id}
                x={node.x_px}
                y={node.y_px}
                radius={7}
                fill="red"
                draggable={!preview}
                strokeWidth={2}
                onMouseEnter={(e) => {
                  if (!drawingPatrolArea) {
                    const shape = e.target as any;
                    shape.radius(10);
                    shape.stroke('black');
                    shape.strokeWidth(3);
                    onAreaHoverChange(true);
                    shape.getLayer()?.batchDraw();
                  }
                }}
                onMouseLeave={(e) => {
                  if (!drawingPatrolArea) {
                    const shape = e.target as any;
                    shape.radius(7);
                    shape.stroke('');
                    shape.strokeWidth(1);
                    onAreaHoverChange(false);
                    shape.getLayer()?.batchDraw();
                  }
                }}
                onDragStart={(e) => {
                  e.evt.stopPropagation();
                  handleCornerDragStart(area.name, index, e);
                }}
                onDragMove={(e) => {
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
        </Group>
      );
    },
    [
      activeArea,
      editingArea,
      preview,
      drawingPatrolArea,
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
      renderAreas,
      dragStartPos,
      snapToNearestLine,
      checkCornerDragCollision,
      onAreaHoverChange,
      onOnArea,
    ],
  );

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
                    onOnArea(true);
                    shape.getLayer()?.batchDraw();
                  }}
                  onMouseLeave={(e) => {
                    const shape = e.target as any;
                    shape.radius(8);
                    shape.fill('blue');
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
              dispatch(RevertPatrolArea(editingPatrolArea?.id || ''));
              if (pendingAreaId) {
                dispatch(SelectPatrolArea(pendingAreaId));
                dispatch(SelectEditingPatrolArea(null));
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

export default EditPatrolAreaRenderer;
