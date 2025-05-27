import React from 'react';
import { Box, Typography, Button, Modal } from '@mui/material';

interface WelcomePopupProps {
  open: boolean;
  onClose: () => void;
}

const WelcomePopup: React.FC<WelcomePopupProps> = ({ open, onClose }) => {
  return (
    <Modal open={open} onClose={onClose}>
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 300,
          bgcolor: 'background.paper',
          boxShadow: 24,
          p: 4,
          borderRadius: 2,
          textAlign: 'center',
        }}
      >
        <Typography variant="h6" sx={{ mb: 2 }}>
          Welcome!
        </Typography>
        <Typography variant="body1" sx={{ mb: 3 }}>
          We're glad to have you here.
        </Typography>
        <Button variant="contained" onClick={onClose}>
          Close
        </Button>
      </Box>
    </Modal>
  );
};

export default WelcomePopup;
