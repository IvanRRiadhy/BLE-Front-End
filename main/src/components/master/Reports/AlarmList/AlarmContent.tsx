import { useSelector } from 'react-redux';
import { AppDispatch, RootState, useDispatch } from 'src/store/Store';
import {
  Box,
  Typography,
  Chip,
  Avatar,
  Grid2 as Grid,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  DialogActions,
} from '@mui/material';
// import Grid from '@mui/material/Grid2';
import { BASE_URL } from 'src/utils/axios';
import { VisitorType } from 'src/store/apps/crud/visitor';
import { fontWeight } from '@mui/system';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import { useEffect, useState } from 'react';
import { formatFullDateTime } from 'src/utils/time';
import {
  useAlarmTriggerList,
  useAllIntruders,
  useAssignActionAlarmTriggerByID,
} from 'src/hooks/useAlarmTrigger';
import { AlarmTriggerType, UpdateFilter } from 'src/store/apps/crud/alarmTrigger';
import { actionStatus, actionStatusColormap } from 'src/types/crud/input';
import toast from 'react-hot-toast';
dayjs.extend(duration);

const AlarmContent = () => {
  const dispatch: AppDispatch = useDispatch();
  const language = useSelector((state: RootState) => state.customizer.isLanguage);

  const selectedTrx = useSelector((state: RootState) => state.TrxVisitorReducer.SelectedTrxVisitor);
  const selectedVisitor = useSelector((state: RootState) => state.visitorReducer.selectedVisitor);
  const selectedMember = useSelector((state: RootState) => state.memberReducer.selectedMember);
  const selectedIntruder = useSelector(
    (state: RootState) => state.alarmTriggerReducer.selectedIntruder,
  );
  const alarmTriggerFilter = useSelector(
    (state: RootState) => state.alarmTriggerReducer.alarmTriggerFilter,
  );
  const { data: data, isLoading } = useAlarmTriggerList(alarmTriggerFilter);
  const alarmTriggerData = data?.data ?? [];

  useEffect(() => {
    if (selectedIntruder) {
      console.log(selectedIntruder);
      switch (selectedIntruder.personType) {
        case 'Visitor':
          if (selectedVisitor) {
            dispatch(
              UpdateFilter({ ...alarmTriggerFilter, filters: { visitorId: selectedVisitor.id } }),
            );
          }
          break;
        case 'Member':
          if (selectedMember) {
            dispatch(
              UpdateFilter({ ...alarmTriggerFilter, filters: { memberId: selectedMember.id } }),
            );
          }
          break;
      }
    }
  }, [selectedIntruder]);

  useEffect(() => {
    console.log('alarmTriggerData updated:', alarmTriggerData);
  }, [alarmTriggerData]);

  const field = {
    fontWeight: 800,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: 'block',
    maxWidth: '100%', // important for Grid2
  };
  const value = {
    fontWeight: 300,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: 'block',
    maxWidth: '100%', // important for Grid2
  };

  // Alarm Action
  const [openActionDialog, setOpenActionDialog] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [selectedAlarmTrigger, setSelectedAlarmTrigger] = useState<AlarmTriggerType | null>(null);

  const handleOpenActionDialog = () => {
    setSelectedAction('');
    setOpenActionDialog(true);
  };

  const handleCloseActionDialog = () => {
    setOpenActionDialog(false);
    setSelectedAction('');
  };

  const assignActionMutation = useAssignActionAlarmTriggerByID();

  const handleApplyAction = async () => {
    if (!selectedAlarmTrigger) {
      handleCloseActionDialog();
      toast.error('Please select an alarm');
      return;
    }
    if (!selectedAction) {
      handleCloseActionDialog();
      toast.error('Please select an action status');
      return;
    }

    try {
      const result = await assignActionMutation.mutateAsync({
        triggerId: selectedAlarmTrigger.id.toUpperCase(),
        actionStatus: selectedAction.toLowerCase(),
      });

      // With React Query, if mutateAsync resolves, it means the mutation was successful
      toast.success('Action dispatched successfully');

      // No need to manually refetch - the mutation's onSuccess already invalidates queries
      // which will automatically trigger refetch of any active useAlarmTriggerList queries
    } catch (error: any) {
      toast.error('Error dispatching action');
      console.error('Error dispatching action', error);
    } finally {
      handleCloseActionDialog();
    }
  };

  const formatActionLabel = (value: string) => {
    if (!value) return '-';
    return value.replace(/([a-z])([A-Z])/g, '$1 $2'); // Adds space before capital letters
  };

  if (!selectedVisitor)
    return (
      <Box p={3} display="flex" flexDirection="column" alignItems="center">
        <Typography variant="h4">No visitor selected</Typography>
        <Typography variant="h6"> Please select a visitor</Typography>
      </Box>
    );
  return (
    <Box p={3}>
      {/* ================= TOP SECTION ================== */}
      <Box
        display="flex"
        alignItems="flex-start"
        gap={4}
        mb={2}
        sx={{ borderBottom: '1px solid #DDD', pb: 3 }}
      >
        {/* ============ VISITOR PHOTO ============ */}
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          sx={{ minWidth: 180 }}
        >
          <Avatar
            alt="Visitor Face"
            src={`${BASE_URL}${selectedVisitor.faceImage ?? ''}`}
            sx={{
              width: 160,
              height: 160,
              mb: 1,
              border: '3px solid #1976d2',
            }}
          />
        </Box>
        {/* ============ VISITOR FIELDS ============ */}
        <Box flexGrow={1}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography sx={field}>Name</Typography>

              <Box display="flex" gap={1}>
                <Typography sx={value}>{selectedVisitor.name}</Typography>
                {}
                {selectedVisitor.isBlacklist ? (
                  <Chip label="Blacklisted" color="error" size="small" sx={{ fontWeight: 700 }} />
                ) : selectedVisitor.isVip ? (
                  <Chip label="VIP" color="warning" size="small" sx={{ fontWeight: 700 }} />
                ) : (
                  <></>
                )}
              </Box>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography sx={field}>Organization</Typography>
              <Typography sx={value}>{selectedVisitor.organizationName}</Typography>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography sx={field}>Gender</Typography>
              <Typography sx={value}>{selectedVisitor.gender}</Typography>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography sx={field}>Address</Typography>
              <Typography sx={value}>{selectedVisitor.address}</Typography>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography sx={field}>Card Number</Typography>
              <Typography sx={value}>{selectedVisitor.cardNumber}</Typography>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography sx={field}>BLE Card Number</Typography>
              <Typography sx={value}>{selectedVisitor.bleCardNumber}</Typography>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography sx={field}>Department</Typography>
              <Typography sx={value}>{selectedVisitor.departmentName}</Typography>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography sx={field}>District</Typography>
              <Typography sx={value}>{selectedVisitor.districtName}</Typography>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography sx={field}>Identity Type</Typography>
              <Typography sx={value}>{selectedVisitor.identityType}</Typography>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography sx={field}>Identity ID</Typography>
              <Typography sx={value}>{selectedVisitor.identityId}</Typography>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography sx={field}>Email</Typography>
              <Typography sx={value}>{selectedVisitor.email}</Typography>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography sx={field}>Phone</Typography>
              <Typography sx={value}>{selectedVisitor.phone}</Typography>
            </Grid>
          </Grid>
        </Box>
      </Box>

      {/* ================= NEXT SECTION PLACEHOLDER ================== */}
      <Typography variant="h5" fontWeight="bold" mb={2}>
        Alarm Triggered
      </Typography>

      <Grid container spacing={3}>
        {alarmTriggerData.length === 0 && !isLoading && (
          <Typography>No alarm triggers found for this visitor.</Typography>
        )}
        {alarmTriggerData.map((alarmTrigger: AlarmTriggerType, index) => {
          const imgSrc = alarmTrigger.floorplanImage
            ? `${BASE_URL}${alarmTrigger.floorplanImage}`
            : alarmTrigger.floorplan?.floorplanImage
            ? `${BASE_URL}${alarmTrigger.floorplan.floorplanImage}`
            : null;
          // console.log('imgSrc', alarmTrigger.floorplanImage);
          // Format time + duration
          const lang = language === 'id' ? 'id' : 'en';
          const append = language === 'id' ? 'hingga' : 'to';

          const startFormatted = alarmTrigger.triggerTime
            ? formatFullDateTime(alarmTrigger.triggerTime, lang)
            : '-';
          const endFormatted = alarmTrigger.doneTimestamp
            ? formatFullDateTime(alarmTrigger.doneTimestamp, lang)
            : lang === 'id'
            ? 'Aktif'
            : 'Active';

          // let timeRange = '-';
          // if(startFormatted && endFormatted) {
          //   timeRange = `${startFormatted} ${append} ${endFormatted}`;
          // }
          return (
            <Grid key={index} size={{ xs: 12, sm: 6, md: 3, lg: 2 }}>
              <Box
                onClick={() => {
                  setSelectedAlarmTrigger(alarmTrigger);
                  setOpenActionDialog(true);
                }}
                sx={{
                  border: '1px solid #CCC',
                  borderRadius: 1.5,
                  p: 1,
                  height: '100%',
                  bgcolor: '#fafafa',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    borderColor: 'primary.main',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    transform: 'translateY(-2px)',
                    bgcolor: '#f5f5f5',
                  },
                }}
              >
                {/* Floorplan Image placeholder */}
                <Box
                  sx={{
                    width: '100%',
                    height: 100,
                    borderRadius: 1,
                    overflow: 'hidden',
                    border: '1px solid #DDD',
                    mb: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: '#e1e1e1',
                    position: 'relative', // 1. Container utama jadi referensi posisi
                  }}
                >
                  {imgSrc ? (
                    <Box
                      sx={{
                        width: '100%',
                        height: '100%',
                        position: 'relative', // 2. Container gambar jadi referensi posisi Chip
                      }}
                    >
                      <img
                        src={imgSrc}
                        alt="Floorplan"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                      <Chip
                        label={formatActionLabel(alarmTrigger.alarmRecordStatus)} // Tambahkan properti label yang diperlukan
                        sx={{
                          bgcolor: alarmTrigger.alarmColor || 'secondary.dark',
                          color: 'white',
                          position: 'absolute', // 3. Posisi absolut relatif ke container parent
                          top: 8, // Jarak dari atas
                          right: 8, // Jarak dari kanan
                          zIndex: 1, // Pastikan Chip di atas gambar
                        }}
                        size="small"
                      />
                    </Box>
                  ) : (
                    <Typography sx={{ color: '#777' }}>No Image</Typography>
                  )}
                </Box>

                {/* Floorplan Name */}
                <Grid display="flex" alignItems="center" justifyContent="space-between">
                  <Typography
                    fontWeight={700}
                    fontSize="0.85rem"
                    sx={{
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {alarmTrigger.floorplan?.name ?? 'Unknown Floorplan'}
                  </Typography>
                  <Chip
                    sx={{
                      backgroundColor: actionStatusColormap[alarmTrigger.actionStatus] || 'grey',
                      color: 'white',
                      borderRadius: '8px',
                      minWidth: '50px',
                    }}
                    size="small"
                    label={alarmTrigger.actionStatus}
                  />
                </Grid>

                {/* Time Range */}
                <Typography fontWeight={400} fontSize="0.75rem" color="text.secondary">
                  {startFormatted} {endFormatted.startsWith('A') ? '' : append} {endFormatted}
                </Typography>
              </Box>
            </Grid>
          );
        })}
      </Grid>
      {/* ⚙️ Apply Action Dialog */}
      <Dialog open={openActionDialog} onClose={handleCloseActionDialog} fullWidth maxWidth="sm">
        <DialogTitle>Apply Action to Alarm</DialogTitle>
        <DialogContent sx={{ mt: 1 }}>
          {/* Alarm Info */}
          <Typography variant="body2" color="text.secondary" mb={1}>
            Alarm DMAC:
          </Typography>
          <Typography variant="body1" fontWeight={600} mb={2}>
            {selectedAlarmTrigger?.beaconId?.toUpperCase() || '-'}
          </Typography>

          {/* If alarm is inactive */}
          {!selectedAlarmTrigger?.isActive ? (
            <Box
              sx={{
                border: '1px dashed',
                borderColor: 'error.main',
                borderRadius: 2,
                p: 2,
                backgroundColor: 'rgba(255, 0, 0, 0.05)',
              }}
            >
              <Typography variant="h6" color="error" fontWeight={600}>
                Alarm is no longer active
              </Typography>
              <Typography variant="body2" color="text.secondary" mt={0.5}>
                You cannot apply any new actions to an inactive alarm.
              </Typography>
            </Box>
          ) : (
            <>
              {/* If alarm is active, show chip-style status selector */}
              <Typography variant="subtitle2" color="text.secondary" mb={1}>
                Select Action Status
              </Typography>

              <Box display="flex" flexWrap="wrap" gap={1}>
                {actionStatus
                  .filter((item) => !item.disabled)
                  .map((item) => {
                    const isActiveStatus =
                      selectedAlarmTrigger?.actionStatus?.toLowerCase() ===
                      item.value.toLowerCase();

                    const isSelected = selectedAction?.toLowerCase() === item.value.toLowerCase();

                    return (
                      <Button
                        key={item.value}
                        variant="outlined"
                        disabled={isActiveStatus}
                        onClick={() => setSelectedAction(item.value)}
                        sx={{
                          borderRadius: '20px',
                          textTransform: 'none',
                          px: 2,
                          py: 0.75,
                          border: '1px solid',
                          borderColor: isSelected ? 'primary.main' : 'rgba(0,0,0,0.23)',
                          backgroundColor: isSelected ? 'primary.main' : 'transparent',
                          color: isSelected
                            ? 'white'
                            : isActiveStatus
                            ? 'text.disabled'
                            : 'text.primary',
                          '&:hover': {
                            backgroundColor: isSelected ? 'primary.dark' : 'rgba(0,0,0,0.05)',
                          },
                          transition: 'all 0.15s ease-in-out',
                        }}
                      >
                        {item.label}
                      </Button>
                    );
                  })}
              </Box>
            </>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={handleCloseActionDialog} color="error" variant="outlined">
            Close
          </Button>

          {/* Only show confirm if alarm is active */}
          {selectedAlarmTrigger?.isActive && (
            <Button
              onClick={handleApplyAction}
              color="primary"
              variant="contained"
              disabled={!selectedAction || !selectedAlarmTrigger || assignActionMutation.isPending}
            >
              {assignActionMutation.isPending ? 'Applying...' : 'Apply Action'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AlarmContent;
