import React, { useEffect, useMemo, useState } from 'react';
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
  Tooltip,
  Skeleton,
  CircularProgress,
  Checkbox,
  List,
  ListItem,
} from '@mui/material';
import BlankCard from 'src/components/shared/BlankCard';
import {
  IconLogout2,
  IconTrash,
  IconBatteryVertical1,
  IconBatteryVertical2,
  IconBatteryVertical3,
  IconPower,
  IconX,
  IconCheck,
  IconCircleCheck,
  IconCircleX,
} from '@tabler/icons-react';
import { RootState, AppDispatch, useDispatch, useSelector } from 'src/store/Store';
import { CardType, UpdateFilter } from 'src/store/apps/crud/card';
import AddEditCard from './AddEditCard';
import { defaultCardFilter } from 'src/store/apps/defaultForm';
import { useCardList, useDeleteCard, usePowerOffCard, useReleaseCard } from 'src/hooks/useCard';
import toast from 'react-hot-toast';

const renderBatteryIndicator = (batteryVal?: number | null) => {
  if (batteryVal === undefined || batteryVal === null) {
    return <Typography variant="body2" color="textSecondary">N/A</Typography>;
  }

  const val = Number(batteryVal);

  if (val <= 35) {
    return (
      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: '#f44336' }}>
        <Box
          component={IconBatteryVertical1}
          sx={{
            animation: 'batteryBreathing 1.5s infinite ease-in-out',
            '@keyframes batteryBreathing': {
              '0%': { opacity: 1 },
              '50%': { opacity: 0.2 },
              '100%': { opacity: 1 },
            },
          }}
        />
        <Typography variant="body2" sx={{ color: '#f44336', fontWeight: 600 }}>
          {val}%
        </Typography>
      </Box>
    );
  }

  if (val <= 69) {
    return (
      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: '#ffb300' }}>
        <IconBatteryVertical2 />
        <Typography variant="body2" sx={{ color: '#ffb300', fontWeight: 600 }}>
          {val}%
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: '#4caf50' }}>
      <IconBatteryVertical3 />
      <Typography variant="body2" sx={{ color: '#4caf50', fontWeight: 600 }}>
        {val}%
      </Typography>
    </Box>
  );
};

const columns = [
  { label: 'Name', field: 'Name', sortAble: true, width: 180 },
  { label: 'Remarks', field: 'Remarks', sortAble: false, width: 260 },
  { label: 'Card Number', field: 'CardNumber', sortAble: true, width: 140 },
  { label: 'MAC Address', field: 'dmac', sortAble: false, width: 180 },
  { label: 'Battery', field: 'battery', sortAble: true, width: 100 },
  { label: 'Active', field: 'IsUsed', sortAble: true, width: 90 },
  { label: 'Last Used By', field: 'LastUsed', sortAble: false, width: 180 },
];

const CardList = () => {
  const dispatch: AppDispatch = useDispatch();
  const cardFilter = useSelector((state: RootState) => state.CardReducer.cardFilter);
  const { data, isLoading: queryLoading, isFetching, refetch } = useCardList(cardFilter);
  const cardData = data?.data || [];
  const cardFilteredCount = data?.recordsFiltered || 0;
  const currentPageIds = useMemo(() => cardData.map((x) => x.id), [cardData]);

  // 🔹 Multi-select & Batch Delete State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteItems, setDeleteItems] = useState<
    Array<{
      id: string;
      name: string;
      cardNumber?: string;
      dmac?: string;
      selected: boolean;
      status: 'idle' | 'loading' | 'success' | 'error';
      errorMessage?: string;
    }>
  >([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDone, setIsDeleteDone] = useState(false);

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
  }, [dispatch]);

  // 🔹 Card Delete handling
  const deleteMutation = useDeleteCard();

  const handleOpenDeleteDialog = (ids: string[] | string) => {
    const idList = Array.isArray(ids) ? ids : [ids];
    const items = idList.map((id) => {
      const card = cardData.find((c) => c.id === id);
      return {
        id,
        name: card?.name || `Card (${id})`,
        cardNumber: card?.cardNumber,
        dmac: card?.dmac,
        selected: true,
        status: 'idle' as const,
      };
    });
    setDeleteItems(items);
    setIsDeleting(false);
    setIsDeleteDone(false);
    setDeleteDialogOpen(true);
  };

  const handleToggleItemSelect = (id: string) => {
    if (isDeleting || isDeleteDone) return;
    setDeleteItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, selected: !item.selected } : item,
      ),
    );
  };

  const handleCloseDeleteDialog = () => {
    if (isDeleting) return;
    setDeleteDialogOpen(false);
    setDeleteItems([]);
    setIsDeleteDone(false);
  };

  const handleConfirmDelete = async () => {
    const activeItems = deleteItems.filter((item) => item.selected);
    if (activeItems.length === 0) {
      toast.error('No items selected for deletion');
      return;
    }

    setIsDeleting(true);
    let successCount = 0;
    let failed = false;
    const successfullyDeletedIds: string[] = [];

    for (const item of deleteItems) {
      if (!item.selected) continue;

      // Set current item to loading
      setDeleteItems((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, status: 'loading' } : it)),
      );

      try {
        await deleteMutation.mutateAsync(item.id);
        successfullyDeletedIds.push(item.id);
        successCount++;
        // Set current item to success
        setDeleteItems((prev) =>
          prev.map((it) => (it.id === item.id ? { ...it, status: 'success' } : it)),
        );
      } catch (error: any) {
        failed = true;
        // Set current item to error
        setDeleteItems((prev) =>
          prev.map((it) =>
            it.id === item.id
              ? { ...it, status: 'error', errorMessage: error?.message || 'Failed to delete' }
              : it,
          ),
        );
        toast.error(`Failed to delete "${item.name}". Stopped remaining deletions.`);
        break; // Stop the whole loop on failure
      }
    }

    // Remove successfully deleted from selectedIds
    if (successfullyDeletedIds.length > 0) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        successfullyDeletedIds.forEach((id) => next.delete(id));
        return next;
      });
      await refetch();
    }

    setIsDeleting(false);
    setIsDeleteDone(true);

    if (!failed && successCount > 0) {
      toast.success(`Successfully deleted ${successCount} card(s)`);
    }
  };

  // 🔹 Release Pop-up
  const [releasePopupOpen, setReleasePopupOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<CardType | null>(null);
  const releaseMutation = useReleaseCard();

  const handleOpenReleasePopup = (card: CardType) => {
    setSelectedCard(card);
    setReleasePopupOpen(true);
  };

  const handleCloseReleasePopup = () => {
    setReleasePopupOpen(false);
    setSelectedCard(null);
  };

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

  // 🔹 PowerOff Pop-up
  const [powerOffPopupOpen, setPowerOffPopupOpen] = useState(false);
  const powerOffMutation = usePowerOffCard();

  const handleOpenPowerOffPopup = (card: CardType) => {
    setSelectedCard(card);
    setPowerOffPopupOpen(true);
  };

  const handleClosePowerOffPopup = () => {
    setPowerOffPopupOpen(false);
    setSelectedCard(null);
  };

  const handleConfirmPowerOff = async () => {
    if (selectedCard) {
      try {
        await powerOffMutation.mutateAsync(selectedCard.id);
        toast.success('Card Powered Off');
      } catch (error) {
        toast.error('Power Off failed');
        console.error(error);
      }
    }
    handleClosePowerOffPopup();
  };

  const renderSkeletonRows = (rows: number) => (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i}>
          <TableCell
            sx={{
              position: 'sticky',
              left: 0,
              backgroundColor: 'background.paper',
              zIndex: 1,
              width: 85,
              minWidth: 85,
              maxWidth: 85,
            }}
          >
            <Box display="flex" alignItems="center" gap={1}>
              <Skeleton variant="rounded" width={22} height={22} />
              <Skeleton variant="text" width={18} />
            </Box>
          </TableCell>
          <TableCell sx={{ width: 180, minWidth: 180, maxWidth: 180 }}>
            <Skeleton variant="text" width="80%" height={22} />
          </TableCell>
          <TableCell sx={{ width: 260, minWidth: 260, maxWidth: 260 }}>
            <Skeleton variant="text" width="90%" height={22} />
          </TableCell>
          <TableCell sx={{ width: 140, minWidth: 140, maxWidth: 140 }}>
            <Skeleton variant="text" width="70%" height={22} />
          </TableCell>
          <TableCell sx={{ width: 180, minWidth: 180, maxWidth: 180 }}>
            <Skeleton variant="text" width="85%" height={22} />
          </TableCell>
          <TableCell sx={{ width: 100, minWidth: 100, maxWidth: 100 }}>
            <Skeleton variant="text" width="60%" height={22} />
          </TableCell>
          <TableCell sx={{ width: 90, minWidth: 90, maxWidth: 90 }}>
            <Skeleton variant="text" width="50%" height={22} />
          </TableCell>
          <TableCell sx={{ width: 180, minWidth: 180, maxWidth: 180 }}>
            <Skeleton variant="text" width="75%" height={22} />
          </TableCell>
          <TableCell
            sx={{
              position: 'sticky',
              right: 0,
              backgroundColor: 'background.paper',
              zIndex: 1,
              width: 150,
              minWidth: 150,
              maxWidth: 150,
            }}
          >
            <Box display="flex" gap={0.5}>
              <Skeleton variant="rounded" width={90} height={32} />
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
            {/* --- Bulk Action Bar --- */}
            {selectedIds.size > 0 && (
              <Box
                sx={{
                  backgroundColor: 'primary.main',
                  color: 'white',
                  px: 2,
                  py: 1,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderTopLeftRadius: 8,
                  borderTopRightRadius: 8,
                }}
              >
                <Typography>{selectedIds.size} item(s) selected</Typography>
                <Box display="flex" gap={1}>
                  <Tooltip title="Multi-Delete">
                    <IconButton
                      color="default"
                      onClick={() => handleOpenDeleteDialog(Array.from(selectedIds))}
                    >
                      <IconTrash size={20} color="white" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Cancel">
                    <IconButton color="default" onClick={() => setSelectedIds(new Set())}>
                      <IconX size={20} color="white" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            )}

            <TableContainer
              sx={{
                maxHeight: '55vh',
              }}
            >
              <Table stickyHeader aria-label="simple table" sx={{ whiteSpace: 'nowrap' }}>
                <TableHead>
                  <TableRow>
                    {/* Left Sticky Checkbox & Index Column */}
                    <TableCell
                      sx={{
                        position: 'sticky',
                        left: 0,
                        backgroundColor: 'background.paper',
                        zIndex: 2,
                        width: 85,
                        minWidth: 85,
                        maxWidth: 85,
                      }}
                    >
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <Checkbox
                          indeterminate={
                            currentPageIds.some((id) => selectedIds.has(id)) &&
                            !currentPageIds.every((id) => selectedIds.has(id))
                          }
                          checked={
                            currentPageIds.length > 0 &&
                            currentPageIds.every((id) => selectedIds.has(id))
                          }
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setSelectedIds((prev) => {
                              const updated = new Set(prev);
                              if (checked) currentPageIds.forEach((id) => updated.add(id));
                              else currentPageIds.forEach((id) => updated.delete(id));
                              return updated;
                            });
                          }}
                          size="small"
                        />
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          #
                        </Typography>
                      </Box>
                    </TableCell>
                    {columns.map((col) => (
                      <TableCell
                        key={col.label}
                        sx={{
                          width: col.width,
                          minWidth: col.width,
                          maxWidth: col.width,
                        }}
                      >
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
                    {/* Right Sticky Actions Column */}
                    <TableCell
                      sx={{
                        position: 'sticky',
                        right: 0,
                        backgroundColor: 'background.paper',
                        zIndex: 2,
                        width: 150,
                        minWidth: 150,
                        maxWidth: 150,
                      }}
                    >
                      <Typography variant="h6">Actions</Typography>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {queryLoading || isFetching
                    ? renderSkeletonRows(rowsPerPage || 5)
                    : cardData.map((card, index) => (
                        <TableRow key={card.id}>
                          <TableCell
                            sx={{
                              position: 'sticky',
                              left: 0,
                              backgroundColor: 'background.paper',
                              zIndex: 1,
                              width: 85,
                              minWidth: 85,
                              maxWidth: 85,
                            }}
                          >
                            <Box display="flex" alignItems="center" gap={0.5}>
                              <Checkbox
                                checked={selectedIds.has(card.id)}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setSelectedIds((prev) => {
                                    const updated = new Set(prev);
                                    if (checked) updated.add(card.id);
                                    else updated.delete(card.id);
                                    return updated;
                                  });
                                }}
                                size="small"
                              />
                              <Typography variant="body2">
                                {index + 1 + page * rowsPerPage}
                              </Typography>
                            </Box>
                          </TableCell>
                          {/* Name */}
                          <TableCell sx={{ width: 180, minWidth: 180, maxWidth: 180 }}>
                            <Tooltip title={card.name || ''} arrow placement="top">
                              <Typography
                                variant="body2"
                                noWrap
                                sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}
                              >
                                {card.name}
                              </Typography>
                            </Tooltip>
                          </TableCell>
                          {/* Remarks */}
                          <TableCell sx={{ width: 260, minWidth: 260, maxWidth: 260 }}>
                            <Tooltip title={card.remarks || ''} arrow placement="top">
                              <Typography
                                variant="body2"
                                noWrap
                                sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}
                              >
                                {card.remarks}
                              </Typography>
                            </Tooltip>
                          </TableCell>
                          {/* Card Number */}
                          <TableCell sx={{ width: 140, minWidth: 140, maxWidth: 140 }}>
                            <Tooltip title={card.cardNumber || ''} arrow placement="top">
                              <Typography
                                variant="body2"
                                noWrap
                                sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}
                              >
                                {card.cardNumber}
                              </Typography>
                            </Tooltip>
                          </TableCell>
                          {/* MAC Address */}
                          <TableCell sx={{ width: 180, minWidth: 180, maxWidth: 180 }}>
                            <Tooltip title={card.dmac || ''} arrow placement="top">
                              <Typography
                                variant="body2"
                                noWrap
                                sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}
                              >
                                {card.dmac}
                              </Typography>
                            </Tooltip>
                          </TableCell>
                          {/* Battery */}
                          <TableCell sx={{ width: 100, minWidth: 100, maxWidth: 100 }}>
                            {renderBatteryIndicator(card.battery)}
                          </TableCell>
                          {/* Active */}
                          <TableCell sx={{ width: 90, minWidth: 90, maxWidth: 90 }}>
                            {card.isUsed ? 'Yes' : 'No'}
                          </TableCell>
                          {/* Last Used By */}
                          <TableCell sx={{ width: 180, minWidth: 180, maxWidth: 180 }}>
                            <Tooltip title={card.lastUsed || 'N/A'} arrow placement="top">
                              <Typography
                                variant="body2"
                                noWrap
                                sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}
                              >
                                {card.lastUsed || 'N/A'}
                              </Typography>
                            </Tooltip>
                          </TableCell>
                          <TableCell
                            sx={{
                              position: 'sticky',
                              right: 0,
                              backgroundColor: 'background.paper',
                              zIndex: 1,
                              width: 150,
                              minWidth: 150,
                              maxWidth: 150,
                            }}
                          >
                            <Box display="flex" alignItems="center" gap={0.5}>
                              <AddEditCard type="edit" card={card} />
                              <Tooltip title="Delete Card" arrow>
                                <IconButton
                                  color="error"
                                  onClick={() => handleOpenDeleteDialog(card.id)}
                                  size="small"
                                >
                                  <IconTrash size={20} />
                                </IconButton>
                              </Tooltip>
                              {card.isUsed && (
                                <Tooltip title="Release Card's Ownership" arrow>
                                  <IconButton
                                    color="error"
                                    onClick={() => handleOpenReleasePopup(card)}
                                    size="small"
                                  >
                                    <IconLogout2 size={20} />
                                  </IconButton>
                                </Tooltip>
                              )}
                              <Tooltip title="Power Off Card" arrow>
                                <IconButton
                                  color="error"
                                  onClick={() => handleOpenPowerOffPopup(card)}
                                  size="small"
                                >
                                  <IconPower size={20} />
                                </IconButton>
                              </Tooltip>
                            </Box>
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

      {/* Delete Card Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={!isDeleting ? handleCloseDeleteDialog : undefined}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: '16px' },
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'error.main' }}>
          <IconTrash size={22} color="#fa896b" />
          <Typography variant="h5" fontWeight="bold">
            Confirm Deletion
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          <DialogContentText sx={{ mb: 2, color: 'text.primary' }}>
            Are you sure you want to delete the following item(s)?
          </DialogContentText>
          <List sx={{ maxHeight: 320, overflow: 'auto', p: 0 }}>
            {deleteItems.map((item, index) => (
              <ListItem
                key={item.id}
                divider={index < deleteItems.length - 1}
                sx={{
                  py: 1,
                  px: 1.5,
                  borderRadius: 1,
                  mb: 0.5,
                  bgcolor: !item.selected ? 'action.hover' : 'background.paper',
                  opacity: !item.selected ? 0.6 : 1,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Box display="flex" alignItems="center" gap={1.5} sx={{ overflow: 'hidden' }}>
                  <Typography
                    variant="subtitle1"
                    sx={{
                      fontWeight: 600,
                      textDecoration: !item.selected ? 'line-through' : 'none',
                      color:
                        item.status === 'error'
                          ? 'error.main'
                          : item.status === 'success'
                          ? 'success.main'
                          : 'text.primary',
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                      overflow: 'hidden',
                    }}
                  >
                    {item.name}
                  </Typography>
                  {item.cardNumber && (
                    <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                      ({item.cardNumber})
                    </Typography>
                  )}
                  {!item.cardNumber && item.dmac && (
                    <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                      ({item.dmac})
                    </Typography>
                  )}
                </Box>

                <Box display="flex" alignItems="center" sx={{ minWidth: 36, justifyContent: 'flex-end' }}>
                  {item.status === 'loading' ? (
                    <CircularProgress size={20} color="primary" />
                  ) : item.status === 'success' ? (
                    <Tooltip title="Successfully deleted">
                      <Box display="flex" alignItems="center" color="success.main">
                        <IconCircleCheck size={24} color="#13deb9" />
                      </Box>
                    </Tooltip>
                  ) : item.status === 'error' ? (
                    <Tooltip title={item.errorMessage || 'Failed to delete'}>
                      <IconButton size="small" color="error">
                        <IconCircleX size={24} color="#fa896b" />
                      </IconButton>
                    </Tooltip>
                  ) : (
                    <Tooltip
                      title={
                        item.selected
                          ? 'Click to exclude from deletion'
                          : 'Click to include in deletion'
                      }
                    >
                      <IconButton
                        size="small"
                        disabled={isDeleting || isDeleteDone}
                        onClick={() => handleToggleItemSelect(item.id)}
                        color={item.selected ? 'primary' : 'default'}
                      >
                        {item.selected ? (
                          <IconCheck size={20} color="#5d87ff" />
                        ) : (
                          <IconX size={20} color="#9e9e9e" />
                        )}
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              </ListItem>
            ))}
          </List>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleCloseDeleteDialog} disabled={isDeleting}>
            {isDeleteDone ? 'Close' : 'Cancel'}
          </Button>
          {!isDeleteDone && (
            <Button
              onClick={handleConfirmDelete}
              color="error"
              variant="contained"
              disabled={isDeleting || deleteItems.filter((i) => i.selected).length === 0}
              startIcon={isDeleting ? <CircularProgress size={18} color="inherit" /> : undefined}
            >
              {isDeleting
                ? 'Deleting...'
                : `Delete (${deleteItems.filter((i) => i.selected).length})`}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Release Dialog */}
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

      {/* Power Off Dialog */}
      <Dialog open={powerOffPopupOpen} onClose={handleClosePowerOffPopup}>
        <DialogTitle>Confirm Card Power Off</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to power off the Card <strong>{selectedCard?.name}</strong>?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePowerOffPopup} color="primary">
            Cancel
          </Button>
          <Button onClick={handleConfirmPowerOff} color="error">
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
};

export default CardList;
