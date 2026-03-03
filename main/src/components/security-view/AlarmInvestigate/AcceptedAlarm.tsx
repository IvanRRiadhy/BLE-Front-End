import {
  Avatar,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  MenuItem,
  Stack,
  Divider,
} from '@mui/material';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useInvestigateAlarmTrigger } from 'src/hooks/useAlarmTrigger';
import { SecurityAlarmLogItem } from './AlarmInvestigation';
import { MenuSelect } from 'mui-tiptap';
import { investigationResultType } from 'src/types/crud/input';
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';
import { dispatch, RootState, useSelector } from 'src/store/Store';
import { SetFocusAlarm } from 'src/store/apps/tracking/Beacon';

interface AcceptedAlarmViewProps {
  alarm: SecurityAlarmLogItem;
  onBack: () => void;
  onAccept: (alarm: SecurityAlarmLogItem) => void;
}

const AcceptedAlarm = ({ alarm, onBack, onAccept }: AcceptedAlarmViewProps) => {
  const [investigationNotes, setInvestigationNotes] = useState('');
  const [investigationResult, setInvestigationResult] = useState('');
  const focusPosition = useSelector((state: RootState) => state.BeaconReducer.focusPosition);
  const isAccepted = alarm.action === 'Accepted';

  const InvestigateMutation = useInvestigateAlarmTrigger();

  const handleSubmit = () => {
    if (!investigationResult) {
      toast.error('Please select an investigation result');
      return;
    }

    if (!investigationNotes.trim()) {
      toast.error('Investigation notes cannot be empty');
      return;
    }

    InvestigateMutation.mutate(
      {
        id: alarm.id,
        result: investigationResult, // API expects only result
        note: investigationNotes,
      },
      {
        onSuccess: () => {
          toast.success('Investigation submitted successfully');
          setInvestigationNotes('');
          setInvestigationResult('');
          dispatch(SetFocusAlarm(null)); // Clear focus alarm after submission
        },
        onError: () => {
          toast.error('Failed to submit investigation');
        },
      },
    );
  };

  return (
    <Box sx={{ p: 2, textAlign: 'center' }}>
      {/* <Typography
        sx={{
          fontSize: 20,
          fontWeight: 700,
          color: 'error.main',
          mb: 2,
        }}
      >
        Investigation In Progress
      </Typography> */}

      <Avatar src={alarm.image} sx={{ width: 100, height: 100, margin: '0 auto', mb: 2 }} />

      <Typography sx={{ fontSize: 18, fontWeight: 600 }}>{alarm.name}</Typography>

      {/* ================= Triggered Section ================= */}
      <Box sx={{ mt: 2 }}>
        <Stack direction="row" justifyContent="center" spacing={1}>
          <Typography sx={{ fontSize: 14, fontWeight: 700 }}>Triggered at</Typography>
          <Typography sx={{ fontSize: 14 }}>{alarm.triggerTime}</Typography>
        </Stack>

        <Typography sx={{ fontSize: 14, mt: 0.5 }}>
          {alarm.buildingName} | {alarm.floorName}
        </Typography>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* ================= Last Detected Section ================= */}
      <Box sx={{ mt: 1 }}>
        <Stack direction="row" justifyContent="center" spacing={1}>
          <Typography sx={{ fontSize: 14, fontWeight: 700 }}>Last Detected at</Typography>
          <Typography sx={{ fontSize: 14 }}>{focusPosition?.time || 'Unknown'}</Typography>
        </Stack>

        <Typography sx={{ fontSize: 14, mt: 0.5 }}>
          {focusPosition?.floorplanName || 'Unknown'} | {focusPosition?.areaName || 'Unknown'}
        </Typography>
      </Box>
      {/* ================= Bottom Section ================= */}
      <Paper
        elevation={0}
        sx={{
          mt: 4,
          p: 3,
          borderRadius: '16px',
          backgroundColor: '#f8f9fa',
          border: '1px solid #e0e0e0',
          textAlign: 'left',
        }}
      >
        {!isAccepted ? (
          <>
            <Typography sx={{ fontWeight: 600, mb: 2 }}>
              This alarm has not been accepted yet.
            </Typography>

            <Stack direction="row" spacing={2}>
              <Button variant="outlined" fullWidth onClick={onBack}>
                Back
              </Button>

              <Button variant="contained" color="error" fullWidth onClick={() => onAccept(alarm)}>
                Accept Investigation
              </Button>
            </Stack>
          </>
        ) : (
          <>
            <Typography sx={{ fontSize: 14, fontWeight: 600, mb: 1 }}>
              Investigation Result
            </Typography>

            <CustomSelect
              fullWidth
              value={investigationResult}
              onChange={(e: any) => setInvestigationResult(e.target.value)}
            >
              {investigationResultType.map((option) => (
                <MenuItem key={option.value} value={option.value} disabled={option.disabled}>
                  {option.label}
                </MenuItem>
              ))}
            </CustomSelect>

            <Typography sx={{ fontSize: 14, fontWeight: 600, mt: 3, mb: 1 }}>
              Investigation Notes
            </Typography>

            <TextField
              fullWidth
              multiline
              // minRows={3}
              // maxRows={3}
              rows={3}
              value={investigationNotes}
              onChange={(e) => setInvestigationNotes(e.target.value)}
              sx={{ mb: 2 }}
            />

            <Stack direction="row" spacing={2}>
              {!isAccepted && (
                <Button variant="outlined" fullWidth onClick={onBack}>
                  Back
                </Button>
              )}

              <Button
                variant="contained"
                fullWidth
                disabled={InvestigateMutation.isPending}
                onClick={handleSubmit}
              >
                {InvestigateMutation.isPending ? 'Submitting...' : 'Submit Investigation Result'}
              </Button>
            </Stack>
          </>
        )}
      </Paper>
    </Box>
  );
};

export default AcceptedAlarm;
