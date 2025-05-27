import React, { useState } from 'react';
import { Box } from '@mui/material';
import { Stage, Layer, Rect, Text, Group, Circle, Arrow, Line } from 'react-konva';
import { useSelector, useDispatch, AppDispatch, AppState } from 'src/store/Store';
import { nodeType, setSelectedNode, updateNodePosition } from 'src/store/apps/rules/RulesNodes';

const RulesCanvas = () => {
  const dispatch: AppDispatch = useDispatch();
  const nodes: nodeType[] = useSelector((state: AppState) => state.RulesNodeReducer.nodes);

  // State to track arrow drawing
  const [arrowDrawing, setArrowDrawing] = useState(false);
  const [arrowStartNodeId, setArrowStartNodeId] = useState<string | null>(null);
  const [arrowPreviewEnd, setArrowPreviewEnd] = useState<{ x: number; y: number } | null>(null);
  const [arrows, setArrows] = useState<{ startNodeId: string; endNodeId: string }[]>([]);
  const [arrowLatch, setArrowLatch] = useState<{ x: number; y: number } | null>(null);
  const [hoveredArrowIndex, setHoveredArrowIndex] = useState<number | null>(null); // Track the hovered arrow index

  // Helper function to calculate text width
  const calculateTextWidth = (
    text: string,
    fontSize: number = 16,
    fontFamily: string = 'Arial',
  ) => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (context) {
      context.font = `${fontSize}px ${fontFamily}`;
      return context.measureText(text).width;
    }
    return 100; // Fallback width
  };

  return (
    <Box
      sx={{
        flex: 1,
        background: '#f0f0f0',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Stage
        width={window.innerWidth}
        height={window.innerHeight}
        onMouseMove={(e) => {
          if (arrowDrawing && arrowStartNodeId) {
            const stage = e.target.getStage();
            const pointerPosition = stage?.getPointerPosition();
            if (pointerPosition) {
              // Only update arrowPreviewEnd if it's not already latched to a circle
              setArrowPreviewEnd((prev) => {
                if (prev && prev.x === pointerPosition.x && prev.y === pointerPosition.y) {
                  return prev; // Prevent overriding latched position
                }
                return { x: pointerPosition.x, y: pointerPosition.y };
              });
            }
          }
        }}
        onMouseEnter={(e) => {
          const stage = e.target.getStage();
          if (stage) {
            stage.container().style.cursor = arrowDrawing ? 'crosshair' : 'default'; // Set cursor to crosshair if arrowDrawing is true
          }
        }}
        onMouseLeave={(e) => {
          const stage = e.target.getStage();
          if (stage) {
            stage.container().style.cursor = 'default'; // Reset cursor to default when leaving the Stage
          }
        }}
        onClick={(e) => {
          // Cancel drawing mode if the user clicks outside circles or rectangles
          const clickedOnEmptySpace =
            e.target.attrs.name !== 'circle' && e.target.attrs.name !== 'node';

          if (arrowDrawing && clickedOnEmptySpace) {
            setArrowDrawing(false);
            setArrowStartNodeId(null);
            setArrowPreviewEnd(null);
            const stage = e.target.getStage();
            if (stage) {
              stage.container().style.cursor = 'default'; // Reset cursor to default when leaving the Stage
            }
          }
        }}
        onContextMenu={(e) => {
          e.evt.preventDefault();
        }}
      >
        <Layer>
          {/* Render all saved arrows */}
          {arrows.map((arrow, index) => {
            const startNode = nodes.find((node) => node.id === arrow.startNodeId);
            const endNode = nodes.find((node) => node.id === arrow.endNodeId);

            if (!startNode || !endNode) return null; // Skip if nodes are not found
            const textWidthStart = calculateTextWidth(startNode.name, 16); // Calculate text width for the start node
            const rectWidthStart = textWidthStart + 20; // Add padding for the start node
            const points = [
              startNode.posX + rectWidthStart, //Arrow start position
              startNode.posY + 25,
              startNode.posX + rectWidthStart + 15, //Add straight line from the arrow start
              startNode.posY + 25,
              endNode.posX - 25, //Add straight line before the arrow end
              endNode.posY + 25,
              endNode.posX - 5, //Arrow end position (Arrow Pointer)
              endNode.posY + 25,
            ];
            return (
              <React.Fragment key={index}>
                {/* Invisible Rect for wider right-click area */}
                <Line
                  points={points}
                  stroke="transparent" // Invisible line
                  strokeWidth={20} // Wider hit area
                  onMouseEnter={(e) => {
                    const stage = e.target.getStage();
                    if (stage && !arrowDrawing) {
                      stage.container().style.cursor = 'pointer'; // Change cursor to "pointer" when hovering over the Line
                    }
                    if (!arrowDrawing) {
                      setHoveredArrowIndex(index);
                    }
                  }}
                  onMouseLeave={(e) => {
                    const stage = e.target.getStage();
                    if (stage && !arrowDrawing) {
                      stage.container().style.cursor = 'default'; // Reset cursor to default when leaving the Line
                    }
                    if (!arrowDrawing) {
                      setHoveredArrowIndex(null);
                    }
                  }}
                  onContextMenu={(e) => {
                    e.evt.preventDefault();
                    if (hoveredArrowIndex === index) {
                      setArrows((prev) => prev.filter((_, i) => i !== index));
                      const stage = e.target.getStage();
                      if (stage && !arrowDrawing) {
                        stage.container().style.cursor = 'default'; // Reset cursor to default when leaving the Line
                      }
                    }
                  }}
                />
                {/* Actual Arrow */}
                <Arrow
                  name="arrow"
                  points={points}
                  stroke={hoveredArrowIndex === index ? 'blue' : 'black'}
                  fill={hoveredArrowIndex === index ? 'blue' : 'black'}
                  pointerLength={10}
                  pointerWidth={10}
                  strokeWidth={2}
                />
              </React.Fragment>
            );
          })}

          {/* Render the preview arrow */}
          {arrowDrawing &&
            arrowStartNodeId &&
            arrowPreviewEnd &&
            (() => {
              const startNode = nodes.find((node) => node.id === arrowStartNodeId);
              if (!startNode) return null;

              const textWidthStart = calculateTextWidth(startNode.name, 16); // Calculate text width for the start node
              const rectWidthStart = textWidthStart + 20; // Add padding for the start node

              return (
                <Arrow
                  name="arrowPreview"
                  points={[
                    startNode.posX + rectWidthStart + 2, // Start position (right circle of the start node)
                    startNode.posY + 25, // Center vertically relative to the Rect
                    startNode.posX + rectWidthStart + 15, //Add straight line from the arrow start
                    startNode.posY + 25,
                    arrowLatch ? arrowLatch.x - 25 : arrowPreviewEnd.x - 25, // Latched position if available
                    arrowLatch ? arrowLatch.y : arrowPreviewEnd.y,
                    arrowLatch ? arrowLatch.x : arrowPreviewEnd.x, // Latched position if available
                    arrowLatch ? arrowLatch.y : arrowPreviewEnd.y,
                  ]}
                  stroke="gray"
                  fill="gray"
                  pointerLength={10}
                  pointerWidth={10}
                  dash={[10, 5]} // Dashed line for the preview
                />
              );
            })()}

          {nodes.map((node) => {
            const textWidth = calculateTextWidth(node.name, 16); // Calculate text width dynamically
            const rectWidth = textWidth + 20; // Add padding

            return (
              <React.Fragment key={node.id}>
                {/* Group for Rect and Text */}
                <Group
                  x={node.posX}
                  y={node.posY}
                  draggable={!arrowDrawing}
                  onDragMove={(e) => {
                    const newX = e.target.x();
                    const newY = e.target.y();
                    dispatch(updateNodePosition({ id: node.id, posX: newX, posY: newY }));
                  }}
                  onClick={(e) => {
                    dispatch(setSelectedNode(node.id));
                    if (arrowDrawing) {
                      // Check if the circle already has an arrow pointing to it
                      const isAlreadyPointed = arrows.some((arrow) => arrow.endNodeId === node.id);
                      if (!isAlreadyPointed) {
                        // Complete the arrow
                        setArrows((prev) => [
                          ...prev,
                          { startNodeId: arrowStartNodeId!, endNodeId: node.id },
                        ]);
                        setArrowDrawing(false);
                        setArrowStartNodeId(null);
                        setArrowPreviewEnd(null);
                        setArrowLatch(null);
                        setHoveredArrowIndex(null);
                        const stage = e.target.getStage();
                        if (stage) {
                          stage.container().style.cursor = 'default'; // Reset cursor to default when leaving the Stage
                        }
                      }
                    }
                  }}
                  onMouseEnter={(e) => {
                    const stage = e.target.getStage();
                    if (stage && !arrowDrawing) {
                      stage.container().style.cursor = 'move'; // Change cursor to "move" when hovering over the Rect
                    }
                    if (arrowDrawing) {
                      const isAlreadyPointed = arrows.some((arrow) => arrow.endNodeId === node.id);
                      if (!isAlreadyPointed) {
                        // Simulate left circle hover behavior
                        setArrowLatch({ x: node.posX - 2, y: node.posY + 25 });
                        setArrowPreviewEnd({ x: node.posX - 2, y: node.posY + 25 });
                      }
                    }
                  }}
                  onMouseLeave={(e) => {
                    const stage = e.target.getStage();
                    if (stage && !arrowDrawing) {
                      stage.container().style.cursor = 'default'; // Reset cursor to default when leaving the Rect
                    }
                    if (arrowDrawing) {
                      const isAlreadyPointed = arrows.some((arrow) => arrow.endNodeId === node.id);
                      if (!isAlreadyPointed) {
                        // Reset arrow latch when leaving the Rect/Text
                        setArrowLatch(null);
                      }
                    }
                  }}
                >
                  {/* Rect */}
                  <Rect
                    name="node"
                    width={rectWidth}
                    height={50}
                    fill="white"
                    stroke="black"
                    strokeWidth={2}
                  />
                  {/* Text */}
                  <Text
                    name="node"
                    x={10} // Padding inside the Rect
                    y={15} // Center the text vertically
                    text={node.name}
                    fontSize={16}
                    fill="black"
                  />
                </Group>

                {/* Left Circle */}
                <Circle
                  name="Circle"
                  x={node.posX - 3} // Position to the left of the Rect
                  y={node.posY + 25} // Center vertically relative to the Rect
                  radius={arrows.some((arrow) => arrow.endNodeId === node.id) ? 2 : 4} // Default radius
                  fill={arrows.some((arrow) => arrow.endNodeId === node.id) ? '#363636' : 'white'} // Turn black if it already has an arrow
                  stroke={arrows.some((arrow) => arrow.endNodeId === node.id) ? '#363636' : 'black'}
                  onClick={(e) => {
                    e.cancelBubble = true; // Prevent the Stage's onClick from firing
                    if (arrowDrawing) {
                      // Check if the circle already has an arrow pointing to it
                      const isAlreadyPointed = arrows.some((arrow) => arrow.endNodeId === node.id);
                      if (!isAlreadyPointed) {
                        // Complete the arrow
                        setArrows((prev) => [
                          ...prev,
                          { startNodeId: arrowStartNodeId!, endNodeId: node.id },
                        ]);
                        console.log('Arrows:', arrows);
                        setArrowDrawing(false);
                        setArrowStartNodeId(null);
                        setArrowPreviewEnd(null);
                        setArrowLatch(null);
                        setHoveredArrowIndex(null);
                        const stage = e.target.getStage();
                        if (stage) {
                          stage.container().style.cursor = 'default'; // Reset cursor to default when leaving the Stage
                        }
                      }
                    }
                  }}
                  onMouseEnter={(e) => {
                    const isAlreadyPointed = arrows.some((arrow) => arrow.endNodeId === node.id);
                    if (!isAlreadyPointed && arrowDrawing) {
                      e.target.to({
                        scaleX: 1.2,
                        scaleY: 1.2,
                        duration: 0.2,
                      });
                      if (arrowDrawing) {
                        setArrowLatch({ x: node.posX - 2, y: node.posY + 25 });
                        setArrowPreviewEnd({ x: node.posX - 2, y: node.posY + 25 });
                      }
                    }
                  }}
                  onMouseLeave={(e) => {
                    const isAlreadyPointed = arrows.some((arrow) => arrow.endNodeId === node.id);
                    if (!isAlreadyPointed) {
                      e.target.to({
                        scaleX: 1,
                        scaleY: 1,
                        duration: 0.2,
                      });
                      if (arrowDrawing) {
                        setArrowLatch(null);
                      }
                    }
                  }}
                />

                {/* Right Circle */}
                <Circle
                  name="Circle"
                  x={node.posX + rectWidth + 3} // Position to the right of the Rect
                  y={node.posY + 25} // Center vertically relative to the Rect
                  radius={4} // Default radius
                  fill="white"
                  stroke={'black'}
                  onClick={(e) => {
                    e.cancelBubble = true; // Prevent the Stage's onClick from firing
                    if (!arrowDrawing) {
                      // Start a new arrow
                      setArrowStartNodeId(node.id);
                      setArrowDrawing(true);
                      const stage = e.target.getStage();
                      if (stage) {
                        stage.container().style.cursor = 'crosshair';
                      }
                    }
                  }}
                  onMouseEnter={(e) => {
                    const stage = e.target.getStage();
                    if (stage && !arrowDrawing) {
                      stage.container().style.cursor = 'pointer'; // Change cursor to "pointer" when hovering over the Circle
                    }
                    !arrowDrawing &&
                      e.target.to({
                        scaleX: 1.2,
                        scaleY: 1.2,
                        duration: 0.2,
                      });
                  }}
                  onMouseLeave={(e) => {
                    const stage = e.target.getStage();
                    if (stage && !arrowDrawing) {
                      stage.container().style.cursor = 'default'; // Reset cursor to default when leaving the Circle
                    }
                    e.target.to({
                      scaleX: 1,
                      scaleY: 1,
                      duration: 0.2,
                    });
                  }}
                />
              </React.Fragment>
            );
          })}
        </Layer>
      </Stage>
    </Box>
  );
};

export default RulesCanvas;
