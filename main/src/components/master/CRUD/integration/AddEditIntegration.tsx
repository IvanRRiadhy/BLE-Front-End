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
import { AppDispatch, RootState, useDispatch, useSelector } from 'src/store/Store';
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';
import { integrationType, apiTypeAuth } from 'src/types/crud/input';
import {
  addIntegration,
  editIntegration,
  fetchIntegrations,
  IntegrationType,
} from 'src/store/apps/crud/integration';
import { fetchApplications, ApplicationType } from 'src/store/apps/crud/application';

interface FormType {
  type?: string;
  integration?: IntegrationType;
}

const AddEditIntegration = ({ type, integration }: FormType) => {
  const [open, setOpen] = React.useState(false);
  const [formData, setFormData] = React.useState<IntegrationType>(
    integration || {
      id: '',
      brandId: '',
      integrationType: '',
      apiTypeAuth: '',
      apiUrl: '',
      apiAuthUsername: '',
      apiAuthPasswd: '',
      apiKeyField: '',
      apiKeyValue: '',
      applicationId: '',
      createdBy: '',
      createdAt: '',
      updatedBy: '',
      updatedAt: '',
    },
  );
  const appData: ApplicationType[] = useSelector(
    (state: RootState) => state.applicationReducer.applications,
  );
  const dispatch: AppDispatch = useDispatch();
  useEffect(() => {
    dispatch(fetchApplications());
  }, [dispatch]);

  const handleClickOpen = () => {
    setOpen(true);
  };
  const handleClose = () => {
    setOpen(false);
  };
  const handleSave = async () => {
    try {
      if (type === 'edit') {
        await dispatch(editIntegration(formData));
      }
      if (type === 'add') {
        await dispatch(addIntegration(formData));
      }
      await dispatch(fetchIntegrations());
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
          Add Integration
        </Button>
      )}
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle>
          <Typography component="div" variant="h4" mb={2} mt={2} fontWeight={700}>
            {type === 'add' ? 'Add Integration' : 'Edit Integration'}
          </Typography>
          <Divider />
        </DialogTitle>
        <DialogContent>
          <Typography variant="h6" fontWeight={600} mb={2} mt={2}>
            Integration Details
          </Typography>
          <Divider />
          <Grid container spacing={5} mb={3}>
            <Grid size={{ lg: 6, md: 12, sm: 12 }} direction="column">
              <CustomFormLabel htmlFor="brand-id">Brand ID</CustomFormLabel>
              <CustomTextField
                id="brandID"
                placeholder={formData.brandId}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
              <CustomFormLabel htmlFor="integration-type">Integration Type</CustomFormLabel>
              <CustomSelect
                name="integrationType"
                value={formData.integrationType || ''}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              >
                {integrationType.map((integration) => (
                  <MenuItem
                    key={integration.value}
                    value={integration.value}
                    disabled={integration.disabled || false}
                  >
                    {integration.label}
                  </MenuItem>
                ))}
              </CustomSelect>
            </Grid>
            <Grid size={{ lg: 6, md: 12, sm: 12 }} direction="column">
              <CustomFormLabel htmlFor="app-id">Application</CustomFormLabel>
              <CustomSelect
                name="applicationId"
                value={formData.applicationId || ''}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              >
                {appData.map((app) => (
                  <MenuItem key={app.id} value={app.id}>
                    {app.applicationName}
                  </MenuItem>
                ))}
              </CustomSelect>
            </Grid>
          </Grid>
          <Typography variant="h6" fontWeight={600} mb={2} mt={2}>
            API Details
          </Typography>
          <Divider />
          <Grid container spacing={5} mb={3}>
            <Grid size={{ lg: 6, md: 12, sm: 12 }} direction="column">
              <CustomFormLabel htmlFor="api-type">API Authentication Type</CustomFormLabel>
              <CustomSelect
                name="apiTypeAuth"
                value={formData.apiTypeAuth || ''}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              >
                {apiTypeAuth.map((api) => (
                  <MenuItem key={api.value} value={api.value} disabled={api.disabled || false}>
                    {api.label}
                  </MenuItem>
                ))}
              </CustomSelect>
              <CustomFormLabel htmlFor="api-auth-uname">
                API Authentication Username
              </CustomFormLabel>
              <CustomTextField
                id="brandID"
                placeholder={formData.apiAuthUsername}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
              <CustomFormLabel htmlFor="api-key-field">API Key Field</CustomFormLabel>
              <CustomTextField
                id="apiKeyField"
                placeholder={formData.apiKeyField}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
            </Grid>
            <Grid size={{ lg: 6, md: 12, sm: 12 }} direction="column">
              <CustomFormLabel htmlFor="api-url">API URL</CustomFormLabel>
              <CustomTextField
                id="apiUrl"
                placeholder={formData.apiUrl}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
              <CustomFormLabel htmlFor="api-key-field">API Authentication Password</CustomFormLabel>
              <CustomTextField
                id="apiAuthPasswd"
                placeholder={formData.apiAuthPasswd}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
              <CustomFormLabel htmlFor="api-key-field">API Key Value</CustomFormLabel>
              <CustomTextField
                id="apiKeyValue"
                placeholder={formData.apiKeyValue}
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

export default AddEditIntegration;
