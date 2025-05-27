import { useState, useEffect, useRef } from 'react';
import { Group, Rect, Text, Circle } from 'react-konva';
import { useDispatch } from 'src/store/Store';
import {
  updateNodePosition,
  setSelectedNode,
  updateNodeDetails,
  deleteNode,
  addExtraDetails,
  setStartNode,
} from 'src/store/apps/rules/RulesNodes';
import { Html } from 'react-konva-utils';
// import AreaNodePopup from './AreaPopup';
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
import { useTheme } from '@mui/material';
import { IconDotsVertical, IconPencil, IconCopy, IconTrash, IconFlag } from '@tabler/icons-react';

const VisitorNodes = ({ node }: any) => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const arrowDrawing = useSelector((state: any) => state.RulesConnectorReducer.arrowDrawing);
  const arrows = useSelector((state: any) => state.RulesConnectorReducer.arrows);
  const [showPopup, setShowPopup] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const handlePopupClose = () => {
    setShowPopup(false);
  };
  const handleEditNode = (nodeId: string, details: string, extraDetails: string) => {
    dispatch(updateNodeDetails({ id: nodeId, details }));
    dispatch(addExtraDetails({ id: nodeId, extraDetails }));
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
  const [circleHovered, setCircleHovered] = useState(false);
  const nameWidth = calculateTextWidth(node.name, 16);
  const detailsText =
    node.details.split(', ').length > 1
      ? `${node.details.split(', ')[0]}, +${node.details.split(', ').length - 1}`
      : node.details;
  const detailsWidth = calculateTextWidth(detailsText, 12);
  const textWidth = Math.max(nameWidth, detailsWidth); // Approximate text width
  const rectWidth = Math.max(textWidth + 20, 100);
  const rectColor =
    node.extraDetails === 'Allow'
      ? theme.palette.success.light // Use success color for "Allow"
      : node.extraDetails === 'Restrict'
      ? theme.palette.error.light // Use error color for "Restrict"
      : 'white'; // Default color if no extraDetails

  const handleMenuToggle = () => {
    setShowMenu((prev) => !prev);
  };

  const handleMenuClose = () => {
    setShowMenu(false);
  };

  const handleSetStartNode = (id: string) => {
    dispatch(setStartNode(id));
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
        onDblClick={(e) => {
          dispatch(setSelectedNode(node.id));
          if (arrowDrawing) {
            if (arrowDrawing.startNodeId === node.id) {
              console.log('An arrow cannot point to the same node it started from.');
              return;
            }
            const isAlreadyPointed = arrows.some((arrow: any) => arrow.endNodeId === node.id);
            if (!isAlreadyPointed) {
              dispatch(
                addArrow({
                  id: arrowDrawing.id,
                  startNodeId: arrowDrawing.startNodeId,
                  endNodeId: node.id,
                  type: 'Connector',
                }),
              );
              const stage = e.target.getStage();
              if (stage) {
                stage.container().style.cursor = 'move'; // Reset cursor to default when leaving the Stage
              }
              dispatch(setArrowDrawing(null));
            }
            return;
          }
          if (!arrowDrawing) {
            dispatch(setSelectedNode(node.id));
            handlePopupOpen();
          }
        }}
        onMouseEnter={(e) => {
          const stage = e.target.getStage();
          if (stage && !arrowDrawing) {
            stage.container().style.cursor = 'move';
          }
          const isAlreadyPointed = arrows.some((arrow: any) => arrow.endNodeId === node.id);
          if (!isAlreadyPointed && arrowDrawing) {
            if (arrowDrawing.startNodeId === node.id) {
              return;
            }
            dispatch(setArrowLatch({ id: arrowDrawing.id, x: node.posX - 3, y: node.posY + 25 }));
            dispatch(
              setArrowPreviewEnd({ id: arrowDrawing.id, x: node.posX - 3, y: node.posY + 25 }),
            );

            return;
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
          fill={rectColor}
          stroke="black"
          strokeWidth={2}
        />
        {/* Text inside the node */}
        <Text
          name="node"
          x={rectWidth / 2 - nameWidth / 2} // Padding inside the Rect
          y={12} // Center the text vertically
          text={node.name}
          fontSize={16}
          fill="black"
        />
        <Text
          name="node-details"
          x={rectWidth / 2 - detailsWidth / 2} // Center horizontally for details
          y={32} // Position below the name
          text={detailsText}
          fontSize={12} // Smaller font size for details
          fill="gray"
        />
      </Group>
      {/* Render Popup using HTML */}
      {showPopup && <Html></Html>}

      {/* Left Circle */}
      <Circle
        name="Circle"
        x={node.posX - 3} // Position to the left of the Rect
        y={node.posY + 25} // Center vertically relative to the Rect
        radius={arrows.some((arrow: any) => arrow.endNodeId === node.id) ? 2 : 4} // Default radius
        fill={arrows.some((arrow: any) => arrow.endNodeId === node.id) ? '#363636' : 'white'} // Turn black if it already has an arrow
        stroke={arrows.some((arrow: any) => arrow.endNodeId === node.id) ? '#363636' : 'black'}
        onClick={(e) => {
          e.cancelBubble = true; // Prevent the Stage's onClick from firing
          if (arrowDrawing) {
            if (arrowDrawing.startNodeId === node.id) {
              console.log('An arrow cannot point to the same node it started from.');
              return;
            }
            const isAlreadyPointed = arrows.some((arrow: any) => arrow.endNodeId === node.id);
            if (!isAlreadyPointed) {
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
          }
        }}
        onMouseEnter={(e) => {
          const isAlreadyPointed = arrows.some((arrow: any) => arrow.endNodeId === node.id);
          if (!isAlreadyPointed && arrowDrawing) {
            if (arrowDrawing.startNodeId === node.id) {
              return;
            }
            e.target.to({
              scaleX: 1.5,
              scaleY: 1.5,
              duration: 0.2,
            });
            dispatch(setArrowLatch({ id: arrowDrawing.id, x: node.posX - 3, y: node.posY + 25 }));
            dispatch(
              setArrowPreviewEnd({ id: arrowDrawing.id, x: node.posX - 3, y: node.posY + 25 }),
            );
          }
        }}
        onMouseLeave={(e) => {
          const isAlreadyPointed = arrows.some((arrow: any) => arrow.endNodeId === node.id);
          if (!isAlreadyPointed) {
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
              scaleX: 1.5,
              scaleY: 1.5,
              duration: 0.2,
            });
            console.log('Circle hovered', circleHovered);
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

      {node.startNode && (
        <>
          <Rect x={0} y={-15} width={rectWidth} height={15} fill="black" cornerRadius={4} />
          <Text
            x={rectWidth / 2 - calculateTextWidth('Starting Node', 10) / 2}
            y={-12}
            text="Starting Node"
            fontSize={10}
            fill="white"
            align="center"
          />
        </>
      )}

      <Html>
        <div
          style={{
            position: 'absolute',
            top: 9,
            left: rectWidth - 20,
            cursor: 'pointer',
          }}
          onClick={handleMenuToggle}
          onMouseEnter={(e) => {
            const stage = e.currentTarget.closest('.konvajs-content') as HTMLElement | null;
            if (stage) {
              stage.style.cursor = 'pointer';
            }
          }}
          onMouseLeave={(e) => {
            const stage = e.currentTarget.closest('.konvajs-content') as HTMLElement | null;
            if (stage) {
              stage.style.cursor = 'default';
            }
          }}
        >
          <IconDotsVertical size={18} color="gray" />
        </div>
      </Html>

      {showMenu && (
        <Html>
          <div
            ref={menuRef}
            style={{
              position: 'absolute',
              top: node.posY - 180,
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
                onClick={handleMenuClose}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f5f5')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <IconTrash size={18} style={{ marginRight: 10 }} />
                Delete
              </li>
              {node.startNode ? (
                <li
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    borderRadius: '6px',
                    transition: 'background 0.2s',
                  }}
                  onClick={() => handleSetStartNode('')}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f5f5')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <IconFlag size={18} style={{ marginRight: 10 }} />
                  Unset Start Node
                </li>
              ) : (
                <li
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    borderRadius: '6px',
                    transition: 'background 0.2s',
                  }}
                  onClick={() => handleSetStartNode(node.id)}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f5f5')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <IconFlag size={18} style={{ marginRight: 10 }} />
                  Set Start Node
                </li>
              )}
            </ul>
          </div>
        </Html>
      )}
    </>
  );
};

export default VisitorNodes;
