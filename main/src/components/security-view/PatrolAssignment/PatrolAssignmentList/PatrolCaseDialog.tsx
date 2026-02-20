import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  MenuItem,
  Chip,
  Box,
  IconButton,
  CircularProgress,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CloseIcon from '@mui/icons-material/Close';
import UploadIcon from '@mui/icons-material/Upload';
import { useEffect, useState } from 'react';
import { useAddPatrolCase, useEditPatrolCase } from 'src/hooks/usePatrolCase';
import { useUploadCDN } from 'src/hooks/usePatrolCase';
import { defaultPatrolCaseUploadForm } from 'src/store/apps/defaultForm';
import { CaseUploadType } from 'src/store/apps/crud/patrolCase';
import toast from 'react-hot-toast';
import { CaseType, ThreatLevel } from 'src/types/crud/input';
import { useTranslation } from 'react-i18next';

interface Props {
  type?: 'add' | 'edit';
  initialData?: CaseUploadType;
  id?: string;
  open: boolean;
  onClose: () => void;
  setEditId?: (id: string) => void;
}

// const CASE_TYPES = ['Damage', 'Incident', 'Security', 'Other'];

const PatrolCaseDialog = ({ open, onClose, id, type, initialData, setEditId }: Props) => {
  const { t } = useTranslation();
  const addMutation = useAddPatrolCase();
  const editMutation = useEditPatrolCase();
  const uploadMutation = useUploadCDN();
  const isEdit = type === 'edit' && !!initialData;
  const [isDirty, setIsDirty] = useState(false);
  const [openConfirmClose, setOpenConfirmClose] = useState(false);

  const [form, setForm] = useState({ ...defaultPatrolCaseUploadForm, ...initialData });
  //   console.log("Session ID: ", form.patrolSessionId);
  const [openAttachmentDialog, setOpenAttachmentDialog] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState<any | null>(null);

  /* ================== HANDLERS ================== */

  useEffect(() => {
    setForm({ ...defaultPatrolCaseUploadForm, ...initialData });
    setIsDirty(false);
  }, [open, isEdit, initialData]);

  const handleChange = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsDirty(true);
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const handleFileUpload = async (file: File) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'video/mp4'];

    if (!allowedTypes.includes(file.type)) {
      alert('Only JPG, PNG, or MP4 files are allowed');
      return;
    }
    console.log('file', file);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await uploadMutation.mutateAsync(formData);

      const uploaded = res?.collection?.data?.[0];
      if (!uploaded) return;
      setIsDirty(true);
      setForm((prev) => ({
        ...prev,
        attachments: [...prev.attachments, uploaded],
      }));
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async () => {
    if (!form.title || !form.caseType) {
      toast.error('Title and Case Type are required');
      return;
    }
    console.log('form', form);
    console.log('isEdit', isEdit, 'or isAdd', type);
    try {
      if (isEdit && id) {
        console.log('edit', id, form);
        await editMutation.mutateAsync({
          id: id,
          patrolCase: form,
        });

        toast.success('Patrol case updated successfully');
      } else {
        await addMutation.mutateAsync(form);

        toast.success('Patrol case created successfully');

        // reset only on ADD
        setForm(defaultPatrolCaseUploadForm);
      }
      setIsDirty(false);

      onClose();
      setEditId?.('');
    } catch (err: any) {
      console.error(err);

      toast.error(err?.response?.data?.msg || 'Something went wrong. Please try again.');

      // ❗ DO NOT CLOSE dialog on error
    }
  };

  //CLOSE PREVENT
  const handleRequestClose = () => {
    if (isDirty) {
      setOpenConfirmClose(true);
      return;
    }
    onClose();
  };
  useEffect(() => {
    if (!open || !isDirty) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = ''; // Required for Chrome
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [open, isDirty]);

  const getCdnUrl = (url?: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `https://${url}`;
  };
  const isImage = (att: any) =>
    att?.mimeType?.startsWith('image') || /\.(png|jpg|jpeg|gif|webp)$/i.test(att?.fileUrl || '');

  const isVideo = (att: any) =>
    att?.mimeType?.startsWith('video') || /\.(mp4|webm|ogg)$/i.test(att?.fileUrl || '');

  /* ================== UI ================== */

  return (
    <>
      <Dialog open={open} onClose={handleRequestClose} fullWidth maxWidth="sm">
        <DialogTitle display="flex" alignItems="center" justifyContent="space-between">
          {isEdit ? 'Edit Patrol Case' : 'Add Patrol Case'}
          <IconButton onClick={handleRequestClose}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          <Stack spacing={2}>
            <TextField
              label="Title"
              fullWidth
              value={form.title}
              onChange={handleChange('title')}
            />

            <TextField
              label="Description"
              multiline
              rows={3}
              fullWidth
              value={form.description}
              onChange={handleChange('description')}
            />

            <TextField
              select
              label="Case Type"
              fullWidth
              value={form.caseType}
              onChange={handleChange('caseType')}
            >
              {CaseType.map((item) => (
                <MenuItem key={item.value} value={item.value} disabled={item.disabled}>
                  {item.label}
                </MenuItem>
              ))}
            </TextField>

            <Box>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <Typography fontWeight={600}>{t('Threat Level')}</Typography>

                <Tooltip title={t('patrolCase.threatLevelDescription')} arrow>
                  <IconButton size="small">
                    <InfoOutlinedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>

              <ToggleButtonGroup
                value={form.threatLevel}
                exclusive
                fullWidth
                onChange={(_, newValue) => {
                  if (!newValue) return; // prevent unselect
                  setIsDirty(true);
                  setForm((prev) => ({ ...prev, threatLevel: newValue }));
                }}
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 1,
                  '& .MuiToggleButtonGroup-grouped': {
                    margin: 0,
                    border: '2px solid', // allow our custom border
                  },
                }}
              >
                {ThreatLevel.map((item) => {
                  if (item.value === '') return null;
                  const getColor = () => {
                    switch (item.value) {
                      case 'Low':
                        return '#fbc02d'; // yellow
                      case 'Medium':
                        return '#f57c00'; // orange
                      case 'High':
                        return '#ff1744'; // bright red
                      case 'Critical':
                        return '#b71c1c'; // dark red
                      default:
                        return '#ccc';
                    }
                  };

                  const selected = form.threatLevel === item.value;
                  const color = getColor();
                  return (
                    <ToggleButton
                      key={item.value}
                      value={item.value}
                      disabled={item.disabled}
                      sx={{
                        flex: {
                          xs: '1 1 48%', // 2 per row on mobile
                          sm: '1 1 22%', // 4 per row on bigger screens
                        },
                        minWidth: 0, // prevent overflow
                        border: `2px solid ${color}`,
                        backgroundColor: selected ? color : 'transparent',
                        color: selected ? '#fff' : color,
                        fontWeight: item.value === 'Critical' ? 900 : 600,
                        transition: 'all 0.2s ease',

                        '&:hover': {
                          backgroundColor: selected ? color : `${color}20`,
                        },

                        '&.Mui-selected': {
                          backgroundColor: color,
                          color: '#fff',
                          border: `2px solid ${color}`,
                        },

                        '&.Mui-selected:hover': {
                          backgroundColor: color,
                        },
                      }}
                    >
                      {item.label}
                    </ToggleButton>
                  );
                })}
              </ToggleButtonGroup>
            </Box>

            {/* ===== Attachments ===== */}
            <Box>
              <Button
                component="label"
                startIcon={<UploadIcon />}
                disabled={uploadMutation.isPending}
              >
                Upload Attachment
                <input
                  hidden
                  type="file"
                  onChange={(e) => e.target.files && handleFileUpload(e.target.files[0])}
                />
              </Button>

              {uploadMutation.isPending && <CircularProgress size={20} sx={{ ml: 2 }} />}

              {/* Attachment Preview */}
              <Stack direction="row" spacing={1} mt={1} flexWrap="wrap">
                {form.attachments.map((att, idx) => (
                  <Chip
                    key={idx}
                    label={att.fileType}
                    clickable
                    onClick={() => {
                      setSelectedAttachment({ ...att, index: idx });
                      setOpenAttachmentDialog(true);
                    }}
                    color={att.fileType === 'Video' ? 'secondary' : 'primary'}
                    size="small"
                  />
                ))}
              </Stack>

              {form.attachments.length === 0 && (
                <Typography fontSize={12} color="text.secondary" mt={1}>
                  No attachments uploaded
                </Typography>
              )}
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleRequestClose}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={addMutation.isPending || editMutation.isPending}
          >
            {isEdit
              ? editMutation.isPending
                ? 'Saving…'
                : 'Update'
              : addMutation.isPending
                ? 'Saving…'
                : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={openConfirmClose} onClose={() => setOpenConfirmClose(false)}>
        <DialogTitle>Discard changes?</DialogTitle>

        <DialogContent>
          <Typography>
            Are you sure you want to close this form?
            <br />
            All unsaved changes and uploaded attachments will be lost.
          </Typography>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpenConfirmClose(false)}>Continue Editing</Button>

          <Button
            color="error"
            variant="contained"
            onClick={() => {
              setOpenConfirmClose(false);
              setIsDirty(false);
              onClose();
            }}
          >
            Discard
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={openAttachmentDialog}
        onClose={() => setOpenAttachmentDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle display="flex" justifyContent="space-between" alignItems="center">
          Attachment Preview
          <IconButton onClick={() => setOpenAttachmentDialog(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          {selectedAttachment && (
            <Box display="flex" justifyContent="center" alignItems="center" sx={{ minHeight: 200 }}>
              {/* IMAGE */}
              {isImage(selectedAttachment) && (
                <Box
                  component="img"
                  src={getCdnUrl(selectedAttachment.fileUrl)}
                  alt="attachment"
                  sx={{
                    maxWidth: '100%',
                    maxHeight: '60vh',
                    borderRadius: 2,
                    objectFit: 'contain',
                  }}
                />
              )}

              {/* VIDEO */}
              {isVideo(selectedAttachment) && (
                <Box
                  component="video"
                  src={getCdnUrl(selectedAttachment.fileUrl)}
                  controls
                  playsInline
                  sx={{
                    maxWidth: '100%',
                    maxHeight: '60vh',
                    borderRadius: 2,
                    backgroundColor: 'black',
                  }}
                />
              )}

              {/* FALLBACK */}
              {!isImage(selectedAttachment) && !isVideo(selectedAttachment) && (
                <Typography color="text.secondary">
                  Preview not available for this file type
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpenAttachmentDialog(false)}>Close</Button>

          <Button
            color="error"
            variant="contained"
            onClick={() => {
              if (!selectedAttachment) return;

              setIsDirty(true);
              setForm((prev) => ({
                ...prev,
                attachments: prev.attachments.filter((_, i) => i !== selectedAttachment.index),
              }));

              setOpenAttachmentDialog(false);
              setSelectedAttachment(null);
            }}
          >
            Delete Attachment
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default PatrolCaseDialog;
