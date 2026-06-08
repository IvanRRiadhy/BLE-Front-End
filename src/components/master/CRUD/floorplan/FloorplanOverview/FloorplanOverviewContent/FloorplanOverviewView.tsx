import { BASE_URL } from 'src/utils/axios';
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { AppDispatch, useDispatch, useSelector, RootState } from 'src/store/Store';
import { Box, FormControlLabel, FormLabel, Switch, CircularProgress, Typography } from '@mui/material';
import { fetchFloorplan } from 'src/store/apps/crud/floorplan';
import ZoomControls from 'src/components/shared/ZoomControls';
import FloorplanHouse from 'src/assets/images/masters/Floorplan/Floorplan-House.png';
import { fetchMaskedAreas, MaskedAreaType } from 'src/store/apps/crud/maskedArea';
import FloorplanOverviewRenderer from './FloorplanOverviewRenderer';
import MouseDoubleClickIcon from 'src/assets/images/svgs/mouse-double-click-icon.svg';
import MouseLeftClickIcon from 'src/assets/images/svgs/mouse-left-click-icon.svg';
import MouseRightClickIcon from 'src/assets/images/svgs/mouse-right-click-icon.svg';
import ShiftButtonIcon from 'src/assets/images/svgs/shift-button-icon.svg';
import { useFloorplanDeviceList } from 'src/hooks/useFloorplanDevice';
import { defaultFloorplanDeviceFilter } from 'src/store/apps/defaultForm';
import { useMaskedAreaList } from 'src/hooks/useMaskedArea';
import { usePatrolAreaList } from 'src/hooks/usePatrolArea';
import { useGeoFencingAlarms } from 'src/hooks/AlarmSetting/useGeofence';
import { useStayOnAreaAlarms } from 'src/hooks/AlarmSetting/useStayOnArea';
import { useOverPopulatingAlarms } from 'src/hooks/AlarmSetting/useOverPopulate';
import {  useBoundaryAlarms } from 'src/hooks/AlarmSetting/useBoundary';

import { SectionKey, VisibilityState } from 'src/views/master/crud/FloorplanOverviewTypes';
import jsPDF from 'jspdf';

const FloorplanOverviewView = React.forwardRef<
  any,
  {
    zoomable: boolean;
    visibility: Record<SectionKey, VisibilityState>;
    toggleSectionHide: (section: SectionKey) => void;
    isVisible: (section: SectionKey, id: string) => boolean;
    selectedItem: string | null;
  }
>(({ zoomable, visibility, toggleSectionHide, isVisible, selectedItem }, ref) => {
  const dispatch: AppDispatch = useDispatch();
  const activeFloorPlan = useSelector((state: RootState) => state.floorplanReducer.selectedFloorplan);

  const [isExporting, setIsExporting] = useState(false);

  // useImperativeHandle to expose export logic to parent
  React.useImperativeHandle(ref, () => ({
    exportCanvas: async (type: 'pdf' | 'png') => {
      const stage = stageRef.current;
      if (!stage) return;

      setIsExporting(true);

      try {
        // We want to export the entire floorplan area.
        // The floorplan image is at (0,0) in the renderer's coordinate space.
        // In the stage's coordinate space, it starts at stagePos and its size is naturalSize * stageScale.
        
        const dataURL = stage.getStage().toDataURL({
          x: stagePos.x,
          y: stagePos.y,
          width: naturalSize.width * stageScale,
          height: naturalSize.height * stageScale,
          pixelRatio: 2, // High quality
        });

        if (type === 'png') {
          const link = document.createElement('a');
          link.download = `${activeFloorPlan?.name || 'floorplan'}.png`;
          link.href = dataURL;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } else if (type === 'pdf') {
          // Use natural dimensions for PDF to avoid distortion
          const pdf = new jsPDF('l', 'px', [naturalSize.width, naturalSize.height]);
          pdf.addImage(dataURL, 'PNG', 0, 0, naturalSize.width, naturalSize.height);
          pdf.save(`${activeFloorPlan?.name || 'floorplan'}.pdf`);
        }
      } catch (err) {
        console.error('Export failed:', err);
      } finally {
        setIsExporting(false);
      }
    },
  }));

  const activeMaskedArea = useSelector((state: RootState) => state.maskedAreaReducer.selectedMaskedArea);
  const unsavedMaskedAreas = useSelector(
    (state: RootState) => state.maskedAreaReducer.unsavedMaskedAreas,
  );
  const editingMaskedArea = useSelector(
    (state: RootState) => state.maskedAreaReducer.editingMaskedArea,
  );
  const drawingMaskedArea = useSelector(
    (state: RootState) => state.maskedAreaReducer.drawingMaskedArea,
  );

  const { data: maskedAreasResponse } = useMaskedAreaList({
    ...defaultFloorplanDeviceFilter,
    Length: 999,
    filters: { FloorplanId: [activeFloorPlan?.id ?? ''], FloorId: [] },
  });
  const maskedAreas = useMemo(
    () => (maskedAreasResponse?.data || []).filter((item) => isVisible('areas', item.id)),
    [maskedAreasResponse, isVisible],
  );
  const showAreas = !visibility.areas.accordionHidden;

  const { data: devicesResponse } = useFloorplanDeviceList({
    ...defaultFloorplanDeviceFilter,
    Length: 999,
    filters: { FloorplanId: [activeFloorPlan?.id ?? ''] },
  });
  const devices = useMemo(
    () => (devicesResponse?.data || []).filter((item) => isVisible('devices', item.id)),
    [devicesResponse, isVisible],
  );
  // console.log("Devices", devices)
  const showDevices = !visibility.devices.accordionHidden;

  const { data: patrolAreasResponse } = usePatrolAreaList({
    ...defaultFloorplanDeviceFilter,
    Length: 999,
    filters: { FloorplanId: activeFloorPlan?.id ?? '', FloorId: '' },
  });
  const patrolAreas = useMemo(
    () => (patrolAreasResponse?.data || []).filter((item) => isVisible('patrol', item.id)),
    [patrolAreasResponse, isVisible],
  );
  const showPatrolAreas = !visibility.patrol.accordionHidden;

  const { data: geofenceAlarmsResponse } = useGeoFencingAlarms({
    ...defaultFloorplanDeviceFilter,
    Length: 999,
    filters: { FloorplanId: activeFloorPlan?.id ?? '' },
  });
  const geofenceAlarms = useMemo(
    () => (geofenceAlarmsResponse?.data || []).filter((item) => isVisible('geofence', item.id)),
    [geofenceAlarmsResponse, isVisible],
  );
  const showGeofenceAlarms = !visibility.geofence.accordionHidden;

  const { data: stayOnAreaAlarmsResponse } = useStayOnAreaAlarms({
    ...defaultFloorplanDeviceFilter,
    Length: 999,
    filters: { FloorplanId: activeFloorPlan?.id ?? '' },
  });
  const stayOnAreaAlarms = useMemo(
    () => (stayOnAreaAlarmsResponse?.data || []).filter((item) => isVisible('stay', item.id)),
    [stayOnAreaAlarmsResponse, isVisible],
  );
  const showStayOnAreaAlarms = !visibility.stay.accordionHidden;

  const { data: overpopulatingAlarmsResponse } = useOverPopulatingAlarms({
    ...defaultFloorplanDeviceFilter,
    Length: 999,
    filters: { FloorplanId: activeFloorPlan?.id ?? '' },
  });
  const overpopulatingAlarms = useMemo(
    () => (overpopulatingAlarmsResponse?.data || []).filter((item) => isVisible('over', item.id)),
    [overpopulatingAlarmsResponse, isVisible],
  );
  const showOverpopulatingAlarms = !visibility.over.accordionHidden;

  const { data: boundaryAlarmsResponse } = useBoundaryAlarms({
    ...defaultFloorplanDeviceFilter,
    Length: 999,
    filters: { FloorplanId: activeFloorPlan?.id ?? '' },
  });
  const boundaryAlarms = useMemo(
    () => (boundaryAlarmsResponse?.data || []).filter((item) => isVisible('boundary', item.id)),
    [boundaryAlarmsResponse, isVisible],
  );
  const showBoundaryAlarms = !visibility.boundary.accordionHidden;

  const [isDraggingView, setIsDraggingView] = useState(false);
  const [isHoveringView, setIsHoveringView] = useState(false);
  const [isHoveringAreaShape, setIsHoveringAreaShape] = useState(false);
  const [isOnArea, setIsOnArea] = useState(false);
  const isDrawingMaskedArea = drawingMaskedArea !== '';
  const [filteredUnsavedMaskedArea, setFilteredUnsavedMaskedArea] = useState<MaskedAreaType[]>([]);
  const [cursor, setCursor] = useState(drawingMaskedArea ? 'crosshair' : 'grab');
  const Cursor = useMemo(() => {
    if (isDrawingMaskedArea) return 'crosshair';
    if (isOnArea) return 'pointer';
    if (isDraggingView) return 'grabbing';
    if (isHoveringAreaShape) return 'move';
    if (isHoveringView) return 'grab';
    return 'default';
  }, [isDrawingMaskedArea, isDraggingView, isHoveringAreaShape, isHoveringView]);

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

  // Switch to enable/disable proxy easily
  const USE_IMAGE_PROXY = true;

  // Get floorplan image URL
  const originalFloorplanImage = activeFloorPlan?.floorplanImage
    ? activeFloorPlan.floorplanImage.startsWith('/Uploads/')
      ? `${BASE_URL}${activeFloorPlan.floorplanImage}`
      : activeFloorPlan.floorplanImage
    : FloorplanHouse;

  const floorplanImage = USE_IMAGE_PROXY && originalFloorplanImage !== FloorplanHouse
    ? `/api/proxy-image?url=${encodeURIComponent(originalFloorplanImage)}`
    : originalFloorplanImage;

  const [image, setImage] = useState<HTMLImageElement | null>(null);

  // Load image to get natural dimensions
  useEffect(() => {
    if (!floorplanImage) return;

    const img = new Image();
    // No crossOrigin needed when using same-origin proxy
    img.src = floorplanImage;

    img.onload = () => {
      setImage(img);
      setNaturalSize({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };
    
    img.onerror = () => {
      console.error('Failed to load image:', floorplanImage);
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

      {/* Loading overlay during export */}
      {isExporting && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            bgcolor: 'rgba(255, 255, 255, 0.7)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <CircularProgress />
          <Typography mt={2}>Preparing export...</Typography>
        </Box>
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
        {image && (
          <FloorplanOverviewRenderer
            width={containerSize.width}
            height={containerSize.height}
            originalWidth={naturalSize.width || 2048}
            originalHeight={naturalSize.height || 2048}
            imageSrc={image}
            meterPx={activeFloorPlan?.meterPerPx || 1}
            areas={maskedAreas}
            devices={devices}
            showGates={showDevices}
            showAreas={showAreas}
            showGeoFence={showGeofenceAlarms}
            showOverPopulate={showOverpopulatingAlarms}
            showStayOnArea={showStayOnAreaAlarms}
            showBoundary={showBoundaryAlarms}
            showPatrolAreas={showPatrolAreas}
            GeoFenceAlarm={geofenceAlarms}
            OverPopulateAlarm={overpopulatingAlarms}
            StayOnAreaAlarm={stayOnAreaAlarms}
            BoundaryAlarm={boundaryAlarms}
            PatrolAreas={patrolAreas}
            stageScale={stageScale}
            stageX={stagePos.x}
            stageY={stagePos.y}
            stageRef={stageRef}
            selectedItem={selectedItem}
            // Pass the preventDefault function to Konva stage
            onWheel={(e: any) => {
              if (e.evt.ctrlKey) {
                e.evt.preventDefault();
              }
            }}
          />
        )}
      </Box>
    </Box>
  );
});

export default FloorplanOverviewView;
