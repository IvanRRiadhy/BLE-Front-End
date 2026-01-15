// src/components/master/Reports/TestReport/VisitorReportFilterPreset.tsx
import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Button,
  Chip,
  Divider,
  Grid2 as Grid,
  TextField,
  InputAdornment,
  Paper,
  ListItemButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  Backdrop,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import { Search, PlayArrow, Delete, Edit } from '@mui/icons-material';
import {
  useAllVisitorFilterPresetDummy as useAllVisitorFilterPreset,
  useApplyVisitorFilterPreset,
  useDeleteVisitorFilterPresetDummy as useDeleteVisitorFilterPreset,
} from 'src/hooks/useVisitorFilterPreset';
import { VisitorFilterPresetType } from 'src/store/apps/crud/visitorFilterPreset';
import { AppDispatch, useDispatch } from 'src/store/Store';
import { useAllBuilding } from 'src/hooks/useBuilding';
import { useAllFloors } from 'src/hooks/useFloor';
import { useAllFloorplans } from 'src/hooks/useFloorplan';
import { useAllMaskedAreas } from 'src/hooks/useMaskedArea';
import { useAllVisitor } from 'src/hooks/useVisitor';
import toast from 'react-hot-toast';
import { useAllMembers } from 'src/hooks/useMember';
import VisitorReportDialog from './VisitorReportDialog';
import { useAlarmLog } from 'src/hooks/useAlarmRecord';
import { NewGetFilter } from 'src/store/apps/crud/alarmRecordTracking';

interface VisitorReportFilterPresetProps {
  onApplyPreset: (preset: VisitorFilterPresetType) => void;
  onGenerateReport: () => void;
}

type PersonOption = {
  id: string;
  name: string;
  type: 'visitor' | 'member';
};

type AlarmLogFilter = {
  timeRange: 'daily' | 'weekly' | 'monthly';
  buildingId: string | null;
  floorId: string | null;
  floorplanId: string | null;
  areaId: string | null;
  visitorId: string | null;
  from?: string;
  to?: string;
};

export function mapPresetToAlarmLogFilter(preset: VisitorFilterPresetType): NewGetFilter {
  const filter: NewGetFilter = {
    timeRange: preset.timeRange.toLowerCase() as NewGetFilter['timeRange'],
    buildingId: preset.buildingId ?? null,
    floorId: preset.floorId ?? null,
    floorplanId: preset.floorplanId ?? null,
    areaId: preset.areaId ?? null,
    visitorId: preset.visitorId ?? null,
    from: null,
    to: null,
  };

  if (preset.timeRange === 'Custom') {
    if (preset.fromDate) {
      filter.from = new Date(preset.fromDate).toISOString();
    }
    if (preset.toDate) {
      filter.to = new Date(preset.toDate).toISOString();
    }
  }

  return filter;
}

const VisitorReportFilterPreset = ({
  onApplyPreset,
  onGenerateReport,
}: VisitorReportFilterPresetProps) => {
  const dispatch: AppDispatch = useDispatch();
  const { data: presets, isLoading, error } = useAllVisitorFilterPreset();
  const buildingData = useAllBuilding().data || [];
  const floorData = useAllFloors().data || [];
  const floorplanData = useAllFloorplans().data || [];
  const areaData = useAllMaskedAreas().data || [];
  const visitorData = useAllVisitor().data || [];
  const memberData = useAllMembers().data || [];

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

  const [selectedPreset, setSelectedPreset] = useState<VisitorFilterPresetType | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [presetToDelete, setPresetToDelete] = useState<VisitorFilterPresetType | null>(null);

  const [openReport, setOpenReport] = useState(false);
  const [apiTrackingData, setApiTrackingData] = useState<any[]>([]);
  const [apiAlarmData, setApiAlarmData] = useState<any[]>([]);

  const deleteMutation = useDeleteVisitorFilterPreset();
  const applyMutation = useApplyVisitorFilterPreset();
  const alarmLogMutation = useAlarmLog();

  const filteredPresets = presets?.filter((preset) =>
    preset.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleSelectPreset = (preset: VisitorFilterPresetType) => {
    setSelectedPreset(preset);
  };

  const handleApplyPreset = () => {
    if (selectedPreset) {
      onApplyPreset(selectedPreset);
      alert(`Applied preset: ${selectedPreset.name}`);
    }
  };

  // Open delete confirmation dialog
  const handleOpenDeleteDialog = (preset: VisitorFilterPresetType, event: React.MouseEvent) => {
    event.stopPropagation();
    setPresetToDelete(preset);
    setDeleteDialogOpen(true);
  };

  // Close delete confirmation dialog
  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setPresetToDelete(null);
  };

  // Confirm delete action
  const handleConfirmDelete = async () => {
    if (presetToDelete) {
      try {
        await deleteMutation.mutateAsync(presetToDelete.id);
        toast.success('Filter preset deleted successfully');

        // Clear selected preset if it was the one deleted
        if (selectedPreset?.id === presetToDelete.id) {
          setSelectedPreset(null);
        }
      } catch (error) {
        toast.error('Failed to delete filter preset');
        console.error(error);
      }
    }
    handleCloseDeleteDialog();
  };

  const handleGenerateReportClick = async () => {
    if (!selectedPreset) {
      toast.error('Please select a filter preset first');
      return;
    }
    console.log('Generating report with preset: ', selectedPreset);
    try {
      const result = await applyMutation.mutateAsync(selectedPreset.id);
      const alarmFilter = mapPresetToAlarmLogFilter(selectedPreset);
      const alarmLog = await alarmLogMutation.mutateAsync(alarmFilter);
      console.log('Fetched Alarm Log for Report:', alarmLog);
      setApiTrackingData(result.data.data);
      setApiAlarmData(alarmLog);
      // toast.success(`Applied preset: ${selectedPreset.name}`);
      // console.log('Visitor filter preset applied successfully: ', result.data);
      setOpenReport(true);
      onGenerateReport();
    } catch (error) {
      console.error(error);
      toast.error('Failed to apply filter preset');
    }
  };

  // Helper function to get the location display value
  const getLocationDisplay = (preset: VisitorFilterPresetType) => {
    if (preset.areaId) {
      const area = areaData.find((a) => a.id === preset.areaId);
      return area ? `Area: ${area.name}` : `Area: ${preset.areaId}`;
    }
    if (preset.floorplanId) {
      const floorplan = floorplanData.find((fp) => fp.id === preset.floorplanId);
      return floorplan ? `Floorplan: ${floorplan.name}` : `Floorplan: ${preset.floorplanId}`;
    }
    if (preset.floorId) {
      const floor = floorData.find((f) => f.id === preset.floorId);
      return floor ? `Floor: ${floor.name}` : `Floor: ${preset.floorId}`;
    }
    if (preset.buildingId) {
      const building = buildingData.find((b) => b.id === preset.buildingId);
      return building ? `Building: ${building.name}` : `Building: ${preset.buildingId}`;
    }
    return '';
  };

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

  const adaptAlarmFromApi = (apiData: any[]) => {
    // console.log('Adapting Alarm Data from API:', apiData);
    return apiData.map((r) => ({
      VisitorName: r.visitorName ?? '-',
      BuildingName: r.buildingName ?? '-',
      FloorName: r.floorName ?? '-',
      AreaName: r.floorplanName ?? '-', // or masked area if available later
      AlarmTriggered: r.triggeredAt,
      AlarmDone: r.doneAt,
      HandleDuration: r.handleDurationMinutes,
      VisitorStatus: r.actionStatus ?? '-',
      HostName: '-', // explicitly excluded as you requested
      AlarmCategory: r.alarmStatus,
    }));
  };

  return (
    <>
      {/* Backdrop for loading state */}
      <Backdrop
        sx={{
          color: '#fff',
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        }}
        open={isLoading || deleteMutation.isPending}
      >
        <CircularProgress color="inherit" />
      </Backdrop>

      <Box p={2}>
        <Typography variant="h6" fontWeight={700} textAlign="center" mb={2}>
          Filter Presets
        </Typography>
        <Grid container spacing={2}>
          {/* Left Side - Search and List */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper variant="outlined" sx={{ p: 2, height: '100%', minHeight: 320 }}>
              {/* Search Bar */}
              <TextField
                fullWidth
                size="small"
                placeholder="Search presets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 2 }}
              />

              {/* Presets List */}
              <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                <List dense>
                  {filteredPresets?.map((preset) => (
                    <ListItem
                      key={preset.id}
                      sx={{
                        border: '1px solid',
                        borderColor: selectedPreset?.id === preset.id ? 'primary.main' : 'divider',
                        borderRadius: 1,
                        mb: 1,
                        backgroundColor:
                          selectedPreset?.id === preset.id ? 'action.selected' : 'background.paper',
                        padding: 0,
                      }}
                    >
                      <ListItemButton
                        onClick={() => handleSelectPreset(preset)}
                        sx={{
                          width: '100%',
                          '&:hover': {
                            backgroundColor: 'action.hover',
                          },
                        }}
                      >
                        <ListItemText
                          primary={
                            <Typography variant="subtitle2" noWrap>
                              {preset.name}
                            </Typography>
                          }
                          secondary={
                            <Typography variant="caption" color="text.secondary" noWrap>
                              {preset.timeRange || 'Custom filters'}
                            </Typography>
                          }
                        />
                      </ListItemButton>
                      <ListItemSecondaryAction>
                        <IconButton
                          size="small"
                          onClick={(e) => handleOpenDeleteDialog(preset, e)}
                          color="error"
                          disabled={deleteMutation.isPending}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                  {(!filteredPresets || filteredPresets.length === 0) && (
                    <ListItem>
                      <ListItemText
                        primary={
                          <Typography color="text.secondary" align="center" fontStyle="italic">
                            {searchTerm
                              ? 'No matching presets found'
                              : 'No filter presets available'}
                          </Typography>
                        }
                      />
                    </ListItem>
                  )}
                </List>
              </Box>
            </Paper>
          </Grid>

          {/* Right Side - Selected Preset Content */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Paper
              variant="outlined"
              sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}
            >
              {selectedPreset ? (
                <>
                  <Box sx={{ flex: 1 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        mb: 2,
                      }}
                    >
                      <Typography variant="h6">{selectedPreset.name}</Typography>
                      <Chip
                        label={selectedPreset.timeRange || 'Custom'}
                        color="primary"
                        variant="outlined"
                        size="small"
                      />
                    </Box>

                    <Divider sx={{ mb: 2 }} />

                    {/* Filter Content - Matching EXACT layout from your filter component */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {/* Time Filter - Row 1 */}
                      <Grid container spacing={1} alignItems="center">
                        <Grid size={{ xs: 12, md: 4 }}>
                          <FormControl fullWidth size="small">
                            <TextField
                              label="Filter Type"
                              fullWidth
                              size="medium"
                              value={selectedPreset.timeRange || ''}
                              disabled
                            />
                          </FormControl>
                        </Grid>

                        <Grid size={{ xs: 12, md: 4 }}>
                          <TextField
                            label="Start Date"
                            type="date"
                            fullWidth
                            size="medium"
                            InputLabelProps={{ shrink: true }}
                            value={
                              selectedPreset.timeRange === 'Custom'
                                ? selectedPreset.fromDate || ''
                                : ''
                            }
                            disabled={selectedPreset.timeRange !== 'Custom'}
                            placeholder={selectedPreset.timeRange !== 'Custom' ? 'N/A' : ''}
                          />
                        </Grid>

                        <Grid size={{ xs: 12, md: 4 }}>
                          <TextField
                            label="End Date"
                            type="date"
                            fullWidth
                            size="medium"
                            InputLabelProps={{ shrink: true }}
                            value={
                              selectedPreset.timeRange === 'Custom'
                                ? selectedPreset.toDate || ''
                                : ''
                            }
                            disabled={selectedPreset.timeRange !== 'Custom'}
                            placeholder={selectedPreset.timeRange !== 'Custom' ? 'N/A' : ''}
                          />
                        </Grid>
                      </Grid>

                      {/* Filter Options - Row 2 */}
                      <Grid container spacing={1} alignItems="center">
                        {/* Visitor Name */}
                        <Grid size={{ xs: 12, md: 4 }}>
                          <TextField
                            label="Visitor Name"
                            fullWidth
                            size="medium"
                            value={
                              selectedPreset.visitorId
                                ? visitorData.find((v) => v.id === selectedPreset.visitorId)
                                    ?.name || 'Unknown Visitor'
                                : selectedPreset.memberId
                                ? memberData.find((m) => m.id === selectedPreset.memberId)?.name ||
                                  'Unknown Member'
                                : ''
                            }
                            disabled
                          />
                        </Grid>

                        {/* Location - Single field showing Area/Floorplan/Floor/Building */}
                        <Grid size={{ xs: 12, md: 4 }}>
                          <TextField
                            label="Location"
                            fullWidth
                            size="medium"
                            value={getLocationDisplay(selectedPreset)}
                            disabled
                            placeholder="No location set"
                          />
                        </Grid>

                        {/* Host */}
                        <Grid size={{ xs: 12, md: 4 }}>
                          <FormControl fullWidth size="small">
                            <TextField
                              label="Host"
                              fullWidth
                              size="medium"
                              value={selectedPreset.hostName || ''}
                              disabled
                            />
                          </FormControl>
                        </Grid>
                      </Grid>
                    </Box>
                  </Box>

                  {/* Generate Report Button at bottom of right side */}
                  <Box sx={{ mt: 'auto', pt: 2 }}>
                    <Divider sx={{ mb: 2 }} />
                    <Grid
                      container
                      spacing={2}
                      sx={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                      }}
                    >
                      <Grid size={{ xs: 12, md: 6 }}>
                        <Button
                          fullWidth
                          variant="contained"
                          color="primary"
                          onClick={handleGenerateReportClick}
                          sx={{ height: 40 }}
                          disabled={
                            isLoading || deleteMutation.isPending || applyMutation.isPending
                          }
                        >
                          {applyMutation.isPending ? 'Applying Preset...' : 'Generate Report'}
                        </Button>
                      </Grid>
                    </Grid>
                  </Box>
                </>
              ) : (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    minHeight: 200,
                  }}
                >
                  <Typography color="text.secondary" align="center">
                    Select a filter preset from the list to view details
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">Delete Filter Preset</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Are you sure you want to delete the filter preset "{presetToDelete?.name}"? This action
            cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} disabled={deleteMutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDelete}
            color="error"
            autoFocus
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      <VisitorReportDialog
        open={openReport}
        onClose={() => setOpenReport(false)}
        trackingLogs={adaptTrackingFromApi(apiTrackingData)}
        alarmLogs={adaptAlarmFromApi(apiAlarmData)}
      />
    </>
  );
};

export default VisitorReportFilterPreset;
