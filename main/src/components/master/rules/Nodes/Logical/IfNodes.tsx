import { useEffect, useRef, useState } from 'react';
import { Group, Rect, Text, Circle } from 'react-konva';
import { useDispatch } from 'src/store/Store';
import {
  updateNodePosition,
  setSelectedNode,
  updateNodeDetails,
  deleteNode,
  setStartNode,
  setStartNodeThunk,
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
import IfDialogPopup from './IfDialogPopup';
import { Html } from 'react-konva-utils';
import { IconCopy, IconDotsVertical, IconFlag, IconPencil, IconTrash } from '@tabler/icons-react';
import { useTheme } from '@mui/material';

const IfNodes = ({ node }: any) => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const arrowDrawing = useSelector((state: any) => state.RulesConnectorReducer.arrowDrawing);
  const arrows = useSelector((state: any) => state.RulesConnectorReducer.arrows);
  const [showPopup, setShowPopup] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isButtonHovered, setIsButtonHovered] = useState(false);
  const [circleHovered, setCircleHovered] = useState(false);
  const handlePopupOpen = () => {
    setShowPopup(true);
  };
  const handleMenuToggle = () => {
    setShowMenu((prev) => !prev);
  };

  const handleMenuClose = () => {
    setShowMenu(false);
  };

  const handleSetStartNode = (id: string) => {
    dispatch(setStartNodeThunk(id));
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  const handlePopupClose = () => {
    setShowPopup(false);
  };
  const handleSave = () => {
    console.log('Condition saved');
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

  const allNodes = useSelector((state: any) => state.RulesNodeReducer.nodes);

  const incomingNodeIds = arrows
    .filter((arrow: ArrowType) => arrow.endNodeId === node.id)
    .map((arrow: ArrowType) => arrow.startNodeId);

  const incomingNodes = allNodes.filter((n: any) => incomingNodeIds.includes(n.id));

  return (
    <>
      <Group
        x={node.posX}
        y={node.posY}
        draggable={!arrowDrawing && !showPopup}
        onDragStart={(e) => {
          e.target.moveToTop();
        }}
        onDragMove={(e) => {
          const newX = e.target.x();
          const newY = e.target.y();
          dispatch(updateNodePosition({ id: node.id, posX: newX, posY: newY }));
        }}
        onDblClick={(e) => {
          if (!arrowDrawing && !showPopup) {
            e.cancelBubble = true; // Prevent the Stage's onClick from firing
            setShowPopup(true); // Open the dialog on double-click
            console.log('incomingNodes: ', incomingNodes);
          }
        }}
        onClick={(e) => {
          e.cancelBubble = true; // Prevent the Stage's onClick from firing

          if (arrowDrawing && !node.startNode) {
            if (arrowDrawing.startNodeId === node.id) {
              console.log('An arrow cannot point to the same node it started from.');
              return;
            }

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
            // Open the popup if no arrow is being drawn
            // dispatch(setSelectedNode(node.id));
            // handlePopupOpen();
          }
        }}
        onMouseEnter={(e) => {
          const stage = e.target.getStage();

          if (stage && !arrowDrawing) {
            stage.container().style.cursor = 'move'; // Change cursor to "move" when hovering over the Group
          }

          if (arrowDrawing && !node.startNode) {
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
            setIsHovered(false);
            stage.container().style.cursor = 'default';
          }
          dispatch(setArrowLatch(null));
        }}
      >
        {/* Three-dotted button */}
        <Html>
          {(isHovered || isButtonHovered) && (
            <div
              style={{
                position: 'absolute',
                top: 9, // Adjust position relative to the node
                left: rectWidth - 20, // Align near the right edge of the rectangle
                cursor: 'pointer',
              }}
              onClick={handleMenuToggle} // Toggle the menu on click
              onMouseEnter={(e) => {
                setIsButtonHovered(true);
                const stage = e.currentTarget.closest('.konvajs-content') as HTMLElement | null;
                if (stage) {
                  stage.style.cursor = 'pointer'; // Change cursor to "pointer"
                }
              }}
              onMouseLeave={(e) => {
                setIsButtonHovered(false);
                const stage = e.currentTarget.closest('.konvajs-content') as HTMLElement | null;
                if (stage) {
                  stage.style.cursor = 'default'; // Reset cursor to default
                }
              }}
            >
              <IconDotsVertical size={18} color="gray" />
            </div>
          )}
        </Html>
        {/* Rectangle for the node */}
        <Rect
          name="node"
          width={rectWidth}
          height={50}
          fill="white"
          stroke="black"
          strokeWidth={2}
          onMouseEnter={() => {
            if (!arrowDrawing) {
              setIsHovered(true);
            }
          }}
          onMouseLeave={() => setIsHovered(false)}
        />
        {/* Text inside the node */}
        <Text
          name="node"
          x={rectWidth / 2 - textWidth / 2} // Padding inside the Rect
          y={12} // Center the text vertically
          text={node.name}
          fontSize={16}
          fill="black"
          onMouseEnter={() => {
            if (!arrowDrawing) {
              setIsHovered(true);
            }
          }}
          onMouseLeave={() => setIsHovered(false)}
        />
        {node.startNode && (
          <>
            <Rect
              x={0} // Align with the main rectangle
              y={-15} // Position above the main rectangle
              width={rectWidth}
              height={15}
              fill={theme.palette.primary.main} // Black background
              cornerRadius={4} // Rounded corners
            />
            <Text
              x={rectWidth / 2 - calculateTextWidth('Starting Node', 10) / 2} // Center horizontally
              y={-12} // Position inside the black rectangle
              text="Starting Node"
              fontSize={10}
              fill="white" // White text
              align="center"
            />
          </>
        )}
        {/* Left Circle */}
        {!node.startNode && (
          <Circle
            name="Circle"
            x={-3} // Position to the left of the Rect
            y={25} // Center vertically relative to the Rect
            radius={4} // Fixed radius
            fill="white"
            stroke="black"
            onClick={(e) => {
              e.cancelBubble = true; // Prevent the Stage's onClick from firing
              if (arrowDrawing) {
                if (arrowDrawing.startNodeId === node.id) {
                  console.log('An arrow cannot point to the same node it started from.');
                  return;
                }

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
              }
            }}
            onMouseEnter={(e) => {
              const stage = e.target.getStage();
              if (arrowDrawing) {
                if (arrowDrawing.startNodeId === node.id) {
                  return;
                }
                e.target.to({
                  scaleX: 1.2,
                  scaleY: 1.2,
                  duration: 0.2,
                });
                dispatch(
                  setArrowLatch({ id: arrowDrawing.id, x: node.posX - 3, y: node.posY + 25 }),
                );
                dispatch(
                  setArrowPreviewEnd({ id: arrowDrawing.id, x: node.posX - 3, y: node.posY + 25 }),
                );
              }
            }}
            onMouseLeave={(e) => {
              const stage = e.target.getStage();
              e.target.to({
                scaleX: 1,
                scaleY: 1,
                duration: 0.2,
              });
              dispatch(setArrowLatch(null));
            }}
          />
        )}
        {/* Right Circle */}
        <Circle
          name="Circle"
          x={rectWidth + 3} // Position to the right of the Rect
          y={25} // Center vertically relative to the Rect
          radius={4} // Default radius
          fill="white"
          stroke={circleHovered ? 'orange' : 'black'}
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
              setCircleHovered(false);
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
              setCircleHovered(true);
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
            setCircleHovered(false);
            e.target.to({
              scaleX: 1,
              scaleY: 1,
              duration: 0.2,
            });
          }}
        />
      </Group>

      {/* IfDialogPopup */}
      {showPopup && (
        <Html>
          <IfDialogPopup
            nodes={incomingNodes}
            open={showPopup}
            onClose={handlePopupClose}
            onSave={() => handleSave()}
          />
        </Html>
      )}
      {/* Menu Items */}
      {showMenu && (
        <Html>
          <div
            ref={menuRef}
            style={{
              position: 'absolute',
              top: node.posY - 140,
              left: node.posX + rectWidth - 25,
              width: '180px',
              background: 'white',
              border: '1px solid #ccc',
              borderRadius: '8px',
              padding: '10px',
              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
              zIndex: 1000,
            }}
          >
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              <li
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: '6px',
                  transition: 'background 0.2s',
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  dispatch(setSelectedNode(node.id));
                  handlePopupOpen();
                  handleMenuClose();
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f5f5')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <IconPencil size={18} style={{ marginRight: 10 }} />
                Edit
              </li>
              <li
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: '6px',
                  transition: 'background 0.2s',
                }}
                onClick={handleMenuClose}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f5f5')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <IconCopy size={18} style={{ marginRight: 10 }} />
                Copy
              </li>
              <li
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: '6px',
                  transition: 'background 0.2s',
                  color: '#e53935',
                }}
                onClick={() => handleDeleteNode(node.id)}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f5f5')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <IconTrash size={18} style={{ marginRight: 10 }} />
                Delete
              </li>
            </ul>
          </div>
        </Html>
      )}
    </>
  );
};

export default IfNodes;
