import { Box, Grid2 as Grid, Typography, useTheme } from '@mui/material';
import React from 'react';
import { useEffect, useRef, useState } from 'react';
// import { useSelector } from 'react-redux';
import FloorView from 'src/components/dashboards/monitoring/FloorView';
import VideoPlayer from 'src/components/shared/VideoPlayer';
import { screenOrderMap, screenSettings } from 'src/store/apps/monitoring/layout';
// import { RootState } from 'src/store/Store';

interface MonitoringGridProps {
  grid: number;
  floorIds: Record<number, string[]>;
}

const videoJsOptions = {
  autoplay: true,
  controls: true,
  responsive: true,
  fluid: true, // pastikan false
  // width: 2300,
  // height: 2500,
  sources: [
    {
      src: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      type: 'application/x-mpegURL',
    },
  ],
  html5: {
    hls: {
      overrideNative: true,
    },
  },
};

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
  screenSettings: screenSettings[][];
  screenDisplay: Record<number, string[]>;
  screenType: Record<number, number[]>;
}

const MonitoringGrid = React.memo(
  ({ grid, floorIds, screenSettings, screenDisplay, screenType }: MonitoringGridProps) => {
    const gridRef = useRef<HTMLDivElement>(null);
    const [gridDimensions, setGridDimensions] = useState({ width: 0, height: 0 });
    const theme = useTheme();
    // const customizer = useSelector((state: RootState) => state.customizer);
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

    // const screenOrderMap: { [grid: number]: Array<[number, number?, number?]> } = {
    //   1: [[0]],
    //   2: [[0], [1]],
    //   3: [[0], [1, 0], [1, 1]],
    //   4: [
    //     [0, 0],
    //     [1, 0],
    //     [0, 1],
    //     [1, 1],
    //   ],
    //   5: [
    //     [0, 0],
    //     [1, 0],
    //     [0, 1, 0],
    //     [0, 1, 1],
    //     [1, 1],
    //   ],
    //   6: [
    //     [0, 0],
    //     [1, 0],
    //     [1, 1],
    //     [0, 1, 0],
    //     [0, 1, 1],
    //     [1, 2],
    //   ],
    // };

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

    return (
      <Box
        mt={0}
        sx={{
          flexGrow: 1,
          margin: 0,
          padding: 0,
          // marginLeft: `calc(${customizer.SidebarWidth}px)`,
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
                                    ref={gridRef}
                                    sx={{
                                      height: grandChild.height || 'auto',
                                      overflow: 'hidden',
                                      border: '2.5px solid black',
                                      transition: 'border-color 0.3s ease, border-width 0.1s ease',
                                      display: 'flex',
                                      justifyContent: 'center',
                                      alignItems: 'center',
                                      backgroundColor:
                                        screenType[grid][
                                          (grandChild as { floorId: number }).floorId
                                        ] === 2
                                          ? 'black'
                                          : 'white',
                                      '&:hover': {
                                        borderColor: 'success.dark',
                                        borderWidth: '5px',
                                      },
                                    }}
                                  >
                                    {screenType[grid][
                                      (grandChild as { floorId: number }).floorId
                                    ] === 1 ? (
                                      <FloorView
                                        activeFloorplan={floorIds[grid][screenNum - 1]}
                                        zoomable={grandChild.zoomable}
                                        containerWidth={gridDimensions.width} // Pass width
                                        containerHeight={gridDimensions.height} // Pass height
                                        screenSettings={screenSettings[grid][screenNum - 1]}
                                        activeMaskedArea={
                                          screenDisplay[grid][
                                            (grandChild as { floorId: number }).floorId
                                          ]
                                        }
                                      />
                                    ) : screenType[grid][
                                        (grandChild as { floorId: number }).floorId
                                      ] === 2 ? (
                                      <VideoPlayer options={videoJsOptions} />
                                    ) : (
                                      <FloorView
                                        activeFloorplan={floorIds[grid][screenNum - 1]}
                                        zoomable={grandChild.zoomable}
                                        containerWidth={gridDimensions.width} // Pass width
                                        containerHeight={gridDimensions.height} // Pass height
                                        screenSettings={screenSettings[grid][screenNum - 1]}
                                      />
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
                          ref={gridRef}
                          sx={{
                            height: (child as { height: string }).height || 'auto',
                            overflow: 'hidden',
                            border: '2.5px solid black',
                            transition: 'border-color 0.3s ease, border-width 0.1s ease',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            backgroundColor:
                              screenType[grid][(child as { floorId: number }).floorId] === 2
                                ? 'black'
                                : 'white',
                            '&:hover': {
                              borderColor: 'success.dark',
                              borderWidth: '5px',
                            },
                          }}
                        >
                          {screenType[grid][(child as { floorId: number }).floorId] === 1 ? (
                            <FloorView
                              activeFloorplan={floorIds[grid][screenNum - 1]}
                              zoomable={(child as { zoomable: boolean }).zoomable}
                              containerWidth={gridDimensions.width} // Pass width
                              containerHeight={gridDimensions.height} // Pass height
                              screenSettings={screenSettings[grid][screenNum - 1]}
                              activeMaskedArea={
                                screenDisplay[grid][(child as { floorId: number }).floorId]
                              }
                            />
                          ) : screenType[grid][(child as { floorId: number }).floorId] === 2 ? (
                            <VideoPlayer options={videoJsOptions} />
                          ) : (
                            <FloorView
                              activeFloorplan={floorIds[grid][screenNum - 1]}
                              zoomable={(child as { zoomable: boolean }).zoomable}
                              containerWidth={gridDimensions.width} // Pass width
                              containerHeight={gridDimensions.height} // Pass height
                              screenSettings={screenSettings[grid][screenNum - 1]}
                            />
                          )}
                        </Grid>
                      );
                    })}
                  </Grid>
                </Grid>
              );
            }
            const screenNum = getScreenNumber(grid, index);
            // Standard top-level item
            return (
              <Grid
                key={index}
                size={item.size}
                ref={gridRef}
                sx={{
                  height: (item as { height: string }).height || 'auto',
                  overflow: 'hidden',
                  border: '2.5px solid black',
                  transition: 'border-color 0.3s ease, border-width 0.1s ease',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor:
                    screenType[grid][(item as { floorId: number }).floorId] === 2
                      ? 'black'
                      : 'white',
                  '&:hover': {
                    borderColor: 'success.dark',
                    borderWidth: '5px',
                  },
                }}
              >
                {screenType[grid][(item as { floorId: number }).floorId] === 1 ? (
                  <FloorView
                    activeFloorplan={floorIds[grid][screenNum - 1]}
                    zoomable={(item as { zoomable: boolean }).zoomable}
                    containerWidth={gridDimensions.width} // Pass width
                    containerHeight={gridDimensions.height} // Pass height
                    screenSettings={screenSettings[grid][screenNum - 1]}
                    activeMaskedArea={screenDisplay[grid][(item as { floorId: number }).floorId]}
                  />
                ) : screenType[grid][(item as { floorId: number }).floorId] === 2 ? (
                  <VideoPlayer options={videoJsOptions} />
                ) : (
                  // <Typography>Video Player</Typography>
                  <FloorView
                    activeFloorplan={floorIds[grid][screenNum - 1]}
                    zoomable={(item as { zoomable: boolean }).zoomable}
                    containerWidth={gridDimensions.width} // Pass width
                    containerHeight={gridDimensions.height} // Pass height
                    screenSettings={screenSettings[grid][screenNum - 1]}
                  />
                )}
              </Grid>
            );
          })}
        </Grid>
      </Box>
    );
  },
);

export default MonitoringGrid;
