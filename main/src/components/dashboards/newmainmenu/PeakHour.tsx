import { useMemo, useState } from 'react';
import Chart from 'react-apexcharts';
import { Box, Typography, CircularProgress, SelectChangeEvent, MenuItem, useTheme } from '@mui/material';
import { usePeakHour } from 'src/hooks/useDashboard';
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';
import { useSelector } from 'src/store/Store';
import { getUserTimezone } from 'src/utils/time';

/* ---------------- Default Filter ---------------- */

const defaultFilter = {
  TimeRange: 'daily',
  timezone: 'Asia/Jakarta',
  operatorName: null,
  visitorId: null,
  buildingId: null,
  floorId: null,
  floorplanMaskedAreaId: null,
};
type DistributionLevel = 'building' | 'floor' | 'floorplan' | 'area';

// const getUserTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
/* ---------------- Component ---------------- */

const PeakHour: React.FC = () => {
  const theme = useTheme();
  const [level, setLevel] = useState<DistributionLevel>('building');
  const dashboardFilter = useSelector((state: any) => state.customizer.dashboardFilter);

  const timezone = useMemo(() => getUserTimezone(), []);

  const filter = useMemo(
    () => ({
      TimeRange: 'daily',
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

  const { data: peakHourData, isLoading, isError } = usePeakHour(filter, { groupByMode: level });

  /* ---------------- Memoized Chart Data ---------------- */

  const { categories, series } = useMemo(() => {
    if (!peakHourData) {
      return { categories: [], series: [] };
    }

    return {
      categories: peakHourData.labels ?? [],
      series: peakHourData.series ?? [],
    };
  }, [peakHourData]);

  /* ---------------- Chart Options ---------------- */

  const options: ApexCharts.ApexOptions = {
    chart: {
      type: 'area',
      toolbar: { show: false },
      foreColor: theme.palette.text.secondary,
      background: 'transparent',
    },
    theme: {
      mode: theme.palette.mode as 'light' | 'dark',
    },

    stroke: {
      curve: 'smooth',
      width: 2,
    },

    dataLabels: {
      enabled: false,
    },

    markers: {
      size: 0,
    },

    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 0.3,
        opacityFrom: 0.4,
        opacityTo: 0.05,
        stops: [0, 90, 100],
      },
    },

    xaxis: {
      categories,
      labels: {
        style: {
          fontSize: '12px',
        },
      },
    },

    yaxis: {
      labels: {
        style: {
          fontSize: '12px',
        },
      },
    },

    grid: {
      borderColor: theme.palette.divider,
      strokeDashArray: 4,
    },

    legend: {
      position: 'top',
      horizontalAlign: 'left',
    },

    tooltip: {
      theme: theme.palette.mode as 'light' | 'dark',
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
          gap: 2,
        }}
      >
        <Typography
          sx={{
            fontSize: 24,
            fontWeight: 700,
            color: 'primary.main',
          }}
        >
          Peak Hour
        </Typography>
        <CustomSelect
          size="small"
          value={level}
          onChange={(e: SelectChangeEvent) => setLevel(e.target.value as DistributionLevel)}
          sx={{
            minWidth: 140,
            borderRadius: 2,
            backgroundColor: theme.palette.mode === 'dark' ? 'action.hover' : '#f5f7fa',
          }}
        >
          <MenuItem value="building">Building</MenuItem>
          <MenuItem value="floor">Floor</MenuItem>
          <MenuItem value="floorplan">Floorplan</MenuItem>
          <MenuItem value="area">Area</MenuItem>
        </CustomSelect>
      </Box>

      {/* Chart */}
      <Box
        sx={{
          height: '80%',
          width: '100%',
        }}
      >
        {isLoading ? (
          <CircularProgress />
        ) : (
          <Chart options={options} series={series} type="area" height={'100%'} width={'100%'} />
        )}
      </Box>
    </Box>
  );
};

export default PeakHour;
