import React, { useState, useMemo, useEffect } from 'react';
import {
  Box,
  Grid2 as Grid,
  Dialog,
  DialogContent,
  DialogTitle,
  Typography,
  Button,
  Tabs,
  Tab,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Stack,
  Paper,
  Divider,
  TableContainer,
  TableSortLabel,
  Chip,
  TextField,
  MenuItem,
  Tooltip,
  IconButton,
  Skeleton,
} from '@mui/material';
import BlankCard from 'src/components/shared/BlankCard';
import { EVENT_TYPE, EventType } from 'src/types/crud/input';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'src/store/Store';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { ClearEventLogs } from 'src/store/apps/tracking/Event';
import { IconEraser, IconRefresh } from '@tabler/icons-react';
import { useEvents } from 'src/hooks/useEvents';
import { defaultEventFilter } from 'src/store/apps/defaultForm';

const columns = [
  { label: 'Event', field: 'Building.Name', sortAble: true },
  { label: 'Event Time', field: 'Name', sortAble: true },
  { label: 'Server Time', field: 'Name', sortAble: true },
  { label: 'Actor', field: 'Building.Name', sortAble: true },
  { label: 'Actor Role', field: 'Name', sortAble: true },
  { label: 'Entity', field: 'Entity', sortAble: true },
  { label: 'Details', field: 'Building.Name', sortAble: false },
];

const EVENT_META: Record<EventType, { color: string }> = {
  CREATE: { color: 'success' },
  UPDATE: { color: 'secondary' },
  DELETE: { color: 'warning' },
  REPORT: { color: 'warning' },
  ALARM: { color: 'error' },
  User: { color: 'primary' },
  ACTION: { color: 'primary' },
  LOGIN: { color: 'info' },
  OTHER: { color: 'gray' },
} as const;

type EventLogType = {
  event: EventType;
  eventTime: string;
  serverTime: string;
  actor: string;
  actorRole: string;
  entity: string;
  details: string;
};

const EVENT_OPTIONS: EventType[] = [
  'CREATE',
  'UPDATE',
  'DELETE',
  'REPORT',
  'ALARM',
  'LOGIN',
  'ACTION',
  'OTHER',
];

const ACTOR_ROLE_OPTIONS = ['SuperAdmin', 'PrimaryAdmin', 'Primary', 'Secondary'];

const ENTITY_OPTIONS = ['MstOrganization', 'MstDepartment', 'MstDistrict', 'MstBuilding'];

const SKELETON_ROWS = 5;

const EventReportList = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  
  const {
    data: infiniteData,
    refetch,
    isFetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useEvents(defaultEventFilter, 50);

  const rawEvents = useMemo(() => {
    if (!infiniteData?.pages) return [];
    return infiniteData.pages.flatMap((page) => page.data);
  }, [infiniteData]);

  const isValidEventType = (value: any): value is EventType =>
    Object.values(EVENT_TYPE).includes(value);
  const [filterEvent, setFilterEvent] = useState<EventType | 'ALL'>('ALL');
  const [filterActorRole, setFilterActorRole] = useState<string | 'ALL'>('ALL');
  const [filterEntity, setFilterEntity] = useState<string | 'ALL'>('ALL');
  const [filterStartDate, setFilterStartDate] = useState<string>(''); // ISO string
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [openClearDialog, setOpenClearDialog] = useState(false);

  const eventLogData = useMemo(() => {
    return rawEvents.map((log: any) => {
      const safeEvent: EventType = isValidEventType(log.eventName) ? log.eventName : 'OTHER';
      return {
        event: safeEvent,
        eventTime: log.eventTime,
        serverTime: log.eventTime, // Fallback since serverTime is not in the audit-log API snippet
        actor: log.actor ?? '-',
        actorRole: log.actorRole ?? '-', // Fallback since actorRole is not in the audit-log API snippet
        entity: log.entityName ?? '-',
        details: log.details ?? '-',
      };
    });
  }, [rawEvents]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 100) {
      if (hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    }
  };

  const toLocalISOString = (date: Date) => {
    const tzOffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - tzOffset).toISOString().slice(0, -1);
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);

    // Extract the weekday
    const weekday = t(date.toLocaleString('en-GB', { weekday: 'long' }));
    const month = t(date.toLocaleString('en-GB', { month: 'short' }));

    return `${weekday}, ${date.getDate()} ${month} ${date.getFullYear()} - ${date.toLocaleTimeString(
      'en-GB',
      {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      },
    )}`;
  };
  const filteredData = useMemo(() => {
    return eventLogData.filter((row: any) => {
      // Event
      if (filterEvent !== 'ALL' && row.event !== filterEvent) return false;

      // Actor Role
      if (filterActorRole !== 'ALL' && row.actorRole !== filterActorRole) return false;

      // Entity
      if (filterEntity !== 'ALL' && row.entity !== filterEntity) return false;

      // DateTime (pakai eventTime)
      const eventDate = new Date(row.eventTime).getTime();

      if (filterStartDate) {
        const start = new Date(filterStartDate).getTime();
        if (eventDate < start) return false;
      }

      if (filterEndDate) {
        const end = new Date(filterEndDate).getTime();
        if (eventDate > end) return false;
      }

      return true;
    });
  }, [eventLogData, filterEvent, filterActorRole, filterEntity, filterStartDate, filterEndDate]);

  const renderSkeletonRows = (rows: number) => (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={`skeleton-${i}`}>
          <TableCell
            sx={{
              position: 'sticky',
              left: 0,
              backgroundColor: 'background.paper',
              zIndex: 1,
              width: 35,
              minWidth: 35,
              maxWidth: 35,
              borderRight: (theme) => `1px solid ${theme.palette.divider}`,
              backgroundClip: 'padding-box',
            }}
          >
            <Skeleton variant="text" width={80} />
          </TableCell>
          <TableCell>
            <Skeleton variant="text" width={200} height={24} />
          </TableCell>
          <TableCell>
            <Skeleton variant="text" width={200} height={24} />
          </TableCell>
          <TableCell>
            <Skeleton variant="text" width={120} height={24} />
          </TableCell>
          <TableCell>
            <Skeleton variant="text" width={100} height={24} />
          </TableCell>
          <TableCell>
            <Skeleton variant="text" width={120} height={24} />
          </TableCell>
          <TableCell>
            <Skeleton variant="text" width={300} height={24} />
          </TableCell>
        </TableRow>
      ))}
    </>
  );

  return (
    <Grid container spacing={3}>
      <Grid size={12}>
        <Box sx={{ overflow: 'auto', maxWidth: '100%', maxHeight: '100%' }}>
          <BlankCard>
            <Box p={2}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 2 }}>
                  <CustomTextField
                    select
                    fullWidth
                    label="Event"
                    value={filterEvent}
                    onChange={(e: any) => setFilterEvent(e.target.value as any)}
                  >
                    <MenuItem value="ALL">All</MenuItem>
                    {EVENT_OPTIONS.map((ev) => (
                      <MenuItem key={ev} value={ev}>
                        {ev}
                      </MenuItem>
                    ))}
                  </CustomTextField>
                </Grid>

                <Grid size={{ xs: 12, sm: 2 }}>
                  <CustomTextField
                    select
                    fullWidth
                    label="Actor Role"
                    value={filterActorRole}
                    onChange={(e: any) => setFilterActorRole(e.target.value)}
                  >
                    <MenuItem value="ALL">All</MenuItem>
                    {ACTOR_ROLE_OPTIONS.map((role) => (
                      <MenuItem key={role} value={role}>
                        {role}
                      </MenuItem>
                    ))}
                  </CustomTextField>
                </Grid>

                <Grid size={{ xs: 12, sm: 2 }}>
                  <CustomTextField
                    select
                    fullWidth
                    label="Entity"
                    value={filterEntity}
                    onChange={(e: any) => setFilterEntity(e.target.value)}
                  >
                    <MenuItem value="ALL">All</MenuItem>
                    {ENTITY_OPTIONS.map((ent) => (
                      <MenuItem key={ent} value={ent}>
                        {ent}
                      </MenuItem>
                    ))}
                  </CustomTextField>
                </Grid>

                <Grid size={{ xs: 12, sm: 2 }}>
                  <CustomTextField
                    type="datetime-local"
                    fullWidth
                    label="From"
                    InputLabelProps={{ shrink: true }}
                    value={filterStartDate}
                    onChange={(e: any) => setFilterStartDate(e.target.value)}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 2 }}>
                  <CustomTextField
                    type="datetime-local"
                    fullWidth
                    label="To"
                    InputLabelProps={{ shrink: true }}
                    value={filterEndDate}
                    onChange={(e: any) => setFilterEndDate(e.target.value)}
                  />
                </Grid>

                <Grid size={{ xs: 2 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setFilterEvent('ALL');
                        setFilterActorRole('ALL');
                        setFilterEntity('ALL');
                        setFilterStartDate('');
                        setFilterEndDate('');
                      }}
                    >
                      Reset Filter
                    </Button>
                    <Tooltip title="Refresh Data">
                      <IconButton color="primary" onClick={() => refetch()} disabled={isFetching}>
                        <Box
                          sx={{
                            display: 'flex',
                            animation: isFetching ? 'spin 1s linear infinite' : 'none',
                            '@keyframes spin': {
                              '0%': {
                                transform: 'rotate(0deg)',
                              },
                              '100%': {
                                transform: 'rotate(360deg)',
                              },
                            },
                          }}
                        >
                          <IconRefresh size={20} />
                        </Box>
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Clear Event Logs">
                      <IconButton color="error" onClick={() => setOpenClearDialog(true)}>
                        <IconEraser size={20} />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Grid>
              </Grid>
            </Box>

            <Divider />
            <TableContainer
              component={Paper}
              variant="outlined"
              onScroll={handleScroll}
              sx={{
                maxHeight: '75vh',
                bgcolor: 'background.paper',
              }}
            >
              <Table stickyHeader aria-label="simple table" sx={{ whiteSpace: 'nowrap' }}>
                <TableHead>
                  <TableRow>
                    {columns.map((col) => (
                      <TableCell key={col.label}>
                        <Typography variant="h6">{col.label}</Typography>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {isLoading ? (
                    renderSkeletonRows(SKELETON_ROWS)
                  ) : filteredData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={columns.length} align="center">
                        <Typography variant="body1" sx={{ p: 3 }}>
                          No event logs found.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {filteredData.map((row: any, index: number) => (
                        <TableRow
                          key={index}
                          sx={{
                            backgroundColor: (theme) =>
                              index % 2 === 0 ? theme.palette.action.hover : theme.palette.background.paper,
                          }}
                        >
                          <TableCell>
                            <Chip
                              label={row.event}
                              size="small"
                              color={EVENT_META[row.event as EventType].color as any}
                            />
                          </TableCell>

                          <TableCell>
                            <Typography variant="body2">{formatTime(row.eventTime)}</Typography>
                          </TableCell>

                          <TableCell>
                            <Typography variant="body2">{formatTime(row.serverTime)}</Typography>
                          </TableCell>

                          <TableCell>
                            <Typography variant="body2">{row.actor}</Typography>
                          </TableCell>

                          <TableCell>
                            <Typography variant="body2">{row.actorRole}</Typography>
                          </TableCell>

                          <TableCell>
                            <Typography variant="body2">{row.entity}</Typography>
                          </TableCell>

                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {row.details}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                      {isFetchingNextPage && renderSkeletonRows(3)}
                    </>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <Dialog
              open={openClearDialog}
              onClose={() => setOpenClearDialog(false)}
              maxWidth="xs"
              fullWidth
            >
              <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }} color="error">
                <IconEraser size={20} color="#fa896b" />
                Confirm Action
              </DialogTitle>
              <Divider />
              <DialogContent>
                <Typography>Are you sure to permanently clear Event Logs?</Typography>
              </DialogContent>

              <Stack direction="row" spacing={2} justifyContent="flex-end" p={2}>
                <Button variant="outlined" onClick={() => setOpenClearDialog(false)}>
                  Cancel
                </Button>

                <Button
                  variant="contained"
                  color="error"
                  onClick={() => {
                    dispatch(ClearEventLogs());
                    setOpenClearDialog(false);
                  }}
                >
                  Clear Logs
                </Button>
              </Stack>
            </Dialog>
          </BlankCard>
        </Box>
      </Grid>
    </Grid>
  );
};

export default EventReportList;
