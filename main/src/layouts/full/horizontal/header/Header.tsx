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
} from '@mui/material';

import { useSelector, useDispatch } from 'src/store/Store';
import { toggleMobileSidebar } from 'src/store/customizer/CustomizerSlice';
import { IconMenu2, IconRestore } from '@tabler/icons-react';
import Profile from 'src/layouts/full/vertical/header/Profile';
import Language from 'src/layouts/full/vertical/header/Language';
import Logo from 'src/layouts/full/shared/logo/Logo';
import { RootState } from 'src/store/Store';
import Notifications from '../../vertical/header/Notification';
import { restartEngine } from 'src/store/apps/crud/engine';
import NavListing from '../navbar/NavListing/NavListing';
import DashboardFilter from '../navbar/DashboardFilter';
import TimeDisplay from '../navbar/TimeDisplay';
import { fetchAlarmSetting } from 'src/store/apps/alarmsetting/alarmSettings';
import { fetchDailyReport } from 'src/store/apps/crud/analytics';

const Header = () => {
  const lgDown = useMediaQuery((theme: Theme) => theme.breakpoints.down('lg'));
  const isMain = useSelector((state: RootState) => state.customizer.isMainMenu);

  // drawer
  const customizer = useSelector((state: RootState) => state.customizer);
  const dispatch = useDispatch();

  const AppBarStyled = styled(AppBar)(({ theme }) => ({
    background: theme.palette.background.paper,
    justifyContent: 'center',
    backdropFilter: 'blur(4px)',

    [theme.breakpoints.up('lg')]: {
      minHeight: customizer.TopbarHeight,
    },
  }));
  const ToolbarStyled = styled(Toolbar)(({ theme }) => ({
    margin: '0 auto',
    width: '100%',
    color: `${theme.palette.text.secondary} !important`,
  }));

  useEffect(() => {
    dispatch(fetchAlarmSetting());
  }, [dispatch]);

  const handleScreenshot = async () => {
    const res = await dispatch(
      fetchDailyReport({
        from: '2025-07-01T00:00:00Z',
        to: '2025-10-24T23:59:59Z',
        floorplanMaskedAreaId: null,
        operatorName: null,
        visitorId: null,
        buildingId: 'bb785baf-f0b4-4f12-86c7-6dcec0c0a160',
        floorId: null,
      }),
    );
    console.log('Daily Report Data:', res.payload);
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
          maxWidth: customizer.isLayout === 'boxed' ? 'lg' : '100%!important',
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
        {lgDown ? (
          <IconButton
            color="inherit"
            aria-label="menu"
            onClick={() => dispatch(toggleMobileSidebar())}
          >
            <IconMenu2 />
          </IconButton>
        ) : (
          ''
        )}

        <Container
          sx={{
            maxWidth: customizer.isLayout === 'boxed' ? 'lg' : '100%!important',
          }}
        >
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <NavListing />

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
        <Box flexGrow={1} />
        <Stack spacing={1} direction="row" alignItems="center">
          <IconButton size="large" color="inherit" onClick={handleClick}>
            <IconRestore size="21" stroke="1.5" />
          </IconButton>

          <Language />

          <Notifications />

          <Profile />
        </Stack>
      </ToolbarStyled>
    </AppBarStyled>
  );
};

export default Header;
