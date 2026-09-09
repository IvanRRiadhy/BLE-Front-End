import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Grid2 as Grid,
  Stack,
  Avatar,
  Chip,
  LinearProgress,
  Divider,
  IconButton,
  CircularProgress,
  useTheme,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Paper,
} from '@mui/material';
import {
  IconX,
  IconClock,
  IconMapPin,
  IconAlertTriangle,
  IconShieldCheck,
  IconBuilding,
  IconCreditCard,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { BASE_URL } from 'src/utils/axios';
import { usePersonOverview } from 'src/hooks/useInvestigate';

interface CompactTrackingDetailModalProps {
  open: boolean;
  onClose: () => void;
  personId?: string;
  personName?: string;
  personType?: string;
  faceImage?: string;
  bleNumber?: string;
  cardNumber?: string;
}

const CompactTrackingDetailModal: React.FC<CompactTrackingDetailModalProps> = ({
  open,
  onClose,
  personId,
  personName = 'Unknown Person',
  personType = 'Member',
  faceImage,
  bleNumber = '-',
  cardNumber = '-',
}) => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState<'timeline' | 'areas' | 'compliance'>('timeline');

  // Calculate today's timeframe (00:00:00 to 23:59:59)
  const todayFrom = dayjs().startOf('day').format('YYYY-MM-DDTHH:mm:ss');
  const todayTo = dayjs().endOf('day').format('YYYY-MM-DDTHH:mm:ss');

  const { data, isLoading } = usePersonOverview(
    {
      personId: personId || null,
      from: todayFrom,
      to: todayTo,
    },
    open && Boolean(personId)
  );

  // Normalize API values
  const info = data?.personInfo;
  const currentState = data?.currentState;
  const stayAnalysis = data?.stayDurationAnalysis;
  const compliance = data?.accessCompliance;
  const incidentSummary = data?.incidentSummary;
  const timeline = data?.chronologicalTimeline || [];

  const displayName = info?.name || personName;
  const displayType = info?.personType || personType;
  const avatarUrl = info?.faceImage ? `${BASE_URL}${info.faceImage}` : faceImage ? `${BASE_URL}${faceImage}` : undefined;

  const totalPresence = stayAnalysis?.totalPresenceFormatted || '0 min';
  const complianceScore = compliance?.complianceScore ?? 100;
  const isViolation = complianceScore < 100 || (compliance?.complianceStatus?.toLowerCase() === 'violation');
  const totalIncidents = incidentSummary?.totalIncidents ?? 0;
  const areaBreakdown = stayAnalysis?.areaBreakdown || [];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        elevation: 8,
        sx: {
          borderRadius: '16px',
          overflow: 'hidden',
          bgcolor: 'background.paper',
        },
      }}
    >
      {/* Header */}
      <DialogTitle
        sx={{
          p: 2.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50'),
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar
            src={avatarUrl}
            alt={displayName}
            sx={{
              width: 48,
              height: 48,
              border: `2px solid ${theme.palette.primary.main}`,
            }}
          />
          <Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="h6" fontWeight={700}>
                {displayName}
              </Typography>
              <Chip
                label={displayType ? displayType.charAt(0).toUpperCase() + displayType.slice(1) : 'Member'}
                size="small"
                color={
                  displayType?.toLowerCase() === 'visitor'
                    ? 'error'
                    : displayType?.toLowerCase() === 'security'
                    ? 'success'
                    : 'primary'
                }
                sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600 }}
              />
            </Stack>
            <Typography variant="caption" color="text.secondary">
              Today Tracking Overview ({dayjs().format('MMM D, YYYY')})
            </Typography>
          </Box>
        </Stack>
        <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }}>
          <IconX size={20} />
        </IconButton>
      </DialogTitle>

      {/* Content */}
      <DialogContent sx={{ p: 2.5, maxHeight: '75vh' }}>
        {isLoading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="250px">
            <CircularProgress size={36} />
          </Box>
        ) : (
          <Stack spacing={2.5}>
            {/* Quick Metrics Bar */}
            <Grid container spacing={2}>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Paper
                  variant="outlined"
                  sx={{ p: 1.5, borderRadius: '12px', bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'grey.900' : 'primary.50') }}
                >
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box
                      sx={{
                        p: 1,
                        borderRadius: '8px',
                        bgcolor: 'primary.main',
                        color: 'white',
                        display: 'flex',
                      }}
                    >
                      <IconClock size={20} />
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Total Presence
                      </Typography>
                      <Typography variant="body2" fontWeight={700}>
                        {totalPresence}
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>
              </Grid>

              <Grid size={{ xs: 6, sm: 3 }}>
                <Paper
                  variant="outlined"
                  sx={{ p: 1.5, borderRadius: '12px', bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'grey.900' : 'success.50') }}
                >
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box
                      sx={{
                        p: 1,
                        borderRadius: '8px',
                        bgcolor: 'success.main',
                        color: 'white',
                        display: 'flex',
                      }}
                    >
                      <IconMapPin size={20} />
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Areas Visited
                      </Typography>
                      <Typography variant="body2" fontWeight={700}>
                        {areaBreakdown.length} Areas
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>
              </Grid>

              <Grid size={{ xs: 6, sm: 3 }}>
                <Paper
                  variant="outlined"
                  sx={{ p: 1.5, borderRadius: '12px', bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'grey.900' : isViolation ? 'error.50' : 'success.50') }}
                >
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box
                      sx={{
                        p: 1,
                        borderRadius: '8px',
                        bgcolor: isViolation ? 'error.main' : 'success.main',
                        color: 'white',
                        display: 'flex',
                      }}
                    >
                      <IconShieldCheck size={20} />
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Compliance
                      </Typography>
                      <Typography variant="body2" fontWeight={700} color={isViolation ? 'error.main' : 'success.main'}>
                        {complianceScore}%
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>
              </Grid>

              <Grid size={{ xs: 6, sm: 3 }}>
                <Paper
                  variant="outlined"
                  sx={{ p: 1.5, borderRadius: '12px', bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'grey.900' : totalIncidents > 0 ? 'warning.50' : 'grey.100') }}
                >
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box
                      sx={{
                        p: 1,
                        borderRadius: '8px',
                        bgcolor: totalIncidents > 0 ? 'warning.main' : 'grey.500',
                        color: 'white',
                        display: 'flex',
                      }}
                    >
                      <IconAlertTriangle size={20} />
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Incidents
                      </Typography>
                      <Typography variant="body2" fontWeight={700}>
                        {totalIncidents} Events
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>
              </Grid>
            </Grid>

            {/* Current Info Row */}
            <Paper variant="outlined" sx={{ p: 2, borderRadius: '12px' }}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <IconBuilding size={18} color={theme.palette.text.secondary} />
                    <Typography variant="body2" color="text.secondary">
                      Current Area:
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {currentState?.currentArea || '-'} ({currentState?.currentFloor || '-'})
                    </Typography>
                  </Stack>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <IconCreditCard size={18} color={theme.palette.text.secondary} />
                    <Typography variant="body2" color="text.secondary">
                      Card / BLE:
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {currentState?.activeCardNumber || cardNumber} / {currentState?.activeBleMac || bleNumber}
                    </Typography>
                  </Stack>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <IconClock size={18} color={theme.palette.text.secondary} />
                    <Typography variant="body2" color="text.secondary">
                      Last Seen:
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {currentState?.lastSeenTime ? dayjs(currentState.lastSeenTime).format('ddd, DD MMM YYYY, HH:mm:ss') : '-'}
                    </Typography>
                  </Stack>
                </Grid>
              </Grid>
            </Paper>

            {/* Navigation Tabs */}
            <Stack direction="row" spacing={1}>
              <Button
                variant={activeTab === 'timeline' ? 'contained' : 'outlined'}
                size="small"
                onClick={() => setActiveTab('timeline')}
                sx={{ borderRadius: '8px' }}
              >
                Timeline ({timeline.length})
              </Button>
              <Button
                variant={activeTab === 'areas' ? 'contained' : 'outlined'}
                size="small"
                onClick={() => setActiveTab('areas')}
                sx={{ borderRadius: '8px' }}
              >
                Area Breakdown ({areaBreakdown.length})
              </Button>
              <Button
                variant={activeTab === 'compliance' ? 'contained' : 'outlined'}
                size="small"
                onClick={() => setActiveTab('compliance')}
                sx={{ borderRadius: '8px' }}
              >
                Access & Incidents
              </Button>
            </Stack>

            {/* Tab Views */}
            {activeTab === 'timeline' && (
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '12px', maxHeight: 280 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Time</TableCell>
                      <TableCell>Event</TableCell>
                      <TableCell>Location</TableCell>
                      <TableCell>Details</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {timeline.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} align="center">
                          <Typography variant="body2" color="text.secondary" py={2}>
                            No timeline events recorded today.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      timeline.map((item, idx) => (
                        <TableRow key={idx} hover>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>
                            <Typography variant="body2" fontWeight={600}>
                              {item.timestamp ? dayjs(item.timestamp).format('ddd, DD MMM YYYY, HH:mm:ss') : '-'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {(() => {
                              const badgeText =
                                item.badge === 'Info' || item.badge === 'Primary' || item.badge === 'Success'
                                  ? item.eventType || item.title || 'Event'
                                  : item.badge || item.eventType || 'Event';
                              const isError =
                                item.badge === 'Violation' ||
                                item.badge === 'Error' ||
                                item.eventType?.toLowerCase().includes('violation');
                              const isWarning =
                                item.badge === 'Alert' ||
                                item.badge === 'Warning' ||
                                item.eventType?.toLowerCase().includes('alarm');

                              return (
                                <Chip
                                  label={badgeText}
                                  size="small"
                                  color={isError ? 'error' : isWarning ? 'warning' : 'primary'}
                                  variant="outlined"
                                  sx={{ fontSize: '0.7rem', height: 20, fontWeight: 600 }}
                                />
                              );
                            })()}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{item.location || '-'}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {item.title} - {item.description}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {activeTab === 'areas' && (
              <Stack spacing={1.5}>
                {areaBreakdown.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" align="center" py={2}>
                    No area breakdown data available for today.
                  </Typography>
                ) : (
                  areaBreakdown.map((area, idx) => (
                    <Paper key={idx} variant="outlined" sx={{ p: 1.5, borderRadius: '10px' }}>
                      <Stack spacing={0.5}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2" fontWeight={600}>
                            {area.areaName} ({area.buildingName} - {area.floorName})
                          </Typography>
                          <Typography variant="caption" fontWeight={700} color="primary.main">
                            {area.durationFormatted} ({area.percentage}%)
                          </Typography>
                        </Stack>
                        <LinearProgress
                          variant="determinate"
                          value={area.percentage}
                          sx={{ height: 6, borderRadius: 3 }}
                        />
                      </Stack>
                    </Paper>
                  ))
                )}
              </Stack>
            )}

            {activeTab === 'compliance' && (
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: '12px' }}>
                    <Typography variant="subtitle2" fontWeight={700} mb={1}>
                      Compliance Status
                    </Typography>
                    <Stack spacing={1}>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">
                          Score:
                        </Typography>
                        <Typography variant="body2" fontWeight={700} color={isViolation ? 'error.main' : 'success.main'}>
                          {complianceScore}%
                        </Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">
                          Status:
                        </Typography>
                        <Chip
                          label={compliance?.complianceStatus || 'Compliant'}
                          size="small"
                          color={isViolation ? 'error' : 'success'}
                          sx={{ height: 20, fontSize: '0.7rem' }}
                        />
                      </Stack>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">
                          Authorized Areas:
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {compliance?.authorizedAreasVisited ?? 0} Visited
                        </Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">
                          Unauthorized Breaches:
                        </Typography>
                        <Typography variant="body2" fontWeight={600} color="error.main">
                          {compliance?.unauthorizedAreasVisited ?? 0} Breaches
                        </Typography>
                      </Stack>
                    </Stack>
                  </Paper>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: '12px' }}>
                    <Typography variant="subtitle2" fontWeight={700} mb={1}>
                      Incident Alarms ({totalIncidents})
                    </Typography>
                    {incidentSummary?.alarms && incidentSummary.alarms.length > 0 ? (
                      <Stack spacing={1}>
                        {incidentSummary.alarms.map((alarm: any, idx: number) => (
                          <Box key={idx} sx={{ p: 1, bgcolor: 'error.50', borderRadius: '6px' }}>
                            <Typography variant="caption" fontWeight={700} color="error.main" display="block">
                              {alarm.alarmType || 'Alarm Triggered'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {alarm.areaName} - {dayjs(alarm.timestamp).format('HH:mm')}
                            </Typography>
                          </Box>
                        ))}
                      </Stack>
                    ) : (
                      <Typography variant="body2" color="text.secondary" py={1}>
                        No active security incidents or breaches recorded.
                      </Typography>
                    )}
                  </Paper>
                </Grid>
              </Grid>
            )}
          </Stack>
        )}
      </DialogContent>

      <Divider />
      <DialogActions sx={{ p: 2 }}>
        <Button variant="outlined" color="inherit" onClick={onClose} sx={{ borderRadius: '8px' }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CompactTrackingDetailModal;
