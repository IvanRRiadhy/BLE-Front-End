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
  Autocomplete,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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
import { fetchMembers, memberType } from 'src/store/apps/crud/member';
import trackingJson from './DummyData/TrackingTransactionDummyData.json';
import alarmJson from './DummyData/AlarmDummyData.json';
import VisitorReportDialog from './VisitorReportDialog';
import { useAllBuilding } from 'src/hooks/useBuilding';
import { useAllMembers } from 'src/hooks/useMember';
import { useAllFloors } from 'src/hooks/useFloor';
import { useAllFloorplans } from 'src/hooks/useFloorplan';
import { useAllMaskedAreas } from 'src/hooks/useMaskedArea';
import { useAllVisitor } from 'src/hooks/useVisitor';
import { useAddVisitorFilterPreset } from 'src/hooks/useVisitorFilterPreset';
import toast from 'react-hot-toast';
import AreaHierarchySelector from 'src/components/shared/AreaHierarchySelector';

// ⬇️ activate plugins
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

type PersonOption = {
  id: string;
  name: string;
  type: 'visitor' | 'member';
};

export type SelectedNode =
  | { type: 'building'; data: any }
  | { type: 'floor'; data: any }
  | { type: 'floorplan'; data: any }
  | { type: 'area'; data: any }
  | null;

// Dummy visitor names
const dummyVisitors = ['Alakazam', 'Bastiodon', 'Cacturne', 'Donphan', 'Espeon'];

const VisitorReportFilter = () => {
  const didInit = useRef(false);

  // ✅ Switch for testing mode
  const isTesting = false;

  // Redux Data
  const buildingData = useAllBuilding().data || [];
  const floorData = useAllFloors().data || [];
  const floorplanData = useAllFloorplans().data || [];
  const areaData = useAllMaskedAreas().data || [];
  const visitorData = useAllVisitor().data || [];
  const memberData = useAllMembers().data || [];

  const addMutation = useAddVisitorFilterPreset();

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
  const [selectedPersons, setSelectedPersons] = useState<PersonOption[]>([]);
  const [selectedArea, setSelectedArea] = useState<SelectedNode>(null);
  const [areaValue, setAreaValue] = useState('');
  const [selectedHost, setSelectedHost] = useState<memberType | null>(null);

  const personOptions: PersonOption[] = [
    ...visitorData.map((v: any) => ({
      id: v.id,
      name: v.name,
      type: 'visitor' as const,
    })),
    ...memberData.map((m: any) => ({
      id: m.id,
      name: m.name,
      type: 'member' as const,
    })),
  ];
  const [openPresetDialog, setOpenPresetDialog] = useState(false);
  const [presetName, setPresetName] = useState('');

  const buildPresetPayload = (name: string) => {
    let fromDate: string | null = null;
    let toDate: string | null = null;

    if (timeType === 'Custom') {
      fromDate = dateRange.from;
      toDate = dateRange.to;
    }

    return {
      name,
      timeRange: timeType,
      buildingId: selectedArea?.type === 'building' ? selectedArea?.data?.id : null,
      floorplanId: selectedArea?.type === 'floorplan' ? selectedArea?.data?.id : null,
      floorId: selectedArea?.type === 'floor' ? selectedArea?.data?.id : null,
      areaId: selectedArea?.type === 'area' ? selectedArea?.data?.id : null,
      visitorId: selectedPersons.find((p) => p.type === 'visitor')?.id || null,
      memberId: selectedPersons.find((p) => p.type === 'member')?.id || null,
      fromDate,
      toDate,
    };
  };

  const handleConfirmSavePreset = async () => {
    if (!presetName.trim()) {
      toast.error('Preset name is required');
      return;
    }

    try {
      const payload = buildPresetPayload(presetName.trim());
      await addMutation.mutateAsync(payload);

      toast.success('Preset saved successfully');
      setOpenPresetDialog(false);
      setPresetName('');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save preset');
    }
  };

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
          (selectedPersons.length === 0 ||
            selectedPersons.includes(t.VisitorName) ||
            selectedPersons.includes(t.MemberName)) &&
          (!areaValue || t.AreaName === areaValue) &&
          (!selectedHost || t.HostName === selectedHost) &&
          withinRange(enter)
        );
      });

      const filteredA = alarmData.filter((a) => {
        const trig = dayjs(a.AlarmTriggered);
        return (
          (selectedPersons.length === 0 ||
            selectedPersons.includes(a.VisitorName) ||
            selectedPersons.includes(a.MemberName)) &&
          (!areaValue || a.AreaName === areaValue) &&
          (!selectedHost || a.HostName === selectedHost) &&
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
      // ✅ Load dummy JSON data and add visitor names
      const trackingWithVisitors = trackingJson.map((item, index) => ({
        ...item,
        VisitorName: dummyVisitors[index % dummyVisitors.length], // Assign visitors cyclically
      }));

      const alarmWithVisitors = alarmJson.map((item, index) => ({
        ...item,
        VisitorName: dummyVisitors[index % dummyVisitors.length], // Assign visitors cyclically
      }));

      setTrackingData(trackingWithVisitors);
      setAlarmData(alarmWithVisitors);
      console.log('Loaded dummy data from import:', {
        tracking: trackingWithVisitors.length,
        alarm: alarmWithVisitors.length,
        visitors: dummyVisitors,
      });
    }
  }, [isTesting]);

  const adaptTrackingFromApi = (apiData: any[]) => {
  return apiData.map((r) => ({
    Id: r.visitorId,
    VisitorName: r.visitorName,
    BuildingName: r.buildingName,
    FloorName: r.floorName,
    AreaName: r.areaName,
    EnterTime: r.enterTime,
    ExitTime: r.exitTime,
    VisitorStatus: r.status ?? '-',
    HostName: r.hostName ?? '-',
    DurationInMinutes: r.durationInMinutes,
  }));
};

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
          {/* Person Name Autocomplete */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Autocomplete
              multiple
              options={personOptions}
              value={selectedPersons}
              onChange={(_, newValue) => setSelectedPersons(newValue)}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              getOptionLabel={(option) => option.name}
              renderOption={(props, option) => (
                <li {...props} key={`${option.type}-${option.id}`}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      width: '100%',
                    }}
                  >
                    <Typography variant="body2">{option.name}</Typography>

                    <Box sx={{ flexGrow: 1 }} />

                    <Chip
                      size="small"
                      label={option.type === 'visitor' ? 'Visitor' : 'Member'}
                      color={option.type === 'visitor' ? 'primary' : 'success'}
                    />
                  </Box>
                </li>
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    {...getTagProps({ index })}
                    key={option.id}
                    label={`${option.name} (${option.type})`}
                    size="small"
                  />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Person (Visitor / Member)"
                  placeholder="Select person..."
                />
              )}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <AreaHierarchySelector
              buildings={buildingData}
              floors={floorData}
              floorplans={floorplanData}
              maskedAreas={areaData}
              value={selectedArea}
              onChange={setSelectedArea}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Autocomplete
              options={memberData}
              value={selectedHost}
              onChange={(_, newValue) => setSelectedHost(newValue)}
              getOptionLabel={(option) => option.name}
              renderInput={(params) => <TextField {...params} label="Host (Member)" />}
              isOptionEqualToValue={(opt, val) => opt.id === val.id}
            />
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
              onClick={() => setOpenPresetDialog(true)}
              sx={{ height: 40 }}
            >
              Save Generate Report
            </Button>
          </Grid>
        </Grid>
      </Card>
      <Dialog
        open={openPresetDialog}
        onClose={() => setOpenPresetDialog(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Save Report Preset</DialogTitle>

        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Preset Name"
            fullWidth
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            placeholder="e.g. Weekly Lobby Visitors"
          />
        </DialogContent>

        <DialogActions>
          <Button
            onClick={() => {
              setOpenPresetDialog(false);
              setPresetName('');
            }}
            color="inherit"
          >
            Cancel
          </Button>

          <Button
            onClick={handleConfirmSavePreset}
            variant="contained"
            disabled={addMutation.isPending}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

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
