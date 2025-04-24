import React, { useEffect, useState } from 'react';
import { Stage, Layer, Rect, Circle, Star, Image as KonvaImage } from 'react-konva';
import { useSelector, useDispatch } from 'src/store/Store';

const Devices = [
  { id: 1, x: 250, y: 50, type: 'CCTV' },
  { id: 2, x: 20, y: 130, type: 'Reader' },
  { id: 3, x: 300, y: 300, type: 'CCTV' },
  { id: 4, x: 10, y: 200, type: 'CCTV' },
  { id: 5, x: 260, y: 200, type: 'Reader' },
  { id: 6, x: 150, y: 200, type: 'Door' },
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

  const renderDeviceShape = (device: { id: number; x: number; y: number; type: string }) => {
    switch (device.type) {
      case 'CCTV':
        return (
          <Circle
            key={device.id}
            x={device.x * scales}
            y={device.y * scales}
            radius={10}
            fill="blue"
          />
        );
      case 'Reader':
        return (
          <Rect
            key={device.id}
            x={device.x * scales}
            y={device.y * scales}
            width={20}
            height={20}
            fill="green"
          />
        );
      case 'Door':
        return (
          <Star
            key={device.id}
            x={device.x * scales}
            y={device.y * scales}
            numPoints={3}
            innerRadius={10}
            outerRadius={20}
            fill="red"
          />
        );
      default:
        return null;
    }
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
      </Layer>
    </Stage>
  );
};

export default DeviceRenderer;
