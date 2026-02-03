import {
  Box,
  Typography,
  Divider,
  Stack,
  Avatar,
  useTheme,
  useMediaQuery,
  Button,
  Chip,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { PatrolDetailPayload } from 'src/store/apps/crud/patrolRoute';
import PatrolRouteDetailDialog from '../SecurityViewPatrol/PatrolRouteDetailDialog';
import PatrolScheduleCalendarDialog from '../SecurityViewPatrol/PatrolScheduleCalendarDialog';
import { useNavigate } from 'react-router';
import { useStartPatrol, useStopPatrol, usePatrolSessionList } from 'src/hooks/usePatrolSession';
import { PatrolSessionType } from 'src/store/apps/crud/patrolSession';
import { defaultPatrolSessionFilter } from 'src/store/apps/defaultForm';
interface PatrolDetailPageProps {
  data: PatrolDetailPayload;
}

const PatrolDetailPage = ({ data }: PatrolDetailPageProps) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [openSchedule, setOpenSchedule] = useState(false);
  const [openRoute, setOpenRoute] = useState(false);
  const { patrolAssignment, route } = data;
  const [patrolSession, setPatrolSession] = useState<PatrolSessionType | null>(null);
  const formatDate = (date?: string) => (date ? new Date(date).toLocaleDateString('en-GB') : '-');

  const { data: patrolSessionData, isLoading: isSessionLoading } = usePatrolSessionList({
    ...defaultPatrolSessionFilter,
    filters: { PatrolAssignmentId: patrolAssignment.id },
  });

  const InfoRow = ({ label, value }: { label: string; value: string }) => (
    <Box display="flex" justifyContent="space-between">
      <Typography fontSize={12} color="text.secondary">
        {label}
      </Typography>
      <Typography fontWeight={600}>{value}</Typography>
    </Box>
  );
  const areaCount = route?.patrolAreas?.length ? Math.max(route.patrolAreas.length - 2, 0) : 0;

  /* ===== Timer Function ===== */
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [endedAt, setEndedAt] = useState<Date | null>(null);
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    if (!startedAt || endedAt) return;

    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, [startedAt, endedAt]);
  useEffect(() => {
    if (!patrolSessionData?.data?.length) {
      // No session at all
      setPatrolSession(null);
      setStartedAt(null);
      setEndedAt(null);
      return;
    }

    const latestSession = patrolSessionData.data[0];

    setPatrolSession(latestSession);

    // Parse UTC properly (Z already exists ✔)
    const started = latestSession.startedAt ? new Date(latestSession.startedAt) : null;

    const ended = latestSession.endedAt ? new Date(latestSession.endedAt) : null;

    setStartedAt(started);
    setEndedAt(ended);
  }, [patrolSessionData]);

  const durationMinutes = (() => {
    if (!startedAt) return 0;

    const end = endedAt ?? now;
    const diffMs = end.getTime() - startedAt.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);

    return Math.max(diffMinutes, 0);
  })();

  const StartPatrolMutation = useStartPatrol();
  const StopPatrolMutation = useStopPatrol();

  const handleStart = async () => {
    if (!data) return;
    if (!data.patrolAssignment) return;
    try {
      const res = await StartPatrolMutation.mutateAsync(data.patrolAssignment.id);
      console.log('Start Patrol res', res);
      if (!res?.success || !res?.collection?.data) return;

      const session = res.collection.data;

      setPatrolSession(session);

      // backend is source of truth
      setStartedAt(new Date(session.startedAt));
      setEndedAt(null);
    } catch (error) {
      console.error(error);
    }
  };

  const handleDone = async () => {
    if (!data) return;
    if (!patrolSession?.id) return;

    try {
      const res = await StopPatrolMutation.mutateAsync(patrolSession.id);
      console.log('Stop Patrol res', res);
      if (!res?.success) return;

      const ended = res.collection?.data?.endedAt
        ? new Date(res.collection.data.endedAt)
        : new Date();

      setEndedAt(ended);

      setPatrolSession((prev) => (prev ? { ...prev, endedAt: ended.toISOString() } : prev));
    } catch (error) {
      console.error(error);
    }
  };

  const formatTime24 = (date?: Date | null) =>
    date
      ? date.toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      : '-';

  const formatStopwatch = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (n: number) => String(n).padStart(2, '0');

    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }

    return `${pad(minutes)}:${pad(seconds)}`;
  };

  const formatDurationFinal = (ms: number) => {
    const totalMinutes = Math.floor(ms / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0) {
      return `${hours} h${minutes > 0 ? ` ${minutes} min` : ''}`;
    }

    return `${totalMinutes} min`;
  };

  const durationMs = startedAt ? (endedAt ?? now).getTime() - startedAt.getTime() : 0;

  return (
    <>
      <Box p={isMobile ? 2 : 3}>
        <Box display="flex" flexDirection={isMobile ? 'column' : 'row'} gap={3}>
          {/* ================= LEFT PANEL ================= */}
          <Box
            flexShrink={0}
            width={isMobile ? '100%' : 360}
            borderRadius={2}
            p={2}
            sx={{ backgroundColor: theme.palette.background.paper }}
          >
            {/* Name */}
            <Typography fontWeight={700} fontSize={20}>
              {patrolAssignment.name}
            </Typography>
            {/* Description */}
            <Box mt={1}>
              <Box
                sx={{
                  mt: 1,
                  fontSize: 13,
                  lineHeight: '1.4em',
                  minHeight: '4.2em', // 1.4em * 3 lines
                  maxHeight: '4.2em',
                  overflowY: 'auto',
                  pr: 0.5, // space for scrollbar
                  '&::-webkit-scrollbar': {
                    width: 4,
                  },
                  '&::-webkit-scrollbar-thumb': {
                    backgroundColor: theme.palette.divider,
                    borderRadius: 2,
                  },
                }}
              >
                <Typography fontSize={13}>{patrolAssignment.description || '-'}</Typography>
              </Box>
            </Box>
            <Divider sx={{ my: 2 }} />
            {/* Dates */}
            <Box sx={{ cursor: 'pointer' }} onClick={() => setOpenSchedule(true)}>
              <Stack spacing={1}>
                <InfoRow label="Active From" value={formatDate(patrolAssignment.startDate)} />
                <InfoRow label="Until" value={formatDate(patrolAssignment.endDate)} />
              </Stack>
            </Box>
            <Divider sx={{ my: 2 }} />
            {/* Route */}
            <Box mt={2} sx={{ cursor: 'pointer' }} onClick={() => setOpenRoute(true)}>
              <Typography fontSize={12} color="text.secondary" textAlign="center" mb={0.5}>
                Route
              </Typography>

              <Typography fontWeight={600} textAlign="center" mb={1}>
                {route?.name ?? 'Unknown Route'}
              </Typography>

              <Box display="flex" alignItems="center" gap={1}>
                {/* LEFT */}
                <Box minWidth={80} textAlign="right">
                  <Typography fontSize={13} color="text.secondary">
                    From {route?.startAreaName ?? '-'}
                  </Typography>
                </Box>

                {/* MIDDLE */}
                <Box flex={1} position="relative" height={20}>
                  {/* dashed line */}
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '50%',
                      left: 0,
                      right: 0,
                      borderTop: '1px dashed',
                      borderColor: theme.palette.text.primary,
                      transform: 'translateY(-50%)',
                    }}
                  />

                  {/* centered label */}
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      px: 1,
                      backgroundColor: theme.palette.background.paper,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <Typography fontSize={12} color="text.secondary">
                      {areaCount} Area{areaCount !== 1 ? 's' : ''}
                    </Typography>
                  </Box>
                </Box>

                {/* RIGHT */}
                <Box minWidth={80} textAlign="left">
                  <Typography fontSize={13} color="text.secondary">
                    To {route?.endAreaName ?? '-'}
                  </Typography>
                </Box>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />
            {/* Securities */}
            <Typography fontWeight={600} mb={1}>
              Securities
            </Typography>
            <Stack spacing={1}>
              {patrolAssignment.securities?.map((sec) => (
                <Box
                  key={sec.id}
                  display="flex"
                  alignItems="center"
                  gap={1.5}
                  p={1}
                  borderRadius={1}
                  sx={{ backgroundColor: theme.palette.action.hover }}
                >
                  <Avatar sx={{ width: 32, height: 32 }}>{sec.name.charAt(0)}</Avatar>

                  <Box>
                    <Typography fontWeight={600} fontSize={14}>
                      {sec.name}
                    </Typography>
                    <Typography fontSize={12} color="text.secondary">
                      {sec.identityId}
                    </Typography>
                  </Box>
                </Box>
              ))}

              {!patrolAssignment.securities?.length && (
                <Typography fontSize={12} color="text.secondary">
                  No securities assigned
                </Typography>
              )}
            </Stack>
            <Divider sx={{ my: 2 }} />

            {/* ===== Patrol Status ===== */}
            <Box
              sx={{
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                overflow: 'hidden',
              }}
            >
              <Box display="flex">
                {/* ===== Started Patrol ===== */}
                <Box
                  flex={1}
                  p={1.5}
                  textAlign="center"
                  sx={{ borderRight: 1, borderColor: 'divider' }}
                >
                  <Typography fontSize={12} color="text.secondary">
                    Started Patrol
                  </Typography>
                  <Typography fontWeight={600}>{formatTime24(startedAt)}</Typography>
                </Box>

                {/* ===== Duration ===== */}
                <Box
                  flex={1}
                  p={1.5}
                  textAlign="center"
                  sx={{ borderRight: 1, borderColor: 'divider' }}
                >
                  <Typography fontSize={12} color="text.secondary">
                    Duration
                  </Typography>

                  <Typography fontWeight={600}>
                    {startedAt && !endedAt
                      ? formatStopwatch(durationMs) // ⏱ running
                      : startedAt && endedAt
                        ? formatDurationFinal(durationMs) // ✅ finished
                        : '-'}
                  </Typography>
                </Box>

                {/* ===== Action ===== */}
                <Box flex={1} p={1.5} textAlign="center">
                  {isSessionLoading && (
                    <Typography fontSize={12} color="text.secondary">
                      Loading…
                    </Typography>
                  )}

                  {!isSessionLoading && !startedAt && (
                    <Button size="small" variant="contained" onClick={handleStart}>
                      Start
                    </Button>
                  )}

                  {!isSessionLoading && startedAt && !endedAt && (
                    <Button size="small" variant="contained" color="warning" onClick={handleDone}>
                      Done
                    </Button>
                  )}

                  {!isSessionLoading && startedAt && endedAt && (
                    <Stack spacing={0.5} alignItems="center">
                      <Chip label="Done" color="success" size="small" />
                      <Typography fontWeight={600}>{formatTime24(endedAt)}</Typography>
                    </Stack>
                  )}
                </Box>
              </Box>
            </Box>
          </Box>

          {/* ================= RIGHT PANEL ================= */}
          {/* {!isMobile && ( */}
          <Box
            flex={1}
            borderRadius={2}
            p={3}
            sx={{ backgroundColor: theme.palette.background.paper }}
          >
            <Typography color="text.secondary">List Cases (coming soon)</Typography>
          </Box>
          {/* )} */}
        </Box>
      </Box>
      {/* ================= SCHEDULE DIALOG ================= */}
      <PatrolScheduleCalendarDialog
        open={openSchedule}
        onClose={() => setOpenSchedule(false)}
        startDate={patrolAssignment.startDate}
        endDate={patrolAssignment.endDate}
        timeGroups={data.timeGroups}
      />

      {/* ================= ROUTE DIALOG ================= */}
      <PatrolRouteDetailDialog open={openRoute} route={route} onClose={() => setOpenRoute(false)} />
    </>
  );
};

export default PatrolDetailPage;
