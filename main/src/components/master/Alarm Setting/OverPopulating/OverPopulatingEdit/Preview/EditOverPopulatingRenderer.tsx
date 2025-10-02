import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  // useTheme,
} from '@mui/material';
import Konva from 'konva';
import React, { useEffect, useState } from 'react';
import { Stage, Layer, Circle, Image as KonvaImage, Line } from 'react-konva';
import { useSelector, useDispatch, RootState } from 'src/store/Store';
import { MaskedAreaType } from 'src/store/apps/crud/maskedArea';
import earcut from 'earcut';
import { uniqueId } from 'lodash';
import { darken } from '@mui/material';
import {
  DrawOverPopulating,
  OverPopulatingAlarmType,
  UpdateSelectedOverPopulatingAlarm,
} from 'src/store/apps/alarmsetting/overpopulating';

type Nodes = {
  id: string;
  x: number;
  y: number;
  x_px: number;
  y_px: number;
};

const EditOverPopulatingRenderer: React.FC<{
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  imageSrc?: string;
  scale: number;
  setIsDragging: (isDragging: string) => void;
  setCursor: (cursor: string) => void;
  activeOverPopulating?: OverPopulatingAlarmType;
  otherOverPopulatings?: OverPopulatingAlarmType[];
  areas: MaskedAreaType[];
  showAreas: boolean;
}> = ({
  width,
  height,
  originalWidth,
  originalHeight,
  imageSrc,
  scale,
  setIsDragging,
  setCursor,
  activeOverPopulating,
  otherOverPopulatings,
  areas,
  showAreas,
}) => {
  const stageRef = React.useRef<Konva.Stage>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const dispatch = useDispatch();
  const scaleX = originalWidth / width;
  const scaleY = originalHeight / height;
  const [activeOverPopulatingArea, setActiveOverPopulatingArea] = useState(activeOverPopulating?.name || '');
  const [areaDragging, setAreaDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ dx: 0, dy: 0 });
  const [isColliding, setIsColliding] = useState(false);
  const drawingOverPopulating = useSelector(
    (state: RootState) => state.OverPopulatingReducer.drawingOverPopulating,
  );
  const [cursorPosition, setCursorPosition] = useState<{ x: number; y: number } | null>(null);
  const [drawingNodes, setDrawingNodes] = useState<Nodes[]>([]); // Track the nodes being drawn

  useEffect(() => {
    setActiveOverPopulatingArea(activeOverPopulating?.name || '');
    // console.log('Active OverPopulating changed:', activeOverPopulating?.areaShape);
  }, [activeOverPopulating]);
  const [cornerDragData, setCornerDragData] = useState<{
    areaName: string;
    cornerIndex: number;
    originalX: number;
    originalY: number;
  } | null>(null);
  //const [points, setPoints] = useState<number[]>([])
  useEffect(() => {
    if (imageSrc) {
      const img = new window.Image();
      img.src = imageSrc;
      img.onload = () => {
        setImage(img);
      };
    }
    // console.log('Width:', width, 'Height:', height, 'Scale:', scale);
  }, [imageSrc]);

  const setPointsFromNodes = (nodes: Nodes[]): number[] => {
    // console.log('Setting nodes: ', nodes.flatMap((node) => [node.x /originalWidth * width, node.y / originalHeight * height]))
    return nodes.flatMap((node) => [
      (node.x_px / originalWidth) * width,
      (node.y_px / originalHeight) * height,
    ]); // Flatten x and y into a single array
  };

  type Point = { x: number; y: number };
  type Triangle = [Point, Point, Point];

  const triangulate = (vertices: number[]): Triangle[] => {
    const indices = earcut(vertices);
    const triangles: Triangle[] = [];
    for (let i = 0; i < indices.length; i += 3) {
      // Explicitly construct a Triangle (3-point tuple)
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
    const epsilon = 0.0001; // Account for floating-point errors

    // Helper to project a triangle onto an axis
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

    // Generate axes from triA's edges
    for (let i = 0; i < 3; i++) {
      const p1 = triA[i];
      const p2 = triA[(i + 1) % 3];
      const edge = { x: p2.x - p1.x, y: p2.y - p1.y };
      const normal = { x: -edge.y, y: edge.x }; // Perpendicular
      const length = Math.sqrt(normal.x ** 2 + normal.y ** 2);
      if (length > epsilon) {
        axes.push({ x: normal.x / length, y: normal.y / length }); // Normalized
      }
    }

    // Generate axes from triB's edges
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

    // Check for separating axes
    for (const axis of axes) {
      const projA = project(triA, axis);
      const projB = project(triB, axis);

      if (projA.max + epsilon < projB.min || projB.max + epsilon < projA.min) {
        return false; // No collision
      }
    }

    return true; // Collision detected
  };
  const checkPolygonCollision = (poly1: { nodes: Nodes[] }, poly2: { nodes: Nodes[] }): boolean => {
    const vertices1 = setPointsFromNodes(poly1.nodes);
    const vertices2 = setPointsFromNodes(poly2.nodes);

    const triangles1 = triangulate(vertices1);
    const triangles2 = triangulate(vertices2);

    for (const tri1 of triangles1) {
      for (const tri2 of triangles2) {
        if (checkTriangleCollision(tri1, tri2)) {
          return true; // Collision detected
        }
      }
    }
    // Check for self-intersections in poly1
    if (checkSelfIntersections(poly1.nodes)) {
      return true; // Self-intersection detected
    }

    // Check for self-intersections in poly2
    if (checkSelfIntersections(poly2.nodes)) {
      return true; // Self-intersection detected
    }
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
        // Skip adjacent edges
        if (j === i || (j + 1) % n === i) continue;

        const x3 = nodes[j].x_px;
        const y3 = nodes[j].y_px;
        const x4 = nodes[(j + 1) % n].x_px;
        const y4 = nodes[(j + 1) % n].y_px;

        if (doLineSegmentsIntersect(x1, y1, x2, y2, x3, y3, x4, y4)) {
          return true; // Self-intersection detected
        }
      }
    }

    return false; // No self-intersections
  };
  const checkCollisionWithOffset = (areaName: string, dx: number, dy: number): boolean => {
    if (!activeOverPopulating) return false;

    const proposedArea = {
      nodes: activeOverPopulating.nodes
        ? activeOverPopulating.nodes.map((node) => ({
            ...node,
            x: node.x + dx * scale,
            y: node.y + dy * scale,
            x_px: node.x_px + dx,
            y_px: node.y_px + dy,
          }))
        : [],
    };
    if (otherOverPopulatings === undefined) return false;
    return otherOverPopulatings.some((otherArea) => {
      if (!otherArea.nodes) return false; // Add this check
      return checkPolygonCollision(proposedArea, { nodes: otherArea.nodes });
    });
  };

  const checkCornerDragCollision = (cornerIndex: number, newX: number, newY: number): boolean => {
    if (!activeOverPopulating) return false;

    const proposedArea = {
      nodes: activeOverPopulating.nodes
        ? activeOverPopulating.nodes.map((node, index) =>
            index === cornerIndex ? { ...node, x: newX, y: newY } : node,
          )
        : [],
    };

    if (otherOverPopulatings === undefined) return false;
    return otherOverPopulatings.some((otherArea) => {
      if (!otherArea.nodes) return false; // Add this check
      return checkPolygonCollision(proposedArea, { nodes: otherArea.nodes });
    });
  };

  // Function to check if two line segments intersect
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
    // Calculate the orientation of the triplet (p1, p2, p3)
    const orientation = (
      px1: number,
      py1: number,
      px2: number,
      py2: number,
      px3: number,
      py3: number,
    ) => {
      const val = (py2 - py1) * (px3 - px2) - (px2 - px1) * (py3 - py2);
      if (val === 0) return 0; // colinear
      return val > 0 ? 1 : 2; // clock or counterclock wise
    };

    // Check if point q lies on segment pr
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

    // General case
    if (o1 !== o2 && o3 !== o4) return true;

    // Special cases (colinear points)
    if (o1 === 0 && onSegment(x1, y1, x3, y3, x2, y2)) return true;
    if (o2 === 0 && onSegment(x1, y1, x4, y4, x2, y2)) return true;
    if (o3 === 0 && onSegment(x3, y3, x1, y1, x4, y4)) return true;
    if (o4 === 0 && onSegment(x3, y3, x2, y2, x4, y4)) return true;

    return false;
  };

  const handleCanvasClick = () => {
    if (!drawingOverPopulating) return; // Only allow drawing if the drawing mode is active
    const stage = stageRef.current;
    if (!stage) return;
    const pointerPosition = stage.getPointerPosition();
    if (!pointerPosition) return;
    console.log('drawingNodes before click:', drawingNodes);
    const { x, y } = pointerPosition;
    const newNode = {
      id: uniqueId(),
      x: x * scaleX,
      y: y * scaleX,
      x_px: x * scaleX,
      y_px: y * scaleY,
    };
    if (!activeOverPopulating) return;
    setDrawingNodes((prevNodes) => {
      const updatedNodes = [...prevNodes, newNode];
      let collision = false;
      if (otherOverPopulatings === undefined) {
        collision = false;
      } else {
        collision = otherOverPopulatings.some((area) => {
          return checkPolygonCollision(
            { nodes: area.nodes ? area.nodes : [] },
            { nodes: updatedNodes },
          );
        });
      }
      if (collision) {
        // console.log(drawingNodes);
        alert(`Areas cannot overlap! Position reverted.`);
        setDrawingNodes([]);
        dispatch(DrawOverPopulating('')); // Reset the drawing mode
        return []; // Revert to previous nodes
      }
      if (updatedNodes.length === 3) {
        dispatch(
          UpdateSelectedOverPopulatingAlarm({
            ...activeOverPopulating,
            nodes: updatedNodes,
            areaShape: JSON.stringify(updatedNodes),
          }),
        );
        setDrawingNodes([]);
        dispatch(DrawOverPopulating('')); // Exit drawing mode after completing the polygon
      }
      return updatedNodes;
    });
  };

  useEffect(() => {
    if (drawingOverPopulating === undefined) return;
    if (drawingOverPopulating !== '') {
      console.log('Drawing mode active for OverPopulating ID:', drawingOverPopulating);
      setCursor('crosshair');
    } else {
      setCursor('default');
    }
  }, [drawingOverPopulating]);
  // useEffect(() => {

  const handleDragStart = (e: string) => {
    if (drawingOverPopulating) return; // Prevent dragging while drawing
    setIsDragging(e);
    setDragOffset({ dx: 0, dy: 0 });
    setIsColliding(false);
  };
  const handleDragMove = (dx: number, dy: number) => {
    const dPxX = dx;
    const dPxY = dy;
    setDragOffset({ dx: dPxX, dy: dPxY });
  };

  const handleDragEnd = async (areaName: string) => {
    if (activeOverPopulating) {
      // console.log(`Nodes of ${areaName}:`, JSON.stringify(area.nodes, null, 2)); // Log nodes in JSON format
    }
    const collision = checkCollisionWithOffset(areaName, dragOffset.dx, dragOffset.dy);
    // console.log('isColliding', collision);
    setIsColliding(collision);
    if (collision) {
      // Revert by not applying the drag changes
      // console.log('Overlapping detected');
      alert('Areas cannot overlap! Position reverted.');
    } else {
      // Apply the drag changes
      const { dx, dy } = dragOffset;
      if (dx !== 0 || dy !== 0) {
        await handleDragArea(areaName, dx, dy);
        // await handleSaveArea();
        // console.log('Area moved successfully!');
      }
    }

    // Reset drag state
    // setIsDragging('');
    setAreaDragging(false);
    setDragOffset({ dx: 0, dy: 0 });
    setIsColliding(false);
    // handleSaveArea();
  };

  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;
    const pointerPosition = stage.getPointerPosition();
    if (pointerPosition) {
      setCursorPosition({ x: pointerPosition.x, y: pointerPosition.y });
    }
  };

  const handleMouseUp = () => {
    // setIsDragging('');
    setAreaDragging(false);
  };

  const handleCornerDragStart = (areaName: string, cornerIndex: number) => {
    console.log('Started dragging corner', cornerIndex, 'of area', areaName);
    if (!activeOverPopulating) return;

    const corner = activeOverPopulating.nodes && activeOverPopulating.nodes[cornerIndex];
    if (!corner) return;
    setCornerDragData({
      areaName,
      cornerIndex,
      originalX: corner.x,
      originalY: corner.y,
    });
    setIsDragging(areaName);
  };

  const handleDragCorner = (areaName: string, cornerIndex: number, x: number, y: number) => {
    const newNodes = [...(activeOverPopulating?.nodes || [])];
    newNodes[cornerIndex] = {
      ...newNodes[cornerIndex],
      x: x * scaleX,
      y: y * scaleY,
      x_px: x,
      y_px: y,
    }; // Update the corner's position
    const updatedOverPopulating = {
      ...activeOverPopulating,
      nodes: newNodes,
      areaShape: JSON.stringify(newNodes),
    };
    // console.log('updatedOverPopulating', updatedOverPopulating);
    if (updatedOverPopulating) {
      dispatch(UpdateSelectedOverPopulatingAlarm(updatedOverPopulating));
    }
  };
  const handleCornerDragMove = (cornerIndex: number, x: number, y: number) => {
    // Just store the proposed position, don't check yet
    const dPxX = x;
    const dPxY = y;
    // Still check for collisions with other areas during drag
    const collision = checkCornerDragCollision(cornerIndex, dPxX, dPxY);
    setIsColliding(collision);
  };

  const handleCornerDragEnd = (areaName: string, cornerIndex: number, x: number, y: number) => {
    if (!activeOverPopulating) return;
    const dPxX = x;
    const dPxY = y;
    // Create the proposed new polygon
    const proposedNodes = activeOverPopulating.nodes ? [...activeOverPopulating.nodes] : [];
    proposedNodes[cornerIndex] = { ...proposedNodes[cornerIndex], x: dPxX, y: dPxY };

    // Check for both collisions and self-intersections
    if (otherOverPopulatings === undefined) return false;
    const hasCollision = otherOverPopulatings.some((otherArea) => {
      if (!otherArea.nodes) return false; // Add this check
      return checkPolygonCollision({ nodes: proposedNodes }, { nodes: otherArea.nodes });
    });

    if (hasCollision) {
      // Revert to original position
      if (cornerDragData) {
        // console.log(isColliding);
        if (!activeOverPopulating.nodes) return false;
        // console.log(checkPolygonCollision({ nodes: proposedNodes }, { nodes: area.nodes }));
        // alert('Invalid position! Lines cannot intersect or overlap other areas.');
        handleDragCorner(
          cornerDragData.areaName,
          cornerDragData.cornerIndex,
          cornerDragData.originalX,
          cornerDragData.originalY,
        );
      }
    } else {
      // Apply the change
      handleDragCorner(areaName, cornerIndex, dPxX, dPxY);
      // handleSaveArea();
    }

    // Reset drag state
    setCornerDragData(null);
    setIsColliding(false);
    // setIsDragging('');
    // handleSaveArea();
  };

  const handleDeleteCorner = (areaName: string, cornerIndex: number) => {
    if (!activeOverPopulating) return;
    const newNodes = [...(activeOverPopulating.nodes || [])];
    newNodes.splice(cornerIndex, 1); // Remove the corner at the specified index
    const updatedOverPopulating = {
      ...activeOverPopulating,
      nodes: newNodes,
      areaShape: JSON.stringify(newNodes),
    };
    if (updatedOverPopulating) {
      dispatch(UpdateSelectedOverPopulatingAlarm(updatedOverPopulating));
    }
  };

  const handleDragArea = (areaName: string, dx: number, dy: number) => {
    if (!activeOverPopulating) return;
    const updatedOverPopulating = {
      ...activeOverPopulating,
      nodes: activeOverPopulating.nodes?.map((node) => ({
        ...node,
        x: node.x + dx * scale,
        y: node.y + dy * scale,
        x_px: node.x_px + dx,
        y_px: node.y_px + dy,
      })),
      areaShape: JSON.stringify(
        activeOverPopulating.nodes?.map((node) => ({
          ...node,
          x: node.x + dx * scale,
          y: node.y + dy * scale,
          x_px: node.x_px + dx,
          y_px: node.y_px + dy,
        })),
      ),
    };
    // console.log('updatedOverPopulating', updatedOverPopulating);
    if (updatedOverPopulating) {
      dispatch(UpdateSelectedOverPopulatingAlarm(updatedOverPopulating));
    }
  };

  const handleInsertCorner = (areaName: string, clickX: number, clickY: number) => {
    if (!activeOverPopulating) return;

    const { nodes } = activeOverPopulating;
    if (!nodes) return;

    let insertIndex = -1;
    let minDistance = Infinity;

    for (let i = 0; i < (nodes?.length || 0); i++) {
      const nextIndex = (i + 1) % (nodes?.length || 0);
      const distance = pointToSegmentDistance(
        clickX,
        clickY,
        nodes[i].x_px,
        nodes[i].y_px,
        nodes[nextIndex].x_px,
        nodes[nextIndex].y_px,
      );

      if (distance < minDistance) {
        minDistance = distance;
        insertIndex = nextIndex;
      }
    }

    const newNodes = [...(nodes || [])];
    newNodes.splice(insertIndex, 0, {
      id: uniqueId(),
      x: clickX * scale,
      y: clickY * scale,
      x_px: clickX,
      y_px: clickY,
    });
    const updatedOverPopulating = {
      ...activeOverPopulating,
      nodes: newNodes,
      areaShape: JSON.stringify(newNodes),
    };
    if (updatedOverPopulating) {
      dispatch(UpdateSelectedOverPopulatingAlarm(updatedOverPopulating));
    }
  };

  function pointToSegmentDistance(
    px: number,
    py: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
  ): number {
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
  }
  const handleRightClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    e.evt.preventDefault();

    if (!drawingOverPopulating) return;

    // Cancel drawing
    setDrawingNodes([]); // Clear current drawing nodes
    dispatch(DrawOverPopulating('')); // Reset drawing mode
    console.log('Drawing cancelled by right click');
  };

  return (
    <>
      <Stage
        ref={stageRef}
        width={width}
        height={height}
        style={{ position: 'absolute', top: 0, left: 0 }}
        onMouseMove={handleMouseMove}
        onClick={handleCanvasClick}
        onContextMenu={handleRightClick}
      >
        <Layer>
          {image && (
            <KonvaImage
              image={image}
              width={width}
              height={height}
              opacity={1}
              top={0}
              left={0}
              bottom={0}
              right={0}
            />
          )}
          {showAreas &&
            areas.map((area) => (
              <Line
                key={area.id}
                points={area.nodes ? setPointsFromNodes(area.nodes) : []}
                stroke={darken(area.colorArea, 0.5)}
                strokeWidth={5}
                lineJoin="round"
                lineCap="round"
                closed
                fill={area.colorArea}
                opacity={0.1}
              />
            ))}
          {otherOverPopulatings &&
            otherOverPopulatings.map((area) => (
              <Line
                key={area.id}
                points={area.nodes ? setPointsFromNodes(area.nodes) : []}
                stroke={darken(area.color, 0.3)}
                strokeWidth={5}
                lineJoin="round"
                lineCap="round"
                closed
                fill={area.color}
                opacity={0.35}
              />
            ))}
          {activeOverPopulating && (
            <React.Fragment key={activeOverPopulating.id}>
              <Line
                points={activeOverPopulating.nodes ? setPointsFromNodes(activeOverPopulating.nodes) : []}
                stroke={isColliding ? 'red' : darken(activeOverPopulating.color, 0.5)}
                strokeWidth={5}
                lineJoin="round"
                lineCap="round"
                closed
                fill={activeOverPopulating.color}
                opacity={0.7}
                draggable
                onMouseEnter={() => {
                  if (!drawingOverPopulating) setCursor('move');
                }}
                onMouseLeave={() => {
                  if (!drawingOverPopulating) setCursor('grab');
                }}
                onMouseDown={(e) => {
                  if (!drawingOverPopulating) {
                    setIsDragging(activeOverPopulating.name);
                    handleDragStart(activeOverPopulating.name);
                    const isShiftPressed = e.evt.shiftKey;
                    const stage = e.target.getStage();
                    const mousePos = stage?.getPointerPosition();
                    if (isShiftPressed && mousePos) {
                      e.evt.preventDefault();
                      handleInsertCorner(activeOverPopulating.name, mousePos.x, mousePos.y);
                    }
                  }
                }}
                onDblClick={(e) => {
                  const stage = e.target.getStage();
                  const mousePos = stage?.getPointerPosition();

                  if (mousePos) {
                    e.evt.preventDefault();
                    handleInsertCorner(
                      activeOverPopulating.name,
                      mousePos.x * scaleX,
                      mousePos.y * scaleY,
                    );
                  }
                }}
                onMouseUp={handleMouseUp}
                onDragStart={() => {
                  setIsDragging(activeOverPopulating.name);
                  setAreaDragging(true);
                }}
                onDragMove={(e) => {
                  handleDragMove(e.target.x() * scaleX, e.target.y() * scaleY);
                }}
                onDragEnd={(e) => {
                  handleDragEnd(activeOverPopulating.name);
                  e.target.x(0);
                  e.target.y(0);
                  setIsDragging('');
                }}
              />
              {!areaDragging &&
                activeOverPopulating.nodes &&
                activeOverPopulating.nodes.map((node, index) => (
                  <Circle
                    key={node.id}
                    x={node.x_px / scaleX}
                    y={node.y_px / scaleY}
                    radius={7}
                    fill="red"
                    draggable
                    strokeWidth={2}
                    onMouseEnter={(e) => {
                      if (!drawingOverPopulating) {
                        const shape = e.target as Konva.Circle;
                        shape.radius(10); // Increase radius on hover
                        shape.stroke('black'); // Add green outline
                        shape.strokeWidth(3);
                        setCursor('move');
                        shape.getLayer()?.batchDraw(); // Redraw the layer for immediate effect
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!drawingOverPopulating) {
                        const shape = e.target as Konva.Circle;
                        shape.radius(7); // Reset radius
                        shape.stroke(''); // Remove outline
                        shape.strokeWidth(1);
                        setCursor('grab');
                        shape.getLayer()?.batchDraw(); // Redraw the layer for immediate effect
                      }
                    }}
                    onDragStart={() => {
                      setIsDragging(activeOverPopulating.name);
                      handleCornerDragStart(activeOverPopulating.name, index);
                    }}
                    onDragMove={(e) => {
                      handleDragCorner(
                        activeOverPopulating.name,
                        index,
                        e.target.x() * scaleX,
                        e.target.y() * scaleY,
                      );
                      handleCornerDragMove(index, e.target.x() * scaleX, e.target.y() * scaleY);
                    }}
                    onMouseDown={() => {
                      setIsDragging(activeOverPopulating.name);
                      handleDragStart(activeOverPopulating.name)}}
                    onMouseUp={handleMouseUp}
                    onDragEnd={(e) => {
                      handleCornerDragEnd(
                        activeOverPopulating.name,
                        index,
                        e.target.x() * scaleX,
                        e.target.y() * scaleY,
                      );
                      handleDragEnd(activeOverPopulating.name); // Pass the activeOverPopulating name
                    }}
                    onContextMenu={(e) => {
                      e.evt.preventDefault(); // Prevent the default context menu from appearing
                      handleDeleteCorner(activeOverPopulating.name, index); // Call the function to delete the corner
                    }}
                  />
                ))}
            </React.Fragment>
          )}
          {drawingOverPopulating && (
            <>
              {drawingNodes.map((node) => (
                <Circle
                  key={node.id}
                  x={node.x_px / scaleX}
                  y={node.y_px / scaleY}
                  radius={7}
                  fill="blue" // Color for the drawing nodes
                  draggable={false} // Disable dragging for these circles
                  stroke="black"
                  strokeWidth={2}
                />
              ))}
              {/* Render dashed lines connecting each node to the cursor */}
              {drawingNodes.length > 0 && cursorPosition && (
                <>
                  {drawingNodes.map((node) => (
                    <Line
                      key={`line-to-cursor-${node.id}`}
                      points={[
                        node.x / scaleX,
                        node.y / scaleX,
                        cursorPosition.x,
                        cursorPosition.y,
                      ]} // Connect each node to the cursor
                      stroke="blue"
                      strokeWidth={2}
                      dash={[10, 5]} // Dashed line pattern
                      closed={false}
                    />
                  ))}
                  {drawingNodes.length > 1 &&
                    drawingNodes.map((node, index) => {
                      if (index === drawingNodes.length - 1) return null; // Skip the last node
                      const nextNode = drawingNodes[index + 1];
                      return (
                        <Line
                          key={`line-to-next-${node.id}`}
                          points={[
                            node.x_px / scaleX,
                            node.y_px / scaleY,
                            nextNode.x_px / scaleX,
                            nextNode.y_px / scaleY,
                          ]} // Connect each node to the next node
                          stroke="blue"
                          strokeWidth={2}
                          dash={[10, 5]} // Dashed line pattern
                          closed={false}
                        />
                      );
                    })}
                </>
              )}
            </>
          )}
        </Layer>
      </Stage>
    </>
  );
};

export default EditOverPopulatingRenderer;
