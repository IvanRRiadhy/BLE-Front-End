import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid2 as Grid,
  IconButton,
  Tooltip,
  Typography,
  CircularProgress,
  Autocomplete,
  TextField,
  Box,
  FormHelperText,
  Stack,
  Card,
} from '@mui/material';
import { IconInfoCircle, IconPencil, IconPlus, IconUserCheck } from '@tabler/icons-react';
import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { defaultPatrolAssignForm } from 'src/store/apps/defaultForm';
import { PatrolRouteType, PatrolAssignType, SecurityType } from 'src/store/apps/crud/patrolRoute';
import { useEditPatrolAssign, usePatrolAssign } from 'src/hooks/usePatrolRoute';
import { useAllSecurityLookup } from 'src/hooks/useSecurityGuard';
import dayjs, { Dayjs } from 'dayjs';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

interface FormType {
  type?: 'add' | 'edit';
  patrolRouteId: string;
  patrolAssign?: PatrolAssignType;
}

const COLUMNS = 5;

const AssignPatrol = ({ patrolRouteId, type, patrolAssign }: FormType) => {
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<PatrolAssignType>({
    ...defaultPatrolAssignForm,
    ...patrolAssign,
    patrolRouteId: patrolRouteId,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [startTime, setStartTime] = useState<Dayjs | null>(
    formData.startDate ? dayjs(formData.startDate) : null,
  );

  const [endTime, setEndTime] = useState<Dayjs | null>(
    formData.endDate ? dayjs(formData.endDate) : null,
  );

  const { data: securityData = [], isLoading: securityLoading } = useAllSecurityLookup();
  const securityOptions: SecurityType[] = useMemo(() => {
    return securityData.map((m) => ({
      id: m.id,
      name: m.name,
      cardNumber: m.cardNumber,
      identityId: m.identityId,

      organizationName: m.organization?.name ?? '',
      departmentName: m.department?.name ?? '',
      districtName: m.district?.name ?? '',
    }));
  }, [securityData]);

  //Hooks
  const addMutation = usePatrolAssign();
  const editMutation = useEditPatrolAssign();

  const handleClickOpen = () => {
    setFormErrors({});
    if (type === 'edit' && patrolAssign) {
      setFormData({ ...defaultPatrolAssignForm, ...patrolAssign });
    } else {
      setFormData({ ...defaultPatrolAssignForm, patrolRouteId: patrolRouteId });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleInputChange = (
    e:
      | React.ChangeEvent<HTMLInputElement>
      | { target: { id?: string; name?: string; value: string } },
  ) => {
    const { id, name, value } = e.target;
    const key = (id || name) as keyof typeof formData; // ✅ explicitly assert string key
    if (!key) return; // safeguard

    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  useEffect(() => {
    if (!startTime) return;

    setFormData((prev) => ({
      ...prev,
      startDate: startTime.hour(0).minute(0).second(0).millisecond(0).toISOString(),
    }));
  }, [startTime]);

  useEffect(() => {
    if (!endTime) return;

    setFormData((prev) => ({
      ...prev,
      endDate: endTime.hour(23).minute(59).second(59).millisecond(999).toISOString(),
    }));
  }, [endTime]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.name?.trim()) {
      errors.name = 'Patrol Assignment Name is required';
    }

    if (!formData.patrolRouteId) {
      errors.patrolRouteId = 'Patrol Route is required';
    }

    if (!formData.securityIds || formData.securityIds.length === 0) {
      errors.securityIds = 'At least one security guard is required';
    }
    if (!formData.startDate) {
      errors.startDate = 'Start time is required';
    }

    if (!formData.endDate) {
      errors.endDate = 'End time is required';
    }
    if (
      formData.startDate &&
      formData.endDate &&
      new Date(formData.endDate) <= new Date(formData.startDate)
    ) {
      errors.endDate = 'End time must be after start time';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  const handleSave = async () => {
    if (!validateForm()) {
      toast.error('Please complete all required fields');
      return;
    }

    setIsSaving(true);

    try {
      const payload: Partial<PatrolAssignType> = {
        ...formData,
        patrolRouteId,
        securityIds: formData.securityIds,
      };

      if (type === 'edit' && formData.id) {
        await editMutation.mutateAsync(payload);
        toast.success('Patrol assignment updated successfully');
      } else {
        await addMutation.mutateAsync(payload);
        toast.success('Patrol assignment created successfully');
      }

      setOpen(false);
    } catch (error: any) {
      console.error('Error saving patrol assignment:', error);
      toast.error(error?.response?.data?.message || 'Failed to save patrol assignment');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      {type === 'edit' && (
        <Tooltip title="Edit Assignment">
          <IconButton color="primary" size="small" onClick={handleClickOpen}>
            <IconPencil size={20} />
          </IconButton>
        </Tooltip>
      )}
      {type === 'add' && (
        <Tooltip title="Assign Patrol Route">
          <IconButton color="success" size="small" onClick={handleClickOpen}>
            <IconUserCheck size={20} />
          </IconButton>
        </Tooltip>
      )}
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle>
          {type === 'add' ? 'Assign Patrol Route' : 'Edit Patrol Assignment'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            {/* <Grid size={6} display="flex" flexDirection="column">
              <Stack spacing={1} flex={1}>
                <CustomFormLabel>Patrol Assignment Name</CustomFormLabel>
                <CustomTextField
                  id="name"
                  name="name"
                  fullWidth
                  value={formData.name}
                  onChange={handleInputChange}
                  error={!!formErrors.name}
                  helperText={formErrors.name}
                />

                <CustomFormLabel>Security Guard</CustomFormLabel>
                <Autocomplete
                  multiple
                  id="securityIds"
                  options={securityOptions}
                  loading={securityLoading}
                  disableCloseOnSelect
                  getOptionLabel={(option: SecurityType) => option.name}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  // 🔑 map string[] -> SecurityType[]
                  value={securityOptions.filter((sec) => formData.securityIds?.includes(sec.id))}
                  // 🔁 map SecurityType[] -> string[]
                  onChange={(_, newValue) => {
                    setFormData((prev) => ({
                      ...prev,
                      securityIds: newValue.map((sec) => sec.id),
                    }));
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="Select security guard(s)"
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {securityLoading && <CircularProgress size={18} sx={{ mr: 1 }} />}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                />
              </Stack>
            </Grid>
            <Grid size={6} display="flex" flexDirection="column">
              <CustomFormLabel
                sx={{
                  minHeight: 24,
                  display: 'flex',
                  alignItems: 'flex-end',
                }}
              >
                Patrol Assignment Description
              </CustomFormLabel>

              <CustomTextField
                id="description"
                name="description"
                multiline
                fullWidth
                value={formData.description}
                onChange={handleInputChange}
                sx={{
                  flex: 1,
                  '& .MuiInputBase-root': {
                    height: '100%',
                    alignItems: 'flex-start',
                  },
                }}
              />
            </Grid> */}
            <Grid container spacing={2} alignItems="stretch">
              {/* LABEL ROW */}
              <Grid size={6}>
                <CustomFormLabel>Patrol Assignment Name</CustomFormLabel>
              </Grid>
              <Grid size={6}>
                <CustomFormLabel>Patrol Assignment Description</CustomFormLabel>
              </Grid>

              {/* INPUT ROW */}
              <Grid size={6} display="flex" flexDirection="column">
                <CustomTextField
                  id="name"
                  name="name"
                  fullWidth
                  value={formData.name}
                  onChange={handleInputChange}
                  error={!!formErrors.name}
                  helperText={formErrors.name}
                />

                <CustomFormLabel sx={{ mt: 2 }}>Security Guard</CustomFormLabel>
                <Autocomplete
                  multiple
                  id="securityIds"
                  options={securityOptions}
                  loading={securityLoading}
                  disableCloseOnSelect
                  getOptionLabel={(option: SecurityType) => option.name}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  // 🔑 map string[] -> SecurityType[]
                  value={securityOptions.filter((sec) => formData.securityIds?.includes(sec.id))}
                  // 🔁 map SecurityType[] -> string[]
                  onChange={(_, newValue) => {
                    setFormData((prev) => ({
                      ...prev,
                      securityIds: newValue.map((sec) => sec.id),
                    }));
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="Select security guard(s)"
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {securityLoading && <CircularProgress size={18} sx={{ mr: 1 }} />}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                />
              </Grid>

              <Grid size={6} display="flex" flexDirection="column">
                <CustomTextField
                  id="description"
                  name="description"
                  multiline
                  fullWidth
                  value={formData.description}
                  onChange={handleInputChange}
                  sx={{
                    flex: 1,
                    '& .MuiInputBase-root': {
                      height: '100%',
                      alignItems: 'flex-start',
                    },
                  }}
                />
              </Grid>
            </Grid>
            <Grid container size={12} spacing={2} mt={0}>
              <Grid size={12}>
                <CustomFormLabel>Patrol Time</CustomFormLabel>
              </Grid>

              <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="id">
                {/* Start Time */}
                <Grid size={6}>
                  <DatePicker
                    label="Start Date"
                    value={startTime}
                    onChange={setStartTime}
                    format="ddd, DD - MMM - YYYY"
                    slotProps={{
                      textField: {
                        fullWidth: true,
                      },
                    }}
                  />
                </Grid>

                {/* End Time */}
                <Grid size={6}>
                  <DatePicker
                    label="End Date"
                    value={endTime}
                    onChange={setEndTime}
                    format="ddd, DD - MMM - YYYY"
                    minDate={startTime ?? undefined}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                      },
                    }}
                  />
                </Grid>
              </LocalizationProvider>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" color="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSave}
            disabled={isSaving || addMutation.isPending || editMutation.isPending}
          >
            {isSaving || addMutation.isPending || editMutation.isPending ? (
              <CircularProgress size={20} color="inherit" />
            ) : type === 'edit' ? (
              'Update Assignment'
            ) : (
              'Assign'
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AssignPatrol;
