import React, { useState, useMemo, lazy, Suspense } from 'react';
import {
  Box,
  Card,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  TablePagination,
  TableSortLabel,
  Chip,
  Avatar,
  Stack,
  TextField,
  InputAdornment,
  Button,
  IconButton,
  Drawer,
  MenuItem,
  Menu,
  ListItemIcon,
  ListItemText,
  Select,
  FormControl,
  InputLabel,
  Badge,
  Divider,
  Grid2 as Grid,
} from '@mui/material';
import {
  IconSearch,
  IconAdjustmentsHorizontal,
  IconDotsVertical,
  IconX,
  IconFilter,
  IconUser,
} from '@tabler/icons-react';
import {
  VisitorSessionResponseType,
  VisitorSessionPersonType,
  VisitorSessionType,
} from 'src/store/apps/crud/visitorSession';
import { BASE_URL } from 'src/utils/axios';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';

import { useAllBuilding } from 'src/hooks/useBuilding';
import { useAllFloors } from 'src/hooks/useFloor';
import { useAllFloorplans } from 'src/hooks/useFloorplan';
import { useAllMaskedAreas } from 'src/hooks/useMaskedArea';

const AutocompleteFilter = lazy(
  () => import('src/layouts/full/horizontal/navbar/AutocompleteFilter'),
);

export type UnifiedTrackingRow = {
  personId?: string;
  visitorId?: string;
  memberId?: string;
  personName: string;
  personType: string;
  cardNumber: string;
  buildingId?: string;
  buildingName: string;
  floorId?: string;
  floorName: string;
  floorplanId?: string;
  areaId?: string;
  areaName: string;
  enterTimeStr: string;
  exitTimeStr: string;
  rawEnterTime?: string;
  rawExitTime?: string;
  durationInMinutes?: number;
  durationInPeriodMinutes?: number;
  durationStr: string;
  status: string;
  hostName: string;
};

type SortColumn = keyof UnifiedTrackingRow;

export type TrackingReportDetailProps = {
  data: VisitorSessionType[] | VisitorSessionResponseType | null | undefined;
  isLoading?: boolean;
  isExporting?: boolean;
  onViewPersonDetail?: (row: UnifiedTrackingRow) => void;
};

const TrackingReportDetail: React.FC<TrackingReportDetailProps> = ({ data, isLoading, isExporting, onViewPersonDetail }) => {
  // Redux/React Query Data Hooks for AutocompleteFilter tree
  const buildingList = useAllBuilding().data ?? [];
  const floorList = useAllFloors().data ?? [];
  const floorplanList = useAllFloorplans().data ?? [];
  const maskedAreaList = useAllMaskedAreas().data ?? [];

  // Search & Pagination State
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Row Action Menu State
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuRow, setMenuRow] = useState<UnifiedTrackingRow | null>(null);

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, row: UnifiedTrackingRow) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setMenuRow(row);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setMenuRow(null);
  };

  const handlePersonDetailClick = () => {
    if (menuRow && onViewPersonDetail) {
      onViewPersonDetail(menuRow);
    }
    handleCloseMenu();
  };

  // Sorting State
  const [sortColumn, setSortColumn] = useState<SortColumn>('enterTimeStr');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Filter Drawer State
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [filterPersonType, setFilterPersonType] = useState<string>('ALL');
  const [filterPersonName, setFilterPersonName] = useState<string>('');
  const [filterEnterTimeFrom, setFilterEnterTimeFrom] = useState<string>('');
  const [filterEnterTimeTo, setFilterEnterTimeTo] = useState<string>('');
  const [filterExitTimeFrom, setFilterExitTimeFrom] = useState<string>('');
  const [filterExitTimeTo, setFilterExitTimeTo] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // AutocompleteFilter tree state
  const [appliedAreaFilter, setAppliedAreaFilter] = useState<{
    BuildingId: string[];
    FloorId: string[];
    FloorplanId: string[];
    MaskedAreaId: string[];
  }>({
    BuildingId: [],
    FloorId: [],
    FloorplanId: [],
    MaskedAreaId: [],
  });

  const [resetToken, setResetToken] = useState(0);

  // Helper to format date string to "Fri, 04 Sep 2026, 09:08:00"
  const formatDateStr = (dateVal?: string | null) => {
    if (!dateVal) return '-';
    const date = new Date(dateVal);
    if (isNaN(date.getTime())) return dateVal;
    
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const dayName = days[date.getDay()];
    const dayNum = String(date.getDate()).padStart(2, '0');
    const monthName = months[date.getMonth()];
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${dayName}, ${dayNum} ${monthName} ${year}, ${hours}:${minutes}:${seconds}`;
  };

  // Helper to format duration in minutes into days, hours, mins
  const formatDurationMins = (totalMinutes?: number | null) => {
    if (totalMinutes === undefined || totalMinutes === null || totalMinutes <= 0) return '-';
    
    const days = Math.floor(totalMinutes / (24 * 60));
    const remainingMinutesAfterDays = totalMinutes % (24 * 60);
    const hours = Math.floor(remainingMinutesAfterDays / 60);
    const mins = remainingMinutesAfterDays % 60;
    
    const parts: string[] = [];
    if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
    if (hours > 0) parts.push(`${hours} hr${hours > 1 ? 's' : ''}`);
    if (mins > 0 || parts.length === 0) parts.push(`${mins} min${mins > 1 ? 's' : ''}`);
    
    return parts.join(' ');
  };

  const rows: UnifiedTrackingRow[] = useMemo(() => {
    const sessionList: VisitorSessionType[] = Array.isArray(data)
      ? data
      : Array.isArray((data as any)?.collection?.data)
      ? (data as any).collection.data
      : Array.isArray((data as any)?.data)
      ? (data as any).data
      : [];

    if (sessionList.length > 0) {
      return sessionList
        .filter((s) => s.personType?.toLowerCase() !== 'security')
        .map((s) => {
          const enterTimeStr = formatDateStr(s.enterTime);
          const exitTimeStr = s.exitTime ? formatDateStr(s.exitTime) : '—';
          const durationMins = s.durationInPeriodMinutes ?? s.durationInMinutes ?? 0;
          const durationStr = formatDurationMins(durationMins);

          return {
            personId: s.personId || s.visitorId || s.memberId || undefined,
            visitorId: s.visitorId || undefined,
            memberId: s.memberId || undefined,
            personName: s.personName || s.visitorName || s.memberName || 'Unknown',
            personType: s.personType || 'Visitor',
            cardNumber: s.cardName || s.cardId || '-',
            buildingId: s.buildingId || undefined,
            buildingName: s.buildingName || '-',
            floorId: s.floorId || undefined,
            floorName: s.floorName || '-',
            floorplanId: s.floorplanId || undefined,
            areaId: s.areaId || undefined,
            areaName: s.areaName || '-',
            enterTimeStr,
            exitTimeStr,
            rawEnterTime: s.enterTime || undefined,
            rawExitTime: s.exitTime || undefined,
            durationInMinutes: s.durationInMinutes || 0,
            durationInPeriodMinutes: s.durationInPeriodMinutes || 0,
            durationStr,
            status: s.status || 'Active',
            hostName: s.hostName || '-',
          };
        });
    }

    const persons: VisitorSessionPersonType[] = (data as VisitorSessionResponseType)?.persons || [];
    return persons.map((p) => {
      const firstSession = p.sessions?.[0];
      const enterTimeStr = formatDateStr(firstSession?.enterTime);
      const exitTimeStr = firstSession?.exitTime ? formatDateStr(firstSession.exitTime) : '—';
      const durationMins = p.durationInPeriodMinutes ?? p.totalDurationMinutes ?? 0;
      const durationStr = formatDurationMins(durationMins);

      return {
        personId: p.personId || p.id || undefined,
        visitorId: p.visitorId || (p.personType?.toLowerCase() === 'visitor' ? (p.id || undefined) : undefined),
        memberId: p.memberId || (p.personType?.toLowerCase() === 'member' ? (p.id || undefined) : undefined),
        personName: p.personName || 'Unknown',
        personType: p.personType || 'Visitor',
        cardNumber: p.cardNumber || '-',
        buildingId: firstSession?.buildingId || undefined,
        buildingName: firstSession?.buildingName || '-',
        floorId: firstSession?.floorId || undefined,
        floorName: firstSession?.floorName || '-',
        floorplanId: firstSession?.floorplanId || undefined,
        areaId: p.currentArea || firstSession?.areaName || undefined,
        areaName: p.currentArea || firstSession?.areaName || '-',
        enterTimeStr,
        exitTimeStr,
        rawEnterTime: firstSession?.enterTime || undefined,
        rawExitTime: firstSession?.exitTime || undefined,
        durationInMinutes: p.totalDurationMinutes || 0,
        durationInPeriodMinutes: p.durationInPeriodMinutes || 0,
        durationStr,
        status: 'Active',
        hostName: 'bio.org',
      };
    });
  }, [data]);

  // Active filter count for badge indicator
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filterPersonType !== 'ALL') count++;
    if (filterPersonName.trim()) count++;
    if (appliedAreaFilter.BuildingId.length > 0) count++;
    if (appliedAreaFilter.FloorId.length > 0) count++;
    if (appliedAreaFilter.FloorplanId.length > 0) count++;
    if (appliedAreaFilter.MaskedAreaId.length > 0) count++;
    if (filterEnterTimeFrom) count++;
    if (filterEnterTimeTo) count++;
    if (filterExitTimeFrom) count++;
    if (filterExitTimeTo) count++;
    if (filterStatus !== 'ALL') count++;
    return count;
  }, [
    filterPersonType,
    filterPersonName,
    appliedAreaFilter,
    filterEnterTimeFrom,
    filterEnterTimeTo,
    filterExitTimeFrom,
    filterExitTimeTo,
    filterStatus,
  ]);

  const handleResetFilters = () => {
    setFilterPersonType('ALL');
    setFilterPersonName('');
    setFilterEnterTimeFrom('');
    setFilterEnterTimeTo('');
    setFilterExitTimeFrom('');
    setFilterExitTimeTo('');
    setFilterStatus('ALL');
    setAppliedAreaFilter({
      BuildingId: [],
      FloorId: [],
      FloorplanId: [],
      MaskedAreaId: [],
    });
    setResetToken((prev) => prev + 1);
  };

  // Helper to extract HH:mm time string from raw ISO timestamp
  const getTimeString = (isoStr?: string) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '';
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  };

  // Filtered rows
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      // 1. Quick Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesQuery =
          r.personName?.toLowerCase().includes(q) ||
          r.cardNumber?.toLowerCase().includes(q) ||
          r.areaName?.toLowerCase().includes(q) ||
          r.buildingName?.toLowerCase().includes(q);
        if (!matchesQuery) return false;
      }

      // 2. Person Type Filter
      if (filterPersonType !== 'ALL') {
        if (r.personType?.toLowerCase() !== filterPersonType.toLowerCase()) return false;
      }

      // 3. Person Name Filter
      if (filterPersonName.trim()) {
        if (!r.personName?.toLowerCase().includes(filterPersonName.toLowerCase().trim())) return false;
      }

      // 4. AutocompleteFilter Tree (Building / Floor / Floorplan / Area)
      if (appliedAreaFilter.BuildingId.length > 0) {
        const matchBuilding =
          (r.buildingId && appliedAreaFilter.BuildingId.includes(r.buildingId)) ||
          appliedAreaFilter.BuildingId.some((id) => {
            const b = buildingList.find((item) => item.id === id);
            return b && b.name === r.buildingName;
          });
        if (!matchBuilding) return false;
      }

      if (appliedAreaFilter.FloorId.length > 0) {
        const matchFloor =
          (r.floorId && appliedAreaFilter.FloorId.includes(r.floorId)) ||
          appliedAreaFilter.FloorId.some((id) => {
            const fl = floorList.find((item) => item.id === id);
            return fl && fl.name === r.floorName;
          });
        if (!matchFloor) return false;
      }

      if (appliedAreaFilter.FloorplanId.length > 0) {
        if (r.floorplanId && !appliedAreaFilter.FloorplanId.includes(r.floorplanId)) return false;
      }

      if (appliedAreaFilter.MaskedAreaId.length > 0) {
        const matchArea =
          (r.areaId && appliedAreaFilter.MaskedAreaId.includes(r.areaId)) ||
          appliedAreaFilter.MaskedAreaId.some((id) => {
            const ma = maskedAreaList.find((item) => item.id === id);
            return ma && (ma.name === r.areaName || ma.areaName === r.areaName || ma.maskedAreaName === r.areaName);
          });
        if (!matchArea) return false;
      }

      // 5. Enter Time Range Filter
      const enterTimeStrHHmm = getTimeString(r.rawEnterTime);
      if (filterEnterTimeFrom) {
        if (!enterTimeStrHHmm || enterTimeStrHHmm < filterEnterTimeFrom) return false;
      }
      if (filterEnterTimeTo) {
        if (!enterTimeStrHHmm || enterTimeStrHHmm > filterEnterTimeTo) return false;
      }

      // 6. Exit Time Range Filter
      const exitTimeStrHHmm = getTimeString(r.rawExitTime);
      if (filterExitTimeFrom) {
        if (!exitTimeStrHHmm || exitTimeStrHHmm < filterExitTimeFrom) return false;
      }
      if (filterExitTimeTo) {
        if (!exitTimeStrHHmm || exitTimeStrHHmm > filterExitTimeTo) return false;
      }

      // 7. Status Filter
      if (filterStatus !== 'ALL') {
        if (r.status?.toLowerCase() !== filterStatus.toLowerCase()) return false;
      }

      return true;
    });
  }, [
    rows,
    searchQuery,
    filterPersonType,
    filterPersonName,
    appliedAreaFilter,
    buildingList,
    floorList,
    maskedAreaList,
    filterEnterTimeFrom,
    filterEnterTimeTo,
    filterExitTimeFrom,
    filterExitTimeTo,
    filterStatus,
  ]);

  // Sorted rows
  const sortedRows = useMemo(() => {
    if (!sortColumn) return filteredRows;

    return [...filteredRows].sort((a, b) => {
      let aVal: any = a[sortColumn];
      let bVal: any = b[sortColumn];

      if (sortColumn === 'enterTimeStr') {
        aVal = a.rawEnterTime ? new Date(a.rawEnterTime).getTime() : 0;
        bVal = b.rawEnterTime ? new Date(b.rawEnterTime).getTime() : 0;
      } else if (sortColumn === 'exitTimeStr') {
        aVal = a.rawExitTime ? new Date(a.rawExitTime).getTime() : 0;
        bVal = b.rawExitTime ? new Date(b.rawExitTime).getTime() : 0;
      } else if (sortColumn === 'durationStr') {
        aVal = a.durationInPeriodMinutes || 0;
        bVal = b.durationInPeriodMinutes || 0;
      } else {
        aVal = (aVal || '').toString().toLowerCase();
        bVal = (bVal || '').toString().toLowerCase();
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredRows, sortColumn, sortOrder]);

  // Paginated rows
  const paginatedRows = useMemo(() => {
    if (isExporting) {
      return sortedRows;
    }
    const start = page * rowsPerPage;
    return sortedRows.slice(start, start + rowsPerPage);
  }, [sortedRows, page, rowsPerPage, isExporting]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortOrder('asc');
    }
  };

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Card
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '16px',
        p: 2.5,
      }}
    >
      {/* Header & Controls */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={2}
        mb={2.5}
      >
        <Stack direction="row" spacing={1} alignItems="baseline">
          <Typography variant="h6" fontWeight={700} color="text.primary">
            People Presence Detail
          </Typography>

          <Typography variant="body2" color="text.secondary">
            Showing {isExporting ? (sortedRows.length > 0 ? `1 to ${sortedRows.length}` : '0') : `${sortedRows.length > 0 ? page * rowsPerPage + 1 : 0} to ${Math.min((page + 1) * rowsPerPage, sortedRows.length)}`} of {sortedRows.length} people
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1.5} alignItems="center" width={{ xs: '100%', sm: 'auto' }}>
          <TextField
            size="small"
            placeholder="Search by name, card, or area..."
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
            sx={{ width: { xs: '100%', sm: 280 } }}
          />

          <Badge badgeContent={activeFilterCount} color="primary">
            <Button
              variant={activeFilterCount > 0 ? 'contained' : 'outlined'}
              color={activeFilterCount > 0 ? 'primary' : 'inherit'}
              startIcon={<IconAdjustmentsHorizontal size={18} />}
              onClick={() => setFilterDrawerOpen(true)}
              sx={{ borderRadius: '8px', textTransform: 'none' }}
            >
              Filter
            </Button>
          </Badge>
        </Stack>
      </Stack>

      {/* Table */}
      <TableContainer
        sx={{
          maxHeight: isExporting ? 'none' : 500,
          overflowY: isExporting ? 'visible' : 'auto',
          '&::-webkit-scrollbar': { width: '6px', height: '6px' },
          '&::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: '4px' },
        }}
      >
        <Table
          stickyHeader
          sx={{
            whiteSpace: 'nowrap',
            '& .MuiTableCell-head': {
              bgcolor: 'background.paper',
            },
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell
                sx={{
                  fontWeight: 700,
                  color: 'text.secondary',
                  py: 1.5,
                  position: 'sticky !important',
                  left: '0px !important',
                  zIndex: '10 !important',
                  bgcolor: 'background.paper',
                  width: 70,
                  minWidth: 70,
                }}
              >
                No.
              </TableCell>

              <TableCell
                sx={{
                  fontWeight: 700,
                  color: 'text.secondary',
                  py: 1.5,
                  position: 'sticky !important',
                  left: '70px !important',
                  zIndex: '10 !important',
                  bgcolor: 'background.paper',
                  width: 250,
                  minWidth: 250,
                  boxShadow: (theme) =>
                    theme.palette.mode === 'dark'
                      ? '4px 0 8px -2px rgba(0,0,0,0.5)'
                      : '4px 0 8px -2px rgba(0,0,0,0.08)',
                }}
              >
                <TableSortLabel
                  active={sortColumn === 'personName'}
                  direction={sortColumn === 'personName' ? sortOrder : 'asc'}
                  onClick={() => handleSort('personName')}
                >
                  Person
                </TableSortLabel>
              </TableCell>

              <TableCell sx={{ fontWeight: 700, color: 'text.secondary', py: 1.5, zIndex: 2 }}>
                <TableSortLabel
                  active={sortColumn === 'personType'}
                  direction={sortColumn === 'personType' ? sortOrder : 'asc'}
                  onClick={() => handleSort('personType')}
                >
                  Type
                </TableSortLabel>
              </TableCell>

              <TableCell sx={{ fontWeight: 700, color: 'text.secondary', py: 1.5 }}>
                <TableSortLabel
                  active={sortColumn === 'cardNumber'}
                  direction={sortColumn === 'cardNumber' ? sortOrder : 'asc'}
                  onClick={() => handleSort('cardNumber')}
                >
                  Card
                </TableSortLabel>
              </TableCell>

              <TableCell sx={{ fontWeight: 700, color: 'text.secondary', py: 1.5 }}>
                <TableSortLabel
                  active={sortColumn === 'buildingName'}
                  direction={sortColumn === 'buildingName' ? sortOrder : 'asc'}
                  onClick={() => handleSort('buildingName')}
                >
                  Location
                </TableSortLabel>
              </TableCell>

              <TableCell sx={{ fontWeight: 700, color: 'text.secondary', py: 1.5 }}>
                <TableSortLabel
                  active={sortColumn === 'areaName'}
                  direction={sortColumn === 'areaName' ? sortOrder : 'asc'}
                  onClick={() => handleSort('areaName')}
                >
                  Area
                </TableSortLabel>
              </TableCell>

              <TableCell sx={{ fontWeight: 700, color: 'text.secondary', py: 1.5 }}>
                <TableSortLabel
                  active={sortColumn === 'enterTimeStr'}
                  direction={sortColumn === 'enterTimeStr' ? sortOrder : 'asc'}
                  onClick={() => handleSort('enterTimeStr')}
                >
                  Enter Time
                </TableSortLabel>
              </TableCell>

              <TableCell sx={{ fontWeight: 700, color: 'text.secondary', py: 1.5 }}>
                <TableSortLabel
                  active={sortColumn === 'exitTimeStr'}
                  direction={sortColumn === 'exitTimeStr' ? sortOrder : 'asc'}
                  onClick={() => handleSort('exitTimeStr')}
                >
                  Exit Time
                </TableSortLabel>
              </TableCell>

              <TableCell sx={{ fontWeight: 700, color: 'text.secondary', py: 1.5 }}>
                <TableSortLabel
                  active={sortColumn === 'durationStr'}
                  direction={sortColumn === 'durationStr' ? sortOrder : 'asc'}
                  onClick={() => handleSort('durationStr')}
                >
                  Duration
                </TableSortLabel>
              </TableCell>

              <TableCell sx={{ fontWeight: 700, color: 'text.secondary', py: 1.5 }}>
                <TableSortLabel
                  active={sortColumn === 'status'}
                  direction={sortColumn === 'status' ? sortOrder : 'asc'}
                  onClick={() => handleSort('status')}
                >
                  Status
                </TableSortLabel>
              </TableCell>

              <TableCell sx={{ fontWeight: 700, color: 'text.secondary', py: 1.5 }}>
                <TableSortLabel
                  active={sortColumn === 'hostName'}
                  direction={sortColumn === 'hostName' ? sortOrder : 'asc'}
                  onClick={() => handleSort('hostName')}
                >
                  Host
                </TableSortLabel>
              </TableCell>

              <TableCell align="right" sx={{ py: 1.5 }}></TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={12} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    Loading tracking detail...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : paginatedRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No people presence record found.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedRows.map((row, index) => {
                const isVisitor = row.personType?.toLowerCase() === 'visitor';

                return (
                  <TableRow key={index} hover>
                    <TableCell
                      sx={{
                        py: 1.5,
                        position: 'sticky !important',
                        left: '0px !important',
                        zIndex: 3,
                        bgcolor: 'background.paper',
                        width: 70,
                        minWidth: 70,
                      }}
                    >
                      {isExporting ? index + 1 : page * rowsPerPage + index + 1}
                    </TableCell>
                    <TableCell
                      sx={{
                        py: 1.5,
                        position: 'sticky !important',
                        left: '70px !important',
                        zIndex: 3,
                        bgcolor: 'background.paper',
                        width: 250,
                        minWidth: 250,
                        boxShadow: (theme) =>
                          theme.palette.mode === 'dark'
                            ? '4px 0 8px -2px rgba(0,0,0,0.5)'
                            : '4px 0 8px -2px rgba(0,0,0,0.08)',
                      }}
                    >
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Avatar
                          src={isVisitor ? `${BASE_URL}/images/users/user-1.jpg` : `${BASE_URL}/images/users/user-2.jpg`}
                          sx={{ width: 36, height: 36 }}
                        />
                        <Typography variant="subtitle2" fontWeight={600}>
                          {row.personName}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ py: 1.5 }}>
                      <Chip
                        label={
                          <span style={{ color: isVisitor ? '#B06000' : '#137333', fontWeight: 600, fontSize: '12px' }}>
                            {isVisitor ? 'Visitor' : 'Member'}
                          </span>
                        }
                        size="small"
                        sx={{
                          bgcolor: isVisitor ? '#FEF3D6' : '#E6F4EA',
                          border: 'none',
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ py: 1.5 }}>
                      <Typography variant="body2" fontWeight={600}>
                        {row.cardNumber}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 1.5 }}>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          {row.buildingName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {row.floorName}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ py: 1.5 }}>
                      <Typography variant="body2" fontWeight={600}>
                        {row.areaName}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 1.5 }}>
                      <Typography variant="body2">{row.enterTimeStr}</Typography>
                    </TableCell>
                    <TableCell sx={{ py: 1.5 }}>
                      <Typography variant="body2">{row.exitTimeStr}</Typography>
                    </TableCell>
                    <TableCell sx={{ py: 1.5 }}>
                      <Typography variant="body2">{row.durationStr}</Typography>
                    </TableCell>
                    <TableCell sx={{ py: 1.5 }}>
                      <Chip
                        label={
                          <span style={{ color: '#137333', fontWeight: 600, fontSize: '12px' }}>
                            {row.status || 'Active'}
                          </span>
                        }
                        size="small"
                        sx={{
                          bgcolor: '#E6F4EA',
                          border: 'none',
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ py: 1.5 }}>
                      <Typography variant="body2" color="primary.main" fontWeight={500}>
                        {row.hostName}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ py: 1.5 }}>
                      <IconButton size="small" onClick={(e) => handleOpenMenu(e, row)}>
                        <IconDotsVertical size={18} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Action Popover Menu for Row */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={handlePersonDetailClick}>
          <ListItemIcon>
            <IconUser size={18} />
          </ListItemIcon>
          <ListItemText primary="Person Detail" />
        </MenuItem>
      </Menu>

      {/* Pagination */}
      {!isExporting && (
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={sortedRows.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      )}

      {/* Filter Drawer Side Panel */}
      <Drawer
        anchor="right"
        open={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        PaperProps={{
          sx: { width: { xs: '100%', sm: 400 }, p: 3 },
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Drawer Header */}
          <Stack direction="row" justifyContent="space-between" alignItems="center" pb={2} borderBottom="1px solid" borderColor="divider">
            <Stack direction="row" spacing={1} alignItems="center">
              <IconFilter size={20} />
              <Typography variant="h6" fontWeight={700}>
                Filter Table Details
              </Typography>
            </Stack>
            <IconButton size="small" onClick={() => setFilterDrawerOpen(false)}>
              <IconX size={20} />
            </IconButton>
          </Stack>

          {/* Drawer Body - Filter Form */}
          <Box sx={{ flex: 1, overflowY: 'auto', py: 2.5 }}>
            <Stack spacing={2.5}>
              {/* 1. Person Type */}
              <FormControl fullWidth size="small">
                <InputLabel id="person-type-select-label">Person Type</InputLabel>
                <Select
                  labelId="person-type-select-label"
                  label="Person Type"
                  value={filterPersonType}
                  onChange={(e) => setFilterPersonType(e.target.value)}
                >
                  <MenuItem value="ALL">All Types</MenuItem>
                  <MenuItem value="Member">Member</MenuItem>
                  <MenuItem value="Visitor">Visitor</MenuItem>
                </Select>
              </FormControl>

              {/* 2. Person Name */}
              <TextField
                fullWidth
                size="small"
                label="Person Name"
                placeholder="Search person name..."
                value={filterPersonName}
                onChange={(e) => setFilterPersonName(e.target.value)}
              />

              {/* 3. Building / Floor / Area Tree Filter (AutocompleteFilter) */}
              <Box>
                <CustomFormLabel sx={{ mt: 0, mb: 1 }}>
                  <Typography variant="caption" fontWeight={600}>
                    Building / Floor / Area :
                  </Typography>
                </CustomFormLabel>

                <Suspense fallback={<Typography variant="caption">Loading location tree...</Typography>}>
                  <AutocompleteFilter
                    buildings={buildingList}
                    floors={floorList}
                    floorplans={floorplanList}
                    maskedAreas={maskedAreaList}
                    initial={appliedAreaFilter}
                    onChangeFilter={(f) => setAppliedAreaFilter(f)}
                    resetToken={resetToken}
                  />
                </Suspense>
              </Box>

              <Divider sx={{ my: 1 }} />

              {/* 4. Enter Time Range */}
              <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
                Enter Time Range
              </Typography>
              <Grid container spacing={1.5}>
                <Grid size={6}>
                  <TextField
                    fullWidth
                    size="small"
                    type="time"
                    label="From"
                    InputLabelProps={{ shrink: true }}
                    value={filterEnterTimeFrom}
                    onChange={(e) => setFilterEnterTimeFrom(e.target.value)}
                  />
                </Grid>
                <Grid size={6}>
                  <TextField
                    fullWidth
                    size="small"
                    type="time"
                    label="To"
                    InputLabelProps={{ shrink: true }}
                    value={filterEnterTimeTo}
                    onChange={(e) => setFilterEnterTimeTo(e.target.value)}
                  />
                </Grid>
              </Grid>

              {/* 5. Exit Time Range */}
              <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
                Exit Time Range
              </Typography>
              <Grid container spacing={1.5}>
                <Grid size={6}>
                  <TextField
                    fullWidth
                    size="small"
                    type="time"
                    label="From"
                    InputLabelProps={{ shrink: true }}
                    value={filterExitTimeFrom}
                    onChange={(e) => setFilterExitTimeFrom(e.target.value)}
                  />
                </Grid>
                <Grid size={6}>
                  <TextField
                    fullWidth
                    size="small"
                    type="time"
                    label="To"
                    InputLabelProps={{ shrink: true }}
                    value={filterExitTimeTo}
                    onChange={(e) => setFilterExitTimeTo(e.target.value)}
                  />
                </Grid>
              </Grid>

              <Divider sx={{ my: 1 }} />

              {/* 6. Status */}
              <FormControl fullWidth size="small">
                <InputLabel id="status-select-label">Status</InputLabel>
                <Select
                  labelId="status-select-label"
                  label="Status"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <MenuItem value="ALL">All Statuses</MenuItem>
                  <MenuItem value="Active">Active</MenuItem>
                  <MenuItem value="Closed">Closed</MenuItem>
                  <MenuItem value="Timeout">Timeout</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </Box>

          {/* Drawer Footer Actions */}
          <Stack direction="row" spacing={1.5} pt={2} borderTop="1px solid" borderColor="divider">
            <Button
              variant="outlined"
              color="inherit"
              fullWidth
              onClick={handleResetFilters}
              sx={{ borderRadius: '8px' }}
            >
              Reset
            </Button>
            <Button
              variant="contained"
              color="primary"
              fullWidth
              onClick={() => setFilterDrawerOpen(false)}
              sx={{ borderRadius: '8px' }}
            >
              Apply Filter
            </Button>
          </Stack>
        </Box>
      </Drawer>
    </Card>
  );
};

export default TrackingReportDetail;
