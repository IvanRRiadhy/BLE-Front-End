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
import { IconPencil, IconPlus } from '@tabler/icons-react';
import React from 'react';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { AppDispatch, useDispatch } from 'src/store/Store';
import {
  addMaskedArea,
  editMaskedArea,
  fetchMaskedAreas,
  MaskedAreaType,
} from 'src/store/apps/crud/maskedArea';
import { restrictedStatus } from 'src/types/crud/input';

interface FormType {
  type?: string;
  maskedArea?: MaskedAreaType;
}

const AddEditMaskedArea = ({ type, maskedArea }: FormType) => {
  const [open, setOpen] = React.useState(false);
  const [formData, setFormData] = React.useState<MaskedAreaType>(
    maskedArea || {
      id: '',
      floorplanId: '',
      floorId: '',
      name: '',
      areaShape: '',
      colorArea: '',
      restrictedStatus: '',
      engineAreaId: '',
      wideArea: 0,
      positionPxX: 0,
      positionPxY: 0,
      createdBy: '',
      createdAt: '',
      updatedBy: '',
      updatedAt: '',
    },
  );
  const dispatch: AppDispatch = useDispatch();

  const handleClickOpen = () => {
    setOpen(true);
  };
  const handleClose = () => {
    setOpen(false);
  };

  const handleSave = async () => {
    try {
      if (type === 'edit') {
        await dispatch(editMaskedArea(formData)); // Dispatch update
      }
      if (type === 'add') {
        await dispatch(addMaskedArea(formData));
      }
      await dispatch(fetchMaskedAreas());
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
          Add Floorplan Masked Area
        </Button>
      )}
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle>
          <Typography component="div" variant="h4" mb={2} mt={2} fontWeight={700}>
            {type === 'add' ? 'Add Floorplan Masked Area' : 'Edit Floorplan Masked Area'}
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
              <CustomFormLabel htmlFor="floorplan-id">Floorplan ID</CustomFormLabel>
              <CustomTextField
                id="floorplanId"
                placeholder={formData.floorplanId}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
              <CustomFormLabel htmlFor="engineArea-id">Engine Area ID</CustomFormLabel>
              <CustomTextField
                id="engineAreaId"
                placeholder={formData.engineAreaId}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
            </Grid>
            <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
              <CustomFormLabel htmlFor="floor-id">Floor ID</CustomFormLabel>
              <CustomTextField
                id="floorId"
                placeholder={formData.floorId}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
            </Grid>
          </Grid>
          <Typography variant="h6" fontWeight={600} mb={2} mt={2}>
            Masked Area Details
          </Typography>
          <Divider />
          <Grid container spacing={5} mb={3}>
            <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
              <CustomFormLabel htmlFor="masked-area-name">Masked Area Name</CustomFormLabel>
              <CustomTextField
                id="name"
                placeholder={formData.name}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
              <CustomFormLabel htmlFor="area-shape">Area Shape</CustomFormLabel>
              <CustomTextField
                id="areaShape"
                placeholder={formData.areaShape}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
              <CustomFormLabel htmlFor="position-px-x">Position on Pixel X</CustomFormLabel>
              <CustomTextField
                id="positionPxX"
                placeholder={formData.positionPxX}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
              <CustomFormLabel htmlFor="wide-area">Wide Area</CustomFormLabel>
              <CustomTextField
                id="wideArea"
                placeholder={formData.wideArea}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
            </Grid>
            <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
              <CustomFormLabel htmlFor="floor-id">Restricted Status</CustomFormLabel>
              <CustomSelect
                name="restrictedStatus"
                value={formData.restrictedStatus || ''}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              >
                {restrictedStatus.map((res) => (
                  <MenuItem key={res.value} value={res.value} disabled={res.disabled || false}>
                    {res.label}
                  </MenuItem>
                ))}
              </CustomSelect>
              <CustomFormLabel htmlFor="color-area">Color Area</CustomFormLabel>
              <CustomTextField
                id="colorArea"
                placeholder={formData.colorArea}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
              <CustomFormLabel htmlFor="pos-px-y">Position on Pixel Y</CustomFormLabel>
              <CustomTextField
                id="positionPxY"
                placeholder={formData.positionPxY}
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

export default AddEditMaskedArea;
