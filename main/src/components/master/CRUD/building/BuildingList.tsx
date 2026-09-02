import { BASE_URL } from 'src/utils/axios';
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
  Skeleton,
  CircularProgress,
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
  IconDownload,
  IconX,
  IconCheck,
  IconCircleCheck,
  IconCircleX,
} from '@tabler/icons-react';
import { useNavigate, useLocation } from 'react-router';
import { floorType, SetSelectedFloor } from 'src/store/apps/crud/floor';
import AddEditFloor from 'src/components/master/CRUD/floor/AddEditFloor';
import { RootState, AppDispatch, useSelector, useDispatch } from 'src/store/Store';
import { BuildingType, UpdateFilter } from 'src/store/apps/crud/building';
import AddEditBuilding from './AddEditBuilding';
import { defaultBuildingFilter } from 'src/store/apps/defaultForm';
import toast from 'react-hot-toast';
import { useBuildingList, useDeleteBuilding, useExportBuildingConfig } from 'src/hooks/useBuilding';
import { useAllFloors, useDeleteFloor } from 'src/hooks/useFloor';

const columns = [
  { label: 'Building Name', field: 'name', sortAble: true },
  { label: 'Building Tag', field: 'tag', sortAble: false },
  { label: 'Building Image', field: '', sortAble: false },
];

const SKELETON_ROWS = 5;

const FloorTable = ({
  floors,
  onDeleteClick,
}: {
  floors: floorType[];
  onDeleteClick: (floor: floorType) => void;
}) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell sx={{ fontWeight: 600, width: 80 }}>No</TableCell>
          <TableCell sx={{ fontWeight: 600 }}>Floor Name</TableCell>
          <TableCell align="right" sx={{ fontWeight: 600, width: 120 }}>
            Actions
          </TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {floors.length === 0 ? (
          <TableRow>
            <TableCell colSpan={3}>
              <Typography variant="body2" color="text.secondary">
                No floors registered for this building.
              </Typography>
            </TableCell>
          </TableRow>
        ) : (
          floors.map((floor, i) => (
            <TableRow key={floor.id}>
              <TableCell>{i + 1}</TableCell>
              <TableCell>{floor.name}</TableCell>
              <TableCell align="right">
                <Box display="flex" justifyContent="flex-end" alignItems="center" gap={1}>
                  <AddEditFloor type="edit" floor={floor} fixedBuildingId={floor.buildingId} />
                  <Tooltip title="View Floor" arrow>
                    <IconButton
                      color="primary"
                      size="small"
                      onClick={() => {
                        dispatch(SetSelectedFloor(floor));
                        navigate('/master/floor', {
                          state: { expandFloorId: floor.id, floorName: floor.name },
                        });
                      }}
                    >
                      <IconExternalLink size={18} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete Floor" arrow>
                    <IconButton
                      color="error"
                      size="small"
                      onClick={() => onDeleteClick(floor)}
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

const BuildingAccordionContent = ({
  floors,
  buildingId,
  onDeleteClick,
}: {
  floors: floorType[];
  buildingId: string;
  onDeleteClick: (floor: floorType) => void;
}) => {
  return (
    <Paper variant="outlined" sx={{ p: 2, bgcolor: 'action.hover', my: 1 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="subtitle1" fontWeight={700}>
          Floors
        </Typography>
        <AddEditFloor
          type="add"
          fixedBuildingId={buildingId}
          trigger={(onClick) => (
            <Button
              variant="contained"
              color="primary"
              size="small"
              startIcon={<IconPlus size={16} />}
              onClick={onClick}
            >
              Add Floor
            </Button>
          )}
        />
      </Box>
      <FloorTable floors={floors} onDeleteClick={onDeleteClick} />
    </Paper>
  );
};

const BuildingList = () => {
  const dispatch: AppDispatch = useDispatch();
  const location = useLocation();
  const isChildShown = useSelector((state: RootState) => state.customizer.isChildShown);
  const buildingFilter = useSelector((state: RootState) => state.buildingReducer.buildingFilter);

  useEffect(() => {
    const initialFilter = location.state?.buildingName
      ? { ...defaultBuildingFilter, SearchValue: location.state.buildingName }
      : defaultBuildingFilter;

    dispatch(UpdateFilter(initialFilter));
  }, [dispatch, location.state?.buildingName]);

  const { data, isLoading: queryLoading, isFetching, refetch } = useBuildingList(buildingFilter);
  const { data: floorData } = useAllFloors();
  const buildingData = data?.data || [];
  const buildingFilteredCount = data?.recordsFiltered || 0;
  const currentPageIds = useMemo(() => buildingData.map((b) => b.id), [buildingData]);

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
  const page = Math.floor(buildingFilter.Start / buildingFilter.Length);
  const rowsPerPage = buildingFilter.Length;
  const orderBy = buildingFilter.SortColumn;
  const order = buildingFilter.SortDir;

  const [expandedBuildingId, setExpandedBuildingId] = useState<string | null>(null);

  const toggleExpand = (buildingId: string) => {
    setExpandedBuildingId((prev) => (prev === buildingId ? null : buildingId));
  };

  // Delete Floor Dialog State
  const [deleteFloorDialogOpen, setDeleteFloorDialogOpen] = useState(false);
  const [selectedFloor, setSelectedFloor] = useState<floorType | null>(null);
  const deleteFloorMutation = useDeleteFloor();

  const handleOpenDeleteFloorDialog = (floor: floorType) => {
    setSelectedFloor(floor);
    setDeleteFloorDialogOpen(true);
  };

  const handleCloseDeleteFloorDialog = () => {
    setDeleteFloorDialogOpen(false);
    setSelectedFloor(null);
  };

  const handleConfirmDeleteFloor = async () => {
    if (selectedFloor) {
      try {
        await deleteFloorMutation.mutateAsync(selectedFloor.id);
        toast.success('Floor deleted successfully');
      } catch (error) {
        toast.error('Delete failed');
        console.error(error);
      }
    }
    handleCloseDeleteFloorDialog();
  };

  const handleChangePage = (_: unknown, newPage: number) => {
    dispatch(UpdateFilter({ Start: newPage * buildingFilter.Length }));
  };
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newLength = parseInt(event.target.value, 10);
    dispatch(UpdateFilter({ Length: newLength, Start: 0 }));
  };
  const handleSort = (column: string) => {
    const isAsc = buildingFilter.SortColumn === column && buildingFilter.SortDir === 'asc';
    const isDesc = buildingFilter.SortColumn === column && buildingFilter.SortDir === 'desc';

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

  // 🔹 Building Delete handling
  const deleteMutation = useDeleteBuilding();
  const exportMutation = useExportBuildingConfig();
  const [exportingId, setExportingId] = useState<string | null>(null);

  const handleExport = async (building: BuildingType) => {
    setExportingId(building.id);
    try {
      const blob = await exportMutation.mutateAsync(building.id);
      const url = window.URL.createObjectURL(blob);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.href = url;
      downloadAnchor.download = `building_${building.id.toLowerCase()}.bcp`;
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Configuration exported successfully');
    } catch (error) {
      toast.error('Failed to export configuration');
      console.error(error);
    } finally {
      setExportingId(null);
    }
  };

  // Open delete confirmation dialog
  const handleOpenDeleteDialog = (ids: string[] | string) => {
    const idList = Array.isArray(ids) ? ids : [ids];
    const items = idList.map((id) => {
      const building = buildingData.find((b) => b.id === id);
      return {
        id,
        name: building?.name || `Building (${id})`,
        tag: building?.tag,
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

  // Close delete confirmation dialog
  const handleCloseDeleteDialog = () => {
    if (isDeleting) return;
    setDeleteDialogOpen(false);
    setDeleteItems([]);
    setIsDeleteDone(false);
  };

  // Confirm delete action
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
      toast.success(`Successfully deleted ${successCount} building(s)`);
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
            <Skeleton variant="text" width={220} height={22} />
          </TableCell>
          <TableCell>
            <Skeleton variant="text" width={220} height={22} />
          </TableCell>
          <TableCell>
            <Skeleton variant="rectangular" width={80} height={60} />
          </TableCell>
          <TableCell
            sx={{
              position: 'sticky',
              right: 0,
              backgroundColor: 'background.paper',
              zIndex: 2,
              width: 180,
              minWidth: 180,
              maxWidth: 180,
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
                maxHeight: '58vh',
              }}
            >
              <Table stickyHeader aria-label="simple-table" sx={{ whiteSpace: 'nowrap' }}>
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
                        width: 180,
                        minWidth: 180,
                        maxWidth: 180,
                      }}
                    >
                      <Typography variant="h6"> Actions </Typography>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {queryLoading || isFetching
                    ? renderSkeletonRows(rowsPerPage || SKELETON_ROWS)
                    : buildingData.map((building, index) => {
                        const isOpen = expandedBuildingId === building.id;
                        const buildingFloors = (floorData || []).filter(
                          (f) => f.buildingId === building.id,
                        );
                        return (
                          <React.Fragment key={building.id || index}>
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
                                    checked={selectedIds.has(building.id)}
                                    onChange={(e) => {
                                      const checked = e.target.checked;
                                      setSelectedIds((prev) => {
                                        const updated = new Set(prev);
                                        if (checked) updated.add(building.id);
                                        else updated.delete(building.id);
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
                              <TableCell>{building.name}</TableCell>
                              <TableCell>{building.tag}</TableCell>
                              <TableCell>
                                {building.image ? (
                                  <img
                                    src={`${BASE_URL}${building.image}`}
                                    alt="Building"
                                    style={{ width: 80, height: 80, objectFit: 'cover' }}
                                  />
                                ) : (
                                  'No Image'
                                )}
                              </TableCell>
                              <TableCell
                                sx={{
                                  position: 'sticky',
                                  right: 0,
                                  backgroundColor: 'background.paper',
                                  zIndex: 1,
                                  width: 180,
                                  minWidth: 180,
                                  maxWidth: 180,
                                }}
                              >
                                <Box display="flex" alignItems="center" gap={1}>
                                  <AddEditBuilding type="edit" building={building} />
                                  <IconButton
                                    color="error"
                                    size="small"
                                    onClick={() => handleOpenDeleteDialog(building.id)}
                                  >
                                    <IconTrash size={20} />
                                  </IconButton>
                                  <Tooltip title="Export Configuration" arrow>
                                    <IconButton
                                      color="primary"
                                      size="small"
                                      onClick={() => handleExport(building)}
                                      disabled={exportingId !== null}
                                    >
                                      {exportingId === building.id ? (
                                        <CircularProgress size={20} color="inherit" />
                                      ) : (
                                        <IconDownload size={20} />
                                      )}
                                    </IconButton>
                                  </Tooltip>
                                  {isChildShown && (
                                    <Tooltip title={isOpen ? 'Hide Floors' : 'Show Floors'} arrow>
                                      <IconButton
                                        size="small"
                                        onClick={() => toggleExpand(building.id)}
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
                                <TableCell colSpan={5} sx={{ p: 0, borderBottom: 0 }}>
                                  <Collapse in={isOpen} timeout="auto" unmountOnExit>
                                    <Box pl={6} pr={2} pb={2}>
                                      <BuildingAccordionContent
                                        floors={buildingFloors}
                                        buildingId={building.id}
                                        onDeleteClick={handleOpenDeleteFloorDialog}
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
              count={buildingFilteredCount}
              page={page}
              rowsPerPage={rowsPerPage}
              onPageChange={handleChangePage}
              rowsPerPageOptions={[5, 10, 25]}
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

      {/* Delete Floor Confirmation Dialog */}
      <Dialog open={deleteFloorDialogOpen} onClose={handleCloseDeleteFloorDialog}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the floor <strong>{selectedFloor?.name}</strong>?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteFloorDialog} color="primary">
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDeleteFloor}
            color={deleteFloorMutation.isPending ? 'primary' : 'error'}
            disabled={deleteFloorMutation.isPending}
            startIcon={deleteFloorMutation.isPending ? <CircularProgress size={20} /> : null}
          >
            {deleteFloorMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
};

export default BuildingList;
