import React, { useEffect } from 'react';
import {
  Box,
  Grid2 as Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  TablePagination,
  TableSortLabel,
  Chip,
  Avatar,
  Skeleton,
} from '@mui/material';
import BlankCard from 'src/components/shared/BlankCard';
import { useTranslation } from 'react-i18next';
import { RootState, AppDispatch, useSelector, useDispatch } from 'src/store/Store';
import { AlarmType, fetchAlarmDT, UpdateFilter } from 'src/store/apps/crud/alarmRecordTracking';
import { alarmRecordStatusColormap } from 'src/types/crud/input';
import DashboardCard from 'src/components/shared/DashboardCard';
import { defaultAlarmRecordFilter } from 'src/store/apps/defaultForm';

const columns = [
  { label: 'Visitor Name', field: 'Visitor.Name', sortAble: true },
  { label: 'Alarm Status', field: 'AlarmRecordStatus', sortAble: true },
  { label: 'Area Name', field: 'FloorplanMaskedArea.Name', sortAble: true },
  { label: 'Time', field: 'Timestamp', sortAble: true },
];

const SKELETON_ROWS = 5;

const AlarmWarning = () => {
  const dispatch: AppDispatch = useDispatch();
  const alarmRecordData: AlarmType[] = useSelector(
    (state: RootState) => state.alarmReducer.alarmRecordTrackings,
  );
  // const alarmRecordTotalCount: number = useSelector(
  //   (state: RootState) => state.alarmReducer.alarmRecordTotalCount,
  // );
  const AlarmRecordFilteredCount: number = useSelector(
    (state: RootState) => state.alarmReducer.alarmRecordFilteredCount,
  );
  const AlarmRecordFilter = useSelector((state: RootState) => state.alarmReducer.alarmRecordFilter);
  const hasLoaded = useSelector((state: RootState) => state.alarmReducer.hasLoaded);
  const { t } = useTranslation();
  // Pagination State
  const page = Math.floor(AlarmRecordFilter.Start / AlarmRecordFilter.Length);
  const rowsPerPage = AlarmRecordFilter.Length;
  const orderBy = AlarmRecordFilter.SortColumn;
  const order = AlarmRecordFilter.SortDir;

  const handleChangePage = (_: unknown, newPage: number) => {
    dispatch(UpdateFilter({ Start: newPage * AlarmRecordFilter.Length }));
  };
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newLength = parseInt(event.target.value, 10);
    dispatch(UpdateFilter({ Length: newLength, Start: 0 }));
  };
  useEffect(() => {
    dispatch(UpdateFilter({ ...defaultAlarmRecordFilter }));
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchAlarmDT(AlarmRecordFilter));
  }, [AlarmRecordFilter, dispatch]);

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);

    // Extract the weekday
    const weekday = t(date.toLocaleString('en-GB', { weekday: 'long' }));
    const month = t(date.toLocaleString('en-GB', { month: 'short' }));

    return `${weekday}, ${date.getDate()} ${month} ${date.getFullYear()} - ${date.toLocaleTimeString(
      'en-GB',
      {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      },
    )}`;
  };
  console.log(alarmRecordData);
  const handleSort = (column: string) => {
    const isAsc = AlarmRecordFilter.SortColumn === column && AlarmRecordFilter.SortDir === 'asc';
    const isDesc = AlarmRecordFilter.SortColumn === column && AlarmRecordFilter.SortDir === 'desc';

    if (isDesc) {
      dispatch(
        UpdateFilter({
          SortColumn: 'Timestamp',
          SortDir: 'desc',
          Start: 0,
        }),
      );
    } else {
      dispatch(
        UpdateFilter({
          SortColumn: column,
          SortDir: isAsc ? 'desc' : 'asc',
          Start: 0,
        }),
      );
    }
  };

  const renderSkeletonRows = (rows: number) => (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={`skeleton-${i}`}>
          {/* sticky avatar cell */}
          <TableCell sx={{ position: 'sticky', left: 0, background: 'white', zIndex: 1 }}>
            <Skeleton variant="circular" width={40} height={40} />
          </TableCell>

          {/* Visitor Name */}
          <TableCell>
            <Box>
              <Skeleton variant="text" width={160} height={20} />
              <Skeleton variant="text" width={120} height={16} sx={{ mt: 0.5 }} />
            </Box>
          </TableCell>

          {/* Alarm Status */}
          <TableCell>
            <Skeleton variant="rounded" width={100} height={28} />
          </TableCell>

          {/* Area Name */}
          <TableCell>
            <Skeleton variant="text" width={140} height={20} />
          </TableCell>

          {/* Time */}
          <TableCell>
            <Skeleton variant="text" width={180} height={20} />
          </TableCell>
        </TableRow>
      ))}
    </>
  );

  return (
    <DashboardCard title={t('Alarm Warning')}>
      <Grid container spacing={3}>
        <Grid size={12}>
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 440,
              maxHeight: 440,
              overflow: 'auto',
              maxWidth: '100%',
            }}
          >
            <BlankCard>
              <TableContainer>
                <Table aria-label="simple table" sx={{ whiteSpace: 'nowrap' }}>
                  <TableHead>
                    <TableRow>
                      {/* Left Sticky Empty Column */}
                      <TableCell
                        sx={{ position: 'sticky', left: 0, background: 'white', zIndex: 2 }}
                      >
                        <Typography variant="h6"></Typography>
                      </TableCell>
                      {columns.map((col) => (
                        <TableCell key={col.label}>
                          {col.sortAble && col.field ? (
                            <TableSortLabel
                              active={orderBy === col.field}
                              direction={orderBy === col.field ? order : 'asc'}
                              onClick={() => handleSort(col.field)}
                            >
                              <Typography variant="h6">{col.label}</Typography>
                            </TableSortLabel>
                          ) : (
                            <Typography variant="h6">{col.label}</Typography>
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {!hasLoaded ? (
                      renderSkeletonRows(SKELETON_ROWS)
                    ) : (
                      <>
                        {alarmRecordData.map((alarm) => (
                          <TableRow key={alarm.id}>
                            <TableCell
                              sx={{ position: 'sticky', left: 0, background: 'white', zIndex: 1 }}
                            >
                              <Avatar
                                src={alarm.visitor?.faceImage}
                                alt={alarm.visitor?.faceImage}
                                sx={{ width: 40, height: 40 }}
                              />
                            </TableCell>
                            <TableCell>
                              <Box>
                                <Typography variant="subtitle2" fontWeight={600}>
                                  {alarm.visitor?.name || 'Unknown Visitor'}
                                </Typography>
                                <Typography
                                  color="textSecondary"
                                  fontSize="12px"
                                  variant="subtitle2"
                                >
                                  {alarm.visitor?.cardNumber || 'No Card Number'}
                                </Typography>
                              </Box>
                            </TableCell>

                            <TableCell>
                              <Chip
                                sx={{
                                  bgcolor:
                                    alarmRecordStatusColormap[alarm.alarmRecordStatus] ||
                                    'secondary.light',
                                  color: 'white',
                                  borderRadius: '8px',
                                }}
                                size="small"
                                label={t(`${alarm.alarmRecordStatus}`)}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography
                                color="textSecondary"
                                variant="subtitle2"
                                fontWeight={400}
                              >
                                {alarm.floorplanMaskedArea?.name || 'Unknown Area'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography
                                color="textSecondary"
                                variant="subtitle2"
                                fontWeight={400}
                              >
                                {alarm.timestamp ? formatTime(alarm.timestamp) : 'Unknown Time'}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                        {Array.from({
                          length:
                            rowsPerPage -
                            Math.min(rowsPerPage, alarmRecordData.length - page * rowsPerPage),
                        }).map((_, idx: number) => (
                          <TableRow key={`empty-row-${idx}`} style={{ height: 63 }}>
                            <TableCell colSpan={5} />
                          </TableRow>
                        ))}
                      </>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </BlankCard>
          </Box>
          {/* Pagination */}
          <TablePagination
            component="div"
            count={AlarmRecordFilteredCount}
            page={page}
            rowsPerPage={rowsPerPage}
            onPageChange={handleChangePage}
            rowsPerPageOptions={[5]}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Grid>
      </Grid>
    </DashboardCard>
  );
};

export default AlarmWarning;
