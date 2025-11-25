import React, { useEffect, useState } from 'react';
import { Dialog, Box, IconButton, Typography, CircularProgress } from '@mui/material';
import { IconX } from '@tabler/icons-react';
import EditAreaFloorView from './AddEditMaskedArea/Preview/EditAreaFloorView';
import { useDispatch } from 'src/store/Store';
// import { selectFloorPlan } from 'src/store/apps/tracking/FloorPlanSlice';
import {SelectFloorplan} from 'src/store/apps/crud/floorplan'
import { getConfig } from 'src/config';
import { useAllFloorplans } from 'src/hooks/useFloorplan';

// Get your Vite env base URL safely
const API_BASE_URL = getConfig().API_BASE_URL || '';

const FloorplanPreviewDialog: React.FC<{ floorplanId: string; onClose: () => void }> = ({
  floorplanId,
  onClose,
}) => {
    const dispatch = useDispatch();
  const {data: floorplans = []} = useAllFloorplans();
  const selected = floorplans.find((f) => f.id === floorplanId);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    if (!selected?.floorplanImage) return;

    const img = new Image();
    img.src = selected.floorplanImage.startsWith('/Uploads/')
      ? `${API_BASE_URL}${selected.floorplanImage}`
      : selected.floorplanImage;

    img.onload = () => {
      const maxWidth = window.innerWidth * 0.85;
      const maxHeight = window.innerHeight * 0.75;

      let width = img.width;
      let height = img.height;
      const ratio = Math.min(maxWidth / width, maxHeight / height, 1);

      width *= ratio;
      height *= ratio;
      setImageSize({ width, height });
    };
    dispatch(SelectFloorplan(selected));
  }, [selected]);

  return (
    <Dialog
      open
      onClose={onClose}
      maxWidth={false}
      PaperProps={{
        sx: {
          borderRadius: 2,
          overflow: 'hidden',
          bgcolor: 'background.paper',
        },
      }}
    >
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" p={2} pb={1}>
        <Typography variant="h6" fontWeight="bold">
          {selected?.name || 'Preview Floorplan'}
        </Typography>
        <IconButton onClick={onClose}>
          <IconX />
        </IconButton>
      </Box>

      {/* Body */}
      <Box
        sx={{
          width: imageSize?.width ?? '75vw',
          height: imageSize?.height ?? '70vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#f7f7f7',
          borderTop: '1px solid #e0e0e0',
          p: 2,
        }}
      >
        {!selected || !imageSize ? (
          <CircularProgress />
        ) : (
          <Box
            sx={{
              position: 'relative',
              width: imageSize.width,
              height: imageSize.height,
              overflow: 'hidden',
              borderRadius: 2,
              boxShadow: 1,
              backgroundColor: '#f7f7f7',
            }}
          >
            {/* Load EditAreaFloorView with zoom/pan disabled */}
            <EditAreaFloorView zoomable={false} preview={true} />
          </Box>
        )}
      </Box>
    </Dialog>
  );
};

export default FloorplanPreviewDialog;
