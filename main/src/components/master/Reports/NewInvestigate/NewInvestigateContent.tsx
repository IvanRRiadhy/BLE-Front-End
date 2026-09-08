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
  Button,
  IconButton,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  LinearProgress,
  useTheme,
  Divider,
  CircularProgress,
  TextField,
  MenuItem,
  InputAdornment,
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
  IconAlertTriangle,
  IconCreditCard,
  IconBroadcast,
  IconShieldCheck,
  IconShieldX,
  IconBell,
  IconPlus,
  IconMinus,
  IconSearch,
  IconDownload,
  IconInfoCircle,
  IconFilter,
  IconEye,
  IconCopy,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { PersonOverviewData } from 'src/hooks/useInvestigate';
import { PersonOption } from './NewInvestigateFilter';
import { BASE_URL } from 'src/utils/axios';
import BeaconRenderer from 'src/components/dashboards/monitoring/Renderer/BeaconRenderer';
import { useAllFloorplans } from 'src/hooks/useFloorplan';

const AREA_COLORS = ['#1877F2', '#36B37E', '#FFAB00', '#FF5630', '#6554C0', '#00B8D9'];

interface NewInvestigateContentProps {
  data?: PersonOverviewData | null;
  isLoading?: boolean;
  selectedPerson?: PersonOption | null;
  fromDate?: string;
  toDate?: string;
  isExporting?: boolean;
}

const NewInvestigateContent: React.FC<NewInvestigateContentProps> = ({
  data,
  isLoading,
  selectedPerson,
  fromDate,
  toDate,
  isExporting = false,
}) => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState<'timeline' | 'area' | 'compliance' | 'incidents' | 'cardHistory'>('timeline');
  const [zoomLevel, setZoomLevel] = useState(1);

  if (!selectedPerson && !data) {
    return (
      <Card
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '16px',
          p: 6,
          textAlign: 'center',
          bgcolor: 'background.paper',
        }}
      >
        <Stack alignItems="center" justifyContent="center" spacing={2}>
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              bgcolor: '#E8F2FE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#1877F2',
            }}
          >
            <IconUser size={32} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700} color="text.primary" gutterBottom>
              Select a Person to Investigate
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Choose a person from the filter above to view their detailed timeline, location, and access analysis.
            </Typography>
          </Box>
        </Stack>
      </Card>
    );
  }

  // Data Normalization
  const personName = data?.personInfo?.name || selectedPerson?.name || '-';
  const personType = data?.personInfo?.personType || selectedPerson?.type || 'Member';
  const identityId = data?.personInfo?.identityId || selectedPerson?.identityId || '-';
  const cardNumber = data?.currentState?.activeCardNumber || '-';
  const organization = data?.personInfo?.organization || '-';
  const department = data?.personInfo?.department || '-';
  const email = data?.personInfo?.email || '-';
  const phone = data?.personInfo?.phone || '-';

  const totalPresenceFormatted = data?.stayDurationAnalysis?.totalPresenceFormatted || '0 min';
  const totalAreasVisited = data?.accessCompliance?.totalAreasVisited ?? 0;
  const authorizedAreasVisited = data?.accessCompliance?.authorizedAreasVisited ?? 0;
  const unauthorizedAreasVisited = data?.accessCompliance?.unauthorizedAreasVisited ?? 0;
  const totalIncidents = data?.incidentSummary?.totalIncidents ?? 0;
  const activeIncidents = data?.incidentSummary?.activeIncidents ?? 0;
  const bleMac = data?.currentState?.activeBleMac || '-';
  const cardBattery = data?.currentState?.cardBattery ?? 0;

  const complianceScore = data?.accessCompliance?.complianceScore ?? 100;
  const isViolation = complianceScore < 100 || (data?.accessCompliance?.complianceStatus?.toLowerCase() === 'violation');

  const formattedFrom = fromDate ? dayjs(fromDate).format('MMM D, YYYY') : '-';
  const formattedTo = toDate ? dayjs(toDate).format('MMM D, YYYY') : '-';

  // Current State
  const presenceStatus = data?.currentState?.presenceStatus || 'Inactive';
  const currentBuilding = data?.currentState?.currentBuilding || '-';
  const currentFloor = data?.currentState?.currentFloor || '-';
  const currentArea = data?.currentState?.currentArea || '-';
  const lastSeenTimeStr = data?.currentState?.lastSeenTime
    ? dayjs(data.currentState.lastSeenTime).format('MMM D, YYYY HH:mm')
    : '-';

  // Floorplan image setup
  const floorplanImageUrl = useMemo(() => {
    if (data?.currentState?.floorplanImage) {
      const path = data.currentState.floorplanImage;
      if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) return path;
      const cleanBase = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;
      const cleanPath = path.startsWith('/') ? path : `/${path}`;
      return `${cleanBase}${cleanPath}`;
    }
    return null;
  }, [data]);

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
      setFloorplanImgObj(null);
    };
  }, [floorplanImageUrl]);

  const stageScale = Math.min(420 / (imgDim.width || 1), 220 / (imgDim.height || 1));
  const stageWidth = Math.max(280, imgDim.width * stageScale);
  const stageHeight = Math.max(180, imgDim.height * stageScale);

  // Presence Over Time ApexChart (Timeline / RangeBar Chart)
  const presenceTimelineSeries = useMemo(() => {
    if (!data?.chronologicalTimeline || data.chronologicalTimeline.length === 0) return [];
    
    const grouped: Record<string, { x: string; y: [number, number] }[]> = {};
    const timeline = data.chronologicalTimeline;

    for (let i = 0; i < timeline.length; i++) {
      const item = timeline[i];
      const nextItem = timeline[i + 1];
      const startTime = new Date(item.timestamp).getTime();
      const endTime = nextItem ? new Date(nextItem.timestamp).getTime() : new Date().getTime();
      const areaName = item.location || 'Unknown Area';

      if (!isNaN(startTime) && !isNaN(endTime) && endTime >= startTime) {
        if (!grouped[areaName]) {
          grouped[areaName] = [];
        }
        grouped[areaName].push({
          x: areaName,
          y: [startTime, endTime],
        });
      }
    }

    return Object.keys(grouped).map((areaName) => ({
      name: areaName,
      data: grouped[areaName],
    }));
  }, [data?.chronologicalTimeline]);

  const presenceTimelineOptions: ApexCharts.ApexOptions = {
    chart: {
      type: 'rangeBar',
      height: 220,
      toolbar: { show: false },
      fontFamily: "'Plus Jakarta Sans', sans-serif;",
    },
    plotOptions: {
      bar: {
        horizontal: true,
        barHeight: '40%',
        rangeBarGroupRows: true,
      },
    },
    colors: ['#1877F2', '#00C853', '#9C27B0'],
    fill: { type: 'solid' },
    xaxis: {
      type: 'datetime',
      labels: {
        datetimeFormatter: {
          year: 'yyyy',
          month: "MMM 'yy",
          day: 'MMM d',
          hour: 'HH:mm',
        },
      },
    },
    legend: { show: false },
    tooltip: {
      x: { format: 'MMM d, HH:mm' },
    },
    grid: {
      borderColor: theme.palette.divider,
      strokeDashArray: 3,
    },
  };

  // Radial Bar for Access Compliance
  const complianceChartOptions: ApexCharts.ApexOptions = {
    chart: {
      type: 'radialBar',
      fontFamily: "'Plus Jakarta Sans', sans-serif;",
    },
    plotOptions: {
      radialBar: {
        hollow: {
          size: '65%',
        },
        track: {
          background: '#F1F5F9',
        },
        dataLabels: {
          name: {
            show: false,
          },
          value: {
            offsetY: 8,
            color: isViolation ? '#D32F2F' : '#00C853',
            fontSize: '20px',
            fontWeight: '700',
            formatter: (val) => `${val}%`,
          },
        },
      },
    },
    colors: [isViolation ? '#FF4842' : '#00C853'],
    labels: ['Compliance Score'],
  };



  // Avatar Initials
  const initials = personName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  // Area Breakdown list
  const areaBreakdownList = data?.stayDurationAnalysis?.areaBreakdown || [];

  // Timeline List
  const chronologicalTimelineList = data?.chronologicalTimeline || [];

  // Breaches List
  const breachesList = data?.accessCompliance?.unauthorizedBreaches || [];

  // Alarms List
  const alarmsList = data?.incidentSummary?.alarms || [];

  // Card History List
  const cardHistoryList = data?.cardHistory || [];

  return (
    <Stack spacing={3}>
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
          {/* Avatar */}
          <Avatar
            src={data?.personInfo?.faceImage || selectedPerson?.avatarUrl || undefined}
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

          {/* Name & Identifiers */}
          <Box sx={{ minWidth: 200, flexShrink: 0 }}>
            <Stack direction="row" spacing={1.5} alignItems="center" mb={1}>
              <Typography variant="h5" fontWeight={700} color="text.primary">
                {personName}
              </Typography>
              <Chip
                label={<span style={{ color: personType === 'Member' ? '#1877F2' : '#B06000', fontWeight: 600, fontSize: '12px' }}>{personType}</span>}
                size="small"
                sx={{
                  bgcolor: personType === 'Member' ? '#E8F2FE' : '#FEF3D6',
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

          {/* Organization & Dept */}
          <Box sx={{ minWidth: 180 }}>
            <Stack spacing={1}>
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">
                  Organization
                </Typography>
                <Typography variant="body2" fontWeight={600} color="text.primary">
                  {organization}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">
                  Department
                </Typography>
                <Typography variant="body2" fontWeight={600} color="text.primary">
                  {department}
                </Typography>
              </Box>
            </Stack>
          </Box>

          <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'block' } }} />

          {/* Contact Details */}
          <Box sx={{ minWidth: 220 }}>
            <Stack spacing={1}>
              <Stack direction="row" spacing={1} alignItems="center">
                <IconMail size={16} color={theme.palette.text.secondary} />
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Email
                  </Typography>
                  <Typography variant="body2" fontWeight={500} color="text.primary">
                    {email}
                  </Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center">
                <IconPhone size={16} color={theme.palette.text.secondary} />
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Phone
                  </Typography>
                  <Typography variant="body2" fontWeight={500} color="text.primary">
                    {phone}
                  </Typography>
                </Box>
              </Stack>
            </Stack>
          </Box>

          <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'block' } }} />

          {/* Status (Current) */}
          <Box sx={{ minWidth: 140 }}>
            <Typography variant="caption" color="text.secondary" display="block">
              Status (Current)
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" my={0.5}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#00C853' }} />
              <Typography variant="subtitle1" fontWeight={700} color="#00C853">
                {presenceStatus}
              </Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary">
              Since {lastSeenTimeStr.split(' ').pop()}
            </Typography>
          </Box>

          {/* Access Compliance Banner Card */}
          <Box
            sx={{
              ml: 'auto',
              p: 2,
              borderRadius: '12px',
              bgcolor: isViolation ? '#FDF2F2' : '#E6F4EA',
              border: '1px solid',
              borderColor: isViolation ? '#FFCDD2' : '#C8E6C9',
              minWidth: 180,
            }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  bgcolor: isViolation ? '#FFEBEE' : '#E8F5E9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isViolation ? <IconShieldX size={20} color="#D32F2F" /> : <IconShieldCheck size={20} color="#00C853" />}
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">
                  Access Compliance
                </Typography>
                <Typography variant="subtitle2" fontWeight={700} color={isViolation ? '#D32F2F' : '#00C853'}>
                  {isViolation ? 'Violation' : 'Compliant'}
                </Typography>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  Score {complianceScore}%
                </Typography>
              </Box>
            </Stack>
          </Box>
        </Stack>
      </Card>

      {/* 2. Top Summary KPI Cards (5 Cards) */}
      <Grid container spacing={2}>
        {/* Total Presence */}
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
                  Total Presence
                </Typography>
                <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                  {totalPresenceFormatted}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                  {formattedFrom} – {formattedTo}
                </Typography>
              </Box>
            </Stack>
          </Card>
        </Grid>

        {/* Areas Visited */}
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
                <IconMapPin size={22} color="#1877F2" />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">
                  Areas Visited
                </Typography>
                <Typography variant="h4" fontWeight={700} sx={{ lineHeight: 1.1 }}>
                  {totalAreasVisited}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                  {authorizedAreasVisited} allowed / {unauthorizedAreasVisited} unauthorized
                </Typography>
              </Box>
            </Stack>
          </Card>
        </Grid>

        {/* Total Incidents */}
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '16px', p: 2 }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: '12px',
                  bgcolor: '#FFEBEE',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <IconAlertTriangle size={22} color="#D32F2F" />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Total Incidents
                </Typography>
                <Typography variant="h4" fontWeight={700} sx={{ lineHeight: 1.1 }}>
                  {totalIncidents}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                  {activeIncidents} active incident
                </Typography>
              </Box>
            </Stack>
          </Card>
        </Grid>

        {/* Active Card */}
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
                <IconCreditCard size={22} color="#1877F2" />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Active Card
                </Typography>
                <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.2 }} noWrap>
                  {cardNumber}
                </Typography>
                <Stack direction="row" spacing={0.5} alignItems="center" mt={0.2}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                    Battery {cardBattery}%
                  </Typography>
                  <Box sx={{ width: 20, height: 8, bgcolor: '#00C853', borderRadius: '2px' }} />
                </Stack>
              </Box>
            </Stack>
          </Card>
        </Grid>

        {/* Active BLE MAC */}
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
                <IconBroadcast size={22} color="#1877F2" />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Active BLE MAC
                </Typography>
                <Typography variant="subtitle2" fontWeight={700} sx={{ lineHeight: 1.2 }} noWrap>
                  {bleMac}
                </Typography>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#00C853' }} />
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                    Good Signal
                  </Typography>
                </Stack>
              </Box>
            </Stack>
          </Card>
        </Grid>
      </Grid>

      {/* 3. Sub Navigation Bar (Tabs) */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Stack direction="row" spacing={1}>
          {[
            { id: 'timeline', label: 'Timeline', icon: IconClock },
            { id: 'area', label: 'Area Analysis', icon: IconMapPin },
            { id: 'compliance', label: 'Access Compliance', icon: IconShieldCheck },
            { id: 'incidents', label: 'Incidents & Alarms', icon: IconBell },
            { id: 'cardHistory', label: 'Card History', icon: IconCreditCard },
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
      </Box>

      {/* 4. Tab Content */}
      {activeTab === 'timeline' && (
        <>
          {/* Presence Over Time & Current Location Cards */}
          <Grid container spacing={2.5}>
            {/* Presence Over Time */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '16px', p: 2.5, height: '100%' }}>
                <Box mb={1}>
                  <Typography variant="h6" fontWeight={700} color="text.primary">
                    Presence Over Time
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Timeline of this person's presence in the selected period
                  </Typography>
                </Box>

                <Box sx={{ height: 210, width: '100%' }}>
                  <Chart options={presenceTimelineOptions} series={presenceTimelineSeries} type="rangeBar" height={200} width="100%" />
                </Box>

                {/* Custom Legend */}
                {presenceTimelineSeries.length > 0 && (
                  <Stack direction="row" spacing={2} justifyContent="flex-start" mt={1} flexWrap="wrap">
                    {presenceTimelineSeries.map((s, idx) => (
                      <Stack key={s.name || idx} direction="row" spacing={1} alignItems="center">
                        <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: AREA_COLORS[idx % AREA_COLORS.length] }} />
                        <Typography variant="caption" fontWeight={600}>
                          {s.name}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                )}
              </Card>
            </Grid>

            {/* Current Location */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '16px', p: 2.5, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                  <Typography variant="h6" fontWeight={700} color="text.primary">
                    Current Location
                  </Typography>
                  <Chip
                    label={<span style={{ color: '#00C853', fontWeight: 600, fontSize: '12px' }}>Active</span>}
                    size="small"
                    icon={<Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#00C853', ml: 1 }} />}
                    sx={{ bgcolor: '#E6F4EA', borderRadius: '12px' }}
                  />
                </Stack>

                <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                  <IconBuilding size={20} color={theme.palette.text.secondary} />
                  <Box>
                    <Typography variant="subtitle2" fontWeight={700} color="text.primary">
                      {currentBuilding} – {currentFloor}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {currentArea}
                    </Typography>
                  </Box>
                </Stack>

                {/* Floorplan Preview Canvas */}
                <Box
                  sx={{
                    flex: 1,
                    minHeight: 220,
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
                            id="current-investigate-beacon"
                            x={stageWidth * 0.45}
                            y={stageHeight * 0.45}
                            beaconSize={1.1}
                            clickable={false}
                            label={personName}
                            isSecurity={personType === 'Security'}
                            isMember={personType === 'Member'}
                            isVisitor={personType === 'Visitor'}
                            faceImage={selectedPerson?.avatarUrl}
                            area={currentArea}
                            floorplan={currentFloor}
                            time={lastSeenTimeStr}
                          />
                        </Layer>
                      </Stage>
                    </Box>
                  ) : (
                    <Stack alignItems="center" spacing={1} py={4}>
                      <CircularProgress size={24} />
                      <Typography variant="caption" color="text.secondary">
                        Loading floorplan image...
                      </Typography>
                    </Stack>
                  )}

                  {/* Map Zoom Controls */}
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

                  {/* Floor Chip */}
                  <Chip
                    label={currentFloor}
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

          {/* Bottom Section Grid */}
          <Grid container spacing={2.5}>
            {/* Left Column: Chronological Timeline */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card
                elevation={0}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: '16px',
                  p: 2.5,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <Box mb={2}>
                  <Typography variant="h6" fontWeight={700} color="text.primary">
                    Chronological Timeline
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Complete history of movement and security events
                  </Typography>
                </Box>

                <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', pr: 1 }}>
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
                    {chronologicalTimelineList.map((item, idx) => {
                      const isAlarm = item.badge === 'Danger' || item.eventType === 'ALARM';
                      const isPrimary = item.badge === 'Primary' || item.eventType === 'CURRENT_POSITION';
                      const nodeColor = isAlarm ? '#D32F2F' : isPrimary ? '#1877F2' : '#00C853';
                      const badgeBg = isAlarm ? '#FFEBEE' : isPrimary ? '#E8F2FE' : '#E6F4EA';
                      const badgeTextColor = isAlarm ? '#D32F2F' : isPrimary ? '#1877F2' : '#00C853';
                      const timeOnly = item.timestamp ? dayjs(item.timestamp).format('HH:mm') : '18:28';

                      return (
                        <Box key={idx} sx={{ position: 'relative' }}>
                          {/* Node Dot */}
                          <Box
                            sx={{
                              position: 'absolute',
                              left: -24,
                              top: 2,
                              width: 14,
                              height: 14,
                              borderRadius: '50%',
                              bgcolor: nodeColor,
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

                            <Grid size={7}>
                              <Typography variant="body2" fontWeight={700} color="text.primary">
                                {item.title}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" display="block">
                                {item.description}
                              </Typography>
                              <Typography variant="caption" fontWeight={600} color="text.primary">
                                {item.location}
                              </Typography>
                            </Grid>

                            <Grid size={2.5} sx={{ textAlign: 'right' }}>
                              <Chip
                                label={item.badge}
                                size="small"
                                sx={{
                                  height: 20,
                                  bgcolor: badgeBg,
                                  color: badgeTextColor,
                                  fontWeight: 700,
                                  fontSize: '10px',
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

            {/* Right Column: Area Analysis, Access Compliance, Unauthorized Breaches */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Stack spacing={2.5}>
                {/* Card 1: Area Stay Analysis */}
                <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '16px', p: 2.5 }}>
                  <Box mb={2}>
                    <Typography variant="h6" fontWeight={700} color="text.primary">
                      Area Stay Analysis
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Total time spent in each area during the selected period
                    </Typography>
                  </Box>

                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Area</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Building / Floor</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Duration</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Percentage</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {areaBreakdownList.map((row, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{idx + 1}</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>{row.areaName}</TableCell>
                            <TableCell sx={{ color: 'text.secondary', fontSize: '12px' }}>
                              {row.buildingName} {row.floorName}
                            </TableCell>
                            <TableCell>{row.durationFormatted}</TableCell>
                            <TableCell sx={{ width: 120 }}>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Typography variant="caption" fontWeight={600}>
                                  {row.percentage}%
                                </Typography>
                                <Box sx={{ flex: 1 }}>
                                  <LinearProgress
                                    variant="determinate"
                                    value={row.percentage}
                                    sx={{ height: 6, borderRadius: 3, bgcolor: '#F1F5F9' }}
                                  />
                                </Box>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Card>

                {/* Card 2: Access Compliance */}
                <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '16px', p: 2.5 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="h6" fontWeight={700} color="text.primary">
                      Access Compliance
                    </Typography>
                    <Chip
                      label={isViolation ? 'Violation' : 'Compliant'}
                      size="small"
                      icon={isViolation ? <IconShieldX size={14} color="#D32F2F" /> : <IconShieldCheck size={14} color="#00C853" />}
                      sx={{
                        bgcolor: isViolation ? '#FFEBEE' : '#E8F5E9',
                        color: isViolation ? '#D32F2F' : '#00C853',
                        fontWeight: 700,
                      }}
                    />
                  </Stack>

                  <Stack direction="row" spacing={3} alignItems="center">
                    <Box sx={{ width: 140, height: 140 }}>
                      <Chart options={complianceChartOptions} series={[complianceScore]} type="radialBar" height={150} />
                    </Box>

                    <Stack spacing={1.5} sx={{ flex: 1 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#1877F2' }} />
                          <Typography variant="body2" color="text.secondary">
                            Total Areas Visited
                          </Typography>
                        </Stack>
                        <Typography variant="body2" fontWeight={700}>
                          {totalAreasVisited}
                        </Typography>
                      </Stack>

                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#00C853' }} />
                          <Typography variant="body2" color="text.secondary">
                            Authorized Areas
                          </Typography>
                        </Stack>
                        <Typography variant="body2" fontWeight={700}>
                          {authorizedAreasVisited}
                        </Typography>
                      </Stack>

                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#D32F2F' }} />
                          <Typography variant="body2" color="text.secondary">
                            Unauthorized Areas
                          </Typography>
                        </Stack>
                        <Typography variant="body2" fontWeight={700}>
                          {unauthorizedAreasVisited}
                        </Typography>
                      </Stack>
                    </Stack>
                  </Stack>
                </Card>

                {/* Card 3: Unauthorized Access Breaches */}
                <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '16px', p: 2.5 }}>
                  <Box mb={2}>
                    <Typography variant="h6" fontWeight={700} color="text.primary">
                      Unauthorized Access Breaches
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      List of areas accessed without proper authorization
                    </Typography>
                  </Box>

                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Area</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Building / Floor</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Entered At</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Duration</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Alarm</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {breachesList.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell>{row.id}</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>{row.area}</TableCell>
                            <TableCell sx={{ color: 'text.secondary', fontSize: '12px' }}>{row.buildingFloor}</TableCell>
                            <TableCell sx={{ fontSize: '12px' }}>{row.enteredAt}</TableCell>
                            <TableCell>{row.duration}</TableCell>
                            <TableCell>
                              <IconButton size="small" color="error">
                                <IconBell size={16} />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Card>
              </Stack>
            </Grid>
          </Grid>
        </>
      )}

      {/* Area Analysis Tab View */}
      {activeTab === 'area' && (
        <Stack spacing={3}>
          {/* Top Row: Time Spent by Area & Area Visits */}
          <Grid container spacing={2.5}>
            {/* Time Spent by Area */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '16px', p: 2.5, height: '100%' }}>
                <Box mb={2}>
                  <Typography variant="h6" fontWeight={700} color="text.primary">
                    Time Spent by Area
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Distribution of this person's presence duration in each area
                  </Typography>
                </Box>
                <Stack spacing={2.5} mt={3}>
                  {areaBreakdownList.map((row, idx) => (
                    <Box key={idx}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                        <Typography variant="body2" fontWeight={600} sx={{ minWidth: 160 }}>
                          {row.areaName}
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="body2" fontWeight={700}>
                            {row.durationFormatted}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ width: 45, textAlign: 'right' }}>
                            {row.percentage}%
                          </Typography>
                        </Stack>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={row.percentage}
                        sx={{
                          height: 10,
                          borderRadius: 5,
                          bgcolor: '#F1F5F9',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: idx === 0 ? '#1877F2' : idx === 1 ? '#00C853' : '#9C27B0',
                            borderRadius: 5,
                          },
                        }}
                      />
                    </Box>
                  ))}
                </Stack>
              </Card>
            </Grid>

            {/* Area Visits */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '16px', p: 2.5, height: '100%' }}>
                <Box mb={2}>
                  <Typography variant="h6" fontWeight={700} color="text.primary">
                    Area Visits
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Number of visits to each area
                  </Typography>
                </Box>
                <Stack spacing={2.5} mt={3}>
                  {[
                    { name: 'Ruangan Programmer', count: 7, max: 10, color: '#64B5F6' },
                    { name: 'Ruangan Programmer B', count: 5, max: 10, color: '#64B5F6' },
                    { name: 'AREA - Meeting Room', count: 1, max: 10, color: '#64B5F6' },
                  ].map((item, idx) => (
                    <Box key={idx}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                        <Typography variant="body2" fontWeight={600} sx={{ minWidth: 160 }}>
                          {item.name}
                        </Typography>
                        <Typography variant="body2" fontWeight={700}>
                          {item.count}
                        </Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={(item.count / item.max) * 100}
                        sx={{
                          height: 10,
                          borderRadius: 5,
                          bgcolor: '#F1F5F9',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: item.color,
                            borderRadius: 5,
                          },
                        }}
                      />
                    </Box>
                  ))}
                </Stack>
              </Card>
            </Grid>
          </Grid>

          {/* Middle Row: Area Presence Over Time & Floorplan View */}
          <Grid container spacing={2.5}>
            {/* Area Presence Over Time */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '16px', p: 2.5, height: '100%' }}>
                <Box mb={1}>
                  <Typography variant="h6" fontWeight={700} color="text.primary">
                    Area Presence Over Time
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Shows where the person was located across the selected period
                  </Typography>
                </Box>

                <Box sx={{ height: 220, width: '100%' }}>
                  <Chart options={presenceTimelineOptions} series={presenceTimelineSeries} type="rangeBar" height={210} width="100%" />
                </Box>

                {/* Legend */}
                <Stack direction="row" spacing={2} justifyContent="flex-start" mt={1}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#1877F2' }} />
                    <Typography variant="caption" fontWeight={600}>
                      Ruangan Programmer
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#4FC3F7' }} />
                    <Typography variant="caption" fontWeight={600}>
                      Ruangan Programmer B
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#9C27B0' }} />
                    <Typography variant="caption" fontWeight={600}>
                      AREA - Meeting Room
                    </Typography>
                  </Stack>
                </Stack>
              </Card>
            </Grid>

            {/* Floorplan View */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '16px', p: 2.5, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                  <Box>
                    <Typography variant="h6" fontWeight={700} color="text.primary">
                      Floorplan View
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Last known location and areas visited
                    </Typography>
                  </Box>
                  <TextField
                    select
                    size="small"
                    defaultValue="gedung-buni-lantai-2"
                    sx={{ width: 200, '& .MuiOutlinedInput-root': { borderRadius: '8px', fontSize: '13px' } }}
                  >
                    <MenuItem value="gedung-buni-lantai-2">Gedung Buni - Lantai 2 Buni</MenuItem>
                    <MenuItem value="gedung-buni-lantai-1">Gedung Buni - Lantai 1</MenuItem>
                  </TextField>
                </Stack>

                {/* Floorplan Map Canvas */}
                <Box
                  sx={{
                    flex: 1,
                    minHeight: 220,
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
                            id="area-investigate-beacon"
                            x={stageWidth * 0.45}
                            y={stageHeight * 0.45}
                            beaconSize={1.1}
                            clickable={false}
                            label={personName}
                            isSecurity={personType === 'Security'}
                            isMember={personType === 'Member'}
                            isVisitor={personType === 'Visitor'}
                            faceImage={selectedPerson?.avatarUrl}
                            area={currentArea}
                            floorplan={currentFloor}
                            time={lastSeenTimeStr}
                          />
                        </Layer>
                      </Stage>
                    </Box>
                  ) : (
                    <Stack alignItems="center" spacing={1} py={4}>
                      <CircularProgress size={24} />
                      <Typography variant="caption" color="text.secondary">
                        Loading floorplan image...
                      </Typography>
                    </Stack>
                  )}

                  {/* Zoom Controls */}
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
                </Box>

                {/* Map Footer Legend */}
                <Stack direction="row" spacing={2} justifyContent="flex-start" mt={1.5}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#1877F2' }} />
                    <Typography variant="caption" fontWeight={600}>
                      Current Location
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#4FC3F7' }} />
                    <Typography variant="caption" fontWeight={600}>
                      Visited Area
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#9C27B0' }} />
                    <Typography variant="caption" fontWeight={600}>
                      Other Visited Area
                    </Typography>
                  </Stack>
                </Stack>
              </Card>
            </Grid>
          </Grid>

          {/* Bottom Table: Area Detail */}
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '16px', p: 2.5 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} mb={2} spacing={2}>
              <Box>
                <Typography variant="h6" fontWeight={700} color="text.primary">
                  Area Detail
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Detailed breakdown of time spent in each area
                </Typography>
              </Box>

              <Stack direction="row" spacing={1.5} alignItems="center">
                <TextField
                  placeholder="Search area..."
                  size="small"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <IconSearch size={16} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ width: 220, '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                />
                <Button variant="outlined" color="inherit" size="small" startIcon={<IconDownload size={16} />} sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}>
                  Export
                </Button>
              </Stack>
            </Stack>

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Area</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Building / Floor</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Visits</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Total Duration</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Percentage</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Restricted Area</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Allowed by Access</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {areaBreakdownList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                        No area detail records available
                      </TableCell>
                    </TableRow>
                  ) : (
                    areaBreakdownList.map((row, idx) => (
                      <TableRow key={row.areaId || idx}>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{row.areaName || '-'}</TableCell>
                        <TableCell sx={{ color: 'text.secondary', fontSize: '12px' }}>
                          {row.buildingName || '-'} {row.floorName ? `(${row.floorName})` : ''}
                        </TableCell>
                        <TableCell>{(row as any).visits ?? 1}</TableCell>
                        <TableCell>{row.durationFormatted || (row.durationMinutes ? `${row.durationMinutes} min` : '-')}</TableCell>
                        <TableCell sx={{ width: 140 }}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="caption" fontWeight={600} sx={{ width: 40 }}>
                              {row.percentage}%
                            </Typography>
                            <Box sx={{ flex: 1 }}>
                              <LinearProgress
                                variant="determinate"
                                value={row.percentage}
                                sx={{ height: 6, borderRadius: 3, bgcolor: '#F1F5F9' }}
                              />
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell>{row.isRestrictedArea ? 'Yes' : 'No'}</TableCell>
                        <TableCell>
                          {row.isAllowedByAccess ? (
                            <Chip label="Yes" size="small" icon={<IconShieldCheck size={14} color="#00C853" />} sx={{ bgcolor: '#E8F5E9', color: '#00C853', fontWeight: 700 }} />
                          ) : (
                            <Chip label="No" size="small" icon={<IconShieldX size={14} color="#D32F2F" />} sx={{ bgcolor: '#FFEBEE', color: '#D32F2F', fontWeight: 700 }} />
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Pagination Footer */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" mt={2}>
              <Typography variant="caption" color="text.secondary">
                Showing 1 to 3 of 3 records
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button size="small" variant="outlined" disabled sx={{ minWidth: 32, p: 0.5, borderRadius: '6px' }}>
                  &lt;
                </Button>
                <Button size="small" variant="contained" sx={{ minWidth: 32, p: 0.5, borderRadius: '6px', bgcolor: '#1877F2' }}>
                  1
                </Button>
                <Button size="small" variant="outlined" disabled sx={{ minWidth: 32, p: 0.5, borderRadius: '6px' }}>
                  &gt;
                </Button>
              </Stack>
            </Stack>
          </Card>
        </Stack>
      )}

      {/* Access Compliance Tab View */}
      {activeTab === 'compliance' && (
        <Stack spacing={3}>
          {/* Top Row: Access Compliance Overview & Access Rights */}
          <Grid container spacing={2.5}>
            {/* Access Compliance Overview */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '16px', p: 2.5, height: '100%' }}>
                <Box mb={2}>
                  <Typography variant="h6" fontWeight={700} color="text.primary">
                    Access Compliance Overview
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Analysis of this person's access rights and area visits in the selected period
                  </Typography>
                </Box>

                <Stack direction="row" spacing={3} alignItems="center" mt={2}>
                  <Box sx={{ width: 150, height: 150, flexShrink: 0 }}>
                    <Chart options={complianceChartOptions} series={[complianceScore]} type="radialBar" height={160} />
                  </Box>

                  <Stack spacing={2} sx={{ flex: 1 }}>
                    <Box sx={{ bgcolor: isViolation ? '#FFF2F2' : '#F0FDF4', border: '1px solid', borderColor: isViolation ? '#FFCDD2' : '#BBF7D0', borderRadius: '12px', p: 1.5 }}>
                      <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                        {isViolation ? <IconShieldX size={18} color="#D32F2F" /> : <IconShieldCheck size={18} color="#00C853" />}
                        <Typography variant="subtitle2" fontWeight={700} color={isViolation ? '#D32F2F' : '#00C853'}>
                          {isViolation ? 'Violation' : 'Compliant'}
                        </Typography>
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        {isViolation ? 'Person has accessed unauthorized area(s)' : 'All area visits are properly authorized'}
                      </Typography>
                    </Box>

                    <Stack spacing={1}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" spacing={1} alignItems="center">
                          <IconCreditCard size={16} color={theme.palette.text.secondary} />
                          <Typography variant="body2" color="text.secondary">
                            Total Areas Visited
                          </Typography>
                        </Stack>
                        <Typography variant="body2" fontWeight={700}>
                          {totalAreasVisited}
                        </Typography>
                      </Stack>

                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" spacing={1} alignItems="center">
                          <IconShieldCheck size={16} color="#00C853" />
                          <Typography variant="body2" color="text.secondary">
                            Authorized Areas Visited
                          </Typography>
                        </Stack>
                        <Typography variant="body2" fontWeight={700}>
                          {authorizedAreasVisited}
                        </Typography>
                      </Stack>

                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" spacing={1} alignItems="center">
                          <IconAlertTriangle size={16} color="#D32F2F" />
                          <Typography variant="body2" color="text.secondary">
                            Unauthorized Areas Visited
                          </Typography>
                        </Stack>
                        <Typography variant="body2" fontWeight={700}>
                          {unauthorizedAreasVisited}
                        </Typography>
                      </Stack>
                    </Stack>
                  </Stack>
                </Stack>
              </Card>
            </Grid>

            {/* Access Rights */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '16px', p: 2.5, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Box mb={2}>
                  <Typography variant="h6" fontWeight={700} color="text.primary">
                    Access Rights
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Assigned access groups and permissions
                  </Typography>
                </Box>

                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: '#F8FAFC', borderRadius: '12px', p: 3, my: 1, border: '1px solid', borderColor: 'divider' }}>
                  <Box sx={{ width: 44, height: 44, borderRadius: '50%', bgcolor: '#E8F2FE', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1.5, color: '#1877F2' }}>
                    <IconShieldCheck size={24} />
                  </Box>
                  <Typography variant="subtitle2" fontWeight={700} color="text.primary" textAlign="center">
                    No Access Group Assigned
                  </Typography>
                  <Typography variant="caption" color="text.secondary" textAlign="center" sx={{ maxWidth: 300, mt: 0.5 }}>
                    This person does not have any access group assigned. All area access will be validated against default rules.
                  </Typography>
                </Box>

                <Box sx={{ bgcolor: '#EBF5FF', border: '1px solid', borderColor: '#BEDBFF', borderRadius: '10px', p: 1.5, mt: 'auto' }}>
                  <Stack direction="row" spacing={1.5} alignItems="flex-start">
                    <IconInfoCircle size={20} color="#1877F2" style={{ flexShrink: 0, marginTop: 2 }} />
                    <Box>
                      <Typography variant="caption" fontWeight={700} color="#1877F2" display="block">
                        Note
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        This person accessed 1 area that is not in the allowed list.
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
              </Card>
            </Grid>
          </Grid>

          {/* Middle Row: Area Access Comparison, Access Status by Area, Area Type */}
          <Grid container spacing={2.5}>
            {/* Area Access Comparison */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '16px', p: 2.5, height: '100%' }}>
                <Box mb={2}>
                  <Typography variant="h6" fontWeight={700} color="text.primary">
                    Area Access Comparison
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Breakdown of visited areas based on access permission
                  </Typography>
                </Box>

                <Stack spacing={2} mt={3}>
                  <Box>
                    <Stack direction="row" justifyContent="space-between" mb={0.5}>
                      <Typography variant="body2" color="text.secondary">Authorized Areas</Typography>
                      <Typography variant="body2" fontWeight={700}>2</Typography>
                    </Stack>
                    <LinearProgress variant="determinate" value={66.7} sx={{ height: 14, borderRadius: 2, bgcolor: '#F1F5F9', '& .MuiLinearProgress-bar': { bgcolor: '#00C853' } }} />
                  </Box>

                  <Box>
                    <Stack direction="row" justifyContent="space-between" mb={0.5}>
                      <Typography variant="body2" color="text.secondary">Unauthorized Areas</Typography>
                      <Typography variant="body2" fontWeight={700}>1</Typography>
                    </Stack>
                    <LinearProgress variant="determinate" value={33.3} sx={{ height: 14, borderRadius: 2, bgcolor: '#F1F5F9', '& .MuiLinearProgress-bar': { bgcolor: '#FF5630' } }} />
                  </Box>

                  <Box>
                    <Stack direction="row" justifyContent="space-between" mb={0.5}>
                      <Typography variant="body2" color="text.secondary">Restricted Areas</Typography>
                      <Typography variant="body2" fontWeight={700}>0</Typography>
                    </Stack>
                    <LinearProgress variant="determinate" value={0} sx={{ height: 14, borderRadius: 2, bgcolor: '#F1F5F9' }} />
                  </Box>
                </Stack>
                <Typography variant="caption" color="text.secondary" textAlign="center" display="block" mt={4}>
                  Number of Areas
                </Typography>
              </Card>
            </Grid>

            {/* Access Status by Area */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '16px', p: 2.5, height: '100%' }}>
                <Box mb={1}>
                  <Typography variant="h6" fontWeight={700} color="text.primary">
                    Access Status by Area
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Access permission status for each visited area
                  </Typography>
                </Box>

                <Box sx={{ width: '100%', height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Chart
                    options={{
                      chart: { type: 'donut', fontFamily: "'Plus Jakarta Sans', sans-serif;" },
                      colors: ['#00C853', '#FF5630'],
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
                                label: 'Areas Visited',
                                fontSize: '12px',
                                color: '#64748B',
                                formatter: () => '3',
                              },
                            },
                          },
                        },
                      },
                    }}
                    series={[2, 1]}
                    type="donut"
                    width="100%"
                    height={180}
                  />
                </Box>

                <Stack spacing={1} mt={1}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#00C853' }} />
                      <Typography variant="caption" color="text.secondary">Authorized</Typography>
                    </Stack>
                    <Typography variant="caption" fontWeight={700}>2 (66.7%)</Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#FF5630' }} />
                      <Typography variant="caption" color="text.secondary">Unauthorized</Typography>
                    </Stack>
                    <Typography variant="caption" fontWeight={700}>1 (33.3%)</Typography>
                  </Stack>
                </Stack>
              </Card>
            </Grid>

            {/* Area Type */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '16px', p: 2.5, height: '100%' }}>
                <Box mb={1}>
                  <Typography variant="h6" fontWeight={700} color="text.primary">
                    Area Type
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Classification of visited areas
                  </Typography>
                </Box>

                <Box sx={{ width: '100%', height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Chart
                    options={{
                      chart: { type: 'donut', fontFamily: "'Plus Jakarta Sans', sans-serif;" },
                      colors: ['#CBD5E1', '#FF5630'],
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
                                label: 'Areas Visited',
                                fontSize: '12px',
                                color: '#64748B',
                                formatter: () => '3',
                              },
                            },
                          },
                        },
                      },
                    }}
                    series={[3, 0]}
                    type="donut"
                    width="100%"
                    height={180}
                  />
                </Box>

                <Stack spacing={1} mt={1}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#CBD5E1' }} />
                      <Typography variant="caption" color="text.secondary">Normal Area</Typography>
                    </Stack>
                    <Typography variant="caption" fontWeight={700}>3 (100%)</Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#FF5630' }} />
                      <Typography variant="caption" color="text.secondary">Restricted Area</Typography>
                    </Stack>
                    <Typography variant="caption" fontWeight={700}>0 (0%)</Typography>
                  </Stack>
                </Stack>
              </Card>
            </Grid>
          </Grid>

          {/* Bottom Table: Unauthorized Access Breaches */}
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '16px', p: 2.5 }}>
            <Box mb={2}>
              <Typography variant="h6" fontWeight={700} color="text.primary">
                Unauthorized Access Breaches
              </Typography>
              <Typography variant="caption" color="text.secondary">
                List of areas accessed without proper authorization
              </Typography>
            </Box>

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Area</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Building / Floor</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Entered At</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Duration</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Alarm</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Reason</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {breachesList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                        No unauthorized access breaches recorded
                      </TableCell>
                    </TableRow>
                  ) : (
                    breachesList.map((row: any, idx: number) => (
                      <TableRow key={row.areaId || idx}>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{row.areaName || row.area || '-'}</TableCell>
                        <TableCell sx={{ color: 'text.secondary', fontSize: '12px' }}>
                          {row.buildingName || '-'} {row.floorName ? `(${row.floorName})` : ''}
                        </TableCell>
                        <TableCell sx={{ fontSize: '12px' }}>
                          {row.enteredAt ? dayjs(row.enteredAt).format('MMM D, YYYY HH:mm') : '-'}
                        </TableCell>
                        <TableCell>
                          {row.durationFormatted || (row.durationMinutes ? `${row.durationMinutes} min` : '-')}
                        </TableCell>
                        <TableCell>
                          {row.alarmTriggered ? (
                            <IconButton size="small" color="error" sx={{ bgcolor: '#FFEBEE', p: 0.5 }}>
                              <IconAlertTriangle size={14} />
                            </IconButton>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell sx={{ fontSize: '12px', color: 'text.secondary' }}>{row.alarmCategory || '-'}</TableCell>
                        <TableCell sx={{ fontSize: '12px', color: 'text.secondary' }}>{row.reason || '-'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Pagination Footer */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" mt={2}>
              <Typography variant="caption" color="text.secondary">
                Showing 1 to 4 of 4 records
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button size="small" variant="outlined" disabled sx={{ minWidth: 32, p: 0.5, borderRadius: '6px' }}>
                  &lt;
                </Button>
                <Button size="small" variant="contained" sx={{ minWidth: 32, p: 0.5, borderRadius: '6px', bgcolor: '#1877F2' }}>
                  1
                </Button>
                <Button size="small" variant="outlined" disabled sx={{ minWidth: 32, p: 0.5, borderRadius: '6px' }}>
                  &gt;
                </Button>
              </Stack>
            </Stack>
          </Card>
        </Stack>
      )}

      {/* Incidents & Alarms Tab View */}
      {activeTab === 'incidents' && (
        <Stack spacing={3}>
          {/* Section 1: Incident Overview */}
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '16px', p: 2.5 }}>
            <Box mb={2.5}>
              <Typography variant="h6" fontWeight={700} color="text.primary">
                Incident Overview
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Summary of security incidents and alarms related to this person in the selected period
              </Typography>
            </Box>

            {/* 4 Stat Cards */}
            <Grid container spacing={2} mb={3}>
              {/* Total Incidents */}
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '14px', p: 2, bgcolor: '#FFF5F5' }}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: '#FFEBEE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D32F2F', flexShrink: 0 }}>
                      <IconAlertTriangle size={22} />
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Total Incidents
                      </Typography>
                      <Typography variant="h6" fontWeight={700} color="text.primary" sx={{ lineHeight: 1.2 }}>
                        1
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                        Security incidents triggered
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
              </Grid>

              {/* Active Incidents */}
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '14px', p: 2, bgcolor: '#FFF5F5' }}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: '#FFEBEE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D32F2F', flexShrink: 0 }}>
                      <IconAlertTriangle size={22} />
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Active Incidents
                      </Typography>
                      <Typography variant="h6" fontWeight={700} color="text.primary" sx={{ lineHeight: 1.2 }}>
                        1
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                        Requires attention
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
              </Grid>

              {/* Acknowledged */}
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '14px', p: 2, bgcolor: '#F4F8FF' }}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: '#E8F2FE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1877F2', flexShrink: 0 }}>
                      <IconBell size={22} />
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Acknowledged
                      </Typography>
                      <Typography variant="h6" fontWeight={700} color="text.primary" sx={{ lineHeight: 1.2 }}>
                        1
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                        Has been acknowledged
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
              </Grid>

              {/* Resolved */}
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '14px', p: 2, bgcolor: '#F0FDF4' }}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: '#E8F5E9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00C853', flexShrink: 0 }}>
                      <IconShieldCheck size={22} />
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Resolved
                      </Typography>
                      <Typography variant="h6" fontWeight={700} color="text.primary" sx={{ lineHeight: 1.2 }}>
                        0
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                        No resolved incidents
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
              </Grid>
            </Grid>

            {/* 2 Charts Side-by-Side */}
            <Grid container spacing={2.5}>
              {/* Incidents by Category */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '14px', p: 2.5, height: '100%' }}>
                  <Box mb={1}>
                    <Typography variant="subtitle1" fontWeight={700} color="text.primary">
                      Incidents by Category
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Distribution of incidents based on alarm category
                    </Typography>
                  </Box>

                  <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" mt={2}>
                    <Box sx={{ width: 180, height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Chart
                        options={{
                          chart: { type: 'donut', fontFamily: "'Plus Jakarta Sans', sans-serif;" },
                          colors: ['#D32F2F'],
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
                                    label: 'Incident',
                                    fontSize: '12px',
                                    color: '#64748B',
                                    formatter: () => '1',
                                  },
                                },
                              },
                            },
                          },
                        }}
                        series={[1]}
                        type="donut"
                        width="100%"
                        height={180}
                      />
                    </Box>

                    <Stack spacing={1} sx={{ flex: 1 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#D32F2F' }} />
                          <Typography variant="caption" color="text.secondary">Card Access</Typography>
                        </Stack>
                        <Typography variant="caption" fontWeight={700}>1 (100%)</Typography>
                      </Stack>
                    </Stack>
                  </Stack>
                </Card>
              </Grid>

              {/* Incident Status */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '14px', p: 2.5, height: '100%' }}>
                  <Box mb={1}>
                    <Typography variant="subtitle1" fontWeight={700} color="text.primary">
                      Incident Status
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Current status of incidents
                    </Typography>
                  </Box>

                  <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" mt={2}>
                    <Box sx={{ width: 180, height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Chart
                        options={{
                          chart: { type: 'donut', fontFamily: "'Plus Jakarta Sans', sans-serif;" },
                          colors: ['#D32F2F', '#CBD5E1', '#00C853'],
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
                                    label: 'Incident',
                                    fontSize: '12px',
                                    color: '#64748B',
                                    formatter: () => '1',
                                  },
                                },
                              },
                            },
                          },
                        }}
                        series={[1, 0, 0]}
                        type="donut"
                        width="100%"
                        height={180}
                      />
                    </Box>

                    <Stack spacing={1.5} sx={{ flex: 1 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#D32F2F' }} />
                          <Typography variant="caption" color="text.secondary">Active</Typography>
                        </Stack>
                        <Typography variant="caption" fontWeight={700}>1 (100%)</Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#CBD5E1' }} />
                          <Typography variant="caption" color="text.secondary">Acknowledged</Typography>
                        </Stack>
                        <Typography variant="caption" fontWeight={700}>0 (0%)</Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#00C853' }} />
                          <Typography variant="caption" color="text.secondary">Resolved</Typography>
                        </Stack>
                        <Typography variant="caption" fontWeight={700}>0 (0%)</Typography>
                      </Stack>
                    </Stack>
                  </Stack>
                </Card>
              </Grid>
            </Grid>
          </Card>

          {/* Section 2: Incident & Alarm List */}
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '16px', p: 2.5 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} mb={2} spacing={2}>
              <Box>
                <Typography variant="h6" fontWeight={700} color="text.primary">
                  Incident & Alarm List
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  List of security incidents and alarms triggered for this person
                </Typography>
              </Box>

              <Stack direction="row" spacing={1.5} alignItems="center">
                <TextField
                  placeholder="Search area, category, or status..."
                  size="small"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <IconSearch size={16} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ width: 250, '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                />
                <Button variant="outlined" color="inherit" size="small" startIcon={<IconFilter size={16} />} sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}>
                  Filter
                </Button>
              </Stack>
            </Stack>

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Triggered Time</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Area</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Building / Floor</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Acknowledged By</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Acknowledged Time</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {alarmsList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                        No incidents or alarms recorded
                      </TableCell>
                    </TableRow>
                  ) : (
                    alarmsList.map((row: any, idx: number) => (
                      <TableRow key={row.alarmId || idx}>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell sx={{ fontSize: '12px' }}>
                          {row.triggeredTime ? dayjs(row.triggeredTime).format('MMM D, YYYY HH:mm:ss') : '-'}
                        </TableCell>
                        <TableCell>
                          <Chip label={row.category || 'cardaccess'} size="small" sx={{ bgcolor: '#FFEBEE', color: '#D32F2F', fontWeight: 600, fontSize: '11px' }} />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{row.areaName || '-'}</TableCell>
                        <TableCell sx={{ color: 'text.secondary', fontSize: '12px' }}>
                          {row.buildingName || '-'} {row.floorName ? `(${row.floorName})` : ''}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={row.status || 'Active'}
                            size="small"
                            sx={{
                              bgcolor: row.status?.toLowerCase() === 'resolved' ? '#E8F5E9' : row.status?.toLowerCase() === 'acknowledged' ? '#E8F2FE' : '#FFEBEE',
                              color: row.status?.toLowerCase() === 'resolved' ? '#00C853' : row.status?.toLowerCase() === 'acknowledged' ? '#1877F2' : '#D32F2F',
                              fontWeight: 600,
                              fontSize: '11px',
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontSize: '12px' }}>{row.acknowledgedBy || '-'}</TableCell>
                        <TableCell sx={{ fontSize: '12px' }}>
                          {row.acknowledgedTime ? dayjs(row.acknowledgedTime).format('MMM D, YYYY HH:mm') : '-'}
                        </TableCell>
                        <TableCell>
                          <IconButton size="small" sx={{ color: '#1877F2', bgcolor: '#F1F5F9' }}>
                            <IconEye size={16} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Pagination Footer */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" mt={2}>
              <Typography variant="caption" color="text.secondary">
                Showing 1 to 1 of 1 record
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button size="small" variant="outlined" disabled sx={{ minWidth: 32, p: 0.5, borderRadius: '6px' }}>
                  &lt;
                </Button>
                <Button size="small" variant="contained" sx={{ minWidth: 32, p: 0.5, borderRadius: '6px', bgcolor: '#1877F2' }}>
                  1
                </Button>
                <Button size="small" variant="outlined" disabled sx={{ minWidth: 32, p: 0.5, borderRadius: '6px' }}>
                  &gt;
                </Button>
              </Stack>
            </Stack>
          </Card>

          {/* Section 3: Incident Detail & Incident Location */}
          <Grid container spacing={2.5}>
            {/* Incident Detail */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '16px', p: 2.5, height: '100%' }}>
                <Box mb={2}>
                  <Typography variant="h6" fontWeight={700} color="text.primary">
                    Incident Detail
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Detailed information about the selected incident
                  </Typography>
                </Box>

                {/* Banner Alert */}
                <Box sx={{ bgcolor: '#FFF5F5', border: '1px solid', borderColor: '#FFCDD2', borderRadius: '12px', p: 2, mb: 2.5 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Box sx={{ width: 36, height: 36, borderRadius: '50%', bgcolor: '#FFEBEE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D32F2F' }}>
                        <IconAlertTriangle size={20} />
                      </Box>
                      <Box>
                        <Typography variant="subtitle2" fontWeight={700} color="#D32F2F">
                          Card Access Violation
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Card access violation detected by tracking engine
                        </Typography>
                      </Box>
                    </Stack>
                    <Chip label="Acknowledged" size="small" sx={{ bgcolor: '#E8F2FE', color: '#1877F2', fontWeight: 600, fontSize: '11px' }} />
                  </Stack>
                </Box>

                {/* Metadata List */}
                <Stack spacing={1.2}>
                  {[
                    { label: 'Incident ID', value: '031b26de-0d5f-4496-b441-6173d35b03c3', copyable: true },
                    { label: 'Category', value: 'cardaccess' },
                    { label: 'Area', value: 'Ruangan Programmer' },
                    { label: 'Building / Floor', value: 'Gedung Buni / Lantai 2 Buni' },
                    { label: 'Triggered Time', value: 'Sep 7, 2026 08:59:28' },
                    { label: 'Status', value: 'Acknowledged' },
                    { label: 'Acknowledged By', value: 'Old Lex' },
                    { label: 'Acknowledged Time', value: 'Sep 7, 2026 09:03:57' },
                    { label: 'Dispatched To', value: '-' },
                    { label: 'Investigated By', value: '-' },
                    { label: 'Investigation Result', value: '-' },
                  ].map((item, idx) => (
                    <Stack key={idx} direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 140 }}>
                        {item.label}
                      </Typography>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Typography variant="body2" fontWeight={item.label === 'Area' || item.label === 'Category' ? 600 : 400} color="text.primary">
                          {item.value}
                        </Typography>
                        {item.copyable && (
                          <IconButton size="small" sx={{ p: 0.2 }}>
                            <IconCopy size={14} color="#64748B" />
                          </IconButton>
                        )}
                      </Stack>
                    </Stack>
                  ))}
                </Stack>
              </Card>
            </Grid>

            {/* Incident Location */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '16px', p: 2.5, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                  <Box>
                    <Typography variant="h6" fontWeight={700} color="text.primary">
                      Incident Location
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Location of the incident on floorplan
                    </Typography>
                  </Box>
                  <TextField
                    select
                    size="small"
                    defaultValue="gedung-buni-lantai-2"
                    sx={{ width: 200, '& .MuiOutlinedInput-root': { borderRadius: '8px', fontSize: '13px' } }}
                  >
                    <MenuItem value="gedung-buni-lantai-2">Gedung Buni - Lantai 2 Buni</MenuItem>
                    <MenuItem value="gedung-buni-lantai-1">Gedung Buni - Lantai 1</MenuItem>
                  </TextField>
                </Stack>

                {/* Map Canvas */}
                <Box
                  sx={{
                    flex: 1,
                    minHeight: 250,
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
                  <Box
                    sx={{
                      position: 'relative',
                      width: '85%',
                      height: '80%',
                      border: '1px solid #CBD5E1',
                      borderRadius: '8px',
                      bgcolor: '#F1F5F9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {/* Highlighted Area Box */}
                    <Box
                      sx={{
                        width: '45%',
                        height: '55%',
                        bgcolor: 'rgba(24, 119, 242, 0.25)',
                        border: '1.5px solid #1877F2',
                        borderRadius: '6px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                      }}
                    >
                      <Typography variant="caption" fontWeight={700} color="#1877F2" sx={{ fontSize: '10px', mb: 0.5 }}>
                        Ruangan Programmer
                      </Typography>
                      <Box
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          bgcolor: '#D32F2F',
                          color: '#FFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 0 0 4px rgba(211, 47, 47, 0.2)',
                        }}
                      >
                        <IconAlertTriangle size={14} />
                      </Box>
                    </Box>
                  </Box>

                  {/* Zoom controls */}
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
                      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                    }}
                  >
                    <IconButton size="small">
                      <IconPlus size={16} />
                    </IconButton>
                    <IconButton size="small">
                      <IconMinus size={16} />
                    </IconButton>
                  </Stack>

                  {/* Floor Label Badge */}
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: 12,
                      right: 12,
                      bgcolor: 'background.paper',
                      px: 1.5,
                      py: 0.5,
                      borderRadius: '6px',
                      border: '1px solid',
                      borderColor: 'divider',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    }}
                  >
                    <Typography variant="caption" fontWeight={600} color="text.secondary">
                      Lantai 2 Buni
                    </Typography>
                  </Box>
                </Box>

                {/* Map Footer Legend */}
                <Stack direction="row" spacing={2.5} justifyContent="flex-start" mt={1.5}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#D32F2F' }} />
                    <Typography variant="caption" fontWeight={600}>
                      Incident Location
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#1877F2' }} />
                    <Typography variant="caption" fontWeight={600}>
                      Area Boundary
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#4FC3F7' }} />
                    <Typography variant="caption" fontWeight={600}>
                      Other Area
                    </Typography>
                  </Stack>
                </Stack>
              </Card>
            </Grid>
          </Grid>
        </Stack>
      )}

      {/* Card History Tab View */}
      {activeTab === 'cardHistory' && (
        <Stack spacing={3}>
          {/* Top Summary Card */}
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '16px', p: 2.5 }}>
            <Box mb={2}>
              <Typography variant="h6" fontWeight={700} color="text.primary">
                Card & Device Summary
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Information about active BLE beacon card assigned to this person
              </Typography>
            </Box>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '12px', p: 2, bgcolor: '#F8FAFC' }}>
                  <Typography variant="caption" color="text.secondary" display="block">Card Number</Typography>
                  <Typography variant="subtitle1" fontWeight={700} color="text.primary">{cardNumber}</Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '12px', p: 2, bgcolor: '#F8FAFC' }}>
                  <Typography variant="caption" color="text.secondary" display="block">BLE MAC Address</Typography>
                  <Typography variant="subtitle1" fontWeight={700} color="text.primary">BC572923F3C9</Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '12px', p: 2, bgcolor: '#F8FAFC' }}>
                  <Typography variant="caption" color="text.secondary" display="block">Battery Level</Typography>
                  <Typography variant="subtitle1" fontWeight={700} color="#00C853">{cardBattery}% (Good)</Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '12px', p: 2, bgcolor: '#F8FAFC' }}>
                  <Typography variant="caption" color="text.secondary" display="block">Status</Typography>
                  <Chip label="Active" size="small" sx={{ bgcolor: '#E8F5E9', color: '#00C853', fontWeight: 700, mt: 0.5 }} />
                </Box>
              </Grid>
            </Grid>
          </Card>

          {/* Table Card */}
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '16px', p: 2.5 }}>
            <Box mb={2}>
              <Typography variant="h6" fontWeight={700} color="text.primary">
                Card Assignment & Activity Log
              </Typography>
              <Typography variant="caption" color="text.secondary">
                History of card issuance, battery status updates, and assignment logs
              </Typography>
            </Box>

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Date & Time</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Card Number</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>BLE MAC</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Event / Action</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Issued By / Notes</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cardHistoryList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                        No card assignment history recorded
                      </TableCell>
                    </TableRow>
                  ) : (
                    cardHistoryList.map((row: any, idx: number) => (
                      <TableRow key={row.cardId || idx}>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell sx={{ fontSize: '12px' }}>
                          {row.checkinAt ? dayjs(row.checkinAt).format('MMM D, YYYY HH:mm:ss') : '-'}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{row.cardNumber || '-'}</TableCell>
                        <TableCell sx={{ fontSize: '12px', color: 'text.secondary' }}>{row.bleCardNumber || '-'}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{row.isActive ? 'Card Assigned' : 'Card Unassigned'}</TableCell>
                        <TableCell>
                          <Chip
                            label={row.isActive ? 'Active' : 'Inactive'}
                            size="small"
                            sx={{
                              bgcolor: row.isActive ? '#E8F5E9' : '#F1F5F9',
                              color: row.isActive ? '#00C853' : '#64748B',
                              fontWeight: 700,
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontSize: '12px', color: 'text.secondary' }}>
                          Assigned by: {row.checkinBy || 'System'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Pagination Footer */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" mt={2}>
              <Typography variant="caption" color="text.secondary">
                Showing 1 to 2 of 2 records
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button size="small" variant="outlined" disabled sx={{ minWidth: 32, p: 0.5, borderRadius: '6px' }}>
                  &lt;
                </Button>
                <Button size="small" variant="contained" sx={{ minWidth: 32, p: 0.5, borderRadius: '6px', bgcolor: '#1877F2' }}>
                  1
                </Button>
                <Button size="small" variant="outlined" disabled sx={{ minWidth: 32, p: 0.5, borderRadius: '6px' }}>
                  &gt;
                </Button>
              </Stack>
            </Stack>
          </Card>
        </Stack>
      )}

      {/* EXPORT LOADING OVERLAY BACKDROP */}
      {isExporting && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(6px)',
            zIndex: 100000,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
          }}
        >
          <CircularProgress size={64} thickness={4} sx={{ color: '#1877F2', mb: 3 }} />
          <Typography variant="h5" fontWeight={700} gutterBottom>
            Generating Complete PDF Report...
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.85, maxWidth: 500, textAlign: 'center', px: 2 }}>
            Combining profile details, movement timeline, floorplan map, area metrics, access compliance, security incidents, and card history.
          </Typography>
        </Box>
      )}

      {/* FULL PDF EXPORT STACKED CONTAINER */}
      <Box
        id="investigate-full-pdf-export-content"
        sx={{
          position: isExporting ? 'fixed' : 'absolute',
          top: isExporting ? 0 : -99999,
          left: isExporting ? 0 : -99999,
          width: '1200px',
          bgcolor: '#FFFFFF',
          color: '#1E293B',
          p: 4,
          display: 'flex',
          flexDirection: 'column',
          gap: 3.5,
          zIndex: isExporting ? 99999 : -1,
          opacity: isExporting ? 1 : 0,
          pointerEvents: 'none',
        }}
      >
        {/* Document Header Banner */}
        <Box sx={{ borderBottom: '3px solid #1877F2', pb: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-end">
            <Box>
              <Typography variant="h4" fontWeight={800} color="#1877F2" sx={{ letterSpacing: '-0.5px' }}>
                DETAILED SECURITY INVESTIGATION DOSSIER
              </Typography>
              <Typography variant="subtitle2" color="text.secondary" mt={0.5}>
                Target Person: <strong>{personName}</strong> (ID: {identityId})  |  Investigation Period: {formattedFrom} – {formattedTo}
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="caption" color="text.secondary" display="block">
                Generated: {dayjs().format('MMMM DD, YYYY HH:mm:ss')}
              </Typography>
              <Typography variant="caption" fontWeight={700} color="#1877F2">
                CONFIDENTIAL SECURITY REPORT
              </Typography>
            </Box>
          </Stack>
        </Box>

        {/* 1. Person Profile & Contact Dossier Card */}
        <Card elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: '16px', p: 3, bgcolor: '#F8FAFC' }}>
          <Stack direction="row" spacing={3} alignItems="center">
            <Avatar
              src={data?.personInfo?.faceImage || selectedPerson?.avatarUrl || `${BASE_URL}/images/users/user-1.jpg`}
              sx={{ width: 80, height: 80, bgcolor: '#E8F2FE', color: '#1877F2', fontWeight: 700, fontSize: '28px', border: '3px solid #1877F2' }}
            >
              {initials}
            </Avatar>

            <Box sx={{ flexGrow: 1 }}>
              <Stack direction="row" spacing={1.5} alignItems="center" mb={0.5}>
                <Typography variant="h5" fontWeight={800} color="text.primary">
                  {personName}
                </Typography>
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    px: 1.5,
                    py: 0.4,
                    borderRadius: '12px',
                    bgcolor: personType === 'Member' ? '#E8F2FE' : '#FEF3D6',
                    color: personType === 'Member' ? '#1877F2' : '#B06000',
                    fontWeight: 700,
                    fontSize: '12px',
                  }}
                >
                  {personType}
                </Box>
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    px: 1.5,
                    py: 0.4,
                    borderRadius: '12px',
                    bgcolor: isViolation ? '#FFEBEE' : '#E8F5E9',
                    color: isViolation ? '#D32F2F' : '#00C853',
                    fontWeight: 700,
                    fontSize: '12px',
                  }}
                >
                  {isViolation ? 'Compliance Violation' : 'Compliant'}
                </Box>
              </Stack>

              <Grid container spacing={2} mt={0.5}>
                <Grid size={{ xs: 3 }}>
                  <Typography variant="caption" color="text.secondary" display="block">Identity ID</Typography>
                  <Typography variant="body2" fontWeight={700}>{identityId}</Typography>
                </Grid>
                <Grid size={{ xs: 3 }}>
                  <Typography variant="caption" color="text.secondary" display="block">Assigned Card / BLE MAC</Typography>
                  <Typography variant="body2" fontWeight={700}>{cardNumber} ({bleMac})</Typography>
                </Grid>
                <Grid size={{ xs: 3 }}>
                  <Typography variant="caption" color="text.secondary" display="block">Organization & Dept</Typography>
                  <Typography variant="body2" fontWeight={700}>{organization} ({department})</Typography>
                </Grid>
                <Grid size={{ xs: 3 }}>
                  <Typography variant="caption" color="text.secondary" display="block">Contact Information</Typography>
                  <Typography variant="body2" fontWeight={700}>{email} | {phone}</Typography>
                </Grid>
              </Grid>
            </Box>
          </Stack>
        </Card>

        {/* 2. Executive KPI Highlights Grid */}
        <Grid container spacing={2}>
          <Grid size={{ xs: 3 }}>
            <Box sx={{ border: '1px solid #E2E8F0', borderRadius: '12px', p: 2, bgcolor: '#FFFFFF' }}>
              <Typography variant="caption" color="text.secondary" display="block" fontWeight={600}>Total Stay Duration</Typography>
              <Typography variant="h5" fontWeight={800} color="#1877F2" mt={0.5}>{totalPresenceFormatted}</Typography>
              <Typography variant="caption" color="text.secondary">Recorded inside facility</Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 3 }}>
            <Box sx={{ border: '1px solid #E2E8F0', borderRadius: '12px', p: 2, bgcolor: '#FFFFFF' }}>
              <Typography variant="caption" color="text.secondary" display="block" fontWeight={600}>Areas Visited</Typography>
              <Typography variant="h5" fontWeight={800} color="text.primary" mt={0.5}>{totalAreasVisited} Areas</Typography>
              <Typography variant="caption" color="text.secondary">{authorizedAreasVisited} Authorized / {unauthorizedAreasVisited} Restricted</Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 3 }}>
            <Box sx={{ border: '1px solid #E2E8F0', borderRadius: '12px', p: 2, bgcolor: '#FFFFFF' }}>
              <Typography variant="caption" color="text.secondary" display="block" fontWeight={600}>Incidents & Alarms</Typography>
              <Typography variant="h5" fontWeight={800} color={totalIncidents > 0 ? '#D32F2F' : '#00C853'} mt={0.5}>
                {totalIncidents} Incidents
              </Typography>
              <Typography variant="caption" color="text.secondary">{activeIncidents} Unresolved / Active</Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 3 }}>
            <Box sx={{ border: '1px solid #E2E8F0', borderRadius: '12px', p: 2, bgcolor: '#FFFFFF' }}>
              <Typography variant="caption" color="text.secondary" display="block" fontWeight={600}>Last Known Location</Typography>
              <Typography variant="body1" fontWeight={700} color="text.primary" mt={0.5} noWrap>{currentArea}</Typography>
              <Typography variant="caption" color="text.secondary">{currentBuilding} - {currentFloor} ({lastSeenTimeStr})</Typography>
            </Box>
          </Grid>
        </Grid>

        {/* SECTION 1: TIMELINE ANALYSIS */}
        <Box sx={{ borderTop: '2px dashed #CBD5E1', pt: 3 }}>
          <Typography variant="h5" fontWeight={800} color="#1877F2" mb={2}>
            1. Timeline & Movement Analysis
          </Typography>
          <Grid container spacing={2.5}>
            {/* Timeline Chart */}
            <Grid size={{ xs: 6 }}>
              <Card elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: '16px', p: 2.5 }}>
                <Typography variant="h6" fontWeight={700} mb={1}>Presence Over Time (Graph)</Typography>
                <Box sx={{ height: 220 }}>
                  <Chart options={presenceTimelineOptions} series={presenceTimelineSeries} type="rangeBar" height={210} width="100%" />
                </Box>
              </Card>
            </Grid>

            {/* Floorplan Map View */}
            <Grid size={{ xs: 6 }}>
              <Card elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: '16px', p: 2.5 }}>
                <Typography variant="h6" fontWeight={700} mb={1}>Floorplan Map & Beacon Marker</Typography>
                <Box sx={{ height: 220, bgcolor: '#F1F5F9', borderRadius: '12px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
                  {floorplanImgObj ? (
                    <Stage width={520} height={210}>
                      <Layer>
                        <KonvaImage image={floorplanImgObj} width={520} height={210} />
                        <BeaconRenderer
                          id="export-timeline-beacon"
                          x={260}
                          y={105}
                          beaconSize={1}
                          clickable={false}
                          label={personName}
                          isSecurity={personType === 'Security' || personType === 'Security Guard'}
                          isMember={personType === 'Member'}
                          isVisitor={personType === 'Visitor'}
                          faceImage={selectedPerson?.avatarUrl}
                          area={currentArea}
                          floorplan={currentFloor}
                          time={lastSeenTimeStr}
                        />
                      </Layer>
                    </Stage>
                  ) : (
                    /* Fallback Map Box */
                    <Box sx={{ width: '100%', height: '100%', p: 2, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', bgcolor: '#E2E8F0' }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box sx={{ display: 'inline-flex', px: 1.5, py: 0.4, borderRadius: '8px', bgcolor: '#FFFFFF', fontWeight: 700, fontSize: '12px', color: '#1E293B' }}>
                          {currentBuilding} - {currentFloor}
                        </Box>
                        <Typography variant="caption" color="text.secondary">Location Blueprint Map</Typography>
                      </Stack>
                      <Box sx={{ p: 2, bgcolor: 'rgba(24, 119, 242, 0.15)', border: '2px dashed #1877F2', borderRadius: '8px', textAlign: 'center' }}>
                        <Typography variant="subtitle2" fontWeight={800} color="#1877F2">{currentArea}</Typography>
                        <Typography variant="caption" color="text.secondary" display="block">Target Marker: {personName} ({lastSeenTimeStr})</Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary" textAlign="right">Beacon Signal: Strong (-64 dBm)</Typography>
                    </Box>
                  )}
                </Box>
              </Card>
            </Grid>
          </Grid>

          {/* Chronological Timeline Log Table */}
          <Card elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: '16px', p: 2.5, mt: 2.5 }}>
            <Typography variant="h6" fontWeight={700} mb={1.5}>Chronological Activity Log</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                    <TableCell sx={{ fontWeight: 700 }}>Timestamp</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Event Type</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Activity Description</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Location</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {chronologicalTimelineList.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell sx={{ fontSize: '12px', fontWeight: 600 }}>{dayjs(row.timestamp).format('MMM D, YYYY HH:mm:ss')}</TableCell>
                      <TableCell>
                        <Box
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            px: 1.5,
                            py: 0.4,
                            borderRadius: '12px',
                            bgcolor: row.badge === 'Danger' ? '#FFEBEE' : row.badge === 'Primary' ? '#E8F2FE' : '#E8F5E9',
                            color: row.badge === 'Danger' ? '#D32F2F' : row.badge === 'Primary' ? '#1877F2' : '#00C853',
                            fontWeight: 700,
                            fontSize: '11px',
                            lineHeight: 1.2,
                          }}
                        >
                          {row.eventType}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '12px' }}>
                        {row.title} - <span style={{ color: '#64748B', fontWeight: 400 }}>{row.description}</span>
                      </TableCell>
                      <TableCell sx={{ fontSize: '12px', color: 'text.secondary' }}>{row.location}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Box>

        {/* SECTION 2: AREA ANALYSIS */}
        <Box sx={{ borderTop: '2px dashed #CBD5E1', pt: 3 }}>
          <Typography variant="h5" fontWeight={800} color="#1877F2" mb={2}>
            2. Area Access & Dwell Time Analysis
          </Typography>
          <Grid container spacing={2.5}>
            {/* Time Spent Breakdown List */}
            <Grid size={{ xs: 6 }}>
              <Card elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: '16px', p: 2.5 }}>
                <Typography variant="h6" fontWeight={700} mb={1}>Time Spent by Area</Typography>
                <Stack spacing={2} mt={1.5}>
                  {areaBreakdownList.map((row, idx) => (
                    <Box key={idx}>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2" fontWeight={700}>{row.areaName} ({row.buildingName})</Typography>
                        <Typography variant="body2" fontWeight={800} color="#1877F2">{row.durationFormatted} ({row.percentage}%)</Typography>
                      </Stack>
                      <LinearProgress variant="determinate" value={row.percentage} sx={{ height: 8, borderRadius: 4, mt: 0.5, bgcolor: '#E2E8F0' }} />
                    </Box>
                  ))}
                </Stack>
              </Card>
            </Grid>

            {/* Floorplan Area Map */}
            <Grid size={{ xs: 6 }}>
              <Card elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: '16px', p: 2.5 }}>
                <Typography variant="h6" fontWeight={700} mb={1}>Area Floorplan Map</Typography>
                <Box sx={{ height: 220, bgcolor: '#F1F5F9', borderRadius: '12px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {floorplanImgObj ? (
                    <Stage width={520} height={210}>
                      <Layer>
                        <KonvaImage image={floorplanImgObj} width={520} height={210} />
                        <BeaconRenderer
                          id="export-area-beacon"
                          x={260}
                          y={105}
                          beaconSize={1}
                          clickable={false}
                          label={personName}
                          isMember={personType === 'Member'}
                          isSecurity={personType === 'Security'}
                          isVisitor={personType === 'Visitor'}
                          faceImage={selectedPerson?.avatarUrl}
                          area={currentArea}
                          floorplan={currentFloor}
                          time={lastSeenTimeStr}
                        />
                      </Layer>
                    </Stage>
                  ) : (
                    <Box sx={{ width: '100%', height: '100%', p: 2, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', bgcolor: '#F8FAFC' }}>
                      <Typography variant="subtitle2" fontWeight={700} color="text.primary">{currentArea}</Typography>
                      <Typography variant="caption" color="text.secondary">{currentBuilding} - {currentFloor}</Typography>
                    </Box>
                  )}
                </Box>
              </Card>
            </Grid>
          </Grid>

          {/* Area Visit Log Table */}
          <Card elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: '16px', p: 2.5, mt: 2.5 }}>
            <Typography variant="h6" fontWeight={700} mb={1.5}>Area Entry & Dwell Log</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                    <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Area Name</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Building & Floor</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Entry Time</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Dwell Duration</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Access Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {breachesList.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.id}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{row.area}</TableCell>
                      <TableCell sx={{ fontSize: '12px' }}>{row.buildingFloor}</TableCell>
                      <TableCell sx={{ fontSize: '12px' }}>{row.enteredAt}</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#1877F2' }}>{row.duration}</TableCell>
                      <TableCell>
                        <Box
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            px: 1.5,
                            py: 0.4,
                            borderRadius: '12px',
                            bgcolor: '#E8F5E9',
                            color: '#00C853',
                            fontWeight: 700,
                            fontSize: '11px',
                          }}
                        >
                          Authorized
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Box>

        {/* SECTION 3: ACCESS COMPLIANCE */}
        <Box sx={{ borderTop: '2px dashed #CBD5E1', pt: 3 }}>
          <Typography variant="h5" fontWeight={800} color="#1877F2" mb={2}>
            3. Access Compliance & Permissions
          </Typography>
          <Grid container spacing={2.5}>
            <Grid size={{ xs: 6 }}>
              <Card elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: '16px', p: 2.5 }}>
                <Typography variant="h6" fontWeight={700} mb={1}>Compliance Overview Gauge</Typography>
                <Stack direction="row" spacing={3} alignItems="center" mt={1}>
                  <Box sx={{ width: 140, height: 140 }}>
                    <Chart options={complianceChartOptions} series={[complianceScore]} type="radialBar" height={150} />
                  </Box>
                  <Box>
                    <Box
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        px: 1.5,
                        py: 0.4,
                        borderRadius: '12px',
                        bgcolor: isViolation ? '#FFEBEE' : '#E8F5E9',
                        color: isViolation ? '#D32F2F' : '#00C853',
                        fontWeight: 700,
                        fontSize: '12px',
                      }}
                    >
                      {isViolation ? 'Violation Detected' : 'Fully Compliant'}
                    </Box>
                    <Typography variant="h6" fontWeight={800} mt={1}>Score: {complianceScore}%</Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Verified against default security access policies
                    </Typography>
                  </Box>
                </Stack>
              </Card>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Card elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: '16px', p: 2.5 }}>
                <Typography variant="h6" fontWeight={700} mb={1}>Access Rights & Group Assignment</Typography>
                <Typography variant="body2" color="text.secondary" mt={0.5}>
                  No custom Access Group assigned. Access is evaluated against standard employee perimeter permissions.
                </Typography>
                <Stack direction="row" spacing={2} mt={2}>
                  <Box sx={{ border: '1px solid #E2E8F0', borderRadius: '8px', p: 1.5, flex: 1, bgcolor: '#F8FAFC' }}>
                    <Typography variant="caption" color="text.secondary" display="block">Authorized Areas</Typography>
                    <Typography variant="subtitle1" fontWeight={700} color="#00C853">{authorizedAreasVisited} Areas</Typography>
                  </Box>
                  <Box sx={{ border: '1px solid #E2E8F0', borderRadius: '8px', p: 1.5, flex: 1, bgcolor: '#F8FAFC' }}>
                    <Typography variant="caption" color="text.secondary" display="block">Restricted Violations</Typography>
                    <Typography variant="subtitle1" fontWeight={700} color="#D32F2F">{unauthorizedAreasVisited} Violations</Typography>
                  </Box>
                </Stack>
              </Card>
            </Grid>
          </Grid>
        </Box>

        {/* SECTION 4: SECURITY INCIDENTS & ALARMS */}
        <Box sx={{ borderTop: '2px dashed #CBD5E1', pt: 3 }}>
          <Typography variant="h5" fontWeight={800} color="#1877F2" mb={2}>
            4. Security Incidents & Alarms
          </Typography>
          <Grid container spacing={2.5}>
            <Grid size={{ xs: 6 }}>
              <Card elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: '16px', p: 2.5 }}>
                <Typography variant="h6" fontWeight={700} mb={1}>Card Access Violation Incident</Typography>
                <Typography variant="body2" fontWeight={700} color="text.primary">
                  Incident ID: 031b26de-0d5f-4496-b441-6173d35b03c3
                </Typography>
                <Typography variant="body2" color="text.secondary" mt={0.5}>
                  Location: Ruangan Programmer (Gedung Buni / Lantai 2 Buni)
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                  Triggered: Sep 7, 2026 08:59:00  |  Handled By: Old Lex
                </Typography>
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    px: 1.5,
                    py: 0.4,
                    borderRadius: '12px',
                    bgcolor: '#E8F2FE',
                    color: '#1877F2',
                    fontWeight: 700,
                    fontSize: '11px',
                    mt: 1.5,
                  }}
                >
                  Acknowledged
                </Box>
              </Card>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Card elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: '16px', p: 2.5 }}>
                <Typography variant="h6" fontWeight={700} mb={1}>Incident Location Diagram</Typography>
                <Box sx={{ height: 150, bgcolor: '#F8FAFC', borderRadius: '12px', border: '1.5px solid #CBD5E1', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  <Box sx={{ width: '60%', height: '65%', bgcolor: 'rgba(211, 47, 47, 0.1)', border: '2px solid #D32F2F', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography variant="subtitle2" fontWeight={800} color="#D32F2F">Ruangan Programmer</Typography>
                    <Typography variant="caption" color="#D32F2F">Incident Zone (Card Access)</Typography>
                  </Box>
                </Box>
              </Card>
            </Grid>
          </Grid>
        </Box>

        {/* SECTION 5: CARD HISTORY & DEVICE TELEMETRY */}
        <Box sx={{ borderTop: '2px dashed #CBD5E1', pt: 3 }}>
          <Typography variant="h5" fontWeight={800} color="#1877F2" mb={2}>
            5. Card History & Device Telemetry
          </Typography>

          {/* Card Summary Card */}
          <Card elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: '16px', p: 2.5, mb: 2 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 3 }}>
                <Box sx={{ border: '1px solid #E2E8F0', borderRadius: '8px', p: 1.5, bgcolor: '#F8FAFC' }}>
                  <Typography variant="caption" color="text.secondary" display="block">Card Number</Typography>
                  <Typography variant="subtitle1" fontWeight={700}>{cardNumber}</Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 3 }}>
                <Box sx={{ border: '1px solid #E2E8F0', borderRadius: '8px', p: 1.5, bgcolor: '#F8FAFC' }}>
                  <Typography variant="caption" color="text.secondary" display="block">BLE MAC Address</Typography>
                  <Typography variant="subtitle1" fontWeight={700}>BC572923F3C9</Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 3 }}>
                <Box sx={{ border: '1px solid #E2E8F0', borderRadius: '8px', p: 1.5, bgcolor: '#F8FAFC' }}>
                  <Typography variant="caption" color="text.secondary" display="block">Battery Telemetry</Typography>
                  <Typography variant="subtitle1" fontWeight={700} color="#00C853">{cardBattery}% (Good)</Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 3 }}>
                <Box sx={{ border: '1px solid #E2E8F0', borderRadius: '8px', p: 1.5, bgcolor: '#F8FAFC' }}>
                  <Typography variant="caption" color="text.secondary" display="block">Device Status</Typography>
                  <Box
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      px: 1.5,
                      py: 0.4,
                      borderRadius: '12px',
                      bgcolor: '#E8F5E9',
                      color: '#00C853',
                      fontWeight: 700,
                      fontSize: '11px',
                      mt: 0.2,
                    }}
                  >
                    Active
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </Card>

          {/* Card Assignment & Log Table */}
          <Card elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: '16px', p: 2.5 }}>
            <Typography variant="h6" fontWeight={700} mb={1.5}>Card Assignment & Activity Log</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                    <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Date & Time</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Card Number</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>BLE MAC</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Event / Action</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Issued By / Notes</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(data?.cardHistory || []).map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.id}</TableCell>
                      <TableCell sx={{ fontSize: '12px' }}>{row.dateTime}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{row.cardNo}</TableCell>
                      <TableCell sx={{ fontSize: '12px', color: 'text.secondary' }}>{row.mac}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{row.event}</TableCell>
                      <TableCell>
                        <Box
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            px: 1.5,
                            py: 0.4,
                            borderRadius: '12px',
                            bgcolor: '#E8F5E9',
                            color: '#00C853',
                            fontWeight: 700,
                            fontSize: '11px',
                          }}
                        >
                          {row.status}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ fontSize: '12px', color: 'text.secondary' }}>{row.notes}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Box>
      </Box>
    </Stack>
  );
};

export default NewInvestigateContent;
