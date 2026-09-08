import React, { useState, useMemo } from 'react';
import {
  Box,
  Grid2 as Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  TablePagination,
  TableSortLabel,
  TextField,
  InputAdornment,
  MenuItem,
  FormControl,
  Select,
  InputLabel,
  IconButton,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import BlankCard from 'src/components/shared/BlankCard';
import { useTranslation } from 'react-i18next';
import { useEnrichedTrackingLogs } from 'src/hooks/useTrackingLogs';
import { useAllReaders } from 'src/hooks/useReader';
import { useAllMembers } from 'src/hooks/useMember';
import { useAllVisitor } from 'src/hooks/useVisitor';
import { useAllSecuritys } from 'src/hooks/useSecurityGuard';

type Props = {
  isNew?: boolean;
  focusType?: string;
  focusId?: string;
};

type SortField = 'target' | 'area' | 'time' | 'dmac' | 'personType' | 'type';

const TrackingTransactionList = ({ isNew }: Props) => {
  const { t } = useTranslation();
  useAllReaders();
  useAllMembers();
  useAllVisitor();
  useAllSecuritys();

  const trackingLogs = useEnrichedTrackingLogs();

  // Search, Filter & Sort State
  const [searchTerm, setSearchTerm] = useState('');
  const [personTypeFilter, setPersonTypeFilter] = useState('all');
  const [alarmFilter, setAlarmFilter] = useState('all');
  const [orderBy, setOrderBy] = useState<SortField>('time');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');

  // Pagination State
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const handleSort = (field: SortField) => {
    const isAsc = orderBy === field && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(field);
    setPage(0);
  };

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
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
        hour12: false,
      },
    )}`;
  };

  // Filtered & Sorted Tracking Data
  const processedLogs = useMemo(() => {
    let result = [...trackingLogs];

    // Search filter across target name, card number (dmac), and area
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(
        (log) =>
          (log.target && log.target.toLowerCase().includes(q)) ||
          (log.dmac && log.dmac.toLowerCase().includes(q)) ||
          (log.area && log.area.toLowerCase().includes(q)) ||
          (log.floor && log.floor.toLowerCase().includes(q)),
      );
    }

    // Person type filter
    if (personTypeFilter !== 'all') {
      result = result.filter((log) => {
        const type = (log.personType || '').toLowerCase();
        return type === personTypeFilter.toLowerCase();
      });
    }

    // Alarm status filter
    if (alarmFilter !== 'all') {
      result = result.filter((log) => {
        const isAlarm = log.type === 'Alarm';
        return alarmFilter === 'alarm' ? isAlarm : !isAlarm;
      });
    }

    // Sorting
    result.sort((a: any, b: any) => {
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

    return result;
  }, [trackingLogs, searchTerm, personTypeFilter, alarmFilter, orderBy, order]);

  const displayedRows = useMemo(() => {
    return processedLogs.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [processedLogs, page, rowsPerPage]);

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Search and Filters Bar */}
      <Box
        sx={{
          p: 1.5,
          mb: 1.5,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1.5,
          alignItems: 'center',
          justifyContent: 'space-between',
          borderRadius: 1.5,
          bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'grey.800' : 'grey.100'),
        }}
      >
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center', flex: 1, minWidth: 260 }}>
          <TextField
            size="small"
            placeholder="Search person, card, or area..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(0);
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: searchTerm ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearchTerm('')}>
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : null,
            }}
            sx={{ minWidth: 240, maxWidth: 360, flex: 1 }}
          />

          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel id="person-type-label">Person Type</InputLabel>
            <Select
              labelId="person-type-label"
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

          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel id="alarm-filter-label">Alarm</InputLabel>
            <Select
              labelId="alarm-filter-label"
              label="Alarm"
              value={alarmFilter}
              onChange={(e) => {
                setAlarmFilter(e.target.value);
                setPage(0);
              }}
            >
              <MenuItem value="all">All Status</MenuItem>
              <MenuItem value="alarm">Alarm</MenuItem>
              <MenuItem value="normal">Normal</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Typography variant="body2" color="textSecondary">
          Total: <strong>{processedLogs.length}</strong> records
        </Typography>
      </Box>

      {/* Table Content */}
      <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        <BlankCard>
          <TableContainer sx={{ maxHeight: 'calc(100vh - 350px)', minHeight: '260px', overflowY: 'auto' }}>
            <Table aria-label="tracking record table" sx={{ tableLayout: 'fixed', width: '100%' }}>
              <TableHead>
                <TableRow>
                  <TableCell
                    sx={{
                      position: 'sticky',
                      top: 0,
                      left: 0,
                      bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'background.paper' : '#ffffff'),
                      zIndex: 3,
                      width: '60px',
                      textAlign: 'center',
                    }}
                  >
                    <Typography variant="subtitle2" fontWeight={700}>#</Typography>
                  </TableCell>

                  <TableCell sx={{ position: 'sticky', top: 0, bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'background.paper' : '#ffffff'), zIndex: 2 }}>
                    <TableSortLabel
                      active={orderBy === 'target'}
                      direction={orderBy === 'target' ? order : 'asc'}
                      onClick={() => handleSort('target')}
                    >
                      <Typography variant="subtitle2" fontWeight={700}>Person Name</Typography>
                    </TableSortLabel>
                  </TableCell>

                  <TableCell sx={{ position: 'sticky', top: 0, bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'background.paper' : '#ffffff'), zIndex: 2 }}>
                    <TableSortLabel
                      active={orderBy === 'area'}
                      direction={orderBy === 'area' ? order : 'asc'}
                      onClick={() => handleSort('area')}
                    >
                      <Typography variant="subtitle2" fontWeight={700}>Area</Typography>
                    </TableSortLabel>
                  </TableCell>

                  <TableCell sx={{ position: 'sticky', top: 0, bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'background.paper' : '#ffffff'), zIndex: 2 }}>
                    <TableSortLabel
                      active={orderBy === 'time'}
                      direction={orderBy === 'time' ? order : 'asc'}
                      onClick={() => handleSort('time')}
                    >
                      <Typography variant="subtitle2" fontWeight={700}>Time</Typography>
                    </TableSortLabel>
                  </TableCell>

                  <TableCell sx={{ position: 'sticky', top: 0, bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'background.paper' : '#ffffff'), zIndex: 2 }}>
                    <TableSortLabel
                      active={orderBy === 'dmac'}
                      direction={orderBy === 'dmac' ? order : 'asc'}
                      onClick={() => handleSort('dmac')}
                    >
                      <Typography variant="subtitle2" fontWeight={700}>Card Number</Typography>
                    </TableSortLabel>
                  </TableCell>

                  <TableCell sx={{ position: 'sticky', top: 0, bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'background.paper' : '#ffffff'), zIndex: 2 }}>
                    <TableSortLabel
                      active={orderBy === 'personType'}
                      direction={orderBy === 'personType' ? order : 'asc'}
                      onClick={() => handleSort('personType')}
                    >
                      <Typography variant="subtitle2" fontWeight={700}>Type</Typography>
                    </TableSortLabel>
                  </TableCell>

                  <TableCell sx={{ position: 'sticky', top: 0, bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'background.paper' : '#ffffff'), zIndex: 2 }}>
                    <TableSortLabel
                      active={orderBy === 'type'}
                      direction={orderBy === 'type' ? order : 'asc'}
                      onClick={() => handleSort('type')}
                    >
                      <Typography variant="subtitle2" fontWeight={700}>Alarm</Typography>
                    </TableSortLabel>
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {displayedRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4 }}>
                      <Typography color="textSecondary">No tracking records found</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  displayedRows.map((log, index) => {
                    const isAlarm = log.type === 'Alarm';
                    const isVisitor = log.personType === 'Visitor';
                    const isMember = log.personType === 'Member';
                    const isSecurity = log.personType === 'Security';

                    return (
                      <TableRow key={log.id || `${log.dmac}-${index}`}>
                        <TableCell
                          sx={{
                            position: 'sticky',
                            left: 0,
                            bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'background.paper' : '#ffffff'),
                            zIndex: 1,
                            width: '60px',
                            textAlign: 'center',
                          }}
                        >
                          {index + 1 + page * rowsPerPage}
                        </TableCell>

                        <TableCell>
                          <Typography fontWeight={600}>{log.target}</Typography>
                        </TableCell>

                        <TableCell>
                          {log.area} {log.floor ? `– ${log.floor}` : ''}
                        </TableCell>

                        <TableCell>{formatTime(log.time)}</TableCell>

                        <TableCell>{log.dmac}</TableCell> 

                        <TableCell>
                          {isVisitor ? 'Visitor' : isMember ? 'Member' : isSecurity ? 'Security' : 'Unknown'}
                        </TableCell>

                        <TableCell>
                          {isAlarm ? (
                            <Typography color="error" fontWeight={600}>
                              Yes
                            </Typography>
                          ) : (
                            'No'
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {!isNew && (
            <TablePagination
              rowsPerPageOptions={[5, 10, 25, 50]}
              component="div"
              count={processedLogs.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          )}
        </BlankCard>
      </Box>
    </Box>
  );
};

export default TrackingTransactionList;
