import React, { useMemo, useState } from 'react';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Divider,
  Collapse,
  Tooltip,
} from '@mui/material';
import {
  IconX,
  IconArrowDownLeft,
  IconArrowUpRight,
  IconSearch,
  IconX as IconClear,
  IconChevronsUp,
  IconChevronsDown,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useSelector, RootState } from 'src/store/Store';
import { FloorplanDeviceType } from 'src/store/apps/crud/floorplanDevice';
import { MaskedAreaType } from 'src/store/apps/crud/maskedArea';
import { ReaderHealthCard } from 'src/components/master/Reports/ReaderHealthReport/ReaderHealthReportList';
import { useEnrichedTrackingLogs } from 'src/hooks/useTrackingLogs';
import BlankCard from 'src/components/shared/BlankCard';

type ReaderDetailPopupProps = {
  open: boolean;
  onClose: () => void;
  device: FloorplanDeviceType | null;
  area?: MaskedAreaType | null;
};

export type AreaMovementLogItem = {
  id: string;
  target: string;
  dmac: string;
  time: string;
  personType?: 'Member' | 'Visitor' | 'Security';
  isAlarm: boolean;
  direction: 'In' | 'Out';
  prevArea?: string;
  nextArea?: string;
  area: string;
};

type SortField = 'target' | 'time' | 'dmac' | 'personType' | 'direction';

const ReaderDetailPopup: React.FC<ReaderDetailPopupProps> = ({
  open,
  onClose,
  device,
  area,
}) => {
  const { t } = useTranslation();
  const readerHealthByTopic = useSelector(
    (state: RootState) => state.ReaderHealthReducer.readerHealthByTopic,
  );
  const trackingLogs = useEnrichedTrackingLogs();

  // Search & Filter state for movement logs
  const [searchTerm, setSearchTerm] = useState('');
  const [directionFilter, setDirectionFilter] = useState<'all' | 'In' | 'Out'>('all');
  const [personTypeFilter, setPersonTypeFilter] = useState('all');
  const [orderBy, setOrderBy] = useState<SortField>('time');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [isHealthExpanded, setIsHealthExpanded] = useState(true);

  // 1. Reader Health Data
  const gmac = device?.reader?.gmac || '';
  const readerHealthData = useMemo(() => {
    if (!gmac) return null;
    const now = Math.floor(Date.now() / 1000);
    const oneMinuteAgo = now - 60;

    const health =
      readerHealthByTopic[gmac] ||
      readerHealthByTopic[gmac.toLowerCase()] ||
      readerHealthByTopic[gmac.toUpperCase()];

    let status = 'Non-Active';
    if (health && health.utc >= oneMinuteAgo) {
      status = health.msg || 'alive';
    }

    const isWarning =
      status !== 'Non-Active' &&
      ((health?.temp ?? 0) >= 50 ||
        (health?.load ?? 0) >= 0.6 ||
        (health?.mem_free ?? 100) <= 15);

    return {
      ...health,
      gmac: gmac,
      wanIP: device?.reader?.ip || health?.wanIP || '-',
      msg: status,
      temp: status === 'Non-Active' ? 0 : (health?.temp ?? 0),
      load: status === 'Non-Active' ? 0 : (health?.load ?? 0),
      mem_free: status === 'Non-Active' ? 0 : (health?.mem_free ?? 0),
      uptime: status === 'Non-Active' ? 0 : (health?.uptime ?? 0),
      ver: health?.ver || '-',
      blever: health?.blever || '-',
      lowVoltage: health?.lowVoltage ?? 0,
      isWarning,
    };
  }, [gmac, device?.reader?.ip, readerHealthByTopic]);

  // 2. Compute Movement Logs for the registered area ("Go in" / "Go out")
  const areaName = area?.name || device?.floorplanMaskedArea?.name || '';

  const movementLogs = useMemo(() => {
    if (!areaName) return [];

    // Group all tracking logs by beacon/dmac
    const logsByBeacon: Record<string, typeof trackingLogs> = {};
    trackingLogs.forEach((log) => {
      const key = log.dmac || log.personId;
      if (!key) return;
      if (!logsByBeacon[key]) logsByBeacon[key] = [];
      logsByBeacon[key].push(log);
    });

    const results: AreaMovementLogItem[] = [];

    // For each beacon, sort chronologically ascending to evaluate chronological transitions
    Object.values(logsByBeacon).forEach((bLogs) => {
      const sorted = [...bLogs].sort(
        (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime(),
      );

      for (let i = 0; i < sorted.length; i++) {
        const curr = sorted[i];
        const prev = i > 0 ? sorted[i - 1] : null;
        const next = i < sorted.length - 1 ? sorted[i + 1] : null;

        // Current transaction is IN this area
        if (curr.area === areaName) {
          // If previously they were in another area (or had no recorded previous area log)
          if (!prev || prev.area !== areaName) {
            results.push({
              id: `${curr.id}-in`,
              target: curr.target,
              dmac: curr.dmac,
              time: curr.time,
              personType: curr.personType,
              isAlarm: curr.type === 'Alarm',
              direction: 'In',
              prevArea: prev?.area || 'External / Initial',
              area: areaName,
            });
          }
        } else {
          // Current transaction is outside this area, but previously was IN this area -> Go Out
          if (prev && prev.area === areaName) {
            results.push({
              id: `${curr.id}-out`,
              target: curr.target,
              dmac: curr.dmac,
              time: curr.time,
              personType: curr.personType,
              isAlarm: curr.type === 'Alarm',
              direction: 'Out',
              nextArea: curr.area || 'Unknown Area',
              area: areaName,
            });
          }
        }
      }
    });

    return results;
  }, [trackingLogs, areaName]);

  // Search, filter, and sort processed movement logs
  const processedLogs = useMemo(() => {
    let list = [...movementLogs];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter(
        (log) =>
          (log.target && log.target.toLowerCase().includes(q)) ||
          (log.dmac && log.dmac.toLowerCase().includes(q)),
      );
    }

    if (directionFilter !== 'all') {
      list = list.filter((log) => log.direction === directionFilter);
    }

    if (personTypeFilter !== 'all') {
      list = list.filter(
        (log) => (log.personType || '').toLowerCase() === personTypeFilter.toLowerCase(),
      );
    }

    list.sort((a, b) => {
      let valA: any = a[orderBy] ?? '';
      let valB: any = b[orderBy] ?? '';

      if (orderBy === 'time') {
        const timeA = new Date(a.time).getTime() || 0;
        const timeB = new Date(b.time).getTime() || 0;
        return order === 'asc' ? timeA - timeB : timeB - timeA;
      }

      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = (valB ?? '').toString().toLowerCase();
      }

      if (valA < valB) return order === 'asc' ? -1 : 1;
      if (valA > valB) return order === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [movementLogs, searchTerm, directionFilter, personTypeFilter, orderBy, order]);

  const displayedRows = useMemo(() => {
    return processedLogs.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [processedLogs, page, rowsPerPage]);

  const handleSort = (field: SortField) => {
    const isAsc = orderBy === field && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(field);
    setPage(0);
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    const weekday = t(date.toLocaleString('en-GB', { weekday: 'long' }));
    const month = t(date.toLocaleString('en-GB', { month: 'short' }));
    return `${weekday}, ${date.getDate()} ${month} ${date.getFullYear()} - ${date.toLocaleTimeString(
      'en-GB',
      {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      },
    )}`;
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '20px',
          maxHeight: '92vh',
        },
      }}
    >
      <DialogTitle sx={{ pb: 1, pt: 2.5, px: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={1.5}>
            <Typography variant="h5" fontWeight="bold">
              Reader Details: {device?.name || 'Device'}
            </Typography>
            {areaName ? (
              <Chip
                label={`Area: ${areaName}`}
                size="small"
                color="primary"
                variant="outlined"
                sx={{ fontWeight: 600 }}
              />
            ) : (
              <Chip
                label="No Registered Area"
                size="small"
                color="default"
                variant="outlined"
              />
            )}
          </Box>
          <IconButton onClick={onClose} size="small">
            <IconX size={22} />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ px: 3, pb: 3, pt: 1 }}>
        {/* 1. Device Health Section */}
        <Box mb={isHealthExpanded ? 3 : 1.5}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="h6" fontWeight="bold">
                Reader Health
              </Typography>
              {!isHealthExpanded && readerHealthData && (
                <Chip
                  label={readerHealthData.msg}
                  size="small"
                  color={readerHealthData.msg === 'alive' ? 'success' : 'error'}
                  sx={{ textTransform: 'uppercase', fontSize: '10px', height: '20px' }}
                />
              )}
            </Box>
            <Tooltip title={isHealthExpanded ? 'Minimize Reader Health' : 'Expand Reader Health'}>
              <IconButton
                size="small"
                onClick={() => setIsHealthExpanded((prev) => !prev)}
                aria-label="toggle reader health"
                sx={{
                  bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'grey.800' : 'grey.100'),
                  '&:hover': {
                    bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'grey.700' : 'grey.200'),
                  },
                }}
              >
                {isHealthExpanded ? <IconChevronsUp size={18} /> : <IconChevronsDown size={18} />}
              </IconButton>
            </Tooltip>
          </Box>

          <Collapse in={isHealthExpanded} timeout="auto" unmountOnExit={false}>
            {readerHealthData ? (
              <ReaderHealthCard data={readerHealthData} />
            ) : (
              <BlankCard>
                <Box p={3} textAlign="center">
                  <Typography color="textSecondary">
                    {gmac ? `No health telemetries received yet for GMAC: ${gmac}` : 'Device is not associated with a BLE Reader MAC address.'}
                  </Typography>
                </Box>
              </BlankCard>
            )}
          </Collapse>
        </Box>

        <Divider sx={{ my: isHealthExpanded ? 2.5 : 1.5 }} />

        {/* 2. Movement Log Section */}
        <Box>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
            <Box>
              <Typography variant="h6" fontWeight="bold">
                Area Movement Log
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Live In & Out movement history for <strong>{areaName || 'this reader\'s area'}</strong>
              </Typography>
            </Box>
            <Typography variant="body2" color="textSecondary">
              Total: <strong>{processedLogs.length}</strong> events
            </Typography>
          </Box>

          {/* Filter Bar */}
          <Box
            sx={{
              p: 1.5,
              mb: 1.5,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 1.5,
              alignItems: 'center',
              borderRadius: 1.5,
              bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'grey.800' : 'grey.100'),
            }}
          >
            <TextField
              size="small"
              placeholder="Search person or card..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(0);
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <IconSearch size={18} />
                  </InputAdornment>
                ),
                endAdornment: searchTerm ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchTerm('')}>
                      <IconClear size={16} />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              }}
              sx={{ minWidth: 220, maxWidth: 320, flex: 1 }}
            />

            <FormControl size="small" sx={{ minWidth: 130 }}>
              <InputLabel id="movement-direction-label">Movement</InputLabel>
              <Select
                labelId="movement-direction-label"
                label="Movement"
                value={directionFilter}
                onChange={(e) => {
                  setDirectionFilter(e.target.value as any);
                  setPage(0);
                }}
              >
                <MenuItem value="all">All Movements</MenuItem>
                <MenuItem value="In">Go In</MenuItem>
                <MenuItem value="Out">Go Out</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 130 }}>
              <InputLabel id="movement-person-type-label">Person Type</InputLabel>
              <Select
                labelId="movement-person-type-label"
                label="Person Type"
                value={personTypeFilter}
                onChange={(e) => {
                  setPersonTypeFilter(e.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="all">All Types</MenuItem>
                <MenuItem value="visitor">Visitor</MenuItem>
                <MenuItem value="member">Member</MenuItem>
                <MenuItem value="security">Security</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* Table Container */}
          <BlankCard>
            <TableContainer
              sx={{
                maxHeight: isHealthExpanded ? 300 : 540,
                minHeight: 200,
                overflowY: 'auto',
                transition: 'max-height 0.3s ease',
              }}
            >
              <Table size="small" stickyHeader aria-label="area movement table">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: '50px', textAlign: 'center' }}>#</TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={orderBy === 'target'}
                        direction={orderBy === 'target' ? order : 'asc'}
                        onClick={() => handleSort('target')}
                      >
                        <Typography variant="subtitle2" fontWeight={700}>
                          Person Name
                        </Typography>
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={orderBy === 'dmac'}
                        direction={orderBy === 'dmac' ? order : 'asc'}
                        onClick={() => handleSort('dmac')}
                      >
                        <Typography variant="subtitle2" fontWeight={700}>
                          Card Number
                        </Typography>
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={orderBy === 'personType'}
                        direction={orderBy === 'personType' ? order : 'asc'}
                        onClick={() => handleSort('personType')}
                      >
                        <Typography variant="subtitle2" fontWeight={700}>
                          Type
                        </Typography>
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={orderBy === 'direction'}
                        direction={orderBy === 'direction' ? order : 'asc'}
                        onClick={() => handleSort('direction')}
                      >
                        <Typography variant="subtitle2" fontWeight={700}>
                          Movement
                        </Typography>
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight={700}>
                        Details
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={orderBy === 'time'}
                        direction={orderBy === 'time' ? order : 'asc'}
                        onClick={() => handleSort('time')}
                      >
                        <Typography variant="subtitle2" fontWeight={700}>
                          Time
                        </Typography>
                      </TableSortLabel>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {displayedRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4 }}>
                        <Typography color="textSecondary">
                          {!areaName
                            ? 'This reader is not assigned to any area.'
                            : 'No movement records found for this area.'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayedRows.map((log, index) => {
                      const isIn = log.direction === 'In';
                      const detailsText = isIn
                        ? `From: ${log.prevArea || 'External / Initial'}`
                        : `To: ${log.nextArea || 'Unknown Area'}`;

                      return (
                        <TableRow key={log.id} hover>
                          <TableCell sx={{ textAlign: 'center' }}>
                            {index + 1 + page * rowsPerPage}
                          </TableCell>
                          <TableCell>
                            <Typography fontWeight={600} variant="body2">
                              {log.target}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="textSecondary">
                              {log.dmac}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {log.personType || 'Unknown'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              icon={
                                isIn ? (
                                  <IconArrowDownLeft size={16} />
                                ) : (
                                  <IconArrowUpRight size={16} />
                                )
                              }
                              label={isIn ? 'Go In' : 'Go Out'}
                              size="small"
                              color={isIn ? 'success' : 'warning'}
                              variant="filled"
                              sx={{
                                fontWeight: 700,
                                px: 0.5,
                                '& .MuiChip-icon': {
                                  color: 'inherit',
                                },
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="textSecondary" sx={{ fontWeight: 500 }}>
                              {detailsText}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="textSecondary">
                              {formatTime(log.time)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              rowsPerPageOptions={[5, 10, 25, 50]}
              component="div"
              count={processedLogs.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
            />
          </BlankCard>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default ReaderDetailPopup;
