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
import { DistrictType } from 'src/store/apps/crud/district';
import { defaultDistrictForm } from 'src/store/apps/defaultForm';
import { useAddDistrict, useEditDistrict } from 'src/hooks/useDistrict';

interface FormType {
  type?: 'add' | 'edit';
  district?: DistrictType;
}

const AddEditDistrict = ({ type, district }: FormType) => {
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<DistrictType>({
    ...defaultDistrictForm,
    ...district,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // ✅ Hooks (replace Redux)
  const addMutation = useAddDistrict();
  const editMutation = useEditDistrict();

  // 🧭 Open / Close
  const handleClickOpen = () => {
    setFormErrors({});
    if (type === 'edit' && district) {
      setFormData({ ...defaultDistrictForm, ...district });
    } else {
      setFormData({ ...defaultDistrictForm });
    }
    setOpen(true);
  };

  const handleClose = () => setOpen(false);

  // 🧩 Validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.code?.trim()) errors.code = 'District code is required';
    if (!formData.name?.trim()) errors.name = 'District name is required';
    if (!formData.districtHost?.trim()) errors.districtHost = 'District host is required';
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
        id: formData.id,
        code: formData.code,
        name: formData.name,
        districtHost: formData.districtHost,
        applicationId: formData.applicationId,
      };

      if (type === 'add') {
        await addMutation.mutateAsync(payload);
        toast.success('District added successfully!');
      } else {
        await editMutation.mutateAsync(payload);
        toast.success('District updated successfully!');
      }

      handleClose();
    } catch (error) {
      console.error('Error saving district:', error);
      toast.error('Failed to save district.');
    } finally {
      setIsSaving(false);
    }
  };

  // 🧠 Input change handler
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, name, value } = e.target;
    const key = (id || name) as keyof DistrictType;
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
              <CustomFormLabel htmlFor="district-code">District Code</CustomFormLabel>
              <CustomTextField
                id="code"
                value={formData.code}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
                required
                error={!!formErrors.code}
                helperText={formErrors.code}
              />

              <CustomFormLabel htmlFor="district-host">District Host</CustomFormLabel>
              <CustomTextField
                id="districtHost"
                value={formData.districtHost}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
                required
                error={!!formErrors.districtHost}
                helperText={formErrors.districtHost}
              />
            </Grid>

            <Grid size={{ lg: 6, md: 12, sm: 12 }}>
              <CustomFormLabel htmlFor="district-name">District Name</CustomFormLabel>
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

export default AddEditDistrict;
