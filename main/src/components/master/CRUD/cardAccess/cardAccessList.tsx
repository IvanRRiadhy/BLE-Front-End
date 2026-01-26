import { BASE_URL } from 'src/utils/axios';
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
  TableSortLabel,
  Skeleton,
  CircularProgress,
} from '@mui/material';
import BlankCard from 'src/components/shared/BlankCard';
import { IconTrash } from '@tabler/icons-react';
import { RootState, AppDispatch, useSelector, useDispatch } from 'src/store/Store';
import {
  CardAccessType,
  UpdateFilter,
  deleteCardAccess,
  fetchCardAccessDT,
} from 'src/store/apps/crud/cardAccess';

// import AddEditCardAccess from './AddEditCardAccess';
import { defaultCardAccessFilter } from 'src/store/apps/defaultForm';
import AddEditCardAccess from './AddEditCardAccess';
import toast from 'react-hot-toast';
import { useCardAccessList } from 'src/hooks/useCardAccess';

const columns = [
  { label: 'Access Name', field: 'Name', sortAble: true },
  { label: 'Description', field: 'Remarks', sortAble: false },
  { label: 'Access Number', field: 'AccessNumber', sortAble: true },
  { label: 'Allowed Areas', field: '', sortAble: false },
];

const SKELETON_ROWS = 5;

const CardAccessList = () => {
  const dispatch: AppDispatch = useDispatch();
  const cardAccessFilter = useSelector(
    (state: RootState) => state.CardAccessReducer.cardAccessFilter,
  );
  const { data, isLoading: queryLoading } = useCardAccessList(cardAccessFilter);
  const cardAccessData = data?.data || [];
  const cardAccessTotalCount = data?.recordsTotal || 0;
  const cardAccessFilteredCount = data?.recordsFiltered || 0;
  const isLoading = useSelector((state: RootState) => state.CardAccessReducer.isLoading);
  const hasLoaded = useSelector((state: RootState) => state.CardAccessReducer.hasLoaded);

  //Pagination State
  const page = Math.floor(cardAccessFilter.Start / cardAccessFilter.Length);
  const rowsPerPage = cardAccessFilter.Length;
  const orderBy = cardAccessFilter.SortColumn;
  const order = cardAccessFilter.SortDir;

  const handleChangePage = (_: unknown, newPage: number) => {
    dispatch(UpdateFilter({ Start: newPage * cardAccessFilter.Length }));
  };
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newLength = parseInt(event.target.value, 10);
    dispatch(UpdateFilter({ Length: newLength, Start: 0 }));
  };
  const handleSort = (column: string) => {
    const isAsc = cardAccessFilter.SortColumn === column && cardAccessFilter.SortDir === 'asc';
    const isDesc = cardAccessFilter.SortColumn === column && cardAccessFilter.SortDir === 'desc';

    if (isDesc) {
      dispatch(
        UpdateFilter({
          SortColumn: 'name',
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

  // useEffect(() => {
  //   dispatch(UpdateFilter(defaultCardAccessFilter));
  //   try {
  //     dispatch(fetchCardAccessDT(defaultCardAccessFilter));
  //   } catch (error) {
  //     console.error('Error fetching data: ', error);
  //   }
  // }, [dispatch]);

  // useEffect(() => {
  //   dispatch(fetchCardAccessDT(cardAccessFilter));
  // }, [cardAccessFilter, dispatch]);

  //Delete Pop-up
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCardAccess, setSelectedCardAccess] = useState<CardAccessType | null>(null);
  // Open delete confirmation dialog
  const handleOpenDeleteDialog = (ca: CardAccessType) => {
    setSelectedCardAccess(ca);
    setDeleteDialogOpen(true);
  };

  // Close delete confirmation dialog
  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setSelectedCardAccess(null);
  };

  // Confirm delete action
  const handleConfirmDelete = async () => {
    if (selectedCardAccess) {
      try {
        const result = await dispatch(deleteCardAccess(selectedCardAccess.id));
        if (result && result.type && result.type.endsWith('/fulfilled')) {
          await dispatch(fetchCardAccessDT(cardAccessFilter));
          toast.success('Data Deleted');
        }
      } catch (error) {
        toast.error('Delete Data Unsuccessful');
        console.error('Error deleting Card Access:', error);
      }
    }
    handleCloseDeleteDialog();
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
              background: 'white',
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
            <Skeleton variant="text" width={180} height={22} />
          </TableCell>
          <TableCell>
            <Skeleton variant="text" width={160} height={22} />
          </TableCell>

          {/* right actions */}
          <TableCell
            sx={{
              position: 'sticky',
              right: 0,
              background: 'white',
              zIndex: 2,
              width: 150,
              minWidth: 150,
              maxWidth: 150,
            }}
          >
            <Box display="flex" gap={1}>
              <Skeleton variant="rounded" width={90} height={32} />
              {/* <Skeleton variant="circular" width={32} height={32} />
                    <Skeleton variant="circular" width={32} height={32} /> */}
            </Box>
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
            <TableContainer  sx={{
              maxHeight: '55vh',
            }}>
              <Table stickyHeader aria-label="simple table" sx={{ whiteSpace: 'nowrap' }}>
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
                        zIndex: 1,
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
                  {queryLoading
                    ? renderSkeletonRows(rowsPerPage || SKELETON_ROWS)
                    : cardAccessData.map((cardAccess: CardAccessType, index: number) => (
                        <TableRow key={index}>
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
                          <TableCell>{cardAccess.name}</TableCell>
                          <TableCell>{cardAccess.remarks}</TableCell>
                          <TableCell>{cardAccess.accessNumber}</TableCell>
                          <TableCell>{cardAccess.maskedAreaIds?.length ?? 0}</TableCell>
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
                            <AddEditCardAccess cardAccess={cardAccess} type="edit" />
                            <IconButton
                              color="error"
                              size="small"
                              onClick={() => handleOpenDeleteDialog(cardAccess)}
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
              count={cardAccessFilteredCount}
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
            Are you sure you want to delete the card access{' '}
            <strong>{selectedCardAccess?.name}</strong>?
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

export default CardAccessList;
