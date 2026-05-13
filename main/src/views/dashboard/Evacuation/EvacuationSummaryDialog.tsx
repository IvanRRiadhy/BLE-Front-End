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
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  DialogActions,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import { Upload, PictureAsPdf, TableChart, ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import { useState } from 'react';
import { useEvacuationSummary } from 'src/hooks/useEvacuate';
import { EvacuationAlertType } from 'src/hooks/useEvacuate';
import Scrollbar from 'src/components/custom-scroll/Scrollbar';
import {
  downloadEvacuationSummaryExcel,
  downloadEvacuationSummaryPdf,
} from 'src/utils/exportEvacuationSummary';

interface Props {
  open: boolean;
  onClose: () => void;
  evacuation: EvacuationAlertType | null;
}

const EvacuationSummaryDialog: React.FC<Props> = ({ open, onClose, evacuation }) => {
  const { data: summary, isLoading } = useEvacuationSummary(evacuation?.id || '');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(anchorEl);
  const [activeTab, setActiveTab] = useState<'person' | 'assembly'>('person');

  const handleExportClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleExportClose = () => {
    setAnchorEl(null);
  };

  const handleExport = (type: 'pdf' | 'excel') => {
    if (!summary) return;
    const filename = `Evacuation_Summary_${evacuation?.title || 'Report'}_${new Date().getTime()}`;
    if (type === 'pdf') {
      downloadEvacuationSummaryPdf(summary, evacuation, `${filename}.pdf`);
    } else {
      downloadEvacuationSummaryExcel(summary, evacuation, `${filename}.xlsx`);
    }
    handleExportClose();
  };

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
    <Dialog 
      open={open} 
      onClose={onClose} 
      fullWidth 
      maxWidth="xl"
      PaperProps={{
        sx: { borderRadius: '12px', overflow: 'hidden' }
      }}
    >
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
          {/* <Typography variant="h6" fontWeight={700} mb={2}>
            Person Details
          </Typography> */}
          <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
                    <Tab label="Person Details" value="person" />
                    <Tab label="Assembly Point Details" value="assembly" />
                  </Tabs>

          {isLoading ? (
            <Box display="flex" justifyContent="center" py={5}>
              <CircularProgress />
            </Box>
          ) : activeTab === 'person' ? (
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '8px', maxHeight: '45vh' }}>
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
          ) : (
            <Box sx={{ mt: 2, maxHeight: '45vh', overflowY: 'auto' }}>
              {summary?.byAssemblyPoint.map((ap) => {
                const persons = summary.personDetails.filter(p => p.assemblyPointId === ap.assemblyPointId);
                const rate = ap.evacuated > 0 ? (ap.confirmed / ap.evacuated * 100).toFixed(0) : 0;
                
                return (
                  <Accordion key={ap.assemblyPointId} disableGutters variant="outlined" sx={{ mb: 1, borderRadius: '8px !important', overflow: 'hidden' }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Stack direction="row" spacing={3} alignItems="center" sx={{ width: '100%', pr: 2 }}>
                        <Typography variant="subtitle1" fontWeight={700} sx={{ flexGrow: 1 }}>
                          {ap.name}
                        </Typography>
                        <Stack direction="row" spacing={2}>
                          <Chip label={`Evacuated: ${ap.evacuated}`} size="small" variant="outlined" />
                          <Chip label={`Confirmed: ${ap.confirmed}`} size="small" color="success" variant="outlined" />
                          <Chip label={`Rate: ${rate}%`} size="small" color={Number(rate) === 100 ? "success" : "warning"} />
                        </Stack>
                      </Stack>
                    </AccordionSummary>
                    <AccordionDetails sx={{ p: 0 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ bgcolor: 'action.hover' }}>
                            <TableCell sx={{ fontWeight: 600 }}>Person Name</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Confirmed At</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {persons.map((person) => (
                            <TableRow key={person.transactionId} hover>
                              <TableCell>{person.personName}</TableCell>
                              <TableCell>{person.personCategory}</TableCell>
                              <TableCell>
                                <Chip 
                                  label={person.personStatus} 
                                  size="small" 
                                  color={person.personStatus === 'ConfirmedEvacuated' ? 'success' : 'info'} 
                                  variant="outlined" 
                                />
                              </TableCell>
                              <TableCell>{formatDateTime(person.confirmedEvacuationAt)}</TableCell>
                            </TableRow>
                          ))}
                          {persons.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={4} align="center" sx={{ py: 2 }}>
                                No persons assigned to this assembly point.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </AccordionDetails>
                  </Accordion>
                );
              })}
              {summary?.byAssemblyPoint.length === 0 && (
                <Box py={5} textAlign="center">
                  <Typography variant="body1" color="text.secondary">
                    No assembly point data available.
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <Divider />
        <DialogActions sx={{ p: 2 }}>
          <Button
            variant="contained"
            color="error"
            startIcon={<Upload />}
            onClick={handleExportClick}
            disabled={isLoading || !summary}
          >
            Export Report
          </Button>
          <Menu anchorEl={anchorEl} open={menuOpen} onClose={handleExportClose}>
            <MenuItem onClick={() => handleExport('pdf')}>
              <ListItemIcon>
                <PictureAsPdf fontSize="small" color="error" />
              </ListItemIcon>
              <ListItemText>as PDF</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => handleExport('excel')}>
              <ListItemIcon>
                <TableChart fontSize="small" color="success" />
              </ListItemIcon>
              <ListItemText>as XLS/CSV</ListItemText>
            </MenuItem>
          </Menu>
          <Box sx={{ flexGrow: 1 }} />
          <Button onClick={onClose} variant="outlined" color="inherit">
            Close
          </Button>
        </DialogActions>
    </Dialog>
  );
};

export default EvacuationSummaryDialog;
