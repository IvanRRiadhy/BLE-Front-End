import {  Drawer, Theme, useMediaQuery } from '@mui/material';

import React from 'react';
import PatrolAreaList from './PatrolAreaList';

const drawerWidth = 260;


interface Props {
  isMobileSidebarOpen: boolean;
  onSidebarClose: (event: React.MouseEvent<HTMLElement>) => void;
}

const AddEditPatrolAreaSidebar = ({ isMobileSidebarOpen, onSidebarClose }: Props) => {
  const lgUp = useMediaQuery((theme: Theme) => theme.breakpoints.up('lg'));
  // const theme = useTheme();

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
        variant="permanent"
      >
        <PatrolAreaList />
      </Drawer>
    </>
  );
};

export default AddEditPatrolAreaSidebar;
