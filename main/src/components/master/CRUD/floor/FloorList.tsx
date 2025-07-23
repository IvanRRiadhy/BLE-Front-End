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
} from '@mui/material';
import BlankCard from 'src/components/shared/BlankCard';
import { IconTrash } from '@tabler/icons-react';
import { RootState, AppDispatch, useSelector, useDispatch } from 'src/store/Store';
import { deleteFloor, fetchFloorDT, floorType, UpdateFilter } from 'src/store/apps/crud/floor';
import { fetchBuildings, BuildingType } from 'src/store/apps/crud/building';
import AddEditFloor from './AddEditFloor';
// import { useTranslation } from 'react-i18next';

const BASE_URL = 'http://192.168.1.116:5000';

const columns = [
  { label: 'Building Name', field: 'Building.Name', sortAble: true },
  { label: 'Floor Name', field: 'name', sortAble: true },
  { label: 'Floor Image', field: '', sortAble: false },
  { label: 'Floor Dimension (meter)', field: '', sortAble: false },
  { label: 'Engine Floor', field: 'engineFloorId', sortAble: true },
];

const FloorList = () => {
  const dispatch: AppDispatch = useDispatch();
  const floorData = useSelector((state: RootState) => state.floorReducer.floors);
  // const floorTotalCount = useSelector((state: RootState) => state.floorReducer.floorTotalCount);
  const floorFilteredCount = useSelector(
    (state: RootState) => state.floorReducer.floorFilteredCount,
  );
  const floorFilter = useSelector((state: RootState) => state.floorReducer.floorFilter);
  // const { t } = useTranslation();
  // Pagination State
  const page = Math.floor(floorFilter.Start / floorFilter.Length);
  const rowsPerPage = floorFilter.Length;
  const orderBy = floorFilter.SortColumn;
  const order = floorFilter.SortDir;

  const handleChangePage = (_: unknown, newPage: number) => {
    dispatch(UpdateFilter({ Start: newPage * floorFilter.Length }));
  };
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newLength = parseInt(event.target.value, 10);
    dispatch(UpdateFilter({ Length: newLength, Start: 0 }));
  };
const handleSort = (column: string) => {
  const isAsc = floorFilter.SortColumn === column && floorFilter.SortDir === 'asc';
  const isDesc = floorFilter.SortColumn === column && floorFilter.SortDir === 'desc';

  if (isDesc) {
    dispatch(UpdateFilter({
      SortColumn: '',
      SortDir: 'asc',
      Start: 0,
    }));
  } else {
    dispatch(UpdateFilter({
      SortColumn: column,
      SortDir: isAsc ? 'desc' : 'asc',
      Start: 0,
    }));
  }
};
  useEffect(() => {
    dispatch(fetchFloorDT(floorFilter));
    console.log("FetchDT");
  }, [floorFilter, dispatch]);

  const buildingData: BuildingType[] = useSelector(
    (state: RootState) => state.buildingReducer.buildingAll,
  );

  useEffect(() => {
    dispatch(fetchBuildings());
    dispatch(fetchFloorDT(floorFilter));
    console.log("Fetch Buildings and Floors");
  }, [dispatch]);

  //Delete Pop-up
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedFloor, setSelectedFloor] = useState<floorType | null>(null);
  // Open delete confirmation dialog
  const handleOpenDeleteDialog = (floor: floorType) => {
    setSelectedFloor(floor);
    setDeleteDialogOpen(true);
  };

  // Close delete confirmation dialog
  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setSelectedFloor(null);
  };

  // Confirm delete action
  const handleConfirmDelete = () => {
    if (selectedFloor) {
      dispatch(deleteFloor(selectedFloor.id));
    }
    handleCloseDeleteDialog();
  };

  const getbuildingName = (buildingId: string) => {
    const building = buildingData.find((b) => b.id === buildingId);
    return building ? building.name : 'Unknown Building';
  };

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
                    <TableCell sx={{ position: 'sticky', left: 0, background: 'white', zIndex: 2 }}>
                      <Typography variant="h6"></Typography>
                    </TableCell>
                    {/* Main Table Header */}
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
                  {floorData.map((floor: floorType, index) => (
                    <TableRow key={index}>
                      <TableCell
                        sx={{ position: 'sticky', left: 0, background: 'white', zIndex: 1 }}
                      >
                        {index + 1 + page * rowsPerPage}
                      </TableCell>
                      <TableCell>{getbuildingName(floor.buildingId)}</TableCell>
                      <TableCell>{floor.name}</TableCell>
                      <TableCell>
                        {floor.floorImage ? (
                          <img
                            src={`${BASE_URL}${floor.floorImage}`}
                            alt="Floor"
                            style={{ width: 80, height: 80, objectFit: 'cover' }}
                          />
                        ) : (
                          'No Image'
                        )}
                      </TableCell>
                      <TableCell>{`(${floor.floorX}, ${floor.floorY})`}</TableCell>
                      <TableCell>{floor.engineFloorId}</TableCell>
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
                        <AddEditFloor type="edit" floor={floor} />
                        <IconButton
                          color="error"
                          size="small"
                          onClick={() => handleOpenDeleteDialog(floor)}
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
              count={floorFilteredCount}
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
            Are you sure you want to delete the floor <strong>{selectedFloor?.name}</strong>?
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

export default FloorList;
