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
  FormHelperText,
  Autocomplete,
  TextField,
} from '@mui/material';
import { IconPencil, IconPlus } from '@tabler/icons-react';
import React, { useEffect } from 'react';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { AppDispatch, RootState, useDispatch, useSelector } from 'src/store/Store';
import {
  addFloor,
  editFloor,
  fetchFloorDT,
  fetchFloors,
  floorType,
} from 'src/store/apps/crud/floor';
import { fetchBuildings, BuildingType } from 'src/store/apps/crud/building';
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';
import toast from 'react-hot-toast';
import { defaultFloorForm } from 'src/store/apps/defaultForm';

interface FormType {
  type?: string;
  floor?: floorType;
}

const AddEditFloor = ({ type, floor }: FormType) => {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [image, setImage] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string | null>(floor?.floorImage || null);
  const [formData, setFormData] = React.useState<floorType>({
    ...defaultFloorForm,
    ...floor,
  });
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({});
  const isLoading = useSelector((state: RootState) => state.floorReducer.isLoading);

  const dispatch: AppDispatch = useDispatch();
  const buildingData: BuildingType[] = useSelector(
    (state: RootState) => state.buildingReducer.buildingAll,
  );
  const floorFilter = useSelector((state: RootState) => state.floorReducer.floorFilter);
  React.useEffect(() => {
    dispatch(fetchBuildings());
  }, [dispatch]);

  const handleClickOpen = () => {
    setLoading(true);
    setFormErrors({});
    if (type === 'edit' && floor) {
      if (!floor.id) {
        dispatch(fetchFloorDT(floorFilter));
      }
      setFormData({ ...defaultFloorForm, ...floor });
    } else {
      setFormData({ ...defaultFloorForm });
    }
    setTimeout(() => {
      setLoading(false);
      setOpen(true);
    }, 100);
  };

  const handleClose = () => {
    setOpen(false);
    setImage(null);
    setPreview(floor?.floorImage || null);
  };
  useEffect(() => {
    // Only run for edit mode and if floorImage is a string path
    if (type === 'edit' && floor?.floorImage && typeof floor.floorImage === 'string') {
      // Fetch the image from the server
      fetch(`${BASE_URL}${floor.floorImage}`)
        .then((res) => res.blob())
        .then((blob) => {
          // Create a File object from the Blob
          const file = new File([blob], floor.floorImage.split('/').pop() || 'floorplan.jpg', {
            type: blob.type,
          });
          setImage(file);
          // Optionally set preview as well
          setPreview(URL.createObjectURL(file));
        })
        .catch((err) => {
          console.error('Failed to fetch floor image:', err);
        });
    }
    // eslint-disable-next-line
  }, [open]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name?.trim()) errors.name = 'Floor name is required';
    if (!image) errors.floorImage = 'Floor Image is required';
    if (!formData.buildingId) errors.buildingId = 'Building is required';
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
    setLoading(true);
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
        // console.log('Image file added to form data:', image);
      }
      let result;
      if (type === 'edit') {
        result = await dispatch(editFloor(data)); // Dispatch update
      }
      if (type === 'add') {
        result = await dispatch(addFloor(data));
      }
      if (result && result.type && result.type.endsWith('/fulfilled')) {
        await dispatch(fetchFloorDT(floorFilter));
        console.log('Floor Saved!');
        toast.success('Data Saved');
        handleClose();
      } else {
        toast.error('Saving Data Unsuccessful');
      }
    } catch (error) {
      toast.error('Saving Data Unsuccessful');
      console.error('Error saving floor:', error);
    }
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement> | SelectChangeEvent<string>,
  ) => {
    const { value, name, id } = e.target as
      | HTMLInputElement
      | { value: string; name: string; id?: string };
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
        <Tooltip title="Edit Floor">
          <IconButton color="primary" size="small" onClick={handleClickOpen}>
            <IconPencil size={20} />
          </IconButton>
        </Tooltip>
      )}
      {type === 'add' && (
        <Tooltip title="Add Floor">
          <Button
            variant="contained"
            color="primary"
            startIcon={<IconPlus size={20} />}
            onClick={handleClickOpen}
          >
            Add Floor
          </Button>
        </Tooltip>
      )}

      {!isLoading && (
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
              <Grid size={{ lg: 6, md: 12, sm: 12 }} >
                <CustomFormLabel htmlFor="building">Building</CustomFormLabel>
                {/* <CustomSelect
                  name="buildingId"
                  id="buildingId"
                  value={formData.buildingId}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                  error={!!formErrors.buildingId}
                  helperText={formErrors.buildingId}
                >
                  <MenuItem value="" disabled>
                    Select Building
                  </MenuItem>
                  {buildingData.map((building) => (
                    <MenuItem key={building.id} value={building.id}>
                      {building.name}
                    </MenuItem>
                  ))}
                </CustomSelect> */}
                <Autocomplete
                options={buildingData.map((b) => ({ id: b.id, label: b.name }))}
                value={
                  buildingData
                    .map((b) => ({ id: b.id, label: b.name }))
                    .find((option) => option.id === formData.buildingId) || null
                }
                onChange={(_, newVal) => {
                  const id= newVal?.id ?? '';
                  setFormData((prev) => ({ ...prev, buildingId: id }));
                  setFormErrors((prev) => {
                    if(!prev.buildingId) return prev;
                    const next = {...prev};
                    delete next.buildingId;
                    return next;
                  });
                }}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                getOptionLabel={(option) => (typeof option === 'string' ? option : option.label)}
                clearOnEscape
                disableClearable={false}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    id = "buildingId"
                    variant="outlined"
                    fullWidth
                    required
                    error={!!formErrors.buildingId}
                    helperText={formErrors.buildingId}
                  />
                )}
                />
                <CustomFormLabel htmlFor="floor-name">name</CustomFormLabel>
                <CustomTextField
                  id="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                  error={!!formErrors.name}
                  helperText={formErrors.name}
                />
                <CustomFormLabel htmlFor="floor-pixelX">Pixel X</CustomFormLabel>
                <CustomTextField
                  id="pixelX"
                  value={formData.pixelX}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                  disabled
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
              </Grid>
              <Grid size={{ lg: 6, md: 12, sm: 12 }} >
                <CustomFormLabel htmlFor="Engine-id">Engine Floor ID</CustomFormLabel>
                <CustomTextField
                  id="engineFloorId"
                  value={formData.engineFloorId}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                />
                <CustomFormLabel htmlFor="m-per-px">Meter Per Pixel</CustomFormLabel>
                <CustomTextField
                  id="meterPerPx"
                  value={formData.meterPerPx}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                  disabled
                />
                <CustomFormLabel htmlFor="floor-pixelY">Pixel Y</CustomFormLabel>
                <CustomTextField
                  id="pixelY"
                  value={formData.pixelY}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                  disabled
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
              <Grid size={{ lg: 12, md: 12, sm: 12 }} >
                <Grid size={12}>
                  <CustomFormLabel htmlFor="fp-image" error={!!formErrors.floorImage}>
                    Floorplan Image
                  </CustomFormLabel>
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/jpg"
                    onChange={handleImageChange}
                    required
                    style={{
                      border: formErrors.floorImage ? '1px solid red' : undefined,
                      padding: '6px',
                      borderRadius: '4px',
                      width: '100%',
                      marginTop: '5px',
                    }}
                  />
                  {formErrors.floorImage && (
                    <FormHelperText error>{formErrors.floorImage}</FormHelperText>
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

export default AddEditFloor;
