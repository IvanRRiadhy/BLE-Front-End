import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Card,
  Grid2 as Grid,
  MenuItem,
  Select,
  TextField,
  Button,
  Typography,
  FormControl,
  InputLabel,
} from '@mui/material';
import { useSelector } from 'react-redux';
import { dispatch, RootState } from 'src/store/Store';
import AutocompleteFilter from 'src/layouts/full/horizontal/navbar/AutocompleteFilter';
import dayjs from 'dayjs';
import { visitorStatus } from 'src/types/crud/input';
import { fetchBuildings } from 'src/store/apps/crud/building';
import { fetchFloors } from 'src/store/apps/crud/floor';
import { fetchFloorplan } from 'src/store/apps/crud/floorplan';
import { fetchMaskedAreas } from 'src/store/apps/crud/maskedArea';

const VisitorReportFilter = () => {
    const didInit = useRef(false);
  // Redux Data
  const buildings = useSelector((state: RootState) => state.buildingReducer.buildingAll);
  const floors = useSelector((state: RootState) => state.floorReducer.floorAll);
  const floorplans = useSelector((state: RootState) => state.floorplanReducer.floorplanAll);
  const maskedAreas = useSelector((state: RootState) => state.maskedAreaReducer.maskedAreaAll);
  const members = useSelector((state: RootState) => state.memberReducer.memberAll);

  // State
  const [timeType, setTimeType] = useState<'Daily' | 'Weekly' | 'Monthly' | 'Custom'>('Daily');
  const [dateRange, setDateRange] = useState({
    from: dayjs().format('YYYY-MM-DD'),
    to: dayjs().format('YYYY-MM-DD'),
  });
  const [visitorStatusValue, setVisitorStatusValue] = useState('');
  const [areaFilter, setAreaFilter] = useState({
    BuildingId: [] as string[],
    FloorId: [] as string[],
    FloorplanId: [] as string[],
    MaskedAreaId: [] as string[],
  });
  const [host, setHost] = useState('');

  // Handlers
  const handleGenerate = () => {
    console.log({
      timeType,
      dateRange,
      visitorStatusValue,
      areaFilter,
      host,
    });
  };

  useEffect(() => {
  if (didInit.current) return;
  didInit.current = true;

  dispatch(fetchBuildings());
  dispatch(fetchFloors());
  dispatch(fetchFloorplan());
  dispatch(fetchMaskedAreas());
}, [dispatch]);

  return (
    <Box p={2}>
      <Typography variant="h6" fontWeight={700} textAlign="center" mb={2}>
        Visitor Report Filter
      </Typography>

      <Card
        sx={{
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          maxWidth: 700,
          mx: 'auto',
        }}
      >
        {/* Time Filter */}
        <Grid container spacing={1} alignItems="center">
          <Grid size={{ xs: 12, md: 4 }}>
            <FormControl fullWidth>
              <InputLabel>Filter Type</InputLabel>
              <Select
                label="Filter Type"
                value={timeType}
                onChange={(e) => setTimeType(e.target.value as any)}
                size="small"
              >
                <MenuItem value="Daily">Daily</MenuItem>
                <MenuItem value="Weekly">Weekly</MenuItem>
                <MenuItem value="Monthly">Monthly</MenuItem>
                <MenuItem value="Custom">Custom</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {timeType === 'Custom' && (
            <>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  label="Start Date"
                  type="date"
                  fullWidth
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  value={dateRange.from}
                  onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  label="End Date"
                  type="date"
                  fullWidth
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  value={dateRange.to}
                  onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                />
              </Grid>
            </>
          )}
        </Grid>

        {/* Filter Options */}
        <Grid container spacing={1} alignItems="center">
          <Grid size={{ xs: 12, md: 4 }}>
            <FormControl fullWidth>
              <InputLabel>Visitor Status</InputLabel>
              <Select
                label="Visitor Status"
                value={visitorStatusValue}
                onChange={(e) => setVisitorStatusValue(e.target.value)}
                size="small"
              >
                {visitorStatus.map((v) => (
                  <MenuItem key={v.value} value={v.value} disabled={v.disabled}>
                    {v.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <AutocompleteFilter
              buildings={buildings}
              floors={floors}
              floorplans={floorplans}
              maskedAreas={maskedAreas}
              initial={areaFilter}
              onChangeFilter={(f) => setAreaFilter(f)}
              hideSelectedAreas
            />
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <FormControl fullWidth>
              <InputLabel>Host</InputLabel>
              <Select
                label="Host"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                size="small"
              >
                <MenuItem value="">Select Host</MenuItem>
                {members.map((m) => (
                  <MenuItem key={m.id} value={m.id}>
                    {m.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {/* Action Buttons */}
        <Grid container spacing={2} mt={1}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Button
              fullWidth
              variant="contained"
              color="primary"
              onClick={handleGenerate}
              sx={{ height: 40 }}
            >
              Generate Report
            </Button>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Button
              fullWidth
              variant="outlined"
              color="primary"
              onClick={() => console.log('Saving report...')}
              sx={{ height: 40 }}
            >
              Save Generate Report
            </Button>
          </Grid>
        </Grid>
      </Card>
    </Box>
  );
};

export default VisitorReportFilter;
