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
} from '@mui/material';
import { IconPencil, IconPlus } from '@tabler/icons-react';
import React, { useEffect } from 'react';
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

interface FormType {
  type?: string;
  organization?: OrganizationType;
}

const AddEditOrganization = ({ type, organization }: FormType) => {
  const [open, setOpen] = React.useState(false);
  const [formData, setFormData] = React.useState<OrganizationType>(
    organization || {
      id: '',
      code: '',
      name: '',
      organizationHost: '',
      applicationId: localStorage.getItem('applicationId') || '',
      createdBy: '',
      createdAt: '',
      updatedBy: '',
      updatedAt: '',
    },
  );
  useEffect(() => {
    if (organization) {
      console.log('Organization Data:', organization);
    }
  }, [formData, organization]);
    const organizationFilter = useSelector((state: RootState) => state.organizationReducer.organizationFilter);
  const dispatch: AppDispatch = useDispatch();
  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setFormData({} as OrganizationType);
    setOpen(false);
  };

  const handleSave = async () => {
    try {
      if (type === 'edit') {
        await dispatch(editOrganization(formData)); // Dispatch update
      }
      if (type === 'add') {
        await dispatch(addOrganization(formData));
      }
      await dispatch(fetchOrganizationDT(organizationFilter));
      console.log('Saved!');
      setOpen(false);
    } catch (error) {
      console.error('Error saving application:', error);
    }
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
        <IconButton color="primary" size="small" onClick={handleClickOpen}>
          <IconPencil size={20} />
        </IconButton>
      )}
      {type === 'add' && (
        <Button
          variant="contained"
          color="primary"
          startIcon={<IconPlus size={20} />}
          onClick={handleClickOpen}
        >
          Add Organization
        </Button>
      )}
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle>
          <Typography component="div" variant="h4" mb={2} mt={2} fontWeight={700}>
            {type === 'add' ? 'Add Organization' : 'Edit Organization'}
          </Typography>
          <Divider />
        </DialogTitle>
        <DialogContent>
          <Typography variant="h6" fontWeight={600} mb={2} mt={2}>
            Organization Details
          </Typography>
          <Divider />
          <Grid container spacing={5} mb={3}>
            <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
              <CustomFormLabel htmlFor="organization-code">Organization Code</CustomFormLabel>
              <CustomTextField
                id="code"
                placeholder={formData.code}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
              <CustomFormLabel htmlFor="organization-host">Organization Host</CustomFormLabel>
              <CustomTextField
                id="organizationHost"
                placeholder={formData.organizationHost}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
            </Grid>
            <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
              <CustomFormLabel htmlFor="organization-Name">Organization Name</CustomFormLabel>
              <CustomTextField
                id="name"
                placeholder={formData.name}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ display: 'flex', justifyContent: 'space-between', px: 3, pb: 2 }}>
          <Button onClick={handleClose} variant="outlined" sx={{ fontSize: '1rem', py: 1, px: 3 }}>
            Cancel
          </Button>
          <Button onClick={handleSave} variant="contained" sx={{ fontSize: '1rem', py: 1, px: 3 }}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AddEditOrganization;
