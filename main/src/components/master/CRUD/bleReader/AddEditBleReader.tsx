import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid2 as Grid,
  IconButton,
  Typography,
  MenuItem,
  SelectChangeEvent,
  Tooltip,
  CircularProgress,
  Autocomplete,
  TextField,
} from '@mui/material';
import { IconPencil, IconPlus } from '@tabler/icons-react';
import React, { useEffect } from 'react';
import toast from 'react-hot-toast';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { AppDispatch, useDispatch, useSelector, RootState } from 'src/store/Store';
import {
  addBleReader,
  bleReaderType,
  editBleReader,
  fetchBleReaderDT,
  fetchBleReaders,
} from 'src/store/apps/crud/bleReader';
import { fetchBrands, BrandType } from 'src/store/apps/crud/brand';
import { defaultBleReaderForm } from 'src/store/apps/defaultForm';

interface FormType {
  type?: string;
  bleReader?: bleReaderType;
}

const AddEditBleReader = ({ type, bleReader }: FormType) => {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [formData, setFormData] = React.useState<bleReaderType>({
    ...defaultBleReaderForm,
    ...bleReader,
  });
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({});
  const isLoading = useSelector((state: RootState) => state.bleReaderReducer.isLoading);
  const hasLoaded = useSelector((state: RootState) => state.bleReaderReducer.hasLoaded);

  const brands: BrandType[] = useSelector((state: RootState) => state.brandReducer.brandAll);
  const bleReaderFilter = useSelector((state: RootState) => state.bleReaderReducer.bleReaderFilter);
  const dispatch: AppDispatch = useDispatch();
  useEffect(() => {
    dispatch(fetchBrands());
  }, [dispatch]);

  const handleClickOpen = () => {
    setLoading(true);
    setFormErrors({});
    if (type === 'edit' && bleReader) {
      if (!bleReader.id) {
        dispatch(fetchBleReaderDT(bleReaderFilter));
      }
      setFormData({
        ...defaultBleReaderForm,
        ...bleReader,
      });
    } else {
      setFormData({ ...defaultBleReaderForm });
    }
    console.log('Form Data : ', formData);
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

    if (!formData.name?.trim()) errors.name = 'Reader Name is required';
    if (!formData.ip?.trim()) errors.ip = 'Reader IP is required';
    if (!formData.gmac?.trim()) errors.gmac = 'Reader MAC is required';
    if (!formData.brandId) errors.brandId = 'Reader Brand is required';
    // if (!formData.engineReaderId) errors.engineReaderId = 'Reader Engine is required';

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
      let result;
      if (type === 'edit') {
        result = await dispatch(editBleReader(formData)); // Dispatch update
      }
      if (type === 'add') {
        result = await dispatch(addBleReader(formData));
      }
      if (result && result.type && result.type.endsWith('/fulfilled')) {
        await dispatch(fetchBleReaderDT(bleReaderFilter));
        console.log('BLE Reader Saved!');
        toast.success('Data Saved');
        handleClose();
      } else {
        toast.error('Saving Data Unsuccessful');
      }
    } catch (error) {
      toast.error('Saving Data Unsuccessful');
      console.error('Error saving BLE reader:', error);
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
        <Tooltip title="Edit BLE Reader">
          <IconButton color="primary" size="small" onClick={handleClickOpen}>
            <IconPencil size={20} />
          </IconButton>
        </Tooltip>
      )}
      {type === 'add' && (
        <Tooltip title="Add BLE Reader">
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
              {type === 'add' ? 'Add Ble Reader' : 'Edit Ble Reader'}
            </Typography>
            <Divider />
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={5} mb={3}>
              <Grid size={{ lg: 6, md: 12, sm: 12 }}>
                <CustomFormLabel htmlFor="brand-id">Brand</CustomFormLabel>
                <Autocomplete
                  options={brands.map((b) => ({ id: b.id, label: b.name }))}
                  value={
                    brands
                      .map((b) => ({ id: b.id, label: b.name }))
                      .find((o) => o.id === formData.brandId) ?? null
                  }
                  onChange={(_, newVal) => {
                    const id = newVal?.id ?? '';
                    setFormData((prev) => ({ ...prev, brandId: id }));
                    setFormErrors((prev) => {
                      if (!prev.brandId) return prev;
                      const next = { ...prev };
                      delete next.brandId;
                      return next;
                    });
                  }}
                  isOptionEqualToValue={(opt, val) => opt.id === val.id}
                  getOptionLabel={(opt) => (typeof opt === 'string' ? opt : opt.label)}
                  clearOnEscape
                  disableClearable={false}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      id="brandId"
                      variant="outlined"
                      fullWidth
                      required
                      error={!!formErrors.brandId}
                      helperText={formErrors.brandId || ''}
                    />
                  )}
                />

                <CustomFormLabel htmlFor="ble-name">Name</CustomFormLabel>
                <CustomTextField
                  id="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                  error={!!formErrors.name}
                  helperText={formErrors.name}
                />
                <CustomFormLabel htmlFor="ble-ip">IP</CustomFormLabel>
                <CustomTextField
                  id="ip"
                  value={formData.ip}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                  error={!!formErrors.ip}
                  helperText={formErrors.ip}
                />
              </Grid>
              <Grid size={{ lg: 6, md: 12, sm: 12 }}>
                {/* <CustomFormLabel htmlFor="reader-id">Engine Reader ID</CustomFormLabel>
                <CustomTextField
                  id="engineReaderId"
                  value={formData.engineReaderId}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                  error={!!formErrors.engineReaderId}
                  helperText={formErrors.engineReaderId}
                /> */}
                <CustomFormLabel htmlFor="ble-gmac">GMAC</CustomFormLabel>
                <CustomTextField
                  id="gmac"
                  value={formData.gmac}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                  error={!!formErrors.gmac}
                  helperText={formErrors.gmac}
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
              Loading...
            </Typography>
            <CircularProgress size={50} color="primary" />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default AddEditBleReader;
