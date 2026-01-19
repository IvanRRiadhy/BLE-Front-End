import Chart from "react-apexcharts";
import { Box, Typography } from "@mui/material";
import { useAllAlarmCategory } from "src/hooks/AlarmSetting/useAlarmCategory";

const Bar: React.FC = () => {

  const {data: AlarmCategoryData} = useAllAlarmCategory();
const ALLOWED_CATEGORIES = {
  Geofence: {
    label: 'Geofence',
    dummyData: [120, 160, 150, 170],
  },
  Boundary: {
    label: 'Boundary',
    dummyData: [80, 60, 90, 40],
  },
  CardAccess: {
    label: 'Card Access',
    dummyData: [70, 90, 60, 50],
  },
} as const;


  const series: ApexCharts.ApexOptions['series'] =
    AlarmCategoryData
      ?.filter(
        (item) =>
          item.isEnabled &&
          item.alarmCategory in ALLOWED_CATEGORIES,
      )
      .map((item) => {
        const config =
          ALLOWED_CATEGORIES[
            item.alarmCategory as keyof typeof ALLOWED_CATEGORIES
          ];

        return {
          name: config.label,
          data: [...config.dummyData],
          color: item.alarmColor,
        };
      }) ?? [];

  const options: ApexCharts.ApexOptions = {
    title: {
      text: "Alarm Distribution",
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
        "Gedung Utama",
        "Gedung Serbaguna",
        "Data Center",
        "Gedung Visitor",
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
      <Box sx={{ height: "100%", width: "100%" }}>
        <Chart
          options={options}
          series={series}
          type="bar"
          height={"100%"}
        />
      </Box>
    </Box>
  );
};

export default Bar;
