import { BASE_URL } from 'src/utils/axios';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppDispatch, useDispatch, useSelector, RootState } from 'src/store/Store';
import {
  Box,
  Button,
  Dialog,
  FormControlLabel,
  Grid2 as Grid,
  Switch,
  Typography,
} from '@mui/material';
import ZoomControls from 'src/components/shared/ZoomControls';
import DeviceRenderer from './Renderer/DeviceRenderer';
import { floorType, fetchFloors } from 'src/store/apps/crud/floor';
import { FloorplanType, fetchFloorplan } from 'src/store/apps/crud/floorplan';
import { fetchFloorplanDevices, FloorplanDeviceType } from 'src/store/apps/crud/floorplanDevice';
import { fetchMaskedAreas, MaskedAreaType } from 'src/store/apps/crud/maskedArea';
import {
  cleanupAllBeacons,
  RefreshTrigger,
  SetSelectedBeacon,
} from 'src/store/apps/tracking/Beacon';
import axiosServices from 'src/utils/axios';
import { AlarmType } from 'src/store/apps/tracking/Alarm';
import { fetchMembers, memberType } from 'src/store/apps/crud/member';
import { fetchVisitor, VisitorType } from 'src/store/apps/crud/visitor';
import BeaconDetailPopup from './Popup/BeaconDetailPopup';
import TrackingDetailPopup from './Popup/TrackingDetailPopup';
import { setScreenDisplay, setScreenSettings, swapScreen } from 'src/store/apps/monitoring/layout';
import {
  fetchGeoFencingAlarmsAll,
  GeoFencingAlarmType,
} from 'src/store/apps/alarmsetting/geofencing';
import { useAllMembers } from 'src/hooks/useMember';
import { useAllVisitor } from 'src/hooks/useVisitor';
import { useAllFloors } from 'src/hooks/useFloor';
import { useAllFloorplans } from 'src/hooks/useFloorplan';
import { useAllMaskedAreas } from 'src/hooks/useMaskedArea';
import { useGeoFencingAlarmsAll } from 'src/hooks/AlarmSetting/useGeofence';
import { useOverPopulatingAlarmsAll } from 'src/hooks/AlarmSetting/useOverPopulate';
import { OverPopulatingAlarmType } from 'src/store/apps/alarmsetting/overpopulating';
import { useStayOnAreaAlarmsAll } from 'src/hooks/AlarmSetting/useStayOnArea';
import { StayOnAreaAlarmType } from 'src/store/apps/alarmsetting/stayonarea';
import { useBoundaryAlarmsAll } from 'src/hooks/AlarmSetting/useBoundary';
import { BoundaryAlarmType } from 'src/store/apps/alarmsetting/boundary';
import { getConfig } from 'src/config';
import { useAllFloorplanDevices } from 'src/hooks/useFloorplanDevice';

const MQTT_URL = getConfig().MQTT_URL;

const FOLLOW_SCALE = 1.5; // tweak as needed

const FloorView: React.FC<{
  activeFloorplan: string;
  zoomable: boolean;
  containerWidth: number;
  containerHeight: number;
  activeMaskedArea?: string;
  focusBeacon?: string;
  gridNumber: number;
  screenNumber: number;
  screenId: string;
  screenSettings: { scale: number; translateX: number; translateY: number };
}> = ({
  activeFloorplan,
  activeMaskedArea,
  zoomable,
  screenSettings,
  focusBeacon,
  gridNumber,
  screenNumber,
  screenId,
}) => {
  const dispatch: AppDispatch = useDispatch();

  // DUMMY
  const [dummyAlarm, setDummyAlarm] = useState<AlarmType>();
  const { data: memberList = [] } = useAllMembers();
  const { data: visitorList = [] } = useAllVisitor();
  const [open, setOpen] = useState(false);
  const activeLayoutId = useSelector((state: RootState) => state.layoutReducer.activeLayoutId);

  const layouts = useSelector((state: RootState) => state.layoutReducer.layouts ?? []);
  const activeLayout = layouts.find((l) => l.id === activeLayoutId);
  const activeScreen = activeLayout?.screens.find((s) => s.floorplanId === activeFloorplan);
  const isFollowing = activeScreen?.display?.displayType === 3;

  const containerRef = useRef<HTMLDivElement>(null);
  const { data: floor = [] } = useAllFloors();
  const { data: floorplans = [] } = useAllFloorplans();
  const actFloorplan = floorplans.find(
    (floorplan: FloorplanType) => floorplan.id === activeFloorplan,
  );

  const { data: Areas = [] } = useAllMaskedAreas();
  const filteredArea = Areas.filter((area) => area.floorplanId === activeFloorplan);

  const { data: GeoFenceArea = [] } = useGeoFencingAlarmsAll();
  const filteredGeoFenceArea: GeoFencingAlarmType[] = GeoFenceArea.filter(
    (area) => area.floorplanId === activeFloorplan,
  );

  const { data: OverPopulate = [] } = useOverPopulatingAlarmsAll();
  const filteredOverPopulateArea: OverPopulatingAlarmType[] = OverPopulate.filter(
    (area) => area.floorplanId === activeFloorplan,
  );

  const { data: StayOnArea = [] } = useStayOnAreaAlarmsAll();
  const filteredStayOnArea: StayOnAreaAlarmType[] = StayOnArea.filter(
    (area) => area.floorplanId === activeFloorplan,
  );

  const { data: Boundary = [] } = useBoundaryAlarmsAll();
  const filteredBoundaryArea: BoundaryAlarmType[] = Boundary.filter(
    (area) => area.floorplanId === activeFloorplan,
  );

  const [showArea, setShowArea] = useState(true);
  const [showGates, setShowGates] = useState(true);
  const [showGeoFence, setShowGeoFence] = useState(false);
  const [showOverPopulate, setShowOverPopulate] = useState(false);
  const [showStayOnArea, setShowStayOnArea] = useState(false);
  const [showBoundary, setShowBoundary] = useState(false);
  const [showOtherBeacons, setShowOtherBeacons] = useState(true);

  const [focusArea, setFocusArea] = useState<{
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    centerX: number;
    centerY: number;
  } | null>(null);

  // Container and natural size management
  const [containerSize, setContainerSize] = useState({ width: 1920, height: 960 });
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  // Transform state - EXACTLY like EditDeviceFloorView
  const [scale, setScale] = useState(screenSettings.scale || 1);
  const MAX_SCALE = 4;
  const MIN_SCALE = 0.1;
  const [translate, setTranslate] = useState({
    x: screenSettings.translateX || 0,
    y: screenSettings.translateY || 0,
  });

  // Interaction state - EXACTLY like EditDeviceFloorView
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [cursor, setCursor] = useState('grab');

  // New state for manual dragging in following mode
  const [isUserDragging, setIsUserDragging] = useState(false);
  const lastBeaconPosition = useRef<{x: number, y: number} | null>(null);
  const isManualDragRef = useRef(false);

  const floorplanImage = actFloorplan?.floorplanImage
    ? actFloorplan.floorplanImage.startsWith('/Uploads/')
      ? `${BASE_URL}${actFloorplan.floorplanImage}`
      : actFloorplan.floorplanImage
    : 'No Active Floorplan';

  const { data: Devices = [] } = useAllFloorplanDevices();
  const filteredDevices: FloorplanDeviceType[] = Devices.filter(
    (area) => area.floorplanId === activeFloorplan,
  );

  // Popup State
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [openTrackDetail, setOpenTrackDetail] = useState(false);
  const selectedBeacon = useSelector((state: RootState) => state.BeaconReducer.selectedBeacon);

  const handleSelectBeacon = (info: {
    id: string;
    area: string;
    floorplan: string;
    time: string;
  }) => {
    dispatch(SetSelectedBeacon({ active: true, sourceScreenId: screenNumber, ...info }));
  };

  useEffect(() => {
    if (selectedBeacon.active && selectedBeacon.sourceScreenId === screenNumber) {
      setDetailDialogOpen(true);
    }
  }, [selectedBeacon, screenNumber]);

  // Load image to get natural dimensions
  useEffect(() => {
    if (!floorplanImage || floorplanImage === 'No Active Floorplan') return;

    const img = new Image();
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

  // Container resize handler - EXACTLY like EditDeviceFloorView
  useEffect(() => {
    const updateContainerSize = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        setContainerSize({
          width: clientWidth || 1920,
          height: clientHeight || 960,
        });
      }
    };

    updateContainerSize();
    window.addEventListener('resize', updateContainerSize);
    return () => window.removeEventListener('resize', updateContainerSize);
  }, []);

  // Global wheel event handler to prevent browser zoom when Ctrl is pressed - EXACTLY like EditDeviceFloorView
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

  // Also prevent default for Ctrl + and Ctrl - - EXACTLY like EditDeviceFloorView
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

  // Animate to screen settings
  useEffect(() => {
    if (!screenSettings) return;

    const duration = 200;
    const startTime = performance.now();

    const startScale = scale;
    const startX = translate.x;
    const startY = translate.y;

    const animate = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setScale(startScale + (screenSettings.scale - startScale) * ease);
      setTranslate({
        x: startX + (screenSettings.translateX - startX) * ease,
        y: startY + (screenSettings.translateY - startY) * ease,
      });
      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }, [screenSettings.scale, screenSettings.translateX, screenSettings.translateY]);

  // Save screen settings to Redux
  const lastSent = useRef<{ scale: number; x: number; y: number } | null>(null);

  useEffect(() => {
    if (!activeLayoutId || !activeFloorplan) return;

    const activeLayout = layouts.find((l) => l.id === activeLayoutId);
    if (!activeLayout) return;

    const screen = activeLayout.screens.find((s) => s.floorplanId === activeFloorplan);
    if (!screen) return;

    const current = { scale, x: translate.x, y: translate.y };

    if (
      lastSent.current &&
      lastSent.current.scale === current.scale &&
      lastSent.current.x === current.x &&
      lastSent.current.y === current.y
    ) {
      return;
    }

    lastSent.current = current;

    const timeout = setTimeout(() => {
      dispatch(
        setScreenSettings({
          layoutId: activeLayout.id,
          screenId: screen.id,
          settings: {
            scale: current.scale,
            translateX: current.x,
            translateY: current.y,
          },
        }),
      );
    }, 150);

    return () => clearTimeout(timeout);
  }, [scale, translate.x, translate.y, activeLayoutId, activeFloorplan, layouts]);

  useEffect(() => {
    // Reset beacons when floorplan changes
    dispatch(cleanupAllBeacons());
  }, [activeFloorplan, dispatch]);

  // Also update the topic construction
  const topic = `tracking/${activeFloorplan.toUpperCase()}`;

  // Panning handler - Modified for following mode
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!zoomable) return;
      if (e.button !== 0) return; // Only left mouse button

      // Don't pan if we're already dragging something
      if (isDragging) {
        return;
      }

      // Only allow panning when cursor is 'grab' (not over any shape)
      if (cursor !== 'grab') {
        return;
      }

      // Set manual dragging flag when user starts dragging in following mode
      if (isFollowing) {
        isManualDragRef.current = true;
        setIsUserDragging(true);
      }

      const container = containerRef.current;
      if (!container) return;

      container.style.cursor = 'grabbing';
      setCursor('grabbing');
      setIsDragging(true);

      const startX = e.clientX;
      const startY = e.clientY;
      const startPosX = translate.x;
      const startPosY = translate.y;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const deltaY = moveEvent.clientY - startY;

        setTranslate({
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
        
        // When mouse is released in following mode, reset manual dragging flag
        if (isFollowing) {
          isManualDragRef.current = false;
          setIsUserDragging(false);
          
          // If we have a last known beacon position, snap back to it
          if (lastBeaconPosition.current) {
            setTimeout(() => {
              handleFocusPosition(lastBeaconPosition.current!);
            }, 100);
          }
        }
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);

      e.preventDefault();
    },
    [zoomable, isDragging, cursor, translate, isFollowing],
  );

  // Wheel zoom handler - EXACTLY like EditDeviceFloorView
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
      setScale((prev) => {
        const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev + delta));
        const scaleRatio = newScale / prev;
        setTranslate((pos) => {
          const newX = mouseX - scaleRatio * (mouseX - pos.x);
          const newY = mouseY - scaleRatio * (mouseY - pos.y);
          return { x: newX, y: newY };
        });
        return newScale;
      });
    },
    [zoomable],
  );

  // Apply zoom function for ZoomControls - EXACTLY like EditDeviceFloorView
  const applyZoom = useCallback((newScale: number) => {
    const container = containerRef.current;
    if (!container) {
      setScale(Math.min(MAX_SCALE, Math.max(MIN_SCALE, newScale)));
      return;
    }

    const centerX = container.clientWidth / 2;
    const centerY = container.clientHeight / 2;
    setScale((prev) => {
      const clamped = Math.min(MAX_SCALE, Math.max(MIN_SCALE, newScale));
      const ratio = clamped / prev;
      setTranslate((pos) => {
        const newX = centerX - ratio * (centerX - pos.x);
        const newY = centerY - ratio * (centerY - pos.y);
        return { x: newX, y: newY };
      });
      return clamped;
    });
  }, []);

  // Update cursor based on state - EXACTLY like EditDeviceFloorView
  useEffect(() => {
    if (!zoomable) {
      setCursor('default');
    } else if (isDragging) {
      setCursor('move');
    } else {
      setCursor('grab');
    }
  }, [zoomable, isDragging]);

  // Focus area handling
  useEffect(() => {
    if (!activeMaskedArea) {
      setFocusArea(null);
      return;
    }

    const targetArea = filteredArea.find((a) => a.id === activeMaskedArea);
    if (!targetArea || !targetArea.areaShape) return;

    try {
      const shape: { x_px: number; y_px: number }[] = JSON.parse(targetArea.areaShape);
      if (!shape.length) return;

      const xList = shape.map((p) => p.x_px);
      const yList = shape.map((p) => p.y_px);

      const minX = Math.min(...xList);
      const maxX = Math.max(...xList);
      const minY = Math.min(...yList);
      const maxY = Math.max(...yList);
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;

      const newFocus = { minX, maxX, minY, maxY, centerX, centerY };

      const isSame =
        focusArea &&
        focusArea.minX === newFocus.minX &&
        focusArea.maxX === newFocus.maxX &&
        focusArea.minY === newFocus.minY &&
        focusArea.maxY === newFocus.maxY &&
        focusArea.centerX === newFocus.centerX &&
        focusArea.centerY === newFocus.centerY;

      if (!isSame) setFocusArea(newFocus);
    } catch (err) {
      console.error('Invalid areaShape JSON:', targetArea.areaShape);
    }
  }, [activeMaskedArea, filteredArea, focusArea]);

  // Focus beacon handling
  const beaconsByTopic = useSelector((s: RootState) => s.BeaconReducer.beaconsByTopic);
  const lastSwitchedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!focusBeacon || !gridNumber || !screenNumber) return;

    let transition: { from?: string; to?: string } | null = null;
    for (const arr of Object.values(beaconsByTopic)) {
      const hit = Array.isArray(arr)
        ? arr.find((b) => b.beaconId === focusBeacon && b.fromFloorplanId && b.toFloorplanId)
        : undefined;
      if (hit) {
        transition = { from: hit.fromFloorplanId, to: hit.toFloorplanId };
        break;
      }
    }

    if (
      transition?.to &&
      transition.to !== activeFloorplan &&
      lastSwitchedRef.current !== transition.to
    ) {
      lastSwitchedRef.current = transition.to;
    }
  }, [focusBeacon, beaconsByTopic, activeFloorplan, gridNumber, screenNumber, dispatch]);

  // Follow camera hook - Modified to respect manual dragging
  const handleFocusPosition = useCallback((pt: { x: number; y: number }) => {
    if (!containerRef.current) return;
    
    // Store the last beacon position
    lastBeaconPosition.current = pt;
    
    // If user is manually dragging in following mode, don't update the view
    if (isFollowing && isManualDragRef.current) {
      return;
    }

    const nextScale = FOLLOW_SCALE;
    const cw = containerRef.current.clientWidth;
    const ch = containerRef.current.clientHeight;

    // Convert the point from original image coordinates to container coordinates
    const nextTranslateX = cw / 2 - pt.x * nextScale;
    const nextTranslateY = ch / 2 - pt.y * nextScale;
    
    setScale(nextScale);
    setTranslate({ x: nextTranslateX, y: nextTranslateY });
  }, [isFollowing]);

  // Reset manual dragging when following mode changes
  useEffect(() => {
    if (!isFollowing) {
      isManualDragRef.current = false;
      setIsUserDragging(false);
    }
  }, [isFollowing]);

  useEffect(() => {
    if (!focusBeacon || !gridNumber || !screenNumber) return;

    let to: string | null = null;
    for (const arr of Object.values(beaconsByTopic)) {
      const hit = Array.isArray(arr)
        ? arr.find((b: any) => {
            const sameBeacon =
              (b.beaconId && b.beaconId.toLowerCase() === String(focusBeacon).toLowerCase()) ||
              (b.cardNumber && String(b.cardNumber) === String(focusBeacon));
            const explicitTo = b.toFloorplanId ?? b.toFlooplanId ?? null;
            if (explicitTo) {
              to = explicitTo;
              return true;
            }
            if (b.TransM && typeof b.TransM === 'string') {
              const m = b.TransM.match(/to floorplan\s+([0-9A-Fa-f-]{36})/);
              if (m) {
                to = m[1];
                return true;
              }
            }
            return false;
          })
        : undefined;
      if (hit) break;
    }

    if (to && to !== activeFloorplan && lastSwitchedRef.current !== to) {
      lastSwitchedRef.current = to;
    }
  }, [focusBeacon, beaconsByTopic, activeFloorplan, gridNumber, screenNumber, dispatch]);

  // Cancel following
  const layoutState = useSelector((state: RootState) => state.layoutReducer);
  const activeLayouts = layoutState.layouts.find((l) => l.id === layoutState.activeLayoutId);

  const handleCancelFollowing = () => {
    if (!activeLayouts?.id || !screenNumber) {
      console.warn('No active layout or screen found for cancel follow.');
      return;
    }

    // Publish "Stop" to MQTT
    if (selectedBeacon?.id) {
      const topic = `highlight/card/${selectedBeacon.id}`;
      const payload = JSON.stringify({ message: 'Stop' });

      import('mqtt').then(({ connect }) => {
        const client = connect(`${MQTT_URL}`, {
          clientId: `Klien1-${Math.random().toString(16).substr(2, 8)}`,
          username: 'bio_mqtt',
          password: 'P@ssw0rd',
        });

        client.on('connect', () => {
          client.publish(topic, payload, { qos: 0, retain: false }, () => {
            console.log('✅ Published STOP to', topic);
            client.end();
          });
        });
      });
    }

    // Reset this screen's display back to default
    const screen = activeLayouts.screens[screenNumber - 1];
    if (!screen) {
      console.warn('Screen not found for screenNumber:', screenNumber);
      return;
    }

    dispatch(
      setScreenDisplay({
        layoutId: activeLayouts.id,
        screenId: screen.id,
        display: {
          displayType: 0,
          displayOutput: '',
        },
      }),
    );

    console.log(`🧭 Screen ${screen.id} reset to default floorplan mode`);
  };

  // Helper functions
  const getName = (bleNumber: string) => {
    return (
      memberList?.find((member: memberType) => member.bleCardNumber === bleNumber)?.name ??
      visitorList?.find((visitor: VisitorType) => visitor.bleCardNumber === bleNumber)?.name ??
      'Unknown Person'
    );
  };

  const handleClose = () => {
    setOpen(false);
    setDummyAlarm(undefined);
  };

  const handleParentClick = () => {
    if (!zoomable) {
      dispatch(swapScreen(screenNumber));
    }
  };

  if (floorplanImage === 'No Active Floorplan') {
    return (
      <Grid
        container
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        <Grid size={{ xs: 12 }}>
          <Typography variant="h4" fontStyle="bold" fontWeight={900} mt={0.5}>
            Monitoring Dashboard
          </Typography>
          <Typography variant="h6" fontStyle="bold" fontWeight={900} mt={0.5}>
            Please select a Grid
          </Typography>
        </Grid>
      </Grid>
    );
  }

  // Show loading while natural dimensions are not loaded - EXACTLY like EditDeviceFloorView
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
        // Add CSS to prevent browser zoom
        touchAction: 'none', // Prevent touch zoom
      }}
    >
      {/* Sticky Overlay Toggle */}
      {isHovered && !isDragging && zoomable && (
        <Box
          sx={{
            position: 'absolute',
            top: 12,
            right: 12,
            zIndex: 10,
            width: 'fit-content',
            background: 'rgba(255,255,255,0.9)',
            borderRadius: 2,
            boxShadow: 2,
            p: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
          }}
        >
          <FormControlLabel
            control={
              <Switch
                checked={showArea}
                onChange={() => setShowArea((prev) => !prev)}
                color="primary"
              />
            }
            label="Show Areas"
          />
          <FormControlLabel
            control={
              <Switch
                checked={showGates}
                onChange={() => setShowGates((prev) => !prev)}
                color="primary"
              />
            }
            label="Show Gateways"
          />
          <FormControlLabel
            control={
              <Switch
                checked={showGeoFence}
                onChange={() => setShowGeoFence((prev) => !prev)}
                color="primary"
              />
            }
            label="Show GeoFence Areas"
          />
          <FormControlLabel
            control={
              <Switch
                checked={showOverPopulate}
                onChange={() => setShowOverPopulate((prev) => !prev)}
                color="primary"
              />
            }
            label="Show Over Population Areas"
          />
          <FormControlLabel
            control={
              <Switch
                checked={showStayOnArea}
                onChange={() => setShowStayOnArea((prev) => !prev)}
                color="primary"
              />
            }
            label="Show Stay on Areas"
          />
          <FormControlLabel
            control={
              <Switch
                checked={showBoundary}
                onChange={() => setShowBoundary((prev) => !prev)}
                color="primary"
              />
            }
            label="Show Boundary Areas"
          />
          {Boolean(focusBeacon) && isFollowing && (
            <>
              <FormControlLabel
                control={
                  <Switch
                    checked={showOtherBeacons}
                    onChange={() => setShowOtherBeacons((prev) => !prev)}
                    color="primary"
                  />
                }
                label="Show Other People"
              />
              <Button variant="contained" color="error" onClick={handleCancelFollowing}>
                Cancel Following
              </Button>
            </>
          )}
        </Box>
      )}

      {/* Zoom Controls - EXACTLY like EditDeviceFloorView */}
      {isHovered && zoomable && !isDragging && (
        <ZoomControls
          scale={scale}
          setScale={setScale}
          applyZoom={applyZoom}
          minScale={MIN_SCALE}
          maxScale={MAX_SCALE}
        />
      )}

      {/* Container for Konva - EXACTLY like EditDeviceFloorView */}
      <Box
        onDoubleClick={handleParentClick}
        sx={{ width: '100%', height: '100%', overflow: 'hidden', position: 'relative' }}
      >
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
            maxHeight: 'calc(100vh - 200px)',
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
          {image && containerSize.width > 0 && containerSize.height > 0 ? (
            <DeviceRenderer
              width={containerSize.width}
              height={containerSize.height}
              originalWidth={naturalSize.width}
              originalHeight={naturalSize.height}
              meterPx={actFloorplan?.meterPerPx ?? 1}
              devices={filteredDevices}
              imageSrc={image}
              areas={filteredArea}
              GeoFenceAlarm={filteredGeoFenceArea}
              OverPopulateAlarm={filteredOverPopulateArea}
              StayOnAreaAlarm={filteredStayOnArea}
              BoundaryAlarm={filteredBoundaryArea}
              showAreas={zoomable && showArea}
              showGates={zoomable && showGates}
              showGeoFence={zoomable && showGeoFence}
              showOverPopulate={zoomable && showOverPopulate}
              showStayOnArea={zoomable && showStayOnArea}
              showBoundary={zoomable && showBoundary}
              showBeacons={zoomable}
              topic={topic}
              onSelectBeacon={handleSelectBeacon}
              detailDialogOpen={detailDialogOpen}
              setDetailDialogOpen={setDetailDialogOpen}
              openTrackDetail={openTrackDetail}
              setOpenTrackDetail={setOpenTrackDetail}
              selectedBeaconId={selectedBeacon?.id ?? null}
              focusBeaconId={focusBeacon || undefined}
              focusDmac={selectedBeacon?.dmac ?? undefined}
              onFocusPosition={handleFocusPosition}
              showOtherBeacons={showOtherBeacons}
              screenId={screenId ?? ''}
              // Pass stage transform props
              stageScale={scale}
              stageX={translate.x}
              stageY={translate.y}
            />
          ) : (
            <div>Loading floorplan...</div>
          )}
        </Box>
      </Box>

      {/* Alarm Dialog */}
      {dummyAlarm && (
        <Dialog
          open={open}
          onClose={handleClose}
          PaperProps={{
            sx: {
              backgroundColor: 'transparent',
              boxShadow: 'none',
              overflow: 'visible',
            },
          }}
        >
          <Box
            sx={{
              background: 'linear-gradient(to bottom, #c62828, #b71c1c)',
              color: 'white',
              borderRadius: 4,
              px: 6,
              pt: 4,
              pb: 8,
              minWidth: { xs: '90vw', sm: 480, md: 600 },
              maxWidth: '90vw',
              textAlign: 'center',
              position: 'relative',
            }}
          >
            <Typography variant="h2" fontWeight="bold" letterSpacing={3} mb={2}>
              ALARM TRIGGERED
            </Typography>

            <Box
              sx={{
                backgroundColor: 'rgba(255,255,255,0.15)',
                display: 'inline-block',
                px: 3,
                py: 1,
                borderRadius: '24px',
                mb: 2,
                fontSize: '1rem',
                fontWeight: 'bold',
              }}
            >
              🔔 Triggered by{' '}
              <Box component="span" fontWeight="bold" fontSize="1.125rem">
                {getName(dummyAlarm?.beaconId)}
              </Box>
            </Box>

            <Typography variant="h6" mb={3}>
              Card ID:{' '}
              <Box component="span" fontWeight="bold" fontSize="1.1rem">
                {dummyAlarm?.beaconId}
              </Box>
            </Typography>
            <Typography variant="h6" mb={3}>
              Area:{' '}
              <Box component="span" fontWeight="bold" fontSize="1.1rem">
                {dummyAlarm?.maskedAreaName}
              </Box>{' '}
              |{' '}
              <Box component="span" fontWeight="bold" fontSize="1.1rem">
                {dummyAlarm?.floorplanName}
              </Box>
            </Typography>

            {/* White pill-shaped button bar */}
            <Box
              sx={{
                position: 'absolute',
                bottom: '-24px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: 'white',
                borderRadius: '40px',
                px: 5,
                py: 1.5,
                boxShadow: 2,
              }}
            >
              <Button
                onClick={handleClose}
                variant="text"
                sx={{
                  backgroundColor: '#fff',
                  color: 'red',
                  fontWeight: 'bold',
                  fontSize: '1.2rem',
                  textTransform: 'none',
                  borderRadius: '20px',
                  px: 5,
                  '&:hover': {
                    backgroundColor: '#b71c1c',
                    color: 'white',
                  },
                }}
              >
                Disarm
              </Button>
            </Box>
          </Box>
        </Dialog>
      )}

      {/* Popups */}
      {selectedBeacon &&
        (() => {
          const member = memberList?.find((m: memberType) => m.bleCardNumber === selectedBeacon.id);
          const visitor = visitorList?.find(
            (v: VisitorType) => v.bleCardNumber === selectedBeacon.id,
          );
          const person = member || visitor;

          return (
            <>
              <BeaconDetailPopup
                dmac={selectedBeacon.dmac}
                bleNumber={selectedBeacon.id}
                memberDetail={member}
                visitorDetail={visitor}
                detailDialogOpen={detailDialogOpen}
                setDetailDialogOpen={setDetailDialogOpen}
                setOpenTrackDetail={setOpenTrackDetail}
                area={selectedBeacon.area}
                floorplan={selectedBeacon.floorplan}
                time={selectedBeacon.time}
                screenId={screenId}
              />
              {person && (
                <TrackingDetailPopup
                  bleNumber={selectedBeacon.id}
                  person={person}
                  personId={person.id}
                  openTrackDetail={openTrackDetail}
                  setOpenTrackDetail={setOpenTrackDetail}
                />
              )}
            </>
          );
        })()}
    </Box>
  );
};

export default FloorView;