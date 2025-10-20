import React, { useEffect, useState } from 'react';
import { Stage, Layer, Image as KonvaImage, Line, Circle } from 'react-konva';
import { MaskedAreaType } from 'src/store/apps/crud/maskedArea';
import { darken } from '@mui/material';
import TrackingPositionMarker from './TrackingPositionMarker';

interface TrackingPositionRendererProps {
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  imageSrc?: string;
  maskedAreas: MaskedAreaType[];
  positionPxX: number;
  positionPxY: number;
  visitorId?: string;
  memberId?: string;
  markerColor?: string;
}

type Nodes = {
  id: string;
  x_px: number;
  y_px: number;
};

const TrackingPositionRenderer: React.FC<TrackingPositionRendererProps> = ({
  width,
  height,
  originalWidth,
  originalHeight,
  imageSrc,
  maskedAreas,
  positionPxX,
  positionPxY,
  visitorId,
  memberId,
  markerColor,
}) => {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  const imageRatio = originalWidth / originalHeight;
  const containerRatio = width / height;

  let drawWidth = width;
  let drawHeight = height;
  if (imageRatio > containerRatio) {
    drawHeight = width / imageRatio;
  } else {
    drawWidth = height * imageRatio;
  }

  const scaleX = drawWidth / originalWidth;
  const scaleY = drawHeight / originalHeight;

  // Center offset logic
  const offsetX = width / 2 - positionPxX * scaleX;
  const offsetY = height / 2 - positionPxY * scaleY;
  const maxOffsetX = 0;
  const maxOffsetY = 0;
  const minOffsetX = width - drawWidth;
  const minOffsetY = height - drawHeight;

  const clampedOffsetX = Math.max(Math.min(offsetX, maxOffsetX), minOffsetX);
  const clampedOffsetY = Math.max(Math.min(offsetY, maxOffsetY), minOffsetY);

  // Load image
  useEffect(() => {
    if (imageSrc) {
      const img = new window.Image();
      img.src = imageSrc;
      img.onload = () => setImage(img);
    }
    // console.log("Size", width, height);
  }, [imageSrc]);

  const setPointsFromNodes = (nodes: Nodes[] | undefined): number[] => {
    if (!nodes?.length) return [];
    return nodes.flatMap((n) => [
      (n.x_px / originalWidth) * width,
      (n.y_px / originalHeight) * height,
    ]);
  };

  // Convert pixel coordinates to canvas coordinates
  const toCanvasX = (x_px: number) => (x_px / originalWidth) * width;
  const toCanvasY = (y_px: number) => (y_px / originalHeight) * height;

  return (
    <Stage
      width={width}
      height={height}
      x={clampedOffsetX}
      y={clampedOffsetY}
      scaleX={scaleX}
      scaleY={scaleY}
      style={{ position: 'absolute', top: 0, left: 0 }}
    >
      <Layer>
        {/* Base floorplan image */}
        {image && <KonvaImage image={image} width={width} height={height} />}

        {/* Filled masked areas */}
        {maskedAreas.map((area) => (
          <Line
            key={area.id}
            points={setPointsFromNodes(area.nodes)}
            stroke={darken(area.colorArea, 0.5)}
            strokeWidth={3}
            closed
            fill={area.colorArea}
            opacity={0.5}
            listening={false}
          />
        ))}

        {/* Red tracking marker */}
        <TrackingPositionMarker
          x={toCanvasX(positionPxX)}
          y={toCanvasY(positionPxY)}
          visitorId={visitorId}
          memberId={memberId}
          markerColor={markerColor}
        />
      </Layer>
    </Stage>
  );
};

export default TrackingPositionRenderer;
