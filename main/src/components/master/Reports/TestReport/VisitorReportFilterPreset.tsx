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
} from '@mui/material';
import { Search, PlayArrow, Delete, Edit } from '@mui/icons-material';
import {
  useAllVisitorFilterPresetDummy as useAllVisitorFilterPreset,
  useDeleteVisitorFilterPresetDummy as useDeleteVisitorFilterPreset,
} from 'src/hooks/useVisitorFilterPreset';
import { VisitorFilterPresetType } from 'src/store/apps/crud/visitorFilterPreset';

interface VisitorReportFilterPresetProps {
  onApplyPreset: (preset: VisitorFilterPresetType) => void;
  onGenerateReport: () => void;
}

const VisitorReportFilterPreset = ({
  onApplyPreset,
  onGenerateReport,
}: VisitorReportFilterPresetProps) => {
  const { data: presets, isLoading, error } = useAllVisitorFilterPreset();
  const deleteMutation = useDeleteVisitorFilterPreset();
  const [selectedPreset, setSelectedPreset] = useState<VisitorFilterPresetType | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

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

  const handleDeletePreset = (presetId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (window.confirm('Are you sure you want to delete this filter preset?')) {
      deleteMutation.mutate(presetId);
      if (selectedPreset?.id === presetId) {
        setSelectedPreset(null);
      }
    }
  };

  const handleGenerateReportClick = () => {
    if (selectedPreset) {
      alert(`Generating report with preset: ${selectedPreset.name}`);
      onGenerateReport();
    } else {
      alert('Please select a filter preset first');
    }
  };

  // Helper function to get the location display value
  const getLocationDisplay = (preset: VisitorFilterPresetType) => {
    if (preset.areaId) return `Area: ${preset.areaId}`;
    if (preset.floorplanId) return `Floorplan: ${preset.floorplanId}`;
    if (preset.floorId) return `Floor: ${preset.floorId}`;
    if (preset.buildingId) return `Building: ${preset.buildingId}`;
    return '';
  };

  // Dummy data for display
  const dummyVisitors = ['Alice Cooper', 'Bob Smith', 'Charlie Brown', 'Diana Prince'];
  const dummyAreas = ['Main Area', 'Lobby', 'Conference Area', 'Office Area'];
  const dummyHosts = ['John Smith', 'Sarah Johnson', 'Mike Wilson', 'Emma Davis'];

  return (
    <Box p={2}>
      <Typography variant="h6" fontWeight={700} textAlign="center" mb={2}>
        Filter Presets
      </Typography>
      <Grid container spacing={2}>
        {/* Left Side - Search and List */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
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
                        onClick={(e) => handleDeletePreset(preset.id, e)}
                        color="error"
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
                          {searchTerm ? 'No matching presets found' : 'No filter presets available'}
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
                          {/* <InputLabel>Filter Type</InputLabel>
                            <Select
                              label="Filter Type"
                              value={selectedPreset.timeRange}
                              disabled
                            >
                              <MenuItem value="Daily">Daily</MenuItem>
                              <MenuItem value="Weekly">Weekly</MenuItem>
                              <MenuItem value="Monthly">Monthly</MenuItem>
                              <MenuItem value="Custom">Custom</MenuItem>
                            </Select> */}
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
                              ? selectedPreset.startTime || ''
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
                              ? selectedPreset.endTime || ''
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
                        <Autocomplete
                          multiple
                          options={dummyVisitors}
                          value={selectedPreset.visitorId ? [selectedPreset.visitorId] : []}
                          disabled
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Visitor (by name)"
                              placeholder="Select visitors..."
                            />
                          )}
                          renderTags={(value, getTagProps) =>
                            value.map((option, index) => (
                              <Chip
                                label={option}
                                size="small"
                                {...getTagProps({ index })}
                                key={option}
                              />
                            ))
                          }
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
                          {/* <InputLabel>Host</InputLabel>
                            <Select
                              label="Host"
                              value={selectedPreset.hostName || ''}
                              disabled
                            >
                              <MenuItem value="">Select Host</MenuItem>
                              {dummyHosts.map((host) => (
                                <MenuItem key={host} value={host}>
                                  {host}
                                </MenuItem>
                              ))}
                            </Select> */}
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
                    {/* <Grid size={{xs: 12, md: 6}}>
                        <Button
                          fullWidth
                          variant="outlined"
                          startIcon={<PlayArrow />}
                          onClick={handleApplyPreset}
                          sx={{ height: 40 }}
                        >
                          Apply Filters
                        </Button>
                      </Grid> */}
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Button
                        fullWidth
                        variant="contained"
                        color="primary"
                        onClick={handleGenerateReportClick}
                        sx={{ height: 40 }}
                      >
                        Generate Report
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
  );
};

export default VisitorReportFilterPreset;
