import { useEffect, useState } from 'react';
import { useSelector, useDispatch, AppDispatch, AppState } from 'src/store/Store';
import Scrollbar from 'src/components/custom-scroll/Scrollbar';
import { fetchFloorplan, FloorplanType } from 'src/store/apps/crud/floorplan';
import {
  addFloorplanDevice,
  AddUnsavedDevice,
  deleteFloorplanDevice,
  DeleteUnsavedDevice,
  editFloorplanDevice,
  fetchFloorplanDevices,
  FloorplanDeviceType,
  GetUnsavedFloorplanDevices,
  ResetState,
  RevertDevice,
  SelectEditingFloorplanDevice,
  SelectFloorplanDevice,
} from 'src/store/apps/crud/floorplanDevice';
import AddIcon from '@mui/icons-material/Add';
import { Box } from '@mui/system';
import {
  Alert,
  Divider,
  TextField,
  Typography,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  DialogContentText,
  IconButton,
} from '@mui/material';
import DeviceListItem from './DeviceListItem';
import AddEditDeviceLayout from './AddEditDeviceLayout';
import { useNavigate } from 'react-router';
import { fetchAccessCCTV } from 'src/store/apps/crud/accessCCTV';
import { fetchAccessControls } from 'src/store/apps/crud/accessControl';
import { fetchBleReaders } from 'src/store/apps/crud/bleReader';

const DeviceList = () => {
  const dispatch: AppDispatch = useDispatch();
  const navigate = useNavigate();
  const activeFloorplan = useSelector(
    (state: AppState) => state.floorplanReducer.selectedFloorplan,
  );
  const devicesData = useSelector(
    (state: AppState) => state.floorplanDeviceReducer.floorplanDevices,
  );
  const originalDevices = useSelector(
    (state: AppState) => state.floorplanDeviceReducer.originalFloorplanDevices,
  );
  const selectedDevice = useSelector(
    (state: AppState) => state.floorplanDeviceReducer.selectedFloorplanDevice,
  );
  const unsavedDevices = useSelector(
    (state: AppState) => state.floorplanDeviceReducer.unsavedFloorplanDevices,
  );
  const editingDevice = useSelector(
    (state: AppState) => state.floorplanDeviceReducer.editingFloorplanDevice,
  );
  const filteredUnsavedDevices = unsavedDevices.filter(
    (device) => device.floorplanId === activeFloorplan?.id,
  );
  const filteredOriginalDevices = originalDevices.filter(
    (device: FloorplanDeviceType) => device.floorplanId === activeFloorplan?.id,
  );
  const deletedDevice = useSelector(
    (state: AppState) => state.floorplanDeviceReducer.deletedFloorplanDevice,
  );
  const addedDevice = useSelector(
    (state: AppState) => state.floorplanDeviceReducer.addedFloorplanDevice,
  );

  const firstCCTV = useSelector((state: AppState) => state.CCTVReducer.cctvs[0]);
  const firstAccessControl = useSelector(
    (state: AppState) => state.accessControlReducer.accessControls[0],
  );
  const firstBleReader = useSelector((state: AppState) => state.bleReaderReducer.bleReaders[0]);

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState('');
  const [pendingDeviceId, setPendingDeviceId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteDeviceId, setDeleteDeviceId] = useState<string | null>(null);
  const [cancelEditDialogOpen, setCancelEditDialogOpen] = useState(false);

  useEffect(() => {
    dispatch(fetchFloorplanDevices());
    dispatch(fetchFloorplan());
    dispatch(fetchAccessCCTV());
    dispatch(fetchAccessControls());
    dispatch(fetchBleReaders());
  }, [dispatch]);
  useEffect(() => {
    dispatch(GetUnsavedFloorplanDevices());
  }, []);

  const newDevice: FloorplanDeviceType = {
    id: `temp-${Date.now()}`, // Generate a temporary unique ID
    name: 'New Device',
    type: '', // Default type, can be updated later
    floorplanId: activeFloorplan?.id || '',
    accessCctvId: firstCCTV?.id || '',
    readerId: firstBleReader?.id || '',
    accessControlId: firstAccessControl?.id || '',
    posX: 10, // Default position
    posY: 10, // Default position
    posPxX: 10,
    posPxY: 10,
    floorplanMaskedAreaId: '',
    applicationId: activeFloorplan?.applicationId || '',
    deviceStatus: 'Active', // Mark as unsaved
    createdAt: new Date().toISOString(),
    createdBy: 'admin', // Replace with actual user ID
    updatedAt: new Date().toISOString(),
    updatedBy: 'admin', // Replace with actual user ID
  };

  const handleAddDeviceClick = () => {
    if (editingDevice) {
      setPendingDeviceId(newDevice.id); // Store the device ID for later use
      setDialogType('add'); // Set the dialog type to 'select'
      setConfirmDialogOpen(true); // Open the confirmation dialog
      return;
    }
    dispatch(AddUnsavedDevice(newDevice)); // Add the new device to the unsaved devices list
    dispatch(SelectFloorplanDevice(newDevice.id));
    dispatch(SelectEditingFloorplanDevice(newDevice.id));

    // console.log('New device added:', newDevice);
  };

  const handleOnClick = (id: string) => {
    if (selectedDevice?.id === id) return; // Prevent re-selecting the same device
    if (editingDevice) {
      setPendingDeviceId(id); // Store the device ID for later use
      setDialogType('select'); // Set the dialog type to 'select'
      setConfirmDialogOpen(true); // Open the confirmation dialog
      return;
    }
    dispatch(SelectFloorplanDevice(id));
  };
  const handleConfirmProceed = () => {
    dispatch(RevertDevice(editingDevice?.id || '')); // Revert the editing device to its original state
    if (pendingDeviceId) {
      if (dialogType === 'add') {
        dispatch(AddUnsavedDevice(newDevice)); // Add the new device to the unsaved devices list
        dispatch(SelectFloorplanDevice(newDevice.id));
        dispatch(SelectEditingFloorplanDevice(newDevice.id));
      }
      if (dialogType === 'select') {
        dispatch(SelectFloorplanDevice(pendingDeviceId)); // Select the pending device
        dispatch(SelectEditingFloorplanDevice(null));
      }
    }

    setConfirmDialogOpen(false); // Close the dialog
    setPendingDeviceId(null); // Clear the pending device ID
  };

  const handleCancelProceed = () => {
    setConfirmDialogOpen(false); // Close the dialog
    setPendingDeviceId(null); // Clear the pending device ID
  };
  const handleOnEditClick = (id: string) => {
    dispatch(SelectEditingFloorplanDevice(id));
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
      dispatch(DeleteUnsavedDevice(deleteDeviceId)); // Delete the device from the unsaved devices list
      dispatch(SelectFloorplanDevice(null)); // Deselect the device
    }
    handleCloseDeleteDialog(); // Close the delete dialog
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

  const handleSaveEdits = async () => {
    // Get the current state of devices
    const unsavedDevicesMap = new Map(filteredUnsavedDevices.map((device) => [device.id, device]));
    const floorplanDevicesMap = new Map(
      filteredOriginalDevices.map((device) => [device.id, device]),
    );
    // 1. Edit devices: Check for devices with different fields
    const devicesToEdit = filteredUnsavedDevices.filter((unsavedDevice) => {
      const originalDevice = floorplanDevicesMap.get(unsavedDevice.id);
      return originalDevice && JSON.stringify(unsavedDevice) !== JSON.stringify(originalDevice);
    });
    console.log('devicesToEdit', devicesToEdit);

    // Call editFloorplanDevice for each device that needs editing
    for (const device of devicesToEdit) {
      await dispatch(editFloorplanDevice(device));
    }

    // 2. Add devices: Check for devices in unsavedDevices but not in floorplanDevices
    if (addedDevice) {
      console.log('addedDevice', addedDevice);
      // Call addFloorplanDevice for each new device
      for (const device of addedDevice) {
        await dispatch(addFloorplanDevice(device));
      }
    }

    // 3. Delete devices: Check for devices in floorplanDevices but not in unsavedDevices
    if (deletedDevice) {
      for (const device of deletedDevice) {
        await dispatch(deleteFloorplanDevice(device.id));
      }
    }
    // Call deleteFloorplanDevice for each device to delete

    console.log('Save operation completed.');
    handleCloseEditing(); // Navigate back to the device list
  };

  return (
    <>
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
          <IconButton color="primary" onClick={handleAddDeviceClick}>
            <AddIcon />
          </IconButton>
        </Box>
        <Divider />
        <Scrollbar
          sx={{ height: { lg: 'calc(100vh - 370px)', sm: '100vh' }, maxHeight: 'fit-content' }}
        >
          {filteredUnsavedDevices ? (
            filteredUnsavedDevices.map((device: FloorplanDeviceType) => (
              <DeviceListItem
                key={device.id}
                device={device}
                onListClick={() => handleOnClick(device.id)}
                onEditClick={() => handleOnEditClick(device.id)}
                onDeleteClick={() => handleOpenDeleteDialog(device.id)}
                active={device.id === selectedDevice?.id} // Replace with your logic to determine if the item is active
              />
            ))
          ) : (
            <Alert severity="info">No devices found for this floorplan.</Alert>
          )}
        </Scrollbar>
      </Box>
      <Box
        p={2}
        sx={{
          position: 'fixed',
          bottom: '0',
          left: '10',
          width: '260px',
          height: '80px',
          backgroundColor: 'background.paper',
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      >
        {!editingDevice && (
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Button variant="outlined" onClick={handleOpenCancelEditingDialog}>
              Cancel
            </Button>
            <Button variant="contained" onClick={handleSaveEdits}>
              Save
            </Button>
          </Box>
        )}
      </Box>
      {/*Confirmation Dialog */}
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
      {/* Delete Confirmation Dialog */}
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
      {/* Cancel Editing Confirmation Dialog */}
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
    </>
  );
};

export default DeviceList;
