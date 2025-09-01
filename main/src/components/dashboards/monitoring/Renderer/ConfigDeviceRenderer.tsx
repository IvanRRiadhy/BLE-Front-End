import React, { useEffect, useState } from 'react';
import {
  Stage,
  Layer,
  Image as KonvaImage,
  Text,
  Line,
} from 'react-konva';

import FaceRecog from 'src/assets/images/svgs/devices/FACE RECOGNITION FIX.svg';
import CCTVSVG from 'src/assets/images/svgs/devices/7.svg';
import GatewaySVG from 'src/assets/images/svgs/devices/BLE FIX ABU.svg';
import UnknownDevice from 'src/assets/images/masters/Devices/UnknownDevice.png';
import { uniqueId } from 'lodash';
import { FloorplanDeviceType } from 'src/store/apps/crud/floorplanDevice';
import { MaskedAreaType } from 'src/store/apps/crud/maskedArea';
import { darken } from '@mui/material';

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
    showGates: boolean;
  topic: string;
  focusArea?: { minX: number; maxX: number; minY: number; maxY: number } | null;
}> = ({
  width,
  height,
  originalWidth,
  originalHeight,
  imageSrc,
  devices,
  areas,
  showAreas,
    showGates,
  focusArea,
}) => {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const setPointsFromNodes = (nodes: Nodes[]): number[] => {
    // console.log('Setting nodes: ', nodes.flatMap((node) => [node.x /originalWidth * width, node.y / originalHeight * height]))
    return nodes.flatMap((node) => [
      (node.x_px / originalWidth) * width,
      (node.y_px / originalHeight) * height,
    ]); // Flatten x and y into a single array
  };

  useEffect(() => {
    if (imageSrc) {

      const img = new window.Image();
      img.src = imageSrc;
      img.onload = () => {
        setImage(img);
      };
    }
    // console.log('topic', topic);
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


  const iconCCTV = useDeviceIcon(CCTVSVG);
  const iconGateway = useDeviceIcon(GatewaySVG);
  const iconFaceRecog = useDeviceIcon(FaceRecog);
  const iconUnknown = useDeviceIcon(UnknownDevice);
  
  const focusAreaDot = (focusArea: { minX: number; maxX: number; minY: number; maxY: number } | null) => {
    console.log("focus Area: ",focusArea);
    <Line
    key={`focus-area-${uniqueId()}`}
      points={[focusArea?.minX || 0, focusArea?.minY || 0, focusArea?.maxX || 0, focusArea?.maxY || 0]}
      stroke="red"
      strokeWidth={2}
    />
  }

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
            onClick={(e) => {
              console.log(e.target?.getStage()?.getPointerPosition())
              console.log("dims : ", width, height);
              console.log("Focus Area: ", focusArea);
            }}
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
        {showGates && devices.map((device) => renderDeviceShape(device))}
        {focusArea && focusAreaDot(focusArea)}
      </Layer>
    </Stage>
  );
};

export default DeviceRenderer;
