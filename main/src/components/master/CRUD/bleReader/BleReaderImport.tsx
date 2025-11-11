import React, { useRef, useState } from 'react';
import {
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
} from '@mui/material';
import { Download, TableChart } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from 'src/utils/axios'; // Adjust if your axios instance is in another path

const BleReaderImport = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const open = Boolean(anchorEl);

  const queryClient = useQueryClient();

  // React Query mutation for import
  const importMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      return await api.post('/ble-reader/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['ble-reader-list'] });
      toast.success('BLE Reader data imported successfully!');
    },
    onError: (err: any) => {
      console.error(err);
      toast.error('Failed to import BLE Reader data');
    },
    onSettled: () => setIsUploading(false),
  });

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
    setIsUploading(true);

    const formData = new FormData();
    formData.append('file', file);

    importMutation.mutate(formData);
    event.target.value = ''; // reset file input
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
    </>
  );
};

export default BleReaderImport;
