import React, { useMemo } from 'react';
import { Box, Typography, Avatar, Stack } from '@mui/material';
import { useRealtimeAlarmLog } from 'src/hooks/useDashboard';
import { BASE_URL } from 'src/utils/axios';

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
}

const statusColorMap: Record<string, string> = {
  wrongzone: '#00ce00',
  geofence: '#d73d3d',
};

const AlarmLog: React.FC = () => {
  const { data = [], isLoading, isError } = useRealtimeAlarmLog(defaultFilter);
  function resolvePerson(x: any) {
    console.log("Resolving Person:", x);
    if (x.visitorId) {
      console.log("Is Visitor", x.visitor)
      return {
        type: 'Visitor',
        name: x.visitorName,
        image: x.visitorFaceImage,
      };
    }

    if (x.memberId) {
      console.log("Is Visitor", x.member)
      return {
        type: 'Member',
        name: x.memberName,
        image: x.memberFaceImage,
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
      };
    });
  }, [data]);
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
        {log.map((item, index) => (
          <Stack
            key={index}
            direction="row"
            spacing={2}
            alignItems="center"
            sx={{ 
              p: 1, 
              backgroundColor: index % 2 !== 0 ? 'grey.50' : 'white',
              borderBottom: '1px solid #e0e0e0', 
            }}
          >
            {/* Avatar */}
            <Avatar src={item.image} alt="user" sx={{ width: 56, height: 56 }} />

            {/* Left info */}
            <Box sx={{ flex: 1 }}>
              <Typography
                sx={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: '#045498',
                }}
              >
                {item.name}
              </Typography>
              <Typography
                sx={{
                  fontSize: 12,
                  color: '#045498',
                }}
              >
                {item.firstGateway}
              </Typography>
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
                {item.triggerTime}
              </Typography>
            </Box>
          </Stack>
        ))}
      </Box>
    </Box>
  );
};

export default AlarmLog;
