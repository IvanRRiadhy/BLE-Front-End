import { Grid2 as Grid, Typography } from '@mui/material';
import React from 'react';
import { useEffect, useRef, useState } from 'react';
import FloorView from 'src/components/dashboards/monitoring/FloorView';

interface MonitoringGridProps {
  grid: number;
  floorIds: Record<number, string[]>;
}

type LayoutItem =
  | {
      size: { xs: number; lg?: number };
      floorId: number;
      zoomable: boolean;
      height?: string;
    }
  | {
      size: { xs: number; lg?: number };
      isColumn: true;
      children: {
        size: { xs: number; lg?: number };
        floorId: number;
        zoomable: boolean;
        height: string;
      }[];
    };

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
}

const MonitoringGrid = React.memo(({ grid, floorIds }: MonitoringGridProps) => {
  const gridRef = useRef<HTMLDivElement>(null);
  const [gridDimensions, setGridDimensions] = useState({ width: 0, height: 0 });

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

  const gridKey = grid as keyof typeof layoutConfig;

  if (!(grid in layoutConfig)) return null;
  const layout = layoutConfig[grid as keyof typeof layoutConfig];
  return (
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
                          {child.children.map((grandChild, grandChildIndex) => (
                            <Grid
                              key={grandChildIndex}
                              size={grandChild.size}
                              ref={gridRef}
                              sx={{
                                height: grandChild.height || 'auto',
                                overflow: 'hidden',
                                border: '2.5px solid black',
                                transition: 'border-color 0.3s ease, border-width 0.1s ease',
                                '&:hover': {
                                  borderColor: 'success.dark',
                                  borderWidth: '5px',
                                },
                              }}
                            >
                              <FloorView
                                activeFloorplan={floorIds[grid][grandChild.floorId]}
                                zoomable={grandChild.zoomable}
                                containerWidth={gridDimensions.width} // Pass width
                                containerHeight={gridDimensions.height} // Pass height
                              />
                            </Grid>
                          ))}
                        </Grid>
                      </Grid>
                    );
                  }

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
                        '&:hover': {
                          borderColor: 'success.dark',
                          borderWidth: '5px',
                        },
                      }}
                    >
                      <FloorView
                        activeFloorplan={floorIds[grid][(child as { floorId: number }).floorId]}
                        zoomable={(child as { zoomable: boolean }).zoomable}
                        containerWidth={gridDimensions.width} // Pass width
                        containerHeight={gridDimensions.height} // Pass height
                      />
                    </Grid>
                  );
                })}
              </Grid>
            </Grid>
          );
        }

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
              '&:hover': {
                borderColor: 'success.dark',
                borderWidth: '5px',
              },
            }}
          >
            <FloorView
              activeFloorplan={floorIds[grid][(item as { floorId: number }).floorId]}
              zoomable={(item as { zoomable: boolean }).zoomable}
              containerWidth={gridDimensions.width} // Pass width
              containerHeight={gridDimensions.height} // Pass height
            />
          </Grid>
        );
      })}
    </Grid>
  );
});

export default MonitoringGrid;
