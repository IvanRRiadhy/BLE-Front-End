import { useMediaQuery, Box, Drawer, useTheme } from '@mui/material';
import { useSelector, useDispatch } from 'src/store/Store';
import Scrollbar from 'src/components/custom-scroll/Scrollbar';
import { AppState } from 'src/store/Store';
import AlarmList from 'src/components/apps/Tracking/AlarmList';
import SidebarList from './SidebarList';
import { useState } from 'react';
import SidebarFilter from './SidebarFilter';

const MonitoringSidebar = () => {
  const lgUp = useMediaQuery((theme: any) => theme.breakpoints.up('lg'));
  const customizer = useSelector((state: AppState) => state.customizer);
  const dispatch = useDispatch();
  const theme = useTheme();
  const toggleWidth = customizer.isMonitorSidebar
    ? customizer.SidebarWidth
    : customizer.MiniSidebarWidth;
  const [filterType, setFilterType] = useState('');

  if (lgUp) {
    return (
      <Box
        sx={{
          width: toggleWidth,
          flexShrink: 0,
          marginTop: `calc(1.9 * ${customizer.TopbarHeight}px)`,
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
              marginTop: `calc(1.9 * ${customizer.TopbarHeight}px)`,
              //marginLeft: customizer.isCollapse ? 0 : `${customizer.SidebarWidth}px`,
            },
          }}
        >
          {/* ------------------------------------------- */}
          {/* Sidebar Box */}
          {/* ------------------------------------------- */}
          <Box
            sx={{
              height: `calc(100% - 2 * ${customizer.TopbarHeight}px)`,
            }}
          >
            <SidebarFilter setFilterType={setFilterType} />
            <SidebarList filterType={filterType} />
          </Box>
        </Drawer>
      </Box>
    );
  }
};

export default MonitoringSidebar;
