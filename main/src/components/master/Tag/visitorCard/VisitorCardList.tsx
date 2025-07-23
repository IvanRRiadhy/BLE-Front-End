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
import { RootState, AppDispatch, useDispatch, useSelector } from 'src/store/Store';
import { VisitorCardType, UpdateFilter, fetchVisitorCard } from 'src/store/apps/crud/visitorCard';

const columns = [
  { label: 'Name', field: 'name', sortAble: true },
  { label: 'Mac Address', field: 'mac', sortAble: false },
  { label: 'Card Type', field: 'cardType', sortAble: true },
  { label: 'Card Number', field: 'number', sortAble: true },
  { label: 'Check-in Status', field: 'checkinStatus', sortAble: true },
  { label: 'Sites', field: 'siteId', sortAble: false },
  { label: 'Is Member', field: 'isMember', sortAble: true },
];

const VisitorCardList = () => {
  const dispatch: AppDispatch = useDispatch();
  const visitorCardData: VisitorCardType[] = useSelector(
    (state: RootState) => state.VisitorCardReducer.visitorCardAll,
  );
  const visitorCardFilteredCount = useSelector(
    (state: RootState) => state.VisitorCardReducer.visitorCardFilteredCount,
  );
  const visitorCardFilter = useSelector(
    (state: RootState) => state.VisitorCardReducer.visitorCardFilter,
  );
  // Pagination State
  const page = Math.floor(visitorCardFilter.Start / visitorCardFilter.Length);
  const rowsPerPage = visitorCardFilter.Length;
  const orderBy = visitorCardFilter.SortColumn;
  const order = visitorCardFilter.SortDir;
  const handleChangePage = (_: unknown, newPage: number) => {
    dispatch(UpdateFilter({ Start: newPage * visitorCardFilter.Length }));
  };
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newLength = parseInt(event.target.value, 10);
    dispatch(UpdateFilter({ Length: newLength, Start: 0 }));
  };
  const handleSort = (column: string) => {
    const isAsc = visitorCardFilter.SortColumn === column && visitorCardFilter.SortDir === 'asc';
    dispatch(
      UpdateFilter({
        SortColumn: column,
        SortDir: isAsc ? 'desc' : 'asc',
        Start: 0,
      }),
    );
  };

  useEffect(() => {
    dispatch(fetchVisitorCard());
  }, [visitorCardFilter, dispatch]);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedVisitorCard, setSelectedVisitorCard] = useState<VisitorCardType | null>(null);

  const handleOpenDeleteDialog = (card: VisitorCardType) => {
    setSelectedVisitorCard(card);
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setSelectedVisitorCard(null);
    setDeleteDialogOpen(false);
  };
  const handleConfirmDelete = () => {
    if (selectedVisitorCard) {
      // dispatch(deleteOrganization(selectedVisitorCard.id));
    }
    handleCloseDeleteDialog();
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
                  {visitorCardData.map((visitorCard, index) => (
                    <TableRow key={visitorCard.id}>
                      <TableCell
                        sx={{ position: 'sticky', left: 0, background: 'white', zIndex: 1 }}
                      >
                        {index + 1 + page * rowsPerPage}
                      </TableCell>
                      <TableCell>{visitorCard.name}</TableCell>
                      <TableCell>{visitorCard.mac}</TableCell>
                      <TableCell>{visitorCard.cardType}</TableCell>
                      <TableCell>{visitorCard.number}</TableCell>
                      <TableCell>{visitorCard.checkinStatus}</TableCell>
                      <TableCell>{visitorCard.siteId || 'N/A'}</TableCell>
                      <TableCell>{visitorCard.isMember ? 'Yes' : 'No'}</TableCell>

                      <TableCell
                        sx={{ position: 'sticky', right: 0, background: 'white', zIndex: 1 }}
                      >
                        <IconButton
                          color="error"
                          onClick={() => handleOpenDeleteDialog(visitorCard)}
                          size="small"
                        >
                          <IconTrash />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </BlankCard>
        </Box>
        {/* Pagination */}
        <TablePagination
          component="div"
          count={visitorCardFilteredCount}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={handleChangePage}
          rowsPerPageOptions={[5, 10, 25]}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Grid>
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the Visitor Card <strong>{selectedVisitorCard?.name}</strong>?
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

export default VisitorCardList;
