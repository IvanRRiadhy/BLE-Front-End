// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import { useTheme } from '@mui/material/styles';
import { MenuItem, Grid2 as Grid, Stack, Typography, Button, Avatar, Box } from '@mui/material';
import { IconGridDots } from '@tabler/icons-react';
import DashboardCard from '../../shared/DashboardCard';
import CustomSelect from '../../forms/theme-elements/CustomSelect';
import { Props } from 'react-apexcharts';
import { useTranslation } from 'react-i18next';
import { trackingTransType } from 'src/store/apps/crud/trackingTrans';
import { AlarmType } from 'src/store/apps/crud/alarmRecordTracking';

interface TrackingGraphProps {
  trackingData: trackingTransType[];
  alarmData: AlarmType[];
}

const TrackingGraph: React.FC<TrackingGraphProps> = ({ trackingData = [], alarmData = [] }) => {
  function getCountsByDay(data: any[], dateField: string) {
    const counts = Array(7).fill(0);
    data.forEach((item) => {
      const date = new Date(item[dateField]);
      // getDay: 0=Sunday, 1=Monday, ..., 6=Saturday
      let dayIndex = date.getDay();
      // Adjust so that Monday=0, ..., Sunday=6
      dayIndex = (dayIndex + 6) % 7;
      counts[dayIndex]++;
    });
    return counts;
  }
  // console.log(trackingData, alarmData);

  const allowedVisitor = getCountsByDay(trackingData, 'transTime');
  const unAllowedVisitor = getCountsByDay(alarmData, 'timestamp');
  const { t } = useTranslation();
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setMonth(event.target.value);
  };

  const getMonthYear = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    const month = date.toLocaleString('default', { month: 'long' });
    const year = date.getFullYear();
    // Use ISO format for value, readable for label
    return { value: `${year}-${date.getMonth() + 1}`, label: `${month} ${year}` };
  };
  const today = new Date();
  const todayMonth = {
    value: `${today.getFullYear()}-${today.getMonth() + 1}`,
    label: today.toLocaleString('default', { month: 'long' }) + ' ' + today.getFullYear(),
  };

  const allMonths = [
    ...trackingData.map((d) => getMonthYear(d.transTime)),
    ...alarmData.map((d) => getMonthYear(d.timestamp)),
    todayMonth,
  ].filter(Boolean);

  const uniqueMonthsMap = new Map();
  allMonths.forEach((m) => {
    if (m) uniqueMonthsMap.set(m.value, m.label);
  });
  const uniqueMonths = Array.from(uniqueMonthsMap, ([value, label]) => ({ value, label })).sort(
    (a, b) => a.value.localeCompare(b.value),
  );
  const [month, setMonth] = React.useState(todayMonth.value);
  // chart color
  const theme = useTheme();
  const primary = theme.palette.primary.main;
  const secondary = theme.palette.secondary.main;
  const error = theme.palette.error.dark;

  function buildContinuousSeriesByDay(
    records: any[],
    dateField: string,
    start: string,
    end: string,
  ) {
    // records: your raw data
    // dateField: "transTime" or "timestamp"
    // start/end: ISO date string "YYYY-MM-DD"
    const counts: Record<string, number> = {};
    records.forEach((item) => {
      const d = new Date(item[dateField]);
      const dateStr = d.toISOString().slice(0, 10); // "YYYY-MM-DD"
      counts[dateStr] = (counts[dateStr] || 0) + 1;
    });

    const result = [];
    let d = new Date(start);
    const endDate = new Date(end);
    while (d <= endDate) {
      const dateStr = d.toISOString().slice(0, 10);
      result.push({ x: dateStr, y: counts[dateStr] || 0 });
      d.setDate(d.getDate() + 1);
    }
    return result;
  }

  function getCountsByHour(data: any[], dateField: string) {
    const counts: Record<string, number> = {};
    data.forEach((item) => {
      const d = new Date(item[dateField]);
      // ISO string with hour precision (yyyy-mm-ddTHH:00:00)
      const hourStr =
        new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours())
          .toISOString()
          .slice(0, 13) + ':00:00';
      counts[hourStr] = (counts[hourStr] || 0) + 1;
    });
    return counts;
  }
  // Find the date range for the selected month
  const monthParts = month.split('-');
  const selectedYear = Number(monthParts[0]);
  const selectedMonth = Number(monthParts[1]);

  // Get all days in the selected month
  const firstDay = new Date(selectedYear, selectedMonth - 1, 1);
const lastDay = new Date(selectedYear, selectedMonth, 0, 23, 59, 59, 999); // end of the last day
  const firstDayStr = firstDay.toISOString().slice(0, 10);
  const lastDayStr = lastDay.toISOString().slice(0, 10);

  // Build continuous day series for each type
  const allowedSeries = buildContinuousSeriesByDay(
    trackingData,
    'transTime',
    firstDayStr,
    lastDayStr,
  );
  const unAllowedSeries = buildContinuousSeriesByDay(
    alarmData,
    'timestamp',
    firstDayStr,
    lastDayStr,
  );

  // Combine x points (dates) from both series, so both series use all dates in month
  const allDatesSet = new Set([
    ...allowedSeries.map((s) => s.x),
    ...unAllowedSeries.map((s) => s.x),
  ]);
  const allDates = Array.from(allDatesSet).sort();

  // Map to final chart data
  const allowedAreaSeries = allDates.map((date) => ({
    x: date,
    y: allowedSeries.find((s) => s.x === date)?.y || 0,
  }));
  const unAllowedAreaSeries = allDates.map((date) => ({
    x: date,
    y: unAllowedSeries.find((s) => s.x === date)?.y || 0,
  }));

  const allowedVisitorMonthTotal = trackingData.filter((item) => {
    const d = new Date(item.transTime);
    return d.getFullYear() === selectedYear && d.getMonth() + 1 === selectedMonth;
  }).length;
  const unAllowedVisitorMonthTotal = alarmData.filter((item) => {
    const d = new Date(item.timestamp);
    return d.getFullYear() === selectedYear && d.getMonth() + 1 === selectedMonth;
  }).length;

  // chart
  const seriescolumnchart = [
    {
      name: t('Area accessed with permission'),
      data: allowedAreaSeries,
    },
    {
      name: t('Area accessed without permission'),
      data: unAllowedAreaSeries,
    },
  ];

  const optionscolumnchart: ApexOptions = {
    chart: {
      type: 'bar',
      height: 350,
      stacked: true,
      toolbar: {
        show: true,
      },
      zoom: {
        enabled: true,
      },
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    },
    plotOptions: {
      bar: {
        horizontal: false,
        borderRadius: 8,
        borderRadiusApplication: 'end', // only round the top
        borderRadiusWhenStacked: 'last', // round only top of stack
        columnWidth: '50%',
        dataLabels: {
          total: {
            enabled: true,
            style: {
              fontSize: '13px',
              fontWeight: 900,
            },
          },
        },
      },
    },
    dataLabels: {
      enabled: true,
      style: {
        colors: ['#fff'], // White text inside colored bars
        fontWeight: 700,
      },
      offsetY: 0,
      dropShadow: {
        enabled: false,
      },
    },
    xaxis: {
      type: 'datetime',
      labels: {
        style: { colors: '#999' },
      },
    },
    yaxis: {
      labels: {
        formatter: (val) => Math.abs(val).toString(), // display positive even if using -y
        style: { colors: '#999' },
      },
    },
    fill: {
      opacity: 1,
    },
    tooltip: {
      y: {
        formatter: (val) => Math.abs(val).toString(),
      },
      x: { format: 'dd MMM yyyy' },
    },
    legend: {
      position: 'bottom',
      horizontalAlign: 'center',
      offsetY: 40,
    },
    colors: [primary, error],
  };

  const options = {
    chart: { type: 'area' as const },
    xaxis: { type: 'datetime' as const },
  };
  const series = [
    {
      name: 'Allowed',
      data: [
        { x: '2025-07-01', y: 0 },
        { x: '2025-07-02', y: 1 },
        { x: '2025-07-03', y: 0 },
      ],
    },
  ];

  // console.log(JSON.stringify(seriescolumnchart, null, 2));
  // console.log(JSON.stringify(optionscolumnchart, null, 2));
  return (
    <DashboardCard
      title={t('Tracking Graphic')}
      subtitle={t('Tracking the area visited by Visitor')}
      action={
        <CustomSelect
          labelId="month-dd"
          id="month-dd"
          size="small"
          value={month}
          onChange={handleChange}
        >
          {uniqueMonths.map(({ value, label }) => (
            <MenuItem key={value} value={value}>
              {label}
            </MenuItem>
          ))}
        </CustomSelect>
      }
    >
      <Grid container spacing={3}>
        {/* column */}
        <Grid
          size={{
            xs: 12,
            sm: 9,
          }}
        >
          <Box>
            <Chart
              options={optionscolumnchart}
              series={seriescolumnchart}
              type="bar"
              height="415px"
            />
            {/* <Chart options={options} series={seriescolumnchart} type="area" height={300} /> */}
          </Box>
        </Grid>
        {/* column */}
        <Grid
          size={{
            xs: 12,
            sm: 3,
          }}
        >
          <Stack spacing={3} mt={3}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Box
                width={40}
                height={40}
                bgcolor="primary.light"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Typography color="primary" variant="body2" display="flex">
                  <IconGridDots width={15} />
                </Typography>
              </Box>
              <Box>
                <Typography variant="h6" fontWeight="700">
                  {allowedVisitorMonthTotal + unAllowedVisitorMonthTotal}
                </Typography>
                <Typography variant="body1" color="textSecondary">
                  {t('Accessed Area')}
                </Typography>
              </Box>
            </Stack>
          </Stack>
          <Stack spacing={3} my={5}>
            <Stack direction="row" spacing={2}>
              <Avatar
                sx={{ width: 9, mt: 1, height: 9, bgcolor: primary, svg: { display: 'none' } }}
              ></Avatar>
              <Box>
                <Typography variant="body2" color="textSecondary">
                  {t('Area accessed with permission')}
                </Typography>
                <Typography variant="h5">{allowedVisitorMonthTotal}</Typography>
              </Box>
            </Stack>
            <Stack direction="row" spacing={2}>
              <Avatar
                sx={{ width: 9, mt: 1, height: 9, bgcolor: error, svg: { display: 'none' } }}
              ></Avatar>
              <Box>
                <Typography variant="body2" color="textSecondary">
                  {t('Area accessed without permission')}
                </Typography>
                <Typography variant="h5">{unAllowedVisitorMonthTotal}</Typography>
              </Box>
            </Stack>
          </Stack>
          <Button color="primary" variant="contained" fullWidth>
            View Full Report
          </Button>
        </Grid>
      </Grid>
    </DashboardCard>
  );
};

export default TrackingGraph;
