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
  Stepper,
  Step,
  StepLabel,
  FormControlLabel,
  InputAdornment,
  RadioGroup,
  Radio,
  Paper,
  Chip,
} from '@mui/material';
import { IconPencil, IconPlus, IconPhoto, IconUpload, IconX, IconEye, IconEyeOff } from '@tabler/icons-react';
import React, { useEffect, useState } from 'react';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import CustomSwitch from 'src/components/forms/theme-elements/CustomSwitch';
import { getConfig } from 'src/config';
import { dispatch, RootState, useSelector } from 'src/store/Store';
import { addMember, editMember, memberType, securityType } from 'src/store/apps/crud/member';
import { fetchDistricts, DistrictType } from 'src/store/apps/crud/district';
import { fetchDepartments, DepartmentType } from 'src/store/apps/crud/department';
import { fetchOrganizations, OrganizationType } from 'src/store/apps/crud/organization';
import { CardType, fetchCard } from 'src/store/apps/crud/card';
import { gender, statusEmployee } from 'src/types/crud/input';
import toast from 'react-hot-toast';
import { defaultMemberForm, defaultSecurityForm } from 'src/store/apps/defaultForm';
import AddEditDistrict from '../../CRUD/district/AddEditDistrict';
import AddEditDepartment from '../../CRUD/department/AddEditDepartment';
import AddEditOrganization from '../../CRUD/organization/AddEditOrganizationList';
import { useQueryClient } from '@tanstack/react-query';
import { PaginatedResponse, useMemberList } from 'src/hooks/useMember';
import { useUploadCDN } from 'src/hooks/usePatrolCase';
import CustomAutocomplete from 'src/components/shared/CustomAutocomplete';
import { useAllDistricts } from 'src/hooks/useDistrict';
import { useAllDepartments } from 'src/hooks/useDepartment';
import { useAllOrganizations } from 'src/hooks/useOrganization';
import { useAllCard, useUnassignedCard } from 'src/hooks/useCard';
import { useAddSecurity, useEditSecurity, useSecurityList } from 'src/hooks/useSecurityGuard';
import { useUnlinkedUser, useAllUserGroups } from 'src/hooks/useUser';

interface FormType {
  type?: string;
  member?: securityType;
}

const AddEditSecurityGuard = ({ type, member }: FormType) => {
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [image, setImage] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [formData, setFormData] = React.useState<securityType>({
    ...defaultSecurityForm,
    ...member,
    securityHead1Id:
      member?.securityHead1Id ||
      (typeof member?.securityHead1 === 'object' ? member?.securityHead1?.id : member?.securityHead1) ||
      '',
    securityHead2Id:
      member?.securityHead2Id ||
      (typeof member?.securityHead2 === 'object' ? member?.securityHead2?.id : member?.securityHead2) ||
      '',
  });
  const [activeStep, setActiveStep] = React.useState(0);
  const steps = type === 'add' 
    ? ['Security Details', 'Security Photo', 'Account Binding'] 
    : ['Security Details', 'Security Photo'];
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({});
  const [isDragging, setIsDragging] = React.useState(false);

  // Account Binding States (3rd step for "add")
  const [accountMode, setAccountMode] = React.useState<'none' | 'existing' | 'new'>('none');
  const [selectedUserId, setSelectedUserId] = React.useState<string | null>(null);
  const [newAccount, setNewAccount] = React.useState({
    username: '',
    password: '',
    groupId: '',
  });
  const [showPassword, setShowPassword] = React.useState(false);

  // Queries for Account Binding
  const isHeadChecked = Boolean(formData.isHead);
  const unlinkedPriority = isHeadChecked ? 'PrimaryAdmin' : 'Primary';
  const { data: rawUnlinkedUsers = [], isLoading: isLoadingUnlinked } = useUnlinkedUser(unlinkedPriority);
  const { data: allUserGroups = [], isLoading: isLoadingGroups } = useAllUserGroups();

  // Filter unlinked users: if head, groupIsHead === true; if not head, no extra filter needed
  const filteredUnlinkedUsers = React.useMemo(() => {
    if (!rawUnlinkedUsers) return [];
    if (isHeadChecked) {
      return rawUnlinkedUsers.filter((u: any) => Boolean(u.groupIsHead));
    }
    return rawUnlinkedUsers;
  }, [rawUnlinkedUsers, isHeadChecked]);

  // Filter user groups:
  // For "head" security: only display "PrimaryAdmin" levelPriority with isHead: true
  // For "not head" security: only display "Primary" levelPriority
  const filteredUserGroups = React.useMemo(() => {
    if (!allUserGroups) return [];
    if (isHeadChecked) {
      return allUserGroups.filter(
        (g: any) => g.levelPriority === 'PrimaryAdmin' && Boolean(g.isHead),
      );
    }
    return allUserGroups.filter((g: any) => g.levelPriority === 'Primary');
  }, [allUserGroups, isHeadChecked]);

  const memberFilter = useSelector((state: RootState) => state.memberReducer.memberFilter);
  const districtData = useAllDistricts().data || [];
  const departmentData = useAllDepartments().data || [];
  const organizationData = useAllOrganizations().data || [];
  const filteredCard = useUnassignedCard().data || [];
  const cardData = useAllCard().data || [];
  const cardOptions = React.useMemo(() => {
    const base = filteredCard.map((c) => ({
      label: c.cardNumber,
      id: c.id,
      bleCardNumber: c.dmac,
    }));
    if (formData.cardNumber && !base.find((c) => c.label === formData.cardNumber)) {
      const existing = cardData.find((c) => c.cardNumber === formData.cardNumber);
      if (existing) {
        base.push({ label: existing.cardNumber, id: existing.id, bleCardNumber: existing.dmac });
      }
    }

    return base;
  }, [filteredCard, cardData, formData.cardNumber]);

  const selectedCard = React.useMemo(
    () => cardOptions.find((c) => c.label === formData.cardNumber) || null,
    [cardOptions, formData.cardNumber],
  );

  const headMemberData = useSecurityList({ ...memberFilter, Length: 999, filters: {isHead: true} }).data?.data || [];
  const headOptions = headMemberData.map((m: any) => ({
    id: m.id,
    label: m.name,
    personId: m.personId,
  }));
  const currentHead1Id = formData.securityHead1Id || '';
  const currentHead2Id = formData.securityHead2Id || '';

  const filteredHead1Options = headOptions.filter((opt) => opt.id !== currentHead2Id);
  const filteredHead2Options = headOptions.filter((opt) => opt.id !== currentHead1Id);

  // Helper to reset account binding inputs
  const resetAccountInputs = () => {
    setAccountMode('none');
    setSelectedUserId(null);
    setNewAccount({
      username: '',
      password: '',
      groupId: '',
    });
    setShowPassword(false);
  };

  const handleClickOpen = () => {
    setLoading(true);
    setFormErrors({});
    const initialHead1Id =
      member?.securityHead1Id ||
      (typeof member?.securityHead1 === 'object' ? member?.securityHead1?.id : member?.securityHead1) ||
      '';
    const initialHead2Id =
      member?.securityHead2Id ||
      (typeof member?.securityHead2 === 'object' ? member?.securityHead2?.id : member?.securityHead2) ||
      '';
    setFormData({
      ...defaultSecurityForm,
      ...member,
      isHead: member?.isHead ?? false,
      securityHead1Id: initialHead1Id,
      securityHead2Id: initialHead2Id,
    });
    setActiveStep(0);
    resetAccountInputs();

    // Set image preview properly - check if member exists and has faceImage
    if (member?.faceImage) {
      // Create the CDN URL for preview
      const fullImageUrl = getCdnUrl(member.faceImage);
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
    setActiveStep(0);
    resetAccountInputs();

    // Reset preview to the original member image if it exists
    if (member?.faceImage) {
      setPreview(getCdnUrl(member.faceImage));
    } else {
      setPreview(null);
    }

    setImage(null);
  };

  const addSecurityMutation = useAddSecurity();
  const editSecurityMutation = useEditSecurity();
  const uploadMutation = useUploadCDN({ category: 'member' });

  const getCdnUrl = (url?: string | null) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    let cdnBase = '';
    try {
      cdnBase = getConfig()?.CDN_URL || '';
    } catch {
      cdnBase = '';
    }
    const cleanBase = cdnBase.replace(/\/+$/, '');
    const cleanPath = url.replace(/^\/+/, '');
    return cleanBase ? `${cleanBase}/${cleanPath}` : url;
  };

  const validateStep = (step: number): boolean => {
    const errors: Record<string, string> = {};
    if (step === 0) {
      if (!formData.name?.trim()) errors.name = "Security's name is required";
      if (!formData.cardNumber?.trim()) errors.cardNumber = 'Card Number is required';
      if (!formData.departmentId?.trim()) errors.departmentId = 'Department is required';
      if (!formData.organizationId?.trim()) errors.organizationId = 'Organization is required';
      if (!formData.districtId?.trim()) errors.districtId = 'District is required';
      if (!formData.gender?.trim()) errors.gender = 'Gender is required';
      if (!formData.phone?.trim()) errors.phone = 'Phone Number is required';
      if (!!formData.email?.trim() && !formData.email.includes('@'))
        errors.email = 'Valid Email required';
    } else if (step === 1) {
      if (!image && type === 'add' && !preview && !formData.faceImage) {
        errors.faceImage = 'Face Image is required';
      }
    } else if (step === 2 && type === 'add') {
      if (accountMode === 'existing') {
        if (!selectedUserId) {
          errors.userId = 'Please select an existing user account';
        }
      } else if (accountMode === 'new') {
        if (!newAccount.username.trim()) errors.username = 'Username is required';
        if (!newAccount.password.trim()) errors.password = 'Password is required';
        if (!newAccount.groupId) errors.groupId = 'User Group is required';
      }
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateStep(activeStep)) {
      toast.error('Please fill all required fields correctly.');
      return;
    }

    setIsSaving(true);

    let finalImageUrl = formData.faceImage;

    // If there is a new image selected, upload to CDN first
    if (image) {
      const uploadData = new FormData();
      uploadData.append('file', image);

      try {
        const uploadRes = await uploadMutation.mutateAsync({
          formData: uploadData,
          params: { category: 'member' },
        });
        const uploaded = uploadRes?.collection?.data?.[0];
        if (!uploaded || !uploaded.relativePath) {
          throw new Error('Invalid response from CDN upload');
        }
        finalImageUrl = uploaded.relativePath;
      } catch (err) {
        console.error('CDN upload failed:', err);
        toast.error('Failed to uploading image.');
        setIsSaving(false);
        return; // Aborts saving, keeps dialog open
      }
    }

    const {
      createdBy,
      createdAt,
      updatedBy,
      updatedAt,
      organization,
      department,
      district,
      cardNumber,
      bleCardNumber,
      exitDate,
      applicationId,
      isBlacklist,
      blacklistAt,
      blacklistReason,
      uploadFr,
      uploadFrError,
      securityHead1,
      securityHead2,
      generate,
      ...cleanData
    } = formData;

    const payload: any = {
      ...cleanData,
      ...(type === 'add' ? { isHead: Boolean(formData.isHead) } : {}),
      securityHead1Id: formData.isHead ? null : cleanData.securityHead1Id || null,
      securityHead2Id: formData.isHead ? null : cleanData.securityHead2Id || null,
      faceImage: finalImageUrl || null,
    };

    if (type === 'add') {
      delete payload.id;
      if (accountMode === 'existing' && selectedUserId) {
        payload.userId = selectedUserId;
        payload.account = null;
      } else if (accountMode === 'new') {
        payload.userId = null;
        payload.account = {
          username: newAccount.username.trim(),
          password: newAccount.password,
          groupId: newAccount.groupId,
        };
      } else {
        payload.userId = null;
        payload.account = null;
      }
    } else if (type === 'edit') {
      delete payload.userId;
      delete payload.account;
    }

    Object.keys(payload).forEach((key) => {
      const val = payload[key];
      if (typeof val === 'string' && val.trim() === '') {
        payload[key] = null;
      }
    });

    try {
      if (type === 'edit') {
        await editSecurityMutation.mutateAsync(payload);
      } else {
        await addSecurityMutation.mutateAsync(payload);
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

  const processImage = (file: File) => {
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

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) processImage(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processImage(file);
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
      Add Security
    </Button>
  ));
  AddButton.displayName = 'AddButton';

  return (
    <>
      {type === 'edit' && (
        <Tooltip title="Edit Security">
          <EditButton />
        </Tooltip>
      )}

      {type === 'add' && (
        <Tooltip title="Add Security">
          <AddButton />
        </Tooltip>
      )}

      {!loading && (
        <Dialog open={open} onClose={handleClose} fullWidth maxWidth="lg">
          <DialogTitle>
            <Typography component="div" variant="h4" mb={2} mt={2} fontWeight={700}>
              {type === 'add' ? 'Add Security' : 'Edit Security'}
            </Typography>
            <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
            <Divider />
          </DialogTitle>
          <DialogContent>
            {activeStep === 0 && (
              <Grid container spacing={4} mt={1}>
                {/* Left Side: IDs and Card Details */}
                <Grid size={{ lg: 6, md: 12, sm: 12 }}>
                  <Typography variant="h6" fontWeight={600} mb={2}>
                    Employee Details
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
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

                  <CustomFormLabel htmlFor="identity-Id">Identity</CustomFormLabel>
                  <CustomTextField
                    id="identityId"
                    value={formData.identityId}
                    onChange={handleInputChange}
                    fullWidth
                    variant="outlined"
                  />

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

                  <Typography variant="h6" fontWeight={600} mb={2} mt={4}>
                    Card Details
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <CustomFormLabel htmlFor="card-number">Card Number</CustomFormLabel>
                  <CustomAutocomplete<{ label: string; id: string; bleCardNumber: string }>
                    label="Card Number"
                    options={cardOptions}
                    value={selectedCard}
                    onChange={(val) => {
                      const id = val?.id ?? '';
                      const number = val?.label ?? '';
                      setFormData((prev) => ({
                        ...prev,
                        cardId: id,
                        cardNumber: number,
                        bleCardNumber: val?.bleCardNumber || '',
                      }));
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

                  <CustomFormLabel htmlFor="ble-card-number">BLE Card Number</CustomFormLabel>
                  <Tooltip
                    title="This is automatically fetched from the selected card. It is used for BLE-based access control."
                    placement="top"
                  >
                    <CustomTextField
                      id="bleCardNumber"
                      value={formData.bleCardNumber}
                      onChange={handleInputChange}
                      fullWidth
                      variant="outlined"
                      error={!!formErrors.bleCardNumber}
                      helperText={formErrors.bleCardNumber}
                      disabled
                    />
                  </Tooltip>
                </Grid>

                {/* Right Side: Member Details */}
                <Grid size={{ lg: 6, md: 12, sm: 12 }}>
                  <Typography variant="h6" fontWeight={600} mb={2}>
                    Personal Information
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Grid container spacing={2}>
                    <Grid size={12}>
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
                    </Grid>
                    <Grid size={12}>
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
                    </Grid>
                    <Grid size={12}>
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
                    </Grid>
                    <Grid size={6}>
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
                    </Grid>
                    <Grid size={6}>
                      <CustomFormLabel htmlFor="birthDate">Birth Date</CustomFormLabel>
                      <CustomTextField
                        id="birthDate"
                        name="birthDate"
                        type="date"
                        value={formData.birthDate ? formData.birthDate.split('T')[0] : ''}
                        onChange={handleInputChange}
                        fullWidth
                        variant="outlined"
                        InputLabelProps={{
                          shrink: true,
                        }}
                      />
                    </Grid>
                    <Grid size={6}>
                      <CustomFormLabel htmlFor="status-employee">Status</CustomFormLabel>
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
                    <Grid size={6}>
                      <CustomFormLabel htmlFor="joinDate">Join Date</CustomFormLabel>
                      <CustomTextField
                        id="joinDate"
                        name="joinDate"
                        type="date"
                        value={formData.joinDate ? formData.joinDate.split('T')[0] : ''}
                        onChange={handleInputChange}
                        fullWidth
                        variant="outlined"
                        InputLabelProps={{
                          shrink: true,
                        }}
                      />
                    </Grid>
                    <Grid size={12}>
                      <CustomFormLabel htmlFor="Address">Address</CustomFormLabel>
                      <CustomTextField
                        id="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        fullWidth
                        variant="outlined"
                        multiline
                        rows={1}
                      />
                    </Grid>
                    {type === 'add' && (
                      <Grid size={12} sx={{ mt: 1 }}>
                        <FormControlLabel
                          control={
                            <CustomSwitch
                              id="isHead"
                              name="isHead"
                              checked={Boolean(formData.isHead)}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                const checked = e.target.checked;
                                setFormData((prev) => ({
                                  ...prev,
                                  isHead: checked,
                                  ...(checked ? { securityHead1Id: null, securityHead2Id: null } : {}),
                                }));
                                resetAccountInputs();
                              }}
                            />
                          }
                          label="Is Head Security Guard"
                        />
                      </Grid>
                    )}

                    {!formData.isHead && (
                      <Grid container spacing={2} size={12}>
                        <Grid size={6}>
                          <CustomFormLabel htmlFor="head-Member-1">Head Security 1</CustomFormLabel>
                          <CustomAutocomplete
                            label="Head Security 1"
                            options={filteredHead1Options}
                            value={
                              filteredHead1Options.find((h) => h.id === formData.securityHead1Id) || null
                            }
                            onChange={(val) => {
                              const id = val?.id ?? '';
                              setFormData((prev) => ({ ...prev, securityHead1Id: id }));
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
                        <Grid size={6}>
                          <CustomFormLabel htmlFor="head-Member-2">Head Security 2</CustomFormLabel>
                          <CustomAutocomplete
                            label="Head Security 2"
                            options={filteredHead2Options}
                            value={
                              filteredHead2Options.find((h) => h.id === formData.securityHead2Id) || null
                            }
                            onChange={(val) => {
                              const id = val?.id ?? '';
                              setFormData((prev) => ({ ...prev, securityHead2Id: id }));
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
                    )}
                  </Grid>
                </Grid>
              </Grid>
            )}

            {activeStep === 1 && (
              <Box sx={{ maxWidth: '600px', mx: 'auto', mt: 4 }}>
                <Typography variant="h5" fontWeight={700} mb={1} textAlign="center">
                  Security Photo
                </Typography>
                <Typography variant="body2" color="textSecondary" mb={3} textAlign="center">
                  Please upload a clear face image of the security guard.
                </Typography>

                <Box
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('face-image')?.click()}
                  sx={{
                    border: '2px dashed',
                    borderColor: isDragging
                      ? 'primary.main'
                      : formErrors.faceImage
                      ? 'error.main'
                      : '#e0e0e0',
                    borderRadius: '20px',
                    p: 4,
                    textAlign: 'center',
                    cursor: 'pointer',
                    backgroundColor: isDragging
                      ? 'primary.light'
                      : formErrors.faceImage
                      ? 'error.light'
                      : '#fafafa',
                    transition: 'all 0.3s ease',
                    position: 'relative',
                    '&:hover': {
                      borderColor: 'primary.main',
                      backgroundColor: '#f8fbff',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                    },
                  }}
                >
                  <input
                    type="file"
                    id="face-image"
                    accept="image/png, image/jpeg, image/jpg"
                    onChange={handleImageChange}
                    style={{ display: 'none' }}
                  />

                  {!preview ? (
                    <Box sx={{ py: 3 }}>
                      <Box
                        sx={{
                          width: 80,
                          height: 80,
                          borderRadius: '50%',
                          backgroundColor: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mx: 'auto',
                          mb: 2,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                        }}
                      >
                        <IconUpload size={40} stroke={1.5} style={{ color: '#5D87FF' }} />
                      </Box>
                      <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                        Drag and drop image here
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        or click to browse from your computer
                      </Typography>
                      <Box
                        sx={{
                          mt: 3,
                          pt: 2,
                          borderTop: '1px solid #eee',
                          display: 'flex',
                          justifyContent: 'center',
                          gap: 2,
                        }}
                      >
                        <Typography variant="caption" color="textSecondary">
                          PNG, JPG, JPEG
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          •
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          Max 5MB
                        </Typography>
                      </Box>
                    </Box>
                  ) : (
                    <Box sx={{ py: 1 }}>
                      <Box sx={{ position: 'relative', display: 'inline-block' }}>
                        <img
                          src={preview}
                          alt="Face Preview"
                          style={{
                            width: '100%',
                            maxWidth: '300px',
                            height: '300px',
                            objectFit: 'cover',
                            borderRadius: '16px',
                            boxShadow: '0 12px 30px rgba(0,0,0,0.15)',
                            border: '5px solid #fff',
                          }}
                        />
                        <IconButton
                          onClick={(e) => {
                            e.stopPropagation();
                            setImage(null);
                            setPreview(null);
                          }}
                          sx={{
                            position: 'absolute',
                            top: -12,
                            right: -12,
                            backgroundColor: '#FA896B',
                            color: '#fff',
                            '&:hover': { backgroundColor: '#f3704d' },
                            boxShadow: '0 4px 12px rgba(250, 137, 107, 0.4)',
                          }}
                          size="small"
                        >
                          <IconX size={20} />
                        </IconButton>
                      </Box>

                      <Box sx={{ mt: 3 }}>
                        <Typography
                          variant="subtitle2"
                          color={image ? 'primary' : 'textSecondary'}
                          fontWeight={700}
                        >
                          {image ? 'New image selected' : 'Current database image'}
                        </Typography>
                        <Button
                          variant="text"
                          size="small"
                          sx={{ mt: 1, fontWeight: 600 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            document.getElementById('face-image')?.click();
                          }}
                        >
                          Change Image
                        </Button>
                      </Box>
                    </Box>
                  )}
                </Box>
                {formErrors.faceImage && (
                  <FormHelperText error sx={{ mt: 2, textAlign: 'center', fontWeight: 600 }}>
                    {formErrors.faceImage}
                  </FormHelperText>
                )}
              </Box>
            )}
            {activeStep === 2 && type === 'add' && (
              <Box sx={{ maxWidth: '750px', mx: 'auto', mt: 3, mb: 2 }}>
                <Typography variant="h5" fontWeight={700} mb={1} textAlign="center">
                  Account Binding
                </Typography>
                <Typography variant="body2" color="textSecondary" mb={3} textAlign="center">
                  Bind this security guard to an existing user account, create a new user account, or skip for now.
                </Typography>

                <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2 }}>
                  <Typography variant="subtitle1" fontWeight={600} mb={1}>
                    Choose Binding Option
                  </Typography>
                  <RadioGroup
                    row
                    value={accountMode}
                    onChange={(e) => {
                      const mode = e.target.value as 'none' | 'existing' | 'new';
                      setAccountMode(mode);
                      setFormErrors((prev) => {
                        const next = { ...prev };
                        delete next.userId;
                        delete next.username;
                        delete next.password;
                        delete next.groupId;
                        return next;
                      });
                    }}
                  >
                    <FormControlLabel
                      value="none"
                      control={<Radio />}
                      label="No Account (Skip)"
                    />
                    <FormControlLabel
                      value="existing"
                      control={<Radio />}
                      label="Link Existing Account"
                    />
                    <FormControlLabel
                      value="new"
                      control={<Radio />}
                      label="Create New Account"
                    />
                  </RadioGroup>
                </Paper>

                {/* Option 1: Link Existing User Account */}
                {accountMode === 'existing' && (
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 3,
                      borderRadius: 2,
                      borderColor: 'primary.main',
                      backgroundColor: 'rgba(93, 135, 255, 0.02)',
                    }}
                  >
                    <Typography variant="h6" fontWeight={600} mb={1}>
                      Select Existing User Account
                    </Typography>
                    <Typography variant="body2" color="textSecondary" mb={2}>
                      Showing unlinked users with{' '}
                      <strong>{isHeadChecked ? 'PrimaryAdmin (Head)' : 'Primary'}</strong> priority.
                    </Typography>

                    <CustomAutocomplete
                      label="Select User Account"
                      options={filteredUnlinkedUsers.map((u: any) => ({
                        id: u.id,
                        label: `${u.username || u.fullName || 'User'} (${u.email || 'No Email'})`,
                        user: u,
                      }))}
                      value={
                        selectedUserId
                          ? {
                              id: selectedUserId,
                              label: (() => {
                                const found = filteredUnlinkedUsers.find((u: any) => u.id === selectedUserId);
                                return found
                                  ? `${found.username || found.fullName || 'User'} (${found.email || 'No Email'})`
                                  : '';
                              })(),
                              user: filteredUnlinkedUsers.find((u: any) => u.id === selectedUserId),
                            }
                          : null
                      }
                      onChange={(val: any) => {
                        setSelectedUserId(val?.id || null);
                        setFormErrors((prev) => {
                          const next = { ...prev };
                          delete next.userId;
                          return next;
                        });
                      }}
                      getOptionLabel={(o: any) => o.label}
                      isOptionEqualToValue={(a: any, b: any) => a.id === b.id}
                      renderOption={(props: any, option: any) => (
                        <li {...props} key={option.id}>
                          <Box display="flex" flexDirection="column" gap={0.5}>
                            <Box display="flex" alignItems="center" gap={1}>
                              <Typography variant="subtitle2" fontWeight={600}>
                                {option.user?.username || option.user?.fullName}
                              </Typography>
                              {option.user?.groupName && (
                                <Chip
                                  size="small"
                                  label={option.user.groupName}
                                  variant="outlined"
                                  color="primary"
                                  sx={{ height: 20, fontSize: '0.7rem' }}
                                />
                              )}
                              {option.user?.groupIsHead && (
                                <Chip
                                  size="small"
                                  label="Head"
                                  color="secondary"
                                  sx={{ height: 20, fontSize: '0.7rem' }}
                                />
                              )}
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                              Email: {option.user?.email || 'N/A'} • Group Level: {option.user?.groupLevel || 'N/A'}
                            </Typography>
                          </Box>
                        </li>
                      )}
                    />
                    {isLoadingUnlinked && (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        Loading unlinked users...
                      </Typography>
                    )}
                    {formErrors.userId && (
                      <FormHelperText error sx={{ mt: 1 }}>
                        {formErrors.userId}
                      </FormHelperText>
                    )}
                  </Paper>
                )}

                {/* Option 2: Create New Account */}
                {accountMode === 'new' && (
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 3,
                      borderRadius: 2,
                      borderColor: 'primary.main',
                      backgroundColor: 'rgba(93, 135, 255, 0.02)',
                    }}
                  >
                    <Typography variant="h6" fontWeight={600} mb={1}>
                      Create New Account Details
                    </Typography>
                    <Typography variant="body2" color="textSecondary" mb={2}>
                      Fill in credentials and assign to an appropriate user group.
                    </Typography>

                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <CustomFormLabel htmlFor="new-username" sx={{ mt: 0 }}>Username *</CustomFormLabel>
                        <CustomTextField
                          id="new-username"
                          fullWidth
                          value={newAccount.username}
                          onChange={(e: any) => {
                            setNewAccount((prev) => ({ ...prev, username: e.target.value }));
                            setFormErrors((prev) => {
                              const next = { ...prev };
                              delete next.username;
                              return next;
                            });
                          }}
                          placeholder="e.g. sec23"
                          error={!!formErrors.username}
                          helperText={formErrors.username}
                        />
                      </Grid>

                      <Grid size={{ xs: 12, sm: 6 }}>
                        <CustomFormLabel htmlFor="new-password" sx={{ mt: 0 }}>Password *</CustomFormLabel>
                        <CustomTextField
                          id="new-password"
                          type={showPassword ? 'text' : 'password'}
                          fullWidth
                          value={newAccount.password}
                          onChange={(e: any) => {
                            setNewAccount((prev) => ({ ...prev, password: e.target.value }));
                            setFormErrors((prev) => {
                              const next = { ...prev };
                              delete next.password;
                              return next;
                            });
                          }}
                          placeholder="Enter password"
                          error={!!formErrors.password}
                          helperText={formErrors.password}
                          InputProps={{
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton
                                  aria-label="toggle password visibility"
                                  onClick={() => setShowPassword((prev) => !prev)}
                                  edge="end"
                                  size="small"
                                >
                                  {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                                </IconButton>
                              </InputAdornment>
                            ),
                          }}
                        />
                      </Grid>

                      <Grid size={12}>
                        <CustomFormLabel htmlFor="new-group" sx={{ mt: 0 }}>User Group *</CustomFormLabel>
                        <CustomAutocomplete
                          label="Select User Group"
                          options={filteredUserGroups.map((g: any) => ({
                            id: g.id,
                            label: g.name,
                            group: g,
                          }))}
                          value={
                            filteredUserGroups
                              .map((g: any) => ({ id: g.id, label: g.name, group: g }))
                              .find((opt) => opt.id === newAccount.groupId) || null
                          }
                          onChange={(val: any) => {
                            setNewAccount((prev) => ({ ...prev, groupId: val?.id || '' }));
                            setFormErrors((prev) => {
                              const next = { ...prev };
                              delete next.groupId;
                              return next;
                            });
                          }}
                          getOptionLabel={(o: any) => o.label}
                          isOptionEqualToValue={(a: any, b: any) => a.id === b.id}
                          renderOption={(props: any, option: any) => {
                            const group = option.group;
                            const buildingNames =
                              group?.accessibleBuildings && group.accessibleBuildings.length > 0
                                ? group.accessibleBuildings.map((b: any) => b.name).filter(Boolean).join(', ')
                                : 'n/a';

                            return (
                              <li {...props} key={option.id}>
                                <Box display="flex" flexDirection="column" gap={0.5} width="100%">
                                  <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
                                    <Typography variant="subtitle2" fontWeight={600}>
                                      {group.name}
                                    </Typography>
                                    <Box display="flex" gap={0.5}>
                                      <Chip
                                        size="small"
                                        label={group.levelPriority}
                                        color={group.levelPriority === 'PrimaryAdmin' ? 'secondary' : 'default'}
                                        sx={{ height: 20, fontSize: '0.7rem' }}
                                      />
                                      {group.isHead && (
                                        <Chip
                                          size="small"
                                          label="Head Group"
                                          color="info"
                                          sx={{ height: 20, fontSize: '0.7rem' }}
                                        />
                                      )}
                                    </Box>
                                  </Box>
                                  <Typography variant="caption" color="text.secondary">
                                    Accessible Buildings: <strong>{buildingNames || 'n/a'}</strong>
                                  </Typography>
                                </Box>
                              </li>
                            );
                          }}
                        />
                        {isLoadingGroups && (
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                            Loading user groups...
                          </Typography>
                        )}
                        {formErrors.groupId && (
                          <FormHelperText error sx={{ mt: 1 }}>
                            {formErrors.groupId}
                          </FormHelperText>
                        )}
                      </Grid>
                    </Grid>
                  </Paper>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ display: 'flex', justifyContent: 'space-between', px: 3, pb: 3 }}>
            <Box>
              {activeStep === 0 ? (
                <Button
                  onClick={handleClose}
                  variant="outlined"
                  color="inherit"
                  sx={{ fontSize: '1rem', py: 1, px: 3 }}
                >
                  Cancel
                </Button>
              ) : (
                <Button
                  onClick={() => setActiveStep((prev) => Math.max(0, prev - 1))}
                  variant="outlined"
                  sx={{ fontSize: '1rem', py: 1, px: 3 }}
                >
                  Back
                </Button>
              )}
            </Box>
            <Box>
              {type === 'add' ? (
                activeStep < 2 ? (
                  <Button
                    onClick={() => {
                      if (validateStep(activeStep)) {
                        setActiveStep((prev) => prev + 1);
                      } else {
                        toast.error('Please fill all required fields correctly.');
                      }
                    }}
                    variant="contained"
                    color="primary"
                    sx={{ fontSize: '1rem', py: 1, px: 3 }}
                  >
                    Next
                  </Button>
                ) : (
                  <Button
                    onClick={handleSave}
                    variant="contained"
                    color="success"
                    sx={{ fontSize: '1rem', py: 1, px: 3 }}
                    disabled={isSaving}
                  >
                    {isSaving ? <CircularProgress size={20} color="inherit" /> : 'Save Security'}
                  </Button>
                )
              ) : (
                /* Edit Mode (2 steps) */
                activeStep === 0 ? (
                  <Button
                    onClick={() => {
                      if (validateStep(0)) setActiveStep(1);
                      else toast.error('Please fill all required fields correctly.');
                    }}
                    variant="contained"
                    color="primary"
                    sx={{ fontSize: '1rem', py: 1, px: 3 }}
                  >
                    Next
                  </Button>
                ) : (
                  <Button
                    onClick={handleSave}
                    variant="contained"
                    color="success"
                    sx={{ fontSize: '1rem', py: 1, px: 3 }}
                    disabled={isSaving}
                  >
                    {isSaving ? <CircularProgress size={20} color="inherit" /> : 'Save Security'}
                  </Button>
                )
              )}
            </Box>
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

export default AddEditSecurityGuard;
