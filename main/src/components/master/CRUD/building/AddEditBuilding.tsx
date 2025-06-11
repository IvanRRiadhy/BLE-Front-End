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
import React, { useEffect } from 'react';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { AppDispatch, RootState, useDispatch, useSelector } from 'src/store/Store';
import {
  addBuilding,
  BuildingType,
  editBuilding,
  fetchBuildings,
} from 'src/store/apps/crud/building';

import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';

interface FormType {
  type?: string;
  building?: BuildingType;
}

const BASE_URL = 'http://localhost:5034';

const AddEditBuilding = ({ type, building }: FormType) => {
  const [open, setOpen] = React.useState(false);
  const [image, setImage] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string | null>(building?.image || null);
  const [formData, setFormData] = React.useState(
    building || {
      id: '',
      name: '',
      applicationId: '5A32986E-C9B9-4174-82D7-A023EAF519E5',
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
    setPreview(building?.image || null);
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
    const maxSize = 5 * 1024 * 1024;
    if (file) {
      if (file.size > maxSize) {
        alert('File size exceeds 5MB. Please upload a smaller file.');
        return;
      }
      if (['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
        setImage(file);
        console.log('Selected file:', file);
        setPreview(URL.createObjectURL(file)); // Preview selected image
        console.log(image);
      } else {
        alert('Please select a valid image file (PNG, JPG, JPEG)');
      }
    }
  };

  const handleSave = async () => {
    try {
      const data = new FormData();

      Object.entries(formData).forEach(([key, value]) => {
        if (
          key !== 'image' &&
          key !== 'createdBy' &&
          key !== 'createdAt' &&
          key !== 'updatedBy' &&
          key !== 'updatedAt'
        ) {
          data.append(key, value.toString());
        }
      });
      if (image) {
        data.append('image', image);
      }
      if (type === 'edit') {
        await dispatch(editBuilding(data)); // Dispatch update
      }
      if (type === 'add') {
        await dispatch(addBuilding(data));
      }
      await dispatch(fetchBuildings());
      console.log('Saved!');
      setOpen(false);
      setPreview(null);
    } catch (error) {
      console.error('Error saving Building:', error);
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
          Add Building
        </Button>
      )}
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle>
          <Typography component="div" variant="h4" mb={2} mt={2} fontWeight={700}>
            {type === 'add' ? 'Add Building' : 'Edit Building'}
          </Typography>
          <Divider />
        </DialogTitle>
        <DialogContent>
          <Typography variant="h6" fontWeight={600} mb={2} mt={2}>
            Building Details
          </Typography>
          <Divider />
          <Grid container spacing={5} mb={3}>
            <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
              <CustomFormLabel htmlFor="department-Name">Building Name</CustomFormLabel>
              <CustomTextField
                id="name"
                placeholder={formData.name}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
            </Grid>
          </Grid>
          <Grid container spacing={5} mb={3}>
            <Grid size={12}>
              <CustomFormLabel htmlFor="building-image">Building Image</CustomFormLabel>
              <input
                type="file"
                accept="image/png, image/jpeg, image/jpg"
                onChange={handleImageChange}
              />
              {preview && (
                <img
                  src={`${BASE_URL}${preview}`}
                  alt="Building Preview"
                  style={{ width: '100%', marginTop: '10px', borderRadius: '5px' }}
                />
              )}
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

export default AddEditBuilding;
