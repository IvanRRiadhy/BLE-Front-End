import { useEffect, useMemo, useState } from 'react';
import Chart from 'react-apexcharts';
import { Box, Typography } from '@mui/material';
import { useBeaconCount } from 'src/hooks/useDashboard';
import { useSelector } from 'src/store/Store';


const COLORS = ['#045498', '#3676AC', '#B3CBE0', '#02325B'];

const NewBeaconDistribution: React.FC = () => {
  const dashboardFilter = useSelector((state: any) => state.customizer.dashboardFilter);
  const { data = [], isLoading, isError } = useBeaconCount(dashboardFilter);
  const { labels, series } = useMemo(() => {
    if (!data) {
      return { labels: [], series: [] };
    }

    const memberCard = data.memberCardCount ?? 0;
    const visitorCard = data.visitorCardCount ?? 0;
    const totalCard = data.totalCardCount ?? 0;
    const totalUsed = data.totalCardUse ?? 0;

    const unusedCard = Math.max(totalCard - totalUsed, 0);

    return {
      labels: ['Member Card', 'Visitor Card', 'Unused Card'],
      series: [memberCard, visitorCard, unusedCard],
    };
  }, [data]);

  const options: ApexCharts.ApexOptions = {
    labels,
    colors: COLORS,

    chart: {
      type: 'polarArea',
      parentHeightOffset: 0,
    },
    grid: {
      padding: {
        top: 20,
        bottom: 20,
        left: 0,
        right: 50, // 👈 extra space from legend
      },
    },
    plotOptions: {
      polarArea: {
        rings: { strokeWidth: 1 },
        spokes: { strokeWidth: 1 },
      },
    },

    legend: {
      show: true,
      position: 'right',
      horizontalAlign: 'left',
      fontSize: '12px',
      offsetX: 0,
      markers: {
        size: 12,
        shape: 'square',
      },
    },

    stroke: {
      colors: ['#fff'],
    },

    fill: {
      opacity: 0.8,
    },
  };

  return (
    <Box
      sx={{
        width: '100%',
        height: '25vh',//32vh
        minHeight: 0,
        borderRadius: '25px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
        px: 2,
        py: 1,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* CHART + LEGEND */}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          position: 'relative',

          '& .apexcharts-legend': {
            maxHeight: '100%',
            width: 'fit-content',
            minWidth: '255px',
            overflowY: 'auto',
            paddingTop: '50px',
            paddingLeft: '20px',
            position: 'relative',
            // maxWidth: "40%",
          },

          '& .apexcharts-legend::before': {
            content: '"Card Distribution"',
            position: 'absolute',
            top: 0,
            left: 20, 
            fontSize: 24,
            fontWeight: 700,
            color: '#045498',
            whiteSpace: 'nowrap',

          },
        }}
      >

        <Chart options={options} series={series} type="polarArea" height="100%" />
      </Box>
    </Box>
  );
};

export default NewBeaconDistribution;
