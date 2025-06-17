// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useEffect, useState } from 'react';
import { Box, Grid2 as Grid } from '@mui/material';
import PageContainer from 'src/components/container/PageContainer';

import TopCards from 'src/components/dashboards/mainmenu/TopCards';
import RevenueUpdates from 'src/components/dashboards/mainmenu/Tracking';
import AlarmWarning from 'src/components/dashboards/mainmenu/AlarmWarning';
import BlacklistTable from 'src/components/dashboards/mainmenu/Blacklist';
import WelcomePopup from 'src/components/dashboards/mainmenu/WelcomePopup';
import { fetchBlacklist, blacklistType } from 'src/store/apps/crud/blacklist';
import { fetchMaskedAreas, MaskedAreaType } from 'src/store/apps/crud/maskedArea';
import { fetchBleReaders, bleReaderType } from 'src/store/apps/crud/bleReader';
import { fetchAlarm, AlarmType } from 'src/store/apps/crud/alarmRecordTracking';
import { RootState, useDispatch, useSelector } from 'src/store/Store';

const Modern = () => {
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);

  useEffect(() => {
    // Check if the welcome popup has already been shown
    const popupShown = localStorage.getItem('welcomePopupShown');
    if (!popupShown || popupShown !== 'true') {
      setShowWelcomePopup(true); // Show the popup
      localStorage.setItem('welcomePopupShown', 'true'); // Set the flag in localStorage
    }
  }, []);

  const handleClosePopup = () => {
    setShowWelcomePopup(false); // Close the popup
  };
  const dispatch = useDispatch();
  useEffect(() => {
    // Fetch initial data for the dashboard
    dispatch(fetchBlacklist());
    dispatch(fetchMaskedAreas());
    dispatch(fetchBleReaders());
    dispatch(fetchAlarm());
  }, [dispatch]);
  const blacklistData = useSelector((state: RootState) => state.blacklistReducer.blacklists);
  const maskedAreaData = useSelector((state: RootState) => state.maskedAreaReducer.maskedAreas);
  const bleReaderData = useSelector((state: RootState) => state.bleReaderReducer.bleReaders);
  const alarmData = useSelector((state: RootState) => state.alarmReducer.alarmRecordTrackings);
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
                bleReaderData.length.toString(),
                maskedAreaData.length.toString(),
                blacklistData.length.toString(),
                alarmData.length.toString(),
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
            <RevenueUpdates />
          </Grid>
          {/* column */}
          <Grid
            size={{
              xs: 4,
              lg: 4,
            }}
          >
            <AlarmWarning />
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
