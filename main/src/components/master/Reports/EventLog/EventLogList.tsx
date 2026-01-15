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
} from '@mui/material';
import BlankCard from 'src/components/shared/BlankCard';
import { EVENT_TYPE, EventType } from 'src/types/crud/input';
import { useTranslation } from 'react-i18next';

const columns = [
  { label: 'Event', field: 'Building.Name', sortAble: true },
  { label: 'Event Time', field: 'Name', sortAble: true },

  { label: 'Server Time', field: 'Name', sortAble: true },
  { label: 'Actor', field: 'Building.Name', sortAble: true },
  { label: 'Actor Role', field: 'Name', sortAble: true },
  { label: 'Details', field: 'Building.Name', sortAble: false },
];

const EVENT_META: Record<EventType, { color: string }> = {
  CREATE: { color: 'success' },
  UPDATE: { color: 'secondary' },
  DELETE: { color: 'gray' },
  REPORT: { color: 'warning' },
  ALARM: { color: 'error' },
  ASSIGN_ACTION: { color: 'primary' },
} as const;

type EventLogType = {
  event: EventType;
  eventTime: string;
  serverTime: string;
  actor: string;
  actorRole: string;
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
  ASSIGN_ACTION: ['Assigned security action to guard', 'Assigned follow-up task'],
};

const EventLogList = () => {
  const { t } = useTranslation();

  const isDummy = true;

  const [eventLogData, setEventLogData] = useState<EventLogType[]>([]);

  useEffect(() => {
    if (!isDummy) return;

    const interval = setInterval(() => {
      setEventLogData((prev) => [
        generateRandomEventLog(),
        ...prev.slice(0, 49), // max 50 rows
      ]);
    }, 5000);

    return () => clearInterval(interval);
  }, [isDummy]);

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

  const getRandomItem = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

  const generateRandomEventLog = (): EventLogType => {
    const event = getRandomItem(Object.values(EVENT_TYPE));
    const actor = getRandomItem(ACTORS);

    const nowUtc = new Date(); // UTC source
    const serverLocal = new Date(); // Client local time

    return {
      event,
      eventTime: nowUtc.toISOString(),

      serverTime: toLocalISOString(serverLocal),

      actor: actor.name,
      actorRole: actor.role,
      details: getRandomItem(DETAILS_MAP[event]),
    };
  };

  return (
    <Grid container spacing={3}>
      <Grid size={12}>
        <Box sx={{ overflow: 'auto', maxWidth: '100%', maxHeight: '100%' }}>
          <BlankCard>
            <TableContainer>
              <Table aria-label="simple table" sx={{ whiteSpace: 'nowrap' }}>
                <TableHead>
                  <TableRow>
                    <TableCell
                      sx={{
                        position: 'sticky',
                        left: 0,
                        background: 'white',
                        zIndex: 2,
                        width: 35, // Fixed width
                        minWidth: 35,
                        maxWidth: 35,
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
                    {/* Right Sticky Empty Column */}
                    {/* <TableCell
                      sx={{
                        position: 'sticky',
                        right: 0,
                        background: 'white',
                        zIndex: 2,
                        width: 150, // Fixed width
                        minWidth: 150,
                        maxWidth: 150,
                      }}
                    >
                      <Typography variant="h6"> Actions </Typography>
                    </TableCell> */}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {eventLogData.map((row, index) => (
                    <TableRow
                      key={index}
                      sx={{
                        backgroundColor: index % 2 === 0 ? 'grey.50' : 'white',
                      }}
                    >
                      {/* Left sticky spacer */}
                      <TableCell
                        sx={{
                          position: 'sticky',
                          left: 0,
                          background: index % 2 === 0 ? 'grey.50' : 'white',
                          zIndex: 1,
                          width: 35,
                        }}
                      />

                      <TableCell>
                        <Chip
                          label={row.event}
                          size="small"
                          color={EVENT_META[row.event].color as any}
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
          </BlankCard>
        </Box>
      </Grid>
    </Grid>
  );
};

export default EventLogList;
