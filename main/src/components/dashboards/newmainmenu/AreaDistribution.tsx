import { useEffect, useMemo, useState } from 'react';
import Chart from 'react-apexcharts';
import ApexCharts from 'apexcharts';
import { Box, Typography, Stack, Grid2 as Grid } from '@mui/material';
import { useAreaDistributionData } from 'src/hooks/useDashboard';
import { DashboardAreaChartFilter } from 'src/store/apps/dashboard/Dashboard';
// import Grid from "@mui/material/Unstable_Grid2";
// import { getAreaDistribution } from "../services/apiService";

/* ---------------- Types ---------------- */

interface AreaDistributionItem {
  areaName: string;
  totalRecords: number;
}

interface AreaCountState {
  labels: string[];
  series: number[];
}

const defaultFilter: DashboardAreaChartFilter = {
  TimeRange: 'today',
  from: null,
  to: null,
  operatorName: null,
  visitorId: null,
  buildingId: null,
  floorId: null,
  floorplanMaskedAreaId: null,
};

/* ---------------- Constants ---------------- */

const COLORS = [
  '#0B3D60',
  '#2C7BBF',
  '#AFC7E3',
  '#D9E3F0',
  '#A3C4E5',
  '#C6D8EB',
  '#78A5D3',
  '#4B82C0',
];

const CHART_ID = 'area-distribution-pie';

/* ---------------- Utils ---------------- */

// const lighten = (hex: string, amount: number) => {
//   const num = parseInt(hex.replace('#', ''), 16);
//   const r = Math.min(255, (num >> 16) + 255 * amount);
//   const g = Math.min(255, ((num >> 8) & 0x00ff) + 255 * amount);
//   const b = Math.min(255, (num & 0x0000ff) + 255 * amount);
//   return `rgb(${r}, ${g}, ${b})`;
// };

// const withAlpha = (hex: string, alpha: number) => {
//   const num = parseInt(hex.replace('#', ''), 16);
//   const r = (num >> 16) & 255;
//   const g = (num >> 8) & 255;
//   const b = num & 255;
//   return `rgba(${r}, ${g}, ${b}, ${alpha})`;
// };

/* ---------------- Component ---------------- */

const NewAreaDistribution: React.FC = () => {

  const [filter, setFilter] = useState<DashboardAreaChartFilter>(defaultFilter);
  const { data = [], isLoading, isError } = useAreaDistributionData(filter);
  const { labels, series } = useMemo(() => {
  return {
    labels: data.map((x) => x.areaName),
    series: data.map((x) => x.totalRecords),
  };
}, [data]);
  /* ---------------- Chart Options ---------------- */

  const options: ApexCharts.ApexOptions = {
    chart: {
      id: CHART_ID,
      type: 'pie',
    },

    labels,
    colors: COLORS,

    legend: {
      show: true,
      position: 'bottom',
      markers: {
        size: 12, // ✅ replaces width & height
        shape: 'square', // optional
        offsetX: 0,
        offsetY: 0,
      },
    },

    plotOptions: {
      pie: {
        expandOnClick: true,
      },
    },

    dataLabels: {
      enabled: true,
      style: {
        fontSize: '12px',
        fontWeight: 600,
      },
    },
  };

  /* ---------------- Legend Events ---------------- */

  /* ---------------- Render ---------------- */

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        borderRadius: '25px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <Typography sx={{ fontSize: 24, fontWeight: 700, color: '#045498' }}>
        Area Distribution
      </Typography>

      <Box
        sx={{
          width: '100%',
          height: { lg: 400, md: '100%', sm: '100%', xs: '100%' },
          mt: 2,
          '& .apexcharts-legend': {
            maxHeight: 180,
            overflowY: 'auto',
          },
        }}
      >
        <Chart options={options} series={series} type="pie" height="100%" />
      </Box>

      {/* Custom Legend */}
      {/* <Grid container spacing={2} sx={{ mt: 3 }}>
        {areaCount.labels.map((label, index) => {
          const base = COLORS[index];
          const isActive = activeIndex === index;
          const isHover = hoverIndex === index;

          const bgColor = isActive
            ? ACTIVE_GREEN
            : isHover
            ? HOVER_GREEN
            : base;

          return (
            <Grid size={{ xs: 4 }} key={label}>
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{ cursor: "pointer", userSelect: "none" }}
                onMouseEnter={() => onHover(index)}
                onMouseLeave={() => onLeave()}
                onClick={() => onClick(index)}
              >
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: "7px",
                    bgcolor: bgColor,
                    transition: "background-color 0.2s ease",
                  }}
                />
                <Typography
                  sx={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: "#1f4e79",
                  }}
                >
                  {label}
                </Typography>
              </Stack>
            </Grid>
          );
        })}
      </Grid> */}
    </Box>
  );
};

export default NewAreaDistribution;
