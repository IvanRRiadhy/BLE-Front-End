import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import Konva from 'konva';
import React, { useEffect, useState } from 'react';
import { Stage, Layer, Circle, Image as KonvaImage, Line, Group, Text, Arrow } from 'react-konva';
import { useSelector, useDispatch, RootState } from 'src/store/Store';
import { MaskedAreaType } from 'src/store/apps/crud/maskedArea';
import { uniqueId } from 'lodash';
import { darken } from '@mui/material';
import {
  DrawBoundary,
  BoundaryAlarmType,
  UpdateSelectedBoundaryAlarm,
} from 'src/store/apps/alarmsetting/boundary';

type Nodes = {
  id: string;
  x: number;
  y: number;
  x_px: number;
  y_px: number;
};

type BoundaryNodes = {
  a: Nodes[];
  b: Nodes[];
};

const EditBoundaryRenderer: React.FC<{
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  imageSrc?: string;
  scale: number;
  setIsDragging: (isDragging: string) => void;
  setCursor: (cursor: string) => void;
  activeBoundary?: BoundaryAlarmType;
  otherBoundarys?: BoundaryAlarmType[];
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
  activeBoundary,
  otherBoundarys,
  areas,
  showAreas,
}) => {
  const stageRef = React.useRef<Konva.Stage>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const dispatch = useDispatch();
  const scaleX = originalWidth / width;
  const scaleY = originalHeight / height;
  const [areaDragging, setAreaDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ dx: 0, dy: 0 });
  const drawingBoundary = useSelector((state: RootState) => state.BoundaryReducer.drawingBoundary);
  const [cursorPosition, setCursorPosition] = useState<{ x: number; y: number } | null>(null);
  const [drawingNodes, setDrawingNodes] = useState<Nodes[]>([]);

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
    return nodes.flatMap((node) => [
      (node.x_px / originalWidth) * width,
      (node.y_px / originalHeight) * height,
    ]);
  };

  const createAreasFromLine = (p1: Nodes, p2: Nodes, d = 150): BoundaryNodes => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.sqrt(dx * dx + dy * dy);

    const ux = -dy / len;
    const uy = dx / len;

    const offsetX = ux * d;
    const offsetY = uy * d;

    // area A (left/top side)
    const a: Nodes[] = [
      {
        id: uniqueId(),
        x: p1.x - offsetX,
        y: p1.y - offsetY,
        x_px: p1.x - offsetX,
        y_px: p1.y - offsetY,
      }, // top-left
      {
        id: uniqueId(),
        x: p2.x - offsetX,
        y: p2.y - offsetY,
        x_px: p2.x - offsetX,
        y_px: p2.y - offsetY,
      }, // top-right
      { id: uniqueId(), x: p2.x, y: p2.y, x_px: p2.x, y_px: p2.y }, // bottom-right
      { id: uniqueId(), x: p1.x, y: p1.y, x_px: p1.x, y_px: p1.y }, // bottom-left
    ];

    // area B (right/bottom side)
    const b: Nodes[] = [
      { id: uniqueId(), x: p1.x, y: p1.y, x_px: p1.x, y_px: p1.y }, // top-left
      { id: uniqueId(), x: p2.x, y: p2.y, x_px: p2.x, y_px: p2.y }, // top-right
      {
        id: uniqueId(),
        x: p2.x + offsetX,
        y: p2.y + offsetY,
        x_px: p2.x + offsetX,
        y_px: p2.y + offsetY,
      }, // bottom-right
      {
        id: uniqueId(),
        x: p1.x + offsetX,
        y: p1.y + offsetY,
        x_px: p1.x + offsetX,
        y_px: p1.y + offsetY,
      }, // bottom-left
    ];

    return { a, b };
  };

  const handleCanvasClick = () => {
    if (!drawingBoundary) return;
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

    if (!activeBoundary) return;
    setDrawingNodes((prevNodes) => {
      const updatedNodes = [...prevNodes, newNode];
      if (updatedNodes.length === 2) {
        const { a, b } = createAreasFromLine(updatedNodes[0], updatedNodes[1], 150); // 50 px offset
        dispatch(
          UpdateSelectedBoundaryAlarm({
            ...activeBoundary,
            nodes: { a, b }, // << new format
            areaShape: JSON.stringify({ a, b }),
          }),
        );
        setDrawingNodes([]);
        dispatch(DrawBoundary(''));
      }
      return updatedNodes;
    });
  };

  useEffect(() => {
    if (drawingBoundary === undefined) return;
    if (drawingBoundary !== '') {
      setCursor('crosshair');
    } else {
      setCursor('default');
    }
  }, [drawingBoundary]);

  const handleDragStart = (e: string) => {
    if (drawingBoundary) return;
    setIsDragging(e);
    setDragOffset({ dx: 0, dy: 0 });
  };
  const handleDragMove = (dx: number, dy: number) => {
    setDragOffset({ dx, dy });
  };
  const handleDragEnd = async (areaName: string) => {
    const { dx, dy } = dragOffset;
    if (dx !== 0 || dy !== 0) {
      await handleDragArea(areaName, dx, dy);
    }
    setAreaDragging(false);
    setDragOffset({ dx: 0, dy: 0 });
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
    setAreaDragging(false);
  };

  const computeOffsetNodes = (p1: Nodes, p2: Nodes, d: number, side: 'a' | 'b'): Nodes[] => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.sqrt(dx * dx + dy * dy);

    const ux = -dy / len;
    const uy = dx / len;

    const offsetX = ux * d;
    const offsetY = uy * d;

    if (side === 'a') {
      // area A (offset negative)
      return [
        { ...p1, x: p1.x - offsetX, y: p1.y - offsetY, x_px: p1.x - offsetX, y_px: p1.y - offsetY },
        { ...p2, x: p2.x - offsetX, y: p2.y - offsetY, x_px: p2.x - offsetX, y_px: p2.y - offsetY },
        { ...p2 },
        { ...p1 },
      ];
    } else {
      // area B (offset positive)
      return [
        { ...p1 },
        { ...p2 },
        { ...p2, x: p2.x + offsetX, y: p2.y + offsetY, x_px: p2.x + offsetX, y_px: p2.y + offsetY },
        { ...p1, x: p1.x + offsetX, y: p1.y + offsetY, x_px: p1.x + offsetX, y_px: p1.y + offsetY },
      ];
    }
  };

  const handleDragCorner = (cornerType: 'top' | 'bottom', x: number, y: number, d = 150) => {
    if (!activeBoundary?.nodes) return;

    // Copy existing points
    const p1 = { ...activeBoundary.nodes.a[2] }; // top
    const p2 = { ...activeBoundary.nodes.a[3] }; // bottom

    if (cornerType === 'top') {
      p1.x = x * scaleX;
      p1.y = y * scaleY;
      p1.x_px = x * scaleX;
      p1.y_px = y * scaleY;
    } else {
      p2.x = x * scaleX;
      p2.y = y * scaleY;
      p2.x_px = x * scaleX;
      p2.y_px = y * scaleY;
    }

    // Always rebuild polygons from these 2
    const { a, b } = createAreasFromLine(p2, p1, d);

    const updatedBoundary = {
      ...activeBoundary,
      nodes: { a, b },
      areaShape: JSON.stringify({ a, b }),
    };

    dispatch(UpdateSelectedBoundaryAlarm(updatedBoundary));
  };

  const handleDragArea = (areaName: string, dx: number, dy: number, commit = false) => {
    if (!activeBoundary?.nodes) return;

    const newNodes: BoundaryNodes = {
      a: activeBoundary.nodes.a.map((node) => ({
        ...node,
        x: node.x + dx * scale,
        y: node.y + dy * scale,
        x_px: node.x_px + dx,
        y_px: node.y_px + dy,
      })),
      b: activeBoundary.nodes.b.map((node) => ({
        ...node,
        x: node.x + dx * scale,
        y: node.y + dy * scale,
        x_px: node.x_px + dx,
        y_px: node.y_px + dy,
      })),
    };

    if (commit) {
      dispatch(
        UpdateSelectedBoundaryAlarm({
          ...activeBoundary,
          nodes: newNodes,
          areaShape: JSON.stringify(newNodes),
        }),
      );
    } else {
      // Just update the local visual, not Redux (optional optimization)
    }
  };

  const handleRightClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    e.evt.preventDefault();
    if (!drawingBoundary) return;
    setDrawingNodes([]);
    dispatch(DrawBoundary(''));
  };

  const getCentroid = (nodes: Nodes[]): { x: number; y: number } => {
    const len = nodes.length;
    const sum = nodes.reduce((acc, n) => ({ x: acc.x + n.x_px, y: acc.y + n.y_px }), {
      x: 0,
      y: 0,
    });
    return { x: sum.x / len, y: sum.y / len };
  };

  const shortenToMiddle = (x1: number, y1: number, x2: number, y2: number, portion = 0.5) => {
    // portion=0.5 means: draw only the middle 50% of the line
    const mx1 = x1 + (x2 - x1) * (0.5 - portion / 2);
    const my1 = y1 + (y2 - y1) * (0.5 - portion / 2);
    const mx2 = x1 + (x2 - x1) * (0.5 + portion / 2);
    const my2 = y1 + (y2 - y1) * (0.5 + portion / 2);

    return { sx: mx1, sy: my1, ex: mx2, ey: my2 };
  };

  const offsetLine = (x1: number, y1: number, x2: number, y2: number, offset: number) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);

    // perpendicular unit vector
    const ux = -dy / len;
    const uy = dx / len;

    return {
      line1: [x1 + ux * offset, y1 + uy * offset, x2 + ux * offset, y2 + uy * offset],
      line2: [x1 - ux * offset, y1 - uy * offset, x2 - ux * offset, y2 - uy * offset],
    };
  };

  return (
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
        {image && <KonvaImage image={image} width={width} height={height} opacity={1} />}

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

        {otherBoundarys &&
          otherBoundarys.map((area) => (
            <React.Fragment key={area.id}>
              <Line
                points={area.nodes ? setPointsFromNodes(area.nodes.a) : []}
                stroke={darken(area.color, 0.3)}
                strokeWidth={5}
                lineJoin="round"
                lineCap="round"
                closed
                fill={area.color}
                opacity={0.35}
              />
              <Line
                points={area.nodes ? setPointsFromNodes(area.nodes.b) : []}
                stroke={darken(area.color, 0.3)}
                strokeWidth={5}
                lineJoin="round"
                lineCap="round"
                closed
                fill={area.color}
                opacity={0.35}
              />
            </React.Fragment>
          ))}

        {activeBoundary && (
          <>
            <Group
              draggable
              onMouseEnter={() => {
                if (!drawingBoundary) setCursor('move');
              }}
              onMouseLeave={() => {
                if (!drawingBoundary) setCursor('grab');
              }}
              onMouseDown={() => {
                handleDragStart(activeBoundary.name);
                setIsDragging(activeBoundary.name);
                setAreaDragging(true);
              }}
              onDragStart={() => {
                setIsDragging(activeBoundary.name);
                setAreaDragging(true);
              }}
              onDragMove={(e) => {
                const dx = e.target.x() * scaleX;
                const dy = e.target.y() * scaleY;
                handleDragArea(activeBoundary.name, dx, dy, false); // false = live move
              }}
              onDragEnd={(e) => {
                const dx = e.target.x() * scaleX;
                const dy = e.target.y() * scaleY;
                handleDragArea(activeBoundary.name, dx, dy, true); // true = commit
                e.target.x(0);
                e.target.y(0);
                setIsDragging('');
                setAreaDragging(false);
              }}
            >
              {/* Draw area A */}
              <Line
                points={activeBoundary.nodes && setPointsFromNodes(activeBoundary.nodes.a)}
                stroke={darken(activeBoundary.color, 0.5)}
                strokeWidth={5}
                closed
                fill={activeBoundary.color}
                opacity={0.7}
              />
              {/* Draw area B */}
              <Line
                points={activeBoundary.nodes && setPointsFromNodes(activeBoundary.nodes.b)}
                stroke={darken(activeBoundary.color, 0.5)}
                strokeWidth={5}
                closed
                fill={activeBoundary.color}
                opacity={0.7}
              />
              {activeBoundary.nodes?.a && activeBoundary.nodes?.b && (
                <>
                  {/* Labels */}
                  <Text
                    text="A"
                    fontSize={48}
                    fontStyle="bold"
                    fill="black"
                    x={getCentroid(activeBoundary.nodes.a).x / scaleX}
                    y={getCentroid(activeBoundary.nodes.a).y / scaleY}
                    align="center"
                    verticalAlign="middle"
                  />
                  <Text
                    text="B"
                    fontSize={48}
                    fontStyle="bold"
                    fill="black"
                    x={getCentroid(activeBoundary.nodes.b).x / scaleX}
                    y={getCentroid(activeBoundary.nodes.b).y / scaleY}
                    align="center"
                    verticalAlign="middle"
                  />

                  {/* Arrows */}
                  {(() => {
                    const centerA = getCentroid(activeBoundary.nodes.a);
                    const centerB = getCentroid(activeBoundary.nodes.b);

                    const Ax = centerA.x / scaleX;
                    const Ay = centerA.y / scaleY;
                    const Bx = centerB.x / scaleX;
                    const By = centerB.y / scaleY;

                    // shorten line to middle 50% so arrow is smaller and centered
                    const { sx, sy, ex, ey } = shortenToMiddle(Ax, Ay, Bx, By, 0.5);
                    const { line1, line2 } = offsetLine(sx, sy, ex, ey, 15);
                    switch (activeBoundary.direction) {
                      case '0': // both ways
                        return (
                          <>
                            {/* Arrow A → B with positive offset */}
                            <Arrow
                              points={line1}
                              stroke="black"
                              fill="black"
                              strokeWidth={6}
                              pointerLength={20}
                              pointerWidth={20}
                            />
                            {/* Arrow B → A with negative offset */}
                            <Arrow
                              points={[line2[2], line2[3], line2[0], line2[1]]}
                              stroke="black"
                              fill="black"
                              strokeWidth={6}
                              pointerLength={20}
                              pointerWidth={20}
                            />
                          </>
                        );
                      case '1': // A → B
                        return (
                          <Arrow
                            points={line2}
                            stroke="black"
                            fill="black"
                            strokeWidth={6}
                            pointerLength={20}
                            pointerWidth={20}
                          />
                        );
                      case '2': // B → A
                        return (
                          <Arrow
                            points={[line1[2], line1[3], line1[0], line1[1]]}
                            stroke="black"
                            fill="black"
                            strokeWidth={6}
                            pointerLength={20}
                            pointerWidth={20}
                          />
                        );
                      default:
                        return null;
                    }
                  })()}
                </>
              )}
            </Group>

            {!areaDragging && activeBoundary.nodes && (
              <>
                <Circle
                  key="middle-top"
                  x={activeBoundary.nodes.a[2].x_px / scaleX}
                  y={activeBoundary.nodes.a[2].y_px / scaleY}
                  radius={7}
                  fill="red"
                  draggable
                  strokeWidth={2}
                  onMouseEnter={(e) => {
                    if (!drawingBoundary) {
                      const shape = e.target as Konva.Circle;
                      shape.radius(10);
                      shape.stroke('black');
                      shape.strokeWidth(3);
                      setCursor('move');
                      shape.getLayer()?.batchDraw();
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!drawingBoundary) {
                      const shape = e.target as Konva.Circle;
                      shape.radius(7);
                      shape.stroke('');
                      shape.strokeWidth(1);
                      setCursor('grab');
                      shape.getLayer()?.batchDraw();
                    }
                  }}
                  onDragStart={() => {
                    setIsDragging(activeBoundary.name);
                  }}
                  onMouseDown={() => {
                    setIsDragging(activeBoundary.name);
                    handleDragStart(activeBoundary.name);
                  }}
                  onMouseUp={handleMouseUp}
                  onDragMove={(e) => {
                    handleDragCorner('top', e.target.x(), e.target.y());
                  }}
                />
                <Circle
                  key="middle-bottom"
                  x={activeBoundary.nodes.a[3].x_px / scaleX}
                  y={activeBoundary.nodes.a[3].y_px / scaleY}
                  radius={7}
                  fill="red"
                  draggable
                  strokeWidth={2}
                  onMouseEnter={(e) => {
                    if (!drawingBoundary) {
                      const shape = e.target as Konva.Circle;
                      shape.radius(10);
                      shape.stroke('black');
                      shape.strokeWidth(3);
                      setCursor('move');
                      shape.getLayer()?.batchDraw();
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!drawingBoundary) {
                      const shape = e.target as Konva.Circle;
                      shape.radius(7);
                      shape.stroke('');
                      shape.strokeWidth(1);
                      setCursor('grab');
                      shape.getLayer()?.batchDraw();
                    }
                  }}
                  onDragStart={() => {
                    setIsDragging(activeBoundary.name);
                  }}
                  onMouseDown={() => {
                    setIsDragging(activeBoundary.name);
                    handleDragStart(activeBoundary.name);
                  }}
                  onMouseUp={handleMouseUp}
                  onDragMove={(e) => {
                    handleDragCorner('bottom', e.target.x(), e.target.y());
                  }}
                />
              </>
            )}
          </>
        )}

        {drawingBoundary && (
          <>
            {drawingNodes.map((node) => (
              <Circle
                key={node.id}
                x={node.x / scaleX}
                y={node.y / scaleY}
                radius={7}
                fill="blue"
                draggable={false}
                stroke="black"
                strokeWidth={2}
              />
            ))}

            {drawingNodes.length > 0 && cursorPosition && (
              <>
                {drawingNodes.map((node) => (
                  <Line
                    key={`line-to-cursor-${node.id}`}
                    points={[node.x / scaleX, node.y / scaleY, cursorPosition.x, cursorPosition.y]}
                    stroke="blue"
                    strokeWidth={2}
                    dash={[10, 5]}
                    closed={false}
                  />
                ))}
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
              </>
            )}
          </>
        )}
      </Layer>
    </Stage>
  );
};

export default EditBoundaryRenderer;
