import { Box, Chip, Paper, Typography, alpha, useTheme } from '@mui/material';
import { motion, useAnimationControls } from 'framer-motion';
import { AlarmTriggerType } from 'src/store/apps/crud/alarmTrigger';
import { useEffect, useRef } from 'react';

interface Props {
  trigger: AlarmTriggerType;

  isSeen?: boolean;
  isClicked?: boolean;

  unseenBg: string;
  seenBg: string;
  hoverBg: string;

  unseenBorder: string;
  seenBorder: string;
  hoverBorder: string;

  onMarkSeen?: (trigger: AlarmTriggerType) => void;
  onClick?: (trigger: AlarmTriggerType) => void;
}

const PRIORITY_COLOR: Record<string, string> = {
  low: '#ffc107',
  medium: '#ff9800',
  high: '#f44336',
};

const AlarmTriggerMenuItem = ({
  trigger,
  isSeen,
  isClicked,
  unseenBg,
  seenBg,
  hoverBg,
  unseenBorder,
  seenBorder,
  hoverBorder,
  onMarkSeen,
  onClick,
}: Props) => {
  const theme = useTheme();
  const controls = useAnimationControls();

  const hoverActiveRef = useRef(false);
  const completedRef = useRef(false);

  const clickedBg = alpha(unseenBorder, 1); // darker highlight
  const clickedBorder = unseenBorder;

  const displayName =
    trigger.visitorName || trigger.memberName || trigger.securityName || 'Unknown';

  useEffect(() => {
    // Priority: clicked > seen > unseen
    if (isClicked) {
      controls.set({
        backgroundColor: clickedBg,
        borderLeftColor: clickedBorder,
      });
      return;
    }

    if (isSeen) {
      controls.set({
        backgroundColor: seenBg,
        borderLeftColor: seenBorder,
      });
      // console.log('Seen');
      return;
    }

    controls.set({
      backgroundColor: unseenBg,
      borderLeftColor: unseenBorder,
    });
  }, [isSeen, isClicked]);

  const handleHoverStart = async () => {
    if (!onMarkSeen || isSeen) return;
    // console.log('Hover Start');
    if (isSeen || isClicked || completedRef.current) return;

    hoverActiveRef.current = true;

    await controls.start({
      backgroundColor: hoverBg,
      borderLeftColor: hoverBorder,
      transition: { duration: 2, ease: 'linear' },
    });

    if (hoverActiveRef.current && !completedRef.current) {
      completedRef.current = true;

      await controls.start({
        backgroundColor: seenBg,
        borderLeftColor: seenBorder,
        transition: { duration: 0.2 },
      });

      onMarkSeen(trigger);
    }
  };

  const handleHoverEnd = () => {
    if (!onMarkSeen || isSeen) return;
    hoverActiveRef.current = false;

    if (!completedRef.current && !isClicked) {
      controls.start({
        backgroundColor: unseenBg,
        borderLeftColor: unseenBorder,
        transition: { duration: 0.25 },
      });
    }
  };

  return (
    <motion.div
      onHoverStart={handleHoverStart}
      onHoverEnd={handleHoverEnd}
      animate={controls}
      initial={{
        backgroundColor: isSeen ? seenBg : unseenBg,
        borderLeftColor: isSeen ? seenBorder : unseenBorder,
      }}
      style={{
        borderLeft: '4px solid',
        borderRadius: 6,
      }}
    >
      <Paper
        elevation={0}
        onClick={() => onClick?.(trigger)}
        sx={{
          p: 1.5,
          cursor: 'pointer',
          backgroundColor: 'transparent',
        }}
      >
        {/* HEADER */}
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          {/* LEFT SIDE */}
          <Box>
            <Typography fontWeight={700} display="flex" alignItems="center" gap={0.75}>
              {!isSeen && !isClicked && (
                <Box
                  component="span"
                  sx={{
                    color: theme.palette.error.main,
                    fontWeight: 900,
                    fontSize: '1.1rem',
                    lineHeight: 1,
                  }}
                >
                  !
                </Box>
              )}
              {displayName}
            </Typography>

            <Typography variant="body2" color="text.secondary">
              {trigger.buildingName} · {trigger.floorplanName}
            </Typography>

            <Typography variant="caption" color="text.secondary">
              {new Date(trigger.triggerTime).toLocaleString()}
            </Typography>
          </Box>

          {/* RIGHT SIDE */}
          <Box display="flex" flexDirection="column" alignItems="flex-end" gap={0.75}>
            {/* Alarm Type */}
            <Chip
              label={trigger.alarm?.toUpperCase() || 'ALARM'}
              // color="#fff"
              size="small"
              sx={{
                color: '#fff',
                fontWeight: 600,
                backgroundColor: trigger.alarmColor || '#ff9800',
              }}
            />

            {/* Priority */}
            {/* <Box
        sx={{
          px: 1.2,
          py: 0.25,
          borderRadius: 10,
          fontSize: '0.7rem',
          fontWeight: 700,
          color: '#fff',
          backgroundColor:
            PRIORITY_COLOR[trigger.priority?.toLowerCase() || 'medium'] ||
            PRIORITY_COLOR.medium,
        }}
      >
        {(trigger.priority || 'medium').toUpperCase()}
      </Box> */}
          </Box>
        </Box>
      </Paper>
    </motion.div>
  );
};

export default AlarmTriggerMenuItem;
