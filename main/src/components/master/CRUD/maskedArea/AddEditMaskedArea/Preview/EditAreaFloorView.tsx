import { BASE_URL } from 'src/utils/axios';
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { AppDispatch, useDispatch, useSelector, RootState } from 'src/store/Store';
import { Box, FormControlLabel, FormLabel, Switch } from '@mui/material';
import { fetchFloorplan } from 'src/store/apps/crud/floorplan';
import ZoomControls from 'src/components/shared/ZoomControls';
import FloorplanHouse from 'src/assets/images/masters/Floorplan/Floorplan-House.png';
import { fetchMaskedAreas, MaskedAreaType } from 'src/store/apps/crud/maskedArea';
import EditAreaRenderer from './EditAreaRenderer';
import MouseDoubleClickIcon from 'src/assets/images/svgs/mouse-double-click-icon.svg';
import MouseLeftClickIcon from 'src/assets/images/svgs/mouse-left-click-icon.svg';
import MouseRightClickIcon from 'src/assets/images/svgs/mouse-right-click-icon.svg';
import ShiftButtonIcon from 'src/assets/images/svgs/shift-button-icon.svg';
import { useFloorplanDeviceList } from 'src/hooks/useFloorplanDevice';
import { defaultFloorplanDeviceFilter } from 'src/store/apps/defaultForm';

const EditAreaFloorView: React.FC<{
  zoomable: boolean;
  preview?: boolean;
}> = ({ zoomable, preview = false }) => {
  const dispatch: AppDispatch = useDispatch();
  const activeFloorPlan = useSelector(
    (state: RootState) => state.floorplanReducer.selectedFloorplan,
  );
  const activeMaskedArea = useSelector(
    (state: RootState) => state.maskedAreaReducer.selectedMaskedArea,
  );
  const unsavedMaskedAreas = useSelector(
    (state: RootState) => state.maskedAreaReducer.unsavedMaskedAreas,
  );
  const editingMaskedArea = useSelector(
    (state: RootState) => state.maskedAreaReducer.editingMaskedArea,
  );
  const drawingMaskedArea = useSelector(
    (state: RootState) => state.maskedAreaReducer.drawingMaskedArea,
  );

  const { data: devicesResponse } = useFloorplanDeviceList({
    ...defaultFloorplanDeviceFilter,
    filters: { FloorplanId: [activeFloorPlan?.id ?? ''] },
  });
  const devices = devicesResponse?.data || [];
  const [showDevices, setShowDevices] = useState(true);

  const [isDraggingView, setIsDraggingView] = useState(false);
  const [isHoveringView, setIsHoveringView] = useState(false);
  const [isHoveringAreaShape, setIsHoveringAreaShape] = useState(false);
  const [isOnArea, setIsOnArea] = useState(false);
  const isDrawingMaskedArea = drawingMaskedArea !== '';
  const [filteredUnsavedMaskedArea, setFilteredUnsavedMaskedArea] = useState<MaskedAreaType[]>([]);
  const [cursor, setCursor] = useState(drawingMaskedArea ? 'crosshair' : 'grab');
  const Cursor = useMemo(() => {
    if (isDrawingMaskedArea) return 'crosshair';
    if (isDraggingView) return 'grabbing';
    if (editingMaskedArea && isHoveringAreaShape) return 'move';
    if (isOnArea && !isDraggingView && !isDrawingMaskedArea) return 'pointer';
    if (isHoveringView) return 'grab';
    return 'default';
  }, [
    isDrawingMaskedArea,
    isDraggingView,
    editingMaskedArea,
    isHoveringAreaShape,
    isOnArea,
    isHoveringView,
  ]);

  const [isDragging, setIsDragging] = useState('');
  const [isHovered, setIsHovered] = useState(false);
  useEffect(() => {
    // console.log('CURSOR: ', Cursor);
  }, [Cursor]);
  // Container and stage management
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<any>(null);
  const [containerSize, setContainerSize] = useState({ width: 1920, height: 960 });
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });

  // Stage transform state
  const [stageScale, setStageScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });

  const MIN_SCALE = 0.1;
  const MAX_SCALE = 4;

  // Filter areas based on active floorplan
  useEffect(() => {
    const filteredMaskedArea = unsavedMaskedAreas.filter(
      (maskedArea: MaskedAreaType) => maskedArea.floorplanId === activeFloorPlan?.id,
    );
    setFilteredUnsavedMaskedArea(filteredMaskedArea);
  }, [unsavedMaskedAreas, activeFloorPlan]);

  // Load floorplan data
  useEffect(() => {
    dispatch(fetchFloorplan());
    // dispatch(fetchMaskedAreas());
  }, [dispatch]);

  // Get floorplan image URL
  const floorplanImage = activeFloorPlan?.floorplanImage
    ? activeFloorPlan.floorplanImage.startsWith('/Uploads/')
      ? `${BASE_URL}${activeFloorPlan.floorplanImage}`
      : activeFloorPlan.floorplanImage
    : FloorplanHouse;

  // Load image to get natural dimensions
  useEffect(() => {
    if (!floorplanImage) return;

    const img = new Image();
    img.src = floorplanImage;

    img.onload = () => {
      setNaturalSize({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };
  }, [floorplanImage]);

  // Container resize handler
  useEffect(() => {
    // const updateContainerSize = () => {
    if (containerRef.current) {
      setContainerSize({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      });
    }
    // };

    // updateContainerSize();
    // window.addEventListener('resize', updateContainerSize);
    // return () => window.removeEventListener('resize', updateContainerSize);
  }, [floorplanImage, containerRef]);

  // Global wheel event handler to prevent browser zoom when Ctrl is pressed
  useEffect(() => {
    const handleWheelGlobal = (e: WheelEvent) => {
      // Only prevent browser zoom when Ctrl is pressed
      if (e.ctrlKey) {
        e.preventDefault();
      }
    };

    // Use capture phase to intercept the event early
    document.addEventListener('wheel', handleWheelGlobal, {
      passive: false,
      capture: true,
    });

    return () => {
      document.removeEventListener('wheel', handleWheelGlobal, { capture: true });
    };
  }, []);

  // Also prevent default for Ctrl + and Ctrl -
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && (e.key === '+' || e.key === '-' || e.key === '=')) {
        e.preventDefault();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Simplified panning
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!zoomable) return;
      if (e.button !== 0) return; // Only left mouse button

      // Check if we're already dragging something in Konva
      if (isDragging || drawingMaskedArea) {
        return;
      }

      const container = containerRef.current;
      if (!container) return;

      // Get the Konva canvas element
      const canvas = container.querySelector('canvas');

      // Check if we clicked on empty canvas area (not on a shape)
      // Konva sets the cursor to 'grab' when not over a shape
      // We check the computed cursor style
      if (canvas) {
        const computedStyle = window.getComputedStyle(canvas);
        const canvasCursor = computedStyle.cursor;

        // If canvas cursor is not 'grab', it means we're over a shape
        if (canvasCursor !== 'grab' && canvasCursor !== 'default') {
          return; // Don't pan if we're over a shape
        }
      }

      // If we get here, we're either clicking on the container background
      // or on empty canvas area
      // container.style.cursor = 'grabbing';
      // setCursor('grabbing');
      setIsDraggingView(true);

      const startX = e.clientX;
      const startY = e.clientY;
      const startPosX = stagePos.x;
      const startPosY = stagePos.y;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const deltaY = moveEvent.clientY - startY;

        setStagePos({
          x: startPosX + deltaX,
          y: startPosY + deltaY,
        });
      };

      const handleMouseUp = () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        if (container && !drawingMaskedArea) {
          // container.style.cursor = 'grab';
          // setCursor('grab');
          setIsDraggingView(false);
        }
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);

      e.preventDefault();
    },
    [zoomable, isDragging, drawingMaskedArea, stagePos, cursor],
  );

  // Wheel zoom handler
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      // Always prevent default for Ctrl+wheel to stop browser zoom
      if (e.ctrlKey) {
        // e.preventDefault();
        e.stopPropagation();
      }

      if (!zoomable) return;
      if (!e.ctrlKey) return;

      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const delta = -e.deltaY * 0.0015;
      setStageScale((prev) => {
        const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev + delta));
        const scaleRatio = newScale / prev;
        setStagePos((pos) => {
          const newX = mouseX - scaleRatio * (mouseX - pos.x);
          const newY = mouseY - scaleRatio * (mouseY - pos.y);
          return { x: newX, y: newY };
        });
        return newScale;
      });
    },
    [zoomable],
  );

  // Apply zoom function for ZoomControls
  const applyZoom = useCallback((newScale: number) => {
    const container = containerRef.current;
    if (!container) {
      setStageScale(Math.min(MAX_SCALE, Math.max(MIN_SCALE, newScale)));
      return;
    }

    const centerX = container.clientWidth / 2;
    const centerY = container.clientHeight / 2;
    setStageScale((prev) => {
      const clamped = Math.min(MAX_SCALE, Math.max(MIN_SCALE, newScale));
      const ratio = clamped / prev;
      setStagePos((pos) => {
        const newX = centerX - ratio * (centerX - pos.x);
        const newY = centerY - ratio * (centerY - pos.y);
        return { x: newX, y: newY };
      });
      return clamped;
    });
  }, []);

  // Update cursor based on state
  // useEffect(() => {
  //   if (!zoomable) {
  //     setCursor('default');
  //   } else if (drawingMaskedArea) {
  //     setCursor('crosshair');
  //   } else if (isDragging) {
  //     setCursor('move');
  //   } else {
  //     setCursor('grab');
  //   }
  // }, [zoomable, drawingMaskedArea, isDragging]);

  if (!naturalSize.width || !naturalSize.height) {
    return <div>Loading floorplan...</div>;
  }

  return (
    <Box
      onMouseEnter={() => setIsHoveringView(true)}
      onMouseLeave={() => setIsHoveringView(false)}
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'visible',
        cursor: Cursor,
        // Add CSS to prevent browser zoom
        touchAction: 'none', // Prevent touch zoom
      }}
    >
      {/* Instruction Overlays */}
      {editingMaskedArea && !drawingMaskedArea && zoomable && (
        <Box
          sx={{
            position: 'fixed',
            top: 160,
            right: 40,
            zIndex: 10,
            width: '280px',
            background: 'rgba(124, 123, 123, 0.6)',
            borderRadius: 2,
            boxShadow: 2,
            p: 1,
            // display: 'flex',
          }}
        >
          <Box display="flex" alignItems="center" gap={1}>
            <Box>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: 'white',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mr: 1,
                  mb: 2,
                  ml: 4.25,
                }}
              >
                <img
                  src={MouseDoubleClickIcon}
                  alt="Double Click"
                  style={{ width: 36, height: 36 }}
                />
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    bgcolor: 'white',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mr: 1,
                  }}
                >
                  <img src={ShiftButtonIcon} alt="Shift Button" style={{ width: 36, height: 36 }} />
                </Box>
                <FormLabel
                  sx={{
                    color: 'white',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    paddingRight: 1,
                  }}
                >
                  +
                </FormLabel>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    bgcolor: 'white',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mr: 1,
                  }}
                >
                  <img
                    src={MouseLeftClickIcon}
                    alt="Left Click"
                    style={{ width: 36, height: 36 }}
                  />
                </Box>
              </Box>
            </Box>

            <FormLabel sx={{ color: 'white', fontSize: '0.875rem', fontWeight: 600 }}>
              Create new Node
            </FormLabel>
          </Box>
          <Box mt={5} mb={1} display="flex" alignItems="center" gap={1}>
            <Box
              sx={{
                width: 40,
                height: 40,
                bgcolor: 'white',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mr: 4.75,
                ml: 4.25,
              }}
            >
              <img src={MouseRightClickIcon} alt="Right Click" style={{ width: 36, height: 36 }} />
            </Box>
            <FormLabel sx={{ color: 'white', fontSize: '0.875rem', fontWeight: 600 }}>
              Delete Node
            </FormLabel>
          </Box>
        </Box>
      )}
      {!editingMaskedArea && !drawingMaskedArea && zoomable && (
        <Box
          sx={{
            position: 'fixed',
            top: 160,
            right: 40,
            zIndex: 10,
            width: '280px',
            background: 'rgba(124, 123, 123, 0.6)',
            borderRadius: 2,
            boxShadow: 2,
            p: 1,
            // display: 'flex',
          }}
        >
          <FormControlLabel
            control={
              <Switch
                checked={showDevices}
                onChange={() => setShowDevices((prev) => !prev)}
                color="primary"
              />
            }
            label="Show Devices"
          />
        </Box>
      )}

      {drawingMaskedArea && (
        <Box
          sx={{
            position: 'absolute',
            top: 12,
            right: 12,
            zIndex: 10,
            width: '280px',
            background: 'rgba(37, 31, 31, 0.77)',
            borderRadius: 2,
            boxShadow: 2,
            p: 1,
          }}
        >
          <Box mt={1} display="flex" alignItems="center" gap={1}>
            <Box
              sx={{
                width: 40,
                height: 40,
                // bgcolor: 'white',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mr: 4.75,
                ml: 2.25,
              }}
            >
              {/* <img src={MouseLeftClickIcon} alt="Left Click" style={{ width: 36, height: 36 }} /> */}
            </Box>
            <FormLabel sx={{ color: 'white', fontSize: '0.875rem', fontWeight: 600 }}>
              Create Point
            </FormLabel>
          </Box>
          <Box mt={1} display="flex" alignItems="center" gap={1}>
            <Box
              sx={{
                width: 40,
                height: 40,
                bgcolor: 'white',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mr: 4.75,
                ml: 2.25,
              }}
            >
              <img src={MouseLeftClickIcon} alt="Left Click" style={{ width: 36, height: 36 }} />
            </Box>
            <FormLabel sx={{ color: 'white', fontSize: '0.875rem', fontWeight: 600 }}>
              Create Point
            </FormLabel>
          </Box>
          <Box mt={5} mb={1} display="flex" alignItems="center" gap={1}>
            <Box
              sx={{
                width: 40,
                height: 40,
                bgcolor: 'white',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mr: 4.75,
                ml: 2.25,
              }}
            >
              <img src={MouseRightClickIcon} alt="Right Click" style={{ width: 36, height: 36 }} />
            </Box>
            <FormLabel sx={{ color: 'white', fontSize: '0.875rem', fontWeight: 600 }}>
              Cancel Add
            </FormLabel>
          </Box>
        </Box>
      )}

      {/* Zoom Controls */}
      {isHovered && zoomable && !isDragging && !drawingMaskedArea && (
        <ZoomControls
          scale={stageScale}
          setScale={setStageScale}
          applyZoom={applyZoom}
          minScale={MIN_SCALE}
          maxScale={MAX_SCALE}
        />
      )}

      {/* Container for Konva */}
      <Box
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onWheel={handleWheel}
        onKeyDown={(e) => {
          // Prevent browser zoom when Ctrl + or - is pressed
          if (e.ctrlKey && (e.key === '+' || e.key === '-' || e.key === '=')) {
            e.preventDefault();
          }
        }}
        sx={{
          width: '100%',
          maxWidth: '100vw',
          height: '100%',
          maxHeight: '90vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'hidden',
          position: 'relative',
          userSelect: 'none',
          outline: 'none',
        }}
        tabIndex={0}
      >
        <EditAreaRenderer
          width={containerSize.width}
          height={containerSize.height}
          originalWidth={naturalSize.width || 2048}
          originalHeight={naturalSize.height || 2048}
          imageSrc={floorplanImage}
          scale={activeFloorPlan?.meterPerPx || 1}
          maskedAreas={filteredUnsavedMaskedArea}
          activeMaskedArea={activeMaskedArea}
          devices={devices}
          showDevices={showDevices}
          setIsDragging={setIsDragging}
          // setCursor={setCursor}
          onAreaHoverChange={setIsHoveringAreaShape}
          onAreaDragChange={setIsDraggingView}
          onOnArea={setIsOnArea}
          preview={preview}
          stageScale={stageScale}
          stageX={stagePos.x}
          stageY={stagePos.y}
          stageRef={stageRef}
          // Pass the preventDefault function to Konva stage
          onWheel={(e: any) => {
            if (e.evt.ctrlKey) {
              e.evt.preventDefault();
            }
          }}
        />
      </Box>
    </Box>
  );
};

export default EditAreaFloorView;
