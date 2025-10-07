import { Box, Grid2 as Grid, Typography, useTheme } from '@mui/material';
import React, { useEffect, useRef, useState } from 'react';
import FloorView from 'src/components/dashboards/monitoring/FloorView';
import VideoPlayer from 'src/components/shared/VideoPlayer';
import { screenOrderMap, ScreenSettings } from 'src/store/apps/monitoring/layout';

interface LayoutItem {
  size: { xs: number; lg?: number };
  floorId?: number;
  zoomable?: boolean;
  height?: string;
  isColumn?: boolean;
  children?: LayoutItem[];
}

interface MonitoringGridProps {
  grid: number;
  floorIds: Record<number, string[]>;
  screenSettings: ScreenSettings[][];
  screenDisplay: Record<number, any[]>;
  screenType: Record<number, number[]>;
}

// Layout configuration
const layoutConfig: Record<number, LayoutItem[]> = {
  [1]: [{ size: { xs: 12 }, floorId: 0, zoomable: true, height: '80vh' }],
  [2]: [
    { size: { xs: 12, lg: 6 }, floorId: 0, zoomable: true, height: '80vh' },
    { size: { xs: 12, lg: 6 }, floorId: 1, zoomable: false, height: '80vh' },
  ],
  [3]: [
    { size: { xs: 12, lg: 6 }, floorId: 0, zoomable: true, height: '80vh' },
    {
      size: { xs: 12, lg: 6 },
      isColumn: true,
      children: [
        { size: { xs: 12 }, floorId: 1, zoomable: false, height: '40vh' },
        { size: { xs: 12 }, floorId: 2, zoomable: false, height: '40vh' },
      ],
    },
  ],
  [4]: [
    {
      size: { xs: 12, lg: 6 },
      isColumn: true,
      children: [
        { size: { xs: 12 }, floorId: 0, zoomable: true, height: '40vh' },
        { size: { xs: 12 }, floorId: 1, zoomable: false, height: '40vh' },
      ],
    },
    {
      size: { xs: 12, lg: 6 },
      isColumn: true,
      children: [
        { size: { xs: 12 }, floorId: 2, zoomable: false, height: '40vh' },
        { size: { xs: 12 }, floorId: 3, zoomable: false, height: '40vh' },
      ],
    },
  ],
  [5]: [
    {
      size: { xs: 12, lg: 8 },
      isColumn: true,
      children: [
        { size: { xs: 12 }, floorId: 0, zoomable: true, height: '53vh' },
        {
          size: { xs: 12 },
          isColumn: false,
          children: [
            { size: { xs: 12, lg: 6 }, floorId: 2, zoomable: false, height: '27vh' },
            { size: { xs: 12, lg: 6 }, floorId: 3, zoomable: false, height: '27vh' },
          ],
        },
      ],
    },
    {
      size: { xs: 12, lg: 4 },
      isColumn: true,
      children: [
        { size: { xs: 12 }, floorId: 1, zoomable: false, height: '40vh' },
        { size: { xs: 12 }, floorId: 4, zoomable: false, height: '40vh' },
      ],
    },
  ],
  [6]: [
    {
      size: { xs: 12, lg: 8 },
      isColumn: true,
      children: [
        { size: { xs: 12 }, floorId: 0, zoomable: true, height: '53vh' },
        {
          size: { xs: 12 },
          isColumn: false,
          children: [
            { size: { xs: 12, lg: 6 }, floorId: 3, zoomable: false, height: '27vh' },
            { size: { xs: 12, lg: 6 }, floorId: 4, zoomable: false, height: '27vh' },
          ],
        },
      ],
    },
    {
      size: { xs: 12, lg: 4 },
      isColumn: true,
      children: [
        { size: { xs: 12 }, floorId: 1, zoomable: false, height: '26.5vh' },
        { size: { xs: 12 }, floorId: 2, zoomable: false, height: '26.5vh' },
        { size: { xs: 12 }, floorId: 5, zoomable: false, height: '27vh' },
      ],
    },
  ],
} as const;

// VideoPlayer default options
const videoJsOptions = {
  autoplay: true,
  controls: true,
  responsive: true,
  fluid: true,
  sources: [
    {
      src: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      type: 'application/x-mpegURL',
    },
  ],
  html5: { hls: { overrideNative: true } },
};

const MonitoringGrid: React.FC<MonitoringGridProps> = React.memo(
  ({ grid, floorIds, screenSettings, screenDisplay, screenType }) => {
    const gridRef = useRef<HTMLDivElement>(null);
    const [gridDimensions, setGridDimensions] = useState({ width: 0, height: 0 });
    const theme = useTheme();

    useEffect(() => {
      if (gridRef.current) {
        const { clientWidth, clientHeight } = gridRef.current;
        setGridDimensions({ width: clientWidth, height: clientHeight });
      }
    }, [grid, floorIds[grid]?.length]);

    if (!floorIds[grid] || floorIds[grid].length === 0) {
      return (
        <Grid container>
          <Grid size={{ xs: 12 }}>
            <Typography variant="h4" fontWeight={900} mt={0.5}>
              Monitoring Dashboard
            </Typography>
            <Typography variant="h6" fontWeight={900} mt={0.5}>
              Please select a Grid
            </Typography>
          </Grid>
        </Grid>
      );
    }

    const layout = layoutConfig[grid];
    if (!layout) return null;

    // Recursive render function
    const renderLayout = (items: LayoutItem[]): JSX.Element[] =>
      items.map((item, index) => {
        if (item.isColumn && item.children) {
          return (
            <Grid key={index} size={item.size}>
              <Grid container direction="column" spacing={1}>
                {renderLayout(item.children)}
              </Grid>
            </Grid>
          );
        }

        const floorId = item.floorId!;
        const order = screenOrderMap[grid] || [];
        const screenNum =
          order.findIndex(([i, c, g]: [number, number?, number?]) => i === index && !c && !g) + 1 ||
          floorId + 1;

        const bgColor = screenType[grid][floorId] === 2 ? 'black' : 'white';

        return (
          <Grid
            key={index}
            size={item.size}
            sx={{
              height: item.height || 'auto',
              overflow: 'hidden',
              border: '2px solid black',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: bgColor,
              '&:hover': { borderColor: 'success.dark', borderWidth: '3px' },
            }}
          >
            {screenType[grid][floorId] === 1 ? (
              <FloorView
                activeFloorplan={floorIds[grid][screenNum - 1]}
                zoomable={item.zoomable ?? false}
                containerWidth={gridDimensions.width}
                containerHeight={gridDimensions.height}
                screenSettings={screenSettings[grid][screenNum - 1]}
                activeMaskedArea={screenDisplay[grid][floorId]}
                gridNumber={grid}
                screenNumber={screenNum}
              />
            ) : screenType[grid][floorId] === 2 ? (
              <VideoPlayer options={videoJsOptions} />
            ) : (
              <FloorView
                activeFloorplan={floorIds[grid][screenNum - 1]}
                zoomable={item.zoomable ?? false}
                containerWidth={gridDimensions.width}
                containerHeight={gridDimensions.height}
                screenSettings={screenSettings[grid][screenNum - 1]}
                focusBeacon={screenDisplay[grid][floorId]}
                gridNumber={grid}
                screenNumber={screenNum}
              />
            )}
          </Grid>
        );
      });

    return (
      <Box
        mt={0}
        ref={gridRef}
        sx={{
          flexGrow: 1,
          margin: 0,
          padding: 0,
          transition: theme.transitions.create('margin-left', {
            duration: theme.transitions.duration.shortest,
          }),
        }}
      >
        <Grid container spacing={1}>
          {renderLayout(layout)}
        </Grid>
      </Box>
    );
  },
);

export default MonitoringGrid;
