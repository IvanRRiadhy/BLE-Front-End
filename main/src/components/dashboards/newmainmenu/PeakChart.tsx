import { useEffect, useMemo, useState, useRef } from 'react';
import Chart from 'react-apexcharts';
import { Box, Typography, CircularProgress, SelectChangeEvent, MenuItem, useTheme } from '@mui/material';
import { usePeakHour, useAlarmStatisticHourly } from 'src/hooks/useDashboard';
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';
import { useSelector } from 'src/store/Store';
import { getUserTimezone } from 'src/utils/time';
import { formatAbbreviatedNumber } from 'src/utils/numberAbbreviation';

/* ---------------- Types & Filters ---------------- */

type DistributionLevel = 'building' | 'floor' | 'floorplan' | 'area';
type ChartViewMode =  'activity' | 'alarm';

interface StatisticRawItem {
  hourLabel: string;
  status: Record<string, number>;
}

/* ---------------- Component ---------------- */

const PeakChart: React.FC = () => {
  const theme = useTheme();
  const [level, setLevel] = useState<DistributionLevel>('building');
  const [viewMode, setViewMode] = useState<ChartViewMode>('activity');
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

  const { data: peakHourData, isLoading: isPeakLoading } = usePeakHour(filter, { groupByMode: level });
  const { data: alarmData = [], isLoading: isAlarmLoading } = useAlarmStatisticHourly(body);

  const isLoading = isPeakLoading || isAlarmLoading;

  useEffect(() => {
    if (dashboardFilter) {
      if (dashboardFilter.FloorplanMaskedAreaId.length > 0) {
        setLevel('area');
      } else if (dashboardFilter.FloorplanId.length > 0) {
        setLevel('floorplan');
      } else if (dashboardFilter.FloorId.length > 0) {
        setLevel('floor');
      } else if (dashboardFilter.BuildingId.length > 0) {
        setLevel('building');
      }
    }
  }, [dashboardFilter]);

  /* ---------------- Memoized Chart Data ---------------- */

  const { categories, series } = useMemo(() => {
    const cats = peakHourData?.labels ?? [];
    if (!cats.length) {
      return { categories: [], series: [] };
    }

    // 1. Peak Hour occupancy series (Area style)
    const peakSeries = (peakHourData?.series ?? []).map((s: any) => ({
      name: s.name,
      type: 'area',
      data: s.data ?? [],
    }));

    // 2. Alarm Statistic series (Line style)
    const alarmRaw = (alarmData ?? []) as StatisticRawItem[];
    const statusKeys = Array.from(
      new Set(alarmRaw.flatMap((item) => Object.keys(item.status ?? {}))),
    );

    const alarmSeries = statusKeys.map((key) => {
      const data = cats.map((cat: any) => {
        const match = alarmRaw.find((item) => {
          const label = (item.hourLabel ?? '').trim();
          const cLabel = (cat ?? '').trim();
          const cleanL = label.replace(/[^a-zA-Z0-9]/g, '');
          const cleanC = cLabel.replace(/[^a-zA-Z0-9]/g, '');
          return cleanL === cleanC || cleanL.startsWith(cleanC) || cleanC.startsWith(cleanL);
        });
        return match?.status?.[key] ?? 0;
      });

      return {
        name: `Alarm (${key})`,
        type: 'line',
        data,
      };
    });

    let displaySeries = [];
    if (viewMode === 'activity') {
      displaySeries = peakSeries;
    } else if (viewMode === 'alarm') {
      displaySeries = alarmSeries;
    }

    return {
      categories: cats,
      series: displaySeries,
    };
  }, [peakHourData, alarmData, viewMode]);

  /* ---------------- Chart Options ---------------- */

  const hasZoomed = useRef(false);

  useEffect(() => {
    hasZoomed.current = false;
  }, [peakHourData]);

  const options: ApexCharts.ApexOptions = {
    chart: {
      type: 'line', // Generic type for mixed chart
      toolbar: { 
        show: true,
        tools: {
          download: false,
          selection: false,
          zoom: true,
          zoomin: true,
          zoomout: true,
          pan: true,
          reset: true,
        }
      },
      zoom: {
        enabled: true,
      },
      events: {
        updated: (chartContext) => {
          if (!hasZoomed.current && chartContext.w.config.series[0]?.data?.length > 0) {
            hasZoomed.current = true;
            chartContext.zoomX(0, new Date().getHours());
          }
        }
      },
      foreColor: theme.palette.text.secondary,
      background: 'transparent',
    },
    theme: {
      mode: theme.palette.mode as 'light' | 'dark',
    },
    stroke: {
      curve: 'smooth',
      width: series.length > 0 ? series.map((s: any) => s.type === 'line' ? 3 : 2) : 2,
    },
    dataLabels: {
      enabled: false,
    },
    markers: {
      size: series.length > 0 ? series.map((s: any) => s.type === 'line' ? 4 : 0) : 0,
    },
    fill: {
      type: series.length > 0 ? (series.map((s: any) => s.type === 'line' ? 'solid' : 'gradient') as any) : 'gradient',
      gradient: {
        shadeIntensity: 0.3,
        opacityFrom: 0.4,
        opacityTo: 0.05,
        stops: [0, 90, 100],
      },
    },
    xaxis: {
      categories,
      tickPlacement: 'on',
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
        formatter: (val: number) => formatAbbreviatedNumber(val),
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
      y: {
        formatter: (val: number) => (typeof val === 'number' ? val.toLocaleString() : String(val)),
      },
    },
  };

  /* ---------------- Render ---------------- */

  return (
    <Box
      sx={{
        width: '100%',
        height: '28vh',
        borderRadius: '25px',
        boxShadow: (theme) => theme.shadows[10],
        bgcolor: 'background.paper',
        px: 2,
        py: 1,
      }}
    >
      {/* Title & Controls */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center', 
          p: 2,
          gap: 2,
          flexWrap: 'wrap',
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

        <Box sx={{ display: 'flex', gap: 1.5, ml: 'auto', flexWrap: 'wrap' }}>
          {viewMode === "activity" && (
            <CustomSelect
            size="small"
            value={level}
            onChange={(e: SelectChangeEvent) => setLevel(e.target.value as DistributionLevel)}
            sx={{
              minWidth: 120,
              borderRadius: 2,
              backgroundColor: theme.palette.mode === 'dark' ? 'action.hover' : '#f5f7fa',
            }}
          >
            <MenuItem value="building">Building</MenuItem>
            <MenuItem value="floor">Floor</MenuItem>
            <MenuItem value="floorplan">Floorplan</MenuItem>
            <MenuItem value="area">Area</MenuItem>
          </CustomSelect>
          )}

          <CustomSelect
            size="small"
            value={viewMode}
            onChange={(e: SelectChangeEvent) => setViewMode(e.target.value as ChartViewMode)}
            sx={{
              minWidth: 120,
              borderRadius: 2,
              backgroundColor: theme.palette.mode === 'dark' ? 'action.hover' : '#f5f7fa',
            }}
          >
            {/* <MenuItem value="all">All</MenuItem> */}
            <MenuItem value="activity">Activity</MenuItem>
            <MenuItem value="alarm">Alarm</MenuItem>
          </CustomSelect>
        </Box>
      </Box>

      {/* Chart */}
      <Box
        sx={{
          height: '80%',
          width: '100%',
        }}
      >
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress />
          </Box>
        ) : (
          <Chart options={options} series={series} type="line" height={'100%'} width={'100%'} />
        )}
      </Box>
    </Box>
  );
};

export default PeakChart;
