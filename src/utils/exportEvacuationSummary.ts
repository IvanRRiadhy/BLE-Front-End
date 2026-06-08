import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import dayjs from 'dayjs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { EvacuationSummaryResponse, PersonDetailSummary } from 'src/hooks/useEvacuate';

const formatDateTime = (dateString?: string | null) => {
  if (!dateString) return '-';
  return dayjs(dateString).format('ddd, D MMM YYYY, HH:mm:ss');
};

const formatDuration = (start: string, end: string | null) => {
  if (!end) return 'In Progress';
  const durationMs = new Date(end).getTime() - new Date(start).getTime();
  const minutes = Math.floor(durationMs / 60000);
  const seconds = Math.floor((durationMs % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
};

export const downloadEvacuationSummaryExcel = async (
  summary: EvacuationSummaryResponse,
  evacuation: any,
  filename = 'EvacuationSummary.xlsx'
) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Evacuation Summary');

  // 1. Add Session Info
  worksheet.addRow(['EVACUATION SUMMARY REPORT']).font = { size: 16, bold: true };
  worksheet.addRow([`Title: ${evacuation?.title || summary.title}`]);
  worksheet.addRow([`Exported At: ${formatDateTime(new Date().toISOString())}`]);
  worksheet.addRow([`Description: ${evacuation?.description || '-'}`]);
  worksheet.addRow([`Trigger Type: ${evacuation?.triggerType || '-'}`]);
  worksheet.addRow([`Started At: ${formatDateTime(evacuation?.startedAt || summary.startedAt)}`]);
  worksheet.addRow([`Completed At: ${formatDateTime(evacuation?.completedAt)}`]);
  worksheet.addRow([`Duration: ${evacuation ? formatDuration(evacuation.startedAt, evacuation.completedAt) : '-'}`]);
  worksheet.addRow([`Completion Notes: ${evacuation?.completionNotes || '-'}`]);
  worksheet.addRow([]); // Gap

  // 2. Add Stats Summary
  worksheet.addRow(['Summary Stats']).font = { bold: true };
  worksheet.addRow(['Required', 'Evacuated', 'Confirmed', 'Remaining', 'Confirmed Notification']);
  worksheet.addRow([
    summary.totalRequired,
    summary.totalEvacuated,
    summary.totalConfirmed,
    summary.totalRemaining,
    summary.totalConfirmedNotification
  ]);
  worksheet.addRow([]); // Gap

  // 3. Add Table Headers
  const tableHeaders = [
    'Person Name',
    'Card Number',
    'Type',
    'Status',
    'Assembly Point',
    'Confirmed At',
    'Confirmed By',
    'Notes'
  ];
  const headerRow = worksheet.addRow(tableHeaders);
  headerRow.font = { bold: true };
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
  });

  // 4. Add Table Data
  summary.personDetails.forEach((person: PersonDetailSummary) => {
    worksheet.addRow([
      person.personName,
      person.cardNumber,
      person.personCategory,
      person.personStatus,
      person.assemblyPointName || '-',
      formatDateTime(person.confirmedEvacuationAt),
      person.confirmedEvacuationBy || '-',
      person.confirmationNotes || '-'
    ]);
  });

  // Auto-fit columns
  worksheet.columns.forEach((column, i) => {
    let maxLength = 0;
    column.eachCell!({ includeEmpty: true }, (cell) => {
      const columnLength = cell.value ? cell.value.toString().length : 10;
      if (columnLength > maxLength) {
        maxLength = columnLength;
      }
    });
    column.width = maxLength < 12 ? 12 : maxLength + 2;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  saveAs(blob, filename);
};

export const downloadEvacuationSummaryPdf = (
  summary: EvacuationSummaryResponse,
  evacuation: any,
  filename = 'EvacuationSummary.pdf'
) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  // 1. Title
  doc.setFontSize(20);
  doc.setTextColor(211, 47, 47); // error.main color approx
  doc.text('EVACUATION SUMMARY REPORT', pageWidth / 2, 40, { align: 'center' });

  // 2. Session Details
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  let y = 70;
  doc.setFont('', 'bold');
  doc.text(`Title:`, 40, y);
  doc.setFont('', 'normal');
  doc.text(`${evacuation?.title || summary.title}`, 140, y);
  y += 20;

  doc.setFont('', 'bold');
  doc.text(`Exported At:`, 40, y);
  doc.setFont('', 'normal');
  doc.text(formatDateTime(new Date().toISOString()), 140, y);
  y += 20;

  doc.setFont('', 'bold');
  doc.text(`Description:`, 40, y);
  doc.setFont('', 'normal');
  const desc = doc.splitTextToSize(evacuation?.description || 'No description provided.', pageWidth - 180);
  doc.text(desc, 140, y);
  y += desc.length * 15;

  doc.setFont('', 'bold');
  doc.text(`Started At:`, 40, y);
  doc.setFont('', 'normal');
  doc.text(formatDateTime(evacuation?.startedAt || summary.startedAt), 140, y);
  y += 20;

  doc.setFont('', 'bold');
  doc.text(`Ended At:`, 40, y);
  doc.setFont('', 'normal');
  doc.text(formatDateTime(evacuation?.completedAt), 140, y);
  y += 20;

  doc.setFont('', 'bold');
  doc.text(`Duration:`, 40, y);
  doc.setFont('', 'normal');
  doc.text(evacuation ? formatDuration(evacuation.startedAt, evacuation.completedAt) : '-', 140, y);
  y += 20;

  doc.setFont('', 'bold');
  doc.text(`Comp. Notes:`, 40, y);
  doc.setFont('', 'normal');
  const notes = doc.splitTextToSize(evacuation?.completionNotes || '-', pageWidth - 180);
  doc.text(notes, 140, y);
  y += notes.length * 15 + 10;

  // 3. Stats Summary
  const statsHeaders = [['Required', 'Evacuated', 'Confirmed', 'Remaining', 'Confirmed Notification']];
  const statsBody = [[
    summary.totalRequired,
    summary.totalEvacuated,
    summary.totalConfirmed,
    summary.totalRemaining,
    summary.totalConfirmedNotification
  ]];

  autoTable(doc, {
    startY: y,
    head: statsHeaders,
    body: statsBody,
    theme: 'grid',
    headStyles: { fillColor: [211, 47, 47], textColor: 255 },
    styles: { halign: 'center' },
    margin: { left: 40, right: 40 }
  });

  y = (doc as any).lastAutoTable.finalY + 30;

  // 4. Person Details Table
  doc.setFontSize(14);
  doc.setFont('', 'bold');
  doc.text('Person Details', 40, y);
  y += 15;

  const tableHeaders = [[
    'Person Name',
    'Card Number',
    'Type',
    'Status',
    'Assembly Point',
    'Confirmed At',
    'Confirmed By',
    'Notes'
  ]];

  const tableBody = summary.personDetails.map((person) => [
    person.personName,
    person.cardNumber,
    person.personCategory,
    person.personStatus,
    person.assemblyPointName || '-',
    formatDateTime(person.confirmedEvacuationAt),
    person.confirmedEvacuationBy || '-',
    person.confirmationNotes || '-'
  ]);

  autoTable(doc, {
    startY: y,
    head: tableHeaders,
    body: tableBody,
    theme: 'striped',
    headStyles: { fillColor: [30, 41, 59], textColor: 255 },
    styles: { fontSize: 8, cellPadding: 3 },
    columnStyles: {
      7: { cellWidth: 100 } // Notes column
    },
    margin: { left: 40, right: 40 }
  });

  doc.save(filename);
};
