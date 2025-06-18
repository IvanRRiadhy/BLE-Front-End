// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import Chart from 'react-apexcharts';
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

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

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

  // chart
  const optionscolumnchart: Props = {
    chart: {
      type: 'bar',
      fontFamily: "'Plus Jakarta Sans', sans-serif;",
      foreColor: '#adb0bb',
      toolbar: {
        show: true,
      },
      height: 370,
      stacked: true,
    },
    colors: [primary, secondary],
    plotOptions: {
      bar: {
        horizontal: false,
        barHeight: '60%',
        columnWidth: '35%',
        borderRadius: [6],
        borderRadiusApplication: 'end',
        borderRadiusWhenStacked: 'all',
      },
    },

    stroke: {
      show: false,
    },
    dataLabels: {
      enabled: false,
    },
    legend: {
      show: false,
    },
    grid: {
      borderColor: 'rgba(0,0,0,0.1)',
      strokeDashArray: 3,
      xaxis: {
        lines: {
          show: false,
        },
      },
    },
    yaxis: {
      min: Math.max(...unAllowedVisitor) * -1 - 5,
      max: Math.max(...allowedVisitor) + 5,
      tickAmount: 4,
    },
    xaxis: {
      categories: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      axisBorder: {
        show: false,
      },
    },
    tooltip: {
      theme: theme.palette.mode === 'dark' ? 'dark' : 'light',
      fillSeriesColor: false,
    },
  };
  const seriescolumnchart = [
    {
      name: 'Area accessed with with permission',
      data: allowedVisitor,
    },
    {
      name: 'Area accessed without permission',
      data: unAllowedVisitor.map((item) => item * -1),
    },
  ];

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
            sm: 8,
          }}
        >
          <Box className="rounded-bars">
            <Chart
              options={optionscolumnchart}
              series={seriescolumnchart}
              type="bar"
              height="370px"
            />
          </Box>
        </Grid>
        {/* column */}
        <Grid
          size={{
            xs: 12,
            sm: 4,
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
                <Typography color="primary" variant="h6" display="flex">
                  <IconGridDots width={21} />
                </Typography>
              </Box>
              <Box>
                <Typography variant="h3" fontWeight="700">
                  {allowedVisitor.reduce((a, b) => a + b, 0) +
                    unAllowedVisitor.reduce((a, b) => a + b, 0)}
                </Typography>
                <Typography variant="subtitle2" color="textSecondary">
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
                <Typography variant="subtitle1" color="textSecondary">
                  {t('Area accessed with permission')}
                </Typography>
                <Typography variant="h5">{allowedVisitor.reduce((a, b) => a + b, 0)}</Typography>
              </Box>
            </Stack>
            <Stack direction="row" spacing={2}>
              <Avatar
                sx={{ width: 9, mt: 1, height: 9, bgcolor: secondary, svg: { display: 'none' } }}
              ></Avatar>
              <Box>
                <Typography variant="subtitle1" color="textSecondary">
                  {t('Area accessed without permission')}
                </Typography>
                <Typography variant="h5">{unAllowedVisitor.reduce((a, b) => a + b, 0)}</Typography>
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
