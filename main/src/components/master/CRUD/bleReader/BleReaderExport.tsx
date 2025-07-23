import React, { useState } from 'react';
import {
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { PictureAsPdf, TableChart, Download } from '@mui/icons-material';

const BleReaderExport = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleExport = (type: 'pdf' | 'xls') => {
    console.log(`Export as ${type.toUpperCase()}`);
    // TODO: Call export API here
    handleClose();
  };

  return (
    <>
      <Button
        variant="contained"
        color="error"
        startIcon={<Download />}
        onClick={handleClick}
        sx={{ mr: 1 }}
      >
        Export
      </Button>
      <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
        <MenuItem onClick={() => handleExport('pdf')}>
          <ListItemIcon>
            <PictureAsPdf fontSize="small" color='error'/>
          </ListItemIcon>
          <ListItemText>as PDF</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleExport('xls')}>
          <ListItemIcon>
            <TableChart fontSize="small" color='success'/>
          </ListItemIcon>
          <ListItemText>as XLS/CSV</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};

export default BleReaderExport;
