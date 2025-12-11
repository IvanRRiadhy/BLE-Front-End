import { RootState, useDispatch, useSelector } from 'src/store/Store';
import { Box, Typography, TextField, MenuItem, Divider, Button } from '@mui/material';
import { useEffect, useState } from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import dayjs, { Dayjs } from 'dayjs';

import { DateTimePicker } from '@mui/x-date-pickers';
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

type TimeRangeKey = 'today' | 'week' | 'month' | 'custom';

export type SelectedNode =
  | { type: 'building'; data: any }
  | { type: 'floor'; data: any }
  | { type: 'floorplan'; data: any }
  | { type: 'area'; data: any }
  | null;

const InvestigateFilter = () => {
  const dispatch = useDispatch();

  const investigateFilter = useSelector(
    (state: RootState) => state.VisitorSessionReducer.visitorSessionFilter
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

  const [timeRange, setTimeRange] = useState<TimeRangeKey>('today');
  const [startTime, setStartTime] = useState<Dayjs | null>(null);
  const [endTime, setEndTime] = useState<Dayjs | null>(null);

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

  }, [
    investigateFilter,
    visitorData,
    buildingData,
    floorData,
    floorplanData,
    areaData,
  ]);

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

    const finalFilter = {
      TimeRange: timeRange,
      visitorId: selectedVisitor.id,
      buildingId,
      floorId,
      floorplanId,
      areaId,
    };

    dispatch(SetSelectedVisitor(selectedVisitor));
    dispatch(UpdateFilter(finalFilter));
    dispatch(fetchVisitorSession(finalFilter));
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ p: 2, borderRight: '1px solid #ddd', height: '82vh', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 5 }}>
        
        <Typography variant="h4" fontWeight="bold" padding={3} mt={-2}>
          Filter
        </Typography>

        <Divider sx={{ mt: -5 }} />

        {/* Visitor */}
        <Autocomplete
          options={visitorData}
          getOptionLabel={(opt) => opt.name ?? ''}
          isOptionEqualToValue={(opt, val) => opt?.id === val?.id}
          value={selectedVisitor}
          onChange={(e, val) => setSelectedVisitor(val)}
          renderInput={(params) => <TextField {...params} label="Visitor Name" size="medium" />}
        />

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
            <DateTimePicker label="Start Time" value={startTime} onChange={setStartTime} />
            <DateTimePicker label="End Time" value={endTime} onChange={setEndTime} />
          </>
        )}

        {/* Area */}
        <AreaHierarchySelector
          buildings={buildingData}
          floors={floorData}
          floorplans={floorplanData}
          maskedAreas={areaData}
          value={selectedArea}
          onChange={setSelectedArea}
        />

        <Box flexGrow={1} />

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
    </LocalizationProvider>
  );
};

export default InvestigateFilter;
