import React, { useState, useMemo } from 'react';
import { Box, Typography, IconButton, Fade } from '@mui/material';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';
import DashboardCard from 'src/components/shared/DashboardCard';
import BeaconDistribution from './BeaconDistribution';
import AreaDistribution from './AreaDistribution';

// Define chart types
export type ChartType = 'Beacon' | 'Area' | 'Tracking' | 'Visitor';

interface ChartSwitcherProps {
  defaultChart?: ChartType;
  availableCharts: ChartType[];
  chartProps?: Record<string, any>;
}

const ChartSwitcher: React.FC<ChartSwitcherProps> = ({
  defaultChart = 'Beacon',
  availableCharts = ['Beacon', 'Area'],
  chartProps = {},
}) => {
  const [currentIndex, setCurrentIndex] = useState(
    Math.max(0, availableCharts.indexOf(defaultChart))
  );

  const currentChart = availableCharts[currentIndex];

  const handlePrev = () => {
    setCurrentIndex((prev) =>
      prev === 0 ? availableCharts.length - 1 : prev - 1
    );
  };

  const handleNext = () => {
    setCurrentIndex((prev) =>
      prev === availableCharts.length - 1 ? 0 : prev + 1
    );
  };

  // ✅ Dynamically render the chart based on selection
  const renderChart = useMemo(() => {
    switch (currentChart) {
      case 'Beacon':
        return <BeaconDistribution {...(chartProps['Beacon'] || {})} />;
      case 'Area':
        return <AreaDistribution {...(chartProps['Area'] || {})} />;
      default:
        return (
          <Box p={2}>
            <Typography variant="body1" color="text.secondary">
              {currentChart} chart coming soon...
            </Typography>
          </Box>
        );
    }
  }, [currentChart, chartProps]);

  return (
    <DashboardCard>
      {/* ===== Header with Title + Arrows + Dots ===== */}
      <Box
        sx={{
          position: 'relative',
          mb: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography variant="h5" fontWeight={600}>
          {currentChart} Chart
        </Typography>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            position: 'absolute',
            top: 0,
            right: 4,
          }}
        >
          {/* Left Button */}
          <IconButton
            onClick={handlePrev}
            size="small"
            disableRipple
            sx={{
              width: 24,
              height: 24,
              transition: 'opacity 0.3s ease',
              '&:hover': { opacity: 0.8 },
            }}
          >
            <ChevronLeft fontSize="small" />
          </IconButton>

          {/* Dots */}
          {availableCharts.map((type, idx) => (
            <IconButton
              key={type}
              onClick={() => setCurrentIndex(idx)}
              size="small"
              disableRipple
              sx={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                backgroundColor:
                  idx === currentIndex ? '#0D47A1' : 'rgba(0,0,0,0.2)',
                transition: 'all 0.3s ease',
                transform: idx === currentIndex ? 'scale(1.1)' : 'scale(1)',
                '&:hover': {
                  backgroundColor:
                    idx === currentIndex
                      ? '#0D47A1'
                      : 'rgba(0,0,0,0.35)',
                },
              }}
            />
          ))}

          {/* Right Button */}
          <IconButton
            onClick={handleNext}
            size="small"
            disableRipple
            sx={{
              width: 24,
              height: 24,
              transition: 'opacity 0.3s ease',
              '&:hover': { opacity: 0.8 },
            }}
          >
            <ChevronRight fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* ===== Chart Area ===== */}
      <Fade in key={currentChart}>
        <Box sx={{ height: 485, display: 'flex', flexDirection: 'column' }}>
          {renderChart}
        </Box>
      </Fade>
    </DashboardCard>
  );
};

export default ChartSwitcher;
