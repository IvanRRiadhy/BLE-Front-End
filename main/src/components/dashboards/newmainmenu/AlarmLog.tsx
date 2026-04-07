import React, { useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Avatar,
  Stack,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import { useRealtimeAlarmLog } from 'src/hooks/useDashboard';
import { BASE_URL } from 'src/utils/axios';
import SmartScrollingText from 'src/utils/SmartScrollingText';
import { AlarmTriggerType } from 'src/store/apps/crud/alarmTrigger';

const defaultFilter = {
  draw: 1,
  start: 0,
  length: 999,
  sortColumn: '',
  sortDir: 'desc',
  searchValue: '',
};
export interface AlarmLogItem {
  image: string;
  name: string;
  idleTime: string;
  triggerTime: string;
  firstGateway: string;
  secondGateway: string;
  status: string;
  color: string;
  buildingName: string;
  floorName: string;
  floorplanName: string;
  lastSeenTime: string;
}

const statusColorMap: Record<string, string> = {
  wrongzone: '#00ce00',
  geofence: '#d73d3d',
};

const AlarmLog: React.FC = () => {
  const { data = [], isLoading, isError } = useRealtimeAlarmLog(defaultFilter);

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
  const log = useMemo<AlarmLogItem[]>(() => {
    return data.map((x: any) => {
      const person = resolvePerson(x);

      return {
        image: person.image ? `${BASE_URL}${person.image}` : '',
        name: person.name,
        idleTime: x.idleTimestamp ? new Date(x.idleTimestamp).toLocaleString() : '-',
        triggerTime: x.triggerTime ? new Date(x.triggerTime).toLocaleString() : '-',
        firstGateway: x.firstGatewayId ?? '-',
        secondGateway: x.secondGatewayId ?? '-',
        status: x.alarm ?? 'Unknown',
        color: x.alarmColor ?? '#000',
        buildingName: x.buildingName ?? '-',
        floorName: x.floorName ?? '-',
        floorplanName: x.floorplanName ?? '-',
        lastSeenTime: x.lastSeenAt ? new Date(x.lastSeenAt).toLocaleString() : '-',
      };
    });
  }, [data]);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedTrigger, setSelectedTrigger] = useState<AlarmTriggerType | null>(null);

  const redirectToAlarmList = (trigger: AlarmTriggerType) => {
    const params = new URLSearchParams();

    if (trigger.visitorId) {
      params.set('visitorId', trigger.visitorId);
    }

    if (trigger.memberId) {
      params.set('memberId', trigger.memberId);
    }

    params.set('alarmTriggerId', trigger.id);
    console.log('Redirecting to alarm list with params:', params.toString());
    window.location.href = `/alarm/alarmlist?${params.toString()}`;
  };

  return (
    <Box
      sx={{
        width: '100%',
        height: '32vh',
        borderRadius: '25px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
        backgroundColor: 'white',
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
        <Typography
          sx={{
            fontSize: 24,
            fontWeight: 700,
            color: '#045498',
          }}
        >
          Real-Time Alarm Log
        </Typography>
      </Box>

      {/* Scrollable list */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          px: 1.5,
          py: 1,
        }}
      >
        {log.length === 0 ? (
          <Box
            sx={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              color: '#9e9e9e',
              px: 2,
            }}
          >
            <Typography
              sx={{
                fontSize: 16,
                fontWeight: 500,
              }}
            >
              There are no alarms yet
            </Typography>
          </Box>
        ) : (
          log.map((item, index) => (
            <Stack
              key={index}
              direction="row"
              spacing={2}
              alignItems="center"
              sx={{
                p: 1,
                backgroundColor: index % 2 !== 0 ? 'grey.50' : 'white',
                borderBottom: '1px solid #e0e0e0',
                width: '100%',
                overflow: 'hidden',
              }}
              onClick={() => {
                const trigger = data[index];
                setSelectedTrigger(trigger);
                setConfirmOpen(true);
              }}
            >
              {/* Avatar */}
              <Avatar src={item.image} alt="user" sx={{ width: 56, height: 56 }} />

              {/* Left info */}
              <Box
                sx={{
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <SmartScrollingText
                  text={item.name}
                  sx={{
                    fontSize: 16,
                    fontWeight: 600,
                    color: '#045498',
                  }}
                />
                <SmartScrollingText
                  text={`${item.buildingName} | ${item.floorName}`}
                  sx={{
                    fontSize: 12,
                    color: '#045498',
                  }}
                />
                <Typography
                  sx={{
                    fontSize: 12,
                    color: '#045498',
                  }}
                >
                  {item.idleTime}
                </Typography>
              </Box>

              {/* Right info */}
              <Box
                sx={{
                  flex: 1,
                  minWidth: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                }}
              >
                <Typography
                  sx={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: item.color,
                  }}
                >
                  {item.status}
                </Typography>
                <Typography
                  sx={{
                    fontSize: 12,
                    color: '#045498',
                  }}
                >
                  {item.secondGateway}
                </Typography>
                <Typography
                  sx={{
                    fontSize: 12,
                    color: '#045498',
                  }}
                >
                  {item.lastSeenTime}
                </Typography>
              </Box>
            </Stack>
          ))
        )}
      </Box>
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={700}>Open Alarm Detail?</DialogTitle>

        <DialogContent>
          <Typography variant="body2">
            You are about to navigate to the Alarm Detail page. Do you want to continue?
          </Typography>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} color="inherit">
            Cancel
          </Button>

          <Button
            variant="contained"
            color="error"
            onClick={() => {
              if (selectedTrigger) {
                redirectToAlarmList(selectedTrigger);
              }
              setConfirmOpen(false);
            }}
          >
            Go to Detail
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AlarmLog;
