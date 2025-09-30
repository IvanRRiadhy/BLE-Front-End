import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Grid2 as Grid,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  TablePagination,
  Button,
  TableSortLabel,
  Skeleton,
  Switch,
  Tooltip,
} from '@mui/material';
import BlankCard from 'src/components/shared/BlankCard';
import {
  IconBrandTelegram,
  IconChevronDown,
  IconChevronUp,
  IconEdit,
  IconExternalLink,
  IconSend,
  IconTrash,
} from '@tabler/icons-react';
import { RootState, AppDispatch, useSelector, useDispatch } from 'src/store/Store';
import toast from 'react-hot-toast';
import {
  AlarmSettingType,
  fetchAlarmSettingsDT,
  GetAlarmSetting,
  UpdateFilter,
  ChangeActiveStatus,
  ChangePriorityStatus,
  editAlarmSetting,
} from 'src/store/apps/alarmsetting/alarmSettings';
import { useLocation, useNavigate } from 'react-router';

const columns = [
  { label: 'Alarm Type', field: 'Name', sortAble: true },
  { label: 'Status', field: 'IsEnabled', sortAble: true },
  { label: 'Level Priority', field: 'AlarmLevelPriority', sortAble: true },
];

const SKELETON_ROWS = 5;

const AlarmSettingList = () => {
  const dispatch: AppDispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const alarmSettings = useSelector((state: RootState) => state.AlarmSettingReducer.alarmSettings);
  const alarmSettingFilter = useSelector(
    (state: RootState) => state.AlarmSettingReducer.alarmSettingFilter,
  );
  const isLoading = useSelector((state: RootState) => state.AlarmSettingReducer.isLoading);
  const hasLoaded = useSelector((state: RootState) => state.AlarmSettingReducer.hasLoaded);
  const alarmSettingTotalCount = useSelector(
    (state: RootState) => state.AlarmSettingReducer.alarmSettingTotalCount,
  );

  // Pagination State
const page = Math.floor(alarmSettingFilter.Start / alarmSettingFilter.Length);
  const rowsPerPage = alarmSettingFilter.Length;
  const orderBy = alarmSettingFilter.SortColumn;
  const order = alarmSettingFilter.SortDir;
  const handleChangePage = (_: unknown, newPage: number) => {
    dispatch(UpdateFilter({ Start: newPage * alarmSettingFilter.Length }));
  };
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newLength = parseInt(event.target.value, 10);
    dispatch(UpdateFilter({ Length: newLength, Start: 0 }));
  };
  const handleSort = (column: string) => {
    const isAsc = alarmSettingFilter.SortColumn === column && alarmSettingFilter.SortDir === 'asc';
    const isDesc =
      alarmSettingFilter.SortColumn === column && alarmSettingFilter.SortDir === 'desc';

    if (isDesc) {
      dispatch(
        UpdateFilter({
          SortColumn: 'UpdatedAt',
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

  useEffect(() => {
    dispatch(fetchAlarmSettingsDT(alarmSettingFilter));
  }, [dispatch, alarmSettingFilter]);

  const getRoute = (name: string): string => {
    const basePath = `${window.location.origin}${location.pathname}`;
    switch (name.toLowerCase()) {
      case 'geofence':
        return `/alarmsetting/geofencing`;
      case 'overPopulating':
        return `/alarmsetting/peoplecounting`;
      case 'firealarm':
        return `/alarmsetting/firealarm`;
      case 'cctv':
        return `/alarmsetting/cctv`;
      case 'wrongzone':
        return `/alarmsetting/wrongzone`;
      default:
        console.log(name);
        toast.error('No route defined for this alarm type');
        return '/alarmsetting';
    }
  };

  const handleToggleStatus = async (alarm: AlarmSettingType) => {
    const updatedAlarm = { ...alarm, isEnabled: !alarm.isEnabled };
    console.log('Toggle Status Clicked:', alarm, 'New Status:', updatedAlarm.isEnabled);
    try {
      const res = await dispatch(editAlarmSetting(updatedAlarm));
      if (res.type.endsWith('/fulfilled')) {
        await dispatch(fetchAlarmSettingsDT(alarmSettingFilter));
        toast.success('Alarm status updated successfully');
      }
    } catch (error) {
      toast.error('Error updating alarm status');
      console.error('Error updating alarm status:', error);
    }
  };

  const handlePriorityUp = async (alarm: AlarmSettingType) => {
    if (alarm.alarmLevelPriority === 'High') {
      toast.error('Alarm is already at highest priority');
      return;
    }
    const newPriority: 'Low' | 'Medium' | 'High' =
      alarm.alarmLevelPriority === 'Medium' ? 'High' : 'Medium';
    const updatedAlarm = { ...alarm, alarmLevelPriority: newPriority };
    console.log('Priority Up Clicked:', alarm, 'New Priority:', newPriority);
    try {
      const res = await dispatch(editAlarmSetting(updatedAlarm));
      if (res.type.endsWith('/fulfilled')) {
        await dispatch(fetchAlarmSettingsDT(alarmSettingFilter));
        toast.success('Alarm priority updated successfully');
      }
    } catch (error) {
      toast.error('Error updating alarm priority');
      console.error('Error updating alarm priority:', error);
    }
  };
  const handlePriorityDown = async (alarm: AlarmSettingType) => {
    if (alarm.alarmLevelPriority === 'Low') {
      toast.error('Alarm is already at lowest priority');
      return;
    }
    const newPriority: 'Low' | 'Medium' | 'High' =
      alarm.alarmLevelPriority === 'Medium' ? 'Low' : 'Medium';
    const updatedAlarm = { ...alarm, alarmLevelPriority: newPriority };
    console.log('Priority Down Clicked:', alarm, 'New Priority:', newPriority);
    try {
      const res = await dispatch(editAlarmSetting(updatedAlarm));
      if (res.type.endsWith('/fulfilled')) {
        await dispatch(fetchAlarmSettingsDT(alarmSettingFilter));
        toast.success('Alarm priority updated successfully');
      }
    } catch (error) {
      toast.error('Error updating alarm priority');
      console.error('Error updating alarm priority:', error);
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
          {/* right actions */}
          <TableCell
            sx={{
              position: 'sticky',
              right: 0,
              background: 'white',
              zIndex: 2,
              width: 150,
              minWidth: 150,
              maxWidth: 150,
            }}
          >
            <Box display="flex" gap={1}>
              <Skeleton variant="rounded" width={90} height={32} />
              {/* <Skeleton variant="circular" width={32} height={32} />
                          <Skeleton variant="circular" width={32} height={32} /> */}
            </Box>
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
                    {columns.map((col, idx: number) => (
                      <TableCell key={`${col.label}-${idx}`}>
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
                      <Typography variant="h6"> More </Typography>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody key={'skeleton-body'}>
                  {!hasLoaded
                    ? renderSkeletonRows(SKELETON_ROWS)
                    : alarmSettings.map((alarmSetting: AlarmSettingType, index: number) => (
                        <TableRow key={alarmSetting.id}>
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
                            {index + 1}
                          </TableCell>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1}>
                              <Typography variant="h6" fontWeight="bold">
                                {alarmSetting.alarmCategory}
                              </Typography>
                              {alarmSetting.remarks !== '' && (
                                <Tooltip title={alarmSetting.remarks} arrow>
                                  <IconButton size="small" sx={{ color: 'text.secondary', p: 0.5 }}>
                                    <Typography
                                      variant="body2"
                                      fontWeight="bold"
                                      sx={{
                                        width: 18,
                                        height: 18,
                                        borderRadius: '50%',
                                        border: '1px solid',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.75rem',
                                        lineHeight: 1,
                                      }}
                                    >
                                      ?
                                    </Typography>
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Box>
                          </TableCell>

                          <TableCell>
                            <Box display="grid" gridTemplateColumns="80px auto" alignItems="center">
                              <Typography
                                variant="body2"
                                color={alarmSetting.isEnabled ? 'green' : 'text.secondary'}
                              >
                                {alarmSetting.isEnabled ? 'Active' : 'Inactive'}
                              </Typography>
                              <Switch
                                checked={alarmSetting.isEnabled}
                                onChange={() => handleToggleStatus(alarmSetting)}
                                color="primary"
                                size="small"
                              />
                            </Box>
                          </TableCell>

                          <TableCell>
                            {alarmSetting.isEnabled && (
                              <Box display="flex" alignItems="center" gap={1}>
                                {/* Priority Badge */}
                                {alarmSetting.alarmLevelPriority === 'High' && (
                                  <Button
                                    size="small"
                                    variant="contained"
                                    sx={{
                                      backgroundColor: '#e53935',
                                      color: 'white',
                                      borderRadius: '16px',
                                      textTransform: 'none',
                                      fontWeight: 'bold',
                                      px: 2,
                                    }}
                                    disableElevation
                                  >
                                    High
                                  </Button>
                                )}
                                {alarmSetting.alarmLevelPriority === 'Medium' && (
                                  <Button
                                    size="small"
                                    variant="contained"
                                    sx={{
                                      backgroundColor: '#4da5f3ff',
                                      color: 'white',
                                      borderRadius: '16px',
                                      textTransform: 'none',
                                      fontWeight: 'bold',
                                      px: 2,
                                    }}
                                    disableElevation
                                  >
                                    Medium
                                  </Button>
                                )}
                                {alarmSetting.alarmLevelPriority === 'Low' && (
                                  <Button
                                    size="small"
                                    variant="contained"
                                    sx={{
                                      backgroundColor: '#6ae670ff',
                                      color: 'white',
                                      borderRadius: '16px',
                                      textTransform: 'none',
                                      fontWeight: 'bold',
                                      px: 2,
                                    }}
                                    disableElevation
                                  >
                                    Low
                                  </Button>
                                )}

                                {/* Up / Down Buttons */}
                                <Box display="flex" flexDirection="column" alignItems="center">
                                  <IconButton
                                    size="small"
                                    onClick={() => handlePriorityUp(alarmSetting)}
                                  >
                                    <IconChevronUp size={16} />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    onClick={() => handlePriorityDown(alarmSetting)}
                                  >
                                    <IconChevronDown size={16} />
                                  </IconButton>
                                </Box>
                              </Box>
                            )}
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
                            {alarmSetting.isEnabled && (
                              <Tooltip title="Go to Setting Page" arrow>
                                <IconButton
                                  color="primary"
                                  size="small"
                                  onClick={() => {
                                    const route = getRoute(alarmSetting.alarmCategory);
                                    console.log('Navigate to:', route);
                                    // if using react-router
                                    navigate(route);
                                  }}
                                >
                                  <IconExternalLink size={20} />
                                </IconButton>
                              </Tooltip>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                </TableBody>
              </Table>
            </TableContainer>
                        {/* Pagination */}
                        <TablePagination
                          component="div"
                          count={alarmSettingTotalCount}
                          page={page}
                          rowsPerPage={rowsPerPage}
                          onPageChange={handleChangePage}
                          rowsPerPageOptions={[5, 10, 25]}
                          onRowsPerPageChange={handleChangeRowsPerPage}
                        />
          </BlankCard>
        </Box>
      </Grid>
      {/* Delete Confirmation Dialog */}
      {/* <Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog}>
          <DialogTitle>Confirm Deletion</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to delete the distric <strong>{selectedDist?.name}</strong>?
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDeleteDialog} color="primary">
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDelete}
              color={isLoading ? 'primary' : 'error'}
              disabled={isLoading}
              startIcon={isLoading ? <CircularProgress size={20} /> : null}
            >
              {isLoading ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog> */}
    </Grid>
  );
};

export default AlarmSettingList;
