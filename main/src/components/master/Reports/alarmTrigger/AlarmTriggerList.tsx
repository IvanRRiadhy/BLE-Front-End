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
  Divider,
  Chip,
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
import { IconEye, IconSettings } from '@tabler/icons-react';
import AlarmPositionPreviewDialog from './AlarmPositionPreviewDialog';
import { actionStatus, actionStatusColormap } from 'src/types/crud/input';
import toast from 'react-hot-toast';
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';

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
  const [loading, setLoading] = useState(false);

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

  // Alarm Action
  const [openActionDialog, setOpenActionDialog] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string>('');

  const handleOpenActionDialog = () => {
    setSelectedAction('');
    setOpenActionDialog(true);
  };

  const handleCloseActionDialog = () => {
    setOpenActionDialog(false);
    setSelectedAction('');
  };

  const handleApplyAction = async () => {
    setLoading(true);
    if (!selectedAlarmTrigger) {
      setLoading(false);
      handleCloseActionDialog();
      toast.error('Please select an alarm');
      return;
    }
    if (!selectedAction) {
      setLoading(false);
      handleCloseActionDialog();
      toast.error('Please select an action status');
      return;
    }

    try {
      const result = await dispatch(
        editAlarmTrigger({
          dmac: selectedAlarmTrigger.beaconId.toUpperCase(),
          actionStatus: selectedAction.toLowerCase(),
        }),
      );
      if (result && (result as any).type?.endsWith('/fulfilled')) {
        toast.success('Action dispatched successfully');
        dispatch(fetchAlarmTriggerDT(AlarmTriggerFilter));
      } else {
        toast.error('Error dispatching action');
        console.error('Error dispatching action:', result);
      }
    } catch (error: any) {
      toast.error('Error dispatching action');
      console.error('Error dispatching action', error);
    } finally {
      setLoading(false);
      handleCloseActionDialog();
    }
  };

  const formatActionLabel = (value: string) => {
    if (!value) return '-';
    return value.replace(/([a-z])([A-Z])/g, '$1 $2'); // Adds space before capital letters
  };

  const renderSkeletonRows = (rows: number) => (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={`skeleton-${i}`}>
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

                          <TableCell>
                            {/* {formatActionLabel(row.alarmRecordStatus)} */}
                            <Chip
                              sx={{
                                bgcolor: row.alarmColor || 'secondary.dark',
                                color: 'white',
                                borderRadius: '8px',
                                minWidth: '50px',
                              }}
                              size="small"
                              label={formatActionLabel(row.alarmRecordStatus)}
                            />
                          </TableCell>
                          <TableCell>
                            {/* {yesNo(row.isInRestrictedArea)} */}
                            <Chip
                              sx={{
                                bgcolor: row.isInRestrictedArea ? 'error.dark' : 'primary.main',
                                color: 'white',
                                borderRadius: '8px',
                                minWidth: '50px',
                              }}
                              size="small"
                              label={yesNo(row.isInRestrictedArea)}
                            />
                          </TableCell>
                          <TableCell>
                            {row.actionStatus ? (
                              <Box
                                component="span"
                                sx={{
                                  display: 'inline-block',
                                  px: 1.5,
                                  py: 0.25,
                                  borderRadius: '16px',
                                  fontSize: '0.8rem',
                                  fontWeight: 600,
                                  color: 'white',
                                  textTransform: 'capitalize',
                                  backgroundColor: actionStatusColormap[row.actionStatus] || 'grey',
                                }}
                              >
                                {formatActionLabel(row.actionStatus)}
                              </Box>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell>
                            {/* {yesNo(row.isActive)} */}
                            <Chip
                              sx={{
                                bgcolor: row.isActive ? 'error.dark' : 'success.main',
                                color: 'white',
                                borderRadius: '8px',
                                minWidth: '50px',
                              }}
                              size="small"
                              label={yesNo(row.isActive)}
                            />
                          </TableCell>
                          <TableCell
                            sx={{
                              position: 'sticky',
                              right: 0,
                              background: 'white',
                              zIndex: 2,
                              gap: 1,
                              alignItems: 'center',
                              width: 150, // Fixed width
                              minWidth: 150,
                              maxWidth: 150,
                            }}
                          >
                            <Tooltip title="Apply Action">
                              <IconButton
                                color="primary"
                                onClick={() => {
                                  setSelectedAlarmTrigger(row);
                                  handleOpenActionDialog();
                                }}
                              >
                                <IconSettings size={20} />
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

            {/* 🔍 Position Preview Dialog */}
            {openPositionDialog && selectedAlarmTrigger && (
              <AlarmPositionPreviewDialog
                row={selectedAlarmTrigger}
                onClose={handleClosePositionDialog}
              />
            )}
          </BlankCard>
          {/* ⚙️ Apply Action Dialog */}
          <Dialog open={openActionDialog} onClose={handleCloseActionDialog} fullWidth maxWidth="sm">
            <DialogTitle>Apply Action to Alarm</DialogTitle>
            <DialogContent sx={{ mt: 1 }}>
              {/* Alarm Info */}
              <Typography variant="body2" color="text.secondary" mb={1}>
                Alarm DMAC:
              </Typography>
              <Typography variant="body1" fontWeight={600} mb={2}>
                {selectedAlarmTrigger?.beaconId?.toUpperCase() || '-'}
              </Typography>

              {/* If alarm is inactive */}
              {!selectedAlarmTrigger?.isActive ? (
                <Box
                  sx={{
                    border: '1px dashed',
                    borderColor: 'error.main',
                    borderRadius: 2,
                    p: 2,
                    backgroundColor: 'rgba(255, 0, 0, 0.05)',
                  }}
                >
                  <Typography variant="h6" color="error" fontWeight={600}>
                    Alarm is no longer active
                  </Typography>
                  <Typography variant="body2" color="text.secondary" mt={0.5}>
                    You cannot apply any new actions to an inactive alarm.
                  </Typography>
                </Box>
              ) : (
                <>
                  {/* If alarm is active, show chip-style status selector */}
                  <Typography variant="subtitle2" color="text.secondary" mb={1}>
                    Select Action Status
                  </Typography>

                  <Box display="flex" flexWrap="wrap" gap={1}>
                    {actionStatus
                      .filter((item) => !item.disabled)
                      .map((item) => {
                        const isActiveStatus =
                          selectedAlarmTrigger?.actionStatus?.toLowerCase() ===
                          item.value.toLowerCase();

                        const isSelected =
                          selectedAction?.toLowerCase() === item.value.toLowerCase();

                        return (
                          <Button
                            key={item.value}
                            variant="outlined"
                            disabled={isActiveStatus}
                            onClick={() => setSelectedAction(item.value)}
                            sx={{
                              borderRadius: '20px',
                              textTransform: 'none',
                              px: 2,
                              py: 0.75,
                              border: '1px solid',
                              borderColor: isSelected ? 'primary.main' : 'rgba(0,0,0,0.23)',
                              backgroundColor: isSelected ? 'primary.main' : 'transparent',
                              color: isSelected
                                ? 'white'
                                : isActiveStatus
                                ? 'text.disabled'
                                : 'text.primary',
                              '&:hover': {
                                backgroundColor: isSelected ? 'primary.dark' : 'rgba(0,0,0,0.05)',
                              },
                              transition: 'all 0.15s ease-in-out',
                            }}
                          >
                            {item.label}
                          </Button>
                        );
                      })}
                  </Box>
                </>
              )}
            </DialogContent>

            <DialogActions>
              <Button onClick={handleCloseActionDialog} color="error" variant="outlined">
                Close
              </Button>

              {/* Only show confirm if alarm is active */}
              {selectedAlarmTrigger?.isActive && (
                <Button
                  onClick={handleApplyAction}
                  color="primary"
                  variant="contained"
                  disabled={!selectedAction || !selectedAlarmTrigger}
                >
                  Confirm
                </Button>
              )}
            </DialogActions>
          </Dialog>
        </Box>
      </Grid>
    </Grid>
  );
};

export default AlarmTriggerList;
