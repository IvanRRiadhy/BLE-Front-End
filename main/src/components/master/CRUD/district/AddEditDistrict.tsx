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
import React from 'react';
import toast from 'react-hot-toast';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { AppDispatch, RootState, useDispatch, useSelector } from 'src/store/Store';
import {
  addDistrict,
  DistrictType,
  editDistrict,
  fetchDistrictDT,
  fetchDistricts,
} from 'src/store/apps/crud/district';
import { defaultDistrictForm } from 'src/store/apps/defaultForm';

interface FormType {
  type?: string;
  district?: DistrictType;
}

const AddEditDistrict = ({ type, district }: FormType) => {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [formData, setFormData] = React.useState<DistrictType>({
    ...defaultDistrictForm,
    ...district,
  });
  const districtFilter = useSelector((state: RootState) => state.districtReducer.districtFilter);
  const dispatch: AppDispatch = useDispatch();

  const handleClickOpen = () => {
    if (type === 'edit' && district) {
      if (!district.id) {
        dispatch(fetchDistrictDT(districtFilter));
      }
      setFormData({ ...defaultDistrictForm, ...district });
    } else {
      setFormData({ ...defaultDistrictForm });
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
        result = await dispatch(editDistrict(formData)); // Dispatch update
      }
      if (type === 'add') {
        result = await dispatch(addDistrict(formData));
      }
      if (result && result.type && result.type.endsWith('/fulfilled')) {
        await dispatch(fetchDistrictDT(districtFilter));
        console.log('District Saved!');
        toast.success('Data Saved', { position: 'top-right' });
        handleClose();
      } else {
        toast.error('Saving Data Unsuccessful', { position: 'top-right' });
      }
    } catch (error) {
      toast.error('Saving Data Unsuccessful', { position: 'top-right' });
      console.error('Error saving district:', error);
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
          Add District
        </Button>
      )}

      {!loading && (
        <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
          <DialogTitle>
            <Typography component="div" variant="h4" mb={2} mt={2} fontWeight={700}>
              {type === 'add' ? 'Add District' : 'Edit District'}
            </Typography>
            <Divider />
          </DialogTitle>
          <DialogContent>
            <Typography variant="h6" fontWeight={600} mb={2} mt={2}>
              District Details
            </Typography>
            <Divider />
            <Grid container spacing={5} mb={3}>
              <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
                <CustomFormLabel htmlFor="district-code">District Code</CustomFormLabel>
                <CustomTextField
                  id="code"
                  value={formData.code}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                />
                <CustomFormLabel htmlFor="district-host">District Host</CustomFormLabel>
                <CustomTextField
                  id="districtHost"
                  value={formData.districtHost}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                />
              </Grid>
              <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
                <CustomFormLabel htmlFor="district-Name">District Name</CustomFormLabel>
                <CustomTextField
                  id="name"
                  value={formData.name}
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

export default AddEditDistrict;
