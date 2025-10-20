import React, { useEffect, useState } from 'react';
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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Tooltip,
} from '@mui/material';
import BlankCard from 'src/components/shared/BlankCard';
import { useTranslation } from 'react-i18next';
import { RootState, AppDispatch, useSelector, useDispatch } from 'src/store/Store';
import {
  AlarmTriggerType,
  fetchAlarmTriggerDT,
  UpdateFilter,
} from 'src/store/apps/crud/alarmTrigger';
import { defaultAlarmTriggerFilter } from 'src/store/apps/defaultForm';
import { IconEye } from '@tabler/icons-react';
import AlarmPositionPreviewDialog from './AlarmPositionPreviewDialog';

const columns = [
  { label: 'Time', field: 'TriggerTime', sortAble: true },
  { label: 'Visitor', field: 'Visitor.Name', sortAble: true },
  { label: 'Floorplan', field: 'Floorplan.Name', sortAble: true },
  { label: 'Position', field: '', sortAble: false },
  { label: 'Alarm Status', field: 'AlarmTriggerStatus', sortAble: true },
  { label: 'Restricted', field: 'IsRestricted', sortAble: true },
  { label: 'Action Status', field: 'ActionStatus', sortAble: true },
  { label: 'Active', field: 'IsActive', sortAble: true },
];

const SKELETON_ROWS = 5;

const AlarmTriggerList = () => {
  const dispatch: AppDispatch = useDispatch();
  const alarmTriggerData = useSelector(
    (state: RootState) => state.alarmTriggerReducer.alarmTriggers,
  );
  const alarmTriggerTotalCount = useSelector(
    (state: RootState) => state.alarmTriggerReducer.alarmTriggerTotalCount,
  );
  const AlarmTriggerFilter = useSelector(
    (state: RootState) => state.alarmTriggerReducer.alarmTriggerFilter,
  );
  const { t } = useTranslation();
  const hasLoaded = useSelector((state: RootState) => state.alarmTriggerReducer.hasLoaded);

  // Pagination
  const page = Math.floor(AlarmTriggerFilter.Start / AlarmTriggerFilter.Length);
  const rowsPerPage = AlarmTriggerFilter.Length;
  const orderBy = AlarmTriggerFilter.SortColumn;
  const order = AlarmTriggerFilter.SortDir;

  const handleChangePage = (_: unknown, newPage: number) => {
    dispatch(UpdateFilter({ Start: newPage * AlarmTriggerFilter.Length }));
  };
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newLength = parseInt(event.target.value, 10);
    dispatch(UpdateFilter({ Length: newLength, Start: 0 }));
  };


  useEffect(() => {
    dispatch(UpdateFilter(defaultAlarmTriggerFilter));
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchAlarmTriggerDT(AlarmTriggerFilter));
  }, [AlarmTriggerFilter, dispatch]);

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    const weekday = t(date.toLocaleString('en-GB', { weekday: 'long' }));
    const month = t(date.toLocaleString('en-GB', { month: 'short' }));
    return `${weekday}, ${date.getDate()} ${month} ${date.getFullYear()} - ${date.toLocaleTimeString(
      'en-GB',
      { hour: '2-digit', minute: '2-digit', hour12: false },
    )}`;
  };

  const handleSort = (column: string) => {
    const isAsc = AlarmTriggerFilter.SortColumn === column && AlarmTriggerFilter.SortDir === 'asc';
    const isDesc =
      AlarmTriggerFilter.SortColumn === column && AlarmTriggerFilter.SortDir === 'desc';
    dispatch(
      UpdateFilter({
        SortColumn: isDesc ? 'TriggerTime' : column,
        SortDir: isAsc ? 'desc' : 'asc',
        Start: 0,
      }),
    );
  };

  const yesNo = (v?: boolean) => (v ? 'Yes' : 'No');

  // Position Preview
  const [openPositionDialog, setOpenPositionDialog] = useState(false);
  const [selectedAlarmTrigger, setSelectedAlarmTrigger] = useState<AlarmTriggerType | null>(null);

  const handleOpenPositionDialog = (alarmTrigger: AlarmTriggerType) => {
    setSelectedAlarmTrigger(alarmTrigger);
    setOpenPositionDialog(true);
  };

  const handleClosePositionDialog = () => {
    setOpenPositionDialog(false);
    setSelectedAlarmTrigger(null);
  };

  const renderSkeletonRows = (rows: number) => (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={`skeleton-${i}`}>
          {columns.map((_, index) => (
            <TableCell key={index}>
              <Skeleton variant="text" width={160} height={22} />
            </TableCell>
          ))}
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
              <Table aria-label="Alarm Trigger Table" sx={{ whiteSpace: 'nowrap' }}>
                <TableHead>
                  <TableRow>
                    <TableCell
                      sx={{
                        position: 'sticky',
                        left: 0,
                        background: 'white',
                        zIndex: 2,
                        width: 35,
                      }}
                    />
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
                  {!hasLoaded
                    ? renderSkeletonRows(rowsPerPage || SKELETON_ROWS)
                    : alarmTriggerData.map((row, index) => (
                        <TableRow key={index}>
                          <TableCell
                            sx={{
                              position: 'sticky',
                              left: 0,
                              background: 'white',
                              zIndex: 1,
                              width: 35,
                              textAlign: 'center',
                            }}
                          >
                            {index + 1 + page * rowsPerPage}
                          </TableCell>

                          <TableCell>{formatTime(row.triggerTime)}</TableCell>
                          <TableCell>{row.beaconId}</TableCell>
                          <TableCell>{row.floorplan?.name ?? 'Unknown Area'}</TableCell>

                          {/* 👁️ Position Preview Button */}
                          <TableCell>
                            <IconButton
                              color="primary"
                              size="small"
                              onClick={() => handleOpenPositionDialog(row)}
                            >
                              <IconEye size={20} />
                            </IconButton>
                          </TableCell>

                          <TableCell>{row.alarmRecordStatus}</TableCell>
                          <TableCell>{yesNo(row.isInRestrictedArea)}</TableCell>
                          <TableCell>{row.actionStatus}</TableCell>
                          <TableCell>{yesNo(row.isActive)}</TableCell>
                        </TableRow>
                      ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Pagination */}
            <TablePagination
              component="div"
              count={alarmTriggerTotalCount}
              page={page}
              rowsPerPage={rowsPerPage}
              onPageChange={handleChangePage}
              rowsPerPageOptions={[5, 10, 25]}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />

            {/* 🔍 Position Preview Dialog */}
            {openPositionDialog && selectedAlarmTrigger && (
              <AlarmPositionPreviewDialog
                row={selectedAlarmTrigger}
                onClose={handleClosePositionDialog}
              />
            )}
          </BlankCard>
        </Box>
      </Grid>
    </Grid>
  );
};

export default AlarmTriggerList;
