import { Box, Grid2 as Grid, Typography, useTheme } from '@mui/material';
import React, { useEffect, useRef, useState } from 'react';
import { AppDispatch, RootState, useDispatch, useSelector } from 'src/store/Store';
import ConfigFloorView from './ConfigFloorView';
import VideoPlayer from 'src/components/shared/VideoPlayer';
import { LayoutSet, ScreenSettings, setScreenSettings } from 'src/store/apps/monitoring/layout';

interface ScreenPreview {
  type: number; // 0 = Floorplan, 1 = Masked Area, 2 = CCTV
  floorplanId?: string;
  displayOutput?: string;
}

interface ConfigGridProps {
  grid: number;
  screens: ScreenPreview[];
  screenSettings?: { scale: number; translateX: number; translateY: number };
  // setScreenSettings?: (settings: { scale: number; translateX: number; translateY: number }) => void;
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
  const customizer = useSelector((state: RootState) => state.customizer);
  // const [selectedScreen, setSelectedScreen] = useState<number | null>(null);
  const [gridDimensions, setGridDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (gridRef.current) {
      const { clientWidth, clientHeight } = gridRef.current;
      setGridDimensions({ width: clientWidth, height: clientHeight });
    }
  }, [grid]);

  const handleScreenClick = (index: number) => {
    const screen = screens[index];
    const floorplanId = screen?.floorplanId || '';
    if (onScreenSelect) onScreenSelect(index, floorplanId);
  };

useEffect(() => {
  if (!activeLayout) return;

  activeLayout.screens.forEach((screen) => {
    dispatch(
      setScreenSettings({
        layoutId: activeLayout.id,
        screenId: screen.id,
        settings: screen.settings,
      })
    );
  });
}, [activeLayout]);
  

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

    if (screen.type === 2) return <VideoPlayer options={videoJsOptions} />;
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
        screenSettings={screenSettings}
      />
    );
  };

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

  const renderLayout = () => {
    switch (grid) {
      case 1:
        return <Grid container>{screenBox(0, '80vh')}</Grid>;
      case 2:
        return (
          <Grid container>
            <Grid size={{ xs: 12, lg: 6 }}>{screenBox(0, '80vh')}</Grid>
            <Grid size={{ xs: 12, lg: 6 }}>{screenBox(1, '80vh')}</Grid>
          </Grid>
        );
      case 3:
        return (
          <Grid container>
            <Grid size={{ xs: 12, lg: 6 }}>{screenBox(0, '80vh')}</Grid>
            <Grid size={{ xs: 12, lg: 6 }}>
              <Grid container direction="column">
                {screenBox(1, '40vh')}
                {screenBox(2, '40vh')}
              </Grid>
            </Grid>
          </Grid>
        );
      case 4:
        return (
          <Grid container>
            <Grid size={{ xs: 12, lg: 6 }}>
              <Grid container direction="column">
                {screenBox(0, '40vh')}
                {screenBox(2, '40vh')}
              </Grid>
            </Grid>
            <Grid size={{ xs: 12, lg: 6 }}>
              <Grid container direction="column">
                {screenBox(1, '40vh')}
                {screenBox(3, '40vh')}
              </Grid>
            </Grid>
          </Grid>
        );
      case 5:
        return (
          <Grid container>
            <Grid size={{ xs: 12, lg: 8 }}>
              <Grid container direction="column">
                {screenBox(0, '53vh')}
                <Grid container>
                  <Grid size={{ xs: 12, lg: 6 }}>{screenBox(2, '27vh')}</Grid>
                  <Grid size={{ xs: 12, lg: 6 }}>{screenBox(3, '27vh')}</Grid>
                </Grid>
              </Grid>
            </Grid>
            <Grid size={{ xs: 12, lg: 4 }}>
              <Grid container direction="column">
                {screenBox(1, '40vh')}
                {screenBox(4, '40vh')}
              </Grid>
            </Grid>
          </Grid>
        );
      case 6:
        return (
          <Grid container>
            <Grid size={{ xs: 12, lg: 8 }}>
              <Grid container direction="column">
                {screenBox(0, '53vh')}
                <Grid container>
                  <Grid size={{ xs: 12, lg: 6 }}>{screenBox(3, '27vh')}</Grid>
                  <Grid size={{ xs: 12, lg: 6 }}>{screenBox(4, '27vh')}</Grid>
                </Grid>
              </Grid>
            </Grid>
            <Grid size={{ xs: 12, lg: 4 }}>
              <Grid container direction="column">
                {screenBox(1, '26.5vh')}
                {screenBox(2, '26.5vh')}
                {screenBox(5, '27vh')}
              </Grid>
            </Grid>
          </Grid>
        );
      default:
        return (
          <Typography variant="h6" fontWeight={700} textAlign="center" mt={4}>
            Invalid grid layout
          </Typography>
        );
    }
  };

  return (
    <Box
      ref={gridRef}
      mt={0}
      sx={{
        flexGrow: 1,
        // ml: `calc(${customizer.SidebarWidth}px)`,
        width: `100%`,
        transition: theme.transitions.create('margin-left', {
          duration: theme.transitions.duration.shortest,
        }),
      }}
    >
      {renderLayout()}
    </Box>
  );
};

export default React.memo(ConfigGrid);
