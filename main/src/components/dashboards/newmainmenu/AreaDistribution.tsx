import { useEffect, useMemo, useState } from 'react';
import Chart from 'react-apexcharts';
import ApexCharts from 'apexcharts';
import { Box, Typography, Stack, Grid2 as Grid, SelectChangeEvent, MenuItem } from '@mui/material';
import { useAreaDistributionData } from 'src/hooks/useDashboard';
import { DashboardAreaChartFilter } from 'src/store/apps/dashboard/Dashboard';
import { useSelector } from 'react-redux';
import { RootState } from 'src/store/Store';
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';
// import Grid from "@mui/material/Unstable_Grid2";
// import { getAreaDistribution } from "../services/apiService";

/* ---------------- Types ---------------- */

interface AreaDistributionItem {
  areaName: string;
  totalRecords: number;
}

interface AreaCountState {
  labels: string[];
  series: number[];
}

const defaultFilter: DashboardAreaChartFilter = {
  TimeRange: 'today',
  from: null,
  to: null,
  operatorName: null,
  visitorId: null,
  buildingId: null,
  floorId: null,
  floorplanMaskedAreaId: null,
};

interface CountingEntity {
  count: number;
  name: string;
}

interface CountingData {
  building?: Record<string, CountingEntity>;
  floor?: Record<string, CountingEntity>;
  floorplan?: Record<string, CountingEntity>;
  area?: Record<string, CountingEntity>;
  time: string;
}
type DistributionLevel = 'building' | 'floor' | 'floorplan' | 'area';

/* ---------------- Constants ---------------- */

const COLORS = [
  '#0B3D60',
  '#2C7BBF',
  '#AFC7E3',
  '#D9E3F0',
  '#A3C4E5',
  '#C6D8EB',
  '#78A5D3',
  '#4B82C0',
];

const CHART_ID = 'area-distribution-pie';

/* ---------------- Utils ---------------- */

// const lighten = (hex: string, amount: number) => {
//   const num = parseInt(hex.replace('#', ''), 16);
//   const r = Math.min(255, (num >> 16) + 255 * amount);
//   const g = Math.min(255, ((num >> 8) & 0x00ff) + 255 * amount);
//   const b = Math.min(255, (num & 0x0000ff) + 255 * amount);
//   return `rgb(${r}, ${g}, ${b})`;
// };

// const withAlpha = (hex: string, alpha: number) => {
//   const num = parseInt(hex.replace('#', ''), 16);
//   const r = (num >> 16) & 255;
//   const g = (num >> 8) & 255;
//   const b = num & 255;
//   return `rgba(${r}, ${g}, ${b}, ${alpha})`;
// };

/* ---------------- Component ---------------- */

const NewAreaDistribution: React.FC = () => {
  const countingData = useSelector(
    (state: RootState) => state.BeaconReducer.countingData,
  ) as CountingData;
  const dashboardFilter = useSelector((state: RootState) => state.customizer.dashboardFilter);
  const [filter, setFilter] = useState<DashboardAreaChartFilter>(defaultFilter);
  // const { data = [], isLoading, isError } = useAreaDistributionData(filter);
  // const { labels, series } = useMemo(() => {
  //   return {
  //     labels: data.map((x) => x.areaName),
  //     series: data.map((x) => x.totalRecords),
  //   };
  // }, [data]);
  // console.log('Counting Data', countingData, 'Dashboard Filter', dashboardFilter);
  const [level, setLevel] = useState<DistributionLevel>('building');
  const normalizeIds = (ids?: string[]) =>
    Array.isArray(ids) ? ids.filter((x) => x && x !== 'Empty') : [];

  function filterCountingData(
    countingData: CountingData | null,
    dashboardFilter?: {
      BuildingId?: string[];
      FloorId?: string[];
      FloorplanId?: string[];
      FloorplanMaskedAreaId?: string[];
    },
  ): CountingData | null {
    // ✅ no data → nothing to do
    if (!countingData) return null;

    // ✅ no filter at all → return as-is
    if (!dashboardFilter) return countingData;

    const buildingIds = normalizeIds(dashboardFilter.BuildingId);
    const floorIds = normalizeIds(dashboardFilter.FloorId);
    const floorplanIds = normalizeIds(dashboardFilter.FloorplanId);
    const areaIds = normalizeIds(dashboardFilter.FloorplanMaskedAreaId);

    const filterRecord = (source?: Record<string, CountingEntity>, allowedIds?: string[]) => {
      if (!source) return source;
      if (!allowedIds || allowedIds.length === 0) return source;

      return Object.fromEntries(Object.entries(source).filter(([id]) => allowedIds.includes(id)));
    };

    return {
      ...countingData,
      building: filterRecord(countingData.building, buildingIds),
      floor: filterRecord(countingData.floor, floorIds),
      floorplan: filterRecord(countingData.floorplan, floorplanIds),
      area: filterRecord(countingData.area, areaIds),
    };
  }

  const filteredCountingData = useMemo(() => {
    return filterCountingData(countingData, dashboardFilter);
  }, [countingData, dashboardFilter]);

  /* ---------------- Chart Options ---------------- */

  const chartData = useMemo<AreaCountState>(() => {
    const source = filteredCountingData?.[level];

    if (!source) {
      return { labels: [], series: [] };
    }

    const entries = Object.values(source);

    return {
      labels: entries.map((x) => x.name),
      series: entries.map((x) => x.count),
    };
  }, [countingData, level]);

  const { labels, series } = chartData;

  const hasData = useMemo(() => {
    return series.length > 0 && series.some((x) => x > 0);
  }, [series]);

  const options: ApexCharts.ApexOptions = {
    chart: {
      id: CHART_ID,
      type: 'pie',
    },

    labels,
    colors: COLORS,

    legend: {
      show: true,
      position: 'bottom',
      markers: {
        size: 12, // ✅ replaces width & height
        shape: 'square', // optional
        offsetX: 0,
        offsetY: 0,
      },
    },

    plotOptions: {
      pie: {
        expandOnClick: true,
      },
    },

    dataLabels: {
      enabled: true,
      style: {
        fontSize: '12px',
        fontWeight: 600,
      },
    },
  };

  /* ---------------- Legend Events ---------------- */

  /* ---------------- Render ---------------- */

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        borderRadius: '25px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <Stack
        direction="column"
        alignItems="center"
        justifyContent="space-between"
        width="100%"
        spacing={2}
      >
        <Typography sx={{ fontSize: 24, fontWeight: 700, color: '#045498' }}>
          Area Distribution
        </Typography>

        <CustomSelect
          size="small"
          value={level}
          onChange={(e: SelectChangeEvent) => setLevel(e.target.value as DistributionLevel)}
          sx={{
            minWidth: 140,
            borderRadius: 2,
            backgroundColor: '#f5f7fa',
          }}
        >
          <MenuItem value="building">Building</MenuItem>
          <MenuItem value="floor">Floor</MenuItem>
          <MenuItem value="floorplan">Floorplan</MenuItem>
          <MenuItem value="area">Area</MenuItem>
        </CustomSelect>
      </Stack>

      <Box
        sx={{
          width: '100%',
          height: { lg: 400, md: '100%', sm: '100%', xs: '100%' },
          mt: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          '& .apexcharts-legend': {
            maxHeight: 180,
            overflowY: 'auto',
          },
        }}
      >
        {hasData ? (
          <Chart options={options} series={series} type="pie" height="100%" />
        ) : (
          <Stack spacing={1} alignItems="center">
            <Typography
              sx={{
                fontSize: 16,
                fontWeight: 600,
                color: '#9aa4b2',
              }}
            >
              No data available
            </Typography>
            {/* <Typography
              sx={{
                fontSize: 13,
                color: '#b0b8c1',
              }}
            >
              Try adjusting the filter
            </Typography> */}
          </Stack>
        )}
      </Box>
    </Box>
  );
};

export default NewAreaDistribution;
