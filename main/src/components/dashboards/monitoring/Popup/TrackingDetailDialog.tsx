import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
  IconButton,
  Divider,
  Stack,
  useTheme,
} from '@mui/material';
import { IconLiveView, IconX, IconUser, IconMapPin, IconClock, IconBuilding } from '@tabler/icons-react';
import { useDispatch, useSelector, RootState } from 'src/store/Store';
import { SetSelectedBeacon, ShowTrackingDetail } from 'src/store/apps/tracking/Beacon';

const TrackingDetailDialog = () => {
  const dispatch = useDispatch();
  const theme = useTheme();

  const tracking = useSelector(
    (state: RootState) => state.BeaconReducer.showTracking
  );

  const open = Boolean(tracking);

  if (!tracking) return null;

  const formatTime = (iso: string) => {
    if (!iso) return '-';
    const d = new Date(iso);
    return d.toLocaleString('en-GB', { hour12: false });
  };

  const handleClose = () => {
    dispatch(ShowTrackingDetail(null));
  };

  const handleOpenDetails = () => {
    dispatch(
      SetSelectedBeacon({
        active: true,
        id: tracking.dmac,
        area: tracking.area,
        floorplan: tracking.floor,
        time: tracking.time,
        sourceScreenId: 1,
      })
    );
    handleClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        elevation: 6,
        sx: {
          borderRadius: '16px',
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'divider',
        },
      }}
    >
      <DialogTitle
        sx={{
          m: 0,
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'grey.900' : 'grey.100'),
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
              borderRadius: '10px',
              bgcolor: theme.palette.secondary.light,
              color: theme.palette.secondary.main,
            }}
          >
            <IconLiveView size={20} />
          </Box>
          <Typography variant="h6" fontWeight={700}>
            Tracking Detail
          </Typography>
        </Stack>
        <IconButton size="small" onClick={handleClose} sx={{ color: 'text.secondary' }}>
          <IconX size={18} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3, pt: '20px !important' }}>
        <Stack spacing={2}>
          <Box display="flex" alignItems="center" gap={1.5}>
            <IconUser size={18} color={theme.palette.text.secondary} />
            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 60 }}>
              Target
            </Typography>
            <Typography variant="body2" fontWeight={600} color="text.primary">
              {tracking.target || '-'}
            </Typography>
          </Box>

          <Divider />

          <Box display="flex" alignItems="center" gap={1.5}>
            <IconClock size={18} color={theme.palette.text.secondary} />
            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 60 }}>
              Time
            </Typography>
            <Typography variant="body2" fontWeight={500} color="text.primary">
              {formatTime(tracking.time)}
            </Typography>
          </Box>

          <Divider />

          <Box display="flex" alignItems="center" gap={1.5}>
            <IconBuilding size={18} color={theme.palette.text.secondary} />
            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 60 }}>
              Floor
            </Typography>
            <Typography variant="body2" fontWeight={500} color="text.primary">
              {tracking.floor || '-'}
            </Typography>
          </Box>

          <Divider />

          <Box display="flex" alignItems="center" gap={1.5}>
            <IconMapPin size={18} color={theme.palette.text.secondary} />
            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 60 }}>
              Area
            </Typography>
            <Typography variant="body2" fontWeight={500} color="text.primary">
              {tracking.area || '-'}
            </Typography>
          </Box>
        </Stack>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 3, py: 2, bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50') }}>
        <Button onClick={handleClose} variant="outlined" color="inherit" sx={{ borderRadius: '8px' }}>
          Close
        </Button>

        <Button variant="contained" color="secondary" onClick={handleOpenDetails} disableElevation sx={{ borderRadius: '8px' }}>
          Person Details
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TrackingDetailDialog;