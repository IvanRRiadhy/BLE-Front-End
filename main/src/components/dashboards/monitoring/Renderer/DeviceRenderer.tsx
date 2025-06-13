import React, { useEffect, useState } from 'react';
import {
  Stage,
  Layer,
  Rect,
  Circle,
  Star,
  Image as KonvaImage,
  RegularPolygon,
  Shape,
  Text,
  Line,
} from 'react-konva';
import { useSelector, useDispatch } from 'src/store/Store';
import { fetchBeacon } from 'src/store/apps/tracking/Beacon';

import FaceRecog from 'src/assets/images/svgs/devices/FACE RECOGNITION FIX.svg';
import CCTVSVG from 'src/assets/images/svgs/devices/7.svg';
import GatewaySVG from 'src/assets/images/svgs/devices/BLE FIX ABU.svg';
import UnknownDevice from 'src/assets/images/masters/Devices/UnknownDevice.png';
import { uniqueId } from 'lodash';
import { FloorplanDeviceType } from 'src/store/apps/crud/floorplanDevice';
import { MaskedAreaType } from 'src/store/apps/crud/maskedArea';
import { darken } from '@mui/material';

const Devices = [
  { id: 1, x: 250, y: 50, type: 'Cctv' },
  { id: 2, x: 150, y: 150, type: 'BleReader' },
  { id: 3, x: 300, y: 300, type: 'Cctv' },
  { id: 4, x: 10, y: 200, type: 'Cctv' },
  { id: 5, x: 350, y: 150, type: 'BleReader' },
  { id: 6, x: 150, y: 200, type: 'AccessDoor' },
  { id: 7, x: 550, y: 150, type: 'BleReader' },
];

const Beacon = [
  { id: '1', x: 100, y: 100 },
  { id: '2', x: 200, y: 200 },
];
type Nodes = {
  id: string;
  x: number;
  y: number;
  x_px: number;
  y_px: number;
};

const DeviceRenderer: React.FC<{
  width: number;
  height: number;
  scaleX: number;
  scaleY: number;
  originalWidth: number;
  originalHeight: number;
  imageSrc?: string;
  scale: number;
  devices: FloorplanDeviceType[];
  areas: MaskedAreaType[];
  showAreas: boolean;
  topic: string;
}> = ({
  width,
  height,
  scaleX,
  scaleY,
  originalWidth,
  originalHeight,
  imageSrc,
  scale,
  devices,
  areas,
  showAreas,
  topic,
}) => {
  const dispatch = useDispatch();
  const [scales, setScale] = useState<number>(scale);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [animatedBeacons, setAnimatedBeacons] = useState<{
    [id: string]: { x: number; y: number };
  }>({});
  const [lastSeenBeacons, setLastSeenBeacons] = useState<{
    [id: string]: { x: number; y: number; lastSeen: number };
  }>({});
  const setPointsFromNodes = (nodes: Nodes[]): number[] => {
    // console.log('Setting nodes: ', nodes.flatMap((node) => [node.x /originalWidth * width, node.y / originalHeight * height]))
    return nodes.flatMap((node) => [
      (node.x / originalWidth) * width,
      (node.y / originalHeight) * height,
    ]); // Flatten x and y into a single array
  };
  
  const beaconData = useSelector((state) => state.BeaconReducer.beaconsByTopic[topic]);
  useEffect(() => {
    if (imageSrc) {
      // console.log('imageSrc', imageSrc);
      // console.log('Width', width);
      // console.log('Height', height);
      const img = new window.Image();
      img.src = imageSrc;
      img.onload = () => {
        setImage(img);
      };
    }
    // console.log('topic', topic);
  }, [imageSrc]);
  function getLatestBeacons(beacons: any[]) {
    const latestMap = new Map<string, any>();
    beacons.forEach((beacon) => {
      const existing = latestMap.get(beacon.beaconId);
      if (!existing || new Date(beacon.time) > new Date(existing.time)) {
        latestMap.set(beacon.beaconId, beacon);
      }
    });
    return Array.from(latestMap.values());
  }
  const useDeviceIcon = (src: string) => {
    const [img, setImg] = useState<HTMLImageElement | null>(null);
    useEffect(() => {
      const image = new window.Image();
      image.src = src;
      image.onload = () => setImg(image);
    }, [src]);
    return img;
  };
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     // startMQTTclient();
  //     console.log("Fetching beacon data...");
  //     // startMQTTclient(null);
  //     // dispatch(fetchBeacon());
  //     // console.log("Fetching beacon data...", beaconData);
  //     // const latestBeacons = getLatestBeacons(beaconData);
  //   }, 1000);
  //   return () => clearInterval(interval);
  // }, [dispatch]);

useEffect(() => {
  const unsubscribe = dispatch(fetchBeacon(topic));
  return () => {
    if (typeof unsubscribe === 'function') unsubscribe();
  };
}, [dispatch, topic]);

  // useEffect(() => {
  //   if (beaconData && Array.isArray(beaconData)) {
  //     beaconData.forEach((beacon) => {
  //       console.log('Beacon points:', beacon.points);
  //     });
  //   }
  // }, [beaconData]);

  const iconCCTV = useDeviceIcon(CCTVSVG);
  const iconGateway = useDeviceIcon(GatewaySVG);
  const iconFaceRecog = useDeviceIcon(FaceRecog);
  const iconUnknown = useDeviceIcon(UnknownDevice);

  const renderDeviceShape = (device: FloorplanDeviceType) => {
    // console.log('Rendering device:', device);
    let deviceIcon, iconWidth, iconHeight;
    switch (device.type) {
      case 'Cctv':
        deviceIcon = iconCCTV;
        iconWidth = 40;
        iconHeight = 40;
        break;
      case 'BleReader':
        deviceIcon = iconGateway;
        iconWidth = 40;
        iconHeight = 40;
        break;
      case 'AccessDoor':
        deviceIcon = iconFaceRecog;
        iconWidth = 40;
        iconHeight = 40;
        break;

      default:
        deviceIcon = iconUnknown;
        iconWidth = 40;
        iconHeight = 40;
        break;
    }

    const x = (device.posPxX / originalWidth) * width - iconWidth / 2;
    const y = (device.posPxY / originalHeight) * height - iconHeight / 2;
    // console.log('Device coordinates:', x, y, scaleX, scaleY);
    // console.log('Device Position:', device.posPxX, device.posPxY);
    // console.log('image dimensions:', width, height);
    return (
      deviceIcon && (
        <React.Fragment key={`device-${device.id}-${uniqueId()}`}>
          <Text
            x={x - 40} // Center the text above the icon
            y={y - 5} // Position text above the icon
            text={device.reader?.gmac || device.id}
            fontSize={9}
            fill="#1976d2"
            fontStyle="bold"
            width={120}
            align="center"
          />
          <KonvaImage
            key={device.id}
            name="Device"
            image={deviceIcon}
            x={x} // Center the icon inside the rect
            y={y}
            width={iconWidth}
            height={iconHeight}
            listening={false}
          />
        </React.Fragment>
      )
    );
  };

  const renderBeacon = (beacon: { id: string; x: number; y: number }) => {
    // console.log('Rendering beacon:', beacon);
    const radius = 9;
    const triangleHeight = 10;
    const triangleWidth = 9;
    const x = beacon.x; // Scale the x coordinate
    const y = beacon.y;
    const key = `beacon-${beacon.id}-${uniqueId()}`;
    // console.log('Beacon coordinates:', x, y);
    return (
      <React.Fragment key={key}>
        {/* Circle */}
        <Text
          x={x - 55}
          y={y - triangleHeight - radius - 30}
          text={beacon.id}
          fontSize={14}
          fill="#1976d2"
          fontStyle="bold"
          width={120}
          align="center"
        />
        <Circle
          x={x}
          y={y - triangleHeight - radius}
          radius={radius}
          fill="#1976d2"
          stroke="#fff"
          strokeWidth={3}
          shadowBlur={3}
        />
        {/* Downward-pointing triangle */}
        <Shape
          x={x}
          y={y - triangleHeight}
          sceneFunc={(context, shape) => {
            context.beginPath();
            // Start from bottom left
            context.moveTo(0, triangleHeight);
            // Line to bottom right
            context.lineTo(radius * 0.7, 0);
            // Curved line across the top (matching circle curvature)
            context.quadraticCurveTo(0, 5, -radius * 0.7, 0);
            // Close back to bottom point
            context.closePath();
            context.fillStrokeShape(shape);
          }}
          fill="#1976d2"
          shadowBlur={2}
        />
        {/* Optionally, you can add a placeholder for the photo here */}
      </React.Fragment>
    );
  };

  // Update lastSeenBeacons whenever beaconData changes
  useEffect(() => {
    if (!beaconData) return;

    setLastSeenBeacons((prev) => {
      const now = Date.now();
      const updated: typeof prev = { ...prev };

      // Mark all beacons from backend as seen now
      beaconData.forEach((beacon) => {
        if (beacon.point) {
          updated[beacon.beaconId] = {
            x: beacon.point.x,
            y: beacon.point.y,
            lastSeen: now,
          };
        }
      });

      // Remove beacons not seen for more than 10 seconds
      Object.keys(updated).forEach((id) => {
        if (now - updated[id].lastSeen > 10000) {
          delete updated[id];
        }
      });

      return updated;
    });
  }, [beaconData]);


  useEffect(() => {
    console.log("FloorplanID : ",topic,"Beacons : ", beaconData);
    Object.entries(lastSeenBeacons).forEach(([beaconId, beacon]) => {
      const point = { x: beacon.x, y: beacon.y };
      const prev = animatedBeacons[beaconId] || { x: point.x, y: point.y };

      if (prev.x !== point.x || prev.y !== point.y) {
        const duration = 100;
        const startX = prev.x;
        const startY = prev.y;
        const endX = point.x;
        const endY = point.y;
        const startTime = performance.now();
        function animate(now: number) {
          const elapsed = now - startTime;
          const t = Math.min(1, elapsed / duration);
          const newX = startX + (endX - startX) * t;
          const newY = startY + (endY - startY) * t;

          setAnimatedBeacons((prevState) => ({
            ...prevState,
            [beaconId]: { x: newX, y: newY },
          }));

          if (t < 1) {
            requestAnimationFrame(animate);
          }
        }
        requestAnimationFrame(animate);
      } else {
        setAnimatedBeacons((prevState) => ({
          ...prevState,
          [beaconId]: { x: point.x, y: point.y },
        }));
      }
    });
  }, [lastSeenBeacons]);

  return (
    <Stage width={width} height={height} style={{ position: 'absolute', top: 0, left: 0 }}>
      <Layer>
        {image && (
          <KonvaImage
            image={image}
            width={width}
            height={height}
            opacity={1}
            top={0}
            left={0}
            bottom={0}
            right={0}
          />
        )}
        {/* Render areas if showAreas is true */}
        {showAreas &&
          areas.map((area) => (
            <Line
              key={area.id}
              points={area.nodes ? setPointsFromNodes(area.nodes) : []}
              stroke={darken(area.colorArea, 0.5)}
              strokeWidth={5}
              lineJoin="round"
              lineCap="round"
              closed
              fill={area.colorArea}
              opacity={0.5}
            />
          ))}
        {/*Render devices*/}
        {devices.map((device) => renderDeviceShape(device))}
        {/*Render beacons*/}
        {/* {Beacon.map((beacon) => renderBeacon(beacon))} */}
        {Object.entries(lastSeenBeacons).map(([beaconId, beacon]) => {
          const anim = animatedBeacons[beaconId] || beacon;
          return renderBeacon({
            id: beaconId,
            x: (anim.x / originalWidth) * width,
            y: (anim.y / originalHeight) * height,
          });
        })}
      </Layer>
    </Stage>
  );
};

export default DeviceRenderer;
