import { RootState, useDispatch, useSelector } from 'src/store/Store';
import { 
  Box, 
  Typography, 
  TextField, 
  MenuItem, 
  Divider, 
  Button,
  ToggleButton,
  ToggleButtonGroup,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Collapse,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
  Chip,
  Paper
} from '@mui/material';
import { useEffect, useState, useMemo } from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import dayjs, { Dayjs } from 'dayjs';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';

import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

import { useAllVisitor } from 'src/hooks/useVisitor';
import { useAllBuilding } from 'src/hooks/useBuilding';
import { useAllFloors } from 'src/hooks/useFloor';
import { useAllFloorplans } from 'src/hooks/useFloorplan';
import { useAllMaskedAreas } from 'src/hooks/useMaskedArea';

import AreaHierarchySelector from 'src/components/shared/AreaHierarchySelector';
import { fetchVisitorSession, SetSelectedVisitor, UpdateFilter } from 'src/store/apps/crud/visitorSession';
import { VisitorType } from 'src/store/apps/crud/visitor';
import { setActiveMode } from 'src/store/apps/crud/investigate'; 

type TimeRangeKey = 'daily' | 'weekly' | 'monthly' | 'custom';

export type SelectedNode =
  | { type: 'building'; data: any }
  | { type: 'floor'; data: any }
  | { type: 'floorplan'; data: any }
  | { type: 'area'; data: any }
  | null;

type EventTypeFilter = 'both' | 'tracking' | 'alarm';

const InvestigateFilter = () => {
  const dispatch = useDispatch();

  const investigateFilter = useSelector(
    (state: RootState) => state.VisitorSessionReducer.visitorSessionFilter
  );

    const activeMode = useSelector((state: RootState) => 
    state.InvestigateReducer?.activeMode || 'visitor'
  );

  // Get alarm settings from Redux store
  const alarmSettings = useSelector((state: RootState) => 
    state.AlarmSettingReducer.alarmSettingAll || []
  );

  // Master Data
  const { data: visitorData = [] } = useAllVisitor();
  const { data: buildingData = [] } = useAllBuilding();
  const { data: floorData = [] } = useAllFloors();
  const { data: floorplanData = [] } = useAllFloorplans();
  const { data: areaData = [] } = useAllMaskedAreas();

  // States
  const [selectedVisitor, setSelectedVisitor] = useState<VisitorType | null>(null);
  const [selectedArea, setSelectedArea] = useState<SelectedNode>(null);
  const [timeRange, setTimeRange] = useState<TimeRangeKey>('daily');
  const [startTime, setStartTime] = useState<Dayjs | null>(null);
  const [endTime, setEndTime] = useState<Dayjs | null>(null);
  
  // Simplified event type filter
  const [eventTypeFilter, setEventTypeFilter] = useState<EventTypeFilter>('both');
  
  // Alarm types state
  const [selectedAlarmTypes, setSelectedAlarmTypes] = useState<Record<string, boolean>>({});
  const [alarmTypesExpanded, setAlarmTypesExpanded] = useState(false);

  // Normalize function to handle string comparison
  const normalize = (value: any): string => {
    if (typeof value === 'string') {
      return value.toLowerCase().trim();
    }
    return '';
  };

  // Get active alarm types from alarm settings
  const activeAlarmTypes = useMemo(() => {
    if (!Array.isArray(alarmSettings)) return [];
    
    // First, get all enabled alarm categories
    const enabledCategories = alarmSettings
      .filter(setting => setting?.isEnabled === true)
      .map(setting => normalize(setting?.alarmCategory))
      .filter(category => category !== '');
    
    // Define mapping from category names to display keys
    const categoryMapping: Record<string, string> = {
      'geofence': 'geofence',
      'geofencing': 'geofence',
      'overpopulating': 'overpopulate',
      'overpopulate': 'overpopulate',
      'over populated': 'overpopulate',
      'overpopulation': 'overpopulate',
      'stayonarea': 'stayonarea',
      'stay on area': 'stayonarea',
      'stay in area': 'stayonarea',
      'boundary': 'boundary',
      'boundary crossing': 'boundary',
      'blacklist': 'blacklist',
      'help': 'help',
      'lost': 'lost',
      'loitering': 'loitering',
    };
    
    // Map enabled categories to consistent keys
    const mappedCategories = enabledCategories.map(category => {
      // Try exact match first
      if (categoryMapping[category]) {
        return categoryMapping[category];
      }
      
      // Try partial matching for variations
      for (const [key, value] of Object.entries(categoryMapping)) {
        if (category.includes(key) || key.includes(category)) {
          return value;
        }
      }
      
      // Return the original category if no mapping found
      return category;
    });
    
    // Remove duplicates
    const uniqueCategories = Array.from(new Set(mappedCategories));
    
    console.log('Active alarm types:', uniqueCategories);
    return uniqueCategories;
  }, [alarmSettings]);

  // Get display name for alarm type
  const getAlarmDisplayName = (alarmType: string): string => {
    const displayNames: Record<string, string> = {
      'geofence': 'Geofence',
      'overpopulate': 'Over Populate',
      'stayonarea': 'Stay On Area',
      'boundary': 'Boundary',
      'blacklist': 'Blacklist',
      'help': 'Help',
      'lost': 'Lost',
      'loitering': 'Loitering',
    };
    
    return displayNames[alarmType] || alarmType.charAt(0).toUpperCase() + alarmType.slice(1);
  };

  // Initialize selectedAlarmTypes based on active alarm types
  useEffect(() => {
    if (activeAlarmTypes.length > 0) {
      const initialAlarmTypes: Record<string, boolean> = {};
      activeAlarmTypes.forEach(type => {
        initialAlarmTypes[type] = false;
      });
      setSelectedAlarmTypes(initialAlarmTypes);
    }
  }, [activeAlarmTypes]);

  /* ---------------------------------------------------
      LOAD DEFAULT VALUE FROM REDUX (investigateFilter)
     ---------------------------------------------------*/
  useEffect(() => {
    if (!investigateFilter) return;

    // Time Range
    setTimeRange(investigateFilter.TimeRange as TimeRangeKey);

    // Visitor
    if (investigateFilter.visitorId) {
      const v = visitorData.find((x) => x.id === investigateFilter.visitorId);
      if (v) setSelectedVisitor(v);
    }

    // AREA hierarchy
    if (investigateFilter.areaId) {
      const a = areaData.find((x) => x.id === investigateFilter.areaId);
      if (a) setSelectedArea({ type: 'area', data: a });
    } else if (investigateFilter.floorplanId) {
      const fp = floorplanData.find((x) => x.id === investigateFilter.floorplanId);
      if (fp) setSelectedArea({ type: 'floorplan', data: fp });
    } else if (investigateFilter.floorId) {
      const f = floorData.find((x) => x.id === investigateFilter.floorId);
      if (f) setSelectedArea({ type: 'floor', data: f });
    } else if (investigateFilter.buildingId) {
      const b = buildingData.find((x) => x.id === investigateFilter.buildingId);
      if (b) setSelectedArea({ type: 'building', data: b });
    }
    
    // Event Type Filter
    if (investigateFilter.eventTypes) {
      const { all, accessTracking, alarm } = investigateFilter.eventTypes;
      
      if (all === true || (accessTracking && alarm)) {
        setEventTypeFilter('both');
      } else if (accessTracking && !alarm) {
        setEventTypeFilter('tracking');
      } else if (!accessTracking && alarm) {
        setEventTypeFilter('alarm');
      } else {
        setEventTypeFilter('both');
      }
      
      // Load alarm types if they exist in filter
      if (investigateFilter.eventTypes.alarmSubTypes) {
        // Filter out any alarm sub-types that are not in activeAlarmTypes
        const filteredAlarmSubTypes = { ...investigateFilter.eventTypes.alarmSubTypes };
        Object.keys(filteredAlarmSubTypes).forEach(key => {
          if (!activeAlarmTypes.includes(key)) {
            delete filteredAlarmSubTypes[key];
          }
        });
        setSelectedAlarmTypes(filteredAlarmSubTypes);
      }
      
      // Expand alarm types if alarm is selected
      if (alarm) {
        setAlarmTypesExpanded(true);
      }
    }

  }, [
    investigateFilter,
    visitorData,
    buildingData,
    floorData,
    floorplanData,
    areaData,
    activeAlarmTypes,
  ]);

    // Handle activeMode change
  const handleActiveModeChange = (
    event: React.MouseEvent<HTMLElement>,
    newMode: 'visitor' | 'alarm' | 'area',
  ) => {
    if (newMode !== null) {
      dispatch(setActiveMode(newMode));
    }
  };

  const handleEventTypeChange = (
    event: React.MouseEvent<HTMLElement>,
    newFilter: EventTypeFilter,
  ) => {
    if (newFilter !== null) {
      // If changing to tracking, clear alarm types selections
      if (newFilter === 'tracking') {
        const clearedAlarmTypes = { ...selectedAlarmTypes };
        Object.keys(clearedAlarmTypes).forEach(key => {
          clearedAlarmTypes[key] = false;
        });
        setSelectedAlarmTypes(clearedAlarmTypes);
        setAlarmTypesExpanded(false);
      }
      
      setEventTypeFilter(newFilter);
      
      // Expand alarm types when selecting alarm or both
      if (newFilter === 'alarm' || newFilter === 'both') {
        setAlarmTypesExpanded(true);
      }
    }
  };

  // Toggle alarm types expansion
  const toggleAlarmTypesExpanded = () => {
    setAlarmTypesExpanded(!alarmTypesExpanded);
  };

  // Handle alarm type checkbox change
  const handleAlarmTypeChange = (alarmType: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
    
    setSelectedAlarmTypes(prev => ({
      ...prev,
      [alarmType]: checked,
    }));
  };

  // Select all alarm types
  const handleSelectAllAlarmTypes = () => {
    const allSelected: Record<string, boolean> = {};
    activeAlarmTypes.forEach(type => {
      allSelected[type] = true;
    });
    setSelectedAlarmTypes(allSelected);
  };

  // Clear all alarm types
  const handleClearAllAlarmTypes = () => {
    const noneSelected: Record<string, boolean> = {};
    activeAlarmTypes.forEach(type => {
      noneSelected[type] = false;
    });
    setSelectedAlarmTypes(noneSelected);
  };

  // Count of selected alarm types
  const selectedAlarmTypesCount = useMemo(() => {
    return Object.values(selectedAlarmTypes).filter(v => v).length;
  }, [selectedAlarmTypes]);

  // Check if all alarm types are selected
  const allAlarmTypesSelected = useMemo(() => {
    return activeAlarmTypes.length > 0 && 
           activeAlarmTypes.every(type => selectedAlarmTypes[type] === true);
  }, [activeAlarmTypes, selectedAlarmTypes]);

  // Don't show alarm types section if there are no active alarm types
  const showAlarmTypesSection = activeAlarmTypes.length > 0 && (eventTypeFilter === 'alarm' || eventTypeFilter === 'both');

  /* ---------------------------------------------------
             WHEN USER PRESSES INVESTIGATE
     ---------------------------------------------------*/
  const handleInvestigate = () => {
    if (!selectedVisitor) {
      alert('Please select a visitor first.');
      return;
    }

    let buildingId = null;
    let floorId = null;
    let floorplanId = null;
    let areaId = null;

    if (selectedArea) {
      const data = selectedArea.data;

      switch (selectedArea.type) {
        case 'building': buildingId = data.id; break;
        case 'floor': floorId = data.id; break;
        case 'floorplan': floorplanId = data.id; break;
        case 'area': areaId = data.id; break;
      }
    }

    // Map simplified filter to the expected event types structure
    const eventTypes = {
      all: eventTypeFilter === 'both',
      accessTracking: eventTypeFilter === 'both' || eventTypeFilter === 'tracking',
      alarm: eventTypeFilter === 'both' || eventTypeFilter === 'alarm',
      alarmSubTypes: selectedAlarmTypes,
    };

    const finalFilter = {
      TimeRange: timeRange,
      visitorId: selectedVisitor.id,
      buildingId,
      floorId,
      floorplanId,
      areaId,
      eventTypes,
    };

    dispatch(SetSelectedVisitor(selectedVisitor));
    dispatch(UpdateFilter(finalFilter));
    dispatch(fetchVisitorSession(finalFilter));
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ 
        p: 2, 
        borderRight: '1px solid #ddd', 
        height: '82vh', 
        overflow: 'hidden',
        display: 'flex', 
        flexDirection: 'column', 
        gap: 3 
      }}>
        
        <Typography variant="h4" fontWeight="bold" padding={3} mt={-2}>
          Filter
        </Typography>

        <Divider sx={{ mt: -5 }} />

                {/* Active Mode Toggle */}
        <Box>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Mode
          </Typography>
          <ToggleButtonGroup
            value={activeMode}
            exclusive
            onChange={handleActiveModeChange}
            fullWidth
            size="small"
            sx={{ 
              '& .MuiToggleButton-root': {
                py: 1,
                fontWeight: 500,
                '&.Mui-selected': {
                  background: 'linear-gradient(45deg, #355CFF, #00CFFF)',
                  color: 'white',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #355CFF, #00CFFF)',
                    opacity: 0.9,
                  }
                }
              }
            }}
          >
            <ToggleButton value="visitor">
              Visitor
            </ToggleButton>
            <ToggleButton value="alarm">
              Alarm
            </ToggleButton>
            <ToggleButton value="area">
              Area
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Fixed content section - this doesn't scroll */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, flexShrink: 0 }}>
          {/* Time Range */}
          <TextField
            select
            label="Time Range"
            size="medium"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as TimeRangeKey)}
          >
            <MenuItem value="daily">Today</MenuItem>
            <MenuItem value="weekly">This Week</MenuItem>
            <MenuItem value="monthly">This Month</MenuItem>
            <MenuItem value="custom">Custom Range</MenuItem>
          </TextField>

          {timeRange === 'custom' && (
            <>
              <DateTimePicker 
                label="Start Time" 
                value={startTime} 
                onChange={setStartTime}
                slotProps={{ textField: { size: 'medium' } }}
              />
              <DateTimePicker 
                label="End Time" 
                value={endTime} 
                onChange={setEndTime}
                slotProps={{ textField: { size: 'medium' } }}
              />
            </>
          )}

          {/* Visitor */}
          <Autocomplete
            options={visitorData}
            getOptionLabel={(opt) => opt.name ?? ''}
            isOptionEqualToValue={(opt, val) => opt?.id === val?.id}
            value={selectedVisitor}
            onChange={(e, val) => setSelectedVisitor(val)}
            renderInput={(params) => <TextField {...params} label="Visitor Name" size="medium" />}
          />

          {/* Area */}
          <AreaHierarchySelector
            buildings={buildingData}
            floors={floorData}
            floorplans={floorplanData}
            maskedAreas={areaData}
            value={selectedArea}
            onChange={setSelectedArea}
          />

          {/* Simplified Event Types Filter - Segmented Control */}
          <Box>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Event Types
            </Typography>
            <ToggleButtonGroup
              value={eventTypeFilter}
              exclusive
              onChange={handleEventTypeChange}
              fullWidth
              size="small"
              sx={{ 
                '& .MuiToggleButton-root': {
                  py: 1,
                  fontWeight: 500,
                  '&.Mui-selected': {
                    background: 'linear-gradient(45deg, #355CFF, #00CFFF)',
                    color: 'white',
                    '&:hover': {
                      background: 'linear-gradient(45deg, #355CFF, #00CFFF)',
                      opacity: 0.9,
                    }
                  }
                }
              }}
            >
              <ToggleButton value="both">
                Both
              </ToggleButton>
              <ToggleButton value="tracking">
                Tracking
              </ToggleButton>
              <ToggleButton value="alarm">
                Alarm
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Box>

        {/* Scrollable alarm types section */}
        {showAlarmTypesSection && (
          <Paper 
            elevation={0} 
            sx={{ 
              flex: 1,
              overflow: 'hidden',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Alarm Types Header - Fixed */}
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center',
                cursor: 'pointer',
                '&:hover': { backgroundColor: 'action.hover' },
                p: 1,
                borderBottom: alarmTypesExpanded ? '1px solid' : 'none',
                borderColor: 'divider',
                flexShrink: 0,
              }}
              onClick={toggleAlarmTypesExpanded}
            >
              <Typography 
                variant="subtitle2" 
                fontWeight="medium"
                sx={{ flexGrow: 1 }}
              >
                Alarm Types 
                {selectedAlarmTypesCount > 0 && (
                  <Chip 
                    label={`${selectedAlarmTypesCount} selected`} 
                    size="small" 
                    sx={{ ml: 1, height: 20, fontSize: '0.7rem' }}
                  />
                )}
              </Typography>
              {/* {alarmTypesExpanded ? <ExpandLess /> : <ExpandMore />} */}
            </Box>
            
            {/* Scrollable Alarm Types Content */}
            <Collapse in={alarmTypesExpanded} timeout="auto" sx={{ flex: 1, overflow: 'auto' }}>
              <Box sx={{ 
                p: 2, 
                height: '100%',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 1
              }}>
                {/* Select All / Clear All buttons */}
                <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={handleSelectAllAlarmTypes}
                    disabled={allAlarmTypesSelected}
                    sx={{ fontSize: '0.75rem', py: 0.25 }}
                  >
                    Select All
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={handleClearAllAlarmTypes}
                    disabled={selectedAlarmTypesCount === 0}
                    sx={{ fontSize: '0.75rem', py: 0.25 }}
                  >
                    Clear All
                  </Button>
                </Stack>
                
                {/* Alarm type checkboxes */}
                <FormGroup sx={{ flex: 1 }}>
                  {activeAlarmTypes.map((alarmType) => (
                    <FormControlLabel
                      key={alarmType}
                      control={
                        <Checkbox
                          checked={selectedAlarmTypes[alarmType] || false}
                          onChange={handleAlarmTypeChange(alarmType)}
                          size="small"
                        />
                      }
                      label={
                        <Typography variant="body2">
                          {getAlarmDisplayName(alarmType)}
                        </Typography>
                      }
                      sx={{ mb: 0.5 }}
                    />
                  ))}
                </FormGroup>
                
                {/* Legend */}
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, flexShrink: 0 }}>
                  {selectedAlarmTypesCount === 0 
                    ? 'No specific types selected = All alarm types'
                    : `${selectedAlarmTypesCount} of ${activeAlarmTypes.length} types selected`
                  }
                </Typography>
              </Box>
            </Collapse>
          </Paper>
        )}
        {/* <Box flexGrow={0}/> */}

        {/* Investigate Button - Fixed at bottom */}
        <Box sx={{ flexShrink: 0, pt: 1 }}>
          <Button
            variant="contained"
            fullWidth
            disabled={!selectedVisitor}
            onClick={handleInvestigate}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              background: 'linear-gradient(45deg, #355CFF, #00CFFF)',
              fontWeight: 'bold',
            }}
          >
            INVESTIGATE
          </Button>
        </Box>

      </Box>
    </LocalizationProvider>
  );
};

export default InvestigateFilter;