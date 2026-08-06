import { useEffect, useMemo, useState } from 'react';
import Chart from 'react-apexcharts';
import {
  Box,
  Typography,
  Button,
  Stack,
  FormControl,
  Select,
  MenuItem,
  Tooltip,
} from '@mui/material';
import { IconChevronDown } from '@tabler/icons-react';
import { useTrackingAreaAccessed } from 'src/hooks/useDashboard';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { useSelector } from 'src/store/Store';
import { useTheme } from '@mui/material';

dayjs.extend(isoWeek);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

/* ---------------- Types ---------------- */

const defaultFilter = {
  from: '2025-10-01T00:00:00Z',
  to: '2025-10-30T23:59:59Z',
  TimeRange: '',

};

interface TrackingSummary {
  accessedAreaTotal: number;
  withPermission: number;
  withoutPermission: number;
}

interface WeekOption {
  label: string;
  weekIndex: number;
  start: dayjs.Dayjs;
  end: dayjs.Dayjs;
}
/* ---------------- Component ---------------- */

const Tracking: React.FC = () => {
  const theme = useTheme();
  const [trackingFilter, setTrackingFilter] = useState({ ...defaultFilter });
  const dashboardFilter = useSelector((state: any) => state.customizer.dashboardFilter);
  const { data = {}, isLoading, isError } = useTrackingAreaAccessed({  ...dashboardFilter, ...trackingFilter  });

  const today = dayjs();

  const trackingSummary = useMemo<TrackingSummary | null>(() => {
    if (isLoading || isError || !data?.summary) return null;

    return {
      accessedAreaTotal: data.summary.accessedAreaTotal ?? 0,
      withPermission: data.summary.withPermission ?? 0,
      withoutPermission: data.summary.withoutPermission ?? 0,
    };
  }, [data, isLoading, isError]);

  const buildWeekDates = (weekStart: dayjs.Dayjs) => {
    return Array.from({ length: 7 }).map((_, i) => weekStart.add(i, 'day'));
  };

  const SERIES_COLORS: Record<string, string> = {
    'Total Access': '#045498',
    'General Area Access': '#13deb9',
    'Restricted Area Access': '#D73D3D',
  };

  const chartOptions = useMemo<ApexCharts.ApexOptions>(
    () => ({
      chart: {
        type: 'bar',
        stacked: false,
        toolbar: { show: false },
        parentHeightOffset: 0,
        foreColor: theme.palette.text.secondary,
        background: 'transparent',
      },
      theme: {
        mode: theme.palette.mode as 'light' | 'dark',
      },

      plotOptions: {
        bar: {
          borderRadius: 4,
          columnWidth: '50%',
        },
      },

      dataLabels: { enabled: false },
      stroke: { show: false },

      xaxis: {
        categories: data?.chart?.labels ?? [],
        labels: {
          style: {

            fontSize: '12px',
          },
        },
      },

      yaxis: {
        tickAmount: 3,
        labels: {
          style: {
            fontSize: '12px',
            fontWeight: 600,
          },
        },
      },

      grid: {
        borderColor: theme.palette.divider,
      },

      legend: { show: false },
    }),
    [data],
  );

  const getWeeksInMonth = (month: dayjs.Dayjs): WeekOption[] => {
    const startOfMonth = month.startOf('month');
    const endOfMonth = month.endOf('month');

    const weeks: WeekOption[] = [];
    let cursor = startOfMonth.startOf('isoWeek');

    let index = 1;

    while (cursor.isSameOrBefore(endOfMonth)) {
      const weekStart = cursor;
      const weekEnd = cursor.endOf('isoWeek');

      // only include weeks overlapping the month
      if (weekEnd.isSameOrAfter(startOfMonth) && weekStart.isSameOrBefore(endOfMonth)) {
        weeks.push({
          label: `Week ${index}`,
          weekIndex: index,
          start: weekStart,
          end: weekEnd,
        });
        index++;
      }

      cursor = cursor.add(1, 'week');
    }

    return weeks;
  };

  const [selectedMonth, setSelectedMonth] = useState(today.startOf('month'));
  const availableMonths = useMemo(() => {
    const months: dayjs.Dayjs[] = [];
    let cursor = today.startOf('month');

    // how many months back you want (example: 12 months)
    const MAX_MONTH_BACK = 12;

    for (let i = 0; i < MAX_MONTH_BACK; i++) {
      months.push(cursor);
      cursor = cursor.subtract(1, 'month');
    }

    return months;
  }, []);

  const weeks = useMemo(() => getWeeksInMonth(selectedMonth), [selectedMonth]);

  // const [selectedWeek, setSelectedWeek] = useState<WeekOption | null>(defaultWeek);
  const [selectedWeekIndex, setSelectedWeekIndex] = useState<number>(-1);

  // useEffect(() => {
  //   setSelectedWeekIndex(weeks[0]?.weekIndex ?? 1);
  // }, [selectedMonth]);

  useEffect(() => {
    if (!weeks.length) return;

    const currentWeek = weeks.find(
      (w) => today.isSameOrAfter(w.start) && today.isSameOrBefore(w.end),
    );

    // Decision logic
    const weekToSelect = currentWeek
      ? currentWeek // today is in this month
      : today.isBefore(weeks[0].start)
        ? weeks[0] // past month → first week
        : weeks[weeks.length - 1]; // future month → last week

    setSelectedWeekIndex(weekToSelect.weekIndex);
  }, [weeks]);

  const selectedWeek = useMemo(
    () => weeks.find((w) => w.weekIndex === selectedWeekIndex),
    [weeks, selectedWeekIndex],
  );

  const emptyWeekSeries = useMemo(() => {
    return [
      { name: 'Total Access', data: Array(7).fill(0) },
      { name: 'General Area Access', data: Array(7).fill(0) },
      { name: 'Restricted Area Access', data: Array(7).fill(0) },
    ];
  }, []);

  const normalizedChart = useMemo(() => {
    if (!data?.chart || !selectedWeek) {
      return {
        labels: Array.from({ length: 7 }).map((_, i) =>
          selectedWeek?.start.add(i, 'day').format('MMM D'),
        ),
        series: emptyWeekSeries,
      };
    }

    const weekDates = buildWeekDates(selectedWeek.start);

    const labelIndexMap = new Map<string, number>();
    data.chart.labels.forEach((label: string, idx: number) => {
      // label = "Jan 1"
      const parsed = dayjs(`${label} ${selectedWeek.start.year()}`, 'MMM D YYYY');

      labelIndexMap.set(parsed.format('YYYY-MM-DD'), idx);
    });

    const labels = weekDates.map((d) => d.format('MMM D'));

    const series = data.chart.series.map((s: any) => ({
      name: s.name,
      color: SERIES_COLORS[s.name] ?? '#999999',
      data: weekDates.map((d) => {
        const key = d.format('YYYY-MM-DD');
        const apiIndex = labelIndexMap.get(key);
        return apiIndex !== undefined ? s.data[apiIndex] : 0;
      }),
    }));

    return { labels, series };
  }, [data, selectedWeek, emptyWeekSeries]);

  const updateFilterByWeek = (week: WeekOption | undefined) => {
    if (!week) return;

    const from = week.start.startOf('day').toISOString();
    const to = week.end.endOf('day').toISOString();
    
    setTrackingFilter((prev) => ({
      ...prev,
      from,
      to,
    }));
  };

  useEffect(() => {
    if (!selectedWeek) return;

    updateFilterByWeek(selectedWeek);
  }, [selectedWeek]);

  return (
    <Box
      sx={{
        width: '100%',
        height: '28vh', //32vh
        borderRadius: '25px',
        boxShadow: (theme) => theme.shadows[10],
        bgcolor: 'background.paper',
        px: 2,
        py: 2,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* HEADER (fixed height) */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 1,
        }}
      >
        <Box>
          <Typography
            sx={{
              fontSize: 'clamp(18px, 1.4vw, 26px)',
              fontWeight: 700,
              color: 'primary.main',
            }}
          >
            Tracking Graphic
          </Typography>
        </Box>

        <Stack direction="row" spacing={1}>
          {/* Month Selector */}
          <FormControl size="small">
            <Select
              value={selectedMonth.format('YYYY-MM')}
              onChange={(e) => setSelectedMonth(dayjs(e.target.value + '-01'))}
              sx={{
                height: 36,
                borderRadius: '12px',
                color: 'textPrimary',
              }}
            >
              {availableMonths.map((m) => (
                <MenuItem key={m.format('YYYY-MM')} value={m.format('YYYY-MM')}>
                  {m.format('MMMM YYYY')}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Week Selector */}
          <FormControl size="small">
            <Select
              value={selectedWeekIndex}
              displayEmpty
              onChange={(e) => {
                setSelectedWeekIndex(Number(e.target.value));
              }}
              renderValue={(value) => {
                if (value === -1) return ''; // initial placeholder
                const week = weeks.find((w) => w.weekIndex === value);
                return week ? week.label : '';
              }}
              sx={{
                height: 36,
                borderRadius: '12px',
                color: 'textPrimary',
                minWidth: 120,
              }}
            >
              {weeks.map((week) => (
                <MenuItem key={week.weekIndex} value={week.weekIndex}>
                  <Tooltip
                    arrow
                    placement="right"
                    title={`${week.start.format('DD MMM')} – ${week.end.format('DD MMM YYYY')}`}
                  >
                    <Box sx={{ width: '100%' }}>{week.label}</Box>
                  </Tooltip>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </Box>

      {/* CONTENT */}
      <Box
        sx={{
          flex: 1, // ✅ sisa tinggi
          minHeight: 0,
          display: 'flex',
          gap: 3,
          alignItems: 'stretch',
        }}
      >
        {/* CHART */}
        <Box sx={{ flex: 1, minHeight: 0 }}>
          <Chart
            options={{
              ...chartOptions,
              xaxis: {
                ...chartOptions.xaxis,
                categories: normalizedChart.labels,
              },
            }}
            series={normalizedChart.series}
            type="bar"
            height="100%" // ✅ no pixel
          />
        </Box>

        {/* SUMMARY */}
        <Stack spacing={2} sx={{ minWidth: 180, justifyContent: 'center' }}>
          <Box>
            <Typography sx={{ fontSize: 24, fontWeight: 700, color: 'textPrimary' }}>
              {trackingSummary?.accessedAreaTotal ?? '-'}
            </Typography>
            <Typography sx={{ fontSize: 13, color: 'textSecondary' }}>Total Access</Typography>
          </Box>

          <Box>
            <Typography sx={{ fontSize: 24, fontWeight: 700, color: '#13deb9' }}>
              {trackingSummary?.withPermission ?? '-'}
            </Typography>
            <Typography sx={{ fontSize: 13, color: '#13deb9' }}>
              General Area Accessed
            </Typography>
          </Box>

          <Box>
            <Typography sx={{ fontSize: 24, fontWeight: 700, color: '#D73D3D' }}>
              {trackingSummary?.withoutPermission ?? '-'}
            </Typography>
            <Typography sx={{ fontSize: 13, color: '#D73D3D' }}>
              Restricted Area Accessed
            </Typography>
          </Box>
        </Stack>
      </Box>
    </Box>
  );
};

export default Tracking;
