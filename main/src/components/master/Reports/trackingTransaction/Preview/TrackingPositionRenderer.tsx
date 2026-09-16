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
  meterPerPx?: number;
  floorX?: number;
  floorY?: number;
  imageSrc?: string;
  preloadedImage?: HTMLImageElement | null;
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
  meterPerPx,
  floorX,
  floorY,
  imageSrc,
  preloadedImage,
  maskedAreas,
  positionPxX,
  positionPxY,
  visitorId,
  memberId,
  markerColor,
}) => {
  const [image, setImage] = useState<HTMLImageElement | null>(preloadedImage || null);

  useEffect(() => {
    if (preloadedImage) {
      setImage(preloadedImage);
      return;
    }
    if (imageSrc) {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.src = imageSrc;
      img.onload = () => setImage(img);
    }
  }, [imageSrc, preloadedImage]);

  const fitScale = Math.min(width / originalWidth, height / originalHeight);

  // Calculate real physical dimensions in meters (floorX / floorY represent width & length in meters, or fallback to meterPerPx * pixels)
  const realWidthMeters = floorX && floorX > 0 ? floorX : (meterPerPx ?? 0.05) * originalWidth;
  const realHeightMeters = floorY && floorY > 0 ? floorY : (meterPerPx ?? 0.05) * originalHeight;
  const maxPhysicalMeters = Math.max(realWidthMeters, realHeightMeters);

  // Human / beacon size benchmark: average human shoulder/standing width is ~0.6m to 1m.
  // When rendered at default fitScale, calculate how many meters 1 pixel on screen represents:
  // renderedMetersPerPixel = maxPhysicalMeters / (Math.max(originalWidth, originalHeight) * fitScale)
  // Standard pin radius is 8px (~16px diameter).
  // If the physical area is so large (> 25 meters, or pin diameter represents > 2 meters physically), it is a large floorplan requiring auto-zoom.
  const isLargeFloorplan = maxPhysicalMeters >= 25;

  const zoomFactor = isLargeFloorplan ? 1.8 : 1.0;
  const scaleX = fitScale * zoomFactor;
  const scaleY = fitScale * zoomFactor;

  const drawWidth = originalWidth * scaleX;
  const drawHeight = originalHeight * scaleY;

  // Center offset logic
  let offsetX = (width - drawWidth) / 2;
  let offsetY = (height - drawHeight) / 2;

  // If considered a large floorplan, auto-focus/center on target position
  if (isLargeFloorplan) {
    const targetOffsetX = width / 2 - positionPxX * scaleX;
    const targetOffsetY = height / 2 - positionPxY * scaleY;

    const minOffsetX = width - drawWidth;
    const minOffsetY = height - drawHeight;

    offsetX = Math.max(Math.min(targetOffsetX, 0), minOffsetX);
    offsetY = Math.max(Math.min(targetOffsetY, 0), minOffsetY);
  }

  const setPointsFromNodes = (nodes: Nodes[] | undefined): number[] => {
    if (!nodes?.length) return [];
    return nodes.flatMap((n) => [
      (n.x_px / originalWidth) * drawWidth,
      (n.y_px / originalHeight) * drawHeight,
    ]);
  };

  const toCanvasX = (x_px: number) => (x_px / originalWidth) * drawWidth;
  const toCanvasY = (y_px: number) => (y_px / originalHeight) * drawHeight;

  return (
    <Stage
      width={width}
      height={height}
      x={offsetX}
      y={offsetY}
      style={{ position: 'absolute', top: 0, left: 0 }}
    >
      <Layer>
        {/* Base floorplan image */}
        {image && <KonvaImage image={image} width={drawWidth} height={drawHeight} />}

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

        {/* Red tracking marker (animated pin) */}
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
