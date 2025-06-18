import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid2 as Grid,
  IconButton,
  MenuItem,
  SelectChangeEvent,
  Typography,
} from '@mui/material';
import { IconPencil, IconPlus,   } from '@tabler/icons-react';
import React from 'react';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import {
  trackingTransType,
  addTrackingTrans,
  editTrackingTrans,
  fetchTrackingTrans,
} from 'src/store/apps/crud/trackingTrans';
import { AppDispatch, RootState, useDispatch, useSelector } from 'src/store/Store';
import { alarmStatus } from 'src/types/crud/input';
import { MaskedAreaType } from 'src/store/apps/crud/maskedArea';
import { bleReaderType } from 'src/store/apps/crud/bleReader';
import { fetchFloorplan, FloorplanType } from 'src/store/apps/crud/floorplan';

interface FormType {
  type?: string;
  trackingTransaction?: trackingTransType;
}

const AddEditTrackingTransaction = ({ type, trackingTransaction }: FormType) => {
  const [open, setOpen] = React.useState(false);
  const [formData, setFormData] = React.useState(
    trackingTransaction || {
      id: '',
      transTime: '',
      readerId: '',
      cardId: "",
      coordinateX: 0,
      coordinateY: 0,
      coordinatePxX: 0,
      coordinatePxY: 0,
      alarmStatus: '',
      battery: 0,
      floorplanMaskedAreaId: '',
      floorplanMaskedArea: {} as MaskedAreaType,
      reader: {} as bleReaderType,
    },
  );
  const dispatch: AppDispatch = useDispatch();
    const floorplanData: FloorplanType[] = useSelector(
    (state: RootState) => state.floorplanReducer.floorplans,
  );
  React.useEffect(() => {
    dispatch(fetchFloorplan());
    console.log('Tracking Transaction : ', floorplanData);
  }, [dispatch]);


  const handleClickOpen = () => {
    console.log('Tracking Trans : ', trackingTransaction);
    console.log('Form Data : ', formData);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleSave = async () => {
    try {
      if (type === 'edit') {
        await dispatch(editTrackingTrans(formData)); // Dispatch update
      }
      if (type === 'add') {
        await dispatch(addTrackingTrans(formData));
      }
      await dispatch(fetchTrackingTrans());
      console.log('Saved!');
      setOpen(false);
    } catch (error) {
      console.error('Error saving application:', error);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement> | SelectChangeEvent<string>,
  ) => {
    const { value, name, id } = e.target as
      | HTMLInputElement
      | { value: string; name: string; id?: string };
    setFormData((prev) => ({ ...prev, [id || name]: value }));
  };

  return (
    <>
      {type === 'edit' && (
        <IconButton color="primary" size="small" onClick={handleClickOpen}>
          <IconPencil size={20} />
        </IconButton>
      )}
      {type === 'add' && (
        <Button
          variant="contained"
          color="primary"
          startIcon={<IconPlus size={20} />}
          onClick={handleClickOpen}
        >
          Add Tracking Transaction
        </Button>
      )}
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle>
          <Typography component="div" variant="h4" mb={2} mt={2} fontWeight={700}>
            {type === 'add' ? 'Add Tracking Transaction' : 'Edit Tracking Transaction'}
          </Typography>
          <Divider />
        </DialogTitle>
        <DialogContent>
          <Typography variant="h6" fontWeight={600} mb={2} mt={2}>
            IDs
          </Typography>
          <Divider />
          <Grid container spacing={5} mb={3}>
            <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
              <CustomFormLabel htmlFor="reader-id">Reader ID</CustomFormLabel>
              <CustomTextField
                id="readerId"
                placeholder={formData.readerId}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
              <CustomFormLabel htmlFor="card-Id">Card ID</CustomFormLabel>
              <CustomTextField
                id="cardId"
                placeholder={formData.readerId}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
            </Grid>
            <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
              <CustomFormLabel htmlFor="floorplan-id">Floorplan</CustomFormLabel>
              <CustomSelect
                id="floorplanId"
                placeholder={formData.floorplanMaskedAreaId}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              >
                {floorplanData.map((floorplan) => (
                  <MenuItem key={floorplan.id} value={floorplan.id}>
                    {floorplan.name}
                  </MenuItem>
                ))}
              </CustomSelect>
            </Grid>
          </Grid>
          <Typography variant="h6" fontWeight={600} mb={2} mt={2}>
            Tracking Transaction Details
          </Typography>
          <Divider />
          <Grid container spacing={5} mb={3}>
            <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
              <CustomFormLabel htmlFor="trans-Time">Transaction Time</CustomFormLabel>
              <CustomTextField
                id="transTime"
                placeholder={formData.transTime}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
              <CustomFormLabel htmlFor="battery">Battery</CustomFormLabel>
              <CustomTextField
                id="battery"
                placeholder={formData.battery}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
            </Grid>
            <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
              <CustomFormLabel htmlFor="alarm-Status">Alarm Status</CustomFormLabel>
              <CustomSelect
                name="alarmStatus"
                value={formData.alarmStatus}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              >
                {alarmStatus.map((alarm) => (
                  <MenuItem
                    key={alarm.value}
                    value={alarm.value}
                    disabled={alarm.disabled || false}
                  >
                    {alarm.label}
                  </MenuItem>
                ))}
              </CustomSelect>
            </Grid>
          </Grid>
          <Typography variant="h6" fontWeight={600} mb={2} mt={2}>
            Position
          </Typography>
          <Divider />
          <Grid container spacing={5} mb={3}>
            <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
              <CustomFormLabel htmlFor="coordinate-X">Coordinate X</CustomFormLabel>
              <CustomTextField
                id="coordinateX"
                placeholder={formData.coordinateX}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
              <CustomFormLabel htmlFor="Coordinate-Px-X">Coordinate on Pixel X</CustomFormLabel>
              <CustomTextField
                id="coordinatePxX"
                placeholder={formData.coordinatePxX}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
            </Grid>
            <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
              <CustomFormLabel htmlFor="coordinate-Y">Coordinate Y</CustomFormLabel>
              <CustomTextField
                id="coordinateY"
                placeholder={formData.coordinateY}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
              <CustomFormLabel htmlFor="Coordinate-Px-Y">Coordinate on Pixel Y</CustomFormLabel>
              <CustomTextField
                id="coordinatePxY"
                placeholder={formData.coordinatePxY}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ display: 'flex', justifyContent: 'space-between', px: 3, pb: 2 }}>
          <Button onClick={handleClose} variant="outlined" sx={{ fontSize: '1rem', py: 1, px: 3 }}>
            Cancel
          </Button>
          <Button onClick={handleSave} variant="contained" sx={{ fontSize: '1rem', py: 1, px: 3 }}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AddEditTrackingTransaction;
