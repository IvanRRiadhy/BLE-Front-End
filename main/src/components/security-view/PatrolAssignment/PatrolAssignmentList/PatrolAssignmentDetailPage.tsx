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
  CircularProgress,
  Tabs,
  Tab,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useEffect, useState } from 'react';
import { PatrolDetailPayload, SecurityType } from 'src/store/apps/crud/patrolRoute';
import PatrolRouteDetailDialog from '../SecurityViewPatrol/PatrolRouteDetailDialog';
import PatrolScheduleCalendarDialog from '../SecurityViewPatrol/PatrolScheduleCalendarDialog';
import { useNavigate } from 'react-router';
import { useStartPatrol, useStopPatrol, usePatrolSessionList } from 'src/hooks/usePatrolSession';
import { PatrolSessionType } from 'src/store/apps/crud/patrolSession';
import {
  defaultPatrolCaseFilter,
  defaultPatrolCaseUploadForm,
  defaultPatrolSessionFilter,
  defaultTimeGroupFilter,
} from 'src/store/apps/defaultForm';
import { useAllPatrolCase, usePatrolCaseList } from 'src/hooks/usePatrolCase';
import PatrolCaseDialog from './PatrolCaseDialog';
import { CaseUploadType } from 'src/store/apps/crud/patrolCase';
import PatrolCaseListItem from './PatrolCaseListItem';
import toast from 'react-hot-toast';
import { use } from 'i18next';
import { RootState, useSelector } from 'src/store/Store';
import { useSearchParams } from 'react-router';
import { usePatrolAssignmentId, usePatrolRouteId } from 'src/hooks/usePatrolRoute';
import { useTimeGroupList } from 'src/hooks/useTimeGroup';

const PatrolDetailPage = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const customizer = useSelector((state: RootState) => state.customizer);
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [searchParams] = useSearchParams();
  const id = searchParams.get('id') ?? undefined;
  console.log('id', id);
  const { data: patrolRes } = usePatrolAssignmentId(id ?? '');

  const patrol = patrolRes?.collection?.data;
  const { data: route } = usePatrolRouteId(patrol?.patrolRouteId ?? '');  

  const { data: timeGroupRes } = useTimeGroupList({
    ...defaultTimeGroupFilter,
    filters: { id: patrol?.timeGroupId ? [patrol.timeGroupId] : [] },
  });

  const timeGroups = timeGroupRes?.data ?? [];

  const [openSchedule, setOpenSchedule] = useState(false);
  const [openRoute, setOpenRoute] = useState(false);
  const [detailTab, setDetailTab] = useState(0);

  const [patrolSession, setPatrolSession] = useState<PatrolSessionType | null>(null);
  const [openCaseDialog, setOpenCaseDialog] = useState(false);
  const [caseDialogType, setCaseDialogType] = useState<'add' | 'edit'>('add');
  const [selectedCase, setSelectedCase] = useState<CaseUploadType | undefined>(undefined);
  const [editId, setEditId] = useState<string | undefined>(undefined);
  const [patrolSessionId, setPatrolSessionId] = useState<string | undefined>(undefined);
  const checkpoints = patrolSession?.checkpoints ?? [];

  const formatDate = (date?: string) => (date ? new Date(date).toLocaleDateString('en-GB') : '-');

  const { data: patrolSessionData, isLoading: isSessionLoading } = usePatrolSessionList({
    ...defaultPatrolSessionFilter,
    timeRange: 'daily',
    filters: { PatrolAssignmentId: id },
  });

  const { data: caseData, isLoading: isCaseLoading } = usePatrolCaseList({
    ...defaultPatrolCaseFilter,
    filters: { PatrolAssignmentId: id },
  });
  const patrolCaseData = caseData?.data || [];

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
  const patrolNotStarted = !startedAt;
  const patrolRunning = !!startedAt && !endedAt;
  const patrolEnded = !!startedAt && !!endedAt;
  const canAddEditCase = patrolRunning;

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
    console.log('latestSession', latestSession);
    // Parse UTC properly (Z already exists ✔)
    const started = latestSession.startedAt ? new Date(latestSession.startedAt) : null;

    const ended = latestSession.endedAt ? new Date(latestSession.endedAt) : null;
    if (started && !ended) {
      setPatrolSessionId(latestSession.id);
    }
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
  if (!patrol) {
    return (
      <Box display="flex" justifyContent="center" mt={5}>
        <CircularProgress />
      </Box>
    );
  }
  const handleStart = async () => {
    if (!patrol) return;
    // if (!data.patrolAssignment) return;
    try {
      const res = await StartPatrolMutation.mutateAsync(patrol.id);
      console.log('Start Patrol res', res);
      if (!res?.success || !res?.collection?.data) return;

      const session = res.collection.data;

      setPatrolSession(session);

      // backend is source of truth
      setStartedAt(new Date(session.startedAt));
      setEndedAt(null);
    } catch (error) {
      console.error(error);
      console.log('Time', timeGroups[0].timeBlocks);
    }
  };

  const handleDone = async () => {
    if (!patrol) return;
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

  const handleAddCase = () => {
    console.log('handleAddCase', patrolSessionId);
    if (patrolNotStarted) {
      toast.error('Cases can only be added after the patrol has started.');
      return;
    }

    if (patrolEnded) {
      toast.error('The patrol has ended. New cases can no longer be added.');
      return;
    }
    if (patrolSessionId) {
      setCaseDialogType('add');
      setSelectedCase({ ...defaultPatrolCaseUploadForm, patrolSessionId: patrolSessionId });
      setOpenCaseDialog(true);
    }
  };

  const mapCaseToForm = (data: any): CaseUploadType => ({
    title: data.title ?? '',
    description: data.description ?? '',
    caseType: data.caseType ?? '',
    threatLevel: data.threatLevel ?? '',
    patrolSessionId: data.patrolSessionId,
    attachments: (data.attachments || []).map((a: any) => ({
      fileUrl: a.fileUrl.startsWith('http') ? a.fileUrl : `https://${a.fileUrl}`,
      fileType: a.fileType,
    })),
  });

  const handleEditCase = (item: any) => {
    setCaseDialogType('edit');
    setEditId(item.id);
    setSelectedCase(mapCaseToForm(item));
    setOpenCaseDialog(true);
  };

  const handleCloseCaseDialog = () => {
    setOpenCaseDialog(false);
  };

  console.log('patrol', patrol, 'patrolSession', patrolSession);
  // ===== Patrol Assignment Date Validation =====
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startDate = patrol.startDate ? new Date(patrol.startDate) : null;
  const endDate = patrol.endDate ? new Date(patrol.endDate) : null;

  if (startDate) startDate.setHours(0, 0, 0, 0);
  if (endDate) endDate.setHours(23, 59, 59, 999);

  const assignmentNotStarted = startDate && today < startDate;
  const assignmentOver = endDate && today > endDate;

  const assignmentActive = (!startDate || today >= startDate) && (!endDate || today <= endDate);

  //Tab

  const handleChangeTab = (_: any, newValue: number) => {
    setDetailTab(newValue);
  };

  const TabPanel = ({
    children,
    value,
    index,
  }: {
    children: React.ReactNode;
    value: number;
    index: number;
  }) => {
    if (value !== index) return null;
    return <Box mt={2}>{children}</Box>;
  };

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
            display="flex"
            flexDirection="column"
            sx={{
              backgroundColor: theme.palette.background.paper,
              minHeight: isMobile
                ? 'auto'
                : `calc(100vh - ${(customizer.TopbarHeight ?? 70) * 2}px)`,
            }}
          >
            {/* Back Button */}
            <Box mb={2}>
              <Button
                size="small"
                startIcon={<ArrowBackIcon />}
                onClick={() => navigate('/security-view/patrol-assignment')}
              >
                Back
              </Button>
            </Box>
            {/* Name */}
            <Typography fontWeight={700} fontSize={20}>
              {patrol.name}
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
                <Typography fontSize={13}>{patrol.description || '-'}</Typography>
              </Box>
            </Box>
            <Divider sx={{ my: 2 }} />

            {/* ================= DETAILS TABS ================= */}
            <Box>
              <Typography fontWeight={600} mb={1}>
                Details
              </Typography>

              <Tabs
                value={detailTab}
                onChange={handleChangeTab}
                variant="fullWidth"
                // size="small"
              >
                <Tab label="Dates" />
                <Tab label="Route" />
                <Tab label="Securities" />
              </Tabs>

              {/* ===== Dates ===== */}
              <TabPanel value={detailTab} index={0}>
                <Box sx={{ cursor: 'pointer' }} onClick={() => setOpenSchedule(true)}>
                  <Stack spacing={1}>
                    <InfoRow label="Active From" value={formatDate(patrol.startDate)} />
                    <InfoRow label="Until" value={formatDate(patrol.endDate)} />
                  </Stack>
                </Box>
              </TabPanel>

              {/* ===== Route ===== */}
              <TabPanel value={detailTab} index={1}>
                <Box sx={{ cursor: 'pointer' }} onClick={() => setOpenRoute(true)}>
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

                    {/* LINE */}
                    <Box flex={1} position="relative" height={20}>
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

                      <Box
                        sx={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          px: 1,
                          backgroundColor: theme.palette.background.paper,
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
              </TabPanel>

              {/* ===== Securities ===== */}
              <TabPanel value={detailTab} index={2}>
                <Box
                  sx={{
                    maxHeight: isMobile ? 200 : 240,
                    overflowY: 'auto',
                  }}
                >
                  <Stack spacing={1}>
                    {patrol.securities?.map((sec: SecurityType) => (
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

                    {!patrol.securities?.length && (
                      <Typography fontSize={12} color="text.secondary">
                        No securities assigned
                      </Typography>
                    )}
                  </Stack>
                </Box>
              </TabPanel>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* ================= CHECKPOINTS ================= */}
            <Box>
              <Typography fontWeight={600} mb={1}>
                Checkpoints
              </Typography>

              <Box
                sx={{
                  maxHeight: 220,
                  overflowY: 'auto',
                  pr: 0.5,
                  '&::-webkit-scrollbar': { width: 4 },
                  '&::-webkit-scrollbar-thumb': {
                    backgroundColor: theme.palette.divider,
                    borderRadius: 2,
                  },
                }}
              >
                <Stack spacing={1}>
                  {checkpoints.map((cp: any) => (
                    <Box
                      key={cp.id}
                      display="flex"
                      alignItems="center"
                      justifyContent="space-between"
                      p={1}
                      borderRadius={1}
                      sx={{
                        backgroundColor: theme.palette.action.hover,
                      }}
                    >
                      {/* LEFT */}
                      <Box display="flex" alignItems="center" gap={1}>
                        <Box
                          sx={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            backgroundColor: theme.palette.primary.main,
                            color: '#fff',
                            fontSize: 12,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 600,
                          }}
                        >
                          {cp.orderIndex}
                        </Box>

                        <Box>
                          <Typography fontSize={13} fontWeight={600}>
                            {cp.areaNameSnap}
                          </Typography>

                          <Typography fontSize={11} color="text.secondary">
                            Cycle {cp.cycleIndex}
                          </Typography>
                        </Box>
                      </Box>

                      {/* RIGHT */}
                      <Chip
                        size="small"
                        label={cp.checkpointStatus}
                        color={
                          cp.checkpointStatus === 'Cleared'
                            ? 'success'
                            : cp.checkpointStatus === 'AutoDetected'
                              ? 'info'
                              : 'default'
                        }
                      />
                    </Box>
                  ))}

                  {!checkpoints.length && (
                    <Typography fontSize={12} color="text.secondary">
                      No checkpoints available
                    </Typography>
                  )}
                </Stack>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* ===== Patrol Status ===== */}
            <Box
              sx={{
                mt: 'auto',
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                overflow: 'hidden',
              }}
            >
              {!assignmentActive ? (
                <Box p={2} textAlign="center">
                  <Chip
                    label={
                      assignmentOver
                        ? 'Patrol Assignment is already over'
                        : 'Patrol Assignment has not yet started'
                    }
                    color="warning"
                  />
                </Box>
              ) : (
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
                        ? formatStopwatch(durationMs)
                        : startedAt && endedAt
                          ? formatDurationFinal(durationMs)
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
              )}
            </Box>
          </Box>

          {/* ================= RIGHT PANEL ================= */}
          <Box
            flex={1}
            borderRadius={2}
            p={2}
            sx={{ backgroundColor: theme.palette.background.paper }}
          >
            {/* Title */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography fontWeight={700} fontSize={18}>
                Patrol Cases
              </Typography>

              <Box
                sx={{
                  opacity: canAddEditCase ? 1 : 0.5,
                  cursor: canAddEditCase ? 'pointer' : 'not-allowed',
                }}
              >
                <Button
                  size="small"
                  variant="contained"
                  onClick={handleAddCase}
                  fullWidth={isMobile}
                >
                  Add Case
                </Button>
              </Box>
            </Box>

            {/* List */}
            {isCaseLoading ? (
              <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                <CircularProgress />
              </Box>
            ) : (
              <Box
                sx={{
                  maxHeight: isMobile ? 'auto' : 'calc(100vh - 220px)',
                  overflowY: 'auto',
                }}
              >
                {patrolCaseData.length > 0 ? (
                  patrolCaseData.map((item, index) => (
                    <Box
                      key={item.id}
                      sx={{
                        backgroundColor: index % 2 ? 'grey.50' : 'transparent',
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <PatrolCaseListItem
                        data={item}
                        onClick={(c) => {
                          if (!canAddEditCase) {
                            patrolEnded
                              ? toast.error('This patrol has ended. Cases can no longer be edited.')
                              : toast.error(
                                  'Cases can only be edited after the patrol has started.',
                                );
                            return;
                          }
                          handleEditCase(c);
                        }}
                      />
                    </Box>
                  ))
                ) : (
                  <Typography fontSize={13} color="text.secondary" textAlign="center" mt={2}>
                    No patrol cases found
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        </Box>
      </Box>
      {/* ================= SCHEDULE DIALOG ================= */}
      <PatrolScheduleCalendarDialog
        open={openSchedule}
        onClose={() => setOpenSchedule(false)}
        startDate={patrol.startDate}
        endDate={patrol.endDate}
        timeGroups={timeGroups}
      />

      {/* ================= ROUTE DIALOG ================= */}
      <PatrolRouteDetailDialog open={openRoute} route={route} onClose={() => setOpenRoute(false)} />
      {/* ================= CASE DIALOG ================= */}
      <PatrolCaseDialog
        open={openCaseDialog}
        onClose={handleCloseCaseDialog}
        id={editId}
        type={caseDialogType}
        initialData={selectedCase}
        setEditId={setEditId}
      />
    </>
  );
};

export default PatrolDetailPage;
