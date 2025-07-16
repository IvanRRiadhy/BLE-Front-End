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
} from '@mui/material';
import BlankCard from 'src/components/shared/BlankCard';
import { IconTrash } from '@tabler/icons-react';
import { RootState, AppDispatch, useSelector, useDispatch } from 'src/store/Store';
import { deleteFloor, fetchFloors, floorType } from 'src/store/apps/crud/floor';
import { fetchBuildings, BuildingType } from 'src/store/apps/crud/building';
import AddEditFloor from './AddEditFloor';
// import { useTranslation } from 'react-i18next';

const BASE_URL = 'http://192.168.1.116:5000';

const FloorList = () => {
  // const { t } = useTranslation();
  // Pagination State
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5); // Default to 5 rows per page
  // Handle page change
  const handleChangePage = (event: unknown, newPage: number) => {
    console.log(event);
    setPage(newPage);
  };

  // Handle rows per page change
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  const dispatch: AppDispatch = useDispatch();
  const floorData = useSelector((state: RootState) => state.floorReducer.floors);
  const buildingData: BuildingType[] = useSelector(
    (state: RootState) => state.buildingReducer.buildings,
  );

  useEffect(() => {
    dispatch(fetchFloors());
    dispatch(fetchBuildings());
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
                    {[
                      'Building Name',
                      'Floor Name',
                      'Floor Image',
                      'Floor Dimension (meter)',
                      'Engine Floor',
                    ].map((header) => (
                      <TableCell key={header}>
                        <Typography variant="h6">{header}</Typography>
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
                  {floorData
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((floor: floorType, index) => (
                      <TableRow key={index}>
                        <TableCell
                          sx={{ position: 'sticky', left: 0, background: 'white', zIndex: 1 }}
                        >
                          {index + 1}
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
              count={floorData.length}
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
