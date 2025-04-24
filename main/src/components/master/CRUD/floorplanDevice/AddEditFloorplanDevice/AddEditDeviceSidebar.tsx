import { Drawer, Theme, Typography, useMediaQuery, useTheme } from '@mui/material';
import DeviceList from './DeviceList';
import React from 'react';
import { Box } from '@mui/system';

const drawerWidth = 260;

interface colorsType {
  lineColor: string;
  disp: string | any;
  id: number;
}

interface Props {
  isMobileSidebarOpen: boolean;
  onSidebarClose: (event: React.MouseEvent<HTMLElement>) => void;
}

const AddEditDeviceSidebar = ({ isMobileSidebarOpen, onSidebarClose }: Props) => {
  const lgUp = useMediaQuery((theme: Theme) => theme.breakpoints.up('lg'));
  const theme = useTheme();
  const colorvariation: colorsType[] = [
    {
      id: 1,
      lineColor: theme.palette.primary.main,
      disp: 'primary',
    },
    {
      id: 2,
      lineColor: theme.palette.info.main,
      disp: 'info',
    },
    {
      id: 3,
      lineColor: theme.palette.error.main,
      disp: 'error',
    },
    {
      id: 4,
      lineColor: theme.palette.success.main,
      disp: 'success',
    },
    {
      id: 5,
      lineColor: theme.palette.warning.main,
      disp: 'warning',
    },
    {
      id: 6,
      lineColor: theme.palette.secondary.main,
      disp: 'secondary',
    },
  ];

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
