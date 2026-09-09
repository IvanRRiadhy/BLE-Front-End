import React, { useMemo } from 'react';
import Chart from 'react-apexcharts';
import { Box, Typography, Stack, MenuItem, useTheme, Card } from '@mui/material';
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';
import { VisitorSessionResponseType, VisitorSessionType } from 'src/store/apps/crud/visitorSession';
import { toLocalDate } from 'src/utils/time';

interface TrackingReportPeakHourProps {
  data: VisitorSessionType[] | VisitorSessionResponseType | null | undefined;
  isLoading?: boolean;
}

const TrackingReportPeakHour: React.FC<TrackingReportPeakHourProps> = ({ data, isLoading }) => {
  const theme = useTheme();

  // Create hourly distribution from visitor session data
  const { categories, series, peakValue, peakHourLabel } = useMemo(() => {
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
      totalCount = sessionList.length;
      // Calculate real distribution from enterTime timestamps in VisitorSessionType[]
      sessionList.forEach((s) => {
        const pType = s.personType?.toLowerCase();
        if (pType === 'security') return;

        if (s.enterTime) {
          const d = toLocalDate(s.enterTime);
          const h = d?.getHours();
          if (h !== undefined && h >= 0 && h < 24) {
            seriesData[h]++;
          }
        }
      });
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

    let maxVal = 0;
    let maxHour = '09:00';
    seriesData.forEach((val, idx) => {  
      if (val >= maxVal) {
        maxVal = val;
        maxHour = hours[idx];
      }
    });

    return {
      categories: hours,
      series: [
        {
          name: 'People',
          data: seriesData,
        },
      ],
      peakValue: maxVal || totalCount,
      peakHourLabel: maxHour,
    };
  }, [data]);

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
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" fontWeight={700} color="text.primary">
          People Presence Over Time
        </Typography>

        <CustomSelect size="small" value="Today" sx={{ minWidth: 100, height: 32, fontSize: '13px' }}>
          <MenuItem value="Today">Today</MenuItem>
          <MenuItem value="Weekly">Weekly</MenuItem>
          <MenuItem value="Monthly">Monthly</MenuItem>
        </CustomSelect>
      </Stack>

      <Box sx={{ flex: 1, minHeight: 220 }}>
        <Chart options={options} series={series} type="area" width="100%" height={220} />
      </Box>
    </Card>
  );
};

export default TrackingReportPeakHour;
