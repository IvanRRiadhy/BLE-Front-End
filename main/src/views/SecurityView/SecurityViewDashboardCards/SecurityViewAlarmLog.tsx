import React, { useMemo, useEffect, useRef } from 'react';
import { Box, Typography, Avatar, Stack } from '@mui/material';
import { useRealtimeAlarmLog } from 'src/hooks/useDashboard';
import { BASE_URL } from 'src/utils/axios';
import SmartScrollingText from 'src/utils/SmartScrollingText';
import { toast } from 'react-hot-toast';

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

const SecurityViewAlarmLog: React.FC = () => {
  const prevDataRef = useRef<any[]>([]);

  const { data = [], isLoading, isError } = useRealtimeAlarmLog(defaultFilter);

  useEffect(() => {
    if (!data || data.length === 0) return;

    const prevData = prevDataRef.current;

    // First load → just store, no toast
    if (prevData.length === 0) {
      prevDataRef.current = data;
      return;
    }

    // 🔥 Detect NEW items
    const prevIds = new Set(prevData.map((x) => x.id));
    const newItems = data.filter((x: any) => !prevIds.has(x.id));

    if (newItems.length > 0) {
      // 🔥 Show toast
      toast(`${newItems.length} new alarm(s) detected!`, {
        duration: 4000,
        style: {
          borderRadius: '10px',
          background: '#f44336',
          color: '#fff',
        }
      });
      newItems.forEach((x: any) => {
        toast(`New Alarm: ${x.memberName || x.visitorName || x.securityName}`, {
          duration: 4000,
          style: {
            borderRadius: '10px',
            background: '#f44336',
            color: '#fff',
          },
        });
      });
      console.log('New alarms:', newItems);
    }

    // Update ref
    prevDataRef.current = data;
  }, [data]);

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
    const filtered = data.filter((x: any) => x.action === 'Dispatched');

    return filtered.map((x: any) => {
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
  return (
    <Box
      sx={{
        width: '100%',
        height: '40vh',
        backgroundColor: 'white',
        borderRadius: '25px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
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
            fontSize: { xs: 20, md: 24 },
            fontWeight: 700,
            color: '#045498',
          }}
        >
          Alarm to Investigate
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
        {log.length > 0 ? (
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
                {/* <Typography
                sx={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: '#045498',
                }}
              >
                {item.name}
              </Typography> */}
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
        ) : (
          <Box
            sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}
          >
            <Typography sx={{ color: '#045498', fontSize: 16 }}>
              No Investigation Assigned yet
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default SecurityViewAlarmLog;
