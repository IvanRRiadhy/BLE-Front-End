import { useEffect, useState } from 'react';
import { useSelector, useDispatch, AppDispatch, RootState } from 'src/store/Store';
import Scrollbar from 'src/components/custom-scroll/Scrollbar';
import { fetchFloorplan, fetchFloorplanDT } from 'src/store/apps/crud/floorplan';
import {
  PatrolAreaType,
  DeleteUnsavedPatrolArea,
  RevertPatrolArea,
  SelectPatrolArea,
  SelectEditingPatrolArea,
  GetUnsavedPatrolArea,
  DrawingPatrolArea,
  ResetAreaState,
} from 'src/store/apps/crud/patrolArea';
import {
  usePatrolAreaList,
  useAddPatrolArea,
  useEditPatrolArea,
  useDeletePatrolArea,
} from 'src/hooks/usePatrolArea';
import AddIcon from '@mui/icons-material/Add';
import { Box } from '@mui/system';
import {
  Alert,
  Divider,
  Typography,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  DialogContentText,
  IconButton,
  Tooltip,
  CircularProgress,
  Backdrop,
} from '@mui/material';
import { createPortal } from 'react-dom';
import PatrolAreaListItem from './PatrolAreaListItem';
import { useNavigate } from 'react-router';
import { uniqueId } from 'lodash';
import toast from 'react-hot-toast';

const PatrolAreaList = () => {
  const dispatch: AppDispatch = useDispatch();
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  
  // Redux state for UI management
  const activeFloorplan = useSelector(
    (state: RootState) => state.floorplanReducer.selectedFloorplan,
  );
  const selectedPatrolArea = useSelector(
    (state: RootState) => state.PatrolAreaReducer.selectedPatrolArea,
  );
  const unsavedPatrolAreas = useSelector(
    (state: RootState) => state.PatrolAreaReducer.unsavedPatrolAreas,
  );
  const editingPatrolArea = useSelector(
    (state: RootState) => state.PatrolAreaReducer.editingPatrolArea,
  );
  const drawingArea = useSelector((state: RootState) => state.PatrolAreaReducer.drawingPatrolArea);
  const floorplanFilter = useSelector((state: RootState) => state.floorplanReducer.floorplanFilter);
  
  // Fix: Provide default empty arrays for potentially undefined values
  const deletedArea = useSelector((state: RootState) => state.PatrolAreaReducer.deletedPatrolArea) || [];
  const addedArea = useSelector((state: RootState) => state.PatrolAreaReducer.addedPatrolArea) || [];

  // React Query hooks for server state
  const {
    data: patrolAreasResponse,
    isLoading: isPatrolAreasLoading,
    refetch: refetchPatrolAreas,
  } = usePatrolAreaList({
    Draw: 1,
    Start: 0,
    Length: 0,
    SortColumn: '',
    SortDir: 'asc',
    SearchValue: '',
    filters: {
      FloorplanId: activeFloorplan?.id ? activeFloorplan?.id : "",
      FloorId: "",
    },
  });

  // Mutations
  const addMutation = useAddPatrolArea();
  const editMutation = useEditPatrolArea();
  const deleteMutation = useDeletePatrolArea();

  // Derived data from React Query
  const patrolAreasData = patrolAreasResponse?.data || [];
  const filteredPatrolArea = patrolAreasData;
  const filteredOriginalAreas = patrolAreasData;

  // Filter unsaved areas for current floorplan
  const filteredUnsavedPatrolArea = unsavedPatrolAreas.filter(
    (patrolArea: PatrolAreaType) => patrolArea.floorplanId === activeFloorplan?.id,
  );

  // State for dialogs
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState('');
  const [pendingAreaId, setPendingAreaId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteAreaId, setDeleteAreaId] = useState<string | null>(null);
  const [cancelEditDialogOpen, setCancelEditDialogOpen] = useState(false);

  // Initialize unsaved areas when data loads
  useEffect(() => {
    if (patrolAreasData.length > 0) {
      dispatch(GetUnsavedPatrolArea());
      console.log(patrolAreasData);
    }
  }, [patrolAreasData, dispatch]);

  const newArea: PatrolAreaType = {
    id: uniqueId('patrolArea_'),
    name: uniqueId('Patrol Area '),
    remarks: '',
    color: '#363636',
    areaShape: '[{}]',
    // restrictedStatus: 'Restricted',
    // wideArea: 0,
    // positionPxX: 0,
    // positionPxY: 0,
    // engineAreaId: 'ENG001',
    // allowFloorChange: false,
    floorId: activeFloorplan?.floorId || '',
    floorplanId: activeFloorplan?.id || '',
    isActive: true,
    // createdBy: 'admin',
    // createdAt: new Date().toISOString(),
    // updatedBy: 'admin',
    // updatedAt: new Date().toISOString(),
  };

  const handleAddAreaClick = () => {
    if (editingPatrolArea || drawingArea) {
      setPendingAreaId(newArea.id);
      setDialogType('add');
      setConfirmDialogOpen(true);
      return;
    }
    dispatch(SelectPatrolArea(''));
    dispatch(DrawingPatrolArea(newArea.id));
  };

  const handleOnClick = (id: string) => {
    if (selectedPatrolArea?.id === id) return;
    if (editingPatrolArea || drawingArea) {
      setPendingAreaId(id);
      setDialogType('select');
      setConfirmDialogOpen(true);
      return;
    }
    dispatch(SelectPatrolArea(id));
  };

  const handleConfirmProceed = () => {
    dispatch(RevertPatrolArea(editingPatrolArea?.id || ''));
    dispatch(DrawingPatrolArea(''));
    if (pendingAreaId) {
      if (dialogType === 'add') {
        dispatch(DrawingPatrolArea(pendingAreaId));
      }
      if (dialogType === 'select') {
        dispatch(SelectPatrolArea(pendingAreaId));
        dispatch(SelectEditingPatrolArea(null));
      }
    }
    setConfirmDialogOpen(false);
    setPendingAreaId(null);
  };

  const handleCancelProceed = () => {
    setConfirmDialogOpen(false);
    setPendingAreaId(null);
  };

  const handleOnEditClick = (id: string) => {
    dispatch(SelectEditingPatrolArea(id));
  };

  const handleOpenDeleteDialog = (id: string) => {
    setDeleteAreaId(id);
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setDeleteAreaId(null);
  };

  const handleConfirmDelete = () => {
    if (deleteAreaId) {
      dispatch(DeleteUnsavedPatrolArea(deleteAreaId));
    }
    dispatch(SelectPatrolArea(null));
    dispatch(SelectEditingPatrolArea(null));
    handleCloseDeleteDialog();
  };

  const handleOpenCancelEditingDialog = () => {
    setCancelEditDialogOpen(true);
  };

  const handleCloseCancelEditingDialog = () => {
    setCancelEditDialogOpen(false);
  };

  const handleCloseEditing = () => {
    dispatch(ResetAreaState());
    navigate('/master/patrolarea');
  };

// OPTIMIZED Save Function
const handleSaveEdits = async () => {
  setIsSaving(true);

  try {
    // Get original areas from React Query cache (server state)
    const originalAreas = patrolAreasData;
    
    // Get current unsaved areas from Redux (client state with modifications)
    const currentUnsavedAreas = filteredUnsavedPatrolArea;

    // Create a map of original areas for quick lookup
    const originAreaMap = new Map(
      originalAreas.map((area: PatrolAreaType) => [area.id, area])
    );

    // 1. Identify edited areas - compare unsaved areas with original areas
    const areasToEdit = currentUnsavedAreas.filter((unsavedArea: PatrolAreaType) => {
      const originalArea = originAreaMap.get(unsavedArea.id);
      // If area exists in original data and has changes
      return originalArea && JSON.stringify(unsavedArea) !== JSON.stringify(originalArea);
    });

    // 2. Identify deleted areas - areas that are in original but not in unsaved
    const areasToDelete = originalAreas.filter((originalArea: PatrolAreaType) => {
      return !currentUnsavedAreas.find((unsavedArea: PatrolAreaType) => 
        unsavedArea.id === originalArea.id
      );
    });

    // 3. Identify added areas - areas that are in unsaved but not in original
    const areasToAdd = currentUnsavedAreas.filter((unsavedArea: PatrolAreaType) => {
      return !originAreaMap.has(unsavedArea.id);
    });

    // Group operations by type
    const operations = {
      edits: areasToEdit,
      additions: areasToAdd,
      deletions: areasToDelete,
    };

    console.log('Save Operations:', operations);
    console.log('Original Areas:', originalAreas);
    console.log('Current Unsaved Areas:', currentUnsavedAreas);

    // Execute operations with better error handling
    let successCount = 0;
    let errorCount = 0;

    // Process deletions first (to avoid conflicts)
    for (const area of operations.deletions) {
      try {
        await deleteMutation.mutateAsync(area.id);
        successCount++;
      } catch (error) {
        console.error(`Failed to delete area ${area.id}:`, error);
        errorCount++;
      }
    }

    // Process edits
    for (const area of operations.edits) {
      try {
        await editMutation.mutateAsync(area);
        successCount++;
      } catch (error) {
        console.error(`Failed to edit area ${area.id}:`, error);
        errorCount++;
      }
    }

    // Process additions last
    for (const area of operations.additions) {
      try {
        await addMutation.mutateAsync(area);
        successCount++;
      } catch (error) {
        console.error(`Failed to add area ${area.id}:`, error);
        errorCount++;
      }
    }

    // Show appropriate toast message
    if (errorCount === 0 && successCount > 0) {
      toast.success(`Successfully completed ${successCount} operations`);
    } else if (errorCount > 0) {
      toast.error(`Completed ${successCount} operations, ${errorCount} failed`);
    } else {
      toast.error('No changes to save');
    }

    // Refetch data to ensure UI is in sync
    await refetchPatrolAreas();
    dispatch(fetchFloorplanDT(floorplanFilter));

  } catch (error) {
    console.error('Error during save operations:', error);
    toast.error('Save operation failed');
  } finally {
    setTimeout(() => {
      setIsSaving(false);
      handleCloseEditing();
    }, 1000);
  }
};

  if (isPatrolAreasLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: '80vh',
        display: 'grid',
        minHeight: 0,
        gridTemplateRows: 'auto 1fr auto',
        overflow: 'hidden',
        bgColor: 'background.default',
        borderColor: 'divider',
      }}
    >
      <Box p={3} px={2} display="flex" justifyContent="flex-start" alignItems="center">
        <Typography variant="h5" mb={2} fontWeight={700} textAlign="left">
          {activeFloorplan?.name}
        </Typography>
      </Box>
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" px={2} mb={2}>
          <Typography variant="h6" mt={0}>
            Patrol Areas
          </Typography>
          {!editingPatrolArea && (
            <Tooltip title="Add Patrol Area">
              <IconButton color="primary" onClick={handleAddAreaClick}>
                <AddIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>
        <Divider />
        <Scrollbar
          sx={{ height: { lg: 'calc(100vh - 370px)', sm: '100vh' }, maxHeight: 'fit-content' }}
        >
          {filteredUnsavedPatrolArea.length > 0 ? (
            filteredUnsavedPatrolArea.map((patrolArea: PatrolAreaType) => (
              <PatrolAreaListItem
                key={patrolArea.id}
                patrolArea={patrolArea}
                onListClick={() => handleOnClick(patrolArea.id)}
                onEditClick={() => handleOnEditClick(patrolArea.id)}
                onDeleteClick={() => handleOpenDeleteDialog(patrolArea.id)}
                active={patrolArea.id === selectedPatrolArea?.id}
              />
            ))
          ) : (
            <Alert severity="info">No patrol areas found for this floorplan.</Alert>
          )}
        </Scrollbar>
      </Box>

      <Box
        p={2}
        bottom={0}
        sx={{
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: '#fafafa',
          m: 0,
        }}
      >
        {!editingPatrolArea && (
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Button variant="outlined" onClick={handleOpenCancelEditingDialog}>
              Cancel
            </Button>
            <Button variant="contained" onClick={handleSaveEdits} disabled={isSaving}>
              {isSaving ? <CircularProgress size={20} color="inherit" /> : 'Save'}
            </Button>
          </Box>
        )}
      </Box>

      {/* Confirmation Dialogs */}
      <Dialog open={confirmDialogOpen} onClose={handleCancelProceed} maxWidth="xs" fullWidth>
        <DialogTitle>Confirm Action</DialogTitle>
        <DialogContent>
          <DialogContentText>
            You are still in editing mode. Any editing progress will be cancelled if you wish to
            proceed. Do you want to continue?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelProceed} color="primary" variant="contained">
            Cancel
          </Button>
          <Button onClick={handleConfirmProceed} color="error">
            Proceed
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the Patrol Area <strong>{deleteAreaId}</strong>?
          </DialogContentText>
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

      <Dialog open={cancelEditDialogOpen} onClose={handleCloseCancelEditingDialog}>
        <DialogTitle>Cancel Edit?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to cancel the editing progress? Any unsaved changes will be lost.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCancelEditingDialog} color="primary">
            Go Back to Editing
          </Button>
          <Button onClick={handleCloseEditing} color="error">
            Yes, Cancel Editing
          </Button>
        </DialogActions>
      </Dialog>

      {isSaving &&
        createPortal(
          <Backdrop
            open={isSaving}
            sx={{
              color: '#fff',
              zIndex: (theme) => theme.zIndex.drawer + 1,
            }}
          >
            <CircularProgress color="inherit" />
          </Backdrop>,
          document.body,
        )}
    </Box>
  );
};

export default PatrolAreaList;