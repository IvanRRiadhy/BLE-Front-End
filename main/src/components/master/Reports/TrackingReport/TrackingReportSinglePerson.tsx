import React, { useState, useMemo, useEffect } from 'react';
import Chart from 'react-apexcharts';
import { Stage, Layer, Image as KonvaImage } from 'react-konva';
import {
  Box,
  Card,
  Typography,
  Grid2 as Grid,
  Stack,
  Avatar,
  Chip,
  Paper,
  Button,
  IconButton,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  TablePagination,
  TextField,
  InputAdornment,
  useTheme,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  IconClock,
  IconCalendar,
  IconMapPin,
  IconUser,
  IconMail,
  IconPhone,
  IconBuilding,
  IconId,
  IconSearch,
  IconColumns,
  IconCircleCheck,
  IconPlus,
  IconMinus,
  IconArrowLeft,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { toLocalDate } from 'src/utils/time';
import { VisitorSessionResponseType, VisitorSessionType } from 'src/store/apps/crud/visitorSession';
import { BASE_URL } from 'src/utils/axios';
import BeaconRenderer from 'src/components/dashboards/monitoring/Renderer/BeaconRenderer';
import { useAllFloorplans } from 'src/hooks/useFloorplan';

interface TrackingReportSinglePersonProps {
  data: VisitorSessionType[] | VisitorSessionResponseType | null | undefined;
  isLoading?: boolean;
  isExporting?: boolean;
  onBack?: () => void;
  selectedPersonInfo?: {
    id: string;
    name: string;
    type: 'visitor' | 'member';
    identityId?: string;
    cardNumber?: string;
    email?: string;
    phone?: string;
    organization?: string;
    avatarUrl?: string;
  } | null;
}

export type MovementRecord = {
  id: number;
  enterTime: string;
  exitTime: string;
  rawEnterTime?: string | null;
  rawExitTime?: string | null;
  buildingName: string;
  floorName: string;
  floorplanName: string;
  areaName: string;
  durationMinutes: number;
  durationStr: string;
  status: 'Active' | 'Closed';
  hostName: string;
};

const AREA_COLORS = ['#1877F2', '#00C853', '#FF9100', '#D32F2F', '#9C27B0', '#00BCD4', '#795548'];

const TrackingReportSinglePerson: React.FC<TrackingReportSinglePersonProps> = ({
  data,
  isLoading,
  isExporting,
  onBack,
  selectedPersonInfo,
}) => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'area' | 'floorplan'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Extract sessions and calculate personalized analytics
  const {
    personName,
    personTypeLabel,
    identityId,
    cardNumber,
    email,
    phone,
    organization,
    totalVisits,
    totalDurationMinutes,
    totalDurationFormatted,
    firstSeenStr,
    lastSeenStr,
    currentStatus,
    currentStatusSince,
    currentAreaName,
    currentBuildingFloor,
    movementRecords,
    presenceCategories,
    presenceChartData,
    areaBreakdown,
  } = useMemo(() => {
    const allSessions: VisitorSessionType[] = Array.isArray(data)
      ? data
      : Array.isArray((data as any)?.collection?.data)
      ? (data as any).collection.data
      : Array.isArray((data as any)?.data)
      ? (data as any).data
      : [];

    let sessionList = allSessions;
    if (selectedPersonInfo) {
      const targetId = selectedPersonInfo.id;
      const targetName = selectedPersonInfo.name?.trim().toLowerCase();

      const filtered = allSessions.filter((s) => {
        if (targetId && (s.personId === targetId || s.visitorId === targetId || s.memberId === targetId)) {
          return true;
        }
        if (targetName) {
          const sName = (s.personName || s.visitorName || s.memberName || '').trim().toLowerCase();
          if (sName === targetName) return true;
        }
        return false;
      });

      if (filtered.length > 0) {
        sessionList = filtered;
      }
    }

    let rawPersons: any[] = [];
    if ((data as VisitorSessionResponseType)?.persons) {
      const allPersons = (data as VisitorSessionResponseType).persons || [];
      if (selectedPersonInfo) {
        const targetId = selectedPersonInfo.id;
        const targetName = selectedPersonInfo.name?.trim().toLowerCase();
        rawPersons = allPersons.filter((p: any) => {
          if (targetId && (p.id === targetId || p.personId === targetId || p.visitorId === targetId || p.memberId === targetId)) {
            return true;
          }
          if (targetName && p.personName?.trim().toLowerCase() === targetName) {
            return true;
          }
          return false;
        });
      } else {
        rawPersons = allPersons;
      }
    }

    // Determine target person details
    let name = selectedPersonInfo?.name || 'Unknown Person';
    let typeLabel: 'Member' | 'Visitor' = selectedPersonInfo?.type === 'member' ? 'Member' : 'Visitor';
    let identId = selectedPersonInfo?.identityId || '-';
    let cardNo = selectedPersonInfo?.cardNumber || '-';
    let userEmail = selectedPersonInfo?.email || 'user@example.com';
    let userPhone = selectedPersonInfo?.phone || '+62 812 3456 7890';
    let orgName = selectedPersonInfo?.organization || 'PT. Masela';

    // Parse sessions to records
    const records: MovementRecord[] = [];
    let totMin = 0;
    let firstTime: Date | null = null;
    let lastTime: Date | null = null;
    let latestSession: VisitorSessionType | null = null;

    if (sessionList.length > 0) {
      // Find matching session person
      const firstSession = sessionList[0];
      if (!selectedPersonInfo?.name) {
        name = firstSession.personName || firstSession.visitorName || firstSession.memberName || 'Unknown Person';
        typeLabel = firstSession.personType?.toLowerCase() === 'member' ? 'Member' : 'Visitor';
        cardNo = firstSession.cardName || firstSession.cardId || cardNo;
        orgName = firstSession.hostName || orgName;
      }

      // Sort sessions chronologically asc
      const sortedSessions = [...sessionList].sort(
        (a, b) => (toLocalDate(a.enterTime || 0)?.getTime() ?? 0) - (toLocalDate(b.enterTime || 0)?.getTime() ?? 0)
      );

      sortedSessions.forEach((s, idx) => {
        const enterDate = toLocalDate(s.enterTime);
        const exitDate = toLocalDate(s.exitTime);

        if (enterDate) {
          if (!firstTime || enterDate < firstTime) firstTime = enterDate;
          if (!lastTime || enterDate > lastTime) lastTime = enterDate;
        }

        const dur = s.durationInPeriodMinutes ?? s.durationInMinutes ?? 0;
        totMin += dur;

        const isClosed = Boolean(s.exitTime);
        const recordStatus: 'Active' | 'Closed' = isClosed ? 'Closed' : 'Active';

        records.push({
          id: idx + 1,
          enterTime: enterDate ? dayjs(enterDate).format('MMM D, YYYY HH:mm') : '-',
          exitTime: exitDate ? dayjs(exitDate).format('MMM D, YYYY HH:mm') : '—',
          rawEnterTime: s.enterTime,
          rawExitTime: s.exitTime,
          buildingName: s.buildingName || 'Buni',
          floorName: s.floorName || 'Lantai 1',
          floorplanName: s.floorplanId ? `FP ${s.floorName || 'Lantai 1'}` : 'FP Lantai 1',
          areaName: s.areaName || 'L1 Lobby',
          durationMinutes: dur,
          durationStr: dur > 0 ? `${Math.floor(dur / 60) > 0 ? `${Math.floor(dur / 60)}h ` : ''}${dur % 60}m` : '0m',
          status: recordStatus,
          hostName: s.hostName || 'PT. Masela',
        });
      });

      latestSession = sortedSessions[sortedSessions.length - 1];
    } else if (rawPersons.length > 0) {
      const p = rawPersons[0];
      name = p.personName || name;
      typeLabel = p.personType?.toLowerCase() === 'member' ? 'Member' : 'Visitor';
      cardNo = p.cardNumber || cardNo;
      totMin = p.durationInPeriodMinutes ?? p.totalDurationMinutes ?? 0;

      if (p.sessions) {
        p.sessions.forEach((s: any, idx: number) => {
          const enterDate = toLocalDate(s.enterTime);
          const exitDate = toLocalDate(s.exitTime);
          if (enterDate && (!firstTime || enterDate < firstTime)) firstTime = enterDate;
          if (enterDate && (!lastTime || enterDate > lastTime)) lastTime = enterDate;

          const dur = s.durationInPeriodMinutes ?? s.durationInMinutes ?? 30;

          records.push({
            id: idx + 1,
            enterTime: enterDate ? dayjs(enterDate).format('MMM D, YYYY HH:mm') : '-',
            exitTime: exitDate ? dayjs(exitDate).format('MMM D, YYYY HH:mm') : '—',
            rawEnterTime: s.enterTime,
            rawExitTime: s.exitTime,
            buildingName: s.buildingName || 'Buni',
            floorName: s.floorName || 'Lantai 1',
            floorplanName: 'FP Lantai 1',
            areaName: s.areaName || p.currentArea || 'L1 Lobby',
            durationMinutes: dur,
            durationStr: dur > 0 ? `${Math.floor(dur / 60) > 0 ? `${Math.floor(dur / 60)}h ` : ''}${dur % 60}m` : '0m',
            status: exitDate ? 'Closed' : 'Active',
            hostName: 'PT. Masela',
          });
        });
      }
    }

    // Format Total Duration (e.g. 8h 24m)
    const durationHours = Math.floor(totMin / 60);
    const mins = totMin % 60;
    const durationFormatted = durationHours > 0 ? `${durationHours}h ${mins}m` : `${mins}m`;

    // First / Last Seen formatted
    const fSeen = firstTime ? dayjs(toLocalDate(firstTime)!).format('MMM D, YYYY HH:mm') : 'Sep 1, 2026 08:32';
    const lSeen = lastTime ? dayjs(toLocalDate(lastTime)!).format('MMM D, YYYY HH:mm') : 'Sep 1, 2026 10:38';

    // Status: On Site or Off Site
    const isCurrentlyOnSite = latestSession ? !latestSession.exitTime : records.some((r) => r.status === 'Active');
    const statusText = isCurrentlyOnSite ? 'On Site' : 'Off Site';
    const activeRecord = records.find((r) => r.status === 'Active') || records[records.length - 1];

    let sinceText = 'Since 10:09 (29 minutes)';
    if (activeRecord?.rawEnterTime) {
      const enterD = dayjs(toLocalDate(activeRecord.rawEnterTime)!);
      const diffMins = dayjs().diff(enterD, 'minute');
      sinceText = `Since ${enterD.format('HH:mm')} (${diffMins} minutes)`;
    }

    const curArea = activeRecord?.areaName || 'Ruangan Programmer';
    const curBldgFlr = `${activeRecord?.buildingName || 'Buni'} - ${activeRecord?.floorName || 'Lantai 2'}`;

    // Calculate Presence Over Time (Hourly buckets from 00:00 to 23:00)
    const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);
    const hourlyBuckets = new Array(24).fill(0);
    records.forEach((r) => {
      if (r.rawEnterTime) {
        const hour = toLocalDate(r.rawEnterTime)?.getHours();
        if (hour !== undefined && hour >= 0 && hour < 24) {
          hourlyBuckets[hour] += 1;
        }
      }
    });

    // Calculate Time by Area breakdown
    const areaMap: Record<string, number> = {};
    records.forEach((r) => {
      const a = r.areaName || 'Other';
      areaMap[a] = (areaMap[a] || 0) + (r.durationMinutes || 30);
    });

    const areaLabels = Object.keys(areaMap);
    const areaSeries = Object.values(areaMap);
    if (areaLabels.length === 0) {
      areaLabels.push('Ruangan Programmer', 'L1 Lobby');
      areaSeries.push(252, 252); // 4h 12m each (50%)
    }

    return {
      personName: name,
      personTypeLabel: typeLabel,
      identityId: identId,
      cardNumber: cardNo,
      email: userEmail,
      phone: userPhone,
      organization: orgName,
      totalVisits: records.length || 4,
      totalDurationMinutes: totMin || 504,
      totalDurationFormatted: totMin > 0 ? durationFormatted : '8h 24m',
      firstSeenStr: fSeen,
      lastSeenStr: lSeen,
      currentStatus: statusText,
      currentStatusSince: sinceText,
      currentAreaName: curArea,
      currentBuildingFloor: curBldgFlr,
      movementRecords: records,
      presenceCategories: hours,
      presenceChartData: hourlyBuckets.some((v) => v > 0) ? hourlyBuckets : [0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      areaBreakdown: { labels: areaLabels, series: areaSeries },
    };
  }, [data, selectedPersonInfo]);

  // Load All Floorplans from API
  const { data: floorplansData = [] } = useAllFloorplans();

  // Find active floorplan matching current person's location
  const activeFloorplan = useMemo(() => {
    if (!floorplansData || floorplansData.length === 0) return null;
    const activeRec = movementRecords.find((r) => r.status === 'Active') || movementRecords[0];
    if (activeRec?.floorplanName) {
      const match = floorplansData.find(
        (f: any) => f.name === activeRec.floorplanName || f.id === activeRec.floorplanName
      );
      if (match) return match;
    }
    if (activeRec?.floorName) {
      const match = floorplansData.find(
        (f: any) => f.floor?.name === activeRec.floorName || f.name?.includes(activeRec.floorName)
      );
      if (match) return match;
    }
    return floorplansData[0];
  }, [floorplansData, movementRecords]);

  const floorplanImageUrl = useMemo(() => {
    if (!activeFloorplan?.floorplanImage) return null;
    const path = activeFloorplan.floorplanImage;
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
      return path;
    }
    const cleanBase = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${cleanBase}${cleanPath}`;
  }, [activeFloorplan]);

  const [floorplanImgObj, setFloorplanImgObj] = useState<HTMLImageElement | null>(null);
  const [imgDim, setImgDim] = useState({ width: 600, height: 400 });

  useEffect(() => {
    if (!floorplanImageUrl) {
      setFloorplanImgObj(null);
      return;
    }
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.src = floorplanImageUrl;
    img.onload = () => {
      setFloorplanImgObj(img);
      setImgDim({ width: img.width || 600, height: img.height || 400 });
    };
    img.onerror = () => {
      const fallback = new window.Image();
      fallback.crossOrigin = 'anonymous';
      fallback.src = floorplanImageUrl;
      fallback.onload = () => {
        setFloorplanImgObj(fallback);
        setImgDim({ width: fallback.width || 600, height: fallback.height || 400 });
      };
    };
  }, [floorplanImageUrl]);

  const stageScale = Math.min(420 / (imgDim.width || 1), 220 / (imgDim.height || 1));
  const stageWidth = Math.max(280, imgDim.width * stageScale);
  const stageHeight = Math.max(180, imgDim.height * stageScale);

  const beaconPos = useMemo(() => {
    const activeRec = movementRecords.find((r) => r.status === 'Active') || movementRecords[0];
    const rawX = (activeRec as any)?.rawX ?? (activeRec as any)?.x_px ?? imgDim.width * 0.45;
    const rawY = (activeRec as any)?.rawY ?? (activeRec as any)?.y_px ?? imgDim.height * 0.45;
    return {
      x: rawX * stageScale,
      y: rawY * stageScale,
    };
  }, [movementRecords, imgDim, stageScale]);

  // Initials for avatar
  const initials = personName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  // Filtered records for table
  const filteredRecords = useMemo(() => {
    if (!searchQuery.trim()) return movementRecords;
    const q = searchQuery.toLowerCase();
    return movementRecords.filter(
      (r) =>
        r.areaName.toLowerCase().includes(q) ||
        r.buildingName.toLowerCase().includes(q) ||
        r.floorName.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q)
    );
  }, [movementRecords, searchQuery]);

  const paginatedRecords = useMemo(() => {
    if (isExporting) return filteredRecords;
    const start = page * rowsPerPage;
    return filteredRecords.slice(start, start + rowsPerPage);
  }, [filteredRecords, page, rowsPerPage, isExporting]);


  // Presence chart options (matching Peak Hour area chart style)
  const presenceChartOptions: ApexCharts.ApexOptions = {
    chart: {
      type: 'area',
      height: 220,
      toolbar: {
        show: true,
        tools: {
          download: false,
          selection: true,
          zoom: true,
          zoomin: true,
          zoomout: true,
          pan: true,
          reset: true,
        },
      },
      zoom: {
        enabled: true,
        type: 'x',
        autoScaleYaxis: true,
      },
      sparkline: { enabled: false },
      fontFamily: "'Plus Jakarta Sans', sans-serif;",
      foreColor: theme.palette.text.secondary,
    },
    dataLabels: { enabled: false },
    stroke: {
      curve: 'smooth',
      width: 2,
    },
    colors: ['#1877F2'],
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.45,
        opacityTo: 0.05,
        stops: [0, 90, 100],
      },
    },
    xaxis: {
      categories: presenceCategories,
      tickAmount: 12,
      labels: {
        style: { fontSize: '11px' },
      },
    },
    yaxis: {
      labels: {
        style: { fontSize: '11px' },
      },
    },
    grid: {
      borderColor: theme.palette.divider,
      strokeDashArray: 4,
    },
    tooltip: {
      theme: theme.palette.mode === 'dark' ? 'dark' : 'light',
      custom: function ({ series, seriesIndex, dataPointIndex, w }) {
        const value = series[seriesIndex][dataPointIndex];
        const hour = w.globals.categoryLabels[dataPointIndex] || '09:00';
        return `
          <div style="padding: 8px 12px; background: #fff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); text-align: center;">
            <div style="font-size: 11px; font-weight: 600; color: #666;">${hour}</div>
            <div style="font-size: 14px; font-weight: 700; color: #1877F2;">${value} Area Accessed</div>
          </div>
        `;
      },
    },
  };

  // Time by Area Donut options
  const areaSumTotalMin = areaBreakdown.series.reduce((a, b) => a + b, 0);
  const areaChartOptions: ApexCharts.ApexOptions = {
    chart: {
      type: 'donut',
      fontFamily: "'Plus Jakarta Sans', sans-serif;",
      foreColor: theme.palette.text.secondary,
    },
    labels: areaBreakdown.labels,
    colors: AREA_COLORS,
    legend: { show: false },
    dataLabels: { enabled: false },
    plotOptions: {
      pie: {
        donut: {
          size: '75%',
          labels: {
            show: true,
            total: {
              show: true,
              showAlways: true,
              label: 'Total Duration',
              fontSize: '12px',
              fontWeight: 600,
              color: theme.palette.text.secondary,
              formatter: () => totalDurationFormatted,
            },
          },
        },
      },
    },
    stroke: { show: false },
    tooltip: {
      theme: theme.palette.mode === 'dark' ? 'dark' : 'light',
      y: {
        formatter: (val: number) => {
          const hrs = Math.floor(val / 60);
          const m = val % 60;
          const durStr = hrs > 0 ? `${hrs}h ${m}m` : `${m}m`;
          const pct = areaSumTotalMin > 0 ? ((val / areaSumTotalMin) * 100).toFixed(1) : '0';
          return `${durStr} (${pct}%)`;
        },
      },
    },
  };

  return (
    <Stack spacing={3}>
      {onBack && !isExporting && (
        <Box>
          <Button
            size="small"
            startIcon={<IconArrowLeft size={18} />}
            onClick={onBack}
            sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'none' }}
          >
            Back to Report Overview
          </Button>
        </Box>
      )}

      {/* 1. Header Profile Banner Card */}
      <Card
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '16px',
          p: 3,
          bgcolor: 'background.paper',
        }}
      >
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems={{ xs: 'flex-start', md: 'center' }}>
          {/* Avatar Monogram */}
          <Avatar
            src={selectedPersonInfo?.avatarUrl || `${BASE_URL}/images/users/user-1.jpg`}
            sx={{
              width: 72,
              height: 72,
              bgcolor: '#E8F2FE',
              color: '#1877F2',
              fontWeight: 700,
              fontSize: '24px',
              border: '2px solid',
              borderColor: 'primary.light',
            }}
          >
            {initials}
          </Avatar>

          {/* Person Title & Identifiers */}
          <Box sx={{ minWidth: 200, flexShrink: 0 }}>
            <Stack direction="row" spacing={1.5} alignItems="center" mb={1}>
              <Typography variant="h5" fontWeight={700} color="text.primary">
                {personName}
              </Typography>
              <Chip
                label={
                  <span style={{ color: personTypeLabel === 'Member' ? '#1877F2' : '#B06000', fontWeight: 600, fontSize: '12px' }}>
                    {personTypeLabel}
                  </span>
                }
                size="small"
                sx={{
                  bgcolor: personTypeLabel === 'Member' ? '#E8F2FE' : '#FEF3D6',
                  borderRadius: '12px',
                }}
              />
            </Stack>

            <Stack spacing={0.5}>
              <Stack direction="row" spacing={1} alignItems="center">
                <IconUser size={16} color={theme.palette.text.secondary} />
                <Typography variant="caption" color="text.secondary">
                  Identity ID
                </Typography>
                <Typography variant="caption" fontWeight={600} color="text.primary">
                  {identityId}
                </Typography>
              </Stack>

              <Stack direction="row" spacing={1} alignItems="center">
                <IconId size={16} color={theme.palette.text.secondary} />
                <Typography variant="caption" color="text.secondary">
                  Card
                </Typography>
                <Typography variant="caption" fontWeight={600} color="text.primary">
                  {cardNumber}
                </Typography>
              </Stack>
            </Stack>
          </Box>

          <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'block' } }} />

          {/* Contact Details */}
          <Box sx={{ minWidth: 220 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={500} mb={0.5} display="block">
              Contact
            </Typography>
            <Stack spacing={0.75}>
              <Stack direction="row" spacing={1} alignItems="center">
                <IconMail size={16} color={theme.palette.text.secondary} />
                <Typography variant="body2" color="text.primary" fontWeight={500}>
                  {email}
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center">
                <IconPhone size={16} color={theme.palette.text.secondary} />
                <Typography variant="body2" color="text.primary" fontWeight={500}>
                  {phone}
                </Typography>
              </Stack>
            </Stack>
          </Box>

          <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'block' } }} />

          {/* Organization */}
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={500} mb={0.5} display="block">
              Organization
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <IconBuilding size={18} color={theme.palette.text.secondary} />
              <Typography variant="body2" fontWeight={700} color="text.primary">
                {organization}
              </Typography>
            </Stack>
          </Box>
        </Stack>
      </Card>

      {/* 2. Top Summary KPI Cards (5 Cards) */}
      <Grid container spacing={2}>
        {/* Total Visits */}
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '16px', p: 2 }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  bgcolor: '#E8F2FE',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <IconClock size={22} color="#1877F2" />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">
                  Total Visits
                </Typography>
                <Typography variant="h4" fontWeight={700} sx={{ lineHeight: 1.1 }}>
                  {totalVisits}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                  in selected period
                </Typography>
              </Box>
            </Stack>
          </Card>
        </Grid>

        {/* Total Duration */}
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '16px', p: 2 }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  bgcolor: '#E8F2FE',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <IconClock size={22} color="#1877F2" />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">
                  Total Duration
                </Typography>
                <Typography variant="h4" fontWeight={700} sx={{ lineHeight: 1.1 }}>
                  {totalDurationFormatted}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                  in selected period
                </Typography>
              </Box>
            </Stack>
          </Card>
        </Grid>

        {/* First Seen */}
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '16px', p: 2 }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: '12px',
                  bgcolor: '#E8F2FE',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <IconCalendar size={22} color="#1877F2" />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  First Seen
                </Typography>
                <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.2 }} noWrap>
                  {firstSeenStr.split(' ')[0]} {firstSeenStr.split(' ')[1]} {firstSeenStr.split(' ')[2]}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                  {firstSeenStr.split(' ')[3] || ''}
                </Typography>
              </Box>
            </Stack>
          </Card>
        </Grid>

        {/* Last Seen */}
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '16px', p: 2 }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: '12px',
                  bgcolor: '#E8F2FE',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <IconCalendar size={22} color="#1877F2" />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Last Seen
                </Typography>
                <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.2 }} noWrap>
                  {lastSeenStr.split(' ')[0]} {lastSeenStr.split(' ')[1]} {lastSeenStr.split(' ')[2]}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                  {lastSeenStr.split(' ')[3] || ''}
                </Typography>
              </Box>
            </Stack>
          </Card>
        </Grid>

        {/* Current Status */}
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '16px', p: 2 }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  bgcolor: '#E6F4EA',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#137333' }} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Current Status
                </Typography>
                <Typography variant="subtitle1" fontWeight={700} color="#137333" sx={{ lineHeight: 1.2 }}>
                  {currentStatus}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }} noWrap display="block">
                  {currentStatusSince}
                </Typography>
              </Box>
            </Stack>
          </Card>
        </Grid>
      </Grid>

      {/* 3. Sub Navigation Bar (Tabs) */}
      {/* <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Stack direction="row" spacing={1}>
          {[
            { id: 'overview', label: 'Overview', icon: IconClock },
            { id: 'timeline', label: 'Movement Timeline', icon: IconClock },
            { id: 'area', label: 'Area Summary', icon: IconMapPin },
            { id: 'floorplan', label: 'Floorplan View', icon: IconBuilding },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <Button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                startIcon={<Icon size={18} />}
                sx={{
                  py: 1,
                  px: 2,
                  textTransform: 'none',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? 'primary.main' : 'text.secondary',
                  borderBottom: isActive ? '2px solid' : 'none',
                  borderColor: 'primary.main',
                  borderRadius: 0,
                }}
              >
                {tab.label}
              </Button>
            );
          })}
        </Stack>
      </Box> */}

      {/* 4. Overview 2x2 Grid */}
      <Grid container spacing={2.5}>
        {/* Card 1: Presence Over Time */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '16px', p: 2.5, height: '100%' }}>
            <Box mb={2}>
              <Typography variant="h6" fontWeight={700} color="text.primary">
                Presence Over Time
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Timeline of this person's presence in the selected period
              </Typography>
            </Box>
            <Box sx={{ height: 240, width: '100%' }}>
              <Chart options={presenceChartOptions} series={[{ name: 'Area Accessed', data: presenceChartData }]} type="area" height={220} width="100%" />
            </Box>
          </Card>
        </Grid>

        {/* Card 2: Time by Area */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '16px', p: 2.5, height: '100%' }}>
            <Box mb={2}>
              <Typography variant="h6" fontWeight={700} color="text.primary">
                Time by Area
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Total time spent in each area (selected period)
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', height: 230 }}>
              {/* Donut Chart */}
              <Box sx={{ width: '50%', minWidth: 0 }}>
                <Chart options={areaChartOptions} series={areaBreakdown.series} type="donut" width="100%" height={210} />
              </Box>

              {/* Legend List */}
              <Box sx={{ width: '50%', pl: 2, maxHeight: 210, overflowY: 'auto' }}>
                <Stack spacing={1.5}>
                  {areaBreakdown.labels.map((label, idx) => {
                    const val = areaBreakdown.series[idx] || 0;
                    const hrs = Math.floor(val / 60);
                    const m = val % 60;
                    const durStr = hrs > 0 ? `${hrs}h ${m}m` : `${m}m`;
                    const pct = areaSumTotalMin > 0 ? ((val / areaSumTotalMin) * 100).toFixed(1) : '0';
                    const color = AREA_COLORS[idx % AREA_COLORS.length];

                    return (
                      <Box key={label} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color, mt: 0.5, flexShrink: 0 }} />
                        <Box>
                          <Typography variant="body2" fontWeight={600} color="text.primary" sx={{ lineHeight: 1.2 }}>
                            {label}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {durStr} <span style={{ marginLeft: 8 }}>{pct}%</span>
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })}
                </Stack>
              </Box>
            </Box>
          </Card>
        </Grid>

        {/* Card 3: Movement Timeline */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '16px', p: 2.5, height: '100%' }}>
            <Box mb={2}>
              <Typography variant="h6" fontWeight={700} color="text.primary">
                Movement Timeline
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Chronological movement history in the selected period
              </Typography>
            </Box>

            {/* Date Group Header */}
            <Typography variant="subtitle2" fontWeight={700} color="text.primary" mb={2}>
              {firstSeenStr.split(' ').slice(0, 3).join(' ')}
            </Typography>

            {/* Scrollable Container with Limited Height */}
            <Box sx={{ maxHeight: 320, overflowY: 'auto', pr: 1 }}>
              {/* Timeline Vertical List */}
              <Stack
                spacing={2.5}
                sx={{
                  position: 'relative',
                  pl: 3,
                  py: 0.5,
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    left: 8,
                    top: 8,
                    bottom: 8,
                    width: 2,
                    bgcolor: 'divider',
                  },
                }}
              >
                {movementRecords.map((rec) => {
                  const isActive = rec.status === 'Active';
                  const timeOnly = rec.rawEnterTime ? dayjs(toLocalDate(rec.rawEnterTime)!).format('HH:mm') : '08:32';

                  return (
                    <Box key={rec.id} sx={{ position: 'relative' }}>
                      {/* Circle Node */}
                      <Box
                        sx={{
                          position: 'absolute',
                          left: -24,
                          top: 2,
                          width: 14,
                          height: 14,
                          borderRadius: '50%',
                          bgcolor: isActive ? '#1877F2' : '#00C853',
                          border: '3px solid #fff',
                          boxShadow: 1,
                        }}
                      />

                      <Grid container spacing={1} alignItems="flex-start">
                        <Grid size={2.5}>
                          <Typography variant="caption" fontWeight={700} color="text.primary">
                            {timeOnly}
                          </Typography>
                        </Grid>

                        <Grid size={6.5}>
                          <Typography variant="body2" fontWeight={700} color="text.primary">
                            Entered {isActive ? '(Current)' : ''}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {rec.buildingName} - {rec.floorName}
                          </Typography>
                          <Typography variant="caption" fontWeight={600} color="text.primary">
                            {rec.areaName}
                          </Typography>
                        </Grid>

                        <Grid size={3} sx={{ textAlign: 'right' }}>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Duration
                          </Typography>
                          <Typography variant="caption" fontWeight={600} color="text.primary">
                            {rec.durationStr || '-'}
                          </Typography>
                          <Chip
                            label={
                              <span style={{ color: isActive ? '#1877F2' : '#475569', fontWeight: 600, fontSize: '10px' }}>
                                {isActive ? `Active` : `Closed`}
                              </span>
                            }
                            size="small"
                            sx={{
                              mt: 0.5,
                              height: 20,
                              bgcolor: isActive ? '#E8F2FE' : '#F1F5F9',
                              borderRadius: '10px',
                            }}
                          />
                        </Grid>
                      </Grid>
                    </Box>
                  );
                })}
              </Stack>
            </Box>
          </Card>
        </Grid>

        {/* Card 4: Current Location & Floorplan Preview */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '16px', p: 2.5, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
              <Typography variant="h6" fontWeight={700} color="text.primary">
                Current Location
              </Typography>
              <Chip
                label={
                  <span style={{ color: '#137333', fontWeight: 600, fontSize: '12px' }}>
                    {currentStatus}
                  </span>
                }
                size="small"
                icon={<Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#137333', ml: 1 }} />}
                sx={{ bgcolor: '#E6F4EA', borderRadius: '12px' }}
              />
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center" mb={2}>
              <IconBuilding size={20} color={theme.palette.text.secondary} />
              <Box>
                <Typography variant="subtitle2" fontWeight={700} color="text.primary">
                  {currentBuildingFloor}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {currentAreaName}
                </Typography>
              </Box>
            </Stack>

            {/* Real Floorplan Image & Beacon Renderer Canvas */}
            <Box
              sx={{
                flex: 1,
                minHeight: 230,
                borderRadius: '12px',
                bgcolor: '#F8FAFC',
                border: '1px solid',
                borderColor: 'divider',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {floorplanImgObj ? (
                <Box sx={{ transform: `scale(${zoomLevel})`, transition: 'transform 0.2s linear' }}>
                  <Stage width={stageWidth} height={stageHeight}>
                    <Layer>
                      <KonvaImage image={floorplanImgObj} width={stageWidth} height={stageHeight} />
                      <BeaconRenderer
                        id={selectedPersonInfo?.id || 'current-beacon-pin'}
                        x={beaconPos.x}
                        y={beaconPos.y}
                        beaconSize={1.1}
                        clickable={false}
                        label={personName}
                        isSecurity={false}
                        isMember={personTypeLabel === 'Member'}
                        isVisitor={personTypeLabel === 'Visitor'}
                        faceImage={selectedPersonInfo?.avatarUrl}
                        area={currentAreaName}
                        floorplan={currentBuildingFloor}
                        time={lastSeenStr}
                      />
                    </Layer>
                  </Stage>
                </Box>
              ) : (
                <Stack alignItems="center" spacing={1} py={4}>
                  <CircularProgress size={28} />
                  <Typography variant="caption" color="text.secondary">
                    Loading floorplan image...
                  </Typography>
                </Stack>
              )}

              {/* Map Zoom Controls Top-Left */}
              <Stack
                spacing={0.5}
                sx={{
                  position: 'absolute',
                  top: 12,
                  left: 12,
                  bgcolor: 'background.paper',
                  borderRadius: '8px',
                  border: '1px solid',
                  borderColor: 'divider',
                  p: 0.5,
                  zIndex: 5,
                }}
              >
                <IconButton size="small" onClick={() => setZoomLevel((z) => Math.min(z + 0.15, 1.8))}>
                  <IconPlus size={16} />
                </IconButton>
                <IconButton size="small" onClick={() => setZoomLevel((z) => Math.max(z - 0.15, 0.6))}>
                  <IconMinus size={16} />
                </IconButton>
              </Stack>

              {/* Floor Chip Bottom-Right */}
              <Chip
                label={activeFloorplan?.name || activeFloorplan?.floor?.name || 'Lantai 2'}
                size="small"
                sx={{
                  position: 'absolute',
                  bottom: 12,
                  right: 12,
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                  fontWeight: 600,
                  zIndex: 5,
                }}
              />
            </Box>
          </Card>
        </Grid>
      </Grid>

      {/* 5. Movement Detail Table Section */}
      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '16px', p: 2.5 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2} mb={2.5}>
          <Box>
            <Typography variant="h6" fontWeight={700} color="text.primary">
              Movement Detail
            </Typography>
            <Typography variant="caption" color="text.secondary">
              All movement records in the selected period
            </Typography>
          </Box>

          <Stack direction="row" spacing={1.5} alignItems="center">
            <TextField
              size="small"
              placeholder="Search location, status, or remarks..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(0);
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <IconSearch size={18} />
                  </InputAdornment>
                ),
              }}
              sx={{ width: 280 }}
            />

            {/* <Button variant="outlined" color="inherit" startIcon={<IconColumns size={18} />} sx={{ borderRadius: '8px', textTransform: 'none' }}>
              Columns
            </Button> */}
          </Stack>
        </Stack>

        {/* Movement Detail Table */}
        <TableContainer>
          <Table stickyHeader sx={{ whiteSpace: 'nowrap' }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>#</TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Date & Time (Enter)</TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Date & Time (Exit)</TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Building</TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Floor</TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Floorplan</TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Area</TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Duration</TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Status</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                    Loading movement records...
                  </TableCell>
                </TableRow>
              ) : paginatedRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                    No movement records found.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedRecords.map((row, idx) => {
                  const isActive = row.status === 'Active';

                  return (
                    <TableRow key={row.id} hover>
                      <TableCell>{isExporting ? idx + 1 : page * rowsPerPage + idx + 1}</TableCell>
                      <TableCell>{row.enterTime}</TableCell>
                      <TableCell>{row.exitTime}</TableCell>
                      <TableCell>{row.buildingName}</TableCell>
                      <TableCell>{row.floorName}</TableCell>
                      <TableCell>{row.floorplanName}</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {row.areaName}
                        </Typography>
                      </TableCell>
                      <TableCell>{row.durationStr}</TableCell>
                      <TableCell>
                        <Chip
                          label={
                            <span style={{ color: isActive ? '#137333' : '#475569', fontWeight: 600, fontSize: '12px' }}>
                              {isActive ? 'Active' : 'Closed'}
                            </span>
                          }
                          size="small"
                          sx={{
                            bgcolor: isActive ? '#E6F4EA' : '#F1F5F9',
                            borderRadius: '12px',
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        {!isExporting && (
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={filteredRecords.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
          />
        )}
      </Card>
    </Stack>
  );
};

export default TrackingReportSinglePerson;
