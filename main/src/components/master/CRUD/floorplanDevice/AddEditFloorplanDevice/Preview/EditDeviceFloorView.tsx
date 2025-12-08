import { BASE_URL } from 'src/utils/axios';
import React, { useEffect, useRef, useState, useMemo } from 'react';
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

  // container ref, stage ref
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<any>(null);

  // Image handling: preview + full image are loaded in child; we still need original image size props.
  // We'll compute container dimensions and pass width/height to renderer
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const resize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // Stage transform state (we handle pan/zoom inside Stage)
  const [stageScale, setStageScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });

  // We'll compute an initial scale to fit the image to container. Use activeFloorPlan.meterPerPx as fallback.
  // The renderer uses bgImage natural size; we can't read that here, but we can set minScale = 0.5 default
  const MIN_SCALE = 0.5;
  const MAX_SCALE = 4;

  // Zoom controls
  const [isHovered, setIsHovered] = useState(false);

  // Handle wheel: zoom around mouse position
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (ev: WheelEvent) => {
      if (!zoomable) return;
      // Only when ctrlKey is pressed (your previous behaviour)
      if (!ev.ctrlKey) return;
      ev.preventDefault();

      const rect = container.getBoundingClientRect();
      const mouseX = ev.clientX - rect.left;
      const mouseY = ev.clientY - rect.top;

      const delta = -ev.deltaY * 0.0015; // sensitivity
      setStageScale((prev) => {
        const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev + delta));
        // adjust stagePos so zoom centers on mouse
        const scaleRatio = newScale / prev;
        setStagePos((pos) => {
          // translate to keep focus
          const newX = mouseX - scaleRatio * (mouseX - pos.x);
          const newY = mouseY - scaleRatio * (mouseY - pos.y);
          return { x: newX, y: newY };
        });
        return newScale;
      });
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [zoomable]);

  // Mouse pan handling
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onDown = (ev: MouseEvent) => {
      if (ev.button !== 0) return;
      if (isDraggingDevice) return; // This is correct and will always be up-to-date.

      isPanning.current = true;
      panStart.current = { x: ev.clientX - stagePos.x, y: ev.clientY - stagePos.y };
      container.style.cursor = 'grabbing';
    };

    const onMove = (ev: MouseEvent) => {
      if (!isPanning.current) return;
      setStagePos({
        x: ev.clientX - panStart.current.x,
        y: ev.clientY - panStart.current.y,
      });
    };

    const onUp = () => {
      isPanning.current = false;
      if (container) container.style.cursor = 'grab';
    };

    container.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);

    return () => {
      container.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [stagePos, isDraggingDevice]); // ONLY depend on isDraggingDevice

  // expose applyZoom for ZoomControls
  const applyZoom = (newScale: number) => {
    const container = containerRef.current;
    if (!container) {
      setStageScale(Math.min(MAX_SCALE, Math.max(MIN_SCALE, newScale)));
      return;
    }
    // center zoom to middle of container
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
  };

  // If you want to auto-center image on load, you can call this when bgImage natural size is known.
  // However the renderer loads the image and renders at natural size, so we will not set initial stagePos here.

  const floorplanImage = activeFloorPlan?.floorplanImage
    ? activeFloorPlan.floorplanImage.startsWith('/Uploads/')
      ? `${BASE_URL}${activeFloorPlan.floorplanImage}`
      : activeFloorPlan.floorplanImage
    : FloorplanHouse;

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
        overflow: 'hidden',
        cursor: isPanning.current ? 'grabbing' : 'grab',
      }}
    >
      {/* Sticky Overlay Toggle */}
      <Box
        sx={{
          position: 'absolute',
          top: 12,
          right: 12,
          zIndex: 10,
          width: '240px',
          background: 'rgba(255,255,255,0.9)',
          borderRadius: 2,
          boxShadow: 2,
          p: 1,
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
      {isHovered && zoomable && (
        <ZoomControls
          scale={stageScale}
          setScale={setStageScale}
          applyZoom={applyZoom}
          minScale={0.5}
          maxScale={4}
        />
      )}

      {/* Container for Konva */}
      <Box
        ref={containerRef}
        sx={{
          width: '100%',
          maxWidth: '100vw',
          height: '100%',
          maxHeight: 'calc(100vh - 200px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'hidden',
          position: 'relative',
        }}
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
          setIsDragging={(id) => setIsDraggingDevice(Boolean(id))}
          areas={filteredArea}
          showAreas={showArea}
          showEffectiveArea={showEffectiveArea}
          stageScale={stageScale}
          stageX={stagePos.x}
          stageY={stagePos.y}
          stageRef={stageRef}
        />
      </Box>
    </Box>
  );
};

export default EditDeviceFloorView;
