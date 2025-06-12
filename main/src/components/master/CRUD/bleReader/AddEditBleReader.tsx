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
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { AppDispatch, useDispatch, useSelector, RootState } from 'src/store/Store';
import {
  addBleReader,
  bleReaderType,
  editBleReader,
  fetchBleReaders,
} from 'src/store/apps/crud/bleReader';
import { fetchBrands, BrandType } from 'src/store/apps/crud/brand';

interface FormType {
  type?: string;
  bleReader?: bleReaderType;
}

const AddEditBleReader = ({ type, bleReader }: FormType) => {
  const [open, setOpen] = React.useState(false);
  const [formData, setFormData] = React.useState<bleReaderType>(
    bleReader || {
      id: '',
      brandId: '',
      name: '',
      mac: '',
      gmac: '',
      ip: '',
      locationX: 0,
      locationY: 0,
      locationPxX: 0,
      locationPxY: 0,
      engineReaderId: '',
      createdBy: '',
      createdAt: '',
      updatedBy: '',
      updatedAt: '',
    },
  );
  const brands: BrandType[] = useSelector((state: RootState) => state.brandReducer.brands);
  const dispatch: AppDispatch = useDispatch();
  useEffect(() => {
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
        await dispatch(editBleReader(formData)); // Dispatch update
      }
      if (type === 'add') {
        await dispatch(addBleReader(formData));
      }
      await dispatch(fetchBleReaders());
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
          Add Ble Reader
        </Button>
      )}
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle>
          <Typography component="div" variant="h4" mb={2} mt={2} fontWeight={700}>
            {type === 'add' ? 'Add Ble Reader' : 'Edit Ble Reader'}
          </Typography>
          <Divider />
        </DialogTitle>
        <DialogContent>
          <Typography variant="h6" fontWeight={600} mb={2} mt={2}>
            Ble Reader Details
          </Typography>
          <Divider />
          <Grid container spacing={5} mb={3}>
            <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
              <CustomFormLabel htmlFor="brand-id">Brand</CustomFormLabel>
              <CustomSelect
                name="brandId"
                value={formData.brandId || ''}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              >
                {brands.map((brand) => (
                  <MenuItem key={brand.id} value={brand.id}>
                    {brand.name}
                  </MenuItem>
                ))}
              </CustomSelect>
              <CustomFormLabel htmlFor="ble-mac">Mac</CustomFormLabel>
              <CustomTextField
                id="mac"
                placeholder={formData.mac}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
              <CustomFormLabel htmlFor="ble-ip">IP</CustomFormLabel>
              <CustomTextField
                id="ip"
                placeholder={formData.ip}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
            </Grid>
            <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
              <CustomFormLabel htmlFor="reader-id">Engine Reader ID</CustomFormLabel>
              <CustomTextField
                id="engineReaderId"
                placeholder={formData.engineReaderId}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
              <CustomFormLabel htmlFor="ble-gmac">GMAC</CustomFormLabel>
              <CustomTextField
                id="gmac"
                placeholder={formData.gmac}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
                            <CustomFormLabel htmlFor="ble-name">Name</CustomFormLabel>
              <CustomTextField
                id="name"
                placeholder={formData.name}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
            </Grid>
          </Grid>
          <Typography variant="h6" fontWeight={600} mb={2} mt={2}>
            Position
          </Typography>
          <Divider />
          <Grid container spacing={5} mb={3}>
            <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
              <CustomFormLabel htmlFor="location-x">Location on meter X</CustomFormLabel>
              <CustomTextField
                id="locationx"
                placeholder={formData.locationX}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />

              <CustomFormLabel htmlFor="location-px-x">Location on Pixel X</CustomFormLabel>
              <CustomTextField
                id="locationPxX"
                placeholder={formData.locationPxX}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
            </Grid>
            <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
              <CustomFormLabel htmlFor="location-y">Location on meter Y</CustomFormLabel>
              <CustomTextField
                id="locationy"
                placeholder={formData.locationY}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
              <CustomFormLabel htmlFor="location-px-y">Location on Pixel Y</CustomFormLabel>
              <CustomTextField
                id="locationPxY"
                placeholder={formData.locationPxY}
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

export default AddEditBleReader;
