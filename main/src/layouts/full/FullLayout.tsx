import { FC, useEffect, useState } from 'react';
import { styled, Container, Box, useTheme } from '@mui/material';
import { useSelector } from 'src/store/Store';
import { Outlet } from 'react-router';
import { AppState } from 'src/store/Store';
import Header from './vertical/header/Header';
import Sidebar from './vertical/sidebar/Sidebar';
import Customizer from './shared/customizer/Customizer';
import Navigation from '../full/horizontal/navbar/Navigation';
import HorizontalHeader from '../full/horizontal/header/Header';
import ScrollToTop from '../../components/shared/ScrollToTop';
import LoadingBar from '../../LoadingBar';
import MonitoringHeader from './monitoringLayout/Header';
import MonitoringSidebar from '../../components/dashboards/monitoring/Sidebar/MonitoringSidebar';
import { setSessionExpiredHandler } from 'src/utils/axios';
import SessionExp from './shared/SessionExp';

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
  const customizer = useSelector((state: AppState) => state.customizer);

  const theme = useTheme();

  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    setSessionExpiredHandler(() => setSessionExpired(true));
    console.log(sessionExpired)
    return () => setSessionExpiredHandler(() => {});
  }, []);

  return (
    <>
    <SessionExp open={sessionExpired} />
      <LoadingBar />
      <MainWrapper
        className={customizer.activeMode === 'dark' ? 'darkbg mainwrapper' : 'mainwrapper'}
      >
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
