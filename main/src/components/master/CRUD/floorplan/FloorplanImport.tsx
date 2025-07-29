import React, { useRef, useState } from 'react';
import { Button, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import { Download, TableChart, Upload } from '@mui/icons-material';
import { AppDispatch, useDispatch } from 'src/store/Store';
import { ImportFloorplan } from 'src/store/apps/crud/floorplan';

const FloorplanImport = () => {
    
    const dispatch: AppDispatch = useDispatch();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
    const fileInputRef = useRef<HTMLInputElement>(null);


  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleImport = (type: 'pdf' | 'xls') => {
    if (type === 'xls' && fileInputRef.current) {
      fileInputRef.current.click();
    }
    handleClose();
  };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);

    await dispatch(ImportFloorplan(formData));
    
    event.target.value = ''; // Reset input
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
            <input
        ref={fileInputRef}
        type="file"
        accept=".xls,.xlsx"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
            <input
        ref={fileInputRef}
        type="file"
        accept=".xls,.xlsx"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </>
    
  );
};

export default FloorplanImport;
