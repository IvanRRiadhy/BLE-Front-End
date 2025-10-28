import React, { useEffect, useMemo, useState } from 'react';
import { Stage, Layer, Image as KonvaImage, Text, Line, Label, Tag, Group } from 'react-konva';
import { useSelector, useDispatch, RootState } from 'src/store/Store';
import { fetchBeacon, RefreshBeaconState } from 'src/store/apps/tracking/Beacon';
import BeaconRenderer from './BeaconRenderer';
import FaceRecog from 'src/assets/images/svgs/devices/FACE RECOGNITION FIX.svg';
import CCTVSVG from 'src/assets/images/svgs/devices/7.svg';
import GatewaySVG from 'src/assets/images/svgs/devices/BLE FIX ABU.svg';
import UnknownDevice from 'src/assets/images/masters/Devices/UnknownDevice.png';
import { FloorplanDeviceType } from 'src/store/apps/crud/floorplanDevice';
import { MaskedAreaType } from 'src/store/apps/crud/maskedArea';
import { darken } from '@mui/material';
import { setFocus, setScreenFloorplan } from 'src/store/apps/monitoring/layout';
import polylabel from 'polylabel';
import { GeoFencingAlarmType } from 'src/store/apps/alarmsetting/geofencing';
import { startMQTTclient } from 'src/store/apps/tracking/MQTT';
import { BASE_URL } from 'src/utils/axios';

type Nodes = {
  id: string;
  x: number;
  y: number;
  x_px: number;
  y_px: number;
};

const closeRing = (ring: number[][]) => {
  if (!ring.length) return ring;
  const [fx, fy] = ring[0];
  const [lx, ly] = ring[ring.length - 1];
  if (fx !== lx || fy !== ly) return [...ring, [fx, fy]];
  return ring;
};

function areaToPolygonRings(area: MaskedAreaType): number[][][] {
  const outer: number[][] = (area.nodes ?? []).map((n: Nodes) => [n.x_px, n.y_px]);
  const holesRaw: Nodes[][] = (area as any).holes ?? [];
  const holes: number[][][] = holesRaw.map((nodes) => nodes.map((n) => [n.x_px, n.y_px]));
  return [closeRing(outer), ...holes.map(closeRing)];
}

function toCanvas(
  x_px: number,
  y_px: number,
  width: number,
  height: number,
  originalWidth: number,
  originalHeight: number,
) {
  return {
    x: (x_px / originalWidth) * width,
    y: (y_px / originalHeight) * height,
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
  geofences: GeoFencingAlarmType[];
  showAreas: boolean;
  showGates: boolean;
  showGeoFence: boolean;
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
  // NEW:
  focusBeaconId?: string;
  onFocusPosition?: (pt: { x: number; y: number }) => void;
  focusDmac?: string;
  showOtherBeacons?: boolean;
};

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
    geofences,
    showAreas,
    showGates,
    showGeoFence,
    topic,
    detailDialogOpen,
    setDetailDialogOpen,
    openTrackDetail,
    setOpenTrackDetail,
    onSelectBeacon,
    selectedBeaconId,
    focusBeaconId,
    focusDmac,
    onFocusPosition, // NEW
    showOtherBeacons,
    screenId,
  } = props;
  const dispatch = useDispatch();
  const [image, setImage] = useState<HTMLImageElement | undefined>(undefined);
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

  const refreshTrigger = useSelector((state) => state.BeaconReducer.refreshTrigger);
  const beaconData = useSelector((state) => state.BeaconReducer.beaconsByTopic[topic]);
  const [highlightTopic, setHighlightTopic] = useState<string | null>(null);
  const [highlightedFloorplan, setHighlightedFloorplan] = useState<string | null>(null);
  const [highlightedArea, setHighlightedArea] = useState<string | null>(null);
  const floorplans = useSelector((state: RootState) => state.floorplanReducer.floorplanAll);

  // layout info to know what this screen is displaying
  const activeLayoutId = useSelector((state: RootState) => state.layoutReducer.activeLayoutId);
  const layouts = useSelector((state: RootState) =>
    state.layoutReducer.layouts.find((l) => l.id === activeLayoutId),
  );
  const thisScreen = layouts?.screens.find((s) => s.id === screenId);

  // background image
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

  console.log(
    `[DeviceRenderer] Screen ${thisScreen.display.displayOutput} switching to floorplan ${highlightedFloorplan}`,
  );

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
  useEffect(() => {
    const unsubscribe = dispatch(fetchBeacon(topic));
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [dispatch, topic]);

  useEffect(() => {
    console.log(showGeoFence);
    console.log(geofences);
  }, [showGeoFence]);

  // maintain beacon state
  useEffect(() => {
    if (!beaconData) return;
    setLastSeenBeacons((prev) => {
      const now = Date.now();
      const updated = { ...prev };
      beaconData.forEach((b: any) => {
        if (!b.point) return;
        updated[b.beaconId] = {
          x: b.point.x,
          y: b.point.y,
          lastSeen: now,
          area: b.maskedAreaName,
          floorplan: b.floorplanName,
          time: b.time,
          dmac: b.dmac,
        };
      });
      // for (const id of Object.keys(updated)) {
      //   if (now - updated[id].lastSeen > 10000) delete updated[id];
      // }
      return updated;
    });
  }, [beaconData]);

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
      const duration = Math.max(500, (distance / speed) * 500);
      console.log(`Animating beacon ${beaconId} over ${distance}m in ${duration}ms`);
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

  useEffect(() => {
    if (!focusBeaconId || !onFocusPosition) return;
    const b = animatedBeacons[focusBeaconId];
    if (!b) return;

    const canvas = toCanvas(b.x, b.y, width, height, originalWidth, originalHeight);
    onFocusPosition(canvas);
  }, [
    animatedBeacons,
    focusBeaconId,
    onFocusPosition,
    width,
    height,
    originalWidth,
    originalHeight,
  ]);

useEffect(() => {
  if (!focusBeaconId) return;

  const topic = `highlight/positions/${focusBeaconId}`;
  console.log(`[MQTT] Subscribing to highlight topic: ${topic}`);

  const unsubscribe = startMQTTclient((msg: any) => {
    if (!msg?.floorplanId || !msg?.beaconId) return;
    const payloadId = msg.beaconId;
        // console.log('[Highlight Update]', msg);

    // ✅ only accept updates from this beacon
    if (payloadId !== focusBeaconId) return;

    setHighlightedFloorplan(msg.floorplanId);
    setHighlightedArea(msg.area || null);
  }, topic);

  return () => {
    console.log(`[MQTT] Unsubscribing from ${topic}`);
    unsubscribe();
  };
}, [focusBeaconId]);

  // compute static centers for each area
  const areaCenters = useMemo(() => {
    const map: Record<string, { x: number; y: number }> = {};
    for (const area of areas) {
      const rings = areaToPolygonRings(area);
      if (!rings.length) continue;
      const [cx, cy] = polylabel(rings, 1.0);
      map[area.id] = toCanvas(cx, cy, width, height, originalWidth, originalHeight);
    }
    return map;
  }, [areas, width, height, originalWidth, originalHeight]);

  // track which area is hovered
  const [hoveredAreaId, setHoveredAreaId] = useState<string | null>(null);

  // render devices
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
    const x = (device.posPxX / originalWidth) * width - 20;
    const y = (device.posPxY / originalHeight) * height - 20;
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
          x={x - 40}
          y={y - 5}
          text={device.reader?.gmac || device.id}
          fontSize={9}
          fill="#1976d2"
          fontStyle="bold"
          width={120}
          align="center"
          listening={false}
        />
        <KonvaImage name="device" image={deviceIcon} x={x} y={y} width={40} height={40} />
      </Group>
    );
  };

  const setPointsFromNodes = (nodes: Nodes[] | undefined): number[] => {
    if (!nodes?.length) return [];
    return nodes.flatMap((n) => [
      (n.x_px / originalWidth) * width,
      (n.y_px / originalHeight) * height,
    ]);
  };

  return (
    <Stage
      width={width}
      height={height}
      style={{ position: 'absolute', top: 0, left: 0 }}
      onMouseDown={(e) => {
        const nm = (e.target && (e.target as any).name && (e.target as any).name()) || '';
        if (!['area', 'device', 'beacon'].includes(nm)) {
          dispatch(setFocus({ type: '', id: '' }));
        }
      }}
    >
      <Layer>
        {imageSrc && <KonvaImage name="background" image={imageSrc} width={width} height={height} />}

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
          geofences.map((geofence: GeoFencingAlarmType) => (
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

        {/* Devices */}
        {showGates && devices.map((d: FloorplanDeviceType) => renderDeviceShape(d))}

        {/* Beacons */}
        {Object.entries(lastSeenBeacons)
          .filter(([beaconId]) => showOtherBeacons || beaconId === focusBeaconId)
          .map(([beaconId, beacon]) => {
            const anim = animatedBeacons[beaconId] || beacon;
            return (
              <BeaconRenderer
                key={`beacon-${beaconId}`}
                id={beaconId}
                x={(anim.x / originalWidth) * width}
                y={(anim.y / originalHeight) * height}
                area={beacon.area}
                floorplan={beacon.floorplan}
                time={beacon.time}
                clickable
                detailDialogOpen={detailDialogOpen}
                setDetailDialogOpen={setDetailDialogOpen}
                openTrackDetail={openTrackDetail}
                setOpenTrackDetail={setOpenTrackDetail}
                onClick={() =>
                  onSelectBeacon({
                    id: beaconId,
                    area: beacon.area,
                    floorplan: beacon.floorplan,
                    time: beacon.time,
                    dmac: beacon.dmac,
                  })
                }
              />
            );
          })}
      </Layer>

      {/* Hover label fixed at visual center */}
      <Layer listening={false}>
        {hoveredAreaId && areaCenters[hoveredAreaId] && (
          <Label
            x={areaCenters[hoveredAreaId].x}
            y={areaCenters[hoveredAreaId].y}
            listening={false}
          >
            <Tag
              fill="rgba(0,0,0,0.75)"
              cornerRadius={4}
              pointerDirection="down"
              pointerWidth={8}
              pointerHeight={6}
            />
            <Text
              text={areas.find((a: MaskedAreaType) => a.id === hoveredAreaId)?.name || ''}
              fill="#fff"
              fontSize={16}
              padding={6}
              align="center"
              listening={false}
            />
          </Label>
        )}
      </Layer>
    </Stage>
  );
};

export default DeviceRenderer;
