import React, { useState } from 'react';
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
import dayjs from 'dayjs';
import toast from 'react-hot-toast';

import AreaHierarchySelector from 'src/components/shared/AreaHierarchySelector';
import VisitorReportDialog from './VisitorReportDialog';

import { useAllBuilding } from 'src/hooks/useBuilding';
import { useAllFloors } from 'src/hooks/useFloor';
import { useAllFloorplans } from 'src/hooks/useFloorplan';
import { useAllMaskedAreas } from 'src/hooks/useMaskedArea';
import { useAllVisitor } from 'src/hooks/useVisitor';
import { useAllMembers } from 'src/hooks/useMember';
import { memberType } from 'src/store/apps/crud/member';

import { useVisitorSession } from 'src/hooks/useVisitorSession';
import { useAlarmLog } from 'src/hooks/useAlarmRecord';
import { useAddVisitorFilterPreset } from 'src/hooks/useVisitorFilterPreset';

import { VisitorSessionType } from 'src/store/apps/crud/visitorSession';
import { NewAlarmType, NewGetFilter } from 'src/store/apps/crud/alarmRecordTracking';
import { PersonType } from 'src/types/crud/input';
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';

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

const VisitorReportFilter = () => {
  /* ===================== DATA ===================== */
  const buildings = useAllBuilding().data || [];
  const floors = useAllFloors().data || [];
  const floorplans = useAllFloorplans().data || [];
  const areas = useAllMaskedAreas().data || [];
  const visitors = useAllVisitor().data || [];
  const members = useAllMembers().data || [];

  const personOptions: PersonOption[] = [
    ...visitors.map((v) => ({
      id: v.id,
      name: v.name,
      type: 'visitor' as const,
    })),
    ...members.map((m) => ({
      id: m.id,
      name: m.name,
      type: 'member' as const,
    })),
  ];

  /* ===================== STATE ===================== */
  const [timeType, setTimeType] = useState<'Daily' | 'Weekly' | 'Monthly' | 'Custom'>('Daily');

  const [dateRange, setDateRange] = useState({
    from: dayjs().format('YYYY-MM-DD'),
    to: dayjs().format('YYYY-MM-DD'),
  });

  const [selectedPersons, setSelectedPersons] = useState<PersonOption[]>([]);
  const [selectedArea, setSelectedArea] = useState<SelectedNode>(null);
  const [selectedHost, setSelectedHost] = useState<memberType | null>(null);
  const [selectedType, setSelectedType] = useState<any>(null);

  const [openReport, setOpenReport] = useState(false);
  const [trackingLogs, setTrackingLogs] = useState<any[]>([]);
  const [alarmLogs, setAlarmLogs] = useState<any[]>([]);

  const [openPresetDialog, setOpenPresetDialog] = useState(false);
  const [presetName, setPresetName] = useState('');

  /* ===================== MUTATIONS ===================== */
  const visitorSessionMutation = useVisitorSession();
  const alarmLogMutation = useAlarmLog();
  const addPresetMutation = useAddVisitorFilterPreset();

  /* ===================== FILTER BUILDERS ===================== */
  const buildTrackingFilter = () => ({
    timeRange: timeType.toLowerCase(),
    buildingId: selectedArea?.type === 'building' ? selectedArea.data.id : null,
    floorId: selectedArea?.type === 'floor' ? selectedArea.data.id : null,
    floorplanId: selectedArea?.type === 'floorplan' ? selectedArea.data.id : null,
    areaId: selectedArea?.type === 'area' ? selectedArea.data.id : null,
    visitorId: selectedPersons.find((p) => p.type === 'visitor')?.id ?? null,
  });

  const buildAlarmFilter = (): NewGetFilter => {
    const filter: NewGetFilter = {
      timeRange: timeType.toLowerCase() as NewGetFilter['timeRange'],
      buildingId: selectedArea?.type === 'building' ? selectedArea.data.id : null,
      floorId: selectedArea?.type === 'floor' ? selectedArea.data.id : null,
      floorplanId: selectedArea?.type === 'floorplan' ? selectedArea.data.id : null,
      areaId: selectedArea?.type === 'area' ? selectedArea.data.id : null,
      visitorId: selectedPersons.find((p) => p.type === 'visitor')?.id ?? null,
      from: null,
      to: null,
    };

    if (timeType === 'Custom') {
      filter.from = dayjs(dateRange.from).startOf('day').toISOString();
      filter.to = dayjs(dateRange.to).endOf('day').toISOString();
    }

    return filter;
  };

  /* ===================== ADAPTERS ===================== */
  const adaptTracking = (data: VisitorSessionType[]) =>
    data.map((r) => ({
      VisitorName: r.visitorName ?? '-',
      BuildingName: r.buildingName ?? '-',
      FloorName: r.floorName ?? '-',
      AreaName: r.areaName ?? '-',
      EnterTime: r.enterTime,
      ExitTime: r.exitTime,
      VisitorStatus: r.status ?? '-',
      HostName: r.hostName ?? '-',
      DurationInMinutes: r.durationInMinutes,
    }));

  const adaptAlarm = (data: NewAlarmType[]) =>
    data.map((r) => ({
      VisitorName: r.visitorName ?? '-',
      AreaName: r.floorplanName ?? '-',
      AlarmTriggered: r.triggeredAt,
      AlarmDone: r.doneAt,
      VisitorStatus: r.actionStatus,
      HostName: '-', // explicitly excluded
      AlarmCategory: r.alarmStatus,
    }));

  /* ===================== HANDLERS ===================== */
  const handleGenerate = async () => {
    try {
      const [tracking, alarms] = await Promise.all([
        visitorSessionMutation.mutateAsync(buildTrackingFilter()),
        alarmLogMutation.mutateAsync(buildAlarmFilter()),
      ]);

      setTrackingLogs(adaptTracking(tracking));
      setAlarmLogs(adaptAlarm(alarms));
      setOpenReport(true);
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate report');
    }
  };

  const handleSavePreset = async () => {
    if (!presetName.trim()) {
      toast.error('Preset name is required');
      return;
    }

    try {
      await addPresetMutation.mutateAsync({
        name: presetName,
        timeRange: timeType,
        buildingId: selectedArea?.type === 'building' ? selectedArea.data.id : null,
        floorId: selectedArea?.type === 'floor' ? selectedArea.data.id : null,
        floorplanId: selectedArea?.type === 'floorplan' ? selectedArea.data.id : null,
        areaId: selectedArea?.type === 'area' ? selectedArea.data.id : null,
        visitorId: selectedPersons.find((p) => p.type === 'visitor')?.id ?? null,
        memberId: selectedPersons.find((p) => p.type === 'member')?.id ?? null,
        fromDate: timeType === 'Custom' ? dateRange.from : null,
        toDate: timeType === 'Custom' ? dateRange.to : null,
      });

      toast.success('Preset saved');
      setOpenPresetDialog(false);
      setPresetName('');
    } catch {
      toast.error('Failed to save preset');
    }
  };

  /* ===================== UI ===================== */
  return (
    <Box p={2}>
      <Typography variant="h6" fontWeight={700} textAlign="center" mb={2}>
        Visitor Report Filter
      </Typography>

      <Card sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Time */}
        <Grid container spacing={1}>
          <Grid size={{ xs: 12, md: 4 }}>
            <FormControl fullWidth>
              <InputLabel>Filter Type</InputLabel>
              <Select
                value={timeType}
                label="Filter Type"
                onChange={(e) => setTimeType(e.target.value as any)}
              >
                {['Daily', 'Weekly', 'Monthly', 'Custom'].map((v) => (
                  <MenuItem key={v} value={v}>
                    {v}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              type="date"
              label="Start Date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              disabled={timeType !== 'Custom'}
              value={dateRange.from}
              onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              type="date"
              label="End Date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              disabled={timeType !== 'Custom'}
              value={dateRange.to}
              onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
            />
          </Grid>
        </Grid>

        {/* Filters */}
        <Grid container spacing={1}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Autocomplete
              multiple
              options={personOptions}
              value={selectedPersons}
              onChange={(_, v) => setSelectedPersons(v)}
              getOptionLabel={(o) => o.name}
              renderTags={(value, getTagProps) =>
                value.map((o, i) => (
                  <Chip {...getTagProps({ index: i })} label={`${o.name} (${o.type})`} />
                ))
              }
              renderInput={(p) => <TextField {...p} label="Person" />}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <AreaHierarchySelector
              buildings={buildings}
              floors={floors}
              floorplans={floorplans}
              maskedAreas={areas}
              value={selectedArea}
              onChange={setSelectedArea}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            {/* <Autocomplete
              options={PersonType}
              value={selectedType}
              onChange={(_, v) => setSelectedType(v)}
              getOptionLabel={(o) => o.label}
              
              renderInput={(p) => <TextField {...p} label="Target" disabled={p.disabled} />}
            /> */}
            <CustomSelect
              name="Person Type"
              value={selectedType}
              onChange={(e: React.ChangeEvent<{ value: unknown }>) =>
                setSelectedType(e.target.value)
              }
              fullWidth
              // label="Person Type"
              // options = {PersonType}
              variant="outlined"
            >
              {PersonType.map((option) => (
                <MenuItem key={option.value} value={option.value} disabled={option.disabled}>
                  {option.label}
                </MenuItem>
              ))}
            </CustomSelect>
          </Grid>
        </Grid>

        {/* Actions */}
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Button fullWidth variant="contained" onClick={handleGenerate}>
              Generate Report
            </Button>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Button fullWidth variant="outlined" onClick={() => setOpenPresetDialog(true)}>
              Save as Preset
            </Button>
          </Grid>
        </Grid>
      </Card>

      {/* Preset Dialog */}
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
            fullWidth
            label="Preset Name"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPresetDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSavePreset}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <VisitorReportDialog
        open={openReport}
        onClose={() => setOpenReport(false)}
        trackingLogs={trackingLogs}
        alarmLogs={alarmLogs}
      />
    </Box>
  );
};

export default VisitorReportFilter;
