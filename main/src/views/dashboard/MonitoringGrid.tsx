import { Box, Grid2 as Grid, Typography, useTheme, Paper } from '@mui/material';
import React, { useEffect, useRef, useState } from 'react';
import FloorView from 'src/components/dashboards/monitoring/FloorView';
// import VideoPlayer from 'src/components/shared/VideoPlayer';
import { LayoutItem, ScreenSettings, gridLayoutConfig } from 'src/store/apps/monitoring/layout';

interface MonitoringGridProps {
  grid: number;
  screenId: Record<number, string[]>;
  floorIds: Record<number, string[]>;
  screenSettings: ScreenSettings[][];
  screenDisplay: Record<number, any[]>;
  screenType: Record<number, number[]>;
}

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
  ({ grid, screenId, floorIds, screenSettings, screenDisplay, screenType }) => {
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

    const idxFloor = (idx: number) => floorIds[grid][idx];

    const renderLayout = (items: LayoutItem[]): JSX.Element[] =>
      items.map((item, index) => {
        if (item.children) {
          return (
            <Grid key={index} size={item.size}>
              <Grid container direction={item.isColumn ? 'column' : 'row'} spacing={1.5}>
                {renderLayout(item.children)}
              </Grid>
            </Grid>
          );
        }

        const idx = item.floorId!;
        const type = screenType[grid][idx];
        const floorplanId = floorIds[grid][idx];

        return (
          <Grid key={index} size={item.size}>
            <Paper elevation={3} sx={{ height: item.height, p: 1.5, borderRadius: 2 }}>
              {type === 2 ? (
                // <VideoPlayer options={videoJsOptions} />
                <></>
              ) : (
                <FloorView
                  activeFloorplan={floorplanId}
                  zoomable={idx === 0}
                  containerWidth={gridDimensions.width}
                  containerHeight={gridDimensions.height}
                  screenSettings={screenSettings[grid][idx]}
                  activeMaskedArea={screenDisplay[grid][idx]}
                  focusBeacon={screenDisplay[grid][idx]}
                  gridNumber={grid}
                  screenNumber={idx + 1}
                  screenId={screenId[grid][idx]}
                />
              )}
            </Paper>
          </Grid>
        );
      });

    return (
      <Box ref={gridRef} sx={{ flexGrow: 1, p: 1.5 }}>
        <Grid container spacing={1.5}>
          {renderLayout(gridLayoutConfig[grid])}
        </Grid>
      </Box>
    );
  },
);

export default MonitoringGrid;
