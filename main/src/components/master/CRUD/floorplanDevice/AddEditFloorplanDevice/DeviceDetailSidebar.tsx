import { Drawer, Theme, useMediaQuery } from '@mui/material';
import React from 'react';
import DeviceDetailList from './DeviceDetailList';

const drawerWidth = 260;

interface Props {
  isEditingSidebarOpen: boolean;
  onEditingSidebarClose: (event: React.MouseEvent<HTMLElement>) => void;
}

const DeviceDetailSidebar = ({ isEditingSidebarOpen, onEditingSidebarClose }: Props) => {
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
        ModalProps={{
          onBackdropClick: () => {}, // ← prevent auto close
        }}
        open={isEditingSidebarOpen}
        onClose={onEditingSidebarClose}
        variant="permanent"
      >
        <DeviceDetailList />
      </Drawer>
    </>
  );
};

export default DeviceDetailSidebar;
