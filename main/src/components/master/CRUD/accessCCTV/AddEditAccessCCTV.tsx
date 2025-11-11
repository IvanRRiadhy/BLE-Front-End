import React from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid2 as Grid,
  Typography,
  Tooltip,
  CircularProgress,
  Box,
  IconButton,
} from '@mui/material';
import { IconPencil, IconPlus } from '@tabler/icons-react';
import toast from 'react-hot-toast';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { CCTVType } from 'src/hooks/useCCTV';
import { defaultAccessCCTVForm } from 'src/store/apps/defaultForm';
import { useAddCCTV, useEditCCTV } from 'src/hooks/useCCTV';
import { useSelector } from 'src/store/Store';
import { useQueryClient } from '@tanstack/react-query';
import type { PaginatedResponse } from 'src/hooks/useCCTV';

interface FormType {
  type?: 'add' | 'edit';
  cctv?: CCTVType;
}

const AddEditAccessCCTV = ({ type, cctv }: FormType) => {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [formData, setFormData] = React.useState<CCTVType>({
    ...defaultAccessCCTVForm,
    ...cctv,
  });
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({});

  const CCTVFilter = useSelector((state) => state.CCTVReducer?.cctvFilter);
  const queryClient = useQueryClient();
  const addMutation = useAddCCTV();
  const editMutation = useEditCCTV();

  const handleClickOpen = async () => {
    setLoading(true);
    setFormErrors({});
    if (type === 'edit' && cctv) {
      setFormData({ ...defaultAccessCCTVForm, ...cctv });
    } else {
      setFormData({ ...defaultAccessCCTVForm });
    }
    setTimeout(() => {
      setLoading(false);
      setOpen(true);
    }, 150);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.name?.trim()) errors.name = 'CCTV Name is required';
    if (!formData.rtsp?.trim()) errors.rtsp = 'CCTV RTSP URL is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast.error('Please fill in all required fields correctly.');
      return;
    }
    setIsSaving(true);

    try {
      let result: any;
      if (type === 'edit') {
        result = await editMutation.mutateAsync(formData);
        // ✅ update cache manually (optimistic update)
        queryClient.setQueryData<PaginatedResponse<CCTVType>>(
          ['cctv-list', CCTVFilter],
          (oldCache) => {
            if (!oldCache) return oldCache;
            const updated = oldCache.data.map((x) =>
              x.id === formData.id ? { ...x, ...formData } : x
            );
            return { ...oldCache, data: updated };
          }
        );
      } else {
        result = await addMutation.mutateAsync(formData);
        // ✅ append to cache
        queryClient.setQueryData<PaginatedResponse<CCTVType>>(
          ['cctv-list', CCTVFilter],
          (oldCache) => {
            if (!oldCache) return oldCache;
            return { ...oldCache, data: [...oldCache.data, result] };
          }
        );
      }

      toast.success('Data saved successfully!');
      handleClose();
    } catch (error) {
      console.error('Error saving CCTV:', error);
      toast.error('Saving data failed.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  return (
    <>
      {/* --- Edit Button --- */}
      {type === 'edit' && (
        <Tooltip title="Edit CCTV">
          <IconButton color="primary" size="small" onClick={handleClickOpen}>
            <IconPencil size={20} />
          </IconButton>
        </Tooltip>
      )}

      {/* --- Add Button --- */}
      {type === 'add' && (
        <Tooltip title="Add Access CCTV">
          <Button
            variant="contained"
            color="primary"
            sx={{ p: 0.5, minWidth: 40, minHeight: 40 }}
            onClick={handleClickOpen}
          >
            {isSaving ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              <IconPlus size={20} />
            )}
          </Button>
        </Tooltip>
      )}

      {/* --- Dialog Form --- */}
      {!loading && (
        <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
          <DialogTitle>
            <Typography variant="h4" mb={2} mt={2} fontWeight={700}>
              {type === 'add' ? 'Add CCTV' : 'Edit CCTV'}
            </Typography>
            <Divider />
          </DialogTitle>

          <DialogContent>
            <Grid container spacing={5} mb={3}>
              <Grid size={{ lg: 6, md: 12, sm: 12 }}>
                <CustomFormLabel htmlFor="name">CCTV Name</CustomFormLabel>
                <CustomTextField
                  id="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                  required
                  error={!!formErrors.name}
                  helperText={formErrors.name}
                />
              </Grid>

              <Grid size={{ lg: 6, md: 12, sm: 12 }}>
                <CustomFormLabel htmlFor="rtsp">RTSP URL</CustomFormLabel>
                <CustomTextField
                  id="rtsp"
                  value={formData.rtsp}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                  required
                  error={!!formErrors.rtsp}
                  helperText={formErrors.rtsp}
                />
              </Grid>
            </Grid>
          </DialogContent>

          <DialogActions
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              px: 3,
              pb: 2,
            }}
          >
            <Button onClick={handleClose} variant="outlined">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              variant="contained"
              disabled={isSaving}
            >
              {isSaving ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                'Save'
              )}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* --- Loading Dialog --- */}
      {loading && (
        <Dialog open={open} fullWidth maxWidth="sm">
          <DialogContent sx={{ textAlign: 'center', py: 10 }}>
            <Typography variant="h5" mb={5}>
              Loading...
            </Typography>
            <CircularProgress size={50} color="primary" />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default AddEditAccessCCTV;
