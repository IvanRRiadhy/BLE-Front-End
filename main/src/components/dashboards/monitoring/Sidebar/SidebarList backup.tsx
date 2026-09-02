import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  List,
  Portal,
  Stack,
  Theme,
  Typography,
  useTheme,
} from '@mui/material';
import { useSelector, useDispatch, RootState } from 'src/store/Store';
import Scrollbar from 'src/components/custom-scroll/Scrollbar';
import SidebarListItem from './SidebarListItem';
import {
  AlarmLogItem,
  ClearAlarmLogs,
  ClearTrackingLogs,
  SetSelectedBeacon,
} from 'src/store/apps/tracking/Beacon';
import { useAllMembers } from 'src/hooks/useMember';
import { useAllVisitor } from 'src/hooks/useVisitor';
import {
  CombinedLogItem,
  useCombinedEnrichedLogs,
  useEnrichedTrackingLogs,
  useTrackingLogs,
} from 'src/hooks/useTrackingLogs';
import { setFollowingPerson, setScreenDisplay } from 'src/store/apps/monitoring/layout';
import { publishMQTT } from 'src/store/apps/tracking/MQTT';
import CustomAutocomplete from 'src/components/shared/CustomAutocomplete';
import { motion } from 'framer-motion';
import { useAllSecurityLookup } from 'src/hooks/useSecurityGuard';
import { memberType } from 'src/store/apps/crud/member';
import {
  useAcknowledgeAlarmTrigger,
  useAlarmTriggerByID,
  useDispatchAlarmTrigger,
  usePostponeAlarmTrigger,
} from 'src/hooks/useAlarmTrigger';
import dayjs, { Dayjs } from 'dayjs';
import duration from 'dayjs/plugin/duration';
import toast from 'react-hot-toast';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
dayjs.extend(duration);

interface SidebarListProps {
  filterType: string[];
  personFilter: {
    Visitor: boolean;
    Member: boolean;
    Security: boolean;
    FocusedPersonOnly: boolean;
  };
}

type ListType = {
  id: string;
  device: string;
  target: string;
  image: string;
  dmac: string;
  floor: string;
  area: string;
  alarmType?: string;
  time: string;
  status?: string;
  type: 'Alarm' | 'Tracking';
};

type PersonType = 'visitor' | 'member' | 'security';

const mapPersonType = (type?: string): PersonType | undefined => {
  if (!type) return undefined;

  switch (type.toLowerCase()) {
    case 'visitor':
      return 'visitor';
    case 'member':
      return 'member';
    case 'security':
      return 'security';
    default:
      return undefined;
  }
};

const PRIORITY_COLORS: Record<string, string> = {
  low: '#ffc107', // Yellow
  medium: '#ff9800', // Orange
  high: '#f44336', // Red
};
const getPriorityColor = (priority: string): string => {
  const normalizedPriority = priority?.toLowerCase() || 'medium';
  return PRIORITY_COLORS[normalizedPriority] || PRIORITY_COLORS.medium;
};

// Helper function to convert beacon object to array
function isAlarmLog(item: CombinedLogItem): item is AlarmLogItem {
  return item.type === 'Alarm';
}

// Maximum number of items to keep in the list
const MAX_LIST_ITEMS = 100;

const SidebarList = ({ filterType, personFilter }: SidebarListProps) => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const appId = localStorage.getItem('applicationId') || '';
  const followingPerson = useSelector((state: RootState) => state.layoutReducer.followingPerson);

  const activeLayoutId = useSelector((state: RootState) => state.layoutReducer.activeLayoutId);

  const activeLayout = useSelector((state: RootState) =>
    state.layoutReducer.layouts.find((l: any) => l.id === state.layoutReducer.activeLayoutId),
  );

  const popupRef = useRef<HTMLDivElement | null>(null);
  const [panelRect, setPanelRect] = useState<DOMRect | null>(null);

  const [actionAnchorEl, setActionAnchorEl] = useState<HTMLElement | null>(null);

  const [openModal, setOpenModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CombinedLogItem | null>(null);
  const [selectedTriggerId, setSelectedTriggerId] = useState<string | null>(null);
  const currentPersonId = selectedItem?.id;
  const currentName = selectedItem?.target || 'Unknown';
  const currentBle = selectedItem?.dmac;

  const currentType = mapPersonType(selectedItem?.personType);

  const { data: alarmTriggerDetail, isLoading: isLoadingTrigger } = useAlarmTriggerByID(
    selectedTriggerId || '',
  );
const trigger = alarmTriggerDetail ?? null;
  const isFollowingCurrent = followingPerson?.id === currentPersonId;
  const isDisabled = followingPerson && followingPerson.id !== currentPersonId;

  const { data: securityData = [], isLoading: isLoadingSecurity } = useAllSecurityLookup();

  const [selectedSecurity, setSelectedSecurity] = useState<memberType | null>(null);

  const acknowledgeMutation = useAcknowledgeAlarmTrigger();
  const dispatchMutation = useDispatchAlarmTrigger();
  const postponeMutation = usePostponeAlarmTrigger();

  // const [list, setList] = useState<ListType[]>([]);
  const trackingLogs = useEnrichedTrackingLogs();
  const logs = useCombinedEnrichedLogs(100);
  const list = logs.filter((x) => {
    // Filter Tracking / Alarm
    if (filterType.length > 0 && !filterType.includes(x.type)) {
      return false;
    }

    // Focused person filter
    // if (personFilter.FocusedPersonOnly) {
    //   return x.isFocused === true; // adjust based on your data
    // }

    // Person type filtering
    if (x.personType === 'Visitor' && !personFilter.Visitor) return false;
    if (x.personType === 'Member' && !personFilter.Member) return false;
    if (x.personType === 'Security' && !personFilter.Security) return false;

    return true;
  });

  // Get beaconsByTopic from Redux - now it's an object of objects
  const beaconsByTopicObj = useSelector((s: RootState) => s.BeaconReducer.beaconsByTopic || {});

  // Convert beaconsByTopic to array format for easier processing
  const allBeacons = useMemo(() => {
    const result: any[] = [];

    // Iterate through each topic
    Object.values(beaconsByTopicObj).forEach((topicBeacons) => {
      if (!topicBeacons) return;

      // topicBeacons is an object with beaconId as keys
      const beaconArray = Object.values(topicBeacons);
      result.push(...beaconArray);
    });

    return result;
  }, [beaconsByTopicObj]);

  const alarmTriggers = useSelector((s: RootState) => s.alarmTriggerReducer.alarmTriggers || []);

  const handleAcknowledgeClick = (clickedAlarm: string, action: string) => {
    console.log('Alarm Clicked: ', clickedAlarm, action);
    if (clickedAlarm && action.toLowerCase() === 'idle') {
      console.log('Acknowledging Alarm: ', clickedAlarm);
      acknowledgeMutation.mutateAsync(clickedAlarm);
    }
  };

  // const handleItemClick = (item: CombinedLogItem) => {
  //   console.log('ITEM CLICKED: ', item);

  //   if (isAlarmLog(item)) {
  //     handleAcknowledgeClick(item.triggerId, item.action);

  //     // 🔥 trigger query
  //     setSelectedTriggerId(item.triggerId);
  //   } else {
  //     setSelectedTriggerId(null);
  //   }

  //   setSelectedItem(item);
  //   setOpenModal(true);
  // };
  const handleItemClick = (item: CombinedLogItem) => {
  if (isAlarmLog(item)) {
    handleAcknowledgeClick(item.triggerId, item.action);

    setSelectedTriggerId(item.triggerId); // 🔥 key change
  } else {
    setSelectedTriggerId(null);
  }

  setSelectedItem(item);
  setOpenModal(true);
};

  const handleOpenDetails = (cardNumber: string, area: string, floorplan: string, time: string) => {
    // console.log('🟡 handleOpenDetails called', cardNumber);
    dispatch(
      SetSelectedBeacon({ active: true, id: cardNumber, area, floorplan, time, sourceScreenId: 1 }),
    );
    setOpenModal(false);
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('en-GB', { hour12: false });
  };

  const handleFollow = () => {
    if (!activeLayoutId || !activeLayout || !currentBle) return;

    if (!currentPersonId || !currentType) return;

    const firstScreen = activeLayout.screens[0];
    if (!firstScreen) return;

    publishMQTT(`people_tracking/${appId.toUpperCase()}/highlight/card/${currentBle}`, 'Start');

    dispatch(
      setScreenDisplay({
        layoutId: activeLayoutId,
        screenId: firstScreen.id,
        display: {
          displayType: 3,
          displayOutput: currentBle,
        },
      }),
    );

    dispatch(
      setFollowingPerson({
        id: currentPersonId,
        name: currentName,
        bleCardNumber: currentBle,
        type: currentType,
      }),
    );

    setOpenModal(false);
  };

  const handleCancelFollowing = () => {
    if (!activeLayoutId || !activeLayout) return;

    const firstScreen = activeLayout.screens[0];
    if (!firstScreen) return;

    if (followingPerson?.bleCardNumber) {
      publishMQTT(`people_tracking/${appId.toUpperCase()}/highlight/card/${followingPerson.bleCardNumber}`, 'Stop');
    }

    dispatch(
      setScreenDisplay({
        layoutId: activeLayoutId,
        screenId: firstScreen.id,
        display: {
          displayType: 0,
          displayOutput: '',
        },
      }),
    );

    dispatch(setFollowingPerson(null));
  };

  const buttonLabel = isFollowingCurrent ? 'Cancel Following' : 'Follow';
  const handleAction = isFollowingCurrent ? handleCancelFollowing : handleFollow;

  function isAlarmLog(item: CombinedLogItem): item is AlarmLogItem {
    return item.type === 'Alarm';
  }

  useEffect(() => {
    if (!openModal) {
      setSelectedTriggerId(null);
    }
  }, [openModal]);

  //Disarm Popup
  const actionOpen = Boolean(actionAnchorEl);

  const handleDisarmClick = () => {
    if (!popupRef.current) return;
    setActionAnchorEl(popupRef.current);
  };

  const handleActionClose = () => {
    setActionAnchorEl(null);
  };

  useEffect(() => {
    if (!popupRef.current) return;

    const updateRect = () => {
      if (!popupRef.current) return;
      setPanelRect(popupRef.current.getBoundingClientRect());
    };

    updateRect();

    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect);

    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect);
    };
  }, [openModal, actionOpen]);

  // Get priority color for the popup background
  const priorityColor = (alarm: AlarmLogItem) => {
    if (alarm.priority === 'low') {
      return PRIORITY_COLORS.low;
    } else if (alarm.priority === 'medium') {
      return PRIORITY_COLORS.medium;
    } else if (alarm.priority === 'high') {
      return PRIORITY_COLORS.high;
    }
  };
  const extractTriggerId = (alarmId: string): string | null => {
    const match = alarmId.match(/^alarm-([a-fA-F0-9-]{36})-/);
    return match ? match[1] : null;
  };

  const handleDispatchAction = async (alarm: AlarmLogItem) => {
    if (!alarm || !alarm?.dmac) {
      toast.error('No alarm selected');
      handleActionClose();
      return;
    }

    const currentTriggerId = extractTriggerId(alarm.id);

    console.log('Selected Sec', selectedSecurity);
    if (!selectedSecurity) {
      toast.error('Please select a security');
      return;
    } else {
      console.log(selectedSecurity);
    }

    if (alarm.action?.toLowerCase() !== 'acknowledged') {
      // toast.error('Alarm is not acknowledged');
    }
    try {
      const result = await dispatchMutation.mutateAsync({
        id: currentTriggerId?.toUpperCase() ?? alarm.id,
        assignedSecurityId: selectedSecurity.id,
      });
      console.log('Success result', result);
      // toast.success('Action dispatched successfully');
    } catch (error: any) {
      // toast.error('Error dispatching action');
      console.error('Error dispatching action', error);
    } finally {
    }

    handleActionClose();
    setSelectedSecurity(null);
    setOpenModal(false);
  };

  //Postpone
  const [openPostponeDialog, setOpenPostponeDialog] = useState(false);
  const [postponeDate, setPostponeDate] = useState<Dayjs | null>(
    dayjs().add(1, 'day').startOf('day'),
  );
  const [postponeReason, setPostponeReason] = useState('Alarm is Postponed');

  useEffect(() => {
    if (openPostponeDialog) {
      setPostponeDate(dayjs().add(1, 'day').startOf('day'));
    }
  }, [openPostponeDialog]);

  const handlePostpone = async (alarm: AlarmLogItem) => {
    if (!alarm || !alarm?.dmac) {
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

    // const alarmToProcess: AlarmType[] = [...selectedAlarms];

    // include main alarm if not selected
    const currentTriggerId = extractTriggerId(alarm.id);

    try {
      await postponeMutation.mutateAsync({
        id: currentTriggerId?.toUpperCase() ?? alarm.id,
        postponedUntilDate: postponeDate.toISOString(),
        postponeReason: postponeReason.trim(),
      });
    } catch (error) {
      console.error('Error postponing alarm', error);
    }

    // reset state
    setOpenPostponeDialog(false);
    setPostponeDate(null);
    setPostponeReason('');
    // setSelectedAlarms([]);
    setOpenModal(false);
  };

  return (
    <>
      <List>
        <Button
          fullWidth
          variant="outlined"
          color="secondary"
          sx={{ mb: 2 }}
          onClick={() => {
            dispatch(ClearTrackingLogs());
            dispatch(ClearAlarmLogs());
          }}
        >
          Clear All
        </Button>
        <Scrollbar sx={{ height: { lg: 'calc(100vh - 200px)', md: '100vh' }, maxHeight: '800px' }}>
          {list.map((item) => (
            <SidebarListItem key={item.id} item={item} onItemClick={() => handleItemClick(item)} />
          ))}
          {list.length >= MAX_LIST_ITEMS && (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                Showing latest {MAX_LIST_ITEMS} items (oldest items automatically removed)
              </Typography>
            </Box>
          )}
        </Scrollbar>
      </List>

      <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="xs" fullWidth>
        {selectedItem && (
          <>
            <DialogTitle
              sx={{ fontSize: '1rem', p: '16px' }}
              bgcolor={selectedItem.type === 'Alarm' ? 'error.main' : 'secondary.main'}
              color="white"
            >
              {selectedItem.type} Event
            </DialogTitle>
            <Divider />
            <DialogContent ref={popupRef} sx={{ p: '8px 16px', ml: '8px' }}>
              <Box>
                <Typography variant="body1" fontWeight="bold" gutterBottom>
                  Target: {selectedItem.target}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  Time: {formatTime(selectedItem.time)}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  Floor: {selectedItem.floor}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  Area: {selectedItem.area}
                </Typography>
                {isAlarmLog(selectedItem) && trigger && (
                  <>
                    <Typography variant="body1" gutterBottom>
                      Alarm Type: {trigger.alarm || '-'}
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      Status: {trigger.action || '-'}
                    </Typography>
                  </>
                )}
              </Box>
            </DialogContent>
            <DialogActions
              sx={{
                p: 0,
                display: 'flex',
              }}
            >
              {/* LEFT */}
              <Box sx={{ flex: 1 }}>
                <Button
                  onClick={() =>
                    handleOpenDetails(
                      selectedItem.dmac,
                      selectedItem.area,
                      selectedItem.floor,
                      selectedItem.time,
                    )
                  }
                  variant="contained"
                  sx={{
                    width: '100%',
                    height: '56px',
                    borderRadius: 0,
                  }}
                >
                  Person Details
                </Button>
              </Box>

              <Box sx={{ flex: 1 }}>
                <Button
                  variant="contained"
                  color={isFollowingCurrent ? 'error' : 'primary'}
                  onClick={handleAction}
                  disabled={isDisabled !== null ? isDisabled : false}
                  sx={{
                    width: '100%',
                    height: '56px',
                    borderRadius: 0,
                  }}
                >
                  {buttonLabel}
                </Button>
              </Box>

              {selectedItem.type === 'Alarm' && (
                <Box sx={{ flex: 1 }}>
                  <Button
                    variant="contained"
                    color="warning"
                    onClick={handleDisarmClick}
                    sx={{
                      width: '100%',
                      height: '56px',
                      borderRadius: 0,
                    }}
                  >
                    Disarm
                  </Button>
                </Box>
              )}

              {/* RIGHT */}
              <Box sx={{ flex: 1 }}>
                <Button
                  color="error"
                  onClick={() => setOpenModal(false)}
                  variant="outlined"
                  sx={{
                    width: '100%',
                    height: '56px',
                    borderRadius: 0,
                  }}
                >
                  Close
                </Button>
              </Box>
            </DialogActions>
          </>
        )}
        {actionOpen && selectedItem && isAlarmLog(selectedItem) && trigger && (
          <motion.div
            key="action"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            style={{
              position: 'fixed',
              top: panelRect ? panelRect.top : '100%',
              left: panelRect ? panelRect.right + 16 : 0,
              // transform: 'translateY(-50%)',
              width: 360,
              pointerEvents: 'auto',
              // zIndex: theme.zIndex.modal + 1,
            }}
          >
            <Box sx={{ backgroundColor: '#fff', borderRadius: 2, p: 2, boxShadow: 8 }}>
              <Typography variant="h6" fontWeight="bold" mb={2}>
                {' '}
                Select Action Status{' '}
              </Typography>{' '}
              <Typography variant="body2" color="text.secondary" mb={1}>
                {' '}
                Alarm MAC:{' '}
              </Typography>{' '}
              <Typography variant="body1" fontWeight={600} mb={1}>
                {' '}
                {trigger.beaconId.toUpperCase() || '-'}{' '}
              </Typography>{' '}
              {selectedItem && trigger && (
                <Box
                  sx={{
                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                    p: 2,
                    borderRadius: 1,
                    mb: 1,
                  }}
                >
                  {' '}
                  <Typography variant="body2" color="text.secondary">
                    {' '}
                    Person: {selectedItem?.target || 'Unknown'}{' '}
                  </Typography>{' '}
                  <Typography variant="body2" color="text.secondary">
                    {' '}
                    Area: {selectedItem?.area || 'Unknown'}{' '}
                  </Typography>{' '}
                  <Typography variant="body2" color="text.secondary">
                    {' '}
                    Priority:{' '}
                    <span style={{ color: priorityColor(selectedItem), fontWeight: 'bold' }}>
                      {' '}
                      {(selectedItem?.priority || 'medium').toUpperCase()}{' '}
                    </span>{' '}
                  </Typography>{' '}
                </Box>
              )}{' '}
              <Typography variant="subtitle2" color="text.secondary" mb={1}>
                Assign Security Guard
              </Typography>
              <CustomAutocomplete
                label="Security Guard"
                options={securityData}
                value={selectedSecurity}
                loading={isLoadingSecurity}
                onChange={(newValue) => setSelectedSecurity(newValue)}
                getOptionLabel={(option) => option?.name ?? ''}
                isOptionEqualToValue={(o, v) => o.id === v.id}
                required
                sx={{
                  '& .MuiInputBase-root': {
                    minHeight: 36,
                    fontSize: '0.9rem',
                  },
                }}
              />{' '}
              <Box display="flex" gap={1} justifyContent="flex-end" mt={2}>
                {' '}
                <Button
                  onClick={handleActionClose}
                  variant="outlined"
                  color="inherit"
                  disabled={dispatchMutation.isPending}
                >
                  {' '}
                  Cancel{' '}
                </Button>{' '}
                <Button
                  variant="outlined"
                  color="warning"
                  onClick={() => setOpenPostponeDialog(true)}
                >
                  Postpone
                </Button>{' '}
                <Button
                  onClick={() => handleDispatchAction(selectedItem)}
                  variant="contained"
                  color="primary"
                  disabled={!selectedSecurity || dispatchMutation.isPending}
                >
                  {' '}
                  {dispatchMutation.isPending ? 'Dispatching...' : 'Dispatch Security'}{' '}
                </Button>{' '}
              </Box>
            </Box>
          </motion.div>
        )}
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
            <CustomTextField
              label="Reason"
              multiline
              rows={4}
              value={postponeReason}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setPostponeReason(e.target.value)
              }
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

          {selectedItem && isAlarmLog(selectedItem) && (
            <Button
              variant="contained"
              color="warning"
              onClick={() => handlePostpone(selectedItem)}
              disabled={postponeMutation.isPending}
              startIcon={
                postponeMutation.isPending ? <CircularProgress size={16} color="inherit" /> : null
              }
            >
              {postponeMutation.isPending ? 'Saving...' : 'Confirm Postpone'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
};

export default SidebarList;
