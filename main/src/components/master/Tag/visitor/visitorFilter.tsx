import { RootState, useDispatch, useSelector } from 'src/store/Store';
import {
  ListItemText,
  ListItemButton,
  List,
  Divider,
  ListItemIcon,
  Typography,
  Box,
  Grid2 as Grid,
} from '@mui/material';
import { IconCircleX, IconClearAll } from '@tabler/icons-react';
import {
  gender,
  genderIconMap,
  visitorStatus,
  visitorStatusIconMap,
} from 'src/types/crud/input';
import VisitorRegister from './visitorregister/visitorRegister';
import { SelectTrxVisitor, UpdateFilter } from 'src/store/apps/crud/trxVisitor';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { useEffect, useState } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import 'dayjs/locale/id';

import { DateTimePicker, renderTimeViewClock } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import React from 'react';

dayjs.extend(localizedFormat);
dayjs.extend(weekOfYear);
dayjs.locale('id');

interface DataType {
  id: string | number;
  name?: string;
  filter?: string;
  icon?: any;
  filterbyTitle?: string;
  divider?: boolean;
  color?: string;
  category?: 'all' | 'status' | 'gender';
}

type TimeRangeKey = 'any' | 'today' | 'week' | 'month' | 'custom';

// Mapping status labels/values to lowercase standard keys
const STATUS_KEY_MAP: Record<string, string> = {
  waiting: 'waiting',
  checkin: 'checkin',
  checkout: 'checkout',
  denied: 'denied',
  deny: 'denied',
  block: 'block',
  unblock: 'unblock',
  precheckin: 'precheckin',
  preregist: 'preregist',
};

const VisitorFilter = () => {
  const dispatch = useDispatch();
  const settings = useSelector((state: RootState) => state.settings);
  const br = `${settings.borderRadius}px`;

  const trxVisitorFilter = useSelector(
    (state: RootState) => state.TrxVisitorReducer.TrxVisitorFilter.filters,
  );
  const trxVisitorDateFilter = useSelector(
    (state: RootState) => state.TrxVisitorReducer.TrxVisitorFilter.dateFilters,
  );

  // Draft filters state for status and gender
  const initialSelectedStatus: string[] = (() => {
    const raw = (trxVisitorFilter as any)?.status ?? (trxVisitorFilter as any)?.Status;
    if (Array.isArray(raw)) return raw.map((s: string) => s.toLowerCase());
    if (typeof raw === 'string' && raw) return [raw.toLowerCase()];
    return [];
  })();

  const initialSelectedGender: string[] = (() => {
    const raw = (trxVisitorFilter as any)?.gender ?? (trxVisitorFilter as any)?.Gender;
    if (Array.isArray(raw)) return raw.map((g: string) => g.toLowerCase());
    if (typeof raw === 'string' && raw) return [raw.toLowerCase()];
    return [];
  })();

  const [draftStatus, setDraftStatus] = useState<string[]>(initialSelectedStatus);
  const [draftGender, setDraftGender] = useState<string[]>(initialSelectedGender);

  // Time filter draft state
  const [draftTimeRange, setDraftTimeRange] = useState<TimeRangeKey>('any');
  const [draftStartTime, setDraftStartTime] = useState<Dayjs | null>(null);
  const [draftEndTime, setDraftEndTime] = useState<Dayjs | null>(null);

  // Sync draft status, gender, and time with redux when external redux filters change
  useEffect(() => {
    const rawStatus = (trxVisitorFilter as any)?.status ?? (trxVisitorFilter as any)?.Status;
    const currentStatus = Array.isArray(rawStatus)
      ? rawStatus.map((s: string) => s.toLowerCase())
      : typeof rawStatus === 'string' && rawStatus
      ? [rawStatus.toLowerCase()]
      : [];
    setDraftStatus(currentStatus);

    const rawGender = (trxVisitorFilter as any)?.gender ?? (trxVisitorFilter as any)?.Gender;
    const currentGender = Array.isArray(rawGender)
      ? rawGender.map((g: string) => g.toLowerCase())
      : typeof rawGender === 'string' && rawGender
      ? [rawGender.toLowerCase()]
      : [];
    setDraftGender(currentGender);

    const appliedPeriod = (trxVisitorDateFilter as any)?.VisitorPeriodStart;
    if (appliedPeriod?.DateFrom && appliedPeriod?.DateTo) {
      setDraftStartTime(dayjs(appliedPeriod.DateFrom));
      setDraftEndTime(dayjs(appliedPeriod.DateTo));
    } else {
      setDraftTimeRange('any');
      setDraftStartTime(null);
      setDraftEndTime(null);
    }
  }, [trxVisitorFilter, trxVisitorDateFilter]);

  const genderFilters: DataType[] = gender
    .filter((g) => !g.disabled)
    .map((g) => ({
      id: g.value,
      name: g.label,
      filter: g.value.toLowerCase(),
      category: 'gender',
      icon: genderIconMap[g.value] || IconCircleX,
    }));

  const statusFilters: DataType[] = visitorStatus
    .filter((status) => !status.disabled)
    .map((status) => {
      const standardKey = STATUS_KEY_MAP[status.value.toLowerCase()] || status.value.toLowerCase();
      return {
        id: status.value,
        name: status.label,
        filter: standardKey,
        category: 'status',
        icon: visitorStatusIconMap[status.value] || IconCircleX,
      };
    });

  const filterData: DataType[] = [
    {
      id: 'all',
      name: 'All',
      filter: 'show_all',
      category: 'all',
      icon: IconClearAll,
    },
    {
      id: 'div-time',
      divider: true,
    },
    {
      id: 'title-time',
      filterbyTitle: 'Visiting Time',
    },
    {
      id: 'div-gender',
      divider: true,
    },
    {
      id: 'title-gender',
      filterbyTitle: 'Gender',
    },
    ...genderFilters,
    {
      id: 'div-status',
      divider: true,
    },
    {
      id: 'title-status',
      filterbyTitle: 'Status',
    },
    ...statusFilters,
  ];

  const handleToggleFilter = (filterVal: string, category?: string) => {
    if (category === 'all') {
      setDraftStatus([]);
      setDraftGender([]);
      setDraftTimeRange('any');
      setDraftStartTime(null);
      setDraftEndTime(null);
      return;
    }

    if (category === 'status') {
      const key = STATUS_KEY_MAP[filterVal.toLowerCase()] || filterVal.toLowerCase();
      setDraftStatus((prev) =>
        prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key],
      );
    } else if (category === 'gender') {
      const key = filterVal.toLowerCase();
      setDraftGender((prev) =>
        prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key],
      );
    }
  };

  const getRange = (key: TimeRangeKey, customStart?: Dayjs | null, customEnd?: Dayjs | null): { start?: Dayjs | null; end?: Dayjs | null } => {
    const now = dayjs();
    switch (key) {
      case 'today': {
        const start = now.startOf('day');
        const end = start.add(1, 'day');
        return { start, end };
      }
      case 'week': {
        const start = now.startOf('week');
        const end = start.add(1, 'week');
        return { start, end };
      }
      case 'month': {
        const start = now.startOf('month');
        const end = start.add(1, 'month');
        return { start, end };
      }
      case 'custom':
        return { start: customStart ?? null, end: customEnd ?? null };
      case 'any':
      default:
        return { start: null, end: null };
    }
  };

  const handleTimeRangeSelect = (newRange: TimeRangeKey) => {
    setDraftTimeRange(newRange);
    if (newRange !== 'custom') {
      const { start, end } = getRange(newRange);
      setDraftStartTime(start ?? null);
      setDraftEndTime(end ?? null);
    }
  };

  // Comparison for changed / active state
  const reduxStatus = (trxVisitorFilter as any)?.status ?? (trxVisitorFilter as any)?.Status ?? [];
  const reduxGender = (trxVisitorFilter as any)?.gender ?? (trxVisitorFilter as any)?.Gender ?? [];

  const normalizedReduxStatus: string[] = Array.isArray(reduxStatus)
    ? reduxStatus.map((s: string) => s.toLowerCase())
    : typeof reduxStatus === 'string' && reduxStatus
    ? [reduxStatus.toLowerCase()]
    : [];

  const normalizedReduxGender: string[] = Array.isArray(reduxGender)
    ? reduxGender.map((g: string) => g.toLowerCase())
    : typeof reduxGender === 'string' && reduxGender
    ? [reduxGender.toLowerCase()]
    : [];

  const appliedPeriod = (trxVisitorDateFilter as any)?.VisitorPeriodStart;
  const appliedDateFrom = appliedPeriod?.DateFrom || null;
  const appliedDateTo = appliedPeriod?.DateTo || null;

  const resolvedDraftRange = getRange(draftTimeRange, draftStartTime, draftEndTime);
  const draftDateFrom = resolvedDraftRange.start ? resolvedDraftRange.start.toISOString() : null;
  const draftDateTo = resolvedDraftRange.end ? resolvedDraftRange.end.toISOString() : null;

  const isStatusChanged =
    JSON.stringify([...draftStatus].sort()) !== JSON.stringify([...normalizedReduxStatus].sort());
  const isGenderChanged =
    JSON.stringify([...draftGender].sort()) !== JSON.stringify([...normalizedReduxGender].sort());
  const isTimeChanged =
    draftDateFrom !== appliedDateFrom || draftDateTo !== appliedDateTo;

  const isChanged = isStatusChanged || isGenderChanged || isTimeChanged;

  const hasTimeSelected = Boolean(draftDateFrom && draftDateTo);
  const totalSelected = draftStatus.length + draftGender.length + (hasTimeSelected ? 1 : 0);

  const handleApply = () => {
    const newFilters: any = {};

    if (draftStatus.length > 0) {
      newFilters.status = draftStatus;
      newFilters.Status = draftStatus;
    }

    if (draftGender.length > 0) {
      newFilters.gender = draftGender;
      newFilters.Gender = draftGender.length === 1 ? draftGender[0] : draftGender;
    }

    const newDateFilters: any = {};
    if (draftDateFrom && draftDateTo) {
      newDateFilters.VisitorPeriodStart = {
        DateFrom: draftDateFrom,
        DateTo: draftDateTo,
      };
    }

    dispatch(
      UpdateFilter({
        filters: newFilters,
        dateFilters: newDateFilters,
        Start: 0,
      }),
    );
    dispatch(SelectTrxVisitor(''));
  };

  const handleReset = () => {
    setDraftStatus([]);
    setDraftGender([]);
    setDraftTimeRange('any');
    setDraftStartTime(null);
    setDraftEndTime(null);

    dispatch(
      UpdateFilter({
        filters: {},
        dateFilters: {},
        Start: 0,
      }),
    );
    dispatch(SelectTrxVisitor(''));
  };

  return (
    <Box display="flex" flexDirection="column" height="100%" maxHeight="100%" sx={{ overflow: 'hidden' }}>
      <Box p={3} sx={{ width: '95%', overflow: 'auto', flexShrink: 0 }}>
        <VisitorRegister />
      </Box>

      {/* Sticky ALL filter */}
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 2,
          backgroundColor: isChanged ? 'info.light' : 'background.paper',
        }}
      >
        <List>
          {filterData
            .filter((f) => f.category === 'all')
            .map((filter) => {
              const isSelected = draftStatus.length === 0 && draftGender.length === 0;

              return (
                <ListItemButton
                  key={filter.id}
                  selected={isSelected}
                  onClick={() => handleToggleFilter(filter.filter!, filter.category)}
                  sx={{
                    mx: 3,
                    borderRadius: br,
                    '&.Mui-selected': {
                      backgroundColor: 'primary.main',
                      color: 'white',
                    },
                    '&.Mui-selected:hover': {
                      backgroundColor: 'primary.dark',
                      color: 'white',
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: '30px' }}>
                    <filter.icon stroke="1.5" size={19} />
                  </ListItemIcon>
                  <ListItemText primary={filter.name} />
                </ListItemButton>
              );
            })}
        </List>
        <Divider />
      </Box>

      {/* Scrollable Filter List */}
      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        <List>
          {filterData
            .filter((f) => f.category !== 'all')
            .map((filter) => {
              if (filter.filterbyTitle) {
                return (
                  <React.Fragment key={filter.id}>
                    <Typography
                      variant="subtitle1"
                      fontWeight={600}
                      pl={5.1}
                      mt={1}
                      pb={1}
                    >
                      {filter.filterbyTitle}
                    </Typography>

                    {/* Visiting Time Pickers under "Visiting Time" */}
                    {filter.id === 'title-time' && (
                      <Box mx={3} mt={1} mb={2}>
                        <TextField
                          select
                          label="Time Range"
                          value={draftTimeRange}
                          onChange={(e) => handleTimeRangeSelect(e.target.value as TimeRangeKey)}
                          fullWidth
                          size="small"
                        >
                          <MenuItem value="any">Any</MenuItem>
                          <MenuItem value="today">Today</MenuItem>
                          <MenuItem value="week">This Week</MenuItem>
                          <MenuItem value="month">This Month</MenuItem>
                          <MenuItem value="custom">Custom</MenuItem>
                        </TextField>

                        {draftTimeRange === 'custom' && (
                          <Box mt={2}>
                            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="id">
                              <Grid container spacing={1.5}>
                                <Grid size={12}>
                                  <DateTimePicker
                                    label="From"
                                    value={draftStartTime}
                                    onChange={(val) => setDraftStartTime(val)}
                                    ampm={false}
                                    format="ddd, DD - MMM - YYYY, HH:mm"
                                    viewRenderers={{
                                      hours: renderTimeViewClock,
                                      minutes: renderTimeViewClock,
                                      seconds: renderTimeViewClock,
                                    }}
                                    slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                                  />
                                </Grid>
                                <Grid size={12}>
                                  <DateTimePicker
                                    label="To"
                                    value={draftEndTime}
                                    onChange={(val) => setDraftEndTime(val)}
                                    ampm={false}
                                    format="ddd, DD - MMM - YYYY, HH:mm"
                                    viewRenderers={{
                                      hours: renderTimeViewClock,
                                      minutes: renderTimeViewClock,
                                      seconds: renderTimeViewClock,
                                    }}
                                    slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                                  />
                                </Grid>
                              </Grid>
                            </LocalizationProvider>
                          </Box>
                        )}
                      </Box>
                    )}
                  </React.Fragment>
                );
              } else if (filter.divider) {
                return <Divider key={filter.id} sx={{ mb: 2 }} />;
              }

              const isSelected =
                filter.category === 'status'
                  ? draftStatus.includes(filter.filter!)
                  : filter.category === 'gender'
                  ? draftGender.includes(filter.filter!)
                  : false;

              return (
                <ListItemButton
                  key={filter.id}
                  selected={isSelected}
                  onClick={() => handleToggleFilter(filter.filter!, filter.category)}
                  sx={{
                    mb: 1,
                    mx: 3,
                    borderRadius: br,
                    '&.Mui-selected': {
                      backgroundColor: 'primary.main',
                      color: 'white',
                    },
                    '&.Mui-selected:hover': {
                      backgroundColor: 'primary.dark',
                      color: 'white',
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: '30px', color: filter.color }}>
                    <filter.icon stroke="1.5" size={19} />
                  </ListItemIcon>
                  <ListItemText primary={filter.name} />
                </ListItemButton>
              );
            })}
        </List>
      </Box>

      {/* Bottom Sticky Action Buttons */}
      <Box
        sx={{
          position: 'sticky',
          bottom: 0,
          p: 2,
          backgroundColor: 'background.paper',
          borderTop: (theme) => `1px solid ${theme.palette.divider}`,
          display: 'flex',
          gap: 1,
          zIndex: 3,
        }}
      >
        <ListItemButton
          onClick={handleReset}
          disabled={totalSelected === 0 && draftTimeRange === 'any'}
          sx={{
            flex: 1,
            justifyContent: 'center',
            borderRadius: br,
            backgroundColor: 'grey.200',
            textAlign: 'center',
          }}
        >
          <ListItemText primary="Reset" />
        </ListItemButton>

        <ListItemButton
          disabled={!isChanged}
          onClick={handleApply}
          sx={{
            flex: 2,
            justifyContent: 'center',
            borderRadius: br,
            backgroundColor: isChanged ? 'primary.main' : 'grey.300',
            color: isChanged ? 'white' : 'grey.500',
            textAlign: 'center',
            '&:hover': {
              backgroundColor: isChanged ? 'primary.dark' : 'grey.300',
              color: isChanged ? 'white' : 'grey.500',
            },
          }}
        >
          <ListItemText
            primary={
              totalSelected > 0
                ? `Apply Filter (${totalSelected})`
                : 'Apply Filter'
            }
          />
        </ListItemButton>
      </Box>
    </Box>
  );
};

export default VisitorFilter;
