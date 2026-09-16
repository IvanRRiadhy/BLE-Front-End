import React, { useMemo } from 'react';
import Chart from 'react-apexcharts';
import { Box, Typography, Stack, useTheme } from '@mui/material';
import { ActivityBucket } from './movementAnalysisUtils';

interface MovementActivityChartProps {
  buckets: ActivityBucket[];
  currentTimestamp?: string;
  onSeek: (pointIndex: number, timestamp: string) => void;
  isFullscreen?: boolean;
}

export const MovementActivityChart: React.FC<MovementActivityChartProps> = ({
  buckets,
  currentTimestamp,
  onSeek,
  isFullscreen = false,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const categories = useMemo(() => buckets.map((b) => b.timeLabel), [buckets]);
  const seriesData = useMemo(() => buckets.map((b) => b.count), [buckets]);

  // Find active bucket index corresponding to current playback timestamp
  const activeBucketIndex = useMemo(() => {
    if (!currentTimestamp || buckets.length === 0) return -1;
    const currentMs = new Date(currentTimestamp).getTime();
    let closestIdx = 0;
    let minDiff = Infinity;
    buckets.forEach((b, idx) => {
      const bMs = new Date(b.timestamp).getTime();
      const diff = Math.abs(currentMs - bMs);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = idx;
      }
    });
    return closestIdx;
  }, [buckets, currentTimestamp]);

  const activeBucket = activeBucketIndex >= 0 ? buckets[activeBucketIndex] : null;

  const chartOptions: ApexCharts.ApexOptions = useMemo(
    () => ({
      chart: {
        type: 'bar',
        height: isFullscreen ? 200 : 160,
        toolbar: { show: false },
        animations: { enabled: false },
        events: {
          dataPointSelection: (_event, _chartContext, config) => {
            const selectedIdx = config.dataPointIndex;
            if (selectedIdx >= 0 && selectedIdx < buckets.length) {
              const bucket = buckets[selectedIdx];
              onSeek(bucket.pointIndex, bucket.timestamp);
            }
          },
        },
      },
      plotOptions: {
        bar: {
          columnWidth: '55%',
          borderRadius: 2,
          colors: {
            ranges:
              activeBucketIndex >= 0
                ? [
                    {
                      from: 0,
                      to: 10000,
                      color: '#1877F2',
                    },
                  ]
                : undefined,
          },
        },
      },
      dataLabels: { enabled: false },
      stroke: { show: false },
      xaxis: {
        categories,
        labels: {
          style: {
            colors: isDark ? '#94a3b8' : '#64748b',
            fontSize: '10px',
          },
          rotate: 0,
          hideOverlappingLabels: true,
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        labels: {
          style: {
            colors: isDark ? '#94a3b8' : '#64748b',
            fontSize: '10px',
          },
        },
      },
      grid: {
        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
        strokeDashArray: 3,
        padding: { top: 0, bottom: 0, left: 10, right: 10 },
      },
      tooltip: {
        theme: isDark ? 'dark' : 'light',
        y: {
          formatter: (val: number) => `${val} positions recorded`,
        },
      },
      colors: ['#1877F2'],
      annotations:
        activeBucketIndex >= 0 && categories[activeBucketIndex]
          ? {
              xaxis: [
                {
                  x: categories[activeBucketIndex],
                  borderColor: '#0284c7',
                  label: {
                    text: `${activeBucket?.count ?? 0} pos`,
                    style: {
                      background: '#0284c7',
                      color: '#ffffff',
                      fontSize: '10px',
                      fontWeight: 700,
                    },
                  },
                },
              ],
            }
          : undefined,
    }),
    [categories, isDark, buckets, onSeek, activeBucketIndex, activeBucket],
  );

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: '16px',
        border: '1px solid',
        borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
        bgcolor: isDark ? 'background.paper' : '#ffffff',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Typography variant="subtitle1" fontWeight={700} color="text.primary">
            Movement Activity
          </Typography>
          {activeBucket && (
            <Typography
              variant="caption"
              sx={{
                bgcolor: 'rgba(24, 119, 242, 0.1)',
                color: '#1877F2',
                fontWeight: 700,
                px: 1,
                py: 0.25,
                borderRadius: '6px',
              }}
            >
              {activeBucket.timeLabel} — {activeBucket.count} positions
            </Typography>
          )}
        </Stack>

        {/* Legend */}
        <Stack direction="row" spacing={2} alignItems="center">
          <Stack direction="row" spacing={0.75} alignItems="center">
            <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: '#1877F2' }} />
            <Typography variant="caption" color="text.secondary" fontSize="0.72rem">
              Movement Count
            </Typography>
          </Stack>
          <Stack direction="row" spacing={0.75} alignItems="center">
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: '2px',
                bgcolor: 'rgba(2, 132, 199, 0.35)',
              }}
            />
            <Typography variant="caption" color="text.secondary" fontSize="0.72rem">
              Selected Time
            </Typography>
          </Stack>
        </Stack>
      </Box>

      {/* Chart */}
      <Box sx={{ flex: 1, minHeight: 140 }}>
        {buckets.length === 0 ? (
          <Box display="flex" alignItems="center" justifyContent="center" height="100%">
            <Typography variant="caption" color="text.secondary">
              No movement activity in this time range
            </Typography>
          </Box>
        ) : (
          <Chart
            options={chartOptions}
            series={[{ name: 'Positions', data: seriesData }]}
            type="bar"
            height={isFullscreen ? 200 : 160}
          />
        )}
      </Box>
    </Box>
  );
};
