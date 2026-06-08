import { Divider, Drawer, Theme, useMediaQuery } from '@mui/material';
import React from 'react';
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
          position: 'absolute',
          top: 0,
          bottom: 0,
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
        variant="permanent"
      >
        <AreaDetailList />
      </Drawer>
      
    </>
  );
};

export default AreaDetailSidebar;
