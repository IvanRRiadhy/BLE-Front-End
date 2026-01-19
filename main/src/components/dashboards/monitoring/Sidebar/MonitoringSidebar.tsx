import { useMediaQuery, Box, Drawer, useTheme } from '@mui/material';
import { useSelector } from 'src/store/Store';
import { RootState } from 'src/store/Store';
import SidebarList from './SidebarList';
import { useState } from 'react';
import SidebarFilter from './SidebarFilter';

const MonitoringSidebar = () => {
  const lgUp = useMediaQuery((theme: any) => theme.breakpoints.up('lg'));
  const customizer = useSelector((state: RootState) => state.customizer);
  const theme = useTheme();
  const toggleWidth = customizer.isMonitorSidebar
    ? customizer.SidebarWidth
    : customizer.MiniSidebarWidth;
  const [filterType, setFilterType] = useState<string[]>(['Tracking', 'Alarm']);

  if (lgUp) {
    return (
      <Box
        sx={{
          width: toggleWidth,
          flexShrink: 0,
          marginTop: `${customizer.TopbarHeight}px)`,
          position: 'relative',
          //marginLeft: customizer.isCollapse ? 0 : `${customizer.SidebarWidth}px`,
          //   ...(customizer.isCollapse && {
          //     position: 'relative',
          //   }),
        }}
      >
        {/* ------------------------------------------- */}
        {/* Sidebar for desktop */}
        {/* ------------------------------------------- */}
        <Drawer
          anchor="left"
          open
          variant="permanent"
          PaperProps={{
            sx: {
              transition: theme.transitions.create('width', {
                duration: theme.transitions.duration.shortest,
              }),
              width: toggleWidth,
              boxSizing: 'border-box',
              marginTop: `${customizer.TopbarHeight}px`,
              //marginLeft: customizer.isCollapse ? 0 : `${customizer.SidebarWidth}px`,
            },
          }}
        >
          {/* ------------------------------------------- */}
          {/* Sidebar Box */}
          {/* ------------------------------------------- */}
          <Box
            sx={{
              height: `calc(100% - ${customizer.TopbarHeight}px)`,
            }}
          >
            <SidebarFilter filterType={filterType} setFilterType={setFilterType} />
            <SidebarList filterType={filterType} />
          </Box>
        </Drawer>
      </Box>
    );
  }
};

export default MonitoringSidebar;
