import { useState } from 'react';
import PageContainer from 'src/components/container/PageContainer';
import TrackingApp from 'src/components/apps/Tracking/Tracking';
import AppCard from 'src/components/shared/AppCard';
import { Box, Theme, useMediaQuery } from '@mui/system';
import FloorSidebar from 'src/components/master/gateway/FloorSidebar';
import AlarmList from 'src/components/apps/Tracking/AlarmList';
import { Divider, Drawer } from '@mui/material';
import FloorDetails from 'src/components/apps/Tracking/FloorDetails';

const drawerWidth = 380;

const Tracking = () => {
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(true);
  const lgUp = useMediaQuery((theme: Theme) => theme.breakpoints.up('lg'));
  const mdUp = useMediaQuery((theme: Theme) => theme.breakpoints.up('md'));
  const [isRightSidebarOpen, setRightSidebarOpen] = useState(false);
  return (
    <PageContainer title="Tracking" description="this is tracking page">
      <AppCard>
        <Box display="flex" flexDirection="column">
          <FloorSidebar
            isMobileSidebarOpen={isMobileSidebarOpen}
            onSidebarClose={() => setMobileSidebarOpen(false)}
          />
          <Divider />
          <FloorDetails />
        </Box>

        <Drawer
          anchor="right"
          open={isRightSidebarOpen}
          onClose={() => setRightSidebarOpen(false)}
          variant={mdUp ? 'permanent' : 'temporary'}
          sx={{
            width: mdUp ? drawerWidth : '100%',
            zIndex: lgUp ? 0 : 1,
            flex: mdUp ? 'auto' : '',
            [`& .MuiDrawer-paper`]: { width: '100%', position: 'relative', overflow: 'hidden' },
          }}
        >
          <TrackingApp />
        </Drawer>
        <AlarmList />
      </AppCard>
    </PageContainer>
  );
};

export default Tracking;
