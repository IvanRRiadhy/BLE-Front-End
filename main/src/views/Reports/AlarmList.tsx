import { useState } from 'react';
import { Box, IconButton, Tooltip, useMediaQuery, Theme } from '@mui/material';
import { keyframes } from '@mui/system';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import MenuIcon from '@mui/icons-material/Menu';
import PageContainer from 'src/components/container/PageContainer';
import AppCard from 'src/components/shared/AppCard';
import AlarmContent from 'src/components/master/Reports/AlarmList/AlarmContent';
import IntruderList from 'src/components/master/Reports/AlarmList/IntruderList';

const PANEL_WIDTH = 320;

// Subtle pulse animation on the toggle tab when panel is closed
const pulse = keyframes`
  0%   { box-shadow: 0 0 0 0 rgba(25,118,210,0.55); }
  70%  { box-shadow: 0 0 0 8px rgba(25,118,210,0); }
  100% { box-shadow: 0 0 0 0 rgba(25,118,210,0); }
`;

const AlarmList = () => {
  const [showIntruders, setShowIntruders] = useState(false);
  const mdUp = useMediaQuery((theme: Theme) => theme.breakpoints.up('md'));

  return (
    <PageContainer title="People Tracking System" description="People Tracking System">
      <AppCard>
        {/* ── Outer container ───────────────────────── */}
        <Box sx={{ display: 'flex', width: '100%', position: 'relative', overflow: 'hidden' }}>

          {/* ── Collapsible IntruderList panel ─────── */}
          <Box
            sx={{
              width: showIntruders ? PANEL_WIDTH : 0,
              minWidth: showIntruders ? PANEL_WIDTH : 0,
              flexShrink: 0,
              overflow: 'hidden',
              transition: 'width 0.25s ease, min-width 0.25s ease',
              borderRight: showIntruders ? '1px solid' : 'none',
              borderColor: 'divider',
            }}
          >
            <IntruderList />
          </Box>

          {/* ── Toggle tab ─────────────────────────── */}
          <Box
            sx={{
              position: 'sticky',
              top: 0,
              alignSelf: 'flex-start',
              zIndex: 10,
              // Sits right against the panel edge, or at left edge when closed
              ml: showIntruders ? 0 : '-4px',
              mr: showIntruders ? 0 : 0,
              display: 'flex',
              alignItems: 'flex-start',
              pt: 1.5,
            }}
          >
            <Tooltip
              title={showIntruders ? 'Hide Intruder List' : 'Show Intruder List'}
              placement="right"
            >
              <IconButton
                id="btn-toggle-intruder-list"
                onClick={() => setShowIntruders((v) => !v)}
                size="small"
                sx={{
                  backgroundColor: 'primary.main',
                  color: '#fff',
                  borderRadius: showIntruders ? '0 6px 6px 0' : '6px',
                  width: 36,
                  height: 36,
                  boxShadow: 3,
                  // Animated pulse only when hidden
                  // animation: !showIntruders ? `${pulse} 2s infinite` : 'none',
                  '&:hover': {
                    backgroundColor: 'primary.dark',
                  },
                  transition: 'border-radius 0.2s',
                }}
              >
                {showIntruders ? (
                  <MenuOpenIcon fontSize="small" />
                ) : (
                  <MenuIcon fontSize="small" />
                )}
              </IconButton>
            </Tooltip>
          </Box>

          {/* ── Main content ───────────────────────── */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <AlarmContent />
          </Box>
        </Box>
      </AppCard>
    </PageContainer>
  );
};

export default AlarmList;