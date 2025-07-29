import React, { useRef, useEffect, useState, useMemo } from 'react';
import simpleheat from 'simpleheat';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { trackingTransType } from 'src/store/apps/crud/trackingTrans';
import DashboardCard from 'src/components/shared/DashboardCard';
import { Box, Typography } from '@mui/material';
import { floorType } from 'src/store/apps/crud/floor';
import { MaskedAreaType } from 'src/store/apps/crud/maskedArea';
import { Select, MenuItem, FormControl, InputLabel, Stack } from '@mui/material';

interface HeatmapFloorplanProps {
  TrackingList: trackingTransType[];
  Floorlist: floorType[];
  maskedAreaList: MaskedAreaType[];
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
  Floorlist,
  maskedAreaList,
  floorImageUrl,
  imageWidth,
  imageHeight,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // const heatmapData = buildAggregatedHeatmapData(TrackingList);
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<string | null>(null);
  const [selectedMaskedArea, setSelectedMaskedArea] = useState<string | null>(null);

  // Extract unique buildings from floor list
  const buildingOptions = useMemo(() => {
    const map = new Map();
    Floorlist.forEach((f) => {
      if (!map.has(f.buildingId)) {
        map.set(f.buildingId, true);
      }
    });
    return Array.from(map.keys());
  }, [Floorlist]);

  // Filter floors by selected building
  const floorOptions = useMemo(() => {
    return Floorlist.filter((f) => f.buildingId === selectedBuilding);
  }, [Floorlist, selectedBuilding]);

  // Filter maskedArea by selected floor
  const maskedAreaOptions = useMemo(() => {
    return maskedAreaList.filter((a) => a.floorId === selectedFloor);
  }, [maskedAreaList, selectedFloor]);

  // Filter tracking data
  const filteredTracking = useMemo(() => {
    if (!selectedFloor) return [];
    return TrackingList.filter((t) => {
      const inFloor =
        maskedAreaList.find((a) => a.id === t.floorplanMaskedAreaId)?.floorId === selectedFloor;
      const inArea = !selectedMaskedArea || t.floorplanMaskedAreaId === selectedMaskedArea;
      return inFloor && inArea;
    });
  }, [TrackingList, selectedFloor, selectedMaskedArea, maskedAreaList]);

  const heatmapData = buildAggregatedHeatmapData(filteredTracking);

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
          display: 'flex',
          flexDirection: 'row',
          height: '100%', // take full available height
          maxHeight: '100%', // constrain max height
          width: '100%',
          gap: 2,
        }}
      >
        {/* === Map Viewer === */}
        <Box
          sx={{
            position: 'relative',
            flex: 1,
            borderRadius: 1,
            height: 400,
            overflow: 'hidden',
            alignItems: 'flex-start', // ⬅️ align image top if using flex inside
            display: 'flex',
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
            <TransformComponent
              wrapperStyle={{
                height: '100%', // force TransformComponent wrapper to full height
                width: '100%',
                display: 'flex',
                alignItems: 'flex-start', // top-align short images
                justifyContent: 'flex-start',
                overflow: 'hidden',
              }}
              contentStyle={{
                height: 'auto',
                width: 'auto',
                position: 'relative',
              }}
            >
              {selectedFloor && (
                              <Box
                sx={{
                  position: 'relative',
                  width: 'fit-content',
                  minHeight: '100%', // 👈 keeps short images top-aligned
                  height: '100%',
                }}
              >
                <img
                  src={`${BASE_URL}${floorImageUrl}`}
                  style={{
                    display: 'block',
                    height: 'auto',
                    width: '100%', // or auto depending on your image scaling needs
                    objectFit: 'unset',
                    userSelect: 'none',
                  }}
                  draggable={false}
                />

                <canvas
                  ref={canvasRef}
                  width={imageWidth}
                  height={imageHeight}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    pointerEvents: 'none',
                    width: imageWidth,
                    height: imageHeight,
                    zIndex: 10,
                  }}
                />
              </Box>
              )}
            </TransformComponent>
          </TransformWrapper>
        </Box>

        {/* === Filter Panel === */}

        <Stack
          spacing={5}
          sx={{
            width: 240,
            flexShrink: 0,
            px: 1,
            py: 2,
            borderLeft: '1px solid #e0e0e0',
            bgcolor: '#fafafa',
            height: '400',
          }}
        >
          <Typography variant="h6" align="center">
            Filter
          </Typography>
          <FormControl size="small" fullWidth>
            <InputLabel>Building</InputLabel>
            <Select
              label="Building"
              value={selectedBuilding ?? ''}
              onChange={(e) => {
                setSelectedBuilding(e.target.value);
                setSelectedFloor(null);
                setSelectedMaskedArea(null);
              }}
            >
              {buildingOptions.map((bid) => (
                <MenuItem key={bid} value={bid}>
                  {bid}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" fullWidth disabled={!selectedBuilding}>
            <InputLabel>Floor</InputLabel>
            <Select
              label="Floor"
              value={selectedFloor ?? ''}
              onChange={(e) => {
                setSelectedFloor(e.target.value);
                setSelectedMaskedArea(null);
              }}
            >
              {floorOptions.map((f) => (
                <MenuItem key={f.id} value={f.id}>
                  {f.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

<FormControl
  size="small"
  fullWidth
  variant="outlined"
  disabled={!selectedFloor}
>
  <InputLabel id="masked-area-label">Masked Area</InputLabel>
  <Select
    labelId="masked-area-label"
    id="masked-area"
    label="Masked Area"
    value={selectedMaskedArea ?? ''}
    onChange={(e) => setSelectedMaskedArea(e.target.value)}
    displayEmpty
    renderValue={(selected) => {
      // if (!selected) {
      //   return <em>All Areas</em>;
      // }
      const match = maskedAreaOptions.find((m) => m.id === selected);
      return match ? match.name : '';
    }}
  >
    <MenuItem value="">
      <em>All Areas</em>
    </MenuItem>
    {maskedAreaOptions.map((m) => (
      <MenuItem key={m.id} value={m.id}>
        {m.name}
      </MenuItem>
    ))}
  </Select>
</FormControl>


        </Stack>
      </Box>
    </DashboardCard>
  );
};

export default HeatmapFloorplan;
