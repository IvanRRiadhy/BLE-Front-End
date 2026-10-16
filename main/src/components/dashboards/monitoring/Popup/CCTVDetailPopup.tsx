import React from 'react';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Chip,
  Card,
  CardContent,
  Stack,
  useTheme,
} from '@mui/material';
import { IconX, IconVideo } from '@tabler/icons-react';
import { FloorplanDeviceType } from 'src/store/apps/crud/floorplanDevice';
import { MaskedAreaType } from 'src/store/apps/crud/maskedArea';
import { useAllCCTV } from 'src/hooks/useCCTV';
import UniversalVideoPlayer from 'src/utils/UniversalPlayer';
import BlankCard from 'src/components/shared/BlankCard';

type CCTVDetailPopupProps = {
  open: boolean;
  onClose: () => void;
  device: FloorplanDeviceType | null;
  area?: MaskedAreaType | null;
};

const CCTVDetailPopup: React.FC<CCTVDetailPopupProps> = ({
  open,
  onClose,
  device,
  area,
}) => {
  const theme = useTheme();
  const { data: allCCTV = [] } = useAllCCTV();

  // Find associated CCTV data for RTSP stream
  const cctvData =
    device?.accessCctv ||
    allCCTV.find((c) => c.id === device?.accessCctvId);

  const rtspUrl = cctvData?.rtsp || '';
  const areaName = area?.name || device?.floorplanMaskedArea?.name || '';
  const cctvName = device?.name || cctvData?.name || 'CCTV Camera';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '20px',
          maxHeight: '92vh',
        },
      }}
    >
      <DialogTitle sx={{ pb: 1, pt: 2.5, px: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={1.5} flexWrap="wrap">
            <Typography variant="h5" fontWeight="bold">
              CCTV: {cctvName}
            </Typography>
            {areaName ? (
              <Chip
                label={`Area: ${areaName}`}
                size="small"
                color="primary"
                variant="outlined"
                sx={{ fontWeight: 600 }}
              />
            ) : (
              <Chip
                label="No Registered Area"
                size="small"
                color="default"
                variant="outlined"
              />
            )}
          </Box>
          <IconButton onClick={onClose} size="small">
            <IconX size={22} />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ px: 3, pb: 3, pt: 1 }}>
        <Stack spacing={2.5}>
          {/* Metadata Card */}
          <Card
            variant="outlined"
            sx={{
              borderRadius: '16px',
              bgcolor: (t) => (t.palette.mode === 'dark' ? 'grey.800' : 'grey.100'),
              border: `1px solid ${theme.palette.divider}`,
            }}
          >
            <CardContent sx={{ py: 1.5, px: 2.5, '&:last-child': { pb: 1.5 } }}>
              <Box display="flex" flexWrap="wrap" gap={3} alignItems="center">
                <Box display="flex" alignItems="center" gap={1}>
                  <IconVideo size={20} color={theme.palette.primary.main} />
                  <Typography variant="subtitle2" color="textSecondary">
                    Camera:
                  </Typography>
                  <Typography variant="subtitle2" fontWeight={700}>
                    {cctvName}
                  </Typography>
                </Box>

                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Registered Area:
                  </Typography>
                  <Typography variant="subtitle2" fontWeight={700}>
                    {areaName || '-'}
                  </Typography>
                </Box>

                {rtspUrl && (
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="subtitle2" color="textSecondary">
                      RTSP Feed:
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        fontFamily: 'monospace',
                        bgcolor: (t) => (t.palette.mode === 'dark' ? 'grey.900' : 'grey.200'),
                        px: 1,
                        py: 0.2,
                        borderRadius: 1,
                        maxWidth: 320,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={rtspUrl}
                    >
                      {rtspUrl}
                    </Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>

          {/* Video Player */}
          <Box>
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 1.5 }}>
              Live Stream Feed
            </Typography>

            {rtspUrl ? (
              <Box
                sx={{
                  width: '100%',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  bgcolor: '#000',
                  boxShadow: theme.shadows[4],
                }}
              >
                <UniversalVideoPlayer
                  streamUrl={rtspUrl}
                  style={{
                    width: '100%',
                    aspectRatio: '16/9',
                    borderRadius: '16px',
                  }}
                />
              </Box>
            ) : (
              <BlankCard>
                <Box
                  p={6}
                  display="flex"
                  flexDirection="column"
                  alignItems="center"
                  justifyContent="center"
                  textAlign="center"
                >
                  <IconVideo size={48} stroke={1.5} color={theme.palette.text.disabled} />
                  <Typography variant="h6" color="textSecondary" sx={{ mt: 2 }}>
                    No RTSP stream URL configured for this CCTV.
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
                    Please check the CCTV master data settings to configure its RTSP stream.
                  </Typography>
                </Box>
              </BlankCard>
            )}
          </Box>
        </Stack>
      </DialogContent>
    </Dialog>
  );
};

export default CCTVDetailPopup;
