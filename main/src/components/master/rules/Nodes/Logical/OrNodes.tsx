import { useState } from 'react';
import { Group, Rect, Text, Circle } from 'react-konva';
import { useDispatch } from 'src/store/Store';
import {
  updateNodePosition,
  setSelectedNode,
  updateNodeDetails,
  deleteNode,
} from 'src/store/apps/rules/RulesNodes';
import { useSelector } from 'react-redux';
import {
  addArrow,
  ArrowType,
  deleteArrowsByNode,
  setArrowDrawing,
  setArrowLatch,
  setArrowPreviewEnd,
} from 'src/store/apps/rules/RulesConnectors';
import { uniqueId } from 'lodash';

const OrNodes = ({ node }: any) => {
  const dispatch = useDispatch();
  const arrowDrawing = useSelector((state: any) => state.RulesConnectorReducer.arrowDrawing);
  const arrows = useSelector((state: any) => state.RulesConnectorReducer.arrows);
  const [showPopup, setShowPopup] = useState(false);

  const handlePopupClose = () => {
    setShowPopup(false);
  };
  const handleEditNode = (nodeId: string, details: string) => {
    dispatch(updateNodeDetails({ id: nodeId, details }));
    setShowPopup(false);
  };
  const handleDeleteNode = (nodeId: string) => {
    dispatch(deleteNode(nodeId));
    dispatch(deleteArrowsByNode(nodeId));
    setShowPopup(false);
  };
  const createConnection = (nodeId: string, stage: any) => {
    const pointerPosition = stage?.getPointerPosition();
    if (!arrowDrawing && showPopup) {
      const arrow: ArrowType = {
        id: uniqueId('arrow_'),
        startNodeId: nodeId,
        endNodeId: '',
        type: 'Connector',
        arrowPreviewEnd: {
          x: pointerPosition ? pointerPosition.x : node.posX + rectWidth + 3,
          y: pointerPosition ? pointerPosition.y : node.posY + 25,
        },
      };
      // Change the cursor to crosshair
      if (stage) {
        stage.container().style.cursor = 'crosshair';
      }
      handlePopupClose();

      // Dispatch the arrowDrawing state
      dispatch(setArrowDrawing(arrow));

      // Immediately set the arrowPreviewEnd
      if (pointerPosition) {
        dispatch(
          setArrowPreviewEnd({
            id: arrow.id,
            x: pointerPosition.x,
            y: pointerPosition.y,
          }),
        );
      }
    }
  };
  const handlePopupOpen = () => {
    setShowPopup(true);
  };
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
  const textWidth = calculateTextWidth(node.name, 16); // Approximate text width
  const rectWidth = Math.max(textWidth + 20, 100);
  return (
    <>
      <Group
        x={node.posX}
        y={node.posY}
        draggable={!arrowDrawing && !showPopup}
        onDragMove={(e) => {
          const newX = e.target.x();
          const newY = e.target.y();
          dispatch(updateNodePosition({ id: node.id, posX: newX, posY: newY }));
        }}
        onClick={(e) => {
          e.cancelBubble = true; // Prevent the Stage's onClick from firing
          const connectedArrows = arrows.filter((arrow: any) => arrow.endNodeId === node.id);

          if (arrowDrawing) {
            if (arrowDrawing.startNodeId === node.id) {
              console.log('An arrow cannot point to the same node it started from.');
              return;
            }

            if (connectedArrows.length < 2) {
              // Allow connection if fewer than 2 arrows are connected
              dispatch(
                addArrow({
                  id: arrowDrawing.id,
                  startNodeId: arrowDrawing.startNodeId,
                  endNodeId: node.id,
                  type: 'Connector',
                }),
              );
              dispatch(setArrowDrawing(null));
            } else {
              console.log('This node already has 2 arrows connected.');
            }
          } else {
            // Open the popup if no arrow is being drawn
            // dispatch(setSelectedNode(node.id));
            // handlePopupOpen();
          }
        }}
        onMouseEnter={(e) => {
          const stage = e.target.getStage();
          const connectedArrows = arrows.filter((arrow: any) => arrow.endNodeId === node.id);

          if (stage && !arrowDrawing) {
            stage.container().style.cursor = 'move'; // Change cursor to "move" when hovering over the Group
          }

          if (connectedArrows.length < 2 && arrowDrawing) {
            if (arrowDrawing.startNodeId === node.id) {
              return;
            }
            dispatch(setArrowLatch({ id: arrowDrawing.id, x: node.posX - 3, y: node.posY + 25 }));
            dispatch(
              setArrowPreviewEnd({ id: arrowDrawing.id, x: node.posX - 3, y: node.posY + 25 }),
            );
          }
        }}
        onMouseLeave={(e) => {
          const stage = e.target.getStage();
          if (stage && !arrowDrawing) {
            stage.container().style.cursor = 'default';
          }
          dispatch(setArrowLatch(null));
        }}
      >
        {/* Rectangle for the node */}
        <Rect
          name="node"
          width={rectWidth}
          height={50}
          fill="white"
          stroke="black"
          strokeWidth={2}
        />
        {/* Text inside the node */}
        <Text
          name="node"
          x={rectWidth / 2 - textWidth / 2} // Padding inside the Rect
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
        radius={
          arrows.filter((arrow: any) => arrow.endNodeId === node.id).length >= 2
            ? 2 // Default size when 2 arrows are connected
            : 4 // Larger size when fewer than 2 arrows are connected
        }
        fill={
          arrows.filter((arrow: any) => arrow.endNodeId === node.id).length >= 2
            ? '#363636' // Turn black when 2 arrows are connected
            : 'white' // Default color when fewer than 2 arrows are connected
        }
        stroke="black"
        onClick={(e) => {
          e.cancelBubble = true; // Prevent the Stage's onClick from firing
          if (arrowDrawing) {
            if (arrowDrawing.startNodeId === node.id) {
              console.log('An arrow cannot point to the same node it started from.');
              return;
            }
            const connectedArrows = arrows.filter((arrow: any) => arrow.endNodeId === node.id);
            if (connectedArrows.length < 2) {
              dispatch(
                addArrow({
                  id: arrowDrawing.id,
                  startNodeId: arrowDrawing.startNodeId,
                  endNodeId: node.id,
                  type: 'Connector',
                }),
              );
              e.target.to({
                scaleX: 1,
                scaleY: 1,
                duration: 0.2,
              });
              const stage = e.target.getStage();
              if (stage) {
                stage.container().style.cursor = 'default'; // Reset cursor to default when leaving the Stage
              }
              dispatch(setArrowDrawing(null));
            } else {
              console.log('This node already has 2 arrows connected.');
            }
          }
        }}
        onMouseEnter={(e) => {
          const connectedArrows = arrows.filter((arrow: any) => arrow.endNodeId === node.id);
          if (connectedArrows.length < 2 && arrowDrawing) {
            if (arrowDrawing.startNodeId === node.id) {
              return;
            }
            e.target.to({
              scaleX: 1.2,
              scaleY: 1.2,
              duration: 0.2,
            });
            dispatch(setArrowLatch({ id: arrowDrawing.id, x: node.posX - 3, y: node.posY + 25 }));
            dispatch(
              setArrowPreviewEnd({ id: arrowDrawing.id, x: node.posX - 3, y: node.posY + 25 }),
            );
          }
        }}
        onMouseLeave={(e) => {
          const connectedArrows = arrows.filter((arrow: any) => arrow.endNodeId === node.id);
          if (connectedArrows.length < 2) {
            e.target.to({
              scaleX: 1,
              scaleY: 1,
              duration: 0.2,
            });
            dispatch(setArrowLatch(null));
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
        stroke="black"
        onClick={(e) => {
          e.cancelBubble = true; // Prevent the Stage's onClick from firing
          if (!arrowDrawing && !showPopup) {
            // Start a new arrow
            const stage = e.target.getStage();
            const pointerPosition = stage?.getPointerPosition();
            const arrow: ArrowType = {
              id: uniqueId('arrow_'),
              startNodeId: node.id,
              endNodeId: '',
              type: 'Connector',
              arrowPreviewEnd: {
                x: pointerPosition ? pointerPosition.x : 0,
                y: pointerPosition ? pointerPosition.y : 0,
              },
            };
            dispatch(setArrowDrawing(arrow));
            if (pointerPosition) {
              dispatch(
                setArrowPreviewEnd({
                  id: arrow.id,
                  x: pointerPosition.x,
                  y: pointerPosition.y,
                }),
              );
            }

            if (stage) {
              stage.container().style.cursor = 'crosshair';
            }
            // console.log(arrow);
          }
        }}
        onMouseEnter={(e) => {
          const stage = e.target.getStage();
          if (stage && !arrowDrawing && !showPopup) {
            stage.container().style.cursor = 'pointer'; // Change cursor to "pointer" when hovering over the Circle
            e.target.to({
              scaleX: 1.2,
              scaleY: 1.2,
              duration: 0.2,
            });
          }
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
    </>
  );
};

export default OrNodes;
