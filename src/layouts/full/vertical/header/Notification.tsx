import React, { useEffect, useMemo, useRef, useState } from 'react';
// import { useNavigate } from 'react-router-dom';
import {
  IconButton,
  Box,
  Badge,
  Menu,
  Typography,
  Button,
  Stack,
  Paper,
  useTheme,
  alpha,
  darken,
  Chip,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Portal,
} from '@mui/material';
import { motion, AnimatePresence, useAnimationControls } from 'framer-motion';
import { IconBellRinging } from '@tabler/icons-react';
import Scrollbar from 'src/components/custom-scroll/Scrollbar';
import { Link } from 'react-router';
import { actionStatus, extraActionStatus } from 'src/types/crud/input';
import { memberType } from 'src/store/apps/crud/member';
import { VisitorType } from 'src/store/apps/crud/visitor';
import { AppDispatch, RootState, useDispatch, useSelector } from 'src/store/Store';
import { AlarmTriggerType } from 'src/store/apps/crud/alarmTrigger';
import { uniqueId } from 'lodash';
import { useAlarmTriggerList, useAllAlarmTriggers, useAcknowledgeAlarmTrigger } from 'src/hooks/useAlarmTrigger';
import { useAllMembers } from 'src/hooks/useMember';
import { useAllVisitor } from 'src/hooks/useVisitor';
import { AlarmLogItem, ClearSeenAlarms, MarkAllAlarmsSeen } from 'src/store/apps/tracking/Beacon';
import { MarkAlarmSeen } from 'src/store/apps/tracking/Beacon';
import AlarmMenuItem from './AlarmMenuItem';
import { DeleteSweep, VisibilityOutlined } from '@mui/icons-material';
import { defaultAlarmTriggerFilter } from 'src/store/apps/defaultForm';
import AlarmTriggerMenuItem from '../../shared/AlarmTriggerMenuItem';
import toast from 'react-hot-toast';

type BubbleData = {
  id: string;
  triggerId: string;
  title: string;
  subtitle: string;
  status: string;
  priority: string;
  priorityColor: string; // Changed from color to priorityColor
  chipColor: string; // New field for chip color
  category: string;
  createdAt: number;
};

const AUTOHIDE_MS = 6000;

// Priority color mapping
const PRIORITY_COLORS: Record<string, string> = {
  low: '#ffc107', // Yellow
  medium: '#ff9800', // Orange
  high: '#f44336', // Red
  critical: '#dc143c',
};

const getPriorityColor = (priority: string): string => {
  const normalizedPriority = priority?.toLowerCase() || 'medium';
  return PRIORITY_COLORS[normalizedPriority] || PRIORITY_COLORS.medium;
};

const Notifications = () => {
  const dispatch: AppDispatch = useDispatch();
  // const navigate = useNavigate();
  const theme = useTheme();
  const acknowledgeMutation = useAcknowledgeAlarmTrigger();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const bellRef = useRef<HTMLButtonElement | null>(null);
  const [bubbles, setBubbles] = useState<BubbleData[]>([]);
  const hideTimers = useRef<Record<string, number>>({});
  const hoverTimers = useRef<Record<string, number>>({});

  const openMenu = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const closeMenu = () => {
    setAnchorEl(null);
    setSoftSeenIds(new Set()); // reset session
  };

  const [nowMs, setNowMs] = useState(Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  const alarmLogs: AlarmLogItem[] = useSelector(
    (state: RootState) => state.BeaconReducer.alarmLogs,
  );
  const [softSeenIds, setSoftSeenIds] = useState<Set<string>>(new Set());
  const { unseenAlarms, seenAlarms } = useMemo(() => {
    const unseen: AlarmLogItem[] = [];
    const seen: AlarmLogItem[] = [];

    alarmLogs.forEach((a) => {
      // 🧠 IMPORTANT: softSeenIds first
      if (softSeenIds.has(a.id)) {
        unseen.push(a); // keep in Unseen section for this session
      } else if (a.seen) {
        seen.push(a);
      } else {
        unseen.push(a);
      }
    });

    unseen.sort((a, b) => Date.parse(b.time) - Date.parse(a.time));
    seen.sort((a, b) => Date.parse(b.time) - Date.parse(a.time));

    return { unseenAlarms: unseen, seenAlarms: seen };
  }, [alarmLogs, softSeenIds]); // ✅ FIXED

  // const alarmTriggers: AlarmTriggerType[] = useAllAlarmTriggers().data || [];
  const { data: data, isLoading } = useAlarmTriggerList({
    ...defaultAlarmTriggerFilter,
    Length: 999,
    // filters: { isActive: true },
  });
  const alarmTriggerData = data?.data || [];
  // const memberList: memberType[] = useAllMembers().data || [];
  // const visitorList: VisitorType[] = useAllVisitor().data || [];
  const MAX_BUBBLES = 4;
  const ONE_HOUR_MS = 60 * 60 * 1000;
  const toMs = (v: any) => (v instanceof Date ? v.getTime() : Date.parse(v));

  const filteredSortedTriggers = useMemo(() => {
    if (alarmTriggerData === undefined || alarmTriggerData.length === 0) return [];
    const pruned = alarmTriggerData.filter((t) => {
      const active = (t as any).isActive === true;
      if (active) return true;
      const tMs = toMs((t as any).triggerTime);
      return tMs > 0 ? nowMs - tMs <= ONE_HOUR_MS : false;
    });
    pruned.sort((a, b) => toMs(b.triggerTime) - toMs(a.triggerTime));
    return pruned;
  }, [alarmTriggerData, nowMs]);

  const categorizedTriggers = useMemo(() => {
    return filteredSortedTriggers.reduce(
      (acc, trigger) => {
        const key = trigger.action?.toLowerCase();

        if (key === 'idle') acc.idle.push(trigger);
        else if (key === 'acknowledged') acc.acknowledged.push(trigger);
        else if (key === 'done') acc.done.push(trigger);
        else acc.others.push(trigger);

        return acc;
      },
      {
        idle: [] as AlarmTriggerType[],
        acknowledged: [] as AlarmTriggerType[],
        done: [] as AlarmTriggerType[],
        others: [] as AlarmTriggerType[],
      },
    );
  }, [filteredSortedTriggers]);
  // console.log('Categorized Triggers:', categorizedTriggers);

  const redirectToAlarmList = (trigger: AlarmTriggerType) => {
    const params = new URLSearchParams();

    if (trigger.visitorId) {
      params.set('visitorId', trigger.visitorId);
    }

    if (trigger.memberId) {
      params.set('memberId', trigger.memberId);
    }

    params.set('alarmTriggerId', trigger.id);
    console.log('Redirecting to alarm list with params:', params.toString());
    window.location.href = `/alarm/alarmlist?${params.toString()}`;
  };

  // const getName = (ble: string) =>
  //   memberList.find((x) => x.bleCardNumber === ble)?.name ||
  //   visitorList.find((x) => x.bleCardNumber === ble)?.name ||
  //   ble ||
  //   'Unknown';

  const getStatusText = (status: string) => {
    const actionMap = [...actionStatus, ...extraActionStatus];
    const s = actionMap.find((x) => x.value.toLowerCase() === status);
    // console.log("Status:", status, s);
    if (!s) return 'Unknown';
    switch (status) {
      case 'Idle':
        return 'Active';
      case 'Done':
        return 'Done';
      default:
        return s.label;
    }
  };

  const computeBubblePos = (index: number) => {
    if (!bellRef.current) return null;
    const rect = bellRef.current.getBoundingClientRect();
    const baseTop = rect.bottom + 8;
    const spacing = 125; // bubble height + gap
    return { top: baseTop + index * spacing, left: rect.right - 350 };
  };

  const notificationAudio = useMemo(() => {
    const audio = new Audio('/sfx/AlarmNotification/Calm-Warning.wav');
    audio.volume = 0.6; // adjust volume if needed
    return audio;
  }, []);

  // 🔔 Handle new alarms - UPDATED FOR MQTT DATA STRUCTURE
  useEffect(() => {
    const onNewAlarm = (e: MessageEvent) => {
      if (e.data?.type !== 'app:new-alarm') return;

      // console.log('[Notifications] Received alarm message:', e.data);

      const alarmData = e.data.detail.alarm;
      if (!alarmData) {
        console.warn('[Notifications] No alarm data found in message');
        return;
      }

      // Extract data directly from the MQTT object
      const bd: BubbleData = {
        id: uniqueId(),
        triggerId: alarmData.triggerId,
        title: alarmData.visitorName || alarmData.MemberName || alarmData.cardName || 'Unknown',
        subtitle: `${alarmData.cardName ?? ''} · ${alarmData.maskedAreaName ?? 'Unknown'} · ${
          alarmData.floorplanName ?? 'Unknown'
        }`,
        status: getStatusText(alarmData.action?.toLowerCase()),
        priority: alarmData.priority || 'medium',
        priorityColor: getPriorityColor(alarmData.priority), // Use priority-based color
        chipColor: alarmData.color ?? '#2196f3', // Use original alarmData.color for chip
        category: alarmData.status.toUpperCase() || 'Alert',
        createdAt: Date.now(),
      };

      // console.log('[Notifications] Creating bubble:', bd);

      setBubbles((prev) => {
        const next = [...prev, bd];
        if (next.length > MAX_BUBBLES) next.shift(); // remove oldest
        return next;
      });

      // Play notification sound
      notificationAudio.currentTime = 0; // rewind if it's still playing
      notificationAudio.play().catch((err) => {
        console.warn('Audio playback prevented:', err);
      });

      // auto-hide this one
      const timerId = window.setTimeout(() => {
        setBubbles((prev) => prev.filter((b) => b.id !== bd.id));
        delete hideTimers.current[bd.id];
      }, AUTOHIDE_MS);
      hideTimers.current[bd.id] = timerId;
    };

    window.addEventListener('message', onNewAlarm);
    return () => {
      window.removeEventListener('message', onNewAlarm);
      Object.values(hideTimers.current).forEach((t) => window.clearTimeout(t));
    };
  }, []);

  // 🧊 Bubble animation variants
  const bubbleVariants = {
    hidden: { opacity: 0, y: 25, scale: 0.98 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: 'spring', stiffness: 260, damping: 20 },
    },
    exit: { opacity: 0, y: -15, scale: 0.96, transition: { duration: 0.25 } },
  };

  const findAlarmTrigger = (id: string) =>
    alarmTriggerData.find((x) => x.id.toUpperCase() === id.toUpperCase());

  const isVisuallySeen = (alarm: AlarmLogItem) => alarm.seen || softSeenIds.has(alarm.id);
  const isTriggerVisuallySeen = (alarm: AlarmTriggerType) =>
    alarm.action !== 'Idle' || softSeenIds.has(alarm.id);
  const { unseenCount, seenCount } = useMemo(() => {
    let unseen = 0;
    let seen = 0;

    alarmLogs.forEach((a) => {
      if (isVisuallySeen(a)) seen++;
      else unseen++;
    });

    return { unseenCount: unseen, seenCount: seen };
  }, [alarmLogs, softSeenIds]);

  const errorColor = theme.palette.error.main;
  const primaryColor = theme.palette.primary.main;
  const neutralBg = theme.palette.common.white;

  const unseenBg = alpha(errorColor, 0.14);
  const hoverBg = neutralBg;
  const seenBg = alpha(primaryColor, 0.1);

  const unseenBorder = errorColor;
  const hoverBorder = theme.palette.grey[400];
  const seenBorder = primaryColor;

  useEffect(() => {
    return () => {
      Object.values(hoverTimers.current).forEach((t) => window.clearTimeout(t));
      hoverTimers.current = {};
    };
  }, []);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedTrigger, setSelectedTrigger] = useState<AlarmTriggerType | null>(null);

  return (
    <Box sx={{ position: 'relative' }}>
      {/* Notification Bell */}
      <IconButton
        ref={bellRef}
        size="large"
        color="error"
        onClick={openMenu}
        sx={{ color: anchorEl ? 'error.main' : 'text.secondary' }}
      >
        <Badge badgeContent={categorizedTriggers.idle.length} color="error">
          <IconBellRinging size="21" stroke="1.5" />
        </Badge>
      </IconButton>

      {/* Test trigger button - UPDATED FOR MQTT DATA STRUCTURE */}
      {/* <IconButton
        size="large"
        color="error"
        onClick={() => {
          window.postMessage(
            {
              type: 'app:new-alarm',
              detail: {
                alarm: {
                  visitorName: 'Kaori',
                  cardName: '676986',
                  maskedAreaName: 'MA-Lantai 2',
                  floorplanName: 'FP Lantai 2',
                  action: 'high',
                  priority: 'medium', // Added priority
                  color: '#4caf50', // This will be used for chip color
                  status: 'EXAMPLE', // Added status for category
                },
              },
            },
            '*',
          );
        }}
      >
        <Badge badgeContent="!" color="error">
          <IconBellRinging size="21" stroke="1.5" />
        </Badge>
      </IconButton> */}

      {/* 🎨 Animated Bubble Stack */}
      <Portal>
        <AnimatePresence>
          {bubbles.map((b, i) => {
            const pos = computeBubblePos(i);
            const isTop = i === 0; // Only top bubble gets triangle
            return (
              <motion.div
                key={b.id}
                variants={bubbleVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                layout
                style={{
                  position: 'fixed',
                  top: pos?.top ?? 64,
                  left: pos ? pos.left : undefined,
                  zIndex: 2000,
                  width: 360,
                }}
              >
                <Paper
                  onClick={() => {
                    if (hideTimers.current[b.id]) {
                      window.clearTimeout(hideTimers.current[b.id]);
                      delete hideTimers.current[b.id];
                    }
                    setBubbles((prev) => prev.filter((x) => x.id !== b.id));
                    const trigger = findAlarmTrigger(b.triggerId!);
                    if (trigger) {
                      setSelectedTrigger(trigger);
                      setConfirmOpen(true);
                    } else {
                      toast.error('Alarm trigger not found');
                    }
                  }}
                  elevation={6}
                  sx={{
                    position: 'relative',
                    px: 2,
                    py: 1.5,
                    borderRadius: 3,
                    color: 'white',
                    cursor: 'pointer',
                    background: `linear-gradient(135deg, ${alpha(b.priorityColor, 0.95)}, ${darken(
                      b.priorityColor,
                      0.25,
                    )})`,
                    border: `1px solid ${alpha(b.priorityColor, 0.4)}`,
                    boxShadow: `0 8px 30px ${alpha(b.priorityColor, 0.5)}`,
                    backdropFilter: 'blur(6px)',
                    overflow: 'visible',
                    ...(isTop && {
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: -8,
                        right: 24,
                        borderWidth: '0 8px 8px 8px',
                        borderStyle: 'solid',
                        borderColor: `transparent transparent ${darken(b.priorityColor, 0.1)} transparent`,
                      },
                    }),
                  }}
                >
                  {/* Category Chip - Top Right */}
                  <Chip
                    label={b.category}
                    size="small"
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      backgroundColor: b.chipColor,
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '0.65rem',
                      height: '20px',
                      borderRadius: 1.2,
                      '& .MuiChip-label': {
                        px: 1,
                      },
                    }}
                  />

                  <Stack spacing={0.5}>
                    <Typography variant="subtitle2" sx={{ opacity: 0.75, pt: 0.5 }}>
                      Alarm Triggered
                    </Typography>
                    <Typography variant="h6" fontWeight={700}>
                      {b.title}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      {b.subtitle}
                    </Typography>
                    {/* Priority indicator */}
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mt: 0.5,
                      }}
                    >
                      <Typography variant="caption" sx={{ opacity: 0.8 }}>
                        Priority: <strong>{b.priority.toUpperCase()}</strong>
                      </Typography>
                      <Typography variant="caption" sx={{ opacity: 0.8 }}>
                        Status: {b.status}
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </Portal>

      {/* 🔔 Notifications Menu */}
      <Menu
        id="msgs-menu"
        anchorEl={anchorEl}
        keepMounted
        open={Boolean(anchorEl)}
        onClose={closeMenu}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        sx={{ '& .MuiMenu-paper': { width: '360px' } }}
      >
        <Box
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 2,
            backgroundColor: theme.palette.background.paper,
            borderBottom: `1px solid ${theme.palette.divider}`,
            px: 2,
            py: 1.5,
          }}
        >
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">All Notifications</Typography>

            <Stack direction="row" spacing={0.5}>
              <Tooltip title="Mark all as seen">
                <span>
                  <IconButton
                    size="small"
                    disabled={unseenCount === 0 && categorizedTriggers.idle.length === 0}
                    onClick={() => {
                      categorizedTriggers.idle.forEach((alarm) => {
                        if (alarm.id && (alarm.action === 'Idle' || alarm.action?.toLowerCase() === 'idle')) {
                          acknowledgeMutation.mutateAsync(alarm.id);
                        }
                      });
                      dispatch(MarkAllAlarmsSeen());
                      setSoftSeenIds(new Set());
                    }}
                  >
                    <VisibilityOutlined fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>

              {/* <Tooltip title="Clear seen notifications">
                <span>
                  <IconButton
                    size="small"
                    color="error"
                    disabled={seenCount === 0}
                    onClick={() => dispatch(ClearSeenAlarms())}
                  >
                    <DeleteSweep fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip> */}
            </Stack>
          </Box>
        </Box>

        <Scrollbar sx={{ height: '385px' }}>
          <Box p={2}>
            {/* 🔴 UNSEEN (includes soft-seen during this session) */}
            {categorizedTriggers.idle.length > 0 && (
              <>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <Typography variant="subtitle2" color="error">
                    Unseen
                  </Typography>
                  <Chip
                    size="small"
                    label={categorizedTriggers.idle.length}
                    sx={{
                      backgroundColor: alpha(theme.palette.error.main, 0.15),
                      color: theme.palette.error.main,
                      fontWeight: 600,
                    }}
                  />
                </Box>

                <Stack spacing={1} mb={2}>
                  {/* {unseenAlarms.map((alarm) => (
                    <AlarmMenuItem
                      key={alarm.id}
                      alarm={alarm}
                      isVisuallySeen={isVisuallySeen(alarm)}
                      unseenBg={unseenBg}
                      seenBg={seenBg}
                      hoverBg={hoverBg}
                      unseenBorder={unseenBorder}
                      seenBorder={seenBorder}
                      hoverBorder={hoverBorder}
                      onMarkSeen={(a) => {
                        setSoftSeenIds((prev) => new Set(prev).add(a.id));
                        dispatch(MarkAlarmSeen(a.id));
                      }}
                      onClick={(a) => {
                        console.log('UNSEEN alarm clicked:', a);
                      }}
                    />
                  ))} */}
                  {categorizedTriggers.idle.map((idle) => (
                    <AlarmTriggerMenuItem
                      key={idle.id}
                      trigger={idle}
                      isSeen={isTriggerVisuallySeen(idle)}
                      // isClicked={isClicked(idle)}
                      unseenBg={unseenBg}
                      seenBg={seenBg}
                      hoverBg={hoverBg}
                      unseenBorder={unseenBorder}
                      seenBorder={seenBorder}
                      hoverBorder={hoverBorder}
                      onMarkSeen={(t) => {
                        setSoftSeenIds((prev) => new Set(prev).add(t.id));
                        dispatch(MarkAlarmSeen(t.id));
                      }}
                      onClick={(t) => {
                        setSelectedTrigger(t);
                        setConfirmOpen(true);
                      }}
                    />
                  ))}
                </Stack>
              </>
            )}
            {/* {unseenAlarms.length > 0 && (
              <>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <Typography variant="subtitle2" color="error">
                    Unseen
                  </Typography>
                  <Chip
                    size="small"
                    label={unseenCount}
                    sx={{
                      backgroundColor: alpha(theme.palette.error.main, 0.15),
                      color: theme.palette.error.main,
                      fontWeight: 600,
                    }}
                  />
                </Box>

                <Stack spacing={1} mb={2}>
                  {unseenAlarms.map((alarm) => (
                    <AlarmMenuItem
                      key={alarm.id}
                      alarm={alarm}
                      isVisuallySeen={isVisuallySeen(alarm)}
                      unseenBg={unseenBg}
                      seenBg={seenBg}
                      hoverBg={hoverBg}
                      unseenBorder={unseenBorder}
                      seenBorder={seenBorder}
                      hoverBorder={hoverBorder}
                      onMarkSeen={(a) => {
                        setSoftSeenIds((prev) => new Set(prev).add(a.id));
                        dispatch(MarkAlarmSeen(a.id));
                      }}
                      onClick={(a) => {
                        console.log('UNSEEN alarm clicked:', a);
                      }}
                    />
                  ))}
                </Stack>
              </>
            )} */}
            {/* ⚪ SEEN (only after reopen) */}
            {/* 🔴 UNSEEN (includes soft-seen during this session) */}
            {categorizedTriggers.acknowledged.length > 0 && (
              <>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <Typography variant="subtitle2" color="primary">
                    Seen
                  </Typography>
                  <Chip
                    size="small"
                    label={categorizedTriggers.acknowledged.length}
                    sx={{
                      backgroundColor: alpha(theme.palette.primary.main, 0.15),
                      color: theme.palette.primary.main,
                      fontWeight: 600,
                    }}
                  />
                </Box>

                <Stack spacing={1} mb={2}>
                  {categorizedTriggers.acknowledged.map((seen) => (
                    <AlarmTriggerMenuItem
                      key={seen.id}
                      trigger={seen}
                      isSeen={true}
                      // isClicked={isClicked(idle)}
                      unseenBg={unseenBg}
                      seenBg={seenBg}
                      hoverBg={hoverBg}
                      unseenBorder={unseenBorder}
                      seenBorder={seenBorder}
                      hoverBorder={hoverBorder}
                      onClick={(t) => {
                        setSelectedTrigger(t);
                        setConfirmOpen(true);
                      }}
                    />
                  ))}
                </Stack>
              </>
            )}
            {/* DONE */}
            {seenAlarms.length > 0 && (
              <>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <Typography variant="subtitle2" color="primary">
                    Done
                  </Typography>
                  <Chip
                    size="small"
                    label={categorizedTriggers.done.length}
                    sx={{
                      backgroundColor: alpha(theme.palette.primary.main, 0.12),
                      color: theme.palette.primary.main,
                      fontWeight: 600,
                    }}
                  />
                </Box>

                <Stack spacing={1}>
                  {categorizedTriggers.done.map((alarm: AlarmTriggerType) => (
                    <Paper
                      key={alarm.id}
                      onClick={() => {
                        console.log('SEEN alarm clicked:', alarm);
                      }}
                      sx={{
                        p: 1.5,
                        cursor: 'pointer',
                        opacity: 0.75,
                        backgroundColor: seenBg,
                        transition: 'background-color 0.4s ease, opacity 0.4s ease',
                        '&:hover': {
                          backgroundColor: alpha(theme.palette.grey[500], 0.12),
                        },
                      }}
                    >
                      <Typography fontWeight={600}>
                        {alarm.visitorName ?? alarm.memberName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {alarm.floorName} · {alarm.buildingName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(alarm.triggerTime).toLocaleString()}
                      </Typography>
                    </Paper>
                  ))}
                </Stack>
              </>
            )}

            {/* Empty state */}
            {alarmLogs.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                No notifications
              </Typography>
            )}

            <Box mt={2}>
              <Button to="/report/alarmtrigger" component={Link} fullWidth variant="outlined">
                View All
              </Button>
            </Box>
          </Box>
        </Scrollbar>
      </Menu>
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={700}>Open Alarm Detail?</DialogTitle>

        <DialogContent>
          <Typography variant="body2">
            You are about to navigate to the Alarm Detail page. Do you want to continue?
          </Typography>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} color="inherit">
            Cancel
          </Button>

          <Button
            variant="contained"
            color="error"
            onClick={() => {
              if (selectedTrigger) {
                redirectToAlarmList(selectedTrigger);
              }
              setConfirmOpen(false);
              closeMenu();
            }}
          >
            Go to Detail
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Notifications;
