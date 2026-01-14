import { BASE_URL } from 'src/utils/axios';
import { useEffect, useState, useRef, useCallback } from 'react';
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
import AutocompleteFilter from 'src/layouts/full/horizontal/navbar/AutocompleteFilter';
import { BuildingType, fetchBuildings } from 'src/store/apps/crud/building';
import { fetchFloors, floorType } from 'src/store/apps/crud/floor';
import { fetchFloorplan, FloorplanType } from 'src/store/apps/crud/floorplan';
import { fetchMaskedAreas, MaskedAreaType } from 'src/store/apps/crud/maskedArea';

const VisitorContent = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const dispatch = useDispatch();
  const didInit = useRef(false);
  const language = useSelector((state: RootState) => state.customizer.isLanguage);

  const [viewMode, setViewMode] = useState<'alarm' | 'tracking'>('tracking');
  const [loading, setLoading] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  // Date range defaults
  const today = new Date();
  const formatDate = (d: Date) => d.toISOString().split('T')[0];
  const [dateRange, setDateRange] = useState({
    from: formatDate(new Date(today.getFullYear(), today.getMonth(), today.getDate())),
    to: formatDate(new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)),
  });

  // MaskedArea Filter
  const [areaFilter, setAreaFilter] = useState({
    BuildingId: [] as string[],
    FloorId: [] as string[],
    FloorplanId: [] as string[],
    MaskedAreaId: [] as string[],
  });
  const stableInitial = useRef(areaFilter);

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
  const buildings = useSelector(
    (state: RootState) => state.buildingReducer.buildingAll,
  ) as BuildingType[];
  const floors = useSelector((state: RootState) => state.floorReducer.floorAll) as floorType[];
  const floorplans = useSelector(
    (state: RootState) => state.floorplanReducer.floorplanAll,
  ) as FloorplanType[];
  const maskedAreas = useSelector(
    (state: RootState) => state.maskedAreaReducer.maskedAreaAll,
  ) as MaskedAreaType[];

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const handleChangePage = (_: unknown, newPage: number) => setPage(newPage);
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Helper: ensure array type
  const toArray = <T,>(v: T | T[] | undefined): T[] => (Array.isArray(v) ? v : v ? [v] : []);

  // Build filter payload dynamically
  const buildPayload = () => {
    if (!visitorDetail) return null;

    const base = {
      Start: page * rowsPerPage,
      Length: rowsPerPage,
      SearchValue: searchValue,
    };

    if (viewMode === 'alarm') {
      return {
        ...defaultAlarmRecordFilter,
        ...base,
        dateFilters: {
          TimeStamp: {
            DateFrom: dateRange.from,
            DateTo: dateRange.to,
          },
        },
        filters: {
          VisitorId: toArray(visitorDetail.id),
          FloorplanMaskedAreaId: areaFilter.MaskedAreaId,
        },
      };
    } else {
      return {
        ...defaultTrackingTransFilter,
        ...base,
        dateFilters: {
          TransTime: {
            DateFrom: dateRange.from,
            DateTo: dateRange.to,
          },
        },
        filters: {
          VisitorId: toArray(visitorDetail.id),
          FloorplanMaskedAreaId: areaFilter.MaskedAreaId,
        },
      };
    }
  };

  // Stable ref to prevent duplicate fetch
  const lastPayloadRef = useRef<string>('');

  // Safe unified fetch
  const handleFetchFilteredData = async () => {
    if (!visitorDetail) return;

    const payload = buildPayload();
    if (!payload) return;

    const key = JSON.stringify(payload);
    if (lastPayloadRef.current === key) return; // already fetched same thing
    lastPayloadRef.current = key;

    // setLoading(true);
    // try {
    //   if (viewMode === 'alarm') {
    //     await dispatch(fetchAlarmDT(payload as any));
    //   } else {
    //     await dispatch(fetchTrackingTransDT(payload as any));
    //   }
    // } finally {
    //   setLoading(false);
    // }
  };

  // 🔹 Run once when visitor changes (initial load)
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    if (!buildings.length) dispatch(fetchBuildings());
    if (!floors.length) dispatch(fetchFloors());
    if (!floorplans.length) dispatch(fetchFloorplan());

  }, []);

  useEffect(() => {
    if (!visitorDetail) return;
    dispatch(fetchCard());
    // No auto-fetch here to prevent recursive loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visitorDetail]);

  // ✅ Fetch manually when user presses Apply Filter
  const handleApplyFilter = () => {
    lastPayloadRef.current = ''; // force a new fetch even if payload same
    setPage(0);
    handleFetchFilteredData();
  };

  // ✅ Fetch manually when user paginates or switches view
  useEffect(() => {
    if (!visitorDetail) return;
    handleFetchFilteredData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage, viewMode, visitorDetail]);

  const handleAreaFilterChange = (f: typeof areaFilter) => {
    if (JSON.stringify(f) !== JSON.stringify(areaFilter)) {
      setAreaFilter(f);
    }
  };

  //Time Format
  const formatVisitorPeriod = (
    startString?: string | null,
    endString?: string | null,
    language?: string,
  ) => {
    if (!startString || !endString) return '-';

    const getLanguageLabel = () => {
      switch (language) {
        case 'en':
          return 'en-US';
        case 'id':
          return 'id-ID';
        default:
          return 'en-US';
      }
    };

    const locale = getLanguageLabel();
    const startDate = new Date(startString);
    const endDate = new Date(endString);

    const formatter = new Intl.DateTimeFormat(locale, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const startFormatted = formatter.format(startDate).replace(/\./g, ':');
    const endFormatted = formatter.format(endDate).replace(/\./g, ':');

    const untilWord = locale === 'id-ID' ? 'hingga' : 'until';

    return `${startFormatted} ${untilWord} ${endFormatted}`;
  };

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
                  sx={{ width: 90, height: 90 }}
                />
                <Stack spacing={0.5} flex={1}>
                  <Typography variant="h6" fontWeight={700}>
                    {visitorDetail?.name ?? '-'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {trxVisitorDetail?.agenda ?? '-'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {formatVisitorPeriod(
                      trxVisitorDetail?.visitorPeriodStart,
                      trxVisitorDetail?.visitorPeriodEnd,
                      language,
                    )}
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
                <Typography variant="body2">
                  Card Number: {filteredCard?.cardNumber ?? '-'}
                </Typography>
                <Typography variant="body2">
                  BLE Number: {visitorDetail?.bleCardNumber ?? '-'}
                </Typography>
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
                borderRadius: 0,
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
          <Grid size={{ xs: 12, md: 4 }}>
            <AutocompleteFilter
              buildings={buildings}
              floors={floors}
              floorplans={floorplans}
              maskedAreas={maskedAreas}
              initial={stableInitial.current}
              onChangeFilter={handleAreaFilterChange}
              hideSelectedAreas
            />
          </Grid>
          <Grid size={{ xs: 12, md: 2 }}>
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
          <Grid size={{ xs: 12, md: 2 }}>
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
            <Button fullWidth variant="contained" sx={{ height: 36 }} onClick={handleApplyFilter}>
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
        }}
      >
        <Box
          sx={{
            display: 'flex',
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
              '& .MuiTab-root': { minHeight: 26, px: 1.5, textTransform: 'none' },
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

        <Box sx={{ flex: 1, overflowY: 'auto', p: 1 }}>
          <Grid container spacing={0.5}>
            {viewMode === 'alarm' && alarmData.length ? (
              alarmData.map((a) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={a.id}>
                  <Card
                    variant="outlined"
                    sx={{
                      p: 1.5,
                      borderLeft: `4px solid ${theme.palette.error.main}`,
                      backgroundColor: 'rgba(255,0,0,0.03)',
                      borderRadius: 0,
                      boxShadow: 'none',
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
            ) : viewMode === 'tracking' && trackingTransData.length ? (
              trackingTransData.map((t: trackingTransType) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={t.id}>
                  <Card
                    variant="outlined"
                    sx={{
                      p: 1.5,
                      borderLeft: `4px solid ${theme.palette.info.main}`,
                      backgroundColor: 'rgba(0,128,255,0.03)',
                      borderRadius: 0,
                      boxShadow: 'none',
                    }}
                  >
                    <Typography fontWeight={700} color="info.main">
                      📍 Tracking
                    </Typography>
                    <Typography>{t.floorplanMaskedArea?.name ?? '-'}</Typography>
                    <Typography variant="body2">
                      Time: {new Date(t.transTime).toLocaleString()}
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

        {/* Pagination */}
        <Box sx={{ borderTop: '1px solid', borderColor: theme.palette.divider, px: 1, py: 0.25 }}>
          <TablePagination
            component="div"
            count={viewMode === 'alarm' ? alarmFilteredCount ?? 0 : trackingTransFilteredCount ?? 0}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[5, 10, 25, 50]}
            sx={{
              '.MuiTablePagination-toolbar': { minHeight: '30px', height: '30px' },
              '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
                fontSize: '0.8rem',
              },
              '.MuiTablePagination-select': { fontSize: '0.8rem' },
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
