import React, { useState } from 'react';
import {
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
} from '@mui/material';
import { PictureAsPdf, TableChart, Upload } from '@mui/icons-material';
import { useMutation } from '@tanstack/react-query';
import { saveAs } from 'file-saver';
import toast from 'react-hot-toast';
import api from 'src/utils/axios'; // adjust path if needed

const BleReaderExport = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const open = Boolean(anchorEl);

  const exportMutation = useMutation({
    mutationFn: async (type: 'pdf' | 'excel') => {
      // Example endpoint: /ble-reader/export/pdf or /ble-reader/export/excel
      const response = await api.get(`/ble-reader/export/${type}`, {
        responseType: 'blob', // we expect a file
      });
      return { blob: response.data, type };
    },
    onSuccess: (data) => {
      const fileType =
        data.type === 'pdf'
          ? 'application/pdf'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      const extension = data.type === 'pdf' ? 'pdf' : 'xlsx';
      const blob = new Blob([data.blob], { type: fileType });
      saveAs(blob, `ble_reader_export.${extension}`);
      toast.success(`Exported BLE Reader data as ${data.type.toUpperCase()}`);
    },
    onError: (error) => {
      console.error(error);
      toast.error('Failed to export BLE Reader data');
    },
    onSettled: () => setIsExporting(false),
  });

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => setAnchorEl(null);

  const handleExport = (type: 'pdf' | 'excel') => {
    setIsExporting(true);
    exportMutation.mutate(type);
    handleClose();
  };

  return (
    <>
      <Button
        variant="contained"
        color="error"
        startIcon={isExporting ? <CircularProgress size={18} color="inherit" /> : <Upload />}
        onClick={handleClick}
        sx={{ mr: 1 }}
        disabled={isExporting}
      >
        Export
      </Button>

      <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
        <MenuItem onClick={() => handleExport('pdf')} disabled={isExporting}>
          <ListItemIcon>
            <PictureAsPdf fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>as PDF</ListItemText>
        </MenuItem>

        <MenuItem onClick={() => handleExport('excel')} disabled={isExporting}>
          <ListItemIcon>
            <TableChart fontSize="small" color="success" />
          </ListItemIcon>
          <ListItemText>as XLS/CSV</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};

export default BleReaderExport;
