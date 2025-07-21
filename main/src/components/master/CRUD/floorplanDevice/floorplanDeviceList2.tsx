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
// import { useTranslation } from 'react-i18next';
import { fetchFloorplanDevices, FloorplanDeviceType } from 'src/store/apps/crud/floorplanDevice';
import { fetchFloorplan, fetchFloorplanDT, FloorplanType, SelectFloorplan, UpdateFilter } from 'src/store/apps/crud/floorplan';
import { IconEdit } from '@tabler/icons-react';
import { useNavigate } from 'react-router';

const columns = [
    { label: 'Floorplan Name', field: 'name', sortAble: true },
  { label: 'Total Device', field: '', sortAble: false },
];

const FloorplanDeviceList2 = () => {
    const dispatch: AppDispatch = useDispatch();
  const floorplanData = useSelector((state: RootState) => state.floorplanReducer.floorplans);
  const floorplanFilter = useSelector((state: RootState) => state.floorplanReducer.floorplanFilter);
  // const { t } = useTranslation();
  const navigate = useNavigate();
  // Pagination State
  const page = Math.floor(floorplanFilter.Start / floorplanFilter.Length);
const rowsPerPage = floorplanFilter.Length;
const orderBy = floorplanFilter.SortColumn;
const order = floorplanFilter.SortDir;

const handleChangePage = (_: unknown, newPage: number) => {
  dispatch(UpdateFilter({ Start: newPage * floorplanFilter.Length }));
};
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
  const newLength = parseInt(event.target.value, 10);
  dispatch(UpdateFilter({ Length: newLength, Start: 0 }));
};
  const handleSort = (column: string) => {
  const isAsc = floorplanFilter.SortColumn === column && floorplanFilter.SortDir === 'asc';
  dispatch(UpdateFilter({
    SortColumn: column,
    SortDir: isAsc ? 'desc' : 'asc',
    Start: 0,
  }));
};

// useEffect(() => {
//   console.log("Floorplan Data:", floorplanData);
// }, [floorplanData]);

  useEffect(() => {
    dispatch(fetchFloorplanDT(floorplanFilter));
  }, [floorplanFilter, dispatch]);
  useEffect(() => {
    dispatch(fetchFloorplanDevices());
    // dispatch(fetchFloorplan());
  }, [dispatch]);

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

  const handleOnClick = (id: string) => {
    // console.log('id: ', id);
    dispatch(SelectFloorplan(id));
    navigate('/master/device/edit');
    // console.log('selectedFloorPlan: ', selectedFloorPlan);
    // const activeGateways = (selectedFloorPlan as floorplanType | null)?.gateways ?? [];
    // gateways.map((gate) => {
    //   if (activeGateways.includes(gate.id)) {
    //     dispatch(SetActiveGate(gate.id, true));
    //   } else {
    //     dispatch(SetActiveGate(gate.id, false));
    //   }
    // });
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
                      <Typography variant="h6">Floorplans</Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant="h6">Total Device</Typography>
                    </TableCell>
                    {/* Right Sticky Empty Column */}
                    <TableCell
                      sx={{ position: 'sticky', right: 0, background: 'white', zIndex: 2 }}
                    >
                      <Typography variant="h6"> Actions </Typography>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {floorplanData
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((floorplan: FloorplanType, index) => (
                      <TableRow key={index}>
                        <TableCell
                          sx={{ position: 'sticky', left: 0, background: 'white', zIndex: 1 }}
                        >
                          {floorplan.name}
                        </TableCell>
                        <TableCell>{floorplan.deviceCount}</TableCell>

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
                          <IconButton
                            color="primary"
                            size="small"
                            onClick={() => handleOnClick(floorplan.id)}
                          >
                            <IconEdit size={20} />
                          </IconButton>
                          {/* <IconButton
                            color="error"
                            size="small"
                            onClick={() => handleOpenDeleteDialog(floorplan)}
                          >
                            <IconTrash size={20} />
                          </IconButton> */}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={floorplanData.length}
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

export default FloorplanDeviceList2;
