import { FC, useEffect, useState, useRef } from 'react';
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
import SessionExp from './shared/SessionExp';
import { hydrateEvacState } from 'src/store/customizer/CustomizerSlice';
import { Toaster } from 'react-hot-toast';
import { startMQTTclient } from 'src/store/apps/tracking/MQTT'; // Changed from NTFY to MQTT
import { fetchAlarmTrigger } from 'src/store/apps/crud/alarmTrigger';
import { memberType } from 'src/store/apps/crud/member';
import { VisitorType } from 'src/store/apps/crud/visitor';
import { showAlarmPopup } from 'src/store/apps/monitoring/AlarmUI';
import { pushItem, openPanel } from 'src/store/apps/monitoring/NotifySlice';
import { fetchAlarmSettingsDT } from 'src/store/apps/alarmsetting/alarmSettings';
import { defaultAlarmSettingFilter } from 'src/store/apps/defaultForm';
import { AlarmType } from 'src/store/apps/tracking/Alarm';
import AlarmPopup from './AlarmPopup';
import { getConfig } from 'src/config';
import Customizer from './shared/customizer/Customizer';
import {
  AlarmLogItem,
  AlarmPriority,
  AppendAlarmLogs,
  AppendTrackingLogs,
  fetchCountingData,
  NotifyAlarmPopup,
  selectAlarmById,
  ShowAlarmPopup,
  TrackingLogItem,
} from 'src/store/apps/tracking/Beacon';
import { fetchEventLogs } from 'src/store/apps/tracking/Event';

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

const PRIORITY_WEIGHT: Record<AlarmPriority, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

const FullLayout: FC = () => {
  const lgDown = useMediaQuery((theme: any) => theme.breakpoints.down('lg'));
  const dispatch: AppDispatch = useDispatch();
  const config = getConfig();
  const topic = config.ALARM_TOPIC || 'tracking/engine/alarm'; // Use MQTT topic from config
  const customizer = useSelector((state: RootState) => state.customizer);
  const evacState = useSelector((state: RootState) => state.customizer.evacState);
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
    dispatch(fetchAlarmSettingsDT(defaultAlarmSettingFilter));
    // dispatch(fetchEventLogs());
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

    // MQTT subscription for alarms
    console.log(`[MQTT] Subscribing to alarm topic "${topic}"`);
    const unsubscribe = startMQTTclient(
      (data: any) => {
        // ⭐ Same callback logic, but now receiving data from MQTT
        const now = Date.now();
        const alarmData = Array.isArray(data) ? data[0] : data;

        // console.log('[MQTT] Received alarm data:', alarmData);

        setLatestAlarm(alarmData);
        setOpenAlarmPopup(true);
        // dispatch(showAlarmPopup(alarmData));
        window.postMessage({ type: 'app:new-alarm', detail: { alarm: alarmData } }, '*');
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

        if (
          'Notification' in window &&
          Notification.permission === 'granted' &&
          !document.hasFocus()
        ) {
          const title = 'Alarm Triggered!';
          const body = `Beacon ${getName(alarmData.beaconId || 'Unknown')} is in ${
            alarmData.maskedAreaName || 'Unknown Area'
          } on ${alarmData.floorplanName || 'Unknown Floor'}.`;

          const notification = new Notification(title, { body, icon: '/icon.png' });
          notification.onclick = () => {
            window.focus();
            notification.close();
          };
        }

        if (now - lastDispatchRef.current > 1500) {
          lastDispatchRef.current = now;
          dispatch(fetchAlarmTrigger());
        }
        const alarmLog: AlarmLogItem = {
          id: `alarm-${alarmData.triggerId}-${Date.now()}-${alarmData.status}`, // ✅ stable & unique
          // device: 'Alarm',
          type: 'Alarm',

          target: alarmData.visitorName || alarmData.cardName || alarmData.dmac,
          image: alarmData.faceImage || '',
          color: alarmData.color || 'gray',
          dmac: alarmData.dmac,
          floor: alarmData.floorplanName || 'Unknown Floor',
          floorplanId: alarmData.floorplanId,
          area: alarmData.maskedAreaName || 'Unknown Area',
          personId: alarmData.personId || '',
          triggerId: alarmData.triggerId,
          alarmStatus: alarmData.status, // e.g. blacklist / restricted
          action: alarmData.action, // idle / dispatched / etc
          priority: alarmData.priority,
          time: new Date().toISOString(),
          seen: false,
          personType: alarmData.visitorName ? 'Visitor' : 'Member',
        };
        const incomingAlarm: AlarmLogItem = alarmLog; // your mapped object

        const currentAlarm = alarmPopupRef.current;

        const shouldShowPopup =
          !currentAlarm || isHigherPriority(incomingAlarm.priority, currentAlarm.priority);
        // console.log('ShouldShowPopup', shouldShowPopup);
        // console.log('Incoming Alarm', incomingAlarm, 'Current Alarm', currentAlarm, "AlarmData", alarmData);
        if (shouldShowPopup) {
          dispatch(ShowAlarmPopup(incomingAlarm));
          dispatch(NotifyAlarmPopup(incomingAlarm.id));

          // Update refs immediately to prevent race
          alarmPopupRef.current = incomingAlarm;
          alarmPopupIdRef.current = incomingAlarm.id;
        }
        dispatch(AppendAlarmLogs([alarmLog]));
      },
      topic, // MQTT topic
    );

    if (!unsubscribe) {
      console.error(`[MQTT] Failed to subscribe to alarm topic "${topic}"`);
    } else {
      unsubscriberRef.current = unsubscribe;
      console.log(`[MQTT] Successfully subscribed to topic "${topic}"`);
    }

    return () => {
      setSessionExpiredHandler(() => {});
      if (unsubscriberRef.current) {
        unsubscriberRef.current();
        unsubscriberRef.current = null;
        console.log(`[MQTT] Unsubscribed from topic "${topic}"`);
      }
    };
  }, [dispatch, memberList, visitorList, topic]);

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
        {customizer.isHorizontal ? lgDown ? <Sidebar /> : '' : <Sidebar />}
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
