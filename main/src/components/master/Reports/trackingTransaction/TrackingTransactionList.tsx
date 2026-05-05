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
} from '@mui/material';
import BlankCard from 'src/components/shared/BlankCard';
import { IconEye, IconTrash } from '@tabler/icons-react';
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
import { fetchMembers, memberType } from 'src/store/apps/crud/member';
import { fetchVisitor, VisitorType } from 'src/store/apps/crud/visitor';
import TrackingPositionPreviewDialog from './Preview/TrackingPositionPreviewDialog';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import 'dayjs/locale/id';

dayjs.extend(utc);
dayjs.extend(localizedFormat);
dayjs.locale('id');

const columns = [
  { label: 'Transaction Time', field: 'Transtime', sortAble: true },
  { label: 'Reader', field: 'Reader.Name', sortAble: true },
  { label: 'Area', field: 'FloorplanMaskedArea.Name', sortAble: true },
  { label: 'Person', field: '', sortAble: false },
  { label: 'Position', field: '', sortAble: false },
  { label: 'Alarm Status', field: 'AlarmStatus', sortAble: true },
  { label: 'Battery', field: 'Battery', sortAble: true },
];

const SKELETON_ROWS = 5;

const TrackingTransactionList = () => {
  const dispatch: AppDispatch = useDispatch();
  const trackingTransData = useSelector(
    (state: RootState) => state.trackingTransReducer.trackingTrans,
  );
  const memberData = useSelector((state: RootState) => state.memberReducer.memberAll);
  const visitorData = useSelector((state: RootState) => state.visitorReducer.visitors);
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
  const hasLoaded = useSelector((state: RootState) => state.trackingTransReducer.hasLoaded);
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

    if (isDesc && column !== 'Transtime') {
      dispatch(
        UpdateFilter({
          SortColumn: 'Transtime',
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
    dispatch(fetchMembers());
    dispatch(fetchVisitor());
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
    if (!isoString) return '-';

    const localTime = dayjs.utc(isoString).local(); // Convert UTC → Local

    const weekday = localTime.format('dddd'); // e.g. Kamis
    const day = localTime.format('DD');
    const month = localTime.format('MMM'); // e.g. Okt
    const year = localTime.format('YYYY');
    const time = localTime.format('HH:mm:ss');

    return `${weekday}, ${day} ${month} ${year} — ${time}`;
  };

  const getHolderName = (id: string) => {
    const member = memberData.find((member: memberType) => member.id === id);
    if (member) {
      return member.name;
    }
    const visitor = visitorData.find((visitor: VisitorType) => visitor.id === id);
    if (visitor) {
      return visitor.name;
    }
    return 'Unknown';
  };

  //Position Preview
  const [openPositionDialog, setOpenPositionDialog] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<trackingTransType | null>(null);

  const handleOpenPositionDialog = (transaction: trackingTransType) => {
    setSelectedTransaction(transaction);
    setOpenPositionDialog(true);
  };

  const handleClosePositionDialog = () => {
    setOpenPositionDialog(false);
    setSelectedTransaction(null);
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
              backgroundColor: 'background.paper',
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
          <TableCell>
            <Skeleton variant="text" width={160} height={22} />
          </TableCell>
          <TableCell>
            <Skeleton variant="text" width={160} height={22} />
          </TableCell>
          <TableCell>
            <Skeleton variant="text" width={120} height={22} />
          </TableCell>
          <TableCell>
            <Skeleton variant="text" width={120} height={22} />
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
            <TableContainer>
              <Table aria-label="simple table" sx={{ whiteSpace: 'nowrap' }}>
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
                  </TableRow>
                </TableHead>
                <TableBody>
                  {!hasLoaded
                    ? renderSkeletonRows(rowsPerPage || SKELETON_ROWS)
                    : trackingTransData.map((trackingTrans: trackingTransType, index: number) => (
                        <TableRow key={trackingTrans.id}>
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
                            {' '}
                            {index + 1 + page * rowsPerPage}{' '}
                          </TableCell>
                          <TableCell>{formatTime(trackingTrans.transTime)}</TableCell>
                          <TableCell>{trackingTrans.reader?.name}</TableCell>
                          <TableCell>
                            {trackingTrans.floorplanMaskedArea?.name ?? 'Unknown Area'}
                          </TableCell>
                          <TableCell>
                            {trackingTrans.member?.name ??
                              trackingTrans.visitor?.name ??
                              'Unknown Visitor'}
                          </TableCell>
                          <TableCell>
                            <IconButton
                              color="primary"
                              size="small"
                              onClick={() => handleOpenPositionDialog(trackingTrans)}
                            >
                              <IconEye size={20} />
                            </IconButton>
                          </TableCell>
                          <TableCell>{trackingTrans.alarmStatus}</TableCell>
                          <TableCell>{trackingTrans.battery}</TableCell>
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
            {openPositionDialog && selectedTransaction && (
              <TrackingPositionPreviewDialog
                transaction={selectedTransaction}
                onClose={handleClosePositionDialog}
              />
            )}
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
