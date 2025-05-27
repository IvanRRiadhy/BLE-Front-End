import { Button, Drawer, Theme, Typography, useMediaQuery, useTheme } from '@mui/material';
import DeviceList from './DeviceList';
import React from 'react';
import { Box } from '@mui/system';

const drawerWidth = 260;

interface Props {
  isMobileSidebarOpen: boolean;
  onSidebarClose: (event: React.MouseEvent<HTMLElement>) => void;
}

const AddEditDeviceSidebar = ({ isMobileSidebarOpen, onSidebarClose }: Props) => {
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
            height: '100%',
            maxHeight: 'fit-content',
            overflowY: 'auto',
          },
        }}
        open={isMobileSidebarOpen}
        onClose={onSidebarClose}
        variant={lgUp ? 'persistent' : 'temporary'}
      >
        <DeviceList />
      </Drawer>
    </>
  );
};

export default AddEditDeviceSidebar;
