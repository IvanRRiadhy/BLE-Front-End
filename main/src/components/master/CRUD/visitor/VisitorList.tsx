import React, { useEffect, useRef, useState } from 'react';
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
  CircularProgress,
  TableSortLabel,
} from '@mui/material';
import BlankCard from 'src/components/shared/BlankCard';
import { IconTrash } from '@tabler/icons-react';
import { RootState, AppDispatch, useSelector, useDispatch } from 'src/store/Store';
import { useTranslation } from 'react-i18next';
import {
  deleteVisitor,
  fetchVisitorDT,
  masterVisitorType,
  UpdateFilter,
  VisitorType,
} from 'src/store/apps/crud/visitor';
import AddEditVisitor from './AddEditVisitor';
import { defaultVisitorFilter } from 'src/store/apps/defaultForm';

const columns = [
  { label: 'Visitor Name', field: 'Name', sortAble: true },
  { label: 'Person ID', field: 'PersonId', sortAble: true },
  { label: 'Identity Id', field: 'IdentityId', sortAble: true },
    { label: 'Card Number', field: 'CardNumber', sortAble: true },
  { label: 'BLE Card Number', field: 'BleCardNumber', sortAble: true },
  { label: 'Phone Number', field: 'phone', sortAble: false },
      { label: 'Email', field: 'Email', sortAble: false },
  { label: 'Gender', field: 'Gender', sortAble: false },
  { label: 'Address', field: 'Address', sortAble: false },
];

const VisitorList = () => {
  const dispatch: AppDispatch = useDispatch();
  const visitorData = useSelector((state: RootState) => state.visitorReducer.visitors);
  const visitorTotalCount = useSelector(
    (state: RootState) => state.visitorReducer.visitorTotalCount,
  );
  // const visitorFilteredCount = useSelector(
  //   (state: RootState) => state.visitorReducer.visitorFilteredCount,
  // );
  const visitorFilter = useSelector((state: RootState) => state.visitorReducer.visitorFilter);
  const prevFilterRef = useRef(visitorFilter);
  // const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const isLoading = useSelector((state: RootState) => state.visitorReducer.isLoading);
  const hasLoaded = useSelector((state: RootState) => state.visitorReducer.hasLoaded);
  // Pagination State
  const page = Math.floor(visitorFilter.Start / visitorFilter.Length);
  const rowsPerPage = visitorFilter.Length;
  const orderBy = visitorFilter.SortColumn;
  const order = visitorFilter.SortDir;
  // Handle page change
  const handleChangePage = (_: unknown, newPage: number) => {
    dispatch(UpdateFilter({ Start: newPage * visitorFilter.Length }));
  };
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newLength = parseInt(event.target.value, 10);
    dispatch(UpdateFilter({ Length: newLength, Start: 0 }));
  };
  const handleSort = (column: string) => {
    const isAsc = visitorFilter.SortColumn === column && visitorFilter.SortDir === 'asc';
    const isDesc = visitorFilter.SortColumn === column && visitorFilter.SortDir === 'desc';

    if (isDesc) {
      dispatch(
        UpdateFilter({
          SortColumn: 'UpdatedAt',
          SortDir: 'asc',
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
    dispatch(UpdateFilter(defaultVisitorFilter));
    try {
      dispatch(fetchVisitorDT(defaultVisitorFilter));
    } catch (error) {
      console.error('Error fetching organization data:', error);
    }
  }, [dispatch]);

  useEffect(() => {
    const prevFilter = prevFilterRef.current;
    const isStartorLengthChanged =
      prevFilter.Start !== visitorFilter.Start || prevFilter.Length !== visitorFilter.Length;
    if (isStartorLengthChanged) {
      setLoading(true);
    }
    dispatch(fetchVisitorDT(visitorFilter)).finally(() => {
      if (isStartorLengthChanged) {
        setTimeout(() => {
          setLoading(false);
        }, 500);
      }
    });
    prevFilterRef.current = visitorFilter;
  }, [visitorFilter, dispatch]);

  //Delete Pop-up
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState<VisitorType | null>(null);
  // Open delete confirmation dialog
  const handleOpenDeleteDialog = (vis: VisitorType) => {
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

  return (
    <Grid container spacing={3}>
      <Grid size={12}>
        <Box sx={{ overflow: 'auto', maxWidth: '100%' }}>
          {!hasLoaded ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <CircularProgress />
            </Box>
          ) : (
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
                          background: 'white',
                          zIndex: 2,
                          width: 35, // Fixed width
                          minWidth: 35,
                          maxWidth: 35,
                        }}
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
                        sx={{
                          position: 'sticky',
                          right: 0,
                          background: 'white',
                          zIndex: 2,
                          width: 150, // Fixed width
                          minWidth: 150,
                          maxWidth: 150,
                        }}
                      >
                        <Typography variant="h6"> Actions </Typography>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {visitorData.map((visitor: VisitorType, index: number) => (
                      <TableRow key={visitor.id}>
                        <TableCell
                          sx={{
                            position: 'sticky',
                            left: 0,
                            background: 'white',
                            zIndex: 1,
                            width: 35, // Fixed width
                            minWidth: 35,
                            maxWidth: 35,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {index + 1 + page * rowsPerPage}
                        </TableCell>
                        <TableCell>{visitor.name}</TableCell>
                        <TableCell>{visitor.personId}</TableCell>
                        <TableCell>{visitor.identityId}</TableCell>
                        <TableCell>{visitor.cardNumber}</TableCell>
                        <TableCell>{visitor.bleCardNumber}</TableCell>

                        <TableCell>{visitor.phone}</TableCell>
                        <TableCell>{visitor.email}</TableCell>
                        <TableCell>{visitor.gender}</TableCell>
                        <TableCell>{visitor.address}</TableCell>
                        <TableCell
                          sx={{
                            position: 'sticky',
                            right: 0,
                            background: 'white',
                            zIndex: 2,
                            gap: 1,
                            alignItems: 'center',
                            width: 150, // Fixed width
                            minWidth: 150,
                            maxWidth: 150,
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
              {/* Pagination */}
              <TablePagination
                component="div"
                count={visitorTotalCount}
                page={page}
                rowsPerPage={rowsPerPage}
                onPageChange={handleChangePage}
                rowsPerPageOptions={[5, 10, 25]}
                onRowsPerPageChange={handleChangeRowsPerPage}
              />
            </BlankCard>
          )}
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
          <Button
            onClick={handleConfirmDelete}
            color={isLoading ? 'primary' : 'error'}
            disabled={isLoading}
            startIcon={isLoading ? <CircularProgress size={20} /> : null}
          >
            {isLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
};

export default VisitorList;
