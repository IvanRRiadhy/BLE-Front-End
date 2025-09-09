
import React, { useEffect, useRef } from 'react';
import { Box, Paper, Typography, IconButton, Fade } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { AlarmType } from 'src/store/apps/tracking/Alarm';

export type AlarmToast = {
  id: string;                 // unique id per toast
  alarm: AlarmType;
  title?: string;
  message?: string;
};

type Props = {
  items: AlarmToast[];
  onDismiss: (id: string) => void;
  onClickItem?: (toast: AlarmToast) => void; // e.g., open AlarmPopup
  autoHideMs?: number; // default 6000
  maxItems?: number;   // default 3
};

const NotificationToasts: React.FC<Props> = ({
  items,
  onDismiss,
  onClickItem,
  autoHideMs = 6000,
  maxItems = 3,
}) => {
  // simple auto-hide per item
  const timers = useRef<Record<string, any>>({});

  useEffect(() => {
    // start timers for any new items
    for (const it of items.slice(0, maxItems)) {
      if (!timers.current[it.id]) {
        timers.current[it.id] = setTimeout(() => onDismiss(it.id), autoHideMs);
      }
    }
    return () => {
      // clear timers on unmount
      Object.values(timers.current).forEach(clearTimeout);
      timers.current = {};
    };
  }, [items, autoHideMs, maxItems, onDismiss]);

  const handleMouseEnter = (id: string) => {
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
  };
  const handleMouseLeave = (id: string) => {
    timers.current[id] = setTimeout(() => onDismiss(id), autoHideMs);
  };

  const visible = items.slice(0, maxItems);

  return (
    <Box
      sx={{
        position: 'fixed',
        right: 16,
        bottom: 16,
        zIndex: 1400, // above app bar
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
      }}
    >
      {visible.map((t, idx) => (
        <Fade in key={t.id} timeout={350}>
          <Paper
            elevation={8}
            onMouseEnter={() => handleMouseEnter(t.id)}
            onMouseLeave={() => handleMouseLeave(t.id)}
            onClick={() => onClickItem?.(t)}
            sx={{
              cursor: onClickItem ? 'pointer' : 'default',
              minWidth: 320,
              maxWidth: 420,
              p: 1.5,
              pr: 6,
              borderRadius: 3,
              background:
                'linear-gradient(180deg, rgba(33,33,33,0.95) 0%, rgba(20,20,20,0.95) 100%)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.15)',
              position: 'relative',
              transform: `translateY(-${idx * 4}px)`,
            }}
          >
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onDismiss(t.id);
              }}
              sx={{
                position: 'absolute',
                top: 6,
                right: 6,
                color: 'rgba(255,255,255,0.85)',
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>

            <Typography variant="subtitle2" sx={{ opacity: 0.8, mb: 0.25 }}>
              {t.title ?? 'Alarm Triggered'}
            </Typography>
            <Typography variant="h6" fontWeight={800} lineHeight={1.25}>
              {t.alarm?.beaconId ?? 'Unknown'}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.85, mt: 0.5 }}>
              {t.message ??
                `Area: ${t.alarm?.maskedAreaName ?? 'Unknown'} · ${t.alarm?.floorplanName ?? 'Unknown'}`}
            </Typography>
          </Paper>
        </Fade>
      ))}
    </Box>
  );
};

export default NotificationToasts;
