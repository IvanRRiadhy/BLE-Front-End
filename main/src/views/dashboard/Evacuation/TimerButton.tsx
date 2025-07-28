import React, { useRef, useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  Box,
  List,
  Divider,
  ListItem,
  ListItemAvatar,
  Avatar,
  TableContainer,
  Table,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { AppDispatch, useDispatch } from 'src/store/Store';
import { setEvacuationState } from 'src/store/customizer/CustomizerSlice';

const STORAGE_KEY = 'evac-timer-state';

type EvacState = 'idle' | 'running' | 'finished';

interface PersistedState {
  evacState: EvacState;
  ms: number; // For finished state
  startTime: number | null; // Timestamp when running started
  pausedMs?: number; // For future: support pause/resume
}
const evacuatedVisitors = [
  {
    id: 1,
    name: 'John Doe',
    cardNumber: '12567890',
    faceUrl: 'https://randomuser.me/api/portraits/men/31.jpg',
    evacuatedArea: 'Assembly Point A',
    timestamp: '2025-07-27 08:51:32',
  },
  {
    id: 2,
    name: 'Ayu Putri',
    cardNumber: '87893421',
    faceUrl: 'https://randomuser.me/api/portraits/women/41.jpg',
    evacuatedArea: 'Assembly Point B',
    timestamp: '2025-07-27 08:50:58',
  },
  {
    id: 3,
    name: 'John Doe',
    cardNumber: '12567890',
    faceUrl: 'https://randomuser.me/api/portraits/men/31.jpg',
    evacuatedArea: 'Assembly Point A',
    timestamp: '2025-07-27 08:51:32',
  },
  {
    id: 4,
    name: 'Ayu Putri',
    cardNumber: '87893421',
    faceUrl: 'https://randomuser.me/api/portraits/women/41.jpg',
    evacuatedArea: 'Assembly Point B',
    timestamp: '2025-07-27 08:50:58',
  },
  {
    id: 5,
    name: 'John Doe',
    cardNumber: '12567890',
    faceUrl: 'https://randomuser.me/api/portraits/men/31.jpg',
    evacuatedArea: 'Assembly Point A',
    timestamp: '2025-07-27 08:51:32',
  },
  {
    id: 6,
    name: 'Ayu Putri',
    cardNumber: '87893421',
    faceUrl: 'https://randomuser.me/api/portraits/women/41.jpg',
    evacuatedArea: 'Assembly Point B',
    timestamp: '2025-07-27 08:50:58',
  },
  {
    id: 7,
    name: 'John Doe',
    cardNumber: '12567890',
    faceUrl: 'https://randomuser.me/api/portraits/men/31.jpg',
    evacuatedArea: 'Assembly Point A',
    timestamp: '2025-07-27 08:51:32',
  },
  {
    id: 8,
    name: 'Ayu Putri',
    cardNumber: '87893421',
    faceUrl: 'https://randomuser.me/api/portraits/women/41.jpg',
    evacuatedArea: 'Assembly Point B',
    timestamp: '2025-07-27 08:50:58',
  },
  {
    id: 9,
    name: 'John Doe',
    cardNumber: '12567890',
    faceUrl: 'https://randomuser.me/api/portraits/men/31.jpg',
    evacuatedArea: 'Assembly Point A',
    timestamp: '2025-07-27 08:51:32',
  },
  {
    id: 10,
    name: 'Ayu Putri',
    cardNumber: '87893421',
    faceUrl: 'https://randomuser.me/api/portraits/women/41.jpg',
    evacuatedArea: 'Assembly Point B',
    timestamp: '2025-07-27 08:50:58',
  },
  // ... add more
];

const formatTime = (ms: number) => {

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  const centis = Math.floor((ms % 1000) / 10);

  if (hours > 0) {
    // HH:MM:SS:MS (always 2 digit)
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}:${centis.toString().padStart(2, '0')}`;
  } else {
    // MM:SS:MS (always 2 digit)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${centis
      .toString()
      .padStart(2, '0')}`;
  }
};

const TimerButton: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
  const [evacState, setEvacState] = useState<EvacState>('idle');
  const [ms, setMs] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [openConfirm, setOpenConfirm] = useState(false);

  // Restore from localStorage
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const saved: PersistedState = JSON.parse(raw);
        if (saved.evacState === 'running' && saved.startTime) {
          setStartTime(saved.startTime);
          setEvacState('running');
        } else {
          setMs(saved.ms || 0);
          setEvacState(saved.evacState);
        }
      } catch (e) {}
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (evacState === 'running') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ evacState, startTime, ms: 0 }));
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ evacState, startTime: null, ms }));
    }
  }, [evacState, ms, startTime]);

  // Core timer: always use system time
  useEffect(() => {
    let animationFrame: number;
    let interval: NodeJS.Timeout | undefined;

    const update = () => {
      if (evacState === 'running' && startTime) {
        setMs(Date.now() - startTime);
        // For smoothness, use animation frame, but you could use setInterval 100ms
        animationFrame = requestAnimationFrame(update);
      }
    };

    if (evacState === 'running' && startTime) {
      // For power saving, use setInterval, for smoothness, use requestAnimationFrame
      interval = setInterval(() => setMs(Date.now() - startTime), 100);
      // animationFrame = requestAnimationFrame(update);
    }

    return () => {
      if (interval) clearInterval(interval);
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [evacState, startTime]);

  const handleButtonClick = () => {
    if (evacState === 'idle') {
      setOpenConfirm(true);
    } else if (evacState === 'running') {
      setMs(startTime ? Date.now() - startTime : ms);
      setStartTime(null);
      setEvacState('finished');
      dispatch(setEvacuationState('finished'));
    }
  };
  const handleConfirmEvacuate = () => {
    const now = Date.now();
    setStartTime(now);
    setMs(0);
    setEvacState('running');
    setOpenConfirm(false);
      dispatch(setEvacuationState('running'));
  };
  const handleCancelEvacuate = () => {
    setOpenConfirm(false);
  };

  const handleReset = () => {
    setEvacState('idle');
    setMs(0);
    setStartTime(null);

    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <Card
      sx={{
        minWidth: 340,
        minHeight: '80vh',
        maxWidth: '80vh',
        p: 3,
        borderRadius: 4,
        boxShadow: 8,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        bgcolor: '#fff',
        mx: 2,
      }}
    >
      <CardContent sx={{ width: '100%', textAlign: 'center' }}>
        <Typography
          variant="h2"
          fontWeight={700}
          mb={5}
          sx={{
            fontSize: '4rem',
            fontFamily: 'monospace',
            letterSpacing: '0.1em',
            width: '14ch',
            textAlign: 'center',
            background: 'rgba(255,255,255,0.7)',
            borderRadius: 2,
            userSelect: 'none',
          }}
        >
          {formatTime(ms)}
        </Typography>
        <Stack direction="row" spacing={3} justifyContent="center">
          <Button
            onClick={handleButtonClick}
            sx={{
              width: 120,
              height: 120,
              borderRadius: '50%',
              fontSize: 25,
              fontWeight: 700,
              background:
                evacState === 'idle' ? '#1976d2' : evacState === 'running' ? '#ff5252' : '#43a047',
              color: '#fff',
              boxShadow: 4,
              '&:hover': {
                background:
                  evacState === 'idle'
                    ? '#1565c0'
                    : evacState === 'running'
                    ? '#e53935'
                    : '#388e3c',
              },
            }}
            disabled={evacState === 'finished'}
          >
            {evacState === 'idle' ? 'Evacuate' : evacState === 'running' ? 'Finish' : 'Finished'}
          </Button>
          {evacState === 'finished' && (
            <Button
              onClick={handleReset}
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                fontSize: 18,
                fontWeight: 700,
                background: '#757575',
                color: '#fff',
                boxShadow: 2,
                alignSelf: 'center',
                '&:hover': {
                  background: '#424242',
                },
              }}
            >
              Reset
            </Button>
          )}
        </Stack>
      </CardContent>
      {/* Warning Dialog */}
      <Dialog open={openConfirm} onClose={handleCancelEvacuate}>
        <DialogTitle>Start Evacuation?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure to set <b>EVACUATION</b> Alarm on?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelEvacuate} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleConfirmEvacuate} color="error" variant="contained">
            Yes, Start Evacuation
          </Button>
        </DialogActions>
      </Dialog>
      <Box sx={{ mt: 4, width: '100%' }}>
        <List disablePadding sx={{ width: '100%', border: '1px solid #ccc', borderRadius: 2 }}>
          <Box sx={{ mt: 2, width: '100%' }}>
            <Typography
              variant="subtitle1"
              fontWeight={700}
              sx={{ px: 2, mb: 1, textAlign: 'left' }}
            >
              Confirmed Evacuated Visitor
            </Typography>
            <TableContainer
              component={Paper}
              sx={{
                boxShadow: 2,
                borderRadius: 2,
                maxHeight: 355, // set your preferred height
                overflow: 'auto',
              }}
            >
              <Table size="small" stickyHeader aria-label="evacuated visitor table">
                <TableHead>
                  <TableRow>
                    <TableCell align="left" sx={{ fontWeight: 700, width: 140 }}>
                      Visitor
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, width: 140 }}>
                      Evacuated Area
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {evacuatedVisitors.map((visitor) => (
                    <TableRow key={visitor.id} hover>
                      <TableCell
                        align="left"
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          borderRight: '1px solid #eee',
                        }}
                      >
                        <Avatar
                          src={visitor.faceUrl}
                          alt={visitor.name}
                          sx={{ width: 38, height: 38, mr: 1 }}
                        />
                        <Box>
                          <Typography fontWeight={700} fontSize={16} align="left">
                            {visitor.name}
                          </Typography>
                          <Typography fontSize={12} color="text.secondary" align="left">
                            Card #{visitor.cardNumber}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right" sx={{ width: 140 }}>
                        <Typography fontSize={15} fontWeight={500} color="primary.main">
                          {visitor.evacuatedArea}
                        </Typography>
                        <Typography fontSize={12} color="text.disabled">
                          {visitor.timestamp}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                  {evacuatedVisitors.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} align="center" sx={{ color: 'text.disabled' }}>
                        No confirmed evacuated visitors.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </List>
      </Box>
    </Card>
  );
};

export default TimerButton;
