import { Drawer, Theme, useMediaQuery } from '@mui/material';
import React from 'react';
import GatewayLayout from 'src/components/forms/form-vertical/GatewayLayout';

const drawerWidth = 260;

interface gatesType {
  isMobileSidebarOpen: boolean;
  onSidebarClose: (event: React.MouseEvent<HTMLElement>) => void;
}

const GatewaySidebar = ({ isMobileSidebarOpen, onSidebarClose }: gatesType) => {
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
            maxHeight: 'fit-content',
            overflowY: 'auto',
          },
        }}
        open={isMobileSidebarOpen}
        onClose={onSidebarClose}
        variant={lgUp ? 'persistent' : 'temporary'}
      >
        <GatewayLayout />
      </Drawer>
    </>
  );
};

export default GatewaySidebar;
