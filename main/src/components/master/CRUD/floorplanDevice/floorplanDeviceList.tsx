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
import { useTranslation } from 'react-i18next';
import { fetchFloorplanDevices, FloorplanDeviceType } from 'src/store/apps/crud/floorplanDevice';
import { FloorplanType, fetchFloorplan } from 'src/store/apps/crud/floorplan';

const FloorplanDeviceList = () => {
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

  useEffect(() => {
    dispatch(fetchFloorplanDevices());
  }, [dispatch]);
  const deviceData = useSelector(
    (state: RootState) => state.floorplanDeviceReducer.floorplanDevices,
  );

  //Delete Pop-up
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<FloorplanDeviceType | null>(null);

  const handleOpenDeleteDialog = (device: FloorplanDeviceType) => {
    setSelectedDevice(device);
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setSelectedDevice(null);
  };

  const handleConfirmDelete = () => {
    if (selectedDevice) {
      console.log('Device to be deleted:', selectedDevice);
      //dispatch(deleteFloorplanDevice(selectedDevice.id));
      setDeleteDialogOpen(false);
    }
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
                      'Name',
                      'Floorplan Name',
                      'Type',
                      'Device Status',
                      'Position X',
                      'Position Y',
                      'Position Pixel X',
                      'Position Pixel Y',
                      'CCTV Name',
                      'Control Name',
                      'Reader Name',
                      'Mask Area Name',
                      'Mask Area ID',
                      'Mask Area ID Nested',
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
                  {deviceData
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((device: FloorplanDeviceType, index) => (
                      <TableRow key={index}>
                        <TableCell
                          sx={{ position: 'sticky', left: 0, background: 'white', zIndex: 1 }}
                        >
                          {index + 1}
                        </TableCell>
                        <TableCell>{device.id}</TableCell>
                        <TableCell>{device.name}</TableCell>
                        <TableCell>{device.floorplanId}</TableCell>
                        <TableCell>{device.type}</TableCell>
                        <TableCell>{device.deviceStatus}</TableCell>
                        <TableCell>{device.posX}</TableCell>
                        <TableCell>{device.posY}</TableCell>
                        <TableCell>{device.posPxX}</TableCell>
                        <TableCell>{device.posPxY}</TableCell>
                        <TableCell>{device.accessCctv?.name}</TableCell>
                        <TableCell>{device.accessControl?.name}</TableCell>
                        <TableCell>{device.reader?.name}</TableCell>
                        <TableCell>{device.floorplanMaskedArea?.name}</TableCell>
                        <TableCell>{device.floorplanMaskedAreaId}</TableCell>
                        <TableCell>{device.floorplanMaskedArea?.id}</TableCell>
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
                          {/*<AddEditFloor type="edit" floor={floor} />*/}
                          {/* <AddEditDevice type="edit" device={device} /> */}
                          <IconButton
                            color="error"
                            size="small"
                            onClick={() => handleOpenDeleteDialog(device)}
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
              count={deviceData.length}
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
            Are you sure you want to delete the device <strong>{selectedDevice?.name}</strong>?
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

export default FloorplanDeviceList;
