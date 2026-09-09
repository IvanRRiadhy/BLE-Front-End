import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Typography,
  IconButton,
  Stack,
  useTheme,
} from '@mui/material';
import {
  IconBellRinging,
  IconX,
  IconUser,
  IconClock,
  IconMapPin,
  IconBuilding,
  IconAlertTriangle,
  IconShieldCheck,
  IconCalendar,
} from '@tabler/icons-react';
import { useDispatch, useSelector, RootState } from 'src/store/Store';
import { hideAlarmPopup } from 'src/store/apps/monitoring/AlarmUI';
import { AlarmLogItem, SetSelectedBeacon, ShowAlarmPopup } from 'src/store/apps/tracking/Beacon';
import {
  useDispatchAlarmTrigger,
  useNearestSecurity,
  usePostponeAlarmTrigger,
} from 'src/hooks/useAlarmTrigger';
import { ChangeEvent, useState } from 'react';
import CustomAutocomplete from 'src/components/shared/CustomAutocomplete';
import { useAllSecurityLookup } from 'src/hooks/useSecurityGuard';
import { memberType } from 'src/store/apps/crud/member';
import toast from 'react-hot-toast';
import dayjs, { Dayjs } from 'dayjs';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { NearestSecurityType, SelectAlarmTrigger } from 'src/store/apps/crud/alarmTrigger';

const proximityColorMap: Record<string, string> = {
  SameArea: '#4caf50', // green
  SameFloorplan: '#2196f3', // blue
  SameFloor: '#ff9800', // orange
  SameBuilding: '#9c27b0', // purple
  DifferentBuilding: '#9e9e9e', // grey
};

const AlarmDetailDialog = () => {
  const dispatch = useDispatch();
  const theme = useTheme();

  const alarm = useSelector((state: RootState) => state.BeaconReducer.showAlarm);
  const trigger = useSelector((state: RootState) => state.alarmTriggerReducer.selectedAlarmTrigger);
  const isAcknowledged = trigger?.action?.toLowerCase() === 'acknowledged';
  const open = Boolean(alarm && trigger);
  const dispatchMutation = useDispatchAlarmTrigger();
  const postponeMutation = usePostponeAlarmTrigger();

  const { data: nearestSecurityData = [], isLoading: isLoadingSecurity } = useNearestSecurity(
    trigger?.id ?? '',
  );

  const [selectedSecurity, setSelectedSecurity] = useState<NearestSecurityType | null>(null);

  const proximityRank: Record<string, number> = {
    SameArea: 1,
    SameFloorplan: 2,
    SameFloor: 3,
    SameBuilding: 4,
    DifferentBuilding: 5,
  };

  const sortedSecurity = [...nearestSecurityData].sort((a, b) => {
    const proxA = proximityRank[a.proximityLevel] ?? 999;
    const proxB = proximityRank[b.proximityLevel] ?? 999;

    if (proxA !== proxB) return proxA - proxB;

    if (a.distanceInMeters == null && b.distanceInMeters == null) return 0;
    if (a.distanceInMeters == null) return 1;
    if (b.distanceInMeters == null) return -1;

    return a.distanceInMeters - b.distanceInMeters;
  });

  const [openPostponeDialog, setOpenPostponeDialog] = useState(false);
  const [postponeDate, setPostponeDate] = useState<Dayjs | null>(
    dayjs().add(1, 'day').startOf('day'),
  );
  const [postponeReason, setPostponeReason] = useState('Alarm is Postponed');

  if (!alarm) return null;

  const formatTime = (iso: string) => {
    if (!iso) return '-';
    const d = new Date(iso);
    return d.toLocaleString('en-GB', { hour12: false });
  };

  const handleClose = () => {
    dispatch(ShowAlarmPopup(null));
    dispatch(SelectAlarmTrigger(null));
  };

  const handleDispatch = async () => {
    if (!trigger || !selectedSecurity) {
      toast.error('Select security first');
      return;
    }

    try {
      await dispatchMutation.mutateAsync({
        id: trigger.id,
        assignedSecurityId: selectedSecurity.securityId,
      });

      toast.success('Security dispatched');
      handleClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSelectedSecurity(null);
    }
  };

  const handlePostpone = async () => {
    if (!trigger || !postponeDate || !postponeReason.trim()) return;

    try {
      await postponeMutation.mutateAsync({
        id: trigger.id,
        postponedUntilDate: postponeDate.toISOString(),
        postponeReason,
      });

      setOpenPostponeDialog(false);
      handleClose();
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenDetails = () => {
    if (!alarm) return;

    dispatch(
      SetSelectedBeacon({
        active: true,
        id: alarm.dmac,
        area: alarm.area,
        floorplan: alarm.floor,
        time: alarm.time,
        sourceScreenId: 1,
      }),
    );

    handleClose();
  };

  return (
    <>
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
                bgcolor: theme.palette.error.light,
                color: theme.palette.error.main,
              }}
            >
              <IconBellRinging size={20} />
            </Box>
            <Typography variant="h6" fontWeight={700}>
              Alarm Detail
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
                {alarm.target || '-'}
              </Typography>
            </Box>

            <Divider />

            <Box display="flex" alignItems="center" gap={1.5}>
              <IconClock size={18} color={theme.palette.text.secondary} />
              <Typography variant="body2" color="text.secondary" sx={{ minWidth: 60 }}>
                Time
              </Typography>
              <Typography variant="body2" fontWeight={500} color="text.primary">
                {formatTime(alarm.time)}
              </Typography>
            </Box>

            <Divider />

            <Box display="flex" alignItems="center" gap={1.5}>
              <IconMapPin size={18} color={theme.palette.text.secondary} />
              <Typography variant="body2" color="text.secondary" sx={{ minWidth: 60 }}>
                Area
              </Typography>
              <Typography variant="body2" fontWeight={500} color="text.primary">
                {alarm.area || '-'}
              </Typography>
            </Box>

            <Divider />

            <Box display="flex" alignItems="center" gap={1.5}>
              <IconBuilding size={18} color={theme.palette.text.secondary} />
              <Typography variant="body2" color="text.secondary" sx={{ minWidth: 60 }}>
                Floor
              </Typography>
              <Typography variant="body2" fontWeight={500} color="text.primary">
                {alarm.floor || '-'}
              </Typography>
            </Box>

            <Divider />

            {trigger ? (
              <Stack spacing={1.5}>
                <Box display="flex" alignItems="center" gap={1.5}>
                  <IconAlertTriangle size={18} color={theme.palette.error.main} />
                  <Typography variant="body2" color="text.secondary" sx={{ minWidth: 60 }}>
                    Alarm
                  </Typography>
                  <Typography variant="body2" fontWeight={600} color="error.main">
                    {trigger.alarm || '-'}
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1.5}>
                  <IconShieldCheck size={18} color={theme.palette.text.secondary} />
                  <Typography variant="body2" color="text.secondary" sx={{ minWidth: 60 }}>
                    Status
                  </Typography>
                  <Chip
                    label={trigger.action || 'Pending'}
                    size="small"
                    color={isAcknowledged ? 'primary' : 'warning'}
                    variant="outlined"
                    sx={{ fontWeight: 600, height: 24 }}
                  />
                </Box>
              </Stack>
            ) : (
              <Box display="flex" justifyContent="center" py={1}>
                <CircularProgress size={24} />
              </Box>
            )}

            {isAcknowledged && (
              <Box mt={1}>
                <CustomAutocomplete
                  label="Assign Security Guard"
                  options={sortedSecurity}
                  value={selectedSecurity}
                  loading={isLoadingSecurity}
                  onChange={(v) => setSelectedSecurity(v)}
                  getOptionLabel={(o) => {
                    if (!o) return '';
                    const base = o.securityName;
                    if (o.proximityLevel === 'SameArea' || o.proximityLevel === 'SameFloorplan') {
                      return `${base}`;
                    }
                    return `${base} • ${o.floorName} | ${o.buildingName}`;
                  }}
                  isOptionEqualToValue={(o, v) => o.securityId === v.securityId}
                  renderOption={(props: any, option: NearestSecurityType) => {
                    const isNear =
                      option.proximityLevel === 'SameArea' ||
                      option.proximityLevel === 'SameFloorplan';

                    const label = isNear
                      ? `${option.distanceInMeters?.toFixed(3) ?? '-'} m`
                      : `${option.floorName} | ${option.buildingName}`;

                    return (
                      <li {...props} key={option.securityId}>
                        <Box
                          display="flex"
                          justifyContent="space-between"
                          alignItems="center"
                          width="100%"
                        >
                          <Box>
                            <Typography fontWeight={600}>{option.securityName}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {option.proximityLevel}
                            </Typography>
                          </Box>

                          <Chip
                            label={label}
                            size="small"
                            sx={{
                              backgroundColor: proximityColorMap[option.proximityLevel],
                              color: '#fff',
                              fontWeight: 600,
                            }}
                          />
                        </Box>
                      </li>
                    );
                  }}
                />
              </Box>
            )}
          </Stack>
        </DialogContent>

        <Divider />

        <DialogActions
          sx={{
            p: 2,
            bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50'),
            gap: 1.5,
            flexWrap: 'wrap',
          }}
        >
          <Button
            onClick={handleOpenDetails}
            variant="contained"
            color="primary"
            disableElevation
            sx={{ borderRadius: '8px', flex: 1 }}
          >
            Person Details
          </Button>

          <Button
            onClick={handleClose}
            variant="outlined"
            color="inherit"
            sx={{ borderRadius: '8px', flex: 1 }}
          >
            Close
          </Button>

          {isAcknowledged && (
            <>
              <Button
                color="warning"
                variant="outlined"
                onClick={() => setOpenPostponeDialog(true)}
                sx={{ borderRadius: '8px', flex: 1 }}
              >
                Postpone
              </Button>

              <Button
                variant="contained"
                color="error"
                onClick={handleDispatch}
                disabled={!selectedSecurity || dispatchMutation.isPending}
                disableElevation
                sx={{ borderRadius: '8px', flex: 1 }}
              >
                Dispatch
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* POSTPONE DIALOG */}
      <Dialog
        open={openPostponeDialog}
        onClose={() => setOpenPostponeDialog(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          elevation: 6,
          sx: { borderRadius: '16px', border: '1px solid', borderColor: 'divider' },
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
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <IconCalendar size={20} />
            <Typography variant="h6" fontWeight={700}>
              Postpone Alarm
            </Typography>
          </Stack>
          <IconButton size="small" onClick={() => setOpenPostponeDialog(false)}>
            <IconX size={18} />
          </IconButton>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ p: 3 }}>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label="Postpone Until"
              value={postponeDate}
              onChange={(v) => setPostponeDate(v)}
              slotProps={{ textField: { fullWidth: true } }}
            />
          </LocalizationProvider>

          <CustomTextField
            label="Reason"
            value={postponeReason}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setPostponeReason(e.target.value)}
            fullWidth
            multiline
            rows={3}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <Divider />
        <DialogActions sx={{ p: 2, bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50') }}>
          <Button onClick={() => setOpenPostponeDialog(false)} variant="outlined" color="inherit" sx={{ borderRadius: '8px' }}>
            Cancel
          </Button>

          <Button onClick={handlePostpone} variant="contained" color="warning" disableElevation sx={{ borderRadius: '8px' }}>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AlarmDetailDialog;
