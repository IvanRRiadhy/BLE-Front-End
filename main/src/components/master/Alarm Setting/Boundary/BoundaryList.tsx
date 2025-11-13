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
import { RootState, useDispatch, useSelector } from 'src/store/Store';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

// Import React Query hooks
import {
  useBoundaryAlarms,
  useEditBoundaryAlarm,
  useDeleteBoundaryAlarm,
  useToggleBoundaryAlarm,
} from 'src/hooks/AlarmSetting/useBoundary';

// Import Redux actions for filter and selection
import {
  SetSelectedBoundaryAlarm,
  UpdateFilter,
} from 'src/store/apps/alarmsetting/boundary';
import { BoundaryAlarmType } from 'src/store/apps/alarmsetting/boundary';

const columns = [
  { label: 'Name', field: 'Name', sortAble: true },
  { label: 'Detail', field: 'Remarks', sortAble: false },
  { label: 'Status', field: 'IsEnabled', sortAble: true },
];

const SKELETON_ROWS = 5;

const BoundaryList = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  // Get filter from Redux
  const boundaryAlarmFilter = useSelector(
    (state: RootState) => state.BoundaryReducer.boundaryAlarmFilter,
  );

  // Use React Query hooks
  const { 
    data: paginatedData, 
    isLoading, 
    isFetching,
    isFetched: hasLoaded 
  } = useBoundaryAlarms(boundaryAlarmFilter);
  
  const { mutate: editAlarm, isPending: isEditing } = useEditBoundaryAlarm();
  const { mutate: deleteAlarm, isPending: isDeleting } = useDeleteBoundaryAlarm();
  const { mutate: toggleAlarm, isPending: isToggling } = useToggleBoundaryAlarm();

  const boundaryAlarms = paginatedData?.data || [];
  const boundaryAlarmTotalCount = paginatedData?.recordsTotal || 0;

  // Pagination State
  const page = Math.floor(boundaryAlarmFilter.Start / boundaryAlarmFilter.Length);
  const rowsPerPage = boundaryAlarmFilter.Length;
  const orderBy = boundaryAlarmFilter.SortColumn;
  const order = boundaryAlarmFilter.SortDir;

  const handleChangePage = (_: unknown, newPage: number) => {
    dispatch(UpdateFilter({ Start: newPage * boundaryAlarmFilter.Length }));
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newLength = parseInt(event.target.value, 10);
    dispatch(UpdateFilter({ Length: newLength, Start: 0 }));
  };

  const handleSort = (column: string) => {
    const isAsc =
      boundaryAlarmFilter.SortColumn === column && boundaryAlarmFilter.SortDir === 'asc';
    const isDesc =
      boundaryAlarmFilter.SortColumn === column && boundaryAlarmFilter.SortDir === 'desc';

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

  const handleToggleStatus = async (boundary: BoundaryAlarmType) => {
    const updatedBoundary = {
      ...boundary,
      isActive: !boundary.isActive,
    };
    
    console.log("Toggle Status Clicked: ", boundary, "New Status: ", updatedBoundary.isActive);
    
    toggleAlarm(
      { id: boundary.id, isActive: updatedBoundary.isActive },
      {
        onSuccess: () => {
          toast.success('Alarm status updated successfully');
        },
        onError: (error) => {
          toast.error('Error updating alarm status');
          console.error('Error updating alarm status:', error);
        },
      }
    );
  };

  // Delete Pop-up
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedBoundary, setSelectedBoundary] = useState<BoundaryAlarmType | null>(null);
  
  // Open delete confirmation dialog
  const handleOpenDeleteDialog = (boundary: BoundaryAlarmType) => {
    setSelectedBoundary(boundary);
    setDeleteDialogOpen(true);
  };

  // Close delete confirmation dialog
  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setSelectedBoundary(null);
  };

  // Confirm delete action
  const handleConfirmDelete = async () => {
    if (selectedBoundary) {
      deleteAlarm(selectedBoundary.id, {
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

  const handleEdit = (selectedBoundary: BoundaryAlarmType) => {
    dispatch(SetSelectedBoundaryAlarm(selectedBoundary));
    console.log("Selected boundary alarm for editing:", JSON.stringify(selectedBoundary));
    navigate('/alarmsetting/boundary/edit');
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

  const loading = isLoading || isFetching || isEditing || isToggling;

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
                    : boundaryAlarms.map((boundary: BoundaryAlarmType, index: number) => (
                        <TableRow key={boundary.id}>
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
                          <TableCell>{boundary.name}</TableCell>
                          <TableCell>{boundary.remarks}</TableCell>

                          <TableCell>
                            <Box display="grid" gridTemplateColumns="80px auto" alignItems="center">
                              <Typography
                                variant="body2"
                                color={boundary.isActive ? 'success.dark' : 'error.dark'}
                              >
                                {boundary.isActive ? 'Active' : 'Inactive'}
                              </Typography>
                              <Tooltip title={boundary.isActive ? 'Disable' : 'Enable'} arrow>
                                <Switch
                                  checked={boundary.isActive}
                                  onChange={() => handleToggleStatus(boundary)}
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
                                onClick={() => handleEdit(boundary)}
                                disabled={loading}
                              >
                                <IconPencil size={20} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete" arrow>
                              <IconButton
                                color="error"
                                size="small"
                                onClick={() => handleOpenDeleteDialog(boundary)}
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
              count={boundaryAlarmTotalCount}
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
            Are you sure you want to delete the Alarm <strong>{selectedBoundary?.name}</strong>?
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

export default BoundaryList;