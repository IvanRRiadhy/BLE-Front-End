import React, { useState } from 'react';
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
  Tooltip,
} from '@mui/material';
import BlankCard from 'src/components/shared/BlankCard';
import { IconPencil, IconTrash } from '@tabler/icons-react';
import { RootState, useSelector, useDispatch } from 'src/store/Store';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

// Import React Query hooks
import {
  useOverPopulatingAlarms,
  useToggleOverPopulatingAlarm,
  useDeleteOverPopulatingAlarm,
  useEditOverPopulatingAlarm,
} from 'src/hooks/AlarmSetting/useOverPopulate';

// Import Redux actions (for filter and selected item state)
import {
  SetSelectedOverPopulatingAlarm,
  UpdateFilter,
} from 'src/store/apps/alarmsetting/overpopulating';
import { OverPopulatingAlarmType } from 'src/store/apps/alarmsetting/overpopulating';

const columns = [
  { label: 'Name', field: 'Name', sortAble: true },
  { label: 'Detail', field: 'Remarks', sortAble: false },
  { label: 'Status', field: 'IsEnabled', sortAble: true },
];

const SKELETON_ROWS = 5;

const OverPopulatingList = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  // Get filter from Redux
  const overPopulatingAlarmFilter = useSelector(
    (state: RootState) => state.OverPopulatingReducer.overPopulatingAlarmFilter,
  );

  // Use React Query hooks
  const { 
    data: paginatedData, 
    isLoading, 
    isFetching,
    isFetched: hasLoaded 
  } = useOverPopulatingAlarms(overPopulatingAlarmFilter);
  
  const { mutate: toggleAlarm, isPending: isToggling } = useToggleOverPopulatingAlarm();
  const { mutate: deleteAlarm, isPending: isDeleting } = useDeleteOverPopulatingAlarm();
  const editMutation = useEditOverPopulatingAlarm();

  const overPopulatingAlarms = paginatedData?.data || [];
  const overPopulatingAlarmTotalCount = paginatedData?.recordsTotal || 0;

  // Pagination State
  const page = Math.floor(overPopulatingAlarmFilter.Start / overPopulatingAlarmFilter.Length);
  const rowsPerPage = overPopulatingAlarmFilter.Length;
  const orderBy = overPopulatingAlarmFilter.SortColumn;
  const order = overPopulatingAlarmFilter.SortDir;

  const handleChangePage = (_: unknown, newPage: number) => {
    dispatch(UpdateFilter({ Start: newPage * overPopulatingAlarmFilter.Length }));
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newLength = parseInt(event.target.value, 10);
    dispatch(UpdateFilter({ Length: newLength, Start: 0 }));
  };

  const handleSort = (column: string) => {
    const isAsc =
      overPopulatingAlarmFilter.SortColumn === column && overPopulatingAlarmFilter.SortDir === 'asc';
    const isDesc =
      overPopulatingAlarmFilter.SortColumn === column && overPopulatingAlarmFilter.SortDir === 'desc';

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

  const handleToggleStatus = async (overpopulate: OverPopulatingAlarmType) => {
    const updatedAlarm = {
      ...overpopulate,
      isActive: !overpopulate.isActive,
    };
    
    console.log("Toggle Status Clicked: ", overpopulate, "New Status: ", updatedAlarm.isActive);
    editMutation.mutate(updatedAlarm);    
    // toggleAlarm(
    //   { id: overpopulate.id, isActive: updatedAlarm.isActive },
    //   {
    //     onSuccess: () => {
    //       toast.success('Alarm status updated successfully');
    //     },
    //     onError: (error) => {
    //       toast.error('Error updating alarm status');
    //       console.error('Error updating alarm status:', error);
    //     },
    //   }
    // );
  };

  // Delete Pop-up
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedOverpopulating, setSelectedOverpopulating] = useState<OverPopulatingAlarmType | null>(null);
  
  // Open delete confirmation dialog
  const handleOpenDeleteDialog = (overpopulate: OverPopulatingAlarmType) => {
    setSelectedOverpopulating(overpopulate);
    setDeleteDialogOpen(true);
  };

  // Close delete confirmation dialog
  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setSelectedOverpopulating(null);
  };

  // Confirm delete action
  const handleConfirmDelete = async () => {
    if (selectedOverpopulating) {
      deleteAlarm(selectedOverpopulating.id, {
        onSuccess: () => {
          toast.success('Data Deleted');
        },
        onError: (error) => {
          toast.error('Delete Data Unsuccessful');
          console.error('Error deleting Alarm:', error);
        },
      });
    }
    handleCloseDeleteDialog();
  };

  const handleEdit = (selectedOverpopulating: OverPopulatingAlarmType) => {
    dispatch(SetSelectedOverPopulatingAlarm(selectedOverpopulating));
    console.log("Selected overpopulating alarm for editing:", JSON.stringify(selectedOverpopulating));
    navigate('/alarmsetting/overpopulating/edit');
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
            </Box>
          </TableCell>
        </TableRow>
      ))}
    </>
  );

  const loading = isLoading || isFetching || isToggling;

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
                        width: 35,
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
                        width: 150,
                        minWidth: 150,
                        maxWidth: 150,
                      }}
                    >
                      <Typography variant="h6"> Action </Typography>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody key={'skeleton-body'}>
                  {!hasLoaded || loading
                    ? renderSkeletonRows(rowsPerPage || SKELETON_ROWS)
                    : overPopulatingAlarms.map((overpopulate: OverPopulatingAlarmType, index: number) => (
                        <TableRow key={overpopulate.id}>
                          <TableCell
                            sx={{
                              position: 'sticky',
                              left: 0,
                              background: 'white',
                              zIndex: 1,
                              width: 35,
                              minWidth: 35,
                              maxWidth: 35,
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {index + 1 + page * rowsPerPage}
                          </TableCell>
                          <TableCell>{overpopulate.name}</TableCell>
                          <TableCell>{overpopulate.remarks}</TableCell>

                          <TableCell>
                            <Box display="grid" gridTemplateColumns="80px auto" alignItems="center">
                              <Typography
                                variant="body2"
                                color={overpopulate.isActive ? 'success.dark' : 'error.dark'}
                              >
                                {overpopulate.isActive ? 'Active' : 'Inactive'}
                              </Typography>
                              <Tooltip title={overpopulate.isActive ? 'Disable' : 'Enable'} arrow>
                                <Switch
                                  checked={overpopulate.isActive}
                                  onChange={() => handleToggleStatus(overpopulate)}
                                  color="primary"
                                  size="small"
                                  disabled={isToggling}
                                />
                              </Tooltip>
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
                              width: 150,
                              minWidth: 150,
                              maxWidth: 150,
                            }}
                          >
                            <Tooltip title="Edit" arrow>
                              <IconButton
                                color="primary"
                                size="small"
                                onClick={() => handleEdit(overpopulate)}
                                disabled={loading}
                              >
                                <IconPencil size={20} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete" arrow>
                              <IconButton
                                color="error"
                                size="small"
                                onClick={() => handleOpenDeleteDialog(overpopulate)}
                                disabled={loading}
                              >
                                <IconTrash size={20} />
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
              count={overPopulatingAlarmTotalCount}
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
      <Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the Alarm <strong>{selectedOverpopulating?.name}</strong>?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} color="primary">
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDelete}
            color={isDeleting ? 'primary' : 'error'}
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={20} /> : null}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
};

export default OverPopulatingList;