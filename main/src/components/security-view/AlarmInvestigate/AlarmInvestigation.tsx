import React, { useMemo } from 'react';
import {
  Avatar,
  Box,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { AppDispatch, RootState, useDispatch, useSelector } from 'src/store/Store';
import { useNavigate } from 'react-router';
import { BASE_URL } from 'src/utils/axios';
import { useRealtimeAlarmLog } from 'src/hooks/useDashboard';
import SmartScrollingText from 'src/utils/SmartScrollingText';
import { useAcceptInvestigate, useAlarmTriggerList } from 'src/hooks/useAlarmTrigger';
import { id } from 'date-fns/locale';
import { defaultAlarmTriggerFilter } from 'src/store/apps/defaultForm';
import { AlarmTriggerType } from 'src/store/apps/crud/alarmTrigger';
import toast from 'react-hot-toast';
import AlarmList from './AlarmList';
import AcceptedAlarm from './AcceptedAlarm';
import { SetFocusAlarm } from 'src/store/apps/tracking/Beacon';

const defaultFilter = {
  Draw: 1,
  Start: 0,
  length: 999,
  sortColumn: '',
  sortDir: 'desc',
  searchValue: '',
};
export interface SecurityAlarmLogItem {
  id: string;
  image: string;
  name: string;
  beacon: string;
  idleTime: string;
  triggerTime: string;
  firstGateway: string;
  secondGateway: string;
  action: string;
  status: string;
  color: string;
  buildingName: string;
  floorName: string;
  floorplanName: string;
  lastSeenTime: string;
}

const AlarmInvestigation = () => {
  const dispatch: AppDispatch = useDispatch();
  const {
    data: data,
    isLoading,
    isError,
  } = useAlarmTriggerList({ ...defaultAlarmTriggerFilter, Length: 999 });
  const alarmTriggerData = data?.data ?? [];
const settings = useSelector((state: RootState) => state.settings);
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
  const log = useMemo<SecurityAlarmLogItem[]>(() => {
    if (!alarmTriggerData.length) return [];

    const hasAccepted = alarmTriggerData.some((x: any) => x.action === 'Accepted');

    const filtered = hasAccepted
      ? alarmTriggerData.filter((x: any) => x.action === 'Accepted')
      : alarmTriggerData.filter((x: any) => x.action === 'Dispatched');

    return filtered.map((x: any) => {
      const person = resolvePerson(x);

      return {
        id: x.id,
        image: person.image ? `${BASE_URL}${person.image}` : '',
        name: person.name,
        beacon: x.beaconId ?? '-',
        idleTime: x.idleTimestamp ? new Date(x.idleTimestamp).toLocaleString() : '-',
        triggerTime: x.triggerTime ? new Date(x.triggerTime).toLocaleString() : '-',
        firstGateway: x.firstGatewayId ?? '-',
        secondGateway: x.secondGatewayId ?? '-',
        action: x.action ?? 'Unknown',
        status: x.alarm ?? 'Unknown',
        color: x.alarmColor ?? '#000',
        buildingName: x.buildingName ?? '-',
        floorName: x.floorName ?? '-',
        floorplanName: x.floorplanName ?? '-',
        lastSeenTime: x.lastSeenAt ? new Date(x.lastSeenAt).toLocaleString() : '-',
      };
    });
  }, [alarmTriggerData]);

  const acceptedAlarms = useMemo(() => {
    return log.filter((x: any) => x.action === 'Accepted');
  }, [alarmTriggerData]);

  const [selectedAlarm, setSelectedAlarm] = useState<SecurityAlarmLogItem | null>(null);

  const hasAccepted = acceptedAlarms.length > 0;

  const AcceptMutation = useAcceptInvestigate();

  const handleAccept = async (alarm: SecurityAlarmLogItem) => {
    console.log('Accepting investigation for ID:', alarm);
    if (AcceptMutation.isPending) return;
    if (alarm.action === 'Accepted') {
      toast.error('This investigation has already been accepted by someone else.');
      console.log('Already accepted, no action taken.');
      return;
    }
    try {
      await AcceptMutation.mutateAsync(alarm.id);
      toast.success('Investigation accepted successfully!');
      setSelectedAlarm((prev) => (prev ? { ...prev, action: 'Accepted' } : prev));
      dispatch(SetFocusAlarm(alarm));
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to accept investigation');
    }
    // const res = await AcceptMutation.mutate(alarm.id);
    // console.log('Accept response:', res);
  };
const listHeight = `calc(100% - ${settings.TopbarHeight}px)`;
  return (
    <Box
      sx={{
        width: '100%',
        height: listHeight,
        backgroundColor: 'background.default',
        borderRadius: '25px',
        boxShadow: (theme) => theme.shadows[10],
        px: 2,
        py: 2,
        display: 'flex',
        flexDirection: 'column',
        overflowX: 'hidden',
      }}
    >
      {/* Title */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          pb: 2,
        }}
      >
        {hasAccepted ? (
          <Typography
            sx={{
              fontSize: 20,
              fontWeight: 700,
              color: 'error.main',
              mt: 2,
            }}
          >
            Investigation In Progress
          </Typography>
        ) : (
          <Typography
            sx={{
              fontSize: { xs: 20, md: 24 },
              fontWeight: 700,
              color: 'primary.main',
            }}
          >
            Alarm to Investigate
          </Typography>
        )}
      </Box>

      {/* Scrollable list */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          px: 1.5,
          // py: 1,
        }}
      >
        {hasAccepted || selectedAlarm ? (
          <AcceptedAlarm
            alarm={selectedAlarm || acceptedAlarms[0]}
            onBack={() => setSelectedAlarm(null)}
            onAccept={handleAccept}
          />
        ) : log.length > 0 ? (
          <AlarmList data={log} onAccept={(alarm) => setSelectedAlarm(alarm)} />
        ) : (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '50%',
            }}
          >
            <Typography sx={{ color: 'primary.main', fontSize: 16 }}>
              No Investigation Assigned yet
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default AlarmInvestigation;
