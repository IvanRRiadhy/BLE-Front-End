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
  Typography,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import { IconPencil, IconPlus } from '@tabler/icons-react';
import React, { useEffect } from 'react';
import toast from 'react-hot-toast';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { AppDispatch, RootState, useDispatch, useSelector } from 'src/store/Store';
import {
  addOrganization,
  editOrganization,
  fetchOrganizationDT,
  fetchOrganizations,
  OrganizationType,
} from 'src/store/apps/crud/organization';
import { defaultOrganizationForm } from 'src/store/apps/defaultForm';
import AddEditTimeGroup from '../timeGroup/TimeGroupContent';

interface FormType {
  type?: string;
  organization?: OrganizationType;
}

const AddEditOrganization = ({ type, organization }: FormType) => {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [formData, setFormData] = React.useState<OrganizationType>({
    ...defaultOrganizationForm,
    ...organization,
  });
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({});
  const isLoading = useSelector((state: RootState) => state.organizationReducer.isLoading);

  // useEffect(() => {
  //   if (organization) {
  //     console.log('Organization Data:', organization);
  //   }
  // }, [formData, organization]);
  const organizationFilter = useSelector(
    (state: RootState) => state.organizationReducer.organizationFilter,
  );
  const dispatch: AppDispatch = useDispatch();
  const handleClickOpen = () => {
    setLoading(true);
    setFormErrors({});
    if (type === 'edit' && organization) {
      if (!organization.id) {
        dispatch(fetchOrganizationDT(organizationFilter));
      }
      setFormData({ ...defaultOrganizationForm, ...organization });
    } else {
      setFormData({ ...defaultOrganizationForm });
    }
    setTimeout(() => {
      setLoading(false);
      setOpen(true);
    }, 100);
  };

  const handleClose = () => {
    // setFormData({} as OrganizationType);
    setOpen(false);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.code?.trim()) errors.code = 'Organization code is required';
    if (!formData.name?.trim()) errors.name = 'Organization name is required';
    if (!formData.organizationHost?.trim())
      errors.organizationHost = 'Organization host is required';

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
        result = await dispatch(editOrganization(formData)); // Dispatch update
      }
      if (type === 'add') {
        result = await dispatch(addOrganization(formData));
      }
      if (result && result.type && result.type.endsWith('/fulfilled')) {
        await dispatch(fetchOrganizationDT(organizationFilter));
        console.log('Organization Saved!');
        toast.success('Data Saved');
        handleClose();
      } else {
        toast.error('Saving Data Unsuccessful');
      }
    } catch (error) {
      toast.error('Saving Data Unsuccessful');
      console.error('Error saving organization:', error);
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
        <Tooltip title="Edit Organization">
          <IconButton color="primary" size="small" onClick={handleClickOpen}>
            <IconPencil size={20} />
          </IconButton>
        </Tooltip>
      )}
      {type === 'add' && (
        <Tooltip title="Add Organization">
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
                <CustomFormLabel htmlFor="organization-Name">Organization Name</CustomFormLabel>
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

export default AddEditOrganization;
