import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid2 as Grid,
  IconButton,
  SelectChangeEvent,
  Tooltip,
  Typography,
  CircularProgress,
} from '@mui/material';
import { IconPencil, IconPlus } from '@tabler/icons-react';
import React from 'react';
import toast from 'react-hot-toast';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { DepartmentType } from 'src/store/apps/crud/department';
import { defaultDepartmentForm } from 'src/store/apps/defaultForm';
import {
  useAddDepartment,
  useEditDepartment,
} from 'src/hooks/useDepartment';

interface FormType {
  type?: 'add' | 'edit';
  department?: DepartmentType;
}

const AddEditDepartment = ({ type = 'add', department }: FormType) => {
  const [open, setOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [formData, setFormData] = React.useState<DepartmentType>({
    ...defaultDepartmentForm,
    ...department,
  });
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({});

  // ✅ React Query mutations
  const addMutation = useAddDepartment();
  const editMutation = useEditDepartment();

  const handleClickOpen = () => {
    setFormErrors({});
    if (type === 'edit' && department) {
      setFormData({ ...defaultDepartmentForm, ...department });
    } else {
      setFormData({ ...defaultDepartmentForm });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  // ✅ Validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.code?.trim()) errors.code = 'Department code is required';
    if (!formData.name?.trim()) errors.name = 'Department name is required';
    if (!formData.departmentHost?.trim()) errors.departmentHost = 'Department host is required';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ✅ Save handler
  const handleSave = async () => {
    if (!validateForm()) {
      toast.error('Please fill in all required fields correctly.');
      return;
    }

    setIsSaving(true);

    try {
      if (type === 'add') {
        await addMutation.mutateAsync(formData);
        toast.success('Department added successfully!');
      } else {
        await editMutation.mutateAsync(formData);
        toast.success('Department updated successfully!');
      }
      handleClose();
    } catch (err) {
      console.error('Save failed:', err);
      toast.error('Failed to save department.');
    } finally {
      setIsSaving(false);
    }
  };

  // ✅ Handle field change
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement> | SelectChangeEvent<string>
  ) => {
    const { value, name, id } = e.target as
      | HTMLInputElement
      | { value: string; name: string; id?: string };
    setFormData((prev) => ({ ...prev, [id || name]: value }));
  };

  // -------------------------------------------------------------------------
  // ✅ UI
  // -------------------------------------------------------------------------
  return (
    <>
      {type === 'edit' ? (
        <Tooltip title="Edit Department">
          <IconButton color="primary" size="small" onClick={handleClickOpen}>
            <IconPencil size={20} />
          </IconButton>
        </Tooltip>
      ) : (
        <Tooltip title="Add Department">
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
            {type === 'add' ? 'Add Department' : 'Edit Department'}
          </Typography>
          <Divider />
        </DialogTitle>

        <DialogContent>
          <Grid container spacing={5} mb={3}>
            <Grid size={{ lg: 6, md: 12, sm: 12 }}>
              <CustomFormLabel htmlFor="department-code">Department Code</CustomFormLabel>
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
              <CustomFormLabel htmlFor="department-host">Department Host</CustomFormLabel>
              <CustomTextField
                id="departmentHost"
                value={formData.departmentHost}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
                required
                error={!!formErrors.departmentHost}
                helperText={formErrors.departmentHost}
              />
            </Grid>

            <Grid size={{ lg: 6, md: 12, sm: 12 }}>
              <CustomFormLabel htmlFor="department-name">Department Name</CustomFormLabel>
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

export default AddEditDepartment;
