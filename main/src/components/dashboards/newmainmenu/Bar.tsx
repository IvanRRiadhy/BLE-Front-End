import { Box } from '@mui/material';
import Chart from 'react-apexcharts';
import { useMemo } from 'react';

import { useAllAlarmCategory } from 'src/hooks/AlarmSetting/useAlarmCategory';
import { useAlarmByArea } from 'src/hooks/useDashboard';

/* ---------------- Filter ---------------- */

const defaultFilter = {
  timeRange: 'daily',
  floorplanMaskedAreaId: null,
  operatorName: null,
  visitorId: null,
  buildingId: null,
  floorId: null,
};

/* ---------------- Component ---------------- */

const Bar: React.FC = () => {
  const { data: alarmCategories = [] } = useAllAlarmCategory();
  const { data: alarmByArea, isLoading } = useAlarmByArea(defaultFilter);

  /* ---------------- Transform API → Chart ---------------- */

  const chartData = useMemo(() => {
    if (!alarmByArea?.areas?.length) {
      return {
        categories: [],
        series: [],
      };
    }

    const areas = alarmByArea.areas;

    // X-axis categories (area names)
    const categories = areas.map((a: any) => a.name);

    // Collect all unique alarm category names
    const categorySet = new Set<string>();
    areas.forEach((area: any) => {
      area.series.forEach((s: any) => {
        categorySet.add(s.name);
      });
    });

    const categoryNames = Array.from(categorySet);

    // Build stacked series (one per alarm category)
    const series = categoryNames.map((categoryName) => {
      const color =
        alarmCategories.find(
          (c: any) => c.alarmCategory === categoryName
        )?.alarmColor ?? '#999999';

      return {
        name: categoryName,
        color,
        data: areas.map((area: any) => {
          const found = area.series.find(
            (s: any) => s.name === categoryName
          );
          return found ? found.data[0] : 0;
        }),
      };
    });

    return { categories, series };
  }, [alarmByArea, alarmCategories]);

  /* ---------------- Chart Options ---------------- */

  const options: ApexCharts.ApexOptions = {
    chart: {
      type: 'bar',
      stacked: true,
      toolbar: {
        show: true,
        offsetX: -10,
      },
    },

    title: {
      text: 'Alarm Distribution by Area',
      align: 'left',
      style: {
        fontSize: '22px',
        fontWeight: 'bold',
        color: '#045498',
      },
    },

    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '55%',
        borderRadius: 4,
      },
    },

    xaxis: {
      categories: chartData.categories,
      labels: {
        style: {
          colors: '#045498',
          fontSize: '12px',
        },
      },
    },

    yaxis: {
      tickAmount: 4,
      labels: {
        style: {
          colors: '#045498',
          fontSize: '12px',
        },
      },
    },

    grid: {
      borderColor: '#d3d3d360',
    },

    legend: {
      position: 'top',
      horizontalAlign: 'right',
      offsetX: -30,
    },

    tooltip: {
      y: {
        formatter: (val) => (val === 0 ? '0' : val.toString()),
      },
    },
  };

  /* ---------------- Render ---------------- */

  return (
    <Box
      sx={{
        width: '100%',
        height: '30vh',
        borderRadius: '25px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
        px: 2,
        py: 2,
      }}
    >
      <Chart
        options={options}
        series={chartData.series}
        type="bar"
        height="100%"
      />
    </Box>
  );
};

export default Bar;
