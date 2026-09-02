import React, { useEffect, useMemo, useState } from 'react';
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
  Collapse,
  Paper,
} from '@mui/material';
import BlankCard from 'src/components/shared/BlankCard';
import {
  IconChevronDown,
  IconChevronRight,
  IconTrash,
  IconPlus,
  IconExternalLink,
  IconX,
  IconCheck,
  IconCircleCheck,
  IconCircleX,
} from '@tabler/icons-react';
import { RootState, AppDispatch, useSelector, useDispatch } from 'src/store/Store';
import { floorType, UpdateFilter } from 'src/store/apps/crud/floor';
import AddEditFloor from './AddEditFloor';
import { defaultFloorFilter } from 'src/store/apps/defaultForm';
import toast from 'react-hot-toast';
import { useDeleteFloor, useFloorList } from 'src/hooks/useFloor';
import { useAllFloorplans, useDeleteFloorplan } from 'src/hooks/useFloorplan';
import { FloorplanType, SelectFloorplan } from 'src/store/apps/crud/floorplan';
import AddEditFloorplan from 'src/components/master/CRUD/floorplan/AddEditFloorplan';

const columns = [
  { label: 'Floor Name', field: 'Name', sortAble: true },
  { label: 'Building Name', field: 'Building.Name', sortAble: true },
];

const SKELETON_ROWS = 5;

const FloorplanTable = ({
  floorplans,
  onDeleteClick,
}: {
  floorplans: FloorplanType[];
  onDeleteClick: (floorplan: FloorplanType) => void;
}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell sx={{ fontWeight: 600, width: 80 }}>No</TableCell>
          <TableCell sx={{ fontWeight: 600 }}>Floorplan Name</TableCell>
          <TableCell sx={{ fontWeight: 600 }}>Floorplan Dimension (meter)</TableCell>
          <TableCell align="right" sx={{ fontWeight: 600, width: 120 }}>
            Actions
          </TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {floorplans.length === 0 ? (
          <TableRow>
            <TableCell colSpan={4}>
              <Typography variant="body2" color="text.secondary">
                No floorplans registered for this floor.
              </Typography>
            </TableCell>
          </TableRow>
        ) : (
          floorplans.map((floorplan, i) => (
            <TableRow key={floorplan.id}>
              <TableCell>{i + 1}</TableCell>
              <TableCell>{floorplan.name}</TableCell>
              <TableCell>{`(${floorplan.floorX}, ${floorplan.floorY})`}</TableCell>
              <TableCell align="right">
                <Box display="flex" justifyContent="flex-end" alignItems="center" gap={1}>
                  <AddEditFloorplan
                    type="edit"
                    floorplan={floorplan}
                    fixedFloorId={floorplan.floorId}
                  />
                  <Tooltip title="View Floorplan" arrow>
                    <IconButton
                      color="primary"
                      size="small"
                      onClick={() => {
                        dispatch(SelectFloorplan(floorplan));
                        navigate('/master/floorplan', {
                          state: {
                            expandFloorplanId: floorplan.id,
                            floorplanName: floorplan.name,
                          },
                        });
                      }}
                    >
                      <IconExternalLink size={18} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete Floorplan" arrow>
                    <IconButton
                      color="error"
                      size="small"
                      onClick={() => onDeleteClick(floorplan)}
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
  );
};

const FloorAccordionContent = ({
  floorplans,
  floorId,
  onDeleteClick,
}: {
  floorplans: FloorplanType[];
  floorId: string;
  onDeleteClick: (floorplan: FloorplanType) => void;
}) => {
  return (
    <Paper variant="outlined" sx={{ p: 2, bgcolor: 'action.hover', my: 1 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="subtitle1" fontWeight={700}>
          Floorplans
        </Typography>
        <AddEditFloorplan
          type="add"
          fixedFloorId={floorId}
          trigger={(onClick) => (
            <Button
              variant="contained"
              color="primary"
              size="small"
              startIcon={<IconPlus size={16} />}
              onClick={onClick}
            >
              Add Floorplan
            </Button>
          )}
        />
      </Box>
      <FloorplanTable floorplans={floorplans} onDeleteClick={onDeleteClick} />
    </Paper>
  );
};

const FloorList = () => {
  const dispatch: AppDispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const isChildShown = useSelector((state: RootState) => state.customizer.isChildShown);
  const floorFilter = useSelector((state: RootState) => state.floorReducer.floorFilter);

  useEffect(() => {
    const initialFilter = location.state?.floorName
      ? { ...defaultFloorFilter, SearchValue: location.state.floorName }
      : defaultFloorFilter;

    dispatch(UpdateFilter(initialFilter));
  }, [dispatch, location.state?.floorName]);

  const { data, isLoading: queryLoading, isFetching, refetch } = useFloorList(floorFilter);
  const { data: floorplanData } = useAllFloorplans();
  const floorData = data?.data || [];
  const floorFilteredCount = data?.recordsFiltered || 0;
  const currentPageIds = useMemo(() => floorData.map((f) => f.id), [floorData]);

  // 🔹 Multi-select & Batch Delete State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteItems, setDeleteItems] = useState<
    Array<{
      id: string;
      name: string;
      buildingName?: string;
      selected: boolean;
      status: 'idle' | 'loading' | 'success' | 'error';
      errorMessage?: string;
    }>
  >([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDone, setIsDeleteDone] = useState(false);

  const [expandedFloorId, setExpandedFloorId] = useState<string | null>(
    location.state?.expandFloorId || null,
  );

  const toggleExpand = (floorId: string) => {
    setExpandedFloorId((prev) => (prev === floorId ? null : floorId));
  };

  // Delete Floorplan Dialog State
  const [deleteFloorplanDialogOpen, setDeleteFloorplanDialogOpen] = useState(false);
  const [selectedFloorplan, setSelectedFloorplan] = useState<FloorplanType | null>(null);
  const deleteFloorplanMutation = useDeleteFloorplan();

  const handleOpenDeleteFloorplanDialog = (floorplan: FloorplanType) => {
    setSelectedFloorplan(floorplan);
    setDeleteFloorplanDialogOpen(true);
  };

  const handleCloseDeleteFloorplanDialog = () => {
    setDeleteFloorplanDialogOpen(false);
    setSelectedFloorplan(null);
  };

  const handleConfirmDeleteFloorplan = async () => {
    if (selectedFloorplan) {
      try {
        await deleteFloorplanMutation.mutateAsync(selectedFloorplan.id);
        toast.success('Floorplan deleted successfully');
      } catch (error) {
        toast.error('Delete failed');
        console.error(error);
      }
    }
    handleCloseDeleteFloorplanDialog();
  };

  // Pagination State
  const page = Math.floor(floorFilter.Start / floorFilter.Length);
  const rowsPerPage = floorFilter.Length;
  const orderBy = floorFilter.SortColumn;
  const order = floorFilter.SortDir;

  const handleChangePage = (_: unknown, newPage: number) => {
    dispatch(UpdateFilter({ Start: newPage * floorFilter.Length }));
  };
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newLength = parseInt(event.target.value, 10);
    dispatch(UpdateFilter({ Length: newLength, Start: 0 }));
  };
  const handleSort = (column: string) => {
    const isAsc = floorFilter.SortColumn === column && floorFilter.SortDir === 'asc';
    const isDesc = floorFilter.SortColumn === column && floorFilter.SortDir === 'desc';

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

  // 🔹 Floor Delete handling
  const deleteMutation = useDeleteFloor();

  const handleOpenDeleteDialog = (ids: string[] | string) => {
    const idList = Array.isArray(ids) ? ids : [ids];
    const items = idList.map((id) => {
      const floor = floorData.find((f) => f.id === id);
      return {
        id,
        name: floor?.name || `Floor (${id})`,
        buildingName: floor?.building?.name,
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
      toast.success(`Successfully deleted ${successCount} floor(s)`);
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
                    : floorData.map((floor: floorType, index: number) => {
                        const isOpen = expandedFloorId === floor.id;
                        const floorFloorplans = (floorplanData || []).filter(
                          (fp: any) => fp.floorId === floor.id,
                        );
                        const building = floor.building;
                        return (
                          <React.Fragment key={floor.id}>
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
                                    checked={selectedIds.has(floor.id)}
                                    onChange={(e) => {
                                      const checked = e.target.checked;
                                      setSelectedIds((prev) => {
                                        const updated = new Set(prev);
                                        if (checked) updated.add(floor.id);
                                        else updated.delete(floor.id);
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
                              <TableCell>{floor.name}</TableCell>
                              <TableCell>
                                {building ? (
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
                                )}
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
                                  <AddEditFloor type="edit" floor={floor} />

                                  <Tooltip title="Delete Floor" arrow>
                                    <IconButton
                                      color="error"
                                      size="small"
                                      onClick={() => handleOpenDeleteDialog(floor.id)}
                                    >
                                      <IconTrash size={20} />
                                    </IconButton>
                                  </Tooltip>
                                  {isChildShown && (
                                    <Tooltip
                                      title={isOpen ? 'Hide Floorplans' : 'Show Floorplans'}
                                      arrow
                                    >
                                      <IconButton
                                        size="small"
                                        onClick={() => toggleExpand(floor.id)}
                                      >
                                        {isOpen ? (
                                          <IconChevronDown size={20} />
                                        ) : (
                                          <IconChevronRight size={20} />
                                        )}
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
                                      <FloorAccordionContent
                                        floorplans={floorFloorplans}
                                        floorId={floor.id}
                                        onDeleteClick={handleOpenDeleteFloorplanDialog}
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
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={floorFilteredCount}
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
                  {item.buildingName && (
                    <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                      ({item.buildingName})
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

      {/* Delete Floorplan Confirmation Dialog */}
      <Dialog open={deleteFloorplanDialogOpen} onClose={handleCloseDeleteFloorplanDialog}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the floorplan <strong>{selectedFloorplan?.name}</strong>?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteFloorplanDialog} color="primary">
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDeleteFloorplan}
            color={deleteFloorplanMutation.isPending ? 'primary' : 'error'}
            disabled={deleteFloorplanMutation.isPending}
            startIcon={deleteFloorplanMutation.isPending ? <CircularProgress size={20} /> : null}
          >
            {deleteFloorplanMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
};

export default FloorList;
