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
  return (
    <PageContainer title="Modern Dashboard" description="this is Modern Dashboard page">
      <Box>
        <Grid container spacing={3}>
          {/* column */}
          <Grid
            size={{
              xs: 12,
              lg: 12,
            }}
          >
            <TopCards />
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
            <BlacklistTable />
          </Grid>
        </Grid>
      </Box>
      {/* Welcome Popup */}
      <WelcomePopup open={showWelcomePopup} onClose={handleClosePopup} />
    </PageContainer>
  );
};

export default Modern;
