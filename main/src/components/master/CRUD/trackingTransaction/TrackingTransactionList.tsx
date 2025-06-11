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
import {
  deleteTrackingTrans,
  fetchTrackingTrans,
  trackingTransType,
} from 'src/store/apps/crud/trackingTrans';
import { fetchBleReaders, bleReaderType } from 'src/store/apps/crud/bleReader';
import { fetchMaskedAreas, MaskedAreaType } from 'src/store/apps/crud/maskedArea';
import AddEditTrackingTransaction from './AddEditTrackingTransaction';
import { useTranslation } from 'react-i18next';

const TrackingTransactionList = () => {
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
  const trackingTransData = useSelector(
    (state: RootState) => state.trackingTransReducer.trackingTrans,
  );
  const readerData = useSelector((state: RootState) => state.bleReaderReducer.bleReaders);
  const floorplanData = useSelector((state: RootState) => state.maskedAreaReducer.maskedAreas);

  useEffect(() => {
    dispatch(fetchTrackingTrans());
    dispatch(fetchBleReaders());
    dispatch(fetchMaskedAreas());
  }, [dispatch]);

  //Delete Pop-up
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTrans, setSelectedTrans] = useState<trackingTransType | null>(null);
  // Open delete confirmation dialog
  const handleOpenDeleteDialog = (trans: trackingTransType) => {
    setSelectedTrans(trans);
    setDeleteDialogOpen(true);
  };

  // Close delete confirmation dialog
  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setSelectedTrans(null);
  };

  // Confirm delete action
  const handleConfirmDelete = () => {
    if (selectedTrans) {
      dispatch(deleteTrackingTrans(selectedTrans.id));
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

  const getReaderName = (readerId: string) => {
    const reader = readerData.find((rd: bleReaderType) => rd.id === readerId);
    return reader ? reader.name : 'Unknown Reader';
  };

  const getFloorName = (floorId: string) => {
    const floor = floorplanData.find((fl: MaskedAreaType) => fl.id === floorId);
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
                      <Typography variant="h6"> </Typography>
                    </TableCell>
                    {[
                      'transTime',
                      'Reader Name',
                      'cardId',
                      'Floorplan Name',
                      'coordinateX',
                      'coordinateY',
                      'coordinatePxX',
                      'coordinatePxY',
                      'alarmStatus',
                      'battery',
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
                  {trackingTransData
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((trackingTrans: trackingTransType, index) => (
                      <TableRow key={trackingTrans.id}>
                        <TableCell
                          sx={{ position: 'sticky', left: 0, background: 'white', zIndex: 1 }}
                        >
                          {' '}
                          {index + 1}{' '}
                        </TableCell>
                        <TableCell>{formatTime(trackingTrans.transTime)}</TableCell>
                        <TableCell>{trackingTrans.reader?.name}</TableCell>
                        <TableCell>{trackingTrans.readerId}</TableCell>
                        <TableCell>{trackingTrans.floorplanMaskedArea?.name}</TableCell>
                        <TableCell>{trackingTrans.coordinateX}</TableCell>
                        <TableCell>{trackingTrans.coordinateY}</TableCell>
                        <TableCell>{trackingTrans.coordinatePxX}</TableCell>
                        <TableCell>{trackingTrans.coordinatePxY}</TableCell>
                        <TableCell>{trackingTrans.alarmStatus}</TableCell>
                        <TableCell>{trackingTrans.battery}</TableCell>
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
                          <AddEditTrackingTransaction
                            type="edit"
                            trackingTransaction={trackingTrans}
                          />
                          <IconButton
                            color="error"
                            size="small"
                            onClick={() => handleOpenDeleteDialog(trackingTrans)}
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
              count={trackingTransData.length}
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
            Are you sure you want to delete the tracking transaction{' '}
            <strong>{selectedTrans?.id}</strong>?
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

export default TrackingTransactionList;
