import { useState, useRef, useEffect } from 'react';
import { Group, Rect, Text, Circle } from 'react-konva';
import { IconPencil, IconCopy, IconTrash, IconFlag, IconDotsVertical } from '@tabler/icons-react';
import { useDispatch } from 'src/store/Store';
import {
  updateNodePosition,
  setSelectedNode,
  updateNodeDetails,
  deleteNode,
  setStartNode,
  setStartNodeThunk,
  nodeType,
} from 'src/store/apps/rules/RulesNodes';
import { Html } from 'react-konva-utils';
import VisitorNodePopup from './VisitorPopup';
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
import { Box, Button, Grid2 as Grid, Typography, useTheme } from '@mui/material';

const VisitorsDataNodes = ({ node, ifSelector, setIfSelector }: any) => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null); // Ref for the menu
  const [isHovered, setIsHovered] = useState(false);
  const [isButtonHovered, setIsButtonHovered] = useState(false);
  const [ifSelectorPos, setIfSelectorPos] = useState<{ x: number; y: number } | null>(null);
  const handleMenuToggle = () => {
    setShowMenu((prev) => !prev); // Toggle the menu visibility
  };

  const handleMenuClose = () => {
    setShowMenu(false); // Close the menu
  };
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
  const [circleHovered, setCircleHovered] = useState(false);
  const nameWidth = calculateTextWidth(node.name, 16);
const detailsText = (node: nodeType) => {
  if (node.details.startsWith('Choose a')) {
    return node.details;
  }

  try {
    // Parse the JSON string
    const details = JSON.parse(node.details);

    // Format each section
    const formatSection = (items: string[]) => {
      if (!items || items.length === 0) return '';
      return `${items[0]}${items.length > 1 ? ` +${items.length - 1}` : ''}`;
    };

    // Combine all sections
    const formattedParts = [
      formatSection(details.status),
      formatSection(details.type),
      formatSection(details.visitor)
    ].filter(Boolean);

    return formattedParts.join(' | ');
  } catch (error) {
    console.error('Error parsing details:', error);
    return 'Invalid details format';
  }
};
  const detailsWidth = calculateTextWidth(detailsText(node), 12);
  const textWidth = Math.max(nameWidth, detailsWidth); // Approximate text width
  const rectWidth = Math.max(textWidth + 20, 100);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false); // Close the menu
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  const handleSetStartNode = (id: string) => {
    dispatch(setStartNodeThunk(id));
  };
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
        onDblClick={() => {
          if (!arrowDrawing) {
            dispatch(setSelectedNode(node.id));
            handlePopupOpen();
          }
        }}
        onClick={(e) => {
          dispatch(setSelectedNode(node.id));
          if (arrowDrawing && !node.startNode) {
            if (arrowDrawing.startNodeId === node.id) {
              console.log('An arrow cannot point to the same node it started from.');
              return;
            }
            const isAlreadyPointed = arrows.some((arrow: any) => arrow.endNodeId === node.id);
            if (!isAlreadyPointed) {
              if (arrowDrawing.type === 'IF_Connector') {
                // Show selector at cursor
                const stage = e.target.getStage();
                const pointer = stage?.getPointerPosition();
                if (pointer) {
                  setIfSelectorPos({ x: pointer.x, y: pointer.y });
                }
                setIfSelector(true);
                e.target.to({
                  scaleX: 1,
                  scaleY: 1,
                  duration: 0.2,
                });
                if (stage) {
                  stage.container().style.cursor = 'default'; // Reset cursor to default when leaving the Stage
                }
                return;
              } else {
                dispatch(
                  addArrow({
                    id: arrowDrawing.id,
                    startNodeId: arrowDrawing.startNodeId,
                    endNodeId: node.id,
                    type: 'Connector',
                  }),
                );
              }
              const stage = e.target.getStage();
              if (stage) {
                stage.container().style.cursor = 'move'; // Reset cursor to default when leaving the Stage
              }
              dispatch(setArrowDrawing(null));
            }
            return;
          }
        }}
        onMouseEnter={(e) => {
          const stage = e.target.getStage();
          if (stage && !arrowDrawing) {
            stage.container().style.cursor = 'move';
          }
          const isAlreadyPointed = arrows.some((arrow: any) => arrow.endNodeId === node.id);
          if (!isAlreadyPointed && arrowDrawing && !node.startNode) {
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
          if (ifSelector) {
            return;
          }
          if (stage && !arrowDrawing) {
            stage.container().style.cursor = 'default';
            setIsHovered(false);
          }
          dispatch(setArrowLatch(null));
        }}
      >
        {/* "Starting Node" Label */}
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
        {/* Text inside the node */}
        <Text
          name="node"
          x={rectWidth / 2 - nameWidth / 2} // Padding inside the Rect
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
        <Text
          name="node"
          x={rectWidth / 2 - detailsWidth / 2} // Center horizontally for details
          y={32} // Position below the name
          text={detailsText(node)}
          fontSize={12} // Smaller font size for details
          fill="gray"
          onMouseEnter={() => {
            if (!arrowDrawing) {
              setIsHovered(true);
            }
          }}
          onMouseLeave={() => setIsHovered(false)}
        />
        {/* Left Circle */}
        {!node.startNode && (
          <Circle
            name="circle"
            x={-3} // Position to the left of the Rect
            y={25} // Center vertically relative to the Rect
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
                  if (arrowDrawing.type === 'IF_Connector') {
                    // Show selector at cursor
                    const stage = e.target.getStage();
                    const pointer = stage?.getPointerPosition();
                    if (pointer) {
                      setIfSelectorPos({ x: pointer.x, y: pointer.y });
                    }
                    setIfSelector(true);
                    e.target.to({
                      scaleX: 1,
                      scaleY: 1,
                      duration: 0.2,
                    });
                    if (stage) {
                      stage.container().style.cursor = 'default'; // Reset cursor to default when leaving the Stage
                    }
                    return;
                  } else {
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
                dispatch(
                  setArrowLatch({ id: arrowDrawing.id, x: node.posX - 3, y: node.posY + 25 }),
                );
                dispatch(
                  setArrowPreviewEnd({ id: arrowDrawing.id, x: node.posX - 3, y: node.posY + 25 }),
                );
              }
            }}
            onMouseLeave={(e) => {
              const isAlreadyPointed = arrows.some((arrow: any) => arrow.endNodeId === node.id);
              if (!isAlreadyPointed || !ifSelector) {
                e.target.to({
                  scaleX: 1,
                  scaleY: 1,
                  duration: 0.2,
                });
                dispatch(setArrowLatch(null));
              }
            }}
          />
        )}

        {/* Right Circle */}
        <Circle
          name="circle"
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
                scaleX: 1.5,
                scaleY: 1.5,
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
      {ifSelector && ifSelectorPos && (
        <Html>
          <Box
            sx={{
              position: 'absolute',
              left: ifSelectorPos.x,
              top: ifSelectorPos.y,
              background: 'white',
              border: '2px solid #1976d2',
              borderRadius: 2,
              boxShadow: 3,
              p: 2,
              zIndex: 2000,
              minWidth: 180,
            }}
          >
            <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1 }}>
              Select IF Condition
            </Typography>
            <Grid container spacing={2} justifyContent="center" alignItems="center">
              <Button
                fullWidth
                variant="contained"
                color="primary"
                onClick={() => {
                  dispatch(
                    addArrow({
                      id: arrowDrawing.id,
                      startNodeId: arrowDrawing.startNodeId,
                      endNodeId: node.id,
                      type: 'IF_True',
                    }),
                  );
                  setIfSelector(false);
                  setIfSelectorPos(null);
                  dispatch(setArrowDrawing(null));
                }}
              >
                True
              </Button>
              <Button
                fullWidth
                variant="contained"
                color="error"
                onClick={() => {
                  dispatch(
                    addArrow({
                      id: arrowDrawing.id,
                      startNodeId: arrowDrawing.startNodeId,
                      endNodeId: node.id,
                      type: 'IF_False',
                    }),
                  );
                  setIfSelector(false);
                  setIfSelectorPos(null);
                  dispatch(setArrowDrawing(null));
                }}
              >
                False
              </Button>
            </Grid>
          </Box>
        </Html>
      )}
      {/* Render Popup using HTML */}
      {showPopup && (
        <Html>
          <VisitorNodePopup
            node={node}
            onClose={handlePopupClose}
            onEdit={handleEditNode}
            onDelete={handleDeleteNode}
            onCreateConnection={createConnection}
          />
        </Html>
      )}
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
                  e.stopPropagation(); // Prevent the click from propagating to the Group
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

export default VisitorsDataNodes;
