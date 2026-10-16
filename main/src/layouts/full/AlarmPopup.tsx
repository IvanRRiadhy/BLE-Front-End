import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dialog,
  Box,
  Button,
  Typography,
  Popover,
  Chip,
  Stack,
  DialogContent,
  DialogActions,
  DialogTitle,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
// import { AlarmType, MQTTAlarmType } from 'src/store/apps/tracking/Alarm';
import { actionStatus, actionStatusColormap } from 'src/types/crud/input';
import toast from 'react-hot-toast';
import {
  useAcknowledgeAlarmTrigger,
  useAlarmTriggerList,
  useAllAlarmTriggers,
  // useAssignActionAlarmTriggerByDMAC,
  useAssignActionAlarmTriggerByDMAC,
  useAssignActionAlarmTriggerByID,
  useDispatchAlarmTrigger,
  useNearestSecurity,
  usePostponeAlarmTrigger,
} from 'src/hooks/useAlarmTrigger';
import { alpha, darken, useTheme } from '@mui/material/styles';
import { motion, AnimatePresence } from 'framer-motion';
import AlarmActionForm from 'src/components/shared/AlarmActionForm';
import { useAllSecurityLookup } from 'src/hooks/useSecurityGuard';
import { useProfile } from 'src/hooks/useProfile';
import { memberType } from 'src/store/apps/crud/member';
import {
  AlarmLogItem,
  ClearAlarmPopup,
  MarkAlarmSeen,
  ShowAlarmPopup,
} from 'src/store/apps/tracking/Beacon';
import { dispatch, RootState, useSelector } from 'src/store/Store';
import { useEnrichedAlarmLogs, useUnseenAlarms } from 'src/hooks/useTrackingLogs';
import Scrollbar from 'src/components/custom-scroll/Scrollbar';
import AlarmMenuItem from './vertical/header/AlarmMenuItem';
import { defaultAlarmTriggerFilter } from 'src/store/apps/defaultForm';
import AlarmTriggerMenuItem from './shared/AlarmTriggerMenuItem';
import { useAreaCCTV, useAllMaskedAreas } from 'src/hooks/useMaskedArea';
import UniversalVideoPlayer from 'src/utils/UniversalPlayer';
import VideocamIcon from '@mui/icons-material/Videocam';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { IconExternalLink } from '@tabler/icons-react';
import { AlarmTriggerType, NearestSecurityType } from 'src/store/apps/crud/alarmTrigger';
import CustomAutocomplete from 'src/components/shared/CustomAutocomplete';
import dayjs, { Dayjs } from 'dayjs';
import duration from 'dayjs/plugin/duration';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
dayjs.extend(duration);

interface AlarmPopupProps {
  alarm: AlarmLogItem | null | undefined;
  // open: boolean;
  // onClose: () => void;
}

type AlarmType = AlarmTriggerType | AlarmLogItem;

const proximityColorMap: Record<string, string> = {
  SameArea: '#4caf50', // green
  SameFloorplan: '#2196f3', // blue
  SameFloor: '#ff9800', // orange
  SameBuilding: '#9c27b0', // purple
  DifferentBuilding: '#9e9e9e', // grey
};

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

const AlarmPopup: React.FC<AlarmPopupProps> = ({ alarm }) => {
  const popupRef = useRef<HTMLDivElement | null>(null);
  const [panelRect, setPanelRect] = useState<DOMRect | null>(null);
  const prevAlarmIdRef = useRef<string | null>(null);
  const theme = useTheme();
  const { data: profile } = useProfile();
  const canAlarmAction = Boolean(profile?.effectiveCanAlarmAction);

  // React Query mutation hook
  const assignActionMutation = useAssignActionAlarmTriggerByDMAC();
  const assignActionByIdMutation = useAssignActionAlarmTriggerByID();
  const acknowledgeMutation = useAcknowledgeAlarmTrigger();
  const dispatchMutation = useDispatchAlarmTrigger();
  const postponeMutation = usePostponeAlarmTrigger();

  const { data: data } = useAlarmTriggerList({
    ...defaultAlarmTriggerFilter,
    Length: 999,
    // filters: { isActive: true },
  });
  const alarmLogs =
    data?.data.filter((a) => a.action === 'Idle' || a.action === 'Acknowledged') || [];
  // console.log('Alarm Logs: ', alarmLogs);
  // const { unseenAlarms, unseenCount, markSeen } = useUnseenAlarms(alarm?.id);
  // State for action popover
  const [actionAnchorEl, setActionAnchorEl] = useState<HTMLElement | null>(null);
  const [selectedAction, setSelectedAction] = useState<string>('');

  // const { data: securityData = [], isLoading: isLoadingSecurity } = useAllSecurityLookup();
  const { data: nearestSecurityData = [], isLoading: isLoadingSecurity } = useNearestSecurity(
    alarm?.triggerId ?? '',
  );

  const [selectedSecurity, setSelectedSecurity] = useState<NearestSecurityType | null>(null);

  const proximityRank: Record<string, number> = {
    SameArea: 1,
    SameFloorplan: 2,
    SameFloor: 3,
    SameBuilding: 4,
    DifferentBuilding: 5,
  };

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

  const [investigateResult, setInvestigateResult] = useState('');
  // const [selectedSecurity, setSelectedSecurity] = useState<memberType | null>(null);

  const [openUnseenDialog, setOpenUnseenDialog] = useState(false);
  const [visuallySeenIds, setVisuallySeenIds] = useState<Set<string>>(new Set());
  const [selectedAlarms, setSelectedAlarms] = useState<AlarmType[]>([]);

  const [activeTab, setActiveTab] = useState<'details' | 'cctv'>('details');
  const [selectedCctvId, setSelectedCctvId] = useState<string | null>(null);
  const [openedInNewWindowCctvIds, setOpenedInNewWindowCctvIds] = useState<Set<string>>(new Set());

  const { data: allMaskedAreas = [] } = useAllMaskedAreas();

  // Resolve areaId from alarm object (or fallback to matching by area name)
  const targetAreaId = useMemo(() => {
    if (!alarm) return null;
    const a = alarm as any;
    if (a.floorplanMaskedAreaId) return a.floorplanMaskedAreaId;
    if (a.floorplanmaskedAreaId) return a.floorplanmaskedAreaId;
    if (a.areaId) return a.areaId;
    if (alarm.area && allMaskedAreas.length) {
      const trimmed = alarm.area.trim().toLowerCase();
      const found = allMaskedAreas.find(
        (m) =>
          m.id === alarm.area ||
          m.name?.trim().toLowerCase() === trimmed ||
          (m as any).areaName?.trim().toLowerCase() === trimmed,
      );
      if (found) return found.id;
    }
    return null;
  }, [alarm, allMaskedAreas]);

  const { data: cctvList = [], isLoading: isLoadingCCTV } = useAreaCCTV(targetAreaId);

  // Group unique RTSP streams to avoid duplicate video decoders/connections
  const uniqueRtspStreams = useMemo(() => {
    const seenUrls = new Set<string>();
    const uniqueStreams: { streamUrl: string; cctvIds: string[]; representativeCctv: (typeof cctvList)[0] }[] = [];

    cctvList.forEach((cctv) => {
      const url = cctv.rtsp ? cctv.rtsp.trim() : '';
      if (!url) return;

      const existing = uniqueStreams.find((s) => s.streamUrl === url);
      if (existing) {
        existing.cctvIds.push(cctv.id);
      } else {
        uniqueStreams.push({
          streamUrl: url,
          cctvIds: [cctv.id],
          representativeCctv: cctv,
        });
      }
    });

    return uniqueStreams;
  }, [cctvList]);

  // Reset opened in new window set whenever the alarm/area changes
  useEffect(() => {
    setOpenedInNewWindowCctvIds(new Set());
  }, [alarm?.id, targetAreaId]);

  useEffect(() => {
    if (cctvList.length > 0) {
      // Pick first un-opened CCTV if available, else pick first existing
      const availableCctvs = cctvList.filter((c) => !openedInNewWindowCctvIds.has(c.id));
      if (availableCctvs.length > 0) {
        if (!selectedCctvId || !availableCctvs.some((c) => c.id === selectedCctvId)) {
          setSelectedCctvId(availableCctvs[0].id);
        }
      } else {
        // All CCTVs have been opened in new window
        setSelectedCctvId(null);
      }
    } else {
      setSelectedCctvId(null);
    }
  }, [cctvList, selectedCctvId, openedInNewWindowCctvIds]);

  // Handler to open CCTV RTSP stream in a dedicated popup window
  const handleOpenInNewWindow = (cctv: { id: string; name: string; rtsp?: string }) => {
    if (!cctv) return;

    const streamUrl = cctv.rtsp || '';
    const cameraName = cctv.name || 'Live Camera Stream';
    const engineWsUrl = 'ws://192.168.1.166:8282';

    const newWin = window.open(
      '',
      `cctv_win_${cctv.id}`,
      'width=960,height=580,menubar=no,toolbar=no,location=no,status=no,resizable=yes',
    );

    if (newWin) {
      const popupHtml = `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>${cameraName} - CCTV Stream</title>
            <script src="https://cdn.jsdelivr.net/npm/flv.js@1.6.2/dist/flv.min.js"></script>
            <script src="https://cdn.jsdelivr.net/npm/hls.js@1.5.7/dist/hls.min.js"></script>
            <style>
              * { box-sizing: border-box; margin: 0; padding: 0; }
              body {
                background: #0c0f14;
                color: #fff;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                display: flex;
                flex-direction: column;
                height: 100vh;
                overflow: hidden;
              }
              header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 10px 16px;
                background: #151a23;
                border-bottom: 1px solid rgba(255,255,255,0.08);
                flex-shrink: 0;
              }
              .title-group {
                display: flex;
                align-items: center;
                gap: 10px;
              }
              .live-dot {
                width: 10px;
                height: 10px;
                border-radius: 50%;
                background: #4caf50;
                box-shadow: 0 0 8px #4caf50;
              }
              .cam-title {
                font-size: 15px;
                font-weight: 700;
              }
              .badge {
                background: #f44336;
                color: #fff;
                font-size: 11px;
                font-weight: 700;
                padding: 3px 8px;
                border-radius: 10px;
                letter-spacing: 0.5px;
              }
              .player-container {
                flex: 1;
                position: relative;
                background: #000;
                display: flex;
                align-items: center;
                justify-content: center;
              }
              video {
                width: 100%;
                height: 100%;
                object-fit: contain;
                outline: none;
              }
              .status-overlay {
                position: absolute;
                inset: 0;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 10px;
                background: rgba(0,0,0,0.85);
                font-size: 14px;
                color: rgba(255,255,255,0.8);
                transition: opacity 0.2s ease;
              }
              .spinner {
                width: 36px;
                height: 36px;
                border: 3px solid rgba(255,255,255,0.2);
                border-top-color: #fff;
                border-radius: 50%;
                animation: spin 0.8s linear infinite;
              }
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            </style>
          </head>
          <body>
            <header>
              <div class="title-group">
                <span class="live-dot"></span>
                <span class="cam-title">${cameraName}</span>
              </div>
              <span class="badge">LIVE RTSP</span>
            </header>
            <div class="player-container">
              <video id="videoElement" controls autoplay muted playsinline></video>
              <div id="statusOverlay" class="status-overlay">
                <div class="spinner"></div>
                <span>Connecting live camera stream...</span>
              </div>
            </div>
            <script>
              const streamUrl = ${JSON.stringify(streamUrl)};
              const engineWsUrl = ${JSON.stringify(engineWsUrl)};
              const video = document.getElementById('videoElement');
              const overlay = document.getElementById('statusOverlay');

              function hideOverlay() {
                if (overlay) overlay.style.display = 'none';
              }
              function showMessage(msg) {
                if (overlay) {
                  overlay.style.display = 'flex';
                  overlay.innerHTML = '<span style="color:#ff6b6b;font-weight:600;">' + msg + '</span>';
                }
              }

              video.addEventListener('playing', hideOverlay);

              if (!streamUrl) {
                showMessage('No RTSP URL configured for this camera.');
              } else if (streamUrl.startsWith('rtsp://')) {
                if (window.flvjs && flvjs.isSupported()) {
                  const wsUrl = engineWsUrl + '/?url=' + encodeURIComponent(streamUrl);
                  const flvPlayer = flvjs.createPlayer({
                    type: 'flv',
                    isLive: true,
                    hasAudio: false,
                    url: wsUrl
                  }, {
                    enableWorker: false,
                    enableStashBuffer: false,
                    stashInitialSize: 128,
                    autoCleanupSourceBuffer: true
                  });
                  flvPlayer.attachMediaElement(video);
                  flvPlayer.load();
                  flvPlayer.play().catch(e => console.log('Autoplay:', e));
                  flvPlayer.on(flvjs.Events.ERROR, (type, detail) => {
                    showMessage('Stream Error: ' + type + ' - ' + detail);
                  });
                } else {
                  showMessage('FLV playback is not supported in this browser.');
                }
              } else if (streamUrl.includes('m3u8')) {
                if (window.Hls && Hls.isSupported()) {
                  const hls = new Hls({ enableWorker: true });
                  hls.loadSource(streamUrl);
                  hls.attachMedia(video);
                  hls.on(Hls.Events.MANIFEST_PARSED, () => video.play());
                  hls.on(Hls.Events.ERROR, (_, data) => {
                    if (data.fatal) showMessage('HLS Error: ' + data.type);
                  });
                } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                  video.src = streamUrl;
                  video.play();
                } else {
                  showMessage('HLS playback is not supported in this browser.');
                }
              } else {
                showMessage('Unsupported stream URL: ' + streamUrl);
              }
            </script>
          </body>
        </html>
      `;
      newWin.document.open();
      newWin.document.write(popupHtml);
      newWin.document.close();
      newWin.focus();
    } else {
      toast.error('Pop-up window was blocked. Please enable pop-ups for this site.');
    }

    // Mark this CCTV as opened in new window
    setOpenedInNewWindowCctvIds((prev) => {
      const nextSet = new Set(prev);
      nextSet.add(cctv.id);
      return nextSet;
    });

    // Auto cycle to the next un-opened CCTV on the list
    const unOpened = cctvList.filter((c) => c.id !== cctv.id && !openedInNewWindowCctvIds.has(c.id));
    if (unOpened.length > 0) {
      // Find currentIndex in cctvList and look for next un-opened
      const currentIdx = cctvList.findIndex((c) => c.id === cctv.id);
      let nextCctv = unOpened.find((c, i) => {
        const idx = cctvList.findIndex((item) => item.id === c.id);
        return idx > currentIdx;
      });
      if (!nextCctv) {
        nextCctv = unOpened[0];
      }
      setSelectedCctvId(nextCctv.id);
    } else {
      setSelectedCctvId(null);
    }
  };

  const notificationSetting = useSelector((state: RootState) => state.settings.notificationSetting);

  const notificationAudio = useMemo(() => {
    const audio = new Audio('/sfx/AlarmNotification/Calm-Warning.wav');
    audio.volume = 0.6;
    return audio;
  }, []);

  useEffect(() => {
    if (!alarm?.id) return;
    console.log('Alarm Popup: ', alarm);
    // 🔥 only play if new alarm (avoid replay on rerender)
    if (prevAlarmIdRef.current !== alarm.id) {
      prevAlarmIdRef.current = alarm.id;

      if (notificationSetting !== 'mute') {
        notificationAudio.currentTime = 0;

        notificationAudio.play().catch((err) => {
          console.warn('Audio playback blocked:', err);
        });
      }
    }
  }, [alarm?.id, notificationSetting]);

  const handleDisarmClick = (event: React.MouseEvent<HTMLElement>) => {
    setActionAnchorEl(popupRef.current);
  };

  const handleActionClose = () => {
    setActionAnchorEl(null);
    setSelectedAction('');
  };

  const extractTriggerId = (alarmId: string): string | null => {
    const match = alarmId.match(/^alarm-([a-fA-F0-9-]{36})-/);
    return match ? match[1] : null;
  };

  const handleApplyAction = async () => {
    if (!alarm?.dmac) {
      toast.error('No alarm selected');
      handleActionClose();
      return;
    }

    if (!selectedAction) {
      toast.error('Please select an action status');
      return;
    }

    if (selectedAction.toLowerCase() === 'done' && investigateResult.trim() === '') {
      toast.error('Please provide investigation result');
      return;
    }

    if (selectedAction.toLowerCase() === 'investigated' && !selectedSecurity) {
      toast.error('Please select a security guard');
      return;
    }

    const idsToProcess = visuallySeenIds.size > 0 ? Array.from(visuallySeenIds) : [];
    const currentTriggerId = extractTriggerId(alarm?.id);
    if (currentTriggerId && !visuallySeenIds.has(currentTriggerId)) {
      idsToProcess.push(currentTriggerId);
    }
    // idsToProcess.push(extractTriggerId(alarm?.id) ?? '');
    let successCount = 0;
    let failedCount = 0;

    for (const triggerId of idsToProcess) {
      // const triggerId = extractTriggerId(alarmId);

      if (!triggerId) {
        failedCount++;
        continue;
      }

      try {
        await assignActionByIdMutation.mutateAsync({
          triggerId,
          actionStatus: selectedAction.toLowerCase(),
          investigatedResult:
            selectedAction.toLowerCase() === 'done' ? investigateResult.trim() : null,
          assignedSecurityId:
            selectedAction.toLowerCase() === 'investigated' && selectedSecurity
              ? selectedSecurity.securityId
              : null,
        });

        successCount++;
      } catch {
        failedCount++;
      }
    }
    if (successCount > 0) {
      toast.success(`Processed: ${successCount} success`);
    }
    if (failedCount > 0) {
      toast.error(`Processed: ${failedCount} failed`);
    }
    // toast.success(`Processed: ${successCount} success, ${failedCount} failed`);
    setVisuallySeenIds(new Set());
    handleActionClose();
    dispatch(ClearAlarmPopup());
  };

  const handleDispatchAction = async () => {
    if (!alarm?.dmac) {
      toast.error('No alarm selected');
      handleActionClose();
      return;
    }
    const alarmToProcess: AlarmType[] = [...selectedAlarms];

    if (alarm) {
      const currentTriggerId = extractTriggerId(alarm?.id);
      const exists = alarmToProcess.find((a) => a.id === currentTriggerId);
      if (!exists) {
        alarmToProcess.push({ ...alarm, id: currentTriggerId ?? alarm.id });
      }
    }
    console.log('Selected Sec', selectedSecurity);
    if (!selectedSecurity) {
      toast.error('Please select a security');
      return;
    } else {
      console.log(selectedSecurity);
    }
    // const idsToProcess = visuallySeenIds.size > 0 ? Array.from(visuallySeenIds) : [];
    // const currentTriggerId = extractTriggerId(alarm?.id);
    // if (currentTriggerId && !visuallySeenIds.has(currentTriggerId)) {
    //   idsToProcess.push(currentTriggerId);
    // }
    // idsToProcess.push(extractTriggerId(alarm?.id) ?? '');
    let successCount = 0;
    let failedCount = 0;
    for (const a of alarmToProcess) {
      if (!a.id) {
        failedCount++;
        continue;
      }
      // if (a.action?.toLowerCase() !== 'acknowledged') {
      //   toast.error('Alarm is not acknowledged');
      //   failedCount++;
      //   continue;
      // }
      try {
        const result = await dispatchMutation.mutateAsync({
          id: a.id.toUpperCase(),
          assignedSecurityId: selectedSecurity.securityId,
        });
        console.log('Success result', result);
        // toast.success('Action dispatched successfully');
        successCount++;
      } catch (error: any) {
        // toast.error('Error dispatching action');
        console.error('Error dispatching action', error);
        failedCount++;
      } finally {
      }
    }
    if (successCount > 0) {
      toast.success(`Processed: ${successCount} success`);
    }
    if (failedCount > 0) {
      toast.error(`Processed: ${failedCount} failed`);
    }
    setVisuallySeenIds(new Set());
    handleActionClose();
    dispatch(ClearAlarmPopup());
    setSelectedSecurity(null);
    setSelectedAction('');
  };

  const actionOpen = Boolean(actionAnchorEl);
  const actionId = actionOpen ? 'action-status-popover' : undefined;

  const isLowBattery =
    alarm?.alarmStatus?.toLowerCase() === 'lowbattery' ||
    (alarm as any)?.status?.toLowerCase() === 'lowbattery';

  const isBlacklist =
    alarm?.alarmStatus?.toLowerCase() === 'blacklist' ||
    (alarm as any)?.status?.toLowerCase() === 'blacklist' ||
    (alarm as any)?.alarmType?.toLowerCase() === 'blacklist' ||
    (alarm as any)?.alarm?.toLowerCase() === 'blacklist' ||
    (alarm as any)?.type?.toLowerCase() === 'blacklist';

  // Automatically critical if blacklist, otherwise use alarm.priority or fallback
  const effectivePriority = isBlacklist
    ? 'critical'
    : alarm?.priority || (isLowBattery ? 'low' : 'medium');

  // Get priority color for the popup background
  const priorityColor = getPriorityColor(effectivePriority);
  // Get chip color from alarm.color or use a default
  const chipColor = alarm?.color || (isLowBattery ? '#c8b560' : isBlacklist ? '#dc143c' : '#2196f3');

  const handleBackdropClose = () => {
    // ❗ UI-only close
    dispatch(ClearAlarmPopup());
    if (alarm && !isLowBattery && alarm.action === 'Idle' && alarm.triggerId) {
      acknowledgeMutation.mutateAsync(alarm.triggerId);
    }
  };
  const handleAcknowledgeClick = (clickedAlarm: string, action: string) => {
    if (clickedAlarm && action === 'Idle') {
      acknowledgeMutation.mutateAsync(clickedAlarm);
    }
  };
  useEffect(() => {
    if (!alarm) return;

    // 🔥 Hard reset UI state when alarm changes
    setActionAnchorEl(null);
    setSelectedAction('');
    setInvestigateResult('');
    setSelectedSecurity(null);
    setOpenUnseenDialog(false);
    setVisuallySeenIds(new Set());
    setActiveTab('details');
  }, [alarm?.id]);
  useEffect(() => {
    if (!alarm) {
      setActionAnchorEl(null);
      setSelectedAction('');
      setInvestigateResult('');
      setSelectedSecurity(null);
      setOpenUnseenDialog(false);
      setVisuallySeenIds(new Set());
      setActiveTab('details');
    }
  }, [alarm]);

  //Unseen Alarm

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
    if (!popupRef.current) return;

    const updateRect = () => {
      if (!popupRef.current) return;
      setPanelRect(popupRef.current.getBoundingClientRect());
    };

    updateRect(); // initial measure
    const rafId = requestAnimationFrame(updateRect);

    // Periodically update rect while layout animation is running (350ms duration)
    const intervalId = setInterval(updateRect, 30);
    const stopIntervalTimer = setTimeout(() => {
      clearInterval(intervalId);
      updateRect();
    }, 450);

    const resizeObserver = new ResizeObserver(() => {
      updateRect();
    });

    resizeObserver.observe(popupRef.current);
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect);

    return () => {
      cancelAnimationFrame(rafId);
      clearInterval(intervalId);
      clearTimeout(stopIntervalTimer);
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect);
    };
  }, [alarm, actionOpen, openUnseenDialog, activeTab]);

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

  const handlePostpone = async () => {
    if (!alarm?.dmac) {
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

    const alarmToProcess: AlarmType[] = [...selectedAlarms];

    // include main alarm if not selected
    if (alarm) {
      const currentTriggerId = extractTriggerId(alarm?.id);
      const exists = alarmToProcess.find((a) => a.id === currentTriggerId);

      if (!exists) {
        alarmToProcess.push({ ...alarm, id: currentTriggerId ?? alarm.id });
      }
    }

    let successCount = 0;
    let failedCount = 0;

    for (const a of alarmToProcess) {
      if (!a.id) {
        failedCount++;
        continue;
      }

      try {
        await postponeMutation.mutateAsync({
          id: a.id.toUpperCase(),
          postponedUntilDate: postponeDate.toISOString(),
          postponeReason: postponeReason.trim(),
        });

        successCount++;
      } catch (error) {
        console.error('Error postponing alarm', error);
        failedCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`Processed: ${successCount} success`);
    }

    if (failedCount > 0) {
      toast.error(`Processed: ${failedCount} failed`);
    }

    // reset state
    setOpenPostponeDialog(false);
    setPostponeDate(null);
    setPostponeReason('');
    setSelectedAlarms([]);
  };

  return (
    <>
      {/* ========= ROOT MODAL (ONLY ONE) ========= */}
      <Dialog
        open={Boolean(alarm)}
        onClose={(_, reason) => {
          if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
            handleBackdropClose();
          }
        }}
        fullScreen
        // hideBackdrop
        disableEnforceFocus
        disableAutoFocus
        disableRestoreFocus
        PaperProps={{
          sx: {
            backgroundColor: 'transparent',
            boxShadow: 'none',
            overflow: 'visible',
          },
        }}
      >
        {/* Fullscreen interaction layer */}
        <Box
          sx={{
            position: 'fixed',
            inset: 0,
            pointerEvents: 'none', // 👈 key trick
          }}
        >
          <AnimatePresence>
            {alarm && (
              <>
                {/* Zero-size anchor point fixed at (30%, 35%) */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: 0,
                    height: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'none',
                    zIndex: 10,
                  }}
                >
                  <motion.div
                    key={`main-${alarm.id}`}
                    layout
                    initial={{ opacity: 0, scale: 0.85, y: 20 }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                      y: 0,
                    }}
                    exit={{ opacity: 0, scale: 0.85, y: -20 }}
                    transition={{
                      opacity: { duration: 0.25, ease: 'easeOut' },
                      scale: { duration: 0.25, ease: 'easeOut' },
                      layout: { duration: 0.35, ease: [0.4, 0, 0.2, 1] },
                    }}
                    onUpdate={() => {
                      if (popupRef.current) {
                        setPanelRect(popupRef.current.getBoundingClientRect());
                      }
                    }}
                    onLayoutAnimationComplete={() => {
                      if (popupRef.current) {
                        setPanelRect(popupRef.current.getBoundingClientRect());
                      }
                    }}
                    style={{
                      pointerEvents: 'auto',
                    }}
                  >
                    <Box
                      ref={popupRef}
                      sx={{
                        background: `linear-gradient(135deg, ${alpha(priorityColor, 0.95)}, ${darken(
                          priorityColor,
                          0.25,
                        )})`,
                        color: 'white',
                        borderRadius: 4,
                        px: { xs: 3, sm: 5 },
                        pt: 3,
                        pb: 7,
                        minWidth: activeTab === 'cctv' ? { xs: '92vw', sm: 560, md: 680 } : { xs: '90vw', sm: 460, md: 560 },
                        maxWidth: '92vw',
                        textAlign: 'center',
                        boxShadow: `0 8px 30px ${alpha(priorityColor, 0.5)}`,
                        border: `1px solid ${alpha(priorityColor, 0.4)}`,
                        position: 'relative',
                      }}
                    >
                    {/* 🔴 UNSEEN BADGE */}
                    {alarmLogs.length > 0 && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: -20,
                          left: -20,
                          width: 48,
                          height: 48,
                          borderRadius: '50%',
                          backgroundColor: darken(priorityColor, 0.1),
                          color: '#fff',
                          fontWeight: 'bold',
                          fontSize: '1.1rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          boxShadow: `0 6px 18px ${alpha(priorityColor, 0.5)}`,
                          border: `2px solid ${alpha('#fff', 0.6)}`,
                        }}
                        onClick={() => {
                          setOpenUnseenDialog((v) => {
                            const next = !v;

                            // if closing panel → clear selections
                            if (!next) {
                              setSelectedAlarms([]);
                            }

                            return next;
                          });
                        }}
                      >
                        +{alarmLogs.length}
                      </Box>
                    )}

                    <Box display="flex" alignItems="center" justifyContent="center" gap={1.5} mb={1.5}>
                      <Typography variant="h3" fontWeight="bold" letterSpacing={2}>
                        ALARM TRIGGERED
                      </Typography>
                      {notificationSetting === 'mute' && (
                        <Tooltip title="Sound Muted">
                          <VolumeOffIcon sx={{ fontSize: '1.8rem', opacity: 0.9 }} />
                        </Tooltip>
                      )}
                    </Box>

                    <Box
                      sx={{
                        backgroundColor: chipColor,
                        px: 3,
                        py: 0.8,
                        borderRadius: 20,
                        mb: 2,
                        fontWeight: 'bold',
                        fontSize: '1.1rem',
                        display: 'inline-block',
                      }}
                    >
                      {alarm.alarmStatus?.toUpperCase() || (alarm as any).status?.toUpperCase()}
                    </Box>

                    {/* 🔘 VIEW TOGGLE PILLS (Details vs CCTV) */}
                    <Box display="flex" justifyContent="center" mb={3}>
                      <Box
                        sx={{
                          display: 'inline-flex',
                          backgroundColor: alpha('#000', 0.25),
                          backdropFilter: 'blur(8px)',
                          p: '4px',
                          borderRadius: 30,
                          border: `1px solid ${alpha('#fff', 0.2)}`,
                        }}
                      >
                        <Button
                          size="small"
                          onClick={() => setActiveTab('details')}
                          startIcon={<InfoOutlinedIcon fontSize="small" />}
                          sx={{
                            borderRadius: 24,
                            px: 2.5,
                            py: 0.6,
                            fontSize: '0.875rem',
                            fontWeight: activeTab === 'details' ? 700 : 500,
                            color: activeTab === 'details' ? priorityColor : alpha('#fff', 0.8),
                            backgroundColor: activeTab === 'details' ? '#fff' : 'transparent',
                            boxShadow: activeTab === 'details' ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
                            textTransform: 'none',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              backgroundColor: activeTab === 'details' ? '#fff' : alpha('#fff', 0.15),
                              color: activeTab === 'details' ? priorityColor : '#fff',
                            },
                          }}
                        >
                          Details
                        </Button>

                        <Button
                          size="small"
                          onClick={() => setActiveTab('cctv')}
                          startIcon={<VideocamIcon fontSize="small" />}
                          sx={{
                            borderRadius: 24,
                            px: 2.5,
                            py: 0.6,
                            fontSize: '0.875rem',
                            fontWeight: activeTab === 'cctv' ? 700 : 500,
                            color: activeTab === 'cctv' ? priorityColor : alpha('#fff', 0.8),
                            backgroundColor: activeTab === 'cctv' ? '#fff' : 'transparent',
                            boxShadow: activeTab === 'cctv' ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
                            textTransform: 'none',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              backgroundColor: activeTab === 'cctv' ? '#fff' : alpha('#fff', 0.15),
                              color: activeTab === 'cctv' ? priorityColor : '#fff',
                            },
                          }}
                        >
                          CCTV {cctvList.length > 0 && `(${cctvList.length})`}
                        </Button>
                      </Box>
                    </Box>

                    {/* CONTENT SECTION: DETAILS TAB */}
                    {activeTab === 'details' && (
                      <Box>
                        {isLowBattery ? (
                          <>
                            <Typography variant="h4" fontWeight={700} mb={2}>
                              {alarm.alarmName || (alarm as any).alarmName || alarm.target || 'Low battery alert'}
                            </Typography>

                            {(() => {
                              const personName = (alarm as any)?.personName || (alarm?.target && alarm?.target !== 'Unknown' ? alarm.target : null);
                              const personCategory = (alarm as any)?.personCategory || (alarm?.personType && alarm?.personType !== 'Security' ? alarm.personType : null);
                              const usedByParts = [personName, personCategory].filter(Boolean);
                              const usedBy = usedByParts.length > 0 ? usedByParts.join(' | ') : null;

                              return usedBy ? (
                                <Typography mb={3} fontSize="1.15rem">
                                  Currently used by : <b>{usedBy}</b>
                                </Typography>
                              ) : null;
                            })()}

                            <Box display="flex" justifyContent="center" gap={2} mb={3}>
                              <Typography>Priority:</Typography>
                              <Chip
                                label={effectivePriority.toUpperCase()}
                                sx={{
                                  backgroundColor: priorityColor,
                                  color: 'white',
                                  fontWeight: 'bold',
                                }}
                              />
                            </Box>
                          </>
                        ) : (
                          <>
                            <Typography mb={2}>
                              🔔 Triggered by <b>{alarm.target}</b>
                            </Typography>

                            <Typography mb={2}>
                              Card: <b>{alarm.dmac}</b>
                            </Typography>

                            <Typography mb={3}>
                              Area: <b>{alarm.area}</b> | <b>{alarm.floor}</b>
                            </Typography>

                            <Box display="flex" justifyContent="center" gap={2} mb={3}>
                              <Typography>Priority:</Typography>
                              <Chip
                                label={effectivePriority.toUpperCase()}
                                sx={{
                                  backgroundColor: priorityColor,
                                  color: 'white',
                                  fontWeight: 'bold',
                                }}
                              />
                            </Box>
                          </>
                        )}
                      </Box>
                    )}

                    {/* CONTENT SECTION: CCTV TAB */}
                    {/* Rendered container with pre-rendered CCTV players kept alive */}
                    <Box
                      sx={{
                        display: activeTab === 'cctv' ? 'block' : 'none',
                        width: '100%',
                        mt: 1,
                        mb: 3,
                      }}
                    >
                      {isLoadingCCTV ? (
                        <Box
                          sx={{
                            height: 320,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: alpha('#000', 0.3),
                            borderRadius: 3,
                          }}
                        >
                          <CircularProgress color="inherit" />
                          <Typography ml={2} fontWeight={600}>Loading CCTVs...</Typography>
                        </Box>
                      ) : cctvList.length === 0 ? (
                        <Box
                          sx={{
                            height: 300,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: alpha('#000', 0.3),
                            borderRadius: 3,
                            p: 3,
                          }}
                        >
                          <VideocamIcon sx={{ fontSize: 48, opacity: 0.6, mb: 1 }} />
                          <Typography variant="h6">No CCTVs Available</Typography>
                          <Typography variant="body2" sx={{ opacity: 0.8 }}>
                            There are currently no active CCTV streams configured.
                          </Typography>
                        </Box>
                      ) : (
                        <Box sx={{ position: 'relative', width: '100%' }}>
                          {/* Active CCTV Name Indicator */}
                          {selectedCctvId && (
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                mb: 1.5,
                                px: 1,
                              }}
                            >
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Box
                                  sx={{
                                    width: 10,
                                    height: 10,
                                    borderRadius: '50%',
                                    backgroundColor: '#4caf50',
                                    boxShadow: '0 0 8px #4caf50',
                                  }}
                                />
                                <Typography variant="subtitle1" fontWeight={700}>
                                  {cctvList.find((c) => c.id === selectedCctvId)?.name || 'Live Camera Stream'}
                                </Typography>
                              </Stack>
                              <Chip
                                size="small"
                                label="LIVE RTSP"
                                sx={{
                                  backgroundColor: '#f44336',
                                  color: '#fff',
                                  fontWeight: 700,
                                  fontSize: '0.7rem',
                                  height: 20,
                                }}
                              />
                            </Box>
                          )}

                          {/* Fallback if all CCTVs have been opened in new windows */}
                          {(!selectedCctvId || openedInNewWindowCctvIds.size >= cctvList.length) ? (
                            <Box
                              sx={{
                                height: 300,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: alpha('#000', 0.45),
                                borderRadius: 3,
                                p: 3,
                                border: '1px dashed rgba(255,255,255,0.25)',
                              }}
                            >
                              <IconExternalLink size={44} style={{ opacity: 0.8, marginBottom: 12 }} />
                              <Typography variant="h6" fontWeight={700}>
                                CCTV stream opened in new window
                              </Typography>
                              <Typography variant="body2" sx={{ opacity: 0.8, mt: 0.5, maxWidth: 380 }}>
                                All available camera streams for this area are currently active in separate window(s).
                              </Typography>
                              <Button
                                size="small"
                                variant="outlined"
                                color="inherit"
                                onClick={() => {
                                  setOpenedInNewWindowCctvIds(new Set());
                                  if (cctvList.length > 0) setSelectedCctvId(cctvList[0].id);
                                }}
                                sx={{
                                  mt: 2,
                                  borderRadius: 20,
                                  borderColor: 'rgba(255,255,255,0.4)',
                                  textTransform: 'none',
                                  fontSize: '0.8rem',
                                  '&:hover': {
                                    borderColor: '#fff',
                                    backgroundColor: 'rgba(255,255,255,0.1)',
                                  },
                                }}
                              >
                                Re-dock streams to this popup
                              </Button>
                            </Box>
                          ) : (
                            /* Pre-rendered CCTV stream views: initialized once upon response */
                            <Box
                              sx={{
                                position: 'relative',
                                width: '100%',
                                backgroundColor: '#000',
                                borderRadius: 3,
                                overflow: 'hidden',
                                boxShadow: '0 6px 24px rgba(0,0,0,0.4)',
                                minHeight: 240,
                                maxHeight: 380,
                              }}
                            >
                              {/* Floating Semi-Transparent Overlay: Open in new window */}
                              {selectedCctvId && (() => {
                                const activeCctv = cctvList.find((c) => c.id === selectedCctvId);
                                if (!activeCctv) return null;

                                return (
                                  <Box
                                    sx={{
                                      position: 'absolute',
                                      top: 12,
                                      right: 12,
                                      zIndex: 5,
                                    }}
                                  >
                                    <Tooltip title="Open this RTSP stream in a dedicated popup window" arrow>
                                      <Button
                                        size="small"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleOpenInNewWindow(activeCctv);
                                        }}
                                        startIcon={<IconExternalLink size={16} />}
                                        sx={{
                                          backgroundColor: 'rgba(0, 0, 0, 0.65)',
                                          backdropFilter: 'blur(8px)',
                                          color: '#fff',
                                          borderRadius: 20,
                                          px: 1.8,
                                          py: 0.5,
                                          fontSize: '0.78rem',
                                          fontWeight: 600,
                                          textTransform: 'none',
                                          border: '1px solid rgba(255, 255, 255, 0.25)',
                                          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                                          transition: 'all 0.2s ease',
                                          '&:hover': {
                                            backgroundColor: 'rgba(0, 0, 0, 0.88)',
                                            borderColor: 'rgba(255, 255, 255, 0.6)',
                                            transform: 'scale(1.02)',
                                          },
                                        }}
                                      >
                                        Open in new window
                                      </Button>
                                    </Tooltip>
                                  </Box>
                                );
                              })()}

                              {/* Unique pre-rendered video players */}
                              {uniqueRtspStreams.map((streamGroup) => {
                                const isGroupActive = Boolean(
                                  selectedCctvId && streamGroup.cctvIds.includes(selectedCctvId),
                                );

                                return (
                                  <Box
                                    key={streamGroup.streamUrl}
                                    sx={{
                                      display: isGroupActive ? 'block' : 'none',
                                      width: '100%',
                                      height: '100%',
                                    }}
                                  >
                                    <UniversalVideoPlayer
                                      streamUrl={streamGroup.streamUrl}
                                      style={{
                                        width: '100%',
                                        height: '100%',
                                        maxHeight: 380,
                                        borderRadius: 0,
                                      }}
                                    />
                                  </Box>
                                );
                              })}

                              {/* Fallback for selected CCTV without an RTSP URL */}
                              {selectedCctvId &&
                                !uniqueRtspStreams.some((s) => s.cctvIds.includes(selectedCctvId)) && (
                                  <Box
                                    sx={{
                                      height: 280,
                                      display: 'flex',
                                      flexDirection: 'column',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      color: 'rgba(255,255,255,0.7)',
                                    }}
                                  >
                                    <VideocamIcon sx={{ fontSize: 40, mb: 1, opacity: 0.5 }} />
                                    <Typography variant="body2">
                                      No RTSP URL configured for{' '}
                                      {cctvList.find((c) => c.id === selectedCctvId)?.name || 'this camera'}
                                    </Typography>
                                  </Box>
                                )}
                            </Box>
                          )}
                        </Box>
                      )}
                    </Box>

                    {/* ACTION BUTTON */}
                    <Box
                      onClick={() => {
                        if (isLowBattery || !canAlarmAction) {
                          dispatch(ClearAlarmPopup());
                        } else {
                          setActionAnchorEl(popupRef.current);
                          handleAcknowledgeClick(alarm.id, alarm.action);
                        }
                      }}
                      sx={{
                        position: 'absolute',
                        bottom: -24,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        backgroundColor: '#fff',
                        borderRadius: 40,
                        px: 6,
                        py: 1.8,
                        minWidth: 220,
                        boxShadow: 2,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          backgroundColor: theme.palette.warning.main,
                          boxShadow: `0 0 12px ${alpha(priorityColor, 0.5)}`,
                        },

                        '&:active': {
                          transform: 'translateX(-50%) scale(0.97)',
                        },
                      }}
                    >
                      <Typography
                        sx={{
                          color: priorityColor,
                          fontWeight: 'bold',
                          fontSize: '1.15rem',
                        }}
                      >
                        {isLowBattery ? 'Dismiss' : 'Disarm'}
                      </Typography>
                    </Box>
                  </Box>
                </motion.div>
              </Box>

                {/* ========= CCTV DETAILS & CAMERAS SIDEBAR (LEFT) ========= */}
                {activeTab === 'cctv' && (() => {
                  const isBothOpen = openUnseenDialog;
                  const totalH = panelRect?.height ? panelRect.height : 520;
                  const gap = 12;
                  const halfH = Math.max(Math.floor((totalH - gap) / 2), 220);

                  const sidebarTop = isBothOpen
                    ? (panelRect ? panelRect.top + halfH + gap : 0)
                    : (panelRect ? panelRect.top : '-100%');
                  const sidebarMaxHeight = isBothOpen ? halfH : Math.max(totalH, 480);
                  const scrollMaxHeight = isBothOpen ? Math.max(halfH - 170, 90) : 340;

                  return (
                    <motion.div
                      key="cctv-sidebar"
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{
                        opacity: 1,
                        x: 0,
                      }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{
                        duration: 0.25,
                        ease: 'easeInOut',
                        layout: { duration: 0.35, ease: [0.4, 0, 0.2, 1] },
                      }}
                      style={{
                        position: 'absolute',
                        top: sidebarTop,
                        left: panelRect ? panelRect.left - 360 - 16 : 0,
                        width: 360,
                        pointerEvents: 'auto',
                        zIndex: 9,
                      }}
                    >
                      <Box
                        sx={{
                          backgroundColor: '#fff',
                          borderRadius: 3,
                          boxShadow: 8,
                          overflow: 'hidden',
                          display: 'flex',
                          flexDirection: 'column',
                          height: isBothOpen ? sidebarMaxHeight : 'auto',
                          maxHeight: sidebarMaxHeight,
                          transition: 'all 0.25s ease',
                        }}
                      >
                        {/* Sidebar Header: Alarm Summary / Details */}
                        <Box
                          sx={{
                            p: isBothOpen ? 1.5 : 2,
                            background: `linear-gradient(135deg, ${alpha(priorityColor, 0.12)}, ${alpha(
                              priorityColor,
                              0.04,
                            )})`,
                            borderBottom: '1px solid #eee',
                            flexShrink: 0,
                          }}
                        >
                          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.6}>
                            <Typography fontWeight="bold" fontSize="0.9rem" color="text.primary">
                              Alarm Details
                            </Typography>
                            <Chip
                              size="small"
                              label={effectivePriority.toUpperCase()}
                              sx={{
                                backgroundColor: priorityColor,
                                color: '#fff',
                                fontWeight: 700,
                                fontSize: '0.68rem',
                                height: 20,
                              }}
                            />
                          </Stack>

                          <Stack spacing={0.4}>
                            <Box display="flex" justifyContent="space-between" fontSize="0.82rem">
                              <Typography variant="caption" color="text.secondary">Triggered By:</Typography>
                              <Typography variant="body2" fontWeight={600} color="text.primary">{alarm.target || '-'}</Typography>
                            </Box>
                            <Box display="flex" justifyContent="space-between" fontSize="0.82rem">
                              <Typography variant="caption" color="text.secondary">Card / MAC:</Typography>
                              <Typography variant="body2" fontWeight={600} color="text.primary">{alarm.dmac || '-'}</Typography>
                            </Box>
                            <Box display="flex" justifyContent="space-between" fontSize="0.82rem">
                              <Typography variant="caption" color="text.secondary">Location:</Typography>
                              <Typography variant="body2" fontWeight={600} color="text.primary">
                                {alarm.area || '-'} {alarm.floor ? `| ${alarm.floor}` : ''}
                              </Typography>
                            </Box>
                            {isLowBattery && (
                              <Box display="flex" justifyContent="space-between" fontSize="0.82rem">
                                <Typography variant="caption" color="text.secondary">Alert:</Typography>
                                <Typography variant="body2" fontWeight={600} color="warning.main">Low Battery</Typography>
                              </Box>
                            )}
                          </Stack>
                        </Box>

                        {/* CCTV List Section Header */}
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            px: 2,
                            py: 1,
                            backgroundColor: '#f8f9fa',
                            borderBottom: '1px solid #eee',
                            flexShrink: 0,
                          }}
                        >
                          <Stack direction="row" spacing={1} alignItems="center">
                            <VideocamIcon fontSize="small" sx={{ color: theme.palette.text.secondary }} />
                            <Typography fontWeight={700} fontSize="0.85rem" color="text.primary">
                              Available CCTVs
                            </Typography>
                          </Stack>
                          <Chip
                            size="small"
                            label={`${cctvList.length} cameras`}
                            sx={{ fontSize: '0.68rem', height: 18 }}
                          />
                        </Box>

                        {/* CCTV List Items */}
                        <Scrollbar sx={{ maxHeight: scrollMaxHeight, flex: 1 }}>
                          <Stack spacing={1} p={1.2}>
                            {cctvList.length === 0 ? (
                              <Box py={2} textAlign="center" color="text.secondary">
                                <Typography variant="body2">No CCTVs found</Typography>
                              </Box>
                            ) : (
                              cctvList.map((cctv) => {
                                const isSelected = selectedCctvId === cctv.id;
                                return (
                                  <Box
                                    key={cctv.id}
                                    onClick={() => setSelectedCctvId(cctv.id)}
                                    sx={{
                                      p: 1.2,
                                      borderRadius: 2,
                                      cursor: 'pointer',
                                      border: isSelected ? `2px solid ${primaryColor}` : '1px solid #e0e0e0',
                                      backgroundColor: isSelected ? alpha(primaryColor, 0.08) : '#fff',
                                      transition: 'all 0.15s ease-in-out',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      '&:hover': {
                                        backgroundColor: isSelected ? alpha(primaryColor, 0.12) : '#f5f5f5',
                                        borderColor: isSelected ? primaryColor : '#bdbdbd',
                                      },
                                    }}
                                  >
                                    <Stack direction="row" spacing={1.2} alignItems="center">
                                      <Box
                                        sx={{
                                          width: 30,
                                          height: 30,
                                          borderRadius: '50%',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          backgroundColor: isSelected ? primaryColor : alpha(theme.palette.grey[500], 0.15),
                                          color: isSelected ? '#fff' : theme.palette.grey[700],
                                        }}
                                      >
                                        <VideocamIcon sx={{ fontSize: 18 }} />
                                      </Box>
                                      <Box>
                                        <Typography
                                          fontWeight={isSelected ? 700 : 500}
                                          fontSize="0.85rem"
                                          color={isSelected ? primaryColor : 'text.primary'}
                                        >
                                          {cctv.name}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 180, display: 'block' }}>
                                          {cctv.rtsp ? 'RTSP Stream Ready' : 'No Stream URL'}
                                        </Typography>
                                      </Box>
                                    </Stack>

                                    {openedInNewWindowCctvIds.has(cctv.id) ? (
                                      <Chip
                                        size="small"
                                        label="In New Window"
                                        variant="outlined"
                                        color="secondary"
                                        sx={{ height: 18, fontSize: '0.62rem', fontWeight: 600 }}
                                      />
                                    ) : isSelected ? (
                                      <Chip
                                        size="small"
                                        label="Active"
                                        color="primary"
                                        sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700 }}
                                      />
                                    ) : null}
                                  </Box>
                                );
                              })
                            )}
                          </Stack>
                        </Scrollbar>
                      </Box>
                    </motion.div>
                  );
                })()}

                {/* ========= UNSEEN ALARM PANEL (LEFT) ========= */}
                {openUnseenDialog && (() => {
                  const isBothOpen = activeTab === 'cctv';
                  const totalH = panelRect?.height ? panelRect.height : 520;
                  const gap = 12;
                  const halfH = Math.max(Math.floor((totalH - gap) / 2), 220);

                  const unseenMaxHeight = isBothOpen ? halfH : 460;
                  const unseenScrollHeight = isBothOpen ? Math.max(halfH - 58, 120) : 385;

                  return (
                    <motion.div
                      key="unseen"
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{
                        opacity: 1,
                        x: 0,
                      }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{
                        duration: 0.25,
                        ease: 'easeInOut',
                        layout: { duration: 0.35, ease: [0.4, 0, 0.2, 1] },
                      }}
                      style={{
                        position: 'absolute',
                        top: panelRect ? panelRect.top : 0,
                        left: panelRect ? panelRect.left - 360 - 16 : 0,
                        width: 360,
                        pointerEvents: 'auto',
                        zIndex: 9,
                      }}
                    >
                      <Box
                        sx={{
                          backgroundColor: '#fff',
                          borderRadius: 2,
                          boxShadow: 6,
                          height: isBothOpen ? unseenMaxHeight : 'auto',
                          maxHeight: unseenMaxHeight,
                          overflow: 'hidden',
                          display: 'flex',
                          flexDirection: 'column',
                          transition: 'all 0.25s ease',
                        }}
                      >
                        {/* HEADER ACTIONS */}
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            px: 2,
                            py: 1.2,
                            borderBottom: '1px solid #eee',
                            flexShrink: 0,
                          }}
                        >
                          <Typography fontWeight="bold" fontSize="0.95rem">
                            Unseen Alarms
                          </Typography>

                          <Stack direction="row" spacing={1}>
                            <Button
                              size="small"
                              onClick={() => {
                                alarmLogs.forEach((alarm) => {
                                  handleAcknowledgeClick(alarm.id, alarm.action);
                                });

                                setSelectedAlarms([...alarmLogs]);
                              }}
                            >
                              Select All
                            </Button>

                            <Button
                              size="small"
                              color="inherit"
                              onClick={() => setSelectedAlarms([])}
                            >
                              Clear Selection
                            </Button>
                          </Stack>
                        </Box>

                        <Scrollbar sx={{ maxHeight: unseenScrollHeight, flex: 1 }}>
                          <Stack spacing={1} p={1.5}>
                            {alarmLogs.map((trigger) => (
                              <AlarmTriggerMenuItem
                                key={trigger.id}
                                trigger={trigger}
                                isClicked={selectedAlarms.some((a) => a.id === trigger.id)}
                                unseenBg={unseenBg}
                                seenBg={seenBg}
                                hoverBg={hoverBg}
                                unseenBorder={unseenBorder}
                                seenBorder={seenBorder}
                                hoverBorder={hoverBorder}
                                onClick={(t) => {
                                  handleAcknowledgeClick(t.id, t.action);
                                  setSelectedAlarms((prev) => {
                                    const exists = prev.find((a) => a.id === t.id);
                                    if (exists) {
                                      return prev.filter((a) => a.id !== t.id);
                                    }
                                    return [...prev, t];
                                  });
                                }}
                              />
                            ))}
                          </Stack>
                        </Scrollbar>
                      </Box>
                    </motion.div>
                  );
                })()}

                {/* ========= ACTION PANEL (RIGHT) ========= */}
                {actionOpen && (
                  <motion.div
                    key="action"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    style={{
                      position: 'absolute',
                      top: panelRect ? panelRect.top : '100%',
                      left: panelRect ? panelRect.right + 16 : 0,
                      // transform: 'translateY(-50%)',
                      width: 360,
                      pointerEvents: 'auto',
                      zIndex: 11,
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
                        {alarm?.dmac?.toUpperCase() || '-'}{' '}
                      </Typography>{' '}
                      {alarm && (
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
                            Person: {alarm?.target || 'Unknown'}{' '}
                          </Typography>{' '}
                          <Typography variant="body2" color="text.secondary">
                            {' '}
                            Area: {alarm?.area || 'Unknown'}{' '}
                          </Typography>{' '}
                          <Typography variant="body2" color="text.secondary">
                            {' '}
                            Priority:{' '}
                            <span style={{ color: priorityColor, fontWeight: 'bold' }}>
                              {' '}
                              {(alarm?.priority || 'medium').toUpperCase()}{' '}
                            </span>{' '}
                          </Typography>{' '}
                        </Box>
                      )}{' '}
                      <Typography variant="subtitle2" color="text.secondary" mb={1}>
                        Assign Security Guard
                      </Typography>
                      {/* <CustomAutocomplete
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
                      /> */}
                      <CustomAutocomplete
                        label="Security Guard"
                        options={sortedSecurity}
                        value={selectedSecurity}
                        loading={isLoadingSecurity}
                        onChange={(v) => setSelectedSecurity(v)}
                        getOptionLabel={(o) => {
                          if (!o) return '';

                          const base = o.securityName;

                          if (
                            o.proximityLevel === 'SameArea' ||
                            o.proximityLevel === 'SameFloorplan'
                          ) {
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
                          onClick={handleDispatchAction}
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
              </>
            )}
          </AnimatePresence>
        </Box>
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
    </>
  );
};

export default AlarmPopup;
