import React, { useState } from 'react';
import {
  Card,
  Grid2 as Grid,
  TextField,
  Button,
  Typography,
  MenuItem,
  CircularProgress,
  Stack,
} from '@mui/material';
import { IconSearch, IconX } from '@tabler/icons-react';
import AreaHierarchySelector, { SelectedNode } from 'src/components/shared/AreaHierarchySelector';
import { AreaInvestigationTimeRange } from 'src/hooks/useInvestigate';
import dayjs from 'dayjs';

export interface AreaOption {
  id: string;
  name: string;
  buildingName?: string;
  floorName?: string;
  floorplanName?: string;
}

export interface AreaInvestigateFilterState {
  area: AreaOption | null;
  timeRange: AreaInvestigationTimeRange;
  from: string | null;
  to: string | null;
}

interface NewAreaInvestigateFilterProps {
  onSearch: (filter: AreaInvestigateFilterState) => void;
  onReset?: () => void;
  isLoading?: boolean;
  initialValue?: AreaInvestigateFilterState;
}

const NewAreaInvestigateFilter: React.FC<NewAreaInvestigateFilterProps> = ({
  onSearch,
  onReset,
  isLoading = false,
  initialValue,
}) => {
  const [selectedNode, setSelectedNode] = useState<SelectedNode>(
    initialValue?.area
      ? {
          type: 'area',
          data: {
            id: initialValue.area.id,
            name: initialValue.area.name,
            areaName: initialValue.area.name,
            buildingName: initialValue.area.buildingName,
            floorName: initialValue.area.floorName,
            floorplanName: initialValue.area.floorplanName,
          },
        }
      : null
  );
  const [timeRange, setTimeRange] = useState<AreaInvestigationTimeRange>(
    initialValue?.timeRange || 'daily'
  );
  const [fromDate, setFromDate] = useState<string>(
    initialValue?.from
      ? dayjs(initialValue.from).format('YYYY-MM-DDTHH:mm')
      : dayjs().startOf('day').format('YYYY-MM-DDTHH:mm')
  );
  const [toDate, setToDate] = useState<string>(
    initialValue?.to
      ? dayjs(initialValue.to).format('YYYY-MM-DDTHH:mm')
      : dayjs().endOf('day').format('YYYY-MM-DDTHH:mm')
  );

  React.useEffect(() => {
    if (initialValue) {
      if (initialValue.area !== undefined) {
        if (initialValue.area) {
          setSelectedNode({
            type: 'area',
            data: {
              id: initialValue.area.id,
              name: initialValue.area.name,
              areaName: initialValue.area.name,
              buildingName: initialValue.area.buildingName,
              floorName: initialValue.area.floorName,
              floorplanName: initialValue.area.floorplanName,
            },
          });
        } else {
          setSelectedNode(null);
        }
      }
      if (initialValue.timeRange) {
        setTimeRange(initialValue.timeRange);
      }
      if (initialValue.from) {
        setFromDate(dayjs(initialValue.from).format('YYYY-MM-DDTHH:mm'));
      }
      if (initialValue.to) {
        setToDate(dayjs(initialValue.to).format('YYYY-MM-DDTHH:mm'));
      }
    }
  }, [initialValue]);

  const selectedArea: AreaOption | null =
    selectedNode?.type === 'area' && selectedNode.data
      ? {
          id: selectedNode.data.id,
          name: selectedNode.data.name || selectedNode.data.areaName || 'Unnamed Area',
          buildingName: selectedNode.data.buildingName || '',
          floorName: selectedNode.data.floorName || '',
          floorplanName: selectedNode.data.floorplanName || '',
        }
      : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedArea) return;

    let fromIso: string | null = null;
    let toIso: string | null = null;

    if (timeRange.toLowerCase() === 'custom') {
      fromIso = fromDate ? dayjs(fromDate).format('YYYY-MM-DDTHH:mm:ss') : null;
      toIso = toDate ? dayjs(toDate).format('YYYY-MM-DDTHH:mm:ss') : null;
    }

    onSearch({
      area: selectedArea,
      timeRange,
      from: fromIso,
      to: toIso,
    });
  };

  return (
    <Card
      elevation={0}
      sx={{
        p: 2.5,
        mb: 3,
        borderRadius: '16px',
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <form onSubmit={handleSubmit}>
        <Grid container spacing={2} alignItems="center">
          {/* Area Selector using AreaHierarchySelector */}
          <Grid size={{ xs: 12, md: timeRange === 'custom' ? 3 : 5 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600} mb={0.5} display="block">
              Area
            </Typography>
            <AreaHierarchySelector
              value={selectedNode}
              onChange={(node) => setSelectedNode(node)}
              exclusive="area"
              size="small"
              label=""
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                },
              }}
            />
          </Grid>

          {/* Time Range Selector */}
          <Grid size={{ xs: 12, sm: 6, md: timeRange === 'custom' ? 2 : 4 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600} mb={0.5} display="block">
              Time Range
            </Typography>
            <TextField
              select
              fullWidth
              size="small"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as AreaInvestigationTimeRange)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                },
              }}
            >
              <MenuItem value="daily">Today (Daily)</MenuItem>
              <MenuItem value="yesterday">Yesterday</MenuItem>
              <MenuItem value="weekly">This Week</MenuItem>
              <MenuItem value="last_week">Last Week</MenuItem>
              <MenuItem value="monthly">This Month</MenuItem>
              <MenuItem value="last_month">Last Month</MenuItem>
              <MenuItem value="yearly">This Year</MenuItem>
              <MenuItem value="last_year">Last Year</MenuItem>
              <MenuItem value="last_7_days">Last 7 Days</MenuItem>
              <MenuItem value="last_30_days">Last 30 Days</MenuItem>
              <MenuItem value="last_90_days">Last 90 Days</MenuItem>
              <MenuItem value="custom">Custom Range</MenuItem>
            </TextField>
          </Grid>

          {/* Custom Date Pickers */}
          {timeRange === 'custom' && (
            <>
              <Grid size={{ xs: 12, sm: 6, md: 2.25 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600} mb={0.5} display="block">
                  From Date
                </Typography>
                <TextField
                  type="datetime-local"
                  size="small"
                  fullWidth
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '8px',
                    },
                  }}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 2.25 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600} mb={0.5} display="block">
                  To Date
                </Typography>
                <TextField
                  type="datetime-local"
                  size="small"
                  fullWidth
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '8px',
                    },
                  }}
                />
              </Grid>
            </>
          )}

          {/* Actions: Investigate & Clear */}
          <Grid size={{ xs: 12, md: timeRange === 'custom' ? (selectedArea ? 2.5 : 1.5) : (selectedArea ? 3 : 2) }} sx={{ alignSelf: 'flex-end' }}>
            <Stack direction="row" spacing={1}>
              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={isLoading || !selectedArea}
                startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : undefined}
                sx={{
                  height: 40,
                  borderRadius: '8px',
                  textTransform: 'none',
                  fontWeight: 700,
                  bgcolor: '#1877F2',
                  '&:hover': { bgcolor: '#1166D8' },
                }}
              >
                Investigate
              </Button>
              {selectedArea && onReset && (
                <Button
                  type="button"
                  variant="outlined"
                  color="inherit"
                  onClick={() => {
                    setSelectedNode(null);
                    onReset();
                  }}
                  disabled={isLoading}
                  startIcon={<IconX size={16} />}
                  sx={{
                    height: 40,
                    borderRadius: '8px',
                    textTransform: 'none',
                    fontWeight: 600,
                    borderColor: 'divider',
                    color: 'text.secondary',
                    whiteSpace: 'nowrap',
                    px: 2,
                    '&:hover': {
                      borderColor: 'error.main',
                      color: 'error.main',
                      bgcolor: '#FEF2F2',
                    },
                  }}
                >
                  Clear
                </Button>
              )}
            </Stack>
          </Grid>
        </Grid>
      </form>
    </Card>
  );
};

export default NewAreaInvestigateFilter;
