import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid2 as Grid,
  Chip,
  useTheme,
  Stack,
  Divider,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Paper,
} from '@mui/material';

import Chart from 'react-apexcharts';
import { useSelector } from 'src/store/Store';
import { healthCheckMessage } from 'src/store/apps/tracking/ReaderHealth';
import { bleReaderGmacType, useAllReaders, useGMACList } from 'src/hooks/useReader';

const formatUptime = (seconds: number) => {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (s > 0 || parts.length === 0) parts.push(`${s}s`);

  return parts.join(' ');
};

interface GaugeChartProps {
  label: string;
  value: number;
  percentage: number;
  unit: string;
  minMax?: string;
}


const interpolateColor = (color1: string, color2: string, factor: number) => {
  const r1 = parseInt(color1.substring(1, 3), 16);
  const g1 = parseInt(color1.substring(3, 5), 16);
  const b1 = parseInt(color1.substring(5, 7), 16);

  const r2 = parseInt(color2.substring(1, 3), 16);
  const g2 = parseInt(color2.substring(3, 5), 16);
  const b2 = parseInt(color2.substring(5, 7), 16);

  const r = Math.round(r1 + factor * (r2 - r1));
  const g = Math.round(g1 + factor * (g2 - g1));
  const b = Math.round(b1 + factor * (b2 - b1));

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

const getColorAt = (p: number) => {
  if (p <= 0) return '#22c55e';
  if (p >= 100) return '#ef4444';
  if (p <= 50) return interpolateColor('#22c55e', '#eab308', p / 50);
  return interpolateColor('#eab308', '#ef4444', (p - 50) / 50);
};

const GaugeChart = ({ label, value, percentage, unit, minMax }: GaugeChartProps) => {
  const theme = useTheme();

  // Extract min and max from minMax string "0 - 90" or "0% - 100%"
  const minText = minMax?.split(' - ')[0] || '0';
  const maxText = minMax?.split(' - ')[1] || '100';

  // Dynamic color stops based on current percentage
  const colorStops = [
    { offset: 0, color: '#22c55e', opacity: 1 }
  ];
  
  if (percentage > 50) {
    colorStops.push({ offset: (50 / percentage) * 100, color: '#eab308', opacity: 1 });
  }
  
  colorStops.push({ offset: 100, color: getColorAt(percentage), opacity: 1 });

  const options: any = {
    chart: {
      type: 'radialBar',
      offsetY: -10,
      sparkline: {
        enabled: true,
      },
    },
    plotOptions: {
      radialBar: {
        startAngle: -90,
        endAngle: 90,
        track: {
          background: theme.palette.grey[100],
          strokeWidth: '97%',
          margin: 5,
        },
        dataLabels: {
          name: {
            show: false,
          },
          value: {
            offsetY: -5,
            fontSize: '24px',
            fontWeight: '700',
            color: theme.palette.text.primary,
            formatter: () => `${value}${unit}`,
          },
        },
      },
    },
    grid: {
      padding: {
        top: 0,
        bottom: 0,
      },
    },
    fill: {
      type: 'gradient',
      gradient: {
        shade: 'dark',
        type: 'horizontal',
        shadeIntensity: 0.5,
        inverseColors: false,
        opacityFrom: 1,
        opacityTo: 1,
        colorStops: colorStops
      },
    },
  };

  return (
    <Box sx={{ textAlign: 'center', width: '100%', minWidth: '180px', maxWidth: '220px', position: 'relative' }}>
      <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: -3 }}>
        {label}
      </Typography>
      <Box sx={{ position: 'relative' }}>
        <Chart options={options} series={[percentage]} type="radialBar" height={220} width="100%" />
        
        {/* Min label - absolutely positioned at the start of the arc */}
        <Typography 
          variant="caption" 
          fontWeight="700" 
          color="textSecondary"
          sx={{ 
            position: 'absolute', 
            bottom: '-10px', 
            left: '35px' 
          }}
        >
          {minText}
        </Typography>
        
        {/* Max label - absolutely positioned at the end of the arc */}
        <Typography 
          variant="caption" 
          fontWeight="700" 
          color="textSecondary"
          sx={{ 
            position: 'absolute', 
            bottom: '-10px', 
            right: '35px' 
          }}
        >
          {maxText}
        </Typography>
      </Box>
    </Box>
  );
};




const ReaderHealthCard = ({ data }: { data: healthCheckMessage }) => {
  const theme = useTheme();

  // Calculate percentages for gauges
  const tempPercentage = Math.min(Math.max((data.temp / 90) * 100, 0), 100);
  const loadPercentage = Math.min(Math.max(data.load * 100, 0), 100);
  const memPercentage = Math.min(Math.max(data.mem_free, 0), 100);

  return (
    <Card
      sx={{
        mb: 3,
        borderRadius: '20px',
        border: `1px solid ${theme.palette.divider}`,
        boxShadow: theme.shadows[1],
        overflow: 'visible',
      }}
    >
      <CardContent sx={{ p: '24px !important' }}>
        <Grid container spacing={3} alignItems="center">
          {/* Left Info Section */}
          <Grid size={{ xs: 12, md: 3 }}>
            <Stack spacing={1}>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                <Stack direction="row" spacing={2} alignItems="center">
                  <Typography variant="h6" fontWeight="bold">
                    {data.gmac}
                  </Typography>
                  <Chip
                    label={data.msg}
                    size="small"
                    color={data.msg === 'alive' ? 'success' : 'error'}
                    sx={{ textTransform: 'uppercase', fontSize: '10px', height: '20px' }}
                  />
                </Stack>

              </Box>
              <Typography variant="body2" color="textSecondary">
                WAN IP: <Box component="span" color="textPrimary" fontWeight="medium">{data.wanIP}</Box>
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Firmware Version: <Box component="span" color="textPrimary" fontWeight="medium">{data.ver}</Box>
              </Typography>
              
              <Typography variant="body2" color="textSecondary">
                BLE Ver: <Box component="span" color="textPrimary" fontWeight="medium">{data.blever}</Box>
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Up Time: <Box component="span" color="textPrimary" fontWeight="medium">{formatUptime(data.uptime)}</Box>
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Low Volt: <Box component="span" color={data.lowVoltage > 0 ? 'error.main' : 'textPrimary'} fontWeight="medium">{data.lowVoltage}</Box>
              </Typography>
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, md: 0.5 }}>
            <Divider orientation="vertical" flexItem sx={{ height: '100%', display: { xs: 'none', md: 'block' } }} />
          </Grid>

          {/* Right Gauges Section */}
          <Grid size={{ xs: 12, md: 8.5 }}>
            <Box display="flex" justifyContent="space-around" flexWrap="wrap" sx={{ gap: 2 }}>
              <GaugeChart
                label="Temperature"
                value={data.temp}
                percentage={tempPercentage}
                unit="°C"
                minMax="0 - 90"
              />
              <GaugeChart
                label="CPU Load"
                value={Math.round(data.load * 100)}
                percentage={loadPercentage}
                unit="%"
                minMax="0% - 100%"
              />
              <GaugeChart
                label="Memory Free"
                value={data.mem_free}
                percentage={memPercentage}
                unit="%"
                minMax="0% - 100%"
              />

            </Box>
          </Grid>

        </Grid>

      </CardContent>
    </Card>
  );
};

const ReaderHealthTable = ({ data }: { data: healthCheckMessage[] }) => {
  return (
    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '12px', overflow: 'hidden', maxHeight: "75vh", overflowY: "auto" }}>
      <Table stickyHeader sx={{ minWidth: 650 }} aria-label="reader health table">
        <TableHead sx={{ backgroundColor: '#F5F5F5' }}>
          <TableRow>
            <TableCell><Typography variant="subtitle2" fontWeight={700}>MAC Address</Typography></TableCell>
            <TableCell><Typography variant="subtitle2" fontWeight={700}>Status</Typography></TableCell>
            <TableCell><Typography variant="subtitle2" fontWeight={700}>WAN IP</Typography></TableCell>
            <TableCell><Typography variant="subtitle2" fontWeight={700}>Firmware</Typography></TableCell>
            <TableCell><Typography variant="subtitle2" fontWeight={700}>BLE Ver</Typography></TableCell>
            <TableCell><Typography variant="subtitle2" fontWeight={700}>Uptime</Typography></TableCell>
            <TableCell><Typography variant="subtitle2" fontWeight={700}>Low Volt</Typography></TableCell>
            <TableCell align="right"><Typography variant="subtitle2" fontWeight={700}>Temp</Typography></TableCell>
            <TableCell align="right"><Typography variant="subtitle2" fontWeight={700}>CPU Load</Typography></TableCell>
            <TableCell align="right"><Typography variant="subtitle2" fontWeight={700}>Mem Free</Typography></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((row) => (
            <TableRow key={row.gmac} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
              <TableCell><Typography variant="body2" fontWeight={600}>{row.gmac}</Typography></TableCell>
              <TableCell>
                <Chip
                  label={row.msg}
                  size="small"
                  color={row.msg === 'alive' ? 'success' : 'error'}
                  sx={{ textTransform: 'uppercase', fontSize: '10px', height: '20px' }}
                />
              </TableCell>
              <TableCell><Typography variant="body2">{row.wanIP}</Typography></TableCell>
              <TableCell><Typography variant="body2">{row.ver}</Typography></TableCell>
              <TableCell><Typography variant="body2">{row.blever}</Typography></TableCell>
              <TableCell><Typography variant="body2">{formatUptime(row.uptime)}</Typography></TableCell>
              <TableCell>
                <Typography variant="body2" color={row.lowVoltage > 0 ? 'error.main' : 'inherit'} fontWeight={row.lowVoltage > 0 ? 700 : 400}>
                  {row.lowVoltage}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2" fontWeight={700} color={row.temp > 80 ? 'error.main' : 'inherit'}>
                  {row.temp}°C
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2" fontWeight={700} color={row.load > 0.8 ? 'warning.main' : 'inherit'}>
                  {Math.round(row.load * 100)}%
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2" fontWeight={700} color={row.mem_free < 20 ? 'error.main' : 'inherit'}>
                  {row.mem_free}%
                </Typography>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

const ReaderHealthReportList = ({ viewMode = 'visual' }: { viewMode?: 'visual' | 'table' }) => {
  const readerHealthByTopic = useSelector((state) => state.ReaderHealthReducer.readerHealthByTopic);
  const { data: readersResponse } = useGMACList();
  const allReader = readersResponse || [];

  const consolidatedData = React.useMemo(() => {
    const now = Math.floor(Date.now() / 1000);
    const oneMinuteAgo = now - 60;

    return allReader.map((reader: bleReaderGmacType) => {
      const health = readerHealthByTopic[reader.gmac] || 
                     readerHealthByTopic[reader.gmac.toLowerCase()] || 
                     readerHealthByTopic[reader.gmac.toUpperCase()];
      
      let status = 'Non-Active';
      // If we have health data and it was received within the last 60 seconds
      if (health && health.utc >= oneMinuteAgo) {
        status = health.msg || 'alive';
      }

      return {
        ...health,
        gmac: reader.gmac,
        wanIP: reader.ip || health?.wanIP || '-',
        msg: status,
        temp: status === 'Non-Active' ? 0 : (health?.temp ?? 0),
        load: status === 'Non-Active' ? 0 : (health?.load ?? 0),
        mem_free: status === 'Non-Active' ? 0 : (health?.mem_free ?? 0),
        uptime: status === 'Non-Active' ? 0 : (health?.uptime ?? 0),
        ver: health?.ver || '-',
        blever: health?.blever || '-',
        lowVoltage: health?.lowVoltage ?? 0,
        utc: health?.utc ?? 0,
      };
    });
  }, [allReader, readerHealthByTopic]);

  if (allReader.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="textSecondary">
          No readers found in the system.
        </Typography>
      </Box>
    );
  }

  if (viewMode === 'table') {
    return <ReaderHealthTable data={consolidatedData} />;
  }

  return (
    <Box sx={{ maxHeight: "75vh", overflowY: "auto" }}>
      {consolidatedData.map((data) => (
        <ReaderHealthCard key={data.gmac} data={data} />
      ))}
    </Box>
  );
};



export default ReaderHealthReportList;
