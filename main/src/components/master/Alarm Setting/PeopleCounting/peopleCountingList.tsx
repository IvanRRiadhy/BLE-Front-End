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
import { IconEdit, IconPencil, IconTrash } from '@tabler/icons-react';
import { RootState, AppDispatch, useSelector, useDispatch } from 'src/store/Store';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import {
  ChangeActiveStatus,
  fetchPeopleCountingAlarms,
  PeopleCountingAlarmType,
  UpdateFilter,
} from 'src/store/apps/alarmsetting/peoplecounting';

const columns = [
  { label: 'Name', field: 'Name', sortAble: true },
  { label: 'Detail', field: 'Remarks', sortAble: false },
  { label: 'Status', field: 'IsEnabled', sortAble: true },
];

const SKELETON_ROWS = 5;

const PeopleCountingList = () => {
  const dispatch: AppDispatch = useDispatch();
  const { t } = useTranslation();
  const peopleCountingAlarms = useSelector(
    (state: RootState) => state.PeopleCountingReducer.peopleCountingAlarms,
  );
  const peopleCountingAlarmFilter = useSelector(
    (state: RootState) => state.PeopleCountingReducer.peopleCountingAlarmFilter,
  );
  const isLoading = useSelector((state: RootState) => state.PeopleCountingReducer.isLoading);
  const hasLoaded = useSelector((state: RootState) => state.PeopleCountingReducer.hasLoaded);
  const peopleCountingAlarmTotalCount = useSelector(
    (state: RootState) => state.PeopleCountingReducer.peopleCountingAlarmTotalCount,
  );

  // Pagination State
  const page = Math.floor(peopleCountingAlarmFilter.Start / peopleCountingAlarmFilter.Length);
  const rowsPerPage = peopleCountingAlarmFilter.Length;
  const orderBy = peopleCountingAlarmFilter.SortColumn;
  const order = peopleCountingAlarmFilter.SortDir;

  const handleChangePage = (_: unknown, newPage: number) => {
    dispatch(UpdateFilter({ Start: newPage * peopleCountingAlarmFilter.Length }));
  };
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newLength = parseInt(event.target.value, 10);
    dispatch(UpdateFilter({ Length: newLength, Start: 0 }));
  };
  const handleSort = (column: string) => {
    const isAsc =
      peopleCountingAlarmFilter.SortColumn === column && peopleCountingAlarmFilter.SortDir === 'asc';
    const isDesc =
      peopleCountingAlarmFilter.SortColumn === column && peopleCountingAlarmFilter.SortDir === 'desc';

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
    dispatch(fetchPeopleCountingAlarms(peopleCountingAlarmFilter));
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
                      <Typography variant="h6"> Action </Typography>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody key={'skeleton-body'}>
                  {!hasLoaded
                    ? renderSkeletonRows(rowsPerPage || SKELETON_ROWS)
                    : peopleCountingAlarms.map((geofencing: PeopleCountingAlarmType, index: number) => (
                        <TableRow key={geofencing.id}>
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
                          <TableCell>{geofencing.name}</TableCell>
                          <TableCell>{geofencing.remarks}</TableCell>

                          <TableCell>
                            <Box display="grid" gridTemplateColumns="80px auto" alignItems="center">
                              <Typography
                                variant="body2"
                                color={geofencing.isActive ? 'green' : 'text.secondary'}
                              >
                                {geofencing.isActive ? 'Active' : 'Inactive'}
                              </Typography>
                              <Switch
                                checked={geofencing.isActive}
                                onChange={() =>
                                  handleToggleStatus(geofencing.id, geofencing.isActive)
                                }
                                color="primary"
                                size="small"
                              />
                            </Box>
                          </TableCell>

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
                              <IconPencil size={20} />
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
              count={peopleCountingAlarmTotalCount}
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

export default PeopleCountingList;
