import { Drawer, Theme, Typography, useMediaQuery, useTheme } from '@mui/material';
import DeviceList from './DeviceList';
import React from 'react';
import { Box } from '@mui/system';
import DeviceDetailList from './DeviceDetailList';

const drawerWidth = 260;

interface Props {
  isEditingSidebarOpen: boolean;
  onEditingSidebarClose: (event: React.MouseEvent<HTMLElement>) => void;
}

const DeviceDetailSidebar = ({ isEditingSidebarOpen, onEditingSidebarClose }: Props) => {
  const lgUp = useMediaQuery((theme: Theme) => theme.breakpoints.up('lg'));
  const theme = useTheme();

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
        open={isEditingSidebarOpen}
        onClose={onEditingSidebarClose}
        variant={lgUp ? 'persistent' : 'temporary'}
      >
        <DeviceDetailList />
      </Drawer>
    </>
  );
};

export default DeviceDetailSidebar;
