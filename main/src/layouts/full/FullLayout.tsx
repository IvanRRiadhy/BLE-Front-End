import { FC, useEffect, useState } from 'react';
import { styled, Container, Box, useTheme } from '@mui/material';
import { useSelector, useDispatch } from 'src/store/Store';
import { Outlet } from 'react-router';
import { AppState } from 'src/store/Store';
import Sidebar from './vertical/sidebar/Sidebar';
import Navigation from '../full/horizontal/navbar/Navigation';
import HorizontalHeader from '../full/horizontal/header/Header';
import ScrollToTop from '../../components/shared/ScrollToTop';
import LoadingBar from '../../LoadingBar';
import MonitoringHeader from './monitoringLayout/Header';
import { setSessionExpiredHandler } from 'src/utils/axios';
import SessionExp from './shared/SessionExp';
import AlarmPopup from './AlarmPopup';
import { hydrateEvacState } from 'src/store/customizer/CustomizerSlice';

const MainWrapper = styled('div')(() => ({
  display: 'flex',
  minHeight: '100vh',
  width: '100%',
}));

const PageWrapper = styled('div')(() => ({
  display: 'flex',
  flexGrow: 1,
  // paddingBottom: '60px',
  flexDirection: 'column',
  zIndex: 1,
  width: '100%',
  backgroundColor: 'transparent',
}));



const FullLayout: FC = () => {
  const dispatch = useDispatch();
  const customizer = useSelector((state: AppState) => state.customizer);
  const evacState = useSelector((state: AppState) => state.customizer.evacState);
  const theme = useTheme();

  const [sessionExpired, setSessionExpired] = useState(false);

useEffect(() => {
  setSessionExpiredHandler(() => setSessionExpired(true));
  // Hydrate evacState from localStorage
  const savedEvac = localStorage.getItem('evacState');
  if (savedEvac) {
    dispatch(hydrateEvacState(JSON.parse(savedEvac)));
  }
  return () => setSessionExpiredHandler(() => {});
}, []);

  return (
    <>
    <AlarmPopup />
    <SessionExp open={sessionExpired} />
      <LoadingBar />
      <MainWrapper
        className={customizer.activeMode === 'dark' ? 'darkbg mainwrapper' : 'mainwrapper'}
        
      >
{evacState === 'running' && (
  <Box
    sx={{
      pointerEvents: 'none',
      position: 'fixed',
      zIndex: 9999,
      inset: 0,
      background: `
        radial-gradient(
          ellipse at center,
          rgba(255,255,255,0.0) 40%,
          rgba(255,0,0,0.15) 65%,
          rgba(130, 0, 0, 0.45) 100%
        )
      `,
      animation: 'evac-breathe-opacity 3s ease-in-out infinite',
      '@keyframes evac-breathe-opacity': {
        '0%':   { opacity: 1 },
        '50%':  { opacity: 0.3 },
        '100%': { opacity: 1 },
      },
    }}
  />
)}

        {/* ------------------------------------------- */}
        {/* Sidebar */}
        {/* ------------------------------------------- */}
        {customizer.isHorizontal ? '' : <Sidebar />}
        {/* ------------------------------------------- */}
        {/* Main Wrapper */}
        {/* ------------------------------------------- */}
        <PageWrapper
          className="page-wrapper"
          sx={{
            ...(customizer.isCollapse && {
              [theme.breakpoints.up('lg')]: { ml: `${customizer.MiniSidebarWidth}px` },
            }),
          }}
        >
          {/* ------------------------------------------- */}
          {/* Header */}
          {/* ------------------------------------------- */}
          {customizer.isHorizontal ? <HorizontalHeader /> : <MonitoringHeader />}

          {/* PageContent */}
          {customizer.isHorizontal ? <Navigation /> : ''}
          {/* ------------------------------------------- */}
          {/* Monitoring Sidebar */}
          {/* ------------------------------------------- */}
          <Box
            sx={{
              display: 'flex', // Align MonitoringSidebar and content horizontally
              flexDirection: 'row',
              width: '100%',
            }}
          >
            {/* {customizer.isMonitorSidebar && <MonitoringSidebar />} */}
            <Container
              sx={{
                pt: '0px',
                maxWidth: customizer.isLayout === 'boxed' ? 'lg' : '100%!important',
                flexGrow: 1, // Allow content to take remaining space
              }}
            >
              {/* ------------------------------------------- */}
              {/* PageContent */}
              {/* ------------------------------------------- */}
              <Box sx={{ minHeight: 'calc(100vh - 170px)' }}>
                <ScrollToTop>
                  <Outlet />
                </ScrollToTop>
              </Box>
            </Container>
          </Box>
          {/* <Customizer /> */}
        </PageWrapper>
      </MainWrapper>
    </>
  );
};

export default FullLayout;
