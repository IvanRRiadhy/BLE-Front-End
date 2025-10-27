import { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { useSelector } from 'src/store/Store';

const TimeDisplay = () => {
  const [currentDateTime, setCurrentDateTime] = useState<string>('');
  const language = useSelector((state) => state.customizer.isLanguage);

  const getLanguageLabel = () => {
    switch (language) {
      case 'en':
        return 'en-US';
      case 'id':
        return 'id-ID';
      default:
        return 'en-US';
    }
  };

  const formatDateTime = () => {
    const now = new Date();
    return new Intl.DateTimeFormat(getLanguageLabel(), {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
      .format(now)
      .replace(/\./g, ':');
  };

  useEffect(() => {
    setCurrentDateTime(formatDateTime());
    const interval = setInterval(() => setCurrentDateTime(formatDateTime()), 1000);
    return () => clearInterval(interval);
  }, [language]);

  return (
    <Box
      sx={{
        minWidth: '280px',        // ✅ keeps stable width (no shifting)
        textAlign: 'left',        // ✅ ensures text expands to the right
        whiteSpace: 'nowrap',     // ✅ prevents wrapping
        display: 'flex',          // ✅ for precise horizontal layout
        justifyContent: 'flex-start', // ✅ keeps it pinned left inside box
      }}
    >
      <Typography
        variant="body1"
        sx={{
          fontWeight: 500,
          fontSize: '0.95rem',
          color: 'text.primary',
          letterSpacing: 0.3,
        }}
      >
        {currentDateTime}
      </Typography>
    </Box>
  );
};

export default TimeDisplay;
