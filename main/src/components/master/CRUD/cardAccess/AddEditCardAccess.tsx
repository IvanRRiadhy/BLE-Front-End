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
} from '@mui/material';
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';
import { IconPencil, IconPlus } from '@tabler/icons-react';
import React, { useEffect, useState } from 'react';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { AppDispatch, RootState, useDispatch, useSelector } from 'src/store/Store';
import toast from 'react-hot-toast';
import { CardAccessType, fetchCardAccessDT } from 'src/store/apps/crud/cardAccess';
import { defaultCardAccessForm } from 'src/store/apps/defaultForm';
import { fetchMaskedAreas } from 'src/store/apps/crud/maskedArea';
import AutocompleteFilter from 'src/layouts/full/horizontal/navbar/AutocompleteFilter';

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

  const maskedAreas = useSelector((state: RootState) => state.maskedAreaReducer.maskedAreas);
  const floors = useSelector((state: RootState) => state.floorReducer.floors);
  const floorplans = useSelector((state: RootState) => state.floorplanReducer.floorplans);
  const buildings = useSelector((state: RootState) => state.buildingReducer.buildings);
  useEffect(() => {
    dispatch(fetchMaskedAreas());
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
              <Grid size={{ lg: 8, md: 12, sm: 12 }}>
                <CustomFormLabel>Allowed Area(s)</CustomFormLabel>
                <AutocompleteFilter
                  buildings={buildings}
                  floors={floors}
                  floorplans={floorplans}
                  maskedAreas={maskedAreas}
                  // convert MaskedAreaType[] → string[] (ids)
                  initial={{ MaskedAreaId: formData.maskedArea?.map((ma) => ma.id) ?? [] }}
                  onChangeFilter={(f) => {
                    // convert ids back → MaskedAreaType[]
                    const selectedMas = maskedAreas.filter((ma) => f.MaskedAreaId.includes(ma.id));
                    setFormData((prev) => ({
                      ...prev,
                      maskedArea: selectedMas,
                    }));
                  }}
                />
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Selected Area:{' '}
                  {formData.maskedArea?.length
                    ? formData.maskedArea.map((ma) => ma.name).join(', ')
                    : 'None'}
                </Typography>
              </Grid>
            </Grid>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default AddEditCardAccess;
