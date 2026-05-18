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
  CircularProgress,
  TableContainer,
  TableSortLabel,
  Chip,
  TextField,
  MenuItem,
  Tooltip,
  IconButton,
} from '@mui/material';
import BlankCard from 'src/components/shared/BlankCard';
import { EVENT_TYPE, EventType } from 'src/types/crud/input';
import { useTranslation } from 'react-i18next';
import { RootState, useDispatch, useSelector } from 'src/store/Store';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { ClearEventLogs, fetchEventLogs } from 'src/store/apps/tracking/Event';
import { IconEraser } from '@tabler/icons-react';

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

const ACTORS = [
  { name: 'Ace Cenanda', role: 'Admin' },
  { name: 'Security System', role: 'System' },
  { name: 'BLE Tracker', role: 'System' },
  { name: 'Scheduler', role: 'System' },
];
const DETAILS_MAP: Record<EventType, string[]> = {
  CREATE: ['Created visitor data', 'Created access rule'],
  UPDATE: ['Updated visitor access area', 'Updated card status'],
  DELETE: ['Deleted expired visitor record', 'Removed access rule'],
  REPORT: ['Daily activity report generated', 'Weekly alarm report generated'],
  ALARM: ['Restricted area breach detected', 'Unauthorized access detected'],
  User: ['Created user account', 'Deleted user account'],
  ACTION: ['Assigned security action to guard', 'Assigned follow-up task'],
  LOGIN: ['User logged in', 'User logged out'],
  OTHER: ['Performed system maintenance', 'Updated application settings'],
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

const ENTITY_OPTIONS = ['Organization', 'Department', 'District', 'Building'];

const EventLogList = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  useEffect(() => {
    // dispatch(fetchAlarmSettingsDT(defaultAlarmSettingFilter));
    dispatch(fetchEventLogs());
  }, []);

  const isDummy = true;

  const isValidEventType = (value: any): value is EventType =>
    Object.values(EVENT_TYPE).includes(value);
  const [filterEvent, setFilterEvent] = useState<EventType | 'ALL'>('ALL');
  const [filterActorRole, setFilterActorRole] = useState<string | 'ALL'>('ALL');
  const [filterEntity, setFilterEntity] = useState<string | 'ALL'>('ALL');
  const [filterStartDate, setFilterStartDate] = useState<string>(''); // ISO string
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [openClearDialog, setOpenClearDialog] = useState(false);

  const eventLogData = useSelector((state: RootState) =>
    state.EventLogReducer.logs.map((log: any) => {
      const safeEvent: EventType = isValidEventType(log.event) ? log.event : 'OTHER'; // fallback
      // console.log(log.event);
      return {
        event: safeEvent,
        eventTime: log.eventTime,
        serverTime: log.serverTime,
        actor: log.actor?.name ?? '-',
        actorRole: log.actor?.role ?? '-',
        entity: log.entity ?? '-',
        details: log.details ?? '-',
      };
    }),
  );
  // console.log('eventLogData', eventLogData);
  // useEffect(() => {
  //   if (!isDummy) return;

  //   const interval = setInterval(() => {
  //     setEventLogData((prev) => [
  //       generateRandomEventLog(),
  //       ...prev.slice(0, 49), // max 50 rows
  //     ]);
  //   }, 5000);

  //   return () => clearInterval(interval);
  // }, [isDummy]);

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

  // const getRandomItem = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

  // const generateRandomEventLog = (): EventLogType => {
  //   const event = getRandomItem(Object.values(EVENT_TYPE));
  //   const actor = getRandomItem(ACTORS);

  //   const nowUtc = new Date(); // UTC source
  //   const serverLocal = new Date(); // Client local time

  //   return {
  //     event,
  //     eventTime: nowUtc.toISOString(),

  //     serverTime: toLocalISOString(serverLocal),

  //     actor: actor.name,
  //     actorRole: actor.role,
  //     entity: getRandomItem(DETAILS_MAP[event]),
  //     details: getRandomItem(DETAILS_MAP[event]),
  //   };
  // };

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
              sx={{
                maxHeight: '75vh',
                bgcolor: 'background.paper',
              }}
            >
              <Table stickyHeader aria-label="simple table" sx={{ whiteSpace: 'nowrap' }}>
                <TableHead>
                  <TableRow>
                    <TableCell
                      sx={{
                        position: 'sticky',
                        left: 0,
                        backgroundColor: (theme) => theme.palette.background.paper,
                        zIndex: 2,
                        width: 35, // Fixed width
                        minWidth: 35,
                        maxWidth: 35,
                        borderRight: (theme) => `1px solid ${theme.palette.divider}`,
                        backgroundClip: 'padding-box',
                      }}
                    >
                      <Typography variant="h6"></Typography>
                    </TableCell>
                    {/* Main Table Header */}
                    {columns.map((col) => (
                      <TableCell key={col.label}>
                        <Typography variant="h6">{col.label}</Typography>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredData.map((row: any, index: number) => (
                    <TableRow
                      key={index}
                      hover
                      sx={{
                        '&:nth-of-type(odd)': { backgroundColor: 'action.hover' },
                        '&:hover': {
                          backgroundColor: 'action.selected',
                          // cursor: 'pointer',
                        },
                      }}
                    >
                      {/* Left sticky spacer */}
                      <TableCell
                        sx={{
                          position: 'sticky',
                          left: 0,
                          backgroundColor: (theme) =>
                            index % 2 === 0 ? theme.palette.action.hover : theme.palette.background.paper,
                          zIndex: 1,
                          width: 35,
                          borderRight: (theme) => `1px solid ${theme.palette.divider}`,
                          backgroundClip: 'padding-box',
                        }}
                      />

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

                      {/* Right sticky Actions */}
                      {/* <TableCell
                        sx={{
                          position: 'sticky',
                          right: 0,
                          background: index % 2 === 0 ? 'grey.50' : 'white',
                          zIndex: 1,
                          minWidth: 150,
                        }}
                      >
                        <Stack direction="row" spacing={1}>
                          <Button size="small" variant="outlined">
                            View
                          </Button>
                        </Stack>
                      </TableCell> */}
                    </TableRow>
                  ))}
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

export default EventLogList;
