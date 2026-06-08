import { BASE_URL } from 'src/utils/axios';
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
  Skeleton,
  CircularProgress,
  Collapse,
  Paper,
  Tooltip,
} from '@mui/material';
import BlankCard from 'src/components/shared/BlankCard';
import { IconTrash, IconChevronDown, IconChevronRight, IconPlus, IconExternalLink, IconDownload } from '@tabler/icons-react';
import { useNavigate, useLocation } from 'react-router';
import { floorType, SetSelectedFloor, UpdateFilter as UpdateFloorFilter } from 'src/store/apps/crud/floor';
import AddEditFloor from 'src/components/master/CRUD/floor/AddEditFloor';
import { RootState, AppDispatch, useSelector, useDispatch } from 'src/store/Store';
import {
  BuildingType,
  fetchBuildingDT,
  deleteBuilding,
  UpdateFilter,
} from 'src/store/apps/crud/building';
import AddEditBuilding from './AddEditBuilding';
import { defaultBuildingFilter } from 'src/store/apps/defaultForm';
import toast from 'react-hot-toast';
import { useBuildingList, useDeleteBuilding, useExportBuildingConfig } from 'src/hooks/useBuilding';
import { useAllFloors, useFloorList, useDeleteFloor } from 'src/hooks/useFloor';

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
        <TableCell align="right" sx={{ fontWeight: 600, width: 120 }}>Actions</TableCell>
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
                      navigate('/master/floor', { state: { expandFloorId: floor.id, floorName: floor.name } });
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

  const { data, isLoading: queryLoading } = useBuildingList(buildingFilter);
  const { data: floorData, isLoading: floorLoading } = useAllFloors();
  const buildingData = data?.data || [];
  const buildingTotalCount = data?.recordsTotal || 0;
  const buildingFilteredCount = data?.recordsFiltered || 0;
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

  // useEffect(() => {
  //   dispatch(UpdateFilter(defaultBuildingFilter));
  // }, [dispatch]);

  // useEffect(() => {
  //   try {
  //     dispatch(fetchBuildingDT(buildingFilter));
  //   } catch (error) {
  //     console.error('Error fetching building data:', error);
  //   }
  // }, [buildingFilter, dispatch]);

  //Delete Pop-up
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingType | null>(null);
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
  const handleOpenDeleteDialog = (building: BuildingType) => {
    setSelectedBuilding(building);
    setDeleteDialogOpen(true);
  };

  // Close delete confirmation dialog
  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setSelectedBuilding(null);
  };

  // Confirm delete action
  const handleConfirmDelete = async () => {
    if (selectedBuilding) {
      // try {
      //   const result = await dispatch(deleteBuilding(selectedBuilding.id));
      //   if (result && result.type && result.type.endsWith('/fulfilled')) {
      //     await dispatch(fetchBuildingDT(buildingFilter));
      //     toast.success('Data Deleted');
      //   }
      // } catch (error) {
      //   toast.error('Delete Data Unsuccessful');
      //   console.error('Error deleting Building:', error);
      // }
      try {
        await deleteMutation.mutateAsync(selectedBuilding.id);
        toast.success('Data Deleted');
      } catch (error) {
        toast.error('Delete failed');
        console.error(error);
      }
    }
    handleCloseDeleteDialog();
  };

  const renderSkeletonRows = (rows: number) => (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={`skeleton-${i}`}>
          {/* sticky index cell */}
          <TableCell
            sx={{
              position: 'sticky',
              left: 0,
              backgroundColor: 'background.paper',
              zIndex: 1,
              width: 35,
              minWidth: 35,
              maxWidth: 35,
            }}
          >
            <Skeleton variant="text" width={18} />
          </TableCell>
          {/* Building Name */}
          <TableCell>
            <Skeleton variant="text" width={220} height={22} />
          </TableCell>
          {/* Building Tag */}
          <TableCell>
            <Skeleton variant="text" width={220} height={22} />
          </TableCell>
          {/* Building Image */}
          <TableCell>
            <Skeleton variant="rectangular" width={80} height={60} />
          </TableCell>
          {/* Actions (right sticky) */}
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
              {/* <Skeleton variant="circular" width={32} height={32} /> */}
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
            <TableContainer
              sx={{
                maxHeight: '58vh',
              }}
            >
              <Table stickyHeader aria-label="simple-table" sx={{ whiteSpace: 'nowrap' }}>
                <TableHead>
                  <TableRow>
                    {/* Left Sticky Empty Column */}
                    <TableCell
                      sx={{
                        position: 'sticky',
                        left: 0,
                        backgroundColor: 'background.paper',
                        zIndex: 2,
                        width: 35, // Fixed width
                        minWidth: 35,
                        maxWidth: 35,
                      }}
                    >
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
                      sx={{
                        position: 'sticky',
                        right: 0,
                        backgroundColor: 'background.paper',
                        zIndex: 2,
                        width: 180, // Fixed width
                        minWidth: 180,
                        maxWidth: 180,
                      }}
                    >
                      <Typography variant="h6"> Actions </Typography>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {queryLoading
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
                                  width: 35, // Fixed width
                                  minWidth: 35,
                                  maxWidth: 35,
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                {index + 1 + page * rowsPerPage}
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
                                  width: 180, // Fixed width
                                  minWidth: 180,
                                  maxWidth: 180,
                                }}
                              >
                                <Box display="flex" alignItems="center" gap={1}>
                                  <AddEditBuilding type="edit" building={building} />
                                  <IconButton
                                    color="error"
                                    size="small"
                                    onClick={() => handleOpenDeleteDialog(building)}
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
                                          <IconButton size="small" onClick={() => toggleExpand(building.id)}>
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
      <Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the building <strong>{selectedBuilding?.name}</strong>?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} color="primary">
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDelete}
            color={deleteMutation.isPending ? 'primary' : 'error'}
            disabled={deleteMutation.isPending}
            startIcon={deleteMutation.isPending ? <CircularProgress size={20} /> : null}
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
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
