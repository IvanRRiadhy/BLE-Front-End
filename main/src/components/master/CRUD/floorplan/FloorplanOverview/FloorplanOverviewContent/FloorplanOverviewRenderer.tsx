import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { Stage, Layer, Image as KonvaImage, Text, Line, Label, Tag, Group, Rect } from 'react-konva';
import { useSelector, useDispatch, RootState } from 'src/store/Store';
import FaceRecog from 'src/assets/images/svgs/devices/FACE RECOGNITION FIX.svg';
import CCTVSVG from 'src/assets/images/svgs/devices/7.svg';
import GatewaySVG from 'src/assets/images/svgs/devices/BLE FIX ABU.svg';
import UnknownDevice from 'src/assets/images/masters/Devices/UnknownDevice.png';
import { FloorplanDeviceType } from 'src/store/apps/crud/floorplanDevice';
import { MaskedAreaType } from 'src/store/apps/crud/maskedArea';
import { alpha, darken } from '@mui/material';
import polylabel from 'polylabel';
import { GeoFencingAlarmType } from 'src/store/apps/alarmsetting/geofencing';
import { startMQTTclient } from 'src/store/apps/tracking/MQTT';
import { OverPopulatingAlarmType } from 'src/store/apps/alarmsetting/overpopulating';
import { StayOnAreaAlarmType } from 'src/store/apps/alarmsetting/stayonarea';
import { BoundaryAlarmType } from 'src/store/apps/alarmsetting/boundary';
import { PatrolAreaType } from 'src/store/apps/crud/patrolArea';

// Common node type that all area types should have
interface BaseNode {
  x_px: number;
  y_px: number;
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

function areaToPolygonRings(area: MaskedAreaType): number[][][] {
  const outer: number[][] = (area.nodes ?? []).map((n: Nodes) => [n.x_px, n.y_px]);
  const holesRaw: Nodes[][] = (area as any).holes ?? [];
  const holes: number[][][] = holesRaw.map((nodes) => nodes.map((n) => [n.x_px, n.y_px]));
  return [closeRing(outer), ...holes.map(closeRing)];
}

const getCornerNodes = (nodes?: Nodes[]) => (nodes ?? []).filter((n) => n.type === 'corner');

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

// FloorplanOverviewRenderer.tsx
type FloorplanOverviewRendererProps = {
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
  // Stage transform props (from parent)
  stageScale: number;
  stageX: number;
  stageY: number;
  stageRef?: React.RefObject<any>;
  onWheel?: (e: any) => void;
  selectedItem: string | null;
};

const FloorplanOverviewRenderer: React.FC<FloorplanOverviewRendererProps> = (props) => {
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
    stageScale,
    stageX,
    stageY,
    stageRef,
    onWheel,
    selectedItem,
  } = props;
  const dispatch = useDispatch();

  // Image state like EditAreaRenderer
  const [bgImage, setBgImage] = useState<HTMLImageElement | undefined>(undefined);
  const [previewImage, setPreviewImage] = useState<HTMLImageElement | undefined>(undefined);




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
    //   full.crossOrigin = 'anonymous';
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
    const x = device.posPxX - 20;
    const y = device.posPxY - 20;
    return (
      <Group
        key={`device-${device.id}`}
        name="device"
        onClick={(e: any) => {
          e.cancelBubble = true;
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
        {selectedItem === device.id && (
          <Rect
            x={x - 2}
            y={y - 2}
            width={44}
            height={44}
            stroke="#4caf50"
            strokeWidth={3}
            cornerRadius={4}
            listening={false}
          />
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
    // First try the generic function
    const points = setPointsFromNodes(boundaryNodes);
    if (points.length > 0) return points;

    // If that doesn't work, try to inspect the structure
    console.log('Boundary nodes structure:', boundaryNodes);

    // Return empty array if we can't extract points
    return [];
  };

  // Use the image that's actually loaded (like EditAreaRenderer)
  const imageToDraw = bgImage || previewImage;

  // Don't render if image isn't loaded yet
  if (!imageToDraw || width <= 0 || height <= 0 || originalWidth <= 0 || originalHeight <= 0) {
    return null;
  }

  return (
    <div style={{ width, height }}>
      <Stage
        pixelRatio={1}
        width={width}
        height={height}
        ref={stageRef as any}
        scaleX={stageScale}
        scaleY={stageScale}
        x={stageX}
        y={stageY}
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
                stroke={area.colorArea}
                strokeWidth={5}
                lineJoin="round"
                lineCap="round"
                closed
                fill={selectedItem === area.id ? alpha(area.colorArea, 0.25) : 'transparent'}
                opacity={0.5}
                onMouseEnter={() => setHoveredAreaId(area.id)}
                onMouseLeave={() => setHoveredAreaId((id) => (id === area.id ? null : id))}
              />
            ))}
          {showGeoFence &&
            GeoFenceAlarm.map((geofence: GeoFencingAlarmType) => (
              <Line
                key={geofence.id}
                name="geofence"
                points={setPointsFromNodes(geofence.nodes)}
                stroke={geofence.color}
                strokeWidth={5}
                lineJoin="round"
                lineCap="round"
                closed
                fill={selectedItem === geofence.id ? alpha(geofence.color, 0.2) : 'transparent'}
                fillOpacity={0.5}
                onMouseEnter={() => setHoveredAreaId(geofence.id)}
                onMouseLeave={() => setHoveredAreaId((id) => (id === geofence.id ? null : id))}
              />
            ))}
          {showOverPopulate &&
            OverPopulateAlarm.map((overpopulate: OverPopulatingAlarmType) => (
              <Line
                key={overpopulate.id}
                name="overpopulate"
                points={setPointsFromNodes(overpopulate.nodes)}
                stroke={overpopulate.color}
                strokeWidth={5}
                lineJoin="round"
                lineCap="round"
                closed
                fill={selectedItem === overpopulate.id ? alpha(overpopulate.color, 0.2) : 'transparent'}
                opacity={0.5}
                onMouseEnter={() => setHoveredAreaId(overpopulate.id)}
                onMouseLeave={() => setHoveredAreaId((id) => (id === overpopulate.id ? null : id))}
              />
            ))}
          {showStayOnArea &&
            StayOnAreaAlarm.map((stayonarea: StayOnAreaAlarmType) => (
              <Line
                key={stayonarea.id}
                name="stayonarea"
                points={setPointsFromNodes(stayonarea.nodes)}
                stroke={stayonarea.color}
                strokeWidth={5}
                lineJoin="round"
                lineCap="round"
                closed
                fill={selectedItem === stayonarea.id ? alpha(stayonarea.color, 0.2) : 'transparent'}
                opacity={0.5}
                onMouseEnter={() => setHoveredAreaId(stayonarea.id)}
                onMouseLeave={() => setHoveredAreaId((id) => (id === stayonarea.id ? null : id))}
              />
            ))}
          {showBoundary &&
            BoundaryAlarm.map((boundary: BoundaryAlarmType) => (
              <Line
                key={boundary.id}
                name="boundary"
                // Use the specific boundary handler
                points={setPointsFromBoundaryNodes(boundary.nodes)}
                stroke={boundary.color}
                strokeWidth={5}
                lineJoin="round"
                lineCap="round"
                closed
                fill={selectedItem === boundary.id ? alpha(boundary.color, 0.2) : 'transparent'}
                opacity={0.5}
                onMouseEnter={() => setHoveredAreaId(boundary.id)}
                onMouseLeave={() => setHoveredAreaId((id) => (id === boundary.id ? null : id))}
              />
            ))}
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
                  stroke={patrolArea.color}
                  strokeWidth={5}
                  lineJoin="round"
                  lineCap="round"
                  closed
                  fill={selectedItem === patrolArea.id ? alpha(patrolArea.color, 0.2) : 'transparent'}
                  opacity={0.5}
                  onMouseEnter={() => setHoveredAreaId(patrolArea.id)}
                  onMouseLeave={() => setHoveredAreaId((id) => (id === patrolArea.id ? null : id))}
                />
              );
            })}

          {/* Devices */}
          {showGates && devices.map((d: FloorplanDeviceType) => renderDeviceShape(d))}

        </Layer>

        {/* Hover label Layer (non-interactive) */}
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
    </div>
  );
};

export default FloorplanOverviewRenderer;
