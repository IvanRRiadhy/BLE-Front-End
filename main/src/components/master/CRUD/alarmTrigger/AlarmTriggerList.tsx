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
  Select,
  MenuItem,
  Tooltip,
} from '@mui/material';
import BlankCard from 'src/components/shared/BlankCard';
import { useTranslation } from 'react-i18next';
import { RootState, AppDispatch, useSelector, useDispatch } from 'src/store/Store';
import {
  AlarmTriggerType,
  editAlarmTrigger,
  fetchAlarmTriggerDT,
  UpdateFilter,
} from 'src/store/apps/crud/alarmTrigger';
import { defaultAlarmTriggerFilter } from 'src/store/apps/defaultForm';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';
import { actionStatus } from 'src/types/crud/input';
import toast from 'react-hot-toast';

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
  const alarmTriggerData: AlarmTriggerType[] = useSelector(
    (state: RootState) => state.alarmTriggerReducer.alarmTriggers,
  );
  const alarmTriggerTotalCount: number = useSelector(
    (state: RootState) => state.alarmTriggerReducer.alarmTriggerTotalCount,
  );
  const AlarmTriggerFilteredCount: number = useSelector(
    (state: RootState) => state.alarmTriggerReducer.alarmTriggerFilteredCount,
  );
  const AlarmTriggerFilter = useSelector(
    (state: RootState) => state.alarmTriggerReducer.alarmTriggerFilter,
  );
  const { t } = useTranslation();
  const hasLoaded = useSelector((state: RootState) => state.alarmTriggerReducer.hasLoaded);
  // Pagination State
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

  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionTargetId, setActionTargetId] = useState<string | null>(null);
  const [actionCurrent, setActionCurrent] = useState<string>('');

  const [savingAction, setSavingAction] = useState(false);

  useEffect(() => {
    dispatch(UpdateFilter(defaultAlarmTriggerFilter));
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchAlarmTriggerDT(AlarmTriggerFilter));
    console.log(alarmTriggerData);
  }, [AlarmTriggerFilter, dispatch]);

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
    const isAsc = AlarmTriggerFilter.SortColumn === column && AlarmTriggerFilter.SortDir === 'asc';
    const isDesc =
      AlarmTriggerFilter.SortColumn === column && AlarmTriggerFilter.SortDir === 'desc';

    if (isDesc) {
      dispatch(
        UpdateFilter({
          SortColumn: 'TriggerTime',
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

  // allowed values = actionStatus values except '' and 'Idle'
  const ALLOWED_ACTION_VALUES = actionStatus.map((o) => o.value).filter((v) => v && v !== 'Idle');

  // type guard
  const isAllowedActionValue = (v: unknown): v is string =>
    typeof v === 'string' && ALLOWED_ACTION_VALUES.includes(v);

  // legacy-to-new map (if your data still stores old labels)
  const normalizeAction = (v?: string | null) => {
    if (!v) return '';
    const trimmed = v.trim();

    // map possible legacy labels to new `value`s
    const legacyMap: Record<string, string> = {
      Investigate: 'Investigated',
      'No Action': 'NoAction',
      'Done Investigated': 'DoneInvestigated',
      'Postpone Investigated': 'PostponeInvestigated',
    };

    const mapped = legacyMap[trimmed] ?? trimmed;
    return isAllowedActionValue(mapped) ? mapped : '';
  };

  const openActionDialog = (row: AlarmTriggerType) => {
    // normalize whatever the row has to one of the allowed values
    const current = normalizeAction((row as any).actionStatus);

    // if you truly don't have a stable ID, keep the fallback; otherwise prefer row.id
    const id =
      (row as any).id ?? (row as any).alarmTriggerId ?? `${row.beaconId}-${row.triggerTime}`;

    setActionTargetId(id);
    setActionCurrent(current); // '' will select your disabled "Please select Status"
    setActionDialogOpen(true);
  };

  const closeActionDialog = () => {
    setActionDialogOpen(false);
    setActionTargetId(null);
  };

  const saveActionStatus = async () => {
    if (!actionTargetId) return;
    try {
      setSavingAction(true);

      // === Example dispatch – replace with your actual action ===
      // await dispatch(updateAlarmTriggerActionStatus({ id: actionTargetId, actionStatus: actionCurrent })).unwrap();
      const result = await dispatch(
        editAlarmTrigger({ id: actionTargetId, actionStatus: actionCurrent }),
      );
      if (result && result.type && result.type.endsWith('/fulfilled')) {
        await dispatch(fetchAlarmTriggerDT(AlarmTriggerFilter));
        toast.success('Data Saved');
        closeActionDialog();
      } else {
        toast.error('Saving Data Unsuccessful');
      }
    } catch (error) {
      toast.error('Saving Data Unsuccessful');
      console.error('Error saving Action:', error);
    } finally {
      setSavingAction(false);
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

  // helpers (put above the component or inside it)
  const yesNo = (v?: boolean) => (v ? 'Yes' : 'No');

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
                    {/* Right Sticky Empty Column */}
                    <TableCell
                      sx={{
                        position: 'sticky',
                        right: 0,
                        background: 'white',
                        zIndex: 2,
                        width: 150, // Fixed width
                        minWidth: 150,
                        maxWidth: 150,
                      }}
                    >
                      <Typography variant="h6"> Actions </Typography>
                    </TableCell>
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
                              width: 35, // Fixed width
                              minWidth: 35,
                              maxWidth: 35,
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {index + 1 + page * rowsPerPage}
                          </TableCell>
                          <TableCell>{formatTime(row.triggerTime)}</TableCell>
                          <TableCell>{row.beaconId}</TableCell>
                          <TableCell>{row.floorplanId}</TableCell>
                          <TableCell>{`(${row.posX}, ${row.posY})`}</TableCell>
                          <TableCell>{row.alarmRecordStatus}</TableCell>
                          <TableCell>{yesNo(row.isInRestrictedArea)}</TableCell>
                          <TableCell>{row.actionStatus}</TableCell>
                          <TableCell>{yesNo(row.isActive)}</TableCell>
                          <TableCell
                            sx={{
                              position: 'sticky',
                              right: 0,
                              background: 'white',
                              zIndex: 2,
                              width: 150,
                              minWidth: 150,
                              maxWidth: 150,
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Tooltip title="Assign Action">
                              <IconButton
                                color="primary"
                                size="small"
                                onClick={() => openActionDialog(row)}
                              >
                                <MoreVertIcon />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
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
          </BlankCard>
        </Box>
      </Grid>
      <Dialog open={actionDialogOpen} onClose={closeActionDialog} maxWidth="xs" fullWidth>
        <DialogTitle>Assign Action</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <FormControl fullWidth size="small" sx={{ mt: 1 }}>
            <InputLabel id="action-status-label">Action Status</InputLabel>
            <CustomSelect
              labelId="action-status-label"
              label="Action Status"
              value={actionCurrent}
              onChange={(e: any) => setActionCurrent(e.target.value)}
            >
              {actionStatus
                .filter((opt) => opt.value !== 'Idle' && opt.value !== actionCurrent) // 👈 exclude Idle
                .map((opt) => (
                  <MenuItem key={opt.value} value={opt.value} disabled={opt.disabled ?? false}>
                    {opt.label}
                  </MenuItem>
                ))}
            </CustomSelect>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeActionDialog} disabled={savingAction}>
            Cancel
          </Button>
          <Button variant="contained" onClick={saveActionStatus} disabled={savingAction}>
            {savingAction ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
};

export default AlarmTriggerList;
