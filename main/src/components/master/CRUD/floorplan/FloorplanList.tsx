import React, { lazy, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
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
  Tooltip,
  Checkbox,
  List,
  ListItem,
} from '@mui/material';
import BlankCard from 'src/components/shared/BlankCard';
import {
  IconEye,
  IconTrash,
  IconExternalLink,
  IconX,
  IconCheck,
  IconCircleCheck,
  IconCircleX,
} from '@tabler/icons-react';
import { RootState, AppDispatch, useSelector, useDispatch } from 'src/store/Store';
import {
  FloorplanType,
  SelectFloorplan,
  UpdateFilter,
} from 'src/store/apps/crud/floorplan';
import { useFloorplanList, useDeleteFloorplan } from 'src/hooks/useFloorplan';
import { defaultFloorplanFilter } from 'src/store/apps/defaultForm';
import toast from 'react-hot-toast';
import { BuildingType, fetchBuildings } from 'src/store/apps/crud/building';
import { fetchFloors } from 'src/store/apps/crud/floor';
import { fetchEngines } from 'src/store/apps/crud/engine';

const columns = [
  { label: 'Floorplan Name', field: 'Name', sortAble: true },
  { label: 'Floor Name', field: 'Floor.Name', sortAble: true },
  { label: 'Building Name', field: '', sortAble: false },
  { label: 'Floorplan Image', field: '', sortAble: false },
  { label: 'Floorplan Dimension (meter)', field: '', sortAble: false },
];

const AddEditFloorplan = lazy(() => import('./AddEditFloorplan'));

const getCdnUrl = (url?: string | null) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `https://ble-cdn.tunnel.piranticerdasindonesia.com/${url}`;
};

const SKELETON_ROWS = 5;

const FloorplanList = () => {
  const dispatch: AppDispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const buildingData: BuildingType[] = useSelector(
    (state: RootState) => state.buildingReducer.buildingAll,
  );
  const floorplanFilter = useSelector((state: RootState) => state.floorplanReducer.floorplanFilter);

  const { data, isLoading: queryLoading, isFetching, refetch } = useFloorplanList(floorplanFilter);
  const floorplanData = data?.data || [];
  const floorplanFilteredCount = data?.recordsFiltered || 0;
  const currentPageIds = useMemo(() => floorplanData.map((f) => f.id), [floorplanData]);

  // 🔹 Multi-select & Batch Delete State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteItems, setDeleteItems] = useState<
    Array<{
      id: string;
      name: string;
      floorName?: string;
      selected: boolean;
      status: 'idle' | 'loading' | 'success' | 'error';
      errorMessage?: string;
    }>
  >([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDone, setIsDeleteDone] = useState(false);

  // Pagination State
  const page = Math.floor(floorplanFilter.Start / floorplanFilter.Length);
  const rowsPerPage = floorplanFilter.Length;
  const orderBy = floorplanFilter.SortColumn;
  const order = floorplanFilter.SortDir;

  const handleChangePage = (_: unknown, newPage: number) => {
    dispatch(UpdateFilter({ Start: newPage * floorplanFilter.Length }));
  };
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newLength = parseInt(event.target.value, 10);
    dispatch(UpdateFilter({ Length: newLength, Start: 0 }));
  };
  const handleSort = (column: string) => {
    const isAsc = floorplanFilter.SortColumn === column && floorplanFilter.SortDir === 'asc';
    const isDesc = floorplanFilter.SortColumn === column && floorplanFilter.SortDir === 'desc';

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

  useEffect(() => {
    Promise.all([
      dispatch(fetchBuildings()),
      dispatch(fetchFloors()),
      dispatch(fetchEngines()),
    ]);

    const initialFilter = location.state?.floorplanName
      ? { ...defaultFloorplanFilter, SearchValue: location.state.floorplanName }
      : defaultFloorplanFilter;

    dispatch(UpdateFilter(initialFilter));
  }, [dispatch, location.state?.floorplanName]);

  // 🔹 Floorplan Delete handling
  const deleteMutation = useDeleteFloorplan();

  const handleOpenDeleteDialog = (ids: string[] | string) => {
    const idList = Array.isArray(ids) ? ids : [ids];
    const items = idList.map((id) => {
      const fp = floorplanData.find((f) => f.id === id);
      return {
        id,
        name: fp?.name || `Floorplan (${id})`,
        floorName: fp?.floor?.name,
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

      setDeleteItems((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, status: 'loading' } : it)),
      );

      try {
        await deleteMutation.mutateAsync(item.id);
        successfullyDeletedIds.push(item.id);
        successCount++;
        setDeleteItems((prev) =>
          prev.map((it) => (it.id === item.id ? { ...it, status: 'success' } : it)),
        );
      } catch (error: any) {
        failed = true;
        setDeleteItems((prev) =>
          prev.map((it) =>
            it.id === item.id
              ? { ...it, status: 'error', errorMessage: error?.message || 'Failed to delete' }
              : it,
          ),
        );
        toast.error(`Failed to delete "${item.name}". Stopped remaining deletions.`);
        break;
      }
    }

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
      toast.success(`Successfully deleted ${successCount} floorplan(s)`);
    }
  };

  const handleOverviewClick = (floorplanToEdit: FloorplanType) => {
    dispatch(SelectFloorplan(floorplanToEdit));
    navigate('/master/floorplan/overview');
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
            <Box display="flex" alignItems="center" gap={0.5}>
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
            <Skeleton variant="rectangular" width={80} height={60} />
          </TableCell>
          <TableCell>
            <Skeleton variant="text" width={140} height={22} />
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
                      <Typography variant="h6"> Actions </Typography>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {queryLoading || isFetching
                    ? renderSkeletonRows(rowsPerPage || SKELETON_ROWS)
                    : floorplanData.map((floorplan: FloorplanType, index: number) => (
                        <TableRow key={floorplan.id || index} hover>
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
                                checked={selectedIds.has(floorplan.id)}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setSelectedIds((prev) => {
                                    const updated = new Set(prev);
                                    if (checked) updated.add(floorplan.id);
                                    else updated.delete(floorplan.id);
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
                          <TableCell>{floorplan.name}</TableCell>
                          <TableCell>
                            {(() => {
                              const floor = floorplan.floor;
                              return floor ? (
                                <Tooltip title="View Floor" arrow>
                                  <Box
                                    component="span"
                                    onClick={() =>
                                      navigate('/master/floor', {
                                        state: { floorName: floor.name },
                                      })
                                    }
                                    sx={{
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 0.5,
                                      color: 'primary.main',
                                      fontWeight: 500,
                                      position: 'relative',
                                      '&:hover': {
                                        textDecoration: 'underline',
                                        color: 'primary.dark',
                                      },
                                    }}
                                  >
                                    <IconExternalLink size={14} style={{ flexShrink: 0 }} />
                                    <span>{floor.name}</span>
                                  </Box>
                                </Tooltip>
                              ) : (
                                '-'
                              );
                            })()}
                          </TableCell>
                          <TableCell>
                            {(() => {
                              const floor = floorplan.floor;
                              const buildingId = floor?.buildingId || '';
                              const building = buildingData.find((b) => b.id === buildingId);
                              return building ? (
                                <Tooltip title="View Building" arrow>
                                  <Box
                                    component="span"
                                    onClick={() =>
                                      navigate('/master/building', {
                                        state: { buildingName: building.name },
                                      })
                                    }
                                    sx={{
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 0.5,
                                      color: 'primary.main',
                                      fontWeight: 500,
                                      position: 'relative',
                                      '&:hover': {
                                        textDecoration: 'underline',
                                        color: 'primary.dark',
                                      },
                                    }}
                                  >
                                    <IconExternalLink size={14} style={{ flexShrink: 0 }} />
                                    <span>{building.name}</span>
                                  </Box>
                                </Tooltip>
                              ) : (
                                '-'
                              );
                            })()}
                          </TableCell>
                          <TableCell>
                            {floorplan.floorplanImage ? (
                              <img
                                src={getCdnUrl(floorplan.floorplanImage)}
                                alt="Floor"
                                loading="lazy"
                                style={{ width: 80, height: 80, objectFit: 'cover' }}
                              />
                            ) : (
                              'No Image'
                            )}
                          </TableCell>
                          <TableCell>{`(${floorplan.floorX}, ${floorplan.floorY})`}</TableCell>

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
                              <AddEditFloorplan type="edit" floorplan={floorplan} />
                              <Tooltip title="Overview" arrow>
                                <IconButton
                                  color="primary"
                                  size="small"
                                  onClick={() => handleOverviewClick(floorplan)}
                                >
                                  <IconEye size={20} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete Floorplan" arrow>
                                <IconButton
                                  color="error"
                                  size="small"
                                  onClick={() => handleOpenDeleteDialog(floorplan.id)}
                                >
                                  <IconTrash size={20} />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={floorplanFilteredCount}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </BlankCard>
        </Box>
      </Grid>

      {/* Delete Confirmation Dialog */}
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
                  {item.floorName && (
                    <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                      ({item.floorName})
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

export default FloorplanList;
