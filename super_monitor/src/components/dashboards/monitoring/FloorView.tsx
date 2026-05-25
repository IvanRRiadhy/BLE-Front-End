import { BASE_URL } from 'src/utils/axios';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppDispatch, useDispatch, useSelector, RootState } from 'src/store/Store';
import {
  Box,
  Button,
  Dialog,
  FormControlLabel,
  Grid2 as Grid,
  Slider,
  Stack,
  Switch,
  Typography,
} from '@mui/material';
import ZoomControls from 'src/components/shared/ZoomControls';
import DeviceRenderer from './Renderer/DeviceRenderer';
import {
  cleanupAllBeacons,
  SetSelectedBeacon,
} from 'src/store/apps/tracking/Beacon';
import { setScreenDisplay, setScreenSettings, swapScreen } from 'src/store/apps/monitoring/layout';

import { getConfig } from 'src/config';
import { useAllFloorplan, useAllDevice, useAllArea } from 'src/hooks/dataFetch';


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


    const [open, setOpen] = useState(false);
    const activeLayoutId = useSelector((state: RootState) => state.layoutReducer.activeLayoutId);
    const FollowingPerson = useSelector((state: RootState) => state.layoutReducer.followingPerson);
    const layouts = useSelector((state: RootState) => state.layoutReducer.layouts ?? []);
    const activeLayout = layouts.find((l) => l.id === activeLayoutId);
    const activeScreen = activeLayout?.screens.find((s) => s.floorplanId === activeFloorplan);
    const isFollowing = activeScreen?.display?.displayType === 3;

    const containerRef = useRef<HTMLDivElement>(null);
    const { data: floorplans = [] } = useAllFloorplan();
    const actFloorplan = floorplans.find(
      (floorplan) => floorplan.id === activeFloorplan,
    );

    const { data: Areas = [] } = useAllArea();
    const filteredArea = Areas.filter((area) => area.floorplanId === activeFloorplan);

    // console.log("Filtered Area,", Areas);
    const [showArea, setShowArea] = useState(true);
    const [showGates, setShowGates] = useState(true);
    const [showGeoFence, setShowGeoFence] = useState(false);
    const [showOverPopulate, setShowOverPopulate] = useState(false);
    const [showStayOnArea, setShowStayOnArea] = useState(false);
    const [showBoundary, setShowBoundary] = useState(false);
    const [showPatrolArea, setShowPatrolArea] = useState(false);
    const [showOtherBeacons, setShowOtherBeacons] = useState(true);

    const [beaconSize, setBeaconSize] = useState(1);
    const [gateSize, setGateSize] = useState(1);

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
    const lastBeaconPosition = useRef<{ x: number; y: number } | null>(null);
    const isManualDragRef = useRef(false);
    const [stickyOpacity, setStickyOpacity] = useState(1);
    const [zoomOpacity, setZoomOpacity] = useState(1);
    const stickyTimerRef = useRef<any>(null);
    const zoomTimerRef = useRef<any>(null);

    const startStickyTimer = useCallback(() => {
      if (stickyTimerRef.current) clearTimeout(stickyTimerRef.current);
      stickyTimerRef.current = setTimeout(() => setStickyOpacity(0), 5000);
    }, []);

    const startZoomTimer = useCallback(() => {
      if (zoomTimerRef.current) clearTimeout(zoomTimerRef.current);
      zoomTimerRef.current = setTimeout(() => setZoomOpacity(0), 5000);
    }, []);

    const wakeUpOverlays = useCallback(() => {
      setStickyOpacity(1);
      setZoomOpacity(1);
      startStickyTimer();
      startZoomTimer();
    }, [startStickyTimer, startZoomTimer]);

    useEffect(() => {
      if (isHovered && !isDragging && zoomable) {
        wakeUpOverlays();
      } else {
        if (stickyTimerRef.current) clearTimeout(stickyTimerRef.current);
        if (zoomTimerRef.current) clearTimeout(zoomTimerRef.current);
        setStickyOpacity(0);
        setZoomOpacity(0);
      }
    }, [isHovered, isDragging, zoomable, wakeUpOverlays]);

    const getCdnUrl = (url?: string | null) => {
      if (!url) return '';
      // console.log("URL: ", url)
      if (url.startsWith('http://') || url.startsWith('https://')) return url;
      return `https://ble-cdn.tunnel.piranticerdasindonesia.com/${url}`;
    };
    const floorplanImage = actFloorplan?.floorplanImage
      ? getCdnUrl(actFloorplan.floorplanImage)
      : 'No Active Floorplan';

    const { data: Devices = [] } = useAllDevice();
    const filteredDevices = Devices.filter(
      (device) => device.floorplanId === activeFloorplan,
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
        console.log('🟡 selectedBeacon', selectedBeacon, screenNumber);
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
    const topic = activeFloorplan.toUpperCase();

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
    const handleFocusPosition = useCallback(
      (pt: { x: number; y: number }) => {
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
      },
      [isFollowing],
    );

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
    const activeLayouts = layoutState.layouts.find((l: any) => l.id === layoutState.activeLayoutId);

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



    const handleParentClick = () => {
      if (!zoomable && !FollowingPerson) {
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
        onMouseMove={() => {
          if (isHovered && !isDragging && zoomable) {
            wakeUpOverlays();
          }
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
          cursor: cursor,
          // Add CSS to prevent browser zoom
          touchAction: 'none', // Prevent touch zoom
        }}
      >
        {/* Sticky Overlay Containers */}
        {isHovered && !isDragging && zoomable && (
          <Stack
            onMouseEnter={() => {
              if (stickyTimerRef.current) clearTimeout(stickyTimerRef.current);
              setStickyOpacity(1);
            }}
            onMouseLeave={() => {
              startStickyTimer();
            }}
            spacing={1}
            sx={{
              position: 'absolute',
              top: 12,
              right: 12,
              zIndex: 10,
              alignItems: 'flex-end',
              opacity: stickyOpacity,
              transition: 'opacity 0.5s ease-in-out',
              pointerEvents: stickyOpacity === 0 ? 'none' : 'auto',
            }}
          >
            {/* Visibility Toggles Overlay */}
            <Box
              sx={{
                width: 'fit-content',
                background: 'rgba(255,255,255,0.9)',
                borderRadius: 2,
                boxShadow: 2,
                p: 0.75,
                display: 'flex',
                flexDirection: 'column',
                gap: 0.25,
              }}
            >
              {[
                { label: 'Show Areas', checked: showArea, onChange: setShowArea },
                { label: 'Show Gateways', checked: showGates, onChange: setShowGates },
              ].map((item, idx) => (
                <FormControlLabel
                  key={idx}
                  sx={{
                    m: 0,
                    '& .MuiFormControlLabel-label': { fontSize: '0.7rem', fontWeight: 500 },
                  }}
                  control={
                    <Switch
                      size="small"
                      checked={item.checked}
                      onChange={() => item.onChange((prev) => !prev)}
                      color="primary"
                    />
                  }
                  label={item.label}
                />
              ))}

              {Boolean(focusBeacon) && isFollowing && (
                <Stack spacing={0.5} sx={{ mt: 0.5, borderTop: '1px solid rgba(0,0,0,0.1)', pt: 0.5 }}>
                  <FormControlLabel
                    sx={{
                      m: 0,
                      '& .MuiFormControlLabel-label': { fontSize: '0.7rem', fontWeight: 600 },
                    }}
                    control={
                      <Switch
                        size="small"
                        checked={showOtherBeacons}
                        onChange={() => setShowOtherBeacons((prev) => !prev)}
                        color="primary"
                      />
                    }
                    label="Show Other People"
                  />
                  {/* <Button
                  variant="contained"
                  color="error"
                  size="small"
                  onClick={handleCancelFollowing}
                  sx={{ fontSize: '0.65rem', py: 0.25 }}
                >
                  Cancel Following
                </Button> */}
                </Stack>
              )}
            </Box>

            {/* Size Controls Overlay */}
            <Box
              sx={{
                width: 140,
                background: 'rgba(255,255,255,0.9)',
                borderRadius: 2,
                boxShadow: 2,
                p: 1.5,
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
              }}
            >
              <Box>
                <Typography variant="caption" sx={{ fontSize: '0.65rem', fontWeight: 700 }}>
                  Beacon Size: {beaconSize.toFixed(1)}
                </Typography>
                <Slider
                  size="small"
                  value={beaconSize}
                  min={0}
                  max={2}
                  step={0.1}
                  onChange={(_, val) => setBeaconSize(val as number)}
                  valueLabelDisplay="auto"
                  sx={{ py: 1 }}
                />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ fontSize: '0.65rem', fontWeight: 700 }}>
                  Gateway Size: {gateSize.toFixed(1)}
                </Typography>
                <Slider
                  size="small"
                  value={gateSize}
                  min={0}
                  max={2}
                  step={0.1}
                  onChange={(_, val) => setGateSize(val as number)}
                  valueLabelDisplay="auto"
                  sx={{ py: 1 }}
                />
              </Box>
            </Box>
          </Stack>
        )}

        {/* Zoom Controls - EXACTLY like EditDeviceFloorView */}
        {isHovered && zoomable && !isDragging && (
          <Box
            onMouseEnter={() => {
              if (zoomTimerRef.current) clearTimeout(zoomTimerRef.current);
              setZoomOpacity(1);
            }}
            onMouseLeave={() => {
              startZoomTimer();
            }}
            sx={{
              position: 'absolute',
              top: 16,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 2,
              opacity: zoomOpacity,
              transition: 'opacity 0.5s ease-in-out',
              pointerEvents: zoomOpacity === 0 ? 'none' : 'auto',
            }}
          >
            <ZoomControls
              scale={scale}
              setScale={setScale}
              applyZoom={applyZoom}
              minScale={MIN_SCALE}
              maxScale={MAX_SCALE}
            />
          </Box>
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
                devices={filteredDevices as any}
                imageSrc={image}
                areas={filteredArea}
                showAreas={zoomable && showArea}
                showGates={zoomable && showGates}
                showBeacons={zoomable}
                beaconSize={beaconSize}
                gateSize={gateSize}
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




      </Box>
    );
  };

export default FloorView;
