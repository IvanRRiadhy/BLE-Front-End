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
  FormHelperText,
} from '@mui/material';
import { IconPencil, IconPlus } from '@tabler/icons-react';
import React, { useEffect } from 'react';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { dispatch, RootState, useSelector } from 'src/store/Store';
import {
  addMember,
  editMember,
  fetchMemberDT,
  fetchMembers,
  memberType,
} from 'src/store/apps/crud/member';
import { fetchDistricts, DistrictType } from 'src/store/apps/crud/district';
import { fetchDepartments, DepartmentType } from 'src/store/apps/crud/department';
import { fetchOrganizations, OrganizationType } from 'src/store/apps/crud/organization';

import { gender, statusEmployee } from 'src/types/crud/input';
import toast from 'react-hot-toast';
import { defaultMemberForm } from 'src/store/apps/defaultForm';

interface FormType {
  type?: string;
  member?: memberType;
}

const AddEditMember = ({ type, member }: FormType) => {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [image, setImage] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string | null>(member?.faceImage || null);
  const [formData, setFormData] = React.useState<memberType>({
    ...defaultMemberForm,
    ...member,
  });
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({});

  const districtData: DistrictType[] = useSelector(
    (state: RootState) => state.districtReducer.districts,
  );
  const departmentData: DepartmentType[] = useSelector(
    (state: RootState) => state.departmentReducer.departments,
  );
  const organizationData: OrganizationType[] = useSelector(
    (state: RootState) => state.organizationReducer.organizations,
  );
  const memberFilter = useSelector((state: RootState) => state.memberReducer.memberFilter);
  useEffect(() => {
    dispatch(fetchMembers());
    dispatch(fetchDistricts());
    dispatch(fetchDepartments());
    dispatch(fetchOrganizations());
  }, [dispatch]);

  const handleClickOpen = () => {
    setLoading(true);
    setFormErrors({});
    if (type === 'edit' && member) {
      if (!member.id) {
        dispatch(fetchMemberDT(memberFilter));
      }
      setFormData({
        ...defaultMemberForm,
        ...member,
      });
    } else {
      setFormData({ ...defaultMemberForm });
    }
    setTimeout(() => {
      setLoading(false);
      setOpen(true);
    }, 100);
  };

  const handleClose = () => {
    setOpen(false);
    setPreview(member?.faceImage || null);
    setImage(null);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name?.trim()) errors.name = "Member's name is required";
    if (!formData.cardNumber?.trim()) errors.cardNumber = "Member's Card Number is required";
    if (!formData.bleCardNumber?.trim())
      errors.bleCardNumber = "Member's BLE Card Number is required";
    if (!formData.departmentId?.trim()) errors.departmentId = "Member's Department is required";
    if (!formData.organizationId?.trim())
      errors.organizationId = "Member's Organization is required";
    if (!formData.districtId?.trim()) errors.districtId = "Member's District is required";
    if (!formData.gender?.trim()) errors.gender = "Member's Gender is required";
    if (!formData.phone?.trim()) errors.phone = "Member's Phone Number is required";
    if (!image) errors.faceImage = "Member's Face Image is required";
    if (!!formData.email?.trim() && !formData.email?.includes('@'))
      errors.email = 'Valid Email is required';
    if (!formData.personId?.trim()) errors.personId = "Member's ID is required";

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast.error('Please fill in all required fields correctly.');
      return;
    }
    setLoading(true);
    try {
      const data = new FormData();

      Object.entries(formData).forEach(([key, value]) => {
        if (
          key !== 'faceImage' &&
          key !== 'createdBy' &&
          key !== 'createdAt' &&
          key !== 'updatedBy' &&
          key !== 'updatedAt'
        ) {
          data.append(key, value.toString());
        }
      });
      console.log(JSON.stringify(data, null, 2));
      if (image) {
        data.append('faceImage', image);
      }
      let result;
      if (type === 'edit') {
        result = await dispatch(editMember(data)); // Dispatch update
      }
      if (type === 'add') {
        result = await dispatch(addMember(data));
      }
      if (result && result.type && result.type.endsWith('/fulfilled')) {
        await dispatch(fetchMemberDT(memberFilter));
        console.log('Member Data Saved!');
        toast.success('Data Saved');
        handleClose();
      } else {
        toast.error('Saving Data Unsuccessful');
      }
    } catch (error) {
      toast.error('Saving Data Unsuccessful');
      console.error('Error saving member data:', error);
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
        <Tooltip title="Edit Member">
          <IconButton color="primary" size="small" onClick={handleClickOpen}>
            <IconPencil size={20} />
          </IconButton>
        </Tooltip>
      )}
      {type === 'add' && (
        <Tooltip title="Add Member">
          <Button
            variant="contained"
            color="primary"
            startIcon={<IconPlus size={20} />}
            fullWidth
            onClick={handleClickOpen}
          >
            Add Member
          </Button>
        </Tooltip>
      )}

      {!loading && (
        <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
          <DialogTitle>
            <Typography component="div" variant="h4" mb={2} mt={2} fontWeight={700}>
              {type === 'add' ? 'Add Member' : 'Edit Member'}
            </Typography>
            <Divider />
          </DialogTitle>
          <DialogContent>
            <Typography variant="h6" fontWeight={600} mb={2} mt={2}>
              IDs
            </Typography>
            <Divider />
            <Grid container spacing={5} mb={3}>
              <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
                <CustomFormLabel htmlFor="person-id">person ID</CustomFormLabel>
                <CustomTextField
                  id="personId"
                  value={formData.personId}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                  error={!!formErrors.personId}
                  helperText={formErrors.personId}
                />
                <CustomFormLabel htmlFor="department-Id">Department ID</CustomFormLabel>
                <CustomSelect
                  name="departmentId"
                  value={formData.departmentId || ''}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                  error={!!formErrors.departmentId}
                  helperText={formErrors.departmentId}
                >
                  <MenuItem value="" disabled>
                    Select Department
                  </MenuItem>
                  {departmentData.map((department) => (
                    <MenuItem key={department.id} value={department.id}>
                      {department.name}
                    </MenuItem>
                  ))}
                </CustomSelect>
                <CustomFormLabel htmlFor="identity-Id">Identity ID</CustomFormLabel>
                <CustomTextField
                  id="identityId"
                  value={formData.identityId}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                />
              </Grid>
              <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
                <CustomFormLabel htmlFor="organization-id">Organization ID</CustomFormLabel>
                <CustomSelect
                  name="organizationId"
                  value={formData.organizationId || ''}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                  error={!!formErrors.organizationId}
                  helperText={formErrors.organizationId}
                >
                  <MenuItem value="" disabled>
                    Select Organization
                  </MenuItem>
                  {organizationData.map((organization) => (
                    <MenuItem key={organization.id} value={organization.id}>
                      {organization.name}
                    </MenuItem>
                  ))}
                </CustomSelect>
                <CustomFormLabel htmlFor="district-id">District ID</CustomFormLabel>
                <CustomSelect
                  name="districtId"
                  value={formData.districtId || ''}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                  error={!!formErrors.districtId}
                  helperText={formErrors.districtId}
                >
                  <MenuItem value="" disabled>
                    Select District
                  </MenuItem>
                  {districtData.map((district) => (
                    <MenuItem key={district.id} value={district.id}>
                      {district.name}
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
                  error={!!formErrors.cardNumber}
                  helperText={formErrors.cardNumber}
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
                  error={!!formErrors.bleCardNumber}
                  helperText={formErrors.bleCardNumber}
                />
              </Grid>
            </Grid>
            <Typography variant="h6" fontWeight={600} mb={2} mt={2}>
              Member Details
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
                  helperText={formErrors.name}
                />
                <CustomFormLabel htmlFor="email">Email</CustomFormLabel>
                <CustomTextField
                  id="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                  error={!!formErrors.email}
                  helperText={formErrors.email}
                />
                <CustomFormLabel htmlFor="Address">Address</CustomFormLabel>
                <CustomTextField
                  id="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                />
                <CustomFormLabel htmlFor="status-employee">Status Employee</CustomFormLabel>
                <CustomSelect
                  name="statusEmployee"
                  value={formData.statusEmployee || ''}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                >
                  {statusEmployee.map((stats) => (
                    <MenuItem
                      key={stats.value}
                      value={stats.value}
                      disabled={stats.disabled || false}
                    >
                      {stats.label}
                    </MenuItem>
                  ))}
                </CustomSelect>
              </Grid>
              <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
                <CustomFormLabel htmlFor="phone">Phone</CustomFormLabel>
                <CustomTextField
                  id="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                  error={!!formErrors.phone}
                  helperText={formErrors.phone}
                />
                <CustomFormLabel htmlFor="gender">Gender</CustomFormLabel>
                <CustomSelect
                  name="gender"
                  value={formData.gender || ''}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                  error={!!formErrors.gender}
                  helperText={formErrors.gender}
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
                <CustomFormLabel htmlFor="head-Member-1">Head Member 1</CustomFormLabel>
                <CustomTextField
                  id="headMember1"
                  value={formData.headMember1}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                />
                <CustomFormLabel htmlFor="head-Member-2">Head Member 2</CustomFormLabel>
                <CustomTextField
                  id="headMember2"
                  value={formData.headMember2}
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

export default AddEditMember;
