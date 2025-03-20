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
import { deleteVisitor, fetchVisitor, visitorType } from 'src/store/apps/crud/visitor';
import AddEditVisitor from './AddEditVisitor';

const VisitorList = () => {
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
  const visitorData = useSelector((state: RootState) => state.visitorReducer.visitors);

  useEffect(() => {
    dispatch(fetchVisitor());
  }, [dispatch]);

  //Delete Pop-up
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState<visitorType | null>(null);
  // Open delete confirmation dialog
  const handleOpenDeleteDialog = (vis: visitorType) => {
    setSelectedVisitor(vis);
    setDeleteDialogOpen(true);
  };

  // Close delete confirmation dialog
  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setSelectedVisitor(null);
  };

  // Confirm delete action
  const handleConfirmDelete = () => {
    if (selectedVisitor) {
      dispatch(deleteVisitor(selectedVisitor.id));
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
                      <Typography variant="h6"> Left </Typography>
                    </TableCell>
                    {[
                      'id',
                      'personId',
                      'identityId',
                      'cardNumber',
                      'bleCardNumber',
                      'name',
                      'phone',
                      'email',
                      'gender',
                      'address',
                      'faceImage',
                      'uploadFr',
                      'uploadFrError',
                      'applicationId',
                      'registeredDate',
                      'visitorArrival',
                      'visitorEnd',
                      'portalKey',
                      'timestampPreRegistration',
                      'timestampCheckedIn',
                      'timestampCheckedOut',
                      'timestampDeny',
                      'timestampBlocked',
                      'timestampUnblocked',
                      'checkinBy',
                      'checkoutBy',
                      'denyBy',
                      'blockBy',
                      'unblockBy',
                      'reasonDeny',
                      'reasonBlock',
                      'reasonUnblock',
                      'status',
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
                  {visitorData
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((visitor: visitorType) => (
                      <TableRow key={visitor.id}>
                        <TableCell
                          sx={{ position: 'sticky', left: 0, background: 'white', zIndex: 1 }}
                        ></TableCell>
                        <TableCell>{visitor.id}</TableCell>
                        <TableCell>{visitor.personId}</TableCell>
                        <TableCell>{visitor.identityId}</TableCell>
                        <TableCell>{visitor.cardNumber}</TableCell>
                        <TableCell>{visitor.bleCardNumber}</TableCell>
                        <TableCell>{visitor.name}</TableCell>
                        <TableCell>{visitor.phone}</TableCell>
                        <TableCell>{visitor.email}</TableCell>
                        <TableCell>{visitor.gender}</TableCell>
                        <TableCell>{visitor.address}</TableCell>
                        <TableCell>{visitor.faceImage}</TableCell>
                        <TableCell>{visitor.uploadFr}</TableCell>
                        <TableCell>{visitor.uploadFrError}</TableCell>
                        <TableCell>{visitor.applicationId}</TableCell>
                        <TableCell>{formatTime(visitor.registeredDate)}</TableCell>
                        <TableCell>{formatTime(visitor.visitorArrival)}</TableCell>
                        <TableCell>{formatTime(visitor.visitorEnd)}</TableCell>
                        <TableCell>{visitor.portalKey}</TableCell>
                        <TableCell>{formatTime(visitor.timestampPreRegistration)}</TableCell>
                        <TableCell>{formatTime(visitor.timestampCheckedIn)}</TableCell>
                        <TableCell>{formatTime(visitor.timestampCheckedOut)}</TableCell>
                        <TableCell>{formatTime(visitor.timestampDeny)}</TableCell>
                        <TableCell>{formatTime(visitor.timestampBlocked)}</TableCell>
                        <TableCell>{formatTime(visitor.timestampUnblocked)}</TableCell>
                        <TableCell>{visitor.checkinBy}</TableCell>
                        <TableCell>{visitor.checkoutBy}</TableCell>
                        <TableCell>{visitor.denyBy}</TableCell>
                        <TableCell>{visitor.blockBy}</TableCell>
                        <TableCell>{visitor.unblockBy}</TableCell>
                        <TableCell>{visitor.reasonDeny}</TableCell>
                        <TableCell>{visitor.reasonBlock}</TableCell>
                        <TableCell>{visitor.reasonUnblock}</TableCell>
                        <TableCell>{visitor.status}</TableCell>
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
                          <AddEditVisitor type="edit" visitor={visitor} />
                          <IconButton
                            color="error"
                            size="small"
                            onClick={() => handleOpenDeleteDialog(visitor)}
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
              count={visitorData.length}
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
            Are you sure you want to delete visitor <strong>{selectedVisitor?.name}</strong>?
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

export default VisitorList;
