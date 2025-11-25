import React, { useEffect, useState } from 'react';
import { Dialog, Box, Button, Typography, Popover, Chip } from '@mui/material';
import { AlarmType, MQTTAlarmType } from 'src/store/apps/tracking/Alarm';
import { actionStatus, actionStatusColormap } from 'src/types/crud/input';
import toast from 'react-hot-toast';
import { useAssignActionAlarmTrigger } from 'src/hooks/useAlarmTrigger'; // Fixed import
import { alpha, darken } from '@mui/material/styles';
import { motion, AnimatePresence } from 'framer-motion';

interface AlarmPopupProps {
  alarm: MQTTAlarmType | null;
  open: boolean;
  onClose: () => void;
}

const AlarmPopup: React.FC<AlarmPopupProps> = ({ alarm, open, onClose }) => {
  // React Query mutation hook
  const assignActionMutation = useAssignActionAlarmTrigger();

  // State for action popover
  const [actionAnchorEl, setActionAnchorEl] = useState<HTMLElement | null>(null);
  const [selectedAction, setSelectedAction] = useState<string>('');

  useEffect(() => {
    console.log('Alarm: ', alarm);
  }, [alarm]);

  const handleDisarmClick = (event: React.MouseEvent<HTMLElement>) => {
    setActionAnchorEl(event.currentTarget);
  };

  const handleActionClose = () => {
    setActionAnchorEl(null);
    setSelectedAction('');
  };

  const handleApplyAction = async () => {
    if (!alarm?.cardName) {
      // Using cardName as the beacon ID/DMAC
      toast.error('No alarm selected');
      handleActionClose();
      return;
    }

    if (!selectedAction) {
      toast.error('Please select an action status');
      return;
    }

    try {
      // Use React Query mutation with correct parameters
      const result = await assignActionMutation.mutateAsync({
        dmac: alarm.cardName.toUpperCase(), // Using cardName as dmac
        actionStatus: selectedAction.toLowerCase(),
      });
      console.log('Assign Action Result:', result);
      // If we reach here, the mutation was successful
      toast.success('Action applied successfully');

      // Close both popovers
      handleActionClose();
      onClose();
    } catch (error: any) {
      toast.error('Error applying action');
      console.error('Error applying action', error);
    }
  };

  const actionOpen = Boolean(actionAnchorEl);
  const actionId = actionOpen ? 'action-status-popover' : undefined;

  return (
    <>
      {/* ========= ALARM POPUP DIALOG ========= */}
      <Dialog
        open={open}
        onClose={onClose}
        PaperProps={{
          sx: {
            backgroundColor: 'transparent',
            boxShadow: 'none',
            overflow: 'visible',
          },
        }}
      >
        <AnimatePresence>
          {open && (
            <motion.div
              key={alarm?.triggerId}
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: -20 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <Box
                sx={{
                  background: alarm?.color
                    ? `linear-gradient(135deg, ${alpha(alarm.color, 0.95)}, ${darken(
                        alarm.color,
                        0.25,
                      )})`
                    : 'linear-gradient(135deg, #d32f2f, #9a0007)',

                  color: 'white',
                  borderRadius: 4,
                  px: 6,
                  pt: 4,
                  pb: 8,
                  minWidth: { xs: '90vw', sm: 480, md: 600 },
                  maxWidth: '90vw',
                  textAlign: 'center',
                  position: 'relative',
                  boxShadow: `0 8px 30px ${alpha(alarm?.color || '#d32f2f', 0.5)}`,
                  border: `1px solid ${alpha(alarm?.color || '#d32f2f', 0.4)}`,
                }}
              >
                <Typography variant="h2" fontWeight="bold" letterSpacing={3} mb={2}>
                  ALARM TRIGGERED
                </Typography>

                <Typography variant="h3" mb={3}>
                  <Box component="span" fontWeight="bold" fontSize="1.5rem" letterSpacing={2}>
                    {alarm?.status?.toUpperCase() || 'UNKNOWN'}
                  </Box>
                </Typography>

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
                    {alarm?.MemberName || alarm?.visitorName || 'Unknown Person'}
                  </Box>
                </Box>

                <Typography variant="h6" mb={3}>
                  Card:{' '}
                  <Box component="span" fontWeight="bold" fontSize="1.1rem">
                    {alarm?.cardName || 'Unknown'}
                  </Box>
                </Typography>

                <Typography variant="h6" mb={3}>
                  Area:{' '}
                  <Box component="span" fontWeight="bold" fontSize="1.1rem">
                    {alarm?.maskedAreaName || 'Unknown'}
                  </Box>{' '}
                  |{' '}
                  <Box component="span" fontWeight="bold" fontSize="1.1rem">
                    {alarm?.floorplanName || 'Unknown'}
                  </Box>
                </Typography>

                {/* ======= DISARM BUTTON ======= */}
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
                      color: alarm?.color || '#d32f2f',
                      fontWeight: 'bold',
                      fontSize: '1.15rem',
                      textTransform: 'none',
                      borderRadius: '24px',
                      px: 6,
                      py: 1.2,
                      transition: 'all 0.25s ease',

                      '&:hover': {
                        background: alarm?.color
                          ? `linear-gradient(135deg, ${alpha(alarm.color, 0.9)}, ${darken(
                              alarm.color,
                              0.2,
                            )})`
                          : `linear-gradient(135deg, #ff4d4f, #d32f2f)`,
                        color: '#ffffff',
                        boxShadow: alarm?.color
                          ? `0 4px 16px ${alpha(alarm.color, 0.4)}`
                          : `0 4px 16px rgba(211,47,47,0.4)`,
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

      {/* ========= ACTION POPOVER (UNCHANGED) ========= */}
      <Popover
        id={actionId}
        open={actionOpen}
        anchorEl={actionAnchorEl}
        onClose={handleActionClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        sx={{
          '& .MuiPopover-paper': {
            borderRadius: 2,
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            minWidth: 300,
            maxWidth: 400,
            p: 2,
          },
        }}
      >
        {/* (your existing popover content stays unchanged) */}

        <Typography variant="h6" fontWeight="bold" mb={2}>
          Select Action Status
        </Typography>

        <Typography variant="body2" color="text.secondary" mb={1}>
          Alarm DMAC:
        </Typography>

        <Typography variant="body1" fontWeight={600} mb={3}>
          {alarm?.cardName?.toUpperCase() || '-'}
        </Typography>

        <Box display="flex" flexDirection="column" gap={1} mb={3}>
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
        </Box>

        <Box display="flex" gap={1} justifyContent="flex-end">
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
