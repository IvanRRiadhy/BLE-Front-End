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
  Button,
  DialogActions,
  TableSortLabel,
  Checkbox,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import BlankCard from 'src/components/shared/BlankCard';
import { IconPencil, IconTrash, IconX } from '@tabler/icons-react';
import { RootState, AppDispatch, useSelector, useDispatch } from 'src/store/Store';
import {
  bleReaderType,
  deleteBleReader,
  fetchBleReaderDT,
  UpdateFilter,
} from 'src/store/apps/crud/bleReader';
import { fetchBrands, BrandType } from 'src/store/apps/crud/brand';
import AddEditBleReader from './AddEditBleReader';
import { defaultBleReaderFilter } from 'src/store/apps/defaultForm';
import toast from 'react-hot-toast';
import BulkAddEditBleReader from './BulkAddEditBleReader';
// import { useTranslation } from 'react-i18next';

const columns = [
  { label: 'Brand Name', field: 'Brand.Name', sortAble: true },
  { label: 'Name', field: 'Name', sortAble: true },
  { label: 'IP', field: 'Ip', sortAble: true },
  { label: 'GMAC', field: 'Gmac', sortAble: false },
  { label: 'Engine Reader', field: 'EngineFloorId', sortAble: true },
];

const BleReaderList = () => {
  const dispatch: AppDispatch = useDispatch();
  const bleReaderData = useSelector((state: RootState) => state.bleReaderReducer.bleReaders);
  const currentPageIds = React.useMemo(() => bleReaderData.map((x) => x.id), [bleReaderData]);
  const bleReaderFilter = useSelector((state: RootState) => state.bleReaderReducer.bleReaderFilter);
  const prevFilterRef = useRef(bleReaderFilter);
  const brandData = useSelector((state: RootState) => state.brandReducer.brandAll);
  const bleReaderTotalCount = useSelector(
    (state: RootState) => state.bleReaderReducer.bleReaderTotalCount,
  );
  // const bleReaderFilterCount = useSelector(
  //   (state: RootState) => state.bleReaderReducer.bleReaderFilterCount,
  // );
  // const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const isLoading = useSelector((state: RootState) => state.bleReaderReducer.isLoading);
  const hasLoaded = useSelector((state: RootState) => state.bleReaderReducer.hasLoaded);
  // Pagination State
  const page = Math.floor(bleReaderFilter.Start / bleReaderFilter.Length);
  const rowsPerPage = bleReaderFilter.Length;
  const orderBy = bleReaderFilter.SortColumn;
  const order = bleReaderFilter.SortDir;

  const handleChangePage = (_: unknown, newPage: number) => {
    dispatch(UpdateFilter({ Start: newPage * bleReaderFilter.Length }));
  };
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newLength = parseInt(event.target.value, 10);
    dispatch(UpdateFilter({ Length: newLength, Start: 0 }));
  };

  useEffect(() => {
    dispatch(UpdateFilter(defaultBleReaderFilter));
    try {
      setLoading(true);
      dispatch(fetchBleReaderDT(defaultBleReaderFilter));
    } catch (error) {
      console.error('Error fetching data:', error);
    }
    dispatch(fetchBrands());
    setTimeout(() => {
      setLoading(false);
    }, 500);
  }, [dispatch]);

  useEffect(() => {
    const prevFilter = prevFilterRef.current;

    const isStartOrLengthChanged =
      prevFilter.Start !== bleReaderFilter.Start || prevFilter.Length !== bleReaderFilter.Length;

    // Only show loading if Start or Length changed (pagination),
    // but NOT if only SortColumn/SortDir changed
    if (isStartOrLengthChanged) {
      setLoading(true);
    }

    dispatch(fetchBleReaderDT(bleReaderFilter)).finally(() => {
      if (isStartOrLengthChanged) {
        setTimeout(() => setLoading(false), 500);
      }
    });

    // Update previous filter
    prevFilterRef.current = bleReaderFilter;
  }, [bleReaderFilter, dispatch]);

  //Delete Pop-up
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedBle, setSelectedBle] = useState<bleReaderType | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);

  // Open delete confirmation dialog
  const handleOpenDeleteDialog = (ble: bleReaderType) => {
    setPendingDeleteIds([ble.id]);
    setSelectedBle(ble);
    setDeleteDialogOpen(true);
  };

  // Close delete confirmation dialog
  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setSelectedBle(null);
  };

  // Confirm delete action
  const handleConfirmDelete = async () => {
    if (pendingDeleteIds.length === 0) return;

    setLoading(true);
    setDeleteDialogOpen(false);

    const results = await Promise.allSettled(
      pendingDeleteIds.map((id) => dispatch(deleteBleReader(id))),
    );

    const successes = results.filter((r) => r.status === 'fulfilled');
    const failures = results.filter((r) => r.status === 'rejected');

    if (successes.length > 0) {
      toast.success(`${successes.length} Ble Reader deleted successfully`, {
        position: 'top-right',
      });
    }
    if (failures.length > 0) {
      toast.error(`${failures.length} Ble Reader failed to delete`);
      console.error('Failed deletions:', failures);
    }

    setPendingDeleteIds([]);
    setSelectedBle(null);
    setSelectedIds(new Set());

    await dispatch(fetchBleReaderDT(bleReaderFilter));
    setTimeout(() => {
      setLoading(false);
    }, 500);
  };

  // const handleSort = (column: string) => {
  //   const isAsc = orderBy === column && order === 'asc';
  //   setOrder(isAsc ? 'desc' : 'asc');
  //   setOrderBy(column);
  // };
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

  const getBrandName = (brandID: string) => {
    const brand = brandData.find((b: BrandType) => b.id === brandID);
    return brand ? brand.name : 'Unknown Brand';
  };

  const selectedData = bleReaderData.filter((x) => selectedIds.has(x.id));

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
                        onClick={() => {
                          setPendingDeleteIds(Array.from(selectedIds));
                          setDeleteDialogOpen(true);
                        }}
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

              <TableContainer>
                <Table aria-label="simple table" sx={{ whiteSpace: 'nowrap' }}>
                  <TableHead>
                    <TableRow>
                      {/* Left Sticky Empty Column */}
                      <TableCell
                        padding="checkbox"
                        sx={{
                          position: 'sticky',
                          left: 0,
                          background: 'white',
                          zIndex: 2,
                          width: 80, // Fixed width
                          minWidth: 80,
                          maxWidth: 80,
                        }}
                      >
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
                              if (checked) {
                                currentPageIds.forEach((id) => updated.add(id));
                              } else {
                                currentPageIds.forEach((id) => updated.delete(id));
                              }
                              return updated;
                            });
                          }}
                        />
                      </TableCell>
                      {/* Main Table Header */}
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
                    {bleReaderData.map((bleReader: bleReaderType, index) => (
                      <TableRow key={index}>
                        <TableCell
                          sx={{
                            position: 'sticky',
                            left: 0,
                            background: 'white',
                            zIndex: 2,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 1,
                            width: 80, // Fixed width
                            minWidth: 80,
                            maxWidth: 80,

                          }}
                        >
                          <Checkbox
                            checked={selectedIds.has(bleReader.id)}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setSelectedIds((prev) => {
                                const updated = new Set(prev);
                                if (checked) {
                                  updated.add(bleReader.id);
                                } else {
                                  updated.delete(bleReader.id);
                                }
                                return updated;
                              });
                            }}
                          />
                          {index + 1 + page * rowsPerPage}
                        </TableCell>
                        <TableCell>{getBrandName(bleReader.brandId)}</TableCell>
                        <TableCell>{bleReader.name}</TableCell>
                        <TableCell>{bleReader.ip}</TableCell>
                        <TableCell>{bleReader.gmac}</TableCell>
                        <TableCell>{bleReader.engineReaderId}</TableCell>
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
                          <AddEditBleReader type="edit" bleReader={bleReader} />
                          <IconButton
                            color="error"
                            size="small"
                            onClick={() => handleOpenDeleteDialog(bleReader)}
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
                count={bleReaderTotalCount}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
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

export default BleReaderList;
