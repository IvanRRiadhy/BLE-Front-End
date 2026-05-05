import React, { useMemo, useState } from 'react';
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  Typography,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Stack,
  Paper,
} from '@mui/material';
import { saveAs } from 'file-saver';
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

const sortByDate = (arr: any[], key: string) =>
  [...arr].sort((a, b) => new Date(a[key]).getTime() - new Date(b[key]).getTime());

/* =========================
   🔹 TABLE CONFIG
========================= */

const TABLE_HEADERS = [
  'Reader Name',
  'MAC Address',
  'Area',
  'Floor',
  'Building',
  'Person Name',
  'IdentityId',
  'PersonType',
  'Coordinates',
  'First Detected Time',
];

const renderRow = (r: any) => [
  r.readerName ?? '-',
  r.macAddress ?? '-',
  r.areaName ?? '-',
  r.floorName ?? '-',
  r.buildingName ?? '-',
  r.personName ?? '-',
  r.identityId ?? '-',
  r.personType ?? '-',
  r.coordinateX != null && r.coordinateY != null
    ? `(${r.coordinateX.toFixed(2)}, ${r.coordinateY.toFixed(2)})`
    : '-',
  formatDateTime(r.timestamp),
];

/* =========================
   🔹 COMPONENT
========================= */

interface Props {
  open: boolean;
  onClose: () => void;
  reportData: any;
}

const ReaderReportDialog: React.FC<Props> = ({ open, onClose, reportData }) => {
  const [isExporting, setIsExporting] = useState(false);

  const safeData = Array.isArray(reportData) 
    ? reportData 
    : (reportData?.collection?.data || reportData?.data || []);

  const sortedData = useMemo(() => sortByDate(safeData, 'timestamp'), [safeData]);

  const getFormattedFileName = (base: string, ext: string) => {
    const now = new Date();

    const date = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const time = now
      .toTimeString()
      .split(' ')[0] // HH:MM:SS
      .replace(/:/g, '-'); // Windows safe

    return `${base}_${date}_${time}.${ext}`;
  };

  /* =========================
     🔹 EXPORT EXCEL
  ========================= */

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Reader Report Logs');

      sheet.columns = [
        { header: 'Reader Name', key: 'readerName', width: 20 },
        { header: 'MAC Address', key: 'macAddress', width: 20 },
        { header: 'Area', key: 'areaName', width: 20 },
        { header: 'Floor', key: 'floorName', width: 20 },
        { header: 'Building', key: 'buildingName', width: 20 },
        { header: 'Person Name', key: 'personName', width: 30 },
        { header: 'IdentityId', key: 'identityId', width: 20 },
        { header: 'PersonType', key: 'personType', width: 15 },
        { header: 'Coordinates', key: 'coordinates', width: 20 },
        { header: 'First Detected Time', key: 'timestamp', width: 25 },
      ];

      const rows = sortedData.map((r) => ({
        ...r,
        coordinates:
          r.coordinateX != null && r.coordinateY != null
            ? `(${r.coordinateX.toFixed(2)}, ${r.coordinateY.toFixed(2)})`
            : '-',
        timestamp: formatDateTime(r.timestamp),
      }));

      rows.forEach((r) => sheet.addRow(r));

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), getFormattedFileName('ReaderReport', 'xlsx'));
    } finally {
      setIsExporting(false);
    }
  };

  /* =========================
     🔹 EXPORT PDF
  ========================= */

  const handleExportPDF = async () => {
    const pdf = new jsPDF('l', 'mm', 'a4'); // 'l' for landscape since we have many columns
    let y = 10;

    autoTable(pdf, {
      startY: y,
      head: [TABLE_HEADERS],
      body: sortedData.map(renderRow),
      styles: { fontSize: 8 },
    });

    pdf.save(getFormattedFileName('ReaderReport', 'pdf'));
  };

  /* =========================
     🔹 CSV
  ========================= */

  const handleExportCSV = () => {
    const toCsv = (data: any[]) => {
      if (!data.length) return '';
      // We will map exactly the columns in the same order
      const headerRow = TABLE_HEADERS.join(',');
      const bodyRows = data.map((row) => renderRow(row).map((h) => `"${h}"`).join(','));
      return [headerRow, ...bodyRows].join('\n');
    };

    const blob = new Blob([toCsv(sortedData)], { type: 'text/csv' });
    saveAs(blob, getFormattedFileName('ReaderReport', 'csv'));
  };

  /* =========================
     🔹 UI
  ========================= */

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xl">
      <Paper sx={{ p: 3 }}>
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="h4">Reader Report Logs</Typography>
            <Stack direction="row" spacing={1}>
              <Button onClick={handleExportPDF}>PDF</Button>
              <Button onClick={handleExportCSV}>CSV</Button>
              <Button onClick={handleExportExcel} disabled={isExporting}>
                {isExporting ? 'Exporting...' : 'Excel'}
              </Button>
            </Stack>
          </Stack>
        </DialogTitle>

        <DialogContent
          sx={{
            p: 0,
            height: '75vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            mt: 2,
          }}
        >
          <Box
            sx={{
              flex: 1,
              overflow: 'auto',
              position: 'relative',
              '& table': {
                borderCollapse: 'separate',
              },
              overflowX: 'auto',
            }}
          >
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  {TABLE_HEADERS.map((head, index) => (
                    <TableCell
                      key={index}
                      sx={{
                        position: 'sticky',
                        top: 0,
                        left: head === 'Reader Name' ? 0 : undefined,
                        zIndex: head === 'Reader Name' ? 3 : 1,
                        backgroundColor: 'background.paper',
                        backgroundClip: 'padding-box',
                        borderRight: head === 'Reader Name' ? (theme) => `1px solid ${theme.palette.divider}` : undefined,
                      }}
                    >
                      {head}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>

              <TableBody>
                {sortedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={TABLE_HEADERS.length} align="center" sx={{ py: 3 }}>
                      <Typography color="text.secondary">No data available.</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedData.map((row, i) => (
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
                      {renderRow(row).map((cell, idx) => (
                        <TableCell
                          key={idx}
                          sx={{
                            position: idx === 0 ? 'sticky' : 'static',
                            left: idx === 0 ? 0 : undefined,
                            zIndex: idx === 0 ? 2 : 0,
                            backgroundColor:
                              idx === 0 ? (i % 2 === 1 ? 'background.paper' : 'action.hover') : undefined,
                            backgroundClip: 'padding-box',
                            borderRight: idx === 0 ? (theme) => `1px solid ${theme.palette.divider}` : undefined,
                          }}
                        >
                          {cell}
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
    </Dialog>
  );
};

export default ReaderReportDialog;
