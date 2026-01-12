import { useEffect, useMemo, useState } from "react";
import Chart from "react-apexcharts";
import {
  Box,
  Typography,
  Button,
  Stack,
} from "@mui/material";
import { IconChevronDown } from "@tabler/icons-react";
import { useTrackingAreaAccessed } from "src/hooks/useDashboard";

/* ---------------- Types ---------------- */

  const defaultFilter = {
    from: "2025-10-01T00:00:00Z",
    to: "2025-10-30T23:59:59Z",
    TimeRange: "monthly",
    operatorName: null,
    visitorId: null,
    buildingId: null,
    floorId: null,
    floorplanMaskedAreaId: null,
  };

interface TrackingSummary {
  accessedAreaTotal: number;
  withPermission: number;
  withoutPermission: number;
}

/* ---------------- Component ---------------- */

const Tracking: React.FC = () => {

  const {data = {}, isLoading, isError} = useTrackingAreaAccessed(defaultFilter);

  const trackingData = useMemo<TrackingSummary | null>(() => {
    if (isLoading || isError || data === undefined) {
      return null;
    }
    const x = data;
    return {
      accessedAreaTotal: x.accessedAreaTotal ??  0,
      withPermission: x.withPermission ?? 0,
      withoutPermission: x.withoutPermission ?? 0,
    } as TrackingSummary;
  }, [data, isLoading, isError]);

  const series: ApexCharts.ApexOptions["series"] = [
    {
      name: "Accessed Area",
      data: [95, 88, 110, 80, 20, 70, 60],
      color: "#ffba08",
    },
    {
      name: "Area Access without Permission",
      data: [40, 65, 90, 30, 50, 75, 45],
      color: "#d62828",
    },
  ];

  const options: ApexCharts.ApexOptions = {
    chart: {
      type: "bar",
      stacked: false,
      toolbar: { show: false },
      parentHeightOffset: 0,
    },

    plotOptions: {
      bar: {
        borderRadius: 4,
        columnWidth: "50%",
      },
    },

    dataLabels: { enabled: false },
    stroke: { show: false },

    xaxis: {
      categories: ["Oct 8", "Oct 9", "Oct 10", "Oct 11", "Oct 12", "Oct 13", "Oct 14"],
      labels: {
        style: {
          fontSize: "12px",
          colors: "#045498",
        },
      },
    },

    yaxis: {
      tickAmount: 3,
      labels: {
        style: {
          fontSize: "12px",
          colors: "#045498",
          fontWeight: 600,
        },
      },
    },

    grid: {
      borderColor: "#d3d3d366",
    },

    legend: { show: false },
  };

  return (
    <Box
      sx={{
        width: "100%",
        height: '32vh',       
        borderRadius: "25px",
        boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
        px: 2,
        py: 2,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* HEADER (fixed height) */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 1,
        }}
      >
        <Box>
          <Typography
            sx={{
              fontSize: "clamp(18px, 1.4vw, 26px)",
              fontWeight: 700,
              color: "#045498",
            }}
          >
            Tracking Graphic
          </Typography>
          <Typography sx={{ fontSize: 13, color: "#045498" }}>
            Tracking the area visited by visitor
          </Typography>
        </Box>

        <Button
          variant="outlined"
          endIcon={<IconChevronDown size={18} />}
          sx={{
            textTransform: "none",
            borderRadius: "12px",
            color: "#045498",
            borderColor: "#045498",
            height: 36,
          }}
        >
          October Week 1 2025
        </Button>
      </Box>

      {/* CONTENT */}
      <Box
        sx={{
          flex: 1,             // ✅ sisa tinggi
          minHeight: 0,
          display: "flex",
          gap: 3,
          alignItems: "stretch",
        }}
      >
        {/* CHART */}
        <Box sx={{ flex: 1, minHeight: 0 }}>
          <Chart
            options={options}
            series={series}
            type="bar"
            height="100%"      // ✅ no pixel
          />
        </Box>

        {/* SUMMARY */}
        <Stack spacing={2} sx={{ minWidth: 180, justifyContent: "center" }}>
          <Box>
            <Typography sx={{ fontSize: 24, fontWeight: 700, color: "#045498" }}>
              {trackingData?.accessedAreaTotal ?? "-"}
            </Typography>
            <Typography sx={{ fontSize: 13, color: "#045498" }}>
              Accessed Area
            </Typography>
          </Box>

          <Box>
            <Typography sx={{ fontSize: 24, fontWeight: 700, color: "#045498" }}>
              {trackingData?.withPermission ?? "-"}
            </Typography>
            <Typography sx={{ fontSize: 13, color: "#045498" }}>
              Area Access with Permission
            </Typography>
          </Box>

          <Box>
            <Typography sx={{ fontSize: 24, fontWeight: 700, color: "#045498" }}>
              {trackingData?.withoutPermission ?? "-"}
            </Typography>
            <Typography sx={{ fontSize: 13, color: "#045498" }}>
              Area Access without Permission
            </Typography>
          </Box>
        </Stack>
      </Box>
    </Box>
  );
};

export default Tracking;


