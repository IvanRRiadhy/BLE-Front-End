import React, { useState } from 'react';
import {
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
} from '@mui/material';
import { FileDownload, PictureAsPdf, TableChart } from '@mui/icons-material';
import { downloadReaderHealthExcel, downloadReaderHealthPdf } from 'src/utils/exportReaderHealthReport';
import toast from 'react-hot-toast';

const ReaderHealthReportExport = ({ data }: { data: any[] }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleExport = async (type: 'pdf' | 'excel') => {
    handleClose();
    setIsExporting(true);
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    
    try {
      if (type === 'excel') {
        await Promise.all([downloadReaderHealthExcel(data), delay(1000)]);
      } else {
        await Promise.all([downloadReaderHealthPdf(data), delay(1000)]);
      }
      toast.success(`Report exported as ${type.toUpperCase()}`);
    } catch (error) {
      console.error('Export Error:', error);
      toast.error('Failed to export report');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <Button
        variant="contained"
        color="error"
        startIcon={isExporting ? <CircularProgress size={18} color="inherit" /> : <FileDownload />}
        onClick={handleClick}
        disabled={isExporting || data.length === 0}
      >
        Export
      </Button>
      <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
        <MenuItem onClick={() => handleExport('pdf')}>
          <ListItemIcon>
            <PictureAsPdf fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>as PDF</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleExport('excel')}>
          <ListItemIcon>
            <TableChart fontSize="small" color="success" />
          </ListItemIcon>
          <ListItemText>as Excel</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};

export default ReaderHealthReportExport;
