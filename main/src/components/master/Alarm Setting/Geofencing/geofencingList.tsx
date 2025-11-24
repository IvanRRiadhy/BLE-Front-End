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
  Tooltip,
} from '@mui/material';
import BlankCard from 'src/components/shared/BlankCard';
import { IconEdit, IconPencil, IconTrash } from '@tabler/icons-react';
import { RootState, useSelector, useDispatch } from 'src/store/Store';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

// Import React Query hooks
import {
  useGeoFencingAlarms,
  useEditGeoFencingAlarm,
  useDeleteGeoFencingAlarm,
  useToggleGeoFencingAlarm,
} from 'src/hooks/AlarmSetting/useGeofence';
import { GeoFencingAlarmType } from 'src/store/apps/alarmsetting/geofencing';
import { UpdateFilter } from 'src/store/apps/alarmsetting/geofencing';

const columns = [
  { label: 'Name', field: 'Name', sortAble: true },
  { label: 'Detail', field: 'Remarks', sortAble: false },
  { label: 'Status', field: 'IsEnabled', sortAble: true },
];

const SKELETON_ROWS = 5;

const GeoFencingList = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  // Get filter from Redux
  const geoFencingAlarmFilter = useSelector(
    (state: RootState) => state.GeoFencingReducer.geoFencingAlarmFilter,
  );

  // Use React Query hooks
  const { 
    data: paginatedData, 
    isLoading, 
    isFetching,
    isFetched: hasLoaded 
  } = useGeoFencingAlarms(geoFencingAlarmFilter);
  
  const { mutate: editAlarm, isPending: isEditing } = useEditGeoFencingAlarm();
  const { mutate: deleteAlarm, isPending: isDeleting } = useDeleteGeoFencingAlarm();
  const { mutate: toggleAlarm, isPending: isToggling } = useToggleGeoFencingAlarm();
  const editMutation = useEditGeoFencingAlarm();

  const geoFencingAlarms = paginatedData?.data || [];
  const geoFencingAlarmTotalCount = paginatedData?.recordsTotal || 0;

  // Pagination State
  const page = Math.floor(geoFencingAlarmFilter.Start / geoFencingAlarmFilter.Length);
  const rowsPerPage = geoFencingAlarmFilter.Length;
  const orderBy = geoFencingAlarmFilter.SortColumn;
  const order = geoFencingAlarmFilter.SortDir;

  const handleChangePage = (_: unknown, newPage: number) => {
    dispatch(UpdateFilter({ Start: newPage * geoFencingAlarmFilter.Length }));
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newLength = parseInt(event.target.value, 10);
    dispatch(UpdateFilter({ Length: newLength, Start: 0 }));
  };

  const handleSort = (column: string) => {
    const isAsc =
      geoFencingAlarmFilter.SortColumn === column && geoFencingAlarmFilter.SortDir === 'asc';
    const isDesc =
      geoFencingAlarmFilter.SortColumn === column && geoFencingAlarmFilter.SortDir === 'desc';

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

  const handleToggleStatus = async (geofence: GeoFencingAlarmType) => {
    const updatedGeoFence = {
      ...geofence,
      isActive: !geofence.isActive,
    };
    
    console.log("Toggle Status Clicked: ", geofence, "New Status: ", updatedGeoFence.isActive);
    editMutation.mutate(updatedGeoFence);
  };

  // Delete Pop-up
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedGeofence, setSelectedGeofence] = useState<GeoFencingAlarmType | null>(null);
  
  // Open delete confirmation dialog
  const handleOpenDeleteDialog = (geofence: GeoFencingAlarmType) => {
    setSelectedGeofence(geofence);
    setDeleteDialogOpen(true);
  };

  // Close delete confirmation dialog
  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setSelectedGeofence(null);
  };

  // Confirm delete action
  const handleConfirmDelete = async () => {
    if (selectedGeofence) {
      deleteAlarm(selectedGeofence.id, {
        onSuccess: () => {
          toast.success('Data Deleted');
        },
        onError: (error: any) => {
          toast.error('Delete Data Unsuccessful');
          console.error('Error deleting GeoFence:', error);
        },
      });
    }
    handleCloseDeleteDialog();
  };

  const handleEdit = (selectedGeofence: GeoFencingAlarmType) => {
    // You might want to move this to React Query cache or context
    // For now, keeping Redux for selected item state
    import('src/store/apps/alarmsetting/geofencing').then(({ SetSelectedGeoFencingAlarm }) => {
      dispatch(SetSelectedGeoFencingAlarm(selectedGeofence));
      console.log("Selected geofencing alarm for editing:", JSON.stringify(selectedGeofence));
      navigate('/alarmsetting/geofencing/edit');
    });
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
                    : geoFencingAlarms.map((geofence: GeoFencingAlarmType, index: number) => (
                        <TableRow key={geofence.id}>
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
                          <TableCell>{geofence.name}</TableCell>
                          <TableCell>{geofence.remarks}</TableCell>

                          <TableCell>
                            <Box display="grid" gridTemplateColumns="80px auto" alignItems="center">
                              <Typography
                                variant="body2"
                                color={geofence.isActive ? 'success.dark' : 'error.dark'}
                              >
                                {geofence.isActive ? 'Active' : 'Inactive'}
                              </Typography>
                              <Tooltip title={geofence.isActive ? 'Disable' : 'Enable'} arrow>
                                <Switch
                                  checked={geofence.isActive}
                                  onChange={() => handleToggleStatus(geofence)}
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
                                onClick={() => handleEdit(geofence)}
                                disabled={loading}
                              >
                                <IconPencil size={20} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete" arrow>
                              <IconButton
                                color="error"
                                size="small"
                                onClick={() => handleOpenDeleteDialog(geofence)}
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
              count={geoFencingAlarmTotalCount}
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
            Are you sure you want to delete the GeoFence <strong>{selectedGeofence?.name}</strong>?
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

export default GeoFencingList;