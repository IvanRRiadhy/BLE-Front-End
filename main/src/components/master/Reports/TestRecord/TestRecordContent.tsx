import { BASE_URL } from 'src/utils/axios';
import { useEffect, useMemo, useState, useRef } from 'react';
import { useSelector, useDispatch, RootState } from 'src/store/Store';
import {
  Box,
  Typography,
  Avatar,
  Divider,
  Stack,
  Grid2 as Grid,
  Card,
  Chip,
  CardContent,
  useTheme,
  CircularProgress,
  Backdrop,
  TextField,
  Button,
  Tabs,
  Tab,
  TablePagination,
} from '@mui/material';
import { VisitorType } from 'src/store/apps/crud/visitor';
import { useTranslation } from 'react-i18next';
import {
  fetchAlarmDT,
  UpdateFilter as UpdateAlarmFilter,
  AlarmType,
} from 'src/store/apps/crud/alarmRecordTracking';
import {
  fetchTrackingTransDT,
  UpdateFilter as UpdateTrackingFilter,
  trackingTransType,
} from 'src/store/apps/crud/trackingTrans';
import { fetchCard, CardType } from 'src/store/apps/crud/card';
import { defaultAlarmRecordFilter, defaultTrackingTransFilter } from 'src/store/apps/defaultForm';
import dayjs from 'dayjs';
import { use } from 'video.js/dist/types/tech/middleware';

const VisitorContent = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const dispatch = useDispatch();

  const [viewMode, setViewMode] = useState<'alarm' | 'tracking'>('tracking');
  const [loading, setLoading] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const today = new Date();
  const formatDate = (d: Date) => d.toISOString().split('T')[0];
  const [dateRange, setDateRange] = useState({
    from: formatDate(new Date(today.getFullYear(), today.getMonth(), today.getDate())),
    to: formatDate(new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)),
  });

  // Redux data
  const trxVisitorDetail = useSelector(
    (state: RootState) => state.TrxVisitorReducer.SelectedTrxVisitor,
  );
  const visitorDetail: VisitorType | undefined = trxVisitorDetail.visitor;
  const alarmData: AlarmType[] = useSelector(
    (state: RootState) => state.alarmReducer.alarmRecordTrackings,
  );
  const alarmFilteredCount = useSelector(
    (state: RootState) => state.alarmReducer.alarmRecordFilteredCount,
  );
  const trackingTransData = useSelector(
    (state: RootState) => state.trackingTransReducer.trackingTrans,
  );
  const trackingTransFilteredCount = useSelector(
    (state: RootState) => state.trackingTransReducer.trackingTransFilteredCount,
  );
  const alarmFilter = useSelector((state: RootState) => state.alarmReducer.alarmRecordFilter);
  const trackingFilter = useSelector(
    (state: RootState) => state.trackingTransReducer.trackingTransFilter,
  );
  const allCard: CardType[] = useSelector((state: RootState) => state.CardReducer.cardAll);

  const filteredCard: CardType | undefined = allCard.find(
    (card: CardType) => visitorDetail?.bleCardNumber === card.dmac,
  );

  const prevFilterRef = useRef(alarmFilter);

  // Group same-area tracking entries
  function groupTrackingByAreaStay(records: trackingTransType[]) {
    if (!records.length) return [];
    const sorted = [...records].sort(
      (a, b) => dayjs(a.transTime).valueOf() - dayjs(b.transTime).valueOf(),
    );

    const grouped: any[] = [];
    let currentGroup: any = null;

    for (const record of sorted) {
      const areaId = record.floorplanMaskedAreaId;
      if (!currentGroup || currentGroup.floorplanMaskedAreaId !== areaId) {
        if (currentGroup) grouped.push(currentGroup);
        currentGroup = {
          id: record.id,
          floorplanMaskedAreaId: areaId,
          floorplanMaskedArea: record.floorplanMaskedArea,
          reader: record.reader,
          enterTime: record.transTime,
          exitTime: record.transTime,
        };
      } else {
        currentGroup.exitTime = record.transTime;
      }
    }
    if (currentGroup) grouped.push(currentGroup);
    return grouped;
  }

  const trackingFiltered = useMemo(
    () => groupTrackingByAreaStay(trackingTransData),
    [trackingTransData],
  );

  // Initial load (Tracking first)
  useEffect(() => {
    if (!visitorDetail) return;
    setLoading(true);
    dispatch(fetchCard());
    dispatch(UpdateTrackingFilter(defaultTrackingTransFilter));
    dispatch(fetchTrackingTransDT(defaultTrackingTransFilter)).finally(() =>
      setTimeout(() => setLoading(false), 500),
    );
  }, [dispatch, visitorDetail]);

  // Switch view (fetch corresponding data)
  useEffect(() => {
    if (!visitorDetail) return;
    setLoading(true);

    if (viewMode === 'alarm') {
      dispatch(UpdateAlarmFilter(defaultAlarmRecordFilter));
      dispatch(fetchAlarmDT(defaultAlarmRecordFilter)).finally(() =>
        setTimeout(() => setLoading(false), 500),
      );
    } else {
      dispatch(UpdateTrackingFilter(defaultTrackingTransFilter));
      dispatch(fetchTrackingTransDT(defaultTrackingTransFilter)).finally(() =>
        setTimeout(() => setLoading(false), 500),
      );
    }
  }, [viewMode, visitorDetail, dispatch]);

  // Pagination setup
  const isAlarmView = viewMode === 'alarm';
  const activeFilter = isAlarmView
    ? (alarmFilter as import('src/store/apps/crud/alarmRecordTracking').GetFilter)
    : (trackingFilter as import('src/store/apps/crud/trackingTrans').GetFilter);
  const UpdateFilter = viewMode === 'alarm' ? UpdateAlarmFilter : UpdateTrackingFilter;
  const fetchData = viewMode === 'alarm' ? fetchAlarmDT : fetchTrackingTransDT;

  const page =
    viewMode === 'alarm'
      ? Math.floor(alarmFilter.Start / alarmFilter.Length)
      : Math.floor(trackingFilter.Start / trackingFilter.Length);

  const rowsPerPage = viewMode === 'alarm' ? alarmFilter.Length : trackingFilter.Length;

  const handleChangePage = (_: unknown, newPage: number) => {
    if (viewMode === 'alarm') {
      dispatch(UpdateAlarmFilter({ Start: newPage * alarmFilter.Length }));
    } else {
      dispatch(UpdateTrackingFilter({ Start: newPage * trackingFilter.Length }));
    }
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newLength = parseInt(event.target.value, 10);
    if (viewMode === 'alarm') {
      dispatch(UpdateAlarmFilter({ Length: newLength, Start: 0 }));
    } else {
      dispatch(UpdateTrackingFilter({ Length: newLength, Start: 0 }));
    }
  };

  // Refetch when pagination changes
  useEffect(() => {
    if (!visitorDetail) return;

    const isAlarmView = viewMode === 'alarm';

    setLoading(true);

    if (isAlarmView) {
      dispatch(fetchAlarmDT(alarmFilter)).finally(() => setTimeout(() => setLoading(false), 500));
    } else {
      dispatch(fetchTrackingTransDT(trackingFilter)).finally(() =>
        setTimeout(() => setLoading(false), 500),
      );
    }
  }, [viewMode, visitorDetail, alarmFilter, trackingFilter, dispatch]);

  if (!visitorDetail) {
    return (
      <Box p={3}>
        <Typography variant="h6">No visitor selected.</Typography>
      </Box>
    );
  }

return (
  <Box px={3} height="80vh" display="flex" flexDirection="column">
    {/* 🔹 Visitor Info, Card Info, Card Access */}
    <Grid container spacing={0}>
      {[
        {
          key: 'visitor',
          content: (
            <Box display="flex" alignItems="center" gap={2} p={2.5}>
              <Avatar
                src={`${BASE_URL}${visitorDetail?.faceImage}`}
                alt={visitorDetail?.name}
                sx={{
                  width: 90,
                  height: 90,
                  // border: '2px solid #ccc',
                  flexShrink: 0,
                  // borderRadius: 0, // pointy
                }}
              />
              <Stack spacing={0.5} flex={1}>
                <Typography variant="h6" fontWeight={700}>
                  {visitorDetail?.name ?? '-'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {trxVisitorDetail?.agenda ?? '-'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {trxVisitorDetail?.visitorPeriodStart} — {trxVisitorDetail?.visitorPeriodEnd}
                </Typography>
                <Chip
                  label={trxVisitorDetail?.status || 'Unknown'}
                  color="primary"
                  size="small"
                  sx={{ alignSelf: 'flex-start' }}
                />
              </Stack>
            </Box>
          ),
        },
        {
          key: 'card-info',
          content: (
            <CardContent sx={{ p: 2 }}>
              <Typography variant="subtitle1" fontWeight={600}>
                Card Information
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Typography variant="body2">Card Number: {filteredCard?.cardNumber ?? '-'}</Typography>
              <Typography variant="body2">BLE Number: {visitorDetail?.bleCardNumber ?? '-'}</Typography>
              <Typography variant="body2">Card Type: {filteredCard?.cardType ?? '-'}</Typography>
              <Typography variant="body2">
                Masked Area: {filteredCard?.registeredMaskedArea?.name ?? '-'}
              </Typography>
            </CardContent>
          ),
        },
        {
          key: 'access',
          content: (
            <CardContent sx={{ p: 2 }}>
              <Typography variant="subtitle1" fontWeight={600}>
                Card Access
              </Typography>
              <Divider sx={{ my: 1 }} />
              {filteredCard?.cardAccesses?.length ? (
                <Stack spacing={0.5}>
                  {filteredCard.cardAccesses.map((a) => (
                    <Typography key={a.id} variant="body2">
                      • {a.name} ({a.accessScope})
                    </Typography>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No access data
                </Typography>
              )}
            </CardContent>
          ),
        },
      ].map(({ key, content }) => (
        <Grid key={key} size={{ xs: 12, md: 4 }}>
          <Card
            sx={{
              height: '100%',
              borderRadius: 0, // ⬅ pointy
              boxShadow: 'none',
              borderBottom: '1px solid',
              borderColor: theme.palette.divider,
            }}
          >
            {content}
          </Card>
        </Grid>
      ))}
    </Grid>

    {/* 🔍 Filters */}
    <Card
      sx={{
        borderRadius: 0,
        boxShadow: 'none',
        borderBottom: '1px solid',
        borderColor: theme.palette.divider,
        p: 2,
      }}
    >
      <Grid container spacing={1} alignItems="center">
        <Grid size={{ xs: 12, md: 4 }}>
          <TextField
            fullWidth
            label="Search"
            variant="outlined"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search Alarm or Tracking"
            size="small"
          />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <TextField
            label="Start Date"
            type="date"
            size="small"
            fullWidth
            InputLabelProps={{ shrink: true }}
            value={dateRange.from}
            onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <TextField
            label="End Date"
            type="date"
            size="small"
            fullWidth
            InputLabelProps={{ shrink: true }}
            value={dateRange.to}
            onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 2 }}>
          <Button fullWidth variant="contained" sx={{ height: 36 }}>
            Apply Filter
          </Button>
        </Grid>
      </Grid>
    </Card>

    {/* 🔸 Activity Timeline */}
    <Card
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 0,
        boxShadow: 'none',
        // border: '1px solid',
        // borderColor: theme.palette.divider,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid',
          borderColor: theme.palette.divider,
          px: 2,
          py: 0.75,
        }}
      >
        <Typography variant="subtitle1" fontWeight={600}>
          Activity Timeline
        </Typography>
        <Tabs
          value={viewMode}
          onChange={(_, v) => setViewMode(v)}
          sx={{
            '& .MuiTab-root': {
              minHeight: 26,
              px: 1.5,
              fontWeight: 500,
              textTransform: 'none',
            },
            '& .Mui-selected': {
              fontWeight: 700,
              color: viewMode === 'alarm' ? 'error.main' : 'info.main',
            },
          }}
        >
          <Tab label="Alarm Log" value="alarm" />
          <Tab label="Tracking Log" value="tracking" />
        </Tabs>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 1 }}>
        <Grid container spacing={0.5}>
          {viewMode === 'alarm' && alarmData.length ? (
            alarmData.map((a) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={a.id}>
                <Card
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    borderRadius: 0,
                    borderLeft: `4px solid ${theme.palette.error.main}`,
                    backgroundColor: 'rgba(255,0,0,0.03)',
                    boxShadow: 'none',
                    height: '100%',
                  }}
                >
                  <Typography fontWeight={700} color="error.main">
                    🔔 Alarm
                  </Typography>
                  <Typography>{a.floorplanMaskedArea?.name ?? '-'}</Typography>
                  <Typography variant="body2">
                    Triggered: {new Date(a.timestamp).toLocaleString()}
                  </Typography>
                </Card>
              </Grid>
            ))
          ) : viewMode === 'tracking' && trackingFiltered.length ? (
            trackingFiltered.map((t) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={t.id}>
                <Card
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    borderRadius: 0,
                    borderLeft: `4px solid ${theme.palette.info.main}`,
                    backgroundColor: 'rgba(0,128,255,0.03)',
                    boxShadow: 'none',
                    height: '100%',
                  }}
                >
                  <Typography fontWeight={700} color="info.main">
                    📍 Tracking
                  </Typography>
                  <Typography>{t.floorplanMaskedArea?.name ?? '-'}</Typography>
                  <Typography variant="body2">
                    Enter: {new Date(t.enterTime).toLocaleString()}
                  </Typography>
                  <Typography variant="body2">
                    Exit: {new Date(t.exitTime).toLocaleString()}
                  </Typography>
                </Card>
              </Grid>
            ))
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
              No {viewMode === 'alarm' ? 'alarm' : 'tracking'} records found
            </Typography>
          )}
        </Grid>
      </Box>

      {/* Pagination Footer */}
      <Box
        sx={{
          borderTop: '1px solid',
          borderColor: theme.palette.divider,
          px: 1,
          py: 0.25, // compact footer height
          backgroundColor: theme.palette.background.paper,
        }}
      >
        <TablePagination
          component="div"
          count={
            viewMode === 'alarm'
              ? alarmFilteredCount ?? 0
              : trackingTransFilteredCount ?? 0
          }
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 25, 50]}
          sx={{
            '.MuiTablePagination-toolbar': {
              minHeight: '30px',
              height: '30px',
            },
            '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
              fontSize: '0.8rem',
            },
            '.MuiTablePagination-select': {
              fontSize: '0.8rem',
            },
          }}
        />
      </Box>
    </Card>

    {loading && (
      <Backdrop open={loading} sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <CircularProgress color="inherit" />
      </Backdrop>
    )}
  </Box>
);

};

export default VisitorContent;
