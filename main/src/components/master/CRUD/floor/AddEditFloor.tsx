import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid2 as Grid,
  IconButton,
  SelectChangeEvent,
  Typography,
} from '@mui/material';
import { IconPencil, IconPlus } from '@tabler/icons-react';
import React from 'react';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { AppDispatch, useDispatch } from 'src/store/Store';
import { addFloor, editFloor, fetchFloors, floorType } from 'src/store/apps/crud/floor';

interface FormType {
  type?: string;
  floor?: floorType;
}

const BASE_URL = "http://192.168.1.173:5000";

const AddEditFloor = ({ type, floor }: FormType) => {
  const [open, setOpen] = React.useState(false);
  const [image, setImage] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string | null>(floor?.floorImage || null);
  const [formData, setFormData] = React.useState({
    id: floor?.id || '',
    buildingId: floor?.buildingId || '',
    name: floor?.name || '',
    floor: floor?.floorImage || '',
    pixelX: floor?.pixelX || 0,
    pixelY: floor?.pixelY || 0,
    floorX: floor?.floorX || 0,
    floorY: floor?.floorY || 0,
    meterPerPx: floor?.meterPerPx || 0,
    engineFloorId: floor?.engineFloorId || 0,
    createdBy: floor?.createdBy || '',
    createdAt: floor?.createdAt || '',
    updatedBy: floor?.updatedBy || '',
    updatedAt: floor?.updatedAt || '',
  });
  const dispatch: AppDispatch = useDispatch();

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setFormData({
      id: floor?.id || '',
      buildingId: floor?.buildingId || '',
      name: floor?.name || '',
      floor: floor?.floorImage || '',
      pixelX: floor?.pixelX || 0,
      pixelY: floor?.pixelY || 0,
      floorX: floor?.floorX || 0,
      floorY: floor?.floorY || 0,
      meterPerPx: floor?.meterPerPx || 0,
      engineFloorId: floor?.engineFloorId || 0,
      createdBy: floor?.createdBy || '',
      createdAt: floor?.createdAt || '',
      updatedBy: floor?.updatedBy || '',
      updatedAt: floor?.updatedAt || '',
    });
  };

  const handleSave = async () => {
    try {
      const data = new FormData();

      // Append non-file fields
      Object.entries(formData).forEach(([key, value]) => {
        if (
          key !== 'floorImage' &&
          key !== 'createdBy' &&
          key !== 'createdAt' &&
          key !== 'updatedBy' &&
          key !== 'updatedAt'
        ) {
          data.append(key, value.toString());
        }
      });

      // Append the file if selected
      if (image) {
        data.append('floorImage', image); // File goes here
      }
      if (type === 'edit') {
        await dispatch(editFloor(data)); // Dispatch update
      }
      if (type === 'add') {
        await dispatch(addFloor(data));
      }
      await dispatch(fetchFloors());
      console.log('Saved!');
      handleClose();
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
  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const maxSize = 1024 * 1024;
    if (file) {
      if (['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
        setImage(file);
        const prepreview = URL.createObjectURL(file);
        console.log(prepreview);
        setPreview(prepreview); // Preview selected image
        console.log(preview);
      } else {
        alert('Please select a valid image file (PNG, JPG, JPEG)');
      }
    }
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
          Add Floor
        </Button>
      )}
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle>
          <Typography component="div" variant="h4" mb={2} mt={2} fontWeight={700}>
            {type === 'add' ? 'Add Floor' : 'Edit Floor'}
          </Typography>
          <Divider />
        </DialogTitle>
        <DialogContent>
          <Typography variant="h6" fontWeight={600} mb={2} mt={2}>
            Floor Details
          </Typography>
          <Divider />
          <Grid container spacing={5} mb={3}>
            <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
              <CustomFormLabel htmlFor="building-id">Building ID</CustomFormLabel>
              <CustomTextField
                id="buildingId"
                placeholder={formData.buildingId}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
              <CustomFormLabel htmlFor="floor-name">name</CustomFormLabel>
              <CustomTextField
                id="name"
                placeholder={formData.name}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
              <CustomFormLabel htmlFor="floor-pixelX">Pixel X</CustomFormLabel>
              <CustomTextField
                id="pixelX"
                placeholder={formData.pixelX}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
              <CustomFormLabel htmlFor="floorX">Floor X</CustomFormLabel>
              <CustomTextField
                id="floorX"
                placeholder={formData.floorX}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
            </Grid>
            <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
              <CustomFormLabel htmlFor="Engine-id">Engine Floor ID</CustomFormLabel>
              <CustomTextField
                id="engineFloorId"
                placeholder={formData.engineFloorId}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
              <CustomFormLabel htmlFor="m-per-px">Meter Per Pixel</CustomFormLabel>
              <CustomTextField
                id="meterPerPx"
                placeholder={formData.meterPerPx}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
              <CustomFormLabel htmlFor="floor-pixelY">Pixel Y</CustomFormLabel>
              <CustomTextField
                id="pixelY"
                placeholder={formData.pixelY}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
              <CustomFormLabel htmlFor="floorY">Floor Y</CustomFormLabel>
              <CustomTextField
                id="floorY"
                placeholder={formData.floorY}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
            </Grid>
            <Grid size={{ lg: 12, md: 12, sm: 12 }} direction={'column'}>
              <Grid size={12}>
                <CustomFormLabel htmlFor="fp-image">Floorplan Image</CustomFormLabel>
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/jpg"
                  onChange={handleImageChange}
                />
                {preview && (
                  <img
                    src={preview?.startsWith('blob:') ? preview : `${BASE_URL}${preview}`}
                    alt="Floorplan Preview"
                    style={{ width: '100%', marginTop: '10px', borderRadius: '5px' }}
                  />
                )}
              </Grid>
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

export default AddEditFloor;
