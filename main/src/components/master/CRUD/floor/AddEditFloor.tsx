
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
  Box,
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
import AddEditBuilding from '../building/AddEditBuilding';

interface FormType {
  type?: string;
  floor?: floorType;
}

const AddEditFloor = ({ type, floor }: FormType) => {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

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
  };


  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name?.trim()) errors.name = 'Floor name is required';
        if (!formData.buildingId) errors.buildingId = 'Building is required';

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
      setIsSaving(false);
    }, 1000);
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
        <Tooltip title="Edit Floor">
          <IconButton color="primary" size="small" onClick={handleClickOpen}>
            <IconPencil size={20} />
          </IconButton>
        </Tooltip>
      )}
      {type === 'add' && (
        <Tooltip title="Add Floor">
          {isLoading ? (
            <Button
              variant="contained"
              color="primary"
              sx={{ p: 0.5, minWidth: 40, minHeight: 40 }}
            >
              <CircularProgress color='inherit' size={20} />
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
              {type === 'add' ? 'Add Floor' : 'Edit Floor'}
            </Typography>
            <Divider />
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={5} mb={3}>
              <Grid size={{ lg: 6, md: 12, sm: 12 }} >
                <CustomFormLabel htmlFor="building">Building</CustomFormLabel>
                <Box display="flex" alignItems="center" gap={1}>
                <Autocomplete
                sx={{ flex: 1 }}
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
                <AddEditBuilding type='add' />
                </Box>

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
