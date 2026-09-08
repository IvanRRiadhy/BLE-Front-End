import React, { useMemo } from 'react';
import Chart from 'react-apexcharts';
import { Box, Typography, useTheme, Card, Stack } from '@mui/material';
import { VisitorSessionResponseType, VisitorSessionType } from 'src/store/apps/crud/visitorSession';

interface TrackingReportByPeopleProps {
  data: VisitorSessionType[] | VisitorSessionResponseType | null | undefined;
  isLoading?: boolean;
}

const COLORS = ['#1877F2', '#FF9100'];

const TrackingReportByPeople: React.FC<TrackingReportByPeopleProps> = ({ data }) => {
  const theme = useTheme();

  const { labels, series, total } = useMemo(() => {
    let members = 0;
    let visitors = 0;
    const seenPersons = new Set<string>();

    const sessionList: VisitorSessionType[] = Array.isArray(data)
      ? data
      : Array.isArray((data as any)?.collection?.data)
      ? (data as any).collection.data
      : Array.isArray((data as any)?.data)
      ? (data as any).data
      : [];

    if (sessionList.length > 0) {
      sessionList.forEach((p) => {
        const pType = p.personType?.toLowerCase();
        if (pType === 'security') return;

        const pId = p.personId || p.memberId || p.visitorId || p.personName;
        if (pId && !seenPersons.has(pId)) {
          seenPersons.add(pId);
          if (pType === 'visitor') {
            visitors++;
          } else if (pType === 'member') {
            members++;
          }
        }
      });
    } else {
      const persons = (data as VisitorSessionResponseType)?.persons || [];
      persons.forEach((p) => {
        const pType = p.personType?.toLowerCase();
        if (pType === 'security') return;

        const pId = p.personId || p.personName;
        if (pId && !seenPersons.has(pId)) {
          seenPersons.add(pId);
          if (pType === 'visitor') {
            visitors++;
          } else if (pType === 'member') {
            members++;
          }
        }
      });
    }

    const totalCount = members + visitors;
    return {
      labels: ['Members', 'Visitors'],
      series: [members, visitors],
      total: totalCount,
    };
  }, [data]);

  const hasData = series.some((val) => val > 0);

  const options: ApexCharts.ApexOptions = {
    chart: {
      type: 'donut',
      fontFamily: "'Plus Jakarta Sans', sans-serif;",
      foreColor: theme.palette.text.secondary,
      background: 'transparent',
    },
    labels,
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
        People by Type
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
              No person type data available
            </Typography>
          </Box>
        )}
      </Box>
    </Card>
  );
};

export default TrackingReportByPeople;
