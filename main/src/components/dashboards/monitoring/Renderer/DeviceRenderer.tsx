import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { Stage, Layer, Image as KonvaImage, Text, Line, Label, Tag, Group, Circle } from 'react-konva';
import { useSelector, useDispatch, RootState } from 'src/store/Store';
import {
  fetchBeacon,
  RefreshBeaconState,
  cleanupTopicBeacons,
  AlarmLogItem,
} from 'src/store/apps/tracking/Beacon';
import BeaconRenderer from './BeaconRenderer';
import FaceRecog from 'src/assets/images/svgs/devices/FACE RECOGNITION FIX.svg';
import CCTVSVG from 'src/assets/images/svgs/devices/7.svg';
import GatewaySVG from 'src/assets/images/svgs/devices/BLE FIX ABU.svg';
import UnknownDevice from 'src/assets/images/masters/Devices/UnknownDevice.png';
import { FloorplanDeviceType } from 'src/store/apps/crud/floorplanDevice';
import { MaskedAreaType } from 'src/store/apps/crud/maskedArea';
import { darken } from '@mui/material';
import {
  LayoutSet,
  ScreenItem,
  setFocus,
  setScreenFloorplan,
} from 'src/store/apps/monitoring/layout';
import polylabel from 'polylabel';
import { GeoFencingAlarmType } from 'src/store/apps/alarmsetting/geofencing';
import { startMQTTclient } from 'src/store/apps/tracking/MQTT';
import { OverPopulatingAlarmType } from 'src/store/apps/alarmsetting/overpopulating';
import { StayOnAreaAlarmType } from 'src/store/apps/alarmsetting/stayonarea';
import { BoundaryAlarmType } from 'src/store/apps/alarmsetting/boundary';
import { PatrolAreaType } from 'src/store/apps/crud/patrolArea';
import { useAllMembers } from 'src/hooks/useMember';
import { useAllVisitor } from 'src/hooks/useVisitor';
import { useAllSecuritys } from 'src/hooks/useSecurityGuard';

// Common node type that all area types should have
interface BaseNode {
  x_px: number;
  y_px: number;
}

type BoundaryPolygon = {
  label: string;
  points: number[];
}

// Specific node types for different area types
type Nodes = {
  id: string;
  x: number;
  y: number;
  x_px: number;
  y_px: number;
  type?: 'corner' | 'center';
};

// Type guard to check if a value is an array
const isArray = (value: any): value is any[] => Array.isArray(value);

// Type guard to check if a node has x_px and y_px properties
const hasPxProperties = (node: any): node is { x_px: number; y_px: number } => {
  return node && typeof node.x_px === 'number' && typeof node.y_px === 'number';
};

// Type guard to check if a node has x and y properties
const hasXYProperties = (node: any): node is { x: number; y: number } => {
  return node && typeof node.x === 'number' && typeof node.y === 'number';
};

const closeRing = (ring: number[][]) => {
  if (!ring.length) return ring;
  const [fx, fy] = ring[0];
  const [lx, ly] = ring[ring.length - 1];
  if (fx !== lx || fy !== ly) return [...ring, [fx, fy]];
  return ring;
};

function getNodePx(node: any): [number, number] | null {
  if (node && typeof node.x_px === 'number' && typeof node.y_px === 'number' && !isNaN(node.x_px) && !isNaN(node.y_px)) {
    return [node.x_px, node.y_px];
  }
  if (node && typeof node.x === 'number' && typeof node.y === 'number' && !isNaN(node.x) && !isNaN(node.y)) {
    return [node.x, node.y];
  }
  return null;
}

function areaToPolygonRings(area: MaskedAreaType): number[][][] {
  const outer: number[][] = [];
  for (const n of area.nodes ?? []) {
    const pt = getNodePx(n);
    if (pt) outer.push(pt);
  }
  const holesRaw: any[][] = (area as any).holes ?? [];
  const holes: number[][][] = holesRaw.map((nodes) => {
    const holeRing: number[][] = [];
    for (const n of nodes ?? []) {
      const pt = getNodePx(n);
      if (pt) holeRing.push(pt);
    }
    return closeRing(holeRing);
  });

  if (outer.length < 3) return [];
  return [closeRing(outer), ...holes];
}

/**
 * Calculates the exact Center of Gravity (Centroid) of a 2D polygon using the mathematical polygon centroid equation:
 * Cx = (1 / 6A) * sum((x_i + x_{i+1}) * (x_i * y_{i+1} - x_{i+1} * y_i))
 * Cy = (1 / 6A) * sum((y_i + y_{i+1}) * (x_i * y_{i+1} - x_{i+1} * y_i))
 * Area A = 0.5 * sum(x_i * y_{i+1} - x_{i+1} * y_i)
 */
function calculatePolygonCentroid(nodes: { x_px: number; y_px: number }[]): { x: number; y: number } {
  if (!nodes || nodes.length === 0) return { x: 0, y: 0 };
  if (nodes.length === 1) return { x: nodes[0].x_px, y: nodes[0].y_px };
  if (nodes.length === 2) {
    return {
      x: (nodes[0].x_px + nodes[1].x_px) / 2,
      y: (nodes[0].y_px + nodes[1].y_px) / 2,
    };
  }

  let signedArea = 0;
  let cx = 0;
  let cy = 0;
  const n = nodes.length;

  for (let i = 0; i < n; i++) {
    const x0 = nodes[i].x_px;
    const y0 = nodes[i].y_px;
    const nextNode = nodes[(i + 1) % n];
    const x1 = nextNode.x_px;
    const y1 = nextNode.y_px;

    const crossProduct = x0 * y1 - x1 * y0;
    signedArea += crossProduct;
    cx += (x0 + x1) * crossProduct;
    cy += (y0 + y1) * crossProduct;
  }

  signedArea *= 0.5;

  if (Math.abs(signedArea) < 1e-6) {
    const sumX = nodes.reduce((acc, pts) => acc + pts.x_px, 0);
    const sumY = nodes.reduce((acc, pts) => acc + pts.y_px, 0);
    return { x: sumX / n, y: sumY / n };
  }

  cx = cx / (6 * signedArea);
  cy = cy / (6 * signedArea);

  return { x: cx, y: cy };
}

// Updated toCanvas function - no scaling needed since we use original coordinates
function toCanvas(
  x_px: number,
  y_px: number,
  width: number,
  height: number,
  originalWidth: number,
  originalHeight: number,
) {
  // Return original coordinates since image is rendered at original size
  return {
    x: x_px,
    y: y_px,
  };
}

// DeviceRenderer.tsx
type DeviceRendererProps = {
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  meterPx: number;
  imageSrc: HTMLImageElement;
  devices: FloorplanDeviceType[];
  areas: MaskedAreaType[];
  GeoFenceAlarm: GeoFencingAlarmType[];
  OverPopulateAlarm: OverPopulatingAlarmType[];
  StayOnAreaAlarm: StayOnAreaAlarmType[];
  BoundaryAlarm: BoundaryAlarmType[];
  PatrolAreas: PatrolAreaType[];
  showAreas: boolean;
  showGates: boolean;
  showGeoFence: boolean;
  showOverPopulate: boolean;
  showStayOnArea: boolean;
  showBoundary: boolean;
  showPatrolAreas: boolean;
  showBeacons: boolean;
  beaconSize: number;
  gateSize: number;
  topic: string;
  detailDialogOpen?: boolean;
  setDetailDialogOpen?: (open: boolean) => void;
  openTrackDetail?: boolean;
  setOpenTrackDetail?: (open: boolean) => void;
  selectedBeaconId?: string;
  onSelectBeacon: (info: {
    id: string;
    area: string;
    floorplan: string;
    time: string;
    dmac: string;
  }) => void;
  screenId: string;
  focusBeaconId?: string;
  onFocusPosition?: (pt: { x: number; y: number }) => void;
  focusDmac?: string;
  showOtherBeacons?: boolean;
  // Stage transform props (from parent)
  stageScale: number;
  stageX: number;
  stageY: number;
  stageRef?: React.RefObject<any>;
  onWheel?: (e: any) => void;
};

const EMPTY_ARRAY: any[] = [];

const DeviceRenderer: React.FC<DeviceRendererProps> = (props) => {
  const {
    width,
    height,
    originalWidth,
    originalHeight,
    meterPx,
    imageSrc,
    devices,
    areas,
    GeoFenceAlarm,
    OverPopulateAlarm,
    StayOnAreaAlarm,
    BoundaryAlarm,
    PatrolAreas,
    showAreas,
    showGates,
    showGeoFence,
    showOverPopulate,
    showStayOnArea,
    showBoundary,
    showPatrolAreas,
    showBeacons,
    beaconSize,
    gateSize,

    topic,
    detailDialogOpen,
    setDetailDialogOpen,
    openTrackDetail,
    setOpenTrackDetail,
    onSelectBeacon,
    selectedBeaconId,
    focusBeaconId,
    focusDmac,
    onFocusPosition,
    showOtherBeacons,
    screenId,
    stageScale,
    stageX,
    stageY,
    stageRef,
    onWheel,
  } = props;
  const dispatch = useDispatch();

  const { data: membersData = EMPTY_ARRAY } = useAllMembers();
  const { data: visitorsData = EMPTY_ARRAY } = useAllVisitor();
  const { data: securityData = EMPTY_ARRAY } = useAllSecuritys();

  // Create a memoized lookup map of bleCardNumber -> person info for O(1) performance
  const beaconPersonMap = useMemo(() => {
    const map = new Map<string, { label: string; isSecurity: boolean; isMember: boolean; isVisitor: boolean }>();

    membersData.forEach((m) => {
      if (m.bleCardNumber) {
        map.set(m.bleCardNumber, {
          label: m.name || m.bleCardNumber,
          isSecurity: false,
          isMember: true,
          isVisitor: false,
        });
      }
    });

    visitorsData.forEach((v) => {
      if (v.bleCardNumber) {
        map.set(v.bleCardNumber, {
          label: v.name || v.bleCardNumber,
          isSecurity: false,
          isMember: false,
          isVisitor: true,
        });
      }
    });

    securityData.forEach((s) => {
      if (s.bleCardNumber) {
        map.set(s.bleCardNumber, {
          label: s.name || s.bleCardNumber,
          isSecurity: true,
          isMember: false,
          isVisitor: false,
        });
      }
    });

    return map;
  }, [membersData, visitorsData, securityData]);

  // Image state like EditAreaRenderer
  const [bgImage, setBgImage] = useState<HTMLImageElement | undefined>(undefined);
  const [previewImage, setPreviewImage] = useState<HTMLImageElement | undefined>(undefined);
  const alarmData = useSelector((state: RootState) => state.BeaconReducer.alarmLogs);
  const activeAlarm = alarmData.find((a: AlarmLogItem) => a.action === 'active');
  const investigatedAlarm = alarmData.find((a: AlarmLogItem) => a.action === 'investigated');
  const [animatedBeacons, setAnimatedBeacons] = useState<{
    [id: string]: { x: number; y: number };
  }>({});
  const [lastSeenBeacons, setLastSeenBeacons] = useState<{
    [id: string]: {
      x: number;
      y: number;
      lastSeen: number;
      area: string;
      floorplan: string;
      time: string;
      dmac: string;
    };
  }>({});

  const refreshTrigger = useSelector((state: RootState) => state.BeaconReducer.refreshTrigger);

  // Get beacon data from Redux - now an object keyed by beaconId
  const beaconDataObj = useSelector(
    (state: RootState) => state.BeaconReducer.beaconsByTopic[topic],
  );

  // Convert object to array for easier processing (uses immutable fallback to prevent infinite re-render loop)
  const beaconData = useMemo(() => {
    if (!beaconDataObj) return EMPTY_ARRAY;
    return Object.values(beaconDataObj);
  }, [beaconDataObj]);

  // console.log('DeviceRenderer render - topic:', topic, 'beaconData count:', beaconData.length);

  const beacons = useSelector((state: RootState) => state.BeaconReducer.beaconsByTopic);
  const [highlightTopic, setHighlightTopic] = useState<string | null>(null);
  const [highlightedFloorplan, setHighlightedFloorplan] = useState<string | null>(null);
  const [highlightedArea, setHighlightedArea] = useState<string | null>(null);
  const floorplans = useSelector((state: RootState) => state.floorplanReducer.floorplanAll);

  // layout info to know what this screen is displaying
  const activeLayoutId = useSelector((state: RootState) => state.layoutReducer.activeLayoutId);
  const layouts = useSelector((state: RootState) =>
    state.layoutReducer.layouts.find((l: LayoutSet) => l.id === activeLayoutId),
  );
  const thisScreen = layouts?.screens.find((s: ScreenItem) => s.id === screenId);

  // Track previous topic to detect changes
  const prevTopicRef = useRef<string>(topic);

  // background image - like EditAreaRenderer
  useEffect(() => {
    if (!imageSrc) {
      setPreviewImage(undefined);
      setBgImage(undefined);
      return;
    }

    // Create a preview image first
    const previewUrl = imageSrc.src;
    const p = new window.Image();
    // p.crossOrigin = 'anonymous';
    p.src = previewUrl;

    p.onload = () => {
      setPreviewImage(p);
      // Then load the full image
      const full = new window.Image();
      // full.crossOrigin = 'anonymous';
      full.src = imageSrc.src;
      full.onload = () => setBgImage(full);
      full.onerror = () => {
        // Fallback to preview if full image fails
        if (!bgImage) setBgImage(p);
      };
    };

    p.onerror = () => {
      // If preview fails, try to load the full image directly
      const f = new window.Image();
      f.crossOrigin = 'anonymous';
      f.src = imageSrc.src;
      f.onload = () => setBgImage(f);
      f.onerror = () => {
        console.error('Failed to load image:', imageSrc.src);
      };
    };
  }, [imageSrc]);

  // Reset beacons immediately when topic changes
  useEffect(() => {
    // Only reset if topic actually changed
    if (prevTopicRef.current !== topic) {
      console.log(
        `Topic changed from ${prevTopicRef.current} to ${topic}, resetting local beacon state`,
      );
      setLastSeenBeacons({});
      setAnimatedBeacons({});
      prevTopicRef.current = topic;
    }
  }, [topic]);

  // Set up interval to clean up old beacons in Redux
  useEffect(() => {
    const interval = setInterval(() => {
      dispatch(cleanupTopicBeacons(topic));
    }, 1000); // Clean up every second

    return () => clearInterval(interval);
  }, [dispatch, topic]);

  // background image effect
  useEffect(() => {
    if (
      !highlightedFloorplan ||
      !activeLayoutId ||
      !thisScreen?.id ||
      thisScreen.display.displayType !== 3
    )
      return;

    // ✅ Only the follow screen for this beacon updates floorplan
    if (thisScreen.display.displayOutput?.toLowerCase() !== focusBeaconId?.toLowerCase()) return;

    dispatch(
      setScreenFloorplan({
        layoutId: activeLayoutId,
        screenId: thisScreen.id,
        floorplanId: highlightedFloorplan,
      }),
    );
  }, [highlightedFloorplan, activeLayoutId, thisScreen, dispatch, focusBeaconId]);

  // load device icons
  const useDeviceIcon = (src: string) => {
    const [img, setImg] = useState<HTMLImageElement | undefined>(undefined);
    useEffect(() => {
      const image = new window.Image();
      image.src = src;
      image.onload = () => setImg(image);
    }, [src]);
    return img;
  };
  const iconCCTV = useDeviceIcon(CCTVSVG);
  const iconGateway = useDeviceIcon(GatewaySVG);
  const iconFaceRecog = useDeviceIcon(FaceRecog);
  const iconUnknown = useDeviceIcon(UnknownDevice);

  // fetch beacons
  // useEffect(() => {
  //   const unsubscribe = dispatch(fetchBeacon(topic));
  //   return () => {
  //     if (typeof unsubscribe === 'function') unsubscribe();
  //   };
  // }, [dispatch, topic]);

  // maintain beacon state from Redux data
  useEffect(() => {
    if (!beaconData || beaconData.length === 0) {
      // If no beacon data, clear local state
      setLastSeenBeacons({});
      return;
    }

    // console.log(`Processing ${beaconData.length} beacons for topic ${topic}`);

    setLastSeenBeacons((prev) => {
      const updated = { ...prev };

      beaconData.forEach((b: any) => {
        if (!b.point) return;

        // beaconId is the dmac
        const beaconId = b.beaconId;
        const dmac = beaconId; // Same as beaconId

        updated[beaconId] = {
          x: b.point.x,
          y: b.point.y,
          lastSeen: b.lastSeen || Date.now(), // Use Redux lastSeen or current time
          area: b.maskedAreaName || '',
          floorplan: b.floorplanName || '',
          time: b.time || '',
          dmac: dmac,
        };
      });

      // Clean up beacons that are no longer in Redux data
      Object.keys(updated).forEach((beaconId) => {
        if (!beaconData.find((b: any) => b.beaconId === beaconId)) {
          delete updated[beaconId];
        }
      });

      return updated;
    });
    // console.log("Beacons: ", lastSeenBeacons)
    // dispatch(buildTrackingLogs());
  }, [beaconData, topic]);

  // animate beacons
  useEffect(() => {
    Object.entries(lastSeenBeacons).forEach(([beaconId, beacon]) => {
      const point = { x: beacon.x, y: beacon.y };
      const prev = animatedBeacons[beaconId] || point;
      if (prev.x === point.x && prev.y === point.y) {
        setAnimatedBeacons((s) => ({ ...s, [beaconId]: point }));
        return;
      }

      const startX = prev.x;
      const startY = prev.y;
      const endX = point.x;
      const endY = point.y;
      const distX = endX - startX;
      const distY = endY - startY;
      const distance = Math.sqrt(distX * distX + distY * distY);
      const speed = 2 / meterPx;
      const duration = Math.min(Math.max(500, (distance / speed) * 500), 2000);
      const startTime = performance.now();
      function animate(now: number) {
        const t = Math.min(1, (now - startTime) / duration);
        const nx = startX + (endX - startX) * t;
        const ny = startY + (endY - startY) * t;
        setAnimatedBeacons((s) => ({ ...s, [beaconId]: { x: nx, y: ny } }));
        if (t < 1) requestAnimationFrame(animate);
      }
      requestAnimationFrame(animate);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastSeenBeacons]);

  useEffect(() => {
    if (!refreshTrigger) return;
    dispatch(RefreshBeaconState());
    setLastSeenBeacons({});
    setAnimatedBeacons({});
  }, [refreshTrigger, dispatch]);

  // Convert beacon position from meters to pixels for focus position
  useEffect(() => {
    if (!focusBeaconId || !onFocusPosition) return;
    const b = animatedBeacons[focusBeaconId];
    if (!b) return;

    // Convert meters to pixels using meterPx
    const xPx = b.x;
    const yPx = b.y;

    // Pass the position in original image coordinates (pixels)
    onFocusPosition({ x: xPx, y: yPx });
  }, [animatedBeacons, focusBeaconId, onFocusPosition, meterPx]);

  useEffect(() => {
    if (!focusBeaconId) return;

    const topic = `people_tracking/highlight/positions/${focusBeaconId}`;
    console.log(`[MQTT] Subscribing to highlight topic: ${topic}`);

    const unsubscribe = startMQTTclient((msg: any) => {
      if (!msg?.floorplanId || !msg?.beaconId) return;
      const payloadId = msg.beaconId;

      if (payloadId !== focusBeaconId) return;
      // console.log(`[MQTT] Received message on highlight topic: ${topic} with payload:`, msg);
      setHighlightedFloorplan(msg.floorplanId);
      setHighlightedArea(msg.area || null);
    }, topic);

    return () => {
      console.log(`[MQTT] Unsubscribing from ${topic}`);
      unsubscribe();
    };
  }, [focusBeaconId]);

  // compute Pole of Inaccessibility (Internal Center) & distance to boundary for each area (handles concave / L-shapes)
  const areaLabelInfos = useMemo(() => {
    const map: Record<
      string,
      { cx: number; cy: number; fontSize: number; maxTextWidth: number; show: boolean }
    > = {};

    for (const area of areas) {
      if (!area.nodes || area.nodes.length < 3) continue;

      // 1. Calculate Centroid fallback
      const centroid = calculatePolygonCentroid(area.nodes);

      // 2. Calculate Polylabel internal center
      let cx = centroid.x;
      let cy = centroid.y;
      let edgeDistance = 30;

      const rings = areaToPolygonRings(area);
      if (rings && rings[0] && rings[0].length >= 3) {
        const result = polylabel(rings, 1.0);
        if (
          result &&
          result.length >= 3 &&
          !isNaN(result[0]) &&
          !isNaN(result[1]) &&
          isFinite(result[0]) &&
          isFinite(result[1])
        ) {
          cx = result[0];
          cy = result[1];
          if (!isNaN(result[2]) && isFinite(result[2]) && result[2] > 0) {
            edgeDistance = result[2];
          }
        }
      }

      // 3. Bounding Box for max cap
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const n of area.nodes) {
        const pt = getNodePx(n);
        if (pt) {
          if (pt[0] < minX) minX = pt[0];
          if (pt[0] > maxX) maxX = pt[0];
          if (pt[1] < minY) minY = pt[1];
          if (pt[1] > maxY) maxY = pt[1];
        }
      }

      const polyWidth = isFinite(maxX - minX) ? maxX - minX : 100;
      const polyHeight = isFinite(maxY - minY) ? maxY - minY : 100;
      const nameLength = (area.name || '').length || 1;

      // 4. Max allowable text width strictly bounded by internal edge clearance
      const maxTextWidth = Math.max(30, Math.min(polyWidth * 0.85, edgeDistance * 1.85));

      // 5. Calculate Font Size to fit strictly inside maxTextWidth & vertical edge clearance
      const fontSizeW = maxTextWidth / (nameLength * 0.55);
      const fontSizeH = (polyHeight * 0.45) / 1.2;
      let computedFontSize = Math.min(fontSizeW, fontSizeH);

      const MAX_FONT_SIZE = 18;
      const MIN_FONT_SIZE = 10;

      computedFontSize = Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, computedFontSize));

      const finalFontSize = Math.round(computedFontSize);
      const finalWidth = Math.round(maxTextWidth);

      if (isNaN(finalFontSize) || isNaN(finalWidth) || !isFinite(finalFontSize) || !isFinite(finalWidth)) {
        continue;
      }

      map[area.id] = {
        cx,
        cy,
        fontSize: finalFontSize,
        maxTextWidth: finalWidth,
        show: true,
      };
    }

    return map;
  }, [areas]);

  // track which area is hovered
  const [hoveredAreaId, setHoveredAreaId] = useState<string | null>(null);

  // render devices - using original image coordinates
  const renderDeviceShape = (device: FloorplanDeviceType) => {
    let deviceIcon = iconUnknown;
    switch (device.type) {
      case 'Cctv':
        deviceIcon = iconCCTV;
        break;
      case 'BleReader':
        deviceIcon = iconGateway;
        break;
      case 'AccessDoor':
        deviceIcon = iconFaceRecog;
        break;
    }
    // Use original coordinates directly (no scaling)
    const x = device.posPxX - (20 * gateSize);
    const y = device.posPxY - (20 * gateSize);
    const statusActive = device.deviceStatus.toLocaleLowerCase() === 'active';
    // console.log("Device", device.reader)
    return (
      <Group
        key={`device-${device.id}`}
        name="device"
        onClick={(e: any) => {
          e.cancelBubble = true;
          dispatch(setFocus({ type: 'device', id: device.id }));
        }}
      >
        <Text
          x={x - (40 * gateSize)}
          y={y - (statusActive ? 5 * gateSize : 25 * gateSize)}
          text={device.name}
          fontSize={9 * gateSize}
          fill="#1976d2"
          fontStyle="bold"
          width={120 * gateSize}
          align="center"
          listening={false}
        />
        {!statusActive && (
          <Text
            x={x - (40 * gateSize)}
            y={y - (12 * gateSize)}
            text="Non-Active"
            fontSize={9 * gateSize}
            fill="red"
            fontStyle="bold"
            width={120 * gateSize}
            align="center"
            listening={false}
          />
        )}
        <KonvaImage
          name="device"
          image={deviceIcon}
          x={x}
          y={y} width={40 * gateSize} height={40 * gateSize}
          stroke={!statusActive ? 'red' : 'transparent'}
          strokeWidth={!statusActive ? 3 : 0}
        />
        {device.reader?.forceReading && (
          <Circle x={x + (20 * gateSize)} y={y + (20 * gateSize)} radius={((device.reader?.forceRadiusMeter || 2) / meterPx)} fill="transparent" stroke="#1976d2" strokeWidth={2} />
        )}
      </Group>
    );
  };

  // Generic function to extract points from any node structure
  const setPointsFromNodes = (nodes: any): number[] => {
    if (!nodes) return [];

    // If nodes is already an array
    if (isArray(nodes)) {
      return nodes.flatMap((node: any) => {
        if (hasPxProperties(node)) {
          return [node.x_px, node.y_px];
        } else if (hasXYProperties(node)) {
          return [node.x, node.y];
        }
        return [];
      });
    }

    // If nodes is not an array but has some structure
    // Try to extract points based on common patterns
    if (typeof nodes === 'object') {
      // Check if it has a 'points' property
      if (nodes.points && isArray(nodes.points)) {
        return nodes.points.flat();
      }
      // Check if it has 'x' and 'y' properties directly
      if (hasPxProperties(nodes)) {
        return [nodes.x_px, nodes.y_px];
      } else if (hasXYProperties(nodes)) {
        return [nodes.x, nodes.y];
      }
    }

    return [];
  };

  // Specific handler for BoundaryAlarm nodes
  const setPointsFromBoundaryNodes = (boundaryNodes: any): number[] => {
    console.log("BOUNDARY NODES", boundaryNodes)
    // First try the generic function
    const points = setPointsFromNodes(boundaryNodes);
    if (points.length > 0) return points;

    // If that doesn't work, try to inspect the structure
    console.log('Boundary nodes structure:', points);

    // Return empty array if we can't extract points
    return [];
  };
  const getBoundaryPolygons = (boundaryNodes: any): BoundaryPolygon[] => {
  if (!boundaryNodes || typeof boundaryNodes !== 'object') {
    return [];
  }
  return Object.entries(boundaryNodes).map(([label, nodes]) => ({
    label: label.toUpperCase(),
    points: (nodes as any[]).flatMap((node) => [
      Number(node.x_px),
      Number(node.y_px),
    ]),
  }));
};

  // Use the image that's actually loaded (like EditAreaRenderer)
  const imageToDraw = bgImage || previewImage;

  // Don't render if image isn't loaded yet
  if (!imageToDraw || width <= 0 || height <= 0 || originalWidth <= 0 || originalHeight <= 0) {
    return null;
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Stage
        pixelRatio={1}
        width={width}
        height={height}
        ref={stageRef as any}
        scaleX={stageScale}
        scaleY={stageScale}
        x={stageX}
        y={stageY}
        onMouseDown={(e) => {
          const nm = (e.target && (e.target as any).name && (e.target as any).name()) || '';
          if (!['area', 'device', 'beacon'].includes(nm)) {
            dispatch(setFocus({ type: '', id: '' }));
          }
        }}
        onWheel={onWheel}
      >
        <Layer>
          {/* Render image at original size - only when image is loaded */}
          {imageToDraw && (
            <KonvaImage
              name="background"
              image={imageToDraw}
              width={originalWidth}
              height={originalHeight}
            />
          )}

          {/* Areas */}
          {showAreas &&
            areas.map((area: MaskedAreaType) => (
              <Line
                key={area.id}
                name="area"
                points={setPointsFromNodes(area.nodes)}
                stroke={darken(area.colorArea, 0.5)}
                strokeWidth={5}
                lineJoin="round"
                lineCap="round"
                closed
                fill={area.colorArea}
                opacity={0.5}
                onMouseEnter={() => setHoveredAreaId(area.id)}
                onMouseLeave={() => setHoveredAreaId((id) => (id === area.id ? null : id))}
                onClick={() => dispatch(setFocus({ type: 'area', id: area.id }))}
              />
            ))}
          {showGeoFence &&
            GeoFenceAlarm.map((geofence: GeoFencingAlarmType) => (
              <Line
                key={geofence.id}
                name="geofence"
                points={setPointsFromNodes(geofence.nodes)}
                stroke={darken(geofence.color, 0.3)}
                strokeWidth={5}
                lineJoin="round"
                lineCap="round"
                closed
                fill={geofence.color}
                opacity={0.35}
                onMouseEnter={() => setHoveredAreaId(geofence.id)}
                onMouseLeave={() => setHoveredAreaId((id) => (id === geofence.id ? null : id))}
                onClick={() => dispatch(setFocus({ type: 'geofence', id: geofence.id }))}
              />
            ))}
          {showOverPopulate &&
            OverPopulateAlarm.map((overpopulate: OverPopulatingAlarmType) => (
              <Line
                key={overpopulate.id}
                name="overpopulate"
                points={setPointsFromNodes(overpopulate.nodes)}
                stroke={darken(overpopulate.color, 0.3)}
                strokeWidth={5}
                lineJoin="round"
                lineCap="round"
                closed
                fill={overpopulate.color}
                opacity={0.35}
                onMouseEnter={() => setHoveredAreaId(overpopulate.id)}
                onMouseLeave={() => setHoveredAreaId((id) => (id === overpopulate.id ? null : id))}
                onClick={() => dispatch(setFocus({ type: 'overpopulate', id: overpopulate.id }))}
              />
            ))}
          {showStayOnArea &&
            StayOnAreaAlarm.map((stayonarea: StayOnAreaAlarmType) => (
              <Line
                key={stayonarea.id}
                name="stayonarea"
                points={setPointsFromNodes(stayonarea.nodes)}
                stroke={darken(stayonarea.color, 0.3)}
                strokeWidth={5}
                lineJoin="round"
                lineCap="round"
                closed
                fill={stayonarea.color}
                opacity={0.35}
                onMouseEnter={() => setHoveredAreaId(stayonarea.id)}
                onMouseLeave={() => setHoveredAreaId((id) => (id === stayonarea.id ? null : id))}
                onClick={() => dispatch(setFocus({ type: 'stayonarea', id: stayonarea.id }))}
              />
            ))}
{showBoundary &&
  BoundaryAlarm.flatMap((boundary: BoundaryAlarmType) =>
    getBoundaryPolygons(boundary.nodes).map((polygon) => (
      <Line
        key={`${boundary.id}-${polygon.label}`}
        name="boundary"
        points={polygon.points}
        stroke={darken(boundary.color, 0.3)}
        strokeWidth={5}
        lineJoin="round"
        lineCap="round"
        closed
        fill={boundary.color}
        opacity={0.35}
        onMouseEnter={() => setHoveredAreaId(boundary.id)}
        onMouseLeave={() =>
          setHoveredAreaId((id) => (id === boundary.id ? null : id))
        }
        onClick={() =>
          dispatch(setFocus({ type: 'boundary', id: boundary.id }))
        }
      />
    ))
  )}
          {showPatrolAreas &&
            PatrolAreas.map((patrolArea: PatrolAreaType) => {
              if (!patrolArea.nodes || patrolArea.nodes.length < 3) return null;
              // if (patrolArea.nodes.length < 3) return null;
              const cornerNodes = patrolArea.nodes.filter((n) => n.type === 'corner');
              const points = cornerNodes.flatMap((node) => [node.x_px, node.y_px]);
              return (
                <Line
                  key={patrolArea.id}
                  name="patrolarea"
                  // Use the specific boundary handler
                  points={points}
                  stroke={darken(patrolArea.color, 0.3)}
                  strokeWidth={5}
                  lineJoin="round"
                  lineCap="round"
                  closed
                  fill={patrolArea.color}
                  opacity={0.35}
                  onMouseEnter={() => setHoveredAreaId(patrolArea.id)}
                  onMouseLeave={() => setHoveredAreaId((id) => (id === patrolArea.id ? null : id))}
                  onClick={() => dispatch(setFocus({ type: 'patrolarea', id: patrolArea.id }))}
                />
              );
            })}

          {/* Devices */}
          {showGates && devices.map((d: FloorplanDeviceType) => renderDeviceShape(d))}

          {/* Beacons */}
          {showBeacons &&
            Object.entries(lastSeenBeacons)
              .filter(([beaconId]) => showOtherBeacons || beaconId === focusBeaconId)
              .map(([beaconId, beacon]) => {
                const anim = animatedBeacons[beaconId] || beacon;
                // Convert meters to pixels for beacon position
                const xPx = anim.x;
                const yPx = anim.y;

                const now = Date.now();
                const age = now - beacon.lastSeen;
                const opacity = age > 5000 ? 0.4 : 1.0;

                // Lookup person details in O(1)
                const personInfo = beaconPersonMap.get(beaconId) || {
                  label: beaconId,
                  isSecurity: false,
                  isMember: false,
                  isVisitor: false,
                };

                return (
                  <BeaconRenderer
                    key={`beacon-${beaconId}`}
                    id={beaconId}
                    x={xPx}
                    y={yPx}
                    beaconSize={beaconSize}
                    opacity={opacity}
                    lastSeen={beacon.lastSeen}
                    area={beacon.area}
                    floorplan={beacon.floorplan}
                    time={beacon.time}
                    clickable
                    detailDialogOpen={detailDialogOpen}
                    setDetailDialogOpen={setDetailDialogOpen}
                    openTrackDetail={openTrackDetail}
                    setOpenTrackDetail={setOpenTrackDetail}
                    label={personInfo.label}
                    isSecurity={personInfo.isSecurity}
                    isMember={personInfo.isMember}
                    isVisitor={personInfo.isVisitor}
                    onClick={() =>
                      onSelectBeacon({
                        id: beaconId,
                        area: beacon.area,
                        floorplan: beacon.floorplan,
                        time: beacon.time,
                        dmac: beacon.dmac || beaconId, // Use beaconId as fallback for dmac
                      })
                    }
                  />
                );
              })}
        </Layer>

        {/* Always-on Area Name Labels at Pole of Inaccessibility (with strict boundary constraint & word wrapping) */}
        <Layer listening={false}>
          {showAreas &&
            areas.map((area: MaskedAreaType) => {
              const info = areaLabelInfos[area.id];
              if (!info || !info.show || !area.name) return null;

              return (
                <Text
                  key={`area-label-${area.id}`}
                  x={info.cx - info.maxTextWidth / 2}
                  y={info.cy - (info.fontSize * 1.2) / 2}
                  width={info.maxTextWidth}
                  text={area.name}
                  fontSize={info.fontSize}
                  fontStyle="bold"
                  fill="#000000"
                  align="center"
                  verticalAlign="middle"
                  wrap="word"
                  shadowColor="#ffffff"
                  shadowBlur={6}
                  shadowOpacity={1}
                  listening={false}
                />
              );
            })}
        </Layer>
      </Stage>
    </div>
  );
};

export default DeviceRenderer;
