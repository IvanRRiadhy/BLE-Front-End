import { Box, Typography, Stack, Paper, Chip, Divider, Button } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useApproveCase, useCloseCase, useRejectCase } from 'src/hooks/usePatrolCase';
import { PatrolCaseType } from 'src/store/apps/crud/patrolCase';

interface Props {
  data: PatrolCaseType;
}

const PatrolCaseOverview = ({ data }: Props) => {
  const theme = useTheme();
  const [activeIndex, setActiveIndex] = useState(0);
  const attachments = data.attachments || [];
  const activeAttachment = attachments[activeIndex];

  const getCdnUrl = (url?: string) => {
    if (!url) return '';
    if (url.startsWith('https://ble-cdn.tunnel.piranticerdasindonesia.com/')) return url;
    return `https://ble-cdn.tunnel.piranticerdasindonesia.com/${url}`;
  };

  const isImage = (att: any) =>
    att?.mimeType?.startsWith('image') || /\.(png|jpg|jpeg|gif|webp)$/i.test(att?.fileUrl || '');

  const isVideo = (att: any) =>
    att?.mimeType?.startsWith('video') || /\.(mp4|webm|ogg)$/i.test(att?.fileUrl || '');

  const ApproveMutation = useApproveCase();
  const RejectMutation = useRejectCase();
  const CloseMutation = useCloseCase();

  const handleApprove = async () => {
    try {
      await ApproveMutation.mutateAsync(data.id);
      toast.success('Case approved successfully');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to approve case');
    }
  };

  const handleReject = async () => {
    try {
      await RejectMutation.mutateAsync(data.id);
      toast.success('Case rejected successfully');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to reject case');
    }
  };

  const handleClose = async () => {
    try {
      await CloseMutation.mutateAsync(data.id);
      toast.success('Case closed successfully');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to close case');
    }
  };

  const canApprove = localStorage.getItem('levelPriority') === 'SuperAdmin';

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack direction="row" spacing={2}>
        {/* LEFT – CASE DETAIL */}
        <Box width="35%">
          <Typography fontWeight={600} mb={1}>
            Patrol Case Detail
          </Typography>

          <Divider sx={{ mb: 2 }} />

          <Stack spacing={2}>
            <Box>
              <Typography fontSize={16} color="text.secondary" fontWeight={700}>
                Title
              </Typography>
              <Typography mt={1}>{data.title || '-'}</Typography>
            </Box>

            <Box>
              <Typography fontSize={16} color="text.secondary" fontWeight={700}>
                Description
              </Typography>
              <Typography whiteSpace="pre-line" mt={1}>
                {data.description || '-'}
              </Typography>
            </Box>

            <Box>
              <Typography fontSize={16} color="text.secondary" fontWeight={700}>
                Case Type
              </Typography>
              <Typography mt={1}>{data.caseType || '-'}</Typography>
            </Box>
          </Stack>
        </Box>

        {/* RIGHT – ATTACHMENTS */}
        <Box width="65%">
          <Typography fontWeight={600} mb={1}>
            Case Attachments
          </Typography>

          <Divider sx={{ mb: 2 }} />

          {/* PREVIEW AREA */}
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              minHeight: 260,
              mb: 2,
              backgroundColor: theme.palette.background.paper,
            }}
          >
            {!activeAttachment && (
              <Typography color="text.secondary">No attachment available</Typography>
            )}

            {activeAttachment && isImage(activeAttachment) && (
              <Box
                component="img"
                src={getCdnUrl(activeAttachment.fileUrl)}
                sx={{
                  maxWidth: '100%',
                  maxHeight: 400,
                  objectFit: 'contain',
                  borderRadius: 2,
                }}
              />
            )}

            {activeAttachment && isVideo(activeAttachment) && (
              <Box
                component="video"
                src={getCdnUrl(activeAttachment.fileUrl)}
                controls
                sx={{
                  maxWidth: '100%',
                  maxHeight: 400,
                  borderRadius: 2,
                  backgroundColor: 'black',
                }}
              />
            )}
          </Box>

          {/* ATTACHMENT SELECTOR */}
          <Stack direction="row" spacing={1} justifyContent="center">
            {attachments.map((_, idx) => (
              <Chip
                key={idx}
                label={idx + 1}
                clickable
                color={idx === activeIndex ? 'primary' : 'default'}
                onClick={() => setActiveIndex(idx)}
                size="small"
              />
            ))}
          </Stack>
        </Box>
      </Stack>
      {/* ACTION BUTTONS */}
      <Box mt={3} display="flex" justifyContent="flex-end">
        {data.caseStatus === 'Submitted' && canApprove && (
          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              color="error"
              onClick={handleReject}
              disabled={RejectMutation.isPending}
            >
              Reject
            </Button>

            <Button
              variant="contained"
              color="success"
              onClick={handleApprove}
              disabled={ApproveMutation.isPending}
            >
              Approve
            </Button>
          </Stack>
        )}

        {data.caseStatus === 'Approved' && (
          <Button
            variant="contained"
            color="primary"
            onClick={handleClose}
            disabled={CloseMutation.isPending}
          >
            Close Case
          </Button>
        )}
      </Box>
    </Paper>
  );
};

export default PatrolCaseOverview;
