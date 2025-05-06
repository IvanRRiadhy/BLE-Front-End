import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  useTheme,
} from '@mui/material';
import Konva from 'konva';
import React, { useEffect, useState } from 'react';
import { Stage, Layer, Rect, Circle, Star, Image as KonvaImage, Line } from 'react-konva';
import { useSelector, useDispatch, AppState } from 'src/store/Store';
import {
  EditUnsavedMaskedArea,
  MaskedAreaType,
  RevertMaskedArea,
  SelectEditingMaskedArea,
  SelectMaskedArea,
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
type AreaType = {
  name: string;
  color: string;
  nodes: Nodes[];
};

const Areas: AreaType[] = [
  {
    name: 'Area1',
    color: '#f55549',
    nodes: [
      { id: uniqueId(), x: 100, y: 50, x_px: 100, y_px: 50 },
      { id: uniqueId(), x: 350, y: 50, x_px: 350, y_px: 50 },
      { id: uniqueId(), x: 400, y: 100, x_px: 400, y_px: 100 },
      { id: uniqueId(), x: 350, y: 250, x_px: 350, y_px: 250 },
      { id: uniqueId(), x: 100, y: 250, x_px: 100, y_px: 250 },
    ],
  },
  {
    name: 'Area2',
    color: '#5cf740',
    nodes: [
      { id: uniqueId(), x: 150, y: 450, x_px: 150, y_px: 450 },
      { id: uniqueId(), x: 250, y: 450, x_px: 250, y_px: 450 },
      { id: uniqueId(), x: 250, y: 550, x_px: 250, y_px: 550 },
      { id: uniqueId(), x: 150, y: 550, x_px: 150, y_px: 550 },
    ],
  },
  {
    name: 'Area3',
    color: '#3be8f5',
    nodes: [
      { id: uniqueId(), x: 500, y: 50, x_px: 500, y_px: 50 },
      { id: uniqueId(), x: 550, y: 50, x_px: 550, y_px: 50 },
      { id: uniqueId(), x: 550, y: 200, x_px: 550, y_px: 200 },
      { id: uniqueId(), x: 525, y: 350, x_px: 525, y_px: 350 },
      { id: uniqueId(), x: 500, y: 200, x_px: 500, y_px: 200 },
    ],
  },
];

// const Areas = [
//   {
//     name: 'Area1',
//     color: 'yellow',
//     nodes: [],
//     x: [100, 350, 400, 350, 100],
//     y: [50, 50, 100, 250, 250],
//   },
//   {
//     name: 'Area2',
//     color: 'blue',
//     x: [150, 250, 250, 150],
//     y: [450, 450, 550, 550],
//   },
//   {
//     name: 'Area3',
//     color: 'green',
//     x: [500, 550, 550, 525, 500],
//     y: [50, 50, 200, 350, 200],
//   },
// ];

const EditAreaRenderer: React.FC<{
  width: number;
  height: number;
  imageSrc?: string;
  scale: number;
  maskedAreas?: MaskedAreaType[];
  activeMaskedArea?: MaskedAreaType | null;
  setIsDragging: (isDragging: string) => void;
  setCursor: (cursor: string) => void;
}> = ({
  width,
  height,
  imageSrc,
  scale,
  maskedAreas,
  activeMaskedArea,
  setIsDragging,
  setCursor,
}) => {
  const theme = useTheme();
  const stageRef = React.useRef<Konva.Stage>(null);

  const dispatch = useDispatch();
  const [scales, setScale] = useState<number>(scale);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [editingArea, setEditingArea] = useState('');
  const [areas, setAreas] = useState(Areas);
  const [areaDragging, setAreaDragging] = useState(false);
  const [originalPositions, setOriginalPositions] = useState<
    Record<string, { x: number[]; y: number[] }>
  >({});
  const [dragOffset, setDragOffset] = useState({ dx: 0, dy: 0 });
  const [isColliding, setIsColliding] = useState(false);
  const editingMaskedArea = useSelector(
    (state: AppState) => state.maskedAreaReducer.editingMaskedArea,
  );
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
  }, [imageSrc]);

  const setPointsFromNodes = (nodes: Nodes[]): number[] => {
    return nodes.flatMap((node) => [node.x, node.y]); // Flatten x and y into a single array
  };

  // Function to check if two polygons intersect
  // const checkPolygonCollision = (
  //   poly1: { x: number[]; y: number[] },
  //   poly2: { x: number[]; y: number[] },
  // ): boolean => {
  //   const getPolygonPoints = (poly: { x: number[]; y: number[] }) =>
  //     poly.x.map((x, i) => ({ x, y: poly.y[i] }));

  //   const polygons = [getPolygonPoints(poly1), getPolygonPoints(poly2)];

  //   for (let i = 0; i < polygons.length; i++) {
  //     const polygon = polygons[i];

  //     for (let j = 0; j < polygon.length; j++) {
  //       const k = (j + 1) % polygon.length;
  //       const edge = {
  //         x: polygon[k].x - polygon[j].x,
  //         y: polygon[k].y - polygon[j].y,
  //       };

  //       // Normal to the edge
  //       const axis = { x: -edge.y, y: edge.x };

  //       let minA = Infinity,
  //         maxA = -Infinity;
  //       for (const point of polygons[0]) {
  //         const projection = point.x * axis.x + point.y * axis.y;
  //         minA = Math.min(minA, projection);
  //         maxA = Math.max(maxA, projection);
  //       }

  //       let minB = Infinity,
  //         maxB = -Infinity;
  //       for (const point of polygons[1]) {
  //         const projection = point.x * axis.x + point.y * axis.y;
  //         minB = Math.min(minB, projection);
  //         maxB = Math.max(maxB, projection);
  //       }

  //       if (maxA < minB || maxB < minA) {
  //         return false; // Separating axis found
  //       }
  //     }
  //   }

  //   return true; // No separating axis => collision
  // };

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
      const x1 = nodes[i].x;
      const y1 = nodes[i].y;
      const x2 = nodes[(i + 1) % n].x;
      const y2 = nodes[(i + 1) % n].y;

      for (let j = i + 2; j < n; j++) {
        // Skip adjacent edges
        if (j === i || (j + 1) % n === i) continue;

        const x3 = nodes[j].x;
        const y3 = nodes[j].y;
        const x4 = nodes[(j + 1) % n].x;
        const y4 = nodes[(j + 1) % n].y;

        if (doLineSegmentsIntersect(x1, y1, x2, y2, x3, y3, x4, y4)) {
          return true; // Self-intersection detected
        }
      }
    }

    return false; // No self-intersections
  };
  const checkCollisionWithOffset = (areaName: string, dx: number, dy: number): boolean => {
    const currentArea = areas.find((a) => a.name === areaName);
    if (!currentArea) return false;

    const proposedArea = {
      nodes: currentArea.nodes.map((node) => ({
        ...node,
        x: node.x + dx,
        y: node.y + dy,
      })),
    };

    return areas.some((otherArea) => {
      if (otherArea.name === areaName) return false;
      return checkPolygonCollision(proposedArea, otherArea);
    });
  };

  const checkCornerDragCollision = (
    areaName: string,
    cornerIndex: number,
    newX: number,
    newY: number,
  ): boolean => {
    const currentArea = areas.find((a) => a.name === areaName);
    if (!currentArea) return false;

    const proposedArea = {
      nodes: currentArea.nodes.map((node, index) =>
        index === cornerIndex ? { ...node, x: newX, y: newY } : node,
      ),
    };

    return areas.some((otherArea) => {
      if (otherArea.name === areaName) return false;
      return checkPolygonCollision(proposedArea, otherArea);
    });
  };

  // Function to check if a polygon has self-intersections
  const hasSelfIntersections = (x: number[], y: number[]): boolean => {
    const n = x.length;
    if (n < 4) return false; // A polygon with less than 4 points can't self-intersect

    // Check all pairs of non-adjacent edges
    for (let i = 0; i < n; i++) {
      const nextI = (i + 1) % n;
      for (let j = i + 2; j < n; j++) {
        const nextJ = (j + 1) % n;

        // Skip adjacent edges
        if (nextI === j || nextJ === i) continue;

        // Check if edges (i, nextI) and (j, nextJ) intersect
        if (
          doLineSegmentsIntersect(x[i], y[i], x[nextI], y[nextI], x[j], y[j], x[nextJ], y[nextJ])
        ) {
          return true;
        }
      }
    }
    return false;
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

  const handleOnClick = (name: string) => {
    setCursor('move');
    setEditingArea(name); // Set the editingArea state to the clicked node's name
    // console.log(`Editing area set to: ${name}`);
  };

  const handleDragStart = (e: string) => {
    setIsDragging(e);
    setDragOffset({ dx: 0, dy: 0 });
    setIsColliding(false);
  };
  const handleDragMove = (areaName: string, dx: number, dy: number) => {
    setDragOffset({ dx, dy });
  };

  const handleDragEnd = (areaName: string) => {
    const area = areas.find((a) => a.name === areaName);
    if (area) {
      console.log(`Nodes of ${areaName}:`, JSON.stringify(area.nodes, null, 2)); // Log nodes in JSON format
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
        handleDragArea(areaName, dx, dy);
      }
    }

    // Reset drag state
    setIsDragging('');
    setAreaDragging(false);
    setDragOffset({ dx: 0, dy: 0 });
    setIsColliding(false);
  };

  const handleMouseUp = () => {
    setIsDragging('');
    setAreaDragging(false);
  };

  // function getCorners(shape: { x: number[]; y: number[] }) {
  //   const corners = [];
  //   for (let i = 0; i < shape.x.length; i++) {
  //     corners.push({ x: shape.x[i], y: shape.y[i] });
  //   }
  //   return corners;
  // }

  // function getEdges(shape: { x: number[]; y: number[] }) {
  //   const edges = [];
  //   const len = shape.x.length;
  //   for (let i = 0; i < len; i++) {
  //     const x1 = shape.x[i];
  //     const y1 = shape.y[i];
  //     const x2 = shape.x[(i + 1) % len]; // loop back to start
  //     const y2 = shape.y[(i + 1) % len];
  //     edges.push([x1, y1, x2, y2]);
  //   }
  //   return edges;
  // }

  // function isPointNearLine(
  //   px: number,
  //   py: number,
  //   x1: number,
  //   y1: number,
  //   x2: number,
  //   y2: number,
  //   threshold = 2,
  // ) {
  //   const dx = x2 - x1;
  //   const dy = y2 - y1;
  //   const lenSq = dx * dx + dy * dy;
  //   const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
  //   const nearestX = x1 + t * dx;
  //   const nearestY = y1 + t * dy;
  //   const distSq = (px - nearestX) ** 2 + (py - nearestY) ** 2;
  //   return distSq < threshold * threshold;
  // }

  // function checkCollisions(draggedShape: { x: number[]; y: number[] }) {
  //   const draggedCorners = getCorners(draggedShape);
  //   const draggedEdges = getEdges(draggedShape);
  //   const allOtherShapes = Areas.filter((a) => a !== draggedShape); // ✅ returns an array

  //   for (const other of allOtherShapes) {
  //     const otherCorners = getCorners(other);
  //     const otherEdges = getEdges(other);

  //     // Check corners of dragged shape vs lines of others
  //     for (const corner of draggedCorners) {
  //       for (const [x1, y1, x2, y2] of otherEdges) {
  //         if (isPointNearLine(corner.x, corner.y, x1, y1, x2, y2)) {
  //           return true; // collision detected
  //         }
  //       }
  //     }

  //     // Check lines of dragged shape vs corners of others
  //     for (const [x1, y1, x2, y2] of draggedEdges) {
  //       for (const corner of otherCorners) {
  //         if (isPointNearLine(corner.x, corner.y, x1, y1, x2, y2)) {
  //           return true;
  //         }
  //       }
  //     }
  //   }
  //   return false;
  // }

  const handleCornerDragStart = (areaName: string, cornerIndex: number) => {
    const area = areas.find((a) => a.name === areaName);
    if (!area) return;

    const corner = area.nodes[cornerIndex];
    setCornerDragData({
      areaName,
      cornerIndex,
      originalX: corner.x,
      originalY: corner.y,
    });
    setIsDragging(areaName);
  };

  const handleDragCorner = (areaName: string, cornerIndex: number, x: number, y: number) => {
    setAreas((prevAreas) =>
      prevAreas.map((area) => {
        if (area.name === areaName) {
          const newNodes = [...area.nodes];
          newNodes[cornerIndex] = { ...newNodes[cornerIndex], x, y }; // Update the corner's position
          return { ...area, nodes: newNodes };
        }
        return area;
      }),
    );
  };
  const handleCornerDragMove = (areaName: string, cornerIndex: number, x: number, y: number) => {
    // Just store the proposed position, don't check yet

    // Still check for collisions with other areas during drag
    const collision = checkCornerDragCollision(areaName, cornerIndex, x, y);
    setIsColliding(collision);
  };

  const handleCornerDragEnd = (areaName: string, cornerIndex: number, x: number, y: number) => {
    const area = areas.find((a) => a.name === areaName);
    if (!area) return;

    // Create the proposed new polygon
    const proposedNodes = [...area.nodes];
    proposedNodes[cornerIndex] = { ...proposedNodes[cornerIndex], x, y };

    // Check for both collisions and self-intersections
    const hasCollision = areas.some((otherArea) => {
      if (otherArea.name === areaName) return false; // Exclude the area being dragged
      return checkPolygonCollision({ nodes: proposedNodes }, otherArea);
    });

    if (hasCollision) {
      // Revert to original position
      if (cornerDragData) {
        console.log(isColliding);
        console.log(checkPolygonCollision({ nodes: proposedNodes }, area));
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
      handleDragCorner(areaName, cornerIndex, x, y);
    }

    // Reset drag state
    setCornerDragData(null);
    setIsColliding(false);
    setIsDragging('');
  };
  const handleDeleteCorner = (areaName: string, cornerIndex: number) => {
    setAreas((prevAreas) =>
      prevAreas.map((area) => {
        if (area.name === areaName) {
          const newNodes = [...area.nodes];
          newNodes.splice(cornerIndex, 1); // Remove the corner at the specified index
          return { ...area, nodes: newNodes };
        }
        return area;
      }),
    );
  };

  const handleDragArea = (areaName: string, dx: number, dy: number) => {
    setAreas((prevAreas) =>
      prevAreas.map((area) =>
        area.name === areaName
          ? {
              ...area,
              nodes: area.nodes.map((node) => ({
                ...node,
                x: node.x + dx,
                y: node.y + dy,
              })),
            }
          : area,
      ),
    );
  };
  const handleInsertCorner = (areaName: string, clickX: number, clickY: number) => {
    setAreas((prevAreas) =>
      prevAreas.map((area) => {
        if (area.name !== areaName) return area;

        const { nodes } = area;
        let insertIndex = -1;
        let minDistance = Infinity;

        for (let i = 0; i < nodes.length; i++) {
          const nextIndex = (i + 1) % nodes.length;
          const distance = pointToSegmentDistance(
            clickX,
            clickY,
            nodes[i].x,
            nodes[i].y,
            nodes[nextIndex].x,
            nodes[nextIndex].y,
          );

          if (distance < minDistance) {
            minDistance = distance;
            insertIndex = nextIndex;
          }
        }

        const newNodes = [...nodes];
        newNodes.splice(insertIndex, 0, {
          id: uniqueId(),
          x: clickX,
          y: clickY,
          x_px: clickX,
          y_px: clickY,
        });

        return { ...area, nodes: newNodes };
      }),
    );
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

  return (
    <>
      <Stage
        ref={stageRef}
        width={width}
        height={height}
        style={{ position: 'absolute', top: 0, left: 0 }}
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
          {areas.map((area: any) => (
            <React.Fragment key={area.name}>
              {/* Render the area */}
              <Line
                points={setPointsFromNodes(area.nodes)}
                stroke={darken(area.color, 0.5)}
                strokeWidth={2}
                lineJoin="round"
                lineCap="round"
                closed
                fill={area.name === editingArea ? area.color : undefined}
                opacity={0.7}
                draggable={editingArea === area.name}
                onMouseEnter={(e) => {
                  if (editingArea === area.name) {
                    setCursor('move');
                  } else {
                    setCursor('pointer');
                  }
                }}
                onMouseLeave={(e) => {
                  setCursor('grab');
                }}
                onMouseDown={(e) => {
                  handleDragStart(area.name);
                  const isShiftPressed = e.evt.shiftKey;
                  const stage = e.target.getStage();
                  const mousePos = stage?.getPointerPosition();

                  if (isShiftPressed && mousePos) {
                    e.evt.preventDefault();
                    handleInsertCorner(area.name, mousePos.x, mousePos.y);
                  }
                }}
                onDblClick={(e) => {
                  const stage = e.target.getStage();
                  const mousePos = stage?.getPointerPosition();
                  if (mousePos) {
                    e.evt.preventDefault();
                    handleInsertCorner(area.name, mousePos.x, mousePos.y);
                  }
                }}
                onMouseUp={handleMouseUp}
                onDragStart={() => setAreaDragging(true)}
                onDragMove={(e) => {
                  handleDragMove(area.name, e.target.x(), e.target.y());
                }}
                onDragEnd={(e) => {
                  handleDragEnd(area.name);
                  e.target.x(0);
                  e.target.y(0);
                }}
                onClick={() => handleOnClick(area.name)}
              />
              {/* Render corner circles if the area is being edited */}
              {editingArea === area.name &&
                !areaDragging &&
                area.nodes.map((node: any, index: any) => (
                  <Circle
                    key={node.id}
                    x={node.x}
                    y={node.y}
                    radius={7}
                    fill="red"
                    draggable
                    strokeWidth={2}
                    onMouseEnter={(e) => {
                      const shape = e.target as Konva.Circle;
                      shape.radius(10); // Increase radius on hover
                      shape.stroke('black'); // Add green outline
                      shape.strokeWidth(3);
                      setCursor('move');
                      shape.getLayer()?.batchDraw(); // Redraw the layer for immediate effect
                    }}
                    onMouseLeave={(e) => {
                      const shape = e.target as Konva.Circle;
                      shape.radius(7); // Reset radius
                      shape.stroke(''); // Remove outline
                      shape.strokeWidth(1);
                      setCursor('grab');
                      shape.getLayer()?.batchDraw(); // Redraw the layer for immediate effect
                    }}
                    onDragStart={() => handleCornerDragStart(area.name, index)}
                    onDragMove={(e) => {
                      handleDragCorner(area.name, index, e.target.x(), e.target.y());
                      handleCornerDragMove(area.name, index, e.target.x(), e.target.y());
                    }}
                    onMouseDown={() => handleDragStart(area.name)}
                    onMouseUp={handleMouseUp}
                    onDragEnd={(e) => {
                      handleCornerDragEnd(area.name, index, e.target.x(), e.target.y());
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
        </Layer>
      </Stage>
    </>
  );
};

export default EditAreaRenderer;
