import {
  Autocomplete,
  Box,
  Button,
  Drawer,
  Grid2 as Grid,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers';
import { IconAdjustmentsHorizontal } from '@tabler/icons-react';
import { isEqual } from 'lodash';
import { lazy, useEffect, useMemo, useState } from 'react';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import { useAlarmCategoryList, useAllAlarmCategory } from 'src/hooks/AlarmSetting/useAlarmCategory';
import { useLocationHierarchy } from 'src/hooks/useBuilding';
import { UpdateFilter } from 'src/store/apps/crud/alarmTrigger';
import { defaultAlarmSettingFilter } from 'src/store/apps/defaultForm';
import { RootState, useDispatch, useSelector } from 'src/store/Store';
import { actionStatus, actionStatusColormap } from 'src/types/crud/input';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { Dayjs } from 'dayjs';
import { AlarmSettingType } from 'src/store/apps/alarmsetting/alarmSettings';
// import AutocompleteFilter from 'src/layouts/full/horizontal/navbar/AutocompleteFilter';

const AutocompleteFilter = lazy(
  () => import('src/layouts/full/horizontal/navbar/AutocompleteFilter'),
);

import { MenuItem } from '@mui/material';

export const TIME_RANGE_OPTIONS = [
  { label: 'Show All', value: 'all' },
  { label: 'Today (Daily)', value: 'daily' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'This Week', value: 'weekly' },
  { label: 'Last Week', value: 'last_week' },
  { label: 'This Month', value: 'monthly' },
  { label: 'Last Month', value: 'last_month' },
  { label: 'This Year', value: 'yearly' },
  { label: 'Last Year', value: 'last_year' },
  { label: 'Last 7 Days', value: 'last_7_days' },
  { label: 'Last 30 Days', value: 'last_30_days' },
  { label: 'Last 90 Days', value: 'last_90_days' },
  { label: 'Custom Range', value: 'custom' },
];

const AlarmTriggeredFilter = () => {
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);
  const [resetToken, setResetToken] = useState(0);
  const alarmCategory: AlarmSettingType[] = useAllAlarmCategory().data || [];
    const alarms = Array.isArray(alarmCategory) ? alarmCategory : [];
  const normal = (v: any) => (typeof v === 'string' ? v.toLowerCase() : '');

  const isActive = (name: string) =>
    alarms.some((a) => normal(a?.alarmCategory) === name && a?.isEnabled);

  // --- Redux data ---
  const alarmCategoryList = useAlarmCategoryList(defaultAlarmSettingFilter).data?.data ?? [];

  const alarmFilter = useSelector(
    (state: RootState) => state.alarmTriggerReducer.alarmTriggerFilter,
  );
  //   const floorplanFilter = useSelector((state: RootState) => state.floorplanReducer.floorplanFilter);

  const getTimeRangeValue = (val?: string | null) => {
    if (val === null) return 'all';
    return val || 'daily';
  };

  // --- Local filter state (only FloorId matters for API) ---
  const [appliedFilter, setAppliedFilter] = useState({
    BuildingId: alarmFilter.filters?.buildingId ?? [],
    FloorId: alarmFilter.filters?.floorId ?? [],
    FloorplanId: alarmFilter.filters?.floorplanId ?? [],
    Action: alarmFilter.filters?.action ?? [],
    Alarm: alarmFilter.filters?.alarm ?? [],
    TimeRange: getTimeRangeValue(alarmFilter.filters?.timeRange ?? alarmFilter.timeRange),
    Timezone: alarmFilter.filters?.timezone || 'Asia/Jakarta',
    IncludeUnresolved: alarmFilter.filters?.includeUnresolved ?? true,

    dateFilters: {
      TriggerTime: {
        DateFrom: null as Dayjs | null,
        DateTo: null as Dayjs | null,
      },
    },
  });
  const normalize = (arr: string[]) => [...arr].sort();
  const normalizeDate = (d: Dayjs | null) => (d ? d.toISOString() : null);

  const currentFilter = {
    buildingId: normalize(alarmFilter.filters?.buildingId ?? []),
    floorId: normalize(alarmFilter.filters?.floorId ?? []),
    floorplanId: normalize(alarmFilter.filters?.floorplanId ?? []),
    action: normalize(alarmFilter.filters?.action ?? []),
    alarm: normalize(alarmFilter.filters?.alarm ?? []),
    timeRange: getTimeRangeValue(alarmFilter.filters?.timeRange ?? alarmFilter.timeRange),
    timezone: alarmFilter.filters?.timezone || 'Asia/Jakarta',
    includeUnresolved: alarmFilter.filters?.includeUnresolved ?? true,
    TriggerTime: {
      DateFrom: alarmFilter.dateFilters?.TriggerTime?.DateFrom ?? null,
      DateTo: alarmFilter.dateFilters?.TriggerTime?.DateTo ?? null,
    },
  };

  const nextFilter = {
    buildingId: normalize(appliedFilter.BuildingId ?? []),
    floorId: normalize(appliedFilter.FloorId ?? []),
    floorplanId: normalize(appliedFilter.FloorplanId ?? []),
    action: normalize(appliedFilter.Action ?? []),
    alarm: normalize(appliedFilter.Alarm ?? []),
    timeRange: appliedFilter.TimeRange,
    timezone: appliedFilter.Timezone,
    includeUnresolved: appliedFilter.IncludeUnresolved,
    TriggerTime: {
      DateFrom: normalizeDate(appliedFilter.dateFilters.TriggerTime.DateFrom),
      DateTo: normalizeDate(appliedFilter.dateFilters.TriggerTime.DateTo),
    },
  };

  const alarmCategoryOptions = alarmCategoryList.filter((x) => x.isEnabled).map((x) => ({
    label: x.alarmCategory,
    value: x.id,
  }));
  const formatLabel = (val: string) => val.replace(/([A-Z])/g, ' $1').trim();

  const actionOptions = Object.keys(actionStatusColormap).map((key) => ({
    label: formatLabel(key),
    value: key,
  }));
  const { data: hierarchyTree = [] } = useLocationHierarchy();

  const floorList = useMemo(() => {
    const list: { id: string; name: string; buildingId: string }[] = [];
    for (const b of hierarchyTree) {
      for (const f of b.floors ?? []) {
        list.push({ id: f.id, name: f.name, buildingId: b.id });
      }
    }
    return list;
  }, [hierarchyTree]);

  // --- Locked initial (for stable AutocompleteFilter) ---
  const [lockedInitial, setLockedInitial] = useState<{
    BuildingId: string[];
    FloorId: string[];
    FloorplanId: string[];
    MaskedAreaId: string[];
  } | null>(null);

  // --- Fetch Data ---
  // useEffect(() => {
  //   dispatch(fetchBuildings());
  //   dispatch(fetchFloors());
  // }, [dispatch]);

  // --- Sync filters + lock initial ---
  useEffect(() => {
    const filters = alarmFilter.filters ?? {};

    setAppliedFilter((prev) => ({
      ...prev,
      BuildingId: filters.buildingId ?? [],
      FloorId: filters.floorId ?? [],
      FloorplanId: filters.floorplanId ?? [],
      Action: filters.action ?? [],
      Alarm: filters.alarm ?? [],
      TimeRange: getTimeRangeValue(filters.timeRange ?? alarmFilter.timeRange),
      Timezone: filters.timezone || 'Asia/Jakarta',
      IncludeUnresolved: filters.includeUnresolved ?? true,
    }));

    // lock initial for AutocompleteFilter
    if ((filters.floorId ?? []).length > 0 && !lockedInitial) {
      const buildingIds = Array.from(
        new Set(
          floorList.filter((f) => (filters.floorId ?? []).includes(f.id)).map((f) => f.buildingId),
        ),
      );

      setLockedInitial({
        BuildingId: buildingIds,
        FloorId: filters.floorId ?? [],
        FloorplanId: [],
        MaskedAreaId: [],
      });
    }
  }, [alarmFilter.filters, alarmFilter.timeRange, floorList, lockedInitial]);

  // --- Drawer controls ---
  const handleClickOpen = () => {
    // freeze snapshot when opening
    const buildingIds = Array.from(
      new Set(
        floorList.filter((f) => appliedFilter.FloorId.includes(f.id)).map((f) => f.buildingId),
      ),
    );
    setLockedInitial({
      BuildingId: buildingIds,
      FloorId: appliedFilter.FloorId ?? [],
      FloorplanId: [],
      MaskedAreaId: [],
    });
    setOpen(true);
  };
  const handleClose = () => setOpen(false);

  // --- Area Change handler (from AutocompleteFilter) ---
  const handleAreaChange = (filter: {
    BuildingId: string[];
    FloorId: string[];
    FloorplanId: string[];
    MaskedAreaId: string[];
  }) => {
    setAppliedFilter((prev) => {
      if (
        isEqual(prev.FloorId, filter.FloorId) &&
        isEqual(prev.BuildingId, filter.BuildingId) &&
        isEqual(prev.FloorplanId, filter.FloorplanId)
      ) {
        return prev;
      }

      return {
        ...prev,
        BuildingId: filter.BuildingId ?? [],
        FloorId: filter.FloorId ?? [],
        FloorplanId: filter.FloorplanId ?? [],
      };
    });
  };

  // --- Apply & Reset ---
  const handleApplyFilter = () => {
    const isCustom = appliedFilter.TimeRange === 'custom';
    const computedTimeRange = appliedFilter.TimeRange === 'all' ? null : appliedFilter.TimeRange;
    dispatch(
      UpdateFilter({
        Start: 0,
        timeRange: computedTimeRange,
        filters: {
          ...alarmFilter.filters,
          timeRange: computedTimeRange,
          timezone: appliedFilter.Timezone || 'Asia/Jakarta',
          buildingId: appliedFilter.BuildingId,
          floorId: appliedFilter.FloorId,
          floorplanId: appliedFilter.FloorplanId,
          action: appliedFilter.Action,
          alarm: appliedFilter.Alarm,
          includeUnresolved: appliedFilter.IncludeUnresolved,
        },
        dateFilters: {
          TriggerTime: {
            DateFrom: isCustom
              ? appliedFilter.dateFilters.TriggerTime.DateFrom?.toISOString() ?? null
              : null,
            DateTo: isCustom
              ? appliedFilter.dateFilters.TriggerTime.DateTo?.toISOString() ?? null
              : null,
          },
        },
      }),
    );
    setOpen(false);
  };

  const handleResetFilter = () => {
    setAppliedFilter({
      BuildingId: [],
      FloorId: [],
      FloorplanId: [],
      Action: [],
      Alarm: [],
      TimeRange: 'daily',
      Timezone: 'Asia/Jakarta',
      IncludeUnresolved: true,
      dateFilters: {
        TriggerTime: {
          DateFrom: null,
          DateTo: null,
        },
      },
    });

    dispatch(
      UpdateFilter({
        Start: 0,
        timeRange: 'daily',
        filters: {
          ...alarmFilter.filters,
          timeRange: 'today',
          timezone: 'Asia/Jakarta',
          buildingId: [],
          floorId: [],
          floorplanId: [],
          action: [],
          alarm: [],
          includeUnresolved: true,
          // Explicitly preserve memberId and visitorId from applied filter
          memberId: alarmFilter.filters?.memberId,
          visitorId: alarmFilter.filters?.visitorId,
        },
        dateFilters: {
          TriggerTime: {
            DateFrom: null,
            DateTo: null,
          },
        },
      }),
    );
    setOpen(false);
  };

  const isDisabled = isEqual(currentFilter, nextFilter);

  const { DateFrom, DateTo } = appliedFilter.dateFilters.TriggerTime;

  const isInvalidRange = !!DateFrom && !!DateTo && DateFrom.isAfter(DateTo);

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="en-gb">
      {/* Filter Button */}
      <Button
        onClick={handleClickOpen}
        size="medium"
        variant="outlined"
        startIcon={<IconAdjustmentsHorizontal />}
        color="info"
        sx={{ height: 36, mx: 2 }}
      >
        <Typography variant="caption" fontSize={'0.7rem'}>
          Filter
        </Typography>
      </Button>

      {/* Drawer */}
      <Drawer
        anchor="right"
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: 320,
            padding: 3,
            backgroundColor: 'background.paper',
          },
        }}
      >
        <Typography
          variant="h4"
          gutterBottom
          sx={{ my: 4, borderBottom: 5, borderColor: 'primary.main' }}
        >
          Alarm Filter
        </Typography>

        <Grid container spacing={3}>
          {/* 🏢 Building + Floor Tree (Display) */}
          <Grid size={12}>
            <CustomFormLabel>
              <Typography variant="caption">Building / Floor :</Typography>
            </CustomFormLabel>

            <AutocompleteFilter
              maskedAreas={[]} // hide deeper levels
              initial={
                lockedInitial ?? {
                  BuildingId: [],
                  FloorId: appliedFilter.FloorId ?? [],
                  FloorplanId: appliedFilter.FloorplanId ?? [],
                  MaskedAreaId: [],
                }
              }
              onChangeFilter={handleAreaChange}
              resetToken={resetToken}
            />
          </Grid>
          <Grid size={12}>
            <CustomFormLabel>
              <Typography variant="caption">Alarm Category :</Typography>
            </CustomFormLabel>

            <Autocomplete
              multiple
              options={alarmCategoryOptions}
              value={alarmCategoryOptions.filter((opt) => appliedFilter.Alarm.includes(opt.label))}
              onChange={(_, val) =>
                setAppliedFilter((prev) => ({
                  ...prev,
                  Alarm: val.map((v) => v.label),
                }))
              }
              renderInput={(params) => (
                <TextField {...params} label="Alarm Category" size="small" />
              )}
            />
          </Grid>
          <Grid size={12}>
            <CustomFormLabel>
              <Typography variant="caption">Alarm Action :</Typography>
            </CustomFormLabel>

            <Autocomplete
              multiple
              options={actionOptions}
              getOptionLabel={(opt) => opt.label}
              value={actionOptions.filter((opt) => appliedFilter.Action.includes(opt.value))}
              onChange={(_, val) =>
                setAppliedFilter((prev) => ({
                  ...prev,
                  Action: val.map((v) => v.value),
                }))
              }
              renderInput={(params) => <TextField {...params} label="Action" size="small" />}
            />
          </Grid>
          {/* Time Range Select */}
          <Grid size={12}>
            <CustomFormLabel>
              <Typography variant="caption">Time Range :</Typography>
            </CustomFormLabel>

            <TextField
              select
              fullWidth
              size="small"
              value={appliedFilter.TimeRange}
              onChange={(e) =>
                setAppliedFilter((prev) => ({
                  ...prev,
                  TimeRange: e.target.value,
                }))
              }
            >
              {TIME_RANGE_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* Trigger Time - Only for Custom Range */}
          {appliedFilter.TimeRange === 'custom' && (
            <Grid size={12}>
              <Box>
                <CustomFormLabel>
                  <Typography variant="caption">Trigger Time :</Typography>
                </CustomFormLabel>

                <Box display="flex" alignItems="center" gap={1}>
                  <DateTimePicker
                    label="Start"
                    value={appliedFilter.dateFilters.TriggerTime.DateFrom}
                    onChange={(val) =>
                      setAppliedFilter((prev) => ({
                        ...prev,
                        dateFilters: {
                          ...prev.dateFilters,
                          TriggerTime: {
                            ...prev.dateFilters.TriggerTime,
                            DateFrom: val,
                          },
                        },
                      }))
                    }
                    ampm={false}
                    slotProps={{ textField: { size: 'small', fullWidth: true } }}
                  />

                  <Typography variant="body2" sx={{ mx: 1 }}>
                    —
                  </Typography>

                  <DateTimePicker
                    label="End"
                    value={appliedFilter.dateFilters.TriggerTime.DateTo}
                    onChange={(val) =>
                      setAppliedFilter((prev) => ({
                        ...prev,
                        dateFilters: {
                          ...prev.dateFilters,
                          TriggerTime: {
                            ...prev.dateFilters.TriggerTime,
                            DateTo: val,
                          },
                        },
                      }))
                    }
                    ampm={false}
                    slotProps={{ textField: { size: 'small', fullWidth: true } }}
                  />
                </Box>
              </Box>
            </Grid>
          )}

          {/* Include Unresolved Toggle */}
          <Grid size={12}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                py: 1,
                px: 1.5,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1.5,
                bgcolor: 'background.paper',
              }}
            >
              <Box>
                <Typography variant="subtitle2" fontWeight={600}>
                  Include Unresolved
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Include unresolved alarms in the filtered results
                </Typography>
              </Box>
              <Switch
                checked={appliedFilter.IncludeUnresolved}
                onChange={(e) =>
                  setAppliedFilter((prev) => ({
                    ...prev,
                    IncludeUnresolved: e.target.checked,
                  }))
                }
                color="primary"
              />
            </Box>
          </Grid>
        </Grid>

        {/* Footer Buttons */}
        <Box mt={3}>
          <Grid container justifyContent="space-between">
            <Grid size={3}>
              <Button variant="outlined" color="error" fullWidth onClick={handleResetFilter}>
                Reset
              </Button>
            </Grid>
            <Grid size={6}>
              <Button
                variant="contained"
                color="primary"
                fullWidth
                onClick={handleApplyFilter}
                disabled={isDisabled || isInvalidRange}
              >
                Apply
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Drawer>
    </LocalizationProvider>
  );
};

export default AlarmTriggeredFilter;
