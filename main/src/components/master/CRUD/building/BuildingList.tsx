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

const columns = [
  { label: 'Building Name', field: 'name', sortAble: true },
  { label: 'Building Image', field: '', sortAble: false },
];

const BuildingList = () => {
  const dispatch: AppDispatch = useDispatch();
  const buildingData: BuildingType[] = useSelector(
    (state: RootState) => state.buildingReducer.buildings,
  );
  // const buildingTotalCount = useSelector(
  //   (state: RootState) => state.buildingReducer.buildingTotalCount,
  // );
  const buildingFilteredCount = useSelector(
    (state: RootState) => state.buildingReducer.buildingFilteredCount,
  );
  const buildingFilter = useSelector((state: RootState) => state.buildingReducer.buildingFilter);
  const [loading, setLoading] = useState(false);
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

  useEffect(() => {
    dispatch(UpdateFilter(defaultBuildingFilter));
  }, [dispatch]);

  useEffect(() => {
    try {
      setLoading(true);
      dispatch(fetchBuildingDT(buildingFilter));
    } catch (error) {
      console.error('Error fetching building data:', error);
    }
    setTimeout(() => {
      setLoading(false);
    }, 500);
  }, [buildingFilter, dispatch]);

  //Delete Pop-up
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingType | null>(null);
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
  const handleConfirmDelete = () => {
    if (selectedBuilding) {
      dispatch(deleteBuilding(selectedBuilding.id));
    }
    handleCloseDeleteDialog();
  };

  return (
    <Grid container spacing={3}>
      <Grid size={12}>
        {loading ? (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
            }}
          >
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Box sx={{ overflow: 'auto', maxWidth: '100%' }}>
              <BlankCard>
                <TableContainer>
                  <Table aria-label="simple-table" sx={{ whiteSpace: 'nowrap' }}>
                    <TableHead>
                      <TableRow>
                        {/* Left Sticky Empty Column */}
                        <TableCell
                          sx={{ position: 'sticky', left: 0, background: 'white', zIndex: 2 }}
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
                          sx={{ position: 'sticky', right: 0, background: 'white', zIndex: 2 }}
                        >
                          <Typography variant="h6"> Actions </Typography>
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {buildingData.map((building, index) => (
                        <TableRow key={index}>
                          <TableCell
                            sx={{ position: 'sticky', left: 0, background: 'white', zIndex: 1 }}
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
                              background: 'white',
                              zIndex: 2,
                              gap: 1,
                              alignItems: 'center',
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
              </BlankCard>
            </Box>
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
          </>
        )}
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
          <Button onClick={handleConfirmDelete} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
};

export default BuildingList;
