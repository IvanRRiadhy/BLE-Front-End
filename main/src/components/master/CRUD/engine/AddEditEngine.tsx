import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid2 as Grid,
  IconButton,
  Tooltip,
  Typography,
  CircularProgress,
} from '@mui/material';
import { IconPencil, IconPlus } from '@tabler/icons-react';
import React, { useState } from 'react';
import toast from 'react-hot-toast';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { EngineType } from 'src/store/apps/crud/engine';
import { defaultEngineForm } from 'src/store/apps/defaultForm';
import { AddEnginePayload, useAddEngine, useEditEngine } from 'src/hooks/useEngine';

interface FormType {
  type?: 'add' | 'edit';
  engine?: EngineType;
}

const AddEditEngine = ({ type, engine }: FormType) => {
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<AddEnginePayload>({
    ...defaultEngineForm,
    ...engine,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // ✅ Hooks (replace Redux)
  const addMutation = useAddEngine();
  const editMutation = useEditEngine();

  // 🧭 Open / Close
  const handleClickOpen = () => {
    setFormErrors({});
    if (type === 'edit' && engine) {
      setFormData({ ...defaultEngineForm, ...engine });
    } else {
      setFormData({ ...defaultEngineForm });
    }
    setOpen(true);
  };

  const handleClose = () => setOpen(false);

  // 🧩 Validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.engineCode?.trim()) errors.engineCode = 'Engine code is required';
    if (!formData.name?.trim()) errors.name = 'Engine name is required';
    if (!formData.port) errors.port = 'Engine port is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 💾 Save
  const handleSave = async () => {
    if (!validateForm()) {
      toast.error('Please fill in all required fields.');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        engineCode: formData.engineCode,
        name: formData.name,
        port: formData.port,
      };

      if (type === 'add') {
        await addMutation.mutateAsync(payload);
        toast.success('Engine added successfully!');
      } else {
        await editMutation.mutateAsync({
          id: engine?.id!,
          payload: payload,
        });
        toast.success('Engine updated successfully!');
      }

      handleClose();
    } catch (error) {
      console.error('Error saving engine:', error);
      toast.error('Failed to save engine.');
    } finally {
      setIsSaving(false);
    }
  };

  // 🧠 Input change handler
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, name, value } = e.target;
    const key = (id || name) as keyof AddEnginePayload;
    if (!key) return;
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <>
      {/* ✏️ Edit Button */}
      {type === 'edit' && (
        <Tooltip title="Edit District">
          <IconButton color="primary" size="small" onClick={handleClickOpen}>
            <IconPencil size={20} />
          </IconButton>
        </Tooltip>
      )}

      {/* ➕ Add Button */}
      {type === 'add' && (
        <Tooltip title="Add District">
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

      {/* 🧩 Dialog */}
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle>
          <Typography component="div" variant="h4" mb={2} mt={2} fontWeight={700}>
            {type === 'add' ? 'Add District' : 'Edit District'}
          </Typography>
          <Divider />
        </DialogTitle>

        <DialogContent>
          <Grid container spacing={5} mb={3}>
            <Grid size={{ lg: 6, md: 12, sm: 12 }}>
                <CustomFormLabel htmlFor="name">Engine Name</CustomFormLabel>
              <CustomTextField
                id="name"
                value={formData.name}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
                required
                error={!!formErrors.name}
                helperText={formErrors.name}
              />
              

              <CustomFormLabel htmlFor="port">Port</CustomFormLabel>
              <CustomTextField
                id="port"
                value={formData.port}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
                required
                error={!!formErrors.port}
                helperText={formErrors.port}
              />
            </Grid>

            <Grid size={{ lg: 6, md: 12, sm: 12 }}>
              <CustomFormLabel htmlFor="engine-code">Engine Code</CustomFormLabel>
              <CustomTextField
                id="engineCode"
                value={formData.engineCode}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
                required
                error={!!formErrors.engineCode}
                helperText={formErrors.engineCode}
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ display: 'flex', justifyContent: 'space-between', px: 3, pb: 2 }}>
          <Button onClick={handleClose} variant="outlined" sx={{ fontSize: '1rem', py: 1, px: 3 }}>
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
    </>
  );
};

export default AddEditEngine;
