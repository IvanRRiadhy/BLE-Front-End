import { useEffect, useMemo, useState } from 'react';
import Chart from 'react-apexcharts';
import { Box, Typography } from '@mui/material';
import { useBeaconCount } from 'src/hooks/useDashboard';
import { useSelector } from 'src/store/Store';


const COLORS = ['#02325B','#045498', '#3676AC',  '#B3CBE0'];

const NewBeaconDistribution: React.FC = () => {
  const dashboardFilter = useSelector((state: any) => state.customizer.dashboardFilter);
  const { data = [], isLoading, isError } = useBeaconCount(dashboardFilter);
  const { labels, series } = useMemo(() => {
    if (!data) {
      return { labels: [], series: [] };
    }

    const memberCard = data.memberCardCount ?? 0;
    const visitorCard = data.visitorCardCount ?? 0;
    const securityCard = data.securityCardCount ?? 0;
    const totalCard = data.totalCardCount ?? 0;
    const totalUsed = data.totalCardUse ?? 0;
    console.log("Beacons: ", data)
    const unusedCard = Math.max(totalCard - totalUsed, 0);

    return {
      labels: ['Member Card', 'Visitor Card', 'Security Card', 'Unused Card'],
      series: [memberCard, visitorCard, securityCard, unusedCard],
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
      labels: {
        colors: 'text.primary',
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
        height: '28vh',//32vh
        minHeight: 0,
        borderRadius: '25px',
        boxShadow: (theme) => theme.shadows[10],
        px: 2,
        py: 0,
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
            overflowY: 'hidden',
            paddingTop: '30px',
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
            color: 'primary.main',
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
