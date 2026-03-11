import { useMemo } from 'react';
import Chart from 'react-apexcharts';
import { Box, Typography } from '@mui/material';
import ApexCharts from 'apexcharts';
import { useAlarmPerformance } from 'src/hooks/useDashboard';

// const ALARM_CATEGORIES = [
//   'CardAccess',
//   'Geofence',
//   'StayOnArea',
//   'OverPopulating',
//   'Expired',
//   'Help',
//   //   'WrongZone',
//   //   'Blacklist',
// ];
interface AlarmTimeSample {
  category: string;
  totalTimeSec: number;
  responseTimeSec: number;
  resolutionTimeSec: number;
}

const defaultFilter = {
  timeRange: 'daily',
  floorplanMaskedAreaId: null,
  operatorName: null,
  visitorId: null,
  buildingId: null,
  floorId: null,
};

//Dummy Purpose
// const generateDummyAlarmData = (): AlarmTimeSample[] => {
//   const data: AlarmTimeSample[] = [];

//   ALARM_CATEGORIES.forEach((category) => {
//     for (let i = 0; i < 10; i++) {
//       const responseTimeSec = 60 + Math.random() * 600; // 1–6 min
//       const resolutionTimeSec = 60 + Math.random() * 600; // 1–12 min
//       data.push({
//         category,
//         totalTimeSec: responseTimeSec + resolutionTimeSec,
//         responseTimeSec: responseTimeSec,
//         resolutionTimeSec: resolutionTimeSec,
//       });
//     }
//   });

//   return data;
// };

// const aggregateRadarData = (samples: AlarmTimeSample[]) => {
//   const result: Record<
//     string,
//     { total: number; response: number; resolution: number; count: number }
//   > = {};

//   samples.forEach((s) => {
//     if (!result[s.category]) {
//       result[s.category] = {
//         total: 0,
//         response: 0,
//         resolution: 0,
//         count: 0,
//       };
//     }

//     result[s.category].total += s.totalTimeSec;
//     result[s.category].response += s.responseTimeSec;
//     result[s.category].resolution += s.resolutionTimeSec;
//     result[s.category].count++;
//   });

//   return ALARM_CATEGORIES.map((cat) => {
//     const r = result[cat];
//     return {
//       category: cat,
//       totalMin: r ? r.total / r.count / 60 : 0,
//       responseMin: r ? r.response / r.count / 60 : 0,
//       resolutionMin: r ? r.resolution / r.count / 60 : 0,
//     };
//   });
// };

const AlarmRadarChart: React.FC = () => {
  // const rawData = useMemo(() => generateDummyAlarmData(), []);
  // const aggregated = useMemo(() => aggregateRadarData(rawData), [rawData]);
  const { data: realData = [] } = useAlarmPerformance(defaultFilter);
  // console.log("RealData", realData);
  const categories = useMemo(() => {
    if (!realData || realData.length === 0) return [];
    return realData.map((x: any) => x.alarmStatus);
  }, [realData]);
  const aggregated = useMemo(() => {
    if (!realData || realData.length === 0) return [];

    return realData.map((x: any) => ({
      category: x.alarmStatus,
      totalMin: (x.totalSeconds ?? 0) / 60,
      responseMin: (x.responseTimeSeconds ?? 0) / 60,
      resolutionMin: (x.resolutionTimeSeconds ?? 0) / 60,
    }));
  }, [realData]);
  const hasData = categories.length > 0;
  const series: ApexCharts.ApexOptions['series'] = [
    {
      name: 'Total Time (min)',
      data: aggregated.map((x: any) => Number(x.totalMin.toFixed(1))),
    },
    {
      name: 'Response Time (min)',
      data: aggregated.map((x: any) => Number(x.responseMin.toFixed(1))),
    },
    {
      name: 'Resolution Time (min)',
      data: aggregated.map((x: any) => Number(x.resolutionMin.toFixed(1))),
    },
  ];

  const options: ApexCharts.ApexOptions = {
    chart: {
      type: 'radar',
      height: '100%',
      animations: { enabled: true },
    },
    plotOptions: {
      radar: {
        size: 90, // 🔥 increase this
        polygons: {
          strokeColors: '#e9ecef',
          fill: {
            colors: ['#f8f9fa', '#fff'],
          },
        },
      },
    },
    xaxis: {
      categories: categories,
      labels: {
        show: true,
        offsetY: 2,
        style: {
          fontSize: '10px',
        },
      },
    },

    yaxis: {
      show: false,
    },
    stroke: {
      width: 2,
    },

    fill: {
      opacity: 0.15,
    },

    markers: {
      size: 3,
    },

    legend: {
      show: false,
      position: 'bottom',
      onItemClick: {
        toggleDataSeries: true, // ✅ toggle series on/off
      },
    },
    grid: {
      padding: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
      },
    },
    tooltip: {
      y: {
        formatter: (val) => `${val} min`,
      },
    },
  };

  return (
    <Box
      sx={{
        width: '100%',
        height: '32vh',
        borderRadius: '25px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
        p: 2,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Typography sx={{ fontSize: 22, fontWeight: 700, color: '#045498' }}>
        Alarm Performance Overview
      </Typography>
      <Box
        sx={{
          flex: 1, // ✅ critical
          minHeight: 0, // ✅ prevents overflow bug
        }}
      >
        {hasData ? (
          <Chart options={options} series={series} type="radar" height="100%" />
        ) : (
          <Box
            sx={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#9e9e9e',
            }}
          >
            <Typography>No alarm performance data</Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default AlarmRadarChart;
