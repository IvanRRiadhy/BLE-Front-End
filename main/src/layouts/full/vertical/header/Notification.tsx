import React, { useEffect, useMemo, useRef, useState } from 'react';
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
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { IconBellRinging } from '@tabler/icons-react';
import Scrollbar from 'src/components/custom-scroll/Scrollbar';
import { Link } from 'react-router';
import { actionStatus } from 'src/types/crud/input';
import { memberType } from 'src/store/apps/crud/member';
import { VisitorType } from 'src/store/apps/crud/visitor';
import { RootState, useSelector } from 'src/store/Store';
import { AlarmTriggerType } from 'src/store/apps/crud/alarmTrigger';
import { uniqueId } from 'lodash';
import { useAllAlarmTriggers } from 'src/hooks/useAlarmTrigger';
import { useAllMembers } from 'src/hooks/useMember';
import { useAllVisitor } from 'src/hooks/useVisitor';

type BubbleData = {
  id: string;
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
  'low': '#ffc107',    // Yellow
  'medium': '#ff9800', // Orange
  'high': '#f44336',   // Red
};

const getPriorityColor = (priority: string): string => {
  const normalizedPriority = priority?.toLowerCase() || 'medium';
  return PRIORITY_COLORS[normalizedPriority] || PRIORITY_COLORS.medium;
};

const Notifications = () => {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const bellRef = useRef<HTMLButtonElement | null>(null);
  const [bubbles, setBubbles] = useState<BubbleData[]>([]);
  const hideTimers = useRef<Record<string, number>>({});

  const openMenu = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const closeMenu = () => setAnchorEl(null);

  const [nowMs, setNowMs] = useState(Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const alarmTriggers: AlarmTriggerType[] = useAllAlarmTriggers().data || [];
  const memberList: memberType[] = useAllMembers().data || [];
  const visitorList: VisitorType[] = useAllVisitor().data || [];
  const MAX_BUBBLES = 4;
  const ONE_HOUR_MS = 60 * 60 * 1000;
  const toMs = (v: any) => (v instanceof Date ? v.getTime() : Date.parse(v));

  const filteredSortedTriggers = useMemo(() => {
    const pruned = alarmTriggers.filter((t) => {
      const active = (t as any).isActive === true || t.actionStatus === 'Idle';
      if (active) return true;
      const tMs = toMs((t as any).triggerTime);
      return tMs > 0 ? nowMs - tMs <= ONE_HOUR_MS : false;
    });
    pruned.sort((a, b) => toMs(b.triggerTime) - toMs(a.triggerTime));
    return pruned;
  }, [alarmTriggers, nowMs]);

  const getName = (ble: string) =>
    memberList.find((x) => x.bleCardNumber === ble)?.name ||
    visitorList.find((x) => x.bleCardNumber === ble)?.name ||
    ble ||
    'Unknown';

  const getStatusText = (status: string) => {
    const s = actionStatus.find((x) => x.value.toLowerCase() === status);
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
    return { top: baseTop + index * spacing, left: rect.right - 370 };
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
        title: alarmData.visitorName || alarmData.MemberName || alarmData.cardName || 'Unknown',
        subtitle: `${alarmData.cardName ?? ''} · ${alarmData.maskedAreaName ?? 'Unknown'} · ${
          alarmData.floorplanName ?? 'Unknown'
        }`,
        status: getStatusText(
          alarmData.action?.toLowerCase(),
        ),
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
  }, [memberList, visitorList]);

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
        <Badge badgeContent={bubbles.length} color="error">
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
                  action: 'idle',
                  priority: 'high', // Added priority
                  color: '#4caf50', // This will be used for chip color
                  status: 'EXAMPLE' // Added status for category
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
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
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

      {/* Menu (unchanged minimal) */}
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
        <Scrollbar sx={{ height: '385px' }}>
          <Box p={3}>
            <Typography variant="h6">All Notifications</Typography>
            <Button to="/report/alarmtrigger" component={Link} fullWidth variant="outlined">
              View All
            </Button>
          </Box>
        </Scrollbar>
      </Menu>
    </Box>
  );
};

export default Notifications;