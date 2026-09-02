import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  DialogActions,
  Button,
  DialogContentText,
  TableSortLabel,
  CircularProgress,
  Skeleton,
  Collapse,
  Paper,
  Tooltip,
  Checkbox,
  List,
  ListItem,
} from '@mui/material';
import BlankCard from 'src/components/shared/BlankCard';
import {
  IconTrash,
  IconChevronDown,
  IconChevronRight,
  IconPlus,
  IconExternalLink,
  IconX,
  IconCheck,
  IconCircleCheck,
  IconCircleX,
} from '@tabler/icons-react';
import { RootState, AppDispatch, useSelector, useDispatch } from 'src/store/Store';
import { BrandType, UpdateFilter } from 'src/store/apps/crud/brand';
import AddEditBrand from './AddEditBrand';
import { defaultBrandFilter } from 'src/store/apps/defaultForm';
import toast from 'react-hot-toast';
import { useBrandList, useDeleteBrand } from 'src/hooks/useBrand';
import { useAllReaders, useDeleteReader } from 'src/hooks/useReader';
import { useNavigate } from 'react-router';
import AddEditBleReader from '../bleReader/AddEditBleReader';
import { bleReaderType, SelectBleReader } from 'src/store/apps/crud/bleReader';

const columns = [
  { label: 'Brand Name', field: 'Name', sortAble: true },
  { label: 'Tag', field: 'Tag', sortAble: true },
];

const ReaderTable = ({
  readers,
  onDeleteClick,
}: {
  readers: bleReaderType[];
  onDeleteClick: (reader: bleReaderType) => void;
}) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  return (
    <TableContainer sx={{ maxHeight: '250px', overflowY: 'auto' }}>
      <Table size="small" stickyHeader aria-label="sticky table">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 600, width: 80, bgcolor: 'action.hover' }}>No</TableCell>
            <TableCell sx={{ fontWeight: 600, bgcolor: 'action.hover' }}>Reader Name</TableCell>
            <TableCell align="right" sx={{ fontWeight: 600, width: 120, bgcolor: 'action.hover' }}>
              Actions
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {readers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3}>
                <Typography variant="body2" color="text.secondary">
                  No readers registered for this brand.
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            readers.map((reader, i) => (
              <TableRow key={reader.id}>
                <TableCell>{i + 1}</TableCell>
                <TableCell>{reader.name}</TableCell>
                <TableCell align="right">
                  <Box display="flex" justifyContent="flex-end" alignItems="center" gap={1}>
                    <AddEditBleReader type="edit" bleReader={reader} fixedBrandId={reader.brandId} />
                    <Tooltip title="View Reader" arrow>
                      <IconButton
                        color="primary"
                        size="small"
                        onClick={() => {
                          dispatch(SelectBleReader(reader.id));
                          navigate('/master/blereader', { state: { readerName: reader.name } });
                        }}
                      >
                        <IconExternalLink size={18} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Reader" arrow>
                      <IconButton
                        color="error"
                        size="small"
                        onClick={() => onDeleteClick(reader)}
                      >
                        <IconTrash size={18} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

const BrandAccordionContent = ({
  readers,
  brandId,
  onDeleteClick,
}: {
  readers: bleReaderType[];
  brandId: string;
  onDeleteClick: (reader: bleReaderType) => void;
}) => {
  return (
    <Paper variant="outlined" sx={{ p: 2, bgcolor: 'action.hover', my: 1 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="subtitle1" fontWeight={700}>
          BLE Readers
        </Typography>
        <AddEditBleReader
          type="add"
          fixedBrandId={brandId}
          trigger={(onClick) => (
            <Button
              variant="contained"
              color="primary"
              size="small"
              startIcon={<IconPlus size={16} />}
              onClick={onClick}
            >
              Add Reader
            </Button>
          )}
        />
      </Box>
      <ReaderTable readers={readers} onDeleteClick={onDeleteClick} />
    </Paper>
  );
};

const SKELETON_ROWS = 5;

const BrandList = () => {
  const dispatch: AppDispatch = useDispatch();
  const brandFilter = useSelector((state: RootState) => state.brandReducer.brandFilter);
  const { data, isLoading: queryLoading, isFetching, refetch } = useBrandList(brandFilter);
  const brandData = data?.data || [];
  const brandFilteredCount = data?.recordsFiltered || 0;
  const currentPageIds = useMemo(() => brandData.map((x) => x.id), [brandData]);

  // 🔹 Multi-select & Batch Delete State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteItems, setDeleteItems] = useState<
    Array<{
      id: string;
      name: string;
      tag?: string;
      selected: boolean;
      status: 'idle' | 'loading' | 'success' | 'error';
      errorMessage?: string;
    }>
  >([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDone, setIsDeleteDone] = useState(false);

  // Pagination State
  const page = Math.floor(brandFilter.Start / brandFilter.Length);
  const rowsPerPage = brandFilter.Length;
  const orderBy = brandFilter.SortColumn;
  const order = brandFilter.SortDir;

  const { data: readerData = [] } = useAllReaders();

  const handleChangePage = (_: unknown, newPage: number) => {
    dispatch(UpdateFilter({ Start: newPage * brandFilter.Length }));
  };
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newLength = parseInt(event.target.value, 10);
    dispatch(UpdateFilter({ Length: newLength, Start: 0 }));
  };
  const handleSort = (column: string) => {
    const isAsc = brandFilter.SortColumn === column && brandFilter.SortDir === 'asc';
    const isDesc = brandFilter.SortColumn === column && brandFilter.SortDir === 'desc';

    if (isDesc) {
      dispatch(
        UpdateFilter({
          SortColumn: 'Name',
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
    dispatch(UpdateFilter(defaultBrandFilter));
  }, [dispatch]);

  const isChildShown = useSelector((state: RootState) => state.customizer.isChildShown);
  const [expandedBrandId, setExpandedBrandId] = useState<string | null>(null);

  const toggleExpand = (brandId: string) => {
    setExpandedBrandId((prev) => (prev === brandId ? null : brandId));
  };

  // Delete Reader Dialog State
  const [deleteReaderDialogOpen, setDeleteReaderDialogOpen] = useState(false);
  const [selectedReader, setSelectedReader] = useState<bleReaderType | null>(null);
  const deleteReaderMutation = useDeleteReader();

  const handleOpenDeleteReaderDialog = (reader: bleReaderType) => {
    setSelectedReader(reader);
    setDeleteReaderDialogOpen(true);
  };

  const handleCloseDeleteReaderDialog = () => {
    setDeleteReaderDialogOpen(false);
    setSelectedReader(null);
  };

  const handleConfirmDeleteReader = async () => {
    if (selectedReader) {
      try {
        await deleteReaderMutation.mutateAsync(selectedReader.id);
        toast.success('Reader deleted successfully');
      } catch (error) {
        toast.error('Delete failed');
        console.error(error);
      }
    }
    handleCloseDeleteReaderDialog();
  };

  // 🔹 Brand Delete handling
  const deleteMutation = useDeleteBrand();

  const handleOpenDeleteDialog = (ids: string[] | string) => {
    const idList = Array.isArray(ids) ? ids : [ids];
    const items = idList.map((id) => {
      const brand = brandData.find((b) => b.id === id);
      return {
        id,
        name: brand?.name || `Brand (${id})`,
        tag: brand?.tag,
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
      toast.success(`Successfully deleted ${successCount} brand(s)`);
    }
  };

  const renderSkeletonRows = (rows: number) => (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={`skeleton-${i}`}>
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
          <TableCell>
            <Skeleton variant="text" width={180} height={22} />
          </TableCell>
          <TableCell>
            <Skeleton variant="text" width={180} height={22} />
          </TableCell>
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
            <Box display="flex" gap={1}>
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
                    ? renderSkeletonRows(rowsPerPage || SKELETON_ROWS)
                    : brandData.map((brand, index) => {
                        const isOpen = expandedBrandId === brand.id;
                        const brandReaders = (readerData || []).filter(
                          (r) => r.brand?.id?.toLowerCase() === brand.id?.toLowerCase(),
                        );
                        return (
                          <React.Fragment key={brand.id || index}>
                            <TableRow hover>
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
                                    checked={selectedIds.has(brand.id)}
                                    onChange={(e) => {
                                      const checked = e.target.checked;
                                      setSelectedIds((prev) => {
                                        const updated = new Set(prev);
                                        if (checked) updated.add(brand.id);
                                        else updated.delete(brand.id);
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
                              <TableCell>{brand.name}</TableCell>
                              <TableCell>{brand.tag}</TableCell>

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
                                <Box display="flex" alignItems="center" gap={1}>
                                  <AddEditBrand type="edit" brand={brand} />
                                  <Tooltip title="Delete Brand" arrow>
                                    <IconButton
                                      color="error"
                                      size="small"
                                      onClick={() => handleOpenDeleteDialog(brand.id)}
                                    >
                                      <IconTrash size={20} />
                                    </IconButton>
                                  </Tooltip>
                                  {isChildShown && (
                                    <Tooltip title={isOpen ? 'Hide Readers' : 'Show Readers'} arrow>
                                      <IconButton size="small" onClick={() => toggleExpand(brand.id)}>
                                        {isOpen ? <IconChevronDown size={20} /> : <IconChevronRight size={20} />}
                                      </IconButton>
                                    </Tooltip>
                                  )}
                                </Box>
                              </TableCell>
                            </TableRow>
                            {/* ACCORDION ROW */}
                            {isChildShown && (
                              <TableRow>
                                <TableCell colSpan={4} sx={{ p: 0, borderBottom: 0 }}>
                                  <Collapse in={isOpen} timeout="auto" unmountOnExit>
                                    <Box pl={6} pr={2} pb={2}>
                                      <BrandAccordionContent
                                        readers={brandReaders}
                                        brandId={brand.id}
                                        onDeleteClick={handleOpenDeleteReaderDialog}
                                      />
                                    </Box>
                                  </Collapse>
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        );
                      })}
                </TableBody>
              </Table>
            </TableContainer>
            {/* Pagination */}
            <TablePagination
              component="div"
              count={brandFilteredCount}
              page={page}
              rowsPerPage={rowsPerPage}
              onPageChange={handleChangePage}
              rowsPerPageOptions={[5, 10, 25]}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </BlankCard>
        </Box>
      </Grid>

      {/* Delete Brand Confirmation Dialog */}
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
                  {item.tag && (
                    <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                      ({item.tag})
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

      {/* Delete Reader Confirmation Dialog */}
      <Dialog open={deleteReaderDialogOpen} onClose={handleCloseDeleteReaderDialog}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the BLE reader <strong>{selectedReader?.name}</strong>?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteReaderDialog} color="primary">
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDeleteReader}
            color={deleteReaderMutation.isPending ? 'primary' : 'error'}
            disabled={deleteReaderMutation.isPending}
            startIcon={deleteReaderMutation.isPending ? <CircularProgress size={20} /> : null}
          >
            {deleteReaderMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
};

export default BrandList;

