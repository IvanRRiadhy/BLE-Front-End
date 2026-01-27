import { Box, Paper, Typography, alpha, useTheme } from '@mui/material';
import { motion, useAnimationControls } from 'framer-motion';
import { AlarmLogItem } from 'src/store/apps/tracking/Beacon';
import { useEffect, useRef } from 'react';

interface Props {
  alarm: AlarmLogItem;
  isVisuallySeen: boolean;
  unseenBg: string;
  seenBg: string;
  hoverBg: string;
  unseenBorder: string;
  seenBorder: string;
  hoverBorder: string;
  onMarkSeen: (alarm: AlarmLogItem) => void;
}

const AlarmMenuItem = ({
  alarm,
  isVisuallySeen,
  unseenBg,
  seenBg,
  hoverBg,
  unseenBorder,
  seenBorder,
  hoverBorder,
  onMarkSeen,
}: Props) => {
  const theme = useTheme();
  const controls = useAnimationControls();
  const hoverActiveRef = useRef(false);
  const completedRef = useRef(false);

  useEffect(() => {
    // sync visual state if redux updates
    controls.set({
      backgroundColor: isVisuallySeen ? seenBg : unseenBg,
      borderLeftColor: isVisuallySeen ? seenBorder : unseenBorder,
    });
  }, [isVisuallySeen]);

  const handleHoverStart = async () => {
    if (isVisuallySeen || completedRef.current) return;

    hoverActiveRef.current = true;

    // Phase 1: unseen (error) → white (progress, 3s)
    await controls.start({
      backgroundColor: hoverBg,
      borderLeftColor: hoverBorder,
      transition: { duration: 2, ease: 'linear' },
    });

    // Phase 2: commit only if still hovering
    if (hoverActiveRef.current && !completedRef.current) {
      completedRef.current = true;

      // Phase 2: white → primary (quick confirmation)
      await controls.start({
        backgroundColor: seenBg,
        borderLeftColor: seenBorder,
        transition: { duration: 0.2, ease: 'easeOut' }, // 👈 0.5–1s sweet spot
      });

      onMarkSeen(alarm);
    }
  };

  const handleHoverEnd = () => {
    hoverActiveRef.current = false;

    if (!completedRef.current) {
      controls.start({
        backgroundColor: unseenBg,
        borderLeftColor: unseenBorder,
        transition: { duration: 0.25, ease: 'easeOut' },
      });
    }
  };
  useEffect(() => {
    if (isVisuallySeen) {
      completedRef.current = true;
      controls.set({
        backgroundColor: seenBg,
        borderLeftColor: seenBorder,
      });
    } else {
      controls.set({
        backgroundColor: unseenBg,
        borderLeftColor: unseenBorder,
      });
    }
  }, [isVisuallySeen]);

  return (
    <motion.div
      onHoverStart={handleHoverStart}
      onHoverEnd={handleHoverEnd}
      animate={controls}
      initial={{
        backgroundColor: unseenBg,
        borderLeftColor: unseenBorder,
      }}
      style={{
        borderLeft: '4px solid',
        borderRadius: 6,
      }}
    >
      <Paper
        elevation={0}
        onClick={() => console.log('Alarm clicked:', alarm)}
        sx={{
          p: 1.5,
          cursor: 'pointer',
          backgroundColor: 'transparent',
        }}
      >
        <Typography fontWeight={700} display="flex" alignItems="center" gap={0.75}>
          {!isVisuallySeen && (
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
          {alarm.target}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {alarm.area} · {alarm.floor}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {new Date(alarm.time).toLocaleString()}
        </Typography>
      </Paper>
    </motion.div>
  );
};

export default AlarmMenuItem;
