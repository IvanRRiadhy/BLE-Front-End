import { Box, Grid2 as Grid, Typography, useTheme } from '@mui/material';
import React, { useEffect, useRef, useState } from 'react';
import { AppDispatch, RootState, useDispatch, useSelector } from 'src/store/Store';
import ConfigFloorView from './ConfigFloorView';
// import VideoPlayer from 'src/components/shared/VideoPlayer';
import {
  LayoutSet,
  setScreenSettings,
  ScreenSettings,
  LayoutItem,
  gridLayoutConfig,
} from 'src/store/apps/monitoring/layout';

interface ScreenPreview {
  type: number; // 0 = Floorplan, 1 = Masked Area, 2 = CCTV
  floorplanId?: string;
  displayOutput?: string;
}

interface ConfigGridProps {
  grid: number;
  screens: ScreenPreview[];
  screenSettings?: ScreenSettings[];
  selectedScreen?: number | null;
  onScreenSelect?: (index: number, floorplanId?: string) => void;
  activeLayout?: LayoutSet | null;
}

const videoJsOptions = {
  autoplay: true,
  controls: true,
  responsive: true,
  fluid: true,
  sources: [
    {
      src: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      type: 'application/x-mpegURL',
    },
  ],
  html5: { hls: { overrideNative: true } },
};

const ConfigGrid: React.FC<ConfigGridProps> = ({
  grid,
  screens,
  screenSettings,
  selectedScreen,
  onScreenSelect,
  activeLayout,
}) => {
  const dispatch: AppDispatch = useDispatch();
  const theme = useTheme();
  const gridRef = useRef<HTMLDivElement>(null);
  const [gridDimensions, setGridDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (gridRef.current) {
      const { clientWidth, clientHeight } = gridRef.current;
      setGridDimensions({ width: clientWidth, height: clientHeight });
    }
  }, [grid]);

  useEffect(() => {
    if (!activeLayout) return;
    activeLayout.screens.forEach((screen) => {
      dispatch(
        setScreenSettings({
          layoutId: activeLayout.id,
          screenId: screen.id,
          settings: screen.settings,
        }),
      );
    });
  }, [activeLayout, dispatch]);

  const handleScreenClick = (index: number) => {
    const screen = screens[index];
    const floorplanId = screen?.floorplanId || '';
    if (onScreenSelect) onScreenSelect(index, floorplanId);
  };

  const toRoman = (num: number) => ['I', 'II', 'III', 'IV', 'V', 'VI'][num - 1] || num.toString();

  const renderContent = (screen: ScreenPreview | undefined, i: number) => {
    if (!screen || (screen.type === 0 && !screen.floorplanId && !screen.displayOutput)) {
      return (
        <Typography
          variant="h2"
          fontWeight={900}
          fontFamily="Georgia"
          color={selectedScreen === i ? theme.palette.success.dark : theme.palette.text.primary}
        >
          {toRoman(i + 1)}
        </Typography>
      );
    }

    // if (screen.type === 2) return <VideoPlayer options={videoJsOptions} />;
    if (screen.type === 1)
      return (
        <Typography variant="h6" color={selectedScreen === i ? 'success.dark' : 'text.primary'}>
          Masked Area: {screen.displayOutput || 'N/A'}
        </Typography>
      );

    return (
      <ConfigFloorView
        activeFloorplan={screen.floorplanId || ''}
        zoomable={selectedScreen === i}
        containerWidth={gridDimensions.width}
        containerHeight={gridDimensions.height}
        screenSettings={screenSettings?.[i]}
      />
    );
  };

  // ---------- Explicit layouts to match the "second image" visual ----------
  const screenBox = (index: number, height: string) => {
    const screen = screens[index];
    return (
      <Grid
        size={{ xs: 12 }}
        onClick={() => handleScreenClick(index)}
        sx={{
          height,
          overflow: 'hidden',
          border: `${selectedScreen === index ? '5px' : '2.5px'} solid ${
            selectedScreen === index ? theme.palette.success.dark : theme.palette.grey[800]
          }`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 2,
          backgroundColor:
            screen?.type === 2 ? 'black' : screen?.type === 1 ? theme.palette.grey[200] : 'white',
          transition: 'all 0.3s ease',
          cursor: 'pointer',
          '&:hover': {
            borderColor: theme.palette.success.main,
            backgroundColor: theme.palette.success.light,
          },
        }}
      >
        {renderContent(screen, index)}
      </Grid>
    );
  };

  const renderLayout = (items: LayoutItem[]): JSX.Element[] =>
    items.map((item, index) => {
      if (item.children) {
        return (
          <Grid key={index} size={item.size}>
            <Grid container direction={item.isColumn ? 'column' : 'row'} spacing={1.5}>
              {renderLayout(item.children)}
            </Grid>
          </Grid>
        );
      }

      const screenIndex = item.floorId!;
      const screen = screens[screenIndex];

      return (
        <Grid key={index} size={item.size}>
          <Box
            onClick={() => handleScreenClick(screenIndex)}
            sx={{
              height: item.height,
              borderRadius: 2,
              overflow: 'hidden',
              border: `${selectedScreen === screenIndex ? '5px' : '2.5px'} solid ${
                selectedScreen === screenIndex
                  ? theme.palette.success.dark
                  : theme.palette.grey[800]
              }`,
              bgcolor: '#f5f5f5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: '0.3s',
              '&:hover': {
                borderColor: theme.palette.success.main,
                backgroundColor: theme.palette.success.light,
              },
            }}
          >
            {renderContent(screen, screenIndex)}
          </Box>
        </Grid>
      );
    });

  return (
    <Box ref={gridRef}>
      <Grid container spacing={1.5}>
        {renderLayout(gridLayoutConfig[grid])}
      </Grid>
    </Box>
  );
};

export default React.memo(ConfigGrid);
