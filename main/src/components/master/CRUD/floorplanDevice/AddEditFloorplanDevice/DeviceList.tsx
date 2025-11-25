import { useEffect, useState } from 'react';
import { useSelector, useDispatch, AppDispatch, RootState } from 'src/store/Store';
import Scrollbar from 'src/components/custom-scroll/Scrollbar';
import { fetchFloorplan, fetchFloorplanDT } from 'src/store/apps/crud/floorplan';
import {
  AddUnsavedDevice,
  DeleteUnsavedDevice,
  FloorplanDeviceType,
  GetUnsavedFloorplanDevices,
  ResetState,
  RevertDevice,
  SelectEditingFloorplanDevice,
  SelectFloorplanDevice,
} from 'src/store/apps/crud/floorplanDevice';
import {
  useFloorplanDeviceList,
  useAddFloorplanDevice,
  useEditFloorplanDevice,
  useDeleteFloorplanDevice,
} from 'src/hooks/useFloorplanDevice';
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
import DeviceListItem from './DeviceListItem';
import { useNavigate } from 'react-router';
import { fetchAccessCCTV } from 'src/store/apps/crud/accessCCTV';
import { fetchAccessControls } from 'src/store/apps/crud/accessControl';
import { fetchBleReaders } from 'src/store/apps/crud/bleReader';
import toast from 'react-hot-toast';

const DeviceList = () => {
  const dispatch: AppDispatch = useDispatch();
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);

  // Redux state for UI management
  const activeFloorplan = useSelector(
    (state: RootState) => state.floorplanReducer.selectedFloorplan,
  );
  const selectedDevice = useSelector(
    (state: RootState) => state.floorplanDeviceReducer.selectedFloorplanDevice,
  );
  const unsavedDevices = useSelector(
    (state: RootState) => state.floorplanDeviceReducer.unsavedFloorplanDevices,
  );
  const editingDevice = useSelector(
    (state: RootState) => state.floorplanDeviceReducer.editingFloorplanDevice,
  );
  const floorplanFilter = useSelector((state: RootState) => state.floorplanReducer.floorplanFilter);

  // Fix: Provide default empty arrays for potentially undefined values
  const deletedDevice =
    useSelector((state: RootState) => state.floorplanDeviceReducer.deletedFloorplanDevice) || [];
  const addedDevice =
    useSelector((state: RootState) => state.floorplanDeviceReducer.addedFloorplanDevice) || [];

  // External data from Redux (keep these as they're used for new device defaults)
  const firstCCTV = useSelector((state: RootState) => state.CCTVReducer.cctvs[0]);
  const firstAccessControl = useSelector(
    (state: RootState) => state.accessControlReducer.accessControls[0],
  );
  const firstBleReader = useSelector((state: RootState) => state.bleReaderReducer.bleReaders[0]);

  // React Query hooks for server state
  const {
    data: floorplanDevicesResponse,
    isLoading: isDevicesLoading,
    refetch: refetchFloorplanDevices,
  } = useFloorplanDeviceList({
    Draw: 1,
    Start: 0,
    Length: 999,
    SortColumn: '',
    SortDir: 'asc',
    SearchValue: '',
    filters: {
      FloorplanId: activeFloorplan?.id ? [activeFloorplan.id] : [],
      FloorplanMaskedAreaId: [],
    },
  });

  useEffect(() => {
    console.log("Floorplan Devices Response:", floorplanDevicesResponse);
  }, [floorplanDevicesResponse]);



  // React Query mutations
  const addMutation = useAddFloorplanDevice();
  const editMutation = useEditFloorplanDevice();
  const deleteMutation = useDeleteFloorplanDevice();

  // Derived data from React Query
  const floorplanDevicesData = floorplanDevicesResponse?.data || [];
  const filteredOriginalDevices = floorplanDevicesData; // Already filtered by backend
  //98e73270-40b4-427c-bf99-ebd5e46394bf
  // Filter unsaved devices for current floorplan (client-side for local changes)
  const filteredUnsavedDevices = unsavedDevices.filter(
    (device: FloorplanDeviceType) => device.floorplanId === activeFloorplan?.id,
  );
    useEffect(() => {
    console.log("Unsaved Devices Response:", unsavedDevices);
    console.log("Filtered Unsaved Devices:", filteredUnsavedDevices);
    console.log("Active Floorplan ID:", activeFloorplan);
  }, [unsavedDevices]);
  // State for dialogs
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState('');
  const [pendingDeviceId, setPendingDeviceId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteDeviceId, setDeleteDeviceId] = useState<string | null>(null);
  const [cancelEditDialogOpen, setCancelEditDialogOpen] = useState(false);

  // New device template
  const newDevice: FloorplanDeviceType = {
    id: `temp-${Date.now()}`,
    name: 'New Device',
    type: '',
    floorplanId: activeFloorplan?.id || '',
    accessCctvId: firstCCTV?.id || '',
    readerId: firstBleReader?.id || '',
    accessControlId: firstAccessControl?.id || '',
    posX: 10,
    posY: 10,
    posPxX: 10,
    posPxY: 10,
    floorplanMaskedAreaId: '',
    applicationId: activeFloorplan?.applicationId || localStorage.getItem('applicationId') || '',
    deviceStatus: 'Active',
    createdAt: new Date().toISOString(),
    createdBy: 'admin',
    updatedAt: new Date().toISOString(),
    updatedBy: 'admin',
  };

  // Initialize unsaved devices when data loads
  useEffect(() => {
    if (floorplanDevicesData.length > 0) {
      dispatch(GetUnsavedFloorplanDevices());
    }
  }, [floorplanDevicesData, dispatch]);

  // Fetch external data on mount
  useEffect(() => {
    dispatch(fetchFloorplan());
    dispatch(fetchAccessCCTV());
    dispatch(fetchAccessControls());
    dispatch(fetchBleReaders());
  }, [dispatch]);

  const handleAddDeviceClick = () => {
    if (editingDevice) {
      setPendingDeviceId(newDevice.id);
      setDialogType('add');
      setConfirmDialogOpen(true);
      return;
    }
    dispatch(AddUnsavedDevice(newDevice));
    dispatch(SelectFloorplanDevice(newDevice.id));
    dispatch(SelectEditingFloorplanDevice(newDevice));
  };

  const handleOnClick = (id: string) => {
    if (selectedDevice?.id === id) return;
    if (editingDevice) {
      setPendingDeviceId(id);
      setDialogType('select');
      setConfirmDialogOpen(true);
      return;
    }
    dispatch(SelectFloorplanDevice(id));
  };

  const handleConfirmProceed = () => {
    dispatch(RevertDevice(editingDevice?.id || ''));
    if (pendingDeviceId) {
      if (dialogType === 'add') {
        dispatch(AddUnsavedDevice(newDevice));
        dispatch(SelectFloorplanDevice(newDevice.id));
        dispatch(SelectEditingFloorplanDevice(newDevice));
      }
      if (dialogType === 'select') {
        dispatch(SelectFloorplanDevice(pendingDeviceId));
        dispatch(SelectEditingFloorplanDevice(null));
      }
    }
    setConfirmDialogOpen(false);
    setPendingDeviceId(null);
  };

  const handleCancelProceed = () => {
    setConfirmDialogOpen(false);
    setPendingDeviceId(null);
  };

  const handleOnEditClick = (deviceToEdit: FloorplanDeviceType) => {
    dispatch(SelectEditingFloorplanDevice(deviceToEdit));
  };

  const handleOpenDeleteDialog = (id: string) => {
    setDeleteDeviceId(id);
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setDeleteDeviceId(null);
  };

  const handleConfirmDelete = () => {
    if (deleteDeviceId) {
      dispatch(DeleteUnsavedDevice(deleteDeviceId));
    }
    dispatch(SelectFloorplanDevice(null));
    dispatch(SelectEditingFloorplanDevice(null));
    handleCloseDeleteDialog();
  };

  const handleOpenCancelEditingDialog = () => {
    setCancelEditDialogOpen(true);
  };

  const handleCloseCancelEditingDialog = () => {
    setCancelEditDialogOpen(false);
  };

  const handleCloseEditing = () => {
    dispatch(ResetState());
    navigate('/master/device');
  };

  // OPTIMIZED Save Function using React Query mutations
  const handleSaveEdits = async () => {
    setIsSaving(true);

    try {
      // Get original devices from React Query cache (server state)
      const originalDevices = filteredOriginalDevices;

      // Get current unsaved devices from Redux (client state with modifications)
      const currentUnsavedDevices = filteredUnsavedDevices;

      // Create a map of original devices for quick lookup
      const originDeviceMap = new Map(
        originalDevices.map((device: FloorplanDeviceType) => [device.id, device]),
      );
      console.log(originDeviceMap, currentUnsavedDevices)
      // 1. Identify edited devices - compare unsaved devices with original devices
      const devicesToEdit = currentUnsavedDevices.filter((unsavedDevice: FloorplanDeviceType) => {
        const originalDevice = originDeviceMap.get(unsavedDevice.id);
        // If device exists in original data and has changes
        return originalDevice && JSON.stringify(unsavedDevice) !== JSON.stringify(originalDevice);
      });

      // 2. Identify deleted devices - devices that are in original but not in unsaved
      const devicesToDelete = originalDevices.filter((originalDevice: FloorplanDeviceType) => {
        return !currentUnsavedDevices.find(
          (unsavedDevice: FloorplanDeviceType) => unsavedDevice.id === originalDevice.id,
        );
      });

      // 3. Identify added devices - devices that are in unsaved but not in original
      const devicesToAdd = currentUnsavedDevices.filter((unsavedDevice: FloorplanDeviceType) => {
        return !originDeviceMap.has(unsavedDevice.id);
      });

      // Group operations by type
      const operations = {
        edits: devicesToEdit,
        additions: devicesToAdd,
        deletions: devicesToDelete,
      };

      console.log('Save Operations:', operations);
      console.log('Original Devices:', originalDevices);
      console.log('Current Unsaved Devices:', currentUnsavedDevices);

      // Execute operations with better error handling
      let successCount = 0;
      let errorCount = 0;

      // Process deletions first (to avoid conflicts)
      for (const device of operations.deletions) {
        try {
          await deleteMutation.mutateAsync(device.id);
          successCount++;
        } catch (error) {
          console.error(`Failed to delete device ${device.id}:`, error);
          errorCount++;
        }
      }

      // Process edits
      for (const device of operations.edits) {
        try {
          await editMutation.mutateAsync(device);
          successCount++;
        } catch (error) {
          console.error(`Failed to edit device ${device.id}:`, error);
          errorCount++;
        }
      }

      // Process additions last
      for (const device of operations.additions) {
        try {
          await addMutation.mutateAsync(device);
          successCount++;
        } catch (error) {
          console.error(`Failed to add device ${device.id}:`, error);
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
      await refetchFloorplanDevices();
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

  if (isDevicesLoading) {
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
            Devices
          </Typography>
          {!editingDevice && (
            <Tooltip title="Add Device">
              <IconButton color="primary" onClick={handleAddDeviceClick}>
                <AddIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>
        <Divider />
        <Scrollbar
          sx={{ height: { lg: 'calc(100vh - 370px)', sm: '100vh' }, maxHeight: 'fit-content' }}
        >
          {filteredUnsavedDevices.length > 0 ? (
            filteredUnsavedDevices.map((device: FloorplanDeviceType) => (
              <DeviceListItem
                key={device.id}
                device={device}
                onListClick={() => handleOnClick(device.id)}
                onEditClick={() => handleOnEditClick(device)}
                onDeleteClick={() => handleOpenDeleteDialog(device.id)}
                active={device.id === selectedDevice?.id}
              />
            ))
          ) : (
            <Alert severity="info">No devices found for this floorplan.</Alert>
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
        {!editingDevice && (
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
            Are you sure you want to delete the Device <strong>{deleteDeviceId}</strong>?
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

export default DeviceList;
