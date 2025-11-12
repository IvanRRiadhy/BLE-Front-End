import { FC, useEffect, useState, useRef } from 'react';
import { styled, Container, Box, useTheme } from '@mui/material';
import { useSelector, useDispatch } from 'src/store/Store';
import { Outlet } from 'react-router';
import { RootState, AppDispatch } from 'src/store/Store';
import Sidebar from './vertical/sidebar/Sidebar';
import Navigation from '../full/horizontal/navbar/Navigation';
import HorizontalHeader from '../full/horizontal/header/Header';
import ScrollToTop from '../../components/shared/ScrollToTop';
import LoadingBar from '../../LoadingBar';
import MonitoringHeader from './monitoringLayout/Header';
import { setSessionExpiredHandler } from 'src/utils/axios';
import SessionExp from './shared/SessionExp';
import { hydrateEvacState } from 'src/store/customizer/CustomizerSlice';
import { Toaster } from 'react-hot-toast';
import { startNTFYclient } from 'src/store/apps/tracking/NTFY';
import { fetchAlarmTrigger } from 'src/store/apps/crud/alarmTrigger';
import { memberType } from 'src/store/apps/crud/member';
import { VisitorType } from 'src/store/apps/crud/visitor';
import { showAlarmPopup } from 'src/store/apps/monitoring/AlarmUI';
import { pushItem, openPanel } from 'src/store/apps/monitoring/NotifySlice';
import { fetchAlarmSettingsDT } from 'src/store/apps/alarmsetting/alarmSettings';
import { defaultAlarmSettingFilter } from 'src/store/apps/defaultForm';
import { AlarmType } from 'src/store/apps/tracking/Alarm';
import AlarmPopup from './AlarmPopup';

const MainWrapper = styled('div')(() => ({
  display: 'flex',
  minHeight: '100vh',
  width: '100%',
}));

const PageWrapper = styled('div')(() => ({
  display: 'flex',
  flexGrow: 1,
  flexDirection: 'column',
  zIndex: 1,
  width: '100%',
  backgroundColor: '#ffffffff',
}));

const FullLayout: FC = () => {
  const dispatch: AppDispatch = useDispatch();
  const customizer = useSelector((state: RootState) => state.customizer);
  const evacState = useSelector((state: RootState) => state.customizer.evacState);
  const theme = useTheme();
  const memberList: memberType[] = useSelector((s: RootState) => s.memberReducer.members);
  const visitorList: VisitorType[] = useSelector((s: RootState) => s.visitorReducer.visitors);

  const [sessionExpired, setSessionExpired] = useState(false);
  const lastDispatchRef = useRef(0);
  const unsubscriberRef = useRef<(() => void) | null>(null);

  const [latestAlarm, setLatestAlarm] = useState<AlarmType | null>(null);
  const [openAlarmPopup, setOpenAlarmPopup] = useState(false);

  // Resolve display name from beacon/card ID
  const getName = (bleNumber: string) => {
    const m = memberList.find((x) => x.bleCardNumber === bleNumber);
    if (m) return m.name;
    const v = visitorList.find((x) => x.bleCardNumber === bleNumber);
    if (v) return v.name;
    return bleNumber || 'Unknown';
  };
  useEffect(() => {
    dispatch(fetchAlarmSettingsDT(defaultAlarmSettingFilter));
  }, []);
  useEffect(() => {
    // Request notification permission
    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          console.log('[Notifications] Permission granted');
        } else {
          console.warn('[Notifications] Permission denied');
        }
      });
    }

    // Set up session expiration handler
    setSessionExpiredHandler(() => setSessionExpired(true));
    const savedEvac = localStorage.getItem('evacState');
    if (savedEvac) {
      dispatch(hydrateEvacState(JSON.parse(savedEvac)));
    }

    // NTFY subscription for alarms
    const topic = '192.168.1.116:6099/alarm-ntfy';
    console.log(`[NTFY] Subscribing to alarm topic "${topic}"`);
    const unsubscribe = startNTFYclient(
      (data: any) => {
        const now = Date.now();
        // console.log(`[NTFY] Message from alarm topic "${topic}":`, data);
        const alarmData = Array.isArray(data) ? data[0] : data;
        setLatestAlarm(alarmData);
        setOpenAlarmPopup(true);
        dispatch(showAlarmPopup(alarmData));
        // document.dispatchEvent(new CustomEvent('app:new-alarm', { detail: { alarm: alarmData } }));
        // window.dispatchEvent(new CustomEvent('app:new-alarm', { detail: { alarm: alarmData } }));
        window.postMessage({ type: 'app:new-alarm', detail: { alarm: alarmData } }, '*');
        // Add to bell dialogue & open it
        dispatch(
          pushItem({
            id: `${alarmData?.beaconId ?? 'unknown'}-${Date.now()}`,
            alarm: alarmData,
            title: 'Alarm Triggered',
            message: `Beacon ${getName(alarmData?.beaconId || 'Unknown')} · ${
              alarmData?.maskedAreaName ?? 'Unknown'
            } · ${alarmData?.floorplanName ?? 'Unknown'}`,
          }),
        );
        dispatch(openPanel());

        // Show browser notification if window is not focused
        if (
          'Notification' in window &&
          Notification.permission === 'granted' &&
          !document.hasFocus()
        ) {
          const title = 'Alarm Triggered!';
          const body = `Beacon ${getName(alarmData.beaconId || 'Unknown')} is in ${
            alarmData.maskedAreaName || 'Unknown Area'
          } on ${alarmData.floorplanName || 'Unknown Floor'}.`;
          const notification = new Notification(title, {
            body,
            icon: '/icon.png', // Replace with actual icon path
          });
          notification.onclick = () => {
            window.focus();
            notification.close();
          };
        }

        if (now - lastDispatchRef.current > 1500) {
          lastDispatchRef.current = now;
          dispatch(fetchAlarmTrigger());
        }
      },
      topic,
      { baseUrl: 'http://192.168.1.116:6099' },
    );

    if (!unsubscribe) {
      console.error(`[NTFY] Failed to subscribe to alarm topic "${topic}"`);
    } else {
      unsubscriberRef.current = unsubscribe;
    }

    return () => {
      setSessionExpiredHandler(() => {});
      if (unsubscriberRef.current) {
        unsubscriberRef.current();
        unsubscriberRef.current = null;
      }
    };
  }, [dispatch, memberList, visitorList]);

  return (
    <>
      {/* <AlarmPopup alarm={latestAlarm} open={openAlarmPopup} onClose={() => setOpenAlarmPopup(false)} /> */}
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
                '0%': { opacity: 1 },
                '50%': { opacity: 0.3 },
                '100%': { opacity: 1 },
              },
            }}
          />
        )}

        {/* Sidebar */}
        {customizer.isHorizontal ? '' : <Sidebar />}
        {/* Main Wrapper */}
        <PageWrapper
          className="page-wrapper"
          sx={{
            ...(customizer.isCollapse && {
              [theme.breakpoints.up('lg')]: { ml: `${customizer.MiniSidebarWidth}px` },
            }),
          }}
        >
          {/* Header */}
          {customizer.isHorizontal ? <HorizontalHeader /> : <MonitoringHeader />}
          {/* PageContent */}
          {customizer.isHorizontal ? <Navigation /> : ''}
          {/* Monitoring Sidebar */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'row',
              width: '100%',
            }}
          >
            <Container
              sx={{
                pt: '0px',
                maxWidth: customizer.isLayout === 'boxed' ? 'lg' : '100%!important',
                flexGrow: 1,
              }}
            >
              <Box
                sx={{
                  minHeight: 'calc(100vh - 170px)',
                  py: customizer.isHorizontal ? 1 : 0,
                }}
              >
                <ScrollToTop>
                  <Outlet />
                </ScrollToTop>
              </Box>
            </Container>
          </Box>
        </PageWrapper>
      </MainWrapper>
      <Toaster
        position="top-center"
        containerStyle={{
          fontSize: '1.15rem',
          padding: '16px 24px',
          minWidth: '500px',
        }}
        toastOptions={{
          success: {
            style: {
              background: 'darkgreen',
              color: '#fff',
            },
          },
          error: {
            style: {
              background: 'darkred',
              color: '#fff',
            },
          },
        }}
      />
    </>
  );
};

export default FullLayout;
