import { BASE_URL } from 'src/utils/axios';
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
  Tooltip,
  Typography,
} from '@mui/material';
import { IconPencil, IconPlus } from '@tabler/icons-react';
import { toast } from 'react-hot-toast';
import React from 'react';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { AppDispatch, RootState, useDispatch, useSelector } from 'src/store/Store';
import {
  addBuilding,
  BuildingType,
  editBuilding,
  fetchBuildingDT,
  fetchBuildings,
} from 'src/store/apps/crud/building';
import { defaultBuildingForm } from 'src/store/apps/defaultForm';

interface FormType {
  type?: string;
  building?: BuildingType;
}

const AddEditBuilding = ({ type, building }: FormType) => {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [image, setImage] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string | null>(building?.image || null);
  const [fromLocal, setFromLocal] = React.useState(false);
  const [formData, setFormData] = React.useState({
    ...defaultBuildingForm,
    ...building,
  });
  const buildingFilter = useSelector((state: RootState) => state.buildingReducer.buildingFilter);
  const dispatch: AppDispatch = useDispatch();
  const handleClickOpen = async () => {
    setLoading(true);

    if (type === 'edit') {
      if (!building?.id) {
        // You can optionally fetch the building detail here using the ID
        await dispatch(fetchBuildingDT(buildingFilter));
      }
      setFormData({ ...defaultBuildingForm, ...building });
      setPreview(building?.image || null);
    } else {
      setFormData({ ...defaultBuildingForm });
      setPreview(null);
    }

    // Simulate or wait for building data to finish preparing
    setTimeout(() => {
      setLoading(false);
      setOpen(true);
    }, 100); // optional small delay for smoother UX
  };

  const handleClose = () => {
    setOpen(false);
    setPreview(building?.image || null);
    setFromLocal(false);
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
        setFromLocal(true);
        console.log(preview);
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
      Object.entries(formData).forEach(([key, value]) => {
        console.log(key, typeof value);
      });
      let result;
      if (type === 'edit') {
        result = await dispatch(editBuilding(data));
      }
      if (type === 'add') {
        result = await dispatch(addBuilding(data));
      }

      // Check if the action was fulfilled
      if (result && result.type && result.type.endsWith('/fulfilled')) {
        console.log('Building saved successfully');
        await dispatch(fetchBuildingDT(buildingFilter));
        toast.success('Data Saved', { position: 'top-right' });
        handleClose();
      } else {
        toast.error('Saving Data Unsuccessful', { position: 'top-right' });
      }
    } catch (error) {
      toast.error('Saving Data Unsuccessful', { position: 'top-right' });
      console.error('Error saving Building:', error);
    }
  };
  return (
    <>
      {type === 'edit' && (
        <Tooltip title="Edit Building">
          <IconButton color="primary" size="small" onClick={handleClickOpen}>
            <IconPencil size={20} />
          </IconButton>
        </Tooltip>
      )}
      {type === 'add' && (
        <Tooltip title="Add Building">
          <Button
            variant="contained"
            color="primary"
            startIcon={<IconPlus size={20} />}
            onClick={handleClickOpen}
          >
            Add Building
          </Button>
        </Tooltip>
      )}
      {!loading && (
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
                  value={formData.name}
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
                    src={fromLocal ? `${preview}` : `${BASE_URL}${preview}`}
                    alt="Building Preview"
                    style={{ width: '100%', marginTop: '10px', borderRadius: '5px' }}
                  />
                )}
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ display: 'flex', justifyContent: 'space-between', px: 3, pb: 2 }}>
            <Button
              onClick={handleClose}
              variant="outlined"
              sx={{ fontSize: '1rem', py: 1, px: 3 }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              variant="contained"
              sx={{ fontSize: '1rem', py: 1, px: 3 }}
            >
              Save
            </Button>
          </DialogActions>
        </Dialog>
      )}
      {loading && (
        <Dialog open={true} onClose={handleClose} fullWidth maxWidth="sm">
          <DialogContent sx={{ textAlign: 'center', py: 10 }}>
            <Typography variant="h6">Loading...</Typography>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default AddEditBuilding;
