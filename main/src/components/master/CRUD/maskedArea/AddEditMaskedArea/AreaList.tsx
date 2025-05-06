import { useEffect, useState } from 'react';
import { useSelector, useDispatch, AppDispatch, AppState } from 'src/store/Store';
import Scrollbar from 'src/components/custom-scroll/Scrollbar';
import { fetchFloorplan, FloorplanType } from 'src/store/apps/crud/floorplan';
import {
  fetchMaskedAreas,
  MaskedAreaType,
  addMaskedArea,
  deleteMaskedArea,
  editMaskedArea,
  DeleteUnsavedMaskedArea,
  AddUnsavedMaskedArea,
  EditUnsavedMaskedArea,
  RevertMaskedArea,
  SelectMaskedArea,
  SelectEditingMaskedArea,
  GetUnsavedMaskedArea,
} from 'src/store/apps/crud/maskedArea';
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
import AreaListItem from './AreaListItem';
import { useNavigate } from 'react-router';
import { GetUnsavedFloorplanDevices } from 'src/store/apps/crud/floorplanDevice';

const AreaList = () => {
  const dispatch: AppDispatch = useDispatch();
  const navigate = useNavigate();

  const activeFloorplan = useSelector(
    (state: AppState) => state.floorplanReducer.selectedFloorplan,
  );
  const maskedAreasData = useSelector((state: AppState) => state.maskedAreaReducer.maskedAreas);
  const selectedMaskedArea = useSelector(
    (state: AppState) => state.maskedAreaReducer.selectedMaskedArea,
  );
  const unsavedMaskedAreas = useSelector(
    (state: AppState) => state.maskedAreaReducer.unsavedMaskedAreas,
  );
  const editingMaskedArea = useSelector(
    (state: AppState) => state.maskedAreaReducer.editingMaskedArea,
  );
  const filteredUnsavedMaksedArea = unsavedMaskedAreas.filter(
    (maskedArea) => maskedArea.floorplanId === activeFloorplan?.id,
  );

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState('');
  const [pendingAreaId, setPendingAreaId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteAreaId, setDeleteAreaId] = useState<string | null>(null);
  const [cancelEditDialogOpen, setCancelEditDialogOpen] = useState(false);

  useEffect(() => {
    dispatch(fetchFloorplan());
    dispatch(fetchMaskedAreas());
  }, [dispatch]);
  useEffect(() => {
    dispatch(GetUnsavedMaskedArea());
  }, []);

  const handleOnClick = (id: string) => {
    if (selectedMaskedArea?.id === id) return; // Prevent re-selecting the same device
    if (editingMaskedArea) {
      setPendingAreaId(id); // Store the device ID for later use
      setDialogType('select'); // Set the dialog type to 'select'
      setConfirmDialogOpen(true); // Open the confirmation dialog
      return;
    }
    dispatch(SelectMaskedArea(id));
  };
  const handleConfirmProceed = () => {
    dispatch(RevertMaskedArea(editingMaskedArea?.id || '')); // Revert the editing device to its original state
    if (pendingAreaId) {
      //   if (dialogType === 'add') {
      //     dispatch(AddUnsavedMaskedArea(newArea)); // Add the new device to the unsaved devices list
      //     dispatch(SelectFloorplanDevice(newDevice.id));
      //     dispatch(SelectEditingFloorplanDevice(newDevice.id));
      //   }
      if (dialogType === 'select') {
        dispatch(SelectMaskedArea(pendingAreaId)); // Select the pending device
        dispatch(SelectEditingMaskedArea(null));
      }
    }

    setConfirmDialogOpen(false); // Close the dialog
    setPendingAreaId(null); // Clear the pending device ID
  };

  const handleCancelProceed = () => {
    setConfirmDialogOpen(false); // Close the dialog
    setPendingAreaId(null); // Clear the pending device ID
  };
  const handleOnEditClick = (id: string) => {
    dispatch(SelectEditingMaskedArea(id));
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
      dispatch(DeleteUnsavedMaskedArea(deleteAreaId)); // Delete the device from the unsaved devices list
      dispatch(SelectMaskedArea(null)); // Deselect the device
    }
    handleCloseDeleteDialog(); // Close the delete dialog
  };

  const handleOpenCancelEditingDialog = () => {
    setCancelEditDialogOpen(true);
  };
  const handleCloseCancelEditingDialog = () => {
    setCancelEditDialogOpen(false);
  };
  const handleCancelEditing = () => {
    navigate('/master/floorplanmaskedarea');
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
            Masked Areas
          </Typography>
          {/* <IconButton color="primary" onClick={handleAddDeviceClick}>
                        <AddIcon />
                    </IconButton> */}
        </Box>
        <Divider />
        <Scrollbar
          sx={{ height: { lg: 'calc(100vh - 250px)', sm: '100vh' }, maxHeight: 'fit-content' }}
        >
          {filteredUnsavedMaksedArea ? (
            filteredUnsavedMaksedArea.map((area: MaskedAreaType) => (
              <AreaListItem
                key={area.id}
                area={area}
                onListClick={() => handleOnClick(area.id)}
                onEditClick={() => handleOnEditClick(area.id)}
                onDeleteClick={() => handleOpenDeleteDialog(area.id)}
                active={area.id === selectedMaskedArea?.id} // Replace with your logic to determine if the item is active
              />
            ))
          ) : (
            <Alert severity="info">No masked areas found for this floorplan.</Alert>
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
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Button variant="outlined" onClick={handleOpenCancelEditingDialog}>
            Cancel
          </Button>
          <Button variant="contained">Save</Button>
        </Box>
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
          <Button onClick={handleCancelEditing} color="error">
            Yes, Cancel Editing
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AreaList;
