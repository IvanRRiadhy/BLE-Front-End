import React, { useState } from 'react';
import { Button, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import { Download, TableChart, Upload } from '@mui/icons-material';

const BleReaderImport = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleImport = (type: 'pdf' | 'xls') => {
    console.log(`Import as ${type.toUpperCase()}`);
    // TODO: Call export API here
    handleClose();
  };

  return (
    <>
      <Button
        variant="contained"
        color="success"
        startIcon={<Download />}
        onClick={handleClick}
        sx={{ mr: 1 }}
      >
        Import
      </Button>
      <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
        <MenuItem onClick={() => handleImport('xls')}>
          <ListItemIcon>
            <TableChart fontSize="small" color="success" />
          </ListItemIcon>
          <ListItemText>XLS</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};

export default BleReaderImport;
