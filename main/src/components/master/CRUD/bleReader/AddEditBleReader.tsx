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
} from '@mui/material';
import { IconPencil, IconPlus } from '@tabler/icons-react';
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
      setFormData({ ...defaultBleReaderForm, ...bleReader });
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
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
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

              {/* GMAC */}
              <Grid size={{ lg: 6, md: 12, sm: 12 }}>
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
