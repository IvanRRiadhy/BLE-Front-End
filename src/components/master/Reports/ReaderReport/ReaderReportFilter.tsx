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
} from '@mui/material';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';

import AreaHierarchySelector from 'src/components/shared/AreaHierarchySelector';
import { useAllBuilding } from 'src/hooks/useBuilding';
import { useAllFloors } from 'src/hooks/useFloor';
import { useAllFloorplans } from 'src/hooks/useFloorplan';
import { useAllMaskedAreas } from 'src/hooks/useMaskedArea';
import { useReaderReport, readerReportFilterType, defaultReaderReportFilter } from 'src/hooks/useReaderReport';
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';
import { PersonType } from 'src/types/crud/input';
import ReaderReportDialog from './ReaderReportDialog';

export type SelectedNode =
  | { type: 'building'; data: any }
  | { type: 'floor'; data: any }
  | { type: 'floorplan'; data: any }
  | { type: 'area'; data: any }
  | null;

const ReaderReportFilter = () => {
  /* ===================== DATA ===================== */
  const buildings = useAllBuilding().data || [];
  const floors = useAllFloors().data || [];
  const floorplans = useAllFloorplans().data || [];
  const areas = useAllMaskedAreas().data || [];
  
  // Dummy readers for now (added later)
  const readerOptions: any[] = [];

  /* ===================== STATE ===================== */
  const [timeType, setTimeType] = useState<'Daily' | 'Weekly' | 'Monthly' | 'Custom'>('Daily');

  const [dateRange, setDateRange] = useState({
    from: dayjs().format('YYYY-MM-DD'),
    to: dayjs().format('YYYY-MM-DD'),
  });

  const [selectedAreas, setSelectedAreas] = useState<SelectedNode[]>([]);
  const [selectedReaders, setSelectedReaders] = useState<any[]>([]);
  const [selectedPersonType, setSelectedPersonType] = useState<string>('all');
  const [openReport, setOpenReport] = useState(false);

  // We maintain the filter payload state which the hook watches.
  const [filterPayload, setFilterPayload] = useState<readerReportFilterType>(defaultReaderReportFilter);

  /* ===================== HOOK ===================== */
  // The query executes automatically when filterPayload changes (or manually via refetch)
  const { data: reportData, refetch, isFetching } = useReaderReport(filterPayload);

  /* ===================== FILTER BUILDERS ===================== */
  const buildFilter = (): readerReportFilterType => {
    const filter: readerReportFilterType = {
      timeRange: timeType.toLowerCase(),
      buildingId: selectedAreas.filter((a) => a?.type === 'building').map((a) => a?.data?.id),
      floorId: selectedAreas.filter((a) => a?.type === 'floor').map((a) => a?.data?.id),
      floorplanId: selectedAreas.filter((a) => a?.type === 'floorplan').map((a) => a?.data?.id),
      areaId: selectedAreas.filter((a) => a?.type === 'area').map((a) => a?.data?.id),
      readerId: selectedReaders.map((r) => r.id),
      personType: selectedPersonType,
      from: null,
      to: null,
    };

    if (timeType === 'Custom') {
      filter.from = dayjs(dateRange.from).startOf('day').toISOString();
      filter.to = dayjs(dateRange.to).endOf('day').toISOString();
    }

    return filter;
  };

  /* ===================== HANDLERS ===================== */
  const handleGenerate = async () => {
    try {
      const payload = buildFilter();
      setFilterPayload(payload);
      
      // refetch will force the query to fetch with the new payload immediately
      const result = await refetch();
      console.log('Reader Report Generated:', result.data);
      toast.success('Report generated successfully');
      setOpenReport(true);
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate report');
    }
  };

  /* ===================== UI ===================== */
  return (
    <Box p={2}>
      <Typography variant="h6" fontWeight={700} textAlign="center" mb={2}>
        Reader Report Filter
      </Typography>

      <Card sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Time Row */}
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

        {/* Filters Row */}
        <Grid container spacing={1}>
          {/* Area */}
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

          {/* BleReader (Empty for now) */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Autocomplete
              multiple
              options={readerOptions}
              value={selectedReaders}
              onChange={(_, value) => setSelectedReaders(value)}
              getOptionLabel={(option) => option?.name ?? ''}
              renderInput={(params) => <TextField {...params} label="Ble Reader" />}
              isOptionEqualToValue={(option, value) => option.id === value.id}
            />
          </Grid>

          {/* Person Type */}
          <Grid size={{ xs: 12, md: 4 }}>
            <CustomSelect
              name="Person Type"
              value={selectedPersonType}
              onChange={(e: React.ChangeEvent<{ value: unknown }>) =>
                setSelectedPersonType(e.target.value as string)
              }
              fullWidth
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

        {/* Actions Row */}
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 12 }}>
            <Button 
              fullWidth 
              variant="contained" 
              onClick={handleGenerate}
              disabled={isFetching}
            >
              {isFetching ? 'Generating...' : 'Generate Report'}
            </Button>
          </Grid>
        </Grid>
      </Card>

      <ReaderReportDialog
        open={openReport}
        onClose={() => setOpenReport(false)}
        reportData={reportData ?? []}
      />
    </Box>
  );
};

export default ReaderReportFilter;