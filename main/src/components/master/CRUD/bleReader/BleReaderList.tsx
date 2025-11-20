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
  DialogContentText,
  Button,
  DialogActions,
  TableSortLabel,
  Checkbox,
  Skeleton,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import BlankCard from 'src/components/shared/BlankCard';
import { IconTrash, IconX } from '@tabler/icons-react';
import { defaultBleReaderFilter } from 'src/store/apps/defaultForm';
import AddEditBleReader from './AddEditBleReader';
import BulkAddEditBleReader from './BulkAddEditBleReader';
import toast from 'react-hot-toast';
import { useReaderList, useDeleteReader } from 'src/hooks/useReader';
import { useAllBrands } from 'src/hooks/useBrand'; // optional if you migrate brand too
import { RootState, useDispatch, useSelector } from 'src/store/Store';
import { UpdateFilter } from 'src/store/apps/crud/bleReader';

const columns = [
  { label: 'Brand Name', field: 'Brand.Name', sortAble: true },
  { label: 'Name', field: 'Name', sortAble: true },
  { label: 'IP', field: 'Ip', sortAble: true },
  { label: 'GMAC', field: 'Gmac', sortAble: false },
];

const SKELETON_ROWS = 5;

const BleReaderList = () => {
  const dispatch = useDispatch();
  // 🔹 Local filter state (instead of Redux)
  const [filter, setFilter] = useState(defaultBleReaderFilter);
  const bleReaderFilter = useSelector((state: RootState) => state.bleReaderReducer.bleReaderFilter);

  // 🔹 React Query hooks
  const { data, isFetching, isLoading, isFetched, refetch } = useReaderList(bleReaderFilter);
  const deleteMutation = useDeleteReader();
  const { data: brandData = [] } = useAllBrands?.() || { data: [] };

  // 🔹 Derived values
  const bleReaderData = data?.data || [];
  const totalCount = data?.recordsFiltered || 0;
  const currentPageIds = useMemo(() => bleReaderData.map((x) => x.id), [bleReaderData]);

  // 🔹 Multi-select
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);

  // 🔹 Pagination and sorting
  const page = Math.floor(filter.Start / filter.Length);
  const rowsPerPage = filter.Length;
  const orderBy = filter.SortColumn;
  const order = filter.SortDir;

  const handleChangePage = (_: unknown, newPage: number) => {
    dispatch(UpdateFilter({ Start: newPage * bleReaderFilter.Length }));
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newLength = parseInt(event.target.value, 10);
    dispatch(UpdateFilter({ Start: 0, Length: newLength }));
  };

  const handleSort = (column: string) => {
    const isAsc = filter.SortColumn === column && filter.SortDir === 'asc';
    const isDesc = filter.SortColumn === column && filter.SortDir === 'desc';

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
    setPendingDeleteIds(Array.isArray(ids) ? ids : [ids]);
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setPendingDeleteIds([]);
  };

  const handleConfirmDelete = async () => {
    if (pendingDeleteIds.length === 0) return;
    try {
      for (const id of pendingDeleteIds) {
        await deleteMutation.mutateAsync(id);
      }
      toast.success(`${pendingDeleteIds.length} BLE Reader(s) deleted`);
      await refetch(); // refresh list
      setSelectedIds(new Set());
    } catch (error) {
      toast.error('Failed to delete reader(s)');
    } finally {
      setDeleteDialogOpen(false);
    }
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
            background: 'white',
            zIndex: 1,
            width: 35,
            minWidth: 35,
            maxWidth: 35,
          }}
        >
          <Skeleton variant="rounded" width={30} height={32} />
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
            background: 'white',
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
            <TableContainer>
              <Table sx={{ whiteSpace: 'nowrap' }}>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox" sx={{ width: 80 }}>
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
                      />
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

                    <TableCell sx={{ width: 150 }}>
                      <Typography variant="h6">Actions</Typography>
                    </TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {isLoading || isFetching
                    ? renderSkeletonRows(rowsPerPage || SKELETON_ROWS)
                    : bleReaderData.map((ble, index) => (
                        <TableRow key={ble.id}>
                          <TableCell>
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
                            />
                            {index + 1 + page * rowsPerPage}
                          </TableCell>
                          <TableCell>{getBrandName(ble.brandId)}</TableCell>
                          <TableCell>{ble.name}</TableCell>
                          <TableCell>{ble.ip}</TableCell>
                          <TableCell>{ble.gmac}</TableCell>
                          <TableCell>
                            <AddEditBleReader type="edit" bleReader={ble} />
                            <IconButton
                              color="error"
                              onClick={() => handleOpenDeleteDialog(ble.id)}
                            >
                              <IconTrash size={20} />
                            </IconButton>
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

      {/* --- Delete Confirmation --- */}
      <Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the following item(s)?
          </DialogContentText>
          <Box mt={2}>
            {pendingDeleteIds.map((id) => (
              <Typography key={id} variant="body2" sx={{ pl: 2 }}>
                • {id}
              </Typography>
            ))}
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Cancel</Button>
          <Button
            onClick={handleConfirmDelete}
            color="error"
            disabled={deleteMutation.isPending}
            startIcon={deleteMutation.isPending ? <CircularProgress size={18} /> : undefined}
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
};

export default BleReaderList;
