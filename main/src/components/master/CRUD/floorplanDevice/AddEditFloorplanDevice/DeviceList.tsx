import { useEffect, useState } from 'react';
import { useSelector, useDispatch, AppDispatch, AppState } from 'src/store/Store';
import Scrollbar from 'src/components/custom-scroll/Scrollbar';
import { fetchFloorplan, FloorplanType } from 'src/store/apps/crud/floorplan';
import {
  AddUnsavedDevice,
  fetchFloorplanDevices,
  FloorplanDeviceType,
  GetUnsavedFloorplanDevices,
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

const DeviceList = () => {
  const dispatch: AppDispatch = useDispatch();
  const activeFloorplan = useSelector(
    (state: AppState) => state.floorplanReducer.selectedFloorplan,
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

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingDeviceId, setPendingDeviceId] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchFloorplanDevices());
    dispatch(fetchFloorplan());
  }, [dispatch]);
  useEffect(() => {
    dispatch(GetUnsavedFloorplanDevices());
  }, []);

  const handleAddDeviceClick = () => {
    const newDevice: FloorplanDeviceType = {
      id: `temp-${Date.now()}`, // Generate a temporary unique ID
      name: 'New Device',
      type: '', // Default type, can be updated later
      floorplanId: activeFloorplan?.id || '',
      accessCctvId: '',
      readerId: '',
      accessControlId: '',
      posX: 100, // Default position
      posY: 100, // Default position
      posPxX: 100,
      posPxY: 100,
      floorplanMaskedAreaId: '',
      applicationId: '',
      deviceStatus: 'unsaved', // Mark as unsaved
      createdAt: new Date().toISOString(),
      createdBy: 'admin', // Replace with actual user ID
      updatedAt: new Date().toISOString(),
      updatedBy: 'admin', // Replace with actual user ID
    };
    dispatch(AddUnsavedDevice(newDevice)); // Add the new device to the unsaved devices list
    dispatch(SelectFloorplanDevice(newDevice.id));
    dispatch(SelectEditingFloorplanDevice(newDevice.id));

    console.log('New device added:', newDevice);
  };

  const handleOnClick = (id: string) => {
    // console.log('id: ', id);
    // console.log('editingDevice: ', editingDevice);
    // console.log('unsavedDevices: ', unsavedDevices);
    if (selectedDevice?.id === id) return; // Prevent re-selecting the same device
    // console.log('id: ', id);
    if (editingDevice) {
      setPendingDeviceId(id); // Store the device ID for later use
      setConfirmDialogOpen(true); // Open the confirmation dialog
      return;
    }
    dispatch(SelectFloorplanDevice(id));
    // console.log('Selected device:', selectedDevice);
  };
  const handleConfirmProceed = () => {
    if (pendingDeviceId) {
      dispatch(SelectFloorplanDevice(pendingDeviceId));
      dispatch(SelectEditingFloorplanDevice(null)); // Set the selected device as the editing device
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
  const handleOnDeleteClick = (id: string) => {
    console.log('Delete device with id:', id);
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
          sx={{ height: { lg: 'calc(100vh - 250px)', sm: '100vh' }, maxHeight: 'fit-content' }}
        >
          {filteredUnsavedDevices ? (
            filteredUnsavedDevices.map((device: FloorplanDeviceType) => (
              <DeviceListItem
                key={device.id}
                device={device}
                onListClick={() => handleOnClick(device.id)}
                onEditClick={() => handleOnEditClick(device.id)}
                onDeleteClick={() => handleOnDeleteClick(device.id)}
                active={device.id === selectedDevice?.id} // Replace with your logic to determine if the item is active
              />
            ))
          ) : (
            <Alert severity="info">No devices found for this floorplan.</Alert>
          )}
        </Scrollbar>
      </Box>

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
    </>
  );
};

export default DeviceList;
