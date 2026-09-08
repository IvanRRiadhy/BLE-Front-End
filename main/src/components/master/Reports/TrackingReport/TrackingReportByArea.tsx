import React, { useMemo } from 'react';
import Chart from 'react-apexcharts';
import { Box, Typography, useTheme, Card, Stack } from '@mui/material';
import { VisitorSessionResponseType, VisitorSessionType } from 'src/store/apps/crud/visitorSession';

interface TrackingReportByAreaProps {
  data: VisitorSessionType[] | VisitorSessionResponseType | null | undefined;
  isLoading?: boolean;
}

const COLORS = ['#1877F2', '#00C853', '#FF9100', '#D32F2F', '#9C27B0'];

const TrackingReportByArea: React.FC<TrackingReportByAreaProps> = ({ data }) => {
  const theme = useTheme();

  const areaCounts = useMemo(() => {
    const counts: Record<string, number> = {};

    const sessionList: VisitorSessionType[] = Array.isArray(data)
      ? data
      : Array.isArray((data as any)?.collection?.data)
      ? (data as any).collection.data
      : Array.isArray((data as any)?.data)
      ? (data as any).data
      : [];

    if (sessionList.length > 0) {
      sessionList.forEach((session) => {
        if (session.personType?.toLowerCase() === 'security') return;
        const area = session.areaName || 'Other';
        counts[area] = (counts[area] || 0) + 1;
      });
    } else {
      const persons = (data as VisitorSessionResponseType)?.persons || [];
      persons.forEach((person) => {
        if (person.personType?.toLowerCase() === 'security') return;
        const area = person.currentArea || (person.areasVisited && person.areasVisited[0]) || 'Other';
        counts[area] = (counts[area] || 0) + 1;
      });
    }

    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const top4 = sorted.slice(0, 4);
    const rest = sorted.slice(4);
    const restSum = rest.reduce((acc, curr) => acc + curr[1], 0);

    const labels: string[] = top4.map(([name]) => name);
    const series: number[] = top4.map(([, count]) => count);

    if (restSum > 0) {
      labels.push('Lainnya');
      series.push(restSum);
    }

    const total = series.reduce((a, b) => a + b, 0);

    return { labels, series, total };
  }, [data]);

  const { labels, series, total } = areaCounts;
  const hasData = series.length > 0 && series.some((val) => val > 0);

  const options: ApexCharts.ApexOptions = {
    chart: {
      type: 'donut',
      fontFamily: "'Plus Jakarta Sans', sans-serif;",
      foreColor: theme.palette.text.secondary,
      background: 'transparent',
    },
    labels: labels.length > 0 ? labels : ['No Data'],
    colors: COLORS,
    legend: {
      show: false,
    },
    dataLabels: {
      enabled: false,
    },
    plotOptions: {
      pie: {
        donut: {
          size: '75%',
          labels: {
            show: true,
            total: {
              show: true,
              showAlways: true,
              label: 'Total',
              fontSize: '13px',
              fontWeight: 600,
              color: theme.palette.text.secondary,
              formatter: () => `${total}`,
            },
          },
        },
      },
    },
    stroke: {
      show: false,
    },
    tooltip: {
      theme: theme.palette.mode === 'dark' ? 'dark' : 'light',
      y: {
        formatter: (val: number) => {
          const percent = total > 0 ? ((val / total) * 100).toFixed(1) : '0';
          return `${val} (${percent}%)`;
        },
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
      <Typography variant="h6" fontWeight={700} color="text.primary" mb={2}>
        Access by Area (Top 5)
      </Typography>

      <Box
        sx={{
          flex: 1,
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          minHeight: 220,
        }}
      >
        {hasData ? (
          <Box sx={{ display: 'flex', width: '100%', alignItems: 'center' }}>
            {/* Chart 50% */}
            <Box sx={{ width: '50%', minWidth: 0 }}>
              <Chart options={options} series={series} type="donut" width="100%" height={210} />
            </Box>

            {/* Scrollable Legend 50% */}
            <Box
              sx={{
                width: '50%',
                maxHeight: 210,
                overflowY: 'auto',
                pl: 1.5,
                '&::-webkit-scrollbar': { width: '4px' },
                '&::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: '4px' },
              }}
            >
              <Stack spacing={1.25}>
                {labels.map((label, idx) => {
                  const val = series[idx] || 0;
                  const percent = total > 0 ? ((val / total) * 100).toFixed(1) : '0';
                  const color = COLORS[idx % COLORS.length];

                  return (
                    <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          bgcolor: color,
                          flexShrink: 0,
                        }}
                      />
                      <Typography
                        variant="body2"
                        sx={{
                          fontSize: '12px',
                          color: 'text.secondary',
                          wordBreak: 'break-word',
                          lineHeight: 1.3,
                        }}
                      >
                        <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>
                          {label}:
                        </Box>{' '}
                        {val} ({percent}%)
                      </Typography>
                    </Box>
                  );
                })}
              </Stack>
            </Box>
          </Box>
        ) : (
          <Box sx={{ width: '100%', textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No area data available
            </Typography>
          </Box>
        )}
      </Box>
    </Card>
  );
};

export default TrackingReportByArea;