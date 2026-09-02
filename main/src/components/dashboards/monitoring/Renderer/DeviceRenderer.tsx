import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { Stage, Layer, Image as KonvaImage, Text, Line, Label, Tag, Group, Circle } from 'react-konva';
import { useSelector, useDispatch, RootState } from 'src/store/Store';
import {
  fetchBeacon,
  RefreshBeaconState,
  cleanupTopicBeacons,
  AlarmLogItem,
} from 'src/store/apps/tracking/Beacon';
import BeaconRenderer, { preloadImage } from './BeaconRenderer';
import FaceRecog from 'src/assets/images/svgs/devices/FACE RECOGNITION FIX.svg';
import CCTVSVG from 'src/assets/images/svgs/devices/7.svg';
import GatewaySVG from 'src/assets/images/svgs/devices/BLE FIX ABU.svg';
import UnknownDevice from 'src/assets/images/masters/Devices/UnknownDevice.png';
import { FloorplanDeviceType } from 'src/store/apps/crud/floorplanDevice';
import { MaskedAreaType, parseTextBox } from 'src/store/apps/crud/maskedArea';
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

/**
 * Extract an array of { x, y } points from area nodes
 */
function getAreaPoints(nodes?: any[]): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  if (nodes && Array.isArray(nodes)) {
    for (const n of nodes) {
      const p = getNodePx(n);
      if (p) pts.push({ x: p[0], y: p[1] });
    }
  }
  return pts;
}

/**
 * Calculates all X intersections of a horizontal line at `y` with a polygon.
 */
function getPolygonHorizontalIntersections(y: number, pts: { x: number; y: number }[]): number[] {
  const xs: number[] = [];
  const n = pts.length;
  if (n < 3) return xs;
  for (let i = 0; i < n; i++) {
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    if ((p1.y <= y && p2.y > y) || (p2.y <= y && p1.y > y)) {
      const intersectX = p1.x + ((y - p1.y) * (p2.x - p1.x)) / (p2.y - p1.y);
      xs.push(intersectX);
    }
  }
  xs.sort((a, b) => a - b);
  return xs;
}

/**
 * Calculates all Y intersections of a vertical line at `x` with a polygon.
 */
function getPolygonVerticalIntersections(x: number, pts: { x: number; y: number }[]): number[] {
  const ys: number[] = [];
  const n = pts.length;
  if (n < 3) return ys;
  for (let i = 0; i < n; i++) {
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    if ((p1.x <= x && p2.x > x) || (p2.x <= x && p1.x > x)) {
      const intersectY = p1.y + ((x - p1.x) * (p2.y - p1.y)) / (p2.x - p1.x);
      ys.push(intersectY);
    }
  }
  ys.sort((a, b) => a - b);
  return ys;
}

/**
 * Finds the segment pair [left, right] that contains the query value, or the closest segment pair.
 */
function findContainingOrClosestInterval(query: number, intersections: number[]): [number, number] | null {
  if (intersections.length < 2) return null;
  for (let i = 0; i < intersections.length - 1; i += 2) {
    const left = intersections[i];
    const right = intersections[i + 1];
    if (query >= left && query <= right) {
      return [left, right];
    }
  }
  let bestDist = Infinity;
  let bestInterval: [number, number] = [intersections[0], intersections[1]];
  for (let i = 0; i < intersections.length - 1; i += 2) {
    const left = intersections[i];
    const right = intersections[i + 1];
    const dist = query < left ? left - query : query - right;
    if (dist < bestDist) {
      bestDist = dist;
      bestInterval = [left, right];
    }
  }
  return bestInterval;
}

function isPointInPolygon(point: { x: number; y: number }, polygon: { x: number; y: number }[]): boolean {
  if (!polygon || polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    const intersect = ((yi > point.y) !== (yj > point.y))
        && (point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

interface TextBoxFit {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Computes the constrained bounding box for a textbox inside a polygon:
 * - Keeps standard width (120px) whenever possible.
 * - If the center is too close to a polygon boundary (accounting for diagonal lines),
 *   shifts the center inward so edges touch the border without overflowing.
 * - Constrains vertical height to the polygon boundaries so text line overflows can be truncated with ellipsis.
 */
function computeFittedTextBox(
  targetCenterX: number,
  targetCenterY: number,
  fontSize: number,
  pts: { x: number; y: number }[],
  targetWidth = 120,
  padding = 4,
  maxBoxHeight?: number,
): TextBoxFit {
  const defaultHeight = maxBoxHeight || Math.max(fontSize * 2.4, 28);
  const defaultHalfH = defaultHeight / 2;

  if (!pts || pts.length < 3) {
    return {
      x: targetCenterX - targetWidth / 2,
      y: targetCenterY - defaultHalfH,
      width: targetWidth,
      height: defaultHeight,
    };
  }

  // 1. Determine vertical bounds at targetCenterX
  const vIntersects = getPolygonVerticalIntersections(targetCenterX, pts);
  const vInterval = findContainingOrClosestInterval(targetCenterY, vIntersects);

  let topBound = -Infinity;
  let bottomBound = Infinity;

  if (vInterval) {
    topBound = vInterval[0] + padding;
    bottomBound = vInterval[1] - padding;
  } else {
    const ys = pts.map((p) => p.y);
    topBound = Math.min(...ys) + padding;
    bottomBound = Math.max(...ys) - padding;
  }

  // Clamp targetCenterY inside vertical bounds
  let cy = targetCenterY;
  const minRequiredHalfH = (fontSize * 1.2) / 2;
  if (bottomBound - topBound > minRequiredHalfH * 2) {
    cy = Math.max(topBound + minRequiredHalfH, Math.min(bottomBound - minRequiredHalfH, cy));
  } else {
    cy = (topBound + bottomBound) / 2;
  }

  // Sample across vertical span to account for diagonal polygon edges
  const estHalfH = Math.min(
    Math.max((fontSize * 2.2) / 2, 14),
    Math.max(minRequiredHalfH, (bottomBound - topBound) / 2),
  );
  const ySamples = [
    cy - estHalfH,
    cy - estHalfH * 0.5,
    cy,
    cy + estHalfH * 0.5,
    cy + estHalfH,
  ];

  // 2. Find horizontal bounds across all Y samples (strictest left and strictest right)
  let strictLeft = -Infinity;
  let strictRight = Infinity;
  let validSampleCount = 0;

  for (const y of ySamples) {
    const clampedY = Math.max(topBound, Math.min(bottomBound, y));
    const hIntersects = getPolygonHorizontalIntersections(clampedY, pts);
    const hInterval = findContainingOrClosestInterval(targetCenterX, hIntersects);
    if (hInterval) {
      strictLeft = Math.max(strictLeft, hInterval[0] + padding);
      strictRight = Math.min(strictRight, hInterval[1] - padding);
      validSampleCount++;
    }
  }

  if (validSampleCount === 0 || strictRight <= strictLeft) {
    const hIntersects = getPolygonHorizontalIntersections(cy, pts);
    const hInterval = findContainingOrClosestInterval(targetCenterX, hIntersects);
    if (hInterval && hInterval[1] > hInterval[0]) {
      strictLeft = hInterval[0] + padding;
      strictRight = hInterval[1] - padding;
    } else {
      const xs = pts.map((p) => p.x);
      strictLeft = Math.min(...xs) + padding;
      strictRight = Math.max(...xs) - padding;
    }
  }

  const availableWidth = Math.max(20, strictRight - strictLeft);
  let finalWidth = targetWidth;
  let finalCenterX = targetCenterX;

  if (availableWidth >= targetWidth) {
    finalWidth = targetWidth;
    const halfW = targetWidth / 2;
    // Shift center inward if too close to border
    if (finalCenterX - halfW < strictLeft) {
      finalCenterX = strictLeft + halfW;
    }
    if (finalCenterX + halfW > strictRight) {
      finalCenterX = strictRight - halfW;
    }
  } else {
    // Narrow polygon region
    finalWidth = availableWidth;
    finalCenterX = strictLeft + availableWidth / 2;
  }

  const finalX = finalCenterX - finalWidth / 2;

  // 3. Check vertical bounds across horizontal extent [finalX, finalX + finalWidth]
  const xSamples = [finalX, finalX + finalWidth / 2, finalX + finalWidth];
  let finalStrictTop = -Infinity;
  let finalStrictBottom = Infinity;

  for (const x of xSamples) {
    const vInts = getPolygonVerticalIntersections(x, pts);
    const vInt = findContainingOrClosestInterval(cy, vInts);
    if (vInt) {
      finalStrictTop = Math.max(finalStrictTop, vInt[0] + padding);
      finalStrictBottom = Math.min(finalStrictBottom, vInt[1] - padding);
    }
  }

  if (finalStrictBottom <= finalStrictTop) {
    finalStrictTop = topBound;
    finalStrictBottom = bottomBound;
  }

  const availableHeight = Math.max(fontSize * 1.2, finalStrictBottom - finalStrictTop);
  let finalHeight = maxBoxHeight ? Math.min(maxBoxHeight, availableHeight) : Math.min(defaultHeight * 2, availableHeight);
  let finalY = cy - finalHeight / 2;

  if (finalY < finalStrictTop) {
    finalY = finalStrictTop;
  }
  if (finalY + finalHeight > finalStrictBottom) {
    finalY = Math.max(finalStrictTop, finalStrictBottom - finalHeight);
    finalHeight = finalStrictBottom - finalY;
  }

  return {
    x: Math.round(finalX),
    y: Math.round(finalY),
    width: Math.round(finalWidth),
    height: Math.max(Math.round(fontSize * 1.2), Math.round(finalHeight)),
  };
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
  showAreaName?: boolean;
  showOccupancy?: boolean;
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
  followingPersons?: any[];
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
    showAreaName = true,
    showOccupancy = true,
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
  const appId = localStorage.getItem('applicationId') || '';
  const iconTypeSetting = useSelector((state: RootState) => state.settings.beaconIconType || 'person');
  const trackingMode = useSelector((state: RootState) => state.settings.trackingMode || 'Live');
  const [, setPhotoLoadVersion] = useState(0);

  // Preload photos only when photo icon mode or Count tracking mode is active
  useEffect(() => {
    if (iconTypeSetting !== 'photo' && trackingMode !== 'Count') return;
    let isMounted = true;

    const handleLoaded = () => {
      if (!isMounted) return;
      setPhotoLoadVersion((v) => v + 1);
    };

    membersData.forEach((m) => {
      if (m.faceImage) preloadImage(m.faceImage, handleLoaded);
    });
    visitorsData.forEach((v) => {
      if (v.faceImage) preloadImage(v.faceImage, handleLoaded);
    });
    securityData.forEach((s) => {
      if (s.faceImage) preloadImage(s.faceImage, handleLoaded);
    });

    return () => {
      isMounted = false;
    };
  }, [iconTypeSetting, trackingMode, membersData, visitorsData, securityData]);

  // Create a memoized lookup map of bleCardNumber -> person info for O(1) performance
  const beaconPersonMap = useMemo(() => {
    const map = new Map<
      string,
      {
        label: string;
        isSecurity: boolean;
        isMember: boolean;
        isVisitor: boolean;
        faceImage?: string;
      }
    >();

    membersData.forEach((m) => {
      if (m.bleCardNumber) {
        map.set(m.bleCardNumber, {
          label: m.name || m.bleCardNumber,
          isSecurity: false,
          isMember: true,
          isVisitor: false,
          faceImage: m.faceImage,
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
          faceImage: v.faceImage,
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
          faceImage: s.faceImage,
        });
      }
    });

    return map;
  }, [membersData, visitorsData, securityData]);

  // Image state like EditAreaRenderer
  const [bgImage, setBgImage] = useState<HTMLImageElement | undefined>(undefined);
  const [previewImage, setPreviewImage] = useState<HTMLImageElement | undefined>(undefined);
  const alarmData = useSelector((state: RootState) => state.BeaconReducer.alarmLogs);
  const countingData = useSelector((state: RootState) => state.BeaconReducer.countingData);
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

  const FollowingPerson = useSelector((state: RootState) => state.layoutReducer.followingPerson);
  const FollowingPersons = useSelector((state: RootState) => state.layoutReducer.followingPersons ?? []);

  const followedSet = useMemo(() => {
    const set = new Set<string>();
    if (focusBeaconId) set.add(focusBeaconId.toLowerCase());
    if (focusDmac) set.add(focusDmac.toLowerCase());

    const activeList = (FollowingPersons && FollowingPersons.length > 0)
      ? FollowingPersons
      : (FollowingPerson ? [FollowingPerson] : []);

    activeList.forEach((p: any) => {
      if (!p) return;
      const card = p.bleCardNumber || p.cardNumber || p.id || p.personId;
      if (card) set.add(String(card).toLowerCase());
    });

    return set;
  }, [focusBeaconId, focusDmac, FollowingPersons, FollowingPerson]);

  const checkIsFollowed = useCallback((beaconId: string, beacon?: any) => {
    if (!beaconId) return false;
    const lowerId = String(beaconId).toLowerCase();
    if (followedSet.has(lowerId)) return true;
    if (beacon?.dmac && followedSet.has(String(beacon.dmac).toLowerCase())) return true;
    return false;
  }, [followedSet]);

  // layout info to know what this screen is displaying
  const activeLayoutId = useSelector((state: RootState) => state.layoutReducer.activeLayoutId);
  const layouts = useSelector((state: RootState) =>
    state.layoutReducer.layouts.find((l: LayoutSet) => l.id === activeLayoutId),
  );
  const thisScreen = layouts?.screens.find((s: ScreenItem) => s.id === screenId);

  const animatedBeaconsRef = useRef<{ [id: string]: { x: number; y: number } }>({});
  const animTargetsRef = useRef<{
    [id: string]: {
      startX: number;
      startY: number;
      endX: number;
      endY: number;
      startTime: number;
      duration: number;
      pending?: { x: number; y: number };
    };
  }>({});
  const masterFrameRef = useRef<number | null>(null);

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
        `Topic changed from ${prevTopicRef.current} to ${topic}, resetting beacons`,
      );
      if (masterFrameRef.current) {
        cancelAnimationFrame(masterFrameRef.current);
        masterFrameRef.current = null;
      }
      animTargetsRef.current = {};
      animatedBeaconsRef.current = {};
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

    // Do NOT auto-change floorplan if following multiple people
    const activeFollowed = (FollowingPersons && FollowingPersons.length > 0)
      ? FollowingPersons
      : (FollowingPerson ? [FollowingPerson] : []);

    if (activeFollowed.length > 1) {
      return;
    }

    // ✅ Only the follow screen for this beacon updates floorplan
    if (thisScreen.display.displayOutput?.toLowerCase() !== focusBeaconId?.toLowerCase()) return;

    dispatch(
      setScreenFloorplan({
        layoutId: activeLayoutId,
        screenId: thisScreen.id,
        floorplanId: highlightedFloorplan,
      }),
    );
  }, [highlightedFloorplan, activeLayoutId, thisScreen, dispatch, focusBeaconId, FollowingPersons, FollowingPerson]);

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

  // maintain beacon state from Redux data
  useEffect(() => {
    if (!beaconData || beaconData.length === 0) {
      setLastSeenBeacons((prev) => (Object.keys(prev).length === 0 ? prev : {}));
      return;
    }

    setLastSeenBeacons((prev) => {
      let hasChanges = false;
      const updated = { ...prev };

      beaconData.forEach((b: any) => {
        if (!b.point) return;

        const beaconId = b.beaconId;
        const dmac = beaconId;
        const lastSeenTime = b.lastSeen || (b.time ? new Date(b.time).getTime() : 0);

        const existing = prev[beaconId];
        if (
          !existing ||
          existing.x !== b.point.x ||
          existing.y !== b.point.y ||
          existing.lastSeen !== lastSeenTime ||
          existing.area !== (b.maskedAreaName || '')
        ) {
          hasChanges = true;
          updated[beaconId] = {
            x: b.point.x,
            y: b.point.y,
            lastSeen: lastSeenTime,
            area: b.maskedAreaName || '',
            floorplan: b.floorplanName || '',
            time: b.time || '',
            dmac: dmac,
          };
        }
      });

      // Clean up beacons that are no longer in Redux data
      Object.keys(updated).forEach((beaconId) => {
        if (!beaconData.find((b: any) => b.beaconId === beaconId)) {
          hasChanges = true;
          delete updated[beaconId];
        }
      });

      return hasChanges ? updated : prev;
    });
  }, [beaconData, topic]);

  // animate beacons using a single unified master RAF loop for physics & macrotask ticker for React state
  useEffect(() => {
    // 0. Clean up tracking/animation refs for beacons that disappeared
    const currentBeaconIds = new Set(Object.keys(lastSeenBeacons));
    Object.keys(animatedBeaconsRef.current).forEach((beaconId) => {
      if (!currentBeaconIds.has(beaconId)) {
        delete animatedBeaconsRef.current[beaconId];
        delete animTargetsRef.current[beaconId];
      }
    });

    // 1. Process incoming lastSeenBeacons targets
    Object.entries(lastSeenBeacons).forEach(([beaconId, beacon]) => {
      const point = { x: beacon.x, y: beacon.y };
      const currentPos = animatedBeaconsRef.current[beaconId];

      // If beacon was not previously tracked/animated (new or re-appeared after disappearing),
      // snap directly to detected position without animating from stale/initial coordinates
      if (!currentPos) {
        animatedBeaconsRef.current[beaconId] = point;
        return;
      }

      if (currentPos.x === point.x && currentPos.y === point.y) {
        return;
      }

      const activeAnim = animTargetsRef.current[beaconId];
      if (activeAnim) {
        // Queue pending target position if animation is currently active
        activeAnim.pending = point;
      } else {
        // Launch new animation trajectory
        const startX = currentPos.x;
        const startY = currentPos.y;
        const endX = point.x;
        const endY = point.y;
        const distX = endX - startX;
        const distY = endY - startY;
        const distance = Math.sqrt(distX * distX + distY * distY);
        const speed = 2 / meterPx;
        const duration = Math.min(Math.max(500, (distance / speed) * 500), 2000);
        // const duration = 0.001;

        animTargetsRef.current[beaconId] = {
          startX,
          startY,
          endX,
          endY,
          startTime: performance.now(),
          duration,
        };
      }
    });

    const masterLoop = (now: number) => {
      const activeIds = Object.keys(animTargetsRef.current);

      if (activeIds.length === 0) {
        masterFrameRef.current = null;
        return;
      }

      activeIds.forEach((beaconId) => {
        const anim = animTargetsRef.current[beaconId];
        if (!anim) return;

        const t = Math.min(1, (now - anim.startTime) / anim.duration);
        const nx = anim.startX + (anim.endX - anim.startX) * t;
        const ny = anim.startY + (anim.endY - anim.startY) * t;
        animatedBeaconsRef.current[beaconId] = { x: nx, y: ny };

        if (t >= 1) {
          if (anim.pending && (anim.pending.x !== anim.endX || anim.pending.y !== anim.endY)) {
            const nextTarget = anim.pending;
            const startX = nx;
            const startY = ny;
            const endX = nextTarget.x;
            const endY = nextTarget.y;
            const distX = endX - startX;
            const distY = endY - startY;
            const distance = Math.sqrt(distX * distX + distY * distY);
            const speed = 2 / meterPx;
            const duration = Math.min(Math.max(500, (distance / speed) * 500), 2000);

            animTargetsRef.current[beaconId] = {
              startX,
              startY,
              endX,
              endY,
              startTime: now,
              duration,
            };
          } else {
            delete animTargetsRef.current[beaconId];
          }
        }
      });

      if (Object.keys(animTargetsRef.current).length > 0) {
        masterFrameRef.current = requestAnimationFrame(masterLoop);
      } else {
        masterFrameRef.current = null;
      }
    };

    if (Object.keys(animTargetsRef.current).length > 0 && !masterFrameRef.current) {
      masterFrameRef.current = requestAnimationFrame(masterLoop);
    }

    return () => {
      if (masterFrameRef.current) {
        cancelAnimationFrame(masterFrameRef.current);
        masterFrameRef.current = null;
      }
    };
  }, [lastSeenBeacons, meterPx]);

  // Isolated macrotask ticker for React state updates (completely decouples setState from RAF frame callbacks)
  useEffect(() => {
    let timeoutId: any = null;

    const syncState = () => {
      const activeCount = Object.keys(animTargetsRef.current).length;

      setAnimatedBeacons({ ...animatedBeaconsRef.current });

      if (activeCount > 0) {
        timeoutId = setTimeout(syncState, 50); // 20 FPS state update pass
      } else {
        timeoutId = null;
      }
    };

    if (Object.keys(animTargetsRef.current).length > 0) {
      syncState();
    } else {
      setAnimatedBeacons({ ...animatedBeaconsRef.current });
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [lastSeenBeacons]);

  useEffect(() => {
    if (!refreshTrigger) return;
    dispatch(RefreshBeaconState());
    if (masterFrameRef.current) {
      cancelAnimationFrame(masterFrameRef.current);
      masterFrameRef.current = null;
    }
    animTargetsRef.current = {};
    animatedBeaconsRef.current = {};
    setLastSeenBeacons({});
    setAnimatedBeacons({});
  }, [refreshTrigger, dispatch]);

  const lastReportedFocusPosRef = useRef<{ x: number; y: number } | null>(null);

  // Convert beacon position from meters to pixels for focus position
  useEffect(() => {
    if (!focusBeaconId || !onFocusPosition) return;
    const b = animatedBeacons[focusBeaconId] || animatedBeaconsRef.current[focusBeaconId];
    if (!b) return;

    const xPx = b.x;
    const yPx = b.y;

    const prev = lastReportedFocusPosRef.current;
    if (prev && Math.abs(prev.x - xPx) < 0.5 && Math.abs(prev.y - yPx) < 0.5) {
      return;
    }

    lastReportedFocusPosRef.current = { x: xPx, y: yPx };
    onFocusPosition({ x: xPx, y: yPx });
  }, [animatedBeacons, focusBeaconId, onFocusPosition]);

  useEffect(() => {
    if (!focusBeaconId) return;

    const topic = `people_tracking/${appId.toUpperCase()}/highlight/positions/${focusBeaconId}`;
    console.log(`[MQTT] Subscribing to highlight topic: ${topic}`);

    const unsubscribe = startMQTTclient((msg: any) => {
      if (!msg?.floorplanId || !msg?.beaconId) return;
      const payloadId = msg.beaconId;

      if (payloadId !== focusBeaconId) return;

      const activeFollowed = (FollowingPersons && FollowingPersons.length > 0)
        ? FollowingPersons
        : (FollowingPerson ? [FollowingPerson] : []);

      if (activeFollowed.length <= 1) {
        setHighlightedFloorplan(msg.floorplanId);
      }
      setHighlightedArea(msg.area || null);
    }, topic);

    return () => {
      console.log(`[MQTT] Unsubscribing from ${topic}`);
      unsubscribe();
    };
  }, [focusBeaconId, FollowingPersons, FollowingPerson]);

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
              .filter(([beaconId, b]) => showOtherBeacons || checkIsFollowed(beaconId, b))
              .sort(([idA, bA], [idB, bB]) => {
                const isFollowedA = checkIsFollowed(idA, bA) ? 1 : 0;
                const isFollowedB = checkIsFollowed(idB, bB) ? 1 : 0;
                return isFollowedA - isFollowedB; // Followed beacons rendered last so they appear on top
              })
              .map(([beaconId, beacon]) => {
                const anim = animatedBeacons[beaconId] || beacon;
                // Convert meters to pixels for beacon position
                const xPx = anim.x;
                const yPx = anim.y;

                const now = Date.now();
                const age = now - new Date(beacon.lastSeen).getTime();
                const opacity = age > 3000 ? 0.4 : 1.0;

                // Lookup person details in O(1)
                const personInfo = beaconPersonMap.get(beaconId) || {
                  label: beaconId,
                  isSecurity: false,
                  isMember: false,
                  isVisitor: false,
                  faceImage: undefined,
                };

                const isFollowed = checkIsFollowed(beaconId, beacon);
                const loadedImg =
                  iconTypeSetting === 'photo' && personInfo.faceImage
                    ? preloadImage(personInfo.faceImage)
                    : undefined;

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
                    isFollowed={isFollowed}
                    faceImage={personInfo.faceImage}
                    loadedImage={loadedImg || undefined}
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

        {/* Always-on Area Name & Occupancy Text Labels using configured text box settings */}
        <Layer listening={false}>
          {areas.map((area: MaskedAreaType) => {
              const info = areaLabelInfos[area.id];
              const defaultCenterX = info ? info.cx : 150;
              const defaultCenterY = info ? info.cy : 150;

              const nameTb = parseTextBox(
                area.areaNameTextBox,
                { x: defaultCenterX, y: defaultCenterY - 15 },
                info?.fontSize || 16,
                '#000000',
              );

              const occTb = parseTextBox(
                area.occupancyNameTextBox,
                { x: defaultCenterX, y: defaultCenterY + 15 },
                info?.fontSize ? Math.max(10, info.fontSize - 2) : 14,
                '#000000',
              );

              let areaCount = 0;
              if (countingData?.area) {
                const areaRecord = countingData.area;
                const idKey = area.id;
                const nameKey = area.name;

                if (idKey && areaRecord[idKey] !== undefined) {
                  areaCount = areaRecord[idKey].count || 0;
                } else if (idKey && areaRecord[idKey.toLowerCase()] !== undefined) {
                  areaCount = areaRecord[idKey.toLowerCase()].count || 0;
                } else if (nameKey && areaRecord[nameKey] !== undefined) {
                  areaCount = areaRecord[nameKey].count || 0;
                } else if (nameKey && areaRecord[nameKey.toLowerCase()] !== undefined) {
                  areaCount = areaRecord[nameKey.toLowerCase()].count || 0;
                } else if (nameKey) {
                  const match = Object.values(areaRecord).find(
                    (entry: any) =>
                      entry.name &&
                      entry.name.toLowerCase().trim() === nameKey.toLowerCase().trim(),
                  );
                  if (match) {
                    areaCount = match.count || 0;
                  }
                }
              }

              const areaPts = getAreaPoints(area.nodes);

              const personsInArea: { id: string; name: string; faceImage?: string }[] = [];
              if (trackingMode === 'Count') {
                Object.entries(lastSeenBeacons).forEach(([beaconId, b]) => {
                  let inArea = false;
                  if (b.area) {
                    const bArea = b.area.toLowerCase().trim();
                    if (area.name && bArea === area.name.toLowerCase().trim()) inArea = true;
                    else if (area.id && bArea === area.id.toLowerCase().trim()) inArea = true;
                  }
                  if (!inArea && areaPts && areaPts.length >= 3 && typeof b.x === 'number' && typeof b.y === 'number') {
                    inArea = isPointInPolygon({ x: b.x, y: b.y }, areaPts);
                  }

                  if (inArea) {
                    const personInfo = beaconPersonMap.get(beaconId) || (b.dmac ? beaconPersonMap.get(b.dmac) : undefined);
                    const label = personInfo?.label || beaconId;
                    if (label) {
                      personsInArea.push({
                        id: beaconId,
                        name: label,
                        faceImage: personInfo?.faceImage,
                      });
                    }
                  }
                });
              }

              const displayCount = areaCount || (trackingMode === 'Count' ? personsInArea.length : areaCount);

              const headerHeight = Math.max(occTb.fontSize * 1.3, 18);
              const headerGap = 8;
              const avatarRadius = Math.max(7, Math.round(occTb.fontSize * 0.6));
              const itemHeight = Math.max(avatarRadius * 2, occTb.fontSize * 1.3);
              const itemGap = 5;
              const rowTotalHeight = itemHeight + itemGap;
              const maxAllowedHeight = 480;

              let visiblePersons = personsInArea;
              let remainingCount = 0;
              let occDesiredHeight: number | undefined = undefined;

              if (trackingMode === 'Count') {
                const maxListHeight = maxAllowedHeight - headerHeight - headerGap;
                const maxPossibleRows = Math.max(1, Math.floor(maxListHeight / rowTotalHeight));

                if (personsInArea.length > maxPossibleRows) {
                  const fitCount = Math.max(0, maxPossibleRows - 1);
                  visiblePersons = personsInArea.slice(0, fitCount);
                  remainingCount = personsInArea.length - fitCount;
                }

                const totalRowsCount = visiblePersons.length + (remainingCount > 0 ? 1 : 0);
                const calculatedHeight =
                  personsInArea.length === 0
                    ? headerHeight
                    : headerHeight + headerGap + totalRowsCount * rowTotalHeight - itemGap;

                occDesiredHeight = Math.min(
                  maxAllowedHeight,
                  Math.max(headerHeight * 1.5, calculatedHeight),
                );
              }

              const nameFit = computeFittedTextBox(
                nameTb.posX,
                nameTb.posY,
                nameTb.fontSize,
                areaPts,
                240,
              );

              const occFit = computeFittedTextBox(
                occTb.posX,
                occTb.posY,
                occTb.fontSize,
                areaPts,
                240,
                4,
                occDesiredHeight,
              );

              return (
                <React.Fragment key={`area-textboxes-${area.id}`}>
                  {showAreaName && area.name && (
                    <Text
                      key={`area-name-${area.id}`}
                      x={nameFit.x}
                      y={nameFit.y}
                      width={nameFit.width}
                      height={nameFit.height}
                      text={area.name}
                      fontSize={nameTb.fontSize}
                      fontStyle="bold"
                      fill={nameTb.fontColor}
                      align="center"
                      verticalAlign="middle"
                      wrap="word"
                      ellipsis={true}
                      shadowColor="#ffffff"
                      shadowBlur={6}
                      shadowOpacity={1}
                      listening={false}
                    />
                  )}
                  {showOccupancy && (
                    trackingMode === 'Count' ? (
                      <Group key={`area-occ-group-${area.id}`}>
                        {/* Header: People Count : X */}
                        <Text
                          x={occFit.x}
                          y={occFit.y}
                          width={occFit.width}
                          height={headerHeight}
                          text={`People Count : ${displayCount}`}
                          fontSize={occTb.fontSize}
                          fontStyle="bold"
                          fill={occTb.fontColor}
                          align="left"
                          verticalAlign="middle"
                          wrap="none"
                          ellipsis={true}
                          shadowColor="#ffffff"
                          shadowBlur={6}
                          shadowOpacity={1}
                          listening={false}
                        />

                        {/* Person List with faceImage Avatar & Left Justified Text */}
                        {visiblePersons.map((p, idx) => {
                          const rowY = occFit.y + headerHeight + headerGap + idx * rowTotalHeight;
                          const avatarCenterX = occFit.x + avatarRadius + 2;
                          const avatarCenterY = rowY + itemHeight / 2;
                          const textX = avatarCenterX + avatarRadius + 6;
                          const textWidth = Math.max(20, occFit.width - (avatarRadius * 2 + 10));
                          const imgObj = p.faceImage ? preloadImage(p.faceImage) : null;

                          return (
                            <Group key={`person-${p.id}-${idx}`}>
                              {imgObj ? (
                                <Circle
                                  x={avatarCenterX}
                                  y={avatarCenterY}
                                  radius={avatarRadius}
                                  fillPatternImage={imgObj}
                                  fillPatternScale={{
                                    x: (avatarRadius * 2) / imgObj.width,
                                    y: (avatarRadius * 2) / imgObj.height,
                                  }}
                                  fillPatternOffset={{
                                    x: imgObj.width / 2,
                                    y: imgObj.height / 2,
                                  }}
                                  stroke="#ffffff"
                                  strokeWidth={1}
                                  shadowColor="#000000"
                                  shadowBlur={2}
                                  shadowOpacity={0.25}
                                  listening={false}
                                />
                              ) : (
                                <Circle
                                  x={avatarCenterX}
                                  y={avatarCenterY}
                                  radius={avatarRadius}
                                  fill="#5D87FF"
                                  stroke="#ffffff"
                                  strokeWidth={1}
                                  listening={false}
                                />
                              )}

                              <Text
                                x={textX}
                                y={rowY}
                                width={textWidth}
                                height={itemHeight}
                                text={p.name}
                                fontSize={occTb.fontSize}
                                fontStyle="bold"
                                fill={occTb.fontColor}
                                align="left"
                                verticalAlign="middle"
                                wrap="none"
                                ellipsis={true}
                                shadowColor="#ffffff"
                                shadowBlur={6}
                                shadowOpacity={1}
                                listening={false}
                              />
                            </Group>
                          );
                        })}

                        {/* Overflow indicator */}
                        {remainingCount > 0 && (
                          <Text
                            x={occFit.x}
                            y={
                              occFit.y +
                              headerHeight +
                              headerGap +
                              visiblePersons.length * rowTotalHeight
                            }
                            width={occFit.width}
                            height={itemHeight}
                            text={`(+${remainingCount} more)`}
                            fontSize={Math.max(10, occTb.fontSize - 1)}
                            fontStyle="italic"
                            fill={occTb.fontColor}
                            align="left"
                            verticalAlign="middle"
                            wrap="none"
                            ellipsis={true}
                            shadowColor="#ffffff"
                            shadowBlur={6}
                            shadowOpacity={1}
                            listening={false}
                          />
                        )}
                      </Group>
                    ) : (
                      <Text
                        key={`area-occ-${area.id}`}
                        x={occFit.x}
                        y={occFit.y}
                        width={occFit.width}
                        height={occFit.height}
                        text={`People Count : ${displayCount}`}
                        fontSize={occTb.fontSize}
                        fontStyle="bold"
                        fill={occTb.fontColor}
                        align="center"
                        verticalAlign="middle"
                        wrap="word"
                        ellipsis={true}
                        shadowColor="#ffffff"
                        shadowBlur={6}
                        shadowOpacity={1}
                        listening={false}
                      />
                    )
                  )}
                </React.Fragment>
              );
            })}
        </Layer>
      </Stage>
    </div>
  );
};

export default DeviceRenderer;
