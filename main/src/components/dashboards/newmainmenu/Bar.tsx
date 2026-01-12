import Chart from "react-apexcharts";
import { Box, Typography } from "@mui/material";

const Bar: React.FC = () => {
  const series: ApexCharts.ApexOptions["series"] = [
    {
      name: "Kategori 1",
      data: [120, 160, 150, 170, 80, 140, 160, 200, 130, 120, 180, 220],
      color: "#F5A623", // yellow
    },
    {
      name: "Kategori 2",
      data: [80, 60, 90, 40, 30, 70, 60, 50, 90, 60, 70, 80],
      color: "#D9534F", // red
    },
  ];

  const options: ApexCharts.ApexOptions = {
    title: {
      text: "Monthly Data Overview",
      align: "left",
      style: {
        fontSize: "24px",
        fontWeight: "bold",
        color: "#045498",
      },
    },
    chart: {
      type: "bar",
      stacked: true,
      toolbar: {
        show: true,
        offsetX: -10,
        offsetY: 0,
      },
    },

    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "50%",
      },
    },

    xaxis: {
      categories: [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "Mei",
        "Jun",
        "Jul",
        "Agu",
        "Sep",
        "Okt",
        "Nov",
        "Des",
      ],
      labels: {
        style: {
          colors: "#045498",
          fontSize: "12px",
        },
      },
    },

    yaxis: {
      tickAmount: 4,
      labels: {
        style: {
          colors: "#045498",
          fontSize: "12px",
        },
      },
    },

    grid: {
      borderColor: "#d3d3d360",
    },

    legend: {
      position: "top",
      horizontalAlign: "right",
      offsetX: -40,
    },
  };

  return (
    <Box
      sx={{
        width: "100%",
        height: "30vh",
        borderRadius: "25px",
        boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
        px: 2,
        py: 2,
      }}
    > 
      {/* Title */}
      {/* <Box
        sx={{
          display: "flex",
          justifyContent: "flex-start",
          mb: 2,
          mt: 1,
        }}
      >
        <Typography
          sx={{
            fontSize: 26,
            fontWeight: 700,
            color: "#045498",
          }}
        >
          Bar
        </Typography>
      </Box> */}

      {/* Chart */}
      <Box sx={{ width: "100%" }}>
        <Chart
          options={options}
          series={series}
          type="bar"
          height={240}
        />
      </Box>
    </Box>
  );
};

export default Bar;
