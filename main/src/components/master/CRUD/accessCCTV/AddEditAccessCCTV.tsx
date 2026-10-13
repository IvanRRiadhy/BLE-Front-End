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
  Stack,
  Chip,
} from '@mui/material';
import { IconPencil, IconPlus, IconVideo, IconPlayerPlay, IconPlayerStop } from '@tabler/icons-react';
import toast from 'react-hot-toast';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { CCTVType } from 'src/hooks/useCCTV';
import { defaultAccessCCTVForm } from 'src/store/apps/defaultForm';
import { useAddCCTV, useEditCCTV } from 'src/hooks/useCCTV';
import { useSelector } from 'src/store/Store';
import { useQueryClient } from '@tanstack/react-query';
import type { PaginatedResponse } from 'src/hooks/useCCTV';
import UniversalVideoPlayer from 'src/utils/UniversalPlayer';

interface FormType {
  type?: 'add' | 'edit';
  cctv?: CCTVType;
  trigger?: (onClick: () => void) => React.ReactNode;
}

const isValidRtsp = (url?: string): boolean => {
  if (!url) return false;
  const trimmed = url.trim();
  // Check if it starts with rtsp:// or rtsps:// and has a host
  return /^rtsps?:\/\/[^\s$.?#].[^\s]*$/i.test(trimmed);
};

const AddEditAccessCCTV = ({ type, cctv, trigger }: FormType) => {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [formData, setFormData] = React.useState<CCTVType>({
    ...defaultAccessCCTVForm,
    ...cctv,
  });
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({});
  const [previewStreamUrl, setPreviewStreamUrl] = React.useState<string | null>(null);

  const CCTVFilter = useSelector((state) => state.CCTVReducer?.cctvFilter);
  const queryClient = useQueryClient();
  const addMutation = useAddCCTV();
  const editMutation = useEditCCTV();

  const isRtspValid = isValidRtsp(formData.rtsp);

  const handleClickOpen = async () => {
    setLoading(true);
    setFormErrors({});
    setPreviewStreamUrl(null);
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
    setPreviewStreamUrl(null);
    setOpen(false);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.name?.trim()) errors.name = 'CCTV Name is required';
    if (!formData.rtsp?.trim()) {
      errors.rtsp = 'CCTV RTSP URL is required';
    } else if (!isValidRtsp(formData.rtsp)) {
      errors.rtsp = 'Please enter a valid RTSP URL (e.g. rtsp://192.168.1.100:554/stream)';
    }
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
    if (id === 'rtsp' && previewStreamUrl && previewStreamUrl !== value.trim()) {
      setPreviewStreamUrl(null);
    }
  };

  const handleTogglePreview = () => {
    if (previewStreamUrl) {
      setPreviewStreamUrl(null);
    } else {
      if (isRtspValid) {
        setPreviewStreamUrl(formData.rtsp?.trim() || null);
      }
    }
  };

  return (
    <>
      {/* --- Custom/Edit/Add Button --- */}
      {trigger ? (
        trigger(handleClickOpen)
      ) : type === 'edit' ? (
        <Tooltip title="Edit CCTV">
          <IconButton color="primary" size="small" onClick={handleClickOpen}>
            <IconPencil size={20} />
          </IconButton>
        </Tooltip>
      ) : type === 'add' ? (
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
      ) : null}

      {/* --- Dialog Form --- */}
      {!loading && (
        <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
          <DialogTitle>
            <Typography variant="h4" mb={2} mt={2} fontWeight={700}>
              {type === 'add' ? 'Add CCTV' : 'Edit CCTV'}
            </Typography>
            <Divider />
          </DialogTitle>

          <DialogContent>
            <Grid container spacing={3} mb={3}>
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
                  placeholder="rtsp://192.168.1.156:8080/h264_ulaw.sdp"
                  value={formData.rtsp}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                  required
                  error={!!formErrors.rtsp}
                  helperText={formErrors.rtsp || (formData.rtsp && !isRtspValid ? 'URL must start with rtsp:// or rtsps://' : '')}
                />
              </Grid>

              {/* --- Preview Section --- */}
              <Grid size={12}>
                <Box
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                    p: 2,
                    backgroundColor: (theme) =>
                      theme.palette.mode === 'dark' ? 'background.default' : 'grey.50',
                  }}
                >
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    flexWrap="wrap"
                    gap={1}
                    mb={1.5}
                  >
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <IconVideo size={20} />
                      <Typography variant="h6" fontWeight={600}>
                        Live RTSP Stream Preview
                      </Typography>
                      {formData.rtsp && (
                        <Chip
                          label={isRtspValid ? 'Valid RTSP' : 'Invalid RTSP'}
                          size="small"
                          color={isRtspValid ? 'success' : 'error'}
                          variant="outlined"
                        />
                      )}
                    </Stack>

                    <Button
                      variant={previewStreamUrl ? 'outlined' : 'contained'}
                      color={previewStreamUrl ? 'error' : 'primary'}
                      size="small"
                      disabled={!isRtspValid}
                      startIcon={previewStreamUrl ? <IconPlayerStop size={18} /> : <IconPlayerPlay size={18} />}
                      onClick={handleTogglePreview}
                    >
                      {previewStreamUrl ? 'Stop Preview' : 'Preview'}
                    </Button>
                  </Stack>

                  <Box
                    sx={{
                      width: '100%',
                      maxHeight: '400px',
                      aspectRatio: '16/9',
                      backgroundColor: 'black',
                      borderRadius: 1,
                      overflow: 'hidden',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    {previewStreamUrl ? (
                      <UniversalVideoPlayer
                        streamUrl={previewStreamUrl}
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    ) : (
                      <Box sx={{ textAlign: 'center', color: 'grey.500', p: 3 }}>
                        <IconVideo size={48} stroke={1.5} />
                        <Typography variant="body2" mt={1}>
                          {isRtspValid
                            ? 'Click "Preview" to load and play the RTSP stream'
                            : 'Enter a valid RTSP URL (e.g., rtsp://...) to enable preview'}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Box>
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
        <Dialog open={open} fullWidth maxWidth="md">
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
