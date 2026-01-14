import { BASE_URL } from 'src/utils/axios';
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
} from '@mui/material';
import BlankCard from 'src/components/shared/BlankCard';
import { IconTrash } from '@tabler/icons-react';
import { RootState, AppDispatch, useSelector, useDispatch } from 'src/store/Store';
import { PatrolRouteType, UpdateFilter } from 'src/store/apps/crud/patrolRoute';

// import AddEditPatrolRoute from './AddEditPatrolRoute';
import toast from 'react-hot-toast';
import { useDeletePatrolRoute, usePatrolRouteList } from 'src/hooks/usePatrolRoute';
import AddEditPatrolRoute from './AddEditPatrolRoute';

const columns = [
  { label: 'Route Name', field: 'Name', sortAble: true },
  { label: 'Description', field: 'Description', sortAble: false },
  { label: 'Patrol Area Count', field: 'PatrolAreaIds.Length', sortAble: false },
  { label: 'Patrol Start', field: '', sortAble: false },
  { label: 'Patrol End', field: '', sortAble: false },
];

const SKELETON_ROWS = 5;

const PatrolRouteList = () => {
  const dispatch: AppDispatch = useDispatch();
  const patrolRouteFilter = useSelector(
    (state: RootState) => state.PatrolRouteReducer.patrolRouteFilter,
  );
  const { data, isLoading: queryLoading } = usePatrolRouteList(patrolRouteFilter);
  const patrolRouteData = data?.data || [];
  const patrolRouteTotalCount = data?.recordsTotal || 0;
  const patrolRouteFilteredCount = data?.recordsFiltered || 0;
  const isLoading = useSelector((state: RootState) => state.PatrolRouteReducer.isLoading);
  const hasLoaded = useSelector((state: RootState) => state.PatrolRouteReducer.hasLoaded);

  //Pagination State
  const page = Math.floor(patrolRouteFilter.Start / patrolRouteFilter.Length);
  const rowsPerPage = patrolRouteFilter.Length;
  const orderBy = patrolRouteFilter.SortColumn;
  const order = patrolRouteFilter.SortDir;

  const handleChangePage = (_: unknown, newPage: number) => {
    dispatch(UpdateFilter({ Start: newPage * patrolRouteFilter.Length }));
  };
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newLength = parseInt(event.target.value, 10);
    dispatch(UpdateFilter({ Length: newLength, Start: 0 }));
  };
  const handleSort = (column: string) => {
    const isAsc = patrolRouteFilter.SortColumn === column && patrolRouteFilter.SortDir === 'asc';
    const isDesc = patrolRouteFilter.SortColumn === column && patrolRouteFilter.SortDir === 'desc';

    if (isDesc) {
      dispatch(
        UpdateFilter({
          SortColumn: 'name',
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

  // useEffect(() => {
  //   dispatch(UpdateFilter(defaultPatrolRouteFilter));
  //   try {
  //     dispatch(fetchPatrolRouteDT(defaultPatrolRouteFilter));
  //   } catch (error) {
  //     console.error('Error fetching data: ', error);
  //   }
  // }, [dispatch]);

  // useEffect(() => {
  //   dispatch(fetchPatrolRouteDT(patrolRouteFilter));
  // }, [patrolRouteFilter, dispatch]);

  //Delete Pop-up
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPatrolRoute, setSelectedPatrolRoute] = useState<PatrolRouteType | null>(null);
  const deleteMutation = useDeletePatrolRoute();
  // Open delete confirmation dialog
  const handleOpenDeleteDialog = (ca: PatrolRouteType) => {
    setSelectedPatrolRoute(ca);
    setDeleteDialogOpen(true);
  };

  // Close delete confirmation dialog
  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setSelectedPatrolRoute(null);
  };

  // Confirm delete action
  const handleConfirmDelete = async () => {
    if (selectedPatrolRoute) {
      //   try {
      //     const result = await dispatch(deletePatrolRoute(selectedPatrolRoute.id));
      //     if (result && result.type && result.type.endsWith('/fulfilled')) {
      //       await dispatch(fetchPatrolRouteDT(patrolRouteFilter));
      //       toast.success('Data Deleted');
      //     }
      //   } catch (error) {
      //     toast.error('Delete Data Unsuccessful');
      //     console.error('Error deleting Card Access:', error);
      //   }
      try {
        await deleteMutation.mutateAsync(selectedPatrolRoute.id);
        toast.success('Data Deleted');
      } catch (error) {
        toast.error('Delete failed');
        console.error(error);
      }
    }
    handleCloseDeleteDialog();
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
            <Skeleton variant="text" width={180} height={22} />
          </TableCell>
          <TableCell>
            <Skeleton variant="text" width={160} height={22} />
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
                  {queryLoading
                    ? renderSkeletonRows(rowsPerPage || SKELETON_ROWS)
                    : patrolRouteData.map((patrolRoute: PatrolRouteType, index: number) => (
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
                          <TableCell>{patrolRoute.name}</TableCell>
                          <TableCell>{patrolRoute.description}</TableCell>
                          <TableCell>{patrolRoute.patrolAreaIds?.length ?? 0}</TableCell>
                          <TableCell>{"A"}</TableCell>
                          <TableCell>{"B"}</TableCell>
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
                            <AddEditPatrolRoute patrolRoute={patrolRoute} type="edit" />
                            <IconButton
                              color="error"
                              size="small"
                              onClick={() => handleOpenDeleteDialog(patrolRoute)}
                            >
                              <IconTrash size={20} />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={patrolRouteFilteredCount}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </BlankCard>
        </Box>
      </Grid>
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the patrol route{' '}
            <strong>{selectedPatrolRoute?.name}</strong>?
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
      </Dialog>
    </Grid>
  );
};

export default PatrolRouteList;
