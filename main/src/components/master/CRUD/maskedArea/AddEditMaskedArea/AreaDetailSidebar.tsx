import { Drawer, Theme, Typography, useMediaQuery, useTheme } from '@mui/material';
import React from 'react';
import { Box } from '@mui/system';
import AreaDetailList from './AreaDetailList';

const drawerWidth = 260;

interface Props {
  isEditingSidebarOpen: boolean;
  onEditingSidebarClose: (event: React.MouseEvent<HTMLElement>) => void;
}

const AreaDetailSidebar = ({ isEditingSidebarOpen, onEditingSidebarClose }: Props) => {
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
        <AreaDetailList />
      </Drawer>
    </>
  );
};

export default AreaDetailSidebar;
