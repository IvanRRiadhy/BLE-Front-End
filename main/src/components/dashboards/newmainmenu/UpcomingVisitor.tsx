import { useEffect, useMemo, useState } from 'react';
import { Box, Typography, Avatar, Stack } from '@mui/material';
import { useUpcomingVisitor } from 'src/hooks/useDashboard';
// import { getUpcomingVisitor } from "../services/apiService";
// import dumpy from "../assets/ambatukam.jpeg";

const defaultFilter = {
  draw: 1,
  start: 0,
  length: 0,
  sortColumn: '',
  sortDir: 'desc',
  searchValue: '',
  timeRange: 'daily',
};

interface UpcomingVisitorItem {
  id: string;
  status: string;
  name: string;
  checkInAt?: string | null;
  checkOutAt?: string | null;
}

const statusColorMap: Record<string, string> = {
  denied: '#d73d3d',
  checkout: '#00ce00',
};

const UpcomingVisitor: React.FC = () => {
  const { data = [], isLoading, isError } = useUpcomingVisitor(defaultFilter);
  const upcomingVisitor = useMemo<UpcomingVisitorItem[]>(() => {
    return data.map((x: any) => ({
      id: x.id,
      status: x.status,
      name: x.visitor?.name ?? x.member?.name ?? x.visitorCode ? `${x.visitorCode} (Visit Code)` : '-',
      checkInAt: x.checkedInAt,
      checkOutAt: x.checkedOutAt,
    }));
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
          Upcoming Visitor
        </Typography>
      </Box>

      {/* List */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          px: 1.5,
          py: 1,
        }}
      >
        {upcomingVisitor.map((item) => (
          <Stack key={item.id} direction="row" spacing={2} alignItems="center" sx={{ pb: 2 }}>
            {/* Avatar */}
            <Avatar src={'/dummy-avatar.jpg'} alt="visitor" sx={{ width: 56, height: 56 }} />

            {/* Visitor info */}
            <Box sx={{ flex: 1 }}>
              <Typography
                sx={{
                  fontSize: 18,
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
                {item.checkInAt ? new Date(item.checkInAt).toLocaleString() : '-'}
              </Typography>
            </Box>

            {/* Status */}
            <Typography
              sx={{
                fontSize: 18,
                fontWeight: 700,
                color: statusColorMap[item.status.toLowerCase()] ?? '#000',
              }}
            >
              {item.status}
            </Typography>
          </Stack>
        ))}
      </Box>
    </Box>
  );
};

export default UpcomingVisitor;
