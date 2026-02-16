import React, { useEffect, useRef, useState } from 'react';
import { Dialog, Box, Button, Typography, Popover, Chip, Stack } from '@mui/material';
import { AlarmType, MQTTAlarmType } from 'src/store/apps/tracking/Alarm';
import { actionStatus, actionStatusColormap } from 'src/types/crud/input';
import toast from 'react-hot-toast';
import {
  useAcknowledgeAlarmTrigger,
  useAlarmTriggerList,
  useAllAlarmTriggers,
  // useAssignActionAlarmTriggerByDMAC,
  useAssignActionAlarmTriggerByDMAC,
  useAssignActionAlarmTriggerByID,
} from 'src/hooks/useAlarmTrigger';
import { alpha, darken, useTheme } from '@mui/material/styles';
import { motion, AnimatePresence } from 'framer-motion';
import AlarmActionForm from 'src/components/shared/AlarmActionForm';
import { useAllSecurityLookup } from 'src/hooks/useSecurityGuard';
import { memberType } from 'src/store/apps/crud/member';
import {
  AlarmLogItem,
  ClearAlarmPopup,
  MarkAlarmSeen,
  ShowAlarmPopup,
} from 'src/store/apps/tracking/Beacon';
import { dispatch } from 'src/store/Store';
import { useEnrichedAlarmLogs, useUnseenAlarms } from 'src/hooks/useTrackingLogs';
import Scrollbar from 'src/components/custom-scroll/Scrollbar';
import AlarmMenuItem from './vertical/header/AlarmMenuItem';
import { defaultAlarmTriggerFilter } from 'src/store/apps/defaultForm';
import AlarmTriggerMenuItem from './shared/AlarmTriggerMenuItem';

interface AlarmPopupProps {
  alarm: AlarmLogItem | null | undefined;
  // open: boolean;
  // onClose: () => void;
}

// Priority color mapping
const PRIORITY_COLORS: Record<string, string> = {
  low: '#ffc107', // Yellow
  medium: '#ff9800', // Orange
  high: '#f44336', // Red
};

const getPriorityColor = (priority: string): string => {
  const normalizedPriority = priority?.toLowerCase() || 'medium';
  return PRIORITY_COLORS[normalizedPriority] || PRIORITY_COLORS.medium;
};

const AlarmPopup: React.FC<AlarmPopupProps> = ({ alarm }) => {
  const popupRef = useRef<HTMLDivElement | null>(null);
  const [panelRect, setPanelRect] = useState<DOMRect | null>(null);

  const theme = useTheme();
  // React Query mutation hook
  const assignActionMutation = useAssignActionAlarmTriggerByDMAC();
  const assignActionByIdMutation = useAssignActionAlarmTriggerByID();
  const acknowledgeMutation = useAcknowledgeAlarmTrigger();

  const { data: data } = useAlarmTriggerList({
    ...defaultAlarmTriggerFilter,
    Length: 999,
    filters: { action: 'Idle', isActive: true },
  });
  const alarmLogs = data?.data || [];
  // const { unseenAlarms, unseenCount, markSeen } = useUnseenAlarms(alarm?.id);
  // State for action popover
  const [actionAnchorEl, setActionAnchorEl] = useState<HTMLElement | null>(null);
  const [selectedAction, setSelectedAction] = useState<string>('');

  const { data: securityData = [], isLoading: isLoadingSecurity } = useAllSecurityLookup();

  const [investigateResult, setInvestigateResult] = useState('');
  const [selectedSecurity, setSelectedSecurity] = useState<memberType | null>(null);

  const [openUnseenDialog, setOpenUnseenDialog] = useState(false);
  const [visuallySeenIds, setVisuallySeenIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    console.log('Alarm: ', alarm);
    console.log('ALARM TRIGGERS: ', alarmLogs);
  }, [alarm]);

  const handleDisarmClick = (event: React.MouseEvent<HTMLElement>) => {
    setActionAnchorEl(popupRef.current);
  };

  const handleActionClose = () => {
    setActionAnchorEl(null);
    setSelectedAction('');
  };

  const extractTriggerId = (alarmId: string): string | null => {
    const match = alarmId.match(/^alarm-([a-fA-F0-9-]{36})-/);
    return match ? match[1] : null;
  };

  const handleApplyAction = async () => {
    if (!alarm?.dmac) {
      toast.error('No alarm selected');
      handleActionClose();
      return;
    }

    if (!selectedAction) {
      toast.error('Please select an action status');
      return;
    }

    if (selectedAction.toLowerCase() === 'done' && investigateResult.trim() === '') {
      toast.error('Please provide investigation result');
      return;
    }

    if (selectedAction.toLowerCase() === 'investigated' && !selectedSecurity) {
      toast.error('Please select a security guard');
      return;
    }

    const idsToProcess =
      visuallySeenIds.size > 0 ? Array.from(visuallySeenIds) : [];
    const currentTriggerId = extractTriggerId(alarm?.id);
    if(currentTriggerId && !visuallySeenIds.has(currentTriggerId)) {
      idsToProcess.push(currentTriggerId);
    }
    // idsToProcess.push(extractTriggerId(alarm?.id) ?? '');
    let successCount = 0;
    let failedCount = 0;

    for (const triggerId of idsToProcess) {
      // const triggerId = extractTriggerId(alarmId);

      if (!triggerId) {
        failedCount++;
        continue;
      }

      try {
        await assignActionByIdMutation.mutateAsync({
          triggerId,
          actionStatus: selectedAction.toLowerCase(),
          investigatedResult:
            selectedAction.toLowerCase() === 'done' ? investigateResult.trim() : null,
          assignedSecurityId:
            selectedAction.toLowerCase() === 'investigated' && selectedSecurity
              ? selectedSecurity.id
              : null,
        });

        successCount++;
      } catch {
        failedCount++;
      }
    }
    if (successCount > 0) {
      toast.success(`Processed: ${successCount} success`);
    }
    if (failedCount > 0) {
      toast.error(`Processed: ${failedCount} failed`);
    }
    // toast.success(`Processed: ${successCount} success, ${failedCount} failed`);
    setVisuallySeenIds(new Set());
    handleActionClose();
    dispatch(ClearAlarmPopup());
  };

  const actionOpen = Boolean(actionAnchorEl);
  const actionId = actionOpen ? 'action-status-popover' : undefined;

  // Get priority color for the popup background
  const priorityColor = getPriorityColor(alarm?.priority || 'medium');
  // Get chip color from alarm.color or use a default
  const chipColor = alarm?.color || '#2196f3';

  const handleBackdropClose = () => {
    // ❗ UI-only close
    dispatch(ClearAlarmPopup());
    if(alarm) {
      acknowledgeMutation.mutateAsync(alarm.triggerId);
    }
  };
  useEffect(() => {
    if (!alarm) return;

    // 🔥 Hard reset UI state when alarm changes
    setActionAnchorEl(null);
    setSelectedAction('');
    setInvestigateResult('');
    setSelectedSecurity(null);
    setOpenUnseenDialog(false);
    setVisuallySeenIds(new Set());
  }, [alarm?.id]);
  useEffect(() => {
    if (!alarm) {
      setActionAnchorEl(null);
      setSelectedAction('');
      setInvestigateResult('');
      setSelectedSecurity(null);
      setOpenUnseenDialog(false);
      setVisuallySeenIds(new Set());
    }
  }, [alarm]);

  //Unseen Alarm

  const errorColor = theme.palette.error.main;
  const primaryColor = theme.palette.primary.main;
  const neutralBg = theme.palette.common.white;

  const unseenBg = alpha(errorColor, 0.14);
  const hoverBg = neutralBg;
  const seenBg = alpha(primaryColor, 0.1);

  const unseenBorder = errorColor;
  const hoverBorder = theme.palette.grey[400];
  const seenBorder = primaryColor;

  useEffect(() => {
    if (!popupRef.current) return;

    const updateRect = () => {
      if (!popupRef.current) return;
      setPanelRect(popupRef.current.getBoundingClientRect());
    };

    updateRect(); // initial measure

    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect);

    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect);
    };
  }, [alarm, actionOpen, openUnseenDialog]);

  return (
    <>
      {/* ========= ROOT MODAL (ONLY ONE) ========= */}
      <Dialog
        open={Boolean(alarm)}
        onClose={(_, reason) => {
          if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
            handleBackdropClose();
          }
        }}
        fullScreen
        // hideBackdrop
        disableEnforceFocus
        disableAutoFocus
        disableRestoreFocus
        PaperProps={{
          sx: {
            backgroundColor: 'transparent',
            boxShadow: 'none',
            overflow: 'visible',
          },
        }}
      >
        {/* Fullscreen interaction layer */}
        <Box
          sx={{
            position: 'fixed',
            inset: 0,
            pointerEvents: 'none', // 👈 key trick
          }}
        >
          <AnimatePresence>
            {alarm && (
              <>
                {/* ========= MAIN ALARM PANEL ========= */}
                <motion.div
                  key={`main-${alarm.id}`}
                  initial={{ opacity: 0, scale: 0.85, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.85, y: -20 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  style={{
                    position: 'absolute',
                    top: '30%',
                    left: '35%',
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'auto',
                    zIndex: 10,
                  }}
                >
                  <Box
                    ref={popupRef}
                    sx={{
                      background: `linear-gradient(135deg, ${alpha(priorityColor, 0.95)}, ${darken(
                        priorityColor,
                        0.25,
                      )})`,
                      color: 'white',
                      borderRadius: 4,
                      px: 6,
                      pt: 4,
                      pb: 8,
                      minWidth: { xs: '90vw', sm: 480, md: 600 },
                      maxWidth: '90vw',
                      textAlign: 'center',
                      boxShadow: `0 8px 30px ${alpha(priorityColor, 0.5)}`,
                      border: `1px solid ${alpha(priorityColor, 0.4)}`,
                      position: 'relative',
                    }}
                  >
                    {/* 🔴 UNSEEN BADGE */}
                    {alarmLogs.length > 0 && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: -20,
                          left: -20,
                          width: 48,
                          height: 48,
                          borderRadius: '50%',
                          backgroundColor: darken(priorityColor, 0.1),
                          color: '#fff',
                          fontWeight: 'bold',
                          fontSize: '1.1rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          boxShadow: `0 6px 18px ${alpha(priorityColor, 0.5)}`,
                          border: `2px solid ${alpha('#fff', 0.6)}`,
                        }}
                        onClick={() => setOpenUnseenDialog((v) => !v)}
                      >
                        +{alarmLogs.length}
                      </Box>
                    )}

                    <Typography variant="h2" fontWeight="bold" letterSpacing={3} mb={2}>
                      ALARM TRIGGERED
                    </Typography>

                    <Box
                      sx={{
                        backgroundColor: chipColor,
                        px: 3,
                        py: 1,
                        borderRadius: 20,
                        mb: 3,
                        fontWeight: 'bold',
                        fontSize: '1.2rem',
                      }}
                    >
                      {alarm.alarmStatus?.toUpperCase()}
                    </Box>

                    <Typography mb={2}>
                      🔔 Triggered by <b>{alarm.target}</b>
                    </Typography>

                    <Typography mb={2}>
                      Card: <b>{alarm.dmac}</b>
                    </Typography>

                    <Typography mb={3}>
                      Area: <b>{alarm.area}</b> | <b>{alarm.floor}</b>
                    </Typography>

                    <Box display="flex" justifyContent="center" gap={2} mb={3}>
                      <Typography>Priority:</Typography>
                      <Chip
                        label={alarm.priority?.toUpperCase() || 'MEDIUM'}
                        sx={{
                          backgroundColor: priorityColor,
                          color: 'white',
                          fontWeight: 'bold',
                        }}
                      />
                    </Box>

                    {/* ACTION BUTTON */}
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: -24,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        backgroundColor: '#fff',
                        borderRadius: 40,
                        px: 5,
                        py: 1.5,
                        boxShadow: 2,
                      }}
                    >
                      <Button
                        onClick={() => setActionAnchorEl(popupRef.current)}
                        sx={{
                          backgroundColor: '#fff',
                          color: priorityColor,
                          fontWeight: 'bold',
                          fontSize: '1.15rem',
                        }}
                      >
                        Disarm
                      </Button>
                    </Box>
                  </Box>
                </motion.div>

                {/* ========= UNSEEN ALARM PANEL (LEFT) ========= */}
                {openUnseenDialog && (
                  <motion.div
                    key="unseen"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    style={{
                      position: 'absolute',
                      top: panelRect ? panelRect.top : '-100%',
                      left: panelRect ? panelRect.left - 360 - 16 : 0,
                      // transform: 'translateY(-50%)',
                      width: 360,
                      pointerEvents: 'auto',
                      zIndex: 9,
                    }}
                  >
                    <Box
                      sx={{
                        backgroundColor: '#fff',
                        borderRadius: 2,
                        boxShadow: 6,
                        maxHeight: 460,
                      }}
                    >
                      <Scrollbar sx={{ height: 385 }}>
                        <Stack spacing={1} p={2}>
                          {/* {unseenAlarms.map((a) => (
                            <AlarmMenuItem
                              key={a.id}
                              alarm={a}
                              isVisuallySeen={visuallySeenIds.has(a.id)}
                              unseenBg={unseenBg}
                              seenBg={seenBg}
                              hoverBg={hoverBg}
                              unseenBorder={unseenBorder}
                              seenBorder={seenBorder}
                              hoverBorder={hoverBorder}
                              onClick={() => {
                                setVisuallySeenIds((prev) => {
                                  const updated = new Set(prev);

                                  if (updated.has(a.id)) {
                                    updated.delete(a.id); // 🔴 remove if already selected
                                  } else {
                                    updated.add(a.id); // 🟢 add if not selected
                                  }

                                  return updated;
                                });
                              }}
                            />
                          ))} */}
                          {alarmLogs.map((trigger) => (
                            <AlarmTriggerMenuItem
                              key={trigger.id}
                              trigger={trigger}
                              isClicked={visuallySeenIds.has(trigger.id)}
                              unseenBg={unseenBg}
                              seenBg={seenBg}
                              hoverBg={hoverBg}
                              unseenBorder={unseenBorder}
                              seenBorder={seenBorder}
                              hoverBorder={hoverBorder}
                              onClick={(t) =>
                                setVisuallySeenIds((prev) => {
                                  const updated = new Set(prev);

                                  if (updated.has(t.id)) {
                                    updated.delete(t.id);
                                  } else {
                                    updated.add(t.id);
                                  }

                                  return updated;
                                })
                              }
                            />
                          ))}
                        </Stack>
                      </Scrollbar>
                    </Box>
                  </motion.div>
                )}

                {/* ========= ACTION PANEL (RIGHT) ========= */}
                {actionOpen && (
                  <motion.div
                    key="action"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    style={{
                      position: 'absolute',
                      top: panelRect ? panelRect.top : '100%',
                      left: panelRect ? panelRect.right + 16 : 0,
                      // transform: 'translateY(-50%)',
                      width: 360,
                      pointerEvents: 'auto',
                      zIndex: 11,
                    }}
                  >
                    <Box sx={{ backgroundColor: '#fff', borderRadius: 2, p: 2, boxShadow: 8 }}>
                      <Typography variant="h6" fontWeight="bold" mb={2}>
                        {' '}
                        Select Action Status{' '}
                      </Typography>{' '}
                      <Typography variant="body2" color="text.secondary" mb={1}>
                        {' '}
                        Alarm DMAC:{' '}
                      </Typography>{' '}
                      <Typography variant="body1" fontWeight={600} mb={1}>
                        {' '}
                        {alarm?.dmac?.toUpperCase() || '-'}{' '}
                      </Typography>{' '}
                      {alarm && (
                        <Box
                          sx={{
                            backgroundColor: 'rgba(0, 0, 0, 0.04)',
                            p: 2,
                            borderRadius: 1,
                            mb: 1,
                          }}
                        >
                          {' '}
                          <Typography variant="body2" color="text.secondary">
                            {' '}
                            Person: {alarm?.target || 'Unknown'}{' '}
                          </Typography>{' '}
                          <Typography variant="body2" color="text.secondary">
                            {' '}
                            Area: {alarm?.area || 'Unknown'}{' '}
                          </Typography>{' '}
                          <Typography variant="body2" color="text.secondary">
                            {' '}
                            Priority:{' '}
                            <span style={{ color: priorityColor, fontWeight: 'bold' }}>
                              {' '}
                              {(alarm?.priority || 'medium').toUpperCase()}{' '}
                            </span>{' '}
                          </Typography>{' '}
                        </Box>
                      )}{' '}
                      {/* <Box display="flex" flexDirection="column" gap={1} mb={3}> {actionStatus .filter((item) => !item.disabled && item.value !== 'Idle') .map((item) => { const isSelected = selectedAction?.toLowerCase() === item.value.toLowerCase(); return ( <Box key={item.value} onClick={() => setSelectedAction(item.value)} sx={{ border: '1px solid', borderColor: isSelected ? 'primary.main' : 'grey.300', backgroundColor: isSelected ? 'primary.main' : 'transparent', color: isSelected ? 'white' : 'text.primary', borderRadius: 1, p: 2, cursor: 'pointer', transition: 'all 0.2s ease', '&:hover': { backgroundColor: isSelected ? 'primary.dark' : 'grey.50', borderColor: isSelected ? 'primary.dark' : 'grey.400', }, }} > <Box display="flex" alignItems="center" gap={1}> <Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: actionStatusColormap[item.value] || 'grey', border: isSelected ? '2px solid white' : 'none', }} /> <Typography variant="body1" fontWeight={500}> {item.label} </Typography> </Box> </Box> ); })} </Box> */}{' '}
                      <AlarmActionForm
                        alarmTrigger={{ id: alarm?.id, isActive: true }}
                        selectedAction={selectedAction}
                        setSelectedAction={setSelectedAction}
                        investigateResult={investigateResult}
                        setInvestigateResult={setInvestigateResult}
                        selectedSecurity={selectedSecurity}
                        setSelectedSecurity={setSelectedSecurity}
                        securityData={securityData}
                        isLoadingSecurity={isLoadingSecurity}
                        compact
                      />{' '}
                      <Box display="flex" gap={1} justifyContent="flex-end" mt={2}>
                        {' '}
                        <Button
                          onClick={handleActionClose}
                          variant="outlined"
                          color="inherit"
                          disabled={assignActionMutation.isPending}
                        >
                          {' '}
                          Cancel{' '}
                        </Button>{' '}
                        <Button
                          onClick={handleApplyAction}
                          variant="contained"
                          color="primary"
                          disabled={!selectedAction || assignActionMutation.isPending}
                        >
                          {' '}
                          {assignActionMutation.isPending ? 'Applying...' : 'Apply Action'}{' '}
                        </Button>{' '}
                      </Box>
                    </Box>
                  </motion.div>
                )}
              </>
            )}
          </AnimatePresence>
        </Box>
      </Dialog>
    </>
  );
};

export default AlarmPopup;
