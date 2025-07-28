import React, { useRef, useEffect } from 'react';
import simpleheat from 'simpleheat';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { trackingTransType } from 'src/store/apps/crud/trackingTrans';
import DashboardCard from 'src/components/shared/DashboardCard';
import { Box } from '@mui/material';

interface HeatmapFloorplanProps {
  TrackingList: trackingTransType[];
  floorImageUrl: string;
  imageWidth: number;
  imageHeight: number;
}

const BASE_URL = 'http://192.168.1.116:5000';

const buildAggregatedHeatmapData = (TrackingList: trackingTransType[]) => {
  const map = new Map<string, { x: number; y: number; value: number }>();
  TrackingList.forEach((t) => {
    const key = `${Math.round(t.coordinatePxX)},${Math.round(t.coordinatePxY)}`;
    if (map.has(key)) {
      map.get(key)!.value++;
    } else {
      map.set(key, {
        x: Math.round(t.coordinatePxX),
        y: Math.round(t.coordinatePxY),
        value: 1,
      });
    }
  });
  return Array.from(map.values());
};

const HeatmapFloorplan: React.FC<HeatmapFloorplanProps> = ({
  TrackingList,
  floorImageUrl,
  imageWidth,
  imageHeight,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const heatmapData = buildAggregatedHeatmapData(TrackingList);

  useEffect(() => {
    if (!canvasRef.current) return;
    const heat = simpleheat(canvasRef.current);
    // Points: [x, y, value]
    heat.data(heatmapData.map((d) => [d.x, d.y, d.value]));
    heat.radius(30, 15); // radius, blur
    // Custom gradient: green -> yellow -> orange -> red
    heat.gradient({
      0.15: 'green',
      0.35: 'yellow',
      0.65: 'orange',
      0.85: 'red',
      1.0: 'darkred',
    });
    // Set max for intensity normalization
    const maxValue = Math.max(10, ...heatmapData.map((d) => d.value));
    heat.max(maxValue);
    heat.draw();
  }, [TrackingList, imageWidth, imageHeight]);

  return (
    <DashboardCard title="Heatmap">
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 400,
          maxHeight: 450,
          overflow: 'auto',
          maxWidth: '100%',
        }}
      >
          <TransformWrapper
            initialScale={1}
            
            minScale={0.5}
            maxScale={4}
            wheel={{ step: 0.1 }}
            doubleClick={{ disabled: false }}
            panning={{ disabled: false }}
            limitToBounds={true}
          >
            <TransformComponent>
              <img
                src={`${BASE_URL}${floorImageUrl}`}
                width={imageWidth}
                height={imageHeight}
                alt="Floorplan"
                style={{
                  display: 'block',
                  width: imageWidth,
                  height: imageHeight,
                  userSelect: 'none',
                }}
                draggable={false}
              />
              <canvas
                ref={canvasRef}
                width={imageWidth *2}
                height={imageHeight*2}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  pointerEvents: 'none',
                  width: imageWidth*2,
                  height: imageHeight*2,
                  zIndex: 10,
                }}
              />
            </TransformComponent>
          </TransformWrapper>
      </Box>
    </DashboardCard>
  );
};

export default HeatmapFloorplan;
