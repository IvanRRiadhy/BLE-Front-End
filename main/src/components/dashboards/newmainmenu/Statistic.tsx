import { useEffect, useMemo, useState } from 'react';
import Chart from 'react-apexcharts';
import { Box, Typography, useTheme } from '@mui/material';
import { useAlarmStatisticHourly, usePeakHour } from 'src/hooks/useDashboard';
import { useSelector } from 'src/store/Store';

/* ---------------- Types ---------------- */

interface StatisticRawItem {
  hourLabel: string;
  status: Record<string, number>;
}

type ChartSeries = {
  name: string;
  data: number[];
}[];

const defaultFilter = {
  // from: '2025-10-01T00:00:00Z',
  // to: '2025-10-30T23:59:59Z',
  TimeRange: 'weekly',
  operatorName: null,
  visitorId: null,
  buildingId: null,
  floorId: null,
  floorplanMaskedAreaId: null,
};

const getUserTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

/* ---------------- Component ---------------- */

const Statistic: React.FC = () => {
  const theme = useTheme();
  const timezone = useMemo(() => getUserTimezone(), []);
  const dashboardFilter = useSelector((state: any) => state.customizer.dashboardFilter);
  const body = useMemo(
    () => ({
      timerange: 'daily',
      timezone,
            operatorName: null,
      visitorId: null,
      buildingId: dashboardFilter?.BuildingId ?? null,
      floorId: dashboardFilter?.FloorId ?? null,
      floorplanId: dashboardFilter?.FloorplanId ?? null,
      areaId: dashboardFilter?.FloorplanmaskedAreaId ?? null,

    }),
    [timezone, dashboardFilter],
  );

  const { data = [], isLoading, isError } = useAlarmStatisticHourly(body);
  // const { data: peakHourData, isLoading: isLoading2, isError: isError2 } = usePeakHour(defaultFilter);
  // console.log('peakHourData', peakHourData);

  const { categories, series } = useMemo(() => {
    if (!data.length) {
      return { categories: [], series: [] as ChartSeries };
    }
    const raw = data as StatisticRawItem[];
    // X-axis
    const categories = raw.map((item: any) => item.hourLabel);

    // collect all unique status keys
    const statusKeys = Array.from(
      new Set(raw.flatMap((item: any) => Object.keys(item.status ?? {}))),
    );

    // build chart series
    const series: ChartSeries = statusKeys.map((key) => ({
      name: key,
      data: raw.map((item) => item.status?.[key] ?? 0),
    }));

    return { categories, series };
  }, [data]);

  /* ---------------- Chart Options ---------------- */

  const options: ApexCharts.ApexOptions = {
    chart: {
      type: 'line',
      toolbar: { show: false },
      foreColor: theme.palette.text.secondary,
      background: 'transparent',
    },
    theme: {
      mode: theme.palette.mode as 'light' | 'dark',
    },

    stroke: {
      curve: 'straight',
      width: 3,
    },

    markers: { size: 0 },

    xaxis: {
      categories,
      labels: {
        style: {
          fontSize: '13px',
        },
      },
    },

    yaxis: {
      labels: {
        style: {
          fontSize: '13px',
        },
      },
    },

    grid: {
      borderColor: theme.palette.divider,
    },

    legend: {
      position: 'top',
      horizontalAlign: 'right',
    },
  };

  /* ---------------- Render ---------------- */

  return (
    <Box
      sx={{
        width: '100%',
        height: '32vh',
        borderRadius: '25px',
        boxShadow: (theme) => theme.shadows[10],
        bgcolor: 'background.paper',
        px: 2,
        py: 1,
      }}
    >
      {/* Title */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          p: 2,
          // mb: 1,
        }}
      >
        <Typography
          sx={{
            fontSize: 26,
            fontWeight: 700,
            color: 'primary.main',
          }}
        >
          Alarm Statistic
        </Typography>
      </Box>

      {/* Chart */}
      <Box sx={{ height: '80%', width: '100%' }}>
        <Chart options={options} series={series} type="line" height={'100%'} />
      </Box>
    </Box>
  );
};

export default Statistic;
