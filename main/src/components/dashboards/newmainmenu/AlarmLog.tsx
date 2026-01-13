import React, { useMemo } from 'react';
import { Box, Typography, Avatar, Stack } from '@mui/material';
import { useRealtimeAlarmLog } from 'src/hooks/useDashboard';

const defaultFilter = {
  draw: 1,
  start: 0,
  length: 0,
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
    if (x.visitor) {
      return {
        type: 'Visitor',
        name: x.visitor.name,
        image: x.visitor.faceImage,
      };
    }

    if (x.member) {
      return {
        type: 'Member',
        name: x.member.name,
        image: x.member.faceImage,
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
        image: person.image ? `${import.meta.env.VITE_API_BASE_URL}${person.image}` : '',
        name: person.name,
        idleTime: x.idleTimestamp ? new Date(x.idleTimestamp).toLocaleString() : '-',
        triggerTime: x.triggerTime ? new Date(x.triggerTime).toLocaleString() : '-',
        firstGateway: x.firstGatewayId ?? '-',
        secondGateway: x.secondGatewayId ?? '-',
        status: x.alarmRecordStatus ?? 'Unknown',
        color: x.alarmColor ?? '#000',
      };
    });
  }, [data]);
  return (
    <Box
      sx={{
        width: '100%',
        height: '26.5vh',
        borderRadius: '25px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
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
          <Stack key={index} direction="row" spacing={2} alignItems="center" sx={{ pb: 2 }}>
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
