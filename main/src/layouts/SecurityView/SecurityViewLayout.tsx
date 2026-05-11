import { FC, useEffect, useState } from 'react';
import { styled, Container, Box, useTheme } from '@mui/material';
import { useSelector, useDispatch } from 'src/store/Store';
import { Outlet } from 'react-router';
import { RootState } from 'src/store/Store';
import Sidebar from './SidebarSecurity/Sidebar';
import Navigation from 'src/layouts/full/horizontal/navbar/Navigation';
import HorizontalHeader from 'src/layouts/full/horizontal/header/Header';
import ScrollToTop from '../../components/shared/ScrollToTop';
import LoadingBar from '../../LoadingBar';
import { BASE_URL, setSessionExpiredHandler } from 'src/utils/axios';
import SessionExp from 'src/layouts/full/shared/SessionExp';
import Header from './HeaderSecurity/Header';
import { Toaster } from 'react-hot-toast';
import { publishMQTT, startMQTTclient } from 'src/store/apps/tracking/MQTT';
import { useAlarmTriggerList } from 'src/hooks/useAlarmTrigger';
import { defaultAlarmTriggerFilter } from 'src/store/apps/defaultForm';
import { SecurityAlarmLogItem } from 'src/components/security-view/AlarmInvestigate/AlarmInvestigation';
import { SetFocusAlarm, SetFocusPosition } from 'src/store/apps/tracking/Beacon';

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
  backgroundColor: '#f5f5f5',
}));

const SecurityViewLayout: FC = () => {
  const dispatch = useDispatch();
  const customizer = useSelector((state: RootState) => state.customizer);
  const settings = useSelector((state: RootState) => state.settings);
  const evacState = useSelector((state: RootState) => state.evacuationReducer.evacState);
  const focusAlarm = useSelector((state: RootState) => state.BeaconReducer.focusAlarm);
  const theme = useTheme();
  function resolvePerson(x: any) {
    // console.log("Resolving Person:", x);
    if (x.visitorId) {
      // console.log("Is Visitor", x.visitor)
      return {
        type: 'Visitor',
        name: x.visitorName,
        image: x.visitorFaceImage,
      };
    }

    if (x.memberId) {
      // console.log("Is Visitor", x.member)
      return {
        type: 'Member',
        name: x.memberName,
        image: x.memberFaceImage,
      };
    }
    if (x.securityId) {
      return {
        type: 'Security',
        name: x.securityName,
        image: x.securityFaceImage,
      };
    }

    return {
      type: 'Unknown',
      name: '-',
      image: '',
    };
  }
  function formatTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleString('en-GB', { hour12: false });
  }
  const { data: data } = useAlarmTriggerList({
    ...defaultAlarmTriggerFilter,
    Length: 1,
    filters: { action: ['Accepted'] },
  });
  const acceptedAlarm = data?.data?.[0] ?? null;
  const [sessionExpired, setSessionExpired] = useState(false);
  useEffect(() => {
    setSessionExpiredHandler(() => setSessionExpired(true));
    return () => setSessionExpiredHandler(() => {});
  }, []);

  useEffect(() => {
    if (acceptedAlarm && acceptedAlarm !== null) {
      if (!acceptedAlarm.id) return;
      const person = resolvePerson(acceptedAlarm);
      const alarm: SecurityAlarmLogItem = {
        id: acceptedAlarm.id,
        image: person.image ? `${BASE_URL}${person.image}` : '',
        name: person.name,
        beacon: acceptedAlarm.beaconId ?? '-',
        idleTime: acceptedAlarm.idleTimestamp ? formatTime(acceptedAlarm.idleTimestamp) : '-',
        triggerTime: acceptedAlarm.triggerTime ? formatTime(acceptedAlarm.triggerTime) : '-',
        firstGateway: acceptedAlarm.firstGatewayId ?? '-',
        secondGateway: acceptedAlarm.secondGatewayId ?? '-',
        action: acceptedAlarm.action ?? 'Unknown',
        status: acceptedAlarm.alarm ?? 'Unknown',
        color: acceptedAlarm.alarmColor ?? '#000',
        buildingName: acceptedAlarm.buildingName ?? '-',
        floorName: acceptedAlarm.floorName ?? '-',
        floorplanName: acceptedAlarm.floorplanName ?? '-',
        lastSeenTime: acceptedAlarm.lastSeenAt
          ? new Date(acceptedAlarm.lastSeenAt).toLocaleString()
          : '-',
      };
      dispatch(SetFocusAlarm(alarm));
    }
  }, [acceptedAlarm]);

  useEffect(() => {
    console.log("Focus Alarm", focusAlarm)
    if (focusAlarm === null || focusAlarm === undefined) return;
    
    if (!focusAlarm.beacon) return;
    const startTopic = `highlight/card/${focusAlarm.beacon}`;
    const payload = 'Start';

    publishMQTT(startTopic, payload);
    console.log(`[MQTT] Published Start message to ${startTopic}`);

    const topic = `people_tracking/highlight/positions/${focusAlarm.beacon}`;
    console.log(`[MQTT] Subscribing to focus alarm topic: ${topic}`);

    const unsubscribe = startMQTTclient((msg: any) => {
      if (!msg) return;
      if (!msg?.floorplanId || !msg?.beaconId) return;
      const payloadId = msg.beaconId;
      // console.log(`[MQTT] Received message on focus alarm topic: ${topic} with payload:`, msg);

      if (payloadId !== focusAlarm.beacon) return;
      dispatch(
        SetFocusPosition({
          floorplanName: msg.floorplanName,
          areaName: msg.maskedAreaName || '',
          time: msg.time ? formatTime(msg.time) : '',
        }),
      );
    }, topic);

    return () => {
      console.log(`[MQTT] Unsubscribing from focus alarm topic: ${topic}`);
      unsubscribe();
    };
  }, [focusAlarm]);

  return (
    <>
      <SessionExp open={sessionExpired} />
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
        {/* ------------------------------------------- */}
        {/* Sidebar */}
        {/* ------------------------------------------- */}
        <Sidebar />

        {/* ------------------------------------------- */}
        {/* Main Wrapper */}
        {/* ------------------------------------------- */}
        <PageWrapper
          className="page-wrapper"
          sx={{
            ...(customizer.isCollapse && {
              [theme.breakpoints.up('lg')]: { ml: `${settings.MiniSidebarWidth}px` },
            }),
          }}
        >
          {/* ------------------------------------------- */}
          {/* Header */}
          {/* ------------------------------------------- */}
          <Header />

          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
            }}
          >
            <Container
              sx={{
                pt: '5px',
                maxWidth: settings.isLayout === 'boxed' ? 'lg' : '100%!important',
                flexGrow: 1, // Allow content to take remaining space
              }}
            >
              {/* ------------------------------------------- */}
              {/* PageContent */}
              {/* ------------------------------------------- */}
              <Box sx={{ minHeight: 'calc(100vh - 160px)' }}>
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
          padding: '12px 16px',
          minWidth: '300px',
          // maxWidth: '90vw', // 🔑 responsive
          // width: 'fit-content',
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

export default SecurityViewLayout;
