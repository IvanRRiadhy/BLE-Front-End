import { Box, Grid2 as Grid, Typography, useTheme, Paper } from '@mui/material';
import React, { useEffect, useRef, useState } from 'react';
import FloorView from 'src/components/dashboards/monitoring/FloorView';
import { LayoutItem, ScreenSettings, gridLayoutConfig } from 'src/store/apps/monitoring/layout';

interface MonitoringGridProps {
  grid: number;
  screenId: Record<number, string[]>;
  floorIds: Record<number, string[]>;
  screenSettings: ScreenSettings[][];
  screenDisplay: Record<number, any[]>;
  screenType: Record<number, number[]>;
}

const MonitoringGrid: React.FC<MonitoringGridProps> = React.memo(
  ({ grid, screenId, floorIds, screenSettings, screenDisplay, screenType }) => {
    const gridRef = useRef<HTMLDivElement>(null);
    const [gridDimensions, setGridDimensions] = useState({ width: 0, height: 0 });
    const theme = useTheme();

    // Track container size
    useEffect(() => {
      if (gridRef.current) {
        const { clientWidth, clientHeight } = gridRef.current;
        setGridDimensions({ width: clientWidth, height: clientHeight });
      }
    }, [grid, floorIds[grid]?.length]);

    // No grid chosen
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

    // ---------------------------------------------------------------------
    //  Helper: Render layout structure (recursively)
    // ---------------------------------------------------------------------
    const renderLayout = (items: LayoutItem[]): JSX.Element[] =>
      items.map((item, index) => {

        // ------------------------------------------
        // CASE A — Nested children (Recursive Layout)
        // ------------------------------------------
        if (item.children && !item.isScrollableRow) {
          return (
            <Grid key={index} size={item.size}>
              <Grid container direction={item.isColumn ? 'column' : 'row'} spacing={1.5}>
                {renderLayout(item.children)}
              </Grid>
            </Grid>
          );
        }

        // ------------------------------------------
        // CASE B — TYPE 7: Scrollable Mini-Screen Row
        // ------------------------------------------
        if (item.isScrollableRow) {

          const totalScreens = floorIds[grid].length;
          const miniFloors = floorIds[grid].slice(1);
          const miniIds = screenId[grid].slice(1);
          const miniTypes = screenType[grid].slice(1);
          const miniSettings = screenSettings[grid].slice(1);
          const miniDisplays = screenDisplay[grid].slice(1);

          return (
            <Grid key={index} size={item.size}>
              <Box
                sx={{
                  display: 'flex',
                  overflowX: 'auto',
                  gap: 1.5,
                  p: 1,
                  whiteSpace: 'nowrap',
                  scrollbarWidth: 'thin',
                }}
              >
                {miniFloors.map((floorId, i) => (
                  <Paper
                    key={`mini-${i}`}
                    elevation={3}
                    sx={{
                      width: 260,
                      height: item.height ?? '20vh',
                      flexShrink: 0,
                      borderRadius: 2,
                      p: 1,
                      bgcolor: '#e1e1e1',
                      border: '2.5px solid #a1a1a1',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <FloorView
                      activeFloorplan={floorId}
                      zoomable={false}
                      containerWidth={260}
                      containerHeight={item.height ? parseInt(item.height) : 200}
                      screenSettings={miniSettings[i]}
                      activeMaskedArea={miniDisplays[i]}
                      focusBeacon={miniDisplays[i]}
                      gridNumber={grid}
                      screenNumber={i + 2}
                      screenId={miniIds[i]}
                    />
                  </Paper>
                ))}
              </Box>
            </Grid>
          );
        }

        // ------------------------------------------
        // CASE C — NORMAL SCREEN ITEM (Types 1–6)
        // ------------------------------------------
        const idx = item.floorId!;
        const floorplanId = floorIds[grid][idx];
        const type = screenType[grid][idx];

        return (
          <Grid key={index} size={item.size}>
            <Paper
              elevation={3}
              sx={{
                height: item.height,
                p: 1.5,
                borderRadius: 2,
                bgcolor: '#e1e1e1',
                border: '2.5px solid #a1a1a1',
              }}
            >
              {type === 2 ? null : (
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

    // ---------------------------------------------------------------------
    // RENDER ROOT GRID
    // ---------------------------------------------------------------------
    const layout = gridLayoutConfig[grid] ?? [];
    return (
      <Box ref={gridRef} sx={{ flexGrow: 1, p: 1.5 }}>
        <Grid container spacing={1.5}>
          {renderLayout(layout)}
        </Grid>
      </Box>
    );
  }
);

export default MonitoringGrid;
