import { Box, Typography, useTheme } from '@mui/material';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { utcTimeToLocal } from 'src/utils/timeConvert';

const NextPatrolBox = ({ nextPatrol }: any) => {
  const theme = useTheme();
  const palette = theme.palette.secondary;

  const [countdown, setCountdown] = useState('00:00:00');

  useEffect(() => {
    if (!nextPatrol?.scheduleStart) return;

    const updateCountdown = () => {
      const now = dayjs();

      // convert backend UTC -> local
      const localTime = utcTimeToLocal(nextPatrol.scheduleStart);

      const [hour, minute] = localTime.split(':').map(Number);

      const start = dayjs().hour(hour).minute(minute).second(0).millisecond(0);

      const diff = start.diff(now);

      if (diff <= 0) {
        setCountdown('Started');
        return;
      }

      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);

      setCountdown(
        `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`,
      );
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);

    return () => clearInterval(timer);
  }, [nextPatrol]);

  if (!nextPatrol) {
    return (
      <Box
        sx={{
          borderRadius: 2,
          border: `1px solid ${palette.main}`,
          backgroundColor: palette.light,
          height: 110,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography color={palette.main} fontWeight={600}>
          No Patrol
        </Typography>
      </Box>
    );
  }

  const localSchedule = utcTimeToLocal(nextPatrol.scheduleStart);

  return (
    <Box
      sx={{
        borderRadius: 2,
        border: `1px solid ${palette.main}`,
        backgroundColor: palette.light,
        px: 2,
        py: 1.5,
        height: 110,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      {/* LEFT */}
      <Box>
        <Typography fontSize={12} color={palette.dark}>
          Next Patrol in
        </Typography>

        <Typography fontSize={26} fontWeight={700} color={palette.main} lineHeight={1}>
          {countdown}
        </Typography>
      </Box>

      {/* RIGHT */}
      <Box textAlign="right">
        <Typography fontSize={13} fontWeight={600} color={palette.dark}>
          {nextPatrol.assignmentName}
        </Typography>

        <Typography fontSize={18} fontWeight={700} color={palette.main}>
          {localSchedule}
        </Typography>
      </Box>
    </Box>
  );
};

export default NextPatrolBox;
