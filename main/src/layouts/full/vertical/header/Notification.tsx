// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  IconButton,
  Box,
  Badge,
  Menu,
  MenuItem,
  Typography,
  Button,
  Chip,
  Stack,
  Paper,
  Fade,
  useTheme,
} from '@mui/material';
import Scrollbar from 'src/components/custom-scroll/Scrollbar';
import { actionStatus } from 'src/types/crud/input';
import { IconBellRinging } from '@tabler/icons-react';
import { Link } from 'react-router';
import { memberType } from 'src/store/apps/crud/member';
import { VisitorType } from 'src/store/apps/crud/visitor';
import { RootState, useSelector } from 'src/store/Store';
import { AlarmTriggerType } from 'src/store/apps/crud/alarmTrigger';

type BubbleData = {
  title: string;
  subtitle: string;
  status: string;
};

const AUTOHIDE_MS = 6000;

const Notifications = () => {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const bellRef = useRef<HTMLButtonElement | null>(null);

  // Bubble state
  const [bubble, setBubble] = useState<BubbleData | null>(null);
  const [bubblePos, setBubblePos] = useState<{ top: number; left: number } | null>(null);
  const hideTimer = useRef<number | null>(null);

  const openMenu = (event: React.MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget);
  const closeMenu = () => {
    setAnchorEl(null);
    // also close bubble when opening menu
    setBubble(null);
    if (hideTimer.current) {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  };

  // --- helpers ---
  const ONE_HOUR_MS = 60 * 60 * 1000;
  const toMs = (v: any) => {
    // accepts number | string | Date
    if (v instanceof Date) return v.getTime();
    const n = typeof v === 'number' ? v : Date.parse(v);
    return Number.isFinite(n) ? n : 0;
  };

  // Keep a ticking "now" so the 1h filter updates over time (every 60s)
  const [nowMs, setNowMs] = useState(Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  // Redux data
  const alarmTriggers: AlarmTriggerType[] = useSelector(
    (state: RootState) => state.alarmTriggerReducer.alarmTriggerAll || [],
  );
  const memberList: memberType[] = useSelector((s: RootState) => s.memberReducer.members);
  const visitorList: VisitorType[] = useSelector((s: RootState) => s.visitorReducer.visitors);

  // --- filter + sort at the Trigger level ---
  const filteredSortedTriggers = useMemo(() => {
    console.log(alarmTriggers);
    const pruned = alarmTriggers.filter((t) => {
      const active =
        (t as any).isActive === true ||
        // fallback: treat your mapped "Active" status as active too
        t.actionStatus === 'Idle';

      if (active) return true;

      // inactive: keep only if within 1 hour of triggerTime
      const tMs = toMs((t as any).triggerTime);
      return tMs > 0 ? nowMs - tMs <= ONE_HOUR_MS : false;
    });

    // newest first by triggerTime
    pruned.sort((a, b) => toMs(b.triggerTime) - toMs(a.triggerTime));
    return pruned;
  }, [alarmTriggers, nowMs]);

  const getName = (bleNumber: string) => {
    const m = memberList.find((x) => x.bleCardNumber === bleNumber);
    if (m) return m.name;
    const v = visitorList.find((x) => x.bleCardNumber === bleNumber);
    if (v) return v.name;
    return bleNumber || 'Unknown';
  };

  const getStatusText = (status: string) => {
    const statusItem = actionStatus.find((s) => s.value === status);
    if (!statusItem) return 'Unknown';
    switch (status) {
      case 'Idle':
        return 'Active';
      case 'Done':
        return 'Done';
      case 'NoAction':
        return 'No Action';
      case 'Waiting':
        return 'Waiting';
      case 'Investigated':
        return 'Investigated';
      case 'DoneInvestigated':
        return 'Done Investigated';
      case 'PostponeInvestigated':
        return 'Postpone Investigated';
      default:
        return statusItem.label;
    }
  };
  const activeTriggers = alarmTriggers.filter((t) => t.actionStatus === 'Idle');

  // Prepare list for dropdown (your original layout)
  const notifications = useMemo(
    () =>
      filteredSortedTriggers.map((trigger) => ({
        // keep your existing mapping
        title: getName(trigger.beaconId),
        subtitle: `${trigger.beaconId}`,
        status: getStatusText(trigger.actionStatus),
        // you can pass through triggerTime if you want to show it later
        triggerTime: trigger.triggerTime,
        isActive: (trigger as any).isActive === true || trigger.actionStatus === 'Idle',
      })),
    [filteredSortedTriggers, memberList, visitorList],
  );

  const activeNotifications = notifications.filter((n) => n.isActive);

  // Helper: compute anchored bubble position from bell icon
  const computeBubblePos = () => {
    if (!bellRef.current) return null;
    const rect = bellRef.current.getBoundingClientRect();
    return {
      top: Math.round(rect.bottom + 5),
      left: Math.round(rect.right - 345), // bubble width is 360
    };
  };

  // Listen for "app:new-alarm" events from FullLayout; show bubble only when:
  // - menu is CLOSED
  // - window IS FOCUSED (browser Notification already covers unfocused scenario)
  useEffect(() => {
    const onNewAlarm = (e: Event) => {
      const detail = (e as CustomEvent).detail?.alarm;
      if (!detail) return;
      if (anchorEl) return; // menu open → don't show bubble
      if (!document.hasFocus()) return; // only when window focused

      const bd: BubbleData = {
        title: getName(detail?.beaconId || ''),
        subtitle: `${detail?.beaconId || ''} · ${detail?.maskedAreaName ?? 'Unknown'} · ${
          detail?.floorplanName ?? 'Unknown'
        }`,
        status: getStatusText(detail?.actionStatus ?? 'Idle'),
      };
      setBubble(bd);
      setBubblePos(computeBubblePos());

      if (hideTimer.current) window.clearTimeout(hideTimer.current);
      hideTimer.current = window.setTimeout(() => setBubble(null), AUTOHIDE_MS);
    };

    window.addEventListener('app:new-alarm' as any, onNewAlarm);
    return () => {
      window.removeEventListener('app:new-alarm' as any, onNewAlarm);
      if (hideTimer.current) {
        window.clearTimeout(hideTimer.current);
        hideTimer.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorEl, memberList, visitorList]);

  // Recompute position on resize/scroll while bubble is open (so it stays “attached” to the bell)
  useEffect(() => {
    if (!bubble) return;
    const update = () => setBubblePos(computeBubblePos());
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, { passive: true });
    update();
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update);
    };
  }, [bubble]);

  return (
    <Box sx={{ position: 'relative' }}>
      <IconButton
        ref={bellRef}
        size="large"
        aria-label="show new notifications"
        color="error"
        aria-controls="msgs-menu"
        aria-haspopup="true"
        sx={{ color: anchorEl ? 'error.main' : 'text.secondary' }}
        onClick={openMenu}
      >
        <Badge badgeContent={activeNotifications.length} color="error">
          <IconBellRinging size="21" stroke="1.5" />
        </Badge>
      </IconButton>

      {/* Anchored bubble – shows ONLY when menu is closed AND window is focused */}
      <Fade in={Boolean(bubble) && !anchorEl} timeout={200} unmountOnExit>
        <Paper
          onMouseEnter={() => {
            if (hideTimer.current) {
              window.clearTimeout(hideTimer.current);
              hideTimer.current = null;
            }
          }}
          onMouseLeave={() => {
            if (!hideTimer.current)
              hideTimer.current = window.setTimeout(() => setBubble(null), AUTOHIDE_MS);
          }}
          onClick={() => setBubble(null)}
          elevation={8}
          sx={{
            position: 'fixed', // FIX: anchor to viewport
            top: bubblePos?.top ?? 64,
            left: bubblePos ? bubblePos.left : undefined,
            right: bubblePos ? undefined : 24,
            width: 360,
            px: 2,
            py: 1.25,
            borderRadius: 3,
            background: 'linear-gradient(to bottom, #c62828, #b71c1c)',
            color: 'white',
            border: '2px solid #ffcccc',
            zIndex: 2000,
            '&::before': {
              content: '""',
              position: 'absolute',
              top: -8,
              right: 28,
              borderWidth: '0 8px 8px 8px',
              borderStyle: 'solid',
              borderColor: 'transparent transparent #c62828 transparent',
            },
          }}
        >
          {bubble && (
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="flex-start"
              spacing={1.5}
            >
              <Box sx={{ pr: 1.5, minWidth: 0 }}>
                <Typography variant="subtitle2" sx={{ opacity: 0.75 }}>
                  Alarm Triggered
                </Typography>
                <Typography variant="h6" fontWeight={800} noWrap>
                  {bubble.title}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }} noWrap>
                  {bubble.subtitle}
                </Typography>
              </Box>
            </Stack>
          )}
        </Paper>
      </Fade>

      {/* Original dropdown menu (unchanged) */}
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
        <Stack
          direction="row"
          py={2}
          px={4}
          justifyContent="space-between"
          alignItems="center"
          sx={{
            background: 'linear-gradient(to right, #c62828, #b71c1c)',
            color: 'white',
          }}
        >
          <Typography variant="h6">Alarm</Typography>
          <Chip
            label={`${activeNotifications.length} new`}
            color="error"
            size="small"
            sx={{
              backgroundColor: '#ff7961',
              color: 'white',
              fontWeight: 'bold',
            }}
          />
        </Stack>

        <Scrollbar sx={{ height: '385px' }}>
          {notifications.map((n, index) => (
            <Box key={index}>
              <MenuItem
                sx={{
                  py: 2,
                  px: 4,
                  backgroundColor: n.isActive ? '#ffebee' : 'inherit', // light red for active
                  '&:hover': {
                    backgroundColor: n.isActive ? '#ffcdd2' : '#f5f5f5',
                  },
                }}
              >
                <Stack direction="row" spacing={2} justifyContent="space-between" width="100%">
                  <Box>
                    <Typography
                      variant="h6"
                      color="textPrimary"
                      fontWeight={600}
                      noWrap
                      sx={{ width: '200px' }}
                    >
                      {n.title}
                    </Typography>
                    <Typography
                      color="textSecondary"
                      variant="subtitle2"
                      sx={{ width: '200px' }}
                      noWrap
                    >
                      {n.subtitle}
                    </Typography>
                  </Box>
                  <Chip
                    label={n.status}
                    color={
                      n.status === 'Done' ? 'success' : n.status === 'Active' ? 'error' : 'default'
                    }
                    size="small"
                    sx={{ fontWeight: 'bold' }}
                  />
                </Stack>
              </MenuItem>
            </Box>
          ))}
        </Scrollbar>

        <Box p={3} pb={1}>
          <Button
            to="/report/alarmtrigger"
            variant="outlined"
            component={Link}
            color="primary"
            fullWidth
          >
            See all Notifications
          </Button>
        </Box>
      </Menu>
    </Box>
  );
};

export default Notifications;
