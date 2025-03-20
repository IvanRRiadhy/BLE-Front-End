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
import { deleteMaskedArea, fetchMaskedAreas, MaskedAreaType } from 'src/store/apps/crud/maskedArea';
import { fetchFloors, floorType } from 'src/store/apps/crud/floor';
import AddEditMaskedArea from './AddEditMaskedArea';
import { useTranslation } from 'react-i18next';

const MaskedAreaList = () => {
  const { t } = useTranslation();
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
  const maskedAreaData = useSelector((state: RootState) => state.maskedAreaReducer.maskedAreas);
  const floorData = useSelector((state: RootState) => state.floorReducer.floors);

  useEffect(() => {
    dispatch(fetchMaskedAreas());
    dispatch(fetchFloors);
  }, [dispatch]);

  //Delete Pop-up
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMask, setSelectedMask] = useState<MaskedAreaType | null>(null);
  // Open delete confirmation dialog
  const handleOpenDeleteDialog = (mask: MaskedAreaType) => {
    setSelectedMask(mask);
    setDeleteDialogOpen(true);
  };

  // Close delete confirmation dialog
  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setSelectedMask(null);
  };

  // Confirm delete action
  const handleConfirmDelete = () => {
    if (selectedMask) {
      dispatch(deleteMaskedArea(selectedMask.id));
    }
    handleCloseDeleteDialog();
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);

    // Extract the weekday
    const weekday = t(date.toLocaleString('en-GB', { weekday: 'long' }));
    const month = t(date.toLocaleString('en-GB', { month: 'short' }));

    return `${weekday}, ${date.getDate()} ${month} ${date.getFullYear()} - ${date.toLocaleTimeString(
      'en-GB',
      {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      },
    )}`;
  };

  const getFloorName = (floorId: string) => {
    const floor = floorData.find((fl: floorType) => fl.id === floorId);
    return floor ? floor.name : 'Unknown Floor';
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
                      'id',
                      'floorplanId',
                      'Floor Name',
                      'name',
                      'areaShape',
                      'colorArea',
                      'restrictedStatus',
                      'engineAreaId',
                      'wideArea',
                      'positionPxX',
                      'positionPxY',
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
                  {maskedAreaData
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((maskedArea: MaskedAreaType, index) => (
                      <TableRow key={index}>
                        <TableCell
                          sx={{ position: 'sticky', left: 0, background: 'white', zIndex: 1 }}
                        >
                          {index + 1}
                        </TableCell>
                        <TableCell>{maskedArea.id}</TableCell>
                        <TableCell>{maskedArea.floorplanId}</TableCell>
                        <TableCell>{getFloorName(maskedArea.floorId)}</TableCell>
                        <TableCell>{maskedArea.name}</TableCell>
                        <TableCell>{maskedArea.areaShape}</TableCell>
                        <TableCell>{maskedArea.colorArea}</TableCell>
                        <TableCell>{maskedArea.restrictedStatus}</TableCell>
                        <TableCell>{maskedArea.engineAreaId}</TableCell>
                        <TableCell>{maskedArea.wideArea}</TableCell>
                        <TableCell>{maskedArea.positionPxX}</TableCell>
                        <TableCell>{maskedArea.positionPxY}</TableCell>
                        <TableCell
                          sx={{
                            position: 'sticky',
                            right: 0,
                            background: 'white',
                            zIndex: 2,
                            display: 'flex',
                            gap: 1,
                            alignItems: 'center',
                          }}
                        >
                          <AddEditMaskedArea type="edit" maskedArea={maskedArea} />
                          <IconButton
                            color="error"
                            size="small"
                            onClick={() => handleOpenDeleteDialog(maskedArea)}
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
              count={maskedAreaData.length}
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
            Are you sure you want to delete the Masked Area <strong>{selectedMask?.name}</strong>?
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

export default MaskedAreaList;
