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
import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';

import { visitorStatus } from 'src/types/crud/input';
import { fetchBuildings } from 'src/store/apps/crud/building';
import { fetchFloors } from 'src/store/apps/crud/floor';
import { fetchFloorplan } from 'src/store/apps/crud/floorplan';
import { fetchMaskedAreas } from 'src/store/apps/crud/maskedArea';
import { fetchMembers } from 'src/store/apps/crud/member';
import trackingJson from './DummyData/TrackingTransactionDummyData.json';
import alarmJson from './DummyData/AlarmDummyData.json';
import VisitorReportDialog from './VisitorReportDialog';

// ⬇️ activate plugins
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
const VisitorReportFilter = () => {
  const didInit = useRef(false);

  // ✅ Switch for testing mode
  const isTesting = true;

  // Redux Data
  const buildings = useSelector((state: RootState) => state.buildingReducer.buildingAll);
  const floors = useSelector((state: RootState) => state.floorReducer.floorAll);
  const floorplans = useSelector((state: RootState) => state.floorplanReducer.floorplanAll);
  const maskedAreas = useSelector((state: RootState) => state.maskedAreaReducer.maskedAreaAll);
  const members = useSelector((state: RootState) => state.memberReducer.memberAll);

  const [openReport, setOpenReport] = useState(false);
  const [filteredTracking, setFilteredTracking] = useState<any[]>([]);
  const [filteredAlarm, setFilteredAlarm] = useState<any[]>([]);

  // Dummy Data (Testing Mode)
  const [trackingData, setTrackingData] = useState<any[]>([]);
  const [alarmData, setAlarmData] = useState<any[]>([]);

  // Filter state
  const [timeType, setTimeType] = useState<'Daily' | 'Weekly' | 'Monthly' | 'Custom'>('Daily');
  const [dateRange, setDateRange] = useState({
    from: dayjs().format('YYYY-MM-DD'),
    to: dayjs().format('YYYY-MM-DD'),
  });
  const [visitorStatusValue, setVisitorStatusValue] = useState('');
  const [areaValue, setAreaValue] = useState('');
  const [host, setHost] = useState('');

  // Hardcoded dummy areas
  const dummyAreas = ['Meeting Room', 'Pantry', 'Rooftop', 'Parking Lot', 'Lobby'];

  // 🧭 Handlers
  const handleGenerate = () => {
    if (isTesting) {
      let fromDate = dayjs(dateRange.from).startOf('day');
      let toDate = dayjs(dateRange.to).endOf('day');

      if (timeType === 'Weekly') {
        fromDate = fromDate.startOf('week').add(1, 'day'); // Monday
        toDate = fromDate.add(6, 'day').endOf('day');
      } else if (timeType === 'Monthly') {
        fromDate = fromDate.startOf('month');
        toDate = fromDate.endOf('month');
      }

      const withinRange = (d: dayjs.Dayjs) => d.isSameOrAfter(fromDate) && d.isSameOrBefore(toDate);

      const filteredT = trackingData.filter((t) => {
        const enter = dayjs(t.EnterTime);
        return (
          (!visitorStatusValue || t.VisitorStatus === visitorStatusValue) &&
          (!areaValue || t.AreaName === areaValue) &&
          (!host || t.HostName === host) &&
          withinRange(enter)
        );
      });

      const filteredA = alarmData.filter((a) => {
        const trig = dayjs(a.AlarmTriggered);
        return (
          (!areaValue || a.AreaName === areaValue) &&
          (!host || a.HostName === host) &&
          withinRange(trig)
        );
      });

      setFilteredTracking(filteredT);
      setFilteredAlarm(filteredA);
      setOpenReport(true);
    }
  };

  // 🧱 Load Data
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    if (!isTesting) {
      dispatch(fetchBuildings());
      dispatch(fetchFloors());
      dispatch(fetchFloorplan());
      dispatch(fetchMaskedAreas());
      dispatch(fetchMembers());
    } else {
      // ✅ Load dummy JSON data
      setTrackingData(trackingJson);
      setAlarmData(alarmJson);
      console.log('Loaded dummy data from import:', {
        tracking: trackingJson.length,
        alarm: alarmJson.length,
      });
    }
  }, [isTesting]);

  return (
    <Box p={2}>
      <Typography variant="h6" fontWeight={700} textAlign="center" mb={2}>
        Visitor Report Filter {isTesting && '(Dummy Mode)'}
      </Typography>

      <Card
        sx={{
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          maxWidth: '100%',
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

          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              label="Start Date"
              type="date"
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
              value={timeType === 'Custom' ? dateRange.from : ''}
              disabled={timeType !== 'Custom'}
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
              value={timeType === 'Custom' ? dateRange.to : ''}
              disabled={timeType !== 'Custom'}
              onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
            />
          </Grid>
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
            {isTesting ? (
              <FormControl fullWidth>
                <InputLabel>Area</InputLabel>
                <Select
                  label="Area"
                  value={areaValue}
                  onChange={(e) => setAreaValue(e.target.value)}
                >
                  <MenuItem value="">Select Area</MenuItem>
                  {dummyAreas.map((area) => (
                    <MenuItem key={area} value={area}>
                      {area}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : (
              <Typography variant="body2" color="text.secondary">
                <i>Real AutocompleteFilter will appear in production mode.</i>
              </Typography>
            )}
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <FormControl fullWidth>
              <InputLabel>Host</InputLabel>
              <Select label="Host" value={host} onChange={(e) => setHost(e.target.value)}>
                <MenuItem value="">Select Host</MenuItem>
                {isTesting
                  ? ['Zygarde', 'Yveltal', 'Xerneas'].map((h) => (
                      <MenuItem key={h} value={h}>
                        {h}
                      </MenuItem>
                    ))
                  : members.map((m) => (
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
      <VisitorReportDialog
        open={openReport}
        onClose={() => setOpenReport(false)}
        trackingLogs={filteredTracking}
        alarmLogs={filteredAlarm}
      />
    </Box>
  );
};

export default VisitorReportFilter;
