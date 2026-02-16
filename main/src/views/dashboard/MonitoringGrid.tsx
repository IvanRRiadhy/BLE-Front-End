import { Box, Grid2 as Grid, Typography, useTheme, Paper } from '@mui/material';
import React, { useEffect, useRef, useState } from 'react';
import FloorView from 'src/components/dashboards/monitoring/FloorView';
import { LayoutItem, ScreenSettings, gridLayoutConfig } from 'src/store/apps/monitoring/layout';
import ScrollArrowButton from 'src/components/shared/ScrollArrowButton'; // Add this import
import { useSelector } from 'react-redux';
import { RootState } from 'src/store/Store';

interface MonitoringGridProps {
  grid: number;
  screenId: Record<number, string[]>;
  floorIds: Record<number, string[]>;
  screenSettings: ScreenSettings[][];
  screenDisplay: Record<number, any[]>;
  screenType: Record<number, number[]>;
}

// Create a ScrollableRow component for MonitoringGrid
const ScrollableRowWithArrows: React.FC<{
  children: React.ReactNode;
  itemHeight?: string;
}> = ({ children, itemHeight = '20vh' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  const checkScrollPosition = () => {
    if (containerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = containerRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft + clientWidth < scrollWidth - 5);
    }
  };

  useEffect(() => {
    checkScrollPosition();
    window.addEventListener('resize', checkScrollPosition);
    return () => window.removeEventListener('resize', checkScrollPosition);
  }, []);

  const scrollLeft = () => {
    if (containerRef.current) {
      containerRef.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (containerRef.current) {
      containerRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  return (
    <Box sx={{ position: 'relative' }}>
      <ScrollArrowButton direction="left" onClick={scrollLeft} visible={showLeftArrow} />

      <ScrollArrowButton direction="right" onClick={scrollRight} visible={showRightArrow} />

      <Box
        ref={containerRef}
        onScroll={checkScrollPosition}
        sx={{
          display: 'flex',
          overflowX: 'auto',
          gap: 1.5,
          // p: 1,
          whiteSpace: 'nowrap',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
          height: itemHeight,
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

const MonitoringGrid: React.FC<MonitoringGridProps> = React.memo(
  ({ grid, screenId, floorIds, screenSettings, screenDisplay, screenType }) => {
    const gridRef = useRef<HTMLDivElement>(null);
    const [gridDimensions, setGridDimensions] = useState({ width: 0, height: 0 });
    const theme = useTheme();

    const alarmData = useSelector((state: RootState) => state.BeaconReducer.alarmLogs);
    const activeAlarmFloor = React.useMemo(() => {
      return [
        ...new Set(
          alarmData
            .filter((a) => a.action !== 'Done')
            .map((a) => a.floorplanId?.toUpperCase())
            .filter(Boolean), // remove null/undefined
        ),
      ];
    }, [alarmData]);
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
          const miniFloors = floorIds[grid].slice(1);
          const miniIds = screenId[grid].slice(1);
          const miniTypes = screenType[grid].slice(1);
          const miniSettings = screenSettings[grid].slice(1);
          const miniDisplays = screenDisplay[grid].slice(1);

          return (
            <Grid key={index} size={item.size}>
              <ScrollableRowWithArrows itemHeight={item.height}>
                {miniFloors.map((floorId, i) => {
                  const isMiniAlarm = activeAlarmFloor?.includes(floorId.toUpperCase());
                  // console.log(
                  //   'isMiniAlarm',
                  //   isMiniAlarm,
                  //   'activeAlarmFloor',
                  //   activeAlarmFloor,
                  //   'floorId',
                  //   floorId,
                  // );
                  return (
                    <Paper
                      elevation={3}
                      sx={{
                        width: 260,
                        height: '100%',
                        flexShrink: 0,
                        borderRadius: 2,
                        p: 1,
                        bgcolor: '#e1e1e1',
                        border: '2.5px solid',
                        borderColor: isMiniAlarm ? theme.palette.error.main : '#a1a1a1',

                        ...(isMiniAlarm && {
                          animation: 'alarmAura 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                        }),

                        '@keyframes alarmAura': {
                          '0%': {
                            boxShadow: '0 0 4px rgba(255,0,0,0.3)',
                          },
                          '50%': {
                            boxShadow: '0 0 18px 6px rgba(255,0,0,0.6)',
                          },
                          '100%': {
                            boxShadow: '0 0 4px rgba(255,0,0,0.3)',
                          },
                        },

                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <FloorView
                        activeFloorplan={floorId}
                        zoomable={false}
                        containerWidth={260}
                        containerHeight={item.height ? parseInt(item.height) - 20 : 180}
                        screenSettings={miniSettings[i]}
                        activeMaskedArea={miniDisplays[i]}
                        focusBeacon={miniDisplays[i]}
                        gridNumber={grid}
                        screenNumber={i + 2}
                        screenId={miniIds[i]}
                      />
                    </Paper>
                  );
                })}
              </ScrollableRowWithArrows>
            </Grid>
          );
        }

        // ------------------------------------------
        // CASE C — NORMAL SCREEN ITEM (Types 1–6)
        // ------------------------------------------
        const idx = item.floorId!;
        const floorplanId = floorIds[grid][idx];
        const type = screenType[grid][idx];
        const isAlarmActive = activeAlarmFloor?.includes(floorplanId.toUpperCase());
        return (
          <Grid key={index} size={item.size}>
            <Paper
              elevation={3}
              sx={{
                height: item.height,
                p: 1.5,
                borderRadius: 2,
                bgcolor: '#e1e1e1',
                border: '2.5px solid',
                borderColor: isAlarmActive ? theme.palette.error.main : '#a1a1a1',

                // 🔥 AURA EFFECT
                ...(isAlarmActive && {
                  animation: 'alarmAura 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                }),

                // Keyframes defined inline
                '@keyframes alarmAura': {
                  '0%': {
                    boxShadow: '0 0 4px rgba(255,0,0,0.3)',
                  },
                  '50%': {
                    boxShadow: '0 0 18px 6px rgba(255,0,0,0.6)',
                  },
                  '100%': {
                    boxShadow: '0 0 4px rgba(255,0,0,0.3)',
                  },
                },
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
      <Box ref={gridRef}>
        <Grid container spacing={1.5}>
          {renderLayout(layout)}
        </Grid>
      </Box>
    );
  },
);

export default MonitoringGrid;
