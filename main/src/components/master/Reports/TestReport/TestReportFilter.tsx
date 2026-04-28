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
  const [selectedAreas, setSelectedAreas] = useState<SelectedNode[]>([]);
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
    buildingId: selectedAreas.filter((a) => a?.type === 'building').map((a) => a?.data?.id),
    floorId: selectedAreas.filter((a) => a?.type === 'floor').map((a) => a?.data?.id),
    floorplanId: selectedAreas.filter((a) => a?.type === 'floorplan').map((a) => a?.data?.id),
    areaId: selectedAreas.filter((a) => a?.type === 'area').map((a) => a?.data?.id),
    visitorId: selectedPersons.filter((p) => p.type === 'visitor').map((p) => p.id),
    memberId: selectedPersons.filter((p) => p.type === 'member').map((p) => p.id),
  });

  const buildAlarmFilter = (): NewGetFilter => {
    const filter: any = {
      timeRange: timeType.toLowerCase() as NewGetFilter['timeRange'],
      buildingId: selectedAreas.filter((a) => a?.type === 'building').map((a) => a?.data?.id),
      floorId: selectedAreas.filter((a) => a?.type === 'floor').map((a) => a?.data?.id),
      floorplanId: selectedAreas.filter((a) => a?.type === 'floorplan').map((a) => a?.data?.id),
      areaId: selectedAreas.filter((a) => a?.type === 'area').map((a) => a?.data?.id),
      visitorId: selectedPersons.filter((p) => p.type === 'visitor').map((p) => p.id),
      memberId: selectedPersons.filter((p) => p.type === 'member').map((p) => p.id),
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
      PersonName: r.personName ?? '-',
      BuildingName: r.buildingName ?? '-',
      FloorName: r.floorName ?? '-',
      AreaName: r.areaName ?? '-',
      EnterTime: r.enterTime,
      ExitTime: r.exitTime,
      VisitorStatus: r.status ?? '-',
      HostName: r.hostName ?? '-',
      DurationMinutes: r.durationInMinutes,
    }));

  const adaptAlarm = (data: NewAlarmType[]) =>
    data.map((r) => ({
      PersonName: r.personName ?? '-',
      BuildingName: r.buildingName ?? '-',
      FloorName: r.floorName ?? '-',
      AreaName: r.areaName ?? '-',
      AreaLabel: r.areaLabel?.map((l) => l.labelName).join(', ') ?? '-',
      AlarmTriggered: r.triggeredAt,
      AcknowledgedAt: r.acknowledgedAt,
      AcknowledgedBy: r.acknowledgedBy ?? '-',
      DispatchedAt: r.dispatchedAt,
      DispatchedBy: r.dispatchedBy ?? '-',
      AssignedSecurityName:
        r.assignedSecurityName?.length > 0 ? r.assignedSecurityName.join(', ') : '-',
      AcceptedAt: r.acceptedAt,
      AcceptedBy: r.acceptedBy ?? '-',
      responseTimeSeconds: r.responseTimeSeconds,
      responseTimeFormatted: r.responseTimeFormatted,
      resolutionTimeSeconds: r.resolutionTimeSeconds,
      resolutionTimeFormatted: r.resolutionTimeFormatted,

      AlarmDone: r.doneAt,
      DoneBy: r.doneBy ?? '-',
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
      console.log('Tracking: ', tracking);
      console.log('Alarms: ', alarms);
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
        buildingId: selectedAreas.filter((a) => a?.type === 'building').map((a) => a?.data?.id),
        floorId: selectedAreas.filter((a) => a?.type === 'floor').map((a) => a?.data?.id),
        floorplanId: selectedAreas.filter((a) => a?.type === 'floorplan').map((a) => a?.data?.id),
        areaId: selectedAreas.filter((a) => a?.type === 'area').map((a) => a?.data?.id),
        visitorId: selectedPersons.filter((p) => p.type === 'visitor').map((p) => p.id),
        memberId: selectedPersons.filter((p) => p.type === 'member').map((p) => p.id),
        fromDate: timeType === 'Custom' ? dateRange.from : null,
        toDate: timeType === 'Custom' ? dateRange.to : null,
      } as any);

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
            <Autocomplete<PersonOption, true>
              multiple
              options={personOptions}
              value={selectedPersons}
              onChange={(_, value) => setSelectedPersons(value)}
              getOptionLabel={(option) => option?.name ?? ''}
              renderInput={(params) => <TextField {...params} label="Person" />}
              isOptionEqualToValue={(option, value) => option.id === value.id}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <AreaHierarchySelector
              multiple
              buildings={buildings}
              floors={floors}
              floorplans={floorplans}
              maskedAreas={areas}
              value={selectedAreas}
              onChange={setSelectedAreas}
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
