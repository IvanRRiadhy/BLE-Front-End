import {
  Box,
  Button,
  Checkbox,
  Drawer,
  Grid2 as Grid,
  IconButton,
  InputAdornment,
  ListItemIcon,
  ListItemText,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import { AppDispatch, RootState, useDispatch, useSelector } from 'src/store/Store';
import { IconAdjustmentsHorizontal, IconSearch, IconX } from '@tabler/icons-react';
import { isEqual } from 'lodash';
import { useEffect, useState, useCallback } from 'react';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';
import { UpdateFilter } from 'src/store/apps/crud/alarmRecordTracking';
import { defaultAlarmRecordFilter } from 'src/store/apps/defaultForm';
import { fetchVisitor } from 'src/store/apps/crud/visitor';
import { fetchBleReaders } from 'src/store/apps/crud/bleReader';
import { fetchMembers } from 'src/store/apps/crud/member';
import { fetchMaskedAreas } from 'src/store/apps/crud/maskedArea';
import { fetchFloorplan } from 'src/store/apps/crud/floorplan';
import { fetchFloors } from 'src/store/apps/crud/floor';
import { fetchBuildings } from 'src/store/apps/crud/building';
import AutocompleteFilter from 'src/layouts/full/horizontal/navbar/AutocompleteFilter';
import dayjs, { Dayjs } from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import 'dayjs/locale/id';
import { DateTimePicker, renderTimeViewClock } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

dayjs.extend(localizedFormat);
dayjs.extend(weekOfYear);
dayjs.locale('id');

type TimeRangeKey = 'any' | 'today' | 'week' | 'month' | 'custom';

type FilterState = {
  VisitorId: string[];
  MemberId: string[];
  ReaderId: string[];
  FloorplanMaskedAreaId: string[];
};

const AlarmRecordFilter = () => {
  const dispatch: AppDispatch = useDispatch();
  const [open, setOpen] = useState(false);
  const [resetToken, setResetToken] = useState(0);
  const [searchValue, setSearchValue] = useState('');

  // --- Time Filter ---
  const [timeRange, setTimeRange] = useState<TimeRangeKey>('any');
  const [startTime, setStartTime] = useState<Dayjs | null>(null);
  const [endTime, setEndTime] = useState<Dayjs | null>(null);

  // Redux state
  const alarmRecordFilter = useSelector(
    (state: RootState) => state.alarmReducer.alarmRecordFilter,
  );

  const visitorData = useSelector((state: RootState) => state.visitorReducer.visitorAll);
  const memberData = useSelector((state: RootState) => state.memberReducer.memberAll);
  const areaData = useSelector((state: RootState) => state.maskedAreaReducer.maskedAreaAll);
  const floorplanData = useSelector((state: RootState) => state.floorplanReducer.floorplanAll);
  const floorData = useSelector((state: RootState) => state.floorReducer.floorAll);
  const buildingData = useSelector((state: RootState) => state.buildingReducer.buildingAll);
  const bleReaderData = useSelector((state: RootState) => state.bleReaderReducer.bleReaderAll);

  // Local UI filter state
  const [filterState, setFilterState] = useState<FilterState>({
    VisitorId: alarmRecordFilter?.filters?.VisitorId ?? [],
    MemberId: alarmRecordFilter?.filters?.MemberId ?? [],
    ReaderId: alarmRecordFilter?.filters?.ReaderId ?? [],
    FloorplanMaskedAreaId: alarmRecordFilter?.filters?.FloorplanMaskedAreaId ?? [],
  });

  // Sync with Redux
  useEffect(() => {
    const f = alarmRecordFilter.filters;
    if (!isEqual(f, filterState)) {
      setFilterState({
        VisitorId: f?.VisitorId ?? [],
        MemberId: f?.MemberId ?? [],
        ReaderId: f?.ReaderId ?? [],
        FloorplanMaskedAreaId: f?.FloorplanMaskedAreaId ?? [],
      });
    }
  }, [alarmRecordFilter]);

  // Fetch data
  useEffect(() => {
    dispatch(fetchVisitor());
    dispatch(fetchBleReaders());
    dispatch(fetchMembers());
    dispatch(fetchMaskedAreas());
    dispatch(fetchFloorplan());
    dispatch(fetchFloors());
    dispatch(fetchBuildings());
  }, [dispatch]);

  // --- Time Range Helpers ---
  const getRange = (key: TimeRangeKey): { start?: Dayjs; end?: Dayjs } => {
    const now = dayjs();
    switch (key) {
      case 'today':
        return { start: now.startOf('day'), end: now.endOf('day') };
      case 'week':
        return { start: now.startOf('week'), end: now.endOf('week') };
      case 'month':
        return { start: now.startOf('month'), end: now.endOf('month') };
      default:
        return {};
    }
  };

  const setFilters = (start?: Dayjs | null, end?: Dayjs | null) => {
    if (!start || !end) {
      dispatch(UpdateFilter({ filters: filterState, dateFilters: {} }));
      return;
    }
    dispatch(
      UpdateFilter({
        filters: filterState,
        dateFilters: {
          TimeStamp: {
            DateFrom: start.toISOString(),
            DateTo: end.toISOString(),
          },
        },
      }),
    );
  };

  // --- React to timeRange changes ---
  useEffect(() => {
    if (timeRange === 'custom') return;
    const { start, end } = getRange(timeRange);
    setStartTime(start ?? null);
    setEndTime(end ?? null);
    setFilters(start ?? null, end ?? null);
  }, [timeRange]);

  useEffect(() => {
    if (timeRange !== 'custom') return;
    if (startTime && endTime) setFilters(startTime, endTime);
  }, [timeRange, startTime, endTime]);

  // --- Search (debounced + enter) ---
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      dispatch(UpdateFilter({ ...alarmRecordFilter, SearchValue: searchValue.trim() }));
    }, 1000);
    return () => clearTimeout(delayDebounce);
  }, [searchValue]);

  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      dispatch(UpdateFilter({ ...alarmRecordFilter, SearchValue: searchValue.trim() }));
    }
  };

  // --- Reset & Apply ---
  const handleApplyFilter = () => {
    dispatch(UpdateFilter({Start: 0, filters: filterState }));
    setOpen(false);
  };

  const handleResetFilter = () => {
    const defaults = defaultAlarmRecordFilter.filters;
    setFilterState({
      VisitorId: defaults?.VisitorId ?? [],
      MemberId: defaults?.MemberId ?? [],
      ReaderId: defaults?.ReaderId ?? [],
      FloorplanMaskedAreaId: defaults?.FloorplanMaskedAreaId ?? [],
    });
    setTimeRange('any');
    setStartTime(null);
    setEndTime(null);
    setResetToken((n) => n + 1);
    setSearchValue('');
    dispatch(UpdateFilter({ filters: defaults, dateFilters: {}, SearchValue: '' }));
    setOpen(false);
  };

  const extractAreaFilter = (areaFilter: {
    BuildingId: string[];
    FloorId: string[];
    FloorplanId: string[];
    MaskedAreaId: string[];
  }): { FloorplanMaskedAreaId: string[] } => ({
    FloorplanMaskedAreaId: areaFilter?.MaskedAreaId ?? [],
  });

  const handleAreaChange = useCallback(
    (areaFilter: {
      BuildingId: string[];
      FloorId: string[];
      FloorplanId: string[];
      MaskedAreaId: string[];
    }) => {
      const { FloorplanMaskedAreaId } = extractAreaFilter(areaFilter);
      setFilterState((prev) => ({
        ...prev,
        FloorplanMaskedAreaId,
      }));
    },
    [],
  );

  const clearField = (field: keyof FilterState) => {
    setFilterState((prev) => ({ ...prev, [field]: [] }));
  };

  return (
    <>
      {/* Header Buttons (Filter + Search) */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Button
          onClick={() => setOpen(true)}
          size="medium"
          variant="outlined"
          startIcon={<IconAdjustmentsHorizontal />}
          color="info"
          sx={{ height: 36 }}
        >
          <Typography variant="caption" fontSize={'0.7rem'}>
            Filter
          </Typography>
        </Button>

        <TextField
          placeholder="Search..."
          variant="outlined"
          size="small"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onKeyDown={handleSearchKeyPress}
          sx={{ width: 220 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <IconSearch size={18} />
              </InputAdornment>
            ),
            endAdornment: searchValue.length > 0 && (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setSearchValue('')}>
                  <IconX size={16} />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Drawer */}
      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        PaperProps={{
          sx: {
            width: 360,
            padding: 3,
            backgroundColor: 'background.paper',
          },
        }}
      >
        <Typography
          variant="h4"
          gutterBottom
          sx={{ my: 2, borderBottom: 5, borderColor: 'primary.main' }}
        >
          Alarm Record Filter
        </Typography>

        <Box sx={{ overflowY: 'auto', maxHeight: 'calc(100vh - 160px)', pb: 2 }}>
          <Grid container spacing={3}>
            {/* Time Filter */}
            <Grid size={12}>
              <CustomFormLabel htmlFor="timeRange">
                <Typography variant="caption">Tracking Time :</Typography>
              </CustomFormLabel>
              <TextField
                select
                fullWidth
                label="Time Range"
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as TimeRangeKey)}
                size="small"
              >
                <MenuItem value="any">Any</MenuItem>
                <MenuItem value="today">Today</MenuItem>
                <MenuItem value="week">This Week</MenuItem>
                <MenuItem value="month">This Month</MenuItem>
                <MenuItem value="custom">Custom</MenuItem>
              </TextField>

              {timeRange === 'custom' && (
                <Box mt={2}>
                  <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="id">
                    <Grid container spacing={1.5}>
                      <Grid size={12}>
                        <DateTimePicker
                          label="From"
                          value={startTime}
                          onChange={setStartTime}
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
                          value={endTime}
                          onChange={setEndTime}
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
            </Grid>

             {/* 👤 Visitor Filter */}
            <Grid size={12}>
              <CustomFormLabel htmlFor="visitorId">
                <Typography variant="caption">Visitor :</Typography>
              </CustomFormLabel>
              <CustomSelect
                name="VisitorId"
                value={filterState.VisitorId}
                onChange={(e: any) =>
                  setFilterState((prev) => ({ ...prev, VisitorId: e.target.value ?? [] }))
                }
                fullWidth
                multiple
                variant="outlined"
                InputProps={{
                  endAdornment: filterState.VisitorId.length > 0 && (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => clearField('VisitorId')}>
                        <IconX size={16} />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                renderValue={(selected: string[]) => {
                  if (selected.length === 0) return 'Select Visitors';
                  return selected
                    .map((id: string) => visitorData.find((v: any) => v.id === id)?.name || '')
                    .join(', ');
                }}
              >
                {visitorData.map((v: any) => (
                  <MenuItem key={v.id} value={v.id}>
                    <ListItemIcon>
                      <Checkbox checked={filterState.VisitorId.includes(v.id)} />
                    </ListItemIcon>
                    <ListItemText primary={v.name} />
                  </MenuItem>
                ))}
              </CustomSelect>
            </Grid>

            {/* 🧑‍🤝‍🧑 Member Filter */}
            <Grid size={12}>
              <CustomFormLabel htmlFor="memberId">
                <Typography variant="caption">Member :</Typography>
              </CustomFormLabel>
              <CustomSelect
                name="MemberId"
                value={filterState.MemberId}
                onChange={(e: any) =>
                  setFilterState((prev) => ({ ...prev, MemberId: e.target.value ?? [] }))
                }
                fullWidth
                multiple
                variant="outlined"
                InputProps={{
                  endAdornment: filterState.MemberId.length > 0 && (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => clearField('MemberId')}>
                        <IconX size={16} />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                renderValue={(selected: string[]) => {
                  if (selected.length === 0) return 'Select Members';
                  return selected
                    .map((id: string) => memberData.find((m: any) => m.id === id)?.name || '')
                    .join(', ');
                }}
              >
                {memberData.map((m: any) => (
                  <MenuItem key={m.id} value={m.id}>
                    <ListItemIcon>
                      <Checkbox checked={filterState.MemberId.includes(m.id)} />
                    </ListItemIcon>
                    <ListItemText primary={m.name} />
                  </MenuItem>
                ))}
              </CustomSelect>
            </Grid>

            {/* 🛰️ BLE Reader Filter */}
            <Grid size={12}>
              <CustomFormLabel htmlFor="readerId">
                <Typography variant="caption">BLE Reader :</Typography>
              </CustomFormLabel>
              <CustomSelect
                name="ReaderId"
                value={filterState.ReaderId}
                onChange={(e: any) =>
                  setFilterState((prev) => ({ ...prev, ReaderId: e.target.value ?? [] }))
                }
                fullWidth
                multiple
                variant="outlined"
                InputProps={{
                  endAdornment: filterState.ReaderId.length > 0 && (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => clearField('ReaderId')}>
                        <IconX size={16} />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                renderValue={(selected: string[]) => {
                  if (selected.length === 0) return 'Select Readers';
                  return selected
                    .map((id: string) => bleReaderData.find((r: any) => r.id === id)?.name || '')
                    .join(', ');
                }}
              >
                {bleReaderData.map((r: any) => (
                  <MenuItem key={r.id} value={r.id}>
                    <ListItemIcon>
                      <Checkbox checked={filterState.ReaderId.includes(r.id)} />
                    </ListItemIcon>
                    <ListItemText primary={r.name} />
                  </MenuItem>
                ))}
              </CustomSelect>
            </Grid>

            {/* 📍 Area Filter */}
            <Grid size={12}>
              <CustomFormLabel>
                <Typography variant="caption">Area :</Typography>
              </CustomFormLabel>
              <AutocompleteFilter
                buildings={buildingData}
                floors={floorData}
                floorplans={floorplanData}
                maskedAreas={areaData}
                initial={{
                  BuildingId: [],
                  FloorId: [],
                  FloorplanId: [],
                  MaskedAreaId: filterState.FloorplanMaskedAreaId,
                }}
                onChangeFilter={handleAreaChange}
                resetToken={resetToken}
              />
            </Grid>
          </Grid>
        </Box>

        {/* Footer */}
        <Box
          sx={{
            position: 'sticky',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: 'background.paper',
            pt: 2,
            pb: 0,
            mt: 3,
            boxShadow: '0 -2px 6px rgba(0,0,0,0.05)',
            zIndex: 10,
          }}
        >
          <Grid container justifyContent="space-between" px={0.5}>
            <Grid size={4}>
              <Button variant="outlined" color="error" fullWidth onClick={handleResetFilter}>
                Reset
              </Button>
            </Grid>
            <Grid size={7.5}>
              <Button
                variant="contained"
                color="primary"
                fullWidth
                onClick={handleApplyFilter}
                disabled={isEqual(filterState, alarmRecordFilter.filters)}
              >
                Apply
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Drawer>
    </>
  );
};

export default AlarmRecordFilter;
