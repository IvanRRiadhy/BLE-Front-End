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
import React from 'react';
import toast from 'react-hot-toast';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { BrandType } from 'src/store/apps/crud/brand';
import { defaultBrandForm } from 'src/store/apps/defaultForm';
import { useAddBrand, useEditBrand } from 'src/hooks/useBrand';

interface FormType {
  type?: 'add' | 'edit';
  brand?: BrandType;
}

const AddEditBrand = ({ type = 'add', brand }: FormType) => {
  const [open, setOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [formData, setFormData] = React.useState<BrandType>({
    ...defaultBrandForm,
    ...brand,
  });
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({});

  // ✅ React Query mutations
  const addMutation = useAddBrand();
  const editMutation = useEditBrand();

  // ---------------------------------------------------------------------------
  // ✅ Dialog handlers
  // ---------------------------------------------------------------------------
  const handleClickOpen = () => {
    setFormErrors({});
    if (type === 'edit' && brand) {
      setFormData({ ...defaultBrandForm, ...brand });
    } else {
      setFormData({ ...defaultBrandForm });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  // ---------------------------------------------------------------------------
  // ✅ Validation
  // ---------------------------------------------------------------------------
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.name?.trim()) errors.name = 'Brand name is required';
    if (!formData.tag?.trim()) errors.tag = 'Brand tag is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ---------------------------------------------------------------------------
  // ✅ Save Handler
  // ---------------------------------------------------------------------------
  const handleSave = async () => {
    if (!validateForm()) {
      toast.error('Please fill in all required fields correctly.');
      return;
    }

    setIsSaving(true);
    try {
      if (type === 'add') {
        await addMutation.mutateAsync(formData);
        toast.success('Brand added successfully!');
      } else {
        await editMutation.mutateAsync(formData);
        toast.success('Brand updated successfully!');
      }
      handleClose();
    } catch (err) {
      console.error('Error saving brand:', err);
      toast.error('Saving failed.');
    } finally {
      setIsSaving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // ✅ Input Handler
  // ---------------------------------------------------------------------------
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  // ---------------------------------------------------------------------------
  // ✅ UI Rendering
  // ---------------------------------------------------------------------------
  return (
    <>
      {type === 'edit' ? (
        <Tooltip title="Edit Brand">
          <IconButton color="primary" size="small" onClick={handleClickOpen}>
            <IconPencil size={20} />
          </IconButton>
        </Tooltip>
      ) : (
        <Tooltip title="Add Brand">
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

      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle>
          <Typography component="div" variant="h4" mb={2} mt={2} fontWeight={700}>
            {type === 'add' ? 'Add Brand' : 'Edit Brand'}
          </Typography>
          <Divider />
        </DialogTitle>

        <DialogContent>
          <Grid container spacing={5} mb={3}>
            <Grid size={{ lg: 6, md: 12, sm: 12 }}>
              <CustomFormLabel htmlFor="name">Brand Name</CustomFormLabel>
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
              <CustomFormLabel htmlFor="tag">Brand Tag</CustomFormLabel>
              <CustomTextField
                id="tag"
                value={formData.tag}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
                required
                error={!!formErrors.tag}
                helperText={formErrors.tag}
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ display: 'flex', justifyContent: 'space-between', px: 3, pb: 2 }}>
          <Button
            onClick={handleClose}
            variant="outlined"
            sx={{ fontSize: '1rem', py: 1, px: 3 }}
            disabled={isSaving}
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

export default AddEditBrand;
