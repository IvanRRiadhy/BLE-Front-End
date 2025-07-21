import { useMediaQuery, Box, Drawer, Container, Theme } from '@mui/material';
import NavListing from './NavListing/NavListing';
import Logo from '../../shared/logo/Logo';
import { useSelector, useDispatch } from 'src/store/Store';
import { toggleMobileSidebar } from 'src/store/customizer/CustomizerSlice';
import SidebarItems from '../../vertical/sidebar/SidebarItems';
import { AppState } from 'src/store/Store';
import TimeDisplay from './TimeDisplay';
import DashboardFilter from './DashboardFilter';

const Navigation = () => {
  const lgUp = useMediaQuery((theme: Theme) => theme.breakpoints.up('lg'));
  const customizer = useSelector((state: AppState) => state.customizer);
  const dispatch = useDispatch();
  const isMain = useSelector((state: AppState) => state.customizer.isMainMenu);

  if (lgUp) {
    return (
      <Box
        sx={{
          position: 'sticky',
          top: customizer.TopbarHeight,
          width: '100%',
          zIndex: 1100, // Ensures it's above other content
          backgroundColor: 'background.paper',
          borderBottom: '1px solid rgba(0,0,0,0.05)',
        }}
        py={2}
      >
        {/* ------------------------------------------- */}
        {/* Sidebar for desktop */}
        {/* ------------------------------------------- */}
        <Container
          sx={{
            maxWidth: customizer.isLayout === 'boxed' ? 'lg' : '100%!important',
          }}
        >
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <NavListing />
            <Box display="flex" alignItems="center" sx={{ gap: '5px' }}>
              {isMain && <DashboardFilter />}
              <TimeDisplay />
            </Box>
          </Box>
        </Container>
      </Box>
    );
  }

  return (
    <Drawer
      anchor="left"
      open={customizer.isMobileSidebar}
      onClose={() => dispatch(toggleMobileSidebar())}
      variant="temporary"
      PaperProps={{
        sx: {
          width: customizer.SidebarWidth,
          border: '0 !important',
          boxShadow: (theme) => theme.shadows[8],
        },
      }}
    >
      {/* ------------------------------------------- */}
      {/* Logo */}
      {/* ------------------------------------------- */}
      <Box px={2}>
        <Logo />
      </Box>
      {/* ------------------------------------------- */}
      {/* Sidebar For Mobile */}
      {/* ------------------------------------------- */}
      <SidebarItems />
    </Drawer>
  );
};

export default Navigation;
