import { useMemo, useRef } from 'react';
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
  Tooltip,
  IconButton,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import BoltIcon from '@mui/icons-material/Bolt';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import PersonIcon from '@mui/icons-material/Person';
import { BASE_URL } from 'src/utils/axios';
import { SelectVisitor, VisitorType } from 'src/store/apps/crud/visitor';
import { memberType, SelectMember } from 'src/store/apps/crud/member';
import duration from 'dayjs/plugin/duration';
import { useEffect, useState } from 'react';
import { formatFullDateTime } from 'src/utils/time';
import { useQueryClient } from '@tanstack/react-query';
import {
  alarmTriggerByIdQuery,
  useAcknowledgeAlarmTrigger,
  useAlarmTimeline,
  useInfiniteAlarmTriggerList,
  useAllIntruders,
  useAssignActionAlarmTriggerByID,
  useDispatchAlarmTrigger,
  useDispatchMultipleAlarmTrigger,
  useNearestSecurity,
  usePostponeAlarmTrigger,
  useResolveAlarmTrigger,
} from 'src/hooks/useAlarmTrigger';
import { useInView } from 'react-intersection-observer';
import {
  AlarmTimelineType,
  AlarmTriggerType,
  NearestSecurityType,
  SelectIntruder,
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
import { useAlarmPlayback } from 'src/hooks/useAlarmPlayback';
import { AlarmPlaybackDataType } from 'src/store/apps/crud/alarmPlayback';
import AlarmPlaybackDialog from './AlarmPlaybackDialog';
import AlarmTriggeredFilter from './AlarmFilter';
import { useMemberByID } from 'src/hooks/useMember';
import { useVisitorByID } from 'src/hooks/useVisitor';
dayjs.extend(duration);

const proximityColorMap: Record<string, string> = {
  SameArea: '#4caf50', // green
  SameFloorplan: '#2196f3', // blue
  SameFloor: '#ff9800', // orange
  SameBuilding: '#9c27b0', // purple
  DifferentBuilding: '#9e9e9e', // grey
};

const AlarmContent = () => {
  const queryClient = useQueryClient();
  const dispatch: AppDispatch = useDispatch();
  const language = useSelector((state: RootState) => state.settings.isLanguage);
  
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
  // 🔹 Per-category infinite queries
  const baseFilter = alarmTriggerFilter;

  const {
    data: activeData,
    isLoading: isLoadingActive,
    hasNextPage: hasNextActive,
    fetchNextPage: fetchNextActive,
    isFetchingNextPage: isFetchingNextActive,
  } = useInfiniteAlarmTriggerList({
    ...baseFilter,
    filters: {
      ...baseFilter.filters,
      isActive: true,
      // action: baseFilter.filters?.action?.length
      //   ? baseFilter.filters.action.filter(
      //       (a) => a.toLowerCase() !== 'dispatched' && a.toLowerCase() !== 'accepted',
      //     )
      //   : undefined,
      action: ['Idle', 'Acknowledged']
    },
  }, 50);

  const {
    data: onGoingData,
    isLoading: isLoadingOnGoing,
    hasNextPage: hasNextOnGoing,
    fetchNextPage: fetchNextOnGoing,
    isFetchingNextPage: isFetchingNextOnGoing,
  } = useInfiniteAlarmTriggerList({
    ...baseFilter,
    filters: {
      ...baseFilter.filters,
      isActive: true,
      action: ['Dispatched', 'Accepted', 'PostponeInvestigated'],
    },
  }, 50);

  const {
    data: clearedData,
    isLoading: isLoadingCleared,
    hasNextPage: hasNextCleared,
    fetchNextPage: fetchNextCleared,
    isFetchingNextPage: isFetchingNextCleared,
  } = useInfiniteAlarmTriggerList({
    ...baseFilter,
    filters: {
      ...baseFilter.filters,
      isActive: false,
    },
  }, 50);

  // 🔹 Intersection observers per category column
  const { ref: activeRef, inView: activeInView } = useInView();
  const { ref: onGoingRef, inView: onGoingInView } = useInView();
  const { ref: clearedRef, inView: clearedInView } = useInView();

  useEffect(() => {
    if (activeInView && hasNextActive && !isFetchingNextActive) fetchNextActive();
  }, [activeInView, hasNextActive, isFetchingNextActive, fetchNextActive]);

  useEffect(() => {
    if (onGoingInView && hasNextOnGoing && !isFetchingNextOnGoing) fetchNextOnGoing();
  }, [onGoingInView, hasNextOnGoing, isFetchingNextOnGoing, fetchNextOnGoing]);

  useEffect(() => {
    if (clearedInView && hasNextCleared && !isFetchingNextCleared) fetchNextCleared();
  }, [clearedInView, hasNextCleared, isFetchingNextCleared, fetchNextCleared]);

  // 🔹 Flat arrays per category
  const activeAlarm = activeData?.pages.flatMap((p) => p.data) ?? [];
  const onGoingAlarm = onGoingData?.pages.flatMap((p) => p.data) ?? [];
  const clearedAlarm = clearedData?.pages.flatMap((p) => p.data) ?? [];

  // Combined for auto-select from URL param
  const alarmTriggerData = [...activeAlarm, ...onGoingAlarm, ...clearedAlarm];

  const { data: securityData = [], isLoading: isLoadingSecurity } = useAllSecurityLookup();
  // const [selectedSecurity, setSelectedSecurity] = useState<memberType | null>(null);

  // const [alarmTimeline, setAlarmTimeline] = useState<AlarmTimelineType | null>(null);

  // Determine which person to display based on selectedIntruder
  const [currentPerson, setCurrentPerson] = useState<VisitorType | memberType | null>(null);
  const [personType, setPersonType] = useState<'Visitor' | 'Member' | null>(null);
  const [personId, setPersonId] = useState<string | null>(null);

  //UseQuery Mutation
  const assignActionMutation = useAssignActionAlarmTriggerByID();
  const acknowledgeMutation = useAcknowledgeAlarmTrigger();
  // const dispatchMutation = useDispatchAlarmTrigger();
  const dispatchMutation = useDispatchMultipleAlarmTrigger();
  const postponeMutation = usePostponeAlarmTrigger();
  const resolveMutation = useResolveAlarmTrigger();
  const alarmPlaybackMutation = useAlarmPlayback();

  const { data: currentMemberById, isLoading: isLoadingCurrentMember } = useMemberByID(
    personType === 'Member' && personId ? personId : '',
  );
  const { data: currentVisitorById, isLoading: isLoadingCurrentVisitor } = useVisitorByID(
    personType === 'Visitor' && personId ? personId : '',
  );

  const alarmCardPerson = useMemo(() => {
    if (personType === 'Member') {
      return currentMemberById;
    } else if (personType === 'Visitor') {
      return currentVisitorById;
    }
    return null;
  }, [personType, currentMemberById, currentVisitorById]);

  // useEffect(() => {
  //   if (currentMemberById) {
  //     setCurrentPerson(currentMemberById);
  //   } else if (currentVisitorById) {
  //     setCurrentPerson(currentVisitorById);
  //   } else {
  //     setCurrentPerson(null);
  //   }
  // }, [currentMemberById, currentVisitorById]);

  // console.log('Current Person Data:', { currentMemberById, currentVisitorById });
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
            filters: {
              ...alarmTriggerFilter.filters,
              visitorId: [selectedVisitor.id],
              memberId: undefined,
            },
          }),
        );
      } else if (type === 'Member' && selectedMember) {
        setCurrentPerson(selectedMember);
        // Update filter for member
        dispatch(
          UpdateFilter({
            ...alarmTriggerFilter,
            filters: {
              ...alarmTriggerFilter.filters,
              memberId: [selectedMember.id],
              visitorId: undefined,
            },
          }),
        );
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

  const handleClearPerson = () => {
    setCurrentPerson(null);
    setPersonType(null);
    dispatch(SelectIntruder(null));
    dispatch(SelectVisitor(null));
    dispatch(SelectMember(null));
    dispatch(
      UpdateFilter({
        ...alarmTriggerFilter,
        filters: {}, // 🔥 remove visitorId/memberId filter
      }),
    );
  };

  // Alarm Action
  const [openActionDialog, setOpenActionDialog] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [selectedAlarmTrigger, setSelectedAlarmTrigger] = useState<AlarmTriggerType | null>(null);

  const handleCloseActionDialog = () => {
    setOpenActionDialog(false);
    setSelectedAction('');
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
    if (!selectedSecurity.length) {
      toast.error('Please select a security');
      return;
    }
    try {
      const result = await dispatchMutation.mutateAsync({
        AlarmTriggerIds: [selectedAlarmTrigger.id.toUpperCase()],
        assignedSecurityIds: selectedSecurity.map((s) => s.securityId),
      });
      toast.success('Action dispatched successfully');
      handleCloseActionDialog();
      setSelectedSecurity([]);
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

  const { data: nearestSecurityData = [], isFetching: isFetchingNearestSecurity } =
    useNearestSecurity(selectedAlarmTrigger?.id ?? '', {
      enabled: !!selectedAlarmTrigger?.id,
    });

  // const [selectedSecurity, setSelectedSecurity] = useState<NearestSecurityType | null>(null);
  const [selectedSecurity, setSelectedSecurity] = useState<NearestSecurityType[]>([]);

  const proximityRank: Record<string, number> = {
    SameArea: 1,
    SameFloorplan: 2,
    SameFloor: 3,
    SameBuilding: 4,
    DifferentBuilding: 5,
  };
    // console.log("Nearest Sec: ", nearestSecurityData)

  const sortedSecurity = [...nearestSecurityData].sort((a, b) => {
    const proxA = proximityRank[a.proximityLevel] ?? 999;
    const proxB = proximityRank[b.proximityLevel] ?? 999;
    if (proxA !== proxB) return proxA - proxB;

    // distance logic (null last)
    if (a.distanceInMeters == null && b.distanceInMeters == null) return 0;
    if (a.distanceInMeters == null) return 1;
    if (b.distanceInMeters == null) return -1;

    return a.distanceInMeters - b.distanceInMeters;
  });

  const handleOpenAlarmWithAcknowledge = async (alarm: AlarmTriggerType) => {
    // Always set selected alarm first (so dialog can use it later)
    console.log('Alarm: ', alarm);
    setSelectedAlarmTrigger(alarm);
    const personType = alarm.visitorId ? 'Visitor' : alarm.memberId ? 'Member' : null;
    console.log('Determined person type:', personType);
    if (personType === 'Visitor' && alarm.visitorId) {
      setPersonType('Visitor');
      setPersonId(alarm.visitorId);
      console.log('Set personId for Visitor:', alarm.visitorId);
    } else if (personType === 'Member' && alarm.memberId) {
      setPersonType('Member');
      setPersonId(alarm.memberId);
      console.log('Set personId for Member:', alarm.memberId);
    }
    // await handleFetchTimeline(alarm.id);
    // ✅ Only call API if action is "Idle"
    if (alarm.action?.toLowerCase() !== 'idle') {
      console.log("Not IDLE", alarm);
      setOpenActionDialog(true);
      return;
    }

    // Prevent duplicate calls
    if (acknowledgeMutation.isPending) return;

    try {
      // console.log('acknowledgeMutation', acknowledgeMutation);
      const res = await acknowledgeMutation.mutateAsync(alarm.id.toUpperCase());
      console.log('acknowledgeMutation res', res);

      // Refetch the updated alarm detail and timeline before opening dialog, and invalidate lists
      const [updatedAlarm] = await Promise.all([
        queryClient.fetchQuery(alarmTriggerByIdQuery(alarm.id)),
        queryClient.invalidateQueries({ queryKey: ['alarmTrigger-timeline', alarm.id] }),
        queryClient.invalidateQueries({ queryKey: ['alarmTrigger-list-infinite'] }),
      ]);
      if (updatedAlarm) {
        setSelectedAlarmTrigger(updatedAlarm);
      }
      console.log('updatedAlarm', updatedAlarm);
      setOpenActionDialog(true);
    } catch (error) {
      console.error('Failed to acknowledge alarm:', error);
      toast.error('Failed to fetch alarm');
    }
  };

  //Postpone Alarm
  const [openPostponeDialog, setOpenPostponeDialog] = useState(false);
  const [postponeDate, setPostponeDate] = useState<Dayjs | null>(
    dayjs().add(1, 'day').startOf('day'),
  );
  const [postponeReason, setPostponeReason] = useState('Alarm is Postponed');

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
  useEffect(() => {
    if (openPostponeDialog) {
      setPostponeDate(dayjs().add(1, 'day').startOf('day'));
    }
  }, [openPostponeDialog]);
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

  //Alarm Playback

  const [playbackData, setPlaybackData] = useState<AlarmPlaybackDataType | null>(null);
  const [openPlaybackDialog, setOpenPlaybackDialog] = useState(false);

  const handleFetchPlayback = async () => {
    if (!selectedAlarmTrigger) {
      toast.error('No alarm selected');
      return;
    }

    try {
      const result = await alarmPlaybackMutation.mutateAsync({
        alarm_trigger_id: selectedAlarmTrigger.id,
        beforeMinutes: 1,
        afterMinutes: 1,
      });

      if (!result) {
        toast.error('Failed fetching alarm playback');
        return;
      }

      setPlaybackData(result);
      setOpenPlaybackDialog(true);
    } catch (error) {
      console.error('Playback fetch error:', error);
      toast.error('Failed fetching alarm playback');
    }
  };

  // 🔹 Category data is now derived from per-category infinite queries above

  const AlarmCard = ({ alarmTrigger }: { alarmTrigger: AlarmTriggerType }) => {
    const imgSrc = alarmTrigger.floorplanImage
      ? `${alarmTrigger.floorplanImage}`
      : alarmTrigger.floorplan?.floorplanImage
        ? `${alarmTrigger.floorplan.floorplanImage}`
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
      <Box
        onClick={() => handleOpenAlarmWithAcknowledge(alarmTrigger)}
        sx={{
          border: '1px solid #CCC',
          borderRadius: 1.5,
          p: 1,
          mb: 1,
          bgcolor: 'background.default',
          cursor: 'pointer',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            borderColor: 'primary.main',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            transform: 'translateY(-2px)',
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
            {currentPerson
              ? ''
              : alarmTrigger.visitorName
                ? `${alarmTrigger.visitorName} | `
                : `${alarmTrigger.memberName} | `}
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
    );
  };

  //Attachment

  const incidentAttachments = useMemo(() => {
    const attachments = timelineData?.incidentInfo?.attachments ?? [];

    return attachments.map((att) => ({
      id: att.id,
      fileUrl: att.fileUrl,
      fileType: att.fileType,
      mimeType: att.mimeType,
      uploadedAt: att.uploadedAt,
      uploadedBy: att.uploadedBy,
    }));
  }, [timelineData]);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeAttachment = incidentAttachments[activeIndex];

  const getCdnUrl = (url?: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `https://ble-cdn.tunnel.piranticerdasindonesia.com/${url}`;
  };
  const isImage = (att: any) =>
    att?.mimeType?.startsWith('image') || /\.(png|jpg|jpeg|gif|webp)$/i.test(att?.fileUrl || '');

  const isVideo = (att: any) =>
    att?.mimeType?.startsWith('video') || /\.(mp4|webm|ogg)$/i.test(att?.fileUrl || '');

  return (
    <Box
      p={3}
      sx={{
        height: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        minHeight: 0,
      }}
    >
      {currentPerson && (
        <Box
          display="flex"
          alignItems="flex-start"
          sx={{
            position: 'relative',
            flexShrink: 0,
            borderBottom: '1px solid #DDD',
            pb: 3,
            mb: 2,
          }}
        >
          <Tooltip title="Close person detail">
            <Button
                          sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                // backgroundColor: 'rgba(255,255,255,0.9)',
                // '&:hover': {
                //   backgroundColor: 'rgba(255,255,255,1)',
                // },
              }}
                            size="small"
                            startIcon={<ArrowBackIcon />}
                            onClick={handleClearPerson}
                          >
                            Back
                          </Button>
            {/* <IconButton
              onClick={handleClearPerson}
              size="small"
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                backgroundColor: 'rgba(255,255,255,0.9)',
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,1)',
                },
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton> */}
          </Tooltip>
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
                border: ` ${
                  'isBlacklist' in currentPerson && currentPerson.isBlacklist
                    ? '5px solid #d32f2f'
                    : '3px solid #1976d2'
                }`,
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
                    <Typography sx={value}>
                      {(currentPerson as VisitorType).districtName}
                    </Typography>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Typography sx={field}>Identity Type</Typography>
                    <Typography sx={value}>
                      {(currentPerson as VisitorType).identityType}
                    </Typography>
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
      )}

      {/* ================= ALARM TRIGGERS SECTION ================== */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 2,
          }}
        >
          <Typography variant="h5" fontWeight="bold">
            Alarm Triggered
          </Typography>

          <AlarmTriggeredFilter />
        </Box>

        {/* ================= 3 COLUMN MODE ================= */}
        {!currentPerson ? (
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              gap: 2,
              minHeight: 0,
              overflow: 'hidden',
            }}
          >
            {/* ACTIVE */}
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
              }}
            >
              <Typography variant="h6" fontWeight={700} mb={1}>
                Active Alarm ({activeAlarm.length}{hasNextActive ? '+' : ''})
              </Typography>

              <Box
                sx={{
                  flex: 1,
                  overflowY: 'auto',
                  minHeight: 0,
                  pr: 1,
                }}
              >
                {isLoadingActive
                  ? Array.from({ length: 3 }).map((_, i) => (
                      <Box key={i} sx={{ border: '1px solid #CCC', borderRadius: 1.5, p: 1, mb: 1 }}>
                        <Skeleton variant="rectangular" height={100} sx={{ mb: 1, borderRadius: 1 }} />
                        <Skeleton variant="text" width="70%" height={22} />
                        <Skeleton variant="text" width="50%" height={18} />
                      </Box>
                    ))
                  : activeAlarm.map((a) => <AlarmCard key={a.id} alarmTrigger={a} />)}
                {isFetchingNextActive &&
                  Array.from({ length: 2 }).map((_, i) => (
                    <Box key={i} sx={{ border: '1px solid #CCC', borderRadius: 1.5, p: 1, mb: 1 }}>
                      <Skeleton variant="rectangular" height={100} sx={{ mb: 1, borderRadius: 1 }} />
                      <Skeleton variant="text" width="70%" height={22} />
                    </Box>
                  ))}
                {hasNextActive && <div ref={activeRef} style={{ height: '20px' }} />}
              </Box>
            </Box>

            {/* ON GOING */}
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
              }}
            >
              <Typography variant="h6" fontWeight={700} mb={1}>
                On-Going Alarm ({onGoingAlarm.length}{hasNextOnGoing ? '+' : ''})
              </Typography>

              <Box
                sx={{
                  flex: 1,
                  overflowY: 'auto',
                  minHeight: 0,
                  pr: 1,
                }}
              >
                {isLoadingOnGoing
                  ? Array.from({ length: 3 }).map((_, i) => (
                      <Box key={i} sx={{ border: '1px solid #CCC', borderRadius: 1.5, p: 1, mb: 1 }}>
                        <Skeleton variant="rectangular" height={100} sx={{ mb: 1, borderRadius: 1 }} />
                        <Skeleton variant="text" width="70%" height={22} />
                        <Skeleton variant="text" width="50%" height={18} />
                      </Box>
                    ))
                  : onGoingAlarm.map((a) => <AlarmCard key={a.id} alarmTrigger={a} />)}
                {isFetchingNextOnGoing &&
                  Array.from({ length: 2 }).map((_, i) => (
                    <Box key={i} sx={{ border: '1px solid #CCC', borderRadius: 1.5, p: 1, mb: 1 }}>
                      <Skeleton variant="rectangular" height={100} sx={{ mb: 1, borderRadius: 1 }} />
                      <Skeleton variant="text" width="70%" height={22} />
                    </Box>
                  ))}
                {hasNextOnGoing && <div ref={onGoingRef} style={{ height: '20px' }} />}
              </Box>
            </Box>

            {/* CLEARED */}
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
              }}
            >
              <Typography variant="h6" fontWeight={700} mb={1}>
                Cleared Alarm ({clearedAlarm.length}{hasNextCleared ? '+' : ''})
              </Typography>

              <Box
                sx={{
                  flex: 1,
                  overflowY: 'auto',
                  minHeight: 0,
                  pr: 1,
                }}
              >
                {isLoadingCleared
                  ? Array.from({ length: 3 }).map((_, i) => (
                      <Box key={i} sx={{ border: '1px solid #CCC', borderRadius: 1.5, p: 1, mb: 1 }}>
                        <Skeleton variant="rectangular" height={100} sx={{ mb: 1, borderRadius: 1 }} />
                        <Skeleton variant="text" width="70%" height={22} />
                        <Skeleton variant="text" width="50%" height={18} />
                      </Box>
                    ))
                  : clearedAlarm.map((a) => <AlarmCard key={a.id} alarmTrigger={a} />)}
                {isFetchingNextCleared &&
                  Array.from({ length: 2 }).map((_, i) => (
                    <Box key={i} sx={{ border: '1px solid #CCC', borderRadius: 1.5, p: 1, mb: 1 }}>
                      <Skeleton variant="rectangular" height={100} sx={{ mb: 1, borderRadius: 1 }} />
                      <Skeleton variant="text" width="70%" height={22} />
                    </Box>
                  ))}
                {hasNextCleared && <div ref={clearedRef} style={{ height: '20px' }} />}
              </Box>
            </Box>
          </Box>
        ) : (
          /* ================= ORIGINAL GRID ================= */
          <Box
            sx={{
              flex: 1,
              overflowY: 'auto',
              minHeight: 0,
            }}
          >
            <Grid container spacing={3}>
              {alarmTriggerData.map((alarmTrigger) => (
                <Grid key={alarmTrigger.id} size={{ xs: 12, sm: 6, md: 3, lg: 2 }}>
                  <AlarmCard alarmTrigger={alarmTrigger} />
                </Grid>
              ))}
            </Grid>
          </Box>
        )}
      </Box>

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
          {/* ================= TOP SECTION ================== */}

          {isLoadingCurrentMember || isLoadingCurrentVisitor ? (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                height: 300,
              }}
            >
              <CircularProgress />
            </Box>
          ) : (
            selectedAlarmTrigger &&
            alarmCardPerson && (
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
                    src={`${BASE_URL}${alarmCardPerson.faceImage ?? ''}`}
                    sx={{
                      width: 160,
                      height: 160,
                      mb: 1,
                      border: ` ${
                        'isBlacklist' in alarmCardPerson && alarmCardPerson.isBlacklist
                          ? '5px solid #d32f2f'
                          : '3px solid #1976d2'
                      }`,
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
                    <Grid size={{ xs: 12, sm: 6, md: 6 }}>
                      <Typography sx={field}>Name</Typography>
                      <Box display="flex" gap={1}>
                        <Typography sx={value}>{alarmCardPerson.name}</Typography>
                        {/* Blacklist Chip - common for both */}
                        {'isBlacklist' in alarmCardPerson && alarmCardPerson.isBlacklist ? (
                          <Chip
                            label="Blacklisted"
                            color="error"
                            size="small"
                            sx={{ fontWeight: 700 }}
                          />
                        ) : null}
                        {/* VIP Chip - only for Visitor */}
                        {personType === 'Visitor' &&
                        'isVip' in alarmCardPerson &&
                        alarmCardPerson.isVip ? (
                          <Chip label="VIP" color="warning" size="small" sx={{ fontWeight: 700 }} />
                        ) : null}
                      </Box>
                    </Grid>

                    {'floorName' in selectedAlarmTrigger &&
                      'buildingName' in selectedAlarmTrigger && (
                        <Grid size={{ xs: 12, sm: 6, md: 6 }}>
                          <Typography sx={field}>Alarm At</Typography>
                          <Typography sx={value}>
                            {selectedAlarmTrigger?.floorName} | {selectedAlarmTrigger?.buildingName}
                          </Typography>
                        </Grid>
                      )}

                    {/* BLE Card Number - common */}
                    {'bleCardNumber' in alarmCardPerson && (
                      <Grid size={{ xs: 12, sm: 6, md: 6 }}>
                        <Typography sx={field}>BLE Card Number</Typography>
                        <Typography sx={value}>{alarmCardPerson.bleCardNumber}</Typography>
                      </Grid>
                    )}

                    {'triggerTime' in selectedAlarmTrigger && (
                      <Grid size={{ xs: 12, sm: 6, md: 6 }}>
                        <Typography sx={field}>Triggered At</Typography>
                        <Typography sx={value}>
                          {selectedAlarmTrigger?.triggerTime
                            ? formatFullDateTime(selectedAlarmTrigger.triggerTime, language === 'id' ? 'id' : 'en')
                            : '-'}
                        </Typography>
                      </Grid>
                    )}
                    {/* BLE Card Number - common */}
                    {'cardNumber' in alarmCardPerson && (
                      <Grid size={{ xs: 12, sm: 6, md: 6 }}>
                        <Typography sx={field}> Card Number</Typography>
                        <Typography sx={value}>{alarmCardPerson.cardNumber}</Typography>
                      </Grid>
                    )}
                    {'action' in selectedAlarmTrigger &&
                      'actionUpdatedAt' in selectedAlarmTrigger && (
                        <Grid size={{ xs: 12, sm: 6, md: 6 }}>
                          <Typography sx={field}>Last Action</Typography>
                          <Typography sx={value}>
                            {selectedAlarmTrigger?.action} |{' '}
                            {selectedAlarmTrigger?.actionUpdatedAt
                              ? formatFullDateTime(selectedAlarmTrigger.actionUpdatedAt, language === 'id' ? 'id' : 'en')
                              : '-'}
                          </Typography>
                        </Grid>
                      )}
                  </Grid>
                </Box>
              </Box>
            )
          )}

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
                  {/* Alarm Attachments */}
                  {incidentAttachments.length > 0 && (
                    <Box width="65%">
                      <Typography fontWeight={600} mb={1}>
                        Investigation Attachments
                      </Typography>

                      <Divider sx={{ mb: 2 }} />

                      {/* PREVIEW AREA */}
                      <Box
                        display="flex"
                        justifyContent="center"
                        alignItems="center"
                        sx={{
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 2,
                          minHeight: 260,
                          mb: 2,
                          backgroundColor: '#fafafa',
                        }}
                      >
                        {!activeAttachment && (
                          <Typography color="text.secondary">No attachment available</Typography>
                        )}

                        {activeAttachment && isImage(activeAttachment) && (
                          <Box
                            component="img"
                            src={getCdnUrl(activeAttachment.fileUrl)}
                            sx={{
                              maxWidth: '100%',
                              maxHeight: 400,
                              objectFit: 'contain',
                              borderRadius: 2,
                            }}
                          />
                        )}

                        {activeAttachment && isVideo(activeAttachment) && (
                          <Box
                            component="video"
                            src={getCdnUrl(activeAttachment.fileUrl)}
                            controls
                            sx={{
                              maxWidth: '100%',
                              maxHeight: 400,
                              borderRadius: 2,
                              backgroundColor: 'black',
                            }}
                          />
                        )}
                      </Box>

                      {/* ATTACHMENT SELECTOR */}
                      <Stack direction="row" spacing={1} justifyContent="center">
                        {incidentAttachments.map((_, idx) => (
                          <Chip
                            key={idx}
                            label={idx + 1}
                            clickable
                            color={idx === activeIndex ? 'primary' : 'default'}
                            onClick={() => setActiveIndex(idx)}
                            size="small"
                          />
                        ))}
                      </Stack>
                    </Box>
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
                {/* <CustomAutocomplete
                  label="Security Guard"
                  options={securityData || []}
                  value={selectedSecurity}
                  loading={isLoadingSecurity}
                  onChange={(newValue) => setSelectedSecurity(newValue)}
                  getOptionLabel={(option) => option?.name ?? ''}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  required
                  helperText={!selectedSecurity ? 'Please select a security guard' : undefined}
                /> */}
                <CustomAutocomplete
                  label="Security Guard"
                  multiple
                  options={sortedSecurity}
                  value={selectedSecurity}
                  loading={isLoadingSecurity}
                  // onChange={(v) => setSelectedSecurity(v)}
                  onChange={(newValue) => setSelectedSecurity(newValue ?? [])}
                  getOptionLabel={(o) => {
                    if (!o) return '';

                    const base = o.securityName;

                    if (o.proximityLevel === 'SameArea' || o.proximityLevel === 'SameFloorplan') {
                      return `${base}`;
                    }

                    return `${base} • ${o.floorName} | ${o.buildingName}`;
                  }}
                  isOptionEqualToValue={(o, v) => o.securityId === v.securityId}
                  renderOption={(props: any, option: NearestSecurityType) => {
                    const isNear =
                      option.proximityLevel === 'SameArea' ||
                      option.proximityLevel === 'SameFloorplan';

                    const label = isNear
                      ? `${option.distanceInMeters?.toFixed(3) ?? '-'} m`
                      : `${option.floorName} | ${option.buildingName}`;

                    return (
                      <li {...props} key={option.securityId}>
                        <Box
                          display="flex"
                          justifyContent="space-between"
                          alignItems="center"
                          width="100%"
                        >
                          {/* LEFT: NAME */}
                          <Box>
                            <Typography fontWeight={600}>{option.securityName}</Typography>

                            <Typography variant="caption" color="text.secondary">
                              {option.proximityLevel}
                            </Typography>
                          </Box>

                          {/* RIGHT: CHIP */}
                          <Chip
                            label={label}
                            size="small"
                            sx={{
                              backgroundColor: proximityColorMap[option.proximityLevel],
                              color: '#fff',
                              fontWeight: 600,
                            }}
                          />
                        </Box>
                      </li>
                    );
                  }}
                />
              </Box>
            </>
          )}
        </DialogContent>

        <DialogActions
          sx={{
            p: 3,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          {/* LEFT SIDE */}
          <Button
            variant="outlined"
            color="info"
            onClick={handleFetchPlayback}
            disabled={alarmPlaybackMutation.isPending}
            startIcon={
              alarmPlaybackMutation.isPending ? (
                <CircularProgress size={16} color="inherit" />
              ) : null
            }
          >
            {alarmPlaybackMutation.isPending ? 'Loading Playback...' : 'View Alarm Playback'}
          </Button>

          {/* RIGHT SIDE BUTTON GROUP */}
          <Box display="flex" gap={1}>
            <Button onClick={handleCloseActionDialog} color="error" variant="outlined">
              Close
            </Button>

            {selectedAlarmTrigger?.action.toLowerCase() === 'acknowledged' && (
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
                  disabled={!selectedSecurity.length || dispatchMutation.isPending}
                  onClick={handleDispatchAction}
                  startIcon={
                    dispatchMutation.isPending ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : null
                  }
                >
                  {dispatchMutation.isPending ? 'Dispatching...' : 'Dispatch'}
                </Button>
              </>
            )}

            {selectedAlarmTrigger?.action.toLowerCase() === 'doneinvestigated' && (
              <Button
                variant="contained"
                color="primary"
                onClick={handleResolve}
                startIcon={
                  resolveMutation.isPending ? <CircularProgress size={16} color="inherit" /> : null
                }
              >
                {resolveMutation.isPending ? 'Resolving...' : 'Resolve'}
              </Button>
            )}
          </Box>
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
      <AlarmPlaybackDialog
        open={openPlaybackDialog}
        onClose={() => setOpenPlaybackDialog(false)}
        data={playbackData}
      />
    </Box>
  );
};

export default AlarmContent;
