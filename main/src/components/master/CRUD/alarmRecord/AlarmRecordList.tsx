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
  Skeleton,
} from '@mui/material';
import BlankCard from 'src/components/shared/BlankCard';
import { useTranslation } from 'react-i18next';
import { RootState, AppDispatch, useSelector, useDispatch } from 'src/store/Store';
import { AlarmType, fetchAlarmDT, UpdateFilter } from 'src/store/apps/crud/alarmRecordTracking';
import { defaultAlarmRecordFilter } from 'src/store/apps/defaultForm';

const columns = [
  { label: 'Time', field: 'Timestamp', sortAble: true },
  { label: 'Visitor Name', field: 'Visitor.Name', sortAble: true },
  { label: 'Reader', field: 'Reader', sortAble: true },
  { label: 'Alarm Status', field: 'AlarmStatus', sortAble: true },
  { label: 'Action Status', field: 'ActionStatus', sortAble: true },
  { label: 'Area Name', field: 'Area.Name', sortAble: true },
];

const SKELETON_ROWS = 5;

const AlarmRecordList = () => {
  const dispatch: AppDispatch = useDispatch();
  const alarmRecordData: AlarmType[] = useSelector(
    (state: RootState) => state.alarmReducer.alarmRecordTrackings,
  );
  const alarmRecordTotalCount: number = useSelector(
    (state: RootState) => state.alarmReducer.alarmRecordTotalCount,
  );
  const AlarmRecordFilteredCount: number = useSelector(
    (state: RootState) => state.alarmReducer.alarmRecordFilteredCount,
  );
  const AlarmRecordFilter = useSelector((state: RootState) => state.alarmReducer.alarmRecordFilter);
  const { t } = useTranslation();
  const hasLoaded = useSelector((state: RootState) => state.alarmReducer.hasLoaded);
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
    dispatch(UpdateFilter(defaultAlarmRecordFilter));
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchAlarmDT(AlarmRecordFilter));
    console.log(alarmRecordData)
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
            {/* sticky index */}
            <TableCell
              sx={{
                position: 'sticky',
                left: 0,
                background: 'white',
                zIndex: 1,
                width: 35,
                minWidth: 35,
                maxWidth: 35,
              }}
            >
              <Skeleton variant="text" width={18} />
            </TableCell>
            <TableCell>
              <Skeleton variant="text" width={180} height={22} />
            </TableCell>
            <TableCell>
              <Skeleton variant="text" width={160} height={22} />
            </TableCell>
            <TableCell>
              <Skeleton variant="text" width={120} height={22} />
            </TableCell>
            <TableCell>
              <Skeleton variant="text" width={160} height={22} />
            </TableCell>
            <TableCell>
              <Skeleton variant="text" width={160} height={22} />
            </TableCell>
            <TableCell>
              <Skeleton variant="text" width={120} height={22} />
            </TableCell>
          </TableRow>
        ))}
      </>
    );

  return (
    <Grid container spacing={3}>
      <Grid size={12}>
        <Box sx={{ overflow: 'auto', maxWidth: '100%' }}>
          <BlankCard>
            <TableContainer>
              <Table aria-label="simple table" sx={{ whiteSpace: 'nowrap' }}>
                <TableHead>
                  <TableRow>
                    {/* Left Sticky Empty Column */}
                    <TableCell
                      sx={{
                        position: 'sticky',
                        left: 0,
                        background: 'white',
                        zIndex: 2,
                        width: 35, // Fixed width
                        minWidth: 35,
                        maxWidth: 35,
                      }}
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
                    renderSkeletonRows(rowsPerPage || SKELETON_ROWS)
                  ) : (
                    alarmRecordData.map((alarmRecordData, index) => (
                    <TableRow key={index}>
                      <TableCell
                        sx={{
                          position: 'sticky',
                          left: 0,
                          background: 'white',
                          zIndex: 1,
                          width: 35, // Fixed width
                          minWidth: 35,
                          maxWidth: 35,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {index + 1 + page * rowsPerPage}
                      </TableCell>
                      <TableCell>{formatTime(alarmRecordData.timestamp)}</TableCell>
                      <TableCell>{alarmRecordData.visitor?.name}</TableCell>
                      <TableCell>{alarmRecordData.reader?.name}</TableCell>
                      <TableCell>{alarmRecordData.alarmRecordStatus}</TableCell>
                      <TableCell>{alarmRecordData.actionStatus}</TableCell>
                      <TableCell>{alarmRecordData.floorplanMaskedArea?.name}</TableCell>
                    </TableRow>
                  ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </BlankCard>
        </Box>
        {/* Pagination */}
        <TablePagination
          component="div"
          count={alarmRecordTotalCount}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={handleChangePage}
          rowsPerPageOptions={[5, 10, 25]}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Grid>
    </Grid>
  );
};

export default AlarmRecordList;
