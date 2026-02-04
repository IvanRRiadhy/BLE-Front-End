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
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import UploadIcon from '@mui/icons-material/Upload';
import { useEffect, useState } from 'react';
import { useAddPatrolCase, useEditPatrolCase } from 'src/hooks/usePatrolCase';
import { useUploadCDN } from 'src/hooks/usePatrolCase';
import { defaultPatrolCaseUploadForm } from 'src/store/apps/defaultForm';
import { CaseUploadType } from 'src/store/apps/crud/patrolCase';
import toast from 'react-hot-toast';
import { CaseType } from 'src/types/crud/input';

interface Props {
  type?: 'add' | 'edit';
  initialData?: CaseUploadType;
  id?: string;
  open: boolean;
  onClose: () => void;
}

// const CASE_TYPES = ['Damage', 'Incident', 'Security', 'Other'];

const PatrolCaseDialog = ({ open, onClose, id, type, initialData }: Props) => {
  const addMutation = useAddPatrolCase();
  const editMutation = useEditPatrolCase();
  const uploadMutation = useUploadCDN();
  const isEdit = type === 'edit' && !!initialData;
  const [isDirty, setIsDirty] = useState(false);
  const [openConfirmClose, setOpenConfirmClose] = useState(false);

  const [form, setForm] = useState({ ...defaultPatrolCaseUploadForm, ...initialData });
  //   console.log("Session ID: ", form.patrolSessionId);

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
    try {
      if (isEdit && id) {
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
                    onDelete={() => {
                      setIsDirty(true);
                      setForm((prev) => ({
                        ...prev,
                        attachments: prev.attachments.filter((_, i) => i !== idx),
                      }));
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
    </>
  );
};

export default PatrolCaseDialog;
