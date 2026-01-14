import { BASE_URL } from 'src/utils/axios';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { AppDispatch, useDispatch, useSelector, RootState } from 'src/store/Store';
import { Box, Switch, FormControlLabel } from '@mui/material';
import ZoomControls from 'src/components/shared/ZoomControls';
import EditDeviceRenderer from './EditDeviceRenderer';
import FloorplanHouse from 'src/assets/images/masters/Floorplan/Floorplan-House.png';
import { useAllMaskedAreas } from 'src/hooks/useMaskedArea';
import { fetchFloorplanDevices, FloorplanDeviceType } from 'src/store/apps/crud/floorplanDevice';

const EditDeviceFloorView: React.FC<{ zoomable: boolean }> = ({ zoomable }) => {
  const dispatch: AppDispatch = useDispatch();
  const activeFloorPlan = useSelector(
    (state: RootState) => state.floorplanReducer.selectedFloorplan,
  );
  const activeDevice = useSelector(
    (state: RootState) => state.floorplanDeviceReducer.selectedFloorplanDevice,
  );
  const unsavedDevices = useSelector(
    (state: RootState) => state.floorplanDeviceReducer.unsavedFloorplanDevices,
  );
  const editingDevice = useSelector(
    (state: RootState) => state.floorplanDeviceReducer.editingFloorplanDevice,
  );

  const { data: Areas = [] } = useAllMaskedAreas();
  const filteredArea = Areas.filter((area) => area.floorplanId === activeFloorPlan?.id);

  const [showArea, setShowArea] = useState(true);
  const [showEffectiveArea, setShowEffectiveArea] = useState(false);
  const [isDraggingDevice, setIsDraggingDevice] = useState(false);

  const [filteredUnsavedDevices, setFilteredUnsavedDevices] = useState<FloorplanDeviceType[]>([]);

  useEffect(() => {
    const filteredDevices = unsavedDevices.filter(
      (device: FloorplanDeviceType) => device.floorplanId === activeFloorPlan?.id,
    );
    setFilteredUnsavedDevices(filteredDevices);
  }, [unsavedDevices, activeFloorPlan]);

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

  // UI state
  const [cursor, setCursor] = useState('grab');
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

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
    const updateContainerSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    updateContainerSize();
    window.addEventListener('resize', updateContainerSize);
    return () => window.removeEventListener('resize', updateContainerSize);
  }, []);

  // Global wheel event handler to prevent browser zoom when Ctrl is pressed
  useEffect(() => {
    const handleWheelGlobal = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
      }
    };

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

  // Panning handler
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!zoomable) return;
      if (e.button !== 0) return; // Only left mouse button
      console.log('Mouse down for panning', isDraggingDevice, cursor, editingDevice);
      // Don't pan if we're dragging a device
      if (isDraggingDevice) {
        return;
      }

      // Only allow panning when cursor is 'grab' (not over any shape)
      if (cursor !== 'grab') {
        return;
      }

      const container = containerRef.current;
      if (!container) return;

      container.style.cursor = 'grabbing';
      setCursor('grabbing');
      setIsDragging(true);

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
        if (container) {
          container.style.cursor = 'grab';
          setCursor('grab');
        }
        setIsDragging(false);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);

      e.preventDefault();
    },
    [zoomable, isDraggingDevice, cursor, stagePos],
  );

  // Wheel zoom handler
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      // Always prevent default for Ctrl+wheel to stop browser zoom
      if (e.ctrlKey) {
        e.preventDefault();
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
  useEffect(() => {
    if (!zoomable) {
      setCursor('default');
    } else if (isDragging || isDraggingDevice) {
      setCursor('move');
    } else {
      setCursor('grab');
    }
  }, [zoomable, isDraggingDevice, isDragging]);

  if (!naturalSize.width || !naturalSize.height) {
    return <div>Loading floorplan...</div>;
  }

  return (
    <Box
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'visible',
        cursor: cursor,
        touchAction: 'none', // Prevent touch zoom
      }}
    >
      {/* Sticky Overlay Toggle */}
      <Box
        sx={{
          position: 'fixed',
          top: 160,
          right: 40,
          zIndex: 1000,
          width: '240px',
          background: 'rgba(124, 123, 123, 0.6)',
          borderRadius: 2,
          boxShadow: 2,
          p: 1,
          pointerEvents: 'auto',
        }}
      >
        <FormControlLabel
          control={
            <Switch checked={showArea} onChange={() => setShowArea((p) => !p)} color="primary" />
          }
          label="Show Areas"
        />
        <FormControlLabel
          control={
            <Switch
              checked={showEffectiveArea}
              onChange={() => setShowEffectiveArea((p) => !p)}
              color="primary"
            />
          }
          label="Show Effective Area"
        />
      </Box>

      {/* Zoom Controls */}
      {isHovered && zoomable && !isDragging && !isDraggingDevice && (
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
        <EditDeviceRenderer
          width={containerSize.width}
          height={containerSize.height}
          originalWidth={naturalSize.width || 2048}
          originalHeight={naturalSize.height || 2048}
          imageSrc={floorplanImage}
          scale={activeFloorPlan?.meterPerPx || 1}
          devices={filteredUnsavedDevices}
          activeDevice={activeDevice}
          setIsDragging={setIsDraggingDevice}
          areas={filteredArea}
          showAreas={showArea}
          showEffectiveArea={showEffectiveArea}
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
          setCursor={setCursor}
        />
      </Box>
      
    </Box>
  );
};

export default EditDeviceFloorView;
