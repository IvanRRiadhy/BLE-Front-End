import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid2 as Grid,
  IconButton,
  MenuItem,
  SelectChangeEvent,
  Typography,
} from '@mui/material';
import { IconPencil, IconPlus } from '@tabler/icons-react';
import React, { useEffect } from 'react';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { AppDispatch, useDispatch } from 'src/store/Store';
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';
import { orgType, appType, licenseType } from 'src/types/crud/input';
import {
  editApplication,
  addApplication,
  ApplicationType,
  fetchApplications,
} from 'src/store/apps/crud/application';

interface FormType {
  type?: string;
  application?: ApplicationType;
}

const AddEditApplication = ({ type, application }: FormType) => {
  const [open, setOpen] = React.useState(false);
  const [formData, setFormData] = React.useState<ApplicationType>(
    application || {
      id: '',
      applicationName: '',
      organizationType: '',
      organizationAddress: '',
      applicationType: '',
      applicationRegistered: '',
      applicationExpired: '',
      hostName: '',
      hostPhone: '',
      hostEmail: '',
      hostAddress: '',
      applicationCustomName: '',
      applicationCustomDomain: '',
      applicationCustomPort: '',
      licenseCode: '',
      licenseType: '',
    },
  );

  const dispatch: AppDispatch = useDispatch();
  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleSave = async () => {
    try {
      if (type === 'edit') {
        await dispatch(editApplication(formData)); // Await ensures the update completes
      }
      if (type === 'add') {
        await dispatch(addApplication(formData)); // Await ensures the add completes
      }
      // Reload the application list after saving
      await dispatch(fetchApplications());

      console.log('handleSave - Applications list reloaded');
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

  useEffect(() => {
    dispatch(fetchApplications());
  }, [dispatch]);

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
          Add Application
        </Button>
      )}

      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle>
          <Typography component="div" variant="h4" mb={2} mt={2} fontWeight={700}>
            {type === 'add' ? 'Add Application' : 'Edit Application'}
          </Typography>
          <Divider />
        </DialogTitle>
        <DialogContent>
          <Typography variant="h6" fontWeight={600} mb={2} mt={2}>
            Application Details
          </Typography>
          <Divider />
          <Grid container spacing={5} mb={3}>
            <Grid size={{ lg: 6, md: 12, sm: 12 }} direction="column">
              <CustomFormLabel htmlFor="app-name">Application Name</CustomFormLabel>
              <CustomTextField
                id="applicationName"
                placeholder={formData.applicationName}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
            </Grid>
            <Grid size={{ lg: 6, md: 12, sm: 12 }}>
              <CustomFormLabel htmlFor="app-type">Application Type</CustomFormLabel>
              <CustomSelect
                name="applicationType"
                value={formData.applicationType || ''}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              >
                {appType.map((app) => (
                  <MenuItem key={app.value} value={app.value} disabled={app.disabled || false}>
                    {app.label}
                  </MenuItem>
                ))}
              </CustomSelect>
            </Grid>
          </Grid>
          <Typography variant="h6" fontWeight={600} mb={2} mt={5}>
            Organization Details
          </Typography>
          <Divider />
          <Grid container spacing={5} mb={3}>
            <Grid size={{ lg: 6, md: 12, sm: 12 }} direction="column">
              <CustomFormLabel htmlFor="org-type">Organization Type</CustomFormLabel>
              <CustomSelect
                name="organizationType"
                value={formData.organizationType || ''}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              >
                {orgType.map((org) => (
                  <MenuItem key={org.value} value={org.value} disabled={org.disabled}>
                    {org.label}
                  </MenuItem>
                ))}
              </CustomSelect>
            </Grid>
            <Grid size={{ lg: 6, md: 12, sm: 12 }} direction="column">
              <CustomFormLabel htmlFor="org-address">Organization Address</CustomFormLabel>
              <CustomTextField
                id="organizationAddress"
                placeholder={formData.organizationAddress}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
            </Grid>
          </Grid>
          <Typography variant="h6" fontWeight={600} mb={2} mt={5}>
            Host Details
          </Typography>
          <Divider />
          <Grid container spacing={5} mb={3}>
            <Grid size={{ lg: 6, md: 12, sm: 12 }} direction="column">
              <CustomFormLabel htmlFor="host-name">Host Name</CustomFormLabel>
              <CustomTextField
                id="hostName"
                placeholder={formData.hostName}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
              <CustomFormLabel htmlFor="host-email">Host Email</CustomFormLabel>
              <CustomTextField
                id="hostEmail"
                placeholder={formData.hostEmail}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
            </Grid>
            <Grid size={{ lg: 6, md: 12, sm: 12 }} direction="column">
              <CustomFormLabel htmlFor="host-phone">Host Phone</CustomFormLabel>
              <CustomTextField
                id="hostPhone"
                placeholder={formData.hostPhone}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
              <CustomFormLabel htmlFor="host-address">Host Address</CustomFormLabel>
              <CustomTextField
                id="hostAddress"
                placeholder={formData.hostAddress}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
            </Grid>
          </Grid>
          <Typography variant="h6" fontWeight={600} mb={2} mt={5}>
            Custom Details
          </Typography>
          <Divider />
          <Grid container spacing={5} mb={3}>
            <Grid size={{ lg: 6, md: 12, sm: 12 }} direction="column">
              <CustomFormLabel htmlFor="app-cust-name">Application Custom Name</CustomFormLabel>
              <CustomTextField
                id="applicationCustomName"
                placeholder={formData.applicationCustomName}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
              <CustomFormLabel htmlFor="app-cust-port">Application Custom Port</CustomFormLabel>
              <CustomTextField
                id="applicationCustomPort"
                placeholder={formData.applicationCustomPort}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
            </Grid>
            <Grid size={{ lg: 6, md: 12, sm: 12 }} direction="column">
              <CustomFormLabel htmlFor="app-cust-domain">Application Custom Domain</CustomFormLabel>
              <CustomTextField
                id="applicationCustomDomain"
                placeholder={formData.applicationCustomDomain}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
            </Grid>
          </Grid>
          <Typography variant="h6" fontWeight={600} mb={2} mt={5}>
            License Details
          </Typography>
          <Divider />
          <Grid container spacing={5} mb={3}>
            <Grid size={{ lg: 6, md: 12, sm: 12 }} direction="column">
              <CustomFormLabel htmlFor="license-type">License Type</CustomFormLabel>
              <CustomSelect
                name="licenseType"
                value={formData.licenseType || ''}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              >
                {licenseType.map((license) => (
                  <MenuItem key={license.value} value={license.value} disabled={license.disabled}>
                    {license.label}
                  </MenuItem>
                ))}
              </CustomSelect>
            </Grid>
            <Grid size={{ lg: 6, md: 12, sm: 12 }} direction="column">
              <CustomFormLabel htmlFor="license-code">License Code</CustomFormLabel>
              <CustomTextField
                id="licenseCode"
                placeholder={formData.licenseCode}
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
export default AddEditApplication;
