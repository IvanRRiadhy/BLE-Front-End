import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from 'src/store/Store';
import {
  Box,
  Typography,
  Chip,
  Avatar,
  Grid2 as Grid,
  Skeleton,
  CircularProgress,
  Button,
  IconButton,
  Tooltip,
  Paper,
  Tabs,
  Tab,
  Select,
  MenuItem,
  Slider,
  Stack,
  useTheme,
  Divider,
} from '@mui/material';
import {
  IconArrowLeft,
  IconPlayerPlayFilled,
  IconPlayerPauseFilled,
  IconZoomIn,
  IconZoomOut,
  IconRotateClockwise,
  IconMaximize,
  IconMinimize,
  IconSettings,
  IconCalendar,
  IconCompass,
  IconBuilding,
  IconClock,
  IconMapPin,
  IconAlertTriangle,
  IconFlame,
  IconRoute,
  IconCircleDot,
  IconLayoutGrid,
} from '@tabler/icons-react';
import { Stage, Layer, Image as KonvaImage, Group } from 'react-konva';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import { BASE_URL } from 'src/utils/axios';
import { VisitorType } from 'src/store/apps/crud/visitor';
import { memberType } from 'src/store/apps/crud/member';
import { useNewVisitorSession } from 'src/hooks/useVisitorSession';
import {
  VisitorSessionPersonType,
  VisitorSessionResponseType,
  VisualPathPointType,
  NewSessionType,
} from 'src/store/apps/crud/visitorSession';
import toast from 'react-hot-toast';
import { formatFullDateTime, formatOrRawTime } from 'src/utils/time';
import {
  MovementVisualizationLayer,
  MovementViewMode,
} from './MovementVisualizationLayer';
import { useAllFloorplans } from 'src/hooks/useFloorplan';
import { MovementActivityChart } from './MovementActivityChart';
import { EventTimelineList } from './EventTimelineList';
import {
  detectDwellPoints,
  generateDensityCanvas,
  bucketMovementActivity,
  deriveEventTimeline,
  preprocessMovementLog,
  processMovementPerFloorplan,
  cleanTimeStr,
} from './movementAnalysisUtils';

dayjs.extend(duration);

interface InvestigateContentProps {
  initialSessionData?: VisitorSessionResponseType | null;
  onBack?: () => void;
  showHeader?: boolean;
  selectedPersonOption?: any;
  fromDate?: string | null;
  toDate?: string | null;
  isLoading?: boolean;
}

const InvestigateContent: React.FC<InvestigateContentProps> = ({
  initialSessionData,
  onBack,
  showHeader = true,
  selectedPersonOption,
  fromDate,
  toDate,
  isLoading: externalLoading = false,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // Redux Selectors
  const selectedVisitor: VisitorType = useSelector(
    (state: RootState) => state.VisitorSessionReducer.selectedVisitor,
  );
  const selectedMember: memberType = useSelector(
    (state: RootState) => state.VisitorSessionReducer.selectedMember,
  );
  const selectedSecurity: memberType = useSelector(
    (state: RootState) => state.VisitorSessionReducer.selectedSecurity,
  );
  const investigateFilter = useSelector(
    (state: RootState) => state.VisitorSessionReducer.newVisitorSessionFilter,
  );
  const language = useSelector((state: RootState) => state.settings.isLanguage);

  // Active Person based on filter or passed option
  const selectedPerson = useMemo(() => {
    if (selectedPersonOption) {
      return selectedPersonOption;
    }
    switch (investigateFilter.personType) {
      case 'member':
        return selectedMember;
      case 'security':
        return selectedSecurity;
      case 'visitor':
      default:
        return selectedVisitor;
    }
  }, [investigateFilter.personType, selectedVisitor, selectedMember, selectedSecurity, selectedPersonOption]);

  // Data State
  const [sessionData, setSessionData] = useState<VisitorSessionResponseType | null>(
    initialSessionData || null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const investigateMutation = useNewVisitorSession();

  // Derived Person & Sessions (from API response)
  const primaryPerson: VisitorSessionPersonType | null = sessionData?.persons?.[0] || null;

  const personName =
    selectedPersonOption?.name ||
    primaryPerson?.personName ||
    selectedPerson?.name ||
    '';
  const personId =
    selectedPersonOption?.id ||
    selectedPerson?.id ||
    primaryPerson?.personId ||
    '';

  // Reset & update state when initialSessionData is passed or updated
  useEffect(() => {
    if (initialSessionData) {
      setSessionData(initialSessionData);
      setIsPlaying(false);
      setCurrentIndex(0);
      setAnimatedPos(null);
      setCurrentAnimTimeMs(null);
      setActiveSessionIndex(0);
      setActiveFloorplanId(null);
    }
  }, [initialSessionData]);

  // Sidebar Tabs State
  const [sidebarTab, setSidebarTab] = useState<'sessions' | 'areas'>('sessions');

  // Selected Session & Floorplan
  const [activeSessionIndex, setActiveSessionIndex] = useState<number>(0);
  const [activeFloorplanId, setActiveFloorplanId] = useState<string | null>(null);

  // Visualization Mode & Layer Toggles
  const [viewMode, setViewMode] = useState<MovementViewMode>('trace');
  const [showTrace, setShowTrace] = useState<boolean>(true);
  const [showStops, setShowStops] = useState<boolean>(true);
  const [showIncidents, setShowIncidents] = useState<boolean>(true);

  // Playback State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [animatedPos, setAnimatedPos] = useState<{ x: number; y: number } | null>(null);
  const [currentAnimTimeMs, setCurrentAnimTimeMs] = useState<number | null>(null);
  const animationTimerRef = useRef<number | null>(null);
  const preloadedImagesRef = useRef<Map<string, { img: HTMLImageElement; width: number; height: number }>>(new Map());

  // Fullscreen Container & State
  const fullscreenContainerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, []);

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      fullscreenContainerRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  // Floorplan Image & Dimensions
  const [floorplanImgObj, setFloorplanImgObj] = useState<HTMLImageElement | null>(null);
  const [imageNaturalSize, setImageNaturalSize] = useState<{ width: number; height: number }>({
    width: 1200,
    height: 700,
  });

  // Stage Pan & Zoom
  const [stageScale, setStageScale] = useState<number>(1);
  const [stagePos, setStagePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 900, height: 480 });

  // Fetch Session Data when person or filter changes (only when initialSessionData not provided)
  useEffect(() => {
    if (initialSessionData) return;
    if (!personId) return;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        const res = await investigateMutation.mutateAsync({
          filter: {
            ...investigateFilter,
          },
          options: {
            includeSummary: true,
            includeVisualPaths: true,
            includeIncident: true,
          },
        });

        setSessionData(res);
        setActiveSessionIndex(0);
      } catch (error) {
        console.error(error);
        toast.error('Error fetching visitor sessions');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [investigateFilter, selectedVisitor, selectedMember, selectedSecurity, initialSessionData, personId]);

  // Derived Sessions
  const sessions: NewSessionType[] = primaryPerson?.sessions || [];
  const currentSession: NewSessionType | null = sessions[activeSessionIndex] || sessions[0] || null;

  // Fetch all floorplans once from cache/API
  const { data: allFloorplans = [] } = useAllFloorplans();

  // Static lookup map for floorplan scales (meterPerPx)
  const floorplanMetaMap = useMemo(() => {
    const map = new Map<string, { meterPerPx?: number }>();
    (allFloorplans || []).forEach((fp) => {
      map.set(fp.id, { meterPerPx: fp.meterPerPx });
    });
    return map;
  }, [allFloorplans]);

  // Active Floorplan Points & Metadata
  const activeFloorplan = useMemo(() => {
    if (!sessionData?.visualPaths?.floorplans) return null;
    const fps = sessionData.visualPaths.floorplans;
    if (activeFloorplanId && fps[activeFloorplanId]) {
      return fps[activeFloorplanId];
    }
    if (currentSession?.floorplanId && fps[currentSession.floorplanId]) {
      return fps[currentSession.floorplanId];
    }
    const firstKey = Object.keys(fps)[0];
    return firstKey ? fps[firstKey] : null;
  }, [sessionData, activeFloorplanId, currentSession]);

  const meterPerPx = activeFloorplan?.floorplanId
    ? floorplanMetaMap.get(activeFloorplan.floorplanId)?.meterPerPx ?? (activeFloorplan as any)?.meterPerPx ?? 0.05
    : 0.05;

  // Preprocess points and detect dwell points strictly per-floorplan ONCE on API response
  const { points, dwellPoints } = useMemo(() => {
    return processMovementPerFloorplan(sessionData?.visualPaths?.floorplans, floorplanMetaMap);
  }, [sessionData?.visualPaths?.floorplans, floorplanMetaMap]);

  // Movement activity buckets for integrated chart spanning all floorplans (stable across all floors)
  const activityBuckets = useMemo(() => {
    return bucketMovementActivity(points, 10);
  }, [points]);

  // Timeline events for event list (stable across all floors)
  const timelineEvents = useMemo(() => {
    return deriveEventTimeline(points, dwellPoints, sessions);
  }, [points, dwellPoints, sessions]);

  // Pre-generate smooth Density Canvas (Temporarily commented out)
  const densityCanvas = null;

  // Floorplan-filtered points for the current active floorplan canvas
  const activeFloorplanPoints = useMemo(() => {
    if (!activeFloorplan?.floorplanId) return [];
    return points.filter((p) => p.floorplanId === activeFloorplan.floorplanId);
  }, [points, activeFloorplan?.floorplanId]);

  // Dwell points on the current active floorplan
  const activeFloorplanDwellPoints = useMemo(() => {
    if (!activeFloorplan?.floorplanId) return [];
    return dwellPoints.filter(
      (d) => !d.floorplanId || d.floorplanId === activeFloorplan.floorplanId,
    );
  }, [dwellPoints, activeFloorplan?.floorplanId]);

  // Determine active floorplan's latest point index relative to currentAnimTimeMs
  const activeFloorplanCurrentIndex = useMemo(() => {
    if (activeFloorplanPoints.length === 0) return -1;
    if (!currentAnimTimeMs) return 0;

    let lastIdx = -1;
    for (let i = 0; i < activeFloorplanPoints.length; i++) {
      const t = dayjs(cleanTimeStr(activeFloorplanPoints[i].time)).valueOf();
      if (t <= currentAnimTimeMs) {
        lastIdx = i;
      } else {
        break;
      }
    }
    return lastIdx;
  }, [activeFloorplanPoints, currentAnimTimeMs]);

  // Preload all floorplan images into memory for instant, seamless image switching
  useEffect(() => {
    if (!sessionData?.visualPaths?.floorplans) return;

    Object.values(sessionData.visualPaths.floorplans).forEach((fp) => {
      if (!fp.floorplanImage) return;
      const imgSrc = fp.floorplanImage.startsWith('http')
        ? fp.floorplanImage
        : `${BASE_URL}${fp.floorplanImage}`;

      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.src = imgSrc;
      img.onload = () => {
        const w = img.naturalWidth || img.width || 1200;
        const h = img.naturalHeight || img.height || 700;
        preloadedImagesRef.current.set(fp.floorplanId, { img, width: w, height: h });

        if (fp.floorplanId === activeFloorplan?.floorplanId) {
          setFloorplanImgObj(img);
          setImageNaturalSize({ width: w, height: h });
        }
      };
    });
  }, [sessionData, activeFloorplan?.floorplanId]);

  // Load and apply Active Floorplan Image (from preloaded cache or fallback)
  useEffect(() => {
    if (!activeFloorplan) return;

    const applyImage = (img: HTMLImageElement, w: number, h: number) => {
      setFloorplanImgObj(img);
      setImageNaturalSize({ width: w, height: h });

      if (containerSize.width > 0 && containerSize.height > 0) {
        const fitScale = Math.min(containerSize.width / w, containerSize.height / h);
        const finalScale = isFinite(fitScale) && fitScale > 0 ? fitScale : 1;
        setStageScale(finalScale);
        setStagePos({
          x: (containerSize.width - w * finalScale) / 2,
          y: (containerSize.height - h * finalScale) / 2,
        });
      }
    };

    const cached = preloadedImagesRef.current.get(activeFloorplan.floorplanId);
    if (cached) {
      applyImage(cached.img, cached.width, cached.height);
    } else {
      const imgSrc = activeFloorplan.floorplanImage || currentSession?.floorplanImage;
      if (!imgSrc) return;

      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.src = imgSrc.startsWith('http') ? imgSrc : `${BASE_URL}${imgSrc}`;

      img.onload = () => {
        const w = img.naturalWidth || img.width || 1200;
        const h = img.naturalHeight || img.height || 700;
        preloadedImagesRef.current.set(activeFloorplan.floorplanId, { img, width: w, height: h });
        applyImage(img, w, h);
      };
    }
  }, [activeFloorplan?.floorplanId, currentSession?.floorplanImage, containerSize]);

  // Observe Container Resize
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry && entry.contentRect.width > 0 && entry.contentRect.height > 0) {
        setContainerSize({
          width: Math.round(entry.contentRect.width),
          height: Math.round(entry.contentRect.height),
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Initialize activeFloorplanId to the first point or session floorplan
  useEffect(() => {
    if (!activeFloorplanId) {
      const firstPtFp = points[0]?.floorplanId;
      const firstSessionFp = currentSession?.floorplanId;
      const firstAvailableFp = sessionData?.visualPaths?.floorplans
        ? Object.keys(sessionData.visualPaths.floorplans)[0]
        : null;

      const target = firstPtFp || firstSessionFp || firstAvailableFp;
      if (target) {
        setActiveFloorplanId(target);
      }
    }
  }, [points, currentSession, sessionData, activeFloorplanId]);

  // Dynamic Integrated Replay Loop: Seamless Cross-Floorplan Transition with Zero Pauses
  useEffect(() => {
    if (!isPlaying || points.length <= 1) {
      if (animationTimerRef.current) {
        cancelAnimationFrame(animationTimerRef.current);
        animationTimerRef.current = null;
      }
      return;
    }

    if (currentIndex >= points.length - 1) {
      setIsPlaying(false);
      return;
    }

    const startPt = points[currentIndex];
    const endPt = points[currentIndex + 1];

    if (!startPt || !endPt) return;

    const startTimeMs = dayjs(cleanTimeStr(startPt.time)).valueOf();
    const endTimeMs = dayjs(cleanTimeStr(endPt.time)).valueOf();
    const timeDiffMs = Math.max(0, endTimeMs - startTimeMs);

    const isDifferentFloorplan = Boolean(
      startPt.floorplanId && endPt.floorplanId && startPt.floorplanId !== endPt.floorplanId,
    );

    // Physical distance (only on the same floorplan)
    const dx = endPt.x - startPt.x;
    const dy = endPt.y - startPt.y;
    const distancePx = isDifferentFloorplan ? 0 : Math.sqrt(dx * dx + dy * dy);

    // Dynamic dwell pause at anchor point
    const dwellSec = startPt.dwellDurationSeconds || 0;
    const pauseDurationMs =
      Math.max(1000, Math.min(4000, 1000 + (dwellSec / 60) * 500)) / playbackSpeed;

    // Travel duration proportional to distance, or swift transition when switching floors
    const travelDurationMs = isDifferentFloorplan
      ? 350 / playbackSpeed
      : Math.max(300, Math.min(1800, 400 + distancePx * 10)) / playbackSpeed;
    const totalStepAnimMs = pauseDurationMs + travelDurationMs;

    let animStartFrameTime: number | null = null;

    const animateStep = (timestamp: number) => {
      if (!animStartFrameTime) animStartFrameTime = timestamp;
      const elapsedFrameMs = timestamp - animStartFrameTime;

      // Update current displayed time continuously
      const animProgress = Math.min(1, elapsedFrameMs / totalStepAnimMs);
      const simulatedTimeMs = startTimeMs + Math.round(timeDiffMs * animProgress);
      setCurrentAnimTimeMs(simulatedTimeMs);

      if (elapsedFrameMs < pauseDurationMs) {
        // Phase 1: Dwell Pause at current Anchor Point
        setAnimatedPos({ x: startPt.x, y: startPt.y });
        animationTimerRef.current = requestAnimationFrame(animateStep);
      } else {
        // Phase 2: Trajectory Movement
        if (isDifferentFloorplan) {
          // Seamless Cross-Floorplan Transition: Change rendered floorplan and continue without pause!
          if (endPt.floorplanId && activeFloorplanId !== endPt.floorplanId) {
            setActiveFloorplanId(endPt.floorplanId);
          }
          setAnimatedPos({ x: endPt.x, y: endPt.y });
          setCurrentAnimTimeMs(endTimeMs);
          setCurrentIndex((prev) => {
            if (prev >= points.length - 2) {
              setIsPlaying(false);
              return points.length - 1;
            }
            return prev + 1;
          });
        } else {
          // Smooth Trajectory Movement on same floorplan
          const moveElapsed = elapsedFrameMs - pauseDurationMs;
          const moveProgress = Math.min(1, moveElapsed / travelDurationMs);

          // Ease-In-Out curve
          const easeProgress =
            moveProgress < 0.5
              ? 2 * moveProgress * moveProgress
              : 1 - Math.pow(-2 * moveProgress + 2, 2) / 2;

          setAnimatedPos({
            x: startPt.x + dx * easeProgress,
            y: startPt.y + dy * easeProgress,
          });

          if (moveProgress < 1) {
            animationTimerRef.current = requestAnimationFrame(animateStep);
          } else {
            setAnimatedPos({ x: endPt.x, y: endPt.y });
            setCurrentAnimTimeMs(endTimeMs);
            setCurrentIndex((prev) => {
              if (prev >= points.length - 2) {
                setIsPlaying(false);
                return points.length - 1;
              }
              return prev + 1;
            });
          }
        }
      }
    };

    animationTimerRef.current = requestAnimationFrame(animateStep);

    return () => {
      if (animationTimerRef.current) {
        cancelAnimationFrame(animationTimerRef.current);
      }
    };
  }, [isPlaying, currentIndex, points, playbackSpeed, activeFloorplanId]);

  // Synchronize activeSessionIndex & activeFloorplanId with current playback timestamp
  useEffect(() => {
    if (!currentAnimTimeMs || sessions.length === 0) return;

    // Find the session that contains currentAnimTimeMs
    const matchingIdx = sessions.findIndex((s, i) => {
      if (!s.enterTime) return false;
      const enterMs = dayjs(cleanTimeStr(s.enterTime)).valueOf();
      const nextSession = sessions[i + 1];
      const nextEnterMs = nextSession?.enterTime
        ? dayjs(cleanTimeStr(nextSession.enterTime)).valueOf()
        : Infinity;
      const exitMs = s.exitTime ? dayjs(cleanTimeStr(s.exitTime)).valueOf() : nextEnterMs;

      // If first session, allow 1s grace period before enterTime
      const minMs = i === 0 ? enterMs - 1000 : enterMs;

      // For non-final sessions, use strict '< nextEnterMs' so boundary timestamps (exitTime == nextEnterTime)
      // belong exclusively to the new session rather than the previous one!
      if (isFinite(nextEnterMs)) {
        return currentAnimTimeMs >= minMs && currentAnimTimeMs < nextEnterMs;
      }
      return currentAnimTimeMs >= minMs && currentAnimTimeMs <= exitMs + 5000;
    });

    if (matchingIdx !== -1 && matchingIdx !== activeSessionIndex) {
      const targetSession = sessions[matchingIdx];
      setActiveSessionIndex(matchingIdx);

      // Only switch activeFloorplanId from session sync if NOT actively playing!
      // During active replay, the animation loop controls the exact active floorplan point-by-point.
      if (!isPlaying && targetSession?.floorplanId && targetSession.floorplanId !== activeFloorplanId) {
        setActiveFloorplanId(targetSession.floorplanId);
      }
    }
  }, [currentAnimTimeMs, sessions, activeSessionIndex, activeFloorplanId, isPlaying]);

  // Handlers
  const handlePlayReplay = () => {
    setViewMode('replay');
    if (currentIndex >= points.length - 1) {
      setCurrentIndex(0);
      if (points.length > 0) {
        const firstPt = points[0];
        setCurrentAnimTimeMs(dayjs(cleanTimeStr(firstPt.time)).valueOf());
        setAnimatedPos({ x: firstPt.x, y: firstPt.y });
        if (firstPt.floorplanId && firstPt.floorplanId !== activeFloorplanId) {
          setActiveFloorplanId(firstPt.floorplanId);
        }
      }
    } else if (points[currentIndex]?.floorplanId && points[currentIndex].floorplanId !== activeFloorplanId) {
      setActiveFloorplanId(points[currentIndex].floorplanId!);
    }
    setIsPlaying(true);
  };

  const handleTogglePlay = () => {
    if (!isPlaying && viewMode !== 'replay') {
      setViewMode('replay');
    }
    if (currentIndex >= points.length - 1) {
      setCurrentIndex(0);
      if (points.length > 0) {
        const firstPt = points[0];
        setCurrentAnimTimeMs(dayjs(cleanTimeStr(firstPt.time)).valueOf());
        setAnimatedPos({ x: firstPt.x, y: firstPt.y });
        if (firstPt.floorplanId && firstPt.floorplanId !== activeFloorplanId) {
          setActiveFloorplanId(firstPt.floorplanId);
        }
      }
    } else if (points[currentIndex]?.floorplanId && points[currentIndex].floorplanId !== activeFloorplanId) {
      setActiveFloorplanId(points[currentIndex].floorplanId!);
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeekTimeMs = (timeMs: number) => {
    setIsPlaying(false);
    setCurrentAnimTimeMs(timeMs);
    if (points.length === 0) return;

    // Find closest point across the integrated timeline
    let closestIdx = 0;
    let minDiff = Infinity;
    points.forEach((pt, i) => {
      const diff = Math.abs(dayjs(cleanTimeStr(pt.time)).valueOf() - timeMs);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = i;
      }
    });

    setCurrentIndex(closestIdx);
    const pt = points[closestIdx];
    setAnimatedPos({ x: pt.x, y: pt.y });

    // Automatically switch floorplan to match sought point
    if (pt.floorplanId && pt.floorplanId !== activeFloorplanId) {
      setActiveFloorplanId(pt.floorplanId);
    }
  };

  const handleSeek = (pointIndex: number, timestamp: string) => {
    if (timestamp) {
      const targetTimeMs = dayjs(cleanTimeStr(timestamp)).valueOf();
      handleSeekTimeMs(targetTimeMs);
    } else if (pointIndex >= 0 && pointIndex < points.length) {
      const targetTimeMs = dayjs(cleanTimeStr(points[pointIndex].time)).valueOf();
      handleSeekTimeMs(targetTimeMs);
    }
  };

  const handleSelectFloorplan = (floorplanId: string) => {
    setActiveFloorplanId(floorplanId);
    // Seek to the first recorded movement on this floorplan
    const firstPtIdx = points.findIndex((p) => p.floorplanId === floorplanId);
    if (firstPtIdx !== -1) {
      const pt = points[firstPtIdx];
      const targetTimeMs = dayjs(cleanTimeStr(pt.time)).valueOf();
      handleSeekTimeMs(targetTimeMs);
    }
  };

  const handleZoomIn = () => setStageScale((prev) => Math.min(4, prev * 1.25));
  const handleZoomOut = () => setStageScale((prev) => Math.max(0.1, prev / 1.25));
  const handleResetZoom = () => {
    if (floorplanImgObj && containerSize.width > 0) {
      const fitScale = Math.min(
        containerSize.width / floorplanImgObj.width,
        containerSize.height / floorplanImgObj.height,
      );
      setStageScale(fitScale);
      setStagePos({
        x: (containerSize.width - floorplanImgObj.width * fitScale) / 2,
        y: (containerSize.height - floorplanImgObj.height * fitScale) / 2,
      });
    }
  };

  const handleSelectSession = (idx: number) => {
    setActiveSessionIndex(idx);
    const targetSession = sessions[idx];
    if (!targetSession) return;

    if (targetSession.floorplanId && targetSession.floorplanId !== activeFloorplanId) {
      setActiveFloorplanId(targetSession.floorplanId);
    }
    if (targetSession.enterTime) {
      const targetTimeMs = dayjs(cleanTimeStr(targetSession.enterTime)).valueOf();

      // Look for the first point belonging to this target session or floorplan at/after enterTime
      let sessionPointIdx = points.findIndex((p) => {
        const ptTimeMs = dayjs(cleanTimeStr(p.time)).valueOf();
        const matchesFloor = targetSession.floorplanId ? p.floorplanId === targetSession.floorplanId : true;
        return matchesFloor && ptTimeMs >= targetTimeMs;
      });

      if (sessionPointIdx === -1 && targetSession.floorplanId) {
        sessionPointIdx = points.findIndex((p) => p.floorplanId === targetSession.floorplanId);
      }

      if (sessionPointIdx !== -1) {
        const pt = points[sessionPointIdx];
        const ptTimeMs = dayjs(cleanTimeStr(pt.time)).valueOf();
        handleSeekTimeMs(ptTimeMs);
      } else {
        handleSeekTimeMs(targetTimeMs);
      }
    } else {
      setCurrentIndex(0);
    }
    setIsPlaying(false);
  };

  // Date Range Display
  const fromStr = fromDate || investigateFilter.from || (investigateFilter as any).From;
  const toStr = toDate || investigateFilter.to || (investigateFilter as any).To;
  const dateRangeLabel = useMemo(() => {
    if (!fromStr && !toStr) return 'All Recorded Time';
    const f = fromStr ? formatOrRawTime(fromStr, 'MMM D, YYYY HH:mm') : '-';
    const t = toStr ? formatOrRawTime(toStr, 'MMM D, YYYY HH:mm') : '-';
    return `${f} → ${t}`;
  }, [fromStr, toStr]);

  const currentPoint = points[currentIndex] || null;

  // Available floors in visualPaths
  const availableFloorplans = useMemo(() => {
    if (!sessionData?.visualPaths?.floorplans) return [];
    return Object.values(sessionData.visualPaths.floorplans);
  }, [sessionData]);

  const isDataLoading = isLoading || externalLoading;

  if (isDataLoading) {
    return (
      <Box p={3}>
        <Stack spacing={2}>
          <Skeleton variant="rounded" height={60} />
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 3 }}>
              <Skeleton variant="rounded" height={600} />
            </Grid>
            <Grid size={{ xs: 12, md: 9 }}>
              <Skeleton variant="rounded" height={420} />
              <Skeleton variant="rounded" height={180} sx={{ mt: 2 }} />
            </Grid>
          </Grid>
        </Stack>
      </Box>
    );
  }

  if (!personId) {
    const personLabel = selectedPersonOption?.type || investigateFilter.personType || 'person';
    return (
      <Box p={4} textAlign="center" mt={6}>
        <Paper
          elevation={0}
          sx={{
            p: 6,
            maxWidth: 500,
            mx: 'auto',
            borderRadius: '16px',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="h5" fontWeight={700} gutterBottom>
            No {personLabel} Selected
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Please use the investigation filter to choose a {personLabel} and start analyzing movement replays.
          </Typography>
        </Paper>
      </Box>
    );
  }

  const currentPersonType = (
    selectedPersonOption?.type ||
    investigateFilter.personType ||
    primaryPerson?.personType ||
    'member'
  ).toLowerCase();
  const roleColor: 'error' | 'success' | 'primary' =
    currentPersonType === 'visitor'
      ? 'error'
      : currentPersonType === 'security'
      ? 'success'
      : 'primary';

  return (
    <Box
      ref={fullscreenContainerRef}
      sx={{
        p: isFullscreen ? 2.5 : showHeader ? 2 : 0,
        height: '100%',
        minHeight: isFullscreen ? '100vh' : 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: isFullscreen ? 2.5 : 2,
        bgcolor: isFullscreen
          ? isDark
            ? 'background.default'
            : '#f4f6f8'
          : 'transparent',
        overflowY: isFullscreen ? 'auto' : 'visible',
      }}
    >
      {/* ================= 1. TOP HEADER BAR ================= */}
      {showHeader && (
        <Paper
          elevation={0}
          sx={{
            p: 2,
            px: 2.5,
            borderRadius: '16px',
            border: '1px solid',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
            bgcolor: isDark ? 'background.paper' : '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          {/* Left: Back & Title */}
          <Stack direction="row" spacing={2} alignItems="center">
            <Button
              variant="outlined"
              size="small"
              startIcon={<IconArrowLeft size={16} />}
              onClick={() => {
                if (onBack) {
                  onBack();
                } else {
                  window.history.back();
                }
              }}
              sx={{ borderRadius: '8px', color: 'text.secondary', borderColor: 'divider' }}
            >
              Back
            </Button>

            <Box>
              <Typography variant="h5" fontWeight={800} color="text.primary" sx={{ lineHeight: 1.2 }}>
                Movement Replay
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Visualize the movement history, stops, and incidents of a person within the building.
              </Typography>
            </Box>
          </Stack>

          {/* Right: Date Range & Play Replay Button */}
          <Stack direction="row" spacing={2} alignItems="center">
            <Paper
              variant="outlined"
              sx={{
                px: 1.5,
                py: 0.6,
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                bgcolor: isDark ? 'grey.800' : '#f8fafc',
              }}
            >
              <IconCalendar size={16} color={theme.palette.text.secondary} />
              <Typography variant="caption" fontWeight={600} color="text.secondary">
                {dateRangeLabel}
              </Typography>
            </Paper>

            <Button
              variant="contained"
              color="primary"
              startIcon={<IconPlayerPlayFilled size={16} />}
              onClick={handlePlayReplay}
              sx={{
                borderRadius: '10px',
                px: 2.5,
                fontWeight: 700,
                boxShadow: '0 4px 12px rgba(24, 119, 242, 0.3)',
              }}
            >
              Play Replay
            </Button>
          </Stack>
        </Paper>
      )}

      {/* ================= 2. MAIN WORKSPACE ================= */}
      <Grid container spacing={isFullscreen ? 2.5 : 2} sx={{ flex: 1, minHeight: 0 }}>
        {/* LEFT COLUMN: Person Info & Sessions/Areas (Width: 3 or ~320px) */}
        <Grid size={{ xs: 12, lg: isFullscreen ? 3.2 : 3 }}>
          <Stack spacing={isFullscreen ? 2.5 : 2} sx={{ height: '100%' }}>
            {/* Person Information Card */}
            <Paper
              elevation={0}
              sx={{
                p: isFullscreen ? 3 : 2.5,
                borderRadius: '16px',
                border: '1px solid',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
                bgcolor: isDark ? 'background.paper' : '#ffffff',
              }}
            >
              {/* Avatar & Name */}
              <Stack direction="row" spacing={2} alignItems="center" mb={2}>
                <Avatar
                  src={
                    selectedPersonOption?.avatarUrl ||
                    (selectedPerson?.faceImage ? `${BASE_URL}${selectedPerson.faceImage}` : undefined)
                  }
                  sx={{
                    width: isFullscreen ? 62 : 56,
                    height: isFullscreen ? 62 : 56,
                    border: '3px solid #1877F2',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  }}
                />
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="h6" fontWeight={700} noWrap fontSize={isFullscreen ? '1.15rem' : '1rem'}>
                    {personName || 'Unknown Person'}
                  </Typography>
                  <Chip
                    label={(
                      selectedPersonOption?.type ||
                      primaryPerson?.personType ||
                      investigateFilter.personType ||
                      'MEMBER'
                    ).toUpperCase()}
                    color={roleColor as any}
                    size="small"
                    sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700, borderRadius: '6px', mt: 0.25 }}
                  />
                </Box>
              </Stack>

              {/* Attributes Table */}
              <Stack spacing={isFullscreen ? 1.25 : 1} sx={{ pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary" fontSize={isFullscreen ? '0.8rem' : '0.75rem'}>
                    Card Number
                  </Typography>
                  <Typography variant="caption" fontWeight={600} fontSize={isFullscreen ? '0.82rem' : '0.75rem'}>
                    {primaryPerson?.cardNumber || (selectedPerson as any)?.cardNumber || selectedPersonOption?.cardNumber || '-'}
                  </Typography>
                </Box>

                <Box display="flex" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">
                    Identity ID
                  </Typography>
                  <Typography variant="caption" fontWeight={600}>
                    {primaryPerson?.identityId || selectedPerson?.identityId || selectedPersonOption?.identityId || '-'}
                  </Typography>
                </Box>

                <Box display="flex" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">
                    Total Sessions
                  </Typography>
                  <Typography variant="caption" fontWeight={600}>
                    {primaryPerson?.totalSessions ?? sessions.length}
                  </Typography>
                </Box>

                <Box display="flex" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">
                    Total Duration
                  </Typography>
                  <Typography variant="caption" fontWeight={600}>
                    {primaryPerson?.totalDurationFormatted || '-'}
                  </Typography>
                </Box>

                <Box display="flex" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">
                    Total Incidents
                  </Typography>
                  <Typography
                    variant="caption"
                    fontWeight={700}
                    color={(primaryPerson?.totalIncidents ?? 0) > 0 ? 'error.main' : 'text.primary'}
                  >
                    {primaryPerson?.totalIncidents ?? 0}
                  </Typography>
                </Box>

                <Box display="flex" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">
                    Areas Visited
                  </Typography>
                  <Typography variant="caption" fontWeight={600}>
                    {primaryPerson?.areasVisited?.length ?? 0}
                  </Typography>
                </Box>

                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="caption" color="text.secondary">
                    Current Area
                  </Typography>
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#2e7d32' }} />
                    <Typography variant="caption" fontWeight={600} color="text.primary" noWrap sx={{ maxWidth: 120 }}>
                      {primaryPerson?.currentArea || currentSession?.areaName || 'Unknown Area'}
                    </Typography>
                  </Stack>
                </Box>
              </Stack>
            </Paper>

            {/* Sessions & Areas Tab Container */}
            <Paper
              elevation={0}
              sx={{
                flex: 1,
                borderRadius: '16px',
                border: '1px solid',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
                bgcolor: isDark ? 'background.paper' : '#ffffff',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              <Tabs
                value={sidebarTab}
                onChange={(_, val) => setSidebarTab(val)}
                variant="fullWidth"
                sx={{ borderBottom: '1px solid', borderColor: 'divider', minHeight: 42 }}
              >
                <Tab label={`Sessions (${sessions.length})`} value="sessions" sx={{ minHeight: 42, fontSize: '0.8rem', fontWeight: 700 }} />
                <Tab label={`Areas (${primaryPerson?.areasVisited?.length || 0})`} value="areas" sx={{ minHeight: 42, fontSize: '0.8rem', fontWeight: 700 }} />
              </Tabs>

              {/* Tab Content: Sessions List */}
              {sidebarTab === 'sessions' && (
                <Box
                  sx={{
                    flex: 1,
                    overflowY: 'auto',
                    p: 1.5,
                    maxHeight: isFullscreen ? 'calc(100vh - 430px)' : 380,
                    minHeight: isFullscreen ? 320 : 'auto',
                    '&::-webkit-scrollbar': { width: '4px' },
                    '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(0,0,0,0.15)', borderRadius: '4px' },
                  }}
                >
                  {sessions.length === 0 ? (
                    <Box p={3} textAlign="center">
                      <Typography variant="caption" color="text.secondary">
                        No tracking sessions found
                      </Typography>
                    </Box>
                  ) : (
                    <Stack spacing={1.25}>
                      {sessions.map((s, idx) => {
                        const isSelected = idx === activeSessionIndex;
                        const startFmt = s.enterTime ? formatOrRawTime(s.enterTime, 'MMM D, HH:mm:ss') : '-';
                        const endFmt = s.exitTime ? formatOrRawTime(s.exitTime, 'MMM D, HH:mm:ss') : '-';

                        return (
                          <Box
                            key={idx}
                            onClick={() => handleSelectSession(idx)}
                            sx={{
                              p: 1.25,
                              borderRadius: '12px',
                              border: '1px solid',
                              borderColor: isSelected ? '#1877F2' : isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0',
                              bgcolor: isSelected
                                ? 'rgba(24, 119, 242, 0.06)'
                                : isDark
                                ? 'rgba(255,255,255,0.02)'
                                : '#f8fafc',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                              '&:hover': {
                                transform: 'translateY(-1px)',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                              },
                            }}
                          >
                            <Stack direction="row" spacing={1} alignItems="flex-start">
                              <Box
                                sx={{
                                  width: 22,
                                  height: 22,
                                  borderRadius: '50%',
                                  bgcolor: isSelected ? '#1877F2' : 'grey.300',
                                  color: '#ffffff',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                  mt: 0.25,
                                }}
                              >
                                {idx + 1}
                              </Box>

                              <Box sx={{ minWidth: 0, flex: 1 }}>
                                <Box display="flex" alignItems="center" justifyContent="space-between">
                                  <Typography variant="body2" fontWeight={700} noWrap sx={{ maxWidth: 140 }}>
                                    {s.areaName || 'Unknown Area'}
                                  </Typography>
                                  {s.hasIncident && (
                                    <Chip label="Incident" color="error" size="small" sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700 }} />
                                  )}
                                </Box>

                                <Typography variant="caption" color="text.secondary" noWrap display="block">
                                  {s.floorplanName || s.floorName || 'Floor'}
                                </Typography>

                                <Stack spacing={0.25} mt={0.5}>
                                  <Stack direction="row" spacing={0.5} alignItems="center">
                                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#2e7d32' }} />
                                    <Typography variant="caption" color="text.secondary" fontSize="0.7rem">
                                      {startFmt}
                                    </Typography>
                                  </Stack>

                                  <Stack direction="row" spacing={0.5} alignItems="center">
                                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#c62828' }} />
                                    <Typography variant="caption" color="text.secondary" fontSize="0.7rem">
                                      {endFmt}
                                    </Typography>
                                  </Stack>
                                </Stack>

                                <Stack direction="row" spacing={0.5} alignItems="center" mt={0.5}>
                                  <IconClock size={13} color={theme.palette.text.secondary} />
                                  <Typography variant="caption" fontWeight={600} color="text.secondary">
                                    {s.durationFormatted || `${s.durationMinutes || 0} min`}
                                  </Typography>
                                </Stack>
                              </Box>
                            </Stack>
                          </Box>
                        );
                      })}
                    </Stack>
                  )}
                </Box>
              )}

              {/* Tab Content: Areas Summary */}
              {sidebarTab === 'areas' && (
                <Box
                  sx={{
                    p: 2,
                    flex: 1,
                    overflowY: 'auto',
                    maxHeight: isFullscreen ? 'calc(100vh - 430px)' : 380,
                    minHeight: isFullscreen ? 320 : 'auto',
                  }}
                >
                  <Stack spacing={1.5}>
                    {(primaryPerson?.areasVisited || []).map((area, idx) => (
                      <Box key={idx} sx={{ p: 1.25, borderRadius: '10px', bgcolor: isDark ? 'grey.800' : '#f8fafc' }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <IconMapPin size={16} color="#1877F2" />
                          <Typography variant="body2" fontWeight={600}>
                            {area}
                          </Typography>
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              )}
            </Paper>
          </Stack>
        </Grid>

        {/* RIGHT COLUMN: Floorplan Stage & Bottom Split (Width: 9) */}
        <Grid size={{ xs: 12, lg: isFullscreen ? 8.8 : 9 }}>
          <Stack spacing={isFullscreen ? 2.5 : 2} sx={{ height: '100%' }}>
            {/* ================= FLOORPLAN CARD ================= */}
            <Paper
              elevation={0}
              sx={{
                borderRadius: '16px',
                border: '1px solid',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
                bgcolor: isDark ? 'background.paper' : '#ffffff',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Top Controls: Building, Floor, Area, View Mode Toggle */}
              <Box
                sx={{
                  p: 1.5,
                  px: 2,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 1.5,
                  bgcolor: isDark ? 'grey.900' : '#fcfcfd',
                }}
              >
                {/* Left: Building & Floor Selectors */}
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Select
                    size="small"
                    value={activeFloorplan?.floorplanId || ''}
                    onChange={(e) => handleSelectFloorplan(e.target.value)}
                    sx={{ height: 32, fontSize: '0.8rem', borderRadius: '8px', minWidth: 160 }}
                  >
                    {availableFloorplans.map((fp) => (
                      <MenuItem key={fp.floorplanId} value={fp.floorplanId} sx={{ fontSize: '0.8rem' }}>
                        {fp.floorplanName}
                      </MenuItem>
                    ))}
                  </Select>

                  <Chip
                    icon={<IconMapPin size={14} />}
                    label={currentPoint?.area || currentSession?.areaName || 'All Areas'}
                    size="small"
                    variant="outlined"
                    sx={{ height: 32, borderRadius: '8px', fontWeight: 600, fontSize: '0.78rem' }}
                  />
                </Stack>

                {/* Right: Visual Layer Toggle Buttons (Trace, Stops, Incidents) */}
                <Stack direction="row" spacing={1} alignItems="center">
                  <Box
                    sx={{
                      p: 0.5,
                      borderRadius: '10px',
                      bgcolor: isDark ? 'grey.800' : '#f1f5f9',
                      display: 'flex',
                      gap: 0.5,
                    }}
                  >
                    {[
                      {
                        id: 'trace',
                        label: 'Trace',
                        icon: <IconRoute size={15} />,
                        active: showTrace,
                        toggle: () => setShowTrace((p) => !p),
                        activeBg: '#1877F2',
                      },
                      // {
                      //   id: 'stops',
                      //   label: 'Stops',
                      //   icon: <IconCircleDot size={15} />,
                      //   active: showStops,
                      //   toggle: () => setShowStops((p) => !p),
                      //   activeBg: '#0284c7',
                      // },
                      {
                        id: 'incidents',
                        label: 'Incidents',
                        icon: <IconAlertTriangle size={15} />,
                        active: showIncidents,
                        toggle: () => setShowIncidents((p) => !p),
                        activeBg: '#d32f2f',
                      },
                    ].map((m) => {
                      return (
                        <Button
                          key={m.id}
                          size="small"
                          startIcon={m.icon}
                          onClick={m.toggle}
                          sx={{
                            height: 28,
                            px: 1.25,
                            borderRadius: '7px',
                            fontSize: '0.75rem',
                            fontWeight: m.active ? 700 : 500,
                            color: m.active ? '#ffffff' : 'text.secondary',
                            bgcolor: m.active ? m.activeBg : 'transparent',
                            boxShadow: m.active ? '0 2px 6px rgba(0,0,0,0.15)' : 'none',
                            '&:hover': {
                              bgcolor: m.active ? m.activeBg : isDark ? 'grey.700' : '#e2e8f0',
                            },
                          }}
                        >
                          {m.label}
                        </Button>
                      );
                    })}
                  </Box>

                  <Tooltip title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
                    <IconButton size="small" onClick={handleToggleFullscreen}>
                      {isFullscreen ? <IconMinimize size={18} /> : <IconMaximize size={18} />}
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Box>

              {/* Floorplan Viewport (Interactive Konva Canvas) */}
              <Box
                ref={containerRef}
                sx={{
                  width: '100%',
                  height: isFullscreen ? 'calc(100vh - 450px)' : 380,
                  minHeight: isFullscreen ? 480 : 380,
                  bgcolor: '#eceff1',
                  position: 'relative',
                  overflow: 'hidden',
                  cursor: 'grab',
                  '&:active': { cursor: 'grabbing' },
                }}
              >
                {/* Floating Map Legend (Top-Left) */}
                <Paper
                  elevation={2}
                  sx={{
                    position: 'absolute',
                    top: 12,
                    left: 12,
                    zIndex: 10,
                    p: 1.25,
                    borderRadius: '10px',
                    bgcolor: 'rgba(255, 255, 255, 0.92)',
                    backdropFilter: 'blur(6px)',
                    border: '1px solid rgba(0,0,0,0.06)',
                  }}
                >
                  <Stack spacing={0.65}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#2e7d32' }} />
                      <Typography variant="caption" fontSize="0.7rem" fontWeight={600} color="#1e293b">
                        Start Position
                      </Typography>
                    </Stack>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#c62828' }} />
                      <Typography variant="caption" fontSize="0.7rem" fontWeight={600} color="#1e293b">
                        End Position
                      </Typography>
                    </Stack>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box sx={{ width: 14, height: 2.5, bgcolor: '#1877F2', borderRadius: '2px' }} />
                      <Typography variant="caption" fontSize="0.7rem" fontWeight={600} color="#1e293b">
                        Movement Path
                      </Typography>
                    </Stack>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', border: '2px solid #1877F2' }} />
                      <Typography variant="caption" fontSize="0.7rem" fontWeight={600} color="#1e293b">
                        Dwell / Stop
                      </Typography>
                    </Stack>
                    {/* <Stack direction="row" spacing={1} alignItems="center">
                      <Box
                        sx={{
                          width: 14,
                          height: 8,
                          borderRadius: '2px',
                          background: 'linear-gradient(90deg, #00b4d8, #06d6a0, #ffd166, #ef476f)',
                        }}
                      />
                      <Typography variant="caption" fontSize="0.7rem" fontWeight={600} color="#1e293b">
                        Heatmap Density
                      </Typography>
                    </Stack> */}
                  </Stack>
                </Paper>


                {/* Floating Compass, Zoom Controls & Scale Bar (Bottom-Right) */}
                <Stack
                  spacing={1}
                  sx={{
                    position: 'absolute',
                    bottom: 12,
                    right: 12,
                    zIndex: 10,
                    alignItems: 'flex-end',
                  }}
                >
                  <Paper
                    elevation={2}
                    sx={{
                      borderRadius: '8px',
                      bgcolor: 'rgba(255,255,255,0.92)',
                      backdropFilter: 'blur(6px)',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <IconButton size="small" onClick={handleZoomIn}>
                      <IconZoomIn size={16} />
                    </IconButton>
                    <Divider />
                    <IconButton size="small" onClick={handleZoomOut}>
                      <IconZoomOut size={16} />
                    </IconButton>
                    <Divider />
                    <IconButton size="small" onClick={handleResetZoom}>
                      <IconRotateClockwise size={16} />
                    </IconButton>
                  </Paper>
                </Stack>

                {/* Stage */}
                {containerSize.width > 0 && containerSize.height > 0 && (
                  <Stage
                    width={Math.max(10, containerSize.width)}
                    height={Math.max(10, containerSize.height)}
                    draggable
                    x={stagePos.x}
                    y={stagePos.y}
                    onDragEnd={(e) => setStagePos({ x: e.target.x(), y: e.target.y() })}
                    onWheel={(e) => {
                      e.evt.preventDefault();
                      const scaleBy = 1.08;
                      const stage = e.target.getStage();
                      if (!stage) return;
                      const oldScale = stage.scaleX();
                      const pointer = stage.getPointerPosition();
                      if (!pointer) return;

                      const mousePointTo = {
                        x: (pointer.x - stage.x()) / oldScale,
                        y: (pointer.y - stage.y()) / oldScale,
                      };

                      const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
                      const clampedScale = Math.max(0.1, Math.min(5, newScale));
                      setStageScale(clampedScale);
                      setStagePos({
                        x: pointer.x - mousePointTo.x * clampedScale,
                        y: pointer.y - mousePointTo.y * clampedScale,
                      });
                    }}
                    scaleX={stageScale}
                    scaleY={stageScale}
                  >
                    <Layer>
                      {/* Floorplan Background */}
                      {floorplanImgObj && imageNaturalSize.width > 0 && imageNaturalSize.height > 0 && (
                        <KonvaImage
                          image={floorplanImgObj}
                          width={imageNaturalSize.width}
                          height={imageNaturalSize.height}
                        />
                      )}

                      {/* Movement Visualization Layer */}
                      <MovementVisualizationLayer
                        showTrace={showTrace}
                        showStops={showStops}
                        showIncidents={showIncidents}
                        mode={viewMode}
                        points={activeFloorplanPoints}
                        dwellPoints={activeFloorplanDwellPoints}
                        currentIndex={activeFloorplanCurrentIndex}
                        currentAnimatedPos={
                          currentPoint?.floorplanId === activeFloorplan?.floorplanId
                            ? animatedPos
                            : null
                        }
                        currentAnimTimeMs={currentAnimTimeMs}
                        scale={1}
                        densityCanvas={densityCanvas}
                        stageWidth={imageNaturalSize.width}
                        stageHeight={imageNaturalSize.height}
                        personName={personName}
                        hasIncident={currentSession?.hasIncident}
                        incidentTimeStr={currentSession?.enterTime}
                        meterPerPx={meterPerPx}
                      />
                    </Layer>
                  </Stage>
                )}
              </Box>

              {/* Playback Control Bar */}
              <Box
                sx={{
                  p: 1.5,
                  px: 2.5,
                  borderTop: '1px solid',
                  borderColor: 'divider',
                  bgcolor: isDark ? 'grey.900' : '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                {/* Play/Pause Button */}
                <IconButton
                  onClick={handleTogglePlay}
                  sx={{
                    width: 38,
                    height: 38,
                    bgcolor: '#1877F2',
                    color: '#ffffff',
                    '&:hover': { bgcolor: '#1565c0' },
                    flexShrink: 0,
                  }}
                >
                  {isPlaying ? <IconPlayerPauseFilled size={18} /> : <IconPlayerPlayFilled size={18} />}
                </IconButton>

                {/* Speed Selector */}
                <Select
                  size="small"
                  value={playbackSpeed}
                  onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                  sx={{ height: 32, fontSize: '0.78rem', borderRadius: '8px', minWidth: 70 }}
                >
                  <MenuItem value={0.5} sx={{ fontSize: '0.78rem' }}>0.5x</MenuItem>
                  <MenuItem value={1} sx={{ fontSize: '0.78rem' }}>1x</MenuItem>
                  <MenuItem value={2} sx={{ fontSize: '0.78rem' }}>2x</MenuItem>
                  <MenuItem value={4} sx={{ fontSize: '0.78rem' }}>4x</MenuItem>
                  <MenuItem value={8} sx={{ fontSize: '0.78rem' }}>8x</MenuItem>
                </Select>

                {/* Current Timestamp */}
                <Typography
                  variant="caption"
                  sx={{
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    minWidth: 155,
                    color: 'text.primary',
                  }}
                >
                  {currentAnimTimeMs
                    ? dayjs(currentAnimTimeMs).format('MMM D, YYYY HH:mm:ss')
                    : currentPoint
                    ? formatOrRawTime(currentPoint.time, 'MMM D, YYYY HH:mm:ss')
                    : '-'}
                </Typography>

                {/* Scrubber Slider */}
                {(() => {
                  const startTimeMs = points.length > 0 ? dayjs(points[0].time).valueOf() : 0;
                  const endTimeMs = points.length > 0 ? dayjs(points[points.length - 1].time).valueOf() : 1;
                  const sliderVal = currentAnimTimeMs ?? startTimeMs;

                  return (
                    <Slider
                      size="small"
                      value={Math.max(startTimeMs, Math.min(endTimeMs, sliderVal))}
                      min={startTimeMs}
                      max={endTimeMs}
                      onChange={(_, val) => handleSeekTimeMs(val as number)}
                      sx={{
                        flex: 1,
                        color: '#1877F2',
                        '& .MuiSlider-thumb, & .MuiSlider-track, & .MuiSlider-rail': {
                          transition: 'none !important',
                        },
                        '& .MuiSlider-thumb': {
                          width: 14,
                          height: 14,
                        },
                      }}
                    />
                  );
                })()}

                {/* End Timestamp */}
                <Typography
                  variant="caption"
                  sx={{
                    fontFamily: 'monospace',
                    fontWeight: 500,
                    fontSize: '0.78rem',
                    minWidth: 140,
                    color: 'text.secondary',
                    textAlign: 'right',
                  }}
                >
                  {points.length > 0
                    ? formatOrRawTime(points[points.length - 1].time, 'MMM D, YYYY HH:mm:ss')
                    : '-'}
                </Typography>
              </Box>
            </Paper>

            {/* ================= BOTTOM SPLIT: ACTIVITY CHART & EVENT TIMELINE ================= */}
            <Grid container spacing={isFullscreen ? 2.5 : 2} sx={{ minHeight: isFullscreen ? 260 : 220 }}>
              {/* Left: Movement Activity Chart (60%) */}
              <Grid size={{ xs: 12, md: 7 }}>
                <MovementActivityChart
                  buckets={activityBuckets}
                  currentTimestamp={currentPoint?.time}
                  onSeek={handleSeek}
                  isFullscreen={isFullscreen}
                />
              </Grid>

              {/* Right: Event Timeline (40%) */}
              <Grid size={{ xs: 12, md: 5 }}>
                <EventTimelineList
                  events={timelineEvents}
                  currentTimestamp={currentPoint?.time}
                  onSeek={handleSeek}
                  isFullscreen={isFullscreen}
                />
              </Grid>
            </Grid>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
};

export default InvestigateContent;
