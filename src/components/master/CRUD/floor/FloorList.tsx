import React, { useEffect, useRef, useState } from 'react';
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
} from '@mui/material';
import BlankCard from 'src/components/shared/BlankCard';
import { IconChevronDown, IconChevronRight, IconTrash, IconPlus, IconExternalLink } from '@tabler/icons-react';
import { RootState, AppDispatch, useSelector, useDispatch } from 'src/store/Store';
import { deleteFloor, fetchFloorDT, floorType, UpdateFilter } from 'src/store/apps/crud/floor';
import { fetchBuildings, BuildingType } from 'src/store/apps/crud/building';
import AddEditFloor from './AddEditFloor';
import { defaultFloorFilter } from 'src/store/apps/defaultForm';
import toast from 'react-hot-toast';
import { useDeleteFloor, useFloorList } from 'src/hooks/useFloor';
import { useAllFloorplans, useDeleteFloorplan } from 'src/hooks/useFloorplan';
import { FloorplanType, SelectFloorplan } from 'src/store/apps/crud/floorplan';
import AddEditFloorplan from 'src/components/master/CRUD/floorplan/AddEditFloorplan';
import { Collapse, Paper } from '@mui/material';
// import { useTranslation } from 'react-i18next';

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
        <TableCell align="right" sx={{ fontWeight: 600, width: 120 }}>Actions</TableCell>
      </TableRow>
    </TableHead>
    <TableBody>
      {floorplans.length === 0 ? (
        <TableRow>
          <TableCell colSpan={3}>
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
                <AddEditFloorplan type="edit" floorplan={floorplan} fixedFloorId={floorplan.floorId} />
                <Tooltip title="View Floorplan" arrow>
                  <IconButton
                    color="primary"
                    size="small"
                    onClick={() => {
                      dispatch(SelectFloorplan(floorplan));
                      navigate('/master/floorplan', { state: { expandFloorplanId: floorplan.id, floorplanName: floorplan.name } });
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
  // const floorData = useSelector((state: RootState) => state.floorReducer.floors);
  // const floorTotalCount = useSelector((state: RootState) => state.floorReducer.floorTotalCount);
  // const floorFilteredCount = useSelector(
  //   (state: RootState) => state.floorReducer.floorFilteredCount,
  // );
  const isChildShown = useSelector((state: RootState) => state.customizer.isChildShown);
  const floorFilter = useSelector((state: RootState) => state.floorReducer.floorFilter);
  // const { data: floorData = [], isLoading: queryLoading, isFetching } = useFloorList(floorFilter);
  const { data, isLoading: queryLoading } = useFloorList(floorFilter);
  const { data: floorplanData, isLoading: floorplanLoading} = useAllFloorplans();
  const floorData = data?.data || [];
  const floorTotalCount = data?.recordsTotal || 0;
  const floorFilteredCount = data?.recordsFiltered || 0;

  const location = useLocation();
  const [expandedFloorId, setExpandedFloorId] = useState<string | null>(location.state?.expandFloorId || null);

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

  const prevFilterRef = useRef(floorFilter);
  // const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const isLoading = useSelector((state: RootState) => state.floorReducer.isLoading);
  const hasLoaded = useSelector((state: RootState) => state.floorReducer.hasLoaded);
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

  useEffect(() => {
    dispatch(fetchBuildings());
    
    const initialFilter = location.state?.floorName 
      ? { ...defaultFloorFilter, SearchValue: location.state.floorName }
      : defaultFloorFilter;
      
    dispatch(UpdateFilter(initialFilter));
    try {
      setLoading(true);
      dispatch(fetchFloorDT(initialFilter));
    } catch (error) {
      console.log(error);
    }
    setTimeout(() => {
      setLoading(false);
    }, 500);
  }, [dispatch, location.state?.floorName]);

  useEffect(() => {
    const prevFilter = prevFilterRef.current;
    const isStartOrLengthChanged =
      prevFilter.Start !== floorFilter.Start || prevFilter.Length !== floorFilter.Length;
    if (isStartOrLengthChanged) {
      setLoading(true);
    }
    dispatch(fetchFloorDT(floorFilter)).finally(() => {
      if (isStartOrLengthChanged) {
        setTimeout(() => {
          setLoading(false);
        }, 500);
      }
    });
    prevFilterRef.current = floorFilter;
  }, [floorFilter, dispatch]);

  const buildingData: BuildingType[] = useSelector(
    (state: RootState) => state.buildingReducer.buildingAll,
  );

  //Delete Pop-up
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedFloor, setSelectedFloor] = useState<floorType | null>(null);
  const deleteMutation = useDeleteFloor();
  // Open delete confirmation dialog
  const handleOpenDeleteDialog = (floor: floorType) => {
    setSelectedFloor(floor);
    setDeleteDialogOpen(true);
  };

  // Close delete confirmation dialog
  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setSelectedFloor(null);
  };

  // Confirm delete action
  const handleConfirmDelete = async () => {
    if (selectedFloor) {
      // setLoading(true);
      // try {
      //   const result = await dispatch(deleteFloor(selectedFloor.id));
      //   if (result && result.type && result.type.endsWith('/fulfilled')) {
      //     await dispatch(fetchFloorDT(floorFilter));
      //     toast.success('Data Deleted');
      //   }
      // } catch (error) {
      //   toast.error('Delete Data Unsuccessful');
      //   console.error('Error deleting floor:', error);
      // }
      // setTimeout(() => {
      //   setLoading(false);
      // }, 1000);
      try {
        await deleteMutation.mutateAsync(selectedFloor.id);
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
          {/* sticky index */}
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
          <TableCell>
            <Skeleton variant="text" width={180} height={22} />
          </TableCell>
          <TableCell>
            <Skeleton variant="text" width={160} height={22} />
          </TableCell>
          {/* right actions */}
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
              {/* <Skeleton variant="circular" width={32} height={32} />
              <Skeleton variant="circular" width={32} height={32} /> */}
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
            <TableContainer  sx={{
              maxHeight: '55vh',
            }}>
              <Table stickyHeader aria-label="simple table" sx={{ whiteSpace: 'nowrap' }}>
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
                        backgroundColor: 'background.paper',
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
                  {queryLoading
                    ? renderSkeletonRows(rowsPerPage || SKELETON_ROWS)
                      : floorData.map((floor: floorType, index: number) => {
                        const isOpen = expandedFloorId === floor.id;
                        const floorFloorplans = (floorplanData || []).filter(
                          (fp: any) => fp.floorId === floor.id
                        );
                        const building = floor.building;
                        return (
                          <React.Fragment key={floor.id}>
                            <TableRow>
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
                              <TableCell>{floor.name}</TableCell>
                              <TableCell>
                                {building ? (
                                  <Tooltip title="View Building" arrow>
                                    <Box
                                    component="span"
                                    onClick={() => navigate('/master/building', { state: { buildingName: building.name } })}
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
                                  gap: 1,
                                  alignItems: 'center',
                                  width: 150, // Fixed width
                                  minWidth: 150,
                                  maxWidth: 150,
                                }}
                              >
                                <AddEditFloor type="edit" floor={floor} />
                                 
                                <Tooltip title="Delete Floor" arrow>
                                  <IconButton
                                    color="error"
                                    size="small"
                                    onClick={() => handleOpenDeleteDialog(floor)}
                                  >
                                    <IconTrash size={20} />
                                  </IconButton>
                                </Tooltip>
                                {isChildShown && (
                                  <Tooltip title={isOpen ? 'Hide Floorplans' : 'Show Floorplans'} arrow>
                                    <IconButton size="small" onClick={() => toggleExpand(floor.id)}>
                                      {isOpen ? <IconChevronDown size={20} /> : <IconChevronRight size={20} />}
                                    </IconButton>
                                  </Tooltip>
                                )}
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
      <Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the floor <strong>{selectedFloor?.name}</strong>?
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

