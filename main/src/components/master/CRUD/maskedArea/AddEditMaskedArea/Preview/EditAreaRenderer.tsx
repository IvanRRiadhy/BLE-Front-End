import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  lighten,
  // useTheme,
} from '@mui/material';
import Konva from 'konva';
import React, { useEffect, useState } from 'react';
import { Stage, Layer, Circle, Image as KonvaImage, Line } from 'react-konva';
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
import { darken } from '@mui/material';

type Nodes = {
  id: string;
  x: number;
  y: number;
  x_px: number;
  y_px: number;
};

const EditAreaRenderer: React.FC<{
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  imageSrc?: string;
  scale: number;
  maskedAreas: MaskedAreaType[];
  activeMaskedArea?: MaskedAreaType | null;
  setIsDragging: (isDragging: string) => void;
  setCursor: (cursor: string) => void;
  preview?: boolean;
}> = ({
  width,
  height,
  originalWidth,
  originalHeight,
  imageSrc,
  scale,
  maskedAreas,
  activeMaskedArea,
  setIsDragging,
  setCursor,
  preview = false,
}) => {
  // const theme = useTheme();
  const stageRef = React.useRef<Konva.Stage>(null);

  const dispatch = useDispatch();
  // const [scales, setScale] = useState<number>(scale);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const scaleX = originalWidth / width;
  const scaleY = originalHeight / height;
  const [activeArea, setActiveArea] = useState(activeMaskedArea?.name || '');
  const [areaDragging, setAreaDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ dx: 0, dy: 0 });
  const [isColliding, setIsColliding] = useState(false);
  const editingMaskedArea = useSelector(
    (state: RootState) => state.maskedAreaReducer.editingMaskedArea,
  );
  const [editingArea, setEditingArea] = useState(editingMaskedArea?.name || '');
  const unsavedArea: MaskedAreaType[] = useSelector(
    (state: RootState) => state.maskedAreaReducer.unsavedMaskedAreas,
  );
  const selectedFloorplan = useSelector(
    (state: RootState) => state.floorplanReducer.selectedFloorplan,
  );
  const filteredUnsavedArea = unsavedArea.filter(
    (area) => area.floorplanId === selectedFloorplan?.id,
  );
  // const [areas, setAreas] = useState<AreaType[]>([]);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingAreaId, setPendingAreaId] = useState<string | null>(null);
  const drawingMaskedArea = useSelector(
    (state: RootState) => state.maskedAreaReducer.drawingMaskedArea,
  );
  const [cursorPosition, setCursorPosition] = useState<{ x: number; y: number } | null>(null);
  const [drawingNodes, setDrawingNodes] = useState<Nodes[]>([]); // Track the nodes being drawn

  useEffect(() => {
    setActiveArea(activeMaskedArea?.name || '');
  }, [activeMaskedArea]);
  useEffect(() => {
    setEditingArea(editingMaskedArea?.name || '');
  }, [editingMaskedArea]);
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
    const currentArea = filteredUnsavedArea.find((a) => a.name === areaName);
    if (!currentArea) return false;

    const proposedArea = {
      nodes: currentArea.nodes
        ? currentArea.nodes.map((node) => ({
            ...node,
            x: node.x + dx * scale,
            y: node.y + dy * scale,
            x_px: node.x_px + dx,
            y_px: node.y_px + dy,
          }))
        : [],
    };

    return filteredUnsavedArea.some((otherArea) => {
      if (otherArea.name === areaName) return false;
      if (!otherArea.nodes) return false; // Add this check
      return checkPolygonCollision(proposedArea, { nodes: otherArea.nodes });
    });
  };

  const checkCornerDragCollision = (
    areaName: string,
    cornerIndex: number,
    newX: number,
    newY: number,
  ): boolean => {
    const currentArea = filteredUnsavedArea.find((a) => a.name === areaName);
    if (!currentArea) return false;

    const proposedArea = {
      nodes: currentArea.nodes
        ? currentArea.nodes.map((node, index) =>
            index === cornerIndex ? { ...node, x: newX, y: newY } : node,
          )
        : [],
    };

    return filteredUnsavedArea.some((otherArea) => {
      if (otherArea.name === areaName) return false;
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
    if (!drawingMaskedArea) return;
    const stage = stageRef.current;
    if (!stage) return;
    const pointerPosition = stage.getPointerPosition();
    if (!pointerPosition) return;

    const { x, y } = pointerPosition;
    const newNode = {
      id: uniqueId(),
      x: x * scaleX,
      y: y * scaleY,
      x_px: x * scaleX,
      y_px: y * scaleY,
    };

    setDrawingNodes((prevNodes) => {
      // If clicking the first node -> complete the area
      if (prevNodes.length >= 3) {
        const first = prevNodes[0];
        const dist = Math.hypot(first.x_px - newNode.x_px, first.y_px - newNode.y_px);
        if (dist < 15) {
          // tolerance radius for "closing" polygon
          const newArea: MaskedAreaType = {
            id: drawingMaskedArea,
            name: drawingMaskedArea,
            colorArea: '#363636',
            areaShape: JSON.stringify(prevNodes),
            restrictedStatus: '',
            wideArea: 0,
            positionPxX: 0,
            positionPxY: 0,
            engineAreaId: 'ENG001',
            nodes: prevNodes,
            floorId: selectedFloorplan?.floorId || '',
            floorplanId: selectedFloorplan?.id || '',
            createdBy: 'admin',
            createdAt: new Date().toISOString(),
            updatedBy: 'admin',
            updatedAt: new Date().toISOString(),
          };

          (async () => {
            await dispatch(AddUnsavedMaskedArea(newArea));
            dispatch(DrawingMaskedArea(''));
            dispatch(SelectMaskedArea(newArea.id));
            dispatch(SelectEditingMaskedArea(newArea.id));
            setActiveArea(newArea.name);
            setDrawingNodes([]);
          })();

          return [];
        }
      }

      // Otherwise, add a new node
      return [...prevNodes, newNode];
    });
  };

  useEffect(() => {
    if (drawingMaskedArea !== '') {
      setCursor('crosshair');
    } else {
      setCursor('default');
    }
  }, [drawingMaskedArea]);
  // useEffect(() => {
  //   if (filteredUnsavedArea.length > 0) {
  //     handleSaveArea();
  //   }
  // }, [filteredUnsavedArea]);

  const handleConfirmProceed = () => {
    const active = maskedAreas?.find((area) => area.name === activeArea);
    dispatch(RevertMaskedArea(active?.id || '')); // Revert the editing device to its original state
    if (pendingAreaId) {
      dispatch(SelectMaskedArea(pendingAreaId)); // Select the pending device
      dispatch(SelectEditingMaskedArea(null));
    }
    setConfirmDialogOpen(false);
    setPendingAreaId(null);
  };
  const handleCancelProceed = () => {
    setConfirmDialogOpen(false); // Close the dialog
    setPendingAreaId(null); // Clear the pending device ID
  };
  const handleOnClick = (id: string) => {
    if (drawingMaskedArea) return; // Prevent clicking while drawing
    const active = maskedAreas?.find((area) => area.id === id);
    if (activeArea === active?.name) return;
    if (editingArea) {
      setPendingAreaId(id);
      setConfirmDialogOpen(true);
      setCursor('move');
      return;
    }
    dispatch(SelectMaskedArea(id)); // Set the editingArea state to the clicked node's name
  };

  const handleDragStart = (e: string) => {
    if (drawingMaskedArea) return; // Prevent dragging while drawing
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
    const area = filteredUnsavedArea.find((a) => a.name === areaName);
    if (area) {
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
    setIsDragging('');
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
    setIsDragging('');
    setAreaDragging(false);
  };

  const handleCornerDragStart = (areaName: string, cornerIndex: number) => {
    const area = filteredUnsavedArea.find((a) => a.name === areaName);
    if (!area) return;

    const corner = area.nodes && area.nodes[cornerIndex];
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
    const updatedAreas = filteredUnsavedArea.map((area) => {
      if (area.name === areaName) {
        const newNodes = [...(area.nodes || [])];
        // console.log('x,y : ', newNodes[cornerIndex].x, newNodes[cornerIndex].y);
        // console.log('pxX,pxY : ', newNodes[cornerIndex].x_px, newNodes[cornerIndex].y_px);
        newNodes[cornerIndex] = {
          ...newNodes[cornerIndex],
          x: x * scale,
          y: y * scale,
          x_px: x,
          y_px: y,
        }; // Update the corner's position
        // console.log('newNodes[cornerIndex] : ', newNodes[cornerIndex]);
        return { ...area, nodes: newNodes, areaShape: JSON.stringify(newNodes) };
      }
      return area;
    });
    const updatedArea = updatedAreas.find((area) => area.name === areaName);
    // console.log('updatedArea', updatedArea);
    if (updatedArea) {
      dispatch(EditMaskedAreaPosition(updatedArea));
    }
  };
  const handleCornerDragMove = (areaName: string, cornerIndex: number, x: number, y: number) => {
    // Just store the proposed position, don't check yet
    const dPxX = x;
    const dPxY = y;
    // Still check for collisions with other areas during drag
    const collision = checkCornerDragCollision(areaName, cornerIndex, dPxX, dPxY);
    setIsColliding(collision);
  };

  const handleCornerDragEnd = (areaName: string, cornerIndex: number, x: number, y: number) => {
    const area = filteredUnsavedArea.find((a) => a.name === areaName);
    if (!area) return;
    const dPxX = x;
    const dPxY = y;
    // Create the proposed new polygon
    const proposedNodes = area.nodes ? [...area.nodes] : [];
    proposedNodes[cornerIndex] = { ...proposedNodes[cornerIndex], x: dPxX, y: dPxY };

    // Check for both collisions and self-intersections
    const hasCollision = filteredUnsavedArea.some((otherArea) => {
      if (otherArea.name === areaName) return false; // Exclude the area being dragged
      if (!otherArea.nodes) return false; // Add this check
      return checkPolygonCollision({ nodes: proposedNodes }, { nodes: otherArea.nodes });
    });

    if (hasCollision) {
      // Revert to original position
      if (cornerDragData) {
        // console.log(isColliding);
        if (!area.nodes) return false;
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
    setIsDragging('');
    // handleSaveArea();
  };
  const handleDeleteCorner = (areaName: string, cornerIndex: number) => {
    const updatedAreas = filteredUnsavedArea.map((area) => {
      if (area.name === areaName) {
        const newNodes = [...(area.nodes || [])];
        newNodes.splice(cornerIndex, 1); // Remove the corner at the specified index
        return { ...area, nodes: newNodes, areaShape: JSON.stringify(newNodes) };
      }
      return area;
    });

    const updatedArea = updatedAreas.find((area) => area.name === areaName);
    if (updatedArea) {
      dispatch(EditMaskedAreaPosition(updatedArea));
    }
  };

  const handleDragArea = (areaName: string, dx: number, dy: number) => {
    // console.log(dx, dy);
    const updatedAreas = filteredUnsavedArea.map((area) =>
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
    // console.log('updatedArea', updatedArea);
    if (updatedArea) {
      dispatch(EditMaskedAreaPosition(updatedArea));
    }
  };
  const handleInsertCorner = (areaName: string, clickX: number, clickY: number) => {
    const updatedAreas = filteredUnsavedArea.map((area) => {
      if (area.name !== areaName) return area;

      const { nodes } = area;
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

      return { ...area, nodes: newNodes };
    });

    const updatedArea = updatedAreas.find((area) => area && area.name === areaName);
    if (updatedArea) {
      dispatch(EditMaskedAreaPosition(updatedArea));
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

    if (!drawingMaskedArea) return;

    // Cancel drawing
    setDrawingNodes([]); // Clear current drawing nodes
    dispatch(DrawingMaskedArea('')); // Reset drawing mode
    dispatch(SelectMaskedArea('')); // Clear selection
    dispatch(SelectEditingMaskedArea('')); // Clear editing
    setActiveArea(''); // Reset active area
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
          {filteredUnsavedArea.map((area: MaskedAreaType) => (
            // console.log('area', area.nodes),
            <React.Fragment key={area.id}>
              {/* Render the area */}
              <Line
                points={area.nodes ? setPointsFromNodes(area.nodes) : []}
                stroke={darken(area.colorArea, 0.5)}
                strokeWidth={5}
                lineJoin="round"
                lineCap="round"
                closed
                fill={
                  preview
                    ? area.colorArea // 🟢 fill all areas in preview mode
                    : area.name === activeArea
                    ? area.colorArea
                    : lighten(area.colorArea, 0.7)
                }
                opacity={0.7}
                draggable={!preview && editingArea === area.name}
                onMouseEnter={() => {
                  if (editingArea === area.name) {
                    if (preview) return;
                    if (!drawingMaskedArea) {
                      setCursor('move');
                    }
                  } else {
                    if (!drawingMaskedArea) {
                      setCursor('pointer');
                    }
                  }
                }}
                onMouseLeave={() => {
                  if (!preview && !drawingMaskedArea) {
                    setCursor('grab');
                  }
                }}
                onMouseDown={(e) => {
                  if (!drawingMaskedArea) {
                    handleDragStart(area.name);
                    const isShiftPressed = e.evt.shiftKey;
                    const stage = e.target.getStage();
                    const mousePos = stage?.getPointerPosition();

                    if (isShiftPressed && mousePos) {
                      e.evt.preventDefault();
                      handleInsertCorner(area.name, mousePos.x * scaleX, mousePos.y * scaleY);
                    }
                  }
                }}
                onDblClick={(e) => {
                  const stage = e.target.getStage();
                  const mousePos = stage?.getPointerPosition();
                  if (editingMaskedArea?.id == area.id) {
                    if (mousePos) {
                      e.evt.preventDefault();
                      handleInsertCorner(area.name, mousePos.x * scaleX, mousePos.y * scaleY);
                    }
                  }
                }}
                onMouseUp={handleMouseUp}
                onDragStart={() => setAreaDragging(true)}
                onDragMove={(e) => {
                  handleDragMove(e.target.x() * scaleX, e.target.y() * scaleY);
                }}
                onDragEnd={(e) => {
                  handleDragEnd(area.name);
                  e.target.x(0);
                  e.target.y(0);
                }}
                onClick={() => handleOnClick(area.id)}
              />
              {/* Render corner circles if the area is being edited */}
              {editingArea === area.name &&
                !areaDragging &&
                area.nodes?.map((node: any, index: any) => (
                  <Circle
                    key={node.id}
                    x={node.x_px / scaleX}
                    y={node.y_px / scaleY}
                    radius={7}
                    fill="red"
                    draggable
                    strokeWidth={2}
                    onMouseEnter={(e) => {
                      if (!drawingMaskedArea) {
                        const shape = e.target as Konva.Circle;
                        shape.radius(10); // Increase radius on hover
                        shape.stroke('black'); // Add green outline
                        shape.strokeWidth(3);
                        setCursor('move');
                        shape.getLayer()?.batchDraw(); // Redraw the layer for immediate effect
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!drawingMaskedArea) {
                        const shape = e.target as Konva.Circle;
                        shape.radius(7); // Reset radius
                        shape.stroke(''); // Remove outline
                        shape.strokeWidth(1);
                        setCursor('grab');
                        shape.getLayer()?.batchDraw(); // Redraw the layer for immediate effect
                      }
                    }}
                    onDragStart={() => handleCornerDragStart(area.name, index)}
                    onDragMove={(e) => {
                      handleDragCorner(
                        area.name,
                        index,
                        e.target.x() * scaleX,
                        e.target.y() * scaleY,
                      );
                      handleCornerDragMove(
                        area.name,
                        index,
                        e.target.x() * scaleX,
                        e.target.y() * scaleY,
                      );
                    }}
                    onMouseDown={() => handleDragStart(area.name)}
                    onMouseUp={handleMouseUp}
                    onDragEnd={(e) => {
                      handleCornerDragEnd(
                        area.name,
                        index,
                        e.target.x() * scaleX,
                        e.target.y() * scaleY,
                      );
                      handleDragEnd(area.name); // Pass the area name
                    }}
                    onContextMenu={(e) => {
                      e.evt.preventDefault(); // Prevent the default context menu from appearing
                      handleDeleteCorner(area.name, index); // Call the function to delete the corner
                    }}
                  />
                ))}
            </React.Fragment>
          ))}
          {/* Render circles for drawing nodes */}
          {/* Render nodes while drawing */}
          {drawingNodes.length > 0 && (
            <>
              {/* 🔵 First Node — main interactive node */}
              <Circle
                key={drawingNodes[0].id}
                x={drawingNodes[0].x_px / scaleX}
                y={drawingNodes[0].y_px / scaleY}
                radius={8}
                fill="blue"
                stroke="black"
                strokeWidth={2}
                onMouseEnter={(e) => {
                  const shape = e.target as Konva.Circle;
                  shape.radius(12);
                  shape.fill('green'); // highlight when ready to close
                  setCursor('pointer');
                  shape.getLayer()?.batchDraw();
                }}
                onMouseLeave={(e) => {
                  const shape = e.target as Konva.Circle;
                  shape.radius(8);
                  shape.fill('blue'); // back to default
                  setCursor('crosshair');
                  shape.getLayer()?.batchDraw();
                }}
              />

              {/* ⚫ Other Nodes — small black dots */}
              {drawingNodes.slice(1).map((node) => (
                <Circle
                  key={node.id}
                  x={node.x_px / scaleX}
                  y={node.y_px / scaleY}
                  radius={4} // quarter the size (~¼ of 8px radius)
                  fill="black"
                  opacity={0.8}
                  listening={false} // make non-interactable (ignores hover/click)
                />
              ))}
            </>
          )}

          {/* Render dashed lines connecting each node to the cursor */}
          {drawingNodes.length > 0 && cursorPosition && (
            <>
              {/* Solid dashed lines connecting existing nodes */}
              {drawingNodes.length > 1 &&
                drawingNodes.map((node, index) => {
                  if (index === drawingNodes.length - 1) return null;
                  const nextNode = drawingNodes[index + 1];
                  return (
                    <Line
                      key={`line-to-next-${node.id}`}
                      points={[
                        node.x_px / scaleX,
                        node.y_px / scaleY,
                        nextNode.x_px / scaleX,
                        nextNode.y_px / scaleY,
                      ]}
                      stroke="blue"
                      strokeWidth={2}
                      dash={[10, 5]}
                      closed={false}
                    />
                  );
                })}

              {/* Dashed line from LAST node → cursor */}
              {drawingNodes.length > 0 && (
                <Line
                  points={[
                    drawingNodes[drawingNodes.length - 1].x_px / scaleX,
                    drawingNodes[drawingNodes.length - 1].y_px / scaleY,
                    cursorPosition.x,
                    cursorPosition.y,
                  ]}
                  stroke="blue"
                  strokeWidth={2}
                  dash={[10, 5]}
                />
              )}

              {/* Optional: dashed line from FIRST node → cursor */}
              {drawingNodes.length > 2 && (
                <Line
                  points={[
                    drawingNodes[0].x_px / scaleX,
                    drawingNodes[0].y_px / scaleY,
                    cursorPosition.x,
                    cursorPosition.y,
                  ]}
                  stroke="blue"
                  strokeWidth={1.5}
                  dash={[4, 6]}
                  opacity={0.5} // make it fainter
                />
              )}
            </>
          )}
        </Layer>
      </Stage>
      <Dialog open={confirmDialogOpen} onClose={handleCancelProceed} maxWidth="xs" fullWidth>
        <DialogTitle>Confirm Action</DialogTitle>
        <DialogContent>
          <DialogContentText>
            You are still in editing mode. Any editing progress will be cancelled if you wish to
            proceed. Do you want to continue?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelProceed} color="primary" variant="contained">
            Cancel
          </Button>
          <Button onClick={handleConfirmProceed} color="error">
            Proceed
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default EditAreaRenderer;
