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
  TextField,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import { AppDispatch, RootState, useDispatch, useSelector } from 'src/store/Store';
import { setEvacuationId, setEvacuationState, setEvacuationStartTime, resetEvacuation } from 'src/store/apps/tracking/Evacuation';
import {
  EvacuationAlertPayload,
  useCompleteEvacuation,
  useEvacuate,
  useFinalizeEvacuation,
  useConfirmEvacuation,
  PersonConfirmation,
} from 'src/hooks/useEvacuate';
import toast from 'react-hot-toast';

const API_TRANS_URL = '/api/evacuation-transaction/';
const STORAGE_KEY = 'evac-timer-state';

type EvacState = 'idle' | 'running' | 'finished';

const defaultPayload: EvacuationAlertPayload = {
  title: "Evacuation",
  description: "Evacuation",
  triggerType: "Manual",
}

interface PersistedState {
  evacState: EvacState;
  ms: number; // For finished state
  startTime: number | null; // Timestamp when running started
  evacuationId: string;
  pausedMs?: number; // For future: support pause/resume
}
// evacuatedVisitors dummy data removed


/*
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
*/

const TimerButton: React.FC = () => {
  const dispatch: AppDispatch = useDispatch();
  const { evacuationId: storeEvacuationId, evacState: storeEvacState, startTime: storeStartTime, data: evacuationData } = useSelector((state: RootState) => state.evacuationReducer);
  const persons = evacuationData?.persons;
  // const totalPersons = evacuationData?.persons?.length;
  const evacuatedPersons = evacuationData?.persons?.filter((person) => person.personStatus === 'Evacuated') || [];
  const confirmedPersons = evacuationData?.persons?.filter((person) => person.personStatus === 'Confirmed Evacuated') || [];
  const combinedEvacuated = [...evacuatedPersons, ...confirmedPersons];
  //  console.log("Persons", persons);
  // const [ms, setMs] = useState(0);
  const [openConfirm, setOpenConfirm] = useState(false);
  const [openFinalize, setOpenFinalize] = useState(false);
  const [openPersonConfirm, setOpenPersonConfirm] = useState(false);
  const [selectedPersonTransId, setSelectedPersonTransId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Finalize Form State
  const [finalizeForm, setFinalizeForm] = useState({
    title: 'Evacuation Completed',
    description: 'Manual Evacuation successfully completed',
    completionNotes: '',
    evacuationType: 'FireAlarm',
  });

  const evacuateMutation = useEvacuate();
  const completeEvacuateMutation = useCompleteEvacuation();
  const finalizeMutation = useFinalizeEvacuation();
  const confirmPersonMutation = useConfirmEvacuation();

  // Restore from localStorage
  // Use local state for UI responsiveness, but sync with store
  const [localEvacState, setLocalEvacState] = useState<EvacState>(storeEvacState);

  useEffect(() => {
    setLocalEvacState(storeEvacState);
  }, [storeEvacState]);

  // Save to localStorage removed as store handles persistence

  // Core timer: always use system time
  /*
  useEffect(() => {
    let animationFrame: number;
    let interval: NodeJS.Timeout | undefined;

    const update = () => {
      if (storeEvacState === 'running' && storeStartTime) {
        setMs(Date.now() - storeStartTime);
        // For smoothness, use animation frame, but you could use setInterval 100ms
        animationFrame = requestAnimationFrame(update);
      }
    };

    if (storeEvacState === 'running' && storeStartTime) {
      // For power saving, use setInterval, for smoothness, use requestAnimationFrame
      interval = setInterval(() => setMs(Date.now() - storeStartTime), 100);
      // animationFrame = requestAnimationFrame(update);
    }

    return () => {
      if (interval) clearInterval(interval);
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [storeEvacState, storeStartTime]);
  */

  const handleButtonClick = async () => {
    if (storeEvacState === 'idle') {
      setOpenConfirm(true);
    } else if (localEvacState === 'running') {
      setOpenFinalize(true);
    }
  };

  const handleFinalizeSubmit = async () => {
    setIsSubmitting(true);
    try {
      const res = await completeEvacuateMutation.mutateAsync(storeEvacuationId);
      if (res.success) {
        await finalizeMutation.mutateAsync({
          id: storeEvacuationId,
          payload: {
            title: finalizeForm.title,
            description: finalizeForm.description,
            CompletionNotes: finalizeForm.completionNotes,
          },
        });

        setLocalEvacState('finished');
        dispatch(setEvacuationState('finished'));
        setOpenFinalize(false);
        toast.success('Evacuation completed and finalized');
      }
    } catch (e) {
      console.error('Finalize Error:', e);
      toast.error('Failed to finalize evacuation');
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleConfirmEvacuate = async () => {
    const now = Date.now();

    try{
      const res = await evacuateMutation.mutateAsync(defaultPayload);
      console.log("Evacuate: ", res)
      if(res.success){
        dispatch(setEvacuationId(res.collection.data.id));
        // dispatch(setEvacuationState('running'));
        dispatch(setEvacuationStartTime(now));
        
        // setLocalEvacState('running');
        // setMs(0);
        console.log("Evacuate Success: ", res.collection.data.id)
        
        setOpenConfirm(false);
      }
    }
    catch(e){
      console.log("Evacuate Error: ", e);
      toast.error("Evacuate Failed");
    }
  };
  const handleCancelEvacuate = () => {
    setOpenConfirm(false);
  };

  const handlePersonRowClick = (transactionId: string) => {
    setSelectedPersonTransId(transactionId);
    setOpenPersonConfirm(true);
  };

  const handleConfirmPerson = async () => {
    try {
      const res = await confirmPersonMutation.mutateAsync({
        id: selectedPersonTransId,
        payload: { personStatus: 'ConfirmedEvacuated' },
      });
      console.log("Confirm Person: ", res)
      if (res.success || res.status === 204) {
        toast.success('Person status confirmed');
        setOpenPersonConfirm(false);
      }
    } catch (e) {
      toast.error('Failed to confirm person status');
    }
  };

  const handleReset = () => {
    setLocalEvacState('idle');
    // setMs(0);
    dispatch(resetEvacuation());
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <Card
      sx={{
        minWidth: 340,
        height: '100%',
        p: 3,
        borderRadius: 4,
        boxShadow: 8,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        bgcolor: 'background.paper',
        mx: 2,
        overflowY: 'auto',
        border: '1px solid #E0E0E0',
      }}
    >
      <CardContent sx={{ width: '100%', textAlign: 'center' }}>
        {/* <Typography
          variant="h2"
          fontWeight={700}
          mb={5}
          sx={{
            fontSize: '4rem',
            fontFamily: 'monospace',
            letterSpacing: '0.1em',
            width: '14ch',
            textAlign: 'center',
            background: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
            borderRadius: 2,
            userSelect: 'none',
          }}
        >
          {formatTime(ms)}
        </Typography> */}
        <Stack direction="row" spacing={3} justifyContent="center">
          <Button
            onClick={handleButtonClick}
            sx={{
              width: 200,
              height: 200,
              borderRadius: '50%',
              fontSize: 30,
              fontWeight: 700,
              background:
                localEvacState === 'idle' ? '#d32f2f' : localEvacState === 'running' ? '#ff5252' : '#43a047',
              color: '#fff',
              boxShadow: 4,
              animation: localEvacState === 'running' ? 'breathe 2s infinite ease-in-out' : 'none',
              '@keyframes breathe': {
                '0%': { backgroundColor: '#ff5252', transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(255, 82, 82, 0.7)' },
                '50%': { backgroundColor: '#ff1744', transform: 'scale(1.05)', boxShadow: '0 0 0 20px rgba(255, 82, 82, 0)' },
                '100%': { backgroundColor: '#ff5252', transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(255, 82, 82, 0)' },
              },
              '&:hover': {
                background:
                  localEvacState === 'idle'
                    ? '#b71c1c'
                    : localEvacState === 'running'
                    ? '#e53935'
                    : '#388e3c',
              },
            }}
            disabled={localEvacState === 'finished'}
          >
            {localEvacState === 'idle' ? 'Evacuate' : localEvacState === 'running' ? 'Evacuation Done' : 'Finished'}
          </Button>
          {localEvacState === 'finished' && (
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
        <DialogTitle sx={{ fontSize: 18, fontWeight: 700 }}>INITIATE EVACUATION</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure to initiate <b>EVACUATION</b> protocol?
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
      {/* Finalize Dialog */}
      <Dialog
        open={openFinalize}
        onClose={() => !isSubmitting && setOpenFinalize(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontSize: 18, fontWeight: 700 }}>FINALIZE EVACUATION</DialogTitle>
        <DialogContent>
          <Stack spacing={3} mt={1}>
            <TextField
              label="Title"
              fullWidth
              value={finalizeForm.title}
              onChange={(e) => setFinalizeForm({ ...finalizeForm, title: e.target.value })}
              disabled={isSubmitting}
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={2}
              value={finalizeForm.description}
              onChange={(e) => setFinalizeForm({ ...finalizeForm, description: e.target.value })}
              disabled={isSubmitting}
            />
            <TextField
              select
              label="Evacuation Type"
              fullWidth
              value={finalizeForm.evacuationType}
              onChange={(e) => setFinalizeForm({ ...finalizeForm, evacuationType: e.target.value })}
              disabled={isSubmitting}
            >
              <MenuItem value="FireAlarm">Fire Alarm</MenuItem>
              <MenuItem value="Earthquake">Earthquake</MenuItem>
              <MenuItem value="OtherEmergency">Other Emergencies</MenuItem>
            </TextField>
            <TextField
              label="Completion Notes"
              fullWidth
              multiline
              rows={3}
              value={finalizeForm.completionNotes}
              onChange={(e) => setFinalizeForm({ ...finalizeForm, completionNotes: e.target.value })}
              disabled={isSubmitting}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setOpenFinalize(false)} color="inherit" disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleFinalizeSubmit}
            color="success"
            variant="contained"
            disabled={isSubmitting}
            startIcon={isSubmitting && <CircularProgress size={20} color="inherit" />}
          >
            {isSubmitting ? 'Finalizing...' : 'Submit & Complete'}
          </Button>
        </DialogActions>
      </Dialog>
      <Box sx={{ mt: 4, width: '100%' }}>
        <List disablePadding sx={{ width: '100%', border: (theme) => `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
          <Box sx={{ mt: 2, width: '100%' }}>
            <Typography
              variant="subtitle1"
              fontWeight={700}
              sx={{ px: 2, mb: 1, textAlign: 'left' }}
            >
              Evacuated Visitor
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
                  {combinedEvacuated.map((person) => (
                    <TableRow
                      key={person.transactionId}
                      hover={person.personStatus !== 'Confirmed Evacuated'}
                      sx={{
                        backgroundColor:
                          person.personStatus === 'Confirmed Evacuated'
                            ? 'rgba(144, 238, 144, 0.3)'
                            : 'rgba(255, 255, 224, 0.5)',
                        cursor: person.personStatus === 'Confirmed Evacuated' ? 'default' : 'pointer',
                      }}
                      onClick={
                        person.personStatus === 'Confirmed Evacuated'
                          ? undefined
                          : () => handlePersonRowClick(person.transactionId)
                      }
                    >
                      <TableCell
                        align="left"
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          borderRight: (theme) => `1px solid ${theme.palette.divider}`,
                        }}
                      >
                        <Avatar
                          src={""}
                          alt={person.personName}
                          sx={{ width: 38, height: 38, mr: 1 }}
                        />
                        <Box>
                          <Typography fontWeight={700} fontSize={16} align="left">
                            {person.personName}
                          </Typography>
                          <Typography fontSize={12} color="text.secondary" align="left">
                            Card #{person.card.cardNumber}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right" sx={{ width: 140 }}>
                        <Typography fontSize={15} fontWeight={500} color="primary.main">
                          {person.assemblyPointName || 'Unknown Area'}
                        </Typography>
                        <Typography fontSize={12} color="text.disabled">
                          {person.personStatus === 'ConfirmedEvacuated' 
                            ? (person.statusTimestamps?.confirmedEvacuationAt ? new Date(person.statusTimestamps.confirmedEvacuationAt).toLocaleString() : '-')
                            : (person.statusTimestamps?.evacuationAt ? new Date(person.statusTimestamps.evacuationAt).toLocaleString() : '-')}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                  {combinedEvacuated.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} align="center" sx={{ color: 'text.disabled' }}>
                        No visitors evacuated yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </List>
      </Box>
      {/* Person Confirmation Dialog */}
      <Dialog open={openPersonConfirm} onClose={() => setOpenPersonConfirm(false)}>
        <DialogTitle sx={{ fontSize: 18, fontWeight: 700 }}>CONFIRM PERSON STATUS</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to manually confirm this person as evacuated?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPersonConfirm(false)} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleConfirmPerson} color="primary" variant="contained">
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default TimerButton;
