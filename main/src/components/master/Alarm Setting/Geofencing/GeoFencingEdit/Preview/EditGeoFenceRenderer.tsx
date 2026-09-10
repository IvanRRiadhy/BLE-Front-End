import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Stage, Layer, Circle, Image as KonvaImage, Line, Group, Text, FastLayer } from 'react-konva';
import Konva from 'konva';
import { useSelector, useDispatch, RootState } from 'src/store/Store';
import { MaskedAreaType } from 'src/store/apps/crud/maskedArea';
import { FloorplanDeviceType } from 'src/store/apps/crud/floorplanDevice';
import {
  DrawGeoFence,
  GeoFencingAlarmType,
  UpdateSelectedGeoFencingAlarm,
} from 'src/store/apps/alarmsetting/geofencing';
import earcut from 'earcut';
import { uniqueId } from 'lodash';
import { darken } from '@mui/material';
import toast from 'react-hot-toast';

import CCTVSVG from 'src/assets/images/svgs/devices/7.svg';
import GatewaySVG from 'src/assets/images/svgs/devices/BLE FIX ABU.svg';
import UnknownDevice from 'src/assets/images/masters/Devices/UnknownDevice.png';

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
  activeGeoFence?: GeoFencingAlarmType | null;
  otherGeoFences?: GeoFencingAlarmType[];
  areas: MaskedAreaType[];
  showAreas: boolean;
  devices: FloorplanDeviceType[];
  showDevices: boolean;
  setIsDragging?: (isDragging: string) => void;
  onAreaHoverChange?: (hover: boolean) => void;
  onAreaDragChange?: (drag: boolean) => void;
  onOnArea?: (onArea: boolean) => void;
  stageScale: number;
  stageX: number;
  stageY: number;
  stageRef?: React.RefObject<any>;
  onWheel?: (e: any) => void;
  preview?: boolean;
}

type Point = { x: number; y: number };
type Triangle = [Point, Point, Point];

const EditGeoFenceRenderer: React.FC<Props> = ({
  width,
  height,
  originalWidth,
  originalHeight,
  imageSrc,
  scale,
  activeGeoFence,
  otherGeoFences = [],
  areas,
  showAreas,
  devices,
  showDevices,
  setIsDragging,
  onAreaHoverChange,
  onAreaDragChange,
  onOnArea,
  stageScale,
  stageX,
  stageY,
  stageRef,
  onWheel,
  preview = false,
}) => {
  const dispatch = useDispatch();

  const drawingGeoFence = useSelector(
    (state: RootState) => state.GeoFencingReducer.drawingGeoFence,
  );

  const [bgImage, setBgImage] = useState<HTMLImageElement | undefined>(undefined);
  const [previewImage, setPreviewImage] = useState<HTMLImageElement | undefined>(undefined);

  const [areaDragging, setAreaDragging] = useState(false);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isColliding, setIsColliding] = useState(false);

  const [cursorWorld, setCursorWorld] = useState<{ x: number; y: number } | null>(null);
  const [drawingNodes, setDrawingNodes] = useState<Nodes[]>([]);
  const [cornerDragData, setCornerDragData] = useState<{
    cornerIndex: number;
    originalX: number;
    originalY: number;
  } | null>(null);

  // Background image loading
  useEffect(() => {
    if (!imageSrc) {
      setBgImage(undefined);
      setPreviewImage(undefined);
      return;
    }

    const p = new window.Image();
    p.src = imageSrc;
    p.onload = () => {
      setPreviewImage(p);
      const full = new window.Image();
      full.src = imageSrc;
      full.onload = () => setBgImage(full);
      full.onerror = () => {
        if (!bgImage) setBgImage(p);
      };
    };
  }, [imageSrc]);

  // Pointer position to World coordinates (natural image px)
  const pointerToWorld = useCallback(
    (pointer: { x: number; y: number } | null) => {
      if (!pointer) return null;
      return {
        x: (pointer.x - stageX) / stageScale,
        y: (pointer.y - stageY) / stageScale,
      };
    },
    [stageScale, stageX, stageY],
  );

  // Parse nodes defensively from activeGeoFence
  const activeNodes: Nodes[] = useMemo(() => {
    if (activeGeoFence?.nodes && activeGeoFence.nodes.length > 0) {
      return activeGeoFence.nodes;
    }
    if (activeGeoFence?.areaShape) {
      try {
        const parsed = JSON.parse(activeGeoFence.areaShape);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        // ignore
      }
    }
    return [];
  }, [activeGeoFence?.nodes, activeGeoFence?.areaShape]);

  // Safe helper to extract nodes from other geofences or areas
  const getOtherNodes = useCallback((item: { nodes?: Nodes[]; areaShape?: string }): Nodes[] => {
    if (item.nodes && item.nodes.length > 0) return item.nodes;
    if (item.areaShape) {
      try {
        const parsed = JSON.parse(item.areaShape);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return [];
  }, []);

  const setPointsFromNodes = useCallback((nodes: Nodes[]): number[] => {
    return nodes.flatMap((node) => [node.x_px, node.y_px]);
  }, []);

  // Geometry & Collision helpers
  const triangulate = useCallback((vertices: number[]): Triangle[] => {
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
  }, []);

  const checkTriangleCollision = useCallback((triA: Triangle, triB: Triangle): boolean => {
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
      const length = Math.hypot(normal.x, normal.y);
      if (length > epsilon) {
        axes.push({ x: normal.x / length, y: normal.y / length });
      }
    }

    for (let i = 0; i < 3; i++) {
      const p1 = triB[i];
      const p2 = triB[(i + 1) % 3];
      const edge = { x: p2.x - p1.x, y: p2.y - p1.y };
      const normal = { x: -edge.y, y: edge.x };
      const length = Math.hypot(normal.x, normal.y);
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
  }, []);

  const doLineSegmentsIntersect = useCallback(
    (
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
        if (Math.abs(val) < 1e-9) return 0;
        return val > 0 ? 1 : 2;
      };

      const onSegment = (
        px: number,
        py: number,
        qx: number,
        qy: number,
        rx: number,
        ry: number,
      ) => {
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
    },
    [],
  );

  const checkSelfIntersections = useCallback(
    (nodes: Nodes[]): boolean => {
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
    },
    [doLineSegmentsIntersect],
  );

  const checkPolygonCollision = useCallback(
    (poly1: { nodes: Nodes[] }, poly2: { nodes: Nodes[] }): boolean => {
      const vertices1 = setPointsFromNodes(poly1.nodes);
      const vertices2 = setPointsFromNodes(poly2.nodes);

      if (vertices1.length < 6 || vertices2.length < 6) return false;

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
    },
    [setPointsFromNodes, triangulate, checkTriangleCollision, checkSelfIntersections],
  );

  const checkCollisionWithOffset = useCallback(
    (_areaName: string, dx: number, dy: number): boolean => {
      if (!activeGeoFence || activeNodes.length === 0) return false;

      const proposedArea = {
        nodes: activeNodes.map((node) => ({
          ...node,
          x: (node.x_px + dx) * scale,
          y: (node.y_px + dy) * scale,
          x_px: node.x_px + dx,
          y_px: node.y_px + dy,
        })),
      };

      if (!otherGeoFences) return false;
      return otherGeoFences.some((otherArea) => {
        const otherNodes = getOtherNodes(otherArea);
        if (otherNodes.length < 3) return false;
        return checkPolygonCollision(proposedArea, { nodes: otherNodes });
      });
    },
    [activeGeoFence, activeNodes, scale, otherGeoFences, getOtherNodes, checkPolygonCollision],
  );

  const pointToSegmentDistance = useCallback(
    (px: number, py: number, x1: number, y1: number, x2: number, y2: number): number => {
      const A = px - x1;
      const B = py - y1;
      const C = x2 - x1;
      const D = y2 - y1;

      const dot = A * C + B * D;
      const lenSq = C * C + D * D;
      let param = -1;
      if (lenSq !== 0) param = dot / lenSq;

      let xx: number;
      let yy: number;

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
      return Math.hypot(dx, dy);
    },
    [],
  );

  // Stage Mouse Move
  const handleStageMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    const ptr = stage?.getPointerPosition();
    const world = pointerToWorld(ptr || null);
    if (world) {
      setCursorWorld(world);
    }
  };

  // Canvas Click (Drawing Mode)
  const handleCanvasClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!drawingGeoFence) return;
    const stage = e.target.getStage();
    const ptr = stage?.getPointerPosition();
    const world = pointerToWorld(ptr || null);
    if (!world) return;

    const newNode: Nodes = {
      id: uniqueId(),
      x: world.x * scale,
      y: world.y * scale,
      x_px: world.x,
      y_px: world.y,
    };

    setDrawingNodes((prevNodes) => {
      const updatedNodes = [...prevNodes, newNode];

      let collision = false;
      if (otherGeoFences && otherGeoFences.length > 0 && updatedNodes.length >= 3) {
        collision = otherGeoFences.some((area) => {
          const oNodes = getOtherNodes(area);
          if (oNodes.length < 3) return false;
          return checkPolygonCollision({ nodes: oNodes }, { nodes: updatedNodes });
        });
      }

      if (collision) {
        toast.error('Areas cannot overlap! Position reverted.');
        setDrawingNodes([]);
        dispatch(DrawGeoFence(''));
        return [];
      }

      if (updatedNodes.length === 3) {
        if (activeGeoFence) {
          dispatch(
            UpdateSelectedGeoFencingAlarm({
              ...activeGeoFence,
              nodes: updatedNodes,
              areaShape: JSON.stringify(updatedNodes),
            }),
          );
        }
        setDrawingNodes([]);
        dispatch(DrawGeoFence(''));
      }
      return updatedNodes;
    });
  };

  // Right Click (Cancel drawing)
  const handleRightClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    e.evt.preventDefault();
    if (!drawingGeoFence) return;

    setDrawingNodes([]);
    dispatch(DrawGeoFence(''));
  };

  // Drag Area Handlers
  const handleAreaDragStart = (e: Konva.KonvaEventObject<DragEvent>) => {
    if (drawingGeoFence) return;
    const stage = e.target.getStage();
    const world = pointerToWorld(stage?.getPointerPosition() || null);
    if (world) {
      setDragStartPos(world);
    }
    setIsDragging?.(activeGeoFence?.name || 'geofence');
    setAreaDragging(true);
    onAreaDragChange?.(true);
  };

  const handleAreaDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    const stage = e.target.getStage();
    const world = pointerToWorld(stage?.getPointerPosition() || null);

    if (world && dragStartPos && activeGeoFence && activeNodes.length > 0) {
      const dx = world.x - dragStartPos.x;
      const dy = world.y - dragStartPos.y;

      if (dx !== 0 || dy !== 0) {
        const collision = checkCollisionWithOffset(activeGeoFence.name, dx, dy);
        setIsColliding(collision);

        if (collision) {
          toast.error('Areas cannot overlap! Position reverted.');
        } else {
          const updatedNodes = activeNodes.map((n) => ({
            ...n,
            x: (n.x_px + dx) * scale,
            y: (n.y_px + dy) * scale,
            x_px: n.x_px + dx,
            y_px: n.y_px + dy,
          }));

          dispatch(
            UpdateSelectedGeoFencingAlarm({
              ...activeGeoFence,
              nodes: updatedNodes,
              areaShape: JSON.stringify(updatedNodes),
            }),
          );
        }
      }
    }

    e.target.x(0);
    e.target.y(0);
    setIsDragging?.('');
    setAreaDragging(false);
    onAreaDragChange?.(false);
    setIsColliding(false);
  };

  // Corner Drag Handlers
  const handleCornerDragStart = (index: number) => {
    if (!activeGeoFence || !activeNodes[index]) return;
    setCornerDragData({
      cornerIndex: index,
      originalX: activeNodes[index].x_px,
      originalY: activeNodes[index].y_px,
    });
    setIsDragging?.(activeGeoFence.name);
  };

  const handleCornerDragEnd = (index: number, e: Konva.KonvaEventObject<DragEvent>) => {
    if (!activeGeoFence || !cornerDragData) return;
    const stage = e.target.getStage();
    const world = pointerToWorld(stage?.getPointerPosition() || null);

    if (world) {
      const proposedNodes = [...activeNodes];
      proposedNodes[index] = {
        ...proposedNodes[index],
        x: world.x * scale,
        y: world.y * scale,
        x_px: world.x,
        y_px: world.y,
      };

      const hasCollision = otherGeoFences?.some((otherArea) => {
        const oNodes = getOtherNodes(otherArea);
        if (oNodes.length < 3) return false;
        return checkPolygonCollision({ nodes: proposedNodes }, { nodes: oNodes });
      });

      const selfIntersects = checkSelfIntersections(proposedNodes);

      if (hasCollision || selfIntersects) {
        toast.error('Invalid position! Area cannot overlap or self-intersect.');
      } else {
        dispatch(
          UpdateSelectedGeoFencingAlarm({
            ...activeGeoFence,
            nodes: proposedNodes,
            areaShape: JSON.stringify(proposedNodes),
          }),
        );
      }
    }

    e.target.x(0);
    e.target.y(0);
    setCornerDragData(null);
    setIsDragging?.('');
    setIsColliding(false);
  };

  // Delete corner handle (Right click)
  const handleDeleteCorner = (index: number) => {
    if (!activeGeoFence || activeNodes.length <= 3) {
      toast.error('A geofence area must have at least 3 points.');
      return;
    }
    const newNodes = [...activeNodes];
    newNodes.splice(index, 1);
    dispatch(
      UpdateSelectedGeoFencingAlarm({
        ...activeGeoFence,
        nodes: newNodes,
        areaShape: JSON.stringify(newNodes),
      }),
    );
  };

  // Insert corner handle (Double-click or Shift+Click)
  const handleInsertCorner = (worldX: number, worldY: number) => {
    if (!activeGeoFence || activeNodes.length === 0) return;

    let insertIndex = -1;
    let minDistance = Infinity;

    for (let i = 0; i < activeNodes.length; i++) {
      const nextIndex = (i + 1) % activeNodes.length;
      const distance = pointToSegmentDistance(
        worldX,
        worldY,
        activeNodes[i].x_px,
        activeNodes[i].y_px,
        activeNodes[nextIndex].x_px,
        activeNodes[nextIndex].y_px,
      );

      if (distance < minDistance) {
        minDistance = distance;
        insertIndex = nextIndex;
      }
    }

    if (insertIndex !== -1) {
      const newNodes = [...activeNodes];
      newNodes.splice(insertIndex, 0, {
        id: uniqueId(),
        x: worldX * scale,
        y: worldY * scale,
        x_px: worldX,
        y_px: worldY,
      });

      dispatch(
        UpdateSelectedGeoFencingAlarm({
          ...activeGeoFence,
          nodes: newNodes,
          areaShape: JSON.stringify(newNodes),
        }),
      );
    }
  };

  // Device Icons
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

    const x = device.posPxX - 20;
    const y = device.posPxY - 20;

    return (
      <Group key={`device-${device.id}`} name="device">
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
    <div style={{ width, height, position: 'relative' }}>
      <Stage
        ref={stageRef as any}
        pixelRatio={1}
        width={width}
        height={height}
        scaleX={stageScale}
        scaleY={stageScale}
        x={stageX}
        y={stageY}
        onMouseMove={handleStageMouseMove}
        onClick={handleCanvasClick}
        onContextMenu={handleRightClick}
        onWheel={onWheel}
      >
        {/* Background Layer (Full Image Resolution) */}
        <FastLayer listening={false}>
          {imageToDraw && (
            <KonvaImage
              image={imageToDraw}
              width={originalWidth}
              height={originalHeight}
              opacity={1}
            />
          )}
        </FastLayer>

        {/* Masked Areas Layer */}
        {showAreas && (
          <Layer listening={false}>
            {areas.map((area) => {
              const pts = area.nodes ? setPointsFromNodes(area.nodes) : [];
              if (pts.length < 6) return null;
              return (
                <Line
                  key={`masked-area-${area.id}`}
                  points={pts}
                  stroke={darken(area.colorArea || '#333333', 0.5)}
                  strokeWidth={3}
                  lineJoin="round"
                  lineCap="round"
                  closed
                  fill={area.colorArea || '#888888'}
                  opacity={0.15}
                />
              );
            })}
          </Layer>
        )}

        {/* Other GeoFences Layer */}
        <Layer listening={false}>
          {otherGeoFences.map((gf) => {
            const oNodes = getOtherNodes(gf);
            const pts = setPointsFromNodes(oNodes);
            if (pts.length < 6) return null;
            return (
              <Line
                key={`other-gf-${gf.id}`}
                points={pts}
                stroke={darken(gf.color || '#f55549', 0.3)}
                strokeWidth={4}
                lineJoin="round"
                lineCap="round"
                closed
                fill={gf.color || '#f55549'}
                opacity={0.35}
              />
            );
          })}
        </Layer>

        {/* Devices Layer */}
        {showDevices && (
          <Layer listening={false}>
            {devices.map((d) => renderDeviceShape(d))}
          </Layer>
        )}

        {/* Active GeoFence Layer */}
        {activeGeoFence && activeNodes.length > 0 && (
          <Layer>
            <Group>
              <Line
                points={setPointsFromNodes(activeNodes)}
                stroke={isColliding ? 'red' : darken(activeGeoFence.color || '#f55549', 0.5)}
                strokeWidth={5}
                lineJoin="round"
                lineCap="round"
                closed
                fill={activeGeoFence.color || '#f55549'}
                opacity={0.65}
                draggable={!preview && !drawingGeoFence}
                onMouseEnter={() => {
                  if (!drawingGeoFence) {
                    onAreaHoverChange?.(true);
                    onOnArea?.(true);
                  }
                }}
                onMouseLeave={() => {
                  if (!drawingGeoFence) {
                    onAreaHoverChange?.(false);
                    onOnArea?.(false);
                  }
                }}
                onDragStart={handleAreaDragStart}
                onDragEnd={handleAreaDragEnd}
                onDblClick={(e) => {
                  const stage = e.target.getStage();
                  const world = pointerToWorld(stage?.getPointerPosition() || null);
                  if (world) {
                    handleInsertCorner(world.x, world.y);
                  }
                }}
                onMouseDown={(e) => {
                  if (e.evt.shiftKey) {
                    e.evt.preventDefault();
                    const stage = e.target.getStage();
                    const world = pointerToWorld(stage?.getPointerPosition() || null);
                    if (world) {
                      handleInsertCorner(world.x, world.y);
                    }
                  }
                }}
              />

              {/* Corner Handles */}
              {!preview &&
                !areaDragging &&
                !drawingGeoFence &&
                activeNodes.map((node, index) => (
                  <Circle
                    key={`corner-${node.id || index}`}
                    x={node.x_px}
                    y={node.y_px}
                    radius={7}
                    fill={activeGeoFence.color || '#f55549'}
                    stroke="white"
                    strokeWidth={2}
                    draggable
                    onMouseEnter={(e) => {
                      const shape = e.target as Konva.Circle;
                      shape.radius(10);
                      shape.stroke('black');
                      shape.strokeWidth(3);
                      onAreaHoverChange?.(true);
                      shape.getLayer()?.batchDraw();
                    }}
                    onMouseLeave={(e) => {
                      const shape = e.target as Konva.Circle;
                      shape.radius(7);
                      shape.stroke('white');
                      shape.strokeWidth(2);
                      onAreaHoverChange?.(false);
                      shape.getLayer()?.batchDraw();
                    }}
                    onDragStart={() => handleCornerDragStart(index)}
                    onDragEnd={(e) => handleCornerDragEnd(index, e)}
                    onContextMenu={(e) => {
                      e.evt.preventDefault();
                      handleDeleteCorner(index);
                    }}
                  />
                ))}
            </Group>
          </Layer>
        )}

        {/* Drawing Nodes & Interactive Guide Layer */}
        {drawingGeoFence && (
          <Layer listening={false}>
            {drawingNodes.map((node) => (
              <Circle
                key={`draw-node-${node.id}`}
                x={node.x_px}
                y={node.y_px}
                radius={7}
                fill="blue"
                stroke="white"
                strokeWidth={2}
              />
            ))}

            {drawingNodes.length > 0 && cursorWorld && (
              <>
                {/* Dashed line to cursor */}
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
                  closed={false}
                />

                {/* Connecting lines between drawn nodes */}
                {drawingNodes.length > 1 &&
                  drawingNodes.map((node, index) => {
                    if (index === drawingNodes.length - 1) return null;
                    const nextNode = drawingNodes[index + 1];
                    return (
                      <Line
                        key={`draw-line-${node.id}`}
                        points={[node.x_px, node.y_px, nextNode.x_px, nextNode.y_px]}
                        stroke="blue"
                        strokeWidth={2}
                        closed={false}
                      />
                    );
                  })}
              </>
            )}
          </Layer>
        )}
      </Stage>
    </div>
  );
};

export default EditGeoFenceRenderer;
