import React, { useEffect, useState } from 'react';
import { Dialog, Box, IconButton, Typography, CircularProgress } from '@mui/material';
import { IconX } from '@tabler/icons-react';
import TrackingPositionFloorView from './TrackingPositionFloorView';
import { useSelector } from 'react-redux';
import { RootState } from 'src/store/Store';
import { trackingTransType } from 'src/store/apps/crud/trackingTrans';
import { BASE_URL } from 'src/utils/axios';

const TrackingPositionPreviewDialog: React.FC<{
  transaction: trackingTransType;
  onClose: () => void;
}> = ({ transaction, onClose }) => {
  const floorplans = useSelector((s: RootState) => s.floorplanReducer.floorplanAll);
  const selected = floorplans.find(
    (f) => f.id === transaction.floorplanMaskedArea?.floorplanId
  );

  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    if (!selected?.floorplanImage) return;
    const img = new Image();
    img.src = selected.floorplanImage.startsWith('/Uploads/')
      ? `${BASE_URL}${selected.floorplanImage}`
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
    // console.log("Position",transaction.coordinatePxX, transaction.coordinatePxY, transaction);
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
      <Box display="flex" justifyContent="space-between" alignItems="center" p={2}>
        <Typography variant="h6" fontWeight="bold">
          {selected?.name || 'Position Preview'}
        </Typography>
        <IconButton onClick={onClose}>
          <IconX />
        </IconButton>
      </Box>

      <Box
        sx={{
          width: imageSize?.width ?? '75vw',
          height: imageSize?.height ?? '70vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#f5f5f5',
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
              borderRadius: 2,
              overflow: 'hidden',
              boxShadow: 2,
              backgroundColor: '#f5f5f5',
            }}
          >
            <TrackingPositionFloorView
              floorplanId={selected.id}
              positionPxX={transaction.coordinateX}
              positionPxY={transaction.coordinateY}
              visitorId={transaction.visitorId}
              memberId={transaction.memberId}
            />
          </Box>
        )}
      </Box>
    </Dialog>
  );
};

export default TrackingPositionPreviewDialog;
