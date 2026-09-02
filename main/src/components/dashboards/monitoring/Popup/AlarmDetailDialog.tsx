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
} from '@mui/material';
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

  const alarm = useSelector((state: RootState) => state.BeaconReducer.showAlarm);
  const trigger = useSelector((state: RootState) => state.alarmTriggerReducer.selectedAlarmTrigger);
  const isAcknowledged = trigger?.action?.toLowerCase() === 'acknowledged';
  const open = Boolean(alarm && trigger);
    // console.log("Current Trigger", trigger)
  const dispatchMutation = useDispatchAlarmTrigger();
  const postponeMutation = usePostponeAlarmTrigger();

  //   const { data: securityData = [], isLoading: isLoadingSecurity } = useAllSecurityLookup();
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

    // distance logic (null last)
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
      <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ bgcolor: 'error.main', color: 'white' }}>Alarm Detail</DialogTitle>

        <Divider />

        <DialogContent>
          <Typography fontWeight="bold">Target: {alarm.target}</Typography>

          <Typography>Time: {formatTime(alarm.time)}</Typography>

          <Typography>Area: {alarm.area}</Typography>

          <Typography>Floor: {alarm.floor}</Typography>

          {trigger ? (
            <>
              <Typography>Status: {trigger.action}</Typography>

              <Typography>Alarm: {trigger.alarm}</Typography>
            </>
          ) : (
            <CircularProgress size={20} />
          )}

          {isAcknowledged && (
            <Box mt={2}>
              <CustomAutocomplete
                label="Security Guard"
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
                        {/* LEFT: NAME */}
                        <Box>
                          <Typography fontWeight={600}>{option.securityName}</Typography>

                          <Typography variant="caption" color="text.secondary">
                            {option.proximityLevel}
                          </Typography>
                        </Box>

                        {/* RIGHT: CHIP */}
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
        </DialogContent>

        <DialogActions
          sx={{
            p: 0,
            display: 'flex',
          }}
        >
          {/* LEFT: Person Details */}
          <Box sx={{ flex: 1 }}>
            <Button
              onClick={handleOpenDetails}
              variant="contained"
              sx={{
                width: '100%',
                height: '56px',
                borderRadius: 0,
              }}
            >
              Person Details
            </Button>
          </Box>

          {/* RIGHT SIDE */}
          <Box sx={{ flex: 1 }}>
            <Button
              onClick={handleClose}
              sx={{
                width: '100%',
                height: '56px',
                borderRadius: 0,
              }}
            >
              Close
            </Button>
          </Box>

          {isAcknowledged && (
            <>
              <Box sx={{ flex: 1 }}>
                <Button
                  color="warning"
                  onClick={() => setOpenPostponeDialog(true)}
                  sx={{
                    width: '100%',
                    height: '56px',
                    borderRadius: 0,
                  }}
                >
                  Postpone
                </Button>
              </Box>

              <Box sx={{ flex: 1 }}>
                <Button
                  variant="contained"
                  onClick={handleDispatch}
                  disabled={!selectedSecurity || dispatchMutation.isPending}
                  sx={{
                    width: '100%',
                    height: '56px',
                    borderRadius: 0,
                  }}
                >
                  Dispatch
                </Button>
              </Box>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* POSTPONE */}
      <Dialog open={openPostponeDialog} onClose={() => setOpenPostponeDialog(false)}>
        <DialogTitle>Postpone Alarm</DialogTitle>

        <DialogContent>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label="Postpone Until"
              value={postponeDate}
              onChange={(v) => setPostponeDate(v)}
            />
          </LocalizationProvider>

          <CustomTextField
            label="Reason"
            value={postponeReason}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setPostponeReason(e.target.value)}
            fullWidth
            multiline
            sx={{ mt: 2 }}
          />
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpenPostponeDialog(false)}>Cancel</Button>

          <Button onClick={handlePostpone}>Confirm</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AlarmDetailDialog;
