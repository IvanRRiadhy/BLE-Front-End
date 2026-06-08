import { Drawer, Theme, useMediaQuery } from '@mui/material';
import React from 'react';
import StayOnAreaDetailList from './StayOnAreaDetailList';

const drawerWidth = 260;

interface Props {
  isEditingSidebarOpen: boolean;
  onEditingSidebarClose: (event: React.MouseEvent<HTMLElement>) => void;
}

const StayOnAreaSidebar = ({ isEditingSidebarOpen, onEditingSidebarClose }: Props) => {
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
        open={isEditingSidebarOpen}
        onClose={onEditingSidebarClose}
        variant={lgUp ? 'persistent' : 'temporary'}
      >
        <StayOnAreaDetailList />
      </Drawer>
    </>
  );
};

export default StayOnAreaSidebar;
