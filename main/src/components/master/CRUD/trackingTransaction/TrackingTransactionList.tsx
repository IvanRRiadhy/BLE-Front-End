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
import {
  deleteTrackingTrans,
  fetchTrackingTrans,
  fetchTrackingTransDT,
  trackingTransType,
  UpdateFilter,
} from 'src/store/apps/crud/trackingTrans';
import AddEditTrackingTransaction from './AddEditTrackingTransaction';
import { useTranslation } from 'react-i18next';
import { defaultTrackingTransFilter } from 'src/store/apps/defaultForm';

const columns = [
  { label: 'Transaction Time', field: 'TransTime', sortAble: true },
  { label: 'Reader', field: 'Reader.Name', sortAble: true },
  { label: 'Floorplan', field: 'Floorplan.Name', sortAble: true },
  { label: 'Card ', field: 'CardId', sortAble: true },
  { label: 'Coordinate', field: '', sortAble: false },
  { label: 'Alarm Status', field: 'AlarmStatus', sortAble: true },
  { label: 'Battery', field: 'Battery', sortAble: true },
];

const TrackingTransactionList = () => {
  const dispatch: AppDispatch = useDispatch();
  const trackingTransData = useSelector(
    (state: RootState) => state.trackingTransReducer.trackingTrans,
  );
  const trackingTransTotalCount = useSelector(
    (state: RootState) => state.trackingTransReducer.trackingTransTotalCount,
  );
  const trackingTransFilteredCount = useSelector(
    (state: RootState) => state.trackingTransReducer.trackingTransFilteredCount,
  );
  const trackingTransFilter = useSelector(
    (state: RootState) => state.trackingTransReducer.trackingTransFilter,
  );
  const { t } = useTranslation();
  // Pagination State
  const page = Math.floor(trackingTransFilter.Start / trackingTransFilter.Length);
  const rowsPerPage = trackingTransFilter.Length;
  const orderBy = trackingTransFilter.SortColumn;
  const order = trackingTransFilter.SortDir;

  const handleChangePage = (_: unknown, newPage: number) => {
    dispatch(UpdateFilter({ Start: newPage * trackingTransFilter.Length }));
  };
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newLength = parseInt(event.target.value, 10);
    dispatch(UpdateFilter({ Length: newLength, Start: 0 }));
  };
  const handleSort = (column: string) => {
    const isAsc =
      trackingTransFilter.SortColumn === column && trackingTransFilter.SortDir === 'asc';
    const isDesc =
      trackingTransFilter.SortColumn === column && trackingTransFilter.SortDir === 'desc';

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
    dispatch(UpdateFilter(defaultTrackingTransFilter));
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchTrackingTransDT(trackingTransFilter));
  }, [trackingTransFilter, dispatch]);

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
                  {trackingTransData.map((trackingTrans: trackingTransType, index) => (
                    <TableRow key={trackingTrans.id}>
                      <TableCell
                        sx={{ position: 'sticky', left: 0, background: 'white', zIndex: 1 }}
                      >
                        {' '}
                        {index + 1 + page * rowsPerPage}{' '}
                      </TableCell>
                      <TableCell>{formatTime(trackingTrans.transTime)}</TableCell>
                      <TableCell>{trackingTrans.reader?.name}</TableCell>
                      <TableCell>{trackingTrans.floorplanMaskedArea?.name}</TableCell>
                      <TableCell>{trackingTrans.cardId}</TableCell>
                      <TableCell>{`(${trackingTrans.coordinateX}, ${trackingTrans.coordinateY})`}</TableCell>
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
                        {/* <AddEditTrackingTransaction
                            type="edit"
                            trackingTransaction={trackingTrans}
                          /> */}
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
              count={trackingTransFilteredCount}
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
