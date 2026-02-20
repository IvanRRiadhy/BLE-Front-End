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
  Box,
  MenuItem,
  IconButton,
} from '@mui/material';
import { IconPencil, IconPlus } from '@tabler/icons-react';
import React, { useEffect } from 'react';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { dispatch, RootState, useSelector } from 'src/store/Store';
import { addMember, editMember, memberType } from 'src/store/apps/crud/member';
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
import { PaginatedResponse, useAddMember, useEditMember, useMemberList } from 'src/hooks/useMember';
import CustomAutocomplete from 'src/components/shared/CustomAutocomplete';
import { useAllDistricts } from 'src/hooks/useDistrict';
import { useAllDepartments } from 'src/hooks/useDepartment';
import { useAllOrganizations } from 'src/hooks/useOrganization';
import { useAllCard, useUnassignedCard } from 'src/hooks/useCard';

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
  const [preview, setPreview] = React.useState<string | null>(null);
  const [formData, setFormData] = React.useState<memberType>({
    ...defaultMemberForm,
    ...member,
  });
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({});
  const memberFilter = useSelector((state: RootState) => state.memberReducer.memberFilter);
  const districtData = useAllDistricts().data || [];
  const departmentData = useAllDepartments().data || [];
  const organizationData = useAllOrganizations().data || [];
  const filteredCard = useUnassignedCard().data || [];
  const cardData = useAllCard().data || [];
  const headMemberData = useMemberList({ ...memberFilter, Length: 999 }).data?.data || [];
  const headOptions = headMemberData.map((m: any) => ({
    id: m.id,
    label: m.name,
    personId: m.personId,
  }));
  const filteredHead1Options = headOptions.filter((opt) => opt.id !== formData.headMember2);

  const filteredHead2Options = headOptions.filter((opt) => opt.id !== formData.headMember1);

  const handleClickOpen = () => {
    setLoading(true);
    setFormErrors({});
    setFormData({ ...defaultMemberForm, ...member });

    // Set image preview properly - check if member exists and has faceImage
    if (member?.faceImage) {
      // Create the full URL for preview
      const fullImageUrl = `${BASE_URL}${member.faceImage}`;
      setPreview(fullImageUrl);
      console.log('Setting preview to:', fullImageUrl);
    } else {
      setPreview(null);
    }

    setImage(null);
    setTimeout(() => {
      setLoading(false);
      setOpen(true);
    }, 100);
  };

  const handleClose = () => {
    console.log(member);
    setOpen(false);

    // Reset preview to the original member image if it exists
    if (member?.faceImage) {
      setPreview(`${BASE_URL}${member.faceImage}`);
    } else {
      setPreview(null);
    }

    setImage(null);
  };

  const addMemberMutation = useAddMember();
  const editMemberMutation = useEditMember();

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.name?.trim()) errors.name = "Member's name is required";
    if (!formData.cardNumber?.trim()) errors.cardNumber = 'Card Number is required';
    if (!formData.departmentId?.trim()) errors.departmentId = 'Department is required';
    if (!formData.organizationId?.trim()) errors.organizationId = 'Organization is required';
    if (!formData.districtId?.trim()) errors.districtId = 'District is required';
    if (!formData.gender?.trim()) errors.gender = 'Gender is required';
    if (!formData.phone?.trim()) errors.phone = 'Phone Number is required';
    if (!image && type === 'add' && !preview) errors.faceImage = 'Face Image is required';
    if (!!formData.email?.trim() && !formData.email.includes('@'))
      errors.email = 'Valid Email required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const logFormData = (formData: any) => {
    console.log('FormData contents:');
    for (let [key, value] of formData.entries()) {
      console.log(`${key}:`, value);
    }
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
        if (!['faceImage', 'createdBy', 'createdAt', 'updatedBy', 'updatedAt'].includes(key)) {
          data.append(key, value?.toString() ?? '');
        }
      });

      if (image) data.append('faceImage', image);

      if (type === 'edit') {
        await editMemberMutation.mutateAsync(data);
      } else {
        await addMemberMutation.mutateAsync(data);
      }

      toast.success('Data saved successfully!');
      handleClose();
    } catch (error) {
      console.error(error);
      toast.error('Saving data failed.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<{ value: unknown }>,
  ) => {
    const { value, name, id } = e.target as HTMLInputElement;
    setFormData((prev) => ({ ...prev, [id || name]: value }));
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size exceeds 5MB.');
      return;
    }
    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
      toast.error('Invalid image type. Please use PNG, JPEG, or JPG.');
      return;
    }

    // Clear any existing preview URL
    if (preview && preview.startsWith('blob:')) {
      URL.revokeObjectURL(preview);
    }

    setImage(file);
    setPreview(URL.createObjectURL(file));
  };

  // Clean up blob URLs on component unmount
  React.useEffect(() => {
    return () => {
      if (preview && preview.startsWith('blob:')) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  // Create forwardRef components for Tooltip children
  const EditButton = React.forwardRef<HTMLButtonElement>((props, ref) => (
    <IconButton
      ref={ref}
      onClick={handleClickOpen}
      sx={{
        backgroundColor: 'rgba(255,255,255,0.2)',
        border: '1px solid rgba(0,0,0,0.15)',
        boxShadow: '0 1px 2px rgba(0,0,0,0.25)',
        transition: 'all 0.2s ease',
        width: 36,
        height: 36,
        '& svg': {
          color: '#fff',
          filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.5))',
        },
        '&:hover': {
          backgroundColor: 'rgba(255,255,255,0.35)',
          transform: 'scale(1.1)',
        },
      }}
      {...props}
    >
      <IconPencil size={18} stroke={1.6} />
    </IconButton>
  ));
  EditButton.displayName = 'EditButton';

  const AddButton = React.forwardRef<HTMLButtonElement>((props, ref) => (
    <Button
      ref={ref}
      variant="contained"
      color="primary"
      startIcon={<IconPlus size={20} />}
      fullWidth
      onClick={handleClickOpen}
      {...props}
    >
      Add Member
    </Button>
  ));
  AddButton.displayName = 'AddButton';

  return (
    <>
      {type === 'edit' && (
        <Tooltip title="Edit Member">
          <EditButton />
        </Tooltip>
      )}

      {type === 'add' && (
        <Tooltip title="Add Member">
          <AddButton />
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
              <Grid size={{ lg: 6, md: 12, sm: 12 }}>
                <CustomFormLabel htmlFor="person-id">Person ID</CustomFormLabel>
                <CustomTextField
                  id="personId"
                  value={formData.personId}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                  error={!!formErrors.personId}
                  helperText={formErrors.personId}
                />
                <CustomFormLabel htmlFor="department">Department</CustomFormLabel>
                <Box display="flex" alignItems="center" gap={1}>
                  <CustomAutocomplete<{ label: string; id: string }>
                    label="Department"
                    options={departmentData.map((dept: DepartmentType) => ({
                      label: dept.name,
                      id: dept.id,
                    }))}
                    value={
                      departmentData
                        .map((d) => ({ label: d.name, id: d.id }))
                        .find((d) => d.id === formData.departmentId) || null
                    }
                    onChange={(val) => {
                      const id = val?.id ?? '';
                      setFormData((prev) => ({ ...prev, departmentId: id }));
                      setFormErrors((prev) => {
                        if (!prev.departmentId) return prev;
                        const next = { ...prev };
                        delete next.departmentId;
                        return next;
                      });
                    }}
                    getOptionLabel={(o) => o.label}
                    isOptionEqualToValue={(a, b) => a.id === b.id}
                    sx={{ flex: 1 }}
                  />
                  <AddEditDepartment type="add" />
                </Box>
                {formErrors.departmentId && (
                  <FormHelperText error sx={{ mt: 0.5 }}>
                    {formErrors.departmentId}
                  </FormHelperText>
                )}
                <CustomFormLabel htmlFor="identity-Id">Identity</CustomFormLabel>
                <CustomTextField
                  id="identityId"
                  value={formData.identityId}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                />
              </Grid>
              <Grid size={{ lg: 6, md: 12, sm: 12 }}>
                <CustomFormLabel htmlFor="organization">Organization</CustomFormLabel>
                <Box display="flex" alignItems="center" gap={1}>
                  <CustomAutocomplete<{ label: string; id: string }>
                    label="Organization"
                    options={organizationData.map((orgz: OrganizationType) => ({
                      label: orgz.name,
                      id: orgz.id,
                    }))}
                    value={
                      organizationData
                        .map((o) => ({ label: o.name, id: o.id }))
                        .find((o) => o.id === formData.organizationId) || null
                    }
                    onChange={(val) => {
                      const id = val?.id ?? '';
                      setFormData((prev) => ({ ...prev, organizationId: id }));
                      setFormErrors((prev) => {
                        if (!prev.organizationId) return prev;
                        const next = { ...prev };
                        delete next.organizationId;
                        return next;
                      });
                    }}
                    getOptionLabel={(o) => o.label}
                    isOptionEqualToValue={(a, b) => a.id === b.id}
                    sx={{ flex: 1 }}
                  />
                  <AddEditOrganization type="add" />
                </Box>
                {formErrors.organizationId && (
                  <FormHelperText error sx={{ mt: 0.5 }}>
                    {formErrors.organizationId}
                  </FormHelperText>
                )}
                <CustomFormLabel htmlFor="district">District</CustomFormLabel>
                <Box display="flex" alignItems="center" gap={1}>
                  <CustomAutocomplete<{ label: string; id: string }>
                    label="District"
                    options={districtData.map((dist: DistrictType) => ({
                      label: dist.name,
                      id: dist.id,
                    }))}
                    value={
                      districtData
                        .map((d) => ({ label: d.name, id: d.id }))
                        .find((d) => d.id === formData.districtId) || null
                    }
                    onChange={(val) => {
                      const id = val?.id ?? '';
                      setFormData((prev) => ({ ...prev, districtId: id }));
                      setFormErrors((prev) => {
                        if (!prev.districtId) return prev;
                        const next = { ...prev };
                        delete next.districtId;
                        return next;
                      });
                    }}
                    getOptionLabel={(o) => o.label}
                    isOptionEqualToValue={(a, b) => a.id === b.id}
                    sx={{ flex: 1 }}
                  />
                  <AddEditDistrict type="add" />
                </Box>
                {formErrors.districtId && (
                  <FormHelperText error sx={{ mt: 0.5 }}>
                    {formErrors.districtId}
                  </FormHelperText>
                )}
              </Grid>
            </Grid>
            <Typography variant="h6" fontWeight={600} mb={2} mt={2}>
              Card Details
            </Typography>
            <Divider />
            <Grid container spacing={5} mb={3}>
              <Grid size={{ lg: 6, md: 12, sm: 12 }}>
                <CustomFormLabel htmlFor="ble-card-number">Card Number</CustomFormLabel>
                <CustomAutocomplete<{ label: string; id: string }>
                  label="Card Number"
                  options={filteredCard.map((card: CardType) => ({
                    label: card.cardNumber,
                    id: card.id,
                  }))}
                  value={
                    cardData
                      .map((c) => ({ label: c.cardNumber, id: c.id }))
                      .find((c) => c.id === formData.cardId) || null
                  }
                  onChange={(val) => {
                    const id = val?.id ?? '';
                    const number = val?.label ?? '';
                    setFormData((prev) => ({ ...prev, cardId: id, cardNumber: number }));
                    setFormErrors((prev) => {
                      if (!prev.cardNumber) return prev;
                      const next = { ...prev };
                      delete next.cardNumber;
                      return next;
                    });
                  }}
                  getOptionLabel={(o) => o.label}
                  isOptionEqualToValue={(a, b) => a.id === b.id}
                  sx={{ flex: 1 }}
                />
                {formErrors.cardNumber && (
                  <FormHelperText error sx={{ mt: 0.5 }}>
                    {formErrors.cardNumber}
                  </FormHelperText>
                )}
              </Grid>
            </Grid>
            <Typography variant="h6" fontWeight={600} mb={2} mt={2}>
              Member Details
            </Typography>
            <Divider />
            <Grid container spacing={5} mb={3}>
              <Grid size={{ lg: 6, md: 12, sm: 12 }}>
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
              <Grid size={{ lg: 6, md: 12, sm: 12 }}>
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
                    <MenuItem key={gender.value} value={gender.value}>
                      {gender.label}
                    </MenuItem>
                  ))}
                </CustomSelect>
                <CustomFormLabel htmlFor="head-Member-1">Head Member 1</CustomFormLabel>
                <CustomAutocomplete
                  label="Head Security 1"
                  options={filteredHead1Options}
                  value={filteredHead1Options.find((h) => h.id === formData.headMember1) || null}
                  onChange={(val) => {
                    const id = val?.id ?? '';
                    setFormData((prev) => ({ ...prev, headMember1: id }));
                  }}
                  getOptionLabel={(opt) => opt.label}
                  isOptionEqualToValue={(a, b) => a.id === b.id}
                  renderOption={(props: any, option: (typeof headOptions)[number]) => (
                    <li {...props} key={option.id}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="body1">{option.label}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {option.personId}
                        </Typography>
                      </div>
                    </li>
                  )}
                  sx={{ flex: 1 }}
                />
                <CustomFormLabel htmlFor="head-Member-2">Head Member 2</CustomFormLabel>
                <CustomAutocomplete
                  label="Head Security 2"
                  options={filteredHead2Options}
                  value={filteredHead2Options.find((h) => h.id === formData.headMember2) || null}
                  onChange={(val) => {
                    const id = val?.id ?? '';
                    setFormData((prev) => ({ ...prev, headMember2: id }));
                  }}
                  getOptionLabel={(opt) => opt.label}
                  isOptionEqualToValue={(a, b) => a.id === b.id}
                  renderOption={(props: any, option: (typeof headOptions)[number]) => (
                    <li {...props} key={option.id}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="body1">{option.label}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {option.personId}
                        </Typography>
                      </div>
                    </li>
                  )}
                  sx={{ flex: 1 }}
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
                  <Box sx={{ mt: 2 }}>
                    <img
                      src={preview}
                      alt="Face Preview"
                      style={{
                        width: '100%',
                        maxHeight: '300px',
                        objectFit: 'contain',
                        marginTop: '10px',
                        borderRadius: '5px',
                        border: '1px solid #ddd',
                        padding: '5px',
                        backgroundColor: '#f5f5f5',
                      }}
                    />
                    {type === 'edit' && !image && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: 'block', mt: 0.5 }}
                      >
                        Current image from database
                      </Typography>
                    )}
                    {image && (
                      <Typography
                        variant="caption"
                        color="primary"
                        sx={{ display: 'block', mt: 0.5 }}
                      >
                        New image selected
                      </Typography>
                    )}
                  </Box>
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
