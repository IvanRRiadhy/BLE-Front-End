import React, { useMemo, useState } from 'react';
import {
  Box,
  Card,
  Typography,
  Grid2 as Grid,
  Stack,
  Avatar,
  Chip,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  TextField,
  InputAdornment,
  useTheme,
  Divider,
  Paper,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  IconMapPin,
  IconBuilding,
  IconLock,
  IconLockOpen,
  IconUsers,
  IconBell,
  IconSearch,
  IconChevronRight,
  IconClock,
  IconShieldX,
  IconUser,
  IconId,
  IconAlertTriangle,
  IconFlame,
  IconChartBar,
  IconList,
  IconExternalLink,
} from '@tabler/icons-react';
import Chart from 'react-apexcharts';
import { Stage, Layer, Image as KonvaImage, Line, Group, Text as KonvaText } from 'react-konva';
import useImage from 'use-image';
import { AreaInvestigationData, AreaInvestigationAlarm, Nodes, GlobalInvestigationData } from 'src/hooks/useInvestigate';
import GlobalInvestigationOverview from './GlobalInvestigationOverview';
import { AreaOption } from './NewAreaInvestigateFilter';
import { BASE_URL } from 'src/utils/axios';
import dayjs from 'dayjs';

interface NewAreaInvestigateContentProps {
  data?: AreaInvestigationData | null;
  isLoading?: boolean;
  selectedArea?: AreaOption | null;
  isExporting?: boolean;
  timeRange?: string;
  fromDate?: string | null;
  toDate?: string | null;
  globalData?: GlobalInvestigationData | null;
  isGlobalLoading?: boolean;
  onSelectArea?: (areaId: string) => void;
  onSelectPerson?: (personId: string) => void;
}

const normalizeImageUrl = (path?: string | null) => {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) return path;
  const cleanBase = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${cleanBase}${cleanPath}`;
};

/**
 * Formats a localized ISO string (e.g. 2026-10-01T09:29:26.6233333) directly
 * without shifting or converting timezones because it is already local.
 */
const formatLocalDateTime = (dateStr?: string | null): string => {
  if (!dateStr) return '-';
  const cleanStr = dateStr.endsWith('Z') || dateStr.endsWith('z') ? dateStr.slice(0, -1) : dateStr;
  const parsed = dayjs(cleanStr);
  if (parsed.isValid()) {
    return parsed.format('DD MMM, HH:mm:ss');
  }
  return dateStr;
};

// Floorplan Canvas Component
const AreaFloorplanCanvas: React.FC<{
  imageUrl?: string | null;
  areaName?: string;
  nodes?: Nodes[];
  colorArea?: string;
}> = ({ imageUrl, areaName = 'Area', nodes = [], colorArea = '#FF7A00' }) => {
  const fullImgUrl = normalizeImageUrl(imageUrl);
  const [image] = useImage(fullImgUrl || '', 'anonymous');

  const canvasWidth = 460;
  const canvasHeight = 240;

  const points = useMemo(() => {
    if (!nodes || nodes.length < 3) return [];
    const origW = image ? image.width : 1000;
    const origH = image ? image.height : 600;

    return nodes.flatMap((node: any) => {
      let px = 0;
      let py = 0;
      if (typeof node.x_px === 'number' && typeof node.y_px === 'number') {
        px = (node.x_px / origW) * canvasWidth;
        py = (node.y_px / origH) * canvasHeight;
      } else if (typeof node.x === 'number' && typeof node.y === 'number') {
        if (node.x <= 1 && node.y <= 1 && node.x >= 0 && node.y >= 0 && origW > 1) {
          px = node.x * canvasWidth;
          py = node.y * canvasHeight;
        } else {
          px = (node.x / origW) * canvasWidth;
          py = (node.y / origH) * canvasHeight;
        }
      }
      return [px, py];
    });
  }, [nodes, image]);

  const centerPoint = useMemo(() => {
    if (points.length < 2) return { x: canvasWidth / 2, y: canvasHeight / 2 };
    let sumX = 0;
    let sumY = 0;
    const count = points.length / 2;
    for (let i = 0; i < points.length; i += 2) {
      sumX += points[i];
      sumY += points[i + 1];
    }
    return { x: sumX / count, y: sumY / count };
  }, [points]);

  return (
    <Box
      sx={{
        width: '100%',
        height: 240,
        bgcolor: '#f8fafc',
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      <Stage width={canvasWidth} height={canvasHeight}>
        <Layer>
          {image && (
            <KonvaImage
              image={image}
              width={canvasWidth}
              height={canvasHeight}
              opacity={0.88}
            />
          )}

          {points.length >= 6 && (
            <Line
              points={points}
              fill={colorArea}
              opacity={0.28}
              stroke={colorArea}
              strokeWidth={2.5}
              closed
            />
          )}

          {points.length >= 6 && (
            <Group x={centerPoint.x} y={centerPoint.y}>
              <KonvaText
                text={`📍 ${areaName}`}
                fontSize={11}
                fontStyle="bold"
                fill="#334155"
                align="center"
                offsetX={40}
                offsetY={6}
              />
            </Group>
          )}
        </Layer>
      </Stage>
    </Box>
  );
};

const NewAreaInvestigateContent: React.FC<NewAreaInvestigateContentProps> = ({
  data,
  isLoading = false,
  selectedArea,
  isExporting = false,
  timeRange,
  fromDate,
  toDate,
  globalData,
  isGlobalLoading = false,
  onSelectArea,
  onSelectPerson,
}) => {
  const theme = useTheme();
  const [historySearch, setHistorySearch] = useState('');
  const [centerView, setCenterView] = useState<'occupants' | 'incidents'>('occupants');
  const [loitererViewMode, setLoitererViewMode] = useState<'duration' | 'visits' | 'list'>('duration');
  const [loitererSearch, setLoitererSearch] = useState('');
  const [loitererSortBy, setLoitererSortBy] = useState<'duration' | 'visits' | 'name'>('duration');
  const [loitererSortOrder, setLoitererSortOrder] = useState<'asc' | 'desc'>('desc');

  // Active Occupants search & sort state
  const [occupantSearch, setOccupantSearch] = useState('');
  const [occupantSortBy, setOccupantSortBy] = useState<'time' | 'name' | 'type'>('time');
  const [occupantSortOrder, setOccupantSortOrder] = useState<'asc' | 'desc'>('desc');

  // Incidents search & sort state
  const [incidentSearch, setIncidentSearch] = useState('');
  const [incidentSortBy, setIncidentSortBy] = useState<'time' | 'name' | 'type' | 'category'>('time');
  const [incidentSortOrder, setIncidentSortOrder] = useState<'asc' | 'desc'>('desc');

  // Occupant navigation & confirmation dialog state
  const [confirmOccupantOpen, setConfirmOccupantOpen] = useState(false);
  const [targetOccupant, setTargetOccupant] = useState<{ personId: string; personName?: string } | null>(null);

  const handleOccupantClick = (personId: string) => {
    if (!personId) return;
    const params = new URLSearchParams();
    params.set('mode', 'people');
    params.set('personId', personId);
    if (timeRange) {
      params.set('timeRange', timeRange);
    }
    if (timeRange === 'custom') {
      if (fromDate) params.set('from', fromDate);
      if (toDate) params.set('to', toDate);
    }
    const targetUrl = `${window.location.pathname}?${params.toString()}`;
    const newWindow = window.open(targetUrl, '_blank');
    if (newWindow) {
      newWindow.focus();
    }
  };

  const handlePromptOpenOccupant = (personId: string, personName?: string) => {
    setTargetOccupant({ personId, personName });
    setConfirmOccupantOpen(true);
  };

  // Alarm list navigation & confirmation dialog state
  const [confirmAlarmOpen, setConfirmAlarmOpen] = useState(false);
  const [targetAlarmUrl, setTargetAlarmUrl] = useState<string>('');

  const buildAlarmListUrl = (alarm: any) => {
    const params = new URLSearchParams();
    const alarmId = alarm?.alarmTriggerId || alarm?.alarmId || alarm?.id;
    if (alarmId) params.set('alarmTriggerId', String(alarmId));

    const vId = alarm?.visitorId || (alarm?.personType === 'Visitor' ? alarm.personId : undefined);
    const mId = alarm?.memberId || (alarm?.personType === 'Member' ? alarm.personId : undefined);

    if (vId) params.set('visitorId', String(vId));
    if (mId) params.set('memberId', String(mId));

    return `/alarm/alarmlist?${params.toString()}`;
  };

  const openAlarmInNewTab = (url: string) => {
    const newWindow = window.open(url, '_blank');
    if (newWindow) {
      newWindow.focus();
    }
  };

  const handlePromptOpenAlarm = (alarm: any) => {
    const url = buildAlarmListUrl(alarm);
    setTargetAlarmUrl(url);
    setConfirmAlarmOpen(true);
  };

  if (!selectedArea && !data) {
    return (
      <Box id="area-investigate-export-content">
        <GlobalInvestigationOverview
          data={globalData}
          isLoading={isGlobalLoading}
          onSelectArea={onSelectArea}
          onSelectPerson={onSelectPerson}
        />
      </Box>
    );
  }

  const areaInfo = data?.areaInfo;
  const liveState = data?.liveState;
  const compliance = data?.complianceSummary;
  const incidentSummary = data?.incidentSummary;
  const occupants = liveState?.activeOccupants || [];
  const timeline = data?.chronologicalTimeline || [];
  const alarms = data?.incidentSummary?.alarms || [];
  const topLoiterers = data?.topLoiterers || [];

  // Filtered timeline
  const filteredTimeline = useMemo(() => {
    if (!historySearch.trim()) return timeline;
    const q = historySearch.toLowerCase();
    return timeline.filter(
      (item) =>
        item.title?.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.location?.toLowerCase().includes(q) 
    );
  }, [timeline, historySearch]);

  // Filtered and Sorted Active Occupants
  const processedOccupants = useMemo(() => {
    let list = [...occupants];
    if (occupantSearch.trim()) {
      const q = occupantSearch.toLowerCase();
      list = list.filter(
        (occ) =>
          occ.personName?.toLowerCase().includes(q) ||
          occ.cardNumber?.toLowerCase().includes(q) ||
          occ.personType?.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      let comparison = 0;
      if (occupantSortBy === 'time') {
        const timeA = a.enteredAt ? new Date(a.enteredAt).getTime() : 0;
        const timeB = b.enteredAt ? new Date(b.enteredAt).getTime() : 0;
        comparison = timeA - timeB;
      } else if (occupantSortBy === 'name') {
        comparison = (a.personName ?? '').localeCompare(b.personName ?? '');
      } else if (occupantSortBy === 'type') {
        comparison = (a.personType ?? '').localeCompare(b.personType ?? '');
      }
      return occupantSortOrder === 'desc' ? -comparison : comparison;
    });
    return list;
  }, [occupants, occupantSearch, occupantSortBy, occupantSortOrder]);

  // Filtered and Sorted Incidents / Alarms
  const processedAlarms = useMemo(() => {
    let list = [...alarms];
    if (incidentSearch.trim()) {
      const q = incidentSearch.toLowerCase();
      list = list.filter(
        (alarm) =>
          alarm.personName?.toLowerCase().includes(q) ||
          alarm.cardNumber?.toLowerCase().includes(q) ||
          alarm.incidentCode?.toLowerCase().includes(q) ||
          alarm.category?.toLowerCase().includes(q) ||
          alarm.personType?.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      let comparison = 0;
      if (incidentSortBy === 'time') {
        const timeA = a.triggeredTime ? new Date(a.triggeredTime).getTime() : 0;
        const timeB = b.triggeredTime ? new Date(b.triggeredTime).getTime() : 0;
        comparison = timeA - timeB;
      } else if (incidentSortBy === 'name') {
        comparison = (a.personName ?? '').localeCompare(b.personName ?? '');
      } else if (incidentSortBy === 'type') {
        comparison = (a.personType ?? '').localeCompare(b.personType ?? '');
      } else if (incidentSortBy === 'category') {
        comparison = (a.category ?? '').localeCompare(b.category ?? '');
      }
      return incidentSortOrder === 'desc' ? -comparison : comparison;
    });
    return list;
  }, [alarms, incidentSearch, incidentSortBy, incidentSortOrder]);

  // Filtered and Sorted Top Loiterers
  const processedLoiterers = useMemo(() => {
    let list = [...topLoiterers];
    if (loitererSearch.trim()) {
      const q = loitererSearch.toLowerCase();
      list = list.filter(
        (l) =>
          l.personName?.toLowerCase().includes(q) ||
          l.cardNumber?.toLowerCase().includes(q) ||
          l.personType?.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      let comparison = 0;
      if (loitererSortBy === 'duration') {
        comparison = (a.totalStayMinutes ?? 0) - (b.totalStayMinutes ?? 0);
      } else if (loitererSortBy === 'visits') {
        comparison = (a.visitCount ?? 0) - (b.visitCount ?? 0);
      } else if (loitererSortBy === 'name') {
        comparison = (a.personName ?? '').localeCompare(b.personName ?? '');
      }
      return loitererSortOrder === 'desc' ? -comparison : comparison;
    });
    return list;
  }, [topLoiterers, loitererSearch, loitererSortBy, loitererSortOrder]);

  // Top Loiterers by Duration Chart
  const loitererDurationChart = useMemo(() => {
    const topItems = [...topLoiterers]
      .sort((a, b) => (b.totalStayMinutes ?? 0) - (a.totalStayMinutes ?? 0))
      .slice(0, 5);

    const categories = topItems.map((item) =>
      item.personName ? (item.personName.length > 14 ? item.personName.substring(0, 14) + '...' : item.personName) : 'Unknown'
    );
    const seriesData = topItems.map((item) => item.totalStayMinutes ?? 0);

    const options: ApexCharts.ApexOptions = {
      chart: {
        type: 'bar',
        toolbar: { show: false },
        sparkline: { enabled: false },
      },
      plotOptions: {
        bar: {
          horizontal: true,
          borderRadius: 6,
          barHeight: '55%',
          distributed: true,
          dataLabels: {
            position: 'top',
          },
        },
      },
      colors: ['#FF7A00', '#FFA940', '#FFC069', '#FFD591', '#FFE7BA'],
      dataLabels: {
        enabled: true,
        formatter: (val: number, opts) => {
          const item = topItems[opts.dataPointIndex];
          return item?.totalStayFormatted || `${val}m`;
        },
        offsetX: 10,
        style: {
          fontSize: '11px',
          fontWeight: 600,
          colors: [theme.palette.text.primary],
        },
      },
      xaxis: {
        categories,
        labels: {
          show: true,
          formatter: (val) => `${val}m`,
          style: { fontSize: '10px', colors: theme.palette.text.secondary },
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        labels: {
          style: {
            fontSize: '11px',
            fontWeight: 600,
            colors: theme.palette.text.primary,
          },
        },
      },
      grid: {
        borderColor: '#F1F5F9',
        strokeDashArray: 3,
        xaxis: { lines: { show: true } },
        yaxis: { lines: { show: false } },
        padding: { top: 0, right: 35, bottom: 0, left: 10 },
      },
      tooltip: {
        theme: 'light',
        y: {
          formatter: (val: number, opts) => {
            const item = topItems[opts.dataPointIndex];
            return item?.totalStayFormatted || `${val} minutes`;
          },
        },
      },
      legend: { show: false },
    };

    return { series: [{ name: 'Total Duration (min)', data: seriesData }], options };
  }, [topLoiterers, theme]);

  // Top Loiterers by Visit Count Chart
  const loitererVisitsChart = useMemo(() => {
    const topItems = [...topLoiterers]
      .sort((a, b) => (b.visitCount ?? 0) - (a.visitCount ?? 0))
      .slice(0, 5);

    const categories = topItems.map((item) =>
      item.personName ? (item.personName.length > 14 ? item.personName.substring(0, 14) + '...' : item.personName) : 'Unknown'
    );
    const seriesData = topItems.map((item) => item.visitCount ?? 0);

    const options: ApexCharts.ApexOptions = {
      chart: {
        type: 'bar',
        toolbar: { show: false },
        sparkline: { enabled: false },
      },
      plotOptions: {
        bar: {
          horizontal: true,
          borderRadius: 6,
          barHeight: '55%',
          distributed: true,
          dataLabels: {
            position: 'top',
          },
        },
      },
      colors: ['#1877F2', '#4094F7', '#69B1FC', '#91CEFF', '#BAE0FF'],
      dataLabels: {
        enabled: true,
        formatter: (val: number) => `${val} visits`,
        offsetX: 10,
        style: {
          fontSize: '11px',
          fontWeight: 600,
          colors: [theme.palette.text.primary],
        },
      },
      xaxis: {
        categories,
        labels: {
          show: true,
          formatter: (val) => `${val}`,
          style: { fontSize: '10px', colors: theme.palette.text.secondary },
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        labels: {
          style: {
            fontSize: '11px',
            fontWeight: 600,
            colors: theme.palette.text.primary,
          },
        },
      },
      grid: {
        borderColor: '#F1F5F9',
        strokeDashArray: 3,
        xaxis: { lines: { show: true } },
        yaxis: { lines: { show: false } },
        padding: { top: 0, right: 30, bottom: 0, left: 10 },
      },
      tooltip: {
        theme: 'light',
        y: {
          formatter: (val: number) => `${val} visits`,
        },
      },
      legend: { show: false },
    };

    return { series: [{ name: 'Visits', data: seriesData }], options };
  }, [topLoiterers, theme]);

  // Donut chart for Occupancy Composition
  const donutSeries = useMemo(() => {
    const members = liveState?.membersCount ?? 0;
    const visitors = liveState?.visitorsCount ?? 0;
    const securities = liveState?.securitiesCount ?? 0;
    if (members === 0 && visitors === 0 && securities === 0) return [1];
    return [members, visitors, securities];
  }, [liveState]);

  const totalOccupants = liveState?.currentOccupancy ?? 0;

  const donutOptions: ApexCharts.ApexOptions = useMemo(() => {
    const hasData = (liveState?.currentOccupancy ?? 0) > 0;
    return {
      chart: {
        type: 'donut',
        sparkline: { enabled: true },
      },
      colors: hasData ? ['#00C875', '#A25DDC', '#0085FF'] : ['#E2E8F0'],
      labels: ['Members', 'Visitors', 'Securities'],
      stroke: { width: 0 },
      tooltip: {
        enabled: hasData,
        y: {
          formatter: (val: number) => `${val} people`,
        },
      },
      plotOptions: {
        pie: {
          donut: {
            size: '74%',
            labels: {
              show: true,
              name: { show: false },
              value: {
                show: true,
                fontSize: '24px',
                fontWeight: 700,
                color: theme.palette.text.primary,
                offsetY: 8,
                formatter: () => `${totalOccupants}`,
              },
              total: {
                show: true,
                label: 'Total People',
                fontSize: '11px',
                fontWeight: 500,
                color: theme.palette.text.secondary,
                formatter: () => `${totalOccupants}`,
              },
            },
          },
        },
      },
    };
  }, [liveState, totalOccupants, theme]);

  return (
    <Stack spacing={3} id="area-investigate-export-content">
      {/* 1. TOP CARDS: Area Info (Left) + Floorplan (Right) */}
      <Grid container spacing={3}>
        {/* Left: Area Details Card */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Card
            elevation={0}
            sx={{
              p: 3,
              borderRadius: '16px',
              border: '1px solid',
              borderColor: 'divider',
              height: '100%',
              bgcolor: 'background.paper',
            }}
          >
            {/* Header Title + Badges */}
            <Stack direction="row" spacing={2} alignItems="center" mb={2}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: '12px',
                  bgcolor: '#FFF4E5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FF7A00',
                  flexShrink: 0,
                }}
              >
                <IconMapPin size={28} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                  <Typography variant="h5" fontWeight={700} color="text.primary">
                    {areaInfo?.areaName || selectedArea?.name || 'Area Overview'}
                  </Typography>
                  <Chip
                    label={areaInfo?.isRestricted ? 'Restricted' : 'Non-Restricted'}
                    size="small"
                    sx={{
                      bgcolor: areaInfo?.isRestricted ? '#FEE2E2' : '#E6F4EA',
                      color: areaInfo?.isRestricted ? '#DC2626' : '#137333',
                      fontWeight: 600,
                      fontSize: '11px',
                    }}
                  />
                </Stack>
                <Typography variant="caption" color="text.secondary" fontWeight={500}>
                  {areaInfo?.buildingName || selectedArea?.buildingName || 'Building'} &gt;{' '}
                  {areaInfo?.floorName || selectedArea?.floorName || 'Floor'} &gt;{' '}
                  {areaInfo?.floorplanName || selectedArea?.floorplanName || 'Floorplan'}
                </Typography>
              </Box>
            </Stack>

            <Divider sx={{ my: 2 }} />

            <Grid container spacing={2}>
              {/* Left Column Metadata */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <Stack spacing={1.5}>
                  {/* <Box>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Area ID
                    </Typography>
                    <Typography variant="body2" fontWeight={600} color="text.primary" sx={{ wordBreak: 'break-all' }}>
                      {areaInfo?.areaId || selectedArea?.id || '-'}
                    </Typography>
                  </Box> */}
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Floorplan
                    </Typography>
                    <Typography variant="body2" fontWeight={600} color="text.primary">
                      {areaInfo?.floorplanName || selectedArea?.floorplanName || '-'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Floor
                    </Typography>
                    <Typography variant="body2" fontWeight={600} color="text.primary">
                      {areaInfo?.floorName || selectedArea?.floorName || '-'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Building
                    </Typography>
                    <Typography variant="body2" fontWeight={600} color="text.primary">
                      {areaInfo?.buildingName || selectedArea?.buildingName || '-'}
                    </Typography>
                  </Box>
                </Stack>
              </Grid>

              {/* Right Column: Access Groups */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={1}>
                  Access Groups ({areaInfo?.authorizedAccessGroups?.length || 0})
                </Typography>
                <Stack spacing={1}>
                  {areaInfo?.authorizedAccessGroups && areaInfo.authorizedAccessGroups.length > 0 ? (
                    areaInfo.authorizedAccessGroups.map((grp) => (
                      <Paper
                        key={grp.cardAccessId}
                        variant="outlined"
                        sx={{
                          p: 1,
                          px: 1.5,
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          bgcolor: 'background.default',
                        }}
                      >
                        <Stack direction="row" spacing={1} alignItems="center">
                          {grp.isAllAccess ? (
                            <IconLockOpen size={16} color="#0085FF" />
                          ) : (
                            <IconLock size={16} color="#64748B" />
                          )}
                          <Typography variant="caption" fontWeight={600} color="text.primary">
                            {grp.accessName}
                          </Typography>
                        </Stack>
                        <Chip
                          label={grp.isAllAccess ? 'All Access' : 'Limited Access'}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: '10px',
                            fontWeight: 600,
                            bgcolor: grp.isAllAccess ? '#E6F4EA' : '#F1F5F9',
                            color: grp.isAllAccess ? '#137333' : '#475569',
                          }}
                        />
                      </Paper>
                    ))
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      No whitelist access groups assigned
                    </Typography>
                  )}
                </Stack>
              </Grid>
            </Grid>
          </Card>
        </Grid>

        {/* Right: Floorplan Mini-Map */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Card
            elevation={0}
            sx={{
              p: 3,
              borderRadius: '16px',
              border: '1px solid',
              borderColor: 'divider',
              height: '100%',
              bgcolor: 'background.paper',
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
              <Stack direction="row" spacing={1} alignItems="center">
                <IconBuilding size={20} color="#1877F2" />
                <Typography variant="subtitle2" fontWeight={700} color="text.primary">
                  Floorplan - {areaInfo?.floorplanName || selectedArea?.floorplanName || 'Floorplan'}
                </Typography>
              </Stack>
            </Stack>

            <AreaFloorplanCanvas
              imageUrl={areaInfo?.floorplanImage}
              areaName={areaInfo?.areaName || selectedArea?.name}
              nodes={areaInfo?.nodes}
              colorArea={areaInfo?.colorArea || '#FF7A00'}
            />
          </Card>
        </Grid>
      </Grid>

      {/* 2. MIDDLE CARDS: Current Occupancy & Active Alarm */}
      <Grid container spacing={3}>
        {/* Current Occupancy Stat */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Card
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: '16px',
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
            }}
          >
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              justifyContent="space-between"
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              spacing={2}
            >
              <Stack direction="row" spacing={2} alignItems="center">
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '12px',
                    bgcolor: '#EFF6FF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#1877F2',
                  }}
                >
                  <IconUsers size={26} />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    Current Occupancy
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="baseline">
                    <Typography variant="h3" fontWeight={700} color="text.primary">
                      {liveState?.currentOccupancy ?? 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      people
                    </Typography>
                  </Stack>
                </Box>
              </Stack>

              {/* Sub counts */}
              <Stack direction="row" spacing={3} alignItems="center">
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#00C875' }} />
                    <Typography variant="caption" color="text.secondary">
                      Members
                    </Typography>
                  </Stack>
                  <Typography variant="h6" fontWeight={700} color="text.primary" ml={2}>
                    {liveState?.membersCount ?? 0}
                  </Typography>
                </Box>

                <Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#A25DDC' }} />
                    <Typography variant="caption" color="text.secondary">
                      Visitors
                    </Typography>
                  </Stack>
                  <Typography variant="h6" fontWeight={700} color="text.primary" ml={2}>
                    {liveState?.visitorsCount ?? 0}
                  </Typography>
                </Box>

                <Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#0085FF' }} />
                    <Typography variant="caption" color="text.secondary">
                      Securities
                    </Typography>
                  </Stack>
                  <Typography variant="h6" fontWeight={700} color="text.primary" ml={2}>
                    {liveState?.securitiesCount ?? 0}
                  </Typography>
                </Box>
              </Stack>
            </Stack>
          </Card>
        </Grid>

        {/* Active Alarm & Incident Summary Stat */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Card
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: '16px',
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
            }}
          >
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              justifyContent="space-between"
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              spacing={2}
            >
              <Stack direction="row" spacing={2} alignItems="center">
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '12px',
                    bgcolor: liveState?.hasActiveAlarm ? '#FEE2E2' : '#E6F4EA',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: liveState?.hasActiveAlarm ? '#DC2626' : '#137333',
                    flexShrink: 0,
                  }}
                >
                  <IconBell size={26} />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    Active Alarm
                  </Typography>
                  <Typography
                    variant="h4"
                    fontWeight={700}
                    color={liveState?.hasActiveAlarm ? '#DC2626' : '#137333'}
                  >
                    {liveState?.hasActiveAlarm ? 'Yes' : 'No'}
                  </Typography>
                </Box>
              </Stack>

              {/* Incident Summary Breakdown with Indicators */}
              <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                {/* Total Incidents */}
                <Box
                  sx={{
                    px: 1.5,
                    py: 0.75,
                    borderRadius: '10px',
                    bgcolor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    textAlign: 'center',
                    minWidth: 54,
                  }}
                >
                  <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" fontSize="10px">
                    TOTAL
                  </Typography>
                  <Typography variant="subtitle1" fontWeight={700} color="text.primary">
                    {incidentSummary?.totalIncidents ?? 0}
                  </Typography>
                </Box>

                {/* Active Incidents */}
                <Box
                  sx={{
                    px: 1.5,
                    py: 0.75,
                    borderRadius: '10px',
                    bgcolor: (incidentSummary?.activeIncidents ?? 0) > 0 ? '#FEF2F2' : '#F8FAFC',
                    border: '1px solid',
                    borderColor: (incidentSummary?.activeIncidents ?? 0) > 0 ? '#FECACA' : '#E2E8F0',
                    textAlign: 'center',
                    minWidth: 54,
                  }}
                >
                  <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center">
                    <Box
                      sx={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        bgcolor: (incidentSummary?.activeIncidents ?? 0) > 0 ? '#DC2626' : '#94A3B8',
                      }}
                    />
                    <Typography
                      variant="caption"
                      fontWeight={600}
                      fontSize="10px"
                      color={(incidentSummary?.activeIncidents ?? 0) > 0 ? '#B91C1C' : 'text.secondary'}
                    >
                      ACTIVE
                    </Typography>
                  </Stack>
                  <Typography
                    variant="subtitle1"
                    fontWeight={700}
                    color={(incidentSummary?.activeIncidents ?? 0) > 0 ? '#DC2626' : 'text.primary'}
                  >
                    {incidentSummary?.activeIncidents ?? 0}
                  </Typography>
                </Box>

                {/* Triggered (Red Warning / Danger) */}
                <Box
                  sx={{
                    px: 1.5,
                    py: 0.75,
                    borderRadius: '10px',
                    bgcolor: (incidentSummary?.triggeredInPeriod ?? 0) > 0 ? '#FEF2F2' : '#F8FAFC',
                    border: '1px solid',
                    borderColor: (incidentSummary?.triggeredInPeriod ?? 0) > 0 ? '#FCA5A5' : '#E2E8F0',
                    textAlign: 'center',
                    minWidth: 64,
                  }}
                >
                  <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center">
                    <IconFlame size={12} color={(incidentSummary?.triggeredInPeriod ?? 0) > 0 ? '#DC2626' : '#94A3B8'} />
                    <Typography
                      variant="caption"
                      fontWeight={700}
                      fontSize="10px"
                      color={(incidentSummary?.triggeredInPeriod ?? 0) > 0 ? '#DC2626' : 'text.secondary'}
                    >
                      TRIGGERED
                    </Typography>
                  </Stack>
                  <Typography
                    variant="subtitle1"
                    fontWeight={700}
                    color={(incidentSummary?.triggeredInPeriod ?? 0) > 0 ? '#DC2626' : 'text.primary'}
                  >
                    {incidentSummary?.triggeredInPeriod ?? 0}
                  </Typography>
                </Box>

                {/* Carried Over (Yellow Warning) */}
                <Box
                  sx={{
                    px: 1.5,
                    py: 0.75,
                    borderRadius: '10px',
                    bgcolor: (incidentSummary?.carriedOverIncidents ?? 0) > 0 ? '#FEFCE8' : '#F8FAFC',
                    border: '1px solid',
                    borderColor: (incidentSummary?.carriedOverIncidents ?? 0) > 0 ? '#FDE047' : '#E2E8F0',
                    textAlign: 'center',
                    minWidth: 68,
                  }}
                >
                  <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center">
                    <IconAlertTriangle
                      size={12}
                      color={(incidentSummary?.carriedOverIncidents ?? 0) > 0 ? '#D97706' : '#94A3B8'}
                    />
                    <Typography
                      variant="caption"
                      fontWeight={700}
                      fontSize="10px"
                      color={(incidentSummary?.carriedOverIncidents ?? 0) > 0 ? '#B45309' : 'text.secondary'}
                    >
                      CARRIED OVER
                    </Typography>
                  </Stack>
                  <Typography
                    variant="subtitle1"
                    fontWeight={700}
                    color={(incidentSummary?.carriedOverIncidents ?? 0) > 0 ? '#D97706' : 'text.primary'}
                  >
                    {incidentSummary?.carriedOverIncidents ?? 0}
                  </Typography>
                </Box>
              </Stack>
            </Stack>
          </Card>
        </Grid>
      </Grid>

      {/* 3. BOTTOM CARDS: Area Access History | Active Occupants | Occupancy Composition & Status */}
      <Grid container spacing={3}>
        {/* 3.1 Left Column: Area Access History */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Card
            elevation={0}
            sx={{
              p: 3,
              borderRadius: '16px',
              border: '1px solid',
              borderColor: 'divider',
              height: '100%',
              bgcolor: 'background.paper',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center" mb={2}>
              <IconClock size={20} color="#1877F2" />
              <Typography variant="subtitle1" fontWeight={700} color="text.primary">
                Area Access History
              </Typography>
            </Stack>

            {/* Timeline Search */}
            <TextField
              size="small"
              placeholder="Search timeline event or location..."
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <IconSearch size={16} color="#94A3B8" />
                  </InputAdornment>
                ),
              }}
              sx={{
                mb: 2,
                '& .MuiOutlinedInput-root': { borderRadius: '8px' },
              }}
            />

            {/* Timeline Events Scrollable Container */}
            <Box sx={{ maxHeight: { xs: 500, lg: 650 }, overflowY: 'auto', pr: 1, flex: 1 }}>
              {filteredTimeline.length > 0 ? (
                <Stack spacing={2}>
                  {filteredTimeline.map((item, idx) => {
                    const badgeText = item.badge || item.eventType || 'Event';
                    const badgeLower = badgeText.toLowerCase();

                    // MUI-based badge styling (danger=red, warning=yellow, success=green, etc.)
                    let badgeBg = '#EFF6FF';
                    let badgeColor = '#1877F2';
                    let bulletColor = '#1877F2';

                    if (badgeLower.includes('danger') || badgeLower.includes('alarm') || badgeLower.includes('breach')) {
                      badgeBg = '#FEE2E2';
                      badgeColor = '#DC2626';
                      bulletColor = '#DC2626';
                    } else if (badgeLower.includes('warning') || badgeLower.includes('loiter')) {
                      badgeBg = '#FFF8E1';
                      badgeColor = '#B78103';
                      bulletColor = '#F59E0B';
                    } else if (badgeLower.includes('success') || badgeLower.includes('clear') || badgeLower.includes('entry') || badgeLower.includes('enter')) {
                      badgeBg = '#E6F4EA';
                      badgeColor = '#137333';
                      bulletColor = '#00C875';
                    } else if (badgeLower.includes('info')) {
                      badgeBg = '#E0F2FE';
                      badgeColor = '#0284C7';
                      bulletColor = '#0284C7';
                    }

                    return (
                      <Box key={idx} sx={{ position: 'relative', pl: 2.5 }}>
                        {/* Dot indicator */}
                        <Box
                          sx={{
                            position: 'absolute',
                            left: 0,
                            top: 6,
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            bgcolor: bulletColor,
                          }}
                        />

                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                          <Box sx={{ pr: 1, flex: 1, minWidth: 0 }}>
                            <Typography variant="caption" fontWeight={700} color="text.primary" display="block">
                              {dayjs(item.timestamp).format('HH:mm')}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block">
                              {dayjs(item.timestamp).format('ddd, DD MMM YYYY')}
                            </Typography>
                            <Typography variant="body2" fontWeight={600} color="text.primary" mt={0.5}>
                              {item.title}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block">
                              {item.description}
                            </Typography>
                            {item.location && (
                              <Typography variant="caption" color="text.disabled" display="block">
                                {item.location}
                              </Typography>
                            )}
                          </Box>

                          <Chip
                            label={badgeText}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '10px',
                              fontWeight: 600,
                              bgcolor: badgeBg,
                              color: badgeColor,
                              flexShrink: 0,
                            }}
                          />
                        </Stack>
                        {idx < filteredTimeline.length - 1 && <Divider sx={{ mt: 1.5 }} />}
                      </Box>
                    );
                  })}
                </Stack>
              ) : (
                <Typography variant="caption" color="text.secondary" sx={{ py: 3, display: 'block', textAlign: 'center' }}>
                  No access events in this time period
                </Typography>
              )}
            </Box>
          </Card>
        </Grid>

        {/* 3.2 Center Column: Active Occupants & Incidents */}
        <Grid size={{ xs: 12, lg: 5 }}>
          <Card
            elevation={0}
            sx={{
              p: 3,
              borderRadius: '16px',
              border: '1px solid',
              borderColor: 'divider',
              height: '100%',
              bgcolor: 'background.paper',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Header with View Switcher */}
            {/* Header with View Switcher */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Stack direction="row" spacing={1} alignItems="center">
                {centerView === 'occupants' ? (
                  <IconUsers size={20} color="#1877F2" />
                ) : (
                  <IconAlertTriangle size={20} color="#DC2626" />
                )}
                <Typography variant="subtitle1" fontWeight={700} color="text.primary">
                  {centerView === 'occupants'
                    ? occupantSearch.trim()
                      ? `Active Occupants (${processedOccupants.length}/${occupants.length})`
                      : `Active Occupants (${occupants.length})`
                    : incidentSearch.trim()
                    ? `Incidents (${processedAlarms.length}/${alarms.length})`
                    : `Incidents (${alarms.length})`}
                </Typography>
              </Stack>

              <ToggleButtonGroup
                value={centerView}
                exclusive
                onChange={(_, nextView) => {
                  if (nextView !== null) setCenterView(nextView);
                }}
                size="small"
                sx={{
                  height: 30,
                  '& .MuiToggleButton-root': {
                    px: 1.5,
                    py: 0.5,
                    fontSize: '11px',
                    fontWeight: 600,
                    textTransform: 'none',
                    borderRadius: '6px',
                    border: '1px solid',
                    borderColor: 'divider',
                    '&.Mui-selected': {
                      bgcolor: '#1877F2',
                      color: '#ffffff',
                      '&:hover': { bgcolor: '#1166D8' },
                    },
                  },
                }}
              >
                <ToggleButton value="occupants">Occupants ({occupants.length})</ToggleButton>
                <ToggleButton value="incidents">Incidents ({alarms.length})</ToggleButton>
              </ToggleButtonGroup>
            </Stack>

            <Box sx={{ maxHeight: { xs: 540, lg: 650 }, overflowY: 'auto', pr: 1, flex: 1 }}>
              {/* VIEW 1: ACTIVE OCCUPANTS */}
              {centerView === 'occupants' && (
                <>
                  {/* Search and Sort controls for Occupants */}
                  <Stack spacing={1.5} mb={2}>
                    <TextField
                      size="small"
                      placeholder="Search occupant by name, card, or type..."
                      value={occupantSearch}
                      onChange={(e) => setOccupantSearch(e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <IconSearch size={14} color="#94A3B8" />
                          </InputAdornment>
                        ),
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          height: 32,
                          fontSize: '12px',
                          borderRadius: '8px',
                          bgcolor: '#F8FAFC',
                        },
                      }}
                    />

                    {/* Sorting options bar */}
                    <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                      <Typography variant="caption" color="text.secondary" fontSize="11px">
                        Sort by:
                      </Typography>
                      <Stack direction="row" spacing={0.5}>
                        <Chip
                          label="Time"
                          size="small"
                          onClick={() => {
                            if (occupantSortBy === 'time') {
                              setOccupantSortOrder(occupantSortOrder === 'desc' ? 'asc' : 'desc');
                            } else {
                              setOccupantSortBy('time');
                              setOccupantSortOrder('desc');
                            }
                          }}
                          sx={{
                            height: 22,
                            fontSize: '10px',
                            fontWeight: occupantSortBy === 'time' ? 700 : 500,
                            bgcolor: occupantSortBy === 'time' ? '#EFF6FF' : '#F1F5F9',
                            color: occupantSortBy === 'time' ? '#1877F2' : 'text.secondary',
                            cursor: 'pointer',
                          }}
                        />
                        <Chip
                          label="Name"
                          size="small"
                          onClick={() => {
                            if (occupantSortBy === 'name') {
                              setOccupantSortOrder(occupantSortOrder === 'desc' ? 'asc' : 'desc');
                            } else {
                              setOccupantSortBy('name');
                              setOccupantSortOrder('asc');
                            }
                          }}
                          sx={{
                            height: 22,
                            fontSize: '10px',
                            fontWeight: occupantSortBy === 'name' ? 700 : 500,
                            bgcolor: occupantSortBy === 'name' ? '#F3E8FF' : '#F1F5F9',
                            color: occupantSortBy === 'name' ? '#9333EA' : 'text.secondary',
                            cursor: 'pointer',
                          }}
                        />
                        <Chip
                          label="Member / Type"
                          size="small"
                          onClick={() => {
                            if (occupantSortBy === 'type') {
                              setOccupantSortOrder(occupantSortOrder === 'desc' ? 'asc' : 'desc');
                            } else {
                              setOccupantSortBy('type');
                              setOccupantSortOrder('asc');
                            }
                          }}
                          sx={{
                            height: 22,
                            fontSize: '10px',
                            fontWeight: occupantSortBy === 'type' ? 700 : 500,
                            bgcolor: occupantSortBy === 'type' ? '#E6F4EA' : '#F1F5F9',
                            color: occupantSortBy === 'type' ? '#137333' : 'text.secondary',
                            cursor: 'pointer',
                          }}
                        />
                        <Tooltip title={occupantSortOrder === 'desc' ? 'Descending' : 'Ascending'}>
                          <Chip
                            label={occupantSortOrder === 'desc' ? '↓' : '↑'}
                            size="small"
                            onClick={() => setOccupantSortOrder(occupantSortOrder === 'desc' ? 'asc' : 'desc')}
                            sx={{
                              height: 22,
                              minWidth: 24,
                              fontSize: '11px',
                              fontWeight: 700,
                              bgcolor: '#F1F5F9',
                              cursor: 'pointer',
                            }}
                          />
                        </Tooltip>
                      </Stack>
                    </Stack>
                  </Stack>

                  {processedOccupants.length > 0 ? (
                    <Stack spacing={2}>
                      {processedOccupants.map((occ) => (
                        <Paper
                          key={occ.personId}
                          variant="outlined"
                          onClick={() => handlePromptOpenOccupant(occ.personId, occ.personName)}
                          sx={{
                            p: 1.5,
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            bgcolor: 'background.default',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease-in-out',
                            '&:hover': {
                              bgcolor: 'action.hover',
                              borderColor: 'primary.main',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                              transform: 'translateY(-1px)',
                            },
                          }}
                        >
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <Avatar
                              src={normalizeImageUrl(occ.faceImage) || undefined}
                              sx={{
                                width: 44,
                                height: 44,
                                borderRadius: '8px',
                                bgcolor: occ.personType === 'Member' ? '#E8F2FE' : '#FEF3D6',
                                color: occ.personType === 'Member' ? '#1877F2' : '#B06000',
                                fontWeight: 700,
                              }}
                            >
                              {occ.personName
                                ?.split(' ')
                                .map((n) => n[0])
                                .join('')
                                .substring(0, 2)
                                .toUpperCase()}
                            </Avatar>

                            <Box>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Typography variant="subtitle2" fontWeight={700} color="text.primary">
                                  {occ.personName}
                                </Typography>
                                <Chip
                                  label={occ.personType}
                                  size="small"
                                  sx={{
                                    height: 18,
                                    fontSize: '10px',
                                    fontWeight: 600,
                                    bgcolor: occ.personType === 'Member' ? '#E8F2FE' : '#FEF3D6',
                                    color: occ.personType === 'Member' ? '#1877F2' : '#B06000',
                                  }}
                                />
                              </Stack>

                              <Typography variant="caption" color="text.secondary" display="block">
                                Card: <b>{occ.cardNumber}</b> | Entered: {dayjs(occ.enteredAt).format('DD MMM YYYY HH:mm:ss')}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" display="block">
                                Dwell Time: <b>{occ.currentDwellFormatted}</b>
                              </Typography>
                            </Box>
                          </Stack>

                          <Stack direction="row" spacing={1} alignItems="center">
                            <Chip
                              label={occ.isAuthorized ? 'Authorized' : 'Unauthorized'}
                              size="small"
                              sx={{
                                height: 22,
                                fontSize: '11px',
                                fontWeight: 600,
                                bgcolor: occ.isAuthorized ? '#E6F4EA' : '#FEE2E2',
                                color: occ.isAuthorized ? '#137333' : '#DC2626',
                              }}
                            />
                            <IconChevronRight size={18} color="#94A3B8" />
                          </Stack>
                        </Paper>
                      ))}
                    </Stack>
                  ) : (
                    <Typography variant="caption" color="text.secondary" sx={{ py: 4, display: 'block', textAlign: 'center' }}>
                      {occupantSearch ? 'No matching occupants found' : 'No active occupants in this area currently'}
                    </Typography>
                  )}
                </>
              )}

              {/* VIEW 2: INCIDENTS */}
              {centerView === 'incidents' && (
                <>
                  {/* Search and Sort controls for Incidents */}
                  <Stack spacing={1.5} mb={2}>
                    <TextField
                      size="small"
                      placeholder="Search incident by code, person, card, or category..."
                      value={incidentSearch}
                      onChange={(e) => setIncidentSearch(e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <IconSearch size={14} color="#94A3B8" />
                          </InputAdornment>
                        ),
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          height: 32,
                          fontSize: '12px',
                          borderRadius: '8px',
                          bgcolor: '#F8FAFC',
                        },
                      }}
                    />

                    {/* Sorting options bar */}
                    <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" flexWrap="wrap">
                      <Typography variant="caption" color="text.secondary" fontSize="11px">
                        Sort by:
                      </Typography>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap">
                        <Chip
                          label="Time"
                          size="small"
                          onClick={() => {
                            if (incidentSortBy === 'time') {
                              setIncidentSortOrder(incidentSortOrder === 'desc' ? 'asc' : 'desc');
                            } else {
                              setIncidentSortBy('time');
                              setIncidentSortOrder('desc');
                            }
                          }}
                          sx={{
                            height: 22,
                            fontSize: '10px',
                            fontWeight: incidentSortBy === 'time' ? 700 : 500,
                            bgcolor: incidentSortBy === 'time' ? '#EFF6FF' : '#F1F5F9',
                            color: incidentSortBy === 'time' ? '#1877F2' : 'text.secondary',
                            cursor: 'pointer',
                          }}
                        />
                        <Chip
                          label="Name"
                          size="small"
                          onClick={() => {
                            if (incidentSortBy === 'name') {
                              setIncidentSortOrder(incidentSortOrder === 'desc' ? 'asc' : 'desc');
                            } else {
                              setIncidentSortBy('name');
                              setIncidentSortOrder('asc');
                            }
                          }}
                          sx={{
                            height: 22,
                            fontSize: '10px',
                            fontWeight: incidentSortBy === 'name' ? 700 : 500,
                            bgcolor: incidentSortBy === 'name' ? '#F3E8FF' : '#F1F5F9',
                            color: incidentSortBy === 'name' ? '#9333EA' : 'text.secondary',
                            cursor: 'pointer',
                          }}
                        />
                        <Chip
                          label="Member / Type"
                          size="small"
                          onClick={() => {
                            if (incidentSortBy === 'type') {
                              setIncidentSortOrder(incidentSortOrder === 'desc' ? 'asc' : 'desc');
                            } else {
                              setIncidentSortBy('type');
                              setIncidentSortOrder('asc');
                            }
                          }}
                          sx={{
                            height: 22,
                            fontSize: '10px',
                            fontWeight: incidentSortBy === 'type' ? 700 : 500,
                            bgcolor: incidentSortBy === 'type' ? '#E6F4EA' : '#F1F5F9',
                            color: incidentSortBy === 'type' ? '#137333' : 'text.secondary',
                            cursor: 'pointer',
                          }}
                        />
                        <Chip
                          label="Incident Type"
                          size="small"
                          onClick={() => {
                            if (incidentSortBy === 'category') {
                              setIncidentSortOrder(incidentSortOrder === 'desc' ? 'asc' : 'desc');
                            } else {
                              setIncidentSortBy('category');
                              setIncidentSortOrder('asc');
                            }
                          }}
                          sx={{
                            height: 22,
                            fontSize: '10px',
                            fontWeight: incidentSortBy === 'category' ? 700 : 500,
                            bgcolor: incidentSortBy === 'category' ? '#FFF4E5' : '#F1F5F9',
                            color: incidentSortBy === 'category' ? '#FF7A00' : 'text.secondary',
                            cursor: 'pointer',
                          }}
                        />
                        <Tooltip title={incidentSortOrder === 'desc' ? 'Descending' : 'Ascending'}>
                          <Chip
                            label={incidentSortOrder === 'desc' ? '↓' : '↑'}
                            size="small"
                            onClick={() => setIncidentSortOrder(incidentSortOrder === 'desc' ? 'asc' : 'desc')}
                            sx={{
                              height: 22,
                              minWidth: 24,
                              fontSize: '11px',
                              fontWeight: 700,
                              bgcolor: '#F1F5F9',
                              cursor: 'pointer',
                            }}
                          />
                        </Tooltip>
                      </Stack>
                    </Stack>
                  </Stack>

                  {processedAlarms.length > 0 ? (
                    <Stack spacing={2}>
                      {processedAlarms.map((alarm, aIdx) => {
                        const s = (alarm.status || '').toLowerCase();
                        let stageLabel = 'Warning';
                        let stageBg = '#FFF8E1';
                        let stageColor = '#B78103';

                        if (s === 'idle' || s === 'acknowledged') {
                          stageLabel = 'Danger';
                          stageBg = '#FEE2E2';
                          stageColor = '#DC2626';
                        } else if (s === 'done' || s === 'doneinvestigated') {
                          stageLabel = 'Clear';
                          stageBg = '#E6F4EA';
                          stageColor = '#137333';
                        }

                        return (
                          <Paper
                            key={alarm.alarmId || aIdx}
                            variant="outlined"
                            onClick={() => handlePromptOpenAlarm(alarm)}
                            sx={{
                              p: 2,
                              borderRadius: '12px',
                              bgcolor: 'background.default',
                              borderLeft: '4px solid',
                              borderLeftColor: alarm.alarmColor || (stageLabel === 'Danger' ? '#DC2626' : stageLabel === 'Clear' ? '#137333' : '#F59E0B'),
                              cursor: 'pointer',
                              transition: 'all 0.2s ease-in-out',
                              '&:hover': {
                                bgcolor: 'action.hover',
                                borderColor: 'primary.main',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                                transform: 'translateY(-1px)',
                              },
                            }}
                          >
                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                              <Box sx={{ pr: 1, flex: 1, minWidth: 0 }}>
                                <Stack direction="row" spacing={1.5} alignItems="center" mb={1}>
                                  {alarm.faceImage !== undefined && (
                                    <Avatar
                                      src={normalizeImageUrl(alarm.faceImage) || undefined}
                                      onClick={(e) => {
                                        if (alarm.personId) {
                                          e.stopPropagation();
                                          handleOccupantClick(alarm.personId);
                                        }
                                      }}
                                      sx={{
                                        width: 34,
                                        height: 34,
                                        borderRadius: '8px',
                                        bgcolor: alarm.personType === 'Member' ? '#E8F2FE' : '#FEF3D6',
                                        color: alarm.personType === 'Member' ? '#1877F2' : '#B06000',
                                        fontWeight: 700,
                                        fontSize: '12px',
                                        cursor: alarm.personId ? 'pointer' : 'default',
                                        flexShrink: 0,
                                      }}
                                    >
                                      {alarm.personName
                                        ? alarm.personName
                                            .split(' ')
                                            .map((n) => n[0])
                                            .join('')
                                            .substring(0, 2)
                                            .toUpperCase()
                                        : <IconUser size={18} />}
                                    </Avatar>
                                  )}
                                  <Box sx={{ minWidth: 0 }}>
                                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                                      <Typography
                                        variant="subtitle2"
                                        fontWeight={700}
                                        color="text.primary"
                                        onClick={(e) => {
                                          if (alarm.personId) {
                                            e.stopPropagation();
                                            handleOccupantClick(alarm.personId);
                                          }
                                        }}
                                        sx={{
                                          cursor: alarm.personId ? 'pointer' : 'default',
                                          '&:hover': alarm.personId ? { color: 'primary.main', textDecoration: 'underline' } : {},
                                        }}
                                      >
                                        {alarm.personName || alarm.category || 'Incident'}
                                      </Typography>
                                      {alarm.category && (
                                        <Chip
                                          label={alarm.category}
                                          size="small"
                                          sx={{
                                            height: 18,
                                            fontSize: '10px',
                                            fontWeight: 600,
                                            bgcolor: alarm.alarmColor ? `${alarm.alarmColor}22` : '#F1F5F9',
                                            color: alarm.alarmColor || '#475569',
                                            border: `1px solid ${alarm.alarmColor ? `${alarm.alarmColor}55` : '#CBD5E1'}`,
                                          }}
                                        />
                                      )}
                                      {alarm.personType && (
                                        <Chip
                                          label={alarm.personType}
                                          size="small"
                                          sx={{
                                            height: 18,
                                            fontSize: '10px',
                                            fontWeight: 600,
                                            bgcolor: alarm.personType === 'Member' ? '#E8F2FE' : '#FEF3D6',
                                            color: alarm.personType === 'Member' ? '#1877F2' : '#B06000',
                                          }}
                                        />
                                      )}
                                    </Stack>
                                    {alarm.incidentCode && (
                                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px', fontWeight: 600 }}>
                                        {alarm.incidentCode} {alarm.cardNumber ? `• Card: ${alarm.cardNumber}` : ''}
                                      </Typography>
                                    )}
                                  </Box>
                                </Stack>

                                <Typography variant="caption" color="text.secondary" display="block">
                                  Triggered: <b>{dayjs(alarm.triggeredTime).format('DD MMM YYYY HH:mm:ss')}</b>
                                </Typography>

                                {alarm.areaName && (
                                  <Typography variant="caption" color="text.disabled" display="block">
                                    Location: {alarm.areaName} {alarm.floorName ? `• ${alarm.floorName}` : ''}
                                  </Typography>
                                )}

                                {alarm.investigatedBy && (
                                  <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                                    Investigated by: <b>{alarm.investigatedBy}</b>
                                  </Typography>
                                )}

                                {/* isCarriedOver Badge */}
                                {alarm.isCarriedOver && (
                                  <Chip
                                    icon={<IconAlertTriangle size={12} />}
                                    label="Carried Over (outside filter)"
                                    size="small"
                                    sx={{
                                      mt: 1,
                                      height: 20,
                                      fontSize: '10px',
                                      fontWeight: 600,
                                      bgcolor: '#FFF8E1',
                                      color: '#B78103',
                                      border: '1px solid #FFE082',
                                      '& .MuiChip-icon': { color: '#B78103' },
                                    }}
                                  />
                                )}
                              </Box>

                              <Stack direction="row" spacing={1} alignItems="center" flexShrink={0}>
                                <Chip
                                  label={stageLabel}
                                  size="small"
                                  sx={{
                                    height: 22,
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    bgcolor: stageBg,
                                    color: stageColor,
                                    flexShrink: 0,
                                  }}
                                />
                                <Tooltip title="Open in Alarm List">
                                  <Box
                                    sx={{
                                      p: 0.5,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      color: 'text.secondary',
                                      borderRadius: '6px',
                                      '&:hover': {
                                        color: 'error.main',
                                        bgcolor: '#FFEBEE',
                                      },
                                    }}
                                  >
                                    <IconExternalLink size={16} />
                                  </Box>
                                </Tooltip>
                              </Stack>
                            </Stack>
                          </Paper>
                        );
                      })}
                    </Stack>
                  ) : (
                    <Typography variant="caption" color="text.secondary" sx={{ py: 4, display: 'block', textAlign: 'center' }}>
                      {incidentSearch ? 'No matching incidents found' : 'No incidents recorded in this area'}
                    </Typography>
                  )}
                </>
              )}
            </Box>
          </Card>
        </Grid>

        {/* 3.3 Right Column: Occupancy Composition & Area Status */}
        <Grid size={{ xs: 12, lg: 3 }}>
          <Stack spacing={3}>
            {/* Occupancy Composition Card */}
            <Card
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: '16px',
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                <IconUsers size={20} color="#1877F2" />
                <Typography variant="subtitle1" fontWeight={700} color="text.primary">
                  Occupancy Composition
                </Typography>
              </Stack>

              <Box sx={{ display: 'flex', justifyContent: 'center', my: 1 }}>
                <Chart options={donutOptions} series={donutSeries} type="donut" width="100%" height={170} />
              </Box>

              {/* Composition Breakdown Legend */}
              <Stack spacing={1.2} mt={2}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#00C875' }} />
                    <Typography variant="caption" color="text.secondary">
                      Members
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Typography variant="caption" fontWeight={700} color="text.primary">
                      {liveState?.membersCount ?? 0}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ minWidth: 32, textAlign: 'right' }}>
                      {totalOccupants > 0
                        ? `${Math.round(((liveState?.membersCount ?? 0) / totalOccupants) * 100)}%`
                        : '0%'}
                    </Typography>
                  </Stack>
                </Stack>

                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#A25DDC' }} />
                    <Typography variant="caption" color="text.secondary">
                      Visitors
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Typography variant="caption" fontWeight={700} color="text.primary">
                      {liveState?.visitorsCount ?? 0}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ minWidth: 32, textAlign: 'right' }}>
                      {totalOccupants > 0
                        ? `${Math.round(((liveState?.visitorsCount ?? 0) / totalOccupants) * 100)}%`
                        : '0%'}
                    </Typography>
                  </Stack>
                </Stack>

                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#0085FF' }} />
                    <Typography variant="caption" color="text.secondary">
                      Securities
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Typography variant="caption" fontWeight={700} color="text.primary">
                      {liveState?.securitiesCount ?? 0}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ minWidth: 32, textAlign: 'right' }}>
                      {totalOccupants > 0
                        ? `${Math.round(((liveState?.securitiesCount ?? 0) / totalOccupants) * 100)}%`
                        : '0%'}
                    </Typography>
                  </Stack>
                </Stack>
              </Stack>
            </Card>

            {/* Top Loiterers Card (Replacing Area Status) */}
            <Card
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: '16px',
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
              }}
            >
              {/* Header + View Mode Switcher */}
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5} flexWrap="wrap" gap={1}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <IconClock size={20} color="#FF7A00" />
                  <Typography variant="subtitle1" fontWeight={700} color="text.primary">
                    Top Loiterers
                  </Typography>
                  <Chip
                    label={topLoiterers.length}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: '10px',
                      fontWeight: 700,
                      bgcolor: '#FFF4E5',
                      color: '#FF7A00',
                    }}
                  />
                </Stack>

                {/* 3 View Modes: Duration, Visits, List */}
                <ToggleButtonGroup
                  value={loitererViewMode}
                  exclusive
                  onChange={(_, next) => {
                    if (next !== null) setLoitererViewMode(next);
                  }}
                  size="small"
                  sx={{
                    height: 28,
                    '& .MuiToggleButton-root': {
                      px: 1,
                      py: 0.25,
                      fontSize: '11px',
                      fontWeight: 600,
                      textTransform: 'none',
                      borderRadius: '6px',
                      border: '1px solid',
                      borderColor: 'divider',
                      '&.Mui-selected': {
                        bgcolor: '#FF7A00',
                        color: '#ffffff',
                        '&:hover': { bgcolor: '#E66E00' },
                      },
                    },
                  }}
                >
                  <Tooltip title="Chart by Stay Duration" arrow>
                    <ToggleButton value="duration">
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <IconChartBar size={14} />
                        <Typography variant="caption" fontWeight={600} fontSize="11px">
                          Duration
                        </Typography>
                      </Stack>
                    </ToggleButton>
                  </Tooltip>
                  <Tooltip title="Chart by Visit Count" arrow>
                    <ToggleButton value="visits">
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <IconChartBar size={14} />
                        <Typography variant="caption" fontWeight={600} fontSize="11px">
                          Visits
                        </Typography>
                      </Stack>
                    </ToggleButton>
                  </Tooltip>
                  <Tooltip title="Detailed List Table" arrow>
                    <ToggleButton value="list">
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <IconList size={14} />
                        <Typography variant="caption" fontWeight={600} fontSize="11px">
                          List
                        </Typography>
                      </Stack>
                    </ToggleButton>
                  </Tooltip>
                </ToggleButtonGroup>
              </Stack>

              {/* MODE 1: Chart by Duration */}
              {loitererViewMode === 'duration' && (
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                    Ranked by total dwell time inside area
                  </Typography>
                  {topLoiterers.length > 0 ? (
                    <Box sx={{ mt: 1 }}>
                      <Chart
                        options={loitererDurationChart.options}
                        series={loitererDurationChart.series}
                        type="bar"
                        width="100%"
                        height={Math.max(160, Math.min(topLoiterers.length, 5) * 36 + 40)}
                      />
                    </Box>
                  ) : (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ py: 4, display: 'block', textAlign: 'center' }}
                    >
                      No loitering data available for this area
                    </Typography>
                  )}
                </Box>
              )}

              {/* MODE 2: Chart by Visit Count */}
              {loitererViewMode === 'visits' && (
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                    Ranked by total frequency of visits to this area
                  </Typography>
                  {topLoiterers.length > 0 ? (
                    <Box sx={{ mt: 1 }}>
                      <Chart
                        options={loitererVisitsChart.options}
                        series={loitererVisitsChart.series}
                        type="bar"
                        width="100%"
                        height={Math.max(160, Math.min(topLoiterers.length, 5) * 36 + 40)}
                      />
                    </Box>
                  ) : (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ py: 4, display: 'block', textAlign: 'center' }}
                    >
                      No loitering data available for this area
                    </Typography>
                  )}
                </Box>
              )}

              {/* MODE 3: Normal List Table (Searchable & Sortable) */}
              {loitererViewMode === 'list' && (
                <Box>
                  {/* Search and Sort controls */}
                  <Stack spacing={1.5} mb={1.5}>
                    <TextField
                      size="small"
                      placeholder="Search person or card..."
                      value={loitererSearch}
                      onChange={(e) => setLoitererSearch(e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <IconSearch size={14} color="#94A3B8" />
                          </InputAdornment>
                        ),
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          height: 32,
                          fontSize: '12px',
                          borderRadius: '8px',
                          bgcolor: '#F8FAFC',
                        },
                      }}
                    />

                    {/* Sorting options bar */}
                    <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                      <Typography variant="caption" color="text.secondary" fontSize="11px">
                        Sort by:
                      </Typography>
                      <Stack direction="row" spacing={0.5}>
                        <Chip
                          label="Duration"
                          size="small"
                          onClick={() => {
                            if (loitererSortBy === 'duration') {
                              setLoitererSortOrder(loitererSortOrder === 'desc' ? 'asc' : 'desc');
                            } else {
                              setLoitererSortBy('duration');
                              setLoitererSortOrder('desc');
                            }
                          }}
                          sx={{
                            height: 22,
                            fontSize: '10px',
                            fontWeight: loitererSortBy === 'duration' ? 700 : 500,
                            bgcolor: loitererSortBy === 'duration' ? '#FFF4E5' : '#F1F5F9',
                            color: loitererSortBy === 'duration' ? '#FF7A00' : 'text.secondary',
                            cursor: 'pointer',
                          }}
                        />
                        <Chip
                          label="Visits"
                          size="small"
                          onClick={() => {
                            if (loitererSortBy === 'visits') {
                              setLoitererSortOrder(loitererSortOrder === 'desc' ? 'asc' : 'desc');
                            } else {
                              setLoitererSortBy('visits');
                              setLoitererSortOrder('desc');
                            }
                          }}
                          sx={{
                            height: 22,
                            fontSize: '10px',
                            fontWeight: loitererSortBy === 'visits' ? 700 : 500,
                            bgcolor: loitererSortBy === 'visits' ? '#EFF6FF' : '#F1F5F9',
                            color: loitererSortBy === 'visits' ? '#1877F2' : 'text.secondary',
                            cursor: 'pointer',
                          }}
                        />
                        <Chip
                          label="Name"
                          size="small"
                          onClick={() => {
                            if (loitererSortBy === 'name') {
                              setLoitererSortOrder(loitererSortOrder === 'desc' ? 'asc' : 'desc');
                            } else {
                              setLoitererSortBy('name');
                              setLoitererSortOrder('asc');
                            }
                          }}
                          sx={{
                            height: 22,
                            fontSize: '10px',
                            fontWeight: loitererSortBy === 'name' ? 700 : 500,
                            bgcolor: loitererSortBy === 'name' ? '#F3E8FF' : '#F1F5F9',
                            color: loitererSortBy === 'name' ? '#9333EA' : 'text.secondary',
                            cursor: 'pointer',
                          }}
                        />
                        <Tooltip title={loitererSortOrder === 'desc' ? 'Descending' : 'Ascending'}>
                          <Chip
                            label={loitererSortOrder === 'desc' ? '↓' : '↑'}
                            size="small"
                            onClick={() => setLoitererSortOrder(loitererSortOrder === 'desc' ? 'asc' : 'desc')}
                            sx={{
                              height: 22,
                              minWidth: 24,
                              fontSize: '11px',
                              fontWeight: 700,
                              bgcolor: '#F1F5F9',
                              cursor: 'pointer',
                            }}
                          />
                        </Tooltip>
                      </Stack>
                    </Stack>
                  </Stack>

                  {/* List / Cards */}
                  <Box sx={{ maxHeight: 310, overflowY: 'auto', pr: 0.5 }}>
                    {processedLoiterers.length > 0 ? (
                      <Stack spacing={1}>
                        {processedLoiterers.map((loiterer, idx) => (
                          <Paper
                            key={loiterer.personId || idx}
                            variant="outlined"
                            onClick={() => handleOccupantClick(loiterer.personId)}
                            sx={{
                              p: 1.25,
                              borderRadius: '10px',
                              cursor: 'pointer',
                              bgcolor: 'background.paper',
                              transition: 'all 0.2s',
                              '&:hover': {
                                bgcolor: '#F8FAFC',
                                borderColor: '#CBD5E1',
                                transform: 'translateY(-1px)',
                              },
                            }}
                          >
                            <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between">
                              <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
                                <Avatar
                                  sx={{
                                    width: 32,
                                    height: 32,
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    bgcolor: '#FFF4E5',
                                    color: '#FF7A00',
                                    border: '1px solid #FFE7BA',
                                  }}
                                >
                                  {loiterer.personName ? loiterer.personName.charAt(0).toUpperCase() : '?'}
                                </Avatar>

                                <Box sx={{ minWidth: 0 }}>
                                  <Stack direction="row" spacing={0.75} alignItems="center">
                                    <Typography
                                      variant="caption"
                                      fontWeight={700}
                                      color="text.primary"
                                      noWrap
                                      sx={{ maxWidth: 110 }}
                                    >
                                      {loiterer.personName}
                                    </Typography>
                                    <Chip
                                      label={loiterer.isAuthorized ? 'Auth' : 'Unauth'}
                                      size="small"
                                      sx={{
                                        height: 16,
                                        fontSize: '9px',
                                        fontWeight: 600,
                                        px: 0.5,
                                        bgcolor: loiterer.isAuthorized ? '#E6F4EA' : '#FEE2E2',
                                        color: loiterer.isAuthorized ? '#137333' : '#DC2626',
                                      }}
                                    />
                                  </Stack>

                                  <Typography variant="caption" color="text.secondary" fontSize="10px" display="block">
                                    Card: {loiterer.cardNumber || '-'} • {loiterer.personType}
                                  </Typography>
                                  {loiterer.lastSeenAt && (
                                    <Typography variant="caption" color="text.secondary" fontSize="10px" display="block">
                                      Last seen: <b>{formatLocalDateTime(loiterer.lastSeenAt)}</b>
                                    </Typography>
                                  )}
                                </Box>
                              </Stack>

                              {/* Right Stats */}
                              <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                                <Typography variant="caption" fontWeight={700} color="#FF7A00" display="block" fontSize="11px">
                                  {loiterer.totalStayFormatted || `${loiterer.totalStayMinutes}m`}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" fontSize="10px">
                                  {loiterer.visitCount} visits
                                </Typography>
                              </Box>
                            </Stack>
                          </Paper>
                        ))}
                      </Stack>
                    ) : (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ py: 3, display: 'block', textAlign: 'center' }}
                      >
                        {loitererSearch ? 'No matching people found' : 'No loiterers recorded'}
                      </Typography>
                    )}
                  </Box>
                </Box>
              )}
            </Card>
          </Stack>
        </Grid>
      </Grid>

      {/* Confirmation Dialog for redirecting to Person Investigation in New Tab */}
      <Dialog
        open={confirmOccupantOpen}
        onClose={() => setConfirmOccupantOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: { borderRadius: '16px', p: 1 },
        }}
      >
        <DialogTitle fontWeight={700}>Navigate to Person Investigation?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            You are about to navigate to the detailed investigation page for{' '}
            <Typography component="span" fontWeight={600} color="text.primary">
              {targetOccupant?.personName || 'this occupant'}
            </Typography>{' '}
            in a new browser tab. Do you want to proceed?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ pb: 1.5, px: 2 }}>
          <Button
            onClick={() => setConfirmOccupantOpen(false)}
            color="inherit"
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<IconExternalLink size={16} />}
            onClick={() => {
              if (targetOccupant?.personId) {
                handleOccupantClick(targetOccupant.personId);
              }
              setConfirmOccupantOpen(false);
            }}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
          >
            Open in New Tab
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog for opening Alarm List in New Tab */}
      <Dialog
        open={confirmAlarmOpen}
        onClose={() => setConfirmAlarmOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: { borderRadius: '16px', p: 1 },
        }}
      >
        <DialogTitle fontWeight={700}>Open Alarm List in New Tab?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            You are about to navigate to the Alarm List for this incident in a new browser tab. Do you want to proceed?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ pb: 1.5, px: 2 }}>
          <Button
            onClick={() => setConfirmAlarmOpen(false)}
            color="inherit"
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            startIcon={<IconExternalLink size={16} />}
            onClick={() => {
              if (targetAlarmUrl) {
                openAlarmInNewTab(targetAlarmUrl);
              }
              setConfirmAlarmOpen(false);
            }}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
          >
            Open in New Tab
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};

export default NewAreaInvestigateContent;
