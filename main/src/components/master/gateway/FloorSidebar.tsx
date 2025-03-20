import { Drawer, Theme, useMediaQuery } from '@mui/material';
import FloorList from '../floorplan/FloorList';
import React from 'react';

const drawerWidth = 260;

interface FloorType {
  isMobileSidebarOpen: boolean;
  onSidebarClose: (event: React.MouseEvent<HTMLElement>) => void;
}

const FloorSidebar = ({ isMobileSidebarOpen, onSidebarClose }: FloorType) => {
  const lgUp = useMediaQuery((theme: Theme) => theme.breakpoints.up('lg'));

  return (
    <>
      <Drawer
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          zIndex: lgUp ? 0 : 1,
          display: 'flex',
          flexDirection: 'column',
          [`& .MuiDrawer-paper`]: {
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            height: '450px',
            overflowY: 'auto',
          },
        }}
        open={isMobileSidebarOpen}
        onClose={onSidebarClose}
        variant={lgUp ? 'persistent' : 'temporary'}
      >
        <FloorList />
      </Drawer>
    </>
  );
};

export default FloorSidebar;
