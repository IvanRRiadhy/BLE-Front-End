import {
  IconButton,
  Box,
  AppBar,
  useMediaQuery,
  Toolbar,
  styled,
  Stack,
  Divider,
} from '@mui/material';

import { useSelector, useDispatch } from 'src/store/Store';
import { toggleMobileSidebar, hoverSidebar } from 'src/store/customizer/CustomizerSlice';
import { IconMenu2, IconRestore } from '@tabler/icons-react';
import Profile from '../vertical/header/Profile';
import { RootState } from 'src/store/Store';
import Logo from '../shared/logo/Logo';
import NavListing from './Navigation/NavListing';
import { useEffect, useState } from 'react';
import Notification from '../vertical/header/Notification';
import { restartEngine } from 'src/store/apps/crud/engine';

const Header = () => {
  const lgUp = useMediaQuery((theme: any) => theme.breakpoints.up('lg'));
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  // drawer
  const customizer = useSelector((state: RootState) => state.customizer);
  const dispatch = useDispatch();
  const isSidebarHover = useSelector((state: RootState) => state.customizer.isSidebarHover);

  const AppBarStyled = styled(AppBar)(({ theme }) => ({
    boxShadow: 'none',
    background: theme.palette.background.paper,
    justifyContent: 'center',
    backdropFilter: 'blur(4px)',
    [theme.breakpoints.up('lg')]: {
      minHeight: customizer.TopbarHeight,
    },
  }));
  const ToolbarStyled = styled(Toolbar)(({ theme }) => ({
    width: '100%',
    color: theme.palette.text.secondary,
  }));

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement); // Update state based on fullscreenElement
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange); // Safari
    document.addEventListener('msfullscreenchange', handleFullscreenChange); // IE/Edge

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, []);
    const handleClick = async () => {
    try {
      await dispatch(restartEngine("admin"));
      // handle success
    } catch (error) {
      // handle error
    }
  };

  return (
    !isFullscreen && (
      <AppBarStyled position="sticky" color="default">
        <ToolbarStyled>
          {/* ------------------------------------------- */}
          {/* Toggle Button Sidebar */}
          {/* ------------------------------------------- */}
          <IconButton
            color="inherit"
            aria-label="menu"
            onClick={
              lgUp
                ? () => dispatch(hoverSidebar(!isSidebarHover))
                : () => dispatch(toggleMobileSidebar())
            }
          >
            <IconMenu2 size="20" />
          </IconButton>
          <Box px={3}>
            <Logo />
          </Box>
          <NavListing />

          {/* ------------------------------------------- */}
          {/* Search Dropdown */}
          {/* ------------------------------------------- */}
          {/* <Search /> */}
          {/* {lgUp ? (
        <>
          <Navigation />
        </>
      ) : null} */}

          <Box flexGrow={1} />
          <Stack spacing={1} direction="row" alignItems="center">
          <IconButton size="large" color="inherit">
            <IconRestore size="21" stroke="1.5"
            onClick={handleClick}
            />
          </IconButton>
            <Profile />
          </Stack>
        </ToolbarStyled>
        <Divider />
      </AppBarStyled>
    )
  );
};

export default Header;
