import { useEffect, useState } from 'react';
import { useSelector, useDispatch, AppDispatch, RootState } from 'src/store/Store';
import Scrollbar from 'src/components/custom-scroll/Scrollbar';
import { fetchFloorplan, fetchFloorplanDT } from 'src/store/apps/crud/floorplan';
import {
  AddUnsavedDevice,
  FloorplanDeviceType,
  InitializeAllLayers,
  ResetState,
  // RevertDevice,
  SelectEditingFloorplanDevice,
  SelectFloorplanDevice,
  ApplyUnsavedToSaved,
  DeleteUnsavedDevice,
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
import { useBlocker } from 'react-router';
import usePreventWindowClose from 'src/hooks/usePreventWindowClose';


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
  const savedDevices = useSelector(
    (state: RootState) => state.floorplanDeviceReducer.savedFloorplanDevices,
  );
  const editingDevice = useSelector(
    (state: RootState) => state.floorplanDeviceReducer.editingFloorplanDevice,
  );
  const floorplanFilter = useSelector((state: RootState) => state.floorplanReducer.floorplanFilter);

  // Fix: Provide default empty arrays for potentially undefined values
  // const deletedDevice =
  //   useSelector((state: RootState) => state.floorplanDeviceReducer.deletedFloorplanDevice) || [];
  // const addedDevice =
  //   useSelector((state: RootState) => state.floorplanDeviceReducer.addedFloorplanDevice) || [];

  // External data from Redux (keep these as they're used for new device defaults)
  // const firstCCTV = useSelector((state: RootState) => state.CCTVReducer.cctvs[0]);
  // const firstAccessControl = useSelector(
  //   (state: RootState) => state.accessControlReducer.accessControls[0],
  // );
  // const firstBleReader = useSelector((state: RootState) => state.bleReaderReducer.bleReaders[0]);

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

  // React Query mutations
  const addMutation = useAddFloorplanDevice();
  const editMutation = useEditFloorplanDevice();
  const deleteMutation = useDeleteFloorplanDevice();

  // Derived data from React Query
  const floorplanDevicesData = floorplanDevicesResponse?.data || [];
  const filteredOriginalDevices = floorplanDevicesData; // Already filtered by backend

  // Filter unsaved devices for current floorplan (client-side for local changes)
  const filteredUnsavedDevices = unsavedDevices.filter(
    (device: FloorplanDeviceType) => device.floorplanId === activeFloorplan?.id,
  );

  // Filter saved devices for current floorplan
  const filteredSavedDevices = savedDevices.filter(
    (device: FloorplanDeviceType) => device.floorplanId === activeFloorplan?.id,
  );

  // State for dialogs
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState('');
  const [pendingDeviceId, setPendingDeviceId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteDeviceId, setDeleteDeviceId] = useState<string | null>(null);
  const [cancelEditDialogOpen, setCancelEditDialogOpen] = useState(false);

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

  // New device template
  const newDevice: FloorplanDeviceType = {
    id: `new-${Date.now()}`,
    name: 'New Device',
    type: '',
    floorplanId: activeFloorplan?.id || '',
    accessCctvId: null,
    readerId: null,
    accessControlId: null,
    // readerType: "Indoor",
    posX: 100,
    posY: 100,
    posPxX: 100,
    posPxY: 100,
    floorplanMaskedAreaId: '',
    applicationId: activeFloorplan?.applicationId || localStorage.getItem('applicationId') || '',
    deviceStatus: 'NonActive',
    createdAt: new Date().toISOString(),
    createdBy: 'admin',
    updatedAt: new Date().toISOString(),
    updatedBy: 'admin',
  };

  // Initialize all layers when data loads
  useEffect(() => {
    if (floorplanDevicesData.length > 0) {
      dispatch(InitializeAllLayers(floorplanDevicesData));
    }
  }, [floorplanDevicesData, dispatch]);

  // Auto-scroll to selected device
  useEffect(() => {
    if (selectedDevice?.id) {
      const element = document.getElementById(`device-item-${selectedDevice.id}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [selectedDevice?.id]);

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
    if (dialogType === 'add') {
      dispatch(AddUnsavedDevice(newDevice));
      dispatch(SelectFloorplanDevice(newDevice.id));
      dispatch(SelectEditingFloorplanDevice(newDevice));
    }
    if (dialogType === 'select') {
      dispatch(SelectFloorplanDevice(pendingDeviceId));
      dispatch(SelectEditingFloorplanDevice(null));
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
      // Find the device to get its name for the toast
      const deviceToDelete = filteredUnsavedDevices.find((d: FloorplanDeviceType) => d.id === deleteDeviceId);
      
      // We'll handle the actual deletion in the save function
      // For now, just remove from unsaved devices
      dispatch(DeleteUnsavedDevice(deleteDeviceId));
      
      toast.success(`Device "${deviceToDelete?.name || deleteDeviceId}" marked for deletion. It will be removed when you save.`);
    }
    dispatch(SelectFloorplanDevice(null));
    dispatch(SelectEditingFloorplanDevice(null));
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
    dispatch(ResetState());
    if (blocker.state === 'blocked') {
      blocker.proceed();
    } else {
      navigate('/master/device');
    }
  };

  // UPDATED Save Function using three-layer state management
  const handleSaveEdits = async () => {
    setIsSaving(true);

    try {
      // Get current saved devices (from saved layer)
      const currentSavedDevices = filteredSavedDevices;
      
      // Get current unsaved devices (editing layer)
      const currentUnsavedDevices = filteredUnsavedDevices;

      console.log('Current Saved Devices:', currentSavedDevices);
      console.log('Current Unsaved Devices:', currentUnsavedDevices);
      console.log('Original Devices from Server:', filteredOriginalDevices);

      // Create maps for quick lookup
      const originalDeviceMap = new Map(
        filteredOriginalDevices.map((device: FloorplanDeviceType) => [device.id, device])
      );

      const savedDeviceMap = new Map(
        currentSavedDevices.map((device: FloorplanDeviceType) => [device.id, device])
      );

      const unsavedDeviceMap = new Map(
        currentUnsavedDevices.map((device: FloorplanDeviceType) => [device.id, device])
      );

      // Identify operations
      const operations = {
        additions: [] as FloorplanDeviceType[],
        deletions: [] as FloorplanDeviceType[],
        updates: [] as FloorplanDeviceType[],
      };

      // 1. Check for deletions: devices in original but not in unsaved
      filteredOriginalDevices.forEach((originalDevice: FloorplanDeviceType) => {
        if (!unsavedDeviceMap.has(originalDevice.id)) {
          operations.deletions.push(originalDevice);
        }
      });

      // 2. Check for additions and updates
      currentUnsavedDevices.forEach((unsavedDevice: FloorplanDeviceType) => {
        const originalDevice = originalDeviceMap.get(unsavedDevice.id);
        
        if (!originalDevice) {
          // This is a new device (not in original)
          operations.additions.push(unsavedDevice);
        } else {
          // Check if device has been modified
          const isModified = JSON.stringify(unsavedDevice) !== JSON.stringify(originalDevice);
          if (isModified) {
            operations.updates.push(unsavedDevice);
          }
        }
      });

      console.log('Save Operations:', operations);

      // Execute operations
      let successCount = 0;
      let errorCount = 0;

      // Process deletions first
      for (const device of operations.deletions) {
        try {
          await deleteMutation.mutateAsync(device.id);
          successCount++;
        } catch (error) {
          console.error(`Failed to delete device ${device.id}:`, error);
          errorCount++;
        }
      }

      // Process updates
      for (const device of operations.updates) {
        try {
          // Remove devicePath from the data sent to backend since it's stored in the path field
          const { devicePath, ...deviceWithoutPath } = device;
          await editMutation.mutateAsync(deviceWithoutPath);
          successCount++;
        } catch (error) {
          console.error(`Failed to update device ${device.id}:`, error);
          errorCount++;
        }
      }

      // Process additions last
      for (const device of operations.additions) {
        try {
          // Remove devicePath from the data sent to backend since it's stored in the path field
          const { devicePath, ...deviceWithoutPath } = device;
          await addMutation.mutateAsync(deviceWithoutPath);
          successCount++;
        } catch (error) {
          console.error(`Failed to add device ${device.id}:`, error);
          errorCount++;
        }
      }

      // Apply unsaved changes to saved layer if operations were successful
      if (successCount > 0 && errorCount === 0) {
        dispatch(ApplyUnsavedToSaved());
      }

      // Show appropriate toast message
      if (errorCount === 0 && successCount > 0) {
        toast.success(`Successfully completed ${successCount} operations`);
      } else if (errorCount > 0) {
        toast.error(`Completed ${successCount} operations, ${errorCount} failed`);
      } else {
        toast.error('No changes to save');
      }

      // Refetch data to ensure UI is in sync with server
      await refetchFloorplanDevices();
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
        height: '90vh',
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
          bgcolor: 'background.paper',
          m: 0,
        }}
      >
        {/* {!editingDevice && ( */}
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Button 
              variant="outlined" 
              onClick={() => navigate('/master/device')}  
              disabled={!!editingDevice || isSaving}
            >
              Cancel
            </Button>
            <Button variant="contained" onClick={handleSaveEdits} disabled={isSaving || !!editingDevice}>
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
            Are you sure you want to delete this device? The change will take effect when you save.
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