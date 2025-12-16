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
// import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import ExcelJS from 'exceljs';
import html2canvas from 'html2canvas';
import { TrackingCharts } from './TrackingCharts';
import AlarmCharts from './AlarmCharts';

export const captureChartAsImage = async (chartId: string): Promise<string | null> => {
  const el = document.getElementById(chartId);
  if (!el) return null;

  // Wait for SVGs to fully paint
  await new Promise((r) => setTimeout(r, 500));

  const canvas = await html2canvas(el, {
    backgroundColor: '#ffffff',
    scale: 2,
    useCORS: true,
    logging: false,
  });

  return canvas.toDataURL('image/png');
};

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
  const [isExporting, setIsExporting] = useState(false);

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
    ? ['Visitor', 'Building', 'Floor', 'Area', 'Enter Time', 'Exit Time', 'Duration', 'Status', 'Host']
    : ['Visitor', 'Area', 'Triggered', 'Done', 'Status', 'Host', 'Category'];

  // 🧩 Helper: convert and download Excel
  const handleExportExcel = async () => {
    try {
      setIsExporting(true); // start loading

      await new Promise((resolve) => setTimeout(resolve, 600));
      const workbook = new ExcelJS.Workbook();
      const trackingSheet = workbook.addWorksheet('Tracking Logs');
      const alarmSheet = workbook.addWorksheet('Alarm Logs');

      // Capture charts
      const chartIdsTracking = [
        'chart-tracking-1',
        'chart-tracking-2',
        'chart-tracking-3',
        'chart-tracking-6',
      ];
      const chartIdsAlarm = ['chart-alarm-1', 'chart-alarm-2', 'chart-alarm-4', 'chart-alarm-5'];

      const trackingImages = await Promise.all(chartIdsTracking.map(captureChartAsImage));
      const alarmImages = await Promise.all(chartIdsAlarm.map(captureChartAsImage));
      console.log('Captured chart images for Excel export.', trackingImages, alarmImages);
      // Add data table
      trackingSheet.columns = [
        { header: 'Visitor', key: 'VisitorName', width: 20 },
        { header: 'Area', key: 'AreaName', width: 20 },
        { header: 'Enter Time', key: 'EnterTime', width: 25 },
        { header: 'Exit Time', key: 'ExitTime', width: 25 },
        { header: 'Status', key: 'VisitorStatus', width: 15 },
        { header: 'Host', key: 'HostName', width: 20 },
      ];
      trackingLogs.forEach((r) => trackingSheet.addRow(r));

      alarmSheet.columns = [
        { header: 'Visitor', key: 'VisitorName', width: 20 },
        { header: 'Area', key: 'AreaName', width: 20 },
        { header: 'Triggered', key: 'AlarmTriggered', width: 25 },
        { header: 'Done', key: 'AlarmDone', width: 25 },
        { header: 'Status', key: 'VisitorStatus', width: 15 },
        { header: 'Host', key: 'HostName', width: 20 },
        { header: 'Category', key: 'AlarmCategory', width: 20 },
      ];
      alarmLogs.forEach((r) => alarmSheet.addRow(r));
      const trackingLastCol = trackingSheet.columns.length;
      const alarmLastCol = alarmSheet.columns.length;
      // Embed images
      // === TRACKING SHEET CHARTS ===
      let chartRow = 2; // start near the top
      const colOffset = trackingSheet.columns.length + 3;

      trackingImages.forEach((img, i) => {
        if (!img) return;
        const id = workbook.addImage({ base64: img, extension: 'png' });
        trackingSheet.addImage(id, {
          tl: { col: colOffset, row: chartRow },
          ext: { width: 600, height: 300 },
        });
        chartRow += 20; // move down each chart
      });

      // === ALARM SHEET CHARTS ===
      chartRow = 2;
      const alarmColOffset = alarmSheet.columns.length + 3;

      alarmImages.forEach((img, i) => {
        if (!img) return;
        const id = workbook.addImage({ base64: img, extension: 'png' });
        alarmSheet.addImage(id, {
          tl: { col: alarmColOffset, row: chartRow },
          ext: { width: 600, height: 300 },
        });
        chartRow += 20;
      });

      // Save file
      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(
        new Blob([buffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8',
        }),
        `VisitorReport_${new Date().toISOString().split('T')[0]}.xlsx`,
      );
    } catch (error) {
      console.error('Excel export failed:', error);
      alert('Failed to export Excel file. Please try again.');
    } finally {
      setIsExporting(false); // stop loading
    }
  };

  // 🧩 Helper: export CSV (two files zipped together if needed)
  const handleExportCSV = () => {
    if (trackingLogs.length === 0 && alarmLogs.length === 0) {
      alert('No data available to export.');
      return;
    }

    const toCsv = (data: any[]) => {
      if (!data.length) return '';
      const headers = Object.keys(data[0]);
      const rows = data.map((row) =>
        headers.map((h) => `"${(row[h] ?? '').toString().replace(/"/g, '""')}"`).join(','),
      );
      return [headers.join(','), ...rows].join('\n');
    };

    const trackingData = trackingLogs.map((t) => ({
      Visitor: t.VisitorName,
      Area: t.AreaName,
      'Enter Time': formatDateTime(t.EnterTime),
      'Exit Time': formatDateTime(t.ExitTime),
      Status: t.VisitorStatus,
      Host: t.HostName,
    }));

    const alarmData = alarmLogs.map((a) => ({
      Visitor: a.VisitorName,
      Area: a.AreaName,
      'Alarm Triggered': formatDateTime(a.AlarmTriggered),
      'Alarm Done': formatDateTime(a.AlarmDone),
      Status: a.VisitorStatus,
      Host: a.HostName,
      Category: a.AlarmCategory,
    }));

    const trackingCsv = toCsv(trackingData);
    const alarmCsv = toCsv(alarmData);

    const combinedCsv =
      '--- Tracking Logs ---\n' + trackingCsv + '\n\n--- Alarm Logs ---\n' + alarmCsv;

    const blob = new Blob([combinedCsv], {
      type: 'text/csv;charset=utf-8;',
    });
    const fileName = `VisitorReport_${new Date().toISOString().split('T')[0]}.csv`;
    saveAs(blob, fileName);
  };

  const computeExcelAnalytics = (trackingLogs: any[], alarmLogs: any[]) => {
    const countBy = (arr: any[], key: string) => {
      const map: Record<string, number> = {};
      arr.forEach((a) => {
        const val = a[key] ?? 'Unknown';
        map[val] = (map[val] || 0) + 1;
      });
      return Object.entries(map).map(([k, v]) => ({ Key: k, Count: v }));
    };

    // Average visit time (Tracking)
    const avgVisitByArea = (() => {
      const map: Record<string, number[]> = {};
      trackingLogs.forEach((t) => {
        const start = new Date(t.EnterTime);
        const end = new Date(t.ExitTime);
        const minutes = (end.getTime() - start.getTime()) / 60000;
        if (!map[t.AreaName]) map[t.AreaName] = [];
        map[t.AreaName].push(minutes);
      });
      return Object.entries(map).map(([area, arr]) => ({
        Area: area,
        'Avg Visit (mins)': arr.reduce((a, b) => a + b, 0) / arr.length,
      }));
    })();

    // Average Alarm Duration
    const avgAlarmByCategory = (() => {
      const map: Record<string, number[]> = {};
      alarmLogs.forEach((a) => {
        const start = new Date(a.AlarmTriggered);
        const end = new Date(a.AlarmDone);
        const minutes = (end.getTime() - start.getTime()) / 60000;
        if (!map[a.AlarmCategory]) map[a.AlarmCategory] = [];
        map[a.AlarmCategory].push(minutes);
      });
      return Object.entries(map).map(([cat, arr]) => ({
        Category: cat,
        'Avg Duration (mins)': arr.reduce((a, b) => a + b, 0) / arr.length,
      }));
    })();

    // Count Block per Visitor (Tracking only)
    const blockByVisitor = (() => {
      const filtered = trackingLogs.filter((t) => t.VisitorStatus === 'Block');
      return countBy(filtered, 'VisitorName').map((r) => ({
        Visitor: r.Key,
        Blocks: r.Count,
      }));
    })();

    return {
      visitorLogCount: countBy([...trackingLogs, ...alarmLogs], 'VisitorName'),
      areaLogCount: countBy([...trackingLogs, ...alarmLogs], 'AreaName'),
      avgVisitByArea,
      avgAlarmByCategory,
      alarmLogCountByCategory: countBy(alarmLogs, 'AlarmCategory'),
      blockByVisitor,
    };
  };

  const formatDuration = (totalMinutes?: number | null) => {
  if (totalMinutes == null || isNaN(totalMinutes)) return '-';

  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.floor(totalMinutes % 60);
  const days = Math.floor(hours / 24);
  const finalHours = hours % 24;

  if(days > 0) {
    return `${days}d ${finalHours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
  }

  return `${minutes}m`;
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
              <Button
                variant="contained"
                size="small"
                color="primary"
                onClick={handleExportExcel}
                disabled={isExporting}
                startIcon={
                  isExporting ? (
                    <CircularProgress color="inherit" size={16} thickness={5} />
                  ) : undefined
                }
              >
                {isExporting ? 'Exporting...' : 'Export Excel'}
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
        <Box
          id="chart-capture-container"
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '1200px',
            backgroundColor: '#fff',
            zIndex: -9999,
            opacity: 0,
          }}
        >
          <TrackingCharts trackingLogs={trackingLogs} />
          <AlarmCharts alarmLogs={alarmLogs} />
        </Box>
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
                          <TableCell>{row.BuildingName}</TableCell>
                          <TableCell>{row.FloorName}</TableCell>
                          <TableCell>{row.AreaName}</TableCell>
                          <TableCell>{formatDateTime(row.EnterTime)}</TableCell>
                          <TableCell>{formatDateTime(row.ExitTime)}</TableCell>
                          <TableCell>{formatDuration(row.DurationInMinutes)}</TableCell>
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
