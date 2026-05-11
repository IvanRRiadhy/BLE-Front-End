import React, { useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Grid2 as Grid,
  CircularProgress,
  Stack,
  alpha,
  Divider,
  Tooltip,
} from '@mui/material';
import { EvacuationAlertType, useEvacuationList } from 'src/hooks/useEvacuate';
import Scrollbar from 'src/components/custom-scroll/Scrollbar';
import { useTranslation } from 'react-i18next';

import EvacuationSummaryDialog from './EvacuationSummaryDialog';
import SmartScrollingText from 'src/utils/SmartScrollingText';

const EvacuationList: React.FC = () => {
  const { t } = useTranslation();
  const [selectedEvacuation, setSelectedEvacuation] = React.useState<EvacuationAlertType | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const { data: response, isLoading } = useEvacuationList({
    draw: 1,
    start: 0,
    length: 100,
    searchValue: '',
    sortColumn: 'startedAt',
    sortDir: 'desc',
    filters: {
      alertStatus: 'Completed',
    },
  });

  const evacuations = response?.data || [];
  const totalEvacuations = response?.recordsTotal || 0;

  const lastEvacuation = useMemo(() => {
    if (evacuations.length === 0) return null;
    return evacuations[0];
  }, [evacuations]);

  const formatDuration = (start: string, end: string | null) => {
    if (!end) return 'In Progress';
    const durationMs = new Date(end).getTime() - new Date(start).getTime();
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    const weekday = t(date.toLocaleString('en-GB', { weekday: 'short' }));
    const month = t(date.toLocaleString('en-GB', { month: 'short' }));
    return `${weekday}, ${date.getDate()} ${month} ${date.getFullYear()}`;
  };

  const handleRowClick = (evac: EvacuationAlertType) => {
    setSelectedEvacuation(evac);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedEvacuation(null);
  };

  if (isLoading) {
    return (
      <Card
        sx={{
          minWidth: 260,
          height: '100%',
          p: 3,
          borderRadius: 4,
          boxShadow: 8,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          bgcolor: 'background.paper',
        }}
      >
        <CircularProgress />
      </Card>
    );
  }

  return (
    <>
      <Card
        sx={{
          minWidth: 550,
          flex: 1.5,
          height: '100%',
          p: 0,
          borderRadius: 4,
          boxShadow: 8,
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'background.paper',
          overflow: 'hidden',
          border: '1px solid #E0E0E0',
        }}
      >
        <Box p={3} pb={2}>
          <Typography variant="h5" fontWeight={800} color="primary.main" gutterBottom>
            Evacuation History
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Summary of past evacuation sessions
          </Typography>

          <Grid container spacing={2} mb={3}>
            <Grid size={6}>
              <Box
                sx={{
                  p: 2,
                  borderRadius: '12px',
                  bgcolor: 'error.light',
                  textAlign: 'center',
                }}
              >
                <Typography color="error.dark" variant="subtitle2" fontWeight={600} fontSize={12}>
                  Total Sessions
                </Typography>
                <Typography color="error.main" variant="h4" fontWeight={800} sx={{ mt: 1 }}>
                  {totalEvacuations}
                </Typography>
              </Box>
            </Grid>
            <Grid size={6}>
              <Box
                sx={{
                  p: 2,
                  borderRadius: '12px',
                  bgcolor: 'warning.light',
                  textAlign: 'center',
                }}
              >
                <Typography color="warning.dark" variant="subtitle2" fontWeight={600} fontSize={12}>
                  Last Evacuation
                </Typography>
                <Typography
                  color="warning.main"
                  variant="h6"
                  fontWeight={800}
                  sx={{ mt: 1, fontSize: '0.9rem' }}
                  noWrap
                >
                  {lastEvacuation ? formatTime(lastEvacuation.startedAt) : 'N/A'}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Box>

        <Divider />

        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          <TableContainer
            component={Paper}
            elevation={0}
            sx={{ bgcolor: 'transparent', maxHeight: '95%' }}
          >
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800, bgcolor: 'background.paper', py: 2 }}>
                    Session
                  </TableCell>
                  <TableCell sx={{ fontWeight: 800, bgcolor: 'background.paper', py: 2 }}>
                    Type
                  </TableCell>
                  <TableCell sx={{ fontWeight: 800, bgcolor: 'background.paper', py: 2 }}>
                    Date
                  </TableCell>
                  <TableCell
                    sx={{ fontWeight: 800, bgcolor: 'background.paper', py: 2 }}
                    align="right"
                  >
                    Duration
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {evacuations.map((evac) => (
                  <Tooltip key={evac.id} title="Click to open detail" placement='top' arrow={false}>
                    <TableRow
                      hover
                      onClick={() => handleRowClick(evac)}
                      sx={{ cursor: 'pointer' }}
                    >
                    <TableCell>
                      <Stack spacing={0.5}>
                        <Typography variant="subtitle2" fontWeight={700}>
                          {evac.title}
                        </Typography>
                        {/* <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ maxWidth: 120 }}
                          noWrap
                        >
                          {evac.description}
                        </Typography> */}
                        <Box sx={{ flex: 1, maxWidth: 120 }}>
<SmartScrollingText 
                        text={evac.description} 
                        />
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Stack spacing={0.5}>
                        <Typography variant="subtitle2" fontWeight={700}>
                          {evac.triggerType}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                        {formatTime(evac.startedAt)}
                      </Typography>
                      <Typography variant="caption" color="text.disabled">
                        {new Date(evac.startedAt).toLocaleTimeString('en-GB', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false,
                        })}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Box
                        sx={{
                          display: 'inline-block',
                          bgcolor: evac.completedAt ? 'success.light' : 'warning.light',
                          color: evac.completedAt ? 'success.main' : 'warning.main',
                          px: 1,
                          py: 0.25,
                          borderRadius: '6px',
                          fontWeight: 700,
                          fontSize: '0.7rem',
                        }}
                      >
                        {formatDuration(evac.startedAt, evac.completedAt)}
                      </Box>
                    </TableCell>
                  </TableRow>
                </Tooltip>
                ))}
                {evacuations.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} align="center" sx={{ py: 5 }}>
                      <Typography variant="body2" color="text.disabled">
                        No records found
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Card>

      <EvacuationSummaryDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        evacuation={selectedEvacuation}
      />
    </>
  );
};

export default EvacuationList;
