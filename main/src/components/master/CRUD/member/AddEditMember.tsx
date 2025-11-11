import { BASE_URL } from 'src/utils/axios';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid2 as Grid,
  Tooltip,
  Typography,
  CircularProgress,
  FormHelperText,
  Autocomplete,
  TextField,
  Box,
  MenuItem,
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
  memberType,
} from 'src/store/apps/crud/member';
import { fetchDistricts, DistrictType } from 'src/store/apps/crud/district';
import { fetchDepartments, DepartmentType } from 'src/store/apps/crud/department';
import { fetchOrganizations, OrganizationType } from 'src/store/apps/crud/organization';
import { CardType, fetchCard } from 'src/store/apps/crud/card';
import { gender, statusEmployee } from 'src/types/crud/input';
import toast from 'react-hot-toast';
import { defaultMemberForm } from 'src/store/apps/defaultForm';
import AddEditDistrict from '../district/AddEditDistrict';
import AddEditDepartment from '../department/AddEditDepartment';
import AddEditOrganization from '../organization/AddEditOrganizationList';
import { useQueryClient } from '@tanstack/react-query';
import { PaginatedResponse } from 'src/hooks/useMember';

interface FormType {
  type?: string;
  member?: memberType;
}

const AddEditMember = ({ type, member }: FormType) => {
  const queryClient = useQueryClient();
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
  const memberFilter = useSelector((state: RootState) => state.memberReducer.memberFilter);
  const districtData = useSelector((state: RootState) => state.districtReducer.districtAll);
  const departmentData = useSelector((state: RootState) => state.departmentReducer.departmentAll);
  const organizationData = useSelector((state: RootState) => state.organizationReducer.organizationAll);
  const cardData = useSelector((state: RootState) => state.CardReducer.cardAll);
  const filteredCard: CardType[] = cardData.filter((card) => !card.isUsed);

  useEffect(() => {
    dispatch(fetchDistricts());
    dispatch(fetchDepartments());
    dispatch(fetchOrganizations());
    dispatch(fetchCard());
  }, [dispatch]);

  const handleClickOpen = () => {
    setLoading(true);
    setFormErrors({});
    setFormData({ ...defaultMemberForm, ...member });
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
    if (!formData.cardNumber?.trim()) errors.cardNumber = "Card Number is required";
    if (!formData.departmentId?.trim()) errors.departmentId = "Department is required";
    if (!formData.organizationId?.trim()) errors.organizationId = "Organization is required";
    if (!formData.districtId?.trim()) errors.districtId = "District is required";
    if (!formData.gender?.trim()) errors.gender = "Gender is required";
    if (!formData.phone?.trim()) errors.phone = "Phone Number is required";
    if (!image && type === 'add') errors.faceImage = "Face Image is required";
    if (!!formData.email?.trim() && !formData.email.includes('@')) errors.email = 'Valid Email required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast.error('Please fill all required fields correctly.');
      return;
    }
    setIsSaving(true);
    try {
      const data = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (!['faceImage', 'createdBy', 'createdAt', 'updatedBy', 'updatedAt'].includes(key))
          data.append(key, value?.toString() ?? '');
      });
      if (image) data.append('faceImage', image);

      let result;
      if (type === 'edit') result = await dispatch(editMember(data));
      else result = await dispatch(addMember(data));

      if (result && result.type.endsWith('/fulfilled')) {
        // ✅ Update cache manually
        queryClient.setQueryData<PaginatedResponse<memberType>>(
          ['member-list', memberFilter],
          (oldCache) => {
            if (!oldCache) return oldCache;
            const updatedData = type === 'edit'
              ? oldCache.data.map((m) =>
                  m.id === formData.id ? { ...m, ...formData } : m
                )
              : [...oldCache.data, result.payload];
            return { ...oldCache, data: updatedData };
          }
        );

        toast.success('Data saved successfully!');
        handleClose();
      } else {
        toast.error('Saving data failed.');
      }
    } catch (error) {
      console.error('Error saving member:', error);
      toast.error('Saving Data Unsuccessful');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<{ value: unknown }>
  ) => {
    const { value, name, id } = e.target as HTMLInputElement;
    setFormData((prev) => ({ ...prev, [id || name]: value }));
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return alert('File size exceeds 5MB.');
    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type))
      return alert('Invalid image type.');
    setImage(file);
    setPreview(URL.createObjectURL(file));
  };

  return (
    <>
      {type === 'edit' && (
        <Tooltip title="Edit Member">
          <Box
            onClick={handleClickOpen}
            sx={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              border: '1px solid rgba(0,0,0,0.15)',
              boxShadow: '0 1px 2px rgba(0,0,0,0.25)',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              width: 36,
              height: 36,
              cursor: 'pointer',
              '& svg': {
                color: '#fff',
                filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.5))',
              },
              '&:hover': {
                backgroundColor: 'rgba(255,255,255,0.35)',
                transform: 'scale(1.1)',
              },
            }}
          >
            <IconPencil size={18} stroke={1.6} />
          </Box>
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
        <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
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
              <Grid size={{ lg: 6, md: 12, sm: 12 }} >
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
                <Box display="flex" alignItems="center" gap={1}>
                  <Autocomplete
                    sx={{ flex: 1 }}
                    options={departmentData.map((dept: DepartmentType) => ({ label: dept.name, id: dept.id }))}
                    value={
                      departmentData
                        .map((d) => ({ label: d.name, id: d.id }))
                        .find((d) => d.id === formData.departmentId) || null
                    }
                    onChange={(_, newValue) => {
                      const id = newValue?.id ?? '';
                      setFormData((prev) => ({ ...prev, departmentId: id }));
                      setFormErrors((prev) => {
                        if (!prev.departmentId) return prev;
                        const next = { ...prev };
                        delete next.departmentId;
                        return next;
                      });
                    }}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    getOptionLabel={(option) =>
                      typeof option === 'string' ? option : option.label
                    }
                    clearOnEscape
                    disableClearable={false}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        id="departmentId"
                        variant="outlined"
                        fullWidth
                        required
                        error={!!formErrors.departmentId}
                        helperText={formErrors.departmentId}
                      />
                    )}
                  />
                  <AddEditDepartment type="add" />
                </Box>
                <CustomFormLabel htmlFor="identity-Id">Identity ID</CustomFormLabel>
                <CustomTextField
                  id="identityId"
                  value={formData.identityId}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                />
              </Grid>
              <Grid size={{ lg: 6, md: 12, sm: 12 }} >
                <CustomFormLabel htmlFor="organization-id">Organization ID</CustomFormLabel>
                <Box display="flex" alignItems="center" gap={1}>
                  <Autocomplete
                    sx={{ flex: 1 }}
                    options={organizationData.map((orgz: OrganizationType) => ({ label: orgz.name, id: orgz.id }))}
                    value={
                      organizationData
                        .map((o) => ({ label: o.name, id: o.id }))
                        .find((o) => o.id === formData.organizationId) || null
                    }
                    onChange={(_, newValue) => {
                      const id = newValue?.id ?? '';
                      setFormData((prev) => ({ ...prev, organizationId: id }));
                      setFormErrors((prev) => {
                        if (!prev.organizationId) return prev;
                        const next = { ...prev };
                        delete next.organizationId;
                        return next;
                      });
                    }}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    getOptionLabel={(option) =>
                      typeof option === 'string' ? option : option.label
                    }
                    clearOnEscape
                    disableClearable={false}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        id="organizationId"
                        variant="outlined"
                        fullWidth
                        required
                        error={!!formErrors.organizationId}
                        helperText={formErrors.organizationId}
                      />
                    )}
                  />
                  <AddEditOrganization  type="add" />
                </Box>
                <CustomFormLabel htmlFor="district-id">District ID</CustomFormLabel>
                <Box display="flex" alignItems="center" gap={1}>
                  <Autocomplete
                    sx={{ flex: 1 }}
                    options={districtData.map((dist: DistrictType) => ({ label: dist.name, id: dist.id }))}
                    value={
                      districtData
                        .map((d) => ({ label: d.name, id: d.id }))
                        .find((d) => d.id === formData.districtId) || null
                    }
                    onChange={(_, newValue) => {
                      const id = newValue?.id ?? '';
                      setFormData((prev) => ({ ...prev, districtId: id }));
                      setFormErrors((prev) => {
                        if (!prev.districtId) return prev;
                        const next = { ...prev };
                        delete next.districtId;
                        return next;
                      });
                    }}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    getOptionLabel={(option) =>
                      typeof option === 'string' ? option : option.label
                    }
                    clearOnEscape
                    disableClearable={false}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        id="districtId"
                        variant="outlined"
                        fullWidth
                        required
                        error={!!formErrors.districtId}
                        helperText={formErrors.districtId}
                      />
                    )}
                  />
                  <AddEditDistrict type="add" />
                </Box>
              </Grid>
            </Grid>
            <Typography variant="h6" fontWeight={600} mb={2} mt={2}>
              Card Details
            </Typography>
            <Divider />
            <Grid container spacing={5} mb={3}>
              {/* <Grid size={{ lg: 6, md: 12, sm: 12 }} >
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
              </Grid> */}
              <Grid size={{ lg: 6, md: 12, sm: 12 }} >
                <CustomFormLabel htmlFor="ble-card-number">Card Number</CustomFormLabel>
                  <Autocomplete
                    sx={{ flex: 1 }}
                    options={filteredCard.map((card: CardType) => ({ label: card.cardNumber, id: card.id }))}
                    value={
                      cardData
                        .map((d) => ({ label: d.cardNumber, id: d.id }))
                        .find((d) => d.id === formData.cardId) || null
                    }
                    onChange={(_, newValue) => {
                      const id = newValue?.id ?? '';
                      const number = newValue?.label ?? '';
                      setFormData((prev) => ({ ...prev, cardNumber: number, cardId: id }));
                      setFormErrors((prev) => {
                        if (!prev.cardNumber) return prev;
                        const next = { ...prev };
                        delete next.cardNumber;
                        return next;
                      });
                      console.log("AA", formData.cardId);
                    }}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    getOptionLabel={(option) =>
                      typeof option === 'string' ? option : option.label
                    }
                    clearOnEscape
                    disableClearable={false}
                    noOptionsText="No Available BLE Card"
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        id="cardNumber"
                        variant="outlined"
                        fullWidth
                        required
                        error={!!formErrors.cardNumber}
                        helperText={formErrors.cardNumber}
                      />
                    )}
                  />
              </Grid>
            </Grid>
            <Typography variant="h6" fontWeight={600} mb={2} mt={2}>
              Member Details
            </Typography>
            <Divider />
            <Grid container spacing={5} mb={3}>
              <Grid size={{ lg: 6, md: 12, sm: 12 }} >
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
              <Grid size={{ lg: 6, md: 12, sm: 12 }} >
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
