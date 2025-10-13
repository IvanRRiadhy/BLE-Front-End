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
import Scrollbar from 'src/components/custom-scroll/Scrollbar';
import { IconMail, IconCircleX, IconClearAll } from '@tabler/icons-react';
import {
  gender,
  genderIconMap,
  genderEnumMap,
  visitorStatus,
  visitorStatusEnumMap,
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
  category?: string;
}

type TimeRangeKey = 'any' | 'today' | 'week' | 'month' | 'custom';

const VisitorFilter = () => {
  const active = true;
  const dispatch = useDispatch();
  const customizer = useSelector((state: any) => state.customizer);
  const br = `${customizer.borderRadius}px`;
  const trxVisitorFilter = useSelector(
    (state: RootState) => state.TrxVisitorReducer.TrxVisitorFilter.filters,
  );
  const trxVisitorDateFilter = useSelector(
    (state: RootState) => state.TrxVisitorReducer.TrxVisitorFilter.dateFilters,
  );
  const [timeRange, setTimeRange] = useState<TimeRangeKey>('any');
  const [startTime, setStartTime] = useState<Dayjs | null>(null);
  const [endTime, setEndTime] = useState<Dayjs | null>(null);

  const genderFilters: DataType[] = gender
    .filter((gender) => !gender.disabled) // Filter out disabled entries
    .map((gender) => ({
      id: gender.value,
      name: gender.label,
      filter: gender.value,
      category: 'gender',
      icon: genderIconMap[gender.value] || IconCircleX,
    }));

  const statusFilters: DataType[] = visitorStatus
    .filter((status) => !status.disabled)
    .map((status) => ({
      id: status.value,
      name: status.label,
      filter: status.value,
      category: 'status',
      icon: visitorStatusIconMap[status.value] || IconCircleX,
    }));

  const filterData: DataType[] = [
    {
      id: 1,
      name: 'All',
      filter: 'show_all',
      category: 'all',
      icon: IconClearAll,
    },
    {
      id: 2,
      divider: true,
    },
    {
      id: 3,
      filterbyTitle: 'Visiting Time',
    },
    {
      id: 4,
      divider: true,
    },
    {
      id: 5,
      filterbyTitle: 'Gender',
    },
    ...genderFilters,
    {
      id: 6,
      divider: true,
    },
    {
      id: 7,
      filterbyTitle: 'Status',
    },
    ...statusFilters,
  ];

  const handleFilter = (filter: string, category?: string) => {
    const currentFilters = { ...trxVisitorFilter };

    switch (category) {
      // case 'gender': {
      //   console.log('Gender Filter : ', filter);
      //   const mappedValue = genderEnumMap[filter];
      //   if (mappedValue === undefined) return;
      //   const currentValue = currentFilters.Gender;
      //   const newValue = currentValue === mappedValue ? undefined : mappedValue;
      //   console.log("Adding gender: ", newValue);
      //   dispatch(UpdateFilter({ filters: { ...currentFilters, Gender: newValue } }));
      //   break;
      // }
      case 'all': {
        dispatch(UpdateFilter({ filters: {} }));
        break;
      }
      case 'status': {
        const mappedValue = visitorStatusEnumMap[filter];
        if (mappedValue === undefined) return;

        const currentValue = currentFilters.Status;

        const newValue = currentValue === mappedValue ? undefined : mappedValue;
        console.log(newValue);
        dispatch(UpdateFilter({ filters: { ...currentFilters, Status: newValue } }));
        break;
      }
      default:
        dispatch(UpdateFilter({ filters: {} }));
        break;
    }
  };

  const setFilters = (start?: Dayjs | null, end?: Dayjs | null) => {
    const currentFilters = { ...trxVisitorDateFilter.VisitorPeriodStart };
    if (!start || !end) {
      // clear when "Any"
      const { DateFrom, DateTo, ...rest } = currentFilters;
      dispatch(UpdateFilter({ filters: {}, dateFilters: {} }));
      return;
    }
    // Use ISO; swap to your preferred format if needed
    dispatch(
      UpdateFilter({
        dateFilters: {
          VisitorPeriodStart: {
            DateFrom: start.toISOString(),
            DateTo: end.toISOString(),
          },
        },
      }),
    );
  };

  // compute ranges (end is exclusive = start of next period)
  const getRange = (key: TimeRangeKey): { start?: Dayjs; end?: Dayjs } => {
    const now = dayjs();
    switch (key) {
      case 'today': {
        const start = now.startOf('day');
        const end = start.add(1, 'day'); // or start.endOf('day') for inclusive
        return { start, end };
      }
      case 'week': {
        const start = now.startOf('week'); // change to .startOf('isoWeek') if you use ISO weeks
        const end = start.add(1, 'week');
        return { start, end };
      }
      case 'month': {
        const start = now.startOf('month');
        const end = start.add(1, 'month');
        return { start, end };
      }
      case 'any':
        return {};
      default:
        return { start: startTime ?? null!, end: endTime ?? null! };
    }
  };

  // react to dropdown changes (non-custom)
  useEffect(() => {
    if (timeRange === 'custom') return;
    const { start, end } = getRange(timeRange);
    setStartTime(start ?? null);
    setEndTime(end ?? null);
    setFilters(start ?? null, end ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange]);

  // react to custom pickers
  useEffect(() => {
    if (timeRange !== 'custom') return;
    if (startTime && endTime) setFilters(startTime, endTime);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange, startTime, endTime]);

  return (
    <>
      <Box p={3} sx={{width: '95%', height: '100%', overflow: 'auto'}}>
        <VisitorRegister />
      </Box>

      <List>
        <Box
          key={'filter-list'}
          sx={{
            height: { lg: 'calc(100vh - 230px)', md: '100vh' },
            maxHeight: '75vh',
            overflow: 'auto',
          }}
        >
          
          {filterData.map((filter) => {
            if (filter.filterbyTitle) {
              return (
                <React.Fragment key={filter.id}>
                  <Typography
                    variant="subtitle1"
                    fontWeight={600}
                    pl={5.1}
                    mt={1}
                    pb={2}
                    key={filter.id} // ✅ Add key here
                  >
                    {filter.filterbyTitle}
                  </Typography>
                  {/* ⬇️ Time Range UI goes here, just under "All" */}
                  {filter.id === 3 && (
                    <Box mx={3} mt={1} mb={2}>
                      <TextField
                        select
                        label="Time Range"
                        value={timeRange}
                        onChange={(e) => setTimeRange(e.target.value as TimeRangeKey)}
                        fullWidth
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
                            <Grid container  spacing={1.5}>
                              <Grid>
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
                              <Grid>
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
                    </Box>
                  )}
                </React.Fragment>
              );
            } else if (filter.divider) {
              return <Divider key={filter.id} sx={{ mb: 3 }} />; // ✅ Add key here
            }

            return (
              <React.Fragment key={filter.id}>
                <ListItemButton
                  sx={{
                    mb: 1,
                    mx: 3,
                    borderRadius: br,
                    '&.Mui-selected': {
                      backgroundColor: 'primary.main',
                      color: 'white',
                      '&:hover': { backgroundColor: 'primary.dark' },
                    },
                  }}
                  selected={
                    filter.category === 'all' &&
                    trxVisitorFilter.Status === undefined ||
                    filter.category === 'status' &&
                    trxVisitorFilter.Status === visitorStatusEnumMap[filter.filter!]
                  }
                  onClick={() => {
                    handleFilter(`${filter.filter}`, filter.category);

                    // ⬇️ Reset time range & filters when All is clicked
                    if (filter.id === 1) {
                      setTimeRange('any');
                      setStartTime(null);
                      setEndTime(null);
                      setFilters(null, null); // clears StartTimeFilter & EndTimeFilter
                    }

                    dispatch(SelectTrxVisitor(''));
                  }}
                  key={filter.id}
                >
                  <ListItemIcon sx={{ minWidth: '30px', color: filter.color }}>
                    <filter.icon stroke="1.5" size={19} />
                  </ListItemIcon>
                  <ListItemText primary={filter.name} />
                </ListItemButton>
              </React.Fragment>
            );
          })}
        </Box>
      </List>
    </>
  );
};

export default VisitorFilter;
