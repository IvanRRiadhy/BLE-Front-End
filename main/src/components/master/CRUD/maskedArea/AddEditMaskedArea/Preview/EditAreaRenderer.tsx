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
import { Stage, Layer, Circle, Image as KonvaImage, Line, FastLayer, Group, Text } from 'react-konva';
import { useSelector, useDispatch, RootState } from 'src/store/Store';
import {
  MaskedAreaType,
  RevertMaskedArea,
  SelectEditingMaskedArea,
  SelectMaskedArea,
  AddUnsavedMaskedArea,
  DrawingMaskedArea,
  EditMaskedAreaPosition,
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

  // Track area drag state
  const [draggingAreaName, setDraggingAreaName] = useState<string | null>(null);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });

  // background images
  const [bgImage, setBgImage] = useState<HTMLImageElement | undefined>(undefined);
  const [previewImage, setPreviewImage] = useState<HTMLImageElement | undefined>(undefined);

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

  // ----------- device-out-of-area detection -----------
  // Stable ray-casting helper (no closure dependencies — pure math)
  const pointInPolygon = useCallback((px: number, py: number, nodes: Nodes[]): boolean => {
    let inside = false;
    for (let i = 0, j = nodes.length - 1; i < nodes.length; j = i++) {
      const xi = nodes[i].x_px, yi = nodes[i].y_px;
      const xj = nodes[j].x_px, yj = nodes[j].y_px;
      const intersect = (yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }, []);

  // Keep a ref so the effect below can read the latest list without
  // putting deviceToDisable in the dependency array (which would cause loops).
  const deviceToDisableRef = React.useRef<string[]>(deviceToDisable);
  useEffect(() => {
    deviceToDisableRef.current = deviceToDisable;
  }, [deviceToDisable]);

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
      const currentlyDisabled = deviceToDisableRef.current.includes(device.id);

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
  }, [devices, areaNodesMap, pointInPolygon, dispatch]);

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

      if (projA.max + epsilon < projB.min || projB.max + epsilon < projA.min) {
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


  const checkCornerDragCollision = (
    areaName: string,
    cornerIndex: number,
    newX: number,
    newY: number,
  ): boolean => {
    const currentArea = renderAreas.find((a) => a.name === areaName);
    if (!currentArea || !currentArea.nodes) return false;

    const proposedArea = {
      nodes: currentArea.nodes.map((node, index) =>
        index === cornerIndex ? { ...node, x: newX, y: newY } : node,
      ),
    };

    return renderAreas.some((otherArea) => {
      if (otherArea.name === areaName) return false;
      if (!otherArea.nodes) return false;
      return checkPolygonCollision(proposedArea, { nodes: otherArea.nodes });
    });
  };

  // ----------- event handlers -----------
  const handleCanvasClick = useCallback(
    (e: any) => {
      if (!drawingMaskedArea) return;
      const stage = e.target.getStage();
      const ptr = stage?.getPointerPosition();
      const world = pointerToWorld(ptr || null);
      if (!world) return;

      const { x, y } = world;

      const newNode = {
        id: uniqueId(),
        x: x * scale,
        y: y * scale,
        x_px: x,
        y_px: y,
      };

      setDrawingNodes((prevNodes) => {
        if (prevNodes.length >= 3) {
          const first = prevNodes[0];
          const dist = Math.hypot(first.x_px - newNode.x_px, first.y_px - newNode.y_px);
          if (dist < 15) {
            const newArea: MaskedAreaType = {
              id: drawingMaskedArea,
              name: drawingMaskedArea,
              colorArea: '#FF4D4F',
              areaShape: JSON.stringify(prevNodes),
              restrictedStatus: '',
              allowFloorChange: false,
              labels: [],
              // wideArea: 0,
              // positionPxX: 0,
              // positionPxY: 0,
              // engineAreaId: 'ENG001',
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

        return [...prevNodes, newNode];
      });
    },
    [drawingMaskedArea, pointerToWorld, scale, selectedFloorplan, dispatch],
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
      if (world) setCursorWorld(world);
      else setCursorWorld(null);

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
    [pointerToWorld, drawingMaskedArea],
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
                    handleDragCorner(area.name, index, world.x, world.y);
                    checkCornerDragCollision(area.name, index, world.x, world.y);
                  }
                }}
                onDragEnd={(e) => {
                  // Don't stop propagation on drag end
                  // e.evt.stopPropagation();
                  const stage = e.target.getStage();
                  const ptr = stage?.getPointerPosition();
                  const world = pointerToWorld(ptr || null);
                  if (world) {
                    handleCornerDragEnd(area.name, index, world.x, world.y);
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

    const isPointInPolygon = (point: { x: number; y: number }, vs: Nodes[]) => {
      let x = point.x, y = point.y;
      let inside = false;
      for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        let xi = vs[i].x_px, yi = vs[i].y_px;
        let xj = vs[j].x_px, yj = vs[j].y_px;

        let intersect = ((yi > y) !== (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
      }
      return inside;
    };

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
