import React, { useState, useMemo } from 'react';
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
  TablePagination,
  TableSortLabel,
  TextField,
  InputAdornment,
  CircularProgress,
  Tooltip,
  Paper,
  Tabs,
  Tab,
} from '@mui/material';
import Chart from 'react-apexcharts';
import {
  IconUsers,
  IconShield,
  IconAlertTriangle,
  IconBattery,
  IconClock,
  IconMapPin,
  IconSearch,
  IconUserExclamation,
  IconFlame,
  IconActivity,
  IconShieldCheck,
  IconShieldX,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { GlobalInvestigationData } from 'src/hooks/useInvestigate';
import { BASE_URL } from 'src/utils/axios';

const normalizeImageUrl = (path?: string | null) => {
  if (!path) return undefined;
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) return path;
  const cleanBase = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${cleanBase}${cleanPath}`;
};

interface GlobalInvestigationOverviewProps {
  data?: GlobalInvestigationData | null;
  isLoading?: boolean;
  onSelectPerson?: (personId: string) => void;
  onSelectArea?: (areaId: string) => void;
}

export const GlobalInvestigationOverview: React.FC<GlobalInvestigationOverviewProps> = ({
  data,
  isLoading = false,
  onSelectPerson,
  onSelectArea,
}) => {
  // TAB 1: Restricted Occupants state
  const [occupantSearch, setOccupantSearch] = useState('');
  const [occupantPage, setOccupantPage] = useState(0);
  const [occupantRowsPerPage, setOccupantRowsPerPage] = useState(5);
  const [occupantSortBy, setOccupantSortBy] = useState<string>('stayMinutes');
  const [occupantSortOrder, setOccupantSortOrder] = useState<'asc' | 'desc'>('desc');

  // TAB 2: Access Violators state
  const [violatorSearch, setViolatorSearch] = useState('');
  const [violatorPage, setViolatorPage] = useState(0);
  const [violatorRowsPerPage, setViolatorRowsPerPage] = useState(5);
  const [violatorSortBy, setViolatorSortBy] = useState<string>('unauthorizedAccessCount');
  const [violatorSortOrder, setViolatorSortOrder] = useState<'asc' | 'desc'>('desc');

  // TAB 3: Overstay Visitors state
  const [overstaySearch, setOverstaySearch] = useState('');
  const [overstayPage, setOverstayPage] = useState(0);
  const [overstayRowsPerPage, setOverstayRowsPerPage] = useState(5);
  const [overstaySortBy, setOverstaySortBy] = useState<string>('overstayDurationMinutes');
  const [overstaySortOrder, setOverstaySortOrder] = useState<'asc' | 'desc'>('desc');

  const [topTab, setTopTab] = useState<'occupants' | 'violators' | 'overstay'>('occupants');

  const facilitySummary = data?.facilitySummary;
  const topAccessViolators = data?.topAccessViolators || [];
  const breachHotspots = data?.breachHotspots || [];
  const currentRestrictedOccupants = data?.currentRestrictedAreaOccupants || [];
  const overstayVisitors = data?.overstayVisitors || [];
  const lowBatteryCards = data?.lowBatteryCardsInUse || [];

  // Filter & Sort Restricted Occupants
  const filteredOccupants = useMemo(() => {
    let list = currentRestrictedOccupants;
    if (occupantSearch.trim()) {
      const q = occupantSearch.trim().toLowerCase();
      list = list.filter(
        (o) =>
          (o.personName && o.personName.toLowerCase().includes(q)) ||
          (o.areaName && o.areaName.toLowerCase().includes(q)) ||
          (o.floorName && o.floorName.toLowerCase().includes(q)) ||
          (o.cardNumber && o.cardNumber.toLowerCase().includes(q)) ||
          (o.personType && o.personType.toLowerCase().includes(q))
      );
    }
    return [...list].sort((a, b) => {
      let aVal: any = '';
      let bVal: any = '';
      if (occupantSortBy === 'personName') {
        aVal = a.personName || '';
        bVal = b.personName || '';
      } else if (occupantSortBy === 'areaName') {
        aVal = a.areaName || '';
        bVal = b.areaName || '';
      } else if (occupantSortBy === 'enteredAt') {
        aVal = new Date(a.enteredAt).getTime() || 0;
        bVal = new Date(b.enteredAt).getTime() || 0;
      } else if (occupantSortBy === 'stayMinutes') {
        aVal = a.stayMinutes ?? 0;
        bVal = b.stayMinutes ?? 0;
      } else if (occupantSortBy === 'hasAccessPermission') {
        aVal = a.hasAccessPermission ? 1 : 0;
        bVal = b.hasAccessPermission ? 1 : 0;
      } else if (occupantSortBy === 'alarmStatus') {
        aVal = a.alarmStatus || '';
        bVal = b.alarmStatus || '';
      }
      if (typeof aVal === 'string') {
        return occupantSortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return occupantSortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [currentRestrictedOccupants, occupantSearch, occupantSortBy, occupantSortOrder]);

  // Filter & Sort Access Violators
  const filteredViolators = useMemo(() => {
    let list = topAccessViolators;
    if (violatorSearch.trim()) {
      const q = violatorSearch.trim().toLowerCase();
      list = list.filter(
        (v) =>
          (v.personName && v.personName.toLowerCase().includes(q)) ||
          (v.department && v.department.toLowerCase().includes(q)) ||
          (v.activeCard && v.activeCard.toLowerCase().includes(q)) ||
          (v.mostViolatedArea && v.mostViolatedArea.toLowerCase().includes(q)) ||
          (v.personType && v.personType.toLowerCase().includes(q))
      );
    }
    return [...list].sort((a, b) => {
      let aVal: any = '';
      let bVal: any = '';
      if (violatorSortBy === 'personName') {
        aVal = a.personName || '';
        bVal = b.personName || '';
      } else if (violatorSortBy === 'department') {
        aVal = a.department || '';
        bVal = b.department || '';
      } else if (violatorSortBy === 'activeCard') {
        aVal = a.activeCard || '';
        bVal = b.activeCard || '';
      } else if (violatorSortBy === 'totalAlarmsTriggered') {
        aVal = a.totalAlarmsTriggered ?? 0;
        bVal = b.totalAlarmsTriggered ?? 0;
      } else if (violatorSortBy === 'unauthorizedAccessCount') {
        aVal = a.unauthorizedAccessCount ?? 0;
        bVal = b.unauthorizedAccessCount ?? 0;
      } else if (violatorSortBy === 'mostViolatedArea') {
        aVal = a.mostViolatedArea || '';
        bVal = b.mostViolatedArea || '';
      } else if (violatorSortBy === 'lastViolationAt') {
        aVal = new Date(a.lastViolationAt).getTime() || 0;
        bVal = new Date(b.lastViolationAt).getTime() || 0;
      }
      if (typeof aVal === 'string') {
        return violatorSortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return violatorSortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [topAccessViolators, violatorSearch, violatorSortBy, violatorSortOrder]);

  // Filter & Sort Overstay Visitors
  const filteredOverstay = useMemo(() => {
    let list = overstayVisitors;
    if (overstaySearch.trim()) {
      const q = overstaySearch.trim().toLowerCase();
      list = list.filter(
        (v) =>
          (v.visitorName && v.visitorName.toLowerCase().includes(q)) ||
          (v.cardNumber && v.cardNumber.toLowerCase().includes(q)) ||
          (v.hostMemberName && v.hostMemberName.toLowerCase().includes(q)) ||
          (v.currentArea && v.currentArea.toLowerCase().includes(q)) ||
          (v.status && v.status.toLowerCase().includes(q))
      );
    }
    return [...list].sort((a, b) => {
      let aVal: any = '';
      let bVal: any = '';
      if (overstaySortBy === 'visitorName') {
        aVal = a.visitorName || '';
        bVal = b.visitorName || '';
      } else if (overstaySortBy === 'cardNumber') {
        aVal = a.cardNumber || '';
        bVal = b.cardNumber || '';
      } else if (overstaySortBy === 'hostMemberName') {
        aVal = a.hostMemberName || '';
        bVal = b.hostMemberName || '';
      } else if (overstaySortBy === 'periodEnd') {
        aVal = new Date(a.periodEnd).getTime() || 0;
        bVal = new Date(b.periodEnd).getTime() || 0;
      } else if (overstaySortBy === 'currentArea') {
        aVal = a.currentArea || '';
        bVal = b.currentArea || '';
      } else if (overstaySortBy === 'overstayDurationMinutes') {
        aVal = a.overstayDurationMinutes ?? 0;
        bVal = b.overstayDurationMinutes ?? 0;
      } else if (overstaySortBy === 'status') {
        aVal = a.status || '';
        bVal = b.status || '';
      }
      if (typeof aVal === 'string') {
        return overstaySortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return overstaySortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [overstayVisitors, overstaySearch, overstaySortBy, overstaySortOrder]);

  // Bottom Left: Hotspots state
  const [hotspotSearch, setHotspotSearch] = useState('');
  const [hotspotSortBy, setHotspotSortBy] = useState<string>('breachCount');
  const [hotspotSortOrder, setHotspotSortOrder] = useState<'asc' | 'desc'>('desc');

  // Bottom Right: Low Battery Cards state
  const [batterySearch, setBatterySearch] = useState('');
  const [batterySortBy, setBatterySortBy] = useState<string>('batteryPercentage');
  const [batterySortOrder, setBatterySortOrder] = useState<'asc' | 'desc'>('asc');

  // Filter & Sort Hotspots
  const filteredHotspots = useMemo(() => {
    let list = breachHotspots;
    if (hotspotSearch.trim()) {
      const q = hotspotSearch.trim().toLowerCase();
      list = list.filter(
        (h) =>
          (h.areaName && h.areaName.toLowerCase().includes(q)) ||
          (h.buildingName && h.buildingName.toLowerCase().includes(q)) ||
          (h.floorName && h.floorName.toLowerCase().includes(q))
      );
    }
    return [...list].sort((a, b) => {
      let aVal: any = '';
      let bVal: any = '';
      if (hotspotSortBy === 'areaName') {
        aVal = a.areaName || '';
        bVal = b.areaName || '';
      } else if (hotspotSortBy === 'isRestrictedArea') {
        aVal = a.isRestrictedArea ? 1 : 0;
        bVal = b.isRestrictedArea ? 1 : 0;
      } else if (hotspotSortBy === 'totalBreaches' || hotspotSortBy === 'breachCount') {
        aVal = a.totalBreaches ?? 0;
        bVal = b.totalBreaches ?? 0;
      }
      if (typeof aVal === 'string') {
        return hotspotSortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return hotspotSortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [breachHotspots, hotspotSearch, hotspotSortBy, hotspotSortOrder]);

  // Filter & Sort Low Battery Cards
  const filteredBatteryCards = useMemo(() => {
    let list = lowBatteryCards;
    if (batterySearch.trim()) {
      const q = batterySearch.trim().toLowerCase();
      list = list.filter(
        (c) =>
          (c.cardNumber && c.cardNumber.toLowerCase().includes(q)) ||
          (c.bleCardNumber && c.bleCardNumber.toLowerCase().includes(q)) ||
          (c.assignedTo && c.assignedTo.toLowerCase().includes(q)) ||
          (c.currentArea && c.currentArea.toLowerCase().includes(q))
      );
    }
    return [...list].sort((a, b) => {
      let aVal: any = '';
      let bVal: any = '';
      if (batterySortBy === 'cardNumber') {
        aVal = a.cardNumber || '';
        bVal = b.cardNumber || '';
      } else if (batterySortBy === 'assignedTo') {
        aVal = a.assignedTo || '';
        bVal = b.assignedTo || '';
      } else if (batterySortBy === 'batteryPercentage') {
        aVal = a.batteryPercentage ?? 0;
        bVal = b.batteryPercentage ?? 0;
      }
      if (typeof aVal === 'string') {
        return batterySortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return batterySortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [lowBatteryCards, batterySearch, batterySortBy, batterySortOrder]);

  // Breach Hotspots Bar Chart
  const hotspotChartOptions: ApexCharts.ApexOptions = useMemo(() => {
    const categories = breachHotspots.slice(0, 6).map((h) => h.areaName || 'Area');
    return {
      chart: {
        type: 'bar',
        height: 260,
        toolbar: { show: false },
        fontFamily: 'inherit',
      },
      plotOptions: {
        bar: {
          horizontal: true,
          borderRadius: 6,
          barHeight: '60%',
          distributed: true,
        },
      },
      colors: ['#EF4444', '#F97316', '#F59E0B', '#3B82F6', '#8B5CF6', '#10B981'],
      dataLabels: {
        enabled: true,
        textAnchor: 'start',
        style: { colors: ['#ffffff'], fontSize: '11px', fontWeight: 600 },
        formatter: (val) => `${val} breaches`,
        offsetX: 5,
      },
      xaxis: {
        categories,
        labels: {
          style: { colors: '#64748B', fontSize: '11px' },
        },
      },
      yaxis: {
        labels: {
          style: { colors: '#1E293B', fontSize: '11px', fontWeight: 600 },
          maxWidth: 160,
        },
      },
      tooltip: {
        theme: 'light',
        y: {
          formatter: (val, opts) => {
            const item = breachHotspots[opts.dataPointIndex];
            return `${val} incident(s) • ${item?.buildingName || ''} (${item?.floorName || ''})`;
          },
        },
      },
      legend: { show: false },
      grid: {
        borderColor: '#F1F5F9',
        strokeDashArray: 3,
      },
    };
  }, [breachHotspots]);

  const hotspotChartSeries = useMemo(() => {
    return [
      {
        name: 'Breaches',
        data: breachHotspots.slice(0, 6).map((h) => h.totalBreaches || 0),
      },
    ];
  }, [breachHotspots]);

  // People on Site Donut Chart
  const peopleDonutOptions: ApexCharts.ApexOptions = useMemo(() => {
    return {
      chart: {
        type: 'donut',
        height: 200,
        fontFamily: 'inherit',
      },
      labels: ['Members', 'Visitors', 'Security'],
      colors: ['#3B82F6', '#10B981', '#F59E0B'],
      legend: { position: 'bottom', fontSize: '11px' },
      dataLabels: { enabled: false },
      plotOptions: {
        pie: {
          donut: {
            size: '72%',
            labels: {
              show: true,
              total: {
                show: true,
                label: 'On-Site',
                fontSize: '12px',
                fontWeight: 600,
                color: '#64748B',
                formatter: () => `${facilitySummary?.totalPeopleOnSite ?? 0}`,
              },
            },
          },
        },
      },
      stroke: { width: 2, colors: ['#ffffff'] },
    };
  }, [facilitySummary]);

  const peopleDonutSeries = useMemo(() => {
    return [
      facilitySummary?.totalMembers ?? 0,
      facilitySummary?.totalVisitors ?? 0,
      facilitySummary?.totalSecurities ?? 0,
    ];
  }, [facilitySummary]);

  if (isLoading) {
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
          <CircularProgress size={36} />
          <Typography variant="body2" color="text.secondary">
            Loading facility-wide global investigation overview...
          </Typography>
        </Stack>
      </Card>
    );
  }

  return (
    <Stack spacing={3} id="global-investigation-overview-root">
      {/* 1. Header Banner & High-Level Metrics */}
      <Card
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '16px',
          p: 3,
          bgcolor: 'background.paper',
          position: 'relative',
        }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', md: 'center' }}
          spacing={2}
          mb={3}
        >
          <Box>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '10px',
                  bgcolor: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#1D4ED8',
                }}
              >
                <IconActivity size={22} />
              </Box>
              <Box>
                <Typography variant="h5" fontWeight={700} color="text.primary">
                  Global Facility Overview
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Live facility-wide security telemetry, occupancy status, and access compliance
                </Typography>
              </Box>
            </Stack>
          </Box>

          <Stack direction="row" spacing={1}>
            <Chip
              icon={<IconClock size={14} color="#2563EB" />}
              label="Timeframe: Today (Daily)"
              size="small"
              sx={{
                bgcolor: '#EFF6FF',
                color: '#1D4ED8',
                border: '1px solid #BFDBFE',
                fontWeight: 600,
                fontSize: '11px',
              }}
            />
          </Stack>
        </Stack>

        {/* Metric Cards Row */}
        <Grid container spacing={2}>
          {/* Total People On-Site */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: '12px',
                bgcolor: '#F8FAFC',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
                    People On-Site
                  </Typography>
                  <Typography variant="h4" fontWeight={700} color="text.primary" mt={0.5}>
                    {facilitySummary?.totalPeopleOnSite ?? 0}
                  </Typography>
                  <Typography variant="caption" color="primary.main" fontWeight={600}>
                    {facilitySummary?.totalMembers ?? 0} Members • {facilitySummary?.totalVisitors ?? 0} Visitors • {facilitySummary?.totalSecurities ?? 0} Securities
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#EFF6FF', color: '#2563EB', width: 44, height: 44 }}>
                  <IconUsers size={22} />
                </Avatar>
              </Stack>
            </Paper>
          </Grid>

          {/* Active Alarms */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: '12px',
                bgcolor: '#FEF2F2',
                border: '1px solid #FECACA',
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" sx={{ color: '#991B1B', fontWeight: 600, textTransform: 'uppercase' }}>
                    Active Alarms
                  </Typography>
                  <Typography variant="h4" fontWeight={700} sx={{ color: '#DC2626' }} mt={0.5}>
                    {facilitySummary?.activeAlarmsCount ?? 0}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#B91C1C', fontWeight: 500 }}>
                    {facilitySummary?.carriedOverAlarmsCount ?? 0} carried over
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#FEE2E2', color: '#DC2626', width: 44, height: 44 }}>
                  <IconShield size={22} />
                </Avatar>
              </Stack>
            </Paper>
          </Grid>

          {/* Security Breaches Today */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: '12px',
                bgcolor: '#FFFBEB',
                border: '1px solid #FDE68A',
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" sx={{ color: '#92400E', fontWeight: 600, textTransform: 'uppercase' }}>
                    Breaches Today
                  </Typography>
                  <Typography variant="h4" fontWeight={700} sx={{ color: '#D97706' }} mt={0.5}>
                    {facilitySummary?.totalBreachesToday ?? 0}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#B45309', fontWeight: 500 }}>
                    Total period: {facilitySummary?.totalBreachesInPeriod ?? 0}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#FEF3C7', color: '#D97706', width: 44, height: 44 }}>
                  <IconAlertTriangle size={22} />
                </Avatar>
              </Stack>
            </Paper>
          </Grid>

          {/* Overstay & Restricted Violations */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: '12px',
                bgcolor: '#F5F3FF',
                border: '1px solid #DDD6FE',
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" sx={{ color: '#5B21B6', fontWeight: 600, textTransform: 'uppercase' }}>
                    Restricted Area Occupants
                  </Typography>
                  <Typography variant="h4" fontWeight={700} sx={{ color: '#7C3AED' }} mt={0.5}>
                    {currentRestrictedOccupants.length}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#6D28D9', fontWeight: 500 }}>
                    {overstayVisitors.length} overstay visitor(s)
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#EDE9FE', color: '#7C3AED', width: 44, height: 44 }}>
                  <IconUserExclamation size={22} />
                </Avatar>
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      </Card>

      {/* 2. Main Content: 2 Columns Layout (Left 3 for Charts, Right 9 for Table) */}
      <Grid container spacing={3}>
        {/* LEFT SECTION (Size 3): Facility Demographics & Top Breach Hotspots */}
        <Grid size={{ xs: 12, md: 3 }}>
          <Stack spacing={3}>
            {/* Facility Demographics Donut */}
            <Card
              elevation={0}
              sx={{
                p: 2.5,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: '16px',
                bgcolor: 'background.paper',
                height: 410,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Typography variant="subtitle2" fontWeight={700} color="text.primary">
                Facility Demographics
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                Occupants currently inside premises
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 0.5, flexShrink: 0 }}>
                <Chart options={peopleDonutOptions} series={peopleDonutSeries} type="donut" width="100%" height={210} />
              </Box>
              <Stack spacing={1} mt="auto">
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#3B82F6' }} />
                    <Typography variant="caption" color="text.secondary">Members</Typography>
                  </Stack>
                  <Typography variant="caption" fontWeight={700} color="text.primary">
                    {facilitySummary?.totalMembers ?? 0}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#10B981' }} />
                    <Typography variant="caption" color="text.secondary">Visitors</Typography>
                  </Stack>
                  <Typography variant="caption" fontWeight={700} color="text.primary">
                    {facilitySummary?.totalVisitors ?? 0}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#F59E0B' }} />
                    <Typography variant="caption" color="text.secondary">Securities</Typography>
                  </Stack>
                  <Typography variant="caption" fontWeight={700} color="text.primary">
                    {facilitySummary?.totalSecurities ?? 0}
                  </Typography>
                </Stack>
              </Stack>
            </Card>

            {/* Top Breach Hotspots Bar Chart */}
            <Card
              elevation={0}
              sx={{
                p: 2.5,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: '16px',
                bgcolor: 'background.paper',
                height: 350,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1} flexShrink={0}>
                <Box>
                  <Typography variant="subtitle2" fontWeight={700} color="text.primary">
                    Top Breach Hotspots
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Areas with highest breach incidents
                  </Typography>
                </Box>
                <Chip
                  icon={<IconFlame size={12} color="#EF4444" />}
                  label={`${breachHotspots.length}`}
                  size="small"
                  sx={{ bgcolor: '#FEE2E2', color: '#DC2626', fontWeight: 700, fontSize: '11px', height: 22 }}
                />
              </Stack>

              {breachHotspots.length === 0 ? (
                <Stack alignItems="center" justifyContent="center" flexGrow={1}>
                  <Typography variant="caption" color="text.secondary">
                    No breach hotspots recorded
                  </Typography>
                </Stack>
              ) : (
                <Box sx={{ mt: 'auto', flexGrow: 1 }}>
                  <Chart options={hotspotChartOptions} series={hotspotChartSeries} type="bar" height={260} />
                </Box>
              )}
            </Card>
          </Stack>
        </Grid>

        {/* RIGHT SECTION (Size 9): Split into Top Card and Bottom 2 Cards */}
        <Grid size={{ xs: 12, md: 9 }}>
          <Stack spacing={3}>
            {/* TOP CARD (Full width of right column, matching height of Facility Demographics):
                Tabs: Restricted Occupants, Access Violators, Overstay Visitors */}
            <Card
              elevation={0}
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: '16px',
                overflow: 'hidden',
                bgcolor: 'background.paper',
                height: 410,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2.5, pt: 1, bgcolor: '#F8FAFC' }}>
                <Tabs
                  value={topTab}
                  onChange={(_, val) => setTopTab(val)}
                  variant="scrollable"
                  scrollButtons="auto"
                  sx={{
                    minHeight: 44,
                    '& .MuiTab-root': {
                      textTransform: 'none',
                      fontWeight: 600,
                      fontSize: '13px',
                      minHeight: 44,
                      py: 0.5,
                    },
                  }}
                >
                  <Tab
                    value="occupants"
                    label={
                      <Stack direction="row" spacing={1} alignItems="center">
                        <span>Restricted Occupants</span>
                        <Chip
                          label={currentRestrictedOccupants.length}
                          size="small"
                          color={currentRestrictedOccupants.length > 0 ? 'error' : 'default'}
                          sx={{ height: 20, fontSize: '11px', fontWeight: 700 }}
                        />
                      </Stack>
                    }
                  />
                  <Tab
                    value="violators"
                    label={
                      <Stack direction="row" spacing={1} alignItems="center">
                        <span>Access Violators</span>
                        <Chip
                          label={topAccessViolators.length}
                          size="small"
                          color={topAccessViolators.length > 0 ? 'warning' : 'default'}
                          sx={{ height: 20, fontSize: '11px', fontWeight: 700 }}
                        />
                      </Stack>
                    }
                  />
                  <Tab
                    value="overstay"
                    label={
                      <Stack direction="row" spacing={1} alignItems="center">
                        <span>Overstay Visitors</span>
                        <Chip
                          label={overstayVisitors.length}
                          size="small"
                          color={overstayVisitors.length > 0 ? 'error' : 'default'}
                          sx={{ height: 20, fontSize: '11px', fontWeight: 700 }}
                        />
                      </Stack>
                    }
                  />
                </Tabs>
              </Box>

              <Box sx={{ p: 2, flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* TAB 1: RESTRICTED OCCUPANTS */}
                {topTab === 'occupants' && (
                  <Stack spacing={1.5} sx={{ height: '100%', overflow: 'hidden' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="caption" color="text.secondary" fontWeight={500}>
                        People currently located inside restricted designated zones
                      </Typography>
                      <TextField
                        placeholder="Search occupant or area..."
                        size="small"
                        value={occupantSearch}
                        onChange={(e) => {
                          setOccupantSearch(e.target.value);
                          setOccupantPage(0);
                        }}
                        slotProps={{
                          input: {
                            startAdornment: (
                              <InputAdornment position="start">
                                <IconSearch size={14} />
                              </InputAdornment>
                            ),
                          },
                        }}
                        sx={{ width: 220, '& .MuiInputBase-input': { py: 0.5, fontSize: '12px' } }}
                      />
                    </Stack>

                    <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '10px', flexGrow: 1, overflowY: 'auto' }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow sx={{ '& th': { bgcolor: '#F8FAFC', fontWeight: 700, fontSize: '11px', py: 0.8 } }}>
                            <TableCell>
                              <TableSortLabel
                                active={occupantSortBy === 'personName'}
                                direction={occupantSortBy === 'personName' ? occupantSortOrder : 'asc'}
                                onClick={() => {
                                  if (occupantSortBy === 'personName') {
                                    setOccupantSortOrder(occupantSortOrder === 'asc' ? 'desc' : 'asc');
                                  } else {
                                    setOccupantSortBy('personName');
                                    setOccupantSortOrder('asc');
                                  }
                                }}
                              >
                                Occupant
                              </TableSortLabel>
                            </TableCell>
                            <TableCell>Type / Card</TableCell>
                            <TableCell>
                              <TableSortLabel
                                active={occupantSortBy === 'areaName'}
                                direction={occupantSortBy === 'areaName' ? occupantSortOrder : 'asc'}
                                onClick={() => {
                                  if (occupantSortBy === 'areaName') {
                                    setOccupantSortOrder(occupantSortOrder === 'asc' ? 'desc' : 'asc');
                                  } else {
                                    setOccupantSortBy('areaName');
                                    setOccupantSortOrder('asc');
                                  }
                                }}
                              >
                                Restricted Area
                              </TableSortLabel>
                            </TableCell>
                            <TableCell>
                              <TableSortLabel
                                active={occupantSortBy === 'enteredAt'}
                                direction={occupantSortBy === 'enteredAt' ? occupantSortOrder : 'desc'}
                                onClick={() => {
                                  if (occupantSortBy === 'enteredAt') {
                                    setOccupantSortOrder(occupantSortOrder === 'asc' ? 'desc' : 'asc');
                                  } else {
                                    setOccupantSortBy('enteredAt');
                                    setOccupantSortOrder('desc');
                                  }
                                }}
                              >
                                Entered At
                              </TableSortLabel>
                            </TableCell>
                            <TableCell align="right">
                              <TableSortLabel
                                active={occupantSortBy === 'stayMinutes'}
                                direction={occupantSortBy === 'stayMinutes' ? occupantSortOrder : 'desc'}
                                onClick={() => {
                                  if (occupantSortBy === 'stayMinutes') {
                                    setOccupantSortOrder(occupantSortOrder === 'asc' ? 'desc' : 'asc');
                                  } else {
                                    setOccupantSortBy('stayMinutes');
                                    setOccupantSortOrder('desc');
                                  }
                                }}
                              >
                                Duration
                              </TableSortLabel>
                            </TableCell>
                            <TableCell align="center">
                              <TableSortLabel
                                active={occupantSortBy === 'hasAccessPermission'}
                                direction={occupantSortBy === 'hasAccessPermission' ? occupantSortOrder : 'asc'}
                                onClick={() => {
                                  if (occupantSortBy === 'hasAccessPermission') {
                                    setOccupantSortOrder(occupantSortOrder === 'asc' ? 'desc' : 'asc');
                                  } else {
                                    setOccupantSortBy('hasAccessPermission');
                                    setOccupantSortOrder('asc');
                                  }
                                }}
                              >
                                Permission
                              </TableSortLabel>
                            </TableCell>
                            <TableCell align="center">
                              <TableSortLabel
                                active={occupantSortBy === 'alarmStatus'}
                                direction={occupantSortBy === 'alarmStatus' ? occupantSortOrder : 'asc'}
                                onClick={() => {
                                  if (occupantSortBy === 'alarmStatus') {
                                    setOccupantSortOrder(occupantSortOrder === 'asc' ? 'desc' : 'asc');
                                  } else {
                                    setOccupantSortBy('alarmStatus');
                                    setOccupantSortOrder('asc');
                                  }
                                }}
                              >
                                Alarm Status
                              </TableSortLabel>
                            </TableCell>
                            {onSelectPerson && <TableCell align="center">Action</TableCell>}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {filteredOccupants.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                                <Typography variant="caption" color="text.secondary">
                                  No restricted area occupants matching criteria
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ) : (
                            filteredOccupants
                              .slice(occupantPage * occupantRowsPerPage, occupantPage * occupantRowsPerPage + occupantRowsPerPage)
                              .map((occ) => {
                                const avatar = normalizeImageUrl(occ.faceImage);
                                return (
                                  <TableRow key={occ.personId} hover sx={{ '& td': { py: 0.75 } }}>
                                    <TableCell>
                                      <Stack direction="row" spacing={1} alignItems="center">
                                        <Avatar src={avatar} sx={{ width: 28, height: 28, bgcolor: '#DBEAFE', color: '#1E40AF', fontSize: '11px', fontWeight: 700 }}>
                                          {occ.personName?.charAt(0) || 'P'}
                                        </Avatar>
                                        <Box>
                                          <Typography variant="body2" fontWeight={600} color="text.primary" sx={{ fontSize: '12px' }}>
                                            {occ.personName}
                                          </Typography>
                                        </Box>
                                      </Stack>
                                    </TableCell>
                                    <TableCell>
                                      <Typography variant="caption" fontWeight={600} color="text.primary" display="block">
                                        {occ.personType || 'Member'}
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '10px' }}>
                                        {occ.cardNumber || '-'}
                                      </Typography>
                                    </TableCell>
                                    <TableCell>
                                      <Typography variant="caption" fontWeight={600} color="text.primary" display="block">
                                        {occ.areaName}
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '10px' }}>
                                        {occ.floorName}
                                      </Typography>
                                    </TableCell>
                                    <TableCell>
                                      <Typography variant="caption" color="text.secondary">
                                        {dayjs(occ.enteredAt).format('MMM D, HH:mm')}
                                      </Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                      <Typography variant="caption" fontWeight={700} color="text.primary">
                                        {occ.stayFormatted || `${occ.stayMinutes}m`}
                                      </Typography>
                                    </TableCell>
                                    <TableCell align="center">
                                      <Chip
                                        icon={occ.hasAccessPermission ? <IconShieldCheck size={12} /> : <IconShieldX size={12} />}
                                        label={occ.hasAccessPermission ? 'Auth' : 'Unauth'}
                                        size="small"
                                        sx={{
                                          height: 20,
                                          fontSize: '10px',
                                          fontWeight: 700,
                                          bgcolor: occ.hasAccessPermission ? '#DCFCE7' : '#FEE2E2',
                                          color: occ.hasAccessPermission ? '#15803D' : '#DC2626',
                                        }}
                                      />
                                    </TableCell>
                                    <TableCell align="center">
                                      <Chip
                                        label={occ.alarmStatus || 'Normal'}
                                        size="small"
                                        sx={{
                                          height: 20,
                                          fontSize: '10px',
                                          fontWeight: 700,
                                          bgcolor: occ.alarmStatus === 'Active' ? '#FEE2E2' : '#F1F5F9',
                                          color: occ.alarmStatus === 'Active' ? '#DC2626' : '#64748B',
                                        }}
                                      />
                                    </TableCell>
                                    {onSelectPerson && (
                                      <TableCell align="center">
                                        <Tooltip title="Investigate this Person">
                                          <Chip
                                            label="Investigate"
                                            clickable
                                            size="small"
                                            color="primary"
                                            onClick={() => onSelectPerson(occ.personId)}
                                            sx={{ fontWeight: 600, fontSize: '10px', height: 22 }}
                                          />
                                        </Tooltip>
                                      </TableCell>
                                    )}
                                  </TableRow>
                                );
                              })
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>

                    {filteredOccupants.length > 0 && (
                      <TablePagination
                        rowsPerPageOptions={[5, 10, 15]}
                        component="div"
                        count={filteredOccupants.length}
                        rowsPerPage={occupantRowsPerPage}
                        page={occupantPage}
                        onPageChange={(_, p) => setOccupantPage(p)}
                        onRowsPerPageChange={(e) => {
                          setOccupantRowsPerPage(parseInt(e.target.value, 10));
                          setOccupantPage(0);
                        }}
                        sx={{ borderTop: 'none', py: 0, '& .MuiTablePagination-toolbar': { minHeight: 32 } }}
                      />
                    )}
                  </Stack>
                )}

                {/* TAB 2: TOP ACCESS VIOLATORS */}
                {topTab === 'violators' && (
                  <Stack spacing={1.5} sx={{ height: '100%', overflow: 'hidden' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="caption" color="text.secondary" fontWeight={500}>
                        Individuals with highest unauthorized entry attempts and triggered alarms
                      </Typography>
                      <TextField
                        placeholder="Search violator or area..."
                        size="small"
                        value={violatorSearch}
                        onChange={(e) => {
                          setViolatorSearch(e.target.value);
                          setViolatorPage(0);
                        }}
                        slotProps={{
                          input: {
                            startAdornment: (
                              <InputAdornment position="start">
                                <IconSearch size={14} />
                              </InputAdornment>
                            ),
                          },
                        }}
                        sx={{ width: 220, '& .MuiInputBase-input': { py: 0.5, fontSize: '12px' } }}
                      />
                    </Stack>

                    <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '10px', flexGrow: 1, overflowY: 'auto' }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow sx={{ '& th': { bgcolor: '#F8FAFC', fontWeight: 700, fontSize: '11px', py: 0.8 } }}>
                            <TableCell>
                              <TableSortLabel
                                active={violatorSortBy === 'personName'}
                                direction={violatorSortBy === 'personName' ? violatorSortOrder : 'asc'}
                                onClick={() => {
                                  if (violatorSortBy === 'personName') {
                                    setViolatorSortOrder(violatorSortOrder === 'asc' ? 'desc' : 'asc');
                                  } else {
                                    setViolatorSortBy('personName');
                                    setViolatorSortOrder('asc');
                                  }
                                }}
                              >
                                Person
                              </TableSortLabel>
                            </TableCell>
                            <TableCell>
                              <TableSortLabel
                                active={violatorSortBy === 'department'}
                                direction={violatorSortBy === 'department' ? violatorSortOrder : 'asc'}
                                onClick={() => {
                                  if (violatorSortBy === 'department') {
                                    setViolatorSortOrder(violatorSortOrder === 'asc' ? 'desc' : 'asc');
                                  } else {
                                    setViolatorSortBy('department');
                                    setViolatorSortOrder('asc');
                                  }
                                }}
                              >
                                Type / Department
                              </TableSortLabel>
                            </TableCell>
                            <TableCell>
                              <TableSortLabel
                                active={violatorSortBy === 'activeCard'}
                                direction={violatorSortBy === 'activeCard' ? violatorSortOrder : 'asc'}
                                onClick={() => {
                                  if (violatorSortBy === 'activeCard') {
                                    setViolatorSortOrder(violatorSortOrder === 'asc' ? 'desc' : 'asc');
                                  } else {
                                    setViolatorSortBy('activeCard');
                                    setViolatorSortOrder('asc');
                                  }
                                }}
                              >
                                Active Card
                              </TableSortLabel>
                            </TableCell>
                            <TableCell align="center">
                              <TableSortLabel
                                active={violatorSortBy === 'totalAlarmsTriggered'}
                                direction={violatorSortBy === 'totalAlarmsTriggered' ? violatorSortOrder : 'desc'}
                                onClick={() => {
                                  if (violatorSortBy === 'totalAlarmsTriggered') {
                                    setViolatorSortOrder(violatorSortOrder === 'asc' ? 'desc' : 'asc');
                                  } else {
                                    setViolatorSortBy('totalAlarmsTriggered');
                                    setViolatorSortOrder('desc');
                                  }
                                }}
                              >
                                Alarms Triggered
                              </TableSortLabel>
                            </TableCell>
                            <TableCell align="center">
                              <TableSortLabel
                                active={violatorSortBy === 'unauthorizedAccessCount'}
                                direction={violatorSortBy === 'unauthorizedAccessCount' ? violatorSortOrder : 'desc'}
                                onClick={() => {
                                  if (violatorSortBy === 'unauthorizedAccessCount') {
                                    setViolatorSortOrder(violatorSortOrder === 'asc' ? 'desc' : 'asc');
                                  } else {
                                    setViolatorSortBy('unauthorizedAccessCount');
                                    setViolatorSortOrder('desc');
                                  }
                                }}
                              >
                                Unauthorized Access
                              </TableSortLabel>
                            </TableCell>
                            <TableCell>
                              <TableSortLabel
                                active={violatorSortBy === 'mostViolatedArea'}
                                direction={violatorSortBy === 'mostViolatedArea' ? violatorSortOrder : 'asc'}
                                onClick={() => {
                                  if (violatorSortBy === 'mostViolatedArea') {
                                    setViolatorSortOrder(violatorSortOrder === 'asc' ? 'desc' : 'asc');
                                  } else {
                                    setViolatorSortBy('mostViolatedArea');
                                    setViolatorSortOrder('asc');
                                  }
                                }}
                              >
                                Most Violated Area
                              </TableSortLabel>
                            </TableCell>
                            <TableCell>
                              <TableSortLabel
                                active={violatorSortBy === 'lastViolationAt'}
                                direction={violatorSortBy === 'lastViolationAt' ? violatorSortOrder : 'desc'}
                                onClick={() => {
                                  if (violatorSortBy === 'lastViolationAt') {
                                    setViolatorSortOrder(violatorSortOrder === 'asc' ? 'desc' : 'asc');
                                  } else {
                                    setViolatorSortBy('lastViolationAt');
                                    setViolatorSortOrder('desc');
                                  }
                                }}
                              >
                                Last Violation
                              </TableSortLabel>
                            </TableCell>
                            {onSelectPerson && <TableCell align="center">Action</TableCell>}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {filteredViolators.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                                <Typography variant="caption" color="text.secondary">
                                  No access violators found
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ) : (
                            filteredViolators
                              .slice(violatorPage * violatorRowsPerPage, violatorPage * violatorRowsPerPage + violatorRowsPerPage)
                              .map((violator) => {
                                const avatar = normalizeImageUrl(violator.faceImage);
                                return (
                                  <TableRow key={violator.personId} hover sx={{ '& td': { py: 0.75 } }}>
                                    <TableCell>
                                      <Stack direction="row" spacing={1} alignItems="center">
                                        <Avatar src={avatar} sx={{ width: 28, height: 28, bgcolor: '#FEE2E2', color: '#DC2626', fontSize: '11px', fontWeight: 700 }}>
                                          {violator.personName?.charAt(0) || 'V'}
                                        </Avatar>
                                        <Typography variant="body2" fontWeight={600} color="text.primary" sx={{ fontSize: '12px' }}>
                                          {violator.personName}
                                        </Typography>
                                      </Stack>
                                    </TableCell>
                                    <TableCell>
                                      <Typography variant="caption" fontWeight={600} color="text.primary" display="block">
                                        {violator.personType}
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '10px' }}>
                                        {violator.department || '-'}
                                      </Typography>
                                    </TableCell>
                                    <TableCell>
                                      <Chip
                                        label={violator.activeCard}
                                        size="small"
                                        variant="outlined"
                                        sx={{ height: 20, fontSize: '10px', fontWeight: 600 }}
                                      />
                                    </TableCell>
                                    <TableCell align="center">
                                      <Chip
                                        label={`${violator.totalAlarmsTriggered}`}
                                        size="small"
                                        sx={{
                                          height: 20,
                                          fontSize: '10px',
                                          fontWeight: 700,
                                          bgcolor: '#FEE2E2',
                                          color: '#DC2626',
                                        }}
                                      />
                                    </TableCell>
                                    <TableCell align="center">
                                      <Typography variant="caption" fontWeight={700} color="error.main">
                                        {violator.unauthorizedAccessCount}x
                                      </Typography>
                                    </TableCell>
                                    <TableCell>
                                      <Typography variant="caption" fontWeight={600} color="text.primary">
                                        {violator.mostViolatedArea}
                                      </Typography>
                                    </TableCell>
                                    <TableCell>
                                      <Typography variant="caption" color="text.secondary">
                                        {dayjs(violator.lastViolationAt).format('MMM D, HH:mm')}
                                      </Typography>
                                    </TableCell>
                                    {onSelectPerson && (
                                      <TableCell align="center">
                                        <Tooltip title="Investigate this Person">
                                          <Chip
                                            label="Investigate"
                                            clickable
                                            size="small"
                                            color="primary"
                                            onClick={() => onSelectPerson(violator.personId)}
                                            sx={{ fontWeight: 600, fontSize: '10px', height: 22 }}
                                          />
                                        </Tooltip>
                                      </TableCell>
                                    )}
                                  </TableRow>
                                );
                              })
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>

                    {filteredViolators.length > 0 && (
                      <TablePagination
                        rowsPerPageOptions={[5, 10, 15]}
                        component="div"
                        count={filteredViolators.length}
                        rowsPerPage={violatorRowsPerPage}
                        page={violatorPage}
                        onPageChange={(_, p) => setViolatorPage(p)}
                        onRowsPerPageChange={(e) => {
                          setViolatorRowsPerPage(parseInt(e.target.value, 10));
                          setViolatorPage(0);
                        }}
                        sx={{ borderTop: 'none', py: 0, '& .MuiTablePagination-toolbar': { minHeight: 32 } }}
                      />
                    )}
                  </Stack>
                )}

                {/* TAB 3: OVERSTAY VISITORS */}
                {topTab === 'overstay' && (
                  <Stack spacing={1.5} sx={{ height: '100%', overflow: 'hidden' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="caption" color="text.secondary" fontWeight={500}>
                        Visitors whose allocated stay duration has exceeded the authorized schedule
                      </Typography>
                      <TextField
                        placeholder="Search visitor, host, card..."
                        size="small"
                        value={overstaySearch}
                        onChange={(e) => {
                          setOverstaySearch(e.target.value);
                          setOverstayPage(0);
                        }}
                        slotProps={{
                          input: {
                            startAdornment: (
                              <InputAdornment position="start">
                                <IconSearch size={14} />
                              </InputAdornment>
                            ),
                          },
                        }}
                        sx={{ width: 220, '& .MuiInputBase-input': { py: 0.5, fontSize: '12px' } }}
                      />
                    </Stack>

                    <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '10px', flexGrow: 1, overflowY: 'auto' }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow sx={{ '& th': { bgcolor: '#F8FAFC', fontWeight: 700, fontSize: '11px', py: 0.8 } }}>
                            <TableCell>
                              <TableSortLabel
                                active={overstaySortBy === 'visitorName'}
                                direction={overstaySortBy === 'visitorName' ? overstaySortOrder : 'asc'}
                                onClick={() => {
                                  if (overstaySortBy === 'visitorName') {
                                    setOverstaySortOrder(overstaySortOrder === 'asc' ? 'desc' : 'asc');
                                  } else {
                                    setOverstaySortBy('visitorName');
                                    setOverstaySortOrder('asc');
                                  }
                                }}
                              >
                                Visitor
                              </TableSortLabel>
                            </TableCell>
                            <TableCell>
                              <TableSortLabel
                                active={overstaySortBy === 'cardNumber'}
                                direction={overstaySortBy === 'cardNumber' ? overstaySortOrder : 'asc'}
                                onClick={() => {
                                  if (overstaySortBy === 'cardNumber') {
                                    setOverstaySortOrder(overstaySortOrder === 'asc' ? 'desc' : 'asc');
                                  } else {
                                    setOverstaySortBy('cardNumber');
                                    setOverstaySortOrder('asc');
                                  }
                                }}
                              >
                                Card
                              </TableSortLabel>
                            </TableCell>
                            <TableCell>
                              <TableSortLabel
                                active={overstaySortBy === 'hostMemberName'}
                                direction={overstaySortBy === 'hostMemberName' ? overstaySortOrder : 'asc'}
                                onClick={() => {
                                  if (overstaySortBy === 'hostMemberName') {
                                    setOverstaySortOrder(overstaySortOrder === 'asc' ? 'desc' : 'asc');
                                  } else {
                                    setOverstaySortBy('hostMemberName');
                                    setOverstaySortOrder('asc');
                                  }
                                }}
                              >
                                Host Member
                              </TableSortLabel>
                            </TableCell>
                            <TableCell>
                              <TableSortLabel
                                active={overstaySortBy === 'periodEnd'}
                                direction={overstaySortBy === 'periodEnd' ? overstaySortOrder : 'desc'}
                                onClick={() => {
                                  if (overstaySortBy === 'periodEnd') {
                                    setOverstaySortOrder(overstaySortOrder === 'asc' ? 'desc' : 'asc');
                                  } else {
                                    setOverstaySortBy('periodEnd');
                                    setOverstaySortOrder('desc');
                                  }
                                }}
                              >
                                Period End Time
                              </TableSortLabel>
                            </TableCell>
                            <TableCell>
                              <TableSortLabel
                                active={overstaySortBy === 'currentArea'}
                                direction={overstaySortBy === 'currentArea' ? overstaySortOrder : 'asc'}
                                onClick={() => {
                                  if (overstaySortBy === 'currentArea') {
                                    setOverstaySortOrder(overstaySortOrder === 'asc' ? 'desc' : 'asc');
                                  } else {
                                    setOverstaySortBy('currentArea');
                                    setOverstaySortOrder('asc');
                                  }
                                }}
                              >
                                Current Area
                              </TableSortLabel>
                            </TableCell>
                            <TableCell align="right">
                              <TableSortLabel
                                active={overstaySortBy === 'overstayDurationMinutes'}
                                direction={overstaySortBy === 'overstayDurationMinutes' ? overstaySortOrder : 'desc'}
                                onClick={() => {
                                  if (overstaySortBy === 'overstayDurationMinutes') {
                                    setOverstaySortOrder(overstaySortOrder === 'asc' ? 'desc' : 'asc');
                                  } else {
                                    setOverstaySortBy('overstayDurationMinutes');
                                    setOverstaySortOrder('desc');
                                  }
                                }}
                              >
                                Overstay Duration
                              </TableSortLabel>
                            </TableCell>
                            <TableCell align="center">
                              <TableSortLabel
                                active={overstaySortBy === 'status'}
                                direction={overstaySortBy === 'status' ? overstaySortOrder : 'asc'}
                                onClick={() => {
                                  if (overstaySortBy === 'status') {
                                    setOverstaySortOrder(overstaySortOrder === 'asc' ? 'desc' : 'asc');
                                  } else {
                                    setOverstaySortBy('status');
                                    setOverstaySortOrder('asc');
                                  }
                                }}
                              >
                                Status
                              </TableSortLabel>
                            </TableCell>
                            {onSelectPerson && <TableCell align="center">Action</TableCell>}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {filteredOverstay.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                                <Typography variant="caption" color="text.secondary">
                                  No overstay visitors currently detected
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ) : (
                            filteredOverstay
                              .slice(overstayPage * overstayRowsPerPage, overstayPage * overstayRowsPerPage + overstayRowsPerPage)
                              .map((v) => {
                                const avatar = normalizeImageUrl(v.faceImage);
                                return (
                                  <TableRow key={v.visitorId} hover sx={{ '& td': { py: 0.75 } }}>
                                    <TableCell>
                                      <Stack direction="row" spacing={1} alignItems="center">
                                        <Avatar src={avatar} sx={{ width: 28, height: 28, bgcolor: '#FEE2E2', color: '#DC2626', fontSize: '11px', fontWeight: 700 }}>
                                          {v.visitorName?.charAt(0) || 'V'}
                                        </Avatar>
                                        <Typography variant="body2" fontWeight={600} color="text.primary" sx={{ fontSize: '12px' }}>
                                          {v.visitorName}
                                        </Typography>
                                      </Stack>
                                    </TableCell>
                                    <TableCell>
                                      <Chip label={v.cardNumber} size="small" variant="outlined" sx={{ height: 20, fontSize: '10px', fontWeight: 600 }} />
                                    </TableCell>
                                    <TableCell>
                                      <Typography variant="caption" color="text.secondary">
                                        {v.hostMemberName || 'None'}
                                      </Typography>
                                    </TableCell>
                                    <TableCell>
                                      <Typography variant="caption" color="text.secondary">
                                        {dayjs(v.periodEnd).format('MMM D, HH:mm')}
                                      </Typography>
                                    </TableCell>
                                    <TableCell>
                                      <Typography variant="caption" fontWeight={600} color="text.primary">
                                        {v.currentArea || '-'}
                                      </Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                      <Typography variant="caption" fontWeight={700} color="error.main">
                                        {v.overstayDurationFormatted || `${v.overstayDurationMinutes}m`}
                                      </Typography>
                                    </TableCell>
                                    <TableCell align="center">
                                      <Chip
                                        label={v.status || 'Overstayed'}
                                        size="small"
                                        sx={{ height: 20, fontSize: '10px', fontWeight: 700, bgcolor: '#FEE2E2', color: '#DC2626' }}
                                      />
                                    </TableCell>
                                    {onSelectPerson && (
                                      <TableCell align="center">
                                        <Tooltip title="Investigate this Visitor">
                                          <Chip
                                            label="Investigate"
                                            clickable
                                            size="small"
                                            color="primary"
                                            onClick={() => onSelectPerson(v.visitorId)}
                                            sx={{ fontWeight: 600, fontSize: '10px', height: 22 }}
                                          />
                                        </Tooltip>
                                      </TableCell>
                                    )}
                                  </TableRow>
                                );
                              })
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>

                    {filteredOverstay.length > 0 && (
                      <TablePagination
                        rowsPerPageOptions={[5, 10, 15]}
                        component="div"
                        count={filteredOverstay.length}
                        rowsPerPage={overstayRowsPerPage}
                        page={overstayPage}
                        onPageChange={(_, p) => setOverstayPage(p)}
                        onRowsPerPageChange={(e) => {
                          setOverstayRowsPerPage(parseInt(e.target.value, 10));
                          setOverstayPage(0);
                        }}
                        sx={{ borderTop: 'none', py: 0, '& .MuiTablePagination-toolbar': { minHeight: 32 } }}
                      />
                    )}
                  </Stack>
                )}
              </Box>
            </Card>

            {/* BOTTOM SECTION (Same height as Top Breach Hotspots):
                Left half is Hotspots table, Right half is Low Battery Cards table */}
            <Grid container spacing={2.5}>
              {/* Bottom Left Card: Hotspots */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <Card
                  elevation={0}
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: '16px',
                    bgcolor: 'background.paper',
                    height: 350,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                  }}
                >
                  <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2, py: 1.25, bgcolor: '#F8FAFC' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="subtitle2" fontWeight={700} color="text.primary">
                          Hotspots
                        </Typography>
                        <Chip
                          label={breachHotspots.length}
                          size="small"
                          sx={{ height: 20, fontSize: '11px', fontWeight: 700 }}
                        />
                      </Stack>
                      <TextField
                        placeholder="Search area..."
                        size="small"
                        value={hotspotSearch}
                        onChange={(e) => setHotspotSearch(e.target.value)}
                        slotProps={{
                          input: {
                            startAdornment: (
                              <InputAdornment position="start">
                                <IconSearch size={13} />
                              </InputAdornment>
                            ),
                          },
                        }}
                        sx={{ width: 150, '& .MuiInputBase-input': { py: 0.35, fontSize: '11px' } }}
                      />
                    </Stack>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      Areas with recorded policy and physical boundary breach events
                    </Typography>
                  </Box>

                  <Box sx={{ p: 1.5, flexGrow: 1, overflowY: 'auto' }}>
                    <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '10px' }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow sx={{ '& th': { bgcolor: '#F8FAFC', fontWeight: 700, fontSize: '11px', py: 0.8 } }}>
                            <TableCell>
                              <TableSortLabel
                                active={hotspotSortBy === 'areaName'}
                                direction={hotspotSortBy === 'areaName' ? hotspotSortOrder : 'asc'}
                                onClick={() => {
                                  if (hotspotSortBy === 'areaName') {
                                    setHotspotSortOrder(hotspotSortOrder === 'asc' ? 'desc' : 'asc');
                                  } else {
                                    setHotspotSortBy('areaName');
                                    setHotspotSortOrder('asc');
                                  }
                                }}
                              >
                                Area
                              </TableSortLabel>
                            </TableCell>
                            <TableCell align="center">
                              <TableSortLabel
                                active={hotspotSortBy === 'isRestrictedArea'}
                                direction={hotspotSortBy === 'isRestrictedArea' ? hotspotSortOrder : 'desc'}
                                onClick={() => {
                                  if (hotspotSortBy === 'isRestrictedArea') {
                                    setHotspotSortOrder(hotspotSortOrder === 'asc' ? 'desc' : 'asc');
                                  } else {
                                    setHotspotSortBy('isRestrictedArea');
                                    setHotspotSortOrder('desc');
                                  }
                                }}
                              >
                                Type
                              </TableSortLabel>
                            </TableCell>
                            <TableCell align="right">
                              <TableSortLabel
                                active={hotspotSortBy === 'breachCount'}
                                direction={hotspotSortBy === 'breachCount' ? hotspotSortOrder : 'desc'}
                                onClick={() => {
                                  if (hotspotSortBy === 'breachCount') {
                                    setHotspotSortOrder(hotspotSortOrder === 'asc' ? 'desc' : 'asc');
                                  } else {
                                    setHotspotSortBy('breachCount');
                                    setHotspotSortOrder('desc');
                                  }
                                }}
                              >
                                Breaches
                              </TableSortLabel>
                            </TableCell>
                            {onSelectArea && <TableCell align="center">Action</TableCell>}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {filteredHotspots.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                                <Typography variant="caption" color="text.secondary">
                                  No breach hotspots
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ) : (
                            filteredHotspots.map((hotspot) => (
                              <TableRow key={hotspot.areaId} hover sx={{ '& td': { py: 0.7 } }}>
                                <TableCell>
                                  <Typography variant="body2" fontWeight={600} color="text.primary" sx={{ fontSize: '12px' }}>
                                    {hotspot.areaName}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '10px' }}>
                                    {hotspot.buildingName} • {hotspot.floorName}
                                  </Typography>
                                </TableCell>
                                <TableCell align="center">
                                  <Chip
                                    label={hotspot.isRestrictedArea ? 'Restricted' : 'Standard'}
                                    size="small"
                                    sx={{
                                      height: 18,
                                      fontSize: '9px',
                                      fontWeight: 700,
                                      bgcolor: hotspot.isRestrictedArea ? '#FEE2E2' : '#F1F5F9',
                                      color: hotspot.isRestrictedArea ? '#DC2626' : '#64748B',
                                    }}
                                  />
                                </TableCell>
                                <TableCell align="right">
                                  <Typography variant="body2" fontWeight={700} color="error.main">
                                    {hotspot.totalBreaches}
                                  </Typography>
                                </TableCell>
                                {onSelectArea && (
                                  <TableCell align="center">
                                    <Tooltip title="Investigate this Area">
                                      <Chip
                                        label="View"
                                        clickable
                                        size="small"
                                        color="primary"
                                        onClick={() => onSelectArea(hotspot.areaId)}
                                        sx={{ fontWeight: 600, fontSize: '10px', height: 20 }}
                                      />
                                    </Tooltip>
                                  </TableCell>
                                )}
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                </Card>
              </Grid>

              {/* Bottom Right Card: Low Battery Cards */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <Card
                  elevation={0}
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: '16px',
                    bgcolor: 'background.paper',
                    height: 350,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                  }}
                >
                  <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2, py: 1.25, bgcolor: '#F8FAFC' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="subtitle2" fontWeight={700} color="text.primary">
                          Low Battery Cards
                        </Typography>
                        <Chip
                          label={lowBatteryCards.length}
                          size="small"
                          color={lowBatteryCards.length > 0 ? 'warning' : 'default'}
                          sx={{ height: 20, fontSize: '11px', fontWeight: 700 }}
                        />
                      </Stack>
                      <TextField
                        placeholder="Search card, holder..."
                        size="small"
                        value={batterySearch}
                        onChange={(e) => setBatterySearch(e.target.value)}
                        slotProps={{
                          input: {
                            startAdornment: (
                              <InputAdornment position="start">
                                <IconSearch size={13} />
                              </InputAdornment>
                            ),
                          },
                        }}
                        sx={{ width: 150, '& .MuiInputBase-input': { py: 0.35, fontSize: '11px' } }}
                      />
                    </Stack>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      Active cards currently operating with low battery levels requiring charge
                    </Typography>
                  </Box>

                  <Box sx={{ p: 1.5, flexGrow: 1, overflowY: 'auto' }}>
                    <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '10px' }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow sx={{ '& th': { bgcolor: '#F8FAFC', fontWeight: 700, fontSize: '11px', py: 0.8 } }}>
                            <TableCell>
                              <TableSortLabel
                                active={batterySortBy === 'cardNumber'}
                                direction={batterySortBy === 'cardNumber' ? batterySortOrder : 'asc'}
                                onClick={() => {
                                  if (batterySortBy === 'cardNumber') {
                                    setBatterySortOrder(batterySortOrder === 'asc' ? 'desc' : 'asc');
                                  } else {
                                    setBatterySortBy('cardNumber');
                                    setBatterySortOrder('asc');
                                  }
                                }}
                              >
                                Card / MAC
                              </TableSortLabel>
                            </TableCell>
                            <TableCell>
                              <TableSortLabel
                                active={batterySortBy === 'assignedTo'}
                                direction={batterySortBy === 'assignedTo' ? batterySortOrder : 'asc'}
                                onClick={() => {
                                  if (batterySortBy === 'assignedTo') {
                                    setBatterySortOrder(batterySortOrder === 'asc' ? 'desc' : 'asc');
                                  } else {
                                    setBatterySortBy('assignedTo');
                                    setBatterySortOrder('asc');
                                  }
                                }}
                              >
                                Holder
                              </TableSortLabel>
                            </TableCell>
                            <TableCell align="right">
                              <TableSortLabel
                                active={batterySortBy === 'batteryPercentage'}
                                direction={batterySortBy === 'batteryPercentage' ? batterySortOrder : 'asc'}
                                onClick={() => {
                                  if (batterySortBy === 'batteryPercentage') {
                                    setBatterySortOrder(batterySortOrder === 'asc' ? 'desc' : 'asc');
                                  } else {
                                    setBatterySortBy('batteryPercentage');
                                    setBatterySortOrder('asc');
                                  }
                                }}
                              >
                                Battery
                              </TableSortLabel>
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {filteredBatteryCards.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={3} align="center" sx={{ py: 3 }}>
                                <Typography variant="caption" color="text.secondary">
                                  No low battery cards
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ) : (
                            filteredBatteryCards.map((card) => (
                              <TableRow key={card.cardId} hover sx={{ '& td': { py: 0.7 } }}>
                                <TableCell>
                                  <Typography variant="body2" fontWeight={700} color="text.primary" sx={{ fontSize: '12px' }}>
                                    {card.cardNumber}
                                  </Typography>
                                  <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary', fontSize: '10px' }}>
                                    {card.bleCardNumber}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="caption" fontWeight={600} color="text.primary" display="block">
                                    {card.assignedTo || 'Unassigned'}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '10px' }}>
                                    {card.currentArea || 'Unknown'}
                                  </Typography>
                                </TableCell>
                                <TableCell align="right">
                                  <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end">
                                    <IconBattery
                                      size={15}
                                      color={card.batteryPercentage <= 20 ? '#EF4444' : card.batteryPercentage <= 50 ? '#F59E0B' : '#10B981'}
                                    />
                                    <Typography
                                      variant="caption"
                                      fontWeight={700}
                                      color={card.batteryPercentage <= 20 ? 'error.main' : card.batteryPercentage <= 50 ? 'warning.main' : 'success.main'}
                                    >
                                      {card.batteryPercentage}%
                                    </Typography>
                                  </Stack>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                </Card>
              </Grid>
            </Grid>
          </Stack>
        </Grid>
      </Grid>
    </Stack>
  );
};
export default GlobalInvestigationOverview;
