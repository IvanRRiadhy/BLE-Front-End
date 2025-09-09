import { Box, Toolbar, styled } from '@mui/material';
import { RootState, useDispatch, useSelector } from 'src/store/Store';
import PageContainer from 'src/components/container/PageContainer';
import { useTheme } from '@mui/material';
import MonitoringSidebar from 'src/components/dashboards/monitoring/Sidebar/MonitoringSidebar';
import MonitoringFooter from 'src/components/dashboards/monitoring/Footer/MonitoringFooter';
import ToolbarMonitor from 'src/layouts/full/monitoringLayout/Toolbar';
import { useEffect, useMemo } from 'react';
import {
  toggleHorizontal,
  setMonitorSidebar,
  toggleSidebar,
} from 'src/store/customizer/CustomizerSlice';
import MonitoringGrid from 'src/views/dashboard/MonitoringGrid.tsx';
import { hideAlarmPopup } from 'src/store/apps/monitoring/AlarmUI';
import AlarmPopup from 'src/layouts/full/AlarmPopup';

const Monitoring = () => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const { latest, open } = useSelector((s: RootState) => s.AlarmUIReducer);
  const grid = useSelector((state: RootState) => state.layoutReducer.grid); // Get the current grid value
  const floorIds = useSelector((state: RootState) => state.layoutReducer.floorplanId); // Get the current floor IDs
  const screenDisplay = useSelector((state: RootState) => state.layoutReducer.screenDisplay);
  const floorIds2 = screenDisplay?.map((row) => row.map((item) => item.displayOutput)) ?? [];
  const screenType = screenDisplay?.map((row) => row.map((item) => item.displayType)) ?? [];

  const memoizedFloorIds = useMemo(() => floorIds, [floorIds]);
  const memoizedFloorIds2 = useMemo(() => floorIds2, [floorIds2]);
  const memoizedScreenType = useMemo(() => screenType, [screenType]);
  const screenSettings = useSelector((state: RootState) => state.layoutReducer.screenSettings);
  const ToolbarStyled = styled(Toolbar)(({ theme }) => ({
    width: '100%',
    color: theme.palette.text.secondary,
  }));
  useEffect(() => {
    // Dispatch actions when the component is mounted
    dispatch(toggleHorizontal(false)); // Enable horizontal layout
    dispatch(setMonitorSidebar(true)); // Enable monitor sidebar
    dispatch(toggleSidebar()); // Disable sidebar

    // Optionally, clean up when the component is unmounted
    return () => {
      dispatch(toggleHorizontal(true)); // Reset horizontal layout
      dispatch(setMonitorSidebar(false)); // Reset monitor sidebar
      dispatch(toggleSidebar()); // Reset sidebar
    };
  }, [dispatch]);

  useEffect(() => {
    console.log(
      `Monitoring: memoizedFloorIds: ${memoizedFloorIds}, memoizedFloorIds2: ${memoizedFloorIds2}, memoizedScreenType: ${memoizedScreenType}`
    );
  }, [memoizedFloorIds, memoizedFloorIds2, memoizedScreenType]);

  return (
    <>
      <ToolbarStyled>
        <ToolbarMonitor />
      </ToolbarStyled>
      <PageContainer
        title="Monitoring Dashboard"
        description="This is the Monitoring Dashboard page"
      >
        <Box sx={{ display: 'flex', flexDirection: 'row', width: '100%' }}>
          <MonitoringSidebar />
          <Box
            mt={0}
            sx={{
              flexGrow: 1,
              margin: 0,
              padding: 0,
              // marginLeft: customizer.isMonitorSidebar
              //   ? customizer.SidebarWidth
              //   : customizer.MiniSidebarWidth,
              transition: theme.transitions.create('margin-left', {
                duration: theme.transitions.duration.shortest,
              }),
            }}
          >
            <MonitoringGrid
              grid={grid}
              floorIds={memoizedFloorIds}
              screenSettings={screenSettings}
              screenDisplay={memoizedFloorIds2}
              screenType={memoizedScreenType}
            />
            {/* {renderLayout()} */}
          </Box>
        </Box>
      </PageContainer>
      <MonitoringFooter />
      <AlarmPopup alarm={latest} open={open} onClose={() => dispatch(hideAlarmPopup())} />
    </>
  );
};

export default Monitoring;
