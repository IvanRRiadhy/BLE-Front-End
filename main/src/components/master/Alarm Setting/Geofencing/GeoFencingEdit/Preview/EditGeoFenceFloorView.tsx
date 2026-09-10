import { BASE_URL } from 'src/utils/axios';
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useSelector, RootState } from 'src/store/Store';
import { Box, Switch, FormControlLabel, FormLabel, Divider, Typography } from '@mui/material';
import ZoomControls from 'src/components/shared/ZoomControls';
import FloorplanHouse from 'src/assets/images/masters/Floorplan/Floorplan-House.png';
import {
  GeoFencingAlarmType,
} from 'src/store/apps/alarmsetting/geofencing';
import EditGeoFenceRenderer from './EditGeoFenceRenderer';
import MouseDoubleClickIcon from 'src/assets/images/svgs/mouse-double-click-icon.svg';
import MouseLeftClickIcon from 'src/assets/images/svgs/mouse-left-click-icon.svg';
import MouseRightClickIcon from 'src/assets/images/svgs/mouse-right-click-icon.svg';
import ShiftButtonIcon from 'src/assets/images/svgs/shift-button-icon.svg';
import { defaultGeoFencingFilter } from 'src/store/apps/defaultForm';
import { useAllFloorplans } from 'src/hooks/useFloorplan';
import { useAllMaskedAreas } from 'src/hooks/useMaskedArea';
import { useGeoFencingAlarms } from 'src/hooks/AlarmSetting/useGeofence';
import { useAllFloorplanDevices } from 'src/hooks/useFloorplanDevice';

const EditGeoFenceFloorView = () => {
  const geoFenceData = useSelector(
    (state: RootState) => state.GeoFencingReducer.selectedGeoFencingAlarm,
  );
  const { data: floorplans = [] } = useAllFloorplans();
  const { data: maskedAreas = [] } = useAllMaskedAreas();
  const { data: devices = [] } = useAllFloorplanDevices();
  const { data: geoFencingAlarmsData } = useGeoFencingAlarms({
    ...defaultGeoFencingFilter,
    filters: { FloorplanId: geoFenceData?.floorplanId },
  });

  const geoFencingAlarms = geoFencingAlarmsData?.data || [];
  const otherGeoFence = geoFencingAlarms.filter((alarm) => alarm.id !== geoFenceData?.id);
  const activeFloorPlan = floorplans.find((fp) => fp.id === geoFenceData?.floorplanId);
  const filteredArea = maskedAreas.filter((area) => area.floorplanId === activeFloorPlan?.id);
  const drawGeoFence = useSelector((state: RootState) => state.GeoFencingReducer.drawingGeoFence);
  const [showArea, setShowArea] = useState(true);

  const filteredDevices = devices.filter((device) => device.floorplanId === activeFloorPlan?.id);
  const [showDevices, setShowDevices] = useState(true);

  // Drag & cursor states
  const [isDraggingView, setIsDraggingView] = useState(false);
  const [isHoveringView, setIsHoveringView] = useState(false);
  const [isHoveringAreaShape, setIsHoveringAreaShape] = useState(false);
  const [isOnArea, setIsOnArea] = useState(false);
  const isDrawing = Boolean(drawGeoFence);

  const [isDragging, setIsDragging] = useState('');
  const [isHovered, setIsHovered] = useState(false);

  // Container and stage management
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<any>(null);
  const [containerSize, setContainerSize] = useState({ width: 1920, height: 960 });
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });

  // Stage transform state (Konva native zoom & pan)
  const [stageScale, setStageScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });

  const MIN_SCALE = 0.1;
  const MAX_SCALE = 4;

  const Cursor = useMemo(() => {
    if (isDrawing) return 'crosshair';
    if (isDraggingView) return 'grabbing';
    if (isHoveringAreaShape) return 'move';
    if (isOnArea && !isDraggingView && !isDrawing) return 'pointer';
    if (isHoveringView) return 'grab';
    return 'default';
  }, [isDrawing, isDraggingView, isHoveringAreaShape, isOnArea, isHoveringView]);

  // Floorplan image URL
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
    if (containerRef.current) {
      setContainerSize({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      });
    }
  }, [floorplanImage, containerRef]);

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

  // Prevent default for Ctrl + and Ctrl -
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

  // Panning with mouse drag on container
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return; // Only left mouse button

      if (isDragging || isDrawing) {
        return;
      }

      const container = containerRef.current;
      if (!container) return;

      const canvas = container.querySelector('canvas');
      if (canvas) {
        const computedStyle = window.getComputedStyle(canvas);
        const canvasCursor = computedStyle.cursor;
        if (canvasCursor !== 'grab' && canvasCursor !== 'default') {
          return;
        }
      }

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
        setIsDraggingView(false);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);

      e.preventDefault();
    },
    [isDragging, isDrawing, stagePos],
  );

  // Wheel zoom handler
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey) {
        e.stopPropagation();
      }

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
    [],
  );

  // Zoom controls apply zoom
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

  return (
    <Box
      onMouseEnter={() => {
        setIsHovered(true);
        setIsHoveringView(true);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsHoveringView(false);
      }}
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
        touchAction: 'none',
      }}
    >
      {/* Information Overlay */}
      <Box
        sx={{
          position: 'absolute',
          top: 12,
          right: 12,
          zIndex: 10,
          width: 260,
          backgroundColor: 'rgba(37, 31, 31, 0.65)',
          borderRadius: 2,
          boxShadow: 3,
          p: 2,
          color: 'white',
          fontSize: '0.875rem',
          fontWeight: 500,
        }}
      >
        {drawGeoFence ? (
          <>
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
                  mr: 2,
                }}
              >
                <img src={MouseLeftClickIcon} alt="Left Click" style={{ width: 28, height: 28 }} />
              </Box>
              <FormLabel sx={{ color: 'white', fontSize: '0.875rem', fontWeight: 600 }}>
                Add 3 Points to create a new Area
              </FormLabel>
            </Box>

            <Box mt={2} mb={2} display="flex" alignItems="center" gap={1}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: 'white',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mr: 2,
                }}
              >
                <img
                  src={MouseRightClickIcon}
                  alt="Right Click"
                  style={{ width: 28, height: 28 }}
                />
              </Box>
              <FormLabel sx={{ color: 'white', fontSize: '0.875rem', fontWeight: 600 }}>
                Cancel Add
              </FormLabel>
            </Box>

            <Divider sx={{ borderColor: 'rgba(255,255,255,0.2)', mb: 2 }} />
          </>
        ) : (
          <>
            {/* Create Node */}
            <Box display="flex" alignItems="center" mb={2}>
              <Box display="flex" alignItems="center" gap={1} mr={2}>
                <img src={MouseDoubleClickIcon} alt="Double Click" width={28} />
                <Typography variant="body2" fontWeight={600}>
                  or
                </Typography>
                <img src={ShiftButtonIcon} alt="Shift" width={28} />
                <Typography variant="body2" fontWeight={600}>
                  +
                </Typography>
                <img src={MouseLeftClickIcon} alt="Left Click" width={28} />
              </Box>
              <Typography variant="body2" fontWeight={600}>
                Create Node
              </Typography>
            </Box>

            {/* Delete Node */}
            <Box display="flex" alignItems="center" mb={2}>
              <img
                src={MouseRightClickIcon}
                alt="Right Click"
                width={28}
                style={{ marginRight: 12 }}
              />
              <Typography variant="body2" fontWeight={600}>
                Delete Node
              </Typography>
            </Box>
          </>
        )}

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.2)', mb: 2 }} />

        {/* Toggles */}
        <FormControlLabel
          control={
            <Switch
              checked={showArea}
              onChange={() => setShowArea((prev) => !prev)}
              color="primary"
            />
          }
          label="Show Areas"
          sx={{ color: 'white' }}
        />
        <FormControlLabel
          control={
            <Switch
              checked={showDevices}
              onChange={() => setShowDevices((prev) => !prev)}
              color="primary"
            />
          }
          label="Show Devices"
          sx={{ color: 'white' }}
        />
      </Box>

      {/* Zoom Controls */}
      {isHovered && !isDragging && !drawGeoFence && (
        <ZoomControls
          scale={stageScale}
          setScale={setStageScale}
          applyZoom={applyZoom}
          minScale={MIN_SCALE}
          maxScale={MAX_SCALE}
        />
      )}

      {/* Konva Stage Container */}
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
        <EditGeoFenceRenderer
          width={containerSize.width}
          height={containerSize.height}
          originalWidth={naturalSize.width || 2048}
          originalHeight={naturalSize.height || 2048}
          imageSrc={floorplanImage}
          scale={activeFloorPlan?.meterPerPx || 1}
          activeGeoFence={geoFenceData as GeoFencingAlarmType}
          otherGeoFences={otherGeoFence}
          areas={filteredArea}
          showAreas={showArea}
          devices={filteredDevices}
          showDevices={showDevices}
          stageScale={stageScale}
          stageX={stagePos.x}
          stageY={stagePos.y}
          stageRef={stageRef}
          setIsDragging={setIsDragging}
          onAreaHoverChange={setIsHoveringAreaShape}
          onAreaDragChange={setIsDraggingView}
          onOnArea={setIsOnArea}
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

export default EditGeoFenceFloorView;
