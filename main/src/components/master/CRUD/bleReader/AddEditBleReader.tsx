import React, { useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid2 as Grid,
  Typography,
  Tooltip,
  CircularProgress,
  Autocomplete,
  TextField,
  Box,
  IconButton,
  MenuItem,
  Collapse,
  Stack,
} from '@mui/material';
import { IconPencil, IconPlus, IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import toast from 'react-hot-toast';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';
import { bleReaderType } from 'src/hooks/useReader';
import { defaultBleReaderForm } from 'src/store/apps/defaultForm';
import { useAddReader, useEditReader, useReaderList } from 'src/hooks/useReader';
import { useAllBrands } from 'src/hooks/useBrand'; // Optional: if your Brand API is cached
import { useQueryClient } from '@tanstack/react-query';

interface FormType {
  type?: 'add' | 'edit';
  bleReader?: bleReaderType;
}

const AddEditBleReader = ({ type, bleReader }: FormType) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<bleReaderType>({
    ...defaultBleReaderForm,
    ...bleReader,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showAdvanced, setShowAdvanced] = useState(false);

  const addMutation = useAddReader();
  const editMutation = useEditReader();
  const queryClient = useQueryClient();

  const { data: brandData = [] } = useAllBrands?.() || { data: [] };
  const filter = queryClient.getQueryData(['ble-reader-list']) as any;

  // ────────────────────────────────
  // Open dialog and initialize form
  // ────────────────────────────────
  const handleClickOpen = () => {
    setLoading(true);
    setFormErrors({});
    if (type === 'edit' && bleReader) {
      setFormData({ ...defaultBleReaderForm, ...bleReader, brandId: bleReader.brand?.id || '', });
    } else {
      setFormData({ ...defaultBleReaderForm });
    }
    setTimeout(() => {
      setLoading(false);
      setOpen(true);
    }, 100);
  };

  const handleClose = () => setOpen(false);

  // ────────────────────────────────
  // Validation
  // ────────────────────────────────
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.name?.trim()) errors.name = 'Reader Name is required';
    if (!formData.ip?.trim()) errors.ip = 'Reader IP is required';
    if (!formData.gmac?.trim()) errors.gmac = 'Reader MAC is required';
    if (!formData.brandId) errors.brandId = 'Reader Brand is required';
    if (formData.readerType === null || formData.readerType === undefined)
      errors.readerType = 'Reader Type is required';
    if (formData.measuredPower === null || formData.measuredPower === undefined)
      errors.measuredPower = 'Measured Power is required';
    if (
      formData.pathLossExponent === null ||
      formData.pathLossExponent === undefined
    )
      errors.pathLossExponent = 'Path Loss Exponent is required';
    if (formData.heightMeter === null || formData.heightMeter === undefined)
      errors.heightMeter = 'Height Meter is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ────────────────────────────────
  // Save Logic (Add/Edit)
  // ────────────────────────────────
  const handleSave = async () => {
    if (!validateForm()) {
      toast.error('Please fill in all required fields correctly.');
      return;
    }
    setIsSaving(true);
    try {
      let result = {};
      if (type === 'edit') {
        result = await editMutation.mutateAsync(formData);
        // Optimistically update cache
        queryClient.setQueryData(['ble-reader-list', filter], (old: any) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((r: bleReaderType) =>
              r.id === formData.id ? { ...r, ...formData } : r,
            ),
          };
        });
      } else {
        result = await addMutation.mutateAsync(formData);
        // Optimistically append to cache
        queryClient.setQueryData(['ble-reader-list', filter], (old: any) => {
          if (!old) return old;
          return { ...old, data: [...old.data, result] };
        });
      }

      toast.success('BLE Reader saved successfully!');
      handleClose();
    } catch (error) {
      console.error('Error saving BLE Reader:', error);
      toast.error('Saving data failed.');
    } finally {
      setIsSaving(false);
    }
  };

  // ────────────────────────────────
  // Input change
  // ────────────────────────────────
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    const { id, value, type } = e.target;
    setFormData((prev) => ({ 
      ...prev, 
      [id]: type === 'number' ? (value === '' ? '' : Number(value)) : value 
    }));
  };

  // ────────────────────────────────
  // Component UI
  // ────────────────────────────────
  return (
    <>
      {/* ────────────── Edit Button ────────────── */}
      {type === 'edit' && (
        <Tooltip title="Edit BLE Reader">
          <IconButton color="primary" size="small" onClick={handleClickOpen}>
            <IconPencil size={20} />
          </IconButton>
        </Tooltip>
      )}

      {/* ────────────── Add Button ────────────── */}
      {type === 'add' && (
        <Tooltip title="Add BLE Reader">
          <Button
            variant="contained"
            color="primary"
            sx={{ p: 0.5, minWidth: 40, minHeight: 40 }}
            onClick={handleClickOpen}
          >
            {isSaving ? <CircularProgress color="inherit" size={20} /> : <IconPlus size={20} />}
          </Button>
        </Tooltip>
      )}

      {/* ────────────── Dialog Form ────────────── */}
      {!loading && (
        <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
          <DialogTitle>
            <Typography component="div" variant="h4" mb={2} mt={2} fontWeight={700}>
              {type === 'add' ? 'Add BLE Reader' : 'Edit BLE Reader'}
            </Typography>
            <Divider />
          </DialogTitle>

          <DialogContent>
            <Grid container spacing={5} mb={3}>
              {/* Brand */}
              <Grid size={{ lg: 6, md: 12, sm: 12 }}>
                
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

              {/* GMAC */}
              <Grid size={{ lg: 6, md: 12, sm: 12 }}>
                <CustomFormLabel htmlFor="brand-id">Brand</CustomFormLabel>
                <Autocomplete
                  options={brandData.map((b) => ({ id: b.id, label: b.name }))}
                  value={
                    brandData
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
                
                <CustomFormLabel htmlFor="reader-type">Reader Type</CustomFormLabel>
                <CustomSelect
                  id="reader-type"
                  fullWidth
                  variant="outlined"
                  value={formData.readerType}
                  onChange={(e: any) => {
                    const { value } = e.target;
                    setFormData((prev) => ({ ...prev, readerType: value }));
                    setFormErrors((prev) => {
                      if (!prev.readerType) return prev;
                      const next = { ...prev };
                      delete next.readerType;
                      return next;
                    });
                  }}
                  
                  error={!!formErrors.readerType}
                  helperText={formErrors.readerType}
                >
                  <MenuItem value="Indoor">Indoor</MenuItem>
                  <MenuItem value="Outdoor">Outdoor</MenuItem>
                </CustomSelect>
              </Grid>
                             
            </Grid>
            {/* ────────────── Advanced Settings ────────────── */}
            <Box mt={3} mb={1}>
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{ cursor: 'pointer', display: 'inline-flex' }}
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                <Typography variant="h6" fontWeight={600}>
                  Advanced Settings
                </Typography>
                <IconButton size="small">
                  {showAdvanced ? <IconChevronUp size={20} /> : <IconChevronDown size={20} />}
                </IconButton>
              </Stack>
              <Divider sx={{ mt: 1 }} />
            </Box>

            <Collapse in={showAdvanced}>
              <Grid container spacing={5} mb={3} mt={1}>
                {/* Advanced Set 1 */}
                <Grid size={{ lg: 6, md: 12, sm: 12 }}>
                  <CustomFormLabel htmlFor="measuredPower">Measured Power</CustomFormLabel>
                  <CustomTextField
                    id="measuredPower"
                    type="number"
                    value={formData.measuredPower}
                    onChange={handleInputChange}
                    fullWidth
                    variant="outlined"
                    error={!!formErrors.measuredPower}
                    helperText={formErrors.measuredPower}
                  />
                  <CustomFormLabel htmlFor="pathLossExponent">Path Loss Exponent</CustomFormLabel>
                  <CustomTextField
                    id="pathLossExponent"
                    type="number"
                    value={formData.pathLossExponent}
                    onChange={handleInputChange}
                    fullWidth
                    variant="outlined"
                    inputProps={{ min: 0, step: 'any' }}
                    error={!!formErrors.pathLossExponent}
                    helperText={formErrors.pathLossExponent}
                  />
                </Grid>

                {/* Advanced Set 2 */}
                <Grid size={{ lg: 6, md: 12, sm: 12 }}>
                  <CustomFormLabel htmlFor="heightMeter">Height</CustomFormLabel>
                  <CustomTextField
                    id="heightMeter"
                    type="number"
                    value={formData.heightMeter}
                    onChange={handleInputChange}
                    fullWidth
                    variant="outlined"
                    inputProps={{ min: 0, step: 'any' }}
                    error={!!formErrors.heightMeter}
                    helperText={formErrors.heightMeter}
                  />
                </Grid>
              </Grid>
            </Collapse>
             
          </DialogContent>

          <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 2 }}>
            <Button onClick={handleClose} variant="outlined">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              variant="contained"
              disabled={isSaving}
              sx={{ fontSize: '1rem', py: 1, px: 3 }}
            >
              {isSaving ? <CircularProgress size={20} color="inherit" /> : 'Save'}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* ────────────── Loading Placeholder ────────────── */}
      {loading && (
        <Dialog open fullWidth maxWidth="sm">
          <DialogContent sx={{ textAlign: 'center', py: 10 }}>
            <Typography variant="h5" mb={5}>
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
