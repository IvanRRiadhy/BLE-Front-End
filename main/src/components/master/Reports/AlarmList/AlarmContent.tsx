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
  InputAdornment,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  TablePagination,
  TableSortLabel,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import BoltIcon from '@mui/icons-material/Bolt';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import PersonIcon from '@mui/icons-material/Person';
import RefreshIcon from '@mui/icons-material/Refresh';
import axiosServices, { BASE_URL } from 'src/utils/axios';
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
import AlarmTriggeredFilter, { TIME_RANGE_OPTIONS } from './AlarmFilter';
import { useMemberByID } from 'src/hooks/useMember';
import { useVisitorByID } from 'src/hooks/useVisitor';
import { useProfile } from 'src/hooks/useProfile';
import { useCoPresenceInvestigation, CoPresentPerson } from 'src/hooks/useInvestigate';
import { useAllMaskedAreas } from 'src/hooks/useMaskedArea';
import { safeParseAreaShape } from 'src/utils/isJsonObject';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
dayjs.extend(duration);

const proximityColorMap: Record<string, string> = {
  SameArea: '#4caf50', // green
  SameFloorplan: '#2196f3', // blue
  SameFloor: '#ff9800', // orange
  SameBuilding: '#9c27b0', // purple
  DifferentBuilding: '#9e9e9e', // grey
};

const DEFAULT_ACTIVE_ACTIONS = ['Idle', 'Acknowledged', 'Acknowledge', 'Waiting'];
const DEFAULT_ONGOING_ACTIONS = ['Dispatched', 'Accepted', 'Arrived', 'Investigated', 'PostponeInvestigated'];
const DEFAULT_CLEARED_ACTIONS = [ 'Done', 'DoneInvestigated', 'NoAction'];

const AlarmContent = () => {
  const queryClient = useQueryClient();
  const dispatch: AppDispatch = useDispatch();
  const language = useSelector((state: RootState) => state.settings.isLanguage);
  const { data: profile } = useProfile();
  const canAlarmAction = Boolean(profile?.effectiveCanAlarmAction);
  
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

  // Determine which person to display based on selectedIntruder
  const [currentPerson, setCurrentPerson] = useState<VisitorType | memberType | null>(null);
  const [personType, setPersonType] = useState<'Visitor' | 'Member' | null>(null);
  const [personId, setPersonId] = useState<string | null>(null);

  // Search by Incident Code
  const [searchIncidentCode, setSearchIncidentCode] = useState('');
  const [isSearchingIncident, setIsSearchingIncident] = useState(false);
  const [searchResults, setSearchResults] = useState<AlarmTriggerType[] | null>(null);

  const handleClearIncidentSearch = () => {
    setSearchIncidentCode('');
    setSearchResults(null);
  };

  // 🔹 Per-category infinite queries
  const baseFilter = alarmTriggerFilter;

  const selectedActions = useMemo(() => {
    return (baseFilter.filters?.action || []).filter(Boolean);
  }, [baseFilter.filters?.action]);

  const hasActionFilter = selectedActions.length > 0;

  const activeActionsToQuery = useMemo(() => {
    if (!hasActionFilter) return ['Idle', 'Acknowledged'];
    return selectedActions.filter((act) =>
      DEFAULT_ACTIVE_ACTIONS.some((a) => a.toLowerCase() === act.toLowerCase()),
    );
  }, [hasActionFilter, selectedActions]);

  const onGoingActionsToQuery = useMemo(() => {
    if (!hasActionFilter) return ['Dispatched', 'Accepted', 'PostponeInvestigated'];
    return selectedActions.filter((act) =>
      DEFAULT_ONGOING_ACTIONS.some((a) => a.toLowerCase() === act.toLowerCase()),
    );
  }, [hasActionFilter, selectedActions]);

  const clearedActionsToQuery = useMemo(() => {
    if (!hasActionFilter) return undefined;
    return selectedActions.filter((act) =>
      DEFAULT_CLEARED_ACTIONS.some((a) => a.toLowerCase() === act.toLowerCase()),
    );
  }, [hasActionFilter, selectedActions]);

  // Brief active filter badges for the header
  const activeFilterBadges = useMemo(() => {
    const badges: { label: string; value: string }[] = [];
    const currentTimeRange = baseFilter.filters?.timeRange ?? baseFilter.timeRange;
    if (currentTimeRange !== undefined) {
      if (currentTimeRange === null || currentTimeRange === 'all') {
        badges.push({ label: 'Time', value: 'Show All' });
      } else {
        const match = TIME_RANGE_OPTIONS.find((opt) => opt.value === currentTimeRange);
        badges.push({ label: 'Time', value: match ? match.label : currentTimeRange });
      }
    }

    if (baseFilter.filters?.alarm && baseFilter.filters.alarm.length > 0) {
      badges.push({
        label: 'Category',
        value:
          baseFilter.filters.alarm.length === 1
            ? baseFilter.filters.alarm[0]
            : `${baseFilter.filters.alarm.length} selected`,
      });
    }

    if (baseFilter.filters?.action && baseFilter.filters.action.length > 0) {
      badges.push({
        label: 'Action',
        value:
          baseFilter.filters.action.length === 1
            ? baseFilter.filters.action[0]
            : `${baseFilter.filters.action.length} selected`,
      });
    }

    if (baseFilter.filters?.floorId && baseFilter.filters.floorId.length > 0) {
      badges.push({
        label: 'Floor',
        value: `${baseFilter.filters.floorId.length} selected`,
      });
    }

    return badges;
  }, [baseFilter]);

  const isViewingPerson = Boolean(currentPerson);

  const enableActive = !isViewingPerson && (!hasActionFilter || activeActionsToQuery.length > 0);
  const enableOnGoing = !isViewingPerson && (!hasActionFilter || onGoingActionsToQuery.length > 0);
  const enableCleared =
    !isViewingPerson &&
    (!hasActionFilter || (clearedActionsToQuery !== undefined && clearedActionsToQuery.length > 0));

  const {
    data: activeData,
    isLoading: isLoadingActive,
    hasNextPage: hasNextActive,
    fetchNextPage: fetchNextActive,
    isFetchingNextPage: isFetchingNextActive,
    refetch: refetchActive,
    isFetching: isFetchingActive,
  } = useInfiniteAlarmTriggerList(
    {
      ...baseFilter,
      filters: {
        ...baseFilter.filters,
        isActive: true,
        action: activeActionsToQuery.length > 0 ? activeActionsToQuery : ['__NO_MATCH__'],
      },
    },
    50,
    { enabled: enableActive },
  );

  const {
    data: onGoingData,
    isLoading: isLoadingOnGoing,
    hasNextPage: hasNextOnGoing,
    fetchNextPage: fetchNextOnGoing,
    isFetchingNextPage: isFetchingNextOnGoing,
    refetch: refetchOnGoing,
    isFetching: isFetchingOnGoing,
  } = useInfiniteAlarmTriggerList(
    {
      ...baseFilter,
      filters: {
        ...baseFilter.filters,
        isActive: true,
        action: onGoingActionsToQuery.length > 0 ? onGoingActionsToQuery : ['__NO_MATCH__'],
      },
    },
    50,
    { enabled: enableOnGoing },
  );

  const {
    data: clearedData,
    isLoading: isLoadingCleared,
    hasNextPage: hasNextCleared,
    fetchNextPage: fetchNextCleared,
    isFetchingNextPage: isFetchingNextCleared,
    refetch: refetchCleared,
    isFetching: isFetchingCleared,
  } = useInfiniteAlarmTriggerList(
    {
      ...baseFilter,
      filters: {
        ...baseFilter.filters,
        includeUnresolved: false,
        isActive: false,
        action:
          clearedActionsToQuery && clearedActionsToQuery.length > 0
            ? clearedActionsToQuery
            : hasActionFilter
              ? ['__NO_MATCH__']
              : undefined,
      },
    },
    50,
    { enabled: enableCleared },
  );

  // 🔹 Dedicated infinite query when viewing a specific person (no active/non-active restriction)
  const {
    data: personData,
    isLoading: isLoadingPerson,
    hasNextPage: hasNextPerson,
    fetchNextPage: fetchNextPerson,
    isFetchingNextPage: isFetchingNextPerson,
    refetch: refetchPerson,
    isFetching: isFetchingPerson,
  } = useInfiniteAlarmTriggerList(
    {
      ...baseFilter,
      // Keep filters intact without forcing isActive: true or isActive: false
    },
    50,
    { enabled: isViewingPerson },
  );

  const isRefreshing =
    isFetchingActive || isFetchingOnGoing || isFetchingCleared || isFetchingPerson;

  const handleRefresh = async () => {
    setSearchResults(null);
    setSearchIncidentCode('');
    await queryClient.invalidateQueries({ queryKey: ['alarmTrigger-list-infinite'] });
    if (isViewingPerson) {
      refetchPerson();
    } else {
      refetchActive();
      refetchOnGoing();
      refetchCleared();
    }
  };

  // 🔹 Intersection observers per category column + person view
  const { ref: activeRef, inView: activeInView } = useInView();
  const { ref: onGoingRef, inView: onGoingInView } = useInView();
  const { ref: clearedRef, inView: clearedInView } = useInView();
  const { ref: personRef, inView: personInView } = useInView();

  useEffect(() => {
    if (activeInView && hasNextActive && !isFetchingNextActive) fetchNextActive();
  }, [activeInView, hasNextActive, isFetchingNextActive, fetchNextActive]);

  useEffect(() => {
    if (onGoingInView && hasNextOnGoing && !isFetchingNextOnGoing) fetchNextOnGoing();
  }, [onGoingInView, hasNextOnGoing, isFetchingNextOnGoing, fetchNextOnGoing]);

  useEffect(() => {
    if (clearedInView && hasNextCleared && !isFetchingNextCleared) fetchNextCleared();
  }, [clearedInView, hasNextCleared, isFetchingNextCleared, fetchNextCleared]);

  useEffect(() => {
    if (personInView && hasNextPerson && !isFetchingNextPerson) fetchNextPerson();
  }, [personInView, hasNextPerson, isFetchingNextPerson, fetchNextPerson]);

  // 🔹 Flat arrays per category (use searchResults when incident search is active)
  const activeAlarm = useMemo(() => {
    if (searchResults !== null) {
      return searchResults.filter((item) => {
        if (!item.isActive) return false;
        const act = (item.action || '').toLowerCase();
        return DEFAULT_ACTIVE_ACTIONS.some((a) => a.toLowerCase() === act);
      });
    }
    return activeData?.pages.flatMap((p) => p.data) ?? [];
  }, [searchResults, activeData]);

  const onGoingAlarm = useMemo(() => {
    if (searchResults !== null) {
      return searchResults.filter((item) => {
        if (!item.isActive) return false;
        const act = (item.action || '').toLowerCase();
        return DEFAULT_ONGOING_ACTIONS.some((a) => a.toLowerCase() === act);
      });
    }
    return onGoingData?.pages.flatMap((p) => p.data) ?? [];
  }, [searchResults, onGoingData]);

  const clearedAlarm = useMemo(() => {
    if (searchResults !== null) {
      return searchResults.filter((item) => {
        if (item.isActive) return false;
        const act = (item.action || '').toLowerCase();
        return DEFAULT_CLEARED_ACTIONS.some((a) => a.toLowerCase() === act);
      });
    }
    return clearedData?.pages.flatMap((p) => p.data) ?? [];
  }, [searchResults, clearedData]);

  const personAlarm = useMemo(() => {
    if (searchResults !== null) {
      return searchResults;
    }
    return personData?.pages.flatMap((p) => p.data) ?? [];
  }, [searchResults, personData]);

  // 🔹 Total filtered counts from API or search results
  const activeCount = searchResults !== null ? activeAlarm.length : (activeData?.pages?.[0]?.recordsFiltered ?? activeAlarm.length);
  const onGoingCount = searchResults !== null ? onGoingAlarm.length : (onGoingData?.pages?.[0]?.recordsFiltered ?? onGoingAlarm.length);
  const clearedCount = searchResults !== null ? clearedAlarm.length : (clearedData?.pages?.[0]?.recordsFiltered ?? clearedAlarm.length);
  const personCount = searchResults !== null ? personAlarm.length : (personData?.pages?.[0]?.recordsFiltered ?? personAlarm.length);

  // Combined for auto-select from URL param or general usage
  const alarmTriggerData = isViewingPerson
    ? personAlarm
    : [...activeAlarm, ...onGoingAlarm, ...clearedAlarm];

  const { data: securityData = [], isLoading: isLoadingSecurity } = useAllSecurityLookup();
  // const [selectedSecurity, setSelectedSecurity] = useState<memberType | null>(null);

  // const [alarmTimeline, setAlarmTimeline] = useState<AlarmTimelineType | null>(null);

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
            Start: 0,
            filters: {
              ...alarmTriggerFilter.filters,
              visitorId: [selectedVisitor.id],
              memberId: undefined,
              isActive: undefined,
            },
          }),
        );
      } else if (type === 'Member' && selectedMember) {
        setCurrentPerson(selectedMember);
        // Update filter for member
        dispatch(
          UpdateFilter({
            ...alarmTriggerFilter,
            Start: 0,
            filters: {
              ...alarmTriggerFilter.filters,
              memberId: [selectedMember.id],
              visitorId: undefined,
              isActive: undefined,
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
      handleRefresh();
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

  // ==========================================
  // 🔍 CO-PRESENCE / COMPLIANCE INVESTIGATION
  // ==========================================
  const { data: allMaskedAreas = [] } = useAllMaskedAreas();

  // Helper: check if a point is within a polygon
  const isPointInAreaPolygon = (px: number, py: number, nodes: any[]): boolean => {
    if (!nodes || nodes.length < 3) return false;
    let inside = false;
    for (let i = 0, j = nodes.length - 1; i < nodes.length; j = i++) {
      const xi = nodes[i].x_px ?? nodes[i].x ?? 0;
      const yi = nodes[i].y_px ?? nodes[i].y ?? 0;
      const xj = nodes[j].x_px ?? nodes[j].x ?? 0;
      const yj = nodes[j].y_px ?? nodes[j].y ?? 0;
      const intersect = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  };

  // Derive target areaId for co-presence from selectedAlarmTrigger
  const complianceAreaId = useMemo(() => {
    if (!selectedAlarmTrigger) return null;
    const a = selectedAlarmTrigger as any;
    if (a.areaId) return a.areaId;
    if (a.floorplanmaskedAreaId) return a.floorplanmaskedAreaId;
    if (a.floorplanMaskedAreaId) return a.floorplanMaskedAreaId;
    if (a.area?.id) return a.area.id;

    // Match by areaName
    const areaName = a.areaName || a.area;
    if (areaName && typeof areaName === 'string' && areaName !== '-') {
      const trimmed = areaName.trim().toLowerCase();
      const matched = allMaskedAreas.find(
        (m: any) =>
          m.name?.trim().toLowerCase() === trimmed ||
          m.areaName?.trim().toLowerCase() === trimmed ||
          m.maskedAreaName?.trim().toLowerCase() === trimmed
      );
      if (matched?.id) return matched.id;
    }

    // Match by floorplan and coordinates (posX, posY)
    if (a.floorplanId && a.posX != null && a.posY != null && allMaskedAreas.length > 0) {
      const floorAreas = allMaskedAreas.filter((m: any) => m.floorplanId === a.floorplanId);
      for (const area of floorAreas) {
        let nodes = area.nodes;
        if (!nodes || nodes.length === 0) {
          nodes = safeParseAreaShape(area.areaShape);
        }
        if (nodes && nodes.length >= 3 && isPointInAreaPolygon(a.posX, a.posY, nodes)) {
          return area.id;
        }
      }
      if (floorAreas.length > 0) return floorAreas[0].id;
    }

    return null;
  }, [selectedAlarmTrigger, allMaskedAreas]);

  // Derive target personId for co-presence
  const compliancePersonId = useMemo(() => {
    if (!selectedAlarmTrigger) return null;
    return (
      personId ||
      selectedAlarmTrigger.visitorId ||
      selectedAlarmTrigger.memberId ||
      (selectedAlarmTrigger as any).personId ||
      null
    );
  }, [selectedAlarmTrigger, personId]);

  // Compute time range & dates matching the alarm trigger time
  const { complianceTimeRange, complianceFrom, complianceTo } = useMemo(() => {
    const rawTime =
      selectedAlarmTrigger?.triggerTime ||
      (selectedAlarmTrigger as any)?.triggeredTime ||
      (selectedAlarmTrigger as any)?.timestamp;
    if (rawTime) {
      const alarmDate = dayjs(rawTime);
      if (alarmDate.isValid()) {
        const isToday = alarmDate.isSame(dayjs(), 'day');
        if (!isToday) {
          const dateStr = alarmDate.format('YYYY-MM-DD');
          return {
            complianceTimeRange: 'custom',
            complianceFrom: dateStr,
            complianceTo: dateStr,
          };
        }
      }
    }
    return {
      complianceTimeRange: 'daily',
      complianceFrom: null,
      complianceTo: null,
    };
  }, [selectedAlarmTrigger]);

  // Query Co-Presence Compliance when action dialog is open and alarm is selected
  const {
    data: complianceData,
    isLoading: isComplianceLoading,
  } = useCoPresenceInvestigation(
    {
      personId: compliancePersonId,
      areaId: complianceAreaId,
      from: complianceFrom,
      to: complianceTo,
      timeRange: complianceTimeRange,
      timezone: 'Asia/Jakarta',
    },
    Boolean(openActionDialog && compliancePersonId && complianceAreaId)
  );

  // Compliance Table Search, Sort, Filter, & Pagination state
  const [complianceSearch, setComplianceSearch] = useState('');
  const [complianceFilterStatus, setComplianceFilterStatus] = useState<'ALL' | 'TOGETHER' | 'SEPARATED'>('ALL');
  const [complianceOrderBy, setComplianceOrderBy] = useState<string>('duration');
  const [complianceOrder, setComplianceOrder] = useState<'asc' | 'desc'>('desc');
  const [compliancePage, setCompliancePage] = useState(0);
  const [complianceRowsPerPage, setComplianceRowsPerPage] = useState(5);

  const filteredSortedCompliancePeople = useMemo(() => {
    let list: CoPresentPerson[] = [...(complianceData?.coPresentPeople || [])];

    // Search filter
    if (complianceSearch.trim()) {
      const q = complianceSearch.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.personName?.toLowerCase().includes(q) ||
          p.department?.toLowerCase().includes(q) ||
          p.personType?.toLowerCase().includes(q) ||
          p.cardNumber?.toLowerCase().includes(q)
      );
    }

    // Status filter
    if (complianceFilterStatus === 'TOGETHER') {
      list = list.filter((p) => p.isCurrentlyTogether);
    } else if (complianceFilterStatus === 'SEPARATED') {
      list = list.filter((p) => !p.isCurrentlyTogether);
    }

    // Sorting
    list.sort((a, b) => {
      let aVal: any = 0;
      let bVal: any = 0;
      if (complianceOrderBy === 'name') {
        aVal = a.personName || '';
        bVal = b.personName || '';
        return complianceOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      } else if (complianceOrderBy === 'type') {
        aVal = a.personType || '';
        bVal = b.personType || '';
        return complianceOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      } else if (complianceOrderBy === 'interactions') {
        aVal = a.interactionCount || 0;
        bVal = b.interactionCount || 0;
      } else if (complianceOrderBy === 'duration') {
        aVal = a.totalSharedDurationMinutes || 0;
        bVal = b.totalSharedDurationMinutes || 0;
      } else if (complianceOrderBy === 'status') {
        aVal = a.isCurrentlyTogether ? 1 : 0;
        bVal = b.isCurrentlyTogether ? 1 : 0;
      }
      return complianceOrder === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
    });

    return list;
  }, [
    complianceData?.coPresentPeople,
    complianceSearch,
    complianceFilterStatus,
    complianceOrderBy,
    complianceOrder,
  ]);

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
    // ✅ Only call API if action is "Idle" and user has effectiveCanAlarmAction permission
    if (!canAlarmAction || alarm.action?.toLowerCase() !== 'idle') {
      console.log('Bypassing acknowledge or Not IDLE', { canAlarmAction, alarm });
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
      handleRefresh();
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
      handleRefresh();
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

  const handleSearchIncidentCode = async (codeToSearch?: string) => {
    const code = (codeToSearch ?? searchIncidentCode).trim();
    if (!code) {
      toast.error('Please enter an Incident Code to search');
      return;
    }

    try {
      setIsSearchingIncident(true);
      const res = await axiosServices.post('/api/AlarmTriggers/filter', {
        Draw: 1,
        Start: 0,
        Length: 50,
        SortColumn: 'TriggerTime',
        SortDir: 'desc',
        SearchValue: code,
        filters: {},
        dateFilters: {},
      });

      const items: AlarmTriggerType[] = res.data?.collection?.data ?? [];

      if (items.length === 0) {
        toast.error(`No alarm found for incident code: "${code}"`);
        setSearchResults(null);
        return;
      }

      // If exactly 1 item returned, open action dialog directly
      if (items.length === 1) {
        setSearchResults(null);
        await handleOpenAlarmWithAcknowledge(items[0]);
      } else {
        // If multiple items returned, store them in searchResults to display in their respective category columns
        setSearchResults(items);
        toast.success(`Found ${items.length} alarms matching "${code}"`);
      }
    } catch (err) {
      console.error('Failed to search incident code:', err);
      toast.error('Error searching incident code');
    } finally {
      setIsSearchingIncident(false);
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
                loading="lazy"
                decoding="async"
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

        {/* Incident Code */}
        {alarmTrigger.incidentCode && (
          <Typography fontWeight={600} fontSize="0.75rem" color="primary.main">
            {alarmTrigger.incidentCode}
          </Typography>
        )}

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
    return `https://ble-cdn.app.bio-experience.com${url}`;
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
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="h5" fontWeight="bold">
              Alarm Triggered {isViewingPerson ? `(${personCount})` : ''}
            </Typography>
            <Tooltip title="Refresh Alarm Data">
              <IconButton
                onClick={handleRefresh}
                disabled={isRefreshing}
                size="small"
                color="primary"
              >
                <RefreshIcon
                  fontSize="small"
                  sx={{
                    animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
                    '@keyframes spin': {
                      '0%': { transform: 'rotate(0deg)' },
                      '100%': { transform: 'rotate(360deg)' },
                    },
                  }}
                />
              </IconButton>
            </Tooltip>
          </Stack>

          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="nowrap">
            {/* Brief active filters summary chips */}
            {activeFilterBadges.length > 0 && (
              <Stack
                direction="row"
                spacing={0.75}
                alignItems="center"
                sx={{
                  display: { xs: 'none', lg: 'flex' },
                  maxWidth: { lg: 320, xl: 450 },
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {activeFilterBadges.map((badge, idx) => (
                  <Chip
                    key={idx}
                    label={`${badge.label}: ${badge.value}`}
                    size="small"
                    variant="outlined"
                    color="primary"
                    sx={{
                      fontSize: '0.72rem',
                      height: 24,
                      borderColor: 'primary.light',
                      bgcolor: (theme) =>
                        theme.palette.mode === 'dark' ? 'rgba(93, 135, 255, 0.12)' : 'primary.light',
                      color: 'primary.main',
                      fontWeight: 600,
                    }}
                  />
                ))}
              </Stack>
            )}

            <TextField
              size="small"
              placeholder="Search Incident Code (e.g. INC-...)"
              value={searchIncidentCode}
              onChange={(e) => {
                setSearchIncidentCode(e.target.value);
                if (!e.target.value.trim() && searchResults !== null) {
                  setSearchResults(null);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSearchIncidentCode();
                }
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    {isSearchingIncident ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : (
                      <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                    )}
                  </InputAdornment>
                ),
                endAdornment: (searchIncidentCode || searchResults !== null) ? (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={handleClearIncidentSearch}
                      sx={{ p: 0.5 }}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : null,
                sx: {
                  height: 36,
                  fontSize: '0.85rem',
                  bgcolor: 'background.paper',
                  width: { xs: 180, sm: 240, md: 280 },
                },
              }}
            />
            <Button
              variant="contained"
              size="small"
              onClick={() => handleSearchIncidentCode()}
              disabled={isSearchingIncident || !searchIncidentCode.trim()}
              sx={{ height: 36, px: 2 }}
            >
              Search
            </Button>
            {searchResults !== null && (
              <Button
                variant="outlined"
                color="secondary"
                size="small"
                onClick={handleClearIncidentSearch}
                sx={{ height: 36, px: 1.5 }}
              >
                Clear Search
              </Button>
            )}
            <AlarmTriggeredFilter />
          </Stack>
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
                Active Alarm ({activeCount})
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
                {hasNextActive && searchResults === null && <div ref={activeRef} style={{ height: '20px' }} />}
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
                On-Going Alarm ({onGoingCount})
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
                {isFetchingNextOnGoing && searchResults === null &&
                  Array.from({ length: 2 }).map((_, i) => (
                    <Box key={i} sx={{ border: '1px solid #CCC', borderRadius: 1.5, p: 1, mb: 1 }}>
                      <Skeleton variant="rectangular" height={100} sx={{ mb: 1, borderRadius: 1 }} />
                      <Skeleton variant="text" width="70%" height={22} />
                    </Box>
                  ))}
                {hasNextOnGoing && searchResults === null && <div ref={onGoingRef} style={{ height: '20px' }} />}
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
                Cleared Alarm ({clearedCount})
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
                {isFetchingNextCleared && searchResults === null &&
                  Array.from({ length: 2 }).map((_, i) => (
                    <Box key={i} sx={{ border: '1px solid #CCC', borderRadius: 1.5, p: 1, mb: 1 }}>
                      <Skeleton variant="rectangular" height={100} sx={{ mb: 1, borderRadius: 1 }} />
                      <Skeleton variant="text" width="70%" height={22} />
                    </Box>
                  ))}
                {hasNextCleared && searchResults === null && <div ref={clearedRef} style={{ height: '20px' }} />}
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
            {isLoadingPerson && personAlarm.length === 0 ? (
              <Grid container spacing={3}>
                {Array.from({ length: 12 }).map((_, i) => (
                  <Grid key={i} size={{ xs: 12, sm: 6, md: 3, lg: 2 }}>
                    <Box sx={{ border: '1px solid #CCC', borderRadius: 1.5, p: 1, mb: 1 }}>
                      <Skeleton variant="rectangular" height={100} sx={{ mb: 1, borderRadius: 1 }} />
                      <Skeleton variant="text" width="70%" height={22} />
                      <Skeleton variant="text" width="50%" height={18} />
                    </Box>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <>
                <Grid container spacing={3}>
                  {alarmTriggerData.map((alarmTrigger) => (
                    <Grid key={alarmTrigger.id} size={{ xs: 12, sm: 6, md: 3, lg: 2 }}>
                      <AlarmCard alarmTrigger={alarmTrigger} />
                    </Grid>
                  ))}
                  {isFetchingNextPerson &&
                    Array.from({ length: 6 }).map((_, i) => (
                      <Grid key={`fetch-skeleton-${i}`} size={{ xs: 12, sm: 6, md: 3, lg: 2 }}>
                        <Box sx={{ border: '1px solid #CCC', borderRadius: 1.5, p: 1, mb: 1 }}>
                          <Skeleton variant="rectangular" height={100} sx={{ mb: 1, borderRadius: 1 }} />
                          <Skeleton variant="text" width="70%" height={22} />
                          <Skeleton variant="text" width="50%" height={18} />
                        </Box>
                      </Grid>
                    ))}
                </Grid>
                {hasNextPerson && searchResults === null && <div ref={personRef} style={{ height: '20px' }} />}
              </>
            )}
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
          <Box display="flex" alignItems="center" gap={1.5}>
            <Typography variant="h4" fontWeight={700}>
              Alarm Detail
            </Typography>
            {selectedAlarmTrigger?.incidentCode && (
              <Chip
                label={selectedAlarmTrigger.incidentCode}
                size="small"
                variant="outlined"
                color="primary"
                sx={{ fontWeight: 600 }}
              />
            )}
          </Box>

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

                    {'incidentCode' in selectedAlarmTrigger && selectedAlarmTrigger?.incidentCode && (
                      <Grid size={{ xs: 12, sm: 6, md: 6 }}>
                        <Typography sx={field}>Incident Code</Typography>
                        <Typography sx={value}>{selectedAlarmTrigger.incidentCode}</Typography>
                      </Grid>
                    )}

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
                    <Box width="65%" mt={3}>
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

          {/* ================= COMPLIANCE & CO-PRESENCE SECTION ================== */}
          <Box sx={{ my: 2.5 }}>
            <Box
              sx={{
                bgcolor: '#F0FDF4',
                border: '1px solid #BBF7D0',
                borderRadius: '12px',
                p: 2,
                mb: 2,
              }}
            >
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                gap={1.5}
              >
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: '10px',
                      bgcolor: '#DCFCE7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#16A34A',
                    }}
                  >
                    <ShieldOutlinedIcon sx={{ fontSize: 24 }} />
                  </Box>
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="subtitle1" fontWeight={700} color="#15803D">
                        Area Compliance & Co-Presence
                      </Typography>
                      {complianceData?.targetArea?.isRestricted !== undefined && (
                        <Chip
                          label={complianceData.targetArea.isRestricted ? 'Restricted' : 'Non-Restricted'}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: '10px',
                            fontWeight: 700,
                            bgcolor: complianceData.targetArea.isRestricted ? '#FEE2E2' : '#E0E7FF',
                            color: complianceData.targetArea.isRestricted ? '#DC2626' : '#4338CA',
                          }}
                        />
                      )}
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      Target Area:{' '}
                      <strong>
                        {complianceData?.targetArea?.areaName ||
                          (selectedAlarmTrigger as any)?.areaName ||
                          (selectedAlarmTrigger as any)?.area ||
                          selectedAlarmTrigger?.floorName ||
                          '-'}
                      </strong>
                      {complianceData?.targetArea?.buildingName ? ` • ${complianceData.targetArea.buildingName}` : ''}
                      {complianceData?.targetArea?.floorName ? ` (${complianceData.targetArea.floorName})` : ''}
                    </Typography>
                  </Box>
                </Stack>

                <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Total Co-Present People
                  </Typography>
                  <Typography variant="h5" fontWeight={700} color="#15803D">
                    {complianceData?.totalCoPresentPeople ?? complianceData?.coPresentPeople?.length ?? 0}
                  </Typography>
                </Box>
              </Stack>

              {/* Authorized Access Groups */}
              {complianceData?.targetArea?.authorizedAccessGroups &&
                complianceData.targetArea.authorizedAccessGroups.length > 0 && (
                  <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px dashed #BBF7D0' }}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: 'block', mb: 0.75, fontWeight: 600 }}
                    >
                      Authorized Access Groups:
                    </Typography>
                    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap gap={0.75}>
                      {complianceData.targetArea.authorizedAccessGroups.map((grp: any, idx: number) => (
                        <Chip
                          key={grp.cardAccessId || idx}
                          label={grp.accessName}
                          size="small"
                          variant="outlined"
                          sx={{
                            fontSize: '11px',
                            fontWeight: 500,
                            borderColor: '#86EFAC',
                            bgcolor: '#FFFFFF',
                            color: '#166534',
                          }}
                        />
                      ))}
                    </Stack>
                  </Box>
                )}
            </Box>

            {/* Filter, Search, and Status Buttons Bar */}
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.5}
              alignItems="center"
              justifyContent="space-between"
              mb={1.5}
            >
              <TextField
                size="small"
                fullWidth
                placeholder="Search co-present people by name, department, or card number..."
                value={complianceSearch}
                onChange={(e) => {
                  setComplianceSearch(e.target.value);
                  setCompliancePage(0);
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                  endAdornment: complianceSearch ? (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setComplianceSearch('')}>
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ) : undefined,
                }}
                sx={{
                  maxWidth: { sm: 400 },
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                    fontSize: '13px',
                  },
                }}
              />

              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  Status:
                </Typography>
                {(['ALL', 'TOGETHER', 'SEPARATED'] as const).map((st) => {
                  const tooltipText =
                    st === 'TOGETHER'
                      ? 'Currently located in the same area alongside this person'
                      : st === 'SEPARATED'
                      ? 'No longer in the same area; co-presence occurred earlier in this session'
                      : 'Show all co-present individuals';

                  return (
                    <Tooltip key={st} title={tooltipText} arrow placement="top">
                      <Chip
                        label={st === 'ALL' ? 'All' : st === 'TOGETHER' ? 'Together' : 'Separated'}
                        size="small"
                        clickable
                        color={complianceFilterStatus === st ? 'primary' : 'default'}
                        variant={complianceFilterStatus === st ? 'filled' : 'outlined'}
                        onClick={() => {
                          setComplianceFilterStatus(st);
                          setCompliancePage(0);
                        }}
                        sx={{ fontWeight: 600, fontSize: '11px', height: 26 }}
                      />
                    </Tooltip>
                  );
                })}
              </Stack>
            </Stack>

            {/* Compliance Table */}
            <TableContainer
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: '12px',
                bgcolor: '#ffffff',
                maxHeight: 380,
              }}
            >
              {isComplianceLoading ? (
                <Stack alignItems="center" justifyContent="center" py={5} spacing={1}>
                  <CircularProgress size={28} />
                  <Typography variant="caption" color="text.secondary">
                    Loading compliance co-presence data...
                  </Typography>
                </Stack>
              ) : !compliancePersonId || !complianceAreaId ? (
                <Stack alignItems="center" justifyContent="center" py={4} spacing={1}>
                  <GroupOutlinedIcon sx={{ fontSize: 32, color: 'text.disabled' }} />
                  <Typography variant="body2" color="text.secondary">
                    Person ID or Area ID not available for co-presence investigation
                  </Typography>
                </Stack>
              ) : filteredSortedCompliancePeople.length === 0 ? (
                <Stack alignItems="center" justifyContent="center" py={4} spacing={1}>
                  <GroupOutlinedIcon sx={{ fontSize: 32, color: 'text.disabled' }} />
                  <Typography variant="body2" color="text.secondary">
                    {complianceSearch || complianceFilterStatus !== 'ALL'
                      ? 'No co-present people matched the filter criteria'
                      : 'No co-present occupants recorded in this area'}
                  </Typography>
                </Stack>
              ) : (
                <Table size="small" stickyHeader aria-label="compliance co-present table">
                  <TableHead>
                    <TableRow sx={{ '& th': { bgcolor: '#F8FAFC', fontWeight: 700, fontSize: '12px' } }}>
                      <TableCell>
                        <TableSortLabel
                          active={complianceOrderBy === 'name'}
                          direction={complianceOrderBy === 'name' ? complianceOrder : 'asc'}
                          onClick={() => {
                            const isAsc = complianceOrderBy === 'name' && complianceOrder === 'asc';
                            setComplianceOrder(isAsc ? 'desc' : 'asc');
                            setComplianceOrderBy('name');
                          }}
                        >
                          Person
                        </TableSortLabel>
                      </TableCell>
                      <TableCell>
                        <TableSortLabel
                          active={complianceOrderBy === 'type'}
                          direction={complianceOrderBy === 'type' ? complianceOrder : 'asc'}
                          onClick={() => {
                            const isAsc = complianceOrderBy === 'type' && complianceOrder === 'asc';
                            setComplianceOrder(isAsc ? 'desc' : 'asc');
                            setComplianceOrderBy('type');
                          }}
                        >
                          Type / Department
                        </TableSortLabel>
                      </TableCell>
                      <TableCell align="center">
                        <TableSortLabel
                          active={complianceOrderBy === 'interactions'}
                          direction={complianceOrderBy === 'interactions' ? complianceOrder : 'asc'}
                          onClick={() => {
                            const isAsc = complianceOrderBy === 'interactions' && complianceOrder === 'asc';
                            setComplianceOrder(isAsc ? 'desc' : 'asc');
                            setComplianceOrderBy('interactions');
                          }}
                        >
                          Interactions
                        </TableSortLabel>
                      </TableCell>
                      <TableCell align="right">
                        <TableSortLabel
                          active={complianceOrderBy === 'duration'}
                          direction={complianceOrderBy === 'duration' ? complianceOrder : 'asc'}
                          onClick={() => {
                            const isAsc = complianceOrderBy === 'duration' && complianceOrder === 'asc';
                            setComplianceOrder(isAsc ? 'desc' : 'asc');
                            setComplianceOrderBy('duration');
                          }}
                        >
                          Shared Duration
                        </TableSortLabel>
                      </TableCell>
                      <TableCell align="center">
                        <TableSortLabel
                          active={complianceOrderBy === 'status'}
                          direction={complianceOrderBy === 'status' ? complianceOrder : 'asc'}
                          onClick={() => {
                            const isAsc = complianceOrderBy === 'status' && complianceOrder === 'asc';
                            setComplianceOrder(isAsc ? 'desc' : 'asc');
                            setComplianceOrderBy('status');
                          }}
                        >
                          Status
                        </TableSortLabel>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredSortedCompliancePeople
                      .slice(
                        compliancePage * complianceRowsPerPage,
                        compliancePage * complianceRowsPerPage + complianceRowsPerPage
                      )
                      .map((person) => {
                        const avatarSrc = person.faceImage
                          ? person.faceImage.startsWith('http')
                            ? person.faceImage
                            : `${BASE_URL}${person.faceImage.startsWith('/') ? '' : '/'}${person.faceImage}`
                          : undefined;

                        return (
                          <TableRow key={person.personId} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                            <TableCell>
                              <Stack direction="row" spacing={1.25} alignItems="center">
                                <Avatar
                                  src={avatarSrc}
                                  sx={{ width: 34, height: 34, bgcolor: 'primary.light', fontSize: '12px', fontWeight: 700 }}
                                >
                                  {person.personName?.charAt(0) || 'P'}
                                </Avatar>
                                <Box>
                                  <Typography variant="body2" fontWeight={600} color="text.primary">
                                    {person.personName}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                                    Card: {person.cardNumber || '-'}
                                  </Typography>
                                </Box>
                              </Stack>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight={500} color="text.primary">
                                {person.personType || 'Member'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                                {person.department || '-'}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Chip
                                label={`${person.interactionCount}x`}
                                size="small"
                                sx={{
                                  height: 22,
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  bgcolor: '#EEF2F6',
                                  color: 'text.secondary',
                                }}
                              />
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" fontWeight={600} color="text.primary">
                                {person.totalSharedDurationFormatted || `${person.totalSharedDurationMinutes}m`}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                                {person.totalSharedDurationMinutes} mins
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Tooltip
                                title={
                                  person.isCurrentlyTogether
                                    ? 'Currently located in the same area alongside this person'
                                    : 'No longer in the same area; co-presence occurred earlier in this session'
                                }
                                arrow
                                placement="top"
                              >
                                <Chip
                                  label={person.isCurrentlyTogether ? 'Together' : 'Separated'}
                                  size="small"
                                  sx={{
                                    height: 22,
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    cursor: 'help',
                                    bgcolor: person.isCurrentlyTogether ? '#DCFCE7' : '#F1F5F9',
                                    color: person.isCurrentlyTogether ? '#15803D' : '#64748B',
                                  }}
                                />
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              )}
            </TableContainer>

            {filteredSortedCompliancePeople.length > 0 && (
              <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={filteredSortedCompliancePeople.length}
                rowsPerPage={complianceRowsPerPage}
                page={compliancePage}
                onPageChange={(_, newPage) => setCompliancePage(newPage)}
                onRowsPerPageChange={(e) => {
                  setComplianceRowsPerPage(parseInt(e.target.value, 10));
                  setCompliancePage(0);
                }}
                sx={{
                  borderTop: '1px solid',
                  borderColor: 'divider',
                  '.MuiTablePagination-toolbar': { minHeight: 40, px: 1 },
                  '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': { fontSize: '12px', mb: 0 },
                }}
              />
            )}
          </Box>

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

          {/* If alarm is inactive and user has canAlarmAction permission */}
          {canAlarmAction && selectedAlarmTrigger?.action.toLocaleLowerCase() === 'acknowledged' && (
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

            {canAlarmAction && selectedAlarmTrigger?.action.toLowerCase() === 'acknowledged' && (
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

            {canAlarmAction && selectedAlarmTrigger?.action.toLowerCase() === 'doneinvestigated' && (
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
      {openPlaybackDialog && (
        <AlarmPlaybackDialog
          open={openPlaybackDialog}
          onClose={() => setOpenPlaybackDialog(false)}
          data={playbackData}
        />
      )}
    </Box>
  );
};

export default AlarmContent;
