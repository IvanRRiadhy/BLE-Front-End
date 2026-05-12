import React, { useMemo } from 'react';
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Stack,
  Paper,
  Grid2 as Grid,
  Divider,
  Chip,
  CircularProgress,
  TableContainer,
  alpha,
  useTheme,
} from '@mui/material';
import { useEvacuationSummary } from 'src/hooks/useEvacuate';
import { EvacuationAlertType } from 'src/hooks/useEvacuate';
import Scrollbar from 'src/components/custom-scroll/Scrollbar';

interface Props {
  open: boolean;
  onClose: () => void;
  evacuation: EvacuationAlertType | null;
}

const EvacuationSummaryDialog: React.FC<Props> = ({ open, onClose, evacuation }) => {
  const { data: summary, isLoading } = useEvacuationSummary(evacuation?.id || '');

  const formatDateTime = (dateString?: string | null) => {
    if (!dateString) return '-';
    return new Intl.DateTimeFormat('en-GB', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(new Date(dateString));
  };

  const formatDuration = (start: string, end: string | null) => {
    if (!end) return 'In Progress';
    const durationMs = new Date(end).getTime() - new Date(start).getTime();
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xl">
      <Paper sx={{ p: 0, overflow: 'hidden', borderRadius: '12px' }}>
        <DialogTitle sx={{ bgcolor: 'error.main', color: 'white', py: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h5" fontWeight={700}>
              Evacuation Summary: {evacuation?.title || 'Details'}
            </Typography>
            {evacuation?.triggerType && (
              <Chip
                label={evacuation.triggerType}
                variant="outlined"
                sx={{
                  fontWeight: 900,
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  color: 'white',
                  borderColor: 'white',
                  bgcolor: alpha('#fff', 0.2),
                  px: 1,
                }}
              />
            )}
          </Stack>
        </DialogTitle>

        <DialogContent sx={{ p: 3, mt:2, maxHeight: '85vh', overflow: 'auto' }}>
          {/* Top Details Section */}
          <Box mb={4}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 4 }}>
                <Stack spacing={1}>
                  <Typography variant="subtitle2" color="text.secondary" fontWeight={700}>
                    Description
                  </Typography>
                  <Typography variant="body1">
                    {evacuation?.description || 'No description provided.'}
                  </Typography>
                </Stack>
              </Grid>
                            <Grid size={{ xs: 12, md: 4 }}>
                <Stack spacing={1}>
                    <Typography variant="subtitle2" color="text.secondary" fontWeight={700}>
                      Completion Notes
                    </Typography>
                    <Typography variant="body2">
                      {evacuation?.completionNotes || '-'}
                    </Typography>
                </Stack>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Stack spacing={1}>

                    <Typography variant="subtitle2" color="text.secondary" fontWeight={700}>
                      Timing & Duration
                    </Typography>
                    <Typography variant="body2">
                      Started: {formatDateTime(evacuation?.startedAt)}
                    </Typography>
                    <Typography variant="body2">
                      Ended: {formatDateTime(evacuation?.completedAt)}
                    </Typography>
                    <Typography variant="body2" fontWeight={700} color="primary.main">
                      Duration: {evacuation ? formatDuration(evacuation.startedAt, evacuation.completedAt) : '-'}
                    </Typography>


                </Stack>
              </Grid>
            </Grid>
          </Box>

          <Divider sx={{ mb: 4 }} />

          {/* Person Details List */}
          <Typography variant="h6" fontWeight={700} mb={2}>
            Person Details
          </Typography>

          {isLoading ? (
            <Box display="flex" justifyContent="center" py={5}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '8px' }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, bgcolor: 'action.hover' }}>Person Name</TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: 'action.hover' }}>Card Number</TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: 'action.hover' }}>Type</TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: 'action.hover' }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: 'action.hover' }}>Assembly Point</TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: 'action.hover' }}>Confirmed At</TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: 'action.hover' }}>Confirmed By</TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: 'action.hover' }}>Notes</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {summary?.personDetails.map((person) => (
                    <TableRow key={person.transactionId} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{person.personName}</TableCell>
                      <TableCell>{person.cardNumber}</TableCell>
                      <TableCell>{person.personCategory}</TableCell>
                      <TableCell>
                        <Chip
                          label={person.personStatus}
                          size="small"
                          color={
                            person.personStatus === 'ConfirmedEvacuated'
                              ? 'success'
                              : person.personStatus === 'Evacuated'
                              ? 'info'
                              : 'error'
                          }
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>{person.assemblyPointName || '-'}</TableCell>
                      <TableCell>{formatDateTime(person.confirmedEvacuationAt)}</TableCell>
                      <TableCell>{person.confirmedEvacuationBy || '-'}</TableCell>
                      <TableCell sx={{ maxWidth: 200 }}>
                        <Typography variant="caption" noWrap display="block">
                          {person.confirmationNotes || '-'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                  {summary?.personDetails.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                        No person details found for this session.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
      </Paper>
    </Dialog>
  );
};

export default EvacuationSummaryDialog;
