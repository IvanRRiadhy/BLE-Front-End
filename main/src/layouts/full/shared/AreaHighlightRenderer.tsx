import React, { useEffect, useMemo, useState } from 'react';
import { Stage, Layer, Image as KonvaImage, Line, Circle } from 'react-konva';
import { MaskedAreaType } from 'src/store/apps/crud/maskedArea';
import { alpha, darken } from '@mui/material';
import { PatrolAreaType } from 'src/store/apps/crud/patrolArea';

interface AreaHighlightRendererProps {
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  imageSrc?: string;
  maskedAreas?: MaskedAreaType[];
  highlightAreaId: string;
  patrolAreas?: PatrolAreaType[];
}

type Nodes = {
  id: string;
  x_px: number;
  y_px: number;
};

const AreaHighlightRenderer: React.FC<AreaHighlightRendererProps> = ({
  width,
  height,
  originalWidth,
  originalHeight,
  imageSrc,
  maskedAreas,
  highlightAreaId,
  patrolAreas,
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
  const maxOffsetX = 0;
  const maxOffsetY = 0;
  const minOffsetX = width - drawWidth;
  const minOffsetY = height - drawHeight;

//   const clampedOffsetX = Math.max(Math.min(offsetX, maxOffsetX), minOffsetX);
//   const clampedOffsetY = Math.max(Math.min(offsetY, maxOffsetY), minOffsetY);
  
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
  return nodes.filter((n) => n.id !== 'center').flatMap((n) => [
    n.x_px,
    n.y_px,
  ]);

  };

  const highlightedArea = useMemo(() => {
    if (maskedAreas) {
      return maskedAreas?.find((a) => a.id === highlightAreaId);
    } else if (patrolAreas) {
      return patrolAreas?.find((a) => a.id === highlightAreaId);
    }
    return null;
  }, [maskedAreas, patrolAreas, highlightAreaId]);
  

const viewportWidth = width;
const viewportHeight = height;

let stageScale = 1;
let stageX = 0;
let stageY = 0;

if (highlightedArea?.nodes?.length) {
  const xs = highlightedArea.nodes.map((n) => n.x_px);
  const ys = highlightedArea.nodes.map((n) => n.y_px);

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const areaWidth = maxX - minX;
  const areaHeight = maxY - minY;

  const padding = 50;

  const scaleX = viewportWidth / (areaWidth + padding * 2);
  const scaleY = viewportHeight / (areaHeight + padding * 2);

  stageScale = Math.min(scaleX, scaleY);

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  stageX = viewportWidth / 2 - centerX * stageScale;
  stageY = viewportHeight / 2 - centerY * stageScale;
}

  return (
<Stage
  width={viewportWidth}
  height={viewportHeight}
>
  <Layer
    x={stageX}
    y={stageY}
    scaleX={stageScale}
    scaleY={stageScale}
  >
        {/* Base floorplan image */}
{image && (
  <KonvaImage
    image={image}
    width={originalWidth}
    height={originalHeight}
    onClick={() => console.log("Image: ", image,)}
  />
)}

        {/* Filled masked areas */}
        {(maskedAreas && maskedAreas.length > 0) ? maskedAreas?.map((area) => (
          <Line
            key={area.id}
            points={setPointsFromNodes(area.nodes)}
            stroke={area.colorArea}
            strokeWidth={5}
            lineJoin="round"
            lineCap="round"
            closed
            fill={area.id === highlightAreaId ? alpha(area.colorArea, 0.2): 'transparent'}
            opacity={0.5}
            listening={false}
          />
        )) : null}
        
        {(patrolAreas && patrolAreas.length > 0) ? patrolAreas?.map((area) => (
          <Line
            key={area.id}
            points={setPointsFromNodes(area.nodes)}
            stroke={area.color}
            strokeWidth={5}
            lineJoin="round"
            lineCap="round"
            closed
            fill={area.id === highlightAreaId ? alpha(area.color, 0.2): 'transparent'}
            opacity={0.5}
            listening={false}
          />
        )) : null}

      </Layer>
    </Stage>
  );
};

export default AreaHighlightRenderer;
