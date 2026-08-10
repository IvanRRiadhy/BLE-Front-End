import React from 'react';
import { useMediaQuery, Box, Drawer, useTheme, IconButton, Tooltip, Typography } from '@mui/material';
import { useSelector } from 'src/store/Store';
import { RootState } from 'src/store/Store';
import IconChevronLeft from '@mui/icons-material/ChevronLeft';
import IconChevronRight from '@mui/icons-material/ChevronRight';
import NewestTrack from '../Footer/NewestTrack';

interface MonitoringRightSidebarProps {
  showSidebar?: boolean;
  setShowSidebar?: React.Dispatch<React.SetStateAction<boolean>>;
}

const MonitoringRightSidebar: React.FC<MonitoringRightSidebarProps> = ({
  showSidebar = true,
  setShowSidebar,
}) => {
  const lgUp = useMediaQuery((theme: any) => theme.breakpoints.up('lg'));
  const settings = useSelector((state: RootState) => state.settings);
  const theme = useTheme();
  const baseWidth = settings.SidebarWidth;
  const toggleWidth = showSidebar ? baseWidth : 0;
 
  const followingPerson = useSelector((state: RootState) => state.layoutReducer.followingPerson);
  const followingPersons = useSelector((state: RootState) => state.layoutReducer.followingPersons ?? []);
  const isFollowing = !!(followingPerson || followingPersons.length > 0);

  // If not following anyone, do not render the sidebar or toggle button at all
  if (!isFollowing) return null;

  if (lgUp) {
    return (
      <Box
        sx={{
          width: toggleWidth,
          flexShrink: 0,
          marginTop: `${settings.TopbarHeight}px`,
          position: 'relative',
          transition: theme.transitions.create('width', {
            duration: theme.transitions.duration.shortest,
          }),
        }}
      >
        {/* Floating Chevron Toggle Button on the Left edge of Right Sidebar */}
        <Box
          sx={{
            position: 'absolute',
            top: 16,
            left: showSidebar ? -8 : -26,
            zIndex: 1300,
            transition: 'left 0.2s ease',
          }}
        >
          <Tooltip title={showSidebar ? 'Hide Right Sidebar' : 'Show Right Sidebar'} placement="left">
            <IconButton
              onClick={() => setShowSidebar?.((prev) => !prev)}
              size="small"
              sx={{
                backgroundColor: 'primary.main',
                color: '#fff',
                borderRadius: showSidebar ? '6px 0 0 6px' : '6px',
                width: 32,
                height: 32,
                boxShadow: 3,
                '&:hover': {
                  backgroundColor: 'primary.dark',
                },
                transition: 'border-radius 0.2s',
              }}
            >
              {showSidebar ? (
                <IconChevronRight fontSize="small" />
              ) : (
                <IconChevronLeft fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
        </Box>

        {/* ------------------------------------------- */}
        {/* Sidebar for desktop (Right side) */}
        {/* ------------------------------------------- */}
        <Drawer
          anchor="right"
          open
          variant="permanent"
          PaperProps={{
            sx: {
              transition: theme.transitions.create('width', {
                duration: theme.transitions.duration.shortest,
              }),
              width: toggleWidth,
              boxSizing: 'border-box',
              marginTop: `${settings.TopbarHeight}px`,
              overflowX: 'hidden',
              borderLeft: showSidebar ? '1px solid' : 'none',
              borderColor: 'divider',
            },
          }}
        >
          {/* ------------------------------------------- */}
          {/* Sidebar Box containing sticky title and NewestTrack */}
          {/* ------------------------------------------- */}
          <Box
            sx={{
              height: `calc(100% - ${settings.TopbarHeight}px)`,
              width: baseWidth,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Sticky Header */}
            <Box
              sx={{
                p: 1.5,
                px: 2,
                borderBottom: '1px solid',
                borderColor: 'divider',
                backgroundColor: 'background.paper',
                position: 'sticky',
                top: 0,
                zIndex: 10,
              }}
            >
              <Typography variant="h6" fontWeight={700}>
                Followed People
              </Typography>
            </Box>

            {/* Scrollable Content */}
            <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 1 }}>
              <NewestTrack followedOnly={true} />
            </Box>
          </Box>
        </Drawer>
      </Box>
    );
  }

  return null;
};

export default MonitoringRightSidebar;
