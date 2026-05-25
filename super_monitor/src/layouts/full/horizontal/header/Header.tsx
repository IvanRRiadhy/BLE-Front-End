// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useEffect, useState } from 'react';
import {
  IconButton,
  Box,
  AppBar,
  useMediaQuery,
  Toolbar,
  styled,
  Stack,
  Theme,
  Button,
  Container,
  Tooltip,
} from '@mui/material';

import * as htmlToImage from 'html-to-image';
import { useSelector, useDispatch } from 'src/store/Store';
import { hoverSidebar, toggleMobileSidebar } from 'src/store/customizer/CustomizerSlice';
import { IconMenu2, IconRestore } from '@tabler/icons-react';
import Profile from 'src/layouts/full/vertical/header/Profile';
import Language from 'src/layouts/full/vertical/header/Language';
import Logo from 'src/layouts/full/shared/logo/Logo';
import { RootState } from 'src/store/Store';
import { restartEngine } from 'src/store/apps/crud/engine';
import SkylineNavbar from '../navbar/SkylineNavbar';
import DashboardFilter from '../navbar/DashboardFilter';
import TimeDisplay from '../navbar/TimeDisplay';
import { fetchDailyReport } from 'src/store/apps/crud/analytics';
import { useHorizontalOverflow } from '../../shared/useHorizontalOverflow';

const Header = () => {
  const lgDown = useMediaQuery((theme: Theme) => theme.breakpoints.down('lg'));
  const lgUp = useMediaQuery((theme: any) => theme.breakpoints.up('lg'));
  const isMain = useSelector((state: RootState) => state.customizer.isMainMenu);
  const isSidebarHover = useSelector((state: RootState) => state.customizer.isSidebarHover);
  const { ref: navRef, isOverflowing } = useHorizontalOverflow();

  // drawer
  const customizer = useSelector((state: RootState) => state.customizer);
  const settings = useSelector((state: RootState) => state.settings);
  const dispatch = useDispatch();

  const AppBarStyled = styled(AppBar)(({ theme }) => ({
    background: theme.palette.background.paper,
    justifyContent: 'center',
    backdropFilter: 'blur(4px)',

    [theme.breakpoints.up('lg')]: {
      minHeight: settings.TopbarHeight,
    },
  }));
  const ToolbarStyled = styled(Toolbar)(({ theme }) => ({
    margin: '0 auto',
    width: '100%',
    color: `${theme.palette.text.secondary} !important`,
  }));

  const handleScreenshot = async () => {
    const node = document.getElementById('dashboard');
    console.log(node);
    if (!node) return;

    try {
      const dataUrl = await htmlToImage.toPng(node, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      });

      const link = document.createElement('a');
      link.download = `dashboard-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error(err);
    }
  };

  const handleClick = async () => {
    try {
      await dispatch(restartEngine('admin'));
      // handle success
    } catch (error) {
      // handle error
    }
  };

  return (
    <AppBarStyled position="sticky" color="default" elevation={8}>
      <ToolbarStyled
        sx={{
          maxWidth: settings.isLayout === 'boxed' ? 'lg' : '100%!important',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            pl: 2, // 👈 small left padding
            pr: 2,
            flexShrink: 0,
          }}
        >
          <Logo />
        </Box>
        {/* ------------------------------------------- */}
        {/* Toggle Button Sidebar */}
        {/* ------------------------------------------- */}
        {(lgDown || isOverflowing) && (
          <Tooltip title="Open navigation">
            <IconButton
              color="inherit"
              aria-label="menu"
              onClick={
                lgDown
                  ? () => dispatch(toggleMobileSidebar())
                  : () => dispatch(hoverSidebar(!isSidebarHover))
              }
            >
              <IconMenu2 />
            </IconButton>
          </Tooltip>
        )}

        {lgDown ? (
          <Box flexGrow={1} />
        ) : (
          <Container
            sx={{
              maxWidth: settings.isLayout === 'boxed' ? 'lg' : '100%!important',
            }}
          >
            <Box display="flex" justifyContent="space-between" alignItems="center">
              {!isOverflowing && (
                <Box
                  ref={navRef}
                  sx={{
                    // overflowx: 'hidden',
                    whiteSpace: 'nowrap',
                    maxWidth: '100%',
                  }}
                >
                  <SkylineNavbar />
                </Box>
              )}

              {/* Right section */}
              <Box display="flex" alignItems="center" sx={{ gap: 2 }}>
                {/* Fixed button group */}
                {isMain && (
                  <Box display="flex" alignItems="center" sx={{ gap: 1 }}>
                    <DashboardFilter />
                    <Button variant="outlined" size="small" onClick={handleScreenshot}>
                      Screenshot
                    </Button>
                  </Box>
                )}

                {/* Let TimeDisplay take space but not affect the button group */}
                <Box sx={{ flexShrink: 0 }}>
                  <TimeDisplay />
                </Box>
              </Box>
            </Box>
          </Container>
        )}
        <Box flexGrow={1} />
        <Stack spacing={1} direction="row" alignItems="center">
          <IconButton size="large" color="inherit" onClick={handleClick}>
            <IconRestore size="21" stroke="1.5" />
          </IconButton>

          <Language />

          <Profile />
        </Stack>
      </ToolbarStyled>
    </AppBarStyled>
  );
};

export default Header;
