import { BASE_URL } from 'src/utils/axios';
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
  Tooltip,
  Typography,
  CircularProgress,
  FormControlLabel,
  Switch,
  FormHelperText,
} from '@mui/material';
import { IconPencil, IconPlus } from '@tabler/icons-react';
import React from 'react';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { AppDispatch, RootState, useDispatch } from 'src/store/Store';
import { visitorStatus, gender, visitorType, IdentityType } from 'src/types/crud/input';
import {
  addVisitor,
  editVisitor,
  fetchVisitor,
  fetchVisitorDT,
  masterVisitorType,
  VisitorType,
} from 'src/store/apps/crud/visitor';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { defaultVisitorForm } from 'src/store/apps/defaultForm';

interface FormType {
  type?: string;
  visitor?: VisitorType;
}

const AddEditVisitor = ({ type, visitor }: FormType) => {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [image, setImage] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string | null>(visitor?.faceImage || null);
  const [formData, setFormData] = React.useState<VisitorType>({
    ...defaultVisitorForm,
    ...visitor,
  });
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({});

  const visitorFilter = useSelector((state: RootState) => state.visitorReducer.visitorFilter);
  const dispatch: AppDispatch = useDispatch();
  const handleClickOpen = () => {
    setLoading(true);
    setFormErrors({});
    if (type === 'edit' && visitor) {
      if (!visitor.id) {
        dispatch(fetchVisitorDT(visitorFilter));
      }
      setFormData({
        ...defaultVisitorForm,
        ...visitor,
      });
    } else {
      setFormData({ ...defaultVisitorForm });
    }
    setTimeout(() => {
      setLoading(false);
      setOpen(true);
    }, 100);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name?.trim()) errors.name = "Member's name is required";
    if (!formData.gender?.trim()) errors.gender = "Member's Gender is required";
    if (!image) errors.faceImage = "Member's Face Image is required";
    if (!formData.email?.trim() || !formData.email?.includes('@'))
      errors.email = 'Valid Email is required';

    // Validate identityType
    const isValidIdentityType = IdentityType.some(
      (identity) => identity.value === formData.identityType,
    );

    if(!formData.identityType?.trim()) errors.identityType = 'Identity Type is required';

    // Only require identityId if identityType is valid
    if (formData.identityType && isValidIdentityType) {
      if (!formData.identityId?.trim()) {
        errors.identityId = 'Identity Number is required';
      }
    }

    // Optional: if identityType is filled but invalid, mark as error too
    if (formData.identityType && !isValidIdentityType) {
      errors.identityType = 'Invalid Identity Type';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast.error('Please fill in all required fields correctly.');
      console.log('Form errors:', formErrors);
      return;
    }
    setLoading(true);
    console.log(formData);
    try {
      const data = new FormData();

      Object.entries(formData).forEach(([key, value]) => {
        if (
          key !== 'faceImage' &&
          key !== 'registeredDate' &&
          key !== 'visitorPeriodStart' &&
          key !== 'visitorPeriodEnd' &&
          key !== 'visitorGroudCode' &&
          key !== 'visitorCode' &&
          key !== 'visitorNumber'
        ) {
          if (value !== null && value !== undefined) {
            data.append(key, value.toString());
          }
        }
      });
      if (image) {
        data.append('faceImage', image);
      }
      console.log(data);
      let result;
      if (type === 'edit') {
        result = await dispatch(editVisitor(data)); // Dispatch update
      }
      if (type === 'add') {
        result = await dispatch(addVisitor(data));
      }
      console.log('Result: ', result);
      if (result && result.type && result.type.endsWith('/fulfilled')) {
        await dispatch(fetchVisitorDT(visitorFilter));
        console.log('Visitor data Saved!');
        toast.success('Data Saved');
        handleClose();
      } else {
        toast.error('Saving Data Unsuccessful');
      }
    } catch (error) {
      toast.error('Saving Data Unsuccessful');
      console.error('Error saving visitor data:', error);
    }
    setTimeout(() => {
      setLoading(false);
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
  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const maxSize = 5 * 1024 * 1024;
    if (file) {
      if (file.size > maxSize) {
        alert('File size exceeds 5MB. Please upload a smaller file.');
        return;
      }
      if (['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
        setImage(file);
        setPreview(URL.createObjectURL(file)); // Preview selected image
      } else {
        alert('Please select a valid image file (PNG, JPG, JPEG)');
      }
    }
  };

  return (
    <>
      {type === 'edit' && (
        <Tooltip title="Edit Visitor">
          <IconButton color="primary" size="small" onClick={handleClickOpen}>
            <IconPencil size={20} />
          </IconButton>
        </Tooltip>
      )}
      {type === 'add' && (
        <Tooltip title="Add Visitor">
          <Button
            variant="contained"
            color="primary"
            startIcon={<IconPlus size={20} />}
            onClick={handleClickOpen}
          >
            Add Visitor
          </Button>
        </Tooltip>
      )}

      {!loading && (
        <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
          <DialogTitle>
            <Typography component="div" variant="h4" mb={2} mt={2} fontWeight={700}>
              {type === 'add' ? 'Add Visitor' : 'Edit Visitor'}
            </Typography>
            <Divider />
          </DialogTitle>
          <DialogContent>
            <Typography variant="h6" fontWeight={600} mb={2} mt={2}>
              Personal Information
            </Typography>
            <Divider />
            <Grid container spacing={5} mb={3}>
              <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
                <CustomFormLabel htmlFor="name">Name</CustomFormLabel>
                <CustomTextField
                  id="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                  error={!!formErrors.name}
                />
                <CustomFormLabel htmlFor="person-id">Person ID</CustomFormLabel>
                <CustomTextField
                  id="personId"
                  value={formData.personId}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                />
                <CustomFormLabel htmlFor="address">Address</CustomFormLabel>
                <CustomTextField
                  id="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                />
                <CustomFormLabel htmlFor="phone">Phone</CustomFormLabel>
                <CustomTextField
                  id="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                />
              </Grid>
              <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
                <CustomFormLabel htmlFor="identity-type">Identity Type</CustomFormLabel>
                <CustomSelect
                  name="identityType"
                  value={formData.identityType}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                  error={!!formErrors.identityType}
                  helperText={formErrors.identityType}
                >
                  {IdentityType.map((identity) => (
                    <MenuItem
                      key={identity.value}
                      value={identity.value}
                      disabled={identity.disabled}
                    >
                      {identity.label}
                    </MenuItem>
                  ))}
                </CustomSelect>
                <CustomFormLabel htmlFor="identity-number">Identity Number</CustomFormLabel>
                <CustomTextField
                  id="identityId"
                  value={formData.identityId}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                  disabled={
                    !formData.identityType || // empty
                    !IdentityType.some((identity) => identity.value === formData.identityType) // not in list
                  }
                  error={!!formErrors.identityId}
                />
                <CustomFormLabel htmlFor="email">Email</CustomFormLabel>
                <CustomTextField
                  id="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                  error={!!formErrors.email}
                />
                <CustomFormLabel htmlFor="gender">Gender</CustomFormLabel>
                <CustomSelect
                  name="gender"
                  value={formData.gender || ''}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                >
                  {gender.map((gender) => (
                    <MenuItem
                      key={gender.value}
                      value={gender.value}
                      disabled={gender.disabled || false}
                    >
                      {gender.label}
                    </MenuItem>
                  ))}
                </CustomSelect>
              </Grid>
            </Grid>
            <Typography variant="h6" fontWeight={600} mb={2} mt={2}>
              Card Details
            </Typography>
            <Divider />
            <Grid container spacing={5} mb={3}>
              <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
                <CustomFormLabel htmlFor="card-number">Card Number</CustomFormLabel>
                <CustomTextField
                  id="cardNumber"
                  value={formData.cardNumber}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                />
              </Grid>
              <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
                <CustomFormLabel htmlFor="ble-card-number">Ble Card Number</CustomFormLabel>
                <CustomTextField
                  id="bleCardNumber"
                  value={formData.bleCardNumber}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                />
              </Grid>
            </Grid>
            <Typography variant="h6" fontWeight={600} mb={2} mt={2}>
              Extra Details
            </Typography>
            <Divider />
            <Grid container spacing={5} mb={3}>
              <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
                <CustomFormLabel htmlFor="organization-name">Organization Name</CustomFormLabel>
                <CustomTextField
                  id="organizationName"
                  value={formData.organizationName}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                />
                <CustomFormLabel htmlFor="department-name">Department Name</CustomFormLabel>
                <CustomTextField
                  id="departmentName"
                  value={formData.departmentName}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                />
              </Grid>
              <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
                <CustomFormLabel htmlFor="vip">VIP</CustomFormLabel>
                <FormControlLabel
                  control={
                    <Switch
                      id="isVip"
                      checked={formData.isVip}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, isVip: e.target.checked }))
                      }
                      color="primary"
                    />
                  }
                  label={formData.isVip ? 'Yes' : 'No'}
                />
                <CustomFormLabel htmlFor="district-name">District Name</CustomFormLabel>
                <CustomTextField
                  id="districtName"
                  value={formData.districtName}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                />
              </Grid>
            </Grid>
            <Typography variant="h6" fontWeight={600} mb={2} mt={2}>
              Photo
            </Typography>
            <Divider />
            <Grid container spacing={5} mb={3}>
              <Grid size={12}>
                <CustomFormLabel htmlFor="face-image" error={!!formErrors.faceImage}>
                  Face Image
                </CustomFormLabel>
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/jpg"
                  onChange={handleImageChange}
                  style={{
                    border: formErrors.faceImage ? '1px solid red' : undefined,
                    padding: '6px',
                    borderRadius: '4px',
                    width: '100%',
                    marginTop: '5px',
                  }}
                />
                {formErrors.faceImage && (
                  <FormHelperText error>{formErrors.faceImage}</FormHelperText>
                )}
                {preview && (
                  <img
                    src={preview?.startsWith('blob:') ? preview : `${BASE_URL}${preview}`}
                    alt="Face Preview"
                    style={{ width: '100%', marginTop: '10px', borderRadius: '5px' }}
                  />
                )}
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

      {loading && (
        <Dialog open={true} fullWidth maxWidth="sm">
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

export default AddEditVisitor;
// function fetchVisitors(): any {
//   throw new Error('Function not implemented.');
// }
