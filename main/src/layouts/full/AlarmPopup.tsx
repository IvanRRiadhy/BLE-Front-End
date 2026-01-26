import React, { useEffect, useRef, useState } from 'react';
import { Dialog, Box, Button, Typography, Popover, Chip } from '@mui/material';
import { AlarmType, MQTTAlarmType } from 'src/store/apps/tracking/Alarm';
import { actionStatus, actionStatusColormap } from 'src/types/crud/input';
import toast from 'react-hot-toast';
import {
  // useAssignActionAlarmTriggerByDMAC,
  useAssignActionAlarmTriggerByDMAC,
} from 'src/hooks/useAlarmTrigger';
import { alpha, darken } from '@mui/material/styles';
import { motion, AnimatePresence } from 'framer-motion';
import AlarmActionForm from 'src/components/shared/AlarmActionForm';
import { useAllSecurityLookup } from 'src/hooks/useSecurityGuard';
import { memberType } from 'src/store/apps/crud/member';
import { AlarmLogItem, ClearAlarmPopup, MarkAlarmSeen } from 'src/store/apps/tracking/Beacon';
import { dispatch } from 'src/store/Store';

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
  // React Query mutation hook
  const assignActionMutation = useAssignActionAlarmTriggerByDMAC();

  // State for action popover
  const [actionAnchorEl, setActionAnchorEl] = useState<HTMLElement | null>(null);
  const [selectedAction, setSelectedAction] = useState<string>('');

  const { data: securityData = [], isLoading: isLoadingSecurity } = useAllSecurityLookup();

  const [investigateResult, setInvestigateResult] = useState('');
  const [selectedSecurity, setSelectedSecurity] = useState<memberType | null>(null);

  useEffect(() => {
    console.log('Alarm: ', alarm);
  }, [alarm]);

  const handleDisarmClick = (event: React.MouseEvent<HTMLElement>) => {
    setActionAnchorEl(popupRef.current);
  };

  const handleActionClose = () => {
    setActionAnchorEl(null);
    setSelectedAction('');
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

    try {
      await assignActionMutation.mutateAsync({
        dmac: alarm.dmac.toUpperCase(),
        actionStatus: selectedAction.toLowerCase(),
        investigatedResult:
          selectedAction.toLowerCase() === 'done' ? investigateResult.trim() : null,
        assignedSecurityId:
          selectedAction.toLowerCase() === 'investigated' && selectedSecurity
            ? selectedSecurity.id
            : null,
      });

      toast.success('Action applied successfully');
      handleActionClose();
      dispatch(MarkAlarmSeen(alarm.id));
      dispatch(ClearAlarmPopup());
    } catch (error) {
      toast.error('Error applying action');
      console.error(error);
    }
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

  // DO NOT mark as seen
  // DO NOT touch alarm log
};

  return (
    <>
      {/* ========= ALARM POPUP DIALOG ========= */}
      <Dialog
        open={Boolean(alarm)}
          onClose={(_, reason) => {
    // optional: ignore backdrop if you want
    if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
      handleBackdropClose();
    }
  }}
        PaperProps={{
          sx: {
            backgroundColor: 'transparent',
            boxShadow: 'none',
            overflow: 'visible',
          },
        }}
      >
        <AnimatePresence>
          {Boolean(alarm) && (
            <motion.div
              key={alarm?.id}
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: -20 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
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
                  position: 'relative',
                  boxShadow: `0 8px 30px ${alpha(priorityColor, 0.5)}`,
                  border: `1px solid ${alpha(priorityColor, 0.4)}`,
                }}
              >
                <Typography variant="h2" fontWeight="bold" letterSpacing={3} mb={2}>
                  ALARM TRIGGERED
                </Typography>

                <Box
                  sx={{
                    backgroundColor: chipColor,
                    color: 'white',
                    display: 'inline-block',
                    px: 3,
                    py: 1,
                    borderRadius: '20px',
                    mb: 3,
                    boxShadow: `0 4px 12px ${alpha(chipColor, 0.4)}`,
                    fontWeight: 'bold',
                    fontSize: '1.2rem',
                    letterSpacing: 1,
                    minWidth: '180px',
                  }}
                >
                  {alarm?.alarmStatus?.toUpperCase() || 'UNKNOWN'}
                </Box>

                <Box
                  sx={{
                    backgroundColor: 'rgba(255,255,255,0.15)',
                    display: 'inline-block',
                    px: 3,
                    py: 1,
                    borderRadius: '24px',
                    mb: 2,
                    fontSize: '1rem',
                    fontWeight: 'bold',
                  }}
                >
                  🔔 Triggered by{' '}
                  <Box component="span" fontWeight="bold" fontSize="1.125rem">
                    {alarm?.target}
                  </Box>
                </Box>

                <Typography variant="h6" mb={3}>
                  Card:{' '}
                  <Box component="span" fontWeight="bold" fontSize="1.1rem">
                    {alarm?.dmac || 'Unknown'}
                  </Box>
                </Typography>

                <Typography variant="h6" mb={3}>
                  Area:{' '}
                  <Box component="span" fontWeight="bold" fontSize="1.1rem">
                    {alarm?.area || 'Unknown'}
                  </Box>{' '}
                  |{' '}
                  <Box component="span" fontWeight="bold" fontSize="1.1rem">
                    {alarm?.floor || 'Unknown'}
                  </Box>
                </Typography>

                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 2,
                    mb: 2,
                  }}
                >
                  <Typography variant="body1" sx={{ opacity: 0.9 }}>
                    Priority:
                  </Typography>
                  <Chip
                    label={(alarm?.priority || 'medium').toUpperCase()}
                    size="small"
                    sx={{
                      backgroundColor: priorityColor,
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '0.9rem',
                      minWidth: '80px',
                    }}
                  />
                </Box>

                <Box
                  sx={{
                    position: 'absolute',
                    bottom: '-24px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: 'white',
                    borderRadius: '40px',
                    px: 5,
                    py: 1.5,
                    boxShadow: 2,
                  }}
                >
                  <Button
                    onClick={handleDisarmClick}
                    variant="text"
                    disabled={assignActionMutation.isPending}
                    sx={{
                      backgroundColor: '#ffffff',
                      color: priorityColor,
                      fontWeight: 'bold',
                      fontSize: '1.15rem',
                      textTransform: 'none',
                      borderRadius: '24px',
                      px: 6,
                      py: 1.2,
                      transition: 'all 0.25s ease',

                      '&:hover': {
                        background: `linear-gradient(135deg, ${alpha(priorityColor, 0.9)}, ${darken(
                          priorityColor,
                          0.2,
                        )})`,
                        color: '#ffffff',
                        boxShadow: `0 4px 16px ${alpha(priorityColor, 0.4)}`,
                      },

                      '&:disabled': {
                        backgroundColor: '#f5f5f5',
                        color: '#aaaaaa',
                        boxShadow: 'none',
                      },
                    }}
                  >
                    {assignActionMutation.isPending ? 'Processing...' : 'Disarm'}
                  </Button>
                </Box>
              </Box>
            </motion.div>
          )}
        </AnimatePresence>
      </Dialog>

      {/* ========= ACTION POPOVER ========= */}
      <Popover
        id={actionId}
        open={actionOpen}
        anchorEl={actionAnchorEl}
        onClose={handleActionClose}
        anchorOrigin={{
          vertical: 'center',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'center',
          horizontal: 'left',
        }}
        sx={{
          ml: 2,
          '& .MuiPopover-paper': {
            borderRadius: 2,
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            minWidth: 300,
            maxWidth: 400,
            p: 2,
          },
        }}
      >
        <Typography variant="h6" fontWeight="bold" mb={2}>
          Select Action Status
        </Typography>

        <Typography variant="body2" color="text.secondary" mb={1}>
          Alarm DMAC:
        </Typography>

        <Typography variant="body1" fontWeight={600} mb={1}>
          {alarm?.dmac?.toUpperCase() || '-'}
        </Typography>

        {alarm && (
          <Box
            sx={{
              backgroundColor: 'rgba(0, 0, 0, 0.04)',
              p: 2,
              borderRadius: 1,
              mb: 1,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Person: {alarm?.target || 'Unknown'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Area: {alarm?.area || 'Unknown'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Priority:{' '}
              <span style={{ color: priorityColor, fontWeight: 'bold' }}>
                {(alarm?.priority || 'medium').toUpperCase()}
              </span>
            </Typography>
          </Box>
        )}

        {/* <Box display="flex" flexDirection="column" gap={1} mb={3}>
          {actionStatus
            .filter((item) => !item.disabled && item.value !== 'Idle')
            .map((item) => {
              const isSelected = selectedAction?.toLowerCase() === item.value.toLowerCase();

              return (
                <Box
                  key={item.value}
                  onClick={() => setSelectedAction(item.value)}
                  sx={{
                    border: '1px solid',
                    borderColor: isSelected ? 'primary.main' : 'grey.300',
                    backgroundColor: isSelected ? 'primary.main' : 'transparent',
                    color: isSelected ? 'white' : 'text.primary',
                    borderRadius: 1,
                    p: 2,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      backgroundColor: isSelected ? 'primary.dark' : 'grey.50',
                      borderColor: isSelected ? 'primary.dark' : 'grey.400',
                    },
                  }}
                >
                  <Box display="flex" alignItems="center" gap={1}>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        backgroundColor: actionStatusColormap[item.value] || 'grey',
                        border: isSelected ? '2px solid white' : 'none',
                      }}
                    />
                    <Typography variant="body1" fontWeight={500}>
                      {item.label}
                    </Typography>
                  </Box>
                </Box>
              );
            })}
        </Box> */}
        <AlarmActionForm
          alarmTrigger={{
            id: alarm?.id,
            isActive: true,
          }}
          selectedAction={selectedAction}
          setSelectedAction={setSelectedAction}
          investigateResult={investigateResult}
          setInvestigateResult={setInvestigateResult}
          selectedSecurity={selectedSecurity}
          setSelectedSecurity={setSelectedSecurity}
          securityData={securityData}
          isLoadingSecurity={isLoadingSecurity}
          compact
        />

        <Box display="flex" gap={1} justifyContent="flex-end" mt={2}>
          <Button
            onClick={handleActionClose}
            variant="outlined"
            color="inherit"
            disabled={assignActionMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleApplyAction}
            variant="contained"
            color="primary"
            disabled={!selectedAction || assignActionMutation.isPending}
          >
            {assignActionMutation.isPending ? 'Applying...' : 'Apply Action'}
          </Button>
        </Box>
      </Popover>
    </>
  );
};

export default AlarmPopup;
