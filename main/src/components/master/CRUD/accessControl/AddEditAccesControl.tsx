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
  MenuItem,
  SelectChangeEvent,
} from '@mui/material';
import { IconPencil, IconPlus } from '@tabler/icons-react';
import React, { useEffect } from 'react';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { AppDispatch, RootState, useDispatch, useSelector } from 'src/store/Store';
import {
  AccessControlType,
  editAccessControl,
  addAccessControl,
  fetchAccessControls,
} from 'src/store/apps/crud/accessControl';
import { fetchApplications, ApplicationType } from 'src/store/apps/crud/application';
import { fetchBrands, BrandType } from 'src/store/apps/crud/brand';
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';

interface FormType {
  type?: string;
  accessControl?: AccessControlType;
}

const AddEditAccessControl = ({ type, accessControl }: FormType) => {
  const [open, setOpen] = React.useState(false);
  const [formData, setFormData] = React.useState<AccessControlType>(
    accessControl || {
      id: '',
      controllerBrandId: '',
      name: '',
      type: '',
      description: '',
      channel: '',
      doorId: '',
      raw: '',
      integrationId: 'F3FC00F0-F8FA-4DA1-A8C7-FC8336F24923',
      applicationId: 'F8297CAE-44D1-4FCF-B549-D23FF994785E',
      createdBy: '',
      createdAt: '',
      updatedBy: '',
      updatedAt: '',
    },
  );
  const appData: ApplicationType[] = useSelector(
    (state: RootState) => state.applicationReducer.applications,
  );
  const brandData: BrandType[] = useSelector(
    (state: RootState) => state.brandReducer.brands,
  );
  const dispatch: AppDispatch = useDispatch();
  useEffect(() => {
    dispatch(fetchApplications());
    dispatch(fetchBrands());
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
        await dispatch(editAccessControl(formData)); // Dispatch update
      }
      if (type === 'add') {
        await dispatch(addAccessControl(formData));
      }
      await dispatch(fetchAccessControls());
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
            {type === 'add' ? 'Add Access Control' : 'Edit Access Control'}
          </Typography>
          <Divider />
        </DialogTitle>
        <DialogContent>
          <Typography variant="h6" fontWeight={600} mb={2} mt={2}>
            Access Control Details
          </Typography>
          <Divider />
          <Grid container spacing={5} mb={3}>
            <Grid size={{ lg: 6, md: 12, sm: 12 }} direction="column">
              <CustomFormLabel htmlFor="ctrl-brand-id">Controller Brand</CustomFormLabel>
              <CustomSelect
                id="controllerBrandID"
                placeholder={formData.controllerBrandId}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
                >
              {brandData.map((brand) => (
                <MenuItem key={brand.id} value={brand.id}>
                  {brand.name}
                </MenuItem>
              ))}
              </CustomSelect>
              <CustomFormLabel htmlFor="ctrl-type">Controller Type</CustomFormLabel>
              <CustomTextField
                id="type"
                placeholder={formData.type}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
            </Grid>
            <Grid size={{ lg: 6, md: 12, sm: 12 }} direction="column">
              <CustomFormLabel htmlFor="ctrl-name">Name</CustomFormLabel>
              <CustomTextField
                id="name"
                placeholder={formData.name}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
              <CustomFormLabel htmlFor="ctrl-description">Description</CustomFormLabel>
              <CustomTextField
                id="description"
                placeholder={formData.description}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
            </Grid>
          </Grid>
          <Typography variant="h6" fontWeight={600} mb={2} mt={2}>
            Other Details
          </Typography>
          <Divider />
          <Grid container spacing={5} mb={3}>
            <Grid size={{ lg: 6, md: 12, sm: 12 }} direction="column">
              <CustomFormLabel htmlFor="door-id">Door ID</CustomFormLabel>
              <CustomTextField
                id="doorId"
                placeholder={formData.doorId}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
              <CustomFormLabel htmlFor="raw">Raw Data</CustomFormLabel>
              <CustomTextField
                id="raw"
                placeholder={formData.raw}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
            </Grid>
            <Grid size={{ lg: 6, md: 12, sm: 12 }} direction="column">
              <CustomFormLabel htmlFor="ctrl-channel">Channel</CustomFormLabel>
              <CustomTextField
                id="channel"
                placeholder={formData.channel}
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

export default AddEditAccessControl;
