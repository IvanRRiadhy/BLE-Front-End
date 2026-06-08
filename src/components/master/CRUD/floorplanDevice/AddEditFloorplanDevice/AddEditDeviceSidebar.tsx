import {  Drawer, Theme, useMediaQuery} from '@mui/material';
import DeviceList from './DeviceList';
import React from 'react';

const drawerWidth = 260;

// interface Props {
//   isMobileSidebarOpen: boolean;
//   onSidebarClose: (event: React.MouseEvent<HTMLElement>) => void;
// }
// const AddEditDeviceSidebar = ({ isMobileSidebarOpen, onSidebarClose }: Props) => {
const AddEditDeviceSidebar = () => {
  const lgUp = useMediaQuery((theme: Theme) => theme.breakpoints.up('lg'));

  return (
    <>
      <Drawer
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          zIndex: lgUp ? 0 : 1,
          [`& .MuiDrawer-paper`]: {
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            maxHeight: 'fit-content',
            overflowY: 'hidden',
          },
        }}
        open={true}
        // open={isMobileSidebarOpen}
        // onClose={onSidebarClose}
        variant="permanent"
      >
        <DeviceList />
      </Drawer>
    </>
  );
};

export default AddEditDeviceSidebar;
