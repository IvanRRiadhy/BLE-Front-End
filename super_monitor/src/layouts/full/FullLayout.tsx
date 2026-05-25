import { FC, useEffect, useState, useRef, useMemo } from 'react';
import { styled, Container, Box, useTheme, useMediaQuery } from '@mui/material';
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
// import SessionExp from './shared/SessionExp';

import { Toaster } from 'react-hot-toast';
import { memberType } from 'src/store/apps/crud/member';
import { VisitorType } from 'src/store/apps/crud/visitor';
import { AlarmType } from 'src/store/apps/tracking/Alarm';
import { getConfig } from 'src/config';
import {
  AlarmLogItem,
  AlarmPriority,
  AppendAlarmLogs,
  AppendTrackingLogs,
  fetchBeacon,
  fetchCountingData,
  NotifyAlarmPopup,
  selectAlarmById,
  ShowAlarmPopup,
  TrackingLogItem,
} from 'src/store/apps/tracking/Beacon';
import { fetchEventLogs } from 'src/store/apps/tracking/Event';
import { fetchReaderHealth } from 'src/store/apps/tracking/ReaderHealth';



const MainWrapper = styled('div')(() => ({
  display: 'flex',
  minHeight: '100vh',
  width: '100%',
}));

const PageWrapper = styled('div')(({ theme }: any) => ({
  display: 'flex',
  flexGrow: 1,
  flexDirection: 'column',
  zIndex: 1,
  width: '100%',
  backgroundColor: theme.palette.background.default,
}));

const PRIORITY_WEIGHT: Record<AlarmPriority, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 99,
};

const FullLayout: FC = () => {
  const lgDown = useMediaQuery((theme: any) => theme.breakpoints.down('lg'));
  const dispatch: AppDispatch = useDispatch();
  const config = getConfig();
  const { alarmTopics, trackingTopics } = useMemo(() => {
    let aTopics: string[] = [];
    let tTopics: string[] = [];

    const storedBuildings = localStorage.getItem('accessibleBuildings');
    if (storedBuildings) {
      try {
        const parsed: string[] = JSON.parse(storedBuildings);
        if (Array.isArray(parsed) && parsed.length > 0) {
          aTopics = parsed.map((id) => `people_tracking/alarm/${id.toUpperCase()}/+/+/+/+`);
          tTopics = parsed.map((id) => `people_tracking/tracking/${id.toUpperCase()}/`);
        }
      } catch (err) {
        console.warn('Failed to parse accessibleBuildings', err);
      }
    }

    // fallback 
    if (aTopics.length === 0) {
      aTopics = [config.ALARM_TOPIC || 'people_tracking/alarm/+/+/+/+/+'];
    }
    if (tTopics.length === 0) {
      tTopics = ['people_tracking/tracking/#'];
    }

    return { alarmTopics: aTopics, trackingTopics: tTopics };
  }, [config.ALARM_TOPIC]);
  const customizer = useSelector((state: RootState) => state.customizer);
  const settings = useSelector((state: RootState) => state.settings);
  const evacState = useSelector((state: RootState) => state.evacuationReducer.evacState || 'idle');
  const theme = useTheme();
  const memberList: memberType[] = useSelector((s: RootState) => s.memberReducer.members);
  const visitorList: VisitorType[] = useSelector((s: RootState) => s.visitorReducer.visitors);
  const showAlarmPopupId = useSelector((s: RootState) => s.BeaconReducer.alarmPopupId);
  const showAlarmPopup = useSelector(selectAlarmById(showAlarmPopupId));
  const [sessionExpired, setSessionExpired] = useState(false);
  const lastDispatchRef = useRef(0);
  const unsubscriberRef = useRef<(() => void) | null>(null);
  const alarmPopupIdRef = useRef<string | null>(null);
  const alarmPopupRef = useRef<AlarmLogItem | null>(null);
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

  const isHigherPriority = (incoming?: AlarmPriority, current?: AlarmPriority) => {
    if (!incoming) return false;
    if (!current) return true;

    return PRIORITY_WEIGHT[incoming] > PRIORITY_WEIGHT[current];
  };

  useEffect(() => {
    alarmPopupIdRef.current = showAlarmPopupId;
    alarmPopupRef.current = showAlarmPopup ?? null;
  }, [showAlarmPopup]);

  const normalizePriority = (value?: string): AlarmPriority | undefined => {
    if (value === 'low' || value === 'medium' || value === 'high') {
      return value;
    }
    return undefined; // or default to 'low'
  };

  useEffect(() => {
    // Subscribe to counting data when component mounts
    const unsubscribe = dispatch(fetchCountingData());

    // Cleanup subscription when component unmounts
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [dispatch]);

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

    // ✅ MULTI TOPIC LOGIC REMOVED FROM HERE (using component-level topics)

    const applicationId = localStorage.getItem('applicationId') || '';
    const unsubscribeList: (() => void)[] = [];


    trackingTopics.forEach((t) => {
      console.log(`[MQTT] Subscribing to tracking topic "${t}"`);

      const unsub = dispatch(fetchBeacon(t));

      if (typeof unsub === 'function') {
        unsubscribeList.push(unsub);
      } else {
        console.error(`[MQTT] Failed to subscribe to tracking topic "${t}"`);
      }
    });



    if (unsubscribeList.length > 0) {
      unsubscriberRef.current = () => {
        unsubscribeList.forEach((fn) => fn());
      };
      console.log('[MQTT] Successfully subscribed to alarm topics:', alarmTopics);
      console.log('[MQTT] Successfully subscribed to tracking topics:', trackingTopics);
    }

    return () => {
      setSessionExpiredHandler(() => {});

      if (unsubscriberRef.current) {
        unsubscriberRef.current();
        unsubscriberRef.current = null;
        console.log('[MQTT] Unsubscribed from all topics');
      }
    };
  }, [dispatch, memberList, visitorList, alarmTopics, trackingTopics]);

  useEffect(() => {
    const unsubscribe = dispatch(fetchReaderHealth());
    // console.log("ini unsubscribe", unsubscribe)
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [dispatch]);

  return (
    <>
      {/* <AlarmPopup alarm={latestAlarm} open={openAlarmPopup} onClose={() => setOpenAlarmPopup(false)} /> */}
      {/* <SessionExp open={sessionExpired} /> */}
      <LoadingBar />
      <MainWrapper
        className={settings.activeMode === 'dark' ? 'darkbg mainwrapper' : 'mainwrapper'}
      >
        {evacState === 'running' && (
          <Box
            sx={{
              pointerEvents: 'none',
              position: 'fixed',
              zIndex: 9999,
              inset: '-10px',
              background: `
        radial-gradient(
          ellipse farthest-corner at center,
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

        {/* Sidebar Removed */}
        {/* Main Wrapper */}
        <PageWrapper
          className="page-wrapper"
          sx={{
            ...(customizer.isCollapse && {
              [theme.breakpoints.up('lg')]: { ml: `${settings.MiniSidebarWidth}px` },
            }),
          }}
        >
          {/* Header */}
          <MonitoringHeader />
          {/* PageContent */}
          {/* {customizer.isHorizontal ? <Navigation /> : ''} */}
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
                maxWidth: settings.isLayout === 'boxed' ? 'lg' : '100%!important',
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
            {/* <Customizer /> */}
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
