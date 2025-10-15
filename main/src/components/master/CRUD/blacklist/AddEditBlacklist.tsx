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
  Tooltip,
  Typography,
  CircularProgress,
  Autocomplete,
  TextField,
  Switch,
  FormControlLabel,
} from '@mui/material';
import { IconPencil, IconPlus } from '@tabler/icons-react';
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import { AppDispatch, RootState, useDispatch, useSelector } from 'src/store/Store';
import {
  blacklistType,
  addBlacklist,
  editBlacklist,
  fetchBlacklistDT,
} from 'src/store/apps/crud/blacklist';
import { fetchMaskedAreaDT } from 'src/store/apps/crud/maskedArea';
import { fetchMembers } from 'src/store/apps/crud/member';
import { fetchVisitor } from 'src/store/apps/crud/visitor';
import { defaultBlaclistForm, defaultMaskedAreaFilter } from 'src/store/apps/defaultForm';

interface FormType {
  type?: string;
  blacklist?: blacklistType;
}

const AddEditBlacklist = ({ type, blacklist }: FormType) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [useMember, setUseMember] = useState(false); // 🔥 switch between Visitor and Member
  const [formData, setFormData] = useState<blacklistType>({
    ...defaultBlaclistForm,
    ...blacklist,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const blacklistFilter = useSelector((state: RootState) => state.blacklistReducer.blacklistFilter);
  const visitorData = useSelector((state: RootState) => state.visitorReducer.visitorAll);
  const memberData = useSelector((state: RootState) => state.memberReducer.memberAll);
  const maskedAreaData = useSelector((state: RootState) => state.maskedAreaReducer.maskedAreas);
  const isLoading = useSelector((state: RootState) => state.blacklistReducer.isLoading);

  const dispatch: AppDispatch = useDispatch();

  useEffect(() => {
    dispatch(fetchVisitor());
    dispatch(fetchMembers());
    dispatch(fetchMaskedAreaDT({ ...defaultMaskedAreaFilter, filters: { RestrictedStatus: 1 } }));
  }, [dispatch]);

  const visitorOptions = (visitorData ?? []).map((v) => ({ id: v.id, name: v.name }));
  const memberOptions = (memberData ?? []).map((m) => ({ id: m.id, name: m.name }));
  const areaOptions = (maskedAreaData ?? []).map((a) => ({ id: a.id, name: a.name }));

  const handleClickOpen = () => {
    setLoading(true);
    setFormErrors({});
    if (type === 'edit' && blacklist) {
      if (!blacklist.id) {
        dispatch(fetchBlacklistDT(blacklistFilter));
      }
      setFormData({
        ...defaultBlaclistForm,
        ...blacklist,
      });
    } else {
      setFormData({ ...defaultBlaclistForm });
    }
    setTimeout(() => {
      setLoading(false);
      setOpen(true);
    }, 100);
  };

  const handleClose = () => setOpen(false);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (useMember) {
      if (!formData.memberId?.trim()) errors.memberId = 'Member is required';
    } else {
      if (!formData.visitorId?.trim()) errors.visitorId = 'Visitor is required';
    }

    if (!formData.floorplanMaskedAreaId?.trim())
      errors.floorplanMaskedAreaId = 'Floorplan Masked Area is required';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast.error('Please fill in all required fields correctly.');
      return;
    }

    setIsSaving(true);
    const data = new FormData();

    Object.entries(formData).forEach(([key, value]) => {
      if (!['createdBy', 'createdAt', 'updatedBy', 'updatedAt'].includes(key)) {
        data.append(key, value?.toString() ?? '');
      }
    });

    try {
      let result;
      if (type === 'edit') result = await dispatch(editBlacklist(data));
      if (type === 'add') result = await dispatch(addBlacklist(data));

      if (result?.type?.endsWith('/fulfilled')) {
        await dispatch(fetchBlacklistDT(blacklistFilter));
        toast.success('Data Saved');
        handleClose();
      } else toast.error('Saving Data Unsuccessful');
    } catch (error) {
      toast.error('Saving Data Unsuccessful');
      console.error('Error saving blacklist:', error);
    }

    setTimeout(() => setIsSaving(false), 1000);
  };

  const handleSwitchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
    setUseMember(checked);

    // 🔥 Clear both selections when switching
    setFormData((prev) => ({
      ...prev,
      visitorId: '',
      memberId: '',
    }));
    setFormErrors({});
  };

  return (
    <>
      {type === 'edit' && (
        <Tooltip title="Edit Blacklist">
          <IconButton color="primary" size="small" onClick={handleClickOpen}>
            <IconPencil size={20} />
          </IconButton>
        </Tooltip>
      )}

      {type === 'add' && (
        <Tooltip title="Add Blacklist">
          {isLoading ? (
            <Button variant="contained" color="primary" sx={{ p: 0.5, minWidth: 40, minHeight: 40 }}>
              <CircularProgress color="inherit" size={20} />
            </Button>
          ) : (
            <Button
              variant="contained"
              color="primary"
              sx={{ p: 0.5, minWidth: 40, minHeight: 40 }}
              onClick={handleClickOpen}
            >
              <IconPlus size={20} />
            </Button>
          )}
        </Tooltip>
      )}

      {!loading && (
        <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
          <DialogTitle>
            <Typography component="div" variant="h4" mb={2} mt={2} fontWeight={700}>
              {type === 'add' ? 'Add Blacklist' : 'Edit Blacklist'}
            </Typography>
            <Divider />
          </DialogTitle>
          <DialogContent>
            <Typography variant="h6" fontWeight={600} mb={2} mt={2}>
              Blacklist Details
            </Typography>
            <Divider />

            <FormControlLabel
              control={
                <Switch checked={useMember} onChange={handleSwitchChange} color="primary" />
              }
              label={useMember ? 'Select Member' : 'Select Visitor'}
              sx={{ mt: 2 }}
            />

            <Grid container spacing={5} mb={3} mt={2}>
              <Grid size={{ lg: 6, md: 12, sm: 12 }}>
                {/* 🔄 Conditionally render either Visitor or Member Autocomplete */}
                {!useMember ? (
                  <>
                    <CustomFormLabel htmlFor="visitorId">Visitor</CustomFormLabel>
                    <Autocomplete
                      options={visitorOptions}
                      disableClearable={false}
                      clearOnEscape
                      sx={{ m: 0 }}
                      value={visitorOptions.find((o) => o.id === formData.visitorId) ?? null}
                      onChange={(_, newVal) => {
                        const id = newVal?.id ?? '';
                        setFormData((prev) => ({ ...prev, visitorId: id }));
                        setFormErrors((prev) => {
                          const next = { ...prev };
                          delete next.visitorId;
                          return next;
                        });
                      }}
                      isOptionEqualToValue={(opt, val) => opt.id === val.id}
                      getOptionLabel={(opt) => (typeof opt === 'string' ? opt : opt.name)}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          id="visitorId"
                          variant="outlined"
                          required
                          error={!!formErrors.visitorId}
                          helperText={formErrors.visitorId || ''}
                        />
                      )}
                    />
                  </>
                ) : (
                  <>
                    <CustomFormLabel htmlFor="memberId">Member</CustomFormLabel>
                    <Autocomplete
                      options={memberOptions}
                      disableClearable={false}
                      clearOnEscape
                      sx={{ m: 0 }}
                      value={memberOptions.find((o) => o.id === formData.memberId) ?? null}
                      onChange={(_, newVal) => {
                        const id = newVal?.id ?? '';
                        setFormData((prev) => ({ ...prev, memberId: id }));
                        setFormErrors((prev) => {
                          const next = { ...prev };
                          delete next.memberId;
                          return next;
                        });
                      }}
                      isOptionEqualToValue={(opt, val) => opt.id === val.id}
                      getOptionLabel={(opt) => (typeof opt === 'string' ? opt : opt.name)}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          id="memberId"
                          variant="outlined"
                          required
                          error={!!formErrors.memberId}
                          helperText={formErrors.memberId || ''}
                        />
                      )}
                    />
                  </>
                )}

                <CustomFormLabel htmlFor="floorplanMaskedAreaId">Area</CustomFormLabel>
                <Autocomplete
                  options={areaOptions}
                  disableClearable={false}
                  clearOnEscape
                  sx={{ m: 0 }}
                  value={areaOptions.find((o) => o.id === formData.floorplanMaskedAreaId) ?? null}
                  onChange={(_, newVal) => {
                    const id = newVal?.id ?? '';
                    setFormData((prev) => ({ ...prev, floorplanMaskedAreaId: id }));
                    setFormErrors((prev) => {
                      const next = { ...prev };
                      delete next.floorplanMaskedAreaId;
                      return next;
                    });
                  }}
                  isOptionEqualToValue={(opt, val) => opt.id === val.id}
                  getOptionLabel={(opt) => (typeof opt === 'string' ? opt : opt.name)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      id="floorplanMaskedAreaId"
                      variant="outlined"
                      required
                      error={!!formErrors.floorplanMaskedAreaId}
                      helperText={formErrors.floorplanMaskedAreaId || ''}
                    />
                  )}
                />
              </Grid>
            </Grid>
          </DialogContent>

          <DialogActions sx={{ display: 'flex', justifyContent: 'space-between', px: 3, pb: 2 }}>
            <Button onClick={handleClose} variant="outlined" sx={{ fontSize: '1rem', py: 1, px: 3 }}>
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
    </>
  );
};

export default AddEditBlacklist;
