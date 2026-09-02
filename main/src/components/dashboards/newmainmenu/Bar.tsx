import { Box, useTheme, Tooltip } from '@mui/material';
import Chart from 'react-apexcharts';
import { useMemo, useEffect, useRef, useState } from 'react';

import { useAllAlarmCategory } from 'src/hooks/AlarmSetting/useAlarmCategory';
import { useAlarmByArea } from 'src/hooks/useDashboard';
import { useSelector } from 'src/store/Store';
import { formatAbbreviatedNumber } from 'src/utils/numberAbbreviation';

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
  const theme = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);  
  const { data: alarmCategories = [] } = useAllAlarmCategory();
  const dashboardFilter = useSelector((state: any) => state.customizer.dashboardFilter);
  const { data: alarmByArea, isLoading } = useAlarmByArea(dashboardFilter);

  const [tooltipState, setTooltipState] = useState<{
    open: boolean;
    title: string;
    anchorEl: Element | null;
  }>({
    open: false,
    title: '',
    anchorEl: null,
  });

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

  // Handle MUI Tooltip on X-axis label hover via event delegation
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseOver = (e: MouseEvent) => {
      const target = (e.target as Element)?.closest(
        '.apexcharts-xaxis-texts-g text, .apexcharts-xaxis-label'
      );
      if (!target) return;

      const allLabels = Array.from(
        container.querySelectorAll('.apexcharts-xaxis-texts-g text, .apexcharts-xaxis-label')
      );
      const idx = allLabels.indexOf(target);
      if (idx !== -1 && chartData.categories[idx]) {
        setTooltipState({
          open: true,
          title: chartData.categories[idx],
          anchorEl: target,
        });
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = (e.target as Element)?.closest(
        '.apexcharts-xaxis-texts-g text, .apexcharts-xaxis-label'
      );
      if (target) {
        const relatedTarget = e.relatedTarget as Element | null;
        if (relatedTarget && target.contains(relatedTarget)) {
          return;
        }
        setTooltipState((prev) => ({ ...prev, open: false }));
      }
    };

    container.addEventListener('mouseover', handleMouseOver);
    container.addEventListener('mouseout', handleMouseOut);

    return () => {
      container.removeEventListener('mouseover', handleMouseOver);
      container.removeEventListener('mouseout', handleMouseOut);
    };
  }, [chartData.categories]);

  /* ---------------- Chart Options ---------------- */

  const options: ApexCharts.ApexOptions = {
    chart: {
      type: 'bar',
      stacked: true,
      toolbar: {
        show: true,
        offsetX: -10,
      },
      foreColor: theme.palette.text.secondary,
      background: 'transparent',
    },
    theme: {
      mode: theme.palette.mode as 'light' | 'dark',
    },

    title: {
      text: 'Alarm Distribution by Area',
      align: 'left',
      style: {
        fontSize: '22px',
        fontWeight: 'bold',
        color: theme.palette.primary.main,
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
          fontSize: '12px',
        },
        formatter: (val: string) =>
          typeof val === 'string' && val.length > 12 ? `${val.slice(0, 12)}...` : val,
      },
    },

    yaxis: {
      tickAmount: 4,
      labels: {
        style: {
          fontSize: '12px',
        },
        formatter: (val: number) => formatAbbreviatedNumber(val),
      },
    },

    grid: {
      borderColor: theme.palette.divider,
    },

    legend: {
      position: 'top',
      horizontalAlign: 'right',
      offsetX: -30,
    },

    tooltip: {
      x: {
        show: true,
        formatter: (val: any, opts: any) => {
          const idx = opts?.dataPointIndex;
          if (idx !== undefined && chartData.categories[idx]) {
            return chartData.categories[idx];
          }
          return typeof val === 'string' ? val : (chartData.categories[val - 1] ?? String(val));
        },
      },
      y: {
        formatter: (val) => (typeof val === 'number' ? val.toLocaleString() : String(val)),
      },
    },
  };

  /* ---------------- Render ---------------- */

  return (
    <Box
      ref={containerRef}
      sx={{
        width: '100%',
        height: '28vh',
        borderRadius: '25px',
        boxShadow: (theme) => theme.shadows[10],
        bgcolor: 'background.paper',
        px: 2,
        py: 2,
        position: 'relative',
        '& .apexcharts-xaxis-texts-g text, & .apexcharts-xaxis-label': {
          cursor: 'pointer',
        },
      }}
    >
      <Chart
        options={options}
        series={chartData.series}
        type="bar"
        height="100%"
      />
      <Tooltip
        title={tooltipState.title}
        open={tooltipState.open && Boolean(tooltipState.anchorEl)}
        arrow
        placement="top"
        PopperProps={{
          anchorEl: tooltipState.anchorEl,
        }}
      >
        <span style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }} />
      </Tooltip>
    </Box>
  );
};

export default Bar;
