import React, { useRef, useState } from 'react';
import {
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Backdrop,
  Stack,
  Typography,
} from '@mui/material';
import { Download, TableChart } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from 'src/utils/axios'; // Adjust if your axios instance is in another path
import { AppDispatch, useDispatch } from 'src/store/Store';
import { ImportBleReader } from 'src/store/apps/crud/bleReader';

const BleReaderImport = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const open = Boolean(anchorEl);
  const dispatch: AppDispatch = useDispatch();

  const queryClient = useQueryClient();

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleImport = (type: 'xls') => {
    if (type === 'xls' && fileInputRef.current) {
      fileInputRef.current.click();
    }
    handleClose();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Run import and minimum 1s delay in parallel
      await Promise.all([dispatch(ImportBleReader(formData)).unwrap(), delay(1000)]);

      event.target.value = ''; // reset file input
      toast.success('Success to import ble reader');
      queryClient.invalidateQueries({ queryKey: ['ble-reader-list'] });
      queryClient.invalidateQueries({ queryKey: ['ble-reader-all'] });
    } catch (error) {
      toast.error('Failed to import ble reader');
    } finally {
      setIsUploading(false);
    }
  };


  return (
    <>
      <Button
        variant="contained"
        color="success"
        startIcon={isUploading ? <CircularProgress size={18} color="inherit" /> : <Download />}
        onClick={handleClick}
        sx={{ mr: 1 }}
        disabled={isUploading}
      >
        Import
      </Button>

      <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
        <MenuItem onClick={() => handleImport('xls')} disabled={isUploading}>
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
              open={isUploading}
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

export default BleReaderImport;
