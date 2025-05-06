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
} from '@mui/material';
import { IconPencil, IconPlus } from '@tabler/icons-react';
import React, { useEffect } from 'react';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { AppDispatch, dispatch, RootState, useDispatch, useSelector } from 'src/store/Store';
import { addMember, editMember, fetchMembers, memberType } from 'src/store/apps/crud/member';
import { fetchDistricts, DistrictType } from 'src/store/apps/crud/district';
import { fetchDepartments, DepartmentType } from 'src/store/apps/crud/department';
import { fetchOrganizations, OrganizationType } from 'src/store/apps/crud/organization';
import { fetchApplications, ApplicationType } from 'src/store/apps/crud/application';
import { gender, statusEmployee } from 'src/types/crud/input';

interface FormType {
  type?: string;
  member?: memberType;
}

const BASE_URL = 'http://localhost:5034';

const AddEditMember = ({ type, member }: FormType) => {
  const [open, setOpen] = React.useState(false);
  const [image, setImage] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string | null>(member?.faceImage || null);
  const [formData, setFormData] = React.useState({
    id: member?.id || '',
    personId: member?.personId || '',
    organizationId: member?.organizationId || '',
    departmentId: member?.departmentId || '',
    districtId: member?.districtId || '',
    identityId: member?.identityId || '',
    cardNumber: member?.cardNumber || '',
    bleCardNumber: member?.bleCardNumber || '',
    name: member?.name || '',
    phone: member?.phone || '',
    email: member?.email || '',
    gender: member?.gender || '',
    address: member?.address || '',
    uploadFr: member?.uploadFr || 0,
    uploadFrError: member?.uploadFrError || '',
    birthDate: member?.birthDate || '',
    joinDate: member?.joinDate || '',
    exitDate: member?.exitDate || '',
    headMember1: member?.headMember1 || '',
    headMember2: member?.headMember2 || '',
    applicationId: member?.applicationId || '',
    statusEmployee: member?.statusEmployee || '',
    createdBy: member?.createdBy || '',
    createdAt: member?.createdAt || '',
    updatedBy: member?.updatedBy || '',
    updatedAt: member?.updatedAt || '',
  });

  const districtData = useSelector((state: RootState) => state.districtReducer.districts);
  const departmentData = useSelector((state: RootState) => state.departmentReducer.departments);
  const organizationData = useSelector(
    (state: RootState) => state.organizationReducer.organizations,
  );
  const applicationData = useSelector((state: RootState) => state.applicationReducer.applications);

  useEffect(() => {
    dispatch(fetchMembers());
    dispatch(fetchDistricts());
    dispatch(fetchDepartments());
    dispatch(fetchOrganizations());
    dispatch(fetchApplications());
  }, [dispatch]);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setPreview(member?.faceImage || null);
  };

  const handleSave = async () => {
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
      if (image) {
        data.append('faceImage', image);
      }
      if (type === 'edit') {
        await dispatch(editMember(data)); // Dispatch update
      }
      if (type === 'add') {
        await dispatch(addMember(data));
      }
      await dispatch(fetchMembers());
      console.log('Saved!');
      setOpen(false);
      setPreview(null);
    } catch (error) {
      console.error('Error saving Member:', error);
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
                placeholder={formData.personId}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
              <CustomFormLabel htmlFor="department-Id">Department ID</CustomFormLabel>
              <CustomSelect
                name="departmentId"
                value={formData.departmentId || ''}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              >
                {departmentData.map((department) => (
                  <MenuItem key={department.id} value={department.id}>
                    {department.name}
                  </MenuItem>
                ))}
              </CustomSelect>
              <CustomFormLabel htmlFor="identity-Id">Identity ID</CustomFormLabel>
              <CustomTextField
                id="identityId"
                placeholder={formData.identityId}
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
              >
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
              >
                {districtData.map((district) => (
                  <MenuItem key={district.id} value={district.id}>
                    {district.name}
                  </MenuItem>
                ))}
              </CustomSelect>
              <CustomFormLabel htmlFor="applicationID">Application ID</CustomFormLabel>
              <CustomSelect
                name="applicationId"
                value={formData.applicationId || ''}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              >
                {applicationData.map((application) => (
                  <MenuItem key={application.id} value={application.id}>
                    {application.applicationName}
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
                placeholder={formData.cardNumber}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
            </Grid>
            <Grid size={{ lg: 6, md: 12, sm: 12 }} direction={'column'}>
              <CustomFormLabel htmlFor="ble-card-number">Ble Card Number</CustomFormLabel>
              <CustomTextField
                id="bleCardNumber"
                placeholder={formData.bleCardNumber}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
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
                placeholder={formData.name}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
              <CustomFormLabel htmlFor="email">Email</CustomFormLabel>
              <CustomTextField
                id="email"
                placeholder={formData.email}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
              <CustomFormLabel htmlFor="Address">Address</CustomFormLabel>
              <CustomTextField
                id="addess"
                placeholder={formData.address}
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
                placeholder={formData.phone}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
              <CustomFormLabel htmlFor="gender">Gender</CustomFormLabel>
              <CustomSelect
                name="gender"
                value={formData.gender}
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
              <CustomFormLabel htmlFor="head-Member-1">Head Member 1</CustomFormLabel>
              <CustomTextField
                id="headMember1"
                placeholder={formData.headMember1}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
              <CustomFormLabel htmlFor="head-Member-2">Head Member 2</CustomFormLabel>
              <CustomTextField
                id="headMember2"
                placeholder={formData.headMember2}
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
              <CustomFormLabel htmlFor="face-image">Face Image</CustomFormLabel>
              <input
                type="file"
                accept="image/png, image/jpeg, image/jpg"
                onChange={handleImageChange}
              />
              {preview && (
                <img
                  src={`${BASE_URL}${preview}`}
                  alt="Face Preview"
                  style={{ width: '100%', marginTop: '10px', borderRadius: '5px' }}
                />
              )}
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

export default AddEditMember;
