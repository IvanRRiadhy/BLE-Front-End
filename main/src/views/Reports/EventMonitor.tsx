import { useState } from 'react';
import { Button, Box, Drawer, useMediaQuery, Theme } from '@mui/material';
import PageContainer from 'src/components/container/PageContainer';
// import Breadcrumb from 'src/layouts/full/shared/breadcrumb/Breadcrumb';
import AppCard from 'src/components/shared/AppCard';
import EventLogList from 'src/components/master/Reports/EventLog/EventLogList';
import EventReport from 'src/components/master/Reports/EventLog/EventReportList';

const EventMonitor = () => {
  return (
    <PageContainer title="People Tracking System" description="this is Event Log Page">
      <AppCard>
        <Box
          sx={{
            p: 3,
            minWidth: '100%',
            width: '100%',
            flexShrink: 0,
          }}
        >
            <EventLogList />
        </Box>
      </AppCard>
    </PageContainer>
  );
};

export default EventMonitor;