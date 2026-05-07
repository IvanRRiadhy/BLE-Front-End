import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import dayjs from 'dayjs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const READER_HEALTH_COLUMNS = [
  { header: 'MAC Address', key: 'gmac', width: 20 },
  { header: 'Status', key: 'msg', width: 15 },
  { header: 'WAN IP', key: 'wanIP', width: 20 },
  { header: 'Firmware', key: 'ver', width: 15 },
  { header: 'BLE Ver', key: 'blever', width: 15 },
  { header: 'Uptime', key: 'uptime', width: 25 },
  { header: 'Low Volt', key: 'lowVoltage', width: 12 },
  { header: 'Temp (°C)', key: 'temp', width: 12 },
  { header: 'CPU Load (%)', key: 'load', width: 12 },
  { header: 'Mem Free (%)', key: 'mem_free', width: 12 },
];

const formatUptime = (seconds: number) => {
  if (!seconds) return '0s';
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (s > 0 || parts.length === 0) parts.push(`${s}s`);

  return parts.join(' ');
};

export const downloadReaderHealthExcel = async (data: any[], filename = 'ReaderHealthReport.xlsx') => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Reader Health');

  worksheet.columns = READER_HEALTH_COLUMNS.map(c => ({ ...c }));
  worksheet.getRow(1).font = { bold: true };

  data.forEach((row) => {
    worksheet.addRow({
      gmac: row.gmac,
      msg: row.msg,
      wanIP: row.wanIP,
      ver: row.ver,
      blever: row.blever,
      uptime: formatUptime(row.uptime),
      lowVoltage: row.lowVoltage,
      temp: row.temp,
      load: Math.round(row.load * 100),
      mem_free: row.mem_free,
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  saveAs(blob, filename);
};

export const downloadReaderHealthPdf = (data: any[], filename = 'ReaderHealthReport.pdf') => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

  // Add Title
  doc.setFontSize(18);
  doc.text('Reader Health Report', doc.internal.pageSize.getWidth() / 2, 40, { align: 'center' });

  // Add Generated Date
  doc.setFontSize(10);
  const dateStr = `Generated: ${dayjs().format('YYYY-MM-DD HH:mm:ss')}`;
  doc.text(dateStr, doc.internal.pageSize.getWidth() / 2, 60, { align: 'center' });

  const head = [READER_HEALTH_COLUMNS.map((c) => c.header)];
  const body = data.map((row) => [
    row.gmac,
    row.msg,
    row.wanIP,
    row.ver,
    row.blever,
    formatUptime(row.uptime),
    row.lowVoltage,
    `${row.temp}°C`,
    `${Math.round(row.load * 100)}%`,
    `${row.mem_free}%`,
  ]);

  autoTable(doc, {
    head,
    body,
    startY: 80,
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255 },
  });

  doc.save(filename);
};
