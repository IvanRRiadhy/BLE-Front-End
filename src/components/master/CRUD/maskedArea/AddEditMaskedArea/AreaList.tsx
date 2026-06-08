import { useEffect, useState } from 'react';
import { useSelector, useDispatch, AppDispatch, RootState } from 'src/store/Store';
import Scrollbar from 'src/components/custom-scroll/Scrollbar';
import { fetchFloorplan, fetchFloorplanDT } from 'src/store/apps/crud/floorplan';
import {
  MaskedAreaType,
  DeleteUnsavedMaskedArea,
  RevertMaskedArea,
  SelectMaskedArea,
  SelectEditingMaskedArea,
  GetUnsavedMaskedArea,
  DrawingMaskedArea,
  ResetAreaState,
} from 'src/store/apps/crud/maskedArea';
import {
  useMaskedAreaList,
  useAddMaskedArea,
  useEditMaskedArea,
  useDeleteMaskedArea,
} from 'src/hooks/useMaskedArea';
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
import AreaListItem from './AreaListItem';
import { useNavigate } from 'react-router';
import { uniqueId } from 'lodash';
import toast from 'react-hot-toast';
import { useReleaseFloorplanDevice } from 'src/hooks/useFloorplanDevice';
import { useBlocker } from 'react-router';
import usePreventWindowClose from 'src/hooks/usePreventWindowClose';

const AreaList = () => {
  const dispatch: AppDispatch = useDispatch();
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);

  // Redux state for UI management
  const activeFloorplan = useSelector(
    (state: RootState) => state.floorplanReducer.selectedFloorplan,
  );
  const selectedMaskedArea = useSelector(
    (state: RootState) => state.maskedAreaReducer.selectedMaskedArea,
  );
  const unsavedMaskedAreas = useSelector(
    (state: RootState) => state.maskedAreaReducer.unsavedMaskedAreas,
  );
  const editingMaskedArea = useSelector(
    (state: RootState) => state.maskedAreaReducer.editingMaskedArea,
  );
  const deviceToDisable = useSelector(
    (state: RootState) => state.floorplanDeviceReducer.deviceToDisable,
  );
  const drawingArea = useSelector((state: RootState) => state.maskedAreaReducer.drawingMaskedArea);
  const floorplanFilter = useSelector((state: RootState) => state.floorplanReducer.floorplanFilter);

  // Fix: Provide default empty arrays for potentially undefined values
  const deletedArea =
    useSelector((state: RootState) => state.maskedAreaReducer.deletedMaskedArea) || [];
  const addedArea =
    useSelector((state: RootState) => state.maskedAreaReducer.addedMaskedArea) || [];

  // React Query hooks for server state
  const {
    data: maskedAreasResponse,
    isLoading: isMaskedAreasLoading,
    refetch: refetchMaskedAreas,
  } = useMaskedAreaList({
    Draw: 1,
    Start: 0,
    Length: 999,
    SortColumn: '',
    SortDir: 'asc',
    SearchValue: '',
    filters: {
      FloorplanId: activeFloorplan?.id ? [activeFloorplan.id] : [],
      FloorId: [],
    },
  });

  // Mutations
  const addMutation = useAddMaskedArea();
  const editMutation = useEditMaskedArea();
  const deleteMutation = useDeleteMaskedArea();
  const disableDeviceMutation = useReleaseFloorplanDevice();

  // Derived data from React Query
  const maskedAreasData = maskedAreasResponse?.data || [];
  const filteredMaskedArea = maskedAreasData;
  const filteredOriginalAreas = maskedAreasData;

  // Filter unsaved areas for current floorplan
  const filteredUnsavedMaksedArea = unsavedMaskedAreas.filter(
    (maskedArea: MaskedAreaType) => maskedArea.floorplanId === activeFloorplan?.id,
  );

  // State for dialogs
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState('');
  const [pendingAreaId, setPendingAreaId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteAreaId, setDeleteAreaId] = useState<string | null>(null);
  const [cancelEditDialogOpen, setCancelEditDialogOpen] = useState(false);
  const [saveWarningDialogOpen, setSaveWarningDialogOpen] = useState(false);

  // Browser level protection (close tab, refresh)
  usePreventWindowClose(!isSaving);

  // Router level protection (internal navigation, browser back button)
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !isSaving && currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (blocker.state === 'blocked') {
      setCancelEditDialogOpen(true);
    }
  }, [blocker.state]);

  // Initialize unsaved areas when data loads
  useEffect(() => {
    if (maskedAreasData.length > 0) {
      dispatch(GetUnsavedMaskedArea());
    }
  }, [maskedAreasData, dispatch]);

  // Auto-scroll to selected area
  useEffect(() => {
    if (selectedMaskedArea?.id) {
      const element = document.getElementById(`area-item-${selectedMaskedArea.id}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [selectedMaskedArea?.id]);

  const newArea: MaskedAreaType = {
    id: uniqueId('maskedArea_'),
    name: uniqueId('Masked Area '),
    colorArea: '#363636',
    areaShape: '[{}]',
    restrictedStatus: 'Restricted',
    // wideArea: 0,
    // positionPxX: 0,
    // positionPxY: 0,
    // engineAreaId: 'ENG001',
    isAssemblyPoint: false,
    allowFloorChange: false,
    floorId: activeFloorplan?.floorId || '',
    floorplanId: activeFloorplan?.id || '',
    createdBy: 'admin',
    createdAt: new Date().toISOString(),
    updatedBy: 'admin',
    updatedAt: new Date().toISOString(),
  };

  const handleAddAreaClick = () => {
    if (editingMaskedArea || drawingArea) {
      setPendingAreaId(newArea.id);
      setDialogType('add');
      setConfirmDialogOpen(true);
      return;
    }
    dispatch(SelectMaskedArea(''));
    dispatch(DrawingMaskedArea(newArea.id));
  };

  const handleOnClick = (id: string) => {
    if (selectedMaskedArea?.id === id) return;
    if (editingMaskedArea || drawingArea) {
      setPendingAreaId(id);
      setDialogType('select');
      setConfirmDialogOpen(true);
      return;
    }
    dispatch(SelectMaskedArea(id));
  };

  const handleConfirmProceed = () => {
    dispatch(RevertMaskedArea(editingMaskedArea?.id || ''));
    dispatch(DrawingMaskedArea(''));
    if (pendingAreaId) {
      if (dialogType === 'add') {
        dispatch(DrawingMaskedArea(pendingAreaId));
      }
      if (dialogType === 'select') {
        dispatch(SelectMaskedArea(pendingAreaId));
        dispatch(SelectEditingMaskedArea(null));
      }
    }
    setConfirmDialogOpen(false);
    setPendingAreaId(null);
  };

  const handleCancelProceed = () => {
    setConfirmDialogOpen(false);
    setPendingAreaId(null);
  };

  const handleOnEditClick = (area: MaskedAreaType) => {
    dispatch(SelectEditingMaskedArea(area));
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
      dispatch(DeleteUnsavedMaskedArea(deleteAreaId));
    }
    dispatch(SelectMaskedArea(null));
    dispatch(SelectEditingMaskedArea(null));
    handleCloseDeleteDialog();
  };

  const handleOpenCancelEditingDialog = () => {
    setCancelEditDialogOpen(true);
  };

  const handleCloseCancelEditingDialog = () => {
    if (blocker.state === 'blocked') {
      blocker.reset();
    }
    setCancelEditDialogOpen(false);
  };

  const handleCloseEditing = () => {
    dispatch(ResetAreaState());
    if (blocker.state === 'blocked') {
      blocker.proceed();
    } else {
      navigate('/master/floorplanmaskedarea');
    }
  };

  // Guard: show warning if devices will be disabled on save
  const handleSaveClick = () => {
    if (deviceToDisable.length > 0) {
      setSaveWarningDialogOpen(true);
    } else {
      handleSaveEdits();
    }
  };

  // OPTIMIZED Save Function
  const handleSaveEdits = async () => {
    setIsSaving(true);

    try {
      // Get original areas from React Query cache (server state)
      const originalAreas = maskedAreasData;

      // Get current unsaved areas from Redux (client state with modifications)
      const currentUnsavedAreas = filteredUnsavedMaksedArea;

      // Create a map of original areas for quick lookup
      const originAreaMap = new Map(originalAreas.map((area: MaskedAreaType) => [area.id, area]));

      // 1. Identify edited areas - compare unsaved areas with original areas
      const areasToEdit = currentUnsavedAreas.filter((unsavedArea: MaskedAreaType) => {
        const originalArea = originAreaMap.get(unsavedArea.id);
        // If area exists in original data and has changes
        return originalArea && JSON.stringify(unsavedArea) !== JSON.stringify(originalArea);
      });

      // 2. Identify deleted areas - areas that are in original but not in unsaved
      const areasToDelete = originalAreas.filter((originalArea: MaskedAreaType) => {
        return !currentUnsavedAreas.find(
          (unsavedArea: MaskedAreaType) => unsavedArea.id === originalArea.id,
        );
      });

      // 3. Identify added areas - areas that are in unsaved but not in original
      const areasToAdd = currentUnsavedAreas.filter((unsavedArea: MaskedAreaType) => {
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
      console.log('Devices to Disable:', deviceToDisable);

      // Execute operations with better error handling
      let successCount = 0;
      let errorCount = 0;
      let disableDevice = false;
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
      if (deviceToDisable.length > 0) {
        const res = await disableDeviceMutation.mutateAsync(deviceToDisable);
        if (res.success) {
          console.log('Devices disabled successfully');
          toast.success('Devices disabled successfully');
          disableDevice = true;
        } else {
          console.error('Failed to disable devices:', res.message);
          toast.error('Failed to disable devices');
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
      await refetchMaskedAreas();
      dispatch(fetchFloorplanDT(floorplanFilter));
    } catch (error) {
      console.error('Error during save operations:', error);
      toast.error('Save operation failed');
    } finally {
      setTimeout(() => {
        handleCloseEditing();
        setIsSaving(false);
      }, 1000);
    }
  };

  if (isMaskedAreasLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: '88vh',
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
            Masked Areas
          </Typography>
          {!editingMaskedArea && !drawingArea && (
            <Tooltip title="Add Masked Area">
              <IconButton color="primary" onClick={handleAddAreaClick}>
                <AddIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>
        <Divider />
        <Scrollbar
          sx={{ height: { lg: 'calc(88vh - 205px)', sm: '100vh' }, maxHeight: 'fit-content' }}
        >
          {filteredUnsavedMaksedArea.length > 0 ? (
            filteredUnsavedMaksedArea.map((area: MaskedAreaType) => (
              <AreaListItem
                key={area.id}
                area={area}
                onListClick={() => handleOnClick(area.id)}
                onEditClick={() => handleOnEditClick(area)}
                onDeleteClick={() => handleOpenDeleteDialog(area.id)}
                active={area.id === selectedMaskedArea?.id}
              />
            ))
          ) : (
            <Alert severity="info">No masked areas found for this floorplan.</Alert>
          )}
        </Scrollbar>
      </Box>

      <Box
        p={2}
        bottom={0}
        sx={{
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          m: 0,
        }}
      >
        {/* {!editingMaskedArea && ( */}
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Button 
              variant="outlined" 
              onClick={() => navigate('/master/floorplanmaskedarea')} 
              disabled={!!editingMaskedArea || isSaving}
            >
              Cancel
            </Button>
            <Button variant="contained" onClick={handleSaveClick} disabled={isSaving || !!editingMaskedArea}>
              {isSaving ? <CircularProgress size={20} color="inherit" /> : 'Save'}
            </Button>
          </Box>
        {/* )} */}
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
            Are you sure you want to delete the Masked Area <strong>{deleteAreaId}</strong>?
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

      {/* Save Warning — devices will be disabled */}
      <Dialog
        open={saveWarningDialogOpen}
        onClose={() => setSaveWarningDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>⚠️ Devices Outside Their Area</DialogTitle>
        <DialogContent>
          <DialogContentText>
            <strong>
              {deviceToDisable.length} device{deviceToDisable.length > 1 ? 's are' : ' is'}
            </strong>{' '}
            currently positioned outside of their assigned masked area. Saving these changes will{' '}
            <strong>disable those devices</strong> — they must be re-confirmed as active before they
            can be used again.
          </DialogContentText>
          <DialogContentText sx={{ mt: 1.5 }}>
            Do you want to proceed with saving?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setSaveWarningDialogOpen(false)}
            color="primary"
            variant="outlined"
          >
            Cancel
          </Button>
          <Button
            color="warning"
            variant="contained"
            onClick={() => {
              setSaveWarningDialogOpen(false);
              handleSaveEdits();
            }}
          >
            Proceed Anyway
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

export default AreaList;
