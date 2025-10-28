import React, { useState, useMemo } from 'react';
import {
  Box,
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
} from '@mui/material';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

interface VisitorReportDialogProps {
  open: boolean;
  onClose: () => void;
  trackingLogs: any[];
  alarmLogs: any[];
}

const VisitorReportDialog: React.FC<VisitorReportDialogProps> = ({
  open,
  onClose,
  trackingLogs,
  alarmLogs,
}) => {
  const [activeTab, setActiveTab] = useState<'tracking' | 'alarm'>('tracking');

  const handleTabChange = (_: any, value: string) => setActiveTab(value as 'tracking' | 'alarm');

  // Helper: format time in consistent human-readable style
  const formatDateTime = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-GB', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
      .format(date)
      .replace(/\./g, ':');
  };

  // Sort data safely
  const sortedTracking = useMemo(
    () =>
      [...trackingLogs].sort(
        (a, b) => new Date(a.EnterTime).getTime() - new Date(b.EnterTime).getTime(),
      ),
    [trackingLogs],
  );

  const sortedAlarm = useMemo(
    () =>
      [...alarmLogs].sort(
        (a, b) => new Date(a.AlarmTriggered).getTime() - new Date(b.AlarmTriggered).getTime(),
      ),
    [alarmLogs],
  );

  const isTracking = activeTab === 'tracking';
  const currentData = isTracking ? sortedTracking : sortedAlarm;

  const headers = isTracking
    ? ['Visitor', 'Area', 'Enter Time', 'Exit Time', 'Status', 'Host']
    : ['Visitor', 'Area', 'Triggered', 'Done', 'Status', 'Host', 'Category'];

  // 🧩 Helper: convert and download Excel
  const handleExportExcel = () => {
    if (trackingLogs.length === 0 && alarmLogs.length === 0) {
      alert('No data available to export.');
      return;
    }

    // Prepare worksheet data
    const trackingSheet = trackingLogs.map((t) => ({
      Visitor: t.VisitorName,
      Area: t.AreaName,
      'Enter Time': formatDateTime(t.EnterTime),
      'Exit Time': formatDateTime(t.ExitTime),
      Status: t.VisitorStatus,
      Host: t.HostName,
    }));

    const alarmSheet = alarmLogs.map((a) => ({
      Visitor: a.VisitorName,
      Area: a.AreaName,
      'Alarm Triggered': formatDateTime(a.AlarmTriggered),
      'Alarm Done': formatDateTime(a.AlarmDone),
      Status: a.VisitorStatus,
      Host: a.HostName,
      Category: a.AlarmCategory,
    }));

    // Create workbook with both sheets
    const workbook = XLSX.utils.book_new();
    const trackingWs = XLSX.utils.json_to_sheet(trackingSheet);
    const alarmWs = XLSX.utils.json_to_sheet(alarmSheet);

    XLSX.utils.book_append_sheet(workbook, trackingWs, 'Tracking Logs');
    XLSX.utils.book_append_sheet(workbook, alarmWs, 'Alarm Logs');

    // Write and download
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8',
    });

    const fileName = `VisitorReport_${new Date().toISOString().split('T')[0]}.xlsx`;
    saveAs(blob, fileName);
  };

  // 🧩 Helper: export CSV (two files zipped together if needed)
  const handleExportCSV = () => {
    if (trackingLogs.length === 0 && alarmLogs.length === 0) {
      alert('No data available to export.');
      return;
    }

    const trackingCsv = XLSX.utils.sheet_to_csv(
      XLSX.utils.json_to_sheet(
        trackingLogs.map((t) => ({
          Visitor: t.VisitorName,
          Area: t.AreaName,
          'Enter Time': formatDateTime(t.EnterTime),
          'Exit Time': formatDateTime(t.ExitTime),
          Status: t.VisitorStatus,
          Host: t.HostName,
        })),
      ),
    );

    const alarmCsv = XLSX.utils.sheet_to_csv(
      XLSX.utils.json_to_sheet(
        alarmLogs.map((a) => ({
          Visitor: a.VisitorName,
          Area: a.AreaName,
          'Alarm Triggered': formatDateTime(a.AlarmTriggered),
          'Alarm Done': formatDateTime(a.AlarmDone),
          Status: a.VisitorStatus,
          Host: a.HostName,
          Category: a.AlarmCategory,
        })),
      ),
    );

    const combinedCsv =
      '--- Tracking Logs ---\n' + trackingCsv + '\n\n--- Alarm Logs ---\n' + alarmCsv;

    const blob = new Blob([combinedCsv], { type: 'text/csv;charset=utf-8;' });
    const fileName = `VisitorReport_${new Date().toISOString().split('T')[0]}.csv`;
    saveAs(blob, fileName);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xl">
      <Paper
        sx={{
          p: 3,
          borderRadius: 0,
          overflow: 'hidden',
          boxShadow: 6,
        }}
      >
        {/* Title + Action Buttons */}
        <DialogTitle sx={{ p: 2, pb: 0 }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            flexWrap="wrap"
            gap={1}
          >
            <Typography variant="h4" fontWeight={700}>
              Visitor Report
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" size="small">
                Print
              </Button>
              <Button variant="outlined" size="small">
                PDF
              </Button>
              <Button variant="outlined" size="small" onClick={handleExportCSV}>
                Export CSV
              </Button>
              <Button variant="contained" size="small" color="primary" onClick={handleExportExcel}>
                Export Excel
              </Button>
            </Stack>
          </Stack>
        </DialogTitle>

        {/* Tabs */}
        <Box
          sx={{
            px: 2,
            bgcolor: 'background.paper',
            borderBottom: 1,
            borderColor: 'divider',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            centered
            textColor="primary"
            indicatorColor="primary"
            sx={{
              '& .MuiTab-root': { textTransform: 'none', fontWeight: 600 },
            }}
          >
            <Tab label="Tracking Logs" value="tracking" />
            <Tab label="Alarm Logs" value="alarm" />
          </Tabs>
        </Box>

        <Divider />

        <DialogContent
          sx={{
            p: 0,
            height: '75vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Scroll container around table only */}
          <Box
            sx={{
              flex: 1,
              overflowY: 'auto',
              bgcolor: 'background.default',
              px: 2,
              pb: 2,
            }}
          >
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  {headers.map((head) => (
                    <TableCell
                      key={head}
                      sx={{
                        backgroundColor: 'background.paper',
                        fontWeight: 600,
                        fontSize: 14,
                        color: 'text.primary',
                        position: 'sticky',
                        top: 0,
                        zIndex: 1,
                        borderBottom: '2px solid',
                        borderColor: 'divider',
                      }}
                    >
                      {head}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>

              <TableBody>
                {currentData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={headers.length} align="center" sx={{ py: 3 }}>
                      <Typography color="text.secondary">No data available.</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  currentData.map((row, i) => (
                    <TableRow
                      key={i}
                      sx={{
                        '&:nth-of-type(odd)': { backgroundColor: 'action.hover' },
                        '&:hover': {
                          backgroundColor: 'action.selected',
                          cursor: 'pointer',
                        },
                      }}
                    >
                      {isTracking ? (
                        <>
                          <TableCell>{row.VisitorName}</TableCell>
                          <TableCell>{row.AreaName}</TableCell>
                          <TableCell>{formatDateTime(row.EnterTime)}</TableCell>
                          <TableCell>{formatDateTime(row.ExitTime)}</TableCell>
                          <TableCell>{row.VisitorStatus}</TableCell>
                          <TableCell>{row.HostName}</TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell>{row.VisitorName}</TableCell>
                          <TableCell>{row.AreaName}</TableCell>
                          <TableCell>{formatDateTime(row.AlarmTriggered)}</TableCell>
                          <TableCell>{formatDateTime(row.AlarmDone)}</TableCell>
                          <TableCell>{row.VisitorStatus}</TableCell>
                          <TableCell>{row.HostName}</TableCell>
                          <TableCell>{row.AlarmCategory}</TableCell>
                        </>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Box>
        </DialogContent>
      </Paper>
    </Dialog>
  );
};

export default VisitorReportDialog;
