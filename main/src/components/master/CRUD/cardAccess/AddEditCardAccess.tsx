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
  Box,
} from '@mui/material';
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';
import { IconPencil, IconPlus } from '@tabler/icons-react';
import React, { useEffect, useState } from 'react';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { AppDispatch, RootState, useDispatch, useSelector } from 'src/store/Store';
import toast from 'react-hot-toast';
import { addCardAccess, CardAccessType, editCardAccess, fetchCardAccessDT } from 'src/store/apps/crud/cardAccess';
import { defaultCardAccessForm } from 'src/store/apps/defaultForm';
import { fetchMaskedAreas } from 'src/store/apps/crud/maskedArea';
import AutocompleteFilter from 'src/layouts/full/horizontal/navbar/AutocompleteFilter';
import { fetchFloors } from 'src/store/apps/crud/floor';
import { fetchFloorplan } from 'src/store/apps/crud/floorplan';
import { fetchBuildings } from 'src/store/apps/crud/building';

interface FormType {
  type?: string;
  cardAccess?: CardAccessType;
}

const AddEditCardAccess = ({ type, cardAccess }: FormType) => {
  const dispatch: AppDispatch = useDispatch();
  const [open, setOpen] = React.useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = React.useState({
    ...defaultCardAccessForm,
    ...cardAccess,
  });
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({});
  const isLoading = useSelector((state: RootState) => state.CardAccessReducer.isLoading);

  const cardAccessFilter = useSelector(
    (state: RootState) => state.CardAccessReducer.cardAccessFilter,
  );

  const maskedAreas = useSelector((state: RootState) => state.maskedAreaReducer.maskedAreaAll);
  const floors = useSelector((state: RootState) => state.floorReducer.floorAll);
  const floorplans = useSelector((state: RootState) => state.floorplanReducer.floorplanAll);
  const buildings = useSelector((state: RootState) => state.buildingReducer.buildingAll);
  useEffect(() => {
    dispatch(fetchMaskedAreas());
    dispatch(fetchFloors());
    dispatch(fetchFloorplan());
    dispatch(fetchBuildings());
    // console.log(formData);
  }, [dispatch]);

  const handleClickOpen = () => {
    setFormErrors({});
    if (type === 'edit' && cardAccess) {
      if (!cardAccess.id) {
        dispatch(fetchCardAccessDT(cardAccessFilter));
      }
      setFormData({ ...defaultCardAccessForm, ...cardAccess });
    } else {
      setFormData({ ...defaultCardAccessForm });
    }
    setTimeout(() => {
      setOpen(true);
    }, 100);
  };
  const handleClose = () => {
    setOpen(false);
    // console.log(floorData);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name?.trim()) errors.name = 'Card Access name is required';

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
        Object.keys(formData).forEach((key: string) => {
          const value = formData[key as keyof typeof formData];
          if (typeof value === 'string' || value instanceof Blob) {
            data.append(key, value);
          } else {
            console.error(`Invalid value type for key ${key}: ${typeof value}`);
          }
        });
        let result;
        if (type === 'edit') {
          result = await dispatch(editCardAccess(data)); // Dispatch update
        }
        if (type === 'add') {
          result = await dispatch(addCardAccess(data));
        }
        if (result && result.type && result.type.endsWith('/fulfilled')) {
          await dispatch(fetchCardAccessDT(cardAccessFilter));
          console.log('Card Access Saved!');
          toast.success('Data Saved');
          handleClose();
        } else {
          toast.error('Saving Data Unsuccessful');
        }
      } catch (error) {
        toast.error('Saving Data Unsuccessful');
        console.error('Error saving Card Access:', error);
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
    setFormData((prev) => ({ ...prev, [id || name]: value }));
  };

  return (
    <>
      {type === 'edit' && (
        <Tooltip title="Edit Card Access">
          <IconButton color="primary" size="small" onClick={handleClickOpen}>
            <IconPencil size={20} />
          </IconButton>
        </Tooltip>
      )}
      {type === 'add' && (
        <Tooltip title="Add Card Access">
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
        <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
          <DialogTitle>
            <Typography component="div" variant="h4" mb={2} mt={2} fontWeight={700}>
              {type === 'add' ? 'Add Card Access' : 'Edit Card Access'}
            </Typography>
            <Divider />
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={5} mb={3}>
              <Grid size={{ lg: 4, md: 12, sm: 12 }}>
                <CustomFormLabel htmlFor="name">Name</CustomFormLabel>
                <CustomTextField
                  id="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                  error={!!formErrors.name}
                  helperText={formErrors.name}
                />

                <CustomFormLabel htmlFor="remarks">remarks</CustomFormLabel>
                <CustomTextField
                  id="remarks"
                  value={formData.remarks}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                  error={!!formErrors.remarks}
                  helperText={formErrors.remarks}
                  multiline
                  minRows={3}
                  maxRows={5}
                />
              </Grid>
              <Grid
                size={{ lg: 8, md: 12, sm: 12 }}
                sx={{ display: 'flex', flexDirection: 'column' }}
              >
                <CustomFormLabel>Allowed Area(s)</CustomFormLabel>

                <Autocomplete
                  multiple
                  options={maskedAreas}
                  getOptionLabel={(option: any) => option.name}
                  filterSelectedOptions
                  value={maskedAreas.filter((m) => (formData.maskedAreaIds ?? []).includes(m.id))}
                  onChange={(_e, newValue) => {
                    setFormData((prev) => ({
                      ...prev,
                      maskedAreaIds: newValue.map((m: any) => m.id),
                    }));
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="Type area name..."
                      variant="outlined"
                      fullWidth
                    />
                  )}
                  renderTags={() => null}
                  renderOption={(props, option: any) => {
                    const floor = floors.find((f) => f.id === option.floorId);
                    const building = floor
                      ? buildings.find((b) => b.id === floor.buildingId)
                      : null;
                    const floorplan = floorplans.find((fp) => fp.id === option.floorplanId);

                    return (
                      <li {...props} key={option.id}>
                        <Box>
                          <Typography variant="body1" fontWeight={600}>{option.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {building?.name ?? 'Unknown Building'} &gt;{' '}
                            {floor?.name ?? 'Unknown Floor'} &gt;{' '}
                            {floorplan?.name ?? 'Unknown Floorplan'}
                          </Typography>
                        </Box>
                      </li>
                    );
                  }}
                />

                {/* Bordered list for selected areas */}
                <Box
                  sx={{
                    mt: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    p: 1,
                    flexGrow: 1,
                    minHeight: 120,
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {(formData.maskedAreaIds ?? []).length === 0 ? (
                    <Typography variant="body1" color="text.secondary">
                      Selected Area: None
                    </Typography>
                  ) : (
                    (formData.maskedAreaIds ?? []).map((id) => {
                      const ma = maskedAreas.find((m) => m.id === id);
                      if (!ma) return null;

                      const floor = floors.find((f) => f.id === ma.floorId);
                      const floorplan = floorplans.find((fp) => fp.id === ma.floorplanId);
                      const building = floor
                        ? buildings.find((b) => b.id === floor.buildingId)
                        : null;

                      return (
                        <Box
                          key={id}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            py: 0.5,
                            px: 1,
                            borderRadius: 0.5,
                            '&:hover': { bgcolor: 'grey.100' },
                          }}
                        >
                          <Box>
                            <Typography variant="body1" fontWeight={600}>{ma.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {building?.name ?? 'Unknown Building'} &gt;{' '}
                              {floor?.name ?? 'Unknown Floor'} &gt;{' '}
                              {floorplan?.name ?? 'Unknown Floorplan'}
                            </Typography>
                          </Box>
                          <IconButton
                            size="small"
                            onClick={() =>
                              setFormData((prev) => ({
                                ...prev,
                                maskedAreaIds: (prev.maskedAreaIds ?? []).filter(
                                  (fid) => fid !== id,
                                ),
                              }))
                            }
                          >
                            ×
                          </IconButton>
                        </Box>
                      );
                    })
                  )}
                </Box>
              </Grid>
            </Grid>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default AddEditCardAccess;
