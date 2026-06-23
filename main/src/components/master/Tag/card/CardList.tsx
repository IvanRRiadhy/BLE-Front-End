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
} from '@mui/material';
import BlankCard from 'src/components/shared/BlankCard';
import { IconLogout2, IconTrash } from '@tabler/icons-react';
import { RootState, AppDispatch, useDispatch, useSelector } from 'src/store/Store';
import { CardType, UpdateFilter, fetchCard, fetchCardDT } from 'src/store/apps/crud/card';
import AddEditCard from './AddEditCard';
import { defaultCardFilter } from 'src/store/apps/defaultForm';
import { MaskedAreaType } from 'src/store/apps/crud/maskedArea';
import { useCardList, useDeleteCard, useReleaseCard } from 'src/hooks/useCard';
import toast from 'react-hot-toast';

const columns = [
  { label: 'Name', field: 'Name', sortAble: true },
  { label: 'Remarks', field: 'Remarks', sortAble: false },
  // { label: 'Card Type', field: 'CardType', sortAble: true },
  { label: 'Card Number', field: 'CardNumber', sortAble: true },
  { label: 'MAC Address', field: 'dmac', sortAble: false},
  // { label: 'Registered Site', field: 'RegisteredSite', sortAble: false },
  { label: 'Active', field: 'IsUsed', sortAble: true },
  { label: 'Last Used By', field: 'LastUsed', sortAble: false },
];

const CardList = () => {
  const dispatch: AppDispatch = useDispatch();
  // const cardData: CardType[] = useSelector((state: RootState) => state.CardReducer.cards);
  // const areaData: MaskedAreaType[] = useSelector((state: RootState) => state.maskedAreaReducer.maskedAreaAll);
  // const cardFilteredCount = useSelector((state: RootState) => state.CardReducer.cardFilteredCount);
  const cardFilter = useSelector((state: RootState) => state.CardReducer.cardFilter);
  const { data, isLoading: queryLoading } = useCardList(cardFilter);
  const cardData = data?.data || [];
  const cardFilteredCount = data?.recordsFiltered || 0;
  const prevFilterRef = useRef(cardFilter);
  // const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  // Pagination State
  const page = Math.floor(cardFilter.Start / cardFilter.Length);
  const rowsPerPage = cardFilter.Length;
  const orderBy = cardFilter.SortColumn;
  const order = cardFilter.SortDir;

  const handleChangePage = (_: unknown, newPage: number) => {
    dispatch(UpdateFilter({ Start: newPage * cardFilter.Length }));
  };
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newLength = parseInt(event.target.value, 10);
    dispatch(UpdateFilter({ Length: newLength, Start: 0 }));
  };
  const handleSort = (column: string) => {
    const isAsc = cardFilter.SortColumn === column && cardFilter.SortDir === 'asc';
    const isDesc = cardFilter.SortColumn === column && cardFilter.SortDir === 'desc';

    if (isDesc) {
      dispatch(
        UpdateFilter({
          SortColumn: 'updatedAt',
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
    dispatch(UpdateFilter(defaultCardFilter));
    // try {
    //   setLoading(true);
    //   dispatch(fetchCardDT(defaultCardFilter));
    // } catch (error) {
    //   console.log(error);
    // }
    // setTimeout(() => {
    //   setLoading(false);
    // }, 500);
  }, [dispatch]);

  // useEffect(() => {
  //   const prevFilter = prevFilterRef.current;
  //   const isStartOrLengthChanged =
  //     prevFilter.Start !== cardFilter.Start || prevFilter.Length !== cardFilter.Length;
  //   if (isStartOrLengthChanged) {
  //     setLoading(true);
  //   }
  //   dispatch(fetchCardDT(cardFilter)).finally(() => {
  //     if (isStartOrLengthChanged) {
  //       setTimeout(() => {
  //         setLoading(false);
  //       }, 500);
  //     }
  //   });
  //   prevFilterRef.current = cardFilter;
  // }, [cardFilter, dispatch]);

  //Delete Pop-up
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCard, setselectedCard] = useState<CardType | null>(null);
  const deleteMutation = useDeleteCard();
  // Open delete confirmation dialog
  const handleOpenDeleteDialog = (card: CardType) => {
    setselectedCard(card);
    setDeleteDialogOpen(true);
  };

  // Close delete confirmation dialog
  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setselectedCard(null);
  };

  // Confirm delete action
  const handleConfirmDelete = async () => {
    if (selectedCard) {
      try {
        await deleteMutation.mutateAsync(selectedCard.id);
        toast.success('Data Deleted');
      } catch (error) {
        toast.error('Delete failed');
        console.error(error);
      }
    }
    handleCloseDeleteDialog();
  };

  //Release Pop-up
  const [releasePopupOpen, setReleasePopupOpen] = useState(false);
  const releaseMutation = useReleaseCard();
  //Open release pop-up
  const handleOpenReleasePopup = (card: CardType) => {
    setselectedCard(card);
    setReleasePopupOpen(true);
  };

  // Close release pop-up
  const handleCloseReleasePopup = () => {
    setReleasePopupOpen(false);
    setselectedCard(null);
  };

  // Confirm release action
  const handleConfirmRelease = async () => {
    if (selectedCard) {
      try {
        await releaseMutation.mutateAsync(selectedCard.id);
        toast.success('Card Released');
      } catch (error) {
        toast.error('Release failed');
        console.error(error);
      }
    }
    handleCloseReleasePopup();
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
                    <TableCell sx={{ position: 'sticky', left: 0, backgroundColor: 'background.paper', zIndex: 2 }}>
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
                      sx={{ position: 'sticky', right: 0, backgroundColor: 'background.paper', zIndex: 2 }}
                    >
                      <Typography variant="h6"> Actions </Typography>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cardData.map((card, index) => (
                    <TableRow key={card.id}>
                      <TableCell
                        sx={{ position: 'sticky', left: 0, backgroundColor: 'background.paper', zIndex: 1 }}
                      >
                        {index + 1 + page * rowsPerPage}
                      </TableCell>
                      <TableCell>{card.name}</TableCell>
                      <TableCell
                        sx={{ whiteSpace: 'normal', wordBreak: 'break-word', maxWidth: 240 }}
                      >
                        {card.remarks}
                      </TableCell>
                      {/* <TableCell>{card.cardType}</TableCell> */}
                      <TableCell>{card.cardNumber}</TableCell>
                      <TableCell>{card.dmac}</TableCell>
                      {/* <TableCell>{card.isMultiMaskedArea ? 'Multi-Area' : 'Single-Area'}</TableCell> */}
                      <TableCell>{card.isUsed ? 'Yes' : 'No'}</TableCell>
                      <TableCell>{card.lastUsed || 'N/A'}</TableCell>
                      <TableCell
                        sx={{ position: 'sticky', right: 0, backgroundColor: 'background.paper', zIndex: 1 }}
                      >
                        <AddEditCard type="edit" card={card} />
                        <IconButton
                          color="error"
                          onClick={() => handleOpenDeleteDialog(card)}
                          size="small"
                        >
                          <IconTrash />
                        </IconButton>
                        {card.isUsed && (
                          <IconButton
                            color="error"
                            onClick={() => handleOpenReleasePopup(card)}
                            size="small"
                          >
                            <IconLogout2 />
                          </IconButton>
                        )}
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
          count={cardFilteredCount}
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
            Are you sure you want to delete the Card <strong>{selectedCard?.name}</strong>?
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
            {/* Delete Release Dialog */}
      <Dialog open={releasePopupOpen} onClose={handleCloseReleasePopup}>
        <DialogTitle>Confirm Card Release</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to release the Card <strong>{selectedCard?.name}</strong> from its user <strong>{selectedCard?.lastUsed}</strong>?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseReleasePopup} color="primary">
            Cancel
          </Button>
          <Button onClick={handleConfirmRelease} color="error">
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
};

export default CardList;
