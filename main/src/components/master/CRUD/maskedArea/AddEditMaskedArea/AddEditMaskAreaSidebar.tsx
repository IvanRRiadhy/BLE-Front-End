import {  Drawer, Theme, useMediaQuery } from '@mui/material';

import React from 'react';
import AreaList from './AreaList';

const drawerWidth = 260;


// interface Props {
//   isMobileSidebarOpen: boolean;
//   onSidebarClose: (event: React.MouseEvent<HTMLElement>) => void;
// }
// const AddEditMaksedAreaSidebar = ({ isMobileSidebarOpen, onSidebarClose }: Props) => {
const AddEditMaksedAreaSidebar = () => {
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
        open={true}
        // open={isMobileSidebarOpen}
        // onClose={onSidebarClose}
        variant="permanent"
      >
        <AreaList />
      </Drawer>
    </>
  );
};

export default AddEditMaksedAreaSidebar;
