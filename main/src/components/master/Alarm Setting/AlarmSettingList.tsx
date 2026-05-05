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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { SketchPicker } from 'react-color';
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
  fetchAlarmSetting,
} from 'src/store/apps/alarmsetting/alarmSettings';
import { useLocation, useNavigate } from 'react-router';
import {
  useAlarmCategoryList,
  useEditAlarmCategory,
} from 'src/hooks/AlarmSetting/useAlarmCategory';
import { defaultAlarmSettingFilter } from 'src/store/apps/defaultForm';

const columns = [
  { label: 'Alarm Type', field: 'AlarmCategory', sortAble: true },
  { label: 'Status', field: 'IsEnabled', sortAble: true },
  { label: 'Color', field: 'AlarmColor', sortAble: false },
  { label: 'Level Priority', field: 'AlarmLevelPriority', sortAble: true },
  { label: 'Notification Intervals (sec)', field: 'NotifyIntervalSec', sortAble: true },
];

const NOTIFY_INTERVAL_PRESETS = [5, 10, 15, 30, 45, 60, 90, 120];

const SKELETON_ROWS = 5;

const AlarmSettingList = () => {
  const dispatch: AppDispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  // const alarmSettings = useSelector((state: RootState) => state.AlarmSettingReducer.alarmSettings);

  const alarmSettingFilter = useSelector(
    (state: RootState) => state.AlarmSettingReducer.alarmSettingFilter,
  );
  const { data: data, isLoading: queryLoading } = useAlarmCategoryList(alarmSettingFilter);
  const isLoading = useSelector((state: RootState) => state.AlarmSettingReducer.isLoading);
  const hasLoaded = useSelector((state: RootState) => state.AlarmSettingReducer.hasLoaded);
  const alarmSettings = data?.data || [];
  const alarmSettingTotalCount = data?.recordsFiltered || 0;

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
          SortColumn: 'AlarmCategory',
          SortDir: 'asc',
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

  //Mutation
  const editMutation = useEditAlarmCategory();

  // state for color picker dialog
  const [colorDialogOpen, setColorDialogOpen] = useState(false);
  const [selectedAlarm, setSelectedAlarm] = useState<AlarmSettingType | null>(null);
  const [tempColor, setTempColor] = useState<string>('');

  const getRoute = (name: string): string => {
    const basePath = `${window.location.origin}${location.pathname}`;
    switch (name.toLowerCase()) {
      case 'geofence':
        return `/alarmsetting/geofencing`;
      case 'overpopulating':
        return `/alarmsetting/peoplecounting`;
      case 'cardaccess':
        return `/master/cardaccess`;
      case 'boundary':
        return `/alarmsetting/boundary`;
      case 'stayonarea':
        return `/alarmsetting/stayonarea`;
      default:
        console.log(name);
        toast.error('No route defined for this alarm type');
        return '/alarmsetting/';
    }
  };

  const handleOpenColorDialog = (alarm: AlarmSettingType) => {
    setSelectedAlarm(alarm);
    setTempColor(alarm.alarmColor || '#000000'); // default black if empty
    setColorDialogOpen(true);
  };

  const handleApplyColor = async () => {
    if (!selectedAlarm) return;
    const updated = { ...selectedAlarm, alarmColor: tempColor };
    try {
      await editMutation.mutateAsync(updated);

      toast.success('Alarm color updated');
      setColorDialogOpen(false);
    } catch (err) {
      toast.error('Failed to update color');
      console.error(err);
    }
  };

  const handleToggleStatus = async (alarm: AlarmSettingType) => {
    const updatedAlarm = { ...alarm, isEnabled: !alarm.isEnabled };
    console.log('Toggle Status Clicked:', alarm, 'New Status:', updatedAlarm.isEnabled);
    try {
      await editMutation.mutateAsync(updatedAlarm);
      toast.success('Alarm status updated successfully');
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
      await editMutation.mutateAsync(updatedAlarm);
      toast.success('Alarm priority updated successfully');
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
      await editMutation.mutateAsync(updatedAlarm);
      toast.success('Alarm priority updated successfully');
    } catch (error) {
      toast.error('Error updating alarm priority');
      console.error('Error updating alarm priority:', error);
    }
  };

  // notification interval dialog
  const [notifyDialogOpen, setNotifyDialogOpen] = useState(false);
  const [tempNotifyInterval, setTempNotifyInterval] = useState<number | null>(null);

  const handleApplyNotifyInterval = async () => {
    if (!selectedAlarm || tempNotifyInterval === null) return;
    const updatedAlarm = { ...selectedAlarm, notifyIntervalSec: tempNotifyInterval };
    try {
      await editMutation.mutateAsync(updatedAlarm);

      toast.success('Notification interval updated');
      setNotifyDialogOpen(false);
    } catch (err) {
      toast.error('Failed to update notification interval');
      console.error(err);
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
                        backgroundColor: 'background.paper',
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
                        backgroundColor: 'background.paper',
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
                              backgroundColor: 'background.paper',
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
                            {alarmSetting.alarmCategory.toLowerCase() !== 'cardaccess' &&
                              alarmSetting.alarmCategory.toLowerCase() !== 'blacklist' && (
                                <Box
                                  display="grid"
                                  gridTemplateColumns="80px auto"
                                  alignItems="center"
                                >
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
                              )}
                          </TableCell>

                          {/* Color column */}
                          <TableCell>
                            {alarmSetting.isEnabled && (
                              <Box
                                onClick={() => handleOpenColorDialog(alarmSetting)}
                                sx={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: '6px',
                                  border: '1px solid #ccc',
                                  backgroundColor: alarmSetting.alarmColor || '#ddd',
                                  cursor: 'pointer',
                                }}
                              />
                            )}
                          </TableCell>

                          <TableCell>
                            {alarmSetting.isEnabled &&
                              alarmSetting.alarmCategory.toLowerCase() !== 'cardaccess' &&
                              alarmSetting.alarmCategory.toLowerCase() !== 'blacklist' && (
                                <Box display="flex" alignItems="center" gap={1}>
                                  {/* Priority Badge */}
                                  {alarmSetting.alarmLevelPriority === 'High' && (
                                    <Button
                                      size="small"
                                      variant="contained"
                                      sx={{
                                        backgroundColor: '#f44336',
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
                                        backgroundColor: '#ff9800',
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
                                        backgroundColor: '#ffc107',
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
                          {/* Notification Interval */}
                          <TableCell>
                            {alarmSetting.isEnabled && (
                              <Box
                                display="inline-flex"
                                alignItems="center"
                                gap={1.5}
                                sx={{
                                  cursor: 'pointer',
                                  px: 1.2,
                                  py: 0.4,
                                  borderRadius: 1,
                                  border: '1px dashed',
                                  borderColor: 'primary.main',
                                  color: 'primary.main',
                                  transition: 'all 0.2s ease',
                                  '&:hover': {
                                    backgroundColor: 'primary.main',
                                    color: 'white',
                                  },
                                }}
                                onClick={() => {
                                  setSelectedAlarm(alarmSetting);
                                  setTempNotifyInterval(alarmSetting.notifyIntervalSec ?? null);
                                  setNotifyDialogOpen(true);
                                }}
                              >
                                <Typography variant="h6" fontWeight={600}>
                                  {alarmSetting.notifyIntervalSec}
                                </Typography>
                                <IconEdit size={18} />
                              </Box>
                            )}
                          </TableCell>

                          <TableCell
                            sx={{
                              position: 'sticky',
                              right: 0,
                              backgroundColor: 'background.paper',
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
            {/* <TablePagination
              component="div"
              count={alarmSettingTotalCount}
              page={page}
              rowsPerPage={rowsPerPage}
              onPageChange={handleChangePage}
              rowsPerPageOptions={[5, 10, 25]}
              onRowsPerPageChange={handleChangeRowsPerPage}
            /> */}
          </BlankCard>
        </Box>
      </Grid>
      {/* Color Picker Dialog */}
      <Dialog
        open={colorDialogOpen}
        onClose={() => setColorDialogOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: 1,
            minWidth: 300,
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 600, textAlign: 'center', pb: 1 }}>Pick a Color</DialogTitle>

        <DialogContent>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              justifyItems: 'center',
              gap: 2,
              p: 1,
            }}
          >
            {[
              '#FF4D4F', // Bright Red
              '#B22222', // Crimson
              '#D633FF', // Magenta
              '#5D3FD3', // Indigo
              '#0047FF', // Deep Blue
              '#00CFFF', // Cyan
              '#228B22', // Dark Green
              '#FFCC00', // Yellow
              '#C8B560', // Khaki
              '#FF7A00', // Orange
            ].map((color) => (
              <Box
                key={color}
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  backgroundColor: color,
                  border: tempColor === color ? '3px solid #000' : '2px solid rgba(0,0,0,0.2)',
                  cursor: 'pointer',
                  transition: 'all 0.25s ease',
                  boxShadow:
                    tempColor === color ? '0 0 0 4px rgba(0,0,0,0.1)' : '0 2px 6px rgba(0,0,0,0.1)',
                  '&:hover': {
                    transform: 'scale(1.15)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                  },
                }}
                onClick={() => setTempColor(color)}
              />
            ))}
          </Box>

          {/* Selected color preview */}
          <Box
            sx={{
              mt: 2,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                backgroundColor: tempColor,
                border: '1px solid #aaa',
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
              }}
            />
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {tempColor}
            </Typography>
          </Box>
        </DialogContent>

        <DialogActions sx={{ justifyContent: 'center', p: 2 }}>
          <Button
            onClick={() => setColorDialogOpen(false)}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              px: 2.5,
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleApplyColor}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              px: 2.5,
              background: 'linear-gradient(45deg, #355CFF, #00CFFF)',
            }}
          >
            Apply Change
          </Button>
        </DialogActions>
      </Dialog>
      {/* Notification Interval Dialog */}
      <Dialog
        open={notifyDialogOpen}
        onClose={() => setNotifyDialogOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: 1,
            minWidth: 320,
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 600, textAlign: 'center', pb: 1 }}>
          Notification Interval
        </DialogTitle>

        <DialogContent>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 1.5,
              p: 1,
            }}
          >
            {NOTIFY_INTERVAL_PRESETS.map((sec) => {
              const selected = tempNotifyInterval === sec;

              return (
                <Box
                  key={sec}
                  onClick={() => setTempNotifyInterval(sec)}
                  sx={{
                    py: 1,
                    textAlign: 'center',
                    borderRadius: 2,
                    cursor: 'pointer',
                    fontWeight: 600,
                    border: selected ? '2px solid' : '1px solid',
                    borderColor: selected ? 'primary.main' : 'divider',
                    backgroundColor: selected ? 'primary.main' : 'transparent',
                    color: selected ? 'white' : 'text.primary',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      backgroundColor: selected ? 'primary.main' : 'action.hover',
                    },
                  }}
                >
                  {sec}s
                </Box>
              );
            })}
          </Box>

          {/* Selected preview */}
          {tempNotifyInterval !== null && (
            <Box mt={2} textAlign="center">
              <Typography variant="body2" fontWeight={500}>
                Selected: {tempNotifyInterval} seconds
              </Typography>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ justifyContent: 'center', p: 2 }}>
          <Button
            onClick={() => setNotifyDialogOpen(false)}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              px: 2.5,
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={tempNotifyInterval === null}
            onClick={handleApplyNotifyInterval}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              px: 2.5,
              background: 'linear-gradient(45deg, #355CFF, #00CFFF)',
            }}
          >
            Apply Change
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
};

export default AlarmSettingList;
