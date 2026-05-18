import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export const MOVEMENT_LOG_COLUMNS = [
  { header: 'Person Name', key: 'personName', width: 25 },
  { header: 'Person ID', key: 'personId', width: 20 },
  { header: 'Person Type', key: 'personType', width: 15 },
  { header: 'Card Number', key: 'cardNumber', width: 20 },
  { header: 'Beacon ID', key: 'beaconId', width: 20 },
  { header: 'Nearest Reader', key: 'readerName', width: 25 },
  { header: 'Area', key: 'area', width: 20 },
  { header: 'Floor', key: 'floor', width: 15 },
  { header: 'Building', key: 'building', width: 15 },
  { header: 'Last Detected Time', key: 'formattedTime', width: 25 },
];

export const downloadMovementLogExcel = async (data: any[], filename = 'MovementLogReport.xlsx') => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Movement Log');

  worksheet.columns = MOVEMENT_LOG_COLUMNS.map(c => ({ ...c }));
  worksheet.getRow(1).font = { bold: true };

  data.forEach((row) => {
    worksheet.addRow({
      personName: row.personName,
      personId: row.personId,
      personType: row.personType,
      cardNumber: row.cardNumber,
      beaconId: row.beaconId,
      readerName: row.readerName,
      area: row.area,
      floor: row.floor,
      building: row.building,
      formattedTime: row.formattedTime,
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  saveAs(blob, filename);
};
