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
import { Download, TableChart, FileDownload, Settings } from '@mui/icons-material';
import { ImportBuilding } from 'src/store/apps/crud/building';
import { AppDispatch, useDispatch } from 'src/store/Store';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useImportBuildingConfig } from 'src/hooks/useBuilding';

const BuildingImport = () => {
  const dispatch: AppDispatch = useDispatch();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const [importLoading, setImportLoading] = useState(false);
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const configFileInputRef = useRef<HTMLInputElement>(null);
  const importConfigMutation = useImportBuildingConfig();

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleImport = (type: 'pdf' | 'xls' | 'config') => {
    if (type === 'xls' && fileInputRef.current) {
      fileInputRef.current.click();
    } else if (type === 'config' && configFileInputRef.current) {
      configFileInputRef.current.click();
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
      await Promise.all([dispatch(ImportBuilding(formData)).unwrap(), delay(1000)]);

      queryClient.invalidateQueries({ queryKey: ['building-list'] });
      queryClient.invalidateQueries({ queryKey: ['building-all'] });

      event.target.value = ''; // Reset input
      toast.success('Import Success');
    } catch (err) {
      console.log('Import Error:', err);
      toast.error('Import Error');
    } finally {
      setImportLoading(false);
      
    }
  };

  const handleConfigFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      await importConfigMutation.mutateAsync(formData);
      event.target.value = ''; // Reset input
      toast.success('Building Configuration Imported Successfully');
    } catch (err) {
      console.log('Import Config Error:', err);
      toast.error('Import Config Failed');
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
                <MenuItem
          component="a"
          href="/importTemplate/import_template_building.xlsx"
          download="import_template_building.xlsx"
          onClick={handleClose}
        >
          <ListItemIcon>
            <FileDownload fontSize="small" color="primary" />
          </ListItemIcon>
          <ListItemText>Download Template</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleImport('xls')}>
          <ListItemIcon>
            <TableChart fontSize="small" color="success" />
          </ListItemIcon>
          <ListItemText>XLS</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleImport('config')}>
          <ListItemIcon>
            <Settings fontSize="small" color="primary" />
          </ListItemIcon>
          <ListItemText>Building Configuration</ListItemText>
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
        ref={configFileInputRef}
        type="file"
        accept=".bcp"
        style={{ display: 'none' }}
        onChange={handleConfigFileChange}
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

export default BuildingImport;

