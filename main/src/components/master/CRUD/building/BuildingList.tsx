import { BASE_URL } from 'src/utils/axios';
import React, { useEffect, useState } from 'react';
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
import {
  BuildingType,
  fetchBuildingDT,
  deleteBuilding,
  UpdateFilter,
} from 'src/store/apps/crud/building';
import AddEditBuilding from './AddEditBuilding';
import { defaultBuildingFilter } from 'src/store/apps/defaultForm';
import toast from 'react-hot-toast';
import { useBuildingList, useDeleteBuilding } from 'src/hooks/useBuilding';

const columns = [
  { label: 'Building Name', field: 'name', sortAble: true },
  { label: 'Building Image', field: '', sortAble: false },
];

const SKELETON_ROWS = 5;

const BuildingList = () => {
  const dispatch: AppDispatch = useDispatch();
  // const buildingData: BuildingType[] = useSelector(
  //   (state: RootState) => state.buildingReducer.buildings,
  // );
  // const buildingTotalCount = useSelector(
  //   (state: RootState) => state.buildingReducer.buildingTotalCount,
  // );
  // const buildingFilteredCount = useSelector(
  //   (state: RootState) => state.buildingReducer.buildingFilteredCount,
  // );
  const buildingFilter = useSelector((state: RootState) => state.buildingReducer.buildingFilter);
  // const {
  //   data: buildingData = [],
  //   isLoading: queryLoading,
  //   isFetching,
  // } = useBuildingList(buildingFilter);
  const { data, isLoading: queryLoading } = useBuildingList(buildingFilter);
  const buildingData = data?.data || [];
  const buildingTotalCount = data?.recordsTotal || 0;
  const buildingFilteredCount = data?.recordsFiltered || 0;
  const isLoading = useSelector((state) => state.buildingReducer.isLoading);
  const hasLoaded = useSelector((state) => state.buildingReducer.hasLoaded);
  // Pagination State
  const page = Math.floor(buildingFilter.Start / buildingFilter.Length);
  const rowsPerPage = buildingFilter.Length;
  const orderBy = buildingFilter.SortColumn;
  const order = buildingFilter.SortDir;

  const handleChangePage = (_: unknown, newPage: number) => {
    dispatch(UpdateFilter({ Start: newPage * buildingFilter.Length }));
  };
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newLength = parseInt(event.target.value, 10);
    dispatch(UpdateFilter({ Length: newLength, Start: 0 }));
  };
  const handleSort = (column: string) => {
    const isAsc = buildingFilter.SortColumn === column && buildingFilter.SortDir === 'asc';
    const isDesc = buildingFilter.SortColumn === column && buildingFilter.SortDir === 'desc';

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

  // useEffect(() => {
  //   dispatch(UpdateFilter(defaultBuildingFilter));
  // }, [dispatch]);

  // useEffect(() => {
  //   try {
  //     dispatch(fetchBuildingDT(buildingFilter));
  //   } catch (error) {
  //     console.error('Error fetching building data:', error);
  //   }
  // }, [buildingFilter, dispatch]);

  //Delete Pop-up
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingType | null>(null);
  const deleteMutation = useDeleteBuilding();
  // Open delete confirmation dialog
  const handleOpenDeleteDialog = (building: BuildingType) => {
    setSelectedBuilding(building);
    setDeleteDialogOpen(true);
  };

  // Close delete confirmation dialog
  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setSelectedBuilding(null);
  };

  // Confirm delete action
  const handleConfirmDelete = async () => {
    if (selectedBuilding) {
      // try {
      //   const result = await dispatch(deleteBuilding(selectedBuilding.id));
      //   if (result && result.type && result.type.endsWith('/fulfilled')) {
      //     await dispatch(fetchBuildingDT(buildingFilter));
      //     toast.success('Data Deleted');
      //   }
      // } catch (error) {
      //   toast.error('Delete Data Unsuccessful');
      //   console.error('Error deleting Building:', error);
      // }
      try {
        await deleteMutation.mutateAsync(selectedBuilding.id);
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
          {/* sticky index cell */}
          <TableCell
            sx={{
              position: 'sticky',
              left: 0,
              backgroundColor: 'background.paper',
              zIndex: 1,
              width: 35,
              minWidth: 35,
              maxWidth: 35,
            }}
          >
            <Skeleton variant="text" width={18} />
          </TableCell>
          {/* Building Name */}
          <TableCell>
            <Skeleton variant="text" width={220} height={22} />
          </TableCell>
          {/* Building Image */}
          <TableCell>
            <Skeleton variant="rectangular" width={80} height={60} />
          </TableCell>
          {/* Actions (right sticky) */}
          <TableCell
            sx={{
              position: 'sticky',
              right: 0,
              backgroundColor: 'background.paper',
              zIndex: 2,
              width: 150,
              minWidth: 150,
              maxWidth: 150,
            }}
          >
            <Box display="flex" gap={1}>
              <Skeleton variant="rounded" width={90} height={32} />
              {/* <Skeleton variant="circular" width={32} height={32} /> */}
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
            <TableContainer
              sx={{
                maxHeight: '55vh',
              }}
            >
              <Table stickyHeader aria-label="simple-table" sx={{ whiteSpace: 'nowrap' }}>
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
                        backgroundColor: 'background.paper',
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
                    : buildingData.map((building, index) => (
                        <TableRow key={index}>
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
                            {index + 1 + page * rowsPerPage}
                          </TableCell>
                          <TableCell>{building.name}</TableCell>
                          <TableCell>
                            {building.image ? (
                              <img
                                src={`${BASE_URL}${building.image}`}
                                alt="Building"
                                style={{ width: 80, height: 80, objectFit: 'cover' }}
                              />
                            ) : (
                              'No Image'
                            )}
                          </TableCell>
                          <TableCell
                            sx={{
                              position: 'sticky',
                              right: 0,
                              backgroundColor: 'background.paper',
                              zIndex: 1,
                              gap: 1,
                              alignItems: 'center',
                              width: 150, // Fixed width
                              minWidth: 150,
                              maxWidth: 150,
                            }}
                          >
                            <AddEditBuilding type="edit" building={building} />
                            <IconButton
                              color="error"
                              size="small"
                              onClick={() => handleOpenDeleteDialog(building)}
                            >
                              <IconTrash size={20} />
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
              count={buildingFilteredCount}
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
            Are you sure you want to delete the building <strong>{selectedBuilding?.name}</strong>?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} color="primary">
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDelete}
            color={deleteMutation.isPending ? 'primary' : 'error'}
            disabled={deleteMutation.isPending}
            startIcon={deleteMutation.isPending ? <CircularProgress size={20} /> : null}
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
};

export default BuildingList;
