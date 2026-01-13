import { useEffect, useMemo, useState } from "react";
import Chart from "react-apexcharts";
import { Box, Typography } from "@mui/material";
import { useAlarmStatisticHourly } from "src/hooks/useDashboard";

/* ---------------- Types ---------------- */

interface StatisticRawItem {
  hourLabel: string;
  status: Record<string, number>;
}

type ChartSeries = {
  name: string;
  data: number[];
}[];

/* ---------------- Component ---------------- */

const Statistic: React.FC = () => {
  const body = {
    timeRange: "daily",
  };

  const { data = [], isLoading, isError } = useAlarmStatisticHourly(body);
  
const { categories, series } = useMemo(() => {
  if (!data.length) {
    return { categories: [], series: [] as ChartSeries };
  }
  const raw = data as StatisticRawItem[];
  // X-axis
  const categories = raw.map((item: any) => item.hourLabel);

  // collect all unique status keys
  const statusKeys = Array.from(
    new Set(
      raw.flatMap((item: any) => Object.keys(item.status ?? {}))
    )
  );

  // build chart series
  const series: ChartSeries = statusKeys.map((key) => ({
    name: key,
    data: raw.map((item) => item.status?.[key] ?? 0),
  }));

  return { categories, series };
}, [data]);

  /* ---------------- Chart Options ---------------- */

  const options: ApexCharts.ApexOptions = {
    chart: {
      type: "line",
      toolbar: { show: false },
    },

    stroke: {
      curve: "straight",
      width: 3,
    },

    markers: { size: 0 },

    xaxis: {
      categories,
      labels: {
        style: {
          fontSize: "13px",
          colors: "#045498",
        },
      },
    },

    yaxis: {
      labels: {
        style: {
          fontSize: "13px",
          colors: "#045498",
        },
      },
    },

    grid: {
      borderColor: "#d3d3d380",
    },

    legend: {
      position: "top",
      horizontalAlign: "right",
      labels: {
        colors: "#045498",
      },
    },
  };

  /* ---------------- Render ---------------- */

  return (
    <Box
      sx={{
        width: "100%",
        height: "30vh",
        borderRadius: "25px",
        boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
        px: 2,
        py: 1,
      }}
    >
      {/* Title */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          mb: 1,
        }}
      >
        <Typography
          sx={{
            fontSize: 26,
            fontWeight: 700,
            color: "#045498",
            mt: 2,
          }}
        >
          Statistic
        </Typography>
      </Box>

      {/* Chart */}
      <Box sx={{ height: "100%", width: "100%" }}>
        <Chart
          options={options}
          series={series}
          type="line"
          height={"90%"}
        />
      </Box>
    </Box>
  );
};

export default Statistic;
