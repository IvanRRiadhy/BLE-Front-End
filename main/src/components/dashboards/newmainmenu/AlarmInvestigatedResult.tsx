import { Box } from '@mui/material';
import Chart from 'react-apexcharts';
import { useMemo } from 'react';

import { useAlarmInvestigatedResult } from 'src/hooks/useDashboard';
import { investigationResultType } from 'src/types/crud/input';
import { useSelector } from 'src/store/Store';

/* ---------------- Filter ---------------- */

const defaultFilter = {
  timeRange: 'daily',
// from: "2026-02-01T00:00:00Z",
// to: "2026-02-23T23:59:59Z",
  floorplanMaskedAreaId: null,
  operatorName: null,
  visitorId: null,
  buildingId: null,
  floorId: null,
};

const InvestigatedResultColumn: React.FC = () => {
  const dashboardFilter = useSelector((state: any) => state.customizer.dashboardFilter);

  const { data: investigatedData = [] } = useAlarmInvestigatedResult({ ...defaultFilter, ...dashboardFilter });

  /* ---------------- Transform & Sort ---------------- */

const chartData = useMemo(() => {
  const orderedTypes = investigationResultType
    .filter((x) => x.value !== '')
    .map((x) => x.value);

  const resultMap = new Map(
    investigatedData.map((item: any) => [
      item.investigatedResult,
      item.total,
    ])
  );

  const totalTypes = orderedTypes.length;

  const data = orderedTypes.map((type, index) => {
    const value = resultMap.get(type) ?? 0;

    // Generate color from green → red
    const ratio = index / (totalTypes - 2);

    const red = Math.round(255 * ratio);
    const green = Math.round(200 * (1 - ratio));

    const color = `rgb(${red}, ${green}, 80)`;

    return {
      x: type,
      y: value,
      fillColor: type === 'Other' ? '#999999' : color, // Grey for "Other"
    };
  });

  return {
    series: [
      {
        name: 'Total',
        data,
      },
    ],
  };
}, [investigatedData]);

  /* ---------------- Chart Options ---------------- */

  const options: ApexCharts.ApexOptions = {
    chart: {
      type: 'bar',
      toolbar: {
        show: true,
      },
    },

    title: {
      text: 'Alarm Investigated Result',
      align: 'left',
      style: {
        fontSize: '22px',
        fontWeight: 'bold',
        color: '#045498',
      },
    },

    plotOptions: {
      bar: {
        horizontal: true, // 👈 like your screenshot
        borderRadius: 6,
        barHeight: '55%',
        // distributed: true, // 👈 enable different color per bar
      },
    },

    xaxis: {
    //   categories: chartData.categories,
      labels: {
        style: {
          colors: '#045498',
        },
      },
    },

    yaxis: {
      labels: {
        style: {
          colors: '#045498',
          fontSize: '12px',
        },
      },
    },

    dataLabels: {
      enabled: true,
    },

    /* ---------------- Gradient Color ---------------- */

    // fill: {
    //   type: 'gradient',
    //   gradient: {
    //     shade: 'light',
    //     type: 'horizontal',
    //     shadeIntensity: 0.3,
    //     gradientToColors: ['#ff3b3b'], // red end
    //     inverseColors: false,
    //     opacityFrom: 0.9,
    //     opacityTo: 0.9,
    //     stops: [0, 100],
    //   },
    // },

    // colors: ['#22c55e'], // green start

    grid: {
      borderColor: '#d3d3d360',
    },

    tooltip: {
      y: {
        formatter: (val) => val.toString(),
      },
    },
  };

  return (
    <Box
      sx={{
        width: '100%',
        height: '30vh',
        borderRadius: '25px',
        boxShadow: (theme) => theme.shadows[10],
        px: 2,
        py: 2,
      }}
    >
      <Chart options={options} series={chartData.series} type="bar" height="100%" />
    </Box>
  );
};

export default InvestigatedResultColumn;