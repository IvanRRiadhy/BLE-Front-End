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
  CircularProgress,
  Box,
  FormHelperText,
} from '@mui/material';
import { IconPencil, IconPlus } from '@tabler/icons-react';
import { toast } from 'react-hot-toast';
import React, { useEffect } from 'react';
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
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState(false);
  const [image, setImage] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string | null>(building?.image || null);
  const [fromLocal, setFromLocal] = React.useState(false);
  const [formData, setFormData] = React.useState({
    ...defaultBuildingForm,
    ...building,
  });
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({});

  const buildingFilter = useSelector((state: RootState) => state.buildingReducer.buildingFilter);
  const dispatch: AppDispatch = useDispatch();
  const handleClickOpen = async () => {
    setLoading(true);
    setFormErrors({});
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
  useEffect(() => {
    // Only run for edit mode and if floorImage is a string path
    if (type === 'edit' && building?.image && typeof building.image === 'string') {
      // Fetch the image from the server
      fetch(`${BASE_URL}${building.image}`)
        .then((res) => res.blob())
        .then((blob) => {
          // Create a File object from the Blob
          const file = new File([blob], building.image.split('/').pop() || 'floorplan.jpg', {
            type: blob.type,
          });
          setImage(file);
          // Optionally set preview as well
          setPreview(URL.createObjectURL(file));
        })
        .catch((err) => {
          console.error('Failed to fetch floor image:', err);
        });
      // console.log('Image URL:', preview);
    }
    // eslint-disable-next-line
  }, [open]);

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
        // console.log('Selected file:', file);
        setPreview(URL.createObjectURL(file)); // Preview selected image
        setFromLocal(true);
        // console.log(preview);
      } else {
        alert('Please select a valid image file (PNG, JPG, JPEG)');
      }
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name?.trim()) errors.name = 'Department name is required';
    if (!image) errors.image = 'Building Image is required';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast.error('Please fill in all required fields correctly.');
      return;
    }
    try {
      setLoading(true);
      const data = new FormData();

      Object.entries(formData).forEach(([key, value]) => {
        if (
          key!== 'applicationId' &&
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
      // Object.entries(formData).forEach(([key, value]) => {
      //   console.log(key, typeof value);
      // });
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
        toast.success('Data Saved');
        handleClose();
      } else {
        toast.error('Saving Data Unsuccessful');
        setError(true);
      }
    } catch (error) {
      toast.error('Saving Data Unsuccessful');
      console.error('Error saving Building:', error);
      setError(true);
    }
    setTimeout(() => {
      setLoading(false);
      setError(false);
    }, 1000);
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
                  placeholder="Enter Building Name"
                  error={!!formErrors.name}
                  helperText={formErrors.name}
                  required
                />
              </Grid>
            </Grid>
            <Grid container spacing={5} mb={3}>
              <Grid size={6}>
                <CustomFormLabel htmlFor="building-image" error={!!formErrors.image} required>
                  Building Image
                </CustomFormLabel>
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/jpg"
                  onChange={handleImageChange}
                  id="building-image"
                  style={{
                    border: formErrors.image ? '1px solid red' : undefined,
                    padding: '6px',
                    borderRadius: '4px',
                    width: '100%',
                    marginTop: '5px',
                  }}
                />
                {/* Show error manually */}
                {formErrors.image && <FormHelperText error>{formErrors.image}</FormHelperText>}
                {preview && (
                  <img
                    // src={fromLocal ? `${preview}` : image ? `${BASE_URL}${building?.image}` : `${BASE_URL}/${preview}`}
                    src={preview?.startsWith('blob:') ? preview : `${BASE_URL}${preview}`}
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
              disabled={isSaving}
            >
              {isSaving ? <CircularProgress size={20} color="inherit" /> : 'Save'}
            </Button>
          </DialogActions>
        </Dialog>
      )}
      {loading && (
        <Dialog open={true} fullWidth maxWidth="sm">
          <DialogContent sx={{ textAlign: 'center', py: 10 }}>
            <Typography variant="h1" mb={5}>
              Loading...{' '}
            </Typography>
            <CircularProgress size={50} color="primary" />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default AddEditBuilding;
