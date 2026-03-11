import { useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { AppDispatch, RootState, useDispatch } from 'src/store/Store';
import {
  Box,
  Typography,
  Chip,
  Avatar,
  Grid2 as Grid,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  DialogActions,
  TextField,
  MenuItem,
  Divider,
  Stack,
  CircularProgress,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import BoltIcon from '@mui/icons-material/Bolt';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import PersonIcon from '@mui/icons-material/Person';
import { BASE_URL } from 'src/utils/axios';
import { VisitorType } from 'src/store/apps/crud/visitor';
import { memberType } from 'src/store/apps/crud/member';
import duration from 'dayjs/plugin/duration';
import { useEffect, useState } from 'react';
import { formatFullDateTime } from 'src/utils/time';
import {
  useAcknowledgeAlarmTrigger,
  useAlarmTimeline,
  useAlarmTriggerList,
  useAllIntruders,
  useAssignActionAlarmTriggerByID,
  useDispatchAlarmTrigger,
  usePostponeAlarmTrigger,
  useResolveAlarmTrigger,
} from 'src/hooks/useAlarmTrigger';
import {
  AlarmTimelineType,
  AlarmTriggerType,
  UpdateFilter,
} from 'src/store/apps/crud/alarmTrigger';
import { actionStatus, actionStatusColormap } from 'src/types/crud/input';
import toast from 'react-hot-toast';
import TrackingPositionFloorView from '../trackingTransaction/Preview/TrackingPositionFloorView';
import { useAllSecurityLookup, useAllSecuritys } from 'src/hooks/useSecurityGuard';
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';
import CustomAutocomplete from 'src/components/shared/CustomAutocomplete';
import AlarmTimelineProgress from './AlarmTimeline';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import { resolve } from 'path';
dayjs.extend(duration);

const AlarmContent = () => {
  const dispatch: AppDispatch = useDispatch();
  const language = useSelector((state: RootState) => state.customizer.isLanguage);
  const searchParams = new URLSearchParams(window.location.search);
  const autoAlarmSelectDone = useRef(false);
  const selectedIntruder = useSelector(
    (state: RootState) => state.alarmTriggerReducer.selectedIntruder,
  );
  const selectedVisitor = useSelector((state: RootState) => state.visitorReducer.selectedVisitor);
  const selectedMember = useSelector((state: RootState) => state.memberReducer.selectedMember);

  const alarmTriggerFilter = useSelector(
    (state: RootState) => state.alarmTriggerReducer.alarmTriggerFilter,
  );
  const { data: data, isLoading } = useAlarmTriggerList(alarmTriggerFilter);
  const alarmTriggerData = data?.data ?? [];

  const { data: securityData = [], isLoading: isLoadingSecurity } = useAllSecurityLookup();
  const [selectedSecurity, setSelectedSecurity] = useState<memberType | null>(null);

  // const [alarmTimeline, setAlarmTimeline] = useState<AlarmTimelineType | null>(null);

  // Determine which person to display based on selectedIntruder
  const [currentPerson, setCurrentPerson] = useState<VisitorType | memberType | null>(null);
  const [personType, setPersonType] = useState<'Visitor' | 'Member' | null>(null);

  //UseQuery Mutation
  const assignActionMutation = useAssignActionAlarmTriggerByID();
  const acknowledgeMutation = useAcknowledgeAlarmTrigger();
  const dispatchMutation = useDispatchAlarmTrigger();
  const postponeMutation = usePostponeAlarmTrigger();
  const resolveMutation = useResolveAlarmTrigger();

  useEffect(() => {
    if (selectedIntruder) {
      console.log('Selected intruder:', selectedIntruder);

      // Determine person type from selectedIntruder
      const type = selectedIntruder.personType as 'Visitor' | 'Member';
      setPersonType(type);

      // Set the current person based on type
      if (type === 'Visitor' && selectedVisitor) {
        setCurrentPerson(selectedVisitor);
        // Update filter for visitor
        dispatch(
          UpdateFilter({
            ...alarmTriggerFilter,
            Length: 999,
            filters: { visitorId: selectedVisitor.id },
          }),
        );
      } else if (type === 'Member' && selectedMember) {
        setCurrentPerson(selectedMember);
        // Update filter for member
        dispatch(UpdateFilter({ ...alarmTriggerFilter, filters: { memberId: selectedMember.id } }));
      } else {
        setCurrentPerson(null);
      }
    } else {
      setCurrentPerson(null);
      setPersonType(null);
    }
  }, [selectedIntruder, selectedVisitor, selectedMember]);

  // useEffect(() => {
  //   console.log('alarmTriggerData updated:', alarmTriggerData);
  // }, [alarmTriggerData]);

  const field = {
    fontWeight: 800,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: 'block',
    maxWidth: '100%',
  };

  const value = {
    fontWeight: 300,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: 'block',
    maxWidth: '100%',
  };

  useEffect(() => {
    if (autoAlarmSelectDone.current) return;
    if (!alarmTriggerData?.length) return;

    const alarmTriggerId = searchParams.get('alarmTriggerId');
    if (!alarmTriggerId) return;

    const matchedAlarm = alarmTriggerData.find(
      (alarm) => alarm.id.toLowerCase() === alarmTriggerId.toLowerCase(),
    );

    if (matchedAlarm) {
      handleOpenAlarmWithAcknowledge(matchedAlarm);
      autoAlarmSelectDone.current = true;
    }
  }, [alarmTriggerData, searchParams]);

  // Alarm Action
  const [openActionDialog, setOpenActionDialog] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [selectedAlarmTrigger, setSelectedAlarmTrigger] = useState<AlarmTriggerType | null>(null);
  const [investigateResult, setInvestigateResult] = useState<string>('');

  const handleOpenActionDialog = () => {
    setSelectedAction('');
    setOpenActionDialog(true);
  };

  const handleCloseActionDialog = () => {
    setOpenActionDialog(false);
    setSelectedAction('');
  };

  const handleApplyAction = async () => {
    if (!selectedAlarmTrigger) {
      handleCloseActionDialog();
      toast.error('Please select an alarm');
      return;
    }
    if (!selectedAction) {
      handleCloseActionDialog();
      toast.error('Please select an action status');
      return;
    }
    if (selectedAction === 'Done' && investigateResult.trim() === '') {
      toast.error('Please provide investigation result');
      return;
    }

    try {
      const result = await assignActionMutation.mutateAsync({
        triggerId: selectedAlarmTrigger.id.toUpperCase(),
        actionStatus: selectedAction.toLowerCase(),
        investigatedResult: investigateResult.trim() === '' ? null : investigateResult,
        assignedSecurityId:
          selectedAction.toLowerCase() === 'investigated' && selectedSecurity
            ? selectedSecurity.id
            : null,
      });

      toast.success('Action dispatched successfully');
      handleCloseActionDialog();
      setSelectedSecurity(null);
      setSelectedAction('');
    } catch (error: any) {
      toast.error('Error dispatching action');
      console.error('Error dispatching action', error);
    } finally {
    }
  };

  const handleDispatchAction = async () => {
    if (!selectedAlarmTrigger) {
      toast.error('Please select an alarm');
      return;
    }
    if (selectedAlarmTrigger.action?.toLowerCase() !== 'acknowledged') {
      toast.error('Alarm is not acknowledged');
      return;
    }
    if (!selectedSecurity) {
      toast.error('Please select a security');
      return;
    }
    try {
      const result = await dispatchMutation.mutateAsync({
        id: selectedAlarmTrigger.id.toUpperCase(),
        assignedSecurityId: selectedSecurity.id,
      });
      toast.success('Action dispatched successfully');
      handleCloseActionDialog();
      setSelectedSecurity(null);
      setSelectedAction('');
    } catch (error: any) {
      toast.error('Error dispatching action');
      console.error('Error dispatching action', error);
    } finally {
    }
  };

  const formatActionLabel = (value: string) => {
    if (!value) return '-';
    return value.replace(/([a-z])([A-Z])/g, '$1 $2');
  };

  const { data: timelineData, isFetching: isFetchingTimeline } = useAlarmTimeline(
    selectedAlarmTrigger?.id ?? '',
    {
      enabled: !!selectedAlarmTrigger?.id,
    },
  );

  const handleOpenAlarmWithAcknowledge = async (alarm: AlarmTriggerType) => {
    // Always set selected alarm first (so dialog can use it later)
    console.log('Alarm: ', alarm);
    setSelectedAlarmTrigger(alarm);
    // await handleFetchTimeline(alarm.id);
    // ✅ Only call API if action is "Idle"
    if (alarm.action?.toLowerCase() !== 'idle') {
      setOpenActionDialog(true);
      return;
    }

    // Prevent duplicate calls
    if (acknowledgeMutation.isPending) return;

    try {
      console.log('acknowledgeMutation', acknowledgeMutation);
      await acknowledgeMutation.mutateAsync(alarm.id.toUpperCase());

      setOpenActionDialog(true);
    } catch (error) {
      console.error('Failed to acknowledge alarm:', error);
      toast.error('Failed to fetch alarm');
    }
  };

  //Postpone Alarm
  const [openPostponeDialog, setOpenPostponeDialog] = useState(false);
  const [postponeDate, setPostponeDate] = useState<Dayjs | null>(null);
  const [postponeReason, setPostponeReason] = useState('');

  const handlePostpone = async () => {
    if (!selectedAlarmTrigger) {
      toast.error('No alarm selected');
      return;
    }

    if (!postponeDate) {
      toast.error('Please select postpone date');
      return;
    }

    if (!postponeReason.trim()) {
      toast.error('Please provide reason');
      return;
    }

    try {
      await postponeMutation.mutateAsync({
        id: selectedAlarmTrigger.id,
        postponedUntilDate: postponeDate.toISOString(),
        postponeReason: postponeReason.trim(),
      });

      toast.success('Alarm postponed successfully');

      setOpenPostponeDialog(false);
      setPostponeDate(null);
      setPostponeReason('');
    } catch (error) {
      toast.error('Failed to postpone alarm');
    }
  };

  //Done Alarm
  const handleResolve = async () => {
    if (!selectedAlarmTrigger) {
      toast.error('No alarm selected');
      return;
    }
    try {
      await resolveMutation.mutateAsync(selectedAlarmTrigger.id);

      toast.success('Alarm done successfully');

      setOpenActionDialog(false);
    } catch (error) {
      toast.error('Failed to done alarm');
    }
  };

  // const handleFetchTimeline = async (alarmId: string) => {
  //   console.log('Fetching timeline for alarm:', alarmId);
  //   if (!alarmId) return;

  //   try {
  //     const { data } = await refetchTimeline();

  //     if (data) {
  //       setAlarmTimeline(data);
  //       console.log('Alarm Timeline:', data);
  //     }
  //   } catch (error) {
  //     console.error('Failed to fetch timeline:', error);
  //     toast.error('Failed to fetch timeline');
  //   }
  // };

  if (!currentPerson)
    return (
      <Box p={3} display="flex" flexDirection="column" alignItems="center">
        <Typography variant="h4">No {personType?.toLowerCase() || 'person'} selected</Typography>
        <Typography variant="h6">
          Please select a {personType?.toLowerCase() || 'person'}
        </Typography>
      </Box>
    );

  return (
    <Box p={3}>
      {/* ================= TOP SECTION ================== */}
      <Box
        display="flex"
        alignItems="flex-start"
        gap={4}
        mb={2}
        sx={{ borderBottom: '1px solid #DDD', pb: 3 }}
      >
        {/* ============ PERSON PHOTO ============ */}
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          sx={{ minWidth: 180 }}
        >
          <Avatar
            alt={`${personType} Face`}
            src={`${BASE_URL}${currentPerson.faceImage ?? ''}`}
            sx={{
              width: 160,
              height: 160,
              mb: 1,
              border: '3px solid #1976d2',
            }}
          />
          {/* Person Type Badge */}
          <Chip
            label={personType}
            color={personType === 'Visitor' ? 'primary' : 'success'}
            sx={{ fontWeight: 700, mt: 1 }}
          />
        </Box>

        {/* ============ PERSON FIELDS ============ */}
        <Box flexGrow={1}>
          <Grid container spacing={2}>
            {/* Common Fields for both Visitor and Member */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography sx={field}>Name</Typography>
              <Box display="flex" gap={1}>
                <Typography sx={value}>{currentPerson.name}</Typography>
                {/* Blacklist Chip - common for both */}
                {'isBlacklist' in currentPerson && currentPerson.isBlacklist ? (
                  <Chip label="Blacklisted" color="error" size="small" sx={{ fontWeight: 700 }} />
                ) : null}
                {/* VIP Chip - only for Visitor */}
                {personType === 'Visitor' && 'isVip' in currentPerson && currentPerson.isVip ? (
                  <Chip label="VIP" color="warning" size="small" sx={{ fontWeight: 700 }} />
                ) : null}
              </Box>
            </Grid>

            {/* Gender - common */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography sx={field}>Gender</Typography>
              <Typography sx={value}>{currentPerson.gender}</Typography>
            </Grid>

            {/* Address - common */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography sx={field}>Address</Typography>
              <Typography sx={value}>{currentPerson.address}</Typography>
            </Grid>

            {/* Card Number - common */}
            {'cardNumber' in currentPerson && (
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Typography sx={field}>Card Number</Typography>
                <Typography sx={value}>{currentPerson.cardNumber}</Typography>
              </Grid>
            )}

            {/* BLE Card Number - common */}
            {'bleCardNumber' in currentPerson && (
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Typography sx={field}>BLE Card Number</Typography>
                <Typography sx={value}>{currentPerson.bleCardNumber}</Typography>
              </Grid>
            )}

            {/* Visitor Specific Fields */}
            {personType === 'Visitor' && (
              <>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography sx={field}>Organization</Typography>
                  <Typography sx={value}>
                    {(currentPerson as VisitorType).organizationName}
                  </Typography>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography sx={field}>Department</Typography>
                  <Typography sx={value}>
                    {(currentPerson as VisitorType).departmentName}
                  </Typography>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography sx={field}>District</Typography>
                  <Typography sx={value}>{(currentPerson as VisitorType).districtName}</Typography>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography sx={field}>Identity Type</Typography>
                  <Typography sx={value}>{(currentPerson as VisitorType).identityType}</Typography>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography sx={field}>Identity ID</Typography>
                  <Typography sx={value}>{(currentPerson as VisitorType).identityId}</Typography>
                </Grid>
              </>
            )}

            {/* Member Specific Fields */}
            {personType === 'Member' && (
              <>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography sx={field}>Organization</Typography>
                  <Typography sx={value}>
                    {(currentPerson as memberType).organization?.name || '-'}
                  </Typography>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography sx={field}>Department</Typography>
                  <Typography sx={value}>
                    {(currentPerson as memberType).department?.name || '-'}
                  </Typography>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography sx={field}>District</Typography>
                  <Typography sx={value}>
                    {(currentPerson as memberType).district?.name || '-'}
                  </Typography>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography sx={field}>Employee ID</Typography>
                  <Typography sx={value}>
                    {(currentPerson as memberType).personId || '-'}
                  </Typography>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography sx={field}>Join Date</Typography>
                  <Typography sx={value}>
                    {(currentPerson as memberType).joinDate || '-'}
                  </Typography>
                </Grid>
              </>
            )}

            {/* Email - common */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography sx={field}>Email</Typography>
              <Typography sx={value}>{currentPerson.email}</Typography>
            </Grid>

            {/* Phone - common */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography sx={field}>Phone</Typography>
              <Typography sx={value}>{currentPerson.phone}</Typography>
            </Grid>
          </Grid>
        </Box>
      </Box>

      {/* ================= ALARM TRIGGERS SECTION ================== */}
      <Typography variant="h5" fontWeight="bold" mb={2}>
        Alarm Triggered
      </Typography>

      <Grid
        container
        spacing={3}
        padding={1}
        sx={{
          maxHeight: '440px',
          overflowY: 'auto',
        }}
      >
        {alarmTriggerData.length === 0 && !isLoading && (
          <Typography>No alarm triggers found for this {personType?.toLowerCase()}.</Typography>
        )}
        {alarmTriggerData.map((alarmTrigger: AlarmTriggerType, index) => {
          const imgSrc = alarmTrigger.floorplanImage
            ? `${BASE_URL}${alarmTrigger.floorplanImage}`
            : alarmTrigger.floorplan?.floorplanImage
              ? `${BASE_URL}${alarmTrigger.floorplan.floorplanImage}`
              : null;

          const lang = language === 'id' ? 'id' : 'en';
          const append = language === 'id' ? 'hingga' : 'to';

          const startFormatted = alarmTrigger.triggerTime
            ? formatFullDateTime(alarmTrigger.triggerTime, lang)
            : '-';
          const endFormatted = alarmTrigger.doneTimestamp
            ? formatFullDateTime(alarmTrigger.doneTimestamp, lang)
            : lang === 'id'
              ? 'Aktif'
              : 'Active';

          return (
            <Grid key={index} size={{ xs: 12, sm: 6, md: 3, lg: 2 }}>
              <Box
                onClick={() => {
                  handleOpenAlarmWithAcknowledge(alarmTrigger);
                }}
                sx={{
                  border: '1px solid #CCC',
                  borderRadius: 1.5,
                  p: 1,
                  height: '100%',
                  bgcolor: '#fafafa',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    borderColor: 'primary.main',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    transform: 'translateY(-2px)',
                    bgcolor: '#f5f5f5',
                  },
                }}
              >
                {/* Floorplan Image */}
                <Box
                  sx={{
                    width: '100%',
                    height: 100,
                    borderRadius: 1,
                    overflow: 'hidden',
                    border: '1px solid #DDD',
                    mb: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: '#e1e1e1',
                    position: 'relative',
                  }}
                >
                  {imgSrc ? (
                    <Box
                      sx={{
                        width: '100%',
                        height: '100%',
                        position: 'relative',
                      }}
                    >
                      <img
                        src={imgSrc}
                        alt="Floorplan"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                      <Chip
                        label={formatActionLabel(alarmTrigger.alarm)}
                        sx={{
                          bgcolor: alarmTrigger.alarmColor || 'secondary.dark',
                          color: 'white',
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          zIndex: 1,
                        }}
                        size="small"
                      />
                    </Box>
                  ) : (
                    <Typography sx={{ color: '#777' }}>No Image</Typography>
                  )}
                </Box>

                {/* Floorplan Name */}
                <Grid display="flex" alignItems="center" justifyContent="space-between">
                  <Typography
                    fontWeight={700}
                    fontSize="0.85rem"
                    sx={{
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {alarmTrigger.floorplanName ?? 'Unknown Floorplan'}
                  </Typography>
                  <Chip
                    sx={{
                      backgroundColor: actionStatusColormap[alarmTrigger.action] || 'grey',
                      color: 'white',
                      borderRadius: '8px',
                      minWidth: '50px',
                    }}
                    size="small"
                    label={alarmTrigger.action}
                  />
                </Grid>

                {/* Time Range */}
                <Typography fontWeight={400} fontSize="0.75rem" color="text.secondary">
                  {startFormatted} {endFormatted.startsWith('A') ? '' : append} {endFormatted}
                </Typography>
              </Box>
            </Grid>
          );
        })}
      </Grid>

      {/* ⚙️ Apply Action Dialog */}
      <Dialog
        open={openActionDialog && selectedAlarmTrigger !== null}
        onClose={handleCloseActionDialog}
        fullWidth
        maxWidth="lg"
      >
        <DialogTitle
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            px: 5,
          }}
        >
          <Typography variant="h4" fontWeight={700}>
            Alarm Detail
          </Typography>

          {selectedAlarmTrigger && (
            <Chip
              label={`Category : ${selectedAlarmTrigger.alarm?.toUpperCase()}`}
              sx={{
                fontWeight: 600,
                backgroundColor: selectedAlarmTrigger.alarmColor,
                color: '#fff',
              }}
            />
          )}
        </DialogTitle>
        <DialogContent sx={{ mt: 1, p: 3 }}>
          <Box
            sx={{
              width: '100%',
              height: '40vh',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: '#f5f5f5',
              borderTop: '1px solid #e0e0e0',
              p: 2,
              mb: 2,
            }}
          >
            {selectedAlarmTrigger && (
              <Box
                sx={{
                  position: 'relative',
                  width: '100%',
                  height: '100%',
                  borderRadius: 2,
                  overflow: 'hidden',
                  boxShadow: 2,
                  backgroundColor: '#f5f5f5',
                }}
              >
                <TrackingPositionFloorView
                  floorplanId={selectedAlarmTrigger.floorplanId ?? ''}
                  positionPxX={selectedAlarmTrigger.posX}
                  positionPxY={selectedAlarmTrigger.posY}
                  markerColor={
                    selectedAlarmTrigger.isActive
                      ? 'red'
                      : (selectedAlarmTrigger.alarmColor ?? 'yellow')
                  }
                />
              </Box>
            )}
          </Box>
          <Divider />
          {!selectedAlarmTrigger?.isActive && (
            <Box
              sx={{
                border: '1px solid',
                borderColor: 'success.light',
                borderRadius: 3,
                p: 3,
                my: 2,
                background: 'linear-gradient(135deg, rgba(80,246,110,0.08), rgba(80,246,110,0.02))',
              }}
            >
              {/* Header */}
              <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                <CheckCircleIcon color="success" />
                <Typography variant="h6" fontWeight={700} color="success.main">
                  Alarm Successfully Resolved
                </Typography>
              </Stack>

              {isFetchingTimeline || !timelineData ? (
                <Skeleton height={140} />
              ) : (
                <>
                  {/* Investigation Result */}
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={2}
                    alignItems={{ sm: 'center' }}
                    justifyContent="space-between"
                    mb={2}
                  >
                    <Stack direction="row" spacing={1} alignItems="center">
                      <TaskAltIcon color="success" fontSize="small" />
                      <Typography variant="body2" color="text.secondary">
                        Investigation Result
                      </Typography>
                    </Stack>

                    <Chip
                      label={timelineData.investigation.result}
                      color="success"
                      variant="filled"
                      sx={{ fontWeight: 600 }}
                    />
                  </Stack>

                  {/* Dispatched Person */}
                  <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                    <PersonIcon fontSize="small" color="action" />
                    <Typography variant="body2">
                      Handled by <strong>{timelineData.investigation.dispatchedPerson}</strong>
                    </Typography>
                  </Stack>

                  <Divider sx={{ my: 2 }} />

                  {/* Duration Metrics */}
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={3}
                    justifyContent="space-between"
                  >
                    <Stack direction="row" spacing={1} alignItems="center">
                      <AccessTimeIcon fontSize="small" color="action" />
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Total Duration
                        </Typography>
                        <Typography fontWeight={600}>
                          {timelineData.duration.totalFormatted}
                        </Typography>
                      </Box>
                    </Stack>

                    <Stack direction="row" spacing={1} alignItems="center">
                      <BoltIcon fontSize="small" color="action" />
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Response Time
                        </Typography>
                        <Typography fontWeight={600}>
                          {timelineData.duration.responseTimeFormatted}
                        </Typography>
                      </Box>
                    </Stack>

                    <Stack direction="row" spacing={1} alignItems="center">
                      <TaskAltIcon fontSize="small" color="action" />
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Resolution Time
                        </Typography>
                        <Typography fontWeight={600}>
                          {timelineData.duration.resolutionTimeFormatted}
                        </Typography>
                      </Box>
                    </Stack>
                  </Stack>

                  {/* Notes */}
                  {timelineData.investigation.notes && (
                    <>
                      <Divider sx={{ my: 2 }} />
                      <Typography variant="body2" color="text.secondary" mb={0.5}>
                        Notes
                      </Typography>
                      <Typography variant="body2">{timelineData.investigation.notes}</Typography>
                    </>
                  )}
                </>
              )}
            </Box>
          )}
          <Divider />
          <Box sx={{ my: 2 }}>
            <Typography variant="body1" color="text.secondary" mb={1}>
              Alarm Timeline :
            </Typography>
            {isFetchingTimeline || !timelineData ? (
              <Skeleton height={120} />
            ) : (
              <AlarmTimelineProgress timelineData={timelineData} />
            )}
          </Box>

          {/* If alarm is inactive */}
          {selectedAlarmTrigger?.action.toLocaleLowerCase() === 'acknowledged' && (
            <>
              <Divider />
              <Box mt={3}>
                <Typography variant="subtitle2" color="text.secondary" mb={1}>
                  Dispatch Security Guard
                </Typography>
                <CustomAutocomplete
                  label="Security Guard"
                  options={securityData || []}
                  value={selectedSecurity}
                  loading={isLoadingSecurity}
                  onChange={(newValue) => setSelectedSecurity(newValue)}
                  getOptionLabel={(option) => option?.name ?? ''}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  required
                  helperText={!selectedSecurity ? 'Please select a security guard' : undefined}
                />
              </Box>
            </>
          )}

          {/* Investigate Result */}
          {/* {selectedAction.toLowerCase() === 'done' && selectedAlarmTrigger?.isActive && (
            <Box mt={3}>
              <Typography variant="subtitle2" color="text.secondary" mb={1}>
                Investigate Result
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                value={investigateResult}
                onChange={(e) => setInvestigateResult(e.target.value)}
              />
            </Box>
          )} */}

          {/* Select Security Guard */}
          {/* {selectedAction.toLowerCase() === 'investigated' && selectedAlarmTrigger?.isActive && (
            <Box mt={3}>
              <Typography variant="subtitle2" color="text.secondary" mb={1}>
                Select Security Guard
              </Typography>
              <CustomAutocomplete
                label="Security Guard"
                options={securityData || []}
                value={selectedSecurity}
                loading={isLoadingSecurity}
                onChange={(newValue) => setSelectedSecurity(newValue)}
                getOptionLabel={(option) => option?.name ?? ''}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                required
                helperText={!selectedSecurity ? 'Please select a security guard' : undefined}
              />
            </Box>
          )} */}
        </DialogContent>

        <DialogActions sx={{ p: 3 }}>
          <Button onClick={handleCloseActionDialog} color="error" variant="outlined">
            Close
          </Button>

          {/* Only show confirm if alarm is active */}
          {selectedAlarmTrigger?.action.toLocaleLowerCase() === 'acknowledged' && (
            <>
              <Button
                variant="outlined"
                color="warning"
                onClick={() => setOpenPostponeDialog(true)}
              >
                Postpone
              </Button>

              <Button
                variant="contained"
                color="primary"
                disabled={!selectedSecurity || dispatchMutation.isPending}
                onClick={handleDispatchAction}
                startIcon={
                  dispatchMutation.isPending ? <CircularProgress size={16} color="inherit" /> : null
                }
              >
                {dispatchMutation.isPending ? 'Dispatching...' : 'Dispatch'}
              </Button>
            </>
          )}
          {selectedAlarmTrigger?.action.toLocaleLowerCase() === 'doneinvestigated' && (
            <Button
              variant="contained"
              color="primary"
              // disabled={!selectedSecurity || dispatchMutation.isPending}
              onClick={handleResolve}
              startIcon={
                resolveMutation.isPending ? <CircularProgress size={16} color="inherit" /> : null
              }
            >
              {resolveMutation.isPending ? 'Resolving...' : 'Resolve'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
      <Dialog
        open={openPostponeDialog}
        onClose={() => {
          setOpenPostponeDialog(false);
          setPostponeDate(null);
          setPostponeReason('');
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          <Typography variant="h5" fontWeight={700}>
            Postpone Alarm
          </Typography>
        </DialogTitle>

        <DialogContent>
          <Stack spacing={3} mt={1}>
            {/* DATE PICKER */}
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label="Postpone Until"
                value={postponeDate}
                onChange={(newValue) => setPostponeDate(newValue)}
                disablePast
                minDate={dayjs().add(1, 'day')} // ❌ block today
                slotProps={{
                  textField: {
                    fullWidth: true,
                    required: true,
                  },
                }}
              />
            </LocalizationProvider>

            {/* REASON */}
            <TextField
              label="Reason"
              multiline
              rows={4}
              value={postponeReason}
              onChange={(e) => setPostponeReason(e.target.value)}
              fullWidth
              required
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 3 }}>
          <Button
            variant="outlined"
            color="error"
            onClick={() => {
              setOpenPostponeDialog(false);
              setPostponeDate(null);
              setPostponeReason('');
            }}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            color="warning"
            onClick={handlePostpone}
            disabled={postponeMutation.isPending}
            startIcon={
              postponeMutation.isPending ? <CircularProgress size={16} color="inherit" /> : null
            }
          >
            {postponeMutation.isPending ? 'Saving...' : 'Confirm Postpone'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AlarmContent;
