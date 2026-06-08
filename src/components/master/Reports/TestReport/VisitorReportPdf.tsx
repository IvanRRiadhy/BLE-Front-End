// VisitorReportPdf.tsx
import React from 'react';
import { Box, Typography, Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material';
import { TrackingCharts } from './TrackingCharts';
import AlarmCharts from './AlarmCharts';

interface Props {
  trackingLogs: any[];
  alarmLogs: any[];
  formatDateTime: (d: string) => string;
  formatDuration: (n?: number | null) => string;
}

const VisitorReportPdf: React.FC<Props> = ({
  trackingLogs,
  alarmLogs,
  formatDateTime,
  formatDuration,
}) => {
  return (
    <Box sx={{ p: 3, width: '100%', bgcolor: '#fff' }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Visitor Report
      </Typography>

      {/* TRACKING SECTION */}
      <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>
        Tracking Logs
      </Typography>

      <TrackingCharts trackingLogs={trackingLogs} />

      <Table size="small">
        <TableHead>
          <TableRow>
            {[
              'Visitor',
              'Building',
              'Floor',
              'Area',
              'Enter Time',
              'Exit Time',
              'Duration',
              'Status',
              'Host',
            ].map((h) => (
              <TableCell key={h} sx={{ fontWeight: 600 }}>
                {h}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {trackingLogs.map((r, i) => (
            <TableRow key={i}>
              <TableCell>{r.VisitorName}</TableCell>
              <TableCell>{r.BuildingName}</TableCell>
              <TableCell>{r.FloorName}</TableCell>
              <TableCell>{r.AreaName}</TableCell>
              <TableCell>{formatDateTime(r.EnterTime)}</TableCell>
              <TableCell>{formatDateTime(r.ExitTime)}</TableCell>
              <TableCell>{formatDuration(r.DurationMinutes)}</TableCell>
              <TableCell>{r.VisitorStatus}</TableCell>
              <TableCell>{r.HostName}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* ALARM SECTION */}
      <Typography variant="h6" sx={{ mt: 5, mb: 1 }}>
        Alarm Logs
      </Typography>

      <AlarmCharts alarmLogs={alarmLogs} />

      <Table size="small">
        <TableHead>
          <TableRow>
            {['Visitor', 'Area', 'Triggered', 'Done', 'Status', 'Host', 'Category'].map((h) => (
              <TableCell key={h} sx={{ fontWeight: 600 }}>
                {h}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {alarmLogs.map((r, i) => (
            <TableRow key={i}>
              <TableCell>{r.VisitorName}</TableCell>
              <TableCell>{r.AreaName}</TableCell>
              <TableCell>{formatDateTime(r.AlarmTriggered)}</TableCell>
              <TableCell>{formatDateTime(r.AlarmDone)}</TableCell>
              <TableCell>{r.VisitorStatus}</TableCell>
              <TableCell>{r.HostName}</TableCell>
              <TableCell>{r.AlarmCategory}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
};

export default VisitorReportPdf;
