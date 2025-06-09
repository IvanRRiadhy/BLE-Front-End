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
} from 'react-konva';
import { useSelector, useDispatch } from 'src/store/Store';
import { fetchBeacon } from 'src/store/apps/tracking/Beacon';

import FaceRecog from 'src/assets/images/svgs/devices/FACE RECOGNITION FIX.svg';
import CCTVSVG from 'src/assets/images/svgs/devices/7.svg';
import GatewaySVG from 'src/assets/images/svgs/devices/BLE FIX ABU.svg';
import UnknownDevice from 'src/assets/images/masters/Devices/UnknownDevice.png';

const Devices = [
  { id: 1, x: 250, y: 50, type: 'Cctv' },
  { id: 2, x: 20, y: 130, type: 'BleReader' },
  { id: 3, x: 300, y: 300, type: 'Cctv' },
  { id: 4, x: 10, y: 200, type: 'Cctv' },
  { id: 5, x: 800, y: 50, type: 'BleReader' },
  { id: 6, x: 150, y: 200, type: 'AccessDoor' },
  { id: 7, x: 560, y: 450, type: 'BleReader' },
];

const Beacon = [
  { id: '1', x: 100, y: 100 },
  { id: '2', x: 200, y: 200 },
];

const DeviceRenderer: React.FC<{
  width: number;
  height: number;
  imageSrc?: string;
  scale: number;
}> = ({ width, height, imageSrc, scale }) => {
  const dispatch = useDispatch();
  const [scales, setScale] = useState<number>(scale);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const beaconData = useSelector((state) => state.BeaconReducer.beacons);
  useEffect(() => {
    if (imageSrc) {
      console.log('imageSrc', imageSrc);
      console.log('Width', width);
      console.log('Height', height);
      const img = new window.Image();
      img.src = imageSrc;
      img.onload = () => {
        setImage(img);
      };
    }
  }, [imageSrc]);

  const useDeviceIcon = (src: string) => {
    const [img, setImg] = useState<HTMLImageElement | null>(null);
    useEffect(() => {
      const image = new window.Image();
      image.src = src;
      image.onload = () => setImg(image);
    }, [src]);
    return img;
  };
  useEffect(() => {
    const interval = setInterval(() => {
      dispatch(fetchBeacon());
    }, 1000);
    return () => clearInterval(interval);
  }, [dispatch]);

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

  const renderDeviceShape = (device: { id: number; x: number; y: number; type: string }) => {
    let deviceIcon, width, height;
    switch (device.type) {
      case 'Cctv':
        deviceIcon = iconCCTV;
        width = 36;
        height = 36;
        break;
      case 'BleReader':
        deviceIcon = iconGateway;
        width = 40;
        height = 40;
        break;
      case 'AccessDoor':
        deviceIcon = iconFaceRecog;
        width = 50;
        height = 50;
        break;

      default:
        deviceIcon = iconUnknown;
        break;
    }
    const x = device.x * scales;
    const y = device.y * scales;
    console.log('Device coordinates:', x, y);
    return (
      deviceIcon && (
        <KonvaImage
          key={device.id}
          name="Device"
          image={deviceIcon}
          x={x} // Center the icon inside the rect
          y={y}
          width={width}
          height={height}
          listening={false}
        />
      )
    );
  };

  const renderBeacon = (beacon: { id: string; x: number; y: number }) => {
    const radius = 9;
    const triangleHeight = 10;
    const triangleWidth = 9;
    const x = beacon.x * scales;
    const y = beacon.y * scales;
    console.log('Beacon coordinates:', x, y);
    return (
      <React.Fragment key={beacon.id}>
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
        {/*Render devices*/}
        {Devices.map((device) => renderDeviceShape(device))}
        {/*Render beacons*/}
        {/* {Beacon.map((beacon) => renderBeacon(beacon))} */}
        {beaconData.map((beacon, index) => {
          if (beacon.points && Array.isArray(beacon.points) && beacon.points.length > 0) {
            return renderBeacon({
              id: beacon.beaconId,
              x: beacon.points[0].x,
              y: beacon.points[0].y,
            });
          }
          return null; // Skip rendering if no points are available
        })}
      </Layer>
    </Stage>
  );
};

export default DeviceRenderer;
