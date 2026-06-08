import React, { useState } from 'react';
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
import { PictureAsPdf, TableChart, Upload } from '@mui/icons-material';
import { AppDispatch, useDispatch } from 'src/store/Store';
import { ExportFloor } from 'src/store/apps/crud/floor';
import toast from 'react-hot-toast';

const FloorExport = () => {
  const dispatch: AppDispatch = useDispatch();
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
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    setIsExporting(true);

    try {
      // Run export and minimum 1s delay in parallel
      await Promise.all([dispatch(ExportFloor(type)).unwrap(), delay(1000)]);
      toast.success(`Exported Floor as ${type.toUpperCase()}`);
    } catch (error) {
      console.error('Export Error:', error);
      toast.error('Failed to export Floor');
    } finally {
      setIsExporting(false);
    }
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

      <Backdrop
        sx={{
          color: '#fff',
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
        open={isExporting}
      >
        <CircularProgress color="inherit" size={60} thickness={4} />
        <Stack alignItems="center">
          <Typography variant="h5" fontWeight="bold">
            Exporting Data...
          </Typography>
          <Typography variant="body2" color="rgba(255,255,255,0.7)">
            Please wait while we generate your file
          </Typography>
        </Stack>
      </Backdrop>
    </>
  );
};

export default FloorExport;

