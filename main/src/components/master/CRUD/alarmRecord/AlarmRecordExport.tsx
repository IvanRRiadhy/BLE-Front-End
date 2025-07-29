import React, { useState } from 'react';
import { Button, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import { PictureAsPdf, TableChart, Download, Upload } from '@mui/icons-material';
import { AppDispatch, useDispatch } from 'src/store/Store';
import { ExportAlarm } from 'src/store/apps/crud/alarmRecordTracking';

const AlarmExport = () => {
  const dispatch: AppDispatch = useDispatch();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };
  
  const handleExport = (type: 'pdf' | 'excel') => {
    console.log(`Export as ${type.toUpperCase()}`);
    dispatch(ExportAlarm(type));
    // exportBleReaderDirect(type);
    handleClose();
  };

  return (
    <>
      <Button
        variant="contained"
        color="error"
        startIcon={<Upload />}
        onClick={handleClick}
        sx={{ mr: 1 }}
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
          <ListItemText>as XLS/CSV</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};

export default AlarmExport;
