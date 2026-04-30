import React, { useRef, useState } from 'react';
import {
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Backdrop,
  CircularProgress,
  Typography,
  Stack,
} from '@mui/material';
import { Download, TableChart } from '@mui/icons-material';
import { AppDispatch, useDispatch } from 'src/store/Store';
import { ImportFloorplan } from 'src/store/apps/crud/floorplan';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';

const FloorplanImport = () => {
  const dispatch: AppDispatch = useDispatch();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const [importLoading, setImportLoading] = useState(false);
  const queryClient = useQueryClient();
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

    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    setImportLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Run import and minimum 1s delay in parallel
      await Promise.all([dispatch(ImportFloorplan(formData)).unwrap(), delay(1000)]);

      queryClient.invalidateQueries({ queryKey: ['floorplan-list'] });
      queryClient.invalidateQueries({ queryKey: ['floorplan-all'] });

      event.target.value = ''; // Reset input
      toast.success('Import Success');
    } catch (err) {
      console.log('Import Error:', err);
      toast.error('Import Error');
    } finally {
      setImportLoading(false);
    }
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

      <Backdrop
        sx={{
          color: '#fff',
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
        open={importLoading}
      >
        <CircularProgress color="inherit" size={60} thickness={4} />
        <Stack alignItems="center">
          <Typography variant="h5" fontWeight="bold">
            Importing Data...
          </Typography>
          <Typography variant="body2" color="rgba(255,255,255,0.7)">
            Please wait while we process your file
          </Typography>
        </Stack>
      </Backdrop>
    </>
  );
};

export default FloorplanImport;

