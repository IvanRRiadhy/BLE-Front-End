// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useEffect, useState } from 'react';
import { Box, Grid2 as Grid } from '@mui/material';
import PageContainer from 'src/components/container/PageContainer';
import TopCards from 'src/components/dashboards/mainmenu/TopCards';
import TrackingGraph from 'src/components/dashboards/mainmenu/Tracking';
import AlarmWarning from 'src/components/dashboards/mainmenu/AlarmWarning';
import BlacklistTable from 'src/components/dashboards/mainmenu/Blacklist';
import WelcomePopup from 'src/components/dashboards/mainmenu/WelcomePopup';
import { blacklistType, fetchBlacklistDT } from 'src/store/apps/crud/blacklist';
import { fetchMaskedAreaDT } from 'src/store/apps/crud/maskedArea';
import {  fetchBleReaderDT } from 'src/store/apps/crud/bleReader';
import { AlarmType, fetchAlarmDT } from 'src/store/apps/crud/alarmRecordTracking';
import { RootState, useDispatch, useSelector } from 'src/store/Store';
import { fetchTrackingTransDT, trackingTransType } from 'src/store/apps/crud/trackingTrans';
import { setMainMenu } from 'src/store/customizer/CustomizerSlice';
import { fetchFloorplanDeviceDT } from 'src/store/apps/crud/floorplanDevice';

const filter = {
  draw: 1,
  start: 0,
  length: 1,
  sortColumn: '',
  sortDir: 'asc',
  searchValue: '',
};

const Modern = () => {
  const dashboardFilter = useSelector((state: RootState) => state.customizer.dashboardFilter);
  // const [filters, setFilters] = useState({
  //   ...filter,
  //   filter: dashboardFilter,
  // });
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const dispatch = useDispatch();
  useEffect(() => {
    // Check if the welcome popup has already been shown
    const popupShown = localStorage.getItem('welcomePopupShown');
    if (!popupShown || popupShown !== 'true') {
      setShowWelcomePopup(true); // Show the popup
      localStorage.setItem('welcomePopupShown', 'true'); // Set the flag in localStorage
    }
    dispatch(setMainMenu(true));
  }, []);
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      dispatch(setMainMenu(false));
      e.preventDefault();
      // e.returnValue = ''; // Triggers browser's native dialog
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const handleClosePopup = () => {
    setShowWelcomePopup(false); // Close the popup
  };

  // useEffect(() => {
  //   setFilters({
  //     ...filters,
  //     filter: dashboardFilter,
  //   });
  // }, [dashboardFilter]);

  useEffect(() => {
    // Fetch initial data for the dashboard
    dispatch(fetchTrackingTransDT({
      ...filter,
      length: 99,
      filters: {
        FloorplanMaskedAreaId: dashboardFilter?.FloorplanMaskedAreaId || '',
      },
    }));
    dispatch(fetchBlacklistDT({
      ...filter,
      filters: {
        FloorplanMaskedAreaId: dashboardFilter?.FloorplanMaskedAreaId || '',
      },
    }));
    dispatch(fetchMaskedAreaDT({
      ...filter,
      filters:{
        FloorId: dashboardFilter?.FloorId || [],
        FloorplanId: dashboardFilter?.FloorplanId || [],
      }
    }));
    dispatch(fetchFloorplanDeviceDT({
      ...filter,
      filters: {
        FloorplanId: dashboardFilter?.FloorplanId || [],
        Type: 0,
      },
    }));
    dispatch(fetchAlarmDT({
      ...filter,
      filters: {
        FloorplanMaskedAreaId: dashboardFilter?.FloorplanMaskedAreaId || '',
      }
    }));
    
  }, [dispatch, dashboardFilter]);
  // const trackingTotalCount: number = useSelector(
  //   (state: RootState) => state.trackingTransReducer.trackingTransTotalCount ?? 0,
  // );
  const blacklistTotalCount: number = useSelector(
    (state: RootState) => state.blacklistReducer.blacklistFilteredCount ?? 0,
  );
  const maskedAreaTotalCount: number = useSelector(
    (state: RootState) => state.maskedAreaReducer.maskedAreaFilteredCount ?? 0,
  );
  const bleReaderTotalCount: number = useSelector(
    (state: RootState) => state.floorplanDeviceReducer.floorplanDeviceFilteredCount ?? 0,
  );
  const alarmTotalCount: number = useSelector(
    (state: RootState) => state.alarmReducer.alarmRecordFilteredCount ?? 0,
  );
  const trackingData: trackingTransType[] = useSelector(
    (state: RootState) => state.trackingTransReducer.trackingTrans,
  );
  const blacklistData: blacklistType[] = useSelector(
    (state: RootState) => state.blacklistReducer.blacklists,
  );
  // const maskedAreaData: MaskedAreaType[] = useSelector(
  //   (state: RootState) => state.maskedAreaReducer.maskedAreas,
  // );
  // const bleReaderData: bleReaderType[] = useSelector(
  //   (state: RootState) => state.bleReaderReducer.bleReaders,
  // );
  const alarmData: AlarmType[] = useSelector(
    (state: RootState) => state.alarmReducer.alarmRecordTrackings,
  );
  return (
    <PageContainer title="Dashboard" description="this is Dashboard page">
      <Box>
        <Grid container spacing={3}>
          {/* column */}
          <Grid
            size={{
              xs: 12,
              lg: 12,
            }}
          >
            <TopCards
              data={[
                '100', // dummy for first
                bleReaderTotalCount.toString(),
                maskedAreaTotalCount.toString(),
                blacklistTotalCount.toString(),
                alarmTotalCount.toString(),
                '20', // dummy for last
              ]}
            />
          </Grid>
          {/* column */}
          <Grid
            size={{
              xs: 4,
              lg: 4,
            }}
          >
            <TrackingGraph alarmData={alarmData} trackingData={trackingData} />
          </Grid>
          {/* column */}
          <Grid
            size={{
              xs: 4,
              lg: 4,
            }}
          >
            <AlarmWarning alarmData={alarmData} />
          </Grid>
          {/* column */}
          <Grid
            size={{
              xs: 4,
              lg: 4,
            }}
          >
            <BlacklistTable blacklistData={blacklistData} />
          </Grid>
        </Grid>
      </Box>
      {/* Welcome Popup */}
      <WelcomePopup open={showWelcomePopup} onClose={handleClosePopup} />
    </PageContainer>
  );
};

export default Modern;
