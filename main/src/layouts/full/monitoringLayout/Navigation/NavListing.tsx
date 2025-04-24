import React from 'react';
import Menudata from './Menudata';
import { useLocation } from 'react-router';
import { Box, List, Theme, useMediaQuery } from '@mui/material';
import { useSelector } from 'src/store/Store';
import MonitorNavItem from './MonitorNavItem';
import { AppState } from 'src/store/Store';

const NavListing = () => {
  const { pathname } = useLocation();
  const pathDirect = pathname;
  const customizer = useSelector((state: AppState) => state.customizer);
  const lgUp = useMediaQuery((theme: Theme) => theme.breakpoints.up('lg'));
  const hideMenu = lgUp ? customizer.isCollapse && !customizer.isSidebarHover : '';

  return (
    <Box>
      <List sx={{ p: 0, display: 'flex', gap: '3px', zIndex: '100' }}>
        {Menudata.map((item) => {
          return (
            <MonitorNavItem
              item={item}
              key={item.id}
              pathDirect={pathDirect}
              hideMenu={hideMenu}
              onClick={function (): void {
                throw new Error('Function not implemented.');
              }}
            />
          );
        })}
      </List>
    </Box>
  );
};
export default NavListing;
