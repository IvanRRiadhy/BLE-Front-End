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
} from '@mui/material';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAlarmAttachmentSend, useInvestigateAlarmTrigger } from 'src/hooks/useAlarmTrigger';
import { SecurityAlarmLogItem } from './AlarmInvestigation';
import { MenuSelect } from 'mui-tiptap';
import { investigationResultType } from 'src/types/crud/input';
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';
import { dispatch, RootState, useSelector } from 'src/store/Store';
import { SetFocusAlarm } from 'src/store/apps/tracking/Beacon';
import { useUploadCDN } from 'src/hooks/usePatrolCase';

interface AcceptedAlarmViewProps {
  alarm: SecurityAlarmLogItem;
  onBack: () => void;
  onAccept: (alarm: SecurityAlarmLogItem) => void;
}

const AcceptedAlarm = ({ alarm, onBack, onAccept }: AcceptedAlarmViewProps) => {
  const [investigationNotes, setInvestigationNotes] = useState('');
  const [investigationResult, setInvestigationResult] = useState('');
  const focusPosition = useSelector((state: RootState) => state.BeaconReducer.focusPosition);
  const isAccepted = alarm.action === 'Accepted';

  const [attachments, setAttachments] = useState<any[]>([]);
  const [selectedAttachment, setSelectedAttachment] = useState<any | null>(null);
  const [openAttachmentDialog, setOpenAttachmentDialog] = useState(false);

  const InvestigateMutation = useInvestigateAlarmTrigger();
  const uploadMutation = useUploadCDN(); // same as PatrolCase
  const sendAttachmentMutation = useAlarmAttachmentSend();

  const handleSubmit = () => {
    if (!investigationResult) {
      toast.error('Please select an investigation result');
      return;
    }

    if (!investigationNotes.trim()) {
      toast.error('Investigation notes cannot be empty');
      return;
    }

    InvestigateMutation.mutate(
      {
        id: alarm.id,
        result: investigationResult, // API expects only result
        note: investigationNotes,
      },
      {
        onSuccess: () => {
          toast.success('Investigation submitted successfully');
          setInvestigationNotes('');
          setInvestigationResult('');
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
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'video/mp4'];

    if (!allowedTypes.includes(file.type)) {
      toast.error('Only JPG, PNG, or MP4 allowed');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      // 1️⃣ Upload to CDN
      const res = await uploadMutation.mutateAsync(formData);

      const uploaded = res?.collection?.data?.[0];
      if (!uploaded) return;

      // 2️⃣ Update local state (preview)
      setAttachments((prev) => [...prev, uploaded]);

      // 3️⃣ Send to Alarm API
      await sendAttachmentMutation.mutateAsync({
        id: alarm.id,
        attachments: [uploaded], // send only new OR whole array (depends API)
      });

      toast.success('Attachment uploaded successfully');
    } catch (err) {
      console.error(err);
      toast.error('Upload failed');
    }
  };

  const getCdnUrl = (url?: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `https://ble-cdn.tunnel.piranticerdasindonesia.com/${url}`;
  };
  const isImage = (att: any) =>
    att?.mimeType?.startsWith('image') || /\.(png|jpg|jpeg|gif|webp)$/i.test(att?.fileUrl || '');

  const isVideo = (att: any) =>
    att?.mimeType?.startsWith('video') || /\.(mp4|webm|ogg)$/i.test(att?.fileUrl || '');

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
          backgroundColor: '#f8f9fa',
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
              <Button component="label" variant="outlined" disabled={uploadMutation.isPending}>
                Upload Attachment
                <input
                  hidden
                  type="file"
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
                    label={att.fileType}
                    clickable
                    onClick={() => {
                      setSelectedAttachment({ ...att, index: idx });
                      setOpenAttachmentDialog(true);
                      console.log('att', att);
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

            <Stack direction="row" spacing={2}>
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
        <DialogTitle>Attachment Preview</DialogTitle>

        <DialogContent>
          {selectedAttachment && (
            <Box display="flex" justifyContent="center">
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
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AcceptedAlarm;
