import { useState } from 'react';
import { Button, Box, Drawer, useMediaQuery, Theme } from '@mui/material';
import PageContainer from 'src/components/container/PageContainer';
import AppCard from 'src/components/shared/AppCard';
import TimeGroupDetails from 'src/components/master/CRUD/timeGroup/TimeGroupContent';
import TimeGroupList from 'src/components/master/CRUD/timeGroup/TimeGroupList';
import TimeGroupSearch from 'src/components/master/CRUD/timeGroup/TimeGroupSearch';

const drawerWidth = 240;
const secdrawerWidth = 320;

const TimeGroup = () => {
  const [isLeftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [isRightSidebarOpen, setRightSidebarOpen] = useState(false);
  const lgUp = useMediaQuery((theme: Theme) => theme.breakpoints.up('lg'));
  const mdUp = useMediaQuery((theme: Theme) => theme.breakpoints.up('md'));

  return (
    <PageContainer title="People Tracking System" description="People Tracking System">
      <AppCard>
        {/* ------------------------------------------- */}
        {/* Left Part */}
        {/* ------------------------------------------- */}
        <Drawer
          open={isLeftSidebarOpen}
          onClose={() => setLeftSidebarOpen(false)}
          sx={{
            width: drawerWidth,
            [`& .MuiDrawer-paper`]: { width: drawerWidth, position: 'relative', zIndex: 2 },
            flexShrink: 0,
          }}
          variant={lgUp ? 'permanent' : 'temporary'}
        >
          <TimeGroupSearch onClick={() => setLeftSidebarOpen(true)} />
          <TimeGroupList />
        </Drawer>
        {/* ------------------------------------------- */}
        {/* Main part */}
        {/* ------------------------------------------- */}
        <Drawer
          anchor="right"
          open={isRightSidebarOpen}
          onClose={() => setRightSidebarOpen(false)}
          variant={mdUp ? 'permanent' : 'temporary'}
          sx={{
            width: mdUp ? secdrawerWidth : '100%',
            zIndex: lgUp ? 0 : 1,
            flex: mdUp ? 'auto' : '',
            [`& .MuiDrawer-paper`]: { width: '100%', position: 'relative' },
          }}
        >
          <TimeGroupDetails />
        </Drawer>
      </AppCard>
    </PageContainer>
  );
};

export default TimeGroup;
