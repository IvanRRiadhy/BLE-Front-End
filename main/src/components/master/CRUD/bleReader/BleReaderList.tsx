import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router';
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
  Button,
  DialogActions,
  TableSortLabel,
  Checkbox,
  Skeleton,
  Tooltip,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import BlankCard from 'src/components/shared/BlankCard';
import { IconCheck, IconCircleCheck, IconCircleX, IconEye, IconTrash, IconX } from '@tabler/icons-react';
import { defaultBleReaderFilter } from 'src/store/apps/defaultForm';
import AddEditBleReader from './AddEditBleReader';
import BulkAddEditBleReader from './BulkAddEditBleReader';
import toast from 'react-hot-toast';
import { useReaderList, useDeleteReader } from 'src/hooks/useReader';
import { useAllBrands } from 'src/hooks/useBrand'; // optional if you migrate brand too
import { RootState, useDispatch, useSelector } from 'src/store/Store';
import { UpdateFilter } from 'src/store/apps/crud/bleReader';
import { ReaderHealthCard } from 'src/components/master/Reports/ReaderHealthReport/ReaderHealthReportList';

const columns = [
  { label: 'Brand Name', field: 'Brand.Name', sortAble: true },
  { label: 'Name', field: 'Name', sortAble: true },
  { label: 'IP', field: 'Ip', sortAble: true },
  { label: 'MAC', field: 'Gmac', sortAble: false },
];

const SKELETON_ROWS = 5;

const BleReaderList = () => {
  const dispatch = useDispatch();
  const location = useLocation();

  // 🔹 Local filter state (instead of Redux)
  const [filter, setFilter] = useState(defaultBleReaderFilter);
  const bleReaderFilter = useSelector((state: RootState) => state.bleReaderReducer.bleReaderFilter);
  const readerHealthByTopic = useSelector((state: RootState) => state.ReaderHealthReducer.readerHealthByTopic);

  useEffect(() => {
    const initialFilter = location.state?.readerName
      ? { ...defaultBleReaderFilter, SearchValue: location.state.readerName }
      : defaultBleReaderFilter;

    dispatch(UpdateFilter(initialFilter));
  }, [dispatch, location.state?.readerName]);

  // 🔹 React Query hooks
  const { data, isFetching, isLoading, isFetched, refetch } = useReaderList(bleReaderFilter);
  const deleteMutation = useDeleteReader();
  const { data: brandData = [] } = useAllBrands?.() || { data: [] };

  // 🔹 Derived values
  const bleReaderData = data?.data || [];
  const totalCount = data?.recordsFiltered || 0;
  const currentPageIds = useMemo(() => bleReaderData.map((x) => x.id), [bleReaderData]);

  // 🔹 Multi-select & Batch Delete State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteItems, setDeleteItems] = useState<
    Array<{
      id: string;
      name: string;
      gmac?: string;
      selected: boolean;
      status: 'idle' | 'loading' | 'success' | 'error';
      errorMessage?: string;
    }>
  >([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDone, setIsDeleteDone] = useState(false);

  // 🔹 Health Dialog state
  const [healthDialogOpen, setHealthDialogOpen] = useState(false);
  const [selectedReader, setSelectedReader] = useState<any>(null);

  // 🔹 Pagination and sorting
  const page = Math.floor(bleReaderFilter.Start / bleReaderFilter.Length);
  const rowsPerPage = bleReaderFilter.Length;
  const orderBy = bleReaderFilter.SortColumn;
  const order = bleReaderFilter.SortDir;

  const handleChangePage = (_: unknown, newPage: number) => {
    dispatch(UpdateFilter({ Start: newPage * bleReaderFilter.Length }));
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newLength = parseInt(event.target.value, 10);
    dispatch(UpdateFilter({ Start: 0, Length: newLength }));
  };

  const handleSort = (column: string) => {
    const isAsc = bleReaderFilter.SortColumn === column && bleReaderFilter.SortDir === 'asc';
    const isDesc = bleReaderFilter.SortColumn === column && bleReaderFilter.SortDir === 'desc';

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

  // 🔹 Delete handling
  const handleOpenDeleteDialog = (ids: string[] | string) => {
    const idList = Array.isArray(ids) ? ids : [ids];
    const items = idList.map((id) => {
      const reader = bleReaderData.find((r) => r.id === id);
      return {
        id,
        name: reader?.name || `Reader (${id})`,
        gmac: reader?.gmac,
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
      toast.success(`Successfully deleted ${successCount} reader(s)`);
    }
  };


  // 🔹 Health Dialog handling
  const handleOpenHealthDialog = (ble: any) => {
    setSelectedReader(ble);
    setHealthDialogOpen(true);
  };

  const handleCloseHealthDialog = () => {
    setHealthDialogOpen(false);
    setSelectedReader(null);
  };

  const getReaderHealthData = (gmac: string) => {
    if (!gmac) return null;
    const now = Math.floor(Date.now() / 1000);
    const oneMinuteAgo = now - 60;

    const health = readerHealthByTopic[gmac] || 
                   readerHealthByTopic[gmac.toLowerCase()] || 
                   readerHealthByTopic[gmac.toUpperCase()];

    let status = 'Non-Active';
    if (health && health.utc >= oneMinuteAgo) {
      status = health.msg || 'alive';
    }

    const isWarning = status !== 'Non-Active' && (
      (health?.temp ?? 0) >= 50 ||
      (health?.load ?? 0) >= 0.6 ||
      (health?.mem_free ?? 100) <= 15
    );

    return {
      ...health,
      gmac: gmac,
      wanIP: selectedReader?.ip || health?.wanIP || '-',
      msg: status,
      temp: status === 'Non-Active' ? 0 : (health?.temp ?? 0),
      load: status === 'Non-Active' ? 0 : (health?.load ?? 0),
      mem_free: status === 'Non-Active' ? 0 : (health?.mem_free ?? 0),
      uptime: status === 'Non-Active' ? 0 : (health?.uptime ?? 0),
      ver: health?.ver || '-',
      blever: health?.blever || '-',
      lowVoltage: health?.lowVoltage ?? 0,
      utc: health?.utc ?? 0,
      isWarning,
    };
  };

  const getBrandName = (brandID: string) => {
    const brand = brandData.find((b: any) => b.id === brandID);
    return brand ? brand.name : 'Unknown Brand';
  };

  // 🔹 Skeleton loader rows
  const renderSkeletonRows = (rows: number) =>
    Array.from({ length: rows }).map((_, i) => (
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
          <Skeleton variant="text" width={160} height={22} />
        </TableCell>
        <TableCell>
          <Skeleton variant="text" width={120} height={22} />
        </TableCell>
        <TableCell>
          <Skeleton variant="text" width={120} height={22} />
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
          <Skeleton variant="rounded" width={100} height={32} />
        </TableCell>
      </TableRow>
    ));

  // 🔹 For BulkEdit selected rows
  const selectedData = bleReaderData.filter((x) => selectedIds.has(x.id));

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
                  // py: 1,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderTopLeftRadius: 8,
                  borderTopRightRadius: 8,
                }}
              >
                <Typography>{selectedIds.size} item(s) selected</Typography>
                <Box display="flex" gap={1}>
                  <BulkAddEditBleReader
                    type="edit"
                    initialData={selectedData}
                    setSelectedIds={setSelectedIds}
                  />
                  <Tooltip title="Multi-Delete">
                    <IconButton
                      color="default"
                      onClick={() => handleOpenDeleteDialog(Array.from(selectedIds))}
                    >
                      <IconTrash size={20} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Cancel">
                    <IconButton color="default" onClick={() => setSelectedIds(new Set())}>
                      <IconX size={20} />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            )}

            {/* --- Table --- */}
            <TableContainer
              sx={{
                maxHeight: '55vh',
              }}
            >
              <Table stickyHeader sx={{ whiteSpace: 'nowrap' }}>
                <TableHead>
                  <TableRow>
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
                        {col.sortAble ? (
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

                    <TableCell
                      sx={{
                        position: 'sticky',
                        right: 0,
                        backgroundColor: 'background.paper',
                        zIndex: 2,
                        width: 150, // Fixed width
                        minWidth: 150,
                        maxWidth: 150,
                      }}
                    >
                      <Typography variant="h6">Actions</Typography>
                    </TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {isLoading || isFetching
                    ? renderSkeletonRows(rowsPerPage || SKELETON_ROWS)
                    : bleReaderData.map((ble, index) => (
                        <TableRow key={ble.id}>
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
                                checked={selectedIds.has(ble.id)}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setSelectedIds((prev) => {
                                    const updated = new Set(prev);
                                    if (checked) updated.add(ble.id);
                                    else updated.delete(ble.id);
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
                          <TableCell>{ble.brand?.name}</TableCell>
                          <TableCell>{ble.name}</TableCell>
                          <TableCell>{ble.ip}</TableCell>
                          <TableCell>{ble.gmac}</TableCell>
                          <TableCell
                            sx={{
                              position: 'sticky',
                              right: 0,
                              backgroundColor: 'background.paper',
                              zIndex: 1,
                              gap: 1,
                              alignItems: 'center',
                              width: 150, // Fixed width
                              minWidth: 150,
                              maxWidth: 150,
                            }}
                          >
                            <AddEditBleReader type="edit" bleReader={ble} />
                            <Tooltip title="View Reader Health" arrow>
                              <IconButton
                                color="primary"
                                onClick={() => handleOpenHealthDialog(ble)}
                              >
                                <IconEye size={20} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete Reader" arrow>
                              <IconButton
                                color="error"
                                onClick={() => handleOpenDeleteDialog(ble.id)}
                              >
                                <IconTrash size={20} />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* --- Pagination --- */}
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={totalCount}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </BlankCard>
        </Box>
      </Grid>

      {/* --- Reader Health Dialog --- */}
      <Dialog 
        open={healthDialogOpen} 
        onClose={handleCloseHealthDialog}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { borderRadius: '20px' }
        }}
      >
        <DialogTitle sx={{ pb: 0 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h5" fontWeight="bold">Reader Health Details</Typography>
            <IconButton onClick={handleCloseHealthDialog}>
              <IconX size={24} />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {selectedReader && (
            <Box mt={2}>
              <ReaderHealthCard data={getReaderHealthData(selectedReader.gmac)} />
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* --- Delete Confirmation --- */}
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
                  {item.gmac && (
                    <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                      ({item.gmac})
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
    </Grid>
  );
};

export default BleReaderList;


