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
  CircularProgress,
} from '@mui/material';
import { saveAs } from 'file-saver';
import ExcelJS from 'exceljs';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TrackingCharts } from './TrackingCharts';
import AlarmCharts from './AlarmCharts';

/* =========================
   🔹 UTILITIES
========================= */

const formatDateTime = (dateString?: string) => {
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
  })
    .format(new Date(dateString))
    .replace(/\./g, ':');
};

const formatDuration = (totalMinutes?: number | null) => {
  if (totalMinutes == null || isNaN(totalMinutes)) return '-';

  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.floor(totalMinutes % 60);
  const days = Math.floor(hours / 24);
  const finalHours = hours % 24;
  console.log('duration', totalMinutes);
  if (days > 0) return `${days}d ${finalHours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const sortByDate = (arr: any[], key: string) =>
  [...arr].sort((a, b) => new Date(a[key]).getTime() - new Date(b[key]).getTime());

export const captureChartAsImage = async (chartId: string): Promise<string | null> => {
  const el = document.getElementById(chartId);
  if (!el) return null;

  await new Promise((r) => setTimeout(r, 500));

  const canvas = await html2canvas(el, {
    backgroundColor: '#ffffff',
    scale: 2,
    useCORS: true,
  });

  return canvas.toDataURL('image/png');
};

const captureCharts = (ids: string[]) => Promise.all(ids.map(captureChartAsImage));

/* =========================
   🔹 TABLE CONFIG
========================= */

const TABLE_CONFIG = {
  tracking: {
    headers: [
      'Person',
      'Building',
      'Floor',
      'Area',
      'Enter Time',
      'Exit Time',
      'Duration',
      'Status',
    ],
    renderRow: (r: any) => [
      r.PersonName,
      r.BuildingName,
      r.FloorName,
      r.AreaName,
      formatDateTime(r.EnterTime),
      formatDateTime(r.ExitTime),
      formatDuration(r.DurationMinutes),
      r.VisitorStatus,
    ],
  },
  alarm: {
    headers: [
      'Person',
      'Building',
      'Floor',
      'Area',
      `Area's Labels`,
      'Triggered Time',
      'Acknowledged By',
      'Acknowledged Time',
      'Dispatched By',
      'Dispatched To',
      'Dispatched Time',
      'Investigated By',
      'Investigated Time',
      'Confirmed By',
      'Confirmed Time',
      'Response Duration',
      'Resolution Duration',
      'Status',
      'Category',
    ],
    renderRow: (r: any) => [
      r.PersonName,
      r.BuildingName,
      r.FloorName,
      r.AreaName,
      r.AreaLabel,
      formatDateTime(r.AlarmTriggered),
      r.AcknowledgedBy,
      formatDateTime(r.AcknowledgedAt),
      r.DispatchedBy,
      r.AssignedSecurityName,
      formatDateTime(r.DispatchedAt),
      r.AcceptedBy,
      formatDateTime(r.AcceptedAt),
      r.DoneBy,
      formatDateTime(r.AlarmDone),
      r.responseTimeFormatted,
      r.resolutionTimeFormatted,
      r.VisitorStatus,
      r.AlarmCategory,
    ],
  },
};

/* =========================
   🔹 COMPONENT
========================= */

interface Props {
  open: boolean;
  onClose: () => void;
  trackingLogs: any[];
  alarmLogs: any[];
}

const VisitorReportDialog: React.FC<Props> = ({ open, onClose, trackingLogs, alarmLogs }) => {
  const [activeTab, setActiveTab] = useState<'tracking' | 'alarm'>('tracking');
  const [isExporting, setIsExporting] = useState(false);

  const sortedTracking = useMemo(() => sortByDate(trackingLogs, 'EnterTime'), [trackingLogs]);

  const sortedAlarm = useMemo(() => sortByDate(alarmLogs, 'AlarmTriggered'), [alarmLogs]);

  const isTracking = activeTab === 'tracking';
  const currentData = isTracking ? sortedTracking : sortedAlarm;
  const config = TABLE_CONFIG[activeTab];

  const chartIdsTracking = [
    'chart-tracking-1',
    'chart-tracking-2',
    'chart-tracking-3',
    'chart-tracking-6',
  ];
  const chartIdsAlarm = ['chart-alarm-1', 'chart-alarm-2', 'chart-alarm-4', 'chart-alarm-5'];

  const getFormattedFileName = (base: string, ext: string) => {
    const now = new Date();

    const date = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const time = now
      .toTimeString()
      .split(' ')[0] // HH:MM:SS
      .replace(/:/g, '-'); // ⬅️ replace colon (Windows safe)

    return `${base}_${date}_${time}.${ext}`;
  };

  /* =========================
     🔹 EXPORT EXCEL
  ========================= */

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);

      const workbook = new ExcelJS.Workbook();

      const addSheet = (name: string, columns: any[], rows: any[], images: any[]) => {
        const sheet = workbook.addWorksheet(name);
        sheet.columns = columns;
        rows.forEach((r) => sheet.addRow(r));

        let row = 2;
        const colOffset = columns.length + 3;

        images.forEach((img) => {
          if (!img) return;
          const id = workbook.addImage({ base64: img, extension: 'png' });
          sheet.addImage(id, {
            tl: { col: colOffset, row },
            ext: { width: 600, height: 300 },
          });
          row += 20;
        });
      };

      const trackingImages = await captureCharts(chartIdsTracking);
      const alarmImages = await captureCharts(chartIdsAlarm);

      addSheet(
        'Tracking Logs',
        [
          { header: 'Person', key: 'PersonName' },
          { header: 'Building', key: 'BuildingName' },
          { header: 'Floor', key: 'FloorName' },
          { header: 'Area', key: 'AreaName' },
          { header: 'Enter Time', key: 'EnterTime' },
          { header: 'Exit Time', key: 'ExitTime' },
          { header: 'Duration', key: 'DurationMinutes' },
          { header: 'Status', key: 'VisitorStatus' },
        ],
        trackingLogs,
        trackingImages,
      );

      addSheet(
        'Alarm Logs',
        [
          { header: 'Person', key: 'PersonName' },
          { header: 'Building', key: 'BuildingName' },
          { header: 'Floor', key: 'FloorName' },
          { header: 'Area', key: 'AreaName' },
          { header: `Area's Labels`, key: 'AreaLabel' },
          { header: 'Triggered', key: 'AlarmTriggered' },
          { header: 'Acknowledged By', key: 'AcknowledgedBy' },
          { header: 'Acknowledged At', key: 'AcknowledgedAt' },
          { header: 'Dispatched By', key: 'DispatchedBy' },
          { header: 'Dispatched At', key: 'DispatchedAt' },
          { header: 'Accepted By', key: 'AcceptedBy' },
          { header: 'Accepted At', key: 'AcceptedAt' },
          { header: 'Done By', key: 'DoneBy' },
          { header: 'Done At', key: 'AlarmDone' },
          { header: 'Response Duration', key: 'responseTimeFormatted' },
          { header: 'Resolution Duration', key: 'resolutionTimeFormatted' },
          { header: 'Status', key: 'VisitorStatus' },
          { header: 'Category', key: 'AlarmCategory' },
        ],
        alarmLogs,
        alarmImages,
      );

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), getFormattedFileName('VisitorReport', 'xlsx'));
    } finally {
      setIsExporting(false);
    }
  };

  /* =========================
     🔹 EXPORT PDF
  ========================= */

  const handleExportPDF = async () => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    let y = 10;

    const addTable = (headers: string[], rows: any[][]) => {
      autoTable(pdf, { startY: y, head: [headers], body: rows });
      y = (pdf as any).lastAutoTable.finalY + 10;
    };

    addTable(TABLE_CONFIG.tracking.headers, trackingLogs.map(TABLE_CONFIG.tracking.renderRow));

    for (const id of chartIdsTracking) {
      const img = await captureChartAsImage(id);
      if (!img) continue;
      pdf.addImage(img, 'PNG', 10, y, 180, 70);
      y += 80;
    }

    pdf.addPage();
    y = 10;

    addTable(TABLE_CONFIG.alarm.headers, alarmLogs.map(TABLE_CONFIG.alarm.renderRow));

    for (const id of chartIdsAlarm) {
      const img = await captureChartAsImage(id);
      if (!img) continue;
      pdf.addImage(img, 'PNG', 10, y, 180, 70);
      y += 80;
    }

    pdf.save(getFormattedFileName('VisitorReport', 'pdf'));
  };

  /* =========================
     🔹 CSV
  ========================= */

  const handleExportCSV = () => {
    const toCsv = (data: any[]) => {
      if (!data.length) return '';
      const headers = Object.keys(data[0]);
      return [
        headers.join(','),
        ...data.map((row) => headers.map((h) => `"${row[h] ?? ''}"`).join(',')),
      ].join('\n');
    };

    const blob = new Blob([toCsv(trackingLogs) + '\n\n' + toCsv(alarmLogs)], { type: 'text/csv' });

    saveAs(blob, getFormattedFileName('VisitorReport', 'csv'));
  };

  /* =========================
     🔹 UI
  ========================= */

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xl">
      <Paper sx={{ p: 3 }}>
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="h4">Tracking Report</Typography>
            <Stack direction="row" spacing={1}>
              <Button onClick={handleExportPDF}>PDF</Button>
              <Button onClick={handleExportCSV}>CSV</Button>
              <Button onClick={handleExportExcel} disabled={isExporting}>
                {isExporting ? 'Exporting...' : 'Excel'}
              </Button>
            </Stack>
          </Stack>
        </DialogTitle>

        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
          <Tab label="Tracking Logs" value="tracking" />
          <Tab label="Alarm Logs" value="alarm" />
        </Tabs>

        <DialogContent
          sx={{
            p: 0,
            height: '75vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Box
            sx={{
              flex: 1,
              overflow: 'auto',
              position: 'relative',

              // ⬇️ ini penting banget
              '& table': {
                borderCollapse: 'separate',
              },

              // ⬇️ FIX ghost area kiri
              overflowX: 'auto',
            }}
          >
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  {config.headers.map((head) => (
                    <TableCell
                      sx={{
                        position: 'sticky',
                        top: 0,
                        left: head === 'Person' ? 0 : undefined,
                        zIndex: head === 'Person' ? 3 : 1,

                        backgroundColor: '#fff', // ⬅️ solid
                        backgroundClip: 'padding-box',

                        borderRight: head === 'Person' ? '1px solid #e0e0e0' : undefined,
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
                    <TableCell colSpan={config.headers.length} align="center" sx={{ py: 3 }}>
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
                      {config.renderRow(row).map((cell, idx) => (
                        <TableCell
                          sx={{
                            position: idx === 0 ? 'sticky' : 'static',
                            left: idx === 0 ? 0 : undefined,
                            zIndex: idx === 0 ? 2 : 0,

                            // ⬇️ WAJIB: solid background
                            backgroundColor:
                              idx === 0 ? (i % 2 === 1 ? '#fff' : 'action.hover') : undefined,

                            // ⬇️ ini yang hilangkan "ghost"
                            backgroundClip: 'padding-box',

                            // ⬇️ separator biar clean
                            borderRight: idx === 0 ? '1px solid #e0e0e0' : undefined,
                          }}
                        >
                          {cell ?? '-'}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Box>
        </DialogContent>
      </Paper>

      {/* hidden charts for export */}
      <Box sx={{ position: 'fixed', left: -2000 }}>
        <TrackingCharts trackingLogs={trackingLogs} />
        <AlarmCharts alarmLogs={alarmLogs} />
      </Box>
    </Dialog>
  );
};

export default VisitorReportDialog;
