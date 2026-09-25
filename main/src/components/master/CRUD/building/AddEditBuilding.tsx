
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
  BuildingType,
  fetchBuildingDT,
} from 'src/store/apps/crud/building';
import { getConfig } from 'src/config';
import { defaultBuildingForm } from 'src/store/apps/defaultForm';
import { useAddBuilding, useEditBuilding } from 'src/hooks/useBuilding';
import { useUploadCDN } from 'src/hooks/usePatrolCase';

interface FormType {
  type?: string;
  building?: BuildingType;
}

const AddEditBuilding = ({ type, building }: FormType) => {
  const [open, setOpen] = React.useState(false);
  const isLoading = useSelector((state: RootState) => state.buildingReducer.isLoading);
  const hasLoaded = useSelector((state: RootState) => state.buildingReducer.hasLoaded);
  const [error, setError] = React.useState(false);
  const [image, setImage] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string | null>(building?.image || null);
  const [fromLocal, setFromLocal] = React.useState(false);
  const [formData, setFormData] = React.useState({
    ...defaultBuildingForm,
    ...building,
  });
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = React.useState(false);
  const addMutation = useAddBuilding();
  const editMutation = useEditBuilding();
  const uploadMutation = useUploadCDN({ category: 'building' });

  const getCdnUrl = (url?: string | null) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    let cdnBase = '';
    try {
      cdnBase = getConfig()?.CDN_URL || '';
    } catch {
      cdnBase = '';
    }
    const cleanBase = cdnBase.replace(/\/+$/, '');
    const cleanPath = url.replace(/^\/+/, '');
    return cleanBase ? `${cleanBase}/${cleanPath}` : url;
  };

  const buildingFilter = useSelector((state: RootState) => state.buildingReducer.buildingFilter);
  const dispatch: AppDispatch = useDispatch();

  const handleClickOpen = async () => {
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
      setImage(null);
      setPreview(null);
    }

    // Simulate or wait for building data to finish preparing
    setTimeout(() => {
      setOpen(true);
    }, 100); // optional small delay for smoother UX
  };

  const handleClose = () => {
    setOpen(false);
    setImage(null);
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
    const maxSize = 10 * 1024 * 1024;
    if (file) {
      if (file.size > maxSize) {
        toast.error('File size exceeds 10MB. Please upload a smaller file.');
        return;
      } else if (['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
        setImage(file);
        setPreview(URL.createObjectURL(file)); // Preview selected image
        setFromLocal(true);
      } else {
        alert('Please select a valid image file (PNG, JPG, JPEG)');
      }
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name?.trim()) errors.name = 'Building name is required';
    if (!image && !formData.image) errors.image = 'Building Image is required';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast.error('Please fill in all required fields.');
      return;
    }

    setIsSaving(true);

    let finalImageUrl = formData.image;

    // If there is a new image selected, upload to CDN first
    if (image) {
      const uploadData = new FormData();
      uploadData.append('file', image);

      try {
        const uploadRes = await uploadMutation.mutateAsync({
          formData: uploadData,
          params: { category: 'building' },
        });
        const uploaded = uploadRes?.collection?.data?.[0];
        if (!uploaded || !uploaded.relativePath) {
          throw new Error('Invalid response from CDN upload');
        }
        finalImageUrl = uploaded.relativePath;
      } catch (err) {
        console.error('CDN upload failed:', err);
        toast.error('Failed to uploading image.');
        setIsSaving(false);
        return; // Aborts saving, keeps dialog open
      }
    }

    const payload: Partial<BuildingType> = {
      name: formData.name,
      tag: formData.tag,
      image: finalImageUrl || '',
      // applicationId: formData.applicationId,
    };

    if (type === 'edit') {
      payload.id = formData.id;
    }

    try {
      if (type === 'add') {
        await addMutation.mutateAsync(payload);
        toast.success('Building added successfully!');
      } else {
        await editMutation.mutateAsync(payload);
        toast.success('Building updated successfully!');
      }
      handleClose();
    } catch (error) {
      console.error('Error saving building:', error);
      toast.error('Failed to save building.');
    } finally {
      setIsSaving(false);
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
            sx={{ p: 0.5, minWidth: 40, minHeight: 40 }}
            onClick={handleClickOpen}
          >
            <IconPlus size={20} />
          </Button>
        </Tooltip>
      )}
        <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
          <DialogTitle>
            <Typography component="div" variant="h4" mb={2} mt={2} fontWeight={700}>
              {type === 'add' ? 'Add Building' : 'Edit Building'}
            </Typography>
            <Divider />
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={5} mb={3}>
              <Grid size={{ lg: 6, md: 12, sm: 12 }}>
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
              <Grid size={{ lg: 6, md: 12, sm: 12 }}>
                <CustomFormLabel htmlFor="department-Name">Building Tag</CustomFormLabel>
                <CustomTextField
                  id="tag"
                  value={formData.tag}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                  placeholder="Enter Building Tag"
                  error={!!formErrors.tag}
                  helperText={formErrors.tag}
                  required
                />
              </Grid>
            </Grid>
            <Grid container spacing={5} mb={3}>
              <Grid size={6}>
                <CustomFormLabel
                  htmlFor="building-image"
                  sx={formErrors.image ? { color: 'error.main' } : undefined}
                >
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
                    src={preview?.startsWith('blob:') ? preview : getCdnUrl(preview)}
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
      {/* {isLoading && (
        <Dialog open={open} fullWidth maxWidth="sm">
          <DialogContent sx={{ textAlign: 'center', py: 10 }}>
            <Typography variant="h1" mb={5}>
              Loading...{' '}
            </Typography>
            <CircularProgress size={50} color="primary" />
          </DialogContent>
        </Dialog>
      )} */}
    </>
  );
};

export default AddEditBuilding;
