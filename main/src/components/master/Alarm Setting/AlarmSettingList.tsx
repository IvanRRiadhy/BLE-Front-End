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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  TableSortLabel,
  Skeleton,
  CircularProgress,
  Switch,
} from '@mui/material';
import BlankCard from 'src/components/shared/BlankCard';
import { IconEdit, IconTrash } from '@tabler/icons-react';
import { RootState, AppDispatch, useSelector, useDispatch } from 'src/store/Store';
import toast from 'react-hot-toast';
import {
  AlarmSettingType,
  fetchAlarmSettingsDT,
  GetAlarmSetting,
  UpdateFilter,
  ChangeActiveStatus,
} from 'src/store/apps/alarmsetting/alarmSettings';

const columns = [
  { label: 'Alarm Type', field: 'Name', sortAble: true },
  { label: 'Status', field: 'IsActive', sortAble: false },
];

const SKELETON_ROWS = 5;

const AlarmSettingList = () => {
  const dispatch: AppDispatch = useDispatch();
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
  }, [dispatch]);

  const handleToggleStatus = (id: string, currentStatus: boolean) => {
    dispatch(ChangeActiveStatus({ id, isActive: !currentStatus }));
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
                    ? renderSkeletonRows(rowsPerPage || SKELETON_ROWS)
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
                            {index + 1 + page * rowsPerPage}
                          </TableCell>
                          <TableCell>{alarmSetting.name}</TableCell>
                          <TableCell>
                            <Box display="grid" gridTemplateColumns="80px auto" alignItems="center">
                              <Typography
                                variant="body2"
                                color={alarmSetting.isActive ? 'green' : 'text.secondary'}
                              >
                                {alarmSetting.isActive ? 'Active' : 'Inactive'}
                              </Typography>
                              <Switch
                                checked={alarmSetting.isActive}
                                onChange={() =>
                                  handleToggleStatus(alarmSetting.id, alarmSetting.isActive)
                                }
                                color="primary"
                                size="small"
                              />
                            </Box>
                          </TableCell>
                          {/* <TableCell>{alarmSetting.districtHost}</TableCell> */}

                          <TableCell
                            sx={{
                              position: 'sticky',
                              right: 0,
                              background: 'white',
                              zIndex: 2,
                              display: 'flex',
                              gap: 1,
                              alignItems: 'center',
                              width: 150, // Fixed width
                              minWidth: 150,
                              maxWidth: 150,
                            }}
                          >
                            {/* <AddEditDistrict type="edit" district={district} /> */}
                            <IconButton
                              color="error"
                              size="small"
                              //   onClick={() => handleOpenDeleteDialog(district)}
                            >
                              <IconEdit size={20} />
                            </IconButton>
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
