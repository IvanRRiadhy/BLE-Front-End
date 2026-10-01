import {
  Avatar,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  MenuItem,
  Stack,
  Divider,
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import UploadIcon from '@mui/icons-material/Upload';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useInvestigateAlarmTrigger } from 'src/hooks/useAlarmTrigger';
import { SecurityAlarmLogItem } from './AlarmInvestigation';
import { MenuSelect } from 'mui-tiptap';
import { investigationResultType } from 'src/types/crud/input';
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';
import { dispatch, RootState, useSelector } from 'src/store/Store';
import { SetFocusAlarm } from 'src/store/apps/tracking/Beacon';
import { useUploadCDN } from 'src/hooks/usePatrolCase';
import { getConfig } from 'src/config';

interface AcceptedAlarmViewProps {
  alarm: SecurityAlarmLogItem;
  onBack: () => void;
  onAccept: (alarm: SecurityAlarmLogItem) => void;
}

const IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/gif',
];

const VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-matroska',
  'video/mkv',
  'video/x-msvideo',
  'video/avi',
  'video/msvideo',
  'video/3gpp',
];

const DOC_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const ALLOWED_TYPES = [...IMAGE_TYPES, ...VIDEO_TYPES, ...DOC_TYPES];

const AcceptedAlarm = ({ alarm, onBack, onAccept }: AcceptedAlarmViewProps) => {
  const [investigationNotes, setInvestigationNotes] = useState('');
  const [investigationResult, setInvestigationResult] = useState('');
  const focusPosition = useSelector((state: RootState) => state.BeaconReducer.focusPosition);
  const isAccepted = alarm.action === 'Accepted';

  const [attachments, setAttachments] = useState<any[]>([]);
  const [selectedAttachment, setSelectedAttachment] = useState<any | null>(null);
  const [openAttachmentDialog, setOpenAttachmentDialog] = useState(false);

  const InvestigateMutation = useInvestigateAlarmTrigger();
  const uploadMutation = useUploadCDN();

  const handleSubmit = () => {
    if (!investigationResult) {
      toast.error('Please select an investigation result');
      return;
    }

    if (!investigationNotes.trim()) {
      toast.error('Investigation notes cannot be empty');
      return;
    }

    const formattedAttachments = attachments.map((att) => ({
      fileUrl: att.fileUrl || '',
      fileType: att.fileType || 'Image',
    }));

    InvestigateMutation.mutate(
      {
        id: alarm.id,
        result: investigationResult,
        note: investigationNotes,
        attachments: formattedAttachments,
      },
      {
        onSuccess: () => {
          toast.success('Investigation submitted successfully');
          setInvestigationNotes('');
          setInvestigationResult('');
          setAttachments([]);
          dispatch(SetFocusAlarm(null)); // Clear focus alarm after submission
          onBack();
        },
        onError: () => {
          toast.error('Failed to submit investigation');
        },
      },
    );
  };

  const handleFileUpload = async (file: File) => {
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    const isAllowedExt = [
      '.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.gif',
      '.mp4', '.webm', '.mov', '.mkv', '.avi', '.3gp',
      '.pdf', '.doc', '.docx',
    ].includes(ext);

    if (!ALLOWED_TYPES.includes(file.type) && !isAllowedExt) {
      toast.error('File type not supported. Please upload an allowed image, video, or document.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      // 1️⃣ Upload to CDN
      const res = await uploadMutation.mutateAsync(formData);

      const uploaded = res?.collection?.data?.[0];
      if (!uploaded) return;

      // 2️⃣ Update local state (attachments)
      setAttachments((prev) => [...prev, uploaded]);
      toast.success('Attachment uploaded successfully');
    } catch (err) {
      console.error(err);
      toast.error('Upload failed');
    }
  };

  const getCdnUrl = (url?: string) => {
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

  const isImage = (att: any) =>
    att?.mimeType?.startsWith('image') || /\.(png|jpg|jpeg|gif|webp)$/i.test(att?.fileUrl || '');

  const isVideo = (att: any) =>
    att?.mimeType?.startsWith('video') || /\.(mp4|webm|ogg|mov|mkv|avi|3gp)$/i.test(att?.fileUrl || '');

  return (
    <Box sx={{ p: 2, textAlign: 'center' }}>

      <Avatar src={alarm.image} sx={{ width: 100, height: 100, margin: '0 auto', mb: 2 }} />

      <Typography sx={{ fontSize: 18, fontWeight: 600 }}>{alarm.name}</Typography>

      {/* ================= Triggered Section ================= */}
      <Box sx={{ mt: 2 }}>
        <Stack direction="row" justifyContent="center" spacing={1}>
          <Typography sx={{ fontSize: 14, fontWeight: 700 }}>Triggered at</Typography>
          <Typography sx={{ fontSize: 14 }}>{alarm.triggerTime}</Typography>
        </Stack>

        <Typography sx={{ fontSize: 14, mt: 0.5 }}>
          {alarm.buildingName} | {alarm.floorName}
        </Typography>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* ================= Last Detected Section ================= */}
      <Box sx={{ mt: 1 }}>
        <Stack direction="row" justifyContent="center" spacing={1}>
          <Typography sx={{ fontSize: 14, fontWeight: 700 }}>Last Detected at</Typography>
          <Typography sx={{ fontSize: 14 }}>{focusPosition?.time || 'Unknown'}</Typography>
        </Stack>

        <Typography sx={{ fontSize: 14, mt: 0.5 }}>
          {focusPosition?.floorplanName || 'Unknown'} | {focusPosition?.areaName || 'Unknown'}
        </Typography>
      </Box>
      {/* ================= Bottom Section ================= */}
      <Paper
        elevation={0}
        sx={{
          mt: 4,
          p: 3,
          borderRadius: '16px',
          backgroundColor: 'background.default',
          border: '1px solid #e0e0e0',
          textAlign: 'left',
        }}
      >
        {!isAccepted ? (
          <>
            <Typography sx={{ fontWeight: 600, mb: 2 }}>
              This alarm has not been accepted yet.
            </Typography>

            <Stack direction="row" spacing={2}>
              <Button variant="outlined" fullWidth onClick={onBack}>
                Back
              </Button>

              <Button variant="contained" color="error" fullWidth onClick={() => onAccept(alarm)}>
                Accept Investigation
              </Button>
            </Stack>
          </>
        ) : (
          <>
            <Typography sx={{ fontSize: 14, fontWeight: 600, mb: 1 }}>
              Investigation Result
            </Typography>

            <CustomSelect
              fullWidth
              value={investigationResult}
              onChange={(e: any) => setInvestigationResult(e.target.value)}
            >
              {investigationResultType.map((option) => (
                <MenuItem key={option.value} value={option.value} disabled={option.disabled}>
                  {option.label}
                </MenuItem>
              ))}
            </CustomSelect>

            <Typography sx={{ fontSize: 14, fontWeight: 600, mt: 3, mb: 1 }}>
              Investigation Notes
            </Typography>

            <TextField
              fullWidth
              multiline
              // minRows={3}
              // maxRows={3}
              rows={3}
              value={investigationNotes}
              onChange={(e) => setInvestigationNotes(e.target.value)}
              sx={{ mb: 2 }}
            />

            {/* ================= Attachments ================= */}
            <Typography sx={{ fontSize: 14, fontWeight: 600, mt: 3, mb: 1 }}>
              Investigation Attachments
            </Typography>

            <Box>
              <Button
                component="label"
                variant="outlined"
                startIcon={<UploadIcon />}
                disabled={uploadMutation.isPending}
              >
                Upload Attachment
                <input
                  hidden
                  type="file"
                  accept={ALLOWED_TYPES.join(',')}
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                />
              </Button>

              {uploadMutation.isPending && <CircularProgress size={20} sx={{ ml: 2 }} />}

              {/* Preview */}
              <Stack direction="row" spacing={1} mt={1} flexWrap="wrap">
                {attachments.map((att, idx) => (
                  <Chip
                    key={idx}
                    label={att.fileType || 'Attachment'}
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

              {attachments.length === 0 && (
                <Typography fontSize={12} color="text.secondary" mt={1}>
                  No attachments uploaded
                </Typography>
              )}
            </Box>

            <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
              {!isAccepted && (
                <Button variant="outlined" fullWidth onClick={onBack}>
                  Back
                </Button>
              )}

              <Button
                variant="contained"
                fullWidth
                disabled={InvestigateMutation.isPending}
                onClick={handleSubmit}
              >
                {InvestigateMutation.isPending ? 'Submitting...' : 'Submit Investigation Result'}
              </Button>
            </Stack>
          </>
        )}
      </Paper>
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

              setAttachments((prev) =>
                prev.filter((_, i) => i !== selectedAttachment.index),
              );

              setOpenAttachmentDialog(false);
              setSelectedAttachment(null);
            }}
          >
            Delete Attachment
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AcceptedAlarm;
