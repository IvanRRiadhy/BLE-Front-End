import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { Box } from '@mui/system';
import React, { useState } from 'react';
import * as XSLX from 'xlsx';

const ExcelViewer = () => {
  const [data, setData] = useState<any[]>([]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const arrayBuffer = e.target?.result;
      const workbook = XSLX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData: string[][] = XSLX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

      const maxColumns = Math.max(...jsonData.map((row) => row.length));
      const formattedData = jsonData.map((row) => {
        while (row.length < maxColumns) row.push('');
        return row;
      });
      setData(formattedData);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDownload = () => {
    const worksheet = XSLX.utils.aoa_to_sheet(data);
    const workbook = XSLX.utils.book_new();
    XSLX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

    XSLX.writeFile(workbook, 'download.xslx');
  };
  return (
    <Box sx={{ p: 3, textAlign: 'center' }}>
      <Typography variant="h4" mb={2}>
        Excel/CSV View
      </Typography>
      <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} />

      {data.length > 0 && (
        <>
          <Button variant="contained" color="primary" onClick={handleDownload} sx={{ mt: 2 }}>
            Download
          </Button>
          <Box sx={{ overflowX: 'auto', mt: 3 }}>
            <Table>
              <TableHead>
                <TableRow>
                  {data[0].map((header: string, index: number) => (
                    <TableCell key={index} sx={{ fontWeight: 'bold' }}>
                      {header}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {data.slice(1).map((row, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {row.map((cell: string, cellIndex: number) => (
                      <TableCell key={cellIndex}>{cell}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </>
      )}
    </Box>
  );
};

export default ExcelViewer;
