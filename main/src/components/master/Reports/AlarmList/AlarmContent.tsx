import { useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  TextField,
  MenuItem,
} from '@mui/material';
import { BASE_URL } from 'src/utils/axios';
import { VisitorType } from 'src/store/apps/crud/visitor';
import { memberType } from 'src/store/apps/crud/member';
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
import TrackingPositionFloorView from '../trackingTransaction/Preview/TrackingPositionFloorView';
import { useAllSecurityLookup, useAllSecuritys } from 'src/hooks/useSecurityGuard';
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';
import CustomAutocomplete from 'src/components/shared/CustomAutocomplete';
dayjs.extend(duration);

const AlarmContent = () => {
  const dispatch: AppDispatch = useDispatch();
  const language = useSelector((state: RootState) => state.customizer.isLanguage);
  const searchParams = new URLSearchParams(window.location.search);
  const autoAlarmSelectDone = useRef(false);
  const selectedIntruder = useSelector(
    (state: RootState) => state.alarmTriggerReducer.selectedIntruder,
  );
  const selectedVisitor = useSelector((state: RootState) => state.visitorReducer.selectedVisitor);
  const selectedMember = useSelector((state: RootState) => state.memberReducer.selectedMember);

  const alarmTriggerFilter = useSelector(
    (state: RootState) => state.alarmTriggerReducer.alarmTriggerFilter,
  );
  const { data: data, isLoading } = useAlarmTriggerList(alarmTriggerFilter);
  const alarmTriggerData = data?.data ?? [];

  const { data: securityData = [], isLoading: isLoadingSecurity } = useAllSecurityLookup();
  const [selectedSecurity, setSelectedSecurity] = useState<memberType | null>(null);

  // Determine which person to display based on selectedIntruder
  const [currentPerson, setCurrentPerson] = useState<VisitorType | memberType | null>(null);
  const [personType, setPersonType] = useState<'Visitor' | 'Member' | null>(null);

  useEffect(() => {
    if (selectedIntruder) {
      console.log('Selected intruder:', selectedIntruder);

      // Determine person type from selectedIntruder
      const type = selectedIntruder.personType as 'Visitor' | 'Member';
      setPersonType(type);

      // Set the current person based on type
      if (type === 'Visitor' && selectedVisitor) {
        setCurrentPerson(selectedVisitor);
        // Update filter for visitor
        dispatch(
          UpdateFilter({
            ...alarmTriggerFilter,
            Length: 999,
            filters: { visitorId: selectedVisitor.id },
          }),
        );
      } else if (type === 'Member' && selectedMember) {
        setCurrentPerson(selectedMember);
        // Update filter for member
        dispatch(UpdateFilter({ ...alarmTriggerFilter, filters: { memberId: selectedMember.id } }));
      } else {
        setCurrentPerson(null);
      }
    } else {
      setCurrentPerson(null);
      setPersonType(null);
    }
  }, [selectedIntruder, selectedVisitor, selectedMember]);

  useEffect(() => {
    console.log('alarmTriggerData updated:', alarmTriggerData);
  }, [alarmTriggerData]);

  const field = {
    fontWeight: 800,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: 'block',
    maxWidth: '100%',
  };

  const value = {
    fontWeight: 300,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: 'block',
    maxWidth: '100%',
  };

  useEffect(() => {
    if (autoAlarmSelectDone.current) return;
    if (!alarmTriggerData?.length) return;

    const alarmTriggerId = searchParams.get('alarmTriggerId');
    if (!alarmTriggerId) return;

    const matchedAlarm = alarmTriggerData.find(
      (alarm) => alarm.id.toLowerCase() === alarmTriggerId.toLowerCase(),
    );

    if (matchedAlarm) {
      setSelectedAlarmTrigger(matchedAlarm);
      setOpenActionDialog(true);
      autoAlarmSelectDone.current = true;
    }
  }, [alarmTriggerData, searchParams]);

  // Alarm Action
  const [openActionDialog, setOpenActionDialog] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [selectedAlarmTrigger, setSelectedAlarmTrigger] = useState<AlarmTriggerType | null>(null);
  const [investigateResult, setInvestigateResult] = useState<string>('');

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
    if (selectedAction === 'Done' && investigateResult.trim() === '') {
      toast.error('Please provide investigation result');
      return;
    }

    try {
      const result = await assignActionMutation.mutateAsync({
        triggerId: selectedAlarmTrigger.id.toUpperCase(),
        actionStatus: selectedAction.toLowerCase(),
        investigatedResult: investigateResult.trim() === '' ? null : investigateResult,
        assignedSecurityId:
          selectedAction.toLowerCase() === 'investigated' && selectedSecurity
            ? selectedSecurity.id
            : null,
      });

      toast.success('Action dispatched successfully');
      handleCloseActionDialog();
      setSelectedSecurity(null);
      setSelectedAction('');
    } catch (error: any) {
      toast.error('Error dispatching action');
      console.error('Error dispatching action', error);
    } finally {
    }
  };

  const formatActionLabel = (value: string) => {
    if (!value) return '-';
    return value.replace(/([a-z])([A-Z])/g, '$1 $2');
  };

  if (!currentPerson)
    return (
      <Box p={3} display="flex" flexDirection="column" alignItems="center">
        <Typography variant="h4">No {personType?.toLowerCase() || 'person'} selected</Typography>
        <Typography variant="h6">
          Please select a {personType?.toLowerCase() || 'person'}
        </Typography>
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
        {/* ============ PERSON PHOTO ============ */}
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          sx={{ minWidth: 180 }}
        >
          <Avatar
            alt={`${personType} Face`}
            src={`${BASE_URL}${currentPerson.faceImage ?? ''}`}
            sx={{
              width: 160,
              height: 160,
              mb: 1,
              border: '3px solid #1976d2',
            }}
          />
          {/* Person Type Badge */}
          <Chip
            label={personType}
            color={personType === 'Visitor' ? 'primary' : 'success'}
            sx={{ fontWeight: 700, mt: 1 }}
          />
        </Box>

        {/* ============ PERSON FIELDS ============ */}
        <Box flexGrow={1}>
          <Grid container spacing={2}>
            {/* Common Fields for both Visitor and Member */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography sx={field}>Name</Typography>
              <Box display="flex" gap={1}>
                <Typography sx={value}>{currentPerson.name}</Typography>
                {/* Blacklist Chip - common for both */}
                {'isBlacklist' in currentPerson && currentPerson.isBlacklist ? (
                  <Chip label="Blacklisted" color="error" size="small" sx={{ fontWeight: 700 }} />
                ) : null}
                {/* VIP Chip - only for Visitor */}
                {personType === 'Visitor' && 'isVip' in currentPerson && currentPerson.isVip ? (
                  <Chip label="VIP" color="warning" size="small" sx={{ fontWeight: 700 }} />
                ) : null}
              </Box>
            </Grid>

            {/* Gender - common */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography sx={field}>Gender</Typography>
              <Typography sx={value}>{currentPerson.gender}</Typography>
            </Grid>

            {/* Address - common */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography sx={field}>Address</Typography>
              <Typography sx={value}>{currentPerson.address}</Typography>
            </Grid>

            {/* Card Number - common */}
            {'cardNumber' in currentPerson && (
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Typography sx={field}>Card Number</Typography>
                <Typography sx={value}>{currentPerson.cardNumber}</Typography>
              </Grid>
            )}

            {/* BLE Card Number - common */}
            {'bleCardNumber' in currentPerson && (
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Typography sx={field}>BLE Card Number</Typography>
                <Typography sx={value}>{currentPerson.bleCardNumber}</Typography>
              </Grid>
            )}

            {/* Visitor Specific Fields */}
            {personType === 'Visitor' && (
              <>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography sx={field}>Organization</Typography>
                  <Typography sx={value}>
                    {(currentPerson as VisitorType).organizationName}
                  </Typography>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography sx={field}>Department</Typography>
                  <Typography sx={value}>
                    {(currentPerson as VisitorType).departmentName}
                  </Typography>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography sx={field}>District</Typography>
                  <Typography sx={value}>{(currentPerson as VisitorType).districtName}</Typography>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography sx={field}>Identity Type</Typography>
                  <Typography sx={value}>{(currentPerson as VisitorType).identityType}</Typography>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography sx={field}>Identity ID</Typography>
                  <Typography sx={value}>{(currentPerson as VisitorType).identityId}</Typography>
                </Grid>
              </>
            )}

            {/* Member Specific Fields */}
            {personType === 'Member' && (
              <>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography sx={field}>Organization</Typography>
                  <Typography sx={value}>
                    {(currentPerson as memberType).organization?.name || '-'}
                  </Typography>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography sx={field}>Department</Typography>
                  <Typography sx={value}>
                    {(currentPerson as memberType).department?.name || '-'}
                  </Typography>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography sx={field}>District</Typography>
                  <Typography sx={value}>
                    {(currentPerson as memberType).district?.name || '-'}
                  </Typography>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography sx={field}>Employee ID</Typography>
                  <Typography sx={value}>
                    {(currentPerson as memberType).personId || '-'}
                  </Typography>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Typography sx={field}>Join Date</Typography>
                  <Typography sx={value}>
                    {(currentPerson as memberType).joinDate || '-'}
                  </Typography>
                </Grid>
              </>
            )}

            {/* Email - common */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography sx={field}>Email</Typography>
              <Typography sx={value}>{currentPerson.email}</Typography>
            </Grid>

            {/* Phone - common */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography sx={field}>Phone</Typography>
              <Typography sx={value}>{currentPerson.phone}</Typography>
            </Grid>
          </Grid>
        </Box>
      </Box>

      {/* ================= ALARM TRIGGERS SECTION ================== */}
      <Typography variant="h5" fontWeight="bold" mb={2}>
        Alarm Triggered
      </Typography>

      <Grid
        container
        spacing={3}
        padding={1}
        sx={{
          maxHeight: '440px',
          overflowY: 'auto',
        }}
      >
        {alarmTriggerData.length === 0 && !isLoading && (
          <Typography>No alarm triggers found for this {personType?.toLowerCase()}.</Typography>
        )}
        {alarmTriggerData.map((alarmTrigger: AlarmTriggerType, index) => {
          const imgSrc = alarmTrigger.floorplanImage
            ? `${BASE_URL}${alarmTrigger.floorplanImage}`
            : alarmTrigger.floorplan?.floorplanImage
              ? `${BASE_URL}${alarmTrigger.floorplan.floorplanImage}`
              : null;

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
                {/* Floorplan Image */}
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
                    position: 'relative',
                  }}
                >
                  {imgSrc ? (
                    <Box
                      sx={{
                        width: '100%',
                        height: '100%',
                        position: 'relative',
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
                        label={formatActionLabel(alarmTrigger.alarm)}
                        sx={{
                          bgcolor: alarmTrigger.alarmColor || 'secondary.dark',
                          color: 'white',
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          zIndex: 1,
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
                    {alarmTrigger.floorplanName ?? 'Unknown Floorplan'}
                  </Typography>
                  <Chip
                    sx={{
                      backgroundColor: actionStatusColormap[alarmTrigger.action] || 'grey',
                      color: 'white',
                      borderRadius: '8px',
                      minWidth: '50px',
                    }}
                    size="small"
                    label={alarmTrigger.action}
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
      <Dialog
        open={openActionDialog && selectedAlarmTrigger !== null}
        onClose={handleCloseActionDialog}
        fullWidth
        maxWidth="lg"
      >
        <DialogTitle sx={{ mt: 1, p: 3 }}>Alarm Details</DialogTitle>
        <DialogContent sx={{ mt: 1, p: 3 }}>
          <Box
            sx={{
              width: '100%',
              height: '40vh',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: '#f5f5f5',
              borderTop: '1px solid #e0e0e0',
              p: 2,
              mb: 2,
            }}
          >
            {selectedAlarmTrigger && (
              <Box
                sx={{
                  position: 'relative',
                  width: '100%',
                  height: '100%',
                  borderRadius: 2,
                  overflow: 'hidden',
                  boxShadow: 2,
                  backgroundColor: '#f5f5f5',
                }}
              >
                <TrackingPositionFloorView
                  floorplanId={selectedAlarmTrigger.floorplanId ?? ''}
                  positionPxX={selectedAlarmTrigger.posX}
                  positionPxY={selectedAlarmTrigger.posY}
                  markerColor={
                    selectedAlarmTrigger.isActive
                      ? 'red'
                      : (selectedAlarmTrigger.alarmColor ?? 'yellow')
                  }
                />
              </Box>
            )}
          </Box>
          {/* Alarm Info */}
          <Typography variant="body2" color="text.secondary" mb={1}>
            Alarm Category:
          </Typography>
          <Typography variant="body1" fontWeight={600} mb={2}>
            {selectedAlarmTrigger?.alarm?.toUpperCase() || '-'}
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
                      selectedAlarmTrigger?.action?.toLowerCase() === item.value.toLowerCase();

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

          {/* Investigate Result */}
          {selectedAction.toLowerCase() === 'done' && selectedAlarmTrigger?.isActive && (
            <Box mt={3}>
              <Typography variant="subtitle2" color="text.secondary" mb={1}>
                Investigate Result
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                value={investigateResult}
                onChange={(e) => setInvestigateResult(e.target.value)}
              />
            </Box>
          )}

          {/* Select Security Guard */}
          {selectedAction.toLowerCase() === 'investigated' && selectedAlarmTrigger?.isActive && (
            <Box mt={3}>
              <Typography variant="subtitle2" color="text.secondary" mb={1}>
                Select Security Guard
              </Typography>
              <CustomAutocomplete
                label="Security Guard"
                options={securityData || []}
                value={selectedSecurity}
                loading={isLoadingSecurity}
                onChange={(newValue) => setSelectedSecurity(newValue)}
                getOptionLabel={(option) => option?.name ?? ''}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                required
                helperText={!selectedSecurity ? 'Please select a security guard' : undefined}
              />
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 3 }}>
          <Button onClick={handleCloseActionDialog} color="error" variant="outlined">
            Close
          </Button>

          {/* Only show confirm if alarm is active */}
          {selectedAlarmTrigger?.isActive && (
            <Button
              onClick={handleApplyAction}
              color="primary"
              variant="contained"
              disabled={
                !selectedAction ||
                !selectedAlarmTrigger ||
                assignActionMutation.isPending ||
                (selectedAction.toLowerCase() === 'done' && investigateResult.trim() === '')
              }
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
