import React, { useMemo, useState, useEffect } from 'react';
import Chart from 'react-apexcharts';
import { Box, Typography, Stack, MenuItem, useTheme, Card, IconButton, Menu } from '@mui/material';
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

  // Determine if range is between 2 and 7 days
  const is2to7Days = useMemo(() => {
    const range = (timeRange || '').toLowerCase();
    if (range === 'weekly') return true;
    return availableDates.length >= 2 && availableDates.length <= 7;
  }, [timeRange, availableDates.length]);

  // Determine if range is 8 days or more (or monthly)
  const is8DaysOrMore = useMemo(() => {
    const range = (timeRange || '').toLowerCase();
    if (range === 'monthly') return true;
    return availableDates.length >= 8;
  }, [timeRange, availableDates.length]);

  // Track currently displayed date index for Daily mode (default to last date in range)
  const [activeDateIndex, setActiveDateIndex] = useState<number>(0);

  // Group availableDates into calendar weeks (Sunday to Saturday) for Weekly mode
  // Each chunk represents a calendar week containing dates from availableDates
  interface WeekChunk {
    dates: string[]; // dates within this week present in availableDates
    startOfWeek: dayjs.Dayjs; // Sunday
    endOfWeek: dayjs.Dayjs; // Saturday
    label: string; // Display label (e.g. "02 Oct - 04 Oct 2026")
  }

  const weekChunks: WeekChunk[] = useMemo(() => {
    if (availableDates.length === 0) return [];

    const chunks: WeekChunk[] = [];
    let currentChunkDates: string[] = [];
    let currentSunday: dayjs.Dayjs | null = null;

    availableDates.forEach((dateStr) => {
      const d = dayjs(dateStr).startOf('day');
      const sunday = d.subtract(d.day(), 'day').startOf('day');

      if (!currentSunday || !sunday.isSame(currentSunday, 'day')) {
        if (currentChunkDates.length > 0 && currentSunday) {
          const firstD = dayjs(currentChunkDates[0]);
          const lastD = dayjs(currentChunkDates[currentChunkDates.length - 1]);
          const label =
            firstD.format('YYYY-MM-DD') === lastD.format('YYYY-MM-DD')
              ? firstD.format('DD MMM YYYY')
              : `${firstD.format('DD MMM')} - ${lastD.format('DD MMM YYYY')}`;
          chunks.push({
            dates: currentChunkDates,
            startOfWeek: currentSunday,
            endOfWeek: currentSunday.add(6, 'day'),
            label,
          });
        }
        currentSunday = sunday;
        currentChunkDates = [dateStr];
      } else {
        currentChunkDates.push(dateStr);
      }
    });

    if (currentChunkDates.length > 0 && currentSunday) {
      const firstD = dayjs(currentChunkDates[0]);
      const lastD = dayjs(currentChunkDates[currentChunkDates.length - 1]);
      const label =
        firstD.format('YYYY-MM-DD') === lastD.format('YYYY-MM-DD')
          ? firstD.format('DD MMM YYYY')
          : `${firstD.format('DD MMM')} - ${lastD.format('DD MMM YYYY')}`;
      chunks.push({
        dates: currentChunkDates,
        startOfWeek: currentSunday,
        endOfWeek: (currentSunday as dayjs.Dayjs).add(6, 'day'),
        label,
      });
    }

    return chunks;
  }, [availableDates]);

  // Group availableDates into calendar months for Monthly mode
  interface MonthChunk {
    dates: string[]; // dates within this month present in availableDates
    startOfMonth: dayjs.Dayjs; // 1st of month
    daysInMonth: number; // 28, 29, 30, or 31
    label: string; // e.g. "October 2026"
  }

  const monthChunks: MonthChunk[] = useMemo(() => {
    if (availableDates.length === 0) return [];

    const chunks: MonthChunk[] = [];
    let currentChunkDates: string[] = [];
    let currentMonthKey: string | null = null;
    let currentMonthStart: dayjs.Dayjs | null = null;

    availableDates.forEach((dateStr) => {
      const d = dayjs(dateStr).startOf('day');
      const mKey = d.format('YYYY-MM');

      if (!currentMonthKey || mKey !== currentMonthKey) {
        if (currentChunkDates.length > 0 && currentMonthStart) {
          chunks.push({
            dates: currentChunkDates,
            startOfMonth: currentMonthStart,
            daysInMonth: currentMonthStart.daysInMonth(),
            label: currentMonthStart.format('MMMM YYYY'),
          });
        }
        currentMonthKey = mKey;
        currentMonthStart = d.startOf('month');
        currentChunkDates = [dateStr];
      } else {
        currentChunkDates.push(dateStr);
      }
    });

    if (currentChunkDates.length > 0 && currentMonthStart) {
      chunks.push({
        dates: currentChunkDates,
        startOfMonth: currentMonthStart,
        daysInMonth: (currentMonthStart as dayjs.Dayjs).daysInMonth(),
        label: (currentMonthStart as dayjs.Dayjs).format('MMMM YYYY'),
      });
    }

    return chunks;
  }, [availableDates]);

  // Active week index for Weekly mode
  const [activeWeekIndex, setActiveWeekIndex] = useState<number>(0);

  // Active month index for Monthly mode
  const [activeMonthIndex, setActiveMonthIndex] = useState<number>(0);

  // When availableDates or weekChunks or monthChunks change, default to latest
  useEffect(() => {
    setActiveDateIndex(availableDates.length - 1);
  }, [availableDates]);

  useEffect(() => {
    if (weekChunks.length > 0) {
      setActiveWeekIndex(weekChunks.length - 1);
    } else {
      setActiveWeekIndex(0);
    }
  }, [weekChunks]);

  useEffect(() => {
    if (monthChunks.length > 0) {
      setActiveMonthIndex(monthChunks.length - 1);
    } else {
      setActiveMonthIndex(0);
    }
  }, [monthChunks]);

  const activeDateStr = availableDates[activeDateIndex] || dayjs().format('YYYY-MM-DD');
  const activeWeek = weekChunks[activeWeekIndex] || null;
  const activeMonth = monthChunks[activeMonthIndex] || null;

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

  const handlePrevWeek = () => {
    if (activeWeekIndex > 0) {
      setActiveWeekIndex((prev) => prev - 1);
    }
  };

  const handleNextWeek = () => {
    if (activeWeekIndex < weekChunks.length - 1) {
      setActiveWeekIndex((prev) => prev + 1);
    }
  };

  const handlePrevMonth = () => {
    if (activeMonthIndex > 0) {
      setActiveMonthIndex((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (activeMonthIndex < monthChunks.length - 1) {
      setActiveMonthIndex((prev) => prev + 1);
    }
  };

  // State for the jump selection Menu when clicking the cycle control label
  const [dateMenuAnchorEl, setDateMenuAnchorEl] = useState<null | HTMLElement>(null);
  const isDateMenuOpen = Boolean(dateMenuAnchorEl);

  const handleOpenDateMenu = (event: React.MouseEvent<HTMLElement>) => {
    setDateMenuAnchorEl(event.currentTarget);
  };

  const handleCloseDateMenu = () => {
    setDateMenuAnchorEl(null);
  };

  const [selectedOption, setSelectedOption] = useState<string>('Daily');

  useEffect(() => {
    if (isSingleDay) {
      setSelectedOption('Daily');
    } else if (is2to7Days) {
      if (selectedOption !== 'Daily' && selectedOption !== 'Weekly') {
        setSelectedOption('Weekly');
      }
    }
  }, [isSingleDay, is2to7Days, selectedOption]);

  // Helper to extract session list
  const sessionList: VisitorSessionType[] = useMemo(() => {
    return Array.isArray(data)
      ? data
      : Array.isArray((data as any)?.collection?.data)
      ? (data as any).collection.data
      : Array.isArray((data as any)?.data)
      ? (data as any).data
      : [];
  }, [data]);

  // Create distribution from visitor session data
  const { categories, series } = useMemo(() => {
    const isWeeklyMode = selectedOption === 'Weekly';
    const isMonthlyMode = selectedOption === 'Monthly';

    if (isMonthlyMode) {
      const daysCount = activeMonth ? activeMonth.daysInMonth : 30;
      const monthDatesInScope = new Set(activeMonth ? activeMonth.dates : []);

      // Categories: 1, 2, 3, ..., up to 28/29/30/31
      const monthCategories = Array.from({ length: daysCount }, (_, i) => String(i + 1));

      // Daily unique person sets for each day of the month
      const monthlyUniquePeople: Set<string>[] = Array.from({ length: daysCount }, () => new Set<string>());

      const addPersonToMonthDay = (personKey: string, enterTimeStr?: string | null, exitTimeStr?: string | null) => {
        if (!enterTimeStr) return;
        const enterDate = toLocalDate(enterTimeStr);
        if (!enterDate || isNaN(enterDate.getTime())) return;

        const exitDate = exitTimeStr ? toLocalDate(exitTimeStr) : null;

        for (let dayIndex = 0; dayIndex < daysCount; dayIndex++) {
          if (!activeMonth) continue;
          const dayDate = activeMonth.startOfMonth.add(dayIndex, 'day');
          const dayDateStr = dayDate.format('YYYY-MM-DD');

          // Only count if this date falls within the filter range
          if (!monthDatesInScope.has(dayDateStr)) continue;

          const startOfDay = dayDate.toDate();
          const endOfDay = dayDate.hour(23).minute(59).second(59).millisecond(999).toDate();

          if (enterDate.getTime() <= endOfDay.getTime()) {
            if (!exitDate || isNaN(exitDate.getTime()) || exitDate.getTime() >= startOfDay.getTime()) {
              monthlyUniquePeople[dayIndex].add(personKey);
            }
          }
        }
      };

      if (sessionList.length > 0) {
        sessionList.forEach((s) => {
          const pType = s.personType?.toLowerCase();
          if (pType === 'security') return;
          const personKey = s.personId || s.visitorId || s.memberId || s.personName || s.cardName || s.cardId || `${Math.random()}`;
          addPersonToMonthDay(personKey, s.enterTime, s.exitTime);
        });
      } else if ((data as VisitorSessionResponseType)?.persons?.length) {
        const persons = (data as VisitorSessionResponseType).persons || [];
        persons.forEach((p) => {
          const pType = p.personType?.toLowerCase();
          if (pType === 'security') return;
          const personKey = p.personId || p.id || p.personName || p.cardNumber || `${Math.random()}`;
          p.sessions?.forEach((s) => {
            addPersonToMonthDay(personKey, s.enterTime, s.exitTime);
          });
        });
      }

      const seriesData = monthlyUniquePeople.map((set) => set.size);

      return {
        categories: monthCategories,
        series: [
          {
            name: 'People',
            data: seriesData,
          },
        ],
      };
    }

    if (isWeeklyMode) {
      // 7 Days of the week: Sun, Mon, Tue, Wed, Thu, Fri, Sat
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const weekDatesInScope = new Set(activeWeek ? activeWeek.dates : []);

      // Build categories with Day Name + Date if date is in the filtered range
      const weekCategories = dayNames.map((name, dayOfWeek) => {
        if (!activeWeek) return name;
        const dayDate = activeWeek.startOfWeek.add(dayOfWeek, 'day');
        const dayDateStr = dayDate.format('YYYY-MM-DD');
        if (weekDatesInScope.has(dayDateStr)) {
          return `${name} (${dayDate.format('DD/MM')})`;
        }
        return `${name} (-)`;
      });

      // Daily unique person sets for the 7 days of the week
      const dailyUniquePeople: Set<string>[] = Array.from({ length: 7 }, () => new Set<string>());

      // Helper function to check if a session overlaps with a given calendar day
      const addPersonToDay = (personKey: string, enterTimeStr?: string | null, exitTimeStr?: string | null) => {
        if (!enterTimeStr) return;
        const enterDate = toLocalDate(enterTimeStr);
        if (!enterDate || isNaN(enterDate.getTime())) return;

        const exitDate = exitTimeStr ? toLocalDate(exitTimeStr) : null;

        for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
          if (!activeWeek) continue;
          const dayDate = activeWeek.startOfWeek.add(dayOfWeek, 'day');
          const dayDateStr = dayDate.format('YYYY-MM-DD');

          // Only count for days that exist in the active filter range
          if (!weekDatesInScope.has(dayDateStr)) continue;

          const startOfDay = dayDate.toDate();
          const endOfDay = dayDate.hour(23).minute(59).second(59).millisecond(999).toDate();

          // Check if session overlaps with this day:
          // enterDate <= endOfDay AND (exitDate == null || exitDate >= startOfDay)
          if (enterDate.getTime() <= endOfDay.getTime()) {
            if (!exitDate || isNaN(exitDate.getTime()) || exitDate.getTime() >= startOfDay.getTime()) {
              dailyUniquePeople[dayOfWeek].add(personKey);
            }
          }
        }
      };

      if (sessionList.length > 0) {
        sessionList.forEach((s) => {
          const pType = s.personType?.toLowerCase();
          if (pType === 'security') return;
          const personKey = s.personId || s.visitorId || s.memberId || s.personName || s.cardName || s.cardId || `${Math.random()}`;
          addPersonToDay(personKey, s.enterTime, s.exitTime);
        });
      } else if ((data as VisitorSessionResponseType)?.persons?.length) {
        const persons = (data as VisitorSessionResponseType).persons || [];
        persons.forEach((p) => {
          const pType = p.personType?.toLowerCase();
          if (pType === 'security') return;
          const personKey = p.personId || p.id || p.personName || p.cardNumber || `${Math.random()}`;
          p.sessions?.forEach((s) => {
            addPersonToDay(personKey, s.enterTime, s.exitTime);
          });
        });
      }

      const seriesData = dailyUniquePeople.map((set) => set.size);

      return {
        categories: weekCategories,
        series: [
          {
            name: 'People',
            data: seriesData,
          },
        ],
      };
    }

    // Daily mode: Hourly distribution (00:00 - 23:00)
    const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);
    let seriesData = new Array(24).fill(0);
    let totalCount = 0;

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
  }, [data, activeDateStr, activeWeek, activeMonth, selectedOption, sessionList]);

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
      tickAmount: selectedOption === 'Weekly' ? 7 : selectedOption === 'Monthly' ? 15 : 12,
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
        let label = w.globals.categoryLabels[dataPointIndex] || '09:00';
        if (selectedOption === 'Monthly') {
          const monthName = activeMonth ? activeMonth.startOfMonth.format('MMM YYYY') : '';
          label = `Day ${label}${monthName ? ` (${monthName})` : ''}`;
        } else if (selectedOption === 'Weekly') {
          label = label || 'Day';
        }
        return `
          <div style="padding: 8px 12px; background: #fff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); text-align: center;">
            <div style="font-size: 11px; font-weight: 600; color: #666;">${label}</div>
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
            ) : is2to7Days ? (
              [
                <MenuItem key="Daily" value="Daily">Daily</MenuItem>,
                <MenuItem key="Weekly" value="Weekly">Weekly</MenuItem>,
              ]
            ) : is8DaysOrMore ? (
              [
                <MenuItem key="Daily" value="Daily">Daily</MenuItem>,
                <MenuItem key="Weekly" value="Weekly">Weekly</MenuItem>,
                <MenuItem key="Monthly" value="Monthly">Monthly</MenuItem>,
              ]
            ) : (
              [
                <MenuItem key="Daily" value="Daily">Daily</MenuItem>,
                <MenuItem key="Weekly" value="Weekly">Weekly</MenuItem>,
                <MenuItem key="Monthly" value="Monthly">Monthly</MenuItem>,
              ]
            )}
          </CustomSelect>

          {/* Currently displayed date / week / month label and cycle controls */}
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
            {selectedOption === 'Monthly' ? (
              <>
                {monthChunks.length > 1 && (
                  <IconButton
                    size="small"
                    onClick={handlePrevMonth}
                    disabled={activeMonthIndex <= 0}
                    sx={{ p: 0.25, width: 22, height: 22 }}
                  >
                    <IconChevronLeft size={16} />
                  </IconButton>
                )}

                <Typography
                  variant="caption"
                  fontWeight={600}
                  color="text.primary"
                  onClick={monthChunks.length > 1 ? handleOpenDateMenu : undefined}
                  sx={{
                    px: 0.75,
                    py: 0.25,
                    borderRadius: '4px',
                    whiteSpace: 'nowrap',
                    userSelect: 'none',
                    fontSize: '12px',
                    cursor: monthChunks.length > 1 ? 'pointer' : 'default',
                    '&:hover': monthChunks.length > 1 ? { bgcolor: 'action.hover' } : {},
                  }}
                >
                  {activeMonth ? activeMonth.label : '-'}
                </Typography>

                {monthChunks.length > 1 && (
                  <IconButton
                    size="small"
                    onClick={handleNextMonth}
                    disabled={activeMonthIndex >= monthChunks.length - 1}
                    sx={{ p: 0.25, width: 22, height: 22 }}
                  >
                    <IconChevronRight size={16} />
                  </IconButton>
                )}
              </>
            ) : selectedOption === 'Weekly' ? (
              <>
                {weekChunks.length > 1 && (
                  <IconButton
                    size="small"
                    onClick={handlePrevWeek}
                    disabled={activeWeekIndex <= 0}
                    sx={{ p: 0.25, width: 22, height: 22 }}
                  >
                    <IconChevronLeft size={16} />
                  </IconButton>
                )}

                <Typography
                  variant="caption"
                  fontWeight={600}
                  color="text.primary"
                  onClick={weekChunks.length > 1 ? handleOpenDateMenu : undefined}
                  sx={{
                    px: 0.75,
                    py: 0.25,
                    borderRadius: '4px',
                    whiteSpace: 'nowrap',
                    userSelect: 'none',
                    fontSize: '12px',
                    cursor: weekChunks.length > 1 ? 'pointer' : 'default',
                    '&:hover': weekChunks.length > 1 ? { bgcolor: 'action.hover' } : {},
                  }}
                >
                  {activeWeek ? activeWeek.label : '-'}
                </Typography>

                {weekChunks.length > 1 && (
                  <IconButton
                    size="small"
                    onClick={handleNextWeek}
                    disabled={activeWeekIndex >= weekChunks.length - 1}
                    sx={{ p: 0.25, width: 22, height: 22 }}
                  >
                    <IconChevronRight size={16} />
                  </IconButton>
                )}
              </>
            ) : (
              <>
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
                  onClick={!isSingleDay && availableDates.length > 1 ? handleOpenDateMenu : undefined}
                  sx={{
                    px: 0.75,
                    py: 0.25,
                    borderRadius: '4px',
                    whiteSpace: 'nowrap',
                    userSelect: 'none',
                    fontSize: '12px',
                    cursor: !isSingleDay && availableDates.length > 1 ? 'pointer' : 'default',
                    '&:hover': !isSingleDay && availableDates.length > 1 ? { bgcolor: 'action.hover' } : {},
                  }}
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
              </>
            )}
          </Stack>

          {/* Jump Selection Menu when clicking the cycle control label */}
          <Menu
            anchorEl={dateMenuAnchorEl}
            open={isDateMenuOpen}
            onClose={handleCloseDateMenu}
            PaperProps={{
              sx: {
                maxHeight: 260,
                minWidth: 140,
                borderRadius: '8px',
                boxShadow: (th) => th.shadows[6],
              },
            }}
          >
            {selectedOption === 'Monthly' &&
              monthChunks.map((chunk, idx) => (
                <MenuItem
                  key={chunk.startOfMonth.format('YYYY-MM')}
                  selected={idx === activeMonthIndex}
                  onClick={() => {
                    setActiveMonthIndex(idx);
                    handleCloseDateMenu();
                  }}
                  sx={{ fontSize: '13px', py: 0.75 }}
                >
                  {chunk.label}
                </MenuItem>
              ))}

            {selectedOption === 'Weekly' &&
              weekChunks.map((chunk, idx) => (
                <MenuItem
                  key={chunk.startOfWeek.format('YYYY-MM-DD')}
                  selected={idx === activeWeekIndex}
                  onClick={() => {
                    setActiveWeekIndex(idx);
                    handleCloseDateMenu();
                  }}
                  sx={{ fontSize: '13px', py: 0.75 }}
                >
                  {chunk.label}
                </MenuItem>
              ))}

            {selectedOption === 'Daily' &&
              availableDates.map((dateStr, idx) => (
                <MenuItem
                  key={dateStr}
                  selected={idx === activeDateIndex}
                  onClick={() => {
                    setActiveDateIndex(idx);
                    handleCloseDateMenu();
                  }}
                  sx={{ fontSize: '13px', py: 0.75 }}
                >
                  {dayjs(dateStr).format('DD MMM YYYY')}
                </MenuItem>
              ))}
          </Menu>
        </Stack>
      </Stack>

      <Box sx={{ flex: 1, minHeight: 220 }}>
        <Chart options={options} series={series} type="area" width="100%" height={220} />
      </Box>
    </Card>
  );
};

export default TrackingReportPeakHour;
