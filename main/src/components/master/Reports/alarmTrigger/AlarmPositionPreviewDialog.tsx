import React from 'react';
import TrackingPositionFloorView from 'src/components/master/Reports/trackingTransaction/Preview/TrackingPositionFloorView';
import { Dialog, Box, IconButton, Typography } from '@mui/material';
import { IconX } from '@tabler/icons-react';
import { AlarmTriggerType } from 'src/store/apps/crud/alarmTrigger';

const AlarmPositionPreviewDialog: React.FC<{ row: AlarmTriggerType; onClose: () => void }> = ({
  row,
  onClose,
}) => {
  const { floorplan, posX, posY, alarmColor } = row;

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
          {floorplan?.name ?? 'Alarm Position'}
        </Typography>
        <IconButton onClick={onClose}>
          <IconX />
        </IconButton>
      </Box>

      <Box
        sx={{
          width: '75vw',
          height: '70vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#f5f5f5',
          borderTop: '1px solid #e0e0e0',
          p: 2,
        }}
      >
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            height: '100%',
            borderRadius: 2,
            overflow: 'hidden',
            boxShadow: 2,
            backgroundColor: '#f5f5f5',
          }}
        >
          <TrackingPositionFloorView
            floorplanId={row.floorplan?.id ?? ''}
            positionPxX={posX}
            positionPxY={posY}
            markerColor={row.isActive ? 'red' : alarmColor ?? 'yellow'}
          />
        </Box>
      </Box>
    </Dialog>
  );
};

export default AlarmPositionPreviewDialog;
