import React, { useMemo, useState, useEffect } from 'react';
import Chart from 'react-apexcharts';
import { Box, Typography, Stack, MenuItem, useTheme, Card, IconButton } from '@mui/material';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';
import { VisitorSessionResponseType, VisitorSessionType } from 'src/store/apps/crud/visitorSession';
import { toLocalDate } from 'src/utils/time';
import dayjs from 'dayjs';

interface TrackingReportPeakHourProps {
  data: VisitorSessionType[] | VisitorSessionResponseType | null | undefined;
  isLoading?: boolean;
  timeRange?: string;
  fromDate?: string | null;
  toDate?: string | null;
}

const TrackingReportPeakHour: React.FC<TrackingReportPeakHourProps> = ({
  data,
  timeRange = 'daily',
  fromDate,
  toDate,
}) => {
  const theme = useTheme();

  // Determine if the filter only includes 1 day
  // (either 'daily' or 'custom' where fromDate and toDate fall on the same day)
  const isSingleDay = useMemo(() => {
    const range = (timeRange || '').toLowerCase();
    if (range === 'daily') return true;
    if (range === 'custom') {
      if (!fromDate && !toDate) return true; // default is today
      if (fromDate && !toDate) return true;
      if (!fromDate && toDate) return true;
      if (fromDate && toDate) {
        return dayjs(fromDate).format('YYYY-MM-DD') === dayjs(toDate).format('YYYY-MM-DD');
      }
    }
    return false;
  }, [timeRange, fromDate, toDate]);

  // Compute the list of dates included in the date range of the filter
  const availableDates: string[] = useMemo(() => {
    const range = (timeRange || '').toLowerCase();
    const today = dayjs().startOf('day');

    if (range === 'daily') {
      return [today.format('YYYY-MM-DD')];
    }

    if (range === 'weekly') {
      // Last 7 days including today (or current week)
      const dates: string[] = [];
      for (let i = 6; i >= 0; i--) {
        dates.push(today.subtract(i, 'day').format('YYYY-MM-DD'));
      }
      return dates;
    }

    if (range === 'monthly') {
      // Last 30 days including today (or current month)
      const dates: string[] = [];
      for (let i = 29; i >= 0; i--) {
        dates.push(today.subtract(i, 'day').format('YYYY-MM-DD'));
      }
      return dates;
    }

    if (range === 'custom') {
      if (fromDate && toDate) {
        const start = dayjs(fromDate).startOf('day');
        const end = dayjs(toDate).startOf('day');
        if (end.isBefore(start)) {
          return [start.format('YYYY-MM-DD')];
        }
        const dates: string[] = [];
        let curr = start;
        while (!curr.isAfter(end)) {
          dates.push(curr.format('YYYY-MM-DD'));
          curr = curr.add(1, 'day');
          if (dates.length > 366) break; // safety cap 1 year
        }
        return dates.length > 0 ? dates : [today.format('YYYY-MM-DD')];
      }
      if (fromDate) {
        return [dayjs(fromDate).format('YYYY-MM-DD')];
      }
      if (toDate) {
        return [dayjs(toDate).format('YYYY-MM-DD')];
      }
    }

    return [today.format('YYYY-MM-DD')];
  }, [timeRange, fromDate, toDate]);

  // Track currently displayed date index (default to the last date in range, usually today)
  const [activeDateIndex, setActiveDateIndex] = useState<number>(0);

  // When availableDates changes, default to the latest date (or today if present)
  useEffect(() => {
    setActiveDateIndex(availableDates.length - 1);
  }, [availableDates]);

  const activeDateStr = availableDates[activeDateIndex] || dayjs().format('YYYY-MM-DD');

  const handlePrevDate = () => {
    if (activeDateIndex > 0) {
      setActiveDateIndex((prev) => prev - 1);
    }
  };

  const handleNextDate = () => {
    if (activeDateIndex < availableDates.length - 1) {
      setActiveDateIndex((prev) => prev + 1);
    }
  };

  const [selectedOption, setSelectedOption] = useState<string>('Daily');

  useEffect(() => {
    if (isSingleDay) {
      setSelectedOption('Daily');
    }
  }, [isSingleDay]);

  // Create hourly distribution from visitor session data
  const { categories, series } = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);
    let seriesData = new Array(24).fill(0);
    let totalCount = 0;

    const sessionList: VisitorSessionType[] = Array.isArray(data)
      ? data
      : Array.isArray((data as any)?.collection?.data)
      ? (data as any).collection.data
      : Array.isArray((data as any)?.data)
      ? (data as any).data
      : [];

    if (sessionList.length > 0) {
      // Determine the target day boundaries for presence calculation:
      // Uses the currently displayed date (activeDateStr) which can be cycled with < and >
      const now = new Date();
      const targetDayjs = dayjs(activeDateStr).startOf('day');
      const targetDate = targetDayjs.toDate();
      const targetYear = targetDate.getFullYear();
      const targetMonth = targetDate.getMonth();
      const targetDay = targetDate.getDate();

      const startOfTargetDay = new Date(targetYear, targetMonth, targetDay, 0, 0, 0, 0);
      const endOfTargetDay = new Date(targetYear, targetMonth, targetDay, 23, 59, 59, 999);

      const isTargetDayToday =
        targetYear === now.getFullYear() &&
        targetMonth === now.getMonth() &&
        targetDay === now.getDate();

      const currentHour = isTargetDayToday ? now.getHours() : 23;

      // Use a Set of person identifiers for each hour to avoid double-counting the same person multiple times in an hour
      const hourlyPeopleSets: Set<string>[] = Array.from({ length: 24 }, () => new Set<string>());
      const allActivePeopleToday = new Set<string>();

      sessionList.forEach((s) => {
        const pType = s.personType?.toLowerCase();
        if (pType === 'security') return;

        if (!s.enterTime) return;
        const enterDate = toLocalDate(s.enterTime);
        if (!enterDate || isNaN(enterDate.getTime())) return;

        // If the entry is in the future beyond target day, ignore
        if (enterDate.getTime() > endOfTargetDay.getTime()) return;

        const exitDate = s.exitTime ? toLocalDate(s.exitTime) : null;

        // If they exited before target day, they were not present on target day
        if (exitDate && !isNaN(exitDate.getTime()) && exitDate.getTime() < startOfTargetDay.getTime()) {
          return;
        }

        // Determine effective start hour on target day
        // Rule 3: If person enters before target day, that means from 00:00 (start of target day)
        let startHour = 0;
        if (enterDate.getTime() >= startOfTargetDay.getTime()) {
          startHour = enterDate.getHours();
        }

        // Determine effective end hour on target day
        // Rule 1: Exited -> until exit hour (if exited on target day, or 23 if exited after target day)
        // Rule 2: No exit time yet -> until currentHour (now if today, 23 if past day)
        let endHour = currentHour;
        if (exitDate && !isNaN(exitDate.getTime())) {
          if (exitDate.getTime() > endOfTargetDay.getTime()) {
            endHour = 23;
          } else {
            endHour = exitDate.getHours();
          }
        } else {
          // No exit time: active until current hour
          endHour = currentHour;
        }

        // Bound start and end hour within [0, 23]
        startHour = Math.max(0, Math.min(23, startHour));
        endHour = Math.max(0, Math.min(23, endHour));

        const personKey = s.personId || s.visitorId || s.memberId || s.personName || s.cardName || s.cardId || `${Math.random()}`;

        if (startHour <= endHour) {
          allActivePeopleToday.add(personKey);
          for (let h = startHour; h <= endHour; h++) {
            hourlyPeopleSets[h].add(personKey);
          }
        }
      });

      seriesData = hourlyPeopleSets.map((set) => set.size);
      totalCount = allActivePeopleToday.size || sessionList.length;
    } else if ((data as VisitorSessionResponseType)?.persons?.length) {
      const now = new Date();
      const targetDayjs = dayjs(activeDateStr).startOf('day');
      const targetDate = targetDayjs.toDate();
      const targetYear = targetDate.getFullYear();
      const targetMonth = targetDate.getMonth();
      const targetDay = targetDate.getDate();

      const startOfTargetDay = new Date(targetYear, targetMonth, targetDay, 0, 0, 0, 0);
      const endOfTargetDay = new Date(targetYear, targetMonth, targetDay, 23, 59, 59, 999);

      const isTargetDayToday =
        targetYear === now.getFullYear() &&
        targetMonth === now.getMonth() &&
        targetDay === now.getDate();

      const currentHour = isTargetDayToday ? now.getHours() : 23;

      const hourlyPeopleSets: Set<string>[] = Array.from({ length: 24 }, () => new Set<string>());
      const allActivePeopleToday = new Set<string>();
      const persons = (data as VisitorSessionResponseType).persons || [];

      persons.forEach((p) => {
        const pType = p.personType?.toLowerCase();
        if (pType === 'security') return;

        const personKey = p.personId || p.id || p.personName || p.cardNumber || `${Math.random()}`;

        p.sessions?.forEach((s) => {
          if (!s.enterTime) return;
          const enterDate = toLocalDate(s.enterTime);
          if (!enterDate || isNaN(enterDate.getTime())) return;
          if (enterDate.getTime() > endOfTargetDay.getTime()) return;

          const exitDate = s.exitTime ? toLocalDate(s.exitTime) : null;
          if (exitDate && !isNaN(exitDate.getTime()) && exitDate.getTime() < startOfTargetDay.getTime()) {
            return;
          }

          let startHour = 0;
          if (enterDate.getTime() >= startOfTargetDay.getTime()) {
            startHour = enterDate.getHours();
          }

          let endHour = currentHour;
          if (exitDate && !isNaN(exitDate.getTime())) {
            if (exitDate.getTime() > endOfTargetDay.getTime()) {
              endHour = 23;
            } else {
              endHour = exitDate.getHours();
            }
          } else {
            endHour = currentHour;
          }

          startHour = Math.max(0, Math.min(23, startHour));
          endHour = Math.max(0, Math.min(23, endHour));

          if (startHour <= endHour) {
            allActivePeopleToday.add(personKey);
            for (let h = startHour; h <= endHour; h++) {
              hourlyPeopleSets[h].add(personKey);
            }
          }
        });
      });

      seriesData = hourlyPeopleSets.map((set) => set.size);
      totalCount = allActivePeopleToday.size || persons.length;
    } else {
      totalCount = (data as VisitorSessionResponseType)?.persons?.length || 0;
      const curveMultipliers = [
        0, 0, 0, 0, 0, 0, // 00:00 - 05:00
        0.05, 0.1, 0.3, 0.7, 0.9, 1.0, // 06:00 - 11:00
        0.8, 0.7, 0.6, 0.5, 0.4, 0.3, // 12:00 - 17:00
        0.2, 0.1, 0.05, 0, 0, 0 // 18:00 - 23:00
      ];
      seriesData = curveMultipliers.map((m) => Math.round(totalCount * m));
    }

    return {
      categories: hours,
      series: [
        {
          name: 'People',
          data: seriesData,
        },
      ],
    };
  }, [data, activeDateStr]);

  const options: ApexCharts.ApexOptions = {
    chart: {
      type: 'area',
      height: 220,
      toolbar: {
        show: true,
        tools: {
          download: false,
          selection: true,
          zoom: true,
          zoomin: true,
          zoomout: true,
          pan: true,
          reset: true,
        },
      },
      zoom: {
        enabled: true,
        type: 'x',
        autoScaleYaxis: true,
      },
      sparkline: { enabled: false },
      foreColor: theme.palette.text.secondary,
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      curve: 'smooth',
      width: 2,
    },
    colors: ['#1877F2'],
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.45,
        opacityTo: 0.05,
        stops: [0, 90, 100],
      },
    },
    xaxis: {
      categories,
      tickAmount: 12,
      labels: {
        style: { fontSize: '11px' },
      },
    },
    yaxis: {
      labels: {
        style: { fontSize: '11px' },
      },
    },
    grid: {
      borderColor: theme.palette.divider,
      strokeDashArray: 4,
    },
    tooltip: {
      theme: theme.palette.mode === 'dark' ? 'dark' : 'light',
      custom: function ({ series, seriesIndex, dataPointIndex, w }) {
        const value = series[seriesIndex][dataPointIndex];
        const hour = w.globals.categoryLabels[dataPointIndex] || '09:00';
        return `
          <div style="padding: 8px 12px; background: #fff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); text-align: center;">
            <div style="font-size: 11px; font-weight: 600; color: #666;">${hour}</div>
            <div style="font-size: 14px; font-weight: 700; color: #1877F2;">${value} People</div>
          </div>
        `;
      },
    },
  };

  return (
    <Card
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '16px',
        p: 2.5,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={1.5}
        mb={2}
      >
        <Typography variant="h6" fontWeight={700} color="text.primary">
          People Presence Over Time
        </Typography>

        <Stack direction="row" spacing={1} alignItems="center">
          <CustomSelect
            size="small"
            value={selectedOption}
            onChange={(e: any) => setSelectedOption(e.target.value)}
            sx={{ minWidth: 90, height: 32, fontSize: '13px' }}
          >
            {isSingleDay ? (
              <MenuItem value="Daily">Daily</MenuItem>
            ) : (
              [
                <MenuItem key="Daily" value="Daily">Daily</MenuItem>,
                <MenuItem key="Weekly" value="Weekly">Weekly</MenuItem>,
                <MenuItem key="Monthly" value="Monthly">Monthly</MenuItem>,
              ]
            )}
          </CustomSelect>

          {/* Currently displayed date label and cycle controls */}
          <Stack
            direction="row"
            alignItems="center"
            spacing={0.5}
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: '7px',
              px: 0.5,
              py: '2px',
              height: 32,
              bgcolor: 'background.paper',
            }}
          >
            {!isSingleDay && (
              <IconButton
                size="small"
                onClick={handlePrevDate}
                disabled={activeDateIndex <= 0}
                sx={{ p: 0.25, width: 22, height: 22 }}
              >
                <IconChevronLeft size={16} />
              </IconButton>
            )}

            <Typography
              variant="caption"
              fontWeight={600}
              color="text.primary"
              sx={{ px: 0.75, whiteSpace: 'nowrap', userSelect: 'none', fontSize: '12px' }}
            >
              {dayjs(activeDateStr).format('DD MMM YYYY')}
            </Typography>

            {!isSingleDay && (
              <IconButton
                size="small"
                onClick={handleNextDate}
                disabled={activeDateIndex >= availableDates.length - 1}
                sx={{ p: 0.25, width: 22, height: 22 }}
              >
                <IconChevronRight size={16} />
              </IconButton>
            )}
          </Stack>
        </Stack>
      </Stack>

      <Box sx={{ flex: 1, minHeight: 220 }}>
        <Chart options={options} series={series} type="area" width="100%" height={220} />
      </Box>
    </Card>
  );
};

export default TrackingReportPeakHour;
