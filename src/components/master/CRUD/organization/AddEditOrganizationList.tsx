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
  CircularProgress,
  Tooltip,
} from '@mui/material';
import { IconPencil, IconPlus } from '@tabler/icons-react';
import React, { useState } from 'react';
import toast from 'react-hot-toast';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { OrganizationType } from 'src/store/apps/crud/organization';
import { defaultOrganizationForm } from 'src/store/apps/defaultForm';
import { useAddOrganization, useEditOrganization } from 'src/hooks/useOrganization';

interface FormType {
  type?: 'add' | 'edit';
  organization?: OrganizationType;
}

const AddEditOrganization = ({ type, organization }: FormType) => {
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<OrganizationType>({
    ...defaultOrganizationForm,
    ...organization,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // ✅ Hooks
  const addMutation = useAddOrganization();
  const editMutation = useEditOrganization();

  // 🧭 Open / close dialog
  const handleClickOpen = () => {
    setFormErrors({});
    if (type === 'edit' && organization) {
      setFormData({ ...defaultOrganizationForm, ...organization });
    } else {
      setFormData({ ...defaultOrganizationForm });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  // 🧩 Validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.code?.trim()) errors.code = 'Organization code is required';
    if (!formData.name?.trim()) errors.name = 'Organization name is required';
    if (!formData.organizationHost?.trim()) errors.organizationHost = 'Organization host is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 💾 Save handler
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
        organizationHost: formData.organizationHost,
        applicationId: formData.applicationId,
      };

      if (type === 'add') {
        await addMutation.mutateAsync(payload);
        toast.success('Organization added successfully!');
      } else {
        await editMutation.mutateAsync(payload);
        toast.success('Organization updated successfully!');
      }

      handleClose();
    } catch (error) {
      console.error('Error saving organization:', error);
      toast.error('Saving data unsuccessful.');
    } finally {
      setIsSaving(false);
    }
  };

  // 🧠 Input handler (safe key typing)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, name, value } = e.target;
    const key = (id || name) as keyof OrganizationType;
    if (!key) return;
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <>
      {/* ✏️ Edit Button */}
      {type === 'edit' && (
        <Tooltip title="Edit Organization">
          <IconButton color="primary" size="small" onClick={handleClickOpen}>
            <IconPencil size={20} />
          </IconButton>
        </Tooltip>
      )}

      {/* ➕ Add Button */}
      {type === 'add' && (
        <Tooltip title="Add Organization">
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
            {type === 'add' ? 'Add Organization' : 'Edit Organization'}
          </Typography>
          <Divider />
        </DialogTitle>

        <DialogContent>
          <Grid container spacing={5} mb={3}>
            <Grid size={{ lg: 6, md: 12, sm: 12 }}>
              <CustomFormLabel htmlFor="organization-code">Organization Code</CustomFormLabel>
              <CustomTextField
                id="code"
                value={formData.code}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
                error={!!formErrors.code}
                helperText={formErrors.code}
              />

              <CustomFormLabel htmlFor="organization-host">Organization Host</CustomFormLabel>
              <CustomTextField
                id="organizationHost"
                value={formData.organizationHost}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
                error={!!formErrors.organizationHost}
                helperText={formErrors.organizationHost}
              />
            </Grid>

            <Grid size={{ lg: 6, md: 12, sm: 12 }}>
              <CustomFormLabel htmlFor="organization-name">Organization Name</CustomFormLabel>
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
    </>
  );
};

export default AddEditOrganization;
