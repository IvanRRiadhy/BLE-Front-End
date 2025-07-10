import { Box, Grid2 as Grid, Typography, useTheme } from '@mui/material';
import React from 'react';
import { useEffect, useRef, useState } from 'react';
import { AppState, useSelector } from 'src/store/Store';
import ConfigFloorView from './ConfigFloorView';
import { screenSettings } from 'src/store/apps/monitoring/layout';

interface MonitoringGridProps {
  grid: number;
  floorIds: Record<number, string[]>;
}

// type LayoutItem =
//   | {
//       size: { xs: number; lg?: number };
//       floorId: number;
//       zoomable: boolean;
//       height?: string;
//     }
//   | {
//       size: { xs: number; lg?: number };
//       isColumn: true;
//       children: {
//         size: { xs: number; lg?: number };
//         floorId: number;
//         zoomable: boolean;
//         height: string;
//       }[];
//     };

// Define layout rules for each grid type
const layoutConfig = {
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

interface MonitoringGridProps {
  grid: number;
  floorIds: Record<number, string[]>;
  selectedScreen?: number;
  setSelectedScreen: (selectedScreen: string) => void;
  screenSettings?: screenSettings[][];
  setScreenSettings?: (settings: { scale: number; translateX: number; translateY: number }) => void;
}

const ConfigGrid = React.memo(
  ({
    grid,
    floorIds,
    selectedScreen,
    setSelectedScreen,
    screenSettings,
    setScreenSettings,
  }: MonitoringGridProps) => {
    const gridRef = useRef<HTMLDivElement>(null);
    const [gridDimensions, setGridDimensions] = useState({ width: 0, height: 0 });
    const theme = useTheme();
    const customizer = useSelector((state: AppState) => state.customizer);
    useEffect(() => {
      if (gridRef.current) {
        const { clientWidth, clientHeight } = gridRef.current;
        setGridDimensions({ width: clientWidth, height: clientHeight });
      }
    }, [grid]);
    if (!floorIds[grid] || floorIds[grid].length === 0) {
      return (
        <Grid container>
          <Grid size={{ xs: 12 }}>
            <Typography variant="h4" fontStyle="bold" fontWeight={900} mt={0.5}>
              Monitoring Dashboard
            </Typography>
            <Typography variant="h6" fontStyle="bold" fontWeight={900} mt={0.5}>
              Please select a Grid
            </Typography>
          </Grid>
        </Grid>
      );
    }

    if (!(grid in layoutConfig)) return null;
    const layout = layoutConfig[grid as keyof typeof layoutConfig];
    const screenOrderMap: { [grid: number]: Array<[number, number?, number?]> } = {
      1: [[0]],
      2: [[0], [1]],
      3: [[0], [1, 0], [1, 1]],
      4: [
        [0, 0],
        [1, 0],
        [0, 1],
        [1, 1],
      ],
      5: [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1, 0],
        [0, 1, 1],
      ],
      6: [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1, 0],
        [0, 1, 1],
        [1, 2],
      ],
    };

    function getScreenNumber(
      grid: number,
      index: number,
      childIndex?: number,
      grandChildIndex?: number,
    ) {
      const order = screenOrderMap[grid] || [];
      for (let i = 0; i < order.length; i++) {
        const [idx, cIdx, gIdx] = order[i];
        if (
          index === idx &&
          (typeof cIdx === 'undefined' || childIndex === cIdx) &&
          (typeof gIdx === 'undefined' || grandChildIndex === gIdx)
        ) {
          return i + 1; // 1-based screen number
        }
      }
      return 0;
    }

    function toRoman(num: number) {
      const romans = ['I', 'II', 'III', 'IV', 'V', 'VI'];
      return romans[num - 1] || num;
    }
    return (
      <Box
        mt={0}
        sx={{
          flexGrow: 1,
          margin: 0,
          padding: 0,
          marginLeft: `calc(${customizer.SidebarWidth}px)`,
          transition: theme.transitions.create('margin-left', {
            duration: theme.transitions.duration.shortest,
          }),
        }}
      >
        <Grid container>
          {layout.map((item, index) => {
            if ('isColumn' in item && item.isColumn) {
              return (
                <Grid key={index} size={item.size}>
                  <Grid container direction="column">
                    {item.children.map((child, childIndex) => {
                      // Check if child also has children
                      if ('children' in child && Array.isArray(child.children)) {
                        return (
                          <Grid key={childIndex} size={child.size}>
                            <Grid container>
                              {child.children.map((grandChild, grandChildIndex) => {
                                const screenNum = getScreenNumber(
                                  grid,
                                  index,
                                  childIndex,
                                  grandChildIndex,
                                );
                                return (
                                  <Grid
                                    key={grandChildIndex}
                                    size={grandChild.size}
                                    onClick={() => setSelectedScreen(screenNum?.toString() || '')}
                                    ref={gridRef}
                                    sx={{
                                      height: grandChild.height || 'auto',
                                      overflow: 'hidden',
                                      border: `${
                                        selectedScreen === screenNum ? '5px' : '2.5px'
                                      } solid ${
                                        selectedScreen === screenNum
                                          ? theme.palette.success.dark
                                          : 'black'
                                      }`,
                                      backgroundColor: `${
                                        selectedScreen === screenNum
                                          ? theme.palette.success.light
                                          : 'white'
                                      }`,
                                      transition: 'border-color 0.3s, background-color 0.3s',
                                      display: 'flex',
                                      justifyContent: 'center',
                                      alignItems: 'center',
                                      '&:hover': {
                                        borderColor: theme.palette.success.main, // Change border color on hover
                                        backgroundColor: theme.palette.success.light, // Optional: Add background color change
                                        '& .hover-typography': {
                                          color: theme.palette.success.main, // Change Typography color on hover
                                        },
                                      },
                                    }}
                                  >
                                    {floorIds[grid][(grandChild as { floorId: number }).floorId] ? (
                                      <ConfigFloorView
                                        activeFloorplan={floorIds[grid][screenNum - 1]}
                                        zoomable={selectedScreen === screenNum}
                                        containerWidth={gridDimensions.width} // Pass width
                                        containerHeight={gridDimensions.height} // Pass height
                                        screenSettings={
                                          screenSettings && screenNum
                                            ? screenSettings[grid][screenNum - 1]
                                            : undefined
                                        }
                                        setScreenSettings={setScreenSettings}
                                      />
                                    ) : (
                                      <Typography
                                        variant="h1"
                                        className="hover-typography"
                                        sx={{
                                          fontSize: '5rem',
                                          fontFamily: 'Georgia',
                                          color:
                                            screenNum === selectedScreen
                                              ? theme.palette.success.dark
                                              : 'black',
                                          transition: 'color 0.1s',
                                        }}
                                        fontStyle="bold"
                                        fontWeight={900}
                                      >
                                        {screenNum ? `${toRoman(screenNum)}` : ''}
                                      </Typography>
                                    )}
                                  </Grid>
                                );
                              })}
                            </Grid>
                          </Grid>
                        );
                      }
                      const screenNum = getScreenNumber(grid, index, childIndex);
                      // Normal child
                      return (
                        <Grid
                          key={childIndex}
                          size={child.size}
                          onClick={() => setSelectedScreen(screenNum?.toString() || '')}
                          ref={gridRef}
                          sx={{
                            height: (child as { height: string }).height || 'auto',
                            overflow: 'hidden',
                            border: `${selectedScreen === screenNum ? '5px' : '2.5px'} solid ${
                              selectedScreen === screenNum ? theme.palette.success.dark : 'black'
                            }`,
                            backgroundColor: `${
                              selectedScreen === screenNum ? theme.palette.success.light : 'white'
                            }`,
                            transition: 'border-color 0.3s, background-color 0.3s',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            '&:hover': {
                              borderColor: theme.palette.success.main, // Change border color on hover
                              backgroundColor: theme.palette.success.light, // Optional: Add background color change
                              '& .hover-typography': {
                                color: theme.palette.success.main, // Change Typography color on hover
                              },
                            },
                          }}
                        >
                          {floorIds[grid][(child as { floorId: number }).floorId] ? (
                            <ConfigFloorView
                              activeFloorplan={
                                floorIds[grid][screenNum - 1]
                              }
                              zoomable={selectedScreen === screenNum}
                              containerWidth={gridDimensions.width} // Pass width
                              containerHeight={gridDimensions.height} // Pass height
                              screenSettings={
                                screenSettings && screenNum
                                  ? screenSettings[grid][screenNum - 1]
                                  : undefined
                              }
                              setScreenSettings={setScreenSettings}
                            />
                          ) : (
                            <Typography
                              variant="h1"
                              className="hover-typography"
                              sx={{
                                fontSize: '5rem',
                                fontFamily: 'Georgia',
                                color: `${
                                  selectedScreen === screenNum
                                    ? theme.palette.success.dark
                                    : 'black'
                                }`,
                                transition: 'color 0.1s',
                              }}
                              fontStyle="bold"
                              fontWeight={900}
                            >
                              {screenNum ? `${toRoman(screenNum)}` : ''}
                            </Typography>
                          )}
                        </Grid>
                      );
                    })}
                  </Grid>
                </Grid>
              );
            }
            const screenNum = getScreenNumber(grid, index);
            // console.log('Screen Number:', screenNum, 'SelectedScreen :', selectedScreen);
            // console.log('Floor IDs:', floorIds[grid][(item as { floorId: number }).floorId]);
            // Standard top-level item
            return (
              <Grid
                key={index}
                size={item.size}
                onClick={() => setSelectedScreen(screenNum?.toString() || '')}
                ref={gridRef}
                sx={{
                  height: (item as { height: string }).height || 'auto',
                  overflow: 'hidden',
                  border: `${selectedScreen === screenNum ? '5px' : '2.5px'} solid ${
                    selectedScreen === screenNum ? theme.palette.success.dark : 'black'
                  }`,
                  backgroundColor: `${
                    selectedScreen === screenNum ? theme.palette.success.light : 'white'
                  }`,
                  transition: 'border-color 0.3s, background-color 0.3s',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  '&:hover': {
                    borderColor: theme.palette.success.main, // Change border color on hover
                    backgroundColor: theme.palette.success.light, // Optional: Add background color change
                    '& .hover-typography': {
                      color: theme.palette.success.main, // Change Typography color on hover
                    },
                  },
                }}
              >
                {floorIds[grid][(item as { floorId: number }).floorId] ? (
                  <ConfigFloorView
                    activeFloorplan={floorIds[grid][screenNum - 1]}
                    zoomable={selectedScreen === screenNum}
                    containerWidth={gridDimensions.width} // Pass width
                    containerHeight={gridDimensions.height} // Pass height
                    screenSettings={
                      screenSettings && screenNum ? screenSettings[grid][screenNum - 1] : undefined
                    }
                    setScreenSettings={setScreenSettings}
                  />
                ) : (
                  <Typography
                    variant="h1"
                    className="hover-typography"
                    sx={{
                      fontSize: '5rem',
                      fontFamily: 'Georgia',
                      color: `${
                        selectedScreen === screenNum ? theme.palette.success.dark : 'black'
                      }`,
                      transition: 'color 0.1s',
                    }}
                    fontStyle="bold"
                    fontWeight={900}
                  >
                    {screenNum ? `${toRoman(screenNum)}` : ''}
                  </Typography>
                )}
              </Grid>
            );
          })}
        </Grid>
      </Box>
    );
  },
);

export default ConfigGrid;
