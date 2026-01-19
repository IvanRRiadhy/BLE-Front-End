import { Box, Grid2 as Grid, Toolbar, styled } from '@mui/material';
import { RootState, useDispatch, useSelector } from 'src/store/Store';
import PageContainer from 'src/components/container/PageContainer';
import { useTheme } from '@mui/material';
import MonitoringSidebar from 'src/components/dashboards/monitoring/Sidebar/MonitoringSidebar';
import MonitoringFooter from 'src/components/dashboards/monitoring/Footer/MonitoringFooter';
import ToolbarMonitor from 'src/layouts/full/monitoringLayout/Toolbar';
import { useEffect, useMemo, useState } from 'react';
import {
  toggleHorizontal,
  setMonitorSidebar,
  toggleSidebar,
} from 'src/store/customizer/CustomizerSlice';
import MonitoringGrid from 'src/views/dashboard/MonitoringGrid.tsx';
import { hideAlarmPopup } from 'src/store/apps/monitoring/AlarmUI';
import AlarmPopup from 'src/layouts/full/AlarmPopup';
import { fetchMonitoringLayouts, ScreenSettings } from 'src/store/apps/monitoring/layout';

const Monitoring = () => {
  const dispatch = useDispatch();
  const theme = useTheme();

  const { latest, open } = useSelector((s: RootState) => s.AlarmUIReducer);

  const layouts = useSelector((state: RootState) => state.layoutReducer.layouts ?? []);
  const activeLayoutId = useSelector((state: RootState) => state.layoutReducer.activeLayoutId);

  const activeLayout = layouts.find((l) => l.id === activeLayoutId) || null;

  // Local state for reactive grid (in case layout changes dynamically)
  const [grid, setGrid] = useState<number>(activeLayout?.grid ?? 1);
  const [screens, setScreens] = useState(activeLayout?.screens ?? []);

  // Watch activeLayout changes → update grid and screens
  useEffect(() => {
    if (activeLayout) {
      setGrid(activeLayout.grid);
      setScreens(activeLayout.screens);
    }
  }, [activeLayout]);

  // Transform layout data for MonitoringGrid props
  const { screenId, floorIds, screenDisplay, screenType, screenSettings } = useMemo(() => {
    const sIds: Record<number, string[]> = {};
    const fIds: Record<number, string[]> = {};
    const sDisplay: Record<number, string[]> = {};
    const sType: Record<number, number[]> = {};
    const sSettings: ScreenSettings[][] = [];

    sIds[grid] = [];
    fIds[grid] = [];
    sDisplay[grid] = [];
    sType[grid] = [];
    sSettings[grid] = [];

    screens.forEach((s, idx) => {
      sIds[grid][idx] = s.id;
      fIds[grid][idx] = s.floorplanId ?? '';
      sDisplay[grid][idx] = s.display.displayOutput ?? '';
      sType[grid][idx] = s.display.displayType ?? 0;
      sSettings[grid][idx] = s.settings;
    });

    return {
      screenId: sIds,
      floorIds: fIds,
      screenDisplay: sDisplay,
      screenType: sType,
      screenSettings: sSettings,
    };
  }, [screens, grid]);

  const ToolbarStyled = styled(Toolbar)(({ theme }) => ({
    width: '100%',
    color: theme.palette.text.secondary,
  }));

  // Handle sidebar visibility on page mount/unmount
  useEffect(() => {
    dispatch(toggleHorizontal(false));
    dispatch(setMonitorSidebar(true));
    dispatch(toggleSidebar());
    dispatch(fetchMonitoringLayouts());

    return () => {
      dispatch(toggleHorizontal(true));
      dispatch(setMonitorSidebar(false));
      dispatch(toggleSidebar());
    };
  }, [dispatch]);

  return (
    <>
      {/* <ToolbarStyled>
        <ToolbarMonitor />
      </ToolbarStyled> */}

      <PageContainer
        title="Monitoring Dashboard"
        description="This is the Monitoring Dashboard page"
      >
        <Box sx={{ display: 'flex', flexDirection: 'row', width: '100%', height: 'calc(100vh - 100px)' }}>
          <MonitoringSidebar />
          
          <Box sx={{ flex: 1, overflow: 'hidden', pl: 1, pt: 2 }}>
            <Grid container>
              <Grid size={{ xs: 12 }}>
                <MonitoringGrid
                  screenId={screenId}
                  grid={grid}
                  floorIds={floorIds}
                  screenSettings={screenSettings}
                  screenDisplay={screenDisplay}
                  screenType={screenType}
                />
              </Grid>
            </Grid>
          </Box>
        </Box>
      </PageContainer>

      <MonitoringFooter />
      <AlarmPopup alarm={latest} open={open} onClose={() => dispatch(hideAlarmPopup())} />
    </>
  );
};

export default Monitoring;