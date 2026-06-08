import { useMemo, useState } from 'react';
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
  FormControlLabel,
  Radio,
  RadioGroup,
  FormLabel,
  CircularProgress,
  Chip,
  ToggleButtonGroup,
  ToggleButton,
  Switch,
} from '@mui/material';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';

import { useAllSecuritys } from 'src/hooks/useSecurityGuard';
import { useAllPatrolRoute } from 'src/hooks/usePatrolRoute';
import { usePatrolReport } from 'src/hooks/usePatrolReport';
import { buildPatrolReportRows } from 'src/utils/exportPatrolReport';
import { defaultPatrolReportFilter } from 'src/store/apps/defaultForm';
import { memberType } from 'src/store/apps/crud/member';
import { PatrolRouteType } from 'src/store/apps/crud/patrolRoute';
import { TimeRangeOption, GetFilter, SessionStatus } from 'src/store/apps/crud/patrolReport';
import { getUserTimezone } from 'src/utils/time';

type CompletedFilter = 'all' | 'completed' | 'incomplete';


const TIME_RANGE_OPTIONS: { value: TimeRangeOption; label: string }[] = [
  { value: 'today',        label: 'Today'        },
  { value: 'yesterday',    label: 'Yesterday'    },
  { value: 'weekly',       label: 'This Week'    },
  { value: 'last_week',    label: 'Last Week'    },
  { value: 'monthly',      label: 'This Month'   },
  { value: 'last_month',   label: 'Last Month'   },
  { value: 'yearly',       label: 'This Year'    },
  { value: 'last_year',    label: 'Last Year'    },
  { value: 'last_7_days',  label: 'Last 7 Days'  },
  { value: 'last_30_days', label: 'Last 30 Days' },
  { value: 'last_90_days', label: 'Last 90 Days' },
  { value: 'custom',       label: 'Custom'       },
];

const SESSION_STATUSES: { value: SessionStatus; label: string }[] = [
  { value: 'scheduled',        label: 'Scheduled'   },
  { value: 'active',           label: 'Active'       },
  { value: 'completed',        label: 'Completed'    },
  { value: 'absent',           label: 'Absent'       },
  { value: 'partialcompleted', label: 'Partial'      },
  { value: 'timedout',         label: 'Timed Out'    },
];

const PatrolReportFilter = () => {
  /* ===================== DATA ===================== */
  const { data: securities = [] } = useAllSecuritys();
  const { data: routes = [] } = useAllPatrolRoute();

  /* ===================== STATE ===================== */
  const [timeRange, setTimeRange] = useState<TimeRangeOption>('today');
  const [dateRange, setDateRange] = useState({
    from: dayjs().format('YYYY-MM-DD'),
    to:   dayjs().format('YYYY-MM-DD'),
  });
const timezone = useMemo(() => getUserTimezone(), []);
  const [selectedSecurities, setSelectedSecurities] = useState<memberType[]>([]);
  const [selectedRoutes,     setSelectedRoutes]     = useState<PatrolRouteType[]>([]);
  const [completedFilter,    setCompletedFilter]    = useState<CompletedFilter>('all');
  const [sessionStatus,      setSessionStatus]      = useState<SessionStatus | null>(null);
  const [reportTitle,        setReportTitle]        = useState('');
  const [includeCase,        setIncludeCase]        = useState(true);

  /* ===================== MUTATION ===================== */
  const patrolReportMutation = usePatrolReport();

  /* ===================== FILTER BUILDER ===================== */
  const buildFilter = (): GetFilter => ({
    ...defaultPatrolReportFilter,
    timeRange: (timeRange !== 'custom' ? timeRange : '') as TimeRangeOption | '',
    timezone,
    dateFilters:
      timeRange === 'custom'
        ? { StartedAt: { dateFrom: dateRange.from, dateTo: dateRange.to } }
        : {},
    filters: {
      securityId:    selectedSecurities.map((s) => s.id),
      routeId:       selectedRoutes.map((r) => r.id),
      isCompleted:   completedFilter === 'all' ? null : completedFilter === 'completed',
      sessionStatus: sessionStatus ?? null,
    },
  });


  /* ===================== HANDLER ===================== */
  const handleGenerate = async () => {
    try {
      const report = await patrolReportMutation.mutateAsync(buildFilter());

      if (!report || report.length === 0) {
        toast('No patrol sessions found for the selected filters.');
        return;
      }

      const rows     = buildPatrolReportRows(report);
      const filename = `PatrolReport_${dayjs().format('YYYY-MM-DD')}.xlsx`;

      sessionStorage.setItem('patrolReportPreviewData', JSON.stringify({
        rows,
        filename,
        reportTitle: reportTitle || 'Patrol Report',
        generatedAt: dayjs().toISOString(),
        includeCase,
      }));
      const w    = 1200, h = window.screen.height * 0.9;
      const left = (window.screen.width  - w) / 2;
      const top  = (window.screen.height - h) / 2;
      window.open(
        '/report/patrolreport/preview',
        'PatrolReportPreview',
        `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes`,
      );
      toast.success('Preview opened in a new window');
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate patrol report');
    }
  };

  /* ===================== UI ===================== */
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="60vh"
      p={3}
    >
      <Typography variant="h5" fontWeight={700} mb={3} textAlign="center">
        Patrol Report
      </Typography>

      <Card sx={{ p: 3, width: '100%', maxWidth: 820, display: 'flex', flexDirection: 'column', gap: 2.5 }}>

        {/* ── Time Range ──────────────────────────────── */}
        <Grid container spacing={2}>
                  {/* ── Report Title ────────────────────────────── */}
        <TextField
          fullWidth
          label="Report Title"
          placeholder="Enter a title for the report (e.g. Laporan Patrol -Bulan- -Tahun-)"
          value={reportTitle}
          onChange={(e) => setReportTitle(e.target.value)}
          variant="outlined"
          size="small"
          sx={{ mb: 1 }}
        />

        {/* ── Report Filter Divider ──────────────────────── */}
        <Box sx={{ width: '100%', height: '1px', bgcolor: 'divider', my: 1, position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Typography
            sx={{
              bgcolor: 'background.paper',
              px: 2,
              color: 'primary.main',
              fontWeight: 800,
              fontSize: '0.75rem',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              position: 'absolute'
            }}
          >
            Report Filter
          </Typography>
        </Box>

          <Grid size={{ xs: 12, md: timeRange === 'custom' ? 4 : 12 }}>
            <FormControl fullWidth>
              <InputLabel>Time Range</InputLabel>
              <Select
                value={timeRange}
                label="Time Range"
                onChange={(e) => setTimeRange(e.target.value as TimeRangeOption)}
              >
                {TIME_RANGE_OPTIONS.map(({ value, label }) => (
                  <MenuItem key={value} value={value}>{label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {timeRange === 'custom' && (
            <>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  type="date"
                  label="Start Date"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
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
                  value={dateRange.to}
                  onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                />
              </Grid>
            </>
          )}
        </Grid>

        {/* ── Security + Route (multi-select) ─────────── */}
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Autocomplete<memberType, true>
              multiple
              options={securities}
              value={selectedSecurities}
              onChange={(_, v) => setSelectedSecurities(v)}
              getOptionLabel={(o) => o?.name ?? ''}
              isOptionEqualToValue={(o, v) => o.id === v.id}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    {...getTagProps({ index })}
                    key={option.id}
                    label={option.name}
                    size="small"
                  />
                ))
              }
              renderInput={(params) => (
                <TextField {...params} label="Security Guard" placeholder={selectedSecurities.length ? '' : 'All'} />
              )}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Autocomplete<PatrolRouteType, true>
              multiple
              options={routes}
              value={selectedRoutes}
              onChange={(_, v) => setSelectedRoutes(v)}
              getOptionLabel={(o) => o?.name ?? ''}
              isOptionEqualToValue={(o, v) => o.id === v.id}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    {...getTagProps({ index })}
                    key={option.id}
                    label={option.name}
                    size="small"
                  />
                ))
              }
              renderInput={(params) => (
                <TextField {...params} label="Patrol Route" placeholder={selectedRoutes.length ? '' : 'All'} />
              )}
            />
          </Grid>
        </Grid>

        {/* ── Extra Options ────────────────────────────── */}
        <Box sx={{ pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary', mb: 2 }}>
            Extra Options
          </Typography>

          {/* Session Status */}
          <Box sx={{ mb: 3 }}>
            <FormLabel component="legend" sx={{ fontSize: 13, fontWeight: 600, display: 'block', mb: 1 }}>
              Session Status
            </FormLabel>
            <ToggleButtonGroup
              exclusive
              value={sessionStatus}
              onChange={(_, v) => setSessionStatus(v)}
              size="small"
              sx={{ flexWrap: 'wrap', gap: 1 }}
            >
              {SESSION_STATUSES.map(({ value, label }) => (
                <ToggleButton
                  key={value}
                  value={value}
                  sx={{
                    px: 1.5,
                    py: 0.5,
                    fontSize: 13,
                    textTransform: 'none',
                    borderRadius: '16px !important',
                    border: '1px solid',
                    borderColor: 'divider',
                    '&.Mui-selected': {
                      backgroundColor: 'primary.main',
                      color: '#fff',
                      '&:hover': { backgroundColor: 'primary.dark' },
                    },
                  }}
                >
                  {label}
                </ToggleButton>
              ))}
              <Typography
                fontSize={13}
                color="text.secondary"
                sx={{ cursor: 'pointer', alignSelf: 'center', ml: 1 }}
                onClick={() => setSessionStatus(null)}
              >
                {sessionStatus ? '✕ Clear' : 'Any status'}
              </Typography>
            </ToggleButtonGroup>
          </Box>

          {/* Completion */}
          <Box sx={{ mb: 3 }}>
            <FormControl component="fieldset">
              <FormLabel component="legend" sx={{ fontSize: 13, fontWeight: 600, mb: 1 }}>
                Completion
              </FormLabel>
              <RadioGroup
                row
                value={completedFilter}
                onChange={(e) => setCompletedFilter(e.target.value as CompletedFilter)}
              >
                {[
                  { value: 'all',        label: 'All' },
                  { value: 'completed',  label: 'Completed' },
                  { value: 'incomplete', label: 'Incomplete' },
                ].map(({ value, label }) => (
                  <FormControlLabel
                    key={value}
                    value={value}
                    control={<Radio size="small" />}
                    label={<Typography fontSize={14}>{label}</Typography>}
                    sx={{ mr: 3 }}
                  />
                ))}
              </RadioGroup>
            </FormControl>
          </Box>

          {/* Include Case Details */}
          <Box>
            <FormControlLabel
              control={
                <Switch
                  checked={includeCase}
                  onChange={(e) => setIncludeCase(e.target.checked)}
                  size="small"
                />
              }
              label={<Typography fontSize={14} fontWeight={600}>Include Case Details</Typography>}
            />
          </Box>
        </Box>





        {/* ── Action ──────────────────────────────────── */}
        <Button
          fullWidth
          variant="contained"
          size="large"
          disabled={patrolReportMutation.isPending}
          onClick={handleGenerate}
          startIcon={
            patrolReportMutation.isPending
              ? <CircularProgress size={18} color="inherit" />
              : undefined
          }
        >
          {patrolReportMutation.isPending ? 'Generating…' : 'Generate Report'}
        </Button>
      </Card>
    </Box>
  );
};

export default PatrolReportFilter;
