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
  MenuItem,
  SelectChangeEvent,
  Tooltip,
  Typography,
  CircularProgress,
  Autocomplete,
  TextField,
  FormHelperText,
} from '@mui/material';
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';
import { IconPencil, IconPlus } from '@tabler/icons-react';
import React, { useEffect } from 'react';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { AppDispatch, RootState, useDispatch, useSelector } from 'src/store/Store';
import { fetchFloors, floorType } from 'src/store/apps/crud/floor';
import {
  FloorplanType,
  fetchFloorplan,
  addFloorplan,
  editFloorplan,
  fetchFloorplanDT,
} from 'src/store/apps/crud/floorplan';
import toast from 'react-hot-toast';
import { defaultFloorplanForm } from 'src/store/apps/defaultForm';
import { EngineType, fetchEngines } from 'src/store/apps/crud/engine';

interface FormType {
  type?: string;
  floorplan?: FloorplanType;
}

const AddEditFloorplan = ({ type, floorplan }: FormType) => {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [image, setImage] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string | null>(floorplan?.floorplanImage || null);
  const [formData, setFormData] = React.useState({
    ...defaultFloorplanForm,
    ...floorplan,
  });
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({});
  const isLoading = useSelector((state: RootState) => state.floorplanReducer.isLoading);

  const floorplanFilter = useSelector((state: RootState) => state.floorplanReducer.floorplanFilter);
  const dispatch: AppDispatch = useDispatch();
  // useEffect(() => {
  //   dispatch(fetchFloors());
  //   dispatch(fetchEngines());
  //   // console.log(formData);
  // }, [dispatch]);

  const floorData: floorType[] = useSelector((state: RootState) => state.floorReducer.floorAll || []);
  const engineData: EngineType[] = useSelector((state: RootState) => state.EngineReducer.engines || []);

  const handleClickOpen = () => {
    setLoading(true);
    setFormErrors({});
    if (type === 'edit' && floorplan) {
      if (!floorplan.id) {
        dispatch(fetchFloorplanDT(floorplanFilter));
      }
      setFormData({ ...defaultFloorplanForm, ...floorplan });
    } else {
      setFormData({ ...defaultFloorplanForm });
    }
    setTimeout(() => {
      setLoading(false);
      setOpen(true);
    }, 100);
  };

  const handleClose = () => {
    setOpen(false);
    setImage(null);
    setPreview(floorplan?.floorplanImage || null);
  };
  useEffect(() => {
    // Only run for edit mode and if floorplanImage is a string path
    if (
      type === 'edit' &&
      floorplan?.floorplanImage &&
      typeof floorplan.floorplanImage === 'string'
    ) {
      // Fetch the image from the server
      fetch(`${BASE_URL}${floorplan.floorplanImage}`)
        .then((res) => res.blob())
        .then((blob) => {
          // Create a File object from the Blob
          const file = new File(
            [blob],
            floorplan.floorplanImage.split('/').pop() || 'floorplan.jpg',
            {
              type: blob.type,
            },
          );
          setImage(file);
          // Optionally set preview as well
          setPreview(URL.createObjectURL(file));
        })
        .catch((err) => {
          console.error('Failed to fetch floorplan image:', err);
        });
    }
    // eslint-disable-next-line
  }, [open]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name?.trim()) errors.name = 'Floorplan name is required';
    if (!formData.floorId?.trim()) errors.floorId = 'Floor is required';
    if (!image) errors.floorplanImage = 'Floor Image is required';
    if (!formData.floorX) errors.floorX = 'Floor Length is required';
    if (!formData.floorY) errors.floorY = 'Floor Width is required';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast.error('Please fill in all required fields correctly.');
      return;
    }
    setIsSaving(true);
    try {
      const data = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (
          key !== 'floorplanImage' &&
          key !== 'createdBy' &&
          key !== 'createdAt' &&
          key !== 'updatedBy' &&
          key !== 'updatedAt'
        ) {
          data.append(key, value.toString());
        }
      });
      if (image) {
        data.append('floorplanImage', image);
      }
      let result;
      if (type === 'edit') {
        result = await dispatch(editFloorplan(data)); // Dispatch update
      }
      if (type === 'add') {
        result = await dispatch(addFloorplan(data));
      }
      if (result && result.type && result.type.endsWith('/fulfilled')) {
        await dispatch(fetchFloorplanDT(floorplanFilter));
        console.log('Floorplan Saved!');
        toast.success('Data Saved');
        handleClose();
      } else {
        toast.error('Saving Data Unsuccessful');
      }
    } catch (error) {
      toast.error('Saving Data Unsuccessful');
      console.error('Error saving floorplan:', error);
    }
    setTimeout(() => {
      setIsSaving(false);
    }, 1000);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement> | SelectChangeEvent<string>,
  ) => {
    const { value, name, id } = e.target as
      | HTMLInputElement
      | { value: string; name: string; id?: string };
    console.log('Input Change:', { id, name, value });
    const key = id || name;

    // Prepare new value for the field being changed
    const newValue = value;
    setFormData((prev) => {
      // Prepare updated values for calculation
      const updated = { ...prev, [key]: newValue };

      // Only recalculate if floorX, floorY, pixelX, and pixelY are available
      let meterPerPx = prev.meterPerPx;
      if (key === 'floorX' || key === 'floorY') {
        const floorX = Number(key === 'floorX' ? newValue : updated.floorX) || 0;
        const floorY = Number(key === 'floorY' ? newValue : updated.floorY) || 0;
        const pixelX = Number(updated.pixelX) || 0;
        const pixelY = Number(updated.pixelY) || 0;
        if (pixelX && pixelY && floorX && floorY) {
          meterPerPx = (floorX / pixelX + floorY / pixelY) / 2;
        }
      }
      console.log('Updated Form Data:', updated);
      return {
        ...updated,
        meterPerPx,
      };
    });
  };
  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
        setImage(file);
        const prepreview = URL.createObjectURL(file);
        // console.log(prepreview);
        setPreview(prepreview); // Preview selected image
        // console.log(image);
        // Calculate image dimensions
        const img = new window.Image();
        img.onload = () => {
          const pixelX = img.width;
          const pixelY = img.height;
          // Calculate meterPerPx if floorX and floorY are set
          const floorX = Number(formData.floorX) || 0;
          const floorY = Number(formData.floorY) || 0;
          let meterPerPx = 0;
          if (pixelX && pixelY && floorX && floorY) {
            meterPerPx = (floorX / pixelX + floorY / pixelY) / 2;
          }
          setFormData((prev) => ({
            ...prev,
            pixelX,
            pixelY,
            meterPerPx,
          }));
        };
        img.src = prepreview;
      } else {
        alert('Please select a valid image file (PNG, JPG, JPEG)');
      }
    }
  };

  return (
    <>
      {type === 'edit' && (
        <Tooltip title="Edit Floorplan">
          <IconButton color="primary" size="small" onClick={handleClickOpen}>
            <IconPencil size={20} />
          </IconButton>
        </Tooltip>
      )}
      {type === 'add' && (
        <Tooltip title="Add Floorplan">
          {isLoading ? (
            <Button
              variant="contained"
              color="primary"
              sx={{ p: 0.5, minWidth: 40, minHeight: 40 }}
            >
              <CircularProgress color="inherit" size={20} />
            </Button>
          ) : (
            <Button
              variant="contained"
              color="primary"
              sx={{ p: 0.5, minWidth: 40, minHeight: 40 }}
              onClick={handleClickOpen}
            >
              <IconPlus size={20} />
            </Button>
          )}
        </Tooltip>
      )}

      {!isLoading && (
        <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
          <DialogTitle>
            <Typography component="div" variant="h4" mb={2} mt={2} fontWeight={700}>
              {type === 'add' ? 'Add Floorplan' : 'Edit Floorplan'}
            </Typography>
            <Divider />
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={5} mb={3}>
              <Grid size={{ lg: 6, md: 12, sm: 12 }}>
                <CustomFormLabel htmlFor="floorplan-Name">Floorplan Name</CustomFormLabel>
                <CustomTextField
                  id="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                  error={!!formErrors.name}
                  helperText={formErrors.name}
                />
                <CustomFormLabel htmlFor="floorX">Floor Length (in meters)</CustomFormLabel>
                <CustomTextField
                  id="floorX"
                  value={formData.floorX}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                  type="number"
                  inputProps={{ step: 'any' }}
                  error={!!formErrors.floorX}
                  helperText={formErrors.floorX}
                />
                <CustomFormLabel htmlFor="Engine-id">Engine</CustomFormLabel>
                <Autocomplete
                  options={engineData.map((e) => ({ label: e.name, id: e.id }))} // 👈 Use engineData
                  value={
                    engineData
                      .map((e) => ({ label: e.name, id: e.id }))
                      .find((option) => option.id === formData.engineId) || null
                  }
                  onChange={(_, newValue) => {
                    const id = newValue?.id ?? '';
                    setFormData((prev) => ({ ...prev, engineId: id }));
                  }}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  getOptionLabel={(option) => (typeof option === 'string' ? option : option.label)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      id="engineId"
                      variant="outlined"
                      fullWidth
                      placeholder="Select Engine"
                    />
                  )}
                />
              </Grid>
              <Grid size={{ lg: 6, md: 12, sm: 12 }}>
                <CustomFormLabel htmlFor="floor-id">Floor</CustomFormLabel>
                <Autocomplete
                  options={floorData.map((f) => ({
                    label: f.name,
                    id: f.id,
                    buildingName: f.building?.name ?? 'Unknown Building',
                  }))}
                  value={
                    floorData
                      .map((f) => ({
                        label: f.name,
                        id: f.id,
                        buildingName: f.building?.name ?? 'Unknown Building',
                      }))
                      .find((option) => option.id === formData.floorId) || null
                  }
                  onChange={(_, newValue) => {
                    const id = newValue?.id ?? '';
                    setFormData((prev) => ({ ...prev, floorId: id }));
                    setFormErrors((prev) => {
                      if (!prev.floorId) return prev;
                      const next = { ...prev };
                      delete next.floorId;
                      return next;
                    });
                  }}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  getOptionLabel={(option) => (typeof option === 'string' ? option : option.label)}
                  clearOnEscape
                  disableClearable={false}
                  renderOption={(props, option) => (
                    <li {...props} key={option.id}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="body1">{option.label}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {option.buildingName}
                        </Typography>
                      </div>
                    </li>
                  )}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      id="floorId"
                      variant="outlined"
                      fullWidth
                      required
                      error={!!formErrors.floorId}
                      helperText={formErrors.floorId}
                    />
                  )}
                />

                <CustomFormLabel htmlFor="floorY">Floor Width (in meters)</CustomFormLabel>
                <CustomTextField
                  id="floorY"
                  value={formData.floorY}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                  type="number"
                  inputProps={{ step: 'any' }}
                  error={!!formErrors.floorY}
                  helperText={formErrors.floorY}
                />
              </Grid>
              <Grid size={{ lg: 12, md: 12, sm: 12 }}>
                <Grid size={12}>
                  <CustomFormLabel htmlFor="fp-image" error={!!formErrors.floorplanImage}>
                    Floorplan Image
                  </CustomFormLabel>
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/jpg"
                    onChange={handleImageChange}
                    required
                    style={{
                      border: formErrors.floorplanImage ? '1px solid red' : undefined,
                      padding: '6px',
                      borderRadius: '4px',
                      width: '100%',
                      marginTop: '5px',
                    }}
                  />
                  {formErrors.floorplanImage && (
                    <FormHelperText error>{formErrors.floorplanImage}</FormHelperText>
                  )}
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

      {isLoading && (
        <Dialog open={open} fullWidth maxWidth="sm">
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

export default AddEditFloorplan;
