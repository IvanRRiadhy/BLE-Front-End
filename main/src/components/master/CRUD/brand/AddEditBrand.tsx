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
} from '@mui/material';
import { IconPencil, IconPlus } from '@tabler/icons-react';
import React from 'react';
import toast from 'react-hot-toast';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { AppDispatch, RootState, useDispatch, useSelector } from 'src/store/Store';
import {
  addBrand,
  BrandType,
  editBrand,
  fetchBrandDT,
  fetchBrands,
} from 'src/store/apps/crud/brand';
import { defaultBrandForm } from 'src/store/apps/defaultForm';

interface FormType {
  type?: string;
  brand?: BrandType;
}

const AddEditBrand = ({ type, brand }: FormType) => {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [formData, setFormData] = React.useState<BrandType>({ ...defaultBrandForm, ...brand });
  const brandFilter = useSelector((state: RootState) => state.brandReducer.brandFilter);
  const dispatch: AppDispatch = useDispatch();

  const handleClickOpen = () => {
    if (type === 'edit' && brand) {
      if (!brand.id) {
        dispatch(fetchBrandDT(brandFilter));
      }
      setFormData({ ...defaultBrandForm, ...brand });
    } else {
      setFormData({ ...defaultBrandForm });
    }
    setTimeout(() => {
      setLoading(false);
      setOpen(true);
    }, 100);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleSave = async () => {
    try {
      let result;
      if (type === 'edit') {
        result = await dispatch(editBrand(formData)); // Dispatch update
      }
      if (type === 'add') {
        result = await dispatch(addBrand(formData));
      }
      if (result && result.type && result.type.endsWith('/fulfilled')) {
        await dispatch(fetchBrandDT(brandFilter));
        console.log('Brand Saved!');
        toast.success('Data Saved', { position: 'top-right' });
        handleClose();
      } else {
        toast.error('Saving Data Unsuccessful', { position: 'top-right' });
      }
    } catch (error) {
      toast.error('Saving Data Unsuccessful', { position: 'top-right' });
      console.error('Error saving Brand:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
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
          Add Brand
        </Button>
      )}

      {!loading && (
        <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
          <DialogTitle>
            <Typography component="div" variant="h4" mb={2} mt={2} fontWeight={700}>
              {type === 'add' ? 'Add Brand' : 'Edit Brand'}
            </Typography>
            <Divider />
          </DialogTitle>
          <DialogContent>
            <Typography variant="h6" fontWeight={600} mb={2} mt={2}>
              Brand Details
            </Typography>
            <Divider />
            <Grid container spacing={5} mb={3}>
              <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
                <CustomFormLabel htmlFor="brand-Name">Brand Name</CustomFormLabel>
                <CustomTextField
                  id="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                />
                <CustomFormLabel htmlFor="brand-tag">Brand Tag</CustomFormLabel>
                <CustomTextField
                  id="tag"
                  value={formData.tag}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
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
            >
              Save
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {loading && (
        <Dialog open={true} onClose={handleClose} fullWidth maxWidth="sm">
          <DialogContent sx={{ textAlign: 'center', py: 10 }}>
            <Typography variant="h6">Loading...</Typography>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default AddEditBrand;
