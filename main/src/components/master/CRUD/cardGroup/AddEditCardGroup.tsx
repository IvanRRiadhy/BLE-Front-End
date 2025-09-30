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
  FormControlLabel,
  RadioGroup,
  Radio,
} from '@mui/material';
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';
import { IconPencil, IconPlus } from '@tabler/icons-react';
import React, { useEffect, useState } from 'react';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { AppDispatch, RootState, useDispatch, useSelector } from 'src/store/Store';
import toast from 'react-hot-toast';
import {
  addCardGroup,
  CardGroupType,
  editCardGroup,
  fetchCardGroupDT,
} from 'src/store/apps/crud/cardGroup';
import { defaultCardGroupForm } from 'src/store/apps/defaultForm';
import { fetchCard } from 'src/store/apps/crud/card';
import { fetchCardAccess } from 'src/store/apps/crud/cardAccess';

interface FormType {
  type?: string;
  cardGroup?: CardGroupType;
}

const AddEditCardGroup = ({ type, cardGroup }: FormType) => {
  const dispatch: AppDispatch = useDispatch();
  const [open, setOpen] = React.useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = React.useState({
    ...defaultCardGroupForm,
    ...cardGroup,
  });
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({});
  const isLoading = useSelector((state: RootState) => state.CardGroupReducer.isLoading);

  const cardGroupFilter = useSelector((state: RootState) => state.CardGroupReducer.cardGroupFilter);

  const cardData = useSelector((state: RootState) => state.CardReducer.cardAll);
  const cardAccessData = useSelector((state: RootState) => state.CardAccessReducer.cardAccessAll);

  useEffect(() => {
    dispatch(fetchCard());
    dispatch(fetchCardAccess());
    // console.log(formData);
  }, [dispatch]);

  const handleClickOpen = () => {
    setFormErrors({});
    if (type === 'edit' && cardGroup) {
      if (!cardGroup.id) {
        dispatch(fetchCardGroupDT(cardGroupFilter));
      }
      setFormData({ ...defaultCardGroupForm, ...cardGroup });
    } else {
      setFormData({ ...defaultCardGroupForm });
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

    if (!formData.name?.trim()) errors.name = 'Card Group name is required';

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
      const payload = {
        id: formData.id,
        name: formData.name,
        remarks: formData.remarks,
        accessScope: formData.accessScope,
        cardIds: (formData.cards ?? []).map((c: any) => c.id),
        cardAccessIds: (formData.cardAccesses ?? []).map((ca: any) => ca.id),
      };
      let result;
      if (type === 'edit') {
        result = await dispatch(editCardGroup(payload));
      }
      if (type === 'add') {
        result = await dispatch(addCardGroup(payload));
      }
      if (result && result.type && result.type.endsWith('/fulfilled')) {
        await dispatch(fetchCardGroupDT(cardGroupFilter));
        console.log('Card Group Saved!');
        toast.success('Data Saved');
        handleClose();
      } else {
        toast.error('Saving Data Unsuccessful');
      }
    } catch (error) {
      toast.error('Saving Data Unsuccessful');
      console.error('Error saving Card Group:', error);
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
    // console.log('Input Change:', { id, name, value });
    setFormData((prev) => ({ ...prev, [id || name]: value }));
  };

  return (
    <>
      {type === 'edit' && (
        <Tooltip title="Edit Card Group">
          <IconButton color="primary" size="small" onClick={handleClickOpen}>
            <IconPencil size={20} />
          </IconButton>
        </Tooltip>
      )}
      {type === 'add' && (
        <Tooltip title="Add Card Group">
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
        <Dialog open={open} onClose={handleClose} fullWidth maxWidth="lg">
          <DialogTitle>
            <Typography component="div" variant="h4" mb={2} mt={2} fontWeight={700}>
              {type === 'add' ? 'Add Card Group' : 'Edit Card Group'}
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

                <CustomFormLabel htmlFor="remarks">Description</CustomFormLabel>
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
              <Grid size={{ lg: 8, md: 12, sm: 12 }} container spacing={2} alignItems="stretch">
                {/* Cards Section */}
                <Grid size={{ xs: 12, md: 6 }} sx={{ display: 'flex', flexDirection: 'column' }}>
                  <CustomFormLabel>Cards</CustomFormLabel>
                  <CustomSelect
                    id="cards"
                    name="cards"
                    value=""
                    onChange={(e: any) => {
                      const selectedId = e.target.value;
                      const selectedCard = cardData.find((c) => c.id === selectedId);
                      if (selectedCard) {
                        setFormData((prev) => ({
                          ...prev,
                          cards: [...(prev.cards ?? []), selectedCard],
                        }));
                      }
                    }}
                    fullWidth
                    variant="outlined"
                  >
                    <MenuItem value="" disabled>
                      Select a Card
                    </MenuItem>
                    {cardData
                      .filter((c) => !(formData.cards ?? []).some((fc: any) => fc.id === c.id))
                      .map((c) => (
                        <MenuItem key={c.id} value={c.id}>
                          {c.name ?? c.cardNumber}
                        </MenuItem>
                      ))}
                  </CustomSelect>

                  {/* Make this flex-grow to fill column */}
                  <Box
                    sx={{
                      mt: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      p: 1,
                      flexGrow: 1, // 👈 ensures same height with right side
                      minHeight: 120,
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    {(formData.cards ?? []).length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        Selected Cards: None
                      </Typography>
                    ) : (
                      (formData.cards ?? []).map((c: any) => (
                        <Box
                          key={c.id}
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
                          <Typography variant="body2">{c.name ?? c.cardNumber}</Typography>
                          <IconButton
                            size="small"
                            onClick={() =>
                              setFormData((prev) => ({
                                ...prev,
                                cards: (prev.cards ?? []).filter((fc: any) => fc.id !== c.id),
                              }))
                            }
                          >
                            ×
                          </IconButton>
                        </Box>
                      ))
                    )}
                  </Box>
                </Grid>

                {/* Card Access Section */}
                <Grid size={{ xs: 12, md: 6 }} sx={{ display: 'flex', flexDirection: 'column' }}>
                  <CustomFormLabel>Card Access</CustomFormLabel>

                  {/* Radio buttons for accessScope */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Access Scope
                    </Typography>
                    <RadioGroup
                      row
                      name="accessScope"
                      value={formData.accessScope ?? 'Specific'} // default "specific"
                      onChange={(e) => {
                        const scope = e.target.value;
                        setFormData((prev) => ({
                          ...prev,
                          accessScope: scope,
                          cardAccesses: scope === 'Specific' ? prev.cardAccesses ?? [] : [], // clear if not specific
                        }));
                      }}
                    >
                      <FormControlLabel value="All" control={<Radio />} label="All" />
                      <FormControlLabel value="Specific" control={<Radio />} label="Specific" />
                      <FormControlLabel value="None" control={<Radio />} label="None" />
                    </RadioGroup>
                  </Box>

                  {/* Dropdown for selecting specific access (only when accessScope === 'specific') */}
                  {formData.accessScope === 'Specific' && (
                    <>
                      <CustomSelect
                        id="cardAccess"
                        name="cardAccess"
                        value=""
                        onChange={(e: any) => {
                          const selectedId = e.target.value;
                          const selectedCA = cardAccessData.find((ca) => ca.id === selectedId);
                          if (selectedCA) {
                            setFormData((prev) => ({
                              ...prev,
                              cardAccesses: [...(prev.cardAccesses ?? []), selectedCA],
                            }));
                          }
                        }}
                        fullWidth
                        variant="outlined"
                      >
                        <MenuItem value="" disabled>
                          Select a Card Access
                        </MenuItem>
                        {cardAccessData
                          .filter(
                            (ca) =>
                              !(formData.cardAccesses ?? []).some((fca: any) => fca.id === ca.id),
                          )
                          .map((ca) => (
                            <MenuItem key={ca.id} value={ca.id}>
                              {ca.name}
                            </MenuItem>
                          ))}
                      </CustomSelect>

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
                        {(formData.cardAccesses ?? []).length === 0 ? (
                          <Typography variant="body2" color="text.secondary">
                            Selected Access: None
                          </Typography>
                        ) : (
                          (formData.cardAccesses ?? []).map((ca: any) => (
                            <Box
                              key={ca.id}
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
                              <Typography variant="body2">{ca.name}</Typography>
                              <IconButton
                                size="small"
                                onClick={() =>
                                  setFormData((prev) => ({
                                    ...prev,
                                    cardAccesses: (prev.cardAccesses ?? []).filter(
                                      (fca: any) => fca.id !== ca.id,
                                    ),
                                  }))
                                }
                              >
                                ×
                              </IconButton>
                            </Box>
                          ))
                        )}
                      </Box>
                    </>
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

export default AddEditCardGroup;
